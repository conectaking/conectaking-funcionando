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
    if (existingColumns.includes('card_layout')) {
        baseFields.push("COALESCE(p.card_layout, 'classic') as card_layout");
    } else {
        baseFields.push("'classic' as card_layout");
    }
    if (existingColumns.includes('vitrine_hero_url')) baseFields.push('p.vitrine_hero_url');
    if (existingColumns.includes('vitrine_marquee_text')) baseFields.push('p.vitrine_marquee_text');
    if (existingColumns.includes('vitrine_marquee_logos')) baseFields.push('p.vitrine_marquee_logos');
    if (existingColumns.includes('vitrine_marquee_speed')) {
        baseFields.push("COALESCE(p.vitrine_marquee_speed, 'slow') as vitrine_marquee_speed");
    }
    if (existingColumns.includes('vitrine_show_footer')) {
        baseFields.push("COALESCE(p.vitrine_show_footer, false) as vitrine_show_footer");
    }
    if (existingColumns.includes('vitrine_marquee_bg_type')) {
        baseFields.push("COALESCE(p.vitrine_marquee_bg_type, 'solid') as vitrine_marquee_bg_type");
    }
    if (existingColumns.includes('vitrine_marquee_color1')) {
        baseFields.push("COALESCE(p.vitrine_marquee_color1, '#2A2A2E') as vitrine_marquee_color1");
    }
    if (existingColumns.includes('vitrine_marquee_color2')) {
        baseFields.push("COALESCE(p.vitrine_marquee_color2, '#FFC700') as vitrine_marquee_color2");
    }
    if (existingColumns.includes('vitrine_marquee_text_color')) {
        baseFields.push("COALESCE(p.vitrine_marquee_text_color, '#FFC700') as vitrine_marquee_text_color");
    }

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
    if (existingColumns.includes('card_layout')) infoFields.push('card_layout');
    if (existingColumns.includes('vitrine_hero_url')) infoFields.push('vitrine_hero_url');
    if (existingColumns.includes('vitrine_marquee_text')) infoFields.push('vitrine_marquee_text');
    if (existingColumns.includes('vitrine_marquee_logos')) infoFields.push('vitrine_marquee_logos');
    if (existingColumns.includes('vitrine_marquee_speed')) infoFields.push('vitrine_marquee_speed');
    if (existingColumns.includes('vitrine_show_footer')) infoFields.push('vitrine_show_footer');
    if (existingColumns.includes('vitrine_marquee_bg_type')) infoFields.push('vitrine_marquee_bg_type');
    if (existingColumns.includes('vitrine_marquee_color1')) infoFields.push('vitrine_marquee_color1');
    if (existingColumns.includes('vitrine_marquee_color2')) infoFields.push('vitrine_marquee_color2');
    if (existingColumns.includes('vitrine_marquee_text_color')) infoFields.push('vitrine_marquee_text_color');

    const getVal = (key, alt) => details[key] ?? details[alt] ?? null;

    const normalizeLayout = (raw) => {
        const v = String(raw || 'classic').toLowerCase();
        return v === 'vitrine' ? 'vitrine' : 'classic';
    };
    const normalizeSpeed = (raw) => {
        const v = String(raw || 'slow').toLowerCase();
        return ['slow', 'normal', 'fast'].includes(v) ? v : 'slow';
    };
    const normalizeBgType = (raw) => {
        const v = String(raw || 'solid').toLowerCase();
        return v === 'gradient' ? 'gradient' : 'solid';
    };
    const normalizeColor = (raw, fallback) => {
        const v = String(raw || '').trim();
        if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v)) return v;
        return fallback;
    };
    const normalizeLogos = (raw) => {
        if (raw == null) return null;
        if (Array.isArray(raw)) return JSON.stringify(raw.filter(Boolean).slice(0, 3));
        if (typeof raw === 'string') {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return JSON.stringify(parsed.filter(Boolean).slice(0, 3));
            } catch (_) { /* ignore */ }
            return JSON.stringify(raw.trim() ? [raw.trim()] : []);
        }
        return JSON.stringify([]);
    };
    const normalizeFooter = (raw) => {
        if (raw === true || raw === 'true' || raw === 1 || raw === '1') return true;
        if (raw === false || raw === 'false' || raw === 0 || raw === '0') return false;
        return null;
    };

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
        if (existingColumns.includes('card_layout')) insertValues.push(normalizeLayout(getVal('card_layout', 'cardLayout')));
        if (existingColumns.includes('vitrine_hero_url')) insertValues.push(getVal('vitrine_hero_url', 'vitrineHeroUrl'));
        if (existingColumns.includes('vitrine_marquee_text')) insertValues.push(getVal('vitrine_marquee_text', 'vitrineMarqueeText'));
        if (existingColumns.includes('vitrine_marquee_logos')) {
            insertValues.push(normalizeLogos(getVal('vitrine_marquee_logos', 'vitrineMarqueeLogos')) || '[]');
        }
        if (existingColumns.includes('vitrine_marquee_speed')) {
            insertValues.push(normalizeSpeed(getVal('vitrine_marquee_speed', 'vitrineMarqueeSpeed')));
        }
        if (existingColumns.includes('vitrine_show_footer')) {
            insertValues.push(normalizeFooter(getVal('vitrine_show_footer', 'vitrineShowFooter')) ?? false);
        }
        if (existingColumns.includes('vitrine_marquee_bg_type')) {
            insertValues.push(normalizeBgType(getVal('vitrine_marquee_bg_type', 'vitrineMarqueeBgType')));
        }
        if (existingColumns.includes('vitrine_marquee_color1')) {
            insertValues.push(normalizeColor(getVal('vitrine_marquee_color1', 'vitrineMarqueeColor1'), '#2A2A2E'));
        }
        if (existingColumns.includes('vitrine_marquee_color2')) {
            insertValues.push(normalizeColor(getVal('vitrine_marquee_color2', 'vitrineMarqueeColor2'), '#FFC700'));
        }
        if (existingColumns.includes('vitrine_marquee_text_color')) {
            insertValues.push(normalizeColor(getVal('vitrine_marquee_text_color', 'vitrineMarqueeTextColor'), '#FFC700'));
        }

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
        if (existingColumns.includes('card_layout')) {
            const layoutVal = getVal('card_layout', 'cardLayout');
            if (layoutVal != null && String(layoutVal).trim() !== '') {
                updateParts.push(`card_layout = $${idx++}`);
                updateValues.push(normalizeLayout(layoutVal));
            }
        }
        if (existingColumns.includes('vitrine_hero_url') && (Object.prototype.hasOwnProperty.call(details, 'vitrine_hero_url') || Object.prototype.hasOwnProperty.call(details, 'vitrineHeroUrl'))) {
            updateParts.push(`vitrine_hero_url = $${idx++}`);
            updateValues.push(getVal('vitrine_hero_url', 'vitrineHeroUrl') || null);
        }
        if (existingColumns.includes('vitrine_marquee_text') && (Object.prototype.hasOwnProperty.call(details, 'vitrine_marquee_text') || Object.prototype.hasOwnProperty.call(details, 'vitrineMarqueeText'))) {
            updateParts.push(`vitrine_marquee_text = $${idx++}`);
            updateValues.push(getVal('vitrine_marquee_text', 'vitrineMarqueeText') || null);
        }
        if (existingColumns.includes('vitrine_marquee_logos') && (Object.prototype.hasOwnProperty.call(details, 'vitrine_marquee_logos') || Object.prototype.hasOwnProperty.call(details, 'vitrineMarqueeLogos'))) {
            updateParts.push(`vitrine_marquee_logos = $${idx++}::jsonb`);
            updateValues.push(normalizeLogos(getVal('vitrine_marquee_logos', 'vitrineMarqueeLogos')) || '[]');
        }
        if (existingColumns.includes('vitrine_marquee_speed')) {
            const speedVal = getVal('vitrine_marquee_speed', 'vitrineMarqueeSpeed');
            if (speedVal != null && String(speedVal).trim() !== '') {
                updateParts.push(`vitrine_marquee_speed = $${idx++}`);
                updateValues.push(normalizeSpeed(speedVal));
            }
        }
        if (existingColumns.includes('vitrine_show_footer') && (Object.prototype.hasOwnProperty.call(details, 'vitrine_show_footer') || Object.prototype.hasOwnProperty.call(details, 'vitrineShowFooter'))) {
            const footerVal = normalizeFooter(getVal('vitrine_show_footer', 'vitrineShowFooter'));
            if (footerVal !== null) {
                updateParts.push(`vitrine_show_footer = $${idx++}`);
                updateValues.push(footerVal);
            }
        }
        if (existingColumns.includes('vitrine_marquee_bg_type') && (Object.prototype.hasOwnProperty.call(details, 'vitrine_marquee_bg_type') || Object.prototype.hasOwnProperty.call(details, 'vitrineMarqueeBgType'))) {
            updateParts.push(`vitrine_marquee_bg_type = $${idx++}`);
            updateValues.push(normalizeBgType(getVal('vitrine_marquee_bg_type', 'vitrineMarqueeBgType')));
        }
        if (existingColumns.includes('vitrine_marquee_color1') && (Object.prototype.hasOwnProperty.call(details, 'vitrine_marquee_color1') || Object.prototype.hasOwnProperty.call(details, 'vitrineMarqueeColor1'))) {
            updateParts.push(`vitrine_marquee_color1 = $${idx++}`);
            updateValues.push(normalizeColor(getVal('vitrine_marquee_color1', 'vitrineMarqueeColor1'), '#2A2A2E'));
        }
        if (existingColumns.includes('vitrine_marquee_color2') && (Object.prototype.hasOwnProperty.call(details, 'vitrine_marquee_color2') || Object.prototype.hasOwnProperty.call(details, 'vitrineMarqueeColor2'))) {
            updateParts.push(`vitrine_marquee_color2 = $${idx++}`);
            updateValues.push(normalizeColor(getVal('vitrine_marquee_color2', 'vitrineMarqueeColor2'), '#FFC700'));
        }
        if (existingColumns.includes('vitrine_marquee_text_color') && (Object.prototype.hasOwnProperty.call(details, 'vitrine_marquee_text_color') || Object.prototype.hasOwnProperty.call(details, 'vitrineMarqueeTextColor'))) {
            updateParts.push(`vitrine_marquee_text_color = $${idx++}`);
            updateValues.push(normalizeColor(getVal('vitrine_marquee_text_color', 'vitrineMarqueeTextColor'), '#FFC700'));
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
