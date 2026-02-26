/**
 * Middleware de proteção para rotas do módulo KingBrief.
 * Exige autenticação e que o plano do usuário tenha o módulo "kingbrief".
 */

const { protectUser } = require('./protectUser');
const { requireModule } = require('./requireModule');

const protectKingBrief = (req, res, next) => {
    protectUser(req, res, () => requireModule('kingbrief')(req, res, next));
};

module.exports = { protectKingBrief };
