/**
 * Service: personalizar cartão (tema visual).
 */
const repository = require('./personalizar.repository');

async function getSettings(userId) {
    return repository.getSettings(userId);
}

/**
 * Atualiza apenas os campos de personalização. Deve ser chamado dentro de uma transação (client).
 */
async function updateSettings(client, userId, details) {
    return repository.updateSettings(client, userId, details);
}

module.exports = {
    getSettings,
    updateSettings,
};
