/**
 * Service: equipe (lista de membros).
 */
const repository = require('./equipe.repository');

async function getTeamMembers(ownerId) {
    return repository.listTeamMembers(ownerId);
}

module.exports = {
    getTeamMembers,
};
