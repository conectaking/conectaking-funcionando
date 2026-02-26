/**
 * Proteção das rotas KingBrief: autenticação + módulo no plano.
 */

const { protectUser } = require('../../middleware/protectUser');
const { requireModule } = require('../../middleware/requireModule');

const protectKingBrief = (req, res, next) => {
    protectUser(req, res, () => requireModule('kingbrief')(req, res, next));
};

module.exports = { protectKingBrief };
