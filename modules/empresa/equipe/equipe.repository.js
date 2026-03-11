/**
 * Repository: lista de membros da equipe (usuários com parent_user_id = owner).
 */
const db = require('../../../db');

async function listTeamMembers(ownerId) {
    const { rows } = await db.query(
        `SELECT u.id, p.display_name, u.email, u.created_at 
         FROM users u
         LEFT JOIN user_profiles p ON u.id = p.user_id
         WHERE u.parent_user_id = $1`,
        [ownerId]
    );
    return rows;
}

module.exports = {
    listTeamMembers,
};
