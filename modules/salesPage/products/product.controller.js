const service = require('./product.service');
const responseFormatter = require('../../../utils/responseFormatter');
const logger = require('../../../utils/logger');

class ProductController {
    /**
     * Criar produto
     */
    async create(req, res) {
        try {
            const { salesPageId } = req.params;
            const userId = req.user.userId;
            const productData = { ...req.body, sales_page_id: salesPageId };
            const product = await service.create(productData, userId);
            return responseFormatter.success(res, product, 'Produto criado com sucesso', 201);
        } catch (error) {
            logger.error('Erro ao criar produto:', error);
            const statusCode = error.message.includes('permissão') ? 403 :
                              error.message.includes('Limite') ? 400 : 400;
            return responseFormatter.error(res, error.message, statusCode);
        }
    }

    /**
     * Listar produtos
     */
    async list(req, res) {
        try {
            const { salesPageId } = req.params;
            const includeArchived = req.query.includeArchived === 'true';
            const products = await service.findBySalesPageId(salesPageId, includeArchived);
            return responseFormatter.success(res, { products });
        } catch (error) {
            logger.error('Erro ao listar produtos:', error);
            return responseFormatter.error(res, error.message, 500);
        }
    }

    /**
     * Buscar produto por ID
     */
    async findById(req, res) {
        try {
            const { productId } = req.params;
            const product = await service.findById(productId);
            return responseFormatter.success(res, product);
        } catch (error) {
            logger.error('Erro ao buscar produto:', error);
            return responseFormatter.error(res, error.message, 404);
        }
    }

    /**
     * Atualizar produto
     */
    async update(req, res) {
        try {
            const { productId } = req.params;
            const userId = req.user.userId;
            const product = await service.update(productId, userId, req.body);
            return responseFormatter.success(res, product, 'Produto atualizado com sucesso');
        } catch (error) {
            logger.error('Erro ao atualizar produto:', error);
            const statusCode = error.message.includes('permissão') ? 403 :
                              error.message.includes('não encontrado') ? 404 : 400;
            return responseFormatter.error(res, error.message, statusCode);
        }
    }

    /**
     * Atualizar status do produto
     */
    async updateStatus(req, res) {
        try {
            const { productId } = req.params;
            const { status } = req.body;
            const userId = req.user.userId;
            const product = await service.updateStatus(productId, userId, status);
            return responseFormatter.success(res, product, 'Status do produto atualizado com sucesso');
        } catch (error) {
            logger.error('Erro ao atualizar status do produto:', error);
            const statusCode = error.message.includes('permissão') ? 403 :
                              error.message.includes('não encontrado') ? 404 : 400;
            return responseFormatter.error(res, error.message, statusCode);
        }
    }

    /**
     * Deletar produto
     */
    async delete(req, res) {
        try {
            const { productId } = req.params;
            const userId = req.user.userId;
            await service.delete(productId, userId);
            return responseFormatter.success(res, null, 'Produto deletado com sucesso');
        } catch (error) {
            logger.error('Erro ao deletar produto:', error);
            const statusCode = error.message.includes('permissão') ? 403 :
                              error.message.includes('não encontrado') ? 404 : 500;
            return responseFormatter.error(res, error.message, statusCode);
        }
    }

    /**
     * Reordenar produtos
     */
    async reorder(req, res) {
        try {
            const { salesPageId } = req.params;
            const { productOrders } = req.body;
            const userId = req.user.userId;
            await service.reorder(salesPageId, userId, productOrders);
            return responseFormatter.success(res, null, 'Produtos reordenados com sucesso');
        } catch (error) {
            logger.error('Erro ao reordenar produtos:', error);
            const statusCode = error.message.includes('permissão') ? 403 : 400;
            return responseFormatter.error(res, error.message, statusCode);
        }
    }
}

module.exports = new ProductController();

