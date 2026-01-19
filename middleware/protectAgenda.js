/**
 * Middleware de proteção para rotas do módulo Agenda
 * Isolado - usa protectUser internamente mas é próprio do módulo agenda
 */

const { protectUser } = require('./protectUser');

const protectAgenda = (req, res, next) => {
    return protectUser(req, res, next);
};

module.exports = { protectAgenda };
