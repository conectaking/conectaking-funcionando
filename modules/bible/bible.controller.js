const bibleService = require('./bible.service');
const responseFormatter = require('../../utils/responseFormatter');
const logger = require('../../utils/logger');

async function getVerseOfDay(req, res) {
    try {
        const date = req.query.date || null;
        const translation = req.query.translation || 'nvi';
        const verse = await bibleService.getVerseOfDay(date, translation);
        if (!verse) return responseFormatter.error(res, 'Versículo não encontrado', 404);
        return responseFormatter.success(res, verse);
    } catch (e) {
        logger.error('bible getVerseOfDay:', e);
        return responseFormatter.error(res, e.message || 'Erro ao buscar versículo', 500);
    }
}

async function getNumbers(req, res) {
    try {
        const numbers = bibleService.getNumbers();
        return responseFormatter.success(res, { numbers });
    } catch (e) {
        logger.error('bible getNumbers:', e);
        return responseFormatter.error(res, e.message || 'Erro ao buscar significados', 500);
    }
}

async function getConfig(req, res) {
    try {
        const itemId = parseInt(req.params.itemId, 10);
        if (!itemId) return responseFormatter.error(res, 'itemId inválido', 400);
        const config = await bibleService.getConfig(itemId, req.user.userId);
        return responseFormatter.success(res, config);
    } catch (e) {
        logger.error('bible getConfig:', e);
        return responseFormatter.error(res, e.message || 'Erro ao carregar configuração', 403);
    }
}

async function saveConfig(req, res) {
    try {
        const itemId = parseInt(req.params.itemId, 10);
        if (!itemId) return responseFormatter.error(res, 'itemId inválido', 400);
        const config = await bibleService.saveConfig(itemId, req.user.userId, req.body || {});
        return responseFormatter.success(res, config, 'Configuração salva.');
    } catch (e) {
        logger.error('bible saveConfig:', e);
        return responseFormatter.error(res, e.message || 'Erro ao salvar', 400);
    }
}

module.exports = {
    getVerseOfDay,
    getNumbers,
    getConfig,
    saveConfig
};
