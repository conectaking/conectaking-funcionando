/**
 * Repository: códigos de convite da empresa (gerados pelo dono da equipe).
 */
const db = require('../../../db');

async function getMaxTeamInvites(userId) {
    const { rows } = await db.query('SELECT max_team_invites FROM users WHERE id = $1', [userId]);
    return rows.length > 0 ? rows[0].max_team_invites : null;
}

async function countCodesByOwner(ownerId) {
    const { rows } = await db.query(
        'SELECT COUNT(*) as count FROM registration_codes WHERE generated_by_user_id = $1',
        [ownerId]
    );
    return parseInt(rows[0].count, 10);
}

async function insertTeamCode(client, code, ownerId) {
    await client.query(
        'INSERT INTO registration_codes (code, generated_by_user_id) VALUES ($1, $2)',
        [code, ownerId]
    );
}

async function listCodesByOwner(ownerId) {
    const { rows } = await db.query(
        `SELECT code, is_claimed, claimed_at, 
         (SELECT email FROM users WHERE id = claimed_by_user_id) as claimed_by_email
         FROM registration_codes WHERE generated_by_user_id = $1`,
        [ownerId]
    );
    return rows;
}

module.exports = {
    getMaxTeamInvites,
    countCodesByOwner,
    insertTeamCode,
    listCodesByOwner,
};
