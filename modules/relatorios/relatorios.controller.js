/**
 * Controller: relatórios (KPIs, performance, top itens, detalhes).
 */
const service = require('./relatorios.service');
const responseFormatter = require('../../utils/responseFormatter');
const logger = require('../../utils/logger');

async function getKpis(req, res) {
    const period = req.query.period;
    try {
        const result = await service.getKpis(req.user.userId, period);
        if (result.error) return responseFormatter.error(res, result.error, result.status);
        return res.json(result);
    } catch (err) {
        logger.error('Erro ao buscar KPIs de analytics:', err);
        return responseFormatter.error(res, 'Erro no servidor ao buscar KPIs.', 500);
    }
}

async function getPerformance(req, res) {
    const period = req.query.period;
    try {
        const result = await service.getPerformance(req.user.userId, period);
        if (result.error) return responseFormatter.error(res, result.error, result.status);
        return res.json(result);
    } catch (err) {
        logger.error('Erro ao buscar dados de performance:', err);
        return responseFormatter.error(res, 'Erro no servidor ao buscar dados de desempenho.', 500);
    }
}

async function getTopItems(req, res) {
    const period = req.query.period;
    try {
        const result = await service.getTopItems(req.user.userId, period);
        if (result.error) return responseFormatter.error(res, result.error, result.status);
        return res.json(result);
    } catch (err) {
        logger.error('Erro ao buscar top itens:', err);
        return responseFormatter.error(res, 'Erro no servidor ao buscar top itens.', 500);
    }
}

async function getDetails(req, res) {
    const period = req.query.period;
    try {
        const result = await service.getDetails(req.user.userId, period);
        if (result.error) return responseFormatter.error(res, result.error, result.status);
        return res.json(result);
    } catch (err) {
        logger.error('Erro ao buscar detalhes de analytics:', err);
        return res.status(500).json({
            message: 'Erro ao buscar detalhes de analytics.',
            error: err.message,
            code: err.code,
            ...(process.env.NODE_ENV !== 'production' && { stack: err.stack, detail: err.detail }),
        });
    }
}

module.exports = {
    getKpis,
    getPerformance,
    getTopItems,
    getDetails,
};
