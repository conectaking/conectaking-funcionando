const sitesService = require('./sites.service');
const responseFormatter = require('../../utils/responseFormatter');
const logger = require('../../utils/logger');

async function getConfig(req, res) {
    try {
        const itemId = parseInt(req.params.itemId, 10);
        if (!itemId) return responseFormatter.error(res, 'itemId inválido', 400);
        const config = await sitesService.getConfig(itemId, req.user.userId);
        return responseFormatter.success(res, config);
    } catch (e) {
        logger.error('sites getConfig:', e);
        return responseFormatter.error(res, e.message || 'Erro ao carregar site', 403);
    }
}

async function saveConfig(req, res) {
    try {
        const itemId = parseInt(req.params.itemId, 10);
        if (!itemId) return responseFormatter.error(res, 'itemId inválido', 400);
        const config = await sitesService.saveConfig(itemId, req.user.userId, req.body || {});
        return responseFormatter.success(res, config, 'Site salvo.');
    } catch (e) {
        logger.error('sites saveConfig:', e);
        return responseFormatter.error(res, e.message || 'Erro ao salvar site', 400);
    }
}

async function getArquetipoLeads(req, res) {
    try {
        const itemId = parseInt(req.params.itemId, 10);
        if (!itemId) return responseFormatter.error(res, 'itemId inválido', 400);
        const leads = await sitesService.getArquetipoLeads(itemId, req.user.userId);
        return responseFormatter.success(res, { leads });
    } catch (e) {
        logger.error('sites getArquetipoLeads:', e);
        return responseFormatter.error(res, e.message || 'Erro ao carregar leads', 403);
    }
}

module.exports = {
    getConfig,
    saveConfig,
    getArquetipoLeads
};
