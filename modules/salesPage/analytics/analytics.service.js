const repository = require('./analytics.repository');
const salesPageRepository = require('../salesPage.repository');
const logger = require('../../../utils/logger');

class AnalyticsService {
    /**
     * Registrar evento
     */
    async trackEvent(data) {
        const event = await repository.createEvent(data);
        logger.debug(`Evento registrado: ${data.event_type} para página ${data.sales_page_id}`);
        return event;
    }

    /**
     * Buscar analytics de uma página
     */
    async getAnalytics(salesPageId, filters = {}) {
        const events = await repository.findBySalesPageId(salesPageId, filters);
        const countsByType = await repository.countByType(salesPageId);

        // Organizar contagens por tipo
        const counts = {};
        countsByType.forEach(row => {
            counts[row.event_type] = parseInt(row.count);
        });

        return {
            events,
            counts,
            total_events: events.length
        };
    }

    /**
     * Buscar analytics de um produto
     */
    async getProductAnalytics(productId) {
        const events = await repository.findByProductId(productId);
        const countsByType = await repository.countProductEventsByType(productId);

        const counts = {};
        countsByType.forEach(row => {
            counts[row.event_type] = parseInt(row.count);
        });

        return {
            events,
            counts,
            total_events: events.length
        };
    }

    /**
     * Buscar funil de vendas
     */
    async getSalesFunnel(salesPageId, startDate = null, endDate = null) {
        return await repository.getSalesFunnel(salesPageId, startDate, endDate);
    }

    /**
     * Buscar ranking de produtos
     */
    async getProductRanking(salesPageId, eventType, limit = 10) {
        return await repository.getProductRanking(salesPageId, eventType, limit);
    }

    /**
     * Verificar ownership antes de buscar analytics
     */
    async verifyOwnership(salesPageId, userId) {
        const ownsPage = await salesPageRepository.checkOwnership(salesPageId, userId);
        if (!ownsPage) {
            throw new Error('Você não tem permissão para visualizar analytics desta página');
        }
        return true;
    }
}

module.exports = new AnalyticsService();

