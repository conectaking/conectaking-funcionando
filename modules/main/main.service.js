const sitesService = require('../sites/sites.service');
const logger = require('../../utils/logger');

/**
 * Resolve como responder à raiz (GET /) para o host dado.
 * @param {string} host - Host da requisição (sem porta, sem www)
 * @param {object} req - Objeto request (para protocol/host)
 * @returns {{ type: 'site_manutencao' } | { type: 'site_public', site: object, baseUrl: string } | { type: 'index' } | { type: 'json', data: object }}
 */
async function getRootResponse(host, req) {
    if (host) {
        try {
            const site = await sitesService.getPublicByCustomDomain(host);
            if (site) {
                if (site.em_manutencao) {
                    return { type: 'site_manutencao' };
                }
                const baseUrl = `${req.protocol}://${req.get('host')}`;
                return { type: 'site_public', site, baseUrl };
            }
        } catch (e) {
            logger.error('GET / custom domain check:', e);
        }
    }
    return { type: 'index' };
}

module.exports = { getRootResponse };
