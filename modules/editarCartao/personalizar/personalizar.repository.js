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
 * Verifica se details tem valor explícito para a chave (ou alternativa camelCase).
 * Só atualizamos campos que foram realmente enviados, para evitar que um único
 * controle no front (ex.: um slider) altere vários campos por engano.
 */
function hasKey(details, key, alt) {
    return details[key] !== undefined || details[alt] !== undefined;
}

/**
 * Atualiza apenas campos de personalização em user_profiles.
 * Só inclui no UPDATE os campos que estão presentes em details, evitando
 * que opacidade do card, do botão ou da imagem de fundo se misturem.
 * @param {object} client - cliente pg (transação)
 */
async function updateSettings(client, userId, details) {
    const existingColumns = await getExistingProfileColumns();
    const checkProfile = await client.query('SELECT user_id FROM user_profiles WHERE user_id = $1', [userId]);

    const getVal = (key, alt) => {
        const v = details[key] ?? details[alt];
        return v !== undefined && v !== null ? v : undefined;
    };

    const fieldDefs = [
        ['font_family', 'fontFamily'],
        ['background_color', 'backgroundColor'],
        ['text_color', 'textColor'],
        ['button_color', 'buttonColor'],
        ['button_text_color', 'buttonTextColor'],
        ['button_opacity', 'buttonOpacity'],
        ['button_border_radius', 'buttonBorderRadius'],
        ['button_content_align', 'buttonContentAlign'],
        ['background_type', 'backgroundType'],
        ['background_image_url', 'backgroundImageUrl'],
        ['card_background_color', 'cardBackgroundColor'],
        ['card_opacity', 'cardOpacity'],
        ['button_font_size', 'buttonFontSize'],
        ['background_image_opacity', 'backgroundImageOpacity'],
        ['show_vcard_button', 'showVcardButton'],
    ];

    const themeValues = fieldDefs.map(([key, alt]) => getVal(key, alt));

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
        const updateParts = [];
        const updateValues = [];
        let paramIndex = 1;
        const dbColumns = [
            'font_family', 'background_color', 'text_color', 'button_color', 'button_text_color',
            'button_opacity', 'button_border_radius', 'button_content_align',
            'background_type', 'background_image_url',
            'card_background_color', 'card_opacity',
            'button_font_size', 'background_image_opacity', 'show_vcard_button',
        ];
        fieldDefs.forEach(([key, alt], i) => {
            if (hasKey(details, key, alt)) {
                const val = getVal(key, alt);
                updateParts.push(`${dbColumns[i]} = $${paramIndex}`);
                updateValues.push(val !== undefined && val !== null ? val : null);
                paramIndex++;
            }
        });
        if (existingColumns.includes('logo_spacing') && hasKey(details, 'logo_spacing', 'logoSpacing')) {
            const logoSpacing = getVal('logo_spacing', 'logoSpacing');
            updateParts.push(`logo_spacing = $${paramIndex}`);
            updateValues.push(logoSpacing !== undefined && logoSpacing !== null ? logoSpacing : null);
            paramIndex++;
        }
        if (updateParts.length > 0) {
            updateValues.push(userId);
            await client.query(
                `UPDATE user_profiles SET ${updateParts.join(', ')} WHERE user_id = $${paramIndex}`,
                updateValues
            );
        }
    }
}

module.exports = {
    getSettings,
    updateSettings,
};
