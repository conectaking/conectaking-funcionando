const locationService = require('./location.service');
const responseFormatter = require('../../utils/responseFormatter');
const logger = require('../../utils/logger');

async function getConfig(req, res) {
    try {
        const itemId = parseInt(req.params.itemId, 10);
        if (!itemId) return responseFormatter.error(res, 'itemId inválido', 400);
        const config = await locationService.getConfig(itemId, req.user.userId);
        if (!config) return responseFormatter.error(res, 'Localização não encontrada ou acesso negado', 404);
        return responseFormatter.success(res, config);
    } catch (e) {
        logger.error('location getConfig:', e);
        return responseFormatter.error(res, e.message || 'Erro ao buscar localização', 500);
    }
}

async function saveConfig(req, res) {
    try {
        const itemId = parseInt(req.params.itemId, 10);
        if (!itemId) return responseFormatter.error(res, 'itemId inválido', 400);
        const data = req.body || {};
        const updated = await locationService.saveConfig(itemId, req.user.userId, data);
        return responseFormatter.success(res, updated);
    } catch (e) {
        logger.error('location saveConfig:', e);
        return responseFormatter.error(res, e.message || 'Erro ao salvar localização', 500);
    }
}

module.exports = {
    getConfig,
    saveConfig
};
