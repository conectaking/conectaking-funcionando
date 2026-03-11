/**
 * Repository: usuários admin (listagem, dashboard, gestão, auto-delete).
 * Único que acessa o banco para o módulo admin/users.
 */
const db = require('../../../db');

const USERS_LIST_QUERY = `
    SELECT 
        u.id, 
        p.display_name, 
        u.email, 
        u.profile_slug, 
        u.is_admin, 
        u.created_at,
        u.account_type,
        u.parent_user_id,
        parent.email as parent_email,
        u.subscription_status,
        u.subscription_expires_at,
        u.max_team_invites
    FROM users u
    LEFT JOIN user_profiles p ON u.id = p.user_id
    LEFT JOIN users parent ON u.parent_user_id = parent.id
    ORDER BY u.created_at DESC
`;

async function listUsers() {
    const { rows } = await db.query(USERS_LIST_QUERY);
    return rows;
}

async function getUserById(userId) {
    const { rows } = await db.query(
        `SELECT u.id, u.email, u.profile_slug, u.created_at, p.display_name
         FROM users u
         LEFT JOIN user_profiles p ON u.id = p.user_id
         WHERE u.id = $1`,
        [userId]
    );
    return rows[0] || null;
}

async function getLoginStats(userId) {
    const { rows } = await db.query(
        `SELECT COUNT(*) as total, MAX(created_at) as last_at
         FROM user_activities
         WHERE user_id = $1 AND activity_type = 'login'`,
        [userId]
    );
    return rows[0];
}

async function getViewStats(userId) {
    const { rows } = await db.query(
        `SELECT COUNT(*) as total, MAX(created_at) as last_at
         FROM analytics_events
         WHERE user_id = $1 AND event_type = 'view'`,
        [userId]
    );
    return rows[0];
}

async function getClickStats(userId) {
    const { rows } = await db.query(
        `SELECT COUNT(*) as total, MAX(created_at) as last_at
         FROM analytics_events
         WHERE user_id = $1 AND event_type = 'click'`,
        [userId]
    );
    return rows[0];
}

async function getByIp(userId) {
    const { rows } = await db.query(
        `SELECT ip_address, user_agent,
          COUNT(*) FILTER (WHERE event_type = 'view') as views,
          COUNT(*) FILTER (WHERE event_type = 'click') as clicks,
          MAX(created_at) as last_at
         FROM analytics_events
         WHERE user_id = $1 AND (ip_address IS NOT NULL OR user_agent IS NOT NULL)
         GROUP BY ip_address, user_agent
         ORDER BY last_at DESC NULLS LAST
         LIMIT 100`,
        [userId]
    );
    return rows;
}

async function getByLink(userId) {
    const { rows } = await db.query(
        `SELECT ae.item_id, pi.title, pi.item_type, pi.destination_url,
          COUNT(*) as clicks, MAX(ae.created_at) as last_at
         FROM analytics_events ae
         LEFT JOIN profile_items pi ON ae.item_id = pi.id
         WHERE ae.user_id = $1 AND ae.event_type = 'click'
         GROUP BY ae.item_id, pi.title, pi.item_type, pi.destination_url
         ORDER BY clicks DESC, last_at DESC NULLS LAST
         LIMIT 50`,
        [userId]
    );
    return rows;
}

async function getLastLogin(userId) {
    const { rows } = await db.query(
        `SELECT created_at, ip_address, user_agent
         FROM user_activities
         WHERE user_id = $1 AND activity_type = 'login'
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId]
    );
    return rows[0] || null;
}

async function getTagCodeByUser(userId) {
    const { rows } = await db.query(
        `SELECT code FROM registration_codes
         WHERE claimed_by_user_id = $1 AND is_claimed = TRUE
         ORDER BY claimed_at DESC LIMIT 1`,
        [userId]
    );
    return rows[0]?.code || null;
}

async function getCurrentUserEmail(client, id) {
    const { rows } = await client.query('SELECT email FROM users WHERE id = $1', [id]);
    return rows[0]?.email ?? null;
}

async function findUserByEmail(client, email, excludeId) {
    const { rows } = await client.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, excludeId]
    );
    return rows.length > 0;
}

async function updateUserManage(client, id, payload) {
    const { rows } = await client.query(
        `UPDATE users 
         SET email = $1, account_type = $2, is_admin = $3, subscription_status = $4, subscription_expires_at = $5, max_team_invites = $6
         WHERE id = $7 
         RETURNING id, email, account_type, is_admin, subscription_status, subscription_expires_at, max_team_invites`,
        [
            payload.email,
            payload.accountType,
            payload.isAdmin,
            payload.subscriptionStatus,
            payload.subscriptionExpiresAt,
            payload.maxTeamInvites,
            id,
        ]
    );
    return rows[0] || null;
}

async function updateUserRole(id, accountType, isAdmin) {
    const { rows } = await db.query(
        'UPDATE users SET account_type = $1, is_admin = $2 WHERE id = $3 RETURNING id, account_type, is_admin',
        [accountType, isAdmin, id]
    );
    return rows[0] || null;
}

async function updateUserAccountType(id, accountType) {
    const { rows } = await db.query(
        'UPDATE users SET account_type = $1 WHERE id = $2 RETURNING id, account_type',
        [accountType, id]
    );
    return rows[0] || null;
}

async function deleteUserCascade(client, id) {
    await client.query('DELETE FROM analytics_events WHERE user_id = $1', [id]);
    await client.query('DELETE FROM profile_items WHERE user_id = $1', [id]);
    await client.query('DELETE FROM user_profiles WHERE user_id = $1', [id]);
    await client.query('UPDATE registration_codes SET generated_by_user_id = NULL WHERE generated_by_user_id = $1', [id]);
    const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    return result.rowCount > 0;
}

async function getAutoDeleteConfig() {
    const { rows } = await db.query(
        'SELECT * FROM user_auto_delete_config ORDER BY days_after_expiration'
    );
    return rows;
}

async function saveAutoDeleteConfig(daysAfterExpiration, isActive) {
    const { rows } = await db.query(
        `INSERT INTO user_auto_delete_config (days_after_expiration, is_active, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (days_after_expiration) 
         DO UPDATE SET is_active = $2, updated_at = NOW()
         RETURNING *`,
        [daysAfterExpiration, isActive]
    );
    return rows[0];
}

async function countUsersToAutoDelete(cutoffDate) {
    const { rows } = await db.query(
        `SELECT COUNT(*) as count
         FROM users 
         WHERE subscription_expires_at IS NOT NULL 
         AND subscription_expires_at < $1 
         AND is_admin = false`,
        [cutoffDate]
    );
    return parseInt(rows[0].count, 10);
}

async function executeAutoDeleteUsers(cutoffDate) {
    const result = await db.query(
        `DELETE FROM users 
         WHERE subscription_expires_at IS NOT NULL 
         AND subscription_expires_at < $1 
         AND is_admin = false
         RETURNING id, email, account_type, subscription_expires_at`,
        [cutoffDate]
    );
    return result.rowCount;
}

module.exports = {
    listUsers,
    getUserById,
    getLoginStats,
    getViewStats,
    getClickStats,
    getByIp,
    getByLink,
    getLastLogin,
    getTagCodeByUser,
    getCurrentUserEmail,
    findUserByEmail,
    updateUserManage,
    updateUserRole,
    updateUserAccountType,
    deleteUserCascade,
    getAutoDeleteConfig,
    saveAutoDeleteConfig,
    countUsersToAutoDelete,
    executeAutoDeleteUsers,
};
