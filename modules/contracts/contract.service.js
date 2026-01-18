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

            // Se o contrato foi importado de PDF, carregar o PDF original
            if (contract.contract_type === 'imported' && contract.pdf_url) {
                const originalPdfPath = path.join(__dirname, '../../public', contract.pdf_url);
                try {
                    const originalPdfBytes = await fs.readFile(originalPdfPath);
                    const originalPdf = await PDFDocument.load(originalPdfBytes);
                    const pages = await pdfDoc.copyPages(originalPdf, originalPdf.getPageIndices());
                    pages.forEach(page => pdfDoc.addPage(page));
                } catch (err) {
                    logger.warn(`Não foi possível carregar PDF original: ${err.message}`);
                    // Continuar sem PDF original
                }
            } else {
                // Se foi criado de template, gerar PDF a partir do conteúdo
                const page = pdfDoc.addPage([595, 842]); // A4
                const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
                const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

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

            // Adicionar página de assinaturas
            const signaturePage = pdfDoc.addPage([595, 842]);
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

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
                y -= 30;

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
}

module.exports = new ContractService();
