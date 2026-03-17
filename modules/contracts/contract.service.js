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
        const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        const nanoid = customAlphabet(alphabet, 21);
        return nanoid();
    }

    /**
     * Slug legível para URL de assinatura: nome-do-contrato-nome-pessoa-xxxxxx
     */
    generateSignSlug(contractTitle, signerName) {
        const { customAlphabet } = require('nanoid');
        const slugify = (s) => String(s || '')
            .normalize('NFD').replace(/\p{Diacritic}/gu, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') || 'contrato';
        const titlePart = slugify(contractTitle).slice(0, 50);
        const namePart = slugify(signerName).slice(0, 30) || 'signatario';
        const shortId = customAlphabet('0123456789abcdef', 6)();
        return [titlePart, namePart, shortId].filter(Boolean).join('-');
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
        // Garantir conteúdo ao criar a partir de texto colado (front envia "content", não "pdf_content")
        if (!sanitized.pdf_content && data.content) {
            const fromContent = validators.sanitize({ pdf_content: data.content }).pdf_content;
            sanitized.pdf_content = fromContent != null ? fromContent : (typeof data.content === 'string' ? data.content : '');
        }
        // Usar a primeira linha do conteúdo como título quando for documento a partir de texto
        if (data.source === 'paste' && data.content && typeof data.content === 'string') {
            const firstLine = data.content.trim().split(/\r?\n/)[0];
            const lineTitle = firstLine ? firstLine.trim() : '';
            if (lineTitle.length > 0) {
                sanitized.title = lineTitle.length > 255 ? lineTitle.substring(0, 252) + '...' : lineTitle;
            }
        }

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
     * Normaliza status: se todos os signatários assinaram mas status está sent/signed, retorna como 'completed'.
     */
    async findByUserId(userId, filters = {}) {
        const result = await repository.findByUserId(userId, filters);
        if (!result.data || result.data.length === 0) return result;
        const ids = result.data.map(c => c.id);
        const counts = await repository.getSignersSignedCountByContractIds(ids);
        result.data.forEach(c => {
            const k = counts[c.id];
            if (k && k.total > 0 && k.signed === k.total && (c.status === TYPES.STATUS.SENT || c.status === TYPES.STATUS.SIGNED)) {
                c.status = TYPES.STATUS.COMPLETED;
            }
        });
        return result;
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
    async sendForSignature(id, userId, signers, signaturePositions = null, sendEmail = false) {
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
                const contractForSlug = await repository.findById(id);
                const signSlug = this.generateSignSlug(contractForSlug?.title, sanitized.name);

                const signer = await repository.createSigner({
                    contract_id: id,
                    ...sanitized,
                    sign_token: signToken,
                    sign_slug: signSlug,
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

            // Buscar contrato atualizado
            const updatedContract = await repository.findById(id);

            // Gerar links de assinatura (página de assinar fica na API para não dar 404)
            const apiUrl = (config.urls.api || 'https://conectaking-api.onrender.com').replace(/\/$/, '');
            const signLinks = createdSigners.map(signer => ({
                id: signer.id,
                name: signer.name,
                email: signer.email,
                sign_token: signer.sign_token,
                url: `${apiUrl}/contract/sign/${signer.sign_slug || signer.sign_token}`
            }));

            const sendEmailOption = Boolean(sendEmail);
            if (sendEmailOption) {
                await this.sendSignEmails(updatedContract, createdSigners, false);
                logger.info(`Contrato enviado para assinatura (com e-mail): ${id} com ${createdSigners.length} signatários`);
            } else {
                logger.info(`Contrato enviado para assinatura (apenas links): ${id} com ${createdSigners.length} signatários`);
            }
            
            return {
                contract: updatedContract,
                signers: createdSigners,
                signLinks
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Reenviar link de assinatura para um signatário (apenas se ainda não assinou)
     */
    async resendSignLink(contractId, userId, signerId) {
        const ownsContract = await repository.checkOwnership(contractId, userId);
        if (!ownsContract) {
            throw new Error('Você não tem permissão para este contrato');
        }
        const contract = await repository.findById(contractId);
        if (!contract) {
            throw new Error('Contrato não encontrado');
        }
        if (contract.status !== TYPES.STATUS.SENT && contract.status !== TYPES.STATUS.SIGNED) {
            throw new Error('Só é possível reenviar o link para contratos enviados');
        }
        const signer = await repository.findSignerById(signerId);
        if (!signer || signer.contract_id !== parseInt(contractId, 10)) {
            throw new Error('Signatário não encontrado');
        }
        if (signer.signed_at) {
            throw new Error('Este signatário já assinou; não é possível reenviar o link');
        }

        const apiUrl = (config.urls.api || 'https://conectaking-api.onrender.com').replace(/\/$/, '');
        const signUrl = `${apiUrl}/contract/sign/${signer.sign_slug || signer.sign_token}`;

        logger.info(`Link de assinatura gerado (sem e-mail) para signatário ${signerId} do contrato ${contractId}`);
        return { sent: false, email: signer.email, url: signUrl };
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
        const apiUrl = (config.urls.api || 'https://conectaking-api.onrender.com').replace(/\/$/, '');
        
        for (const signer of signers) {
            const signUrl = `${apiUrl}/contract/sign/${signer.sign_slug || signer.sign_token}`;
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
            
            const subject = `Contrato para assinatura: ${contract.title || 'Documento'}`;
            
            const expiryStr = expiryDate.toLocaleDateString('pt-BR');
            const plainText = `Olá, ${signer.name}!\n\nVocê foi convidado a assinar o documento "${contract.title || 'Contrato'}" de forma digital.\n\nAcesse o link abaixo para ler o documento e assinar:\n${signUrl}\n\nEste link expira em ${TYPES.DEFAULT_TOKEN_EXPIRY_DAYS} dias (${expiryStr}).\n\nPassos: 1) Abra o link 2) Revise o conteúdo 3) Escolha como assinar (desenhar, enviar imagem ou digitar nome) 4) Confirme.\n\nEnviado pelo Conecta King.`;
            
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
                                                Você foi convidado a assinar o documento abaixo de forma digital. Trata-se do serviço/contrato descrito no título. Basta abrir o link, revisar o conteúdo e concluir a assinatura.
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

            await sendEmail(signer.email, subject, html, plainText);
            
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
     * Cancelar contrato (invalidar links de assinatura; contrato continua na lista como cancelado)
     */
    async cancel(contractId, userId) {
        const ownsContract = await repository.checkOwnership(contractId, userId);
        if (!ownsContract) throw new Error('Você não tem permissão para cancelar este contrato');
        const contract = await repository.findById(contractId);
        if (!contract) throw new Error('Contrato não encontrado');
        if (contract.status === TYPES.STATUS.CANCELLED) {
            return contract;
        }
        await repository.update(contractId, { status: TYPES.STATUS.CANCELLED });
        const signers = await repository.findSignersByContractId(contractId);
        const now = new Date();
        for (const s of signers) {
            await repository.updateSigner(s.id, { token_expires_at: now });
        }
        await repository.createAuditLog({
            contract_id: contractId,
            user_id: userId,
            action: TYPES.AUDIT_ACTIONS.CANCELLED,
            details: { cancelled_by_owner: true },
            ip_address: null,
            user_agent: null
        });
        logger.info(`Contrato cancelado: ${contractId}`);
        return await repository.findById(contractId);
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
     * Estatísticas do usuário (completed inclui contratos com todos assinados mesmo que status seja sent/signed)
     */
    async getStats(userId) {
        const stats = await repository.getStats(userId);
        const extraCompleted = await repository.countContractsAllSignedButNotCompleted(userId);
        if (extraCompleted > 0) {
            stats.completed = parseInt(stats.completed || 0, 10) + extraCompleted;
        }
        return stats;
    }

    /**
     * Buscar signatário por token ou por slug (público)
     */
    async findSignerByTokenOrSlug(tokenOrSlug, allowSigned = false) {
        let signer = await repository.findSignerByToken(tokenOrSlug);
        if (!signer) signer = await repository.findSignerBySlug(tokenOrSlug);
        if (!signer) return null;
        if (new Date(signer.token_expires_at) < new Date()) return null;
        if (!allowSigned && signer.signed_at) return null;
        return signer;
    }

    /**
     * Buscar signatário por token (público)
     */
    async findSignerByToken(token, allowSigned = false) {
        const signer = await repository.findSignerByToken(token);
        if (!signer) {
            const bySlug = await repository.findSignerBySlug(token);
            if (bySlug) return this._validateSignerForPage(bySlug, allowSigned);
            throw new Error('Token de assinatura inválido');
        }
        return this._validateSignerForPage(signer, allowSigned);
    }

    _validateSignerForPage(signer, allowSigned) {
        if (new Date(signer.token_expires_at) < new Date()) {
            throw new Error('Token de assinatura expirado');
        }
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
        const signUrl = `${frontendUrl}/contract/sign/${signer.sign_slug || signer.sign_token}`;
        
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

        // Se todos assinaram, notificar TODOS os signatários com PDF anexado
        if (allSigned) {
            const allSigners = await repository.findSignersByContractId(contract.id);
            const path = require('path');
            const fs = require('fs').promises;
            let pdfAttachment = null;
            
            // Preparar anexo do PDF final se disponível
            if (contract.final_pdf_url) {
                try {
                    const pdfPath = path.join(__dirname, '../../public', contract.final_pdf_url);
                    const pdfExists = await fs.access(pdfPath).then(() => true).catch(() => false);
                    if (pdfExists) {
                        pdfAttachment = {
                            filename: `${contract.title.replace(/[^a-z0-9]/gi, '_')}_assinado.pdf`,
                            path: pdfPath
                        };
                    }
                } catch (error) {
                    logger.warn('Erro ao preparar PDF para anexo:', error);
                }
            }
            
            // Enviar email para cada signatário
            for (const signerToNotify of allSigners) {
                if (signerToNotify.email) {
                    const completeSubject = `🎉 Contrato Completo: ${contract.title}`;
                    const completeHtml = `
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
                                                        <span style="font-size: 40px;">🎉</span>
                                                    </div>
                                                    <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: 700;">
                                                        Contrato Completo!
                                                    </h1>
                                                </td>
                                            </tr>
                                            
                                            <!-- Content -->
                                            <tr>
                                                <td style="padding: 40px 30px;">
                                                    <p style="color: #333; font-size: 18px; margin: 0 0 20px 0; font-weight: 600;">
                                                        Olá, <strong style="color: #16A34A;">${signerToNotify.name}</strong>!
                                                    </p>
                                                    
                                                    <div style="background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%); border-left: 4px solid #22C55E; padding: 20px; margin: 25px 0; border-radius: 8px;">
                                                        <p style="color: #333; font-size: 16px; margin: 0; line-height: 1.6;">
                                                            🎉 <strong>Todos os signatários assinaram!</strong><br><br>
                                                            O contrato <strong>"${contract.title}"</strong> está completo e pronto. Uma cópia do contrato assinado está anexada a este email.
                                                        </p>
                                                    </div>
                                                    
                                                    <div style="background: #F5F5F5; border-radius: 8px; padding: 20px; margin: 25px 0;">
                                                        <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">
                                                            <strong>📅 Data de conclusão:</strong> ${new Date(contract.completed_at || new Date()).toLocaleString('pt-BR')}
                                                        </p>
                                                        <p style="margin: 0; color: #666; font-size: 14px;">
                                                            <strong>📄 Contrato:</strong> ${contract.title}
                                                        </p>
                                                    </div>
                                                    
                                                    <div style="text-align: center; margin: 30px 0;">
                                                        <a href="${frontendUrl}/dashboard#contratos" style="display: inline-block; background: linear-gradient(135deg, #FFC700 0%, #F59E0B 100%); color: #000; padding: 18px 40px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 12px rgba(255, 199, 0, 0.3);">
                                                            📥 Baixar Contrato Assinado
                                                        </a>
                                                    </div>
                                                    
                                                    <div style="background: #E8F5E9; border: 1px solid #4CAF50; border-radius: 8px; padding: 15px; margin: 20px 0;">
                                                        <p style="margin: 0; color: #2E7D32; font-size: 14px;">
                                                            <strong>✅ Status:</strong> Contrato completo e assinado por todos os signatários.
                                                        </p>
                                                    </div>
                                                    
                                                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                                                        <p style="color: #666; font-size: 12px; margin: 0; text-align: center;">
                                                            Esta assinatura tem validade legal conforme a legislação brasileira (Lei nº 14.063/2020).
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
                    
                    const attachments = pdfAttachment ? [pdfAttachment] : [];
                    await sendEmail(signerToNotify.email, completeSubject, completeHtml, null, attachments);
                    logger.info(`Email de contrato completo enviado para ${signerToNotify.email}`);
                }
            }
        }
        
        // Notificar o signatário atual (confirmação individual)
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
                                        
                                        ${!allSigned ? `
                                        <div style="background: #E3F2FD; border: 1px solid #2196F3; border-radius: 8px; padding: 15px; margin: 20px 0;">
                                            <p style="margin: 0; color: #1565C0; font-size: 14px; line-height: 1.6;">
                                                <strong>⏳ Aguardando:</strong> Ainda há signatários pendentes. Você receberá uma cópia do contrato assinado por email quando todos os signatários concluírem.
                                            </p>
                                        </div>
                                        ` : ''}
                                        
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

        let pdfUrlToStore = null;
        const { uploadContractPdfToR2 } = require('../../utils/contractPdfStorage');
        const r2Result = await uploadContractPdfToR2(pdfBuffer, userId, file.originalname || 'documento.pdf');
        if (r2Result && r2Result.publicUrl) {
            pdfUrlToStore = r2Result.publicUrl;
            logger.info('PDF do contrato enviado para R2 (persistente): ' + r2Result.key);
        }
        if (!pdfUrlToStore) {
            // Fallback: salvar em disco (pode ser perdido após reinício no Render)
            const pdfFileName = `contract_${Date.now()}_${file.originalname}`;
            const pdfPath = path.join(uploadsDir, pdfFileName);
            await fs.writeFile(pdfPath, pdfBuffer);
            pdfUrlToStore = `/uploads/contracts/${pdfFileName}`;
        }

        // Remover arquivo temporário do multer
        await fs.unlink(file.path).catch(() => {});

        // Criar contrato com conteúdo extraído (permitindo edição)
        const contract = await repository.create({
            user_id: userId,
            template_id: null,
            title: title || file.originalname.replace('.pdf', ''),
            status: TYPES.STATUS.DRAFT,
            contract_type: 'imported',
            pdf_url: pdfUrlToStore,
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
     * Reenviar/substituir o PDF de um contrato existente (ex.: arquivo perdido no servidor).
     * Envia para R2 se configurado, senão disco. Atualiza pdf_url do contrato.
     */
    async reuploadContractPdf(contractId, userId, file) {
        if (!file || file.mimetype !== 'application/pdf') {
            throw new Error('Arquivo PDF inválido');
        }
        const ownsContract = await repository.checkOwnership(contractId, userId);
        if (!ownsContract) {
            throw new Error('Você não tem permissão para alterar este contrato');
        }
        const contract = await repository.findById(contractId);
        if (!contract) {
            throw new Error('Contrato não encontrado');
        }
        if (contract.contract_type !== 'imported') {
            throw new Error('Apenas contratos importados (PDF) podem ter o arquivo substituído');
        }
        const fs = require('fs').promises;
        const path = require('path');
        const uploadsDir = path.join(__dirname, '../../uploads/contracts');
        try {
            await fs.mkdir(uploadsDir, { recursive: true });
        } catch (err) {}
        const pdfBuffer = await fs.readFile(file.path);
        await fs.unlink(file.path).catch(() => {});
        let pdfUrlToStore = null;
        const { uploadContractPdfToR2 } = require('../../utils/contractPdfStorage');
        const r2Result = await uploadContractPdfToR2(pdfBuffer, userId, file.originalname || 'documento.pdf');
        if (r2Result && r2Result.publicUrl) {
            pdfUrlToStore = r2Result.publicUrl;
            logger.info('Reupload contrato PDF para R2: ' + r2Result.key);
        }
        if (!pdfUrlToStore) {
            const pdfFileName = `contract_${Date.now()}_${file.originalname}`;
            const pdfPath = path.join(uploadsDir, pdfFileName);
            await fs.writeFile(pdfPath, pdfBuffer);
            pdfUrlToStore = `/uploads/contracts/${pdfFileName}`;
        }
        await repository.update(contractId, { pdf_url: pdfUrlToStore });
        const updated = await repository.findById(contractId);
        logger.info('PDF do contrato atualizado: ' + contractId);
        return updated;
    }

    /**
     * Gerar PDF final com assinaturas e relatório de auditoria
     */
    async generateFinalPdf(contractId) {
        const contract = await repository.findById(contractId);
        if (!contract) {
            throw new Error('Contrato não encontrado');
        }

        const signers = await repository.findSignersByContractId(contractId);
        const allSigned = signers.length > 0 && signers.every(s => s.signed_at != null);
        const atLeastOneSigned = signers.some(s => s.signed_at != null);
        const canGenerate = contract.status === TYPES.STATUS.COMPLETED || allSigned || atLeastOneSigned;
        if (!canGenerate) {
            throw new Error('Apenas contratos completos podem ter PDF final gerado');
        }

        const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
        const path = require('path');
        const fs = require('fs').promises;

        try {
            // Buscar assinaturas e logs de auditoria
            const signatures = await repository.findSignaturesByContractId(contractId);
            const auditLogs = await repository.findAuditLogsByContractId(contractId);

            // Criar novo documento PDF
            const pdfDoc = await PDFDocument.create();
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

            // Se o contrato foi importado de PDF, carregar o PDF original
            if (contract.contract_type === 'imported' && contract.pdf_url) {
                const url = (contract.pdf_url || '').trim();
                let originalPdfBytes = null;
                if (url.startsWith('http://') || url.startsWith('https://')) {
                    const fetch = (typeof globalThis.fetch === 'function') ? globalThis.fetch : require('node-fetch');
                    const res = await fetch(url);
                    if (res.ok) originalPdfBytes = Buffer.from(await res.arrayBuffer());
                }
                if (!originalPdfBytes) {
                    try {
                        originalPdfBytes = await fs.readFile(path.join(__dirname, '../../public', contract.pdf_url));
                    } catch (err) {
                        try {
                            originalPdfBytes = await fs.readFile(path.join(__dirname, '../../uploads/contracts', path.basename(contract.pdf_url)));
                        } catch (err2) {
                            logger.warn(`Não foi possível carregar PDF original: ${err2.message}`);
                        }
                    }
                }
                if (originalPdfBytes) {
                    try {
                        const originalPdf = await PDFDocument.load(originalPdfBytes);
                        const pages = await pdfDoc.copyPages(originalPdf, originalPdf.getPageIndices());
                        pages.forEach(page => pdfDoc.addPage(page));
                    } catch (loadErr) {
                        logger.warn('Erro ao carregar PDF no pdf-lib:', loadErr.message);
                    }
                }
            }
            if (pdfDoc.getPageCount() === 0) {
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

            // Helper: obter bytes da imagem da assinatura (base64, URL local ou HTTP)
            const getSignatureImageBytes = async (sig) => {
                const src = sig.signature_image_url || (sig.signature_data && sig.signature_data.startsWith('data:image') ? sig.signature_data : null);
                if (!src) return null;
                if (src.startsWith('data:image')) {
                    const base64Data = src.replace(/^data:image\/\w+;base64,/, '');
                    return Buffer.from(base64Data, 'base64');
                }
                if (src.startsWith('http://') || src.startsWith('https://')) {
                    const fetchFn = typeof globalThis.fetch === 'function' ? globalThis.fetch : require('node-fetch');
                    const res = await fetchFn(src);
                    if (res.ok) return Buffer.from(await res.arrayBuffer());
                    return null;
                }
                try {
                    const imagePath = path.join(__dirname, '../../public', src);
                    return await fs.readFile(imagePath);
                } catch {
                    try {
                        const altPath = path.join(__dirname, '../../uploads/contracts', path.basename(src));
                        return await fs.readFile(altPath);
                    } catch {
                        return null;
                    }
                }
            };

            const pageCount = pdfDoc.getPageCount();
            const defaultSignPage = Math.min(3, Math.max(1, pageCount)); // página 3 ou última
            const defaultYFromTop = 200;
            const defaultStepY = 110;

            // Aplicar assinaturas no contrato (com coordenadas ou posição padrão)
            for (let sigIndex = 0; sigIndex < signatures.length; sigIndex++) {
                const signature = signatures[sigIndex];
                const hasImage = !!(signature.signature_image_url || (signature.signature_data && signature.signature_data.startsWith('data:image')));
                if (!hasImage) continue;

                try {
                    const imageBytes = await getSignatureImageBytes(signature);
                    if (!imageBytes) continue;

                    let signatureImage;
                    try {
                        const sharp = require('sharp');
                        const pngBuffer = await sharp(imageBytes).png().toBuffer();
                        signatureImage = await pdfDoc.embedPng(pngBuffer);
                    } catch {
                        signatureImage = await pdfDoc.embedPng(imageBytes);
                    }

                    const sigWidth = signature.signature_width || 200;
                    const sigHeight = signature.signature_height || 80;
                    const useDefaultPos = signature.signature_x == null || signature.signature_y == null;
                    const pageNum = useDefaultPos ? defaultSignPage : (signature.signature_page || 1);
                    const pageIndex = Math.max(0, Math.min(pageNum - 1, pageCount - 1));
                    const targetPage = pdfDoc.getPage(pageIndex);
                    const pageHeight = targetPage.getHeight();

                    let x, y;
                    if (useDefaultPos) {
                        x = 80;
                        const yFromTop = defaultYFromTop + sigIndex * defaultStepY;
                        y = pageHeight - yFromTop - sigHeight;
                    } else {
                        x = signature.signature_x || 50;
                        y = pageHeight - (signature.signature_y || 100) - sigHeight;
                    }

                    const stampPadding = 5;
                    const stampX = x - stampPadding;
                    const stampY = y - stampPadding;
                    const stampWidth = sigWidth + (stampPadding * 2);
                    const stampHeight = sigHeight + (stampPadding * 2) + 25;

                    targetPage.drawRectangle({
                        x: stampX,
                        y: stampY - 25,
                        width: stampWidth,
                        height: stampHeight,
                        color: rgb(1, 1, 1),
                        borderColor: rgb(0.8, 0.65, 0),
                        borderWidth: 2,
                    });

                    targetPage.drawImage(signatureImage, { x, y, width: sigWidth, height: sigHeight });

                    const signerName = signature.signer_name || 'Assinante';
                    targetPage.drawText(signerName, {
                        x, y: y - 15, size: 9, font: boldFont, color: rgb(0, 0, 0),
                    });
                    const signedDate = new Date(signature.signed_at || new Date()).toLocaleString('pt-BR', {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    });
                    targetPage.drawText(signedDate, {
                        x, y: y - 28, size: 7, font: font, color: rgb(0.5, 0.5, 0.5),
                    });
                    const stampText = 'Assinado via ConectaKing';
                    const stampTextWidth = boldFont.widthOfTextAtSize(stampText, 6);
                    targetPage.drawText(stampText, {
                        x: stampX + (stampWidth / 2) - (stampTextWidth / 2),
                        y: stampY - 38,
                        size: 6, font: boldFont, color: rgb(0.8, 0.65, 0),
                    });
                } catch (err) {
                    logger.warn(`Erro ao aplicar assinatura no contrato: ${err.message}`);
                }
            }

            // Relatório de Assinaturas — layout igual ZapSign: logo canto superior direito, QR abaixo do hash, seções com linhas, quadros por signatário
            const pageWidth = 595;
            const marginLeft = 50;
            const marginRight = 50;
            const rightColStart = 370;
            const contentWidth = rightColStart - marginLeft - 20;
            const maxCharsLine9 = 68;
            const maxCharsLine8 = 78;
            const maxCharsLine7 = 88;
            const truncate = (s, max) => (s && s.length > max) ? s.substring(0, max) + '...' : (s || '');
            const drawHLine = (page, yPos, fromX = marginLeft, toX = pageWidth - marginRight) => {
                page.drawRectangle({
                    x: fromX, y: yPos, width: toX - fromX, height: 1.5,
                    color: rgb(0.65, 0.65, 0.65),
                });
            };

            let reportPage = pdfDoc.addPage([595, 842]);
            let y = 830;

            const baseUrl = (config.urls && config.urls.api) ? String(config.urls.api).replace(/\/$/, '') : (process.env.API_URL || 'https://conectaking-api.onrender.com').replace(/\/$/, '');

            // ---------- CANTO SUPERIOR DIREITO: LOGOMARCA (igual ZapSign) ----------
            const logoBoxX = rightColStart;
            const logoBoxY = 810;
            const logoBoxW = pageWidth - marginRight - logoBoxX;
            reportPage.drawRectangle({
                x: logoBoxX - 6, y: logoBoxY - 50, width: logoBoxW + 12, height: 58,
                color: rgb(0.98, 0.98, 0.98),
                borderColor: rgb(0.85, 0.85, 0.85),
                borderWidth: 1,
            });
            let logoDrawn = false;
            const logoUrl = (config.urls && config.urls.logoReport) ? config.urls.logoReport : 'https://i.ibb.co/60sW9k75/logo.png';
            try {
                const fetchFn = typeof globalThis.fetch === 'function' ? globalThis.fetch : require('node-fetch');
                const logoRes = await fetchFn(logoUrl);
                if (logoRes && logoRes.ok) {
                    const logoBuf = Buffer.from(await logoRes.arrayBuffer());
                    let logoImg;
                    try {
                        logoImg = await pdfDoc.embedPng(logoBuf);
                    } catch {
                        try {
                            logoImg = await pdfDoc.embedJpg(logoBuf);
                        } catch {
                            logoImg = null;
                        }
                    }
                    if (logoImg) {
                        const logoW = Math.min(80, logoImg.width);
                        const logoH = (logoImg.height / logoImg.width) * logoW;
                        reportPage.drawImage(logoImg, {
                            x: logoBoxX,
                            y: logoBoxY - logoH,
                            width: logoW,
                            height: logoH,
                        });
                        reportPage.drawText('CONECTA KING', {
                            x: logoBoxX + logoW + 6, y: logoBoxY - 12, size: 11, font: boldFont, color: rgb(0.1, 0.1, 0.1),
                        });
                        reportPage.drawText('Assinaturas digitais', {
                            x: logoBoxX + logoW + 6, y: logoBoxY - 24, size: 7, font: font, color: rgb(0.45, 0.45, 0.45),
                        });
                        logoDrawn = true;
                    }
                }
            } catch (logoErr) {
                logger.warn('Logo do relatório não carregada:', logoErr.message);
            }
            if (!logoDrawn) {
                reportPage.drawText('CONECTA KING', {
                    x: logoBoxX + 4, y: logoBoxY - 14, size: 14, font: boldFont, color: rgb(0.85, 0.7, 0),
                });
                reportPage.drawText('Assinaturas digitais', {
                    x: logoBoxX + 4, y: logoBoxY - 28, size: 8, font: font, color: rgb(0.5, 0.5, 0.5),
                });
            }

            // ---------- TÍTULO E CABEÇALHO ----------
            reportPage.drawText('Relatório de Assinaturas', {
                x: marginLeft, y, size: 20, font: boldFont, color: rgb(0, 0, 0),
            });
            y -= 28;
            drawHLine(reportPage, y);
            y -= 16;

            const timestampStr = `Datas e horários em UTC-0300 (America/Sao_Paulo). Última atualização em ${new Date().toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })} (UTC-0300).`;
            reportPage.drawText(truncate(timestampStr, 95), {
                x: marginLeft, y, size: 8, font: font, color: rgb(0.4, 0.4, 0.4),
            });
            y -= 24;

            reportPage.drawText('Status: Assinado', {
                x: marginLeft, y, size: 12, font: boldFont, color: rgb(0, 0.45, 0),
            });
            y -= 26;
            drawHLine(reportPage, y);
            y -= 20;

            // ---------- INFORMAÇÕES DO DOCUMENTO (esquerda) ----------
            reportPage.drawText('Informações do documento', {
                x: marginLeft, y, size: 12, font: boldFont, color: rgb(0, 0, 0),
            });
            y -= 18;
            reportPage.drawText(truncate(`Documento: ${contract.title || 'Contrato'}`, maxCharsLine9), {
                x: marginLeft, y, size: 9, font: font, color: rgb(0, 0, 0),
            });
            y -= 14;
            reportPage.drawText(`Número: ${contract.id}`, {
                x: marginLeft, y, size: 9, font: font, color: rgb(0, 0, 0),
            });
            y -= 14;
            reportPage.drawText(`ID de verificação: CK-${contractId}`, {
                x: marginLeft, y, size: 9, font: font, color: rgb(0.35, 0.35, 0.35),
            });
            y -= 14;
            reportPage.drawText(`Data da criação: ${new Date(contract.created_at).toLocaleString('pt-BR')} (UTC-0300)`, {
                x: marginLeft, y, size: 9, font: font, color: rgb(0, 0, 0),
            });
            y -= 14;
            const hashY = y;
            reportPage.drawText('Hash do documento original (SHA256):', {
                x: marginLeft, y, size: 7, font: font, color: rgb(0.35, 0.35, 0.35),
            });
            y -= 10;
            reportPage.drawText(contract.original_pdf_hash || 'N/A', {
                x: marginLeft + 4, y, size: 6, font: font, color: rgb(0.35, 0.35, 0.35),
            });
            y -= 4;

            // ---------- QR CODE logo abaixo do hash (igual ZapSign) ----------
            let qrImgEmbed = null;
            try {
                const QRCode = require('qrcode');
                const verifyUrl = `${baseUrl}/contract/verify/${contractId}`;
                const dataUrl = await QRCode.toDataURL(verifyUrl, { type: 'image/png', margin: 2, width: 200 });
                const base64 = (dataUrl && dataUrl.indexOf('base64,') > -1) ? dataUrl.split('base64,')[1] : null;
                if (base64) {
                    const qrPng = Buffer.from(base64, 'base64');
                    qrImgEmbed = await pdfDoc.embedPng(qrPng);
                }
            } catch (qrErr) {
                logger.warn('QR Code no relatório não gerado:', qrErr.message);
            }
            const qrSize = 80;
            const qrX = rightColStart;
            const qrY = y - qrSize - 20;
            if (qrImgEmbed) {
                reportPage.drawRectangle({
                    x: qrX - 4, y: qrY - 4, width: qrSize + 8, height: qrSize + 18,
                    borderColor: rgb(0.75, 0.75, 0.75), borderWidth: 1, color: rgb(1, 1, 1),
                });
                reportPage.drawImage(qrImgEmbed, { x: qrX, y: qrY + 6, width: qrSize, height: qrSize });
                reportPage.drawText('Escanear para verificar autenticidade', {
                    x: qrX + 2, y: qrY - 2, size: 6, font: font, color: rgb(0.4, 0.4, 0.4),
                });
            }

            y -= 20;
            drawHLine(reportPage, y);
            y -= 22;

            // ---------- ASSINATURAS (título à esquerda, "X de X assinaturas" à direita igual ZapSign) ----------
            const totalSigs = signatures.length;
            const yAssinaturasTitle = y;
            reportPage.drawText('Assinaturas', {
                x: marginLeft, y, size: 14, font: boldFont, color: rgb(0, 0, 0),
            });
            reportPage.drawText(`${totalSigs} de ${totalSigs} Assinaturas`, {
                x: rightColStart, y, size: 10, font: font, color: rgb(0.4, 0.4, 0.4),
            });
            y -= 22;
            drawHLine(reportPage, y);
            y -= 24;

            for (let idx = 0; idx < signatures.length; idx++) {
                const sig = signatures[idx];
                const boxPadding = 20;
                const signerBoxH = 230;
                if (y < signerBoxH + 100) {
                    reportPage = pdfDoc.addPage([595, 842]);
                    y = 820;
                }

                if (idx > 0) {
                    drawHLine(reportPage, y + 10);
                    y -= 18;
                }

                const boxY = y - signerBoxH;
                reportPage.drawRectangle({
                    x: marginLeft - 3,
                    y: boxY - 12,
                    width: pageWidth - marginLeft - marginRight + 6,
                    height: signerBoxH + boxPadding + 12,
                    borderColor: rgb(0.5, 0.5, 0.5),
                    borderWidth: 1.5,
                    color: rgb(0.99, 0.99, 0.99),
                });

                const sigBoxW = 195;
                const sigBoxH = 74;
                const sigBoxX = pageWidth - marginRight - sigBoxW - 10;
                const leftTextMaxX = sigBoxX - 20;

                reportPage.drawRectangle({
                    x: sigBoxX - 2, y: y - sigBoxH - 12, width: sigBoxW + 4, height: sigBoxH + 24,
                    borderColor: rgb(0.55, 0.55, 0.55),
                    borderWidth: 1,
                    color: rgb(1, 1, 1),
                });
                const imgBytes = await getSignatureImageBytes(sig);
                const sigBoxInnerY = y - sigBoxH - 12;
                const displayName = (sig.signer_name || 'Signatário').trim() || 'Signatário';
                reportPage.drawText('Assinatura', {
                    x: sigBoxX, y: sigBoxInnerY + sigBoxH + 6, size: 9, font: boldFont, color: rgb(0.2, 0.2, 0.2),
                });
                if (imgBytes) {
                    try {
                        let img;
                        try {
                            const sharp = require('sharp');
                            const pngBuffer = await sharp(imgBytes).png().toBuffer();
                            img = await pdfDoc.embedPng(pngBuffer);
                        } catch {
                            img = await pdfDoc.embedPng(imgBytes);
                        }
                        const scale = Math.min((sigBoxW - 12) / img.width, (sigBoxH - 10) / img.height, 1);
                        const iw = img.width * scale;
                        const ih = img.height * scale;
                        reportPage.drawImage(img, {
                            x: sigBoxX + (sigBoxW - iw) / 2,
                            y: sigBoxInnerY + (sigBoxH - ih) / 2,
                            width: iw,
                            height: ih,
                        });
                    } catch (e) {
                        reportPage.drawText('(imagem da assinatura)', {
                            x: sigBoxX + 6, y: sigBoxInnerY + sigBoxH / 2 - 6, size: 7, font: font, color: rgb(0.5, 0.5, 0.5),
                        });
                    }
                } else {
                    reportPage.drawText('(assinatura não disponível)', {
                        x: sigBoxX + 6, y: sigBoxInnerY + sigBoxH / 2 - 6, size: 7, font: font, color: rgb(0.5, 0.5, 0.5),
                    });
                }
                reportPage.drawText(displayName.substring(0, 35), {
                    x: sigBoxX, y: sigBoxInnerY - 8, size: 7, font: font, color: rgb(0.3, 0.3, 0.3),
                });

                let textY = y;
                reportPage.drawText(truncate(displayName, 42), {
                    x: marginLeft, y: textY, size: 12, font: boldFont, color: rgb(0, 0, 0),
                });
                textY -= 20;

                reportPage.drawRectangle({
                    x: marginLeft, y: textY - 16, width: 240, height: 20, color: rgb(0.92, 0.97, 0.92), borderColor: rgb(0.4, 0.7, 0.4), borderWidth: 1.2,
                });
                reportPage.drawText('Assinado', {
                    x: marginLeft + 8, y: textY - 10, size: 9, font: boldFont, color: rgb(0, 0.5, 0),
                });
                reportPage.drawText('via Conecta King', {
                    x: marginLeft + 58, y: textY - 10, size: 8, font: font, color: rgb(0.35, 0.5, 0.35),
                });
                textY -= 28;

                const dateStr = `Data e hora da assinatura: ${new Date(sig.signed_at).toLocaleString('pt-BR')} (UTC-0300)`;
                reportPage.drawText(truncate(dateStr, maxCharsLine9), {
                    x: marginLeft, y: textY, size: 9, font: font, color: rgb(0, 0, 0),
                });
                textY -= 14;
                reportPage.drawText(truncate('Nível de segurança: Validado por código único enviado por e-mail', maxCharsLine8), {
                    x: marginLeft, y: textY, size: 8, font: font, color: rgb(0.4, 0.4, 0.4),
                });
                textY -= 20;

                reportPage.drawText('Pontos de autenticação', {
                    x: marginLeft, y: textY, size: 9, font: boldFont, color: rgb(0, 0, 0),
                });
                textY -= 12;
                reportPage.drawText(truncate(`E-mail: ${sig.signer_email || '-'}`, maxCharsLine8), {
                    x: marginLeft + 4, y: textY, size: 8, font: font, color: rgb(0.2, 0.2, 0.2),
                });
                textY -= 11;
                if (sig.ip_address) {
                    reportPage.drawText(truncate(`IP: ${sig.ip_address}`, maxCharsLine8), {
                        x: marginLeft + 4, y: textY, size: 8, font: font, color: rgb(0.2, 0.2, 0.2),
                    });
                    textY -= 11;
                }
                if (sig.user_agent) {
                    const ua = truncate(String(sig.user_agent), 58);
                    reportPage.drawText(`Dispositivo: ${ua}`, {
                        x: marginLeft + 4, y: textY, size: 7, font: font, color: rgb(0.4, 0.4, 0.4),
                    });
                    textY -= 10;
                }

                y = boxY - boxPadding - 8;
                y -= 14;
            }

            y -= 16;
            if (y < 120) {
                reportPage = pdfDoc.addPage([595, 842]);
                y = 820;
            }
            if (baseUrl && y > 100) {
                try {
                    const QRCode2 = require('qrcode');
                    const verifyUrl2 = `${baseUrl}/contract/verify/${contractId}`;
                    const dataUrl2 = await QRCode2.toDataURL(verifyUrl2, { type: 'image/png', margin: 1, width: 120 });
                    const base64_2 = (dataUrl2 && dataUrl2.indexOf('base64,') > -1) ? dataUrl2.split('base64,')[1] : null;
                    if (base64_2) {
                        const qrPng2 = Buffer.from(base64_2, 'base64');
                        const qrImg2 = await pdfDoc.embedPng(qrPng2);
                        const qrSize2 = 56;
                        reportPage.drawImage(qrImg2, { x: 595 - 50 - qrSize2, y: y - qrSize2, width: qrSize2, height: qrSize2 });
                        reportPage.drawText('Escanear para verificar', { x: 595 - 50 - qrSize2, y: y - qrSize2 - 10, size: 6, font: font, color: rgb(0.4, 0.4, 0.4) });
                    }
                } catch (_) {}
            }
            y -= 70;
            if (y < 80) { reportPage = pdfDoc.addPage([595, 842]); y = 820; }
            let hashInsertY = null;
            const lastReportPageIndex = pdfDoc.getPageCount() - 1;
            reportPage.drawText('Este documento foi gerado automaticamente pelo sistema ConectaKing.', {
                x: 50, y, size: 8, font: font, color: rgb(0.4, 0.4, 0.4),
            });
            y -= 12;
            reportPage.drawText('Conforme MP 2.200-2/2001 e Lei nº 14.063/2020. As assinaturas eletrônicas têm validade jurídica.', {
                x: 50, y, size: 8, font: font, color: rgb(0.4, 0.4, 0.4),
            });
            y -= 12;
            hashInsertY = y;
            y -= 12;
            reportPage.drawText(`Data de geração do relatório: ${new Date().toLocaleString('pt-BR')} (UTC-0300)`, {
                x: 50, y, size: 8, font: font, color: rgb(0.4, 0.4, 0.4),
            });

            // Salvar PDF final
            let pdfBytes = await pdfDoc.save();
            const finalPdfHash = this.generateSHA256Hash(Buffer.from(pdfBytes));
            if (hashInsertY != null && lastReportPageIndex >= 0) {
                try {
                    const pdfDoc2 = await PDFDocument.load(pdfBytes);
                    const font2 = await pdfDoc2.embedFont(StandardFonts.Helvetica);
                    const lastP = pdfDoc2.getPage(lastReportPageIndex);
                    lastP.drawRectangle({ x: 50, y: hashInsertY - 2, width: 500, height: 14, color: rgb(1, 1, 1) });
                    lastP.drawText(`Hash do documento assinado (SHA256): ${finalPdfHash}`, {
                        x: 50, y: hashInsertY, size: 7, font: font2, color: rgb(0.2, 0.2, 0.2),
                    });
                    pdfBytes = await pdfDoc2.save();
                } catch (hashErr) {
                    logger.warn('Não foi possível inserir hash final no PDF:', hashErr.message);
                }
            }
            
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
     * Obter caminho do PDF final para download (ou regenerar se arquivo foi perdido, ex.: Render)
     */
    async downloadFinalPdf(contractId, userId) {
        const ownsContract = await repository.checkOwnership(contractId, userId);
        if (!ownsContract) throw new Error('Você não tem permissão para baixar este contrato');
        const contract = await repository.findById(contractId);
        if (!contract) throw new Error('Contrato não encontrado');

        const path = require('path');
        const fs = require('fs').promises;
        const fileName = `${(contract.title || 'contrato').replace(/[^a-z0-9]/gi, '_')}_assinado.pdf`;

        if (contract.final_pdf_url) {
            const url = (contract.final_pdf_url || '').trim();
            if (url.startsWith('http://') || url.startsWith('https://')) {
                return { redirectUrl: url, fileName };
            }
            const filePath = path.join(__dirname, '../../public', contract.final_pdf_url.replace(/^\//, ''));
            try {
                await fs.access(filePath);
                return { filePath, fileName };
            } catch {
                logger.warn('PDF final não encontrado em disco, regenerando', { contractId, final_pdf_url: contract.final_pdf_url });
            }
        }

        const pdfData = await this.generateFinalPdf(contractId);
        const filePath = path.join(__dirname, '../../public', (pdfData.pdf_url || '').replace(/^\//, ''));
        try {
            await fs.access(filePath);
        } catch (e) {
            throw new Error('O PDF foi gerado mas não foi possível acessá-lo. Tente novamente.');
        }
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
            const url = (contract.pdf_url || '').trim();
            if (url.startsWith('http://') || url.startsWith('https://')) {
                const fileName = `${(contract.title || 'documento').replace(/[^a-z0-9]/gi, '_')}_original.pdf`;
                return { redirectUrl: url, fileName };
            }
            const baseDir = path.join(__dirname, '../../');
            const cwd = process.cwd && process.cwd();
            const fileName = `${(contract.title || 'documento').replace(/[^a-z0-9]/gi, '_')}_original.pdf`;
            const basename = path.basename(contract.pdf_url);
            // Tentar vários caminhos (local, Render, etc.)
            const candidates = [
                path.join(baseDir, 'uploads', 'contracts', basename),
                path.join(__dirname, '../../uploads/contracts', basename),
                path.join(baseDir, 'public', contract.pdf_url.replace(/^\//, '')),
                path.join(__dirname, '../../public', contract.pdf_url)
            ];
            if (cwd) {
                candidates.push(path.join(cwd, 'uploads', 'contracts', basename));
                candidates.push(path.join(cwd, 'public', contract.pdf_url.replace(/^\//, '')));
            }
            for (const candidate of candidates) {
                try {
                    await fs.access(candidate);
                    return { filePath: candidate, fileName };
                } catch {
                    continue;
                }
            }
            logger.warn('viewPdf: arquivo não encontrado em nenhum caminho', { contractId, pdf_url: contract.pdf_url, candidates });
            throw new Error('Arquivo PDF não encontrado no servidor. Tente importar o PDF novamente.');
        }

        // Se não for importado ou não tiver PDF URL, gerar preview do conteúdo
        throw new Error('PDF não disponível para visualização');
    }

    /**
     * Obter PDF do contrato para rota pública (link de assinatura). Sem checagem de ownership.
     * Retorna { filePath, fileName } ou { redirectUrl, fileName }.
     */
    async getPdfForSigner(contractId) {
        const contract = await repository.findById(contractId);
        if (!contract) throw new Error('Contrato não encontrado');
        if (contract.contract_type !== 'imported' || !contract.pdf_url) throw new Error('PDF não disponível para este contrato');
        const path = require('path');
        const fs = require('fs').promises;
        const url = (contract.pdf_url || '').trim();
        if (url.startsWith('http://') || url.startsWith('https://')) {
            const fileName = `${(contract.title || 'documento').replace(/[^a-z0-9]/gi, '_')}_original.pdf`;
            return { redirectUrl: url, fileName };
        }
        const baseDir = path.join(__dirname, '../../');
        const cwd = process.cwd && process.cwd();
        const fileName = `${(contract.title || 'documento').replace(/[^a-z0-9]/gi, '_')}_original.pdf`;
        const basename = path.basename(contract.pdf_url);
        const candidates = [
            path.join(baseDir, 'uploads', 'contracts', basename),
            path.join(__dirname, '../../uploads/contracts', basename),
            path.join(baseDir, 'public', contract.pdf_url.replace(/^\//, '')),
            path.join(__dirname, '../../public', contract.pdf_url)
        ];
        if (cwd) {
            candidates.push(path.join(cwd, 'uploads', 'contracts', basename));
            candidates.push(path.join(cwd, 'public', contract.pdf_url.replace(/^\//, '')));
        }
        for (const candidate of candidates) {
            try {
                await fs.access(candidate);
                return { filePath: candidate, fileName };
            } catch {
                continue;
            }
        }
        throw new Error('Arquivo PDF não encontrado no servidor');
    }

    /**
     * Obter PDF final (assinado) do contrato para rota pública. Sem checagem de ownership.
     * Retorna { filePath, fileName } ou { redirectUrl, fileName }. Falha se não houver final_pdf_url.
     */
    async getFinalPdfForSigner(contractId) {
        const contract = await repository.findById(contractId);
        if (!contract) throw new Error('Contrato não encontrado');
        if (!contract.final_pdf_url) throw new Error('PDF assinado ainda não está disponível');
        const path = require('path');
        const fs = require('fs').promises;
        const url = (contract.final_pdf_url || '').trim();
        const fileName = `${(contract.title || 'contrato').replace(/[^a-z0-9]/gi, '_')}_assinado.pdf`;
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return { redirectUrl: url, fileName };
        }
        const baseDir = path.join(__dirname, '../../');
        const cwd = process.cwd && process.cwd();
        const basename = path.basename(contract.final_pdf_url);
        const candidates = [
            path.join(baseDir, 'public', contract.final_pdf_url.replace(/^\//, '')),
            path.join(__dirname, '../../public', contract.final_pdf_url),
            path.join(baseDir, 'uploads', 'contracts', basename),
            path.join(__dirname, '../../uploads/contracts', basename)
        ];
        if (cwd) {
            candidates.push(path.join(cwd, 'public', contract.final_pdf_url.replace(/^\//, '')));
            candidates.push(path.join(cwd, 'uploads', 'contracts', basename));
        }
        for (const candidate of candidates) {
            try {
                await fs.access(candidate);
                return { filePath: candidate, fileName };
            } catch {
                continue;
            }
        }
        throw new Error('Arquivo do contrato assinado não encontrado no servidor');
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
