const service = require('./contract.service');
const repository = require('./contract.repository');
const responseFormatter = require('../../utils/responseFormatter');
const logger = require('../../utils/logger');

class ContractController {
    /**
     * Criar novo contrato
     */
    async create(req, res) {
        try {
            const contract = await service.create(req.body);
            return responseFormatter.success(res, contract, 'Contrato criado com sucesso', 201);
        } catch (error) {
            logger.error('Erro ao criar contrato:', error);
            return responseFormatter.error(res, error.message, 400);
        }
    }

    /**
     * Buscar contrato por ID
     */
    async findById(req, res) {
        try {
            const { id } = req.params;
            const contract = await service.findById(id);
            return responseFormatter.success(res, contract);
        } catch (error) {
            logger.error('Erro ao buscar contrato:', error);
            return responseFormatter.error(res, error.message, 404);
        }
    }

    /**
     * Buscar contratos do usuário
     */
    async findByUserId(req, res) {
        try {
            const userId = req.user.userId;
            const filters = {
                status: req.query.status || null,
                search: req.query.search || null,
                orderBy: req.query.orderBy || 'created_at',
                orderDir: req.query.orderDir || 'DESC',
                dateFrom: req.query.dateFrom || null,
                dateTo: req.query.dateTo || null,
                statuses: req.query.statuses ? req.query.statuses.split(',') : null,
                limit: req.query.limit ? parseInt(req.query.limit) : 20,
                offset: req.query.offset ? parseInt(req.query.offset) : 0
            };

            const result = await service.findByUserId(userId, filters);
            return responseFormatter.success(res, result);
        } catch (error) {
            logger.error('Erro ao buscar contratos:', error);
            return responseFormatter.error(res, error.message, 500);
        }
    }

    /**
     * Atualizar contrato
     */
    async update(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const contract = await service.update(id, userId, req.body);
            return responseFormatter.success(res, contract, 'Contrato atualizado com sucesso');
        } catch (error) {
            logger.error('Erro ao atualizar contrato:', error);
            const statusCode = error.message.includes('permissão') ? 403 : 
                              error.message.includes('não encontrado') ? 404 : 400;
            return responseFormatter.error(res, error.message, statusCode);
        }
    }

    /**
     * Enviar contrato para assinatura
     */
    async sendForSignature(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const { signers, signaturePositions } = req.body;

            const result = await service.sendForSignature(id, userId, signers, signaturePositions);
            return responseFormatter.success(res, result, 'Contrato enviado para assinatura com sucesso');
        } catch (error) {
            logger.error('Erro ao enviar contrato para assinatura:', error);
            const statusCode = error.message.includes('permissão') ? 403 : 
                              error.message.includes('não encontrado') ? 404 : 400;
            return responseFormatter.error(res, error.message, statusCode);
        }
    }

    /**
     * Cancelar contrato
     */
    async cancel(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;

            // Atualizar status para cancelled
            const contract = await service.update(id, userId, { status: 'cancelled' });
            return responseFormatter.success(res, contract, 'Contrato cancelado com sucesso');
        } catch (error) {
            logger.error('Erro ao cancelar contrato:', error);
            const statusCode = error.message.includes('permissão') ? 403 : 
                              error.message.includes('não encontrado') ? 404 : 400;
            return responseFormatter.error(res, error.message, statusCode);
        }
    }

    /**
     * Excluir contrato
     */
    async delete(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;

            await service.delete(id, userId);
            return responseFormatter.success(res, null, 'Contrato excluído com sucesso');
        } catch (error) {
            logger.error('Erro ao excluir contrato:', error);
            const statusCode = error.message.includes('permissão') ? 403 : 
                              error.message.includes('não encontrado') ? 404 : 400;
            return responseFormatter.error(res, error.message, statusCode);
        }
    }

    /**
     * Duplicar contrato
     */
    async duplicate(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;

            const contract = await service.duplicate(id, userId);
            return responseFormatter.success(res, contract, 'Contrato duplicado com sucesso', 201);
        } catch (error) {
            logger.error('Erro ao duplicar contrato:', error);
            const statusCode = error.message.includes('permissão') ? 403 : 
                              error.message.includes('não encontrado') ? 404 : 400;
            return responseFormatter.error(res, error.message, statusCode);
        }
    }

    /**
     * Buscar templates
     */
    async findTemplates(req, res) {
        try {
            const category = req.query.category || null;
            const templates = await service.findTemplates(category);
            return responseFormatter.success(res, templates);
        } catch (error) {
            logger.error('Erro ao buscar templates:', error);
            return responseFormatter.error(res, error.message, 500);
        }
    }

    /**
     * Buscar template por ID
     */
    async findTemplateById(req, res) {
        try {
            const { id } = req.params;
            const template = await service.findTemplateById(id);
            return responseFormatter.success(res, template);
        } catch (error) {
            logger.error('Erro ao buscar template:', error);
            return responseFormatter.error(res, error.message, 404);
        }
    }

    /**
     * Buscar signatários de um contrato
     */
    async getSigners(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            
            // Verificar ownership
            const ownsContract = await repository.checkOwnership(id, userId);
            if (!ownsContract) {
                return responseFormatter.error(res, 'Você não tem permissão para ver os signatários deste contrato', 403);
            }
            
            const signers = await repository.findSignersByContractId(id);
            return responseFormatter.success(res, signers);
        } catch (error) {
            logger.error('Erro ao buscar signatários:', error);
            const statusCode = error.message.includes('permissão') ? 403 : 
                              error.message.includes('não encontrado') ? 404 : 400;
            return responseFormatter.error(res, error.message, statusCode);
        }
    }

    /**
     * Buscar logs de auditoria
     */
    async getAuditLogs(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;

            const logs = await service.getAuditLogs(id, userId);
            return responseFormatter.success(res, logs);
        } catch (error) {
            logger.error('Erro ao buscar logs de auditoria:', error);
            const statusCode = error.message.includes('permissão') ? 403 : 
                              error.message.includes('não encontrado') ? 404 : 400;
            return responseFormatter.error(res, error.message, statusCode);
        }
    }

    /**
     * Estatísticas do usuário
     */
    async getStats(req, res) {
        try {
            const userId = req.user.userId;
            const stats = await service.getStats(userId);
            return responseFormatter.success(res, stats);
        } catch (error) {
            logger.error('Erro ao buscar estatísticas:', error);
            return responseFormatter.error(res, error.message, 500);
        }
    }

    /**
     * Importar PDF e criar contrato
     */
    async importPdf(req, res) {
        try {
            const userId = req.user.userId;
            const file = req.file;
            
            if (!file) {
                return responseFormatter.error(res, 'Nenhum arquivo PDF enviado', 400);
            }

            const { title } = req.body;
            const signers = req.body.signers ? JSON.parse(req.body.signers) : [];

            const contract = await service.importPdfContract(userId, file, title, signers);
            return responseFormatter.success(res, contract, 'PDF importado e contrato criado com sucesso', 201);
        } catch (error) {
            logger.error('Erro ao importar PDF:', error);
            return responseFormatter.error(res, error.message, 400);
        }
    }

    /**
     * Download do PDF final do contrato
     */
    async downloadFinalPdf(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            
            const { filePath, fileName } = await service.downloadFinalPdf(id, userId);
            
            const fs = require('fs');
            const path = require('path');
            
            if (!fs.existsSync(filePath)) {
                return responseFormatter.error(res, 'Arquivo PDF não encontrado', 404);
            }

            res.download(filePath, fileName, (err) => {
                if (err) {
                    logger.error('Erro ao baixar PDF:', err);
                    if (!res.headersSent) {
                        responseFormatter.error(res, 'Erro ao baixar PDF', 500);
                    }
                }
            });
        } catch (error) {
            logger.error('Erro ao baixar PDF:', error);
            const statusCode = error.message.includes('permissão') ? 403 : 
                              error.message.includes('não encontrado') ? 404 : 500;
            return responseFormatter.error(res, error.message, statusCode);
        }
    }

    /**
     * Visualizar PDF original do contrato
     */
    async viewPdf(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const { filePath, fileName } = await service.viewPdf(id, userId);
            
            const fs = require('fs');
            
            if (!fs.existsSync(filePath)) {
                return responseFormatter.error(res, 'Arquivo PDF não encontrado', 404);
            }

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
            
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
        } catch (error) {
            logger.error('Erro ao visualizar PDF:', error);
            const statusCode = error.message.includes('permissão') ? 403 : 
                              error.message.includes('não encontrado') ? 404 : 500;
            return responseFormatter.error(res, error.message, statusCode);
        }
    }

    /**
     * Salvar posições de assinaturas
     */
    async saveSignaturePositions(req, res) {
        try {
            const { id } = req.params;
            const { positions } = req.body; // { signerId: { page, x, y, width, height } }
            
            if (!positions || typeof positions !== 'object') {
                return responseFormatter.error(res, 'Posições inválidas', 400);
            }
            
            const result = await service.saveSignaturePositions(id, positions);
            return responseFormatter.success(res, result, 'Posições salvas com sucesso');
        } catch (error) {
            logger.error('Erro ao salvar posições:', error);
            return responseFormatter.error(res, error.message, 400);
        }
    }

    /**
     * Buscar posições de assinaturas
     */
    async getSignaturePositions(req, res) {
        try {
            const { id } = req.params;
            const positions = await service.getSignaturePositions(id);
            return responseFormatter.success(res, positions);
        } catch (error) {
            logger.error('Erro ao buscar posições:', error);
            return responseFormatter.error(res, error.message, 400);
        }
    }

    /**
     * Relatório completo de assinaturas (página HTML)
     */
    async getReport(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            
            // Verificar ownership
            const ownsContract = await repository.checkOwnership(id, userId);
            if (!ownsContract) {
                return responseFormatter.error(res, 'Você não tem permissão para ver este relatório', 403);
            }
            
            // Buscar dados completos
            const contract = await service.findById(id);
            const signers = await repository.findSignersByContractId(id);
            const signatures = await repository.findSignaturesByContractId(id);
            const auditLogs = await repository.findAuditLogsByContractId(id);
            
            // Renderizar página EJS
            const path = require('path');
            res.render(path.join(__dirname, '../../views/contractReport.ejs'), {
                contract,
                signers,
                signatures,
                auditLogs
            });
        } catch (error) {
            logger.error('Erro ao gerar relatório:', error);
            const statusCode = error.message.includes('permissão') ? 403 : 
                              error.message.includes('não encontrado') ? 404 : 500;
            return responseFormatter.error(res, error.message, statusCode);
        }
    }
}

module.exports = new ContractController();
