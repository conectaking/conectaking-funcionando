/**
 * Controller: logomarca padrão admin. Extrai req, chama service, formata resposta.
 */
const service = require('./branding.service');
const responseFormatter = require('../../../utils/responseFormatter');
const logger = require('../../../utils/logger');

async function getDefaultBranding(req, res) {
    try {
        const data = await service.getDefaultBranding();
        return responseFormatter.success(res, data);
    } catch (err) {
        logger.error('Erro GET /api/admin/default-branding:', err);
        return responseFormatter.error(res, 'Erro ao buscar logomarca padrão.', 500);
    }
}

async function putDefaultBranding(req, res) {
    try {
        const result = await service.updateDefaultBranding(req.body || {});
        return responseFormatter.success(res, null, result.message);
    } catch (err) {
        logger.error('Erro PUT /api/admin/default-branding:', err);
        return responseFormatter.error(res, 'Erro ao salvar logomarca padrão.', 500);
    }
}

module.exports = {
    getDefaultBranding,
    putDefaultBranding,
};
