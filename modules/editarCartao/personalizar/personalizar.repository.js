/**
 * Repository: personalizar cartão (cores, fonte, botões, fundo, logo_spacing).
 * Lê/grava apenas campos visuais em user_profiles.
 */
const db = require('../../../db');
const { getExistingProfileColumns } = require('../shared/profileColumns');

const THEME_FIELDS = [
    'p.font_family',
    'p.background_color', 'p.text_color', 'p.button_color', 'p.button_text_color',
    'p.button_opacity', 'p.button_border_radius', 'p.button_content_align',
    'p.background_type', 'p.background_image_url',
    'p.card_background_color', 'p.card_opacity',
    'p.button_font_size', 'p.background_image_opacity',
    'p.show_vcard_button',
];

async function getSettings(userId) {
    const existingColumns = await getExistingProfileColumns();
    const fields = [...THEME_FIELDS];
    if (existingColumns.includes('logo_spacing')) {
        fields.push("COALESCE(p.logo_spacing, 'center') as logo_spacing");
    } else {
        fields.push("'center' as logo_spacing");
    }
    const { rows } = await db.query(
        `SELECT ${fields.join(', ')}
         FROM users u
         LEFT JOIN user_profiles p ON u.id = p.user_id
         WHERE u.id = $1`,
        [userId]
    );
    return rows[0] || null;
}

/**
 * Atualiza apenas campos de personalização em user_profiles.
 * @param {object} client - cliente pg (transação)
 */
async function updateSettings(client, userId, details) {
    const existingColumns = await getExistingProfileColumns();
    const checkProfile = await client.query('SELECT user_id FROM user_profiles WHERE user_id = $1', [userId]);

    const getVal = (key, alt) => {
        const v = details[key] ?? details[alt];
        return v !== undefined && v !== null ? v : undefined;
    };

    const themeValues = [
        getVal('font_family', 'fontFamily'),
        getVal('background_color', 'backgroundColor'),
        getVal('text_color', 'textColor'),
        getVal('button_color', 'buttonColor'),
        getVal('button_text_color', 'buttonTextColor'),
        getVal('button_opacity', 'buttonOpacity'),
        getVal('button_border_radius', 'buttonBorderRadius'),
        getVal('button_content_align', 'buttonContentAlign'),
        getVal('background_type', 'backgroundType'),
        getVal('background_image_url', 'backgroundImageUrl'),
        getVal('card_background_color', 'cardBackgroundColor'),
        getVal('card_opacity', 'cardOpacity'),
        getVal('button_font_size', 'buttonFontSize'),
        getVal('background_image_opacity', 'backgroundImageOpacity'),
        getVal('show_vcard_button', 'showVcardButton'),
    ];

    if (checkProfile.rows.length === 0) {
        const insertFields = [
            'user_id', 'font_family', 'background_color', 'text_color', 'button_color', 'button_text_color',
            'button_opacity', 'button_border_radius', 'button_content_align',
            'background_type', 'background_image_url',
            'card_background_color', 'card_opacity',
            'button_font_size', 'background_image_opacity', 'show_vcard_button',
        ];
        const insertValues = [userId, ...themeValues.map((v) => v ?? null)];
        if (existingColumns.includes('logo_spacing')) {
            insertFields.push('logo_spacing');
            insertValues.push(getVal('logo_spacing', 'logoSpacing') ?? 'center');
        }
        const placeholders = insertValues.map((_, i) => `$${i + 1}`).join(', ');
        await client.query(
            `INSERT INTO user_profiles (${insertFields.join(', ')}) VALUES (${placeholders})`,
            insertValues
        );
    } else {
        const updateParts = [
            'font_family = COALESCE($1, font_family)',
            'background_color = COALESCE($2, background_color)',
            'text_color = COALESCE($3, text_color)',
            'button_color = COALESCE($4, button_color)',
            'button_text_color = COALESCE($5, button_text_color)',
            'button_opacity = COALESCE($6, button_opacity)',
            'button_border_radius = COALESCE($7, button_border_radius)',
            'button_content_align = COALESCE($8, button_content_align)',
            'background_type = COALESCE($9, background_type)',
            'background_image_url = COALESCE($10, background_image_url)',
            'card_background_color = COALESCE($11, card_background_color)',
            'card_opacity = COALESCE($12, card_opacity)',
            'button_font_size = COALESCE($13, button_font_size)',
            'background_image_opacity = COALESCE($14, background_image_opacity)',
            'show_vcard_button = COALESCE($15, show_vcard_button)',
        ];
        const updateValues = themeValues.map((v) => v ?? null);
        let idx = 16;
        if (existingColumns.includes('logo_spacing')) {
            const logoSpacing = getVal('logo_spacing', 'logoSpacing');
            updateParts.push(`logo_spacing = CASE WHEN $${idx}::VARCHAR IS NOT NULL THEN $${idx}::VARCHAR ELSE logo_spacing END`);
            updateValues.push(logoSpacing !== undefined && logoSpacing !== null ? logoSpacing : null);
            idx++;
        }
        updateValues.push(userId);
        await client.query(
            `UPDATE user_profiles SET ${updateParts.join(', ')} WHERE user_id = $${idx}`,
            updateValues
        );
    }
}

module.exports = {
    getSettings,
    updateSettings,
};
