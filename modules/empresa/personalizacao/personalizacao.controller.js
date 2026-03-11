/**
 * Controller: personalização da marca da empresa.
 */
const service = require('./personalizacao.service');
const responseFormatter = require('../../../utils/responseFormatter');
const logger = require('../../../utils/logger');

async function putBranding(req, res) {
    try {
        const result = await service.saveBranding(req.user.userId, req.body || {});
        return responseFormatter.success(res, null, result.message);
    } catch (err) {
        logger.error('Erro ao salvar personalização da marca:', err);
        return responseFormatter.error(res, 'Erro no servidor ao salvar as alterações.', 500);
    }
}

module.exports = {
    putBranding,
};
