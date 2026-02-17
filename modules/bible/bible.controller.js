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

async function getNameMeaning(req, res) {
    try {
        const name = req.query.name || req.query.nome || '';
        const result = bibleService.getNameMeaning(name);
        return responseFormatter.success(res, result);
    } catch (e) {
        logger.error('bible getNameMeaning:', e);
        return responseFormatter.error(res, e.message || 'Erro ao buscar nome', 500);
    }
}

async function getPalavraDoDia(req, res) {
    try {
        const date = req.query.date || null;
        const result = await bibleService.getPalavraDoDia(date);
        if (!result) return responseFormatter.error(res, 'Palavra não encontrada', 404);
        return responseFormatter.success(res, result);
    } catch (e) {
        logger.error('bible getPalavraDoDia:', e);
        return responseFormatter.error(res, e.message || 'Erro ao buscar palavra', 500);
    }
}

async function getSalmoDoDia(req, res) {
    try {
        const date = req.query.date || null;
        const result = await bibleService.getSalmoDoDia(date);
        if (!result) return responseFormatter.error(res, 'Salmo não encontrado', 404);
        return responseFormatter.success(res, result);
    } catch (e) {
        logger.error('bible getSalmoDoDia:', e);
        return responseFormatter.error(res, e.message || 'Erro ao buscar salmo', 500);
    }
}

async function getDevocionalDoDia(req, res) {
    try {
        const date = req.query.date || null;
        const result = await bibleService.getDevocionalDoDia(date);
        if (!result) return responseFormatter.error(res, 'Devocional não encontrado', 404);
        return responseFormatter.success(res, result);
    } catch (e) {
        logger.error('bible getDevocionalDoDia:', e);
        return responseFormatter.error(res, e.message || 'Erro ao buscar devocional', 500);
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

async function getMyProgress(req, res) {
    try {
        const userId = req.user.userId;
        const progress = await bibleService.getMyProgress(userId);
        return responseFormatter.success(res, progress);
    } catch (e) {
        logger.error('bible getMyProgress:', e);
        return responseFormatter.error(res, e.message || 'Erro ao carregar progresso', 500);
    }
}

async function markRead(req, res) {
    try {
        const userId = req.user.userId;
        const progress = await bibleService.markRead(userId, req.body || {});
        return responseFormatter.success(res, progress, 'Marcado como lido.');
    } catch (e) {
        logger.error('bible markRead:', e);
        return responseFormatter.error(res, e.message || 'Erro ao marcar', 400);
    }
}

module.exports = {
    getVerseOfDay,
    getNumbers,
    getNameMeaning,
    getPalavraDoDia,
    getSalmoDoDia,
    getDevocionalDoDia,
    getMyProgress,
    markRead,
    getConfig,
    saveConfig
};
