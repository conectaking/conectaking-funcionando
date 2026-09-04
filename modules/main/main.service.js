const logger = require('../../utils/logger');

/**
 * Resolve como responder à raiz (GET /) para o host dado.
 * (Meu site / domínio customizado removido — sempre index do painel.)
 * @param {string} host - Host da requisição (sem porta, sem www)
 * @param {object} req - Objeto request (para protocol/host)
 * @returns {{ type: 'index' } | { type: 'json', data: object }}
 */
async function getRootResponse(host, req) {
    return { type: 'index' };
}

module.exports = { getRootResponse };
