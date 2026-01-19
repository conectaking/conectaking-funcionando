const repository = require('./contract.repository');
const validators = require('./contract.validators');
const TYPES = require('./contract.types');
const crypto = require('crypto');
const logger = require('../../utils/logger');
const { sendEmail } = require('../../utils/email');
const config = require('../../config');

class ContractService {
    /**
     * Gerar token único para assinatura (curto e seguro usando nanoid)
     * Formato: 21 caracteres alfanuméricos (sem hífens para evitar problemas de roteamento)
     */
    generateSignToken() {
        const { customAlphabet } = require('nanoid');
        // Usar apenas caracteres seguros para URL (sem hífens, underscores, etc)
        const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        const nanoid = customAlphabet(alphabet, 21);
        return nanoid();
    }

    /**
     * Gerar hash SHA-256 de um buffer (PDF)
     */
    generateSHA256Hash(buffer) {
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }

    /**
     * Substituir variáveis em template
     */
    replaceVariables(template, variables) {
        let content = template;
        Object.keys(variables).forEach(key => {
            const value = variables[key] || '';
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            content = content.replace(regex, value);
        });
        return content;
    }

    /**
     * Criar novo contrato
     * @param {Object} data - Dados do contrato
     */
    async create(data) {
        // Validar dados
        const validation = validators.validateContractData(data, false);
        if (!validation.isValid) {
            throw new Error(`Validação falhou: ${validation.errors.join(', ')}`);
        }

        // Sanitizar dados
        const sanitized = validators.sanitize(data);

        // Se for template, copiar conteúdo do template
        if (sanitized.template_id) {
            const template = await repository.findTemplateById(sanitized.template_id);
            if (!template) {
                throw new Error('Template não encontrado');
            }
            
            // Se não tiver pdf_content definido, copiar do template
            if (!sanitized.pdf_content && template.content) {
                // Se tiver variáveis, substituir; senão, copiar conteúdo original
                if (sanitized.variables && Object.keys(sanitized.variables).length > 0) {
                    sanitized.pdf_content = this.replaceVariables(template.content, sanitized.variables);
                } else {
                    // Copiar conteúdo do template sem substituir variáveis
                    sanitized.pdf_content = template.content;
                }
            }
        }

        // Criar contrato
        const contract = await repository.create(sanitized);
        
        // Log de auditoria
        await repository.createAuditLog({
            contract_id: contract.id,
            user_id: contract.user_id,
            action: TYPES.AUDIT_ACTIONS.CREATED,
            details: { title: contract.title, status: contract.status },
            ip_address: null,
            user_agent: null
        });

        logger.info(`Contrato criado: ${contract.id}`);
        return contract;
    }

    /**
     * Buscar contrato por ID
     */
    async findById(id) {
        const contract = await repository.findById(id);
        if (!contract) {
            throw new Error('Contrato não encontrado');
        }
        return contract;
    }

    /**
     * Buscar contratos do usuário (com filtros e busca)
     */
    async findByUserId(userId, filters = {}) {
        return await repository.findByUserId(userId, filters);
    }

    /**
     * Atualizar contrato (apenas se draft)
     */
    async update(id, userId, data) {
        // Verificar ownership
        const ownsContract = await repository.checkOwnership(id, userId);
        if (!ownsContract) {
            throw new Error('Você não tem permissão para editar este contrato');
        }

        // Buscar contrato atual
        const currentContract = await repository.findById(id);
        if (!currentContract) {
            throw new Error('Contrato não encontrado');
        }

        // Verificar se pode editar (apenas se draft)
        if (currentContract.status !== TYPES.STATUS.DRAFT) {
            throw new Error('Apenas contratos em rascunho podem ser editados');
        }

        // Validar dados
        const validation = validators.validateContractData(data, true);
        if (!validation.isValid) {
            throw new Error(`Validação falhou: ${validation.errors.join(', ')}`);
        }

        // Sanitizar dados
        const sanitized = validators.sanitize(data);

        // Atualizar contrato
        const updated = await repository.update(id, sanitized);
        
        // Log de auditoria
        await repository.createAuditLog({
            contract_id: id,
            user_id: userId,
            action: TYPES.AUDIT_ACTIONS.EDITED,
            details: { changes: Object.keys(sanitized) },
            ip_address: null,
            user_agent: null
        });

        logger.info(`Contrato atualizado: ${id}`);
        return updated;
    }

    /**
     * Enviar contrato para assinatura
     */
    async sendForSignature(id, userId, signers, signaturePositions = null) {
        // Verificar ownership
        const ownsContract = await repository.checkOwnership(id, userId);
        if (!ownsContract) {
            throw new Error('Você não tem permissão para enviar este contrato');
        }

        // Buscar contrato
        const contract = await repository.findById(id);
        if (!contract) {
            throw new Error('Contrato não encontrado');
        }

        // Verificar se pode enviar (apenas se draft)
        if (contract.status !== TYPES.STATUS.DRAFT) {
            throw new Error('Apenas contratos em rascunho podem ser enviados para assinatura');
        }

        // Validar signatários
        if (!signers || !Array.isArray(signers) || signers.length === 0) {
            throw new Error('Pelo menos um signatário é obrigatório');
        }

        const client = await require('../../db').pool.connect();
        
        try {
            await client.query('BEGIN');

            // Criar signatários
            const tokenExpiryDate = new Date();
            tokenExpiryDate.setDate(tokenExpiryDate.getDate() + TYPES.DEFAULT_TOKEN_EXPIRY_DAYS);

            const createdSigners = [];
            // Mapear posições por email para aplicar depois
            const positionsByEmail = {};
            if (signaturePositions && typeof signaturePositions === 'object') {
                // Buscar signatários existentes para mapear IDs
                const existingSigners = await repository.findSignersByContractId(id);
                Object.entries(signaturePositions).forEach(([signerId, pos]) => {
                    // Tentar encontrar pelo ID ou email
                    const signer = existingSigners.find(s => s.id == signerId) || 
                                  signers.find(s => s.email === signerId);
                    if (signer) {
                        positionsByEmail[signer.email || signerId] = pos;
                    }
                });
            }
            
            for (const signerData of signers) {
                const validation = validators.validateSignerData(signerData);
                if (!validation.isValid) {
                    throw new Error(`Validação de signatário falhou: ${validation.errors.join(', ')}`);
                }

                const sanitized = validators.sanitizeSigner(signerData);
                const signToken = this.generateSignToken();

                const signer = await repository.createSigner({
                    contract_id: id,
                    ...sanitized,
                    sign_token: signToken,
                    token_expires_at: tokenExpiryDate,
                    ip_address: null,
                    user_agent: null
                }, client);

                // Aplicar posições se existirem
                const position = positionsByEmail[signerData.email];
                if (position && (position.page || position.x !== undefined)) {
                    await repository.updateSigner(signer.id, {
                        signature_page: position.page || 1,
                        signature_x: position.x || null,
                        signature_y: position.y || null,
                        signature_width: position.width || 150,
                        signature_height: position.height || 60
                    }, client);
                }

                createdSigners.push(signer);
            }

            // Atualizar status do contrato
            await repository.update(id, {
                status: TYPES.STATUS.SENT,
                expires_at: tokenExpiryDate
            });

            // Log de auditoria
            await repository.createAuditLog({
                contract_id: id,
                user_id: userId,
                action: TYPES.AUDIT_ACTIONS.SENT,
                details: { signers_count: createdSigners.length },
                ip_address: null,
                user_agent: null
            }, client);

            await client.query('COMMIT');

            // Enviar emails (sem código de verificação por padrão - pode ser habilitado se necessário)
            const updatedContract = await repository.findById(id);
            await this.sendSignEmails(updatedContract, createdSigners, false); // false = sem código de verificação

            logger.info(`Contrato enviado para assinatura: ${id} com ${createdSigners.length} signatários`);
            
            return {
                contract: updatedContract,
                signers: createdSigners
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Função auxiliar para escapar HTML e garantir UTF-8
     */
    escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Enviar emails para signatários (UMA VEZ apenas)
     * @param {Object} contract - Contrato
     * @param {Array} signers - Lista de signatários
     * @param {Boolean} includeVerificationCode - Se deve incluir código de verificação no email
     */
    async sendSignEmails(contract, signers, includeVerificationCode = false) {
        const frontendUrl = config.urls.frontend || 'https://conectaking.com.br';
        
        for (const signer of signers) {
            const signUrl = `${frontendUrl}/contract/sign/${signer.sign_token}`;
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + TYPES.DEFAULT_TOKEN_EXPIRY_DAYS);
            
            // Gerar código de verificação se necessário
            let verificationCode = null;
            let codeExpiresAt = null;
            if (includeVerificationCode) {
                verificationCode = this.generateVerificationCode();
                codeExpiresAt = new Date();
                codeExpiresAt.setMinutes(codeExpiresAt.getMinutes() + 15); // 15 minutos
                
                // Salvar código no banco
                await repository.updateSigner(signer.id, {
                    verification_code: verificationCode,
                    verification_code_expires_at: codeExpiresAt,
                    verification_code_attempts: 0,
                    verification_code_verified: false
                });
            }
            
            // Escapar textos para evitar problemas de encoding
            const contractTitle = this.escapeHtml(contract.title);
            const signerName = this.escapeHtml(signer.name);
            
            const subject = `📄 Contrato para Assinatura: ${contractTitle}`;
            
            // Seção de código de verificação (se necessário)
            let verificationSection = '';
            if (includeVerificationCode && verificationCode) {
                verificationSection = `
                    <div style="background-color: #E8F5E9; border: 2px solid #4CAF50; border-radius: 12px; padding: 25px; margin: 25px 0;">
                        <h3 style="margin: 0 0 15px 0; color: #2E7D32; font-size: 18px; font-weight: 600; text-align: center;">
                            🔐 Código de Verificação
                        </h3>
                        <p style="margin: 0 0 20px 0; color: #333333; font-size: 14px; line-height: 1.6; text-align: center;">
                            Use este código para verificar sua identidade ao assinar:
                        </p>
                        <div style="background: linear-gradient(135deg, #FFC700 0%, #F59E0B 100%); border-radius: 12px; padding: 25px; text-align: center; margin: 20px 0;">
                            <div style="font-size: 42px; font-weight: 700; color: #000000; letter-spacing: 10px; font-family: 'Courier New', monospace;">
                                ${verificationCode}
                            </div>
                        </div>
                        <div style="background-color: #FFF4E6; border: 1px solid #FFC700; border-radius: 8px; padding: 12px; margin: 15px 0;">
                            <p style="margin: 0; color: #856404; font-size: 13px; line-height: 1.6; text-align: center;">
                                <strong>⏰ Importante:</strong> Este código expira em <strong>15 minutos</strong>.
                            </p>
                        </div>
                    </div>
                `;
            }
            
            const html = `
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
                </head>
                <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
                        <tr>
                            <td align="center" style="padding: 40px 20px;">
                                <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
                                    <!-- Header -->
                                    <tr>
                                        <td style="background: linear-gradient(135deg, #991B1B 0%, #000000 100%); padding: 40px 30px; text-align: center;">
                                            <h1 style="margin: 0; color: #FFC700; font-size: 28px; font-weight: 700;">
                                                ✍️ Contrato para Assinatura
                                            </h1>
                                        </td>
                                    </tr>
                                    
                                    <!-- Content -->
                                    <tr>
                                        <td style="padding: 40px 30px;">
                                            <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                                                Olá, <strong>${signerName}</strong>!
                                            </p>
                                            
                                            <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                                                Você recebeu um contrato para assinatura digital:
                                            </p>
                                            
                                            <div style="background-color: #f9f9f9; border-left: 4px solid #991B1B; padding: 20px; margin: 25px 0; border-radius: 4px;">
                                                <h2 style="margin: 0 0 10px 0; color: #991B1B; font-size: 20px; font-weight: 600;">
                                                    ${contractTitle}
                                                </h2>
                                            </div>
                                            
                                            ${verificationSection}
                                            
                                            <p style="margin: 30px 0; text-align: center;">
                                                <a href="${signUrl}" style="display: inline-block; background: linear-gradient(135deg, #FFC700 0%, #F59E0B 100%); color: #000000; padding: 18px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 12px rgba(255, 199, 0, 0.3); transition: transform 0.2s;">
                                                    ✍️ Assinar Contrato Agora
                                                </a>
                                            </p>
                                            
                                            <div style="background-color: #FFF4E6; border: 1px solid #FFC700; border-radius: 8px; padding: 15px; margin: 25px 0;">
                                                <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">
                                                    <strong>⏰ Importante:</strong> Este link expira em <strong>${TYPES.DEFAULT_TOKEN_EXPIRY_DAYS} dias</strong> (${expiryDate.toLocaleDateString('pt-BR')}).
                                                </p>
                                            </div>
                                            
                                            <p style="margin: 30px 0 0 0; color: #666666; font-size: 14px; line-height: 1.6; border-top: 1px solid #e0e0e0; padding-top: 20px;">
                                                <strong>Como funciona:</strong><br>
                                                1. Clique no botão acima para acessar o contrato<br>
                                                2. Revise o conteúdo do documento<br>
                                                3. ${includeVerificationCode ? 'Digite o código de verificação acima' : ''} Escolha um método de assinatura (desenhar, enviar imagem ou digitar nome)<br>
                                                4. Confirme sua assinatura
                                            </p>
                                        </td>
                                    </tr>
                                    
                                    <!-- Footer -->
                                    <tr>
                                        <td style="background-color: #1C1C21; padding: 30px; text-align: center;">
                                            <p style="margin: 0 0 10px 0; color: #888888; font-size: 12px;">
                                                Este email foi enviado automaticamente pelo sistema ConectaKing.
                                            </p>
                                            <p style="margin: 0; color: #666666; font-size: 12px;">
                                                Se você não esperava este email, pode ignorá-lo com segurança.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `;

            await sendEmail(signer.email, subject, html);
            
            if (includeVerificationCode && verificationCode) {
                logger.info(`Email unificado enviado para ${signer.email} (inclui código: ${verificationCode})`);
            } else {
                logger.info(`Email enviado para ${signer.email}`);
            }
        }
    }

    /**
     * Buscar templates
     */
    async findTemplates(category = null) {
        return await repository.findTemplates(category);
    }

    /**
     * Buscar template por ID
     */
    async findTemplateById(id) {
        const template = await repository.findTemplateById(id);
        if (!template) {
            throw new Error('Template não encontrado');
        }
        return template;
    }

    /**
     * Duplicar contrato
     */
    async duplicate(id, userId) {
        // Verificar ownership
        const ownsContract = await repository.checkOwnership(id, userId);
        if (!ownsContract) {
            throw new Error('Você não tem permissão para duplicar este contrato');
        }

        // Buscar contrato original
        const original = await repository.findById(id);
        if (!original) {
            throw new Error('Contrato não encontrado');
        }

        // Criar cópia
        const copy = await repository.create({
            user_id: userId,
            template_id: original.template_id,
            title: `${original.title} (Cópia)`,
            status: TYPES.STATUS.DRAFT,
            contract_type: original.contract_type,
            pdf_url: original.pdf_url,
            pdf_content: original.pdf_content,
            variables: original.variables,
            original_pdf_hash: original.original_pdf_hash
        });

        // Log de auditoria
        await repository.createAuditLog({
            contract_id: copy.id,
            user_id: userId,
            action: TYPES.AUDIT_ACTIONS.DUPLICATED,
            details: { original_id: id },
            ip_address: null,
            user_agent: null
        });

        logger.info(`Contrato duplicado: ${id} -> ${copy.id}`);
        return copy;
    }

    /**
     * Excluir contrato
     */
    async delete(id, userId) {
        // Verificar ownership
        const ownsContract = await repository.checkOwnership(id, userId);
        if (!ownsContract) {
            throw new Error('Você não tem permissão para excluir este contrato');
        }

        // Buscar contrato
        const contract = await repository.findById(id);
        if (!contract) {
            throw new Error('Contrato não encontrado');
        }

        // Se já assinado, avisar
        if (contract.status === TYPES.STATUS.COMPLETED || contract.status === TYPES.STATUS.SIGNED) {
            throw new Error('Contratos já assinados não podem ser excluídos. Recomendamos arquivá-los.');
        }

        // Log de auditoria antes de excluir
        await repository.createAuditLog({
            contract_id: id,
            user_id: userId,
            action: TYPES.AUDIT_ACTIONS.DELETED,
            details: { title: contract.title },
            ip_address: null,
            user_agent: null
        });

        // Excluir contrato (CASCADE remove signers, signatures, audit_logs)
        await repository.delete(id);

        logger.info(`Contrato excluído: ${id}`);
        return true;
    }

    /**
     * Estatísticas do usuário
     */
    async getStats(userId) {
        return await repository.getStats(userId);
    }

    /**
     * Buscar signatário por token (público)
     */
    async findSignerByToken(token, allowSigned = false) {
        const signer = await repository.findSignerByToken(token);
        if (!signer) {
            throw new Error('Token de assinatura inválido');
        }

        // Verificar expiração
        if (new Date(signer.token_expires_at) < new Date()) {
            throw new Error('Token de assinatura expirado');
        }

        // Verificar se já assinou (só lançar erro se não permitir assinados)
        if (!allowSigned && signer.signed_at) {
            throw new Error('Este contrato já foi assinado');
        }

        return signer;
    }

    /**
     * Gerar código de verificação de 6 dígitos
     */
    generateVerificationCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Enviar código de verificação por email
     */
    async sendVerificationCode(signer, contract) {
        const code = this.generateVerificationCode();
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutos

        // Salvar código no banco
        await repository.updateSigner(signer.id, {
            verification_code: code,
            verification_code_expires_at: expiresAt,
            verification_code_attempts: 0,
            verification_code_verified: false
        });

        // Enviar email
        const frontendUrl = config.urls.frontend || 'https://conectaking.com.br';
        const signUrl = `${frontendUrl}/contract/sign/${signer.sign_token}`;
        
        const subject = `🔐 Código de Verificação - Contrato: ${contract.title}`;
        const html = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
                <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
                    <tr>
                        <td align="center" style="padding: 40px 20px;">
                            <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
                                <!-- Header -->
                                <tr>
                                    <td style="background: linear-gradient(135deg, #991B1B 0%, #000000 100%); padding: 40px 30px; text-align: center;">
                                        <h1 style="margin: 0; color: #FFC700; font-size: 28px; font-weight: 700;">
                                            <i class="fas fa-shield-alt"></i> Código de Verificação
                                        </h1>
                                    </td>
                                </tr>
                                
                                <!-- Content -->
                                <tr>
                                    <td style="padding: 40px 30px;">
                                        <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                                            Olá, <strong>${signer.name}</strong>!
                                        </p>
                                        
                                        <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                                            Você está prestes a assinar o contrato: <strong>${contract.title}</strong>
                                        </p>
                                        
                                        <p style="margin: 0 0 30px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                                            Use o código abaixo para verificar sua identidade:
                                        </p>
                                        
                                        <div style="background: linear-gradient(135deg, #FFC700 0%, #F59E0B 100%); border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
                                            <div style="font-size: 48px; font-weight: 700; color: #000000; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                                                ${code}
                                            </div>
                                        </div>
                                        
                                        <div style="background-color: #FFF4E6; border: 1px solid #FFC700; border-radius: 8px; padding: 15px; margin: 25px 0;">
                                            <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;">
                                                <strong>⏰ Importante:</strong> Este código expira em <strong>15 minutos</strong>.
                                            </p>
                                        </div>
                                        
                                        <p style="margin: 30px 0 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                                            Se você não solicitou este código, ignore esta mensagem.
                                        </p>
                                    </td>
                                </tr>
                                
                                <!-- Footer -->
                                <tr>
                                    <td style="background-color: #1C1C21; padding: 30px; text-align: center;">
                                        <p style="margin: 0; color: #888888; font-size: 12px;">
                                            Este email foi enviado automaticamente pelo sistema ConectaKing.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;

        await sendEmail(signer.email, subject, html);
        logger.info(`Código de verificação enviado para ${signer.email}: ${code}`);
        
        return { code, expiresAt };
    }

    /**
     * Verificar código de verificação
     */
    async verifyCode(signerId, code) {
        const signer = await repository.findSignerById(signerId);
        if (!signer) {
            throw new Error('Signatário não encontrado');
        }

        // Verificar se código existe
        if (!signer.verification_code) {
            throw new Error('Código de verificação não foi gerado. Solicite um novo código.');
        }

        // Verificar expiração
        if (new Date(signer.verification_code_expires_at) < new Date()) {
            throw new Error('Código de verificação expirado. Solicite um novo código.');
        }

        // Verificar tentativas (máximo 5)
        if (signer.verification_code_attempts >= 5) {
            throw new Error('Muitas tentativas incorretas. Solicite um novo código.');
        }

        // Verificar código
        if (signer.verification_code !== code) {
            // Incrementar tentativas
            await repository.updateSigner(signerId, {
                verification_code_attempts: (signer.verification_code_attempts || 0) + 1
            });
            throw new Error('Código de verificação incorreto');
        }

        // Marcar como verificado
        await repository.updateSigner(signerId, {
            verification_code_verified: true
        });

        logger.info(`Código verificado com sucesso para signatário ${signerId}`);
        return true;
    }

    /**
     * Enviar notificação quando contrato for assinado
     */
    async sendSignatureNotification(contract, signer, allSigned = false) {
        const frontendUrl = config.urls.frontend || 'https://conectaking.com.br';
        const db = require('../../db');
        
        // Notificar o criador do contrato
        const client = await db.pool.connect();
        let contractOwner = null;
        try {
            const result = await client.query(
                'SELECT id, email FROM users WHERE id = $1',
                [contract.user_id]
            );
            contractOwner = result.rows[0] || null;
        } finally {
            client.release();
        }
        
        if (contractOwner && contractOwner.email) {
            const ownerSubject = allSigned 
                ? `✅ Contrato Completo: ${contract.title}`
                : `📝 Nova Assinatura: ${contract.title}`;
            
            const ownerHtml = `
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
                        <tr>
                            <td align="center" style="padding: 40px 20px;">
                                <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
                                    <!-- Header com Logo -->
                                    <tr>
                                        <td style="background: linear-gradient(135deg, #991B1B 0%, #000000 100%); padding: 40px 30px; text-align: center;">
                                            <div style="margin-bottom: 15px;">
                                                <h1 style="margin: 0; color: #FFC700; font-size: 32px; font-weight: 700; letter-spacing: 2px;">
                                                    CONECTA KING
                                                </h1>
                                            </div>
                                            <h2 style="margin: 0; color: #FFFFFF; font-size: 22px; font-weight: 600;">
                                                ${allSigned ? '✅ Contrato Completo!' : '📝 Nova Assinatura'}
                                            </h2>
                                        </td>
                                    </tr>
                                    
                                    <!-- Content -->
                                    <tr>
                                        <td style="padding: 40px 30px;">
                                            <p style="color: #333; font-size: 18px; margin: 0 0 20px 0; font-weight: 600;">
                                                Olá, <strong style="color: #991B1B;">${contractOwner.name || 'Usuário'}</strong>!
                                            </p>
                                            
                                            <div style="background: linear-gradient(135deg, #FFF4E6 0%, #FFE8CC 100%); border-left: 4px solid #FFC700; padding: 20px; margin: 25px 0; border-radius: 8px;">
                                                <p style="color: #333; font-size: 16px; margin: 0; line-height: 1.6;">
                                                    ${allSigned 
                                                        ? `🎉 <strong>Todos os signatários assinaram!</strong><br><br>O contrato <strong>"${contract.title}"</strong> está completo e pronto para download.`
                                                        : `📝 <strong>${signer.name}</strong> (${signer.email}) acabou de assinar o contrato <strong>"${contract.title}"</strong>.`
                                                    }
                                                </p>
                                            </div>
                                            
                                            ${allSigned ? `
                                                <div style="text-align: center; margin: 30px 0;">
                                                    <a href="${frontendUrl}/dashboard#contratos" style="display: inline-block; background: linear-gradient(135deg, #FFC700 0%, #F59E0B 100%); color: #000; padding: 18px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 12px rgba(255, 199, 0, 0.3);">
                                                        📥 Ver e Baixar Contrato
                                                    </a>
                                                </div>
                                                <div style="background: #E8F5E9; border: 1px solid #4CAF50; border-radius: 8px; padding: 15px; margin: 20px 0;">
                                                    <p style="margin: 0; color: #2E7D32; font-size: 14px;">
                                                        <strong>✅ Status:</strong> Contrato completo e assinado por todos os signatários.
                                                    </p>
                                                </div>
                                            ` : `
                                                <div style="background: #E3F2FD; border: 1px solid #2196F3; border-radius: 8px; padding: 15px; margin: 20px 0;">
                                                    <p style="margin: 0; color: #1565C0; font-size: 14px;">
                                                        <strong>⏳ Aguardando:</strong> Ainda há signatários pendentes. Você será notificado quando todos assinarem.
                                                    </p>
                                                </div>
                                            `}
                                            
                                            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                                                <p style="color: #666; font-size: 14px; margin: 0;">
                                                    <strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                    
                                    <!-- Footer -->
                                    <tr>
                                        <td style="background-color: #1C1C21; padding: 30px; text-align: center;">
                                            <p style="margin: 0 0 10px 0; color: #888888; font-size: 12px;">
                                                <strong style="color: #FFC700;">ConectaKing</strong> - Sistema de Assinatura Digital
                                            </p>
                                            <p style="margin: 0; color: #666666; font-size: 11px;">
                                                Este email foi enviado automaticamente. Não responda este email.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `;
            
            // Se contrato completo, anexar PDF final
            let attachments = [];
            if (allSigned && contract.final_pdf_url) {
                const path = require('path');
                const fs = require('fs').promises;
                try {
                    const pdfPath = path.join(__dirname, '../../public', contract.final_pdf_url);
                    const pdfExists = await fs.access(pdfPath).then(() => true).catch(() => false);
                    if (pdfExists) {
                        attachments.push({
                            filename: `${contract.title.replace(/[^a-z0-9]/gi, '_')}_assinado.pdf`,
                            path: pdfPath
                        });
                    }
                } catch (error) {
                    logger.warn('Erro ao anexar PDF ao email:', error);
                }
            }
            
            await sendEmail(contractOwner.email, ownerSubject, ownerHtml, null, attachments);
        }

        // Notificar o signatário (confirmação)
        const signerSubject = `✅ Assinatura Confirmada: ${contract.title}`;
        const signerHtml = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
                <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
                    <tr>
                        <td align="center" style="padding: 40px 20px;">
                            <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;">
                                <!-- Header -->
                                <tr>
                                    <td style="background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%); padding: 40px 30px; text-align: center;">
                                        <div style="width: 80px; height: 80px; background: rgba(255,255,255,0.2); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 15px;">
                                            <span style="font-size: 40px;">✅</span>
                                        </div>
                                        <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: 700;">
                                            Assinatura Confirmada!
                                        </h1>
                                    </td>
                                </tr>
                                
                                <!-- Content -->
                                <tr>
                                    <td style="padding: 40px 30px;">
                                        <p style="color: #333; font-size: 18px; margin: 0 0 20px 0; font-weight: 600;">
                                            Olá, <strong style="color: #16A34A;">${signer.name}</strong>!
                                        </p>
                                        
                                        <div style="background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%); border-left: 4px solid #22C55E; padding: 20px; margin: 25px 0; border-radius: 8px;">
                                            <p style="color: #333; font-size: 16px; margin: 0; line-height: 1.6;">
                                                Sua assinatura no contrato <strong>"${contract.title}"</strong> foi confirmada com sucesso e registrada no sistema.
                                            </p>
                                        </div>
                                        
                                        <div style="background: #F5F5F5; border-radius: 8px; padding: 20px; margin: 25px 0;">
                                            <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                                                <strong>📅 Data da assinatura:</strong> ${new Date().toLocaleString('pt-BR')}
                                            </p>
                                            <p style="margin: 0; color: #666; font-size: 14px;">
                                                <strong>📄 Contrato:</strong> ${contract.title}
                                            </p>
                                        </div>
                                        
                                        <div style="background: #E3F2FD; border: 1px solid #2196F3; border-radius: 8px; padding: 15px; margin: 20px 0;">
                                            <p style="margin: 0; color: #1565C0; font-size: 14px; line-height: 1.6;">
                                                <strong>💾 Cópia:</strong> Você receberá uma cópia do contrato assinado por email quando todos os signatários concluírem.
                                            </p>
                                        </div>
                                        
                                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                                            <p style="color: #666; font-size: 12px; margin: 0; text-align: center;">
                                                Esta assinatura tem validade legal conforme a legislação brasileira.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                                
                                <!-- Footer -->
                                <tr>
                                    <td style="background-color: #1C1C21; padding: 30px; text-align: center;">
                                        <p style="margin: 0 0 10px 0; color: #888888; font-size: 12px;">
                                            <strong style="color: #FFC700;">ConectaKing</strong> - Sistema de Assinatura Digital
                                        </p>
                                        <p style="margin: 0; color: #666666; font-size: 11px;">
                                            Este email foi enviado automaticamente. Não responda este email.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
        `;
        
        await sendEmail(signer.email, signerSubject, signerHtml);
        logger.info(`Notificações enviadas para contrato ${contract.id}`);
    }

    /**
     * Buscar logs de auditoria
     */
    async getAuditLogs(contractId, userId) {
        // Verificar ownership
        const ownsContract = await repository.checkOwnership(contractId, userId);
        if (!ownsContract) {
            throw new Error('Você não tem permissão para visualizar este contrato');
        }

        return await repository.findAuditLogsByContractId(contractId);
    }

    /**
     * Importar PDF e criar contrato
     * @param {Object} userId - ID do usuário
     * @param {Object} file - Arquivo PDF (Multer file object)
     * @param {String} title - Título do contrato
     * @param {Array} signers - Array de signatários (opcional)
     */
    async importPdfContract(userId, file, title, signers = []) {
        if (!file || file.mimetype !== 'application/pdf') {
            throw new Error('Arquivo PDF inválido');
        }

        const fs = require('fs').promises;
        const path = require('path');
        const uploadsDir = path.join(__dirname, '../../uploads/contracts');
        
        // Criar diretório se não existir
        try {
            await fs.mkdir(uploadsDir, { recursive: true });
        } catch (err) {
            // Diretório já existe
        }

        // Ler arquivo PDF
        const pdfBuffer = await fs.readFile(file.path);
        const pdfHash = this.generateSHA256Hash(pdfBuffer);

        // Extrair texto do PDF para permitir edição
        let extractedText = '';
        try {
            const pdfParse = require('pdf-parse');
            const pdfData = await pdfParse(pdfBuffer);
            extractedText = pdfData.text || '';
            logger.info(`Texto extraído do PDF: ${extractedText.length} caracteres`);
        } catch (parseError) {
            logger.warn('Erro ao extrair texto do PDF, continuando sem conteúdo:', parseError);
            extractedText = ''; // Se não conseguir extrair, permite edição manual
        }

        // Salvar PDF no diretório de uploads
        const pdfFileName = `contract_${Date.now()}_${file.originalname}`;
        const pdfPath = path.join(uploadsDir, pdfFileName);
        await fs.writeFile(pdfPath, pdfBuffer);

        // Remover arquivo temporário do multer
        await fs.unlink(file.path).catch(() => {});

        // Criar contrato com conteúdo extraído (permitindo edição)
        const contract = await repository.create({
            user_id: userId,
            template_id: null,
            title: title || file.originalname.replace('.pdf', ''),
            status: TYPES.STATUS.DRAFT,
            contract_type: 'imported',
            pdf_url: `/uploads/contracts/${pdfFileName}`,
            pdf_content: extractedText, // Conteúdo extraído do PDF - agora editável!
            variables: {},
            original_pdf_hash: pdfHash
        });

        // Log de auditoria
        await repository.createAuditLog({
            contract_id: contract.id,
            user_id: userId,
            action: 'imported',
            details: { pdf_filename: file.originalname, pdf_hash: pdfHash },
            ip_address: null,
            user_agent: null
        });

        logger.info(`PDF importado e contrato criado: ${contract.id}`);
        return contract;
    }

    /**
     * Gerar PDF final com assinaturas e relatório de auditoria
     */
    async generateFinalPdf(contractId) {
        const contract = await repository.findById(contractId);
        if (!contract) {
            throw new Error('Contrato não encontrado');
        }

        if (contract.status !== TYPES.STATUS.COMPLETED) {
            throw new Error('Apenas contratos completos podem ter PDF final gerado');
        }

        const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
        const path = require('path');
        const fs = require('fs').promises;

        try {
            // Buscar assinaturas e logs de auditoria
            const signatures = await repository.findSignaturesByContractId(contractId);
            const auditLogs = await repository.findAuditLogsByContractId(contractId);
            const signers = await repository.findSignersByContractId(contractId);

            // Criar novo documento PDF
            const pdfDoc = await PDFDocument.create();
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

            // Se o contrato foi importado de PDF, carregar o PDF original
            if (contract.contract_type === 'imported' && contract.pdf_url) {
                const originalPdfPath = path.join(__dirname, '../../public', contract.pdf_url);
                try {
                    const originalPdfBytes = await fs.readFile(originalPdfPath);
                    const originalPdf = await PDFDocument.load(originalPdfBytes);
                    const pages = await pdfDoc.copyPages(originalPdf, originalPdf.getPageIndices());
                    pages.forEach(page => pdfDoc.addPage(page));
                } catch (err) {
                    // Tentar em uploads/contracts
                    try {
                        const altPath = path.join(__dirname, '../../uploads/contracts', path.basename(contract.pdf_url));
                        const originalPdfBytes = await fs.readFile(altPath);
                        const originalPdf = await PDFDocument.load(originalPdfBytes);
                        const pages = await pdfDoc.copyPages(originalPdf, originalPdf.getPageIndices());
                        pages.forEach(page => pdfDoc.addPage(page));
                    } catch (err2) {
                        logger.warn(`Não foi possível carregar PDF original: ${err2.message}`);
                        // Continuar sem PDF original
                    }
                }
            } else {
                // Se foi criado de template, gerar PDF a partir do conteúdo
                const page = pdfDoc.addPage([595, 842]); // A4

                let y = 800;
                const content = contract.pdf_content || contract.content || '';
                const lines = content.split('\n');

                for (const line of lines) {
                    if (y < 50) {
                        const newPage = pdfDoc.addPage([595, 842]);
                        y = 800;
                    }
                    page.drawText(line, {
                        x: 50,
                        y: y,
                        size: 12,
                        font: line.startsWith('CONTRATO') || line.startsWith('OBJETO') || line.startsWith('VALOR') ? boldFont : font,
                        color: rgb(0, 0, 0),
                    });
                    y -= 20;
                }
            }

            // Aplicar assinaturas nas posições corretas (se tiverem coordenadas)
            for (const signature of signatures) {
                if (signature.signature_image_url && signature.signature_page && signature.signature_x !== null && signature.signature_y !== null) {
                    try {
                        // Carregar imagem da assinatura
                        let imageBytes;
                        
                        if (signature.signature_image_url.startsWith('data:image')) {
                            // Base64
                            const base64Data = signature.signature_image_url.replace(/^data:image\/\w+;base64,/, '');
                            imageBytes = Buffer.from(base64Data, 'base64');
                        } else {
                            // URL de arquivo
                            try {
                                const imagePath = path.join(__dirname, '../../public', signature.signature_image_url);
                                imageBytes = await fs.readFile(imagePath);
                            } catch {
                                // Tentar em uploads
                                const altPath = path.join(__dirname, '../../uploads/contracts', path.basename(signature.signature_image_url));
                                imageBytes = await fs.readFile(altPath);
                            }
                        }
                        
                        // Converter para PNG se necessário usando sharp
                        let signatureImage;
                        try {
                            const sharp = require('sharp');
                            const pngBuffer = await sharp(imageBytes).png().toBuffer();
                            signatureImage = await pdfDoc.embedPng(pngBuffer);
                        } catch {
                            // Tentar embed direto
                            signatureImage = await pdfDoc.embedPng(imageBytes);
                        }

                        // Obter página correta (1-indexed para 0-indexed)
                        const pageIndex = Math.max(0, Math.min(signature.signature_page - 1, pdfDoc.getPageCount() - 1));
                        const targetPage = pdfDoc.getPage(pageIndex);

                        // Aplicar assinatura na posição especificada
                        const sigWidth = signature.signature_width || 200;
                        const sigHeight = signature.signature_height || 80;
                        
                        // Converter coordenadas (Y invertido no PDF)
                        const pageHeight = targetPage.getHeight();
                        const x = signature.signature_x || 50;
                        const y = pageHeight - (signature.signature_y || 100) - sigHeight;

                        // Desenhar fundo do carimbo (retângulo com borda dourada)
                        const stampPadding = 5;
                        const stampX = x - stampPadding;
                        const stampY = y - stampPadding;
                        const stampWidth = sigWidth + (stampPadding * 2);
                        const stampHeight = sigHeight + (stampPadding * 2) + 25; // Espaço extra para texto
                        
                        // Fundo branco do carimbo
                        targetPage.drawRectangle({
                            x: stampX,
                            y: stampY - 25,
                            width: stampWidth,
                            height: stampHeight,
                            color: rgb(1, 1, 1), // Branco
                            borderColor: rgb(0.8, 0.65, 0), // Dourado (#FFC700)
                            borderWidth: 2,
                        });
                        
                        // Desenhar assinatura
                        targetPage.drawImage(signatureImage, {
                            x: x,
                            y: y,
                            width: sigWidth,
                            height: sigHeight
                        });

                        // Adicionar texto abaixo da assinatura com estilo de carimbo
                        const signerName = signature.signer_name || 'Assinante';
                        targetPage.drawText(signerName, {
                            x: x,
                            y: y - 15,
                            size: 9,
                            font: boldFont,
                            color: rgb(0, 0, 0),
                        });
                        
                        // Adicionar data/hora da assinatura
                        const signedDate = new Date(signature.signed_at || new Date()).toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                        targetPage.drawText(signedDate, {
                            x: x,
                            y: y - 28,
                            size: 7,
                            font: font,
                            color: rgb(0.5, 0.5, 0.5),
                        });
                        
                        // Adicionar marca "Assinado via ConectaKing"
                        const stampText = 'Assinado via ConectaKing';
                        const stampTextWidth = boldFont.widthOfTextAtSize(stampText, 6);
                        targetPage.drawText(stampText, {
                            x: stampX + (stampWidth / 2) - (stampTextWidth / 2),
                            y: stampY - 38,
                            size: 6,
                            font: boldFont,
                            color: rgb(0.8, 0.65, 0), // Dourado
                        });
                    } catch (err) {
                        logger.warn(`Erro ao aplicar assinatura na posição: ${err.message}`);
                        // Continuar sem aplicar esta assinatura
                    }
                }
            }

            // Adicionar página de assinaturas (resumo)
            const signaturePage = pdfDoc.addPage([595, 842]);
            let y = 800;
            signaturePage.drawText('ASSINATURAS ELETRÔNICAS', {
                x: 50,
                y: y,
                size: 16,
                font: boldFont,
                color: rgb(0, 0, 0),
            });
            y -= 40;

            for (const signature of signatures) {
                signaturePage.drawText(`${signature.signer_name} (${signature.signer_email})`, {
                    x: 50,
                    y: y,
                    size: 12,
                    font: font,
                    color: rgb(0, 0, 0),
                });
                y -= 20;
                signaturePage.drawText(`Assinado em: ${new Date(signature.signed_at).toLocaleString('pt-BR')}`, {
                    x: 50,
                    y: y,
                    size: 10,
                    font: font,
                    color: rgb(0.5, 0.5, 0.5),
                });
                y -= 20;
                signaturePage.drawText(`Tipo: ${signature.signature_type}`, {
                    x: 50,
                    y: y,
                    size: 10,
                    font: font,
                    color: rgb(0.5, 0.5, 0.5),
                });
                if (signature.signature_page && signature.signature_x !== null) {
                    signaturePage.drawText(`Posição: Página ${signature.signature_page}, X: ${signature.signature_x}, Y: ${signature.signature_y}`, {
                        x: 50,
                        y: y - 15,
                        size: 9,
                        font: font,
                        color: rgb(0.3, 0.3, 0.3),
                    });
                    y -= 15;
                }
                y -= 15;

                if (y < 200) {
                    const newPage = pdfDoc.addPage([595, 842]);
                    y = 800;
                }
            }

            // Adicionar página de Relatório de Assinaturas (Auditoria)
            const auditPage = pdfDoc.addPage([595, 842]);
            y = 800;

            auditPage.drawText('RELATÓRIO DE ASSINATURAS E AUDITORIA', {
                x: 50,
                y: y,
                size: 16,
                font: boldFont,
                color: rgb(0, 0, 0),
            });
            y -= 40;

            auditPage.drawText('Este documento foi assinado eletronicamente usando o sistema ConectaKing.', {
                x: 50,
                y: y,
                size: 10,
                font: font,
                color: rgb(0, 0, 0),
            });
            y -= 30;

            auditPage.drawText('Hashes SHA-256:', {
                x: 50,
                y: y,
                size: 12,
                font: boldFont,
                color: rgb(0, 0, 0),
            });
            y -= 20;

            auditPage.drawText(`Hash Original: ${contract.original_pdf_hash || 'N/A'}`, {
                x: 50,
                y: y,
                size: 9,
                font: font,
                color: rgb(0, 0, 0),
            });
            y -= 15;

            // NOTA: O hash final será calculado após salvar o PDF
            // Por enquanto, usaremos um placeholder
            auditPage.drawText(`Hash Final: [Será calculado após geração do PDF]`, {
                x: 50,
                y: y,
                size: 9,
                font: font,
                color: rgb(0.5, 0.5, 0.5),
            });
            y -= 30;

            auditPage.drawText('Log de Auditoria:', {
                x: 50,
                y: y,
                size: 12,
                font: boldFont,
                color: rgb(0, 0, 0),
            });
            y -= 20;

            for (const log of auditLogs) {
                if (y < 100) {
                    const newPage = pdfDoc.addPage([595, 842]);
                    y = 800;
                }

                const logDate = new Date(log.created_at).toLocaleString('pt-BR');
                auditPage.drawText(`${logDate} - ${log.action}`, {
                    x: 50,
                    y: y,
                    size: 9,
                    font: font,
                    color: rgb(0, 0, 0),
                });
                y -= 15;

                if (log.ip_address) {
                    auditPage.drawText(`IP: ${log.ip_address}`, {
                        x: 70,
                        y: y,
                        size: 8,
                        font: font,
                        color: rgb(0.5, 0.5, 0.5),
                    });
                    y -= 12;
                }
            }

            y -= 30;
            if (y < 200) {
                const newPage = pdfDoc.addPage([595, 842]);
                y = 800;
            }

            // Adicionar texto legal fixo
            const legalText = `Este documento foi gerado automaticamente pelo sistema ConectaKing. 
As assinaturas eletrônicas são válidas de acordo com a legislação brasileira (Lei nº 14.063/2020).
O hash SHA-256 garante a integridade do documento.
Data de geração: ${new Date().toLocaleString('pt-BR')}`;

            const legalLines = legalText.split('\n');
            for (const line of legalLines) {
                if (y < 50) {
                    const newPage = pdfDoc.addPage([595, 842]);
                    y = 800;
                }
                auditPage.drawText(line, {
                    x: 50,
                    y: y,
                    size: 8,
                    font: font,
                    color: rgb(0.3, 0.3, 0.3),
                });
                y -= 12;
            }

            // Salvar PDF final
            const pdfBytes = await pdfDoc.save();
            const finalPdfHash = this.generateSHA256Hash(Buffer.from(pdfBytes));
            
            const fileName = `contract_${contractId}_signed_${Date.now()}.pdf`;
            const uploadsDir = path.join(__dirname, '../../public/uploads/contracts');
            
            try {
                await fs.mkdir(uploadsDir, { recursive: true });
            } catch (err) {
                // Diretório já existe
            }

            const finalPdfPath = path.join(uploadsDir, fileName);
            await fs.writeFile(finalPdfPath, pdfBytes);

            const finalPdfUrl = `/uploads/contracts/${fileName}`;

            // Atualizar contrato com URL e hash do PDF final
            await repository.update(contractId, {
                final_pdf_url: finalPdfUrl,
                final_pdf_hash: finalPdfHash
            });

            logger.info(`PDF final gerado para contrato ${contractId}: ${finalPdfUrl} (Hash: ${finalPdfHash.substring(0, 16)}...)`);

            return {
                pdf_url: finalPdfUrl,
                pdf_hash: finalPdfHash
            };
        } catch (error) {
            logger.error('Erro ao gerar PDF final:', error);
            throw new Error(`Erro ao gerar PDF final: ${error.message}`);
        }
    }

    /**
     * Obter caminho do PDF final para download
     */
    async downloadFinalPdf(contractId, userId) {
        // Verificar ownership
        const ownsContract = await repository.checkOwnership(contractId, userId);
        if (!ownsContract) {
            throw new Error('Você não tem permissão para baixar este contrato');
        }

        const contract = await repository.findById(contractId);
        if (!contract) {
            throw new Error('Contrato não encontrado');
        }

        const path = require('path');
        const fs = require('fs').promises;

        // Se houver PDF final, retornar ele
        if (contract.final_pdf_url) {
            const filePath = path.join(__dirname, '../../public', contract.final_pdf_url);
            const fileName = `${contract.title.replace(/[^a-z0-9]/gi, '_')}_assinado.pdf`;
            return { filePath, fileName };
        }

        // Senão, gerar PDF final
        const pdfData = await this.generateFinalPdf(contractId);
        const filePath = path.join(__dirname, '../../public', pdfData.pdf_url);
        const fileName = `${contract.title.replace(/[^a-z0-9]/gi, '_')}_assinado.pdf`;
        
        return { filePath, fileName };
    }

    /**
     * Visualizar PDF original do contrato (importado ou de template)
     */
    async viewPdf(contractId, userId) {
        // Verificar ownership
        const ownsContract = await repository.checkOwnership(contractId, userId);
        if (!ownsContract) {
            throw new Error('Você não tem permissão para visualizar este contrato');
        }

        const contract = await repository.findById(contractId);
        if (!contract) {
            throw new Error('Contrato não encontrado');
        }

        const path = require('path');
        const fs = require('fs').promises;

        // Se for PDF importado, retornar o PDF original
        if (contract.contract_type === 'imported' && contract.pdf_url) {
            // pdf_url pode ser /uploads/contracts/... ou caminho completo
            let pdfPath = contract.pdf_url;
            if (!path.isAbsolute(pdfPath)) {
                // Se for caminho relativo, tentar em uploads/contracts primeiro
                pdfPath = path.join(__dirname, '../../uploads/contracts', path.basename(pdfPath));
                // Se não existir, tentar em public
                try {
                    await fs.access(pdfPath);
                } catch {
                    pdfPath = path.join(__dirname, '../../public', contract.pdf_url);
                }
            }
            const fileName = `${contract.title.replace(/[^a-z0-9]/gi, '_')}_original.pdf`;
            return { filePath: pdfPath, fileName };
        }

        // Se não for importado ou não tiver PDF URL, gerar preview do conteúdo
        throw new Error('PDF não disponível para visualização');
    }

    /**
     * Salvar posições de assinaturas para um contrato
     */
    async saveSignaturePositions(contractId, positions) {
        const client = await require('../../db').pool.connect();
        try {
            await client.query('BEGIN');
            
            // Buscar signatários do contrato
            const signers = await repository.findSignersByContractId(contractId);
            const signerMap = {};
            signers.forEach(s => {
                signerMap[s.id] = s;
            });
            
            // Atualizar posições para cada signatário
            const updates = [];
            for (const [signerId, position] of Object.entries(positions)) {
                if (!signerMap[signerId]) {
                    logger.warn(`Signatário ${signerId} não encontrado para contrato ${contractId}`);
                    continue;
                }
                
                // Atualizar signatário com posições (usando campos temporários ou tabela auxiliar)
                // Por enquanto, vamos armazenar em um campo JSON na tabela de signatários
                // ou criar uma tabela de posições temporárias
                await repository.updateSigner(signerId, {
                    signature_page: position.page || 1,
                    signature_x: position.x || null,
                    signature_y: position.y || null,
                    signature_width: position.width || 150,
                    signature_height: position.height || 60
                }, client);
                
                updates.push({ signerId, position });
            }
            
            await client.query('COMMIT');
            logger.info(`Posições salvas para ${updates.length} signatários no contrato ${contractId}`);
            
            return { saved: updates.length, positions: updates };
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Erro ao salvar posições:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Buscar posições de assinaturas de um contrato
     */
    async getSignaturePositions(contractId) {
        const signers = await repository.findSignersByContractId(contractId);
        
        const positions = {};
        signers.forEach(signer => {
            if (signer.signature_page && signer.signature_x !== null) {
                positions[signer.id] = {
                    page: signer.signature_page,
                    x: signer.signature_x,
                    y: signer.signature_y,
                    width: signer.signature_width || 150,
                    height: signer.signature_height || 60
                };
            }
        });
        
        return positions;
    }
}

module.exports = new ContractService();
