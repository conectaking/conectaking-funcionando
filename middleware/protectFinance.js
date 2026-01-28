/**
 * Middleware de proteção para rotas do módulo Financeiro.
 * Exige autenticação E que o plano do usuário tenha o módulo "finance" na Separação de Pacotes.
 */

const { protectUser } = require('./protectUser');
const { requireModule } = require('./requireModule');

// Primeiro autentica, depois verifica se o plano tem Gestão Financeira
const protectFinance = (req, res, next) => {
    protectUser(req, res, () => requireModule('finance')(req, res, next));
};

module.exports = { protectFinance };
