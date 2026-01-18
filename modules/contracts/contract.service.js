const repository = require('./contract.repository');
const validators = require('./contract.validators');
const TYPES = require('./contract.types');
const crypto = require('crypto');
const logger = require('../../utils/logger');
const { sendEmail } = require('../../utils/email');
const config = require('../../config');

class ContractService {
    /**
     * Gerar token único para assinatura (UUID + HMAC)
     */
    generateSignToken() {
        const uuid = crypto.randomBytes(32).toString('hex');
        const secret = process.env.CONTRACT_SIGN_SECRET || 'contract-sign-secret-change-in-production';
        const hmac = crypto.createHmac('sha256', secret).update(uuid).digest('hex');
        return `${uuid}-${hmac.substring(0, 16)}`;
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

        // Se for template, substituir variáveis
        if (sanitized.template_id && sanitized.variables) {
            const template = await repository.findTemplateById(sanitized.template_id);
            if (!template) {
                throw new Error('Template não encontrado');
            }
            
            // Substituir variáveis no conteúdo
            sanitized.pdf_content = this.replaceVariables(template.content, sanitized.variables);
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
    async sendForSignature(id, userId, signers) {
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

            // Enviar emails (UMA VEZ - conforme plano de economia)
            await this.sendSignEmails(contract, createdSigners);

            logger.info(`Contrato enviado para assinatura: ${id} com ${createdSigners.length} signatários`);
            
            return {
                contract: await repository.findById(id),
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
     * Enviar emails para signatários (UMA VEZ apenas)
     */
    async sendSignEmails(contract, signers) {
        const frontendUrl = config.urls.frontend || 'https://conectaking.com.br';
        
        for (const signer of signers) {
            const signUrl = `${frontendUrl}/contract/sign/${signer.sign_token}`;
            
            const subject = `Contrato para Assinatura: ${contract.title}`;
            const html = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #991B1B;">Contrato para Assinatura</h2>
                    <p>Olá, ${signer.name}!</p>
                    <p>Você recebeu um contrato para assinatura: <strong>${contract.title}</strong></p>
                    <p>Clique no link abaixo para acessar e assinar o contrato:</p>
                    <p style="text-align: center; margin: 30px 0;">
                        <a href="${signUrl}" style="background-color: #991B1B; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            Assinar Contrato
                        </a>
                    </p>
                    <p style="color: #666; font-size: 14px;">
                        Este link expira em ${TYPES.DEFAULT_TOKEN_EXPIRY_DAYS} dias.
                    </p>
                    <p style="color: #666; font-size: 12px; margin-top: 30px;">
                        Se você não esperava este email, ignore esta mensagem.
                    </p>
                </div>
            `;

            await sendEmail(signer.email, subject, html);
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
    async findSignerByToken(token) {
        const signer = await repository.findSignerByToken(token);
        if (!signer) {
            throw new Error('Token de assinatura inválido');
        }

        // Verificar expiração
        if (new Date(signer.token_expires_at) < new Date()) {
            throw new Error('Token de assinatura expirado');
        }

        // Verificar se já assinou
        if (signer.signed_at) {
            throw new Error('Este contrato já foi assinado');
        }

        return signer;
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

        // Salvar PDF no diretório de uploads
        const pdfFileName = `contract_${Date.now()}_${file.originalname}`;
        const pdfPath = path.join(uploadsDir, pdfFileName);
        await fs.writeFile(pdfPath, pdfBuffer);

        // Remover arquivo temporário do multer
        await fs.unlink(file.path).catch(() => {});

        // Criar contrato
        const contract = await repository.create({
            user_id: userId,
            template_id: null,
            title: title || file.originalname.replace('.pdf', ''),
            status: TYPES.STATUS.DRAFT,
            contract_type: 'imported',
            pdf_url: `/uploads/contracts/${pdfFileName}`,
            pdf_content: null, // PDF importado não tem conteúdo editável
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
     * Gerar PDF final com assinaturas (placeholder)
     * TODO: Implementar geração real de PDF com pdf-lib ou pdfmake
     */
    async generateFinalPdf(contractId) {
        const contract = await repository.findById(contractId);
        if (!contract) {
            throw new Error('Contrato não encontrado');
        }

        if (contract.status !== TYPES.STATUS.COMPLETED) {
            throw new Error('Apenas contratos completos podem ter PDF final gerado');
        }

        // TODO: Implementar geração real de PDF
        // Por enquanto, retornar o PDF original se importado, ou gerar a partir do template
        logger.warn('generateFinalPdf não implementado completamente - usando placeholder');
        return {
            pdf_url: contract.pdf_url || `/uploads/contracts/placeholder_${contractId}.pdf`,
            pdf_hash: contract.original_pdf_hash || 'placeholder-hash'
        };
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
}

module.exports = new ContractService();
