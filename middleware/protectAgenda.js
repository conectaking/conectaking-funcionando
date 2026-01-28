/**
 * Middleware de proteção para rotas do módulo Agenda.
 * Exige autenticação E que o plano do usuário tenha o módulo "agenda" na Separação de Pacotes.
 */

const { protectUser } = require('./protectUser');
const { requireModule } = require('./requireModule');

// Primeiro autentica, depois verifica se o plano tem Agenda Inteligente
const protectAgenda = (req, res, next) => {
    protectUser(req, res, () => requireModule('agenda')(req, res, next));
};

module.exports = { protectAgenda };
