const conviteService = require('./convite.service');
const responseFormatter = require('../../utils/responseFormatter');
const logger = require('../../utils/logger');

async function getConfig(req, res) {
    try {
        const itemId = parseInt(req.params.itemId, 10);
        if (!itemId) return responseFormatter.error(res, 'itemId inválido', 400);
        const config = await conviteService.getConfig(itemId, req.user.userId);
        return responseFormatter.success(res, config);
    } catch (e) {
        logger.error('convite getConfig:', e);
        return responseFormatter.error(res, e.message || 'Erro ao carregar convite', 403);
    }
}

async function saveConfig(req, res) {
    try {
        const itemId = parseInt(req.params.itemId, 10);
        if (!itemId) return responseFormatter.error(res, 'itemId inválido', 400);
        const config = await conviteService.saveConfig(itemId, req.user.userId, req.body || {});
        return responseFormatter.success(res, config, 'Convite salvo.');
    } catch (e) {
        logger.error('convite saveConfig:', e);
        return responseFormatter.error(res, e.message || 'Erro ao salvar convite', 400);
    }
}

async function getPreviewLink(req, res) {
    try {
        const itemId = parseInt(req.query.itemId || req.params.itemId, 10);
        if (!itemId) return responseFormatter.error(res, 'itemId inválido', 400);
        const url = await conviteService.getPreviewLink(itemId, req.user.userId);
        if (!url) return responseFormatter.error(res, 'Convite não encontrado', 404);
        return responseFormatter.success(res, { preview_url: url });
    } catch (e) {
        logger.error('convite getPreviewLink:', e);
        return responseFormatter.error(res, e.message || 'Erro', 400);
    }
}

async function getStats(req, res) {
    try {
        const itemId = parseInt(req.params.itemId, 10);
        if (!itemId) return responseFormatter.error(res, 'itemId inválido', 400);
        const stats = await conviteService.getStats(itemId, req.user.userId);
        return responseFormatter.success(res, stats);
    } catch (e) {
        logger.error('convite getStats:', e);
        return responseFormatter.error(res, e.message || 'Erro', 403);
    }
}

module.exports = {
    getConfig,
    saveConfig,
    getPreviewLink,
    getStats
};
