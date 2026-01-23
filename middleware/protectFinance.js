/**
 * Middleware de proteção para rotas do módulo Financeiro
 * Isolado - usa protectUser internamente mas é próprio do módulo financeiro
 */

const { protectUser } = require('./protectUser');

const protectFinance = (req, res, next) => {
    return protectUser(req, res, next);
};

module.exports = { protectFinance };
