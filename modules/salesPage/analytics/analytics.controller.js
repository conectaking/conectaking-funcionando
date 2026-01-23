const service = require('./analytics.service');
const responseFormatter = require('../../../utils/responseFormatter');
const logger = require('../../../utils/logger');

class AnalyticsController {
    /**
     * Registrar evento (público - sem autenticação)
     */
    async trackEvent(req, res) {
        try {
            const event = await service.trackEvent(req.body);
            return responseFormatter.success(res, event, null, 201);
        } catch (error) {
            logger.error('Erro ao registrar evento:', error);
            return responseFormatter.error(res, error.message, 400);
        }
    }

    /**
     * Buscar analytics de uma página (requer autenticação)
     */
    async getAnalytics(req, res) {
        try {
            const { salesPageId } = req.params;
            const userId = req.user.userId;

            // Verificar ownership
            await service.verifyOwnership(salesPageId, userId);

            const filters = {
                start_date: req.query.start_date || null,
                end_date: req.query.end_date || null,
                event_type: req.query.event_type || null,
                limit: req.query.limit ? parseInt(req.query.limit) : null
            };

            const analytics = await service.getAnalytics(salesPageId, filters);
            return responseFormatter.success(res, analytics);
        } catch (error) {
            logger.error('Erro ao buscar analytics:', error);
            const statusCode = error.message.includes('permissão') ? 403 : 500;
            return responseFormatter.error(res, error.message, statusCode);
        }
    }

    /**
     * Buscar analytics de um produto
     */
    async getProductAnalytics(req, res) {
        try {
            const { productId } = req.params;
            const analytics = await service.getProductAnalytics(productId);
            return responseFormatter.success(res, analytics);
        } catch (error) {
            logger.error('Erro ao buscar analytics do produto:', error);
            return responseFormatter.error(res, error.message, 500);
        }
    }

    /**
     * Buscar funil de vendas
     */
    async getSalesFunnel(req, res) {
        try {
            const { salesPageId } = req.params;
            const userId = req.user.userId;

            // Verificar ownership
            await service.verifyOwnership(salesPageId, userId);

            const startDate = req.query.start_date || null;
            const endDate = req.query.end_date || null;

            const funnel = await service.getSalesFunnel(salesPageId, startDate, endDate);
            return responseFormatter.success(res, funnel);
        } catch (error) {
            logger.error('Erro ao buscar funil de vendas:', error);
            const statusCode = error.message.includes('permissão') ? 403 : 500;
            return responseFormatter.error(res, error.message, statusCode);
        }
    }

    /**
     * Buscar ranking de produtos
     */
    async getProductRanking(req, res) {
        try {
            const { salesPageId } = req.params;
            const userId = req.user.userId;
            const eventType = req.query.event_type || 'product_click';
            const limit = req.query.limit ? parseInt(req.query.limit) : 10;

            // Verificar ownership
            await service.verifyOwnership(salesPageId, userId);

            const ranking = await service.getProductRanking(salesPageId, eventType, limit);
            return responseFormatter.success(res, { ranking });
        } catch (error) {
            logger.error('Erro ao buscar ranking de produtos:', error);
            const statusCode = error.message.includes('permissão') ? 403 : 500;
            return responseFormatter.error(res, error.message, statusCode);
        }
    }
}

module.exports = new AnalyticsController();

