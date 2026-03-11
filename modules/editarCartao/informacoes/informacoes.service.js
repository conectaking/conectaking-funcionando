/**
 * Service: informações do cartão (nome, bio, avatar, @, WhatsApp).
 */
const repository = require('./informacoes.repository');

async function getDetails(userId) {
    return repository.getDetails(userId);
}

/**
 * Atualiza apenas os campos de informações. Deve ser chamado dentro de uma transação (client).
 */
async function updateDetails(client, userId, details) {
    return repository.updateDetails(client, userId, details);
}

module.exports = {
    getDetails,
    updateDetails,
};
