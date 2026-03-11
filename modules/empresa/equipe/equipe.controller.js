/**
 * Controller: equipe. Extrai req, chama service, formata resposta.
 */
const service = require('./equipe.service');
const responseFormatter = require('../../../utils/responseFormatter');
const logger = require('../../../utils/logger');

async function getTeam(req, res) {
    try {
        const rows = await service.getTeamMembers(req.user.userId);
        return responseFormatter.success(res, rows);
    } catch (err) {
        logger.error('Erro ao buscar dados da equipe:', err);
        return responseFormatter.error(res, 'Erro ao buscar dados da equipe.', 500);
    }
}

module.exports = {
    getTeam,
};
