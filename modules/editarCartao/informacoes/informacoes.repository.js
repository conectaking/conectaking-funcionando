/**
 * Repository: informações do cartão (nome, bio, avatar, @, WhatsApp, share image).
 * Lê/grava em users.profile_slug e user_profiles (campos de informação).
 */
const db = require('../../../db');
const { getExistingProfileColumns } = require('../shared/profileColumns');

/**
 * Retorna apenas os campos de "informações" do perfil (users + user_profiles).
 */
async function getDetails(userId) {
    const existingColumns = await getExistingProfileColumns();
    const baseFields = [
        'u.id', 'u.email', 'u.profile_slug',
        'p.display_name', 'p.bio', 'p.profile_image_url',
    ];
    if (existingColumns.includes('avatar_format')) {
        baseFields.push("COALESCE(p.avatar_format, 'circular') as avatar_format");
    } else {
        baseFields.push("'circular' as avatar_format");
    }
    if (existingColumns.includes('share_image_url')) baseFields.push('p.share_image_url');
    if (existingColumns.includes('whatsapp')) baseFields.push('p.whatsapp');
    if (existingColumns.includes('whatsapp_number')) baseFields.push('p.whatsapp_number');

    const { rows } = await db.query(
        `SELECT ${baseFields.join(', ')}
         FROM users u
         LEFT JOIN user_profiles p ON u.id = p.user_id
         WHERE u.id = $1`,
        [userId]
    );
    return rows[0] || null;
}

/**
 * Atualiza apenas campos de informações em user_profiles e users.profile_slug.
 * @param {object} client - cliente pg (transação)
 */
async function updateDetails(client, userId, details) {
    const existingColumns = await getExistingProfileColumns();
    const checkProfile = await client.query('SELECT user_id FROM user_profiles WHERE user_id = $1', [userId]);

    const infoFields = [
        'display_name', 'bio', 'profile_image_url',
    ];
    if (existingColumns.includes('whatsapp')) infoFields.push('whatsapp');
    if (existingColumns.includes('whatsapp_number')) infoFields.push('whatsapp_number');
    if (existingColumns.includes('avatar_format')) infoFields.push('avatar_format');
    if (existingColumns.includes('share_image_url')) infoFields.push('share_image_url');

    const getVal = (key, alt) => details[key] ?? details[alt] ?? null;

    if (checkProfile.rows.length === 0) {
        const insertFields = ['user_id', ...infoFields];
        const insertValues = [
            userId,
            getVal('display_name', 'displayName'),
            getVal('bio'),
            getVal('profile_image_url', 'profileImageUrl'),
        ];
        if (existingColumns.includes('whatsapp')) insertValues.push(getVal('whatsapp', 'whatsappNumber'));
        if (existingColumns.includes('whatsapp_number')) insertValues.push(getVal('whatsapp_number', 'whatsappNumber'));
        if (existingColumns.includes('avatar_format')) insertValues.push(getVal('avatar_format', 'avatarFormat') || 'circular');
        if (existingColumns.includes('share_image_url')) insertValues.push(getVal('share_image_url'));

        const placeholders = insertValues.map((_, i) => `$${i + 1}`).join(', ');
        await client.query(
            `INSERT INTO user_profiles (${insertFields.join(', ')}) VALUES (${placeholders})`,
            insertValues
        );
    } else {
        const updateParts = [];
        const updateValues = [];
        let idx = 1;
        updateParts.push(`display_name = COALESCE($${idx++}, display_name)`);
        updateValues.push(getVal('display_name', 'displayName'));
        updateParts.push(`bio = COALESCE($${idx++}, bio)`);
        updateValues.push(getVal('bio'));
        updateParts.push(`profile_image_url = COALESCE($${idx++}, profile_image_url)`);
        updateValues.push(getVal('profile_image_url', 'profileImageUrl'));
        if (existingColumns.includes('whatsapp')) {
            updateParts.push(`whatsapp = COALESCE($${idx++}, whatsapp)`);
            updateValues.push(getVal('whatsapp', 'whatsappNumber'));
        }
        if (existingColumns.includes('whatsapp_number')) {
            updateParts.push(`whatsapp_number = COALESCE($${idx++}, whatsapp_number)`);
            updateValues.push(getVal('whatsapp_number', 'whatsappNumber'));
        }
        if (existingColumns.includes('avatar_format')) {
            const v = getVal('avatar_format', 'avatarFormat');
            if (v) {
                updateParts.push(`avatar_format = COALESCE($${idx++}, avatar_format)`);
                updateValues.push(v);
            }
        }
        if (existingColumns.includes('share_image_url')) {
            updateParts.push(`share_image_url = COALESCE($${idx++}, share_image_url)`);
            updateValues.push(getVal('share_image_url'));
        }
        updateValues.push(userId);
        await client.query(
            `UPDATE user_profiles SET ${updateParts.join(', ')} WHERE user_id = $${idx}`,
            updateValues
        );
    }

    const slug = details.profile_slug ?? details.profileSlug;
    if (slug) {
        await client.query('UPDATE users SET profile_slug = $1 WHERE id = $2', [slug, userId]);
    }
}

module.exports = {
    getDetails,
    updateDetails,
};
