const service = require('./salesPage.service');
const responseFormatter = require('../../utils/responseFormatter');
const logger = require('../../utils/logger');

class SalesPageController {
    /**
     * Criar nova página de vendas
     */
    async create(req, res) {
        try {
            const salesPage = await service.create(req.body);
            return responseFormatter.success(res, salesPage, 'Página de vendas criada com sucesso', 201);
        } catch (error) {
            logger.error('Erro ao criar página de vendas:', error);
            return responseFormatter.error(res, error.message, 400);
        }
    }

    /**
     * Buscar página por ID
     */
    async findById(req, res) {
        try {
            const { id } = req.params;
            const salesPage = await service.findById(id);
            return responseFormatter.success(res, salesPage);
        } catch (error) {
            logger.error('Erro ao buscar página de vendas:', error);
            return responseFormatter.error(res, error.message, 404);
        }
    }

    /**
     * Buscar página por profile_item_id
     */
    async findByProfileItemId(req, res) {
        try {
            const { itemId } = req.params;
            const userId = req.user.userId;
            
            logger.info(`🔍 Buscando sales_page por profile_item_id: ${itemId} para userId: ${userId}`);
            
            const salesPage = await service.findByProfileItemId(itemId, userId);
            if (!salesPage) {
                logger.warn(`❌ Sales page não encontrada para profile_item_id: ${itemId}`);
                return responseFormatter.error(res, 'Página de vendas não encontrada', 404);
            }
            
            logger.info(`✅ Sales page encontrada: ${salesPage.id}`);
            return responseFormatter.success(res, salesPage);
        } catch (error) {
            logger.error('Erro ao buscar página de vendas:', error);
            return responseFormatter.error(res, error.message, 500);
        }
    }

    /**
     * Atualizar página
     */
    async update(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const salesPage = await service.update(id, userId, req.body);
            return responseFormatter.success(res, salesPage, 'Página de vendas atualizada com sucesso');
        } catch (error) {
            logger.error('Erro ao atualizar página de vendas:', error);
            const statusCode = error.message.includes('permissão') ? 403 : 
                              error.message.includes('não encontrada') ? 404 : 400;
            return responseFormatter.error(res, error.message, statusCode);
        }
    }

    /**
     * Publicar página
     */
    async publish(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const salesPage = await service.publish(id, userId);
            return responseFormatter.success(res, salesPage, 'Página publicada com sucesso');
        } catch (error) {
            logger.error('Erro ao publicar página:', error);
            const statusCode = error.message.includes('permissão') ? 403 : 
                              error.message.includes('não encontrada') ? 404 : 400;
            return responseFormatter.error(res, error.message, statusCode);
        }
    }

    /**
     * Pausar página
     */
    async pause(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const salesPage = await service.pause(id, userId);
            return responseFormatter.success(res, salesPage, 'Página pausada com sucesso');
        } catch (error) {
            logger.error('Erro ao pausar página:', error);
            const statusCode = error.message.includes('permissão') ? 403 : 
                              error.message.includes('não encontrada') ? 404 : 400;
            return responseFormatter.error(res, error.message, statusCode);
        }
    }

    /**
     * Arquivar página
     */
    async archive(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            const salesPage = await service.archive(id, userId);
            return responseFormatter.success(res, salesPage, 'Página arquivada com sucesso');
        } catch (error) {
            logger.error('Erro ao arquivar página:', error);
            const statusCode = error.message.includes('permissão') ? 403 : 
                              error.message.includes('não encontrada') ? 404 : 400;
            return responseFormatter.error(res, error.message, statusCode);
        }
    }

    /**
     * Deletar página
     */
    async delete(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.userId;
            await service.delete(id, userId);
            return responseFormatter.success(res, null, 'Página deletada com sucesso');
        } catch (error) {
            logger.error('Erro ao deletar página:', error);
            const statusCode = error.message.includes('permissão') ? 403 : 
                              error.message.includes('não encontrada') ? 404 : 500;
            return responseFormatter.error(res, error.message, statusCode);
        }
    }
}

module.exports = new SalesPageController();

