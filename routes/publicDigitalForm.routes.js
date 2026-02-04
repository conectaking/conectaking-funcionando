const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const db = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const checkoutService = require('../modules/checkout/checkout.service');
const { validateFormSubmission, handleValidationErrors, sanitizeResponseData, escapeHtml, sanitizeHtml } = require('../utils/formValidators');

/**
 * Sanitiza dados do formulário antes de renderizar no HTML
 * Previne XSS attacks
 */
function sanitizeFormDataForRender(formData) {
    if (!formData || typeof formData !== 'object') return formData;
    
    const sanitized = { ...formData };
    
    // Sanitizar campos de texto que são renderizados diretamente no HTML
    if (sanitized.form_title) {
        sanitized.form_title = escapeHtml(String(sanitized.form_title));
    }
    if (sanitized.form_description) {
        // Descrição pode conter HTML limitado, então usar sanitizeHtml
        sanitized.form_description = sanitizeHtml(String(sanitized.form_description));
    }
    if (sanitized.pastor_button_name) {
        sanitized.pastor_button_name = escapeHtml(String(sanitized.pastor_button_name));
    }
    
    // Sanitizar form_fields (labels, placeholders, etc)
    // CRÍTICO: Garantir que form_fields seja preservado
    if (sanitized.form_fields) {
        if (Array.isArray(sanitized.form_fields)) {
            sanitized.form_fields = sanitized.form_fields.map(field => {
                const sanitizedField = { ...field };
                if (sanitizedField.label) {
                    sanitizedField.label = escapeHtml(String(sanitizedField.label));
                }
                if (sanitizedField.placeholder) {
                    sanitizedField.placeholder = escapeHtml(String(sanitizedField.placeholder));
                }
                if (Array.isArray(sanitizedField.options)) {
                    sanitizedField.options = sanitizedField.options.map(opt => 
                        typeof opt === 'string' ? escapeHtml(opt) : opt
                    );
                }
                return sanitizedField;
            });
        } else if (typeof sanitized.form_fields === 'string') {
            // Se ainda for string, tentar parsear
            try {
                const parsed = JSON.parse(sanitized.form_fields);
                if (Array.isArray(parsed)) {
                    sanitized.form_fields = parsed.map(field => {
                        const sanitizedField = { ...field };
                        if (sanitizedField.label) {
                            sanitizedField.label = escapeHtml(String(sanitizedField.label));
                        }
                        if (sanitizedField.placeholder) {
                            sanitizedField.placeholder = escapeHtml(String(sanitizedField.placeholder));
                        }
                        if (Array.isArray(sanitizedField.options)) {
                            sanitizedField.options = sanitizedField.options.map(opt => 
                                typeof opt === 'string' ? escapeHtml(opt) : opt
                            );
                        }
                        return sanitizedField;
                    });
                }
            } catch (e) {
                logger.error('❌ [SANITIZE] Erro ao parsear form_fields na sanitização:', e);
            }
        }
    } else {
        // Se não existe, garantir que seja array vazio
        sanitized.form_fields = [];
    }
    
    return sanitized;
}

// Rate limiting para submissão de formulários
const formSubmissionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // 10 submissões por IP
    message: {
        success: false,
        message: 'Muitas tentativas. Por favor, aguarde 15 minutos antes de tentar novamente.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Pular rate limit em desenvolvimento (opcional)
        return process.env.NODE_ENV === 'development' && req.headers['x-skip-rate-limit'] === 'true';
    }
});

/**
 * Redirect: GET /form/share/:token → GET /form/:token (link curto)
 * Mantém /form/share/xxx como rota que redireciona para /form/xxx
 */
router.get('/form/share/:token', (req, res) => res.redirect(301, '/form/' + encodeURIComponent(req.params.token)));

/**
 * Handler compartilhado: formulário por slug (usado em GET /form/:slug).
 * GET /kingforms/:slug redireciona 301 para /form/:slug.
 */
const renderFormBySlug = asyncHandler(async (req, res) => {
    const slug = req.params.slug;
    const now = Date.now();
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('X-Timestamp', now.toString());

    let client;
    client = await db.pool.connect();
    try {
        let itemRes = null;
        const cadastroLinksRes = await client.query(`
            SELECT pi.*, u.profile_slug,
                cl.id as cadastro_link_id, cl.expires_at as link_expires_at,
                cl.max_uses as link_max_uses, cl.current_uses as link_current_uses
            FROM profile_items pi
            INNER JOIN guest_list_items gli ON gli.profile_item_id = pi.id
            INNER JOIN users u ON pi.user_id = u.id
            INNER JOIN cadastro_links cl ON cl.guest_list_item_id = gli.id
            WHERE cl.slug = $1 AND (pi.item_type = 'digital_form' OR pi.item_type = 'guest_list') AND pi.is_active = true
        `, [slug]);

        if (cadastroLinksRes.rows.length > 0) {
            const linkRow = cadastroLinksRes.rows[0];
            if (linkRow.link_expires_at && new Date(linkRow.link_expires_at) < new Date()) {
                return res.status(410).render('linkExpired', { profileSlug: linkRow.profile_slug || '' });
            }
            if (linkRow.link_max_uses !== 999999 && linkRow.link_current_uses >= linkRow.link_max_uses) {
                return res.status(410).render('linkExpired', { reason: 'Este link atingiu o limite máximo de usos.', profileSlug: linkRow.profile_slug || '' });
            }
            itemRes = cadastroLinksRes;
        }

        if (!itemRes || itemRes.rows.length === 0) {
            const cadastroSlugRes = await client.query(`
                SELECT pi.*, u.profile_slug
                FROM profile_items pi
                INNER JOIN guest_list_items gli ON gli.profile_item_id = pi.id
                INNER JOIN users u ON pi.user_id = u.id
                WHERE gli.cadastro_slug = $1 AND (pi.item_type = 'digital_form' OR pi.item_type = 'guest_list') AND pi.is_active = true
            `, [slug]);
            if (cadastroSlugRes.rows.length > 0) itemRes = cadastroSlugRes;
        }

        if (!itemRes || itemRes.rows.length === 0) {
            return res.status(404).send('<h1>404 - Formulário não encontrado</h1><p>O link é inválido ou expirou.</p>');
        }

        const item = itemRes.rows[0];
        const profileSlug = item.profile_slug || '';
        const itemIdInt = parseInt(item.id, 10);
        const finalUserId = item.user_id;
        const isGuestList = item.item_type === 'guest_list';

        const columnCheck = await client.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'digital_form_items' AND column_name IN ('enable_whatsapp', 'enable_guest_list_submit')
        `);
        const hasEnableWhatsapp = columnCheck.rows.some(r => r.column_name === 'enable_whatsapp');
        const hasEnableGuestListSubmit = columnCheck.rows.some(r => r.column_name === 'enable_guest_list_submit');

        const formRes = await client.query(
            `SELECT * FROM digital_form_items WHERE profile_item_id = $1 ORDER BY COALESCE(updated_at, '1970-01-01'::timestamp) DESC, id DESC LIMIT 1`,
            [itemIdInt]
        );
        if (formRes.rows.length === 0) {
            return res.status(404).send('<h1>404 - Dados do formulário não encontrados</h1>');
        }

        let formData = formRes.rows[0];
        const guestListColumnsCheck = await client.query(`
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'guest_list_items' AND column_name IN ('card_color', 'enable_whatsapp', 'enable_guest_list_submit')
        `);
        const hasGuestListCardColor = guestListColumnsCheck.rows.some(r => r.column_name === 'card_color');
        const guestListHasEnableWhatsapp = guestListColumnsCheck.rows.some(r => r.column_name === 'enable_whatsapp');
        const guestListHasEnableGuestListSubmit = guestListColumnsCheck.rows.some(r => r.column_name === 'enable_guest_list_submit');
        let guestListSelectFields = 'primary_color, secondary_color, text_color, background_color, header_image_url, background_image_url, background_opacity, theme, updated_at';
        if (hasGuestListCardColor) guestListSelectFields += ', card_color';
        if (guestListHasEnableWhatsapp) guestListSelectFields += ', enable_whatsapp';
        if (guestListHasEnableGuestListSubmit) guestListSelectFields += ', enable_guest_list_submit';

        const guestListRes = await client.query(
            `SELECT ${guestListSelectFields} FROM guest_list_items WHERE profile_item_id = $1 ORDER BY COALESCE(updated_at, '1970-01-01'::timestamp) DESC, id DESC LIMIT 1`,
            [itemIdInt]
        );
        if (guestListRes.rows.length > 0 && isGuestList) {
            const g = guestListRes.rows[0];
            if (g.primary_color) formData.primary_color = g.primary_color;
            if (g.secondary_color) formData.secondary_color = g.secondary_color;
            if (g.text_color) formData.text_color = g.text_color;
            if (g.background_color) formData.background_color = g.background_color;
            if (g.header_image_url) formData.header_image_url = g.header_image_url;
            if (g.background_image_url) formData.background_image_url = g.background_image_url;
            if (g.background_opacity != null) formData.background_opacity = g.background_opacity;
            if (g.theme) formData.theme = g.theme;
            if (hasGuestListCardColor && g.card_color) formData.card_color = g.card_color;
            if (guestListHasEnableWhatsapp && g.enable_whatsapp !== undefined) formData.enable_whatsapp = g.enable_whatsapp;
            if (guestListHasEnableGuestListSubmit && g.enable_guest_list_submit !== undefined) formData.enable_guest_list_submit = g.enable_guest_list_submit;
        }
        if (hasEnableWhatsapp && (formData.enable_whatsapp === undefined || formData.enable_whatsapp === null)) formData.enable_whatsapp = true;
        else if (!hasEnableWhatsapp) formData.enable_whatsapp = true;
        if (hasEnableGuestListSubmit && (formData.enable_guest_list_submit === undefined || formData.enable_guest_list_submit === null)) formData.enable_guest_list_submit = false;
        else if (!hasEnableGuestListSubmit) formData.enable_guest_list_submit = false;
        if (!formData.secondary_color || formData.secondary_color === 'null' || (typeof formData.secondary_color === 'string' && formData.secondary_color.trim() === '')) {
            formData.secondary_color = formData.primary_color || '#4A90E2';
        }
        if (formData.form_fields) {
            formData.form_fields = typeof formData.form_fields === 'string' ? (() => { try { return JSON.parse(formData.form_fields); } catch (e) { return []; } })() : formData.form_fields;
            if (!Array.isArray(formData.form_fields)) formData.form_fields = [];
        } else formData.form_fields = [];
        if (formData.show_logo_corner === undefined) formData.show_logo_corner = false;

        res.set('Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0');
        if (formData.updated_at) res.set('X-Form-Updated-At', new Date(formData.updated_at).getTime().toString());
        res.set('X-Cache-Timestamp', Date.now().toString());

        let sanitizedFormData = formData;
        try { sanitizedFormData = sanitizeFormDataForRender(formData); } catch (e) { sanitizedFormData = formData; }

        const itemForRender = { id: itemIdInt, user_id: finalUserId, item_type: item.item_type || 'digital_form', is_active: item.is_active !== false };
        const baseUrl = `${req.protocol}://${req.get('host') || 'tag.conectaking.com.br'}`;
        const pathNoQuery = (req.originalUrl || req.path || '').split('?')[0] || `/form/${req.params.slug}`;
        const _canonicalFormUrl = baseUrl + pathNoQuery;
        let _ogImageUrl = sanitizedFormData.header_image_url || null;
        if (_ogImageUrl && !/^https?:\/\//i.test(_ogImageUrl)) _ogImageUrl = _ogImageUrl.startsWith('/') ? baseUrl + _ogImageUrl : null;
        return res.render('digitalForm', {
            item: itemForRender,
            formData: sanitizedFormData,
            profileSlug,
            slug: profileSlug,
            itemId: itemIdInt,
            _timestamp: Date.now(),
            _cacheBust: `?t=${Date.now()}`,
            _canonicalFormUrl,
            _ogImageUrl: _ogImageUrl || undefined
        });
    } catch (err) {
        logger.error('Erro /form/:slug:', err);
        try { if (typeof client !== 'undefined' && client) client.release(); } catch (e) {}
        return res.status(500).render('formError', { title: 'Erro', message: 'Erro ao carregar formulário.', errorCode: 'INTERNAL_ERROR' });
    } finally {
        try { if (typeof client !== 'undefined' && client && !client.released) client.release(); } catch (e) {}
    }
});

/** GET /form/:slug - Link curto personalizado (ex: /form/lideresposicionados) */
router.get('/form/:slug', renderFormBySlug);

/** Redirect: /kingforms/:slug → /form/:slug */
router.get('/kingforms/:slug', (req, res) => res.redirect(301, '/form/' + encodeURIComponent(req.params.slug)));

/**
 * Rota alternativa para links únicos: GET /:slug/form/share/:token
 * Redireciona para link curto /form/:token
 */
router.get('/:slug/form/share/:token', (req, res) => res.redirect(301, '/form/' + encodeURIComponent(req.params.token)));

/** Redireciona /:slug/forms/:token (ex: usuario/forms/cleciocastro) para /form/:token */
router.get('/:slug/forms/:token', (req, res) => res.redirect(301, '/form/' + encodeURIComponent(req.params.token)));

/**
 * Rota pública: GET /:slug/form/:itemId
 * Renderiza o formulário digital público
 */
router.get('/:slug/form/:itemId', asyncHandler(async (req, res) => {
    const { slug, itemId } = req.params;
    
    // Headers AGRESSIVOS para evitar cache no navegador e servidor
    const now = Date.now();
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Last-Modified', new Date(now).toUTCString());
    res.set('ETag', `"${now}"`);
    res.set('X-Timestamp', now.toString());
    res.set('X-No-Cache', '1');
    
    const client = await db.pool.connect();
    
    try {
        // Buscar usuário por slug
        const userRes = await client.query(
            'SELECT id, account_type FROM users WHERE profile_slug = $1 OR id = $1',
            [slug]
        );
        
        if (userRes.rows.length === 0) {
            return res.status(404).send('<h1>404 - Perfil não encontrado</h1>');
        }

        const user = userRes.rows[0];

        if (user.account_type === 'free') {
            return res.render('inactive_profile');
        }

        const userId = user.id;
        const itemIdInt = parseInt(itemId, 10);

        if (isNaN(itemIdInt)) {
            return res.status(400).send('<h1>400 - ID do formulário inválido</h1>');
        }

        // Buscar item do tipo digital_form ou guest_list (verificar se está listado ou se é acesso direto)
        // IMPORTANTE: Remover condição is_listed para permitir acesso direto via URL
        const itemRes = await client.query(
            `SELECT pi.* 
             FROM profile_items pi
             WHERE pi.id = $1 AND pi.user_id = $2 AND (pi.item_type = 'digital_form' OR pi.item_type = 'guest_list') AND pi.is_active = true`,
            [itemIdInt, userId]
        );

        if (itemRes.rows.length === 0) {
            return res.status(404).send('<h1>404 - Formulário não encontrado</h1><p>Este formulário não está disponível publicamente. Use o link compartilhável se você tiver um.</p>');
        }

        const item = itemRes.rows[0];
        const isGuestList = item.item_type === 'guest_list';

        // Buscar dados do formulário (pode ser digital_form ou guest_list)
        // IMPORTANTE: Se for guest_list, buscar dados de guest_list_items primeiro
        // Verificar se as colunas existem antes de selecionar
        const columnCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'digital_form_items' 
            AND column_name IN ('enable_whatsapp', 'enable_guest_list_submit')
        `);
        
        const hasEnableWhatsapp = columnCheck.rows.some(r => r.column_name === 'enable_whatsapp');
        const hasEnableGuestListSubmit = columnCheck.rows.some(r => r.column_name === 'enable_guest_list_submit');
        
        // Buscar dados de digital_form_items (sempre necessário para form_fields, etc)
        let formRes;
        formRes = await client.query(
            `SELECT * FROM digital_form_items 
             WHERE profile_item_id = $1 
             ORDER BY updated_at DESC NULLS LAST, id DESC 
             LIMIT 1`,
            [itemIdInt]
        );

        if (formRes.rows.length === 0) {
            return res.status(404).send('<h1>404 - Dados do formulário não encontrados</h1>');
        }

        let formData = formRes.rows[0];
        
        // IMPORTANTE: Inicializar campos de cores se não existirem no resultado (mesmo que sejam NULL ou não retornados)
        // Isso garante que os campos sempre existam no objeto, mesmo que sejam NULL
        if (!('card_color' in formData)) {
            formData.card_color = null;
        }
        if (!('decorative_bar_color' in formData)) {
            formData.decorative_bar_color = null;
        }
        if (!('separator_line_color' in formData)) {
            formData.separator_line_color = null;
        }
        
        // LOG CRÍTICO: Verificar form_fields e CORES logo após buscar do banco (incluindo card_color e decorative_bar_color)
        // IMPORTANTE: Verificar se as colunas existem no objeto retornado
        const hasCardColor = 'card_color' in formData;
        const hasDecorativeBarColor = 'decorative_bar_color' in formData;
        const hasSeparatorLineColor = 'separator_line_color' in formData;
        
        logger.info('🔍 [FORM/PUBLIC] Dados do banco (digital_form_items) - RAW:', {
            id: formData.id,
            profile_item_id: formData.profile_item_id,
            form_title: formData.form_title,
            primary_color: formData.primary_color,
            primary_color_type: typeof formData.primary_color,
            secondary_color: formData.secondary_color,
            secondary_color_type: typeof formData.secondary_color,
            background_color: formData.background_color,
            background_color_type: typeof formData.background_color,
            text_color: formData.text_color,
            text_color_type: typeof formData.text_color,
            card_color: hasCardColor ? formData.card_color : 'COLUNA_NÃO_EXISTE_NO_BANCO',
            card_color_type: hasCardColor ? typeof formData.card_color : 'N/A',
            card_color_exists: hasCardColor,
            decorative_bar_color: hasDecorativeBarColor ? formData.decorative_bar_color : 'COLUNA_NÃO_EXISTE_NO_BANCO',
            decorative_bar_color_type: hasDecorativeBarColor ? typeof formData.decorative_bar_color : 'N/A',
            decorative_bar_color_exists: hasDecorativeBarColor,
            separator_line_color: hasSeparatorLineColor ? formData.separator_line_color : 'COLUNA_NÃO_EXISTE_NO_BANCO',
            separator_line_color_type: hasSeparatorLineColor ? typeof formData.separator_line_color : 'N/A',
            separator_line_color_exists: hasSeparatorLineColor,
            theme: formData.theme,
            has_form_fields: !!formData.form_fields,
            form_fields_type: typeof formData.form_fields,
            form_fields_isArray: Array.isArray(formData.form_fields),
            form_fields_isNull: formData.form_fields === null,
            form_fields_isUndefined: formData.form_fields === undefined,
            form_fields_value: formData.form_fields === null ? 'NULL' : (formData.form_fields === undefined ? 'UNDEFINED' : (typeof formData.form_fields === 'string' ? formData.form_fields.substring(0, 500) : (Array.isArray(formData.form_fields) ? JSON.stringify(formData.form_fields.slice(0, 3)) : String(formData.form_fields)))),
            form_fields_length: Array.isArray(formData.form_fields) ? formData.form_fields.length : (typeof formData.form_fields === 'string' ? formData.form_fields.length : 'N/A'),
            // Log todas as chaves disponíveis para debug
            available_keys: Object.keys(formData).filter(k => k.includes('color') || k.includes('Color') || k.includes('theme'))
        });
        
        // Se as colunas não existem no objeto retornado, verificar se existem no banco
        if (!hasCardColor || !hasDecorativeBarColor || !hasSeparatorLineColor) {
            logger.warn('⚠️ [FORM/PUBLIC] Colunas de cores ausentes no resultado da query! Verificando se existem no banco...');
            try {
                const columnCheck = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'digital_form_items' 
                    AND column_name IN ('card_color', 'decorative_bar_color', 'separator_line_color')
                `);
                const existingColumns = columnCheck.rows.map(r => r.column_name);
                logger.info('🔍 [FORM/PUBLIC] Colunas que existem no banco:', {
                    card_color_exists: existingColumns.includes('card_color'),
                    decorative_bar_color_exists: existingColumns.includes('decorative_bar_color'),
                    separator_line_color_exists: existingColumns.includes('separator_line_color'),
                    all_existing_columns: existingColumns
                });
            } catch (err) {
                logger.error('❌ [FORM/PUBLIC] Erro ao verificar colunas:', err);
            }
        }
        
        // IMPORTANTE: Sempre verificar se existe dados em guest_list_items (mesmo que item_type não seja guest_list)
        // Isso é necessário porque o item pode estar como digital_form mas ter dados salvos em guest_list_items
        // Verificar se guest_list_items tem as colunas enable_whatsapp e enable_guest_list_submit
        const guestListColumnCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'guest_list_items' 
            AND column_name IN ('enable_whatsapp', 'enable_guest_list_submit')
        `);
        const guestListHasEnableWhatsapp = guestListColumnCheck.rows.some(r => r.column_name === 'enable_whatsapp');
        const guestListHasEnableGuestListSubmit = guestListColumnCheck.rows.some(r => r.column_name === 'enable_guest_list_submit');
        
        // Verificar se guest_list_items tem as colunas de cores decorativas
        const guestListColorColumnsCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'guest_list_items' 
            AND column_name IN ('card_color', 'decorative_bar_color', 'separator_line_color')
        `);
        const guestListHasCardColor = guestListColorColumnsCheck.rows.some(r => r.column_name === 'card_color');
        const guestListHasDecorativeBarColor = guestListColorColumnsCheck.rows.some(r => r.column_name === 'decorative_bar_color');
        const guestListHasSeparatorLineColor = guestListColorColumnsCheck.rows.some(r => r.column_name === 'separator_line_color');
        
        // Construir SELECT dinamicamente baseado nas colunas disponíveis (incluindo cores decorativas)
        let guestListSelectFields = 'primary_color, secondary_color, text_color, background_color, header_image_url, background_image_url, background_opacity, theme, updated_at, id';
        if (guestListHasEnableWhatsapp) {
            guestListSelectFields += ', enable_whatsapp';
        }
        if (guestListHasEnableGuestListSubmit) {
            guestListSelectFields += ', enable_guest_list_submit';
        }
        if (guestListHasCardColor) {
            guestListSelectFields += ', card_color';
        }
        if (guestListHasDecorativeBarColor) {
            guestListSelectFields += ', decorative_bar_color';
        }
        if (guestListHasSeparatorLineColor) {
            guestListSelectFields += ', separator_line_color';
        }
        
        const guestListRes = await client.query(
            `SELECT ${guestListSelectFields}
             FROM guest_list_items 
             WHERE profile_item_id = $1 
             ORDER BY 
                COALESCE(updated_at, '1970-01-01'::timestamp) DESC, 
                id DESC 
             LIMIT 1`,
            [itemIdInt]
        );
        
        logger.info(`🔍 [FORM/PUBLIC] Query guest_list_items executada:`, {
            itemId: itemIdInt,
            rowsFound: guestListRes.rows.length,
            hasData: guestListRes.rows.length > 0,
            hasEnableWhatsapp: guestListHasEnableWhatsapp,
            hasEnableGuestListSubmit: guestListHasEnableGuestListSubmit
        });
        
        if (guestListRes.rows.length > 0) {
            const guestListData = guestListRes.rows[0];
            logger.info(`🎨 [FORM/PUBLIC] Dados encontrados em guest_list_items:`, {
                id: guestListData.id,
                primary_color: guestListData.primary_color,
                primary_color_type: typeof guestListData.primary_color,
                secondary_color: guestListData.secondary_color,
                secondary_color_type: typeof guestListData.secondary_color,
                background_color: guestListData.background_color,
                background_color_type: typeof guestListData.background_color,
                enable_whatsapp: guestListData.enable_whatsapp,
                enable_guest_list_submit: guestListData.enable_guest_list_submit,
                updated_at: guestListData.updated_at,
                item_type: item.item_type,
                profile_item_id: itemIdInt
            });
            
            // IMPORTANTE: CORES COMPLETAMENTE SEPARADAS!
            // Se item_type é 'digital_form' (King Forms): usar APENAS cores de digital_form_items (IGNORAR guest_list_items)
            // Se item_type é 'guest_list' (Portaria): usar APENAS cores de guest_list_items (IGNORAR digital_form_items)
            // NÃO mesclar cores entre sistemas - cada um mantém suas próprias cores independentes
            if (item.item_type === 'guest_list') {
                // É Portaria: usar cores de guest_list_items
                logger.info(`🎨 [FORM/PUBLIC] Item é Portaria (guest_list): usando cores de guest_list_items`);
                if (guestListData.primary_color) formData.primary_color = guestListData.primary_color;
                if (guestListData.secondary_color) formData.secondary_color = guestListData.secondary_color;
                if (guestListData.text_color) formData.text_color = guestListData.text_color;
                if (guestListData.background_color) {
                    formData.background_color = guestListData.background_color;
                    logger.info(`🎨 [FORM/PUBLIC] background_color de Portaria (guest_list_items): ${guestListData.background_color}`);
                }
                if (guestListData.background_image_url) formData.background_image_url = guestListData.background_image_url;
                if (guestListData.background_opacity !== null && guestListData.background_opacity !== undefined) {
                    formData.background_opacity = guestListData.background_opacity;
                }
                if (guestListData.header_image_url) formData.header_image_url = guestListData.header_image_url;
                if (guestListData.theme) formData.theme = guestListData.theme;
                if (guestListHasCardColor && guestListData.card_color) formData.card_color = guestListData.card_color;
                if (guestListHasDecorativeBarColor && guestListData.decorative_bar_color) formData.decorative_bar_color = guestListData.decorative_bar_color;
                if (guestListHasSeparatorLineColor && guestListData.separator_line_color) formData.separator_line_color = guestListData.separator_line_color;
            } else {
                // É King Forms (digital_form): usar APENAS cores de digital_form_items, NÃO mesclar com guest_list_items
                logger.info(`🎨 [FORM/PUBLIC] Item é King Forms (digital_form): usando APENAS cores de digital_form_items, IGNORANDO guest_list_items.background_color: ${guestListData.background_color}`);
                // NÃO mesclar cores - usar apenas as de digital_form_items (que já estão em formData)
            }
            
            // IMPORTANTE: Garantir valores padrão para cores se não existirem em digital_form_items (apenas se for King Forms)
            // Se for Portaria, já foram mesclados acima de guest_list_items
            if (item.item_type === 'digital_form') {
                // King Forms: garantir valores padrão se não existirem em digital_form_items
                // NÃO usar guest_list_items como fallback
                if (!formData.primary_color || formData.primary_color === null || formData.primary_color === 'null') {
                    formData.primary_color = '#4A90E2';
                    logger.info(`🎨 [FORM/PUBLIC] King Forms: primary_color não encontrado em digital_form_items, usando padrão: #4A90E2`);
                }
                if (!formData.secondary_color || formData.secondary_color === null || formData.secondary_color === 'null') {
                    formData.secondary_color = formData.primary_color || '#4A90E2';
                    logger.info(`🎨 [FORM/PUBLIC] King Forms: secondary_color não encontrado em digital_form_items, usando primary_color: ${formData.secondary_color}`);
                }
                if (!formData.text_color || formData.text_color === null || formData.text_color === 'null') {
                    formData.text_color = '#333333';
                    logger.info(`🎨 [FORM/PUBLIC] King Forms: text_color não encontrado em digital_form_items, usando padrão: #333333`);
                }
                if (!formData.background_color || formData.background_color === null || formData.background_color === 'null') {
                    formData.background_color = '#FFFFFF';
                    logger.info(`🎨 [FORM/PUBLIC] King Forms: background_color não encontrado em digital_form_items, usando padrão: #FFFFFF (IGNORANDO guest_list_items.background_color: ${guestListData.background_color})`);
                }
            }
            // IMPORTANTE: decorative_bar_color, separator_line_color e card_color - usar APENAS digital_form_items (se King Forms) ou guest_list_items (se Portaria)
            // King Forms: usar apenas digital_form_items (NÃO buscar de guest_list_items)
            // Portaria: já foi mesclado acima de guest_list_items
            if (item.item_type === 'digital_form') {
                // King Forms: usar apenas digital_form_items, NÃO mesclar com guest_list_items
                if (!formData.decorative_bar_color || formData.decorative_bar_color === null || formData.decorative_bar_color === 'null' || formData.decorative_bar_color === '') {
                    formData.decorative_bar_color = formData.primary_color || '#4A90E2';
                    logger.info(`🎨 [FORM/PUBLIC] King Forms: decorative_bar_color não encontrado em digital_form_items, usando primary_color: ${formData.decorative_bar_color}`);
                }
                if (!formData.separator_line_color || formData.separator_line_color === null || formData.separator_line_color === 'null' || formData.separator_line_color === '') {
                    formData.separator_line_color = formData.primary_color || '#4A90E2';
                    logger.info(`🎨 [FORM/PUBLIC] King Forms: separator_line_color não encontrado em digital_form_items, usando primary_color: ${formData.separator_line_color}`);
                }
                if (!formData.card_color || formData.card_color === null || formData.card_color === 'null' || formData.card_color === '') {
                    formData.card_color = '#FFFFFF';
                    logger.info(`🎨 [FORM/PUBLIC] King Forms: card_color não encontrado em digital_form_items, usando padrão: #FFFFFF`);
                }
            }
            
            // IMPORTANTE: Mesclar enable_whatsapp e enable_guest_list_submit se existirem em guest_list_items
            // IMPORTANTE: Respeitar valores false - converter corretamente para booleano
            if (guestListHasEnableWhatsapp && guestListData.enable_whatsapp !== undefined && guestListData.enable_whatsapp !== null) {
                // Converter para booleano correto, respeitando false
                const enableWhatsappValue = guestListData.enable_whatsapp === true || guestListData.enable_whatsapp === 'true' || guestListData.enable_whatsapp === 1 || guestListData.enable_whatsapp === '1';
                formData.enable_whatsapp = enableWhatsappValue;
                logger.info(`🔘 [FORM/PUBLIC] enable_whatsapp atualizado de guest_list_items: ${guestListData.enable_whatsapp} -> ${enableWhatsappValue} (tipo original: ${typeof guestListData.enable_whatsapp})`);
            } else if (guestListHasEnableWhatsapp) {
                logger.info(`ℹ️ [FORM/PUBLIC] enable_whatsapp é null/undefined em guest_list_items, mantendo valor de digital_form_items: ${formData.enable_whatsapp}`);
            }
            if (guestListHasEnableGuestListSubmit && guestListData.enable_guest_list_submit !== undefined && guestListData.enable_guest_list_submit !== null) {
                // Converter para booleano correto, respeitando false
                const enableGuestListSubmitValue = guestListData.enable_guest_list_submit === true || guestListData.enable_guest_list_submit === 'true' || guestListData.enable_guest_list_submit === 1 || guestListData.enable_guest_list_submit === '1';
                formData.enable_guest_list_submit = enableGuestListSubmitValue;
                logger.info(`🔘 [FORM/PUBLIC] enable_guest_list_submit atualizado de guest_list_items: ${guestListData.enable_guest_list_submit} -> ${enableGuestListSubmitValue} (tipo original: ${typeof guestListData.enable_guest_list_submit})`);
            } else if (guestListHasEnableGuestListSubmit) {
                logger.info(`ℹ️ [FORM/PUBLIC] enable_guest_list_submit é null/undefined em guest_list_items, mantendo valor de digital_form_items: ${formData.enable_guest_list_submit}`);
            }
            
            logger.info(`🎨 [FORM/PUBLIC] Dados finais (cores de digital_form_items apenas, enable_whatsapp/enable_guest_list_submit de guest_list_items):`, {
                primary_color: formData.primary_color,
                secondary_color: formData.secondary_color,
                text_color: formData.text_color,
                card_color: formData.card_color,
                decorative_bar_color: formData.decorative_bar_color,
                separator_line_color: formData.separator_line_color,
                enable_whatsapp: formData.enable_whatsapp,
                enable_whatsapp_type: typeof formData.enable_whatsapp,
                enable_guest_list_submit: formData.enable_guest_list_submit,
                enable_guest_list_submit_type: typeof formData.enable_guest_list_submit
            });
        } else {
            logger.warn(`⚠️ [FORM/PUBLIC] Nenhum dado encontrado em guest_list_items para item ${itemIdInt} - usando dados de digital_form_items`);
            // IMPORTANTE: Garantir que enable_guest_list_submit e enable_whatsapp sejam booleanos mesmo sem guest_list_items
            if (formData.enable_guest_list_submit !== undefined && formData.enable_guest_list_submit !== null) {
                formData.enable_guest_list_submit = formData.enable_guest_list_submit === true || formData.enable_guest_list_submit === 'true' || formData.enable_guest_list_submit === 1 || formData.enable_guest_list_submit === '1';
            } else {
                formData.enable_guest_list_submit = false;
            }
            if (formData.enable_whatsapp !== undefined && formData.enable_whatsapp !== null) {
                formData.enable_whatsapp = formData.enable_whatsapp === true || formData.enable_whatsapp === 'true' || formData.enable_whatsapp === 1 || formData.enable_whatsapp === '1';
            } else {
                formData.enable_whatsapp = true; // Default
            }
            // IMPORTANTE: Garantir valores padrão para card_color e decorative_bar_color quando não há guest_list_items
            if (!formData.card_color || formData.card_color === null || formData.card_color === 'null' || formData.card_color === '') {
                formData.card_color = '#FFFFFF';
            }
            if (!formData.decorative_bar_color || formData.decorative_bar_color === null || formData.decorative_bar_color === 'null' || formData.decorative_bar_color === '') {
                formData.decorative_bar_color = formData.primary_color || '#4A90E2';
            }
            if (!formData.separator_line_color || formData.separator_line_color === null || formData.separator_line_color === 'null' || formData.separator_line_color === '') {
                formData.separator_line_color = formData.primary_color || '#4A90E2';
            }
            
            logger.info(`ℹ️ [FORM/PUBLIC] Cores e configurações que serão usadas (de digital_form_items):`, {
                primary_color: formData.primary_color,
                secondary_color: formData.secondary_color,
                card_color: formData.card_color,
                decorative_bar_color: formData.decorative_bar_color,
                separator_line_color: formData.separator_line_color,
                enable_whatsapp: formData.enable_whatsapp,
                enable_guest_list_submit: formData.enable_guest_list_submit
            });
        }
        
        // IMPORTANTE: Forçar enable_whatsapp a false se enable_guest_list_submit for true (após mesclar tudo)
        // IMPORTANTE: Garantir que sejam sempre booleanos
        if (formData.enable_guest_list_submit === true || formData.enable_guest_list_submit === 'true' || formData.enable_guest_list_submit === 1 || formData.enable_guest_list_submit === '1') {
            formData.enable_guest_list_submit = true;
            formData.enable_whatsapp = false;
            logger.info(`🔘 [FORM/PUBLIC] enable_whatsapp forçado a false porque enable_guest_list_submit é true.`);
        } else {
            // Garantir que seja false se não for true
            formData.enable_guest_list_submit = false;
        }
        
        // Garantir que enable_whatsapp seja booleano
        if (formData.enable_whatsapp !== true && formData.enable_whatsapp !== false) {
            formData.enable_whatsapp = formData.enable_whatsapp === 'true' || formData.enable_whatsapp === 1 || formData.enable_whatsapp === '1';
        }
        
        // LOG DETALHADO PARA DEBUG (ANTES DA MESCLAGEM)
        logger.info('🔍 [FORM/PUBLIC] Dados carregados do banco (ANTES mesclagem):', {
            itemId: itemIdInt,
            profile_item_id: formData.profile_item_id,
            form_title: formData.form_title,
            primary_color: formData.primary_color,
            secondary_color: formData.secondary_color,
            enable_whatsapp_raw: formData.enable_whatsapp,
            enable_whatsapp_type: typeof formData.enable_whatsapp,
            enable_guest_list_submit_raw: formData.enable_guest_list_submit,
            enable_guest_list_submit_type: typeof formData.enable_guest_list_submit,
            updated_at: formData.updated_at,
            id: formData.id,
            hasEnableWhatsapp: hasEnableWhatsapp,
            hasEnableGuestListSubmit: hasEnableGuestListSubmit
        });
        
        // IMPORTANTE: CORES COMPLETAMENTE SEPARADAS - NÃO usar valores de guest_list_items para cores!
        // Aplicar fallback APENAS se não existir em digital_form_items
        if (!formData.secondary_color || 
            formData.secondary_color === 'null' || 
            formData.secondary_color === 'undefined' ||
            formData.secondary_color === null ||
            formData.secondary_color === undefined ||
            (typeof formData.secondary_color === 'string' && formData.secondary_color.trim() === '')) {
            formData.secondary_color = formData.primary_color || '#4A90E2';
            logger.info(`🎨 [FORM/PUBLIC] secondary_color não encontrado em digital_form_items, usando primary_color como fallback: ${formData.secondary_color}`);
        } else {
            logger.info(`🎨 [FORM/PUBLIC] secondary_color usando valor de digital_form_items: ${formData.secondary_color}`);
        }
        
        // Garantir que form_fields seja um array (pode vir como string JSON do PostgreSQL)
        logger.info('🔍 [FORM/PUBLIC] Verificando form_fields ANTES do processamento:', {
            exists: !!formData.form_fields,
            type: typeof formData.form_fields,
            isArray: Array.isArray(formData.form_fields),
            rawValue: typeof formData.form_fields === 'string' ? formData.form_fields.substring(0, 500) : formData.form_fields,
            length: Array.isArray(formData.form_fields) ? formData.form_fields.length : 'N/A'
        });
        
        if (formData.form_fields) {
            if (typeof formData.form_fields === 'string') {
                try {
                    const parsed = JSON.parse(formData.form_fields);
                    formData.form_fields = parsed;
                    logger.info('✅ [FORM/PUBLIC] form_fields parseado com sucesso:', {
                        length: Array.isArray(parsed) ? parsed.length : 'N/A',
                        isArray: Array.isArray(parsed)
                    });
                } catch (e) {
                    logger.error('❌ [FORM/PUBLIC] Erro ao parsear form_fields:', e);
                    formData.form_fields = [];
                }
            }
            // Garantir que seja um array
            if (!Array.isArray(formData.form_fields)) {
                logger.warn('⚠️ [FORM/PUBLIC] form_fields não é um array após processamento, convertendo para array vazio');
                formData.form_fields = [];
            }
        } else {
            logger.warn('⚠️ [FORM/PUBLIC] form_fields está undefined/null, inicializando como array vazio');
            formData.form_fields = [];
        }
        
        logger.info('📋 [FORM/PUBLIC] form_fields APÓS processamento:', {
            length: formData.form_fields.length,
            isArray: Array.isArray(formData.form_fields),
            firstFields: formData.form_fields.length > 0 ? formData.form_fields.slice(0, 3).map(f => ({ id: f?.id, label: f?.label, type: f?.type })) : []
        });

        // Buscar profile_slug
        const profileSlugRes = await client.query('SELECT profile_slug FROM users WHERE id = $1', [userId]);
        const profileSlug = profileSlugRes.rows[0]?.profile_slug || slug;

        // IMPORTANTE: Garantir que card_color e decorative_bar_color existam mesmo se não vieram do banco
        if (!formData.card_color || formData.card_color === null || formData.card_color === 'null' || formData.card_color === '') {
            formData.card_color = '#FFFFFF';
        }
        if (!formData.decorative_bar_color || formData.decorative_bar_color === null || formData.decorative_bar_color === 'null' || formData.decorative_bar_color === '') {
            formData.decorative_bar_color = formData.primary_color || '#4A90E2';
        }
        if (!formData.separator_line_color || formData.separator_line_color === null || formData.separator_line_color === 'null' || formData.separator_line_color === '') {
            formData.separator_line_color = formData.primary_color || '#4A90E2';
        }
        
        // LOG FINAL ANTES DE RENDERIZAR - MUITO DETALHADO (incluindo card_color e decorative_bar_color)
        logger.info('🎨 [FORM/PUBLIC] Renderizando página com dados:', {
            itemId: itemIdInt,
            form_title: formData.form_title,
            form_description: formData.form_description,
            form_logo_url: formData.form_logo_url,
            button_logo_url: formData.button_logo_url,
            button_logo_size: formData.button_logo_size,
            show_logo_corner: formData.show_logo_corner,
            primary_color: formData.primary_color,
            primary_color_type: typeof formData.primary_color,
            secondary_color: formData.secondary_color,
            secondary_color_type: typeof formData.secondary_color,
            text_color: formData.text_color,
            card_color: formData.card_color,
            card_color_type: typeof formData.card_color,
            decorative_bar_color: formData.decorative_bar_color,
            decorative_bar_color_type: typeof formData.decorative_bar_color,
            separator_line_color: formData.separator_line_color,
            separator_line_color_type: typeof formData.separator_line_color,
            theme: formData.theme,
            enable_whatsapp: formData.enable_whatsapp,
            enable_guest_list_submit: formData.enable_guest_list_submit,
            form_fields_count: Array.isArray(formData.form_fields) ? formData.form_fields.length : 0,
            form_fields_type: typeof formData.form_fields,
            form_fields_preview: Array.isArray(formData.form_fields) ? formData.form_fields.slice(0, 3).map(f => ({ id: f.id, label: f.label, type: f.type })) : 'N/A',
            updated_at: formData.updated_at,
            id: formData.id,
            timestamp: Date.now()
        });
        
        // VALIDAÇÃO CRÍTICA: Verificar se as cores estão corretas antes de renderizar
        if (!formData.primary_color || formData.primary_color === '#4A90E2') {
            logger.warn('⚠️ [FORM/PUBLIC] ATENÇÃO: primary_color pode estar com valor padrão!', {
                primary_color: formData.primary_color,
                itemId: itemIdInt
            });
        }
        
        // Adicionar headers com timestamp do formulário atualizado
        if (formData.updated_at) {
            res.set('X-Form-Updated-At', new Date(formData.updated_at).getTime().toString());
        }
        res.set('X-Cache-Timestamp', Date.now().toString());
        
        if (!formData.secondary_color || formData.secondary_color === '#6BA3F0' || formData.secondary_color === '#4A90E2') {
            logger.warn('⚠️ [FORM/PUBLIC] ATENÇÃO: secondary_color pode estar com valor padrão!', {
                secondary_color: formData.secondary_color,
                primary_color: formData.primary_color,
                itemId: itemIdInt
            });
        }

        // HEADERS ANTI-CACHE AGRESSIVOS
        const cacheTimestamp = Date.now();
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate, private, max-age=0, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Last-Modified': new Date(cacheTimestamp).toUTCString(),
            'ETag': `"${cacheTimestamp}-${itemIdInt}"`,
            'X-Timestamp': cacheTimestamp.toString(),
            'X-Form-Updated-At': formData.updated_at ? new Date(formData.updated_at).getTime().toString() : 'unknown',
            'X-Cache-Timestamp': cacheTimestamp.toString()
        });

        // Registrar evento 'view' de analytics (será feito via JavaScript no frontend)
        
        // Sanitizar dados antes de renderizar (prevenir XSS)
        const sanitizedFormData = sanitizeFormDataForRender(formData);
        
        // CRÍTICO: Garantir que form_fields está presente após sanitização
        if (!sanitizedFormData.form_fields || !Array.isArray(sanitizedFormData.form_fields)) {
            logger.error('❌ [FORM/PUBLIC] ATENÇÃO: form_fields foi perdido durante sanitização!', {
                hasFormFields: !!sanitizedFormData.form_fields,
                isArray: Array.isArray(sanitizedFormData.form_fields),
                originalLength: formData.form_fields ? formData.form_fields.length : 0
            });
            // Restaurar form_fields original se foi perdido
            sanitizedFormData.form_fields = formData.form_fields || [];
        }
        
        // CRÍTICO: Garantir que as cores estejam sempre presentes no objeto final (mesmo que sejam null/undefined)
        // Isso garante que o template EJS sempre tenha acesso a esses campos
        if (!('card_color' in sanitizedFormData)) {
            sanitizedFormData.card_color = formData.card_color || '#FFFFFF';
            logger.info('🔧 [FORM/PUBLIC] card_color adicionado ao objeto final:', sanitizedFormData.card_color);
        }
        if (!('decorative_bar_color' in sanitizedFormData)) {
            sanitizedFormData.decorative_bar_color = formData.decorative_bar_color || formData.primary_color || '#4A90E2';
            logger.info('🔧 [FORM/PUBLIC] decorative_bar_color adicionado ao objeto final:', sanitizedFormData.decorative_bar_color);
        }
        if (!('separator_line_color' in sanitizedFormData)) {
            sanitizedFormData.separator_line_color = formData.separator_line_color || formData.primary_color || '#4A90E2';
            logger.info('🔧 [FORM/PUBLIC] separator_line_color adicionado ao objeto final:', sanitizedFormData.separator_line_color);
        }
        
        // Garantir valores padrão se forem null/undefined/vazios
        if (!sanitizedFormData.card_color || sanitizedFormData.card_color === 'null' || sanitizedFormData.card_color === '') {
            sanitizedFormData.card_color = '#FFFFFF';
        }
        if (!sanitizedFormData.decorative_bar_color || sanitizedFormData.decorative_bar_color === 'null' || sanitizedFormData.decorative_bar_color === '') {
            sanitizedFormData.decorative_bar_color = sanitizedFormData.primary_color || '#4A90E2';
        }
        if (!sanitizedFormData.separator_line_color || sanitizedFormData.separator_line_color === 'null' || sanitizedFormData.separator_line_color === '') {
            sanitizedFormData.separator_line_color = sanitizedFormData.primary_color || '#4A90E2';
        }
        
        logger.info('🎨 [FORM/PUBLIC] Cores FINAIS no objeto sanitizado que será enviado para o template:', {
            card_color: sanitizedFormData.card_color,
            decorative_bar_color: sanitizedFormData.decorative_bar_color,
            separator_line_color: sanitizedFormData.separator_line_color,
            primary_color: sanitizedFormData.primary_color,
            secondary_color: sanitizedFormData.secondary_color
        });
        
        logger.info('🎯 [FORM/PUBLIC] Dados FINAIS antes de renderizar:', {
            form_fields_count: sanitizedFormData.form_fields ? sanitizedFormData.form_fields.length : 0,
            form_fields_isArray: Array.isArray(sanitizedFormData.form_fields),
            form_title: sanitizedFormData.form_title
        });
        
        const baseUrl = `${req.protocol}://${req.get('host') || 'tag.conectaking.com.br'}`;
        const pathNoQuery = (req.originalUrl || req.path || '').split('?')[0] || `/${slug}/form/${itemIdInt}`;
        const _canonicalFormUrl = baseUrl + pathNoQuery;
        let _ogImageUrl = sanitizedFormData.header_image_url || null;
        if (_ogImageUrl && !/^https?:\/\//i.test(_ogImageUrl)) _ogImageUrl = _ogImageUrl.startsWith('/') ? baseUrl + _ogImageUrl : null;
        
        res.render('digitalForm', {
            item: item,
            formData: sanitizedFormData,
            profileSlug: profileSlug,
            slug: slug,
            itemId: itemIdInt,
            _timestamp: Date.now(),
            _cacheBust: `?t=${Date.now()}`,
            _updatedAt: sanitizedFormData.updated_at ? new Date(sanitizedFormData.updated_at).getTime() : Date.now(),
            _canonicalFormUrl,
            _ogImageUrl: _ogImageUrl || undefined,
            _debug: {
                primary_color: sanitizedFormData.primary_color,
                secondary_color: sanitizedFormData.secondary_color,
                updated_at: sanitizedFormData.updated_at,
                form_title: sanitizedFormData.form_title,
                form_logo_url: sanitizedFormData.form_logo_url,
                button_logo_url: sanitizedFormData.button_logo_url,
                button_logo_size: sanitizedFormData.button_logo_size
            }
        });

    } catch (error) {
        logger.error('Erro ao carregar formulário digital:', {
            error: error.message,
            stack: error.stack,
            slug: req.params.slug,
            itemId: req.params.itemId
        });
        return res.status(500).render('formError', {
            errorMessage: 'Erro ao carregar formulário. Por favor, tente novamente mais tarde.',
            formTitle: 'Erro',
            formUrl: `/${req.params.slug || ''}`,
            primaryColor: '#4A90E2',
            secondaryColor: '#6BA3F0'
        });
    } finally {
        client.release();
    }
}));

// POST /:slug/form/:itemId/submit - Salvar resposta do formulário (público)
router.post('/:slug/form/:itemId/submit', 
    formSubmissionLimiter,
    validateFormSubmission,
    handleValidationErrors,
    asyncHandler(async (req, res) => {
    const { slug, itemId } = req.params;
    let { response_data, responder_name, responder_email, responder_phone } = req.body;
    
    // Variáveis para armazenar dados do convidado (se for lista de convidados)
    let response_guest_id = null;
    let response_qr_token = null;
    
    // Sanitizar todos os inputs
    response_data = sanitizeResponseData(response_data);
    
    // IMPORTANTE: Tratar strings vazias como null para campos opcionais
    responder_name = (responder_name && typeof responder_name === 'string' && responder_name.trim()) 
        ? sanitizeResponseData({ name: responder_name.trim() }).name 
        : null;
    responder_email = (responder_email && typeof responder_email === 'string' && responder_email.trim()) 
        ? sanitizeResponseData({ email: responder_email.trim() }).email 
        : null;
    responder_phone = (responder_phone && typeof responder_phone === 'string' && responder_phone.trim()) 
        ? sanitizeResponseData({ phone: responder_phone.trim() }).phone 
        : null;
    
    const client = await db.pool.connect();
    
    try {
        const itemIdInt = parseInt(itemId, 10);
        
        // PRIORIDADE 1: Se slug for 'form' e itemId for um número, pode ser acesso via share_token
        // Nesse caso, buscar o userId pelo itemId
        // PRIORIDADE 2: Se itemId for válido, tentar buscar userId pelo itemId primeiro (mais confiável)
        // PRIORIDADE 3: Se não encontrar pelo itemId, tentar buscar pelo slug
        let userId;
        
        if (slug === 'form' && !isNaN(itemIdInt)) {
            // Buscar userId pelo itemId
            const itemRes = await client.query(
                'SELECT user_id FROM profile_items WHERE id = $1',
                [itemIdInt]
            );
            if (itemRes.rows.length === 0) {
                return res.status(404).json({ message: 'Formulário não encontrado' });
            }
            userId = itemRes.rows[0].user_id;
        } else if (!isNaN(itemIdInt)) {
            // Tentar buscar userId pelo itemId primeiro (mais confiável que slug)
            const itemRes = await client.query(
                'SELECT user_id FROM profile_items WHERE id = $1 AND (item_type = \'digital_form\' OR item_type = \'guest_list\') AND is_active = true',
                [itemIdInt]
            );
            
            if (itemRes.rows.length > 0) {
                userId = itemRes.rows[0].user_id;
                logger.info(`✅ [SUBMIT] userId encontrado via itemId: ${userId} para itemId: ${itemIdInt}`);
            } else {
                // Se não encontrou pelo itemId, tentar buscar pelo slug
                logger.info(`⚠️ [SUBMIT] Item não encontrado pelo itemId, tentando buscar pelo slug: "${slug}"`);
                const userRes = await client.query(
                    'SELECT id FROM users WHERE profile_slug = $1 OR id = $1',
                    [slug]
                );
                
                if (userRes.rows.length === 0) {
                    return res.status(404).json({ message: 'Perfil não encontrado' });
                }
                userId = userRes.rows[0].id;
            }
        } else {
            // Buscar usuário por slug (fallback)
            const userRes = await client.query(
                'SELECT id FROM users WHERE profile_slug = $1 OR id = $1',
                [slug]
            );
            
            if (userRes.rows.length === 0) {
                return res.status(404).json({ message: 'Perfil não encontrado' });
            }
            userId = userRes.rows[0].id;
        }

        if (isNaN(itemIdInt)) {
            return res.status(400).json({ message: 'ID do formulário inválido' });
        }

        // IMPORTANTE: Validar response_data mas permitir objeto vazio (alguns formulários podem não ter campos)
        if (!response_data || typeof response_data !== 'object') {
            logger.warn('⚠️ [SUBMIT] response_data inválido ou ausente', {
                response_data,
                type: typeof response_data,
                itemId: itemIdInt
            });
            return res.status(400).json({ 
                success: false,
                message: 'Dados de resposta são obrigatórios. Recarregue a página e tente novamente.' 
            });
        }
        
        // Validar se response_data tem pelo menos uma chave (mesmo que vazia)
        if (Object.keys(response_data).length === 0) {
            logger.warn('⚠️ [SUBMIT] response_data está vazio', {
                itemId: itemIdInt,
                responder_name,
                responder_email,
                responder_phone
            });
            // Mesmo vazio, permitir salvar se houver responder_name, responder_email ou responder_phone
            if (!responder_name && !responder_email && !responder_phone) {
                return res.status(400).json({ 
                    success: false,
                    message: 'Nenhum dado foi enviado. Preencha pelo menos um campo do formulário.' 
                });
            }
            // Se tiver pelo menos um dado de contato, criar response_data mínimo
            response_data = {
                _metadata: {
                    submitted_via: 'form',
                    has_contact_info: true
                }
            };
        }

        // Verificar se o formulário existe e está ativo (pode ser digital_form ou guest_list)
        const itemRes = await client.query(
            `SELECT pi.id, pi.item_type
             FROM profile_items pi
             WHERE pi.id = $1 AND pi.user_id = $2 AND pi.is_active = true
             AND (pi.item_type = 'digital_form' OR pi.item_type = 'guest_list')`,
            [itemIdInt, userId]
        );

        if (itemRes.rows.length === 0) {
            return res.status(404).json({ message: 'Formulário não encontrado ou não está ativo' });
        }

        const item = itemRes.rows[0];
        const isGuestList = item.item_type === 'guest_list';
        
        // Buscar configurações do formulário (enable_whatsapp, enable_guest_list_submit, checkout_enabled)
        const formConfigRes = await client.query(
            `SELECT enable_whatsapp, enable_guest_list_submit, 
                    COALESCE(checkout_enabled, false) AS checkout_enabled
             FROM digital_form_items 
             WHERE profile_item_id = $1`,
            [itemIdInt]
        );
        
        let enableWhatsapp = true; // Default
        let enableGuestListSubmit = false; // Default
        let checkoutEnabled = false;
        
        // NOVO: Determinar modo de envio baseado nas opções
        // Se enable_guest_list_submit = true → Só Sistema (salva no sistema, sem WhatsApp)
        // Se enable_whatsapp = true e enable_guest_list_submit = false → Ambos (salva no sistema + WhatsApp)
        // Se enable_whatsapp = true e enable_guest_list_submit = false mas não salvar resposta → Só WhatsApp (apenas WhatsApp, não salva)
        // Por padrão, se enable_whatsapp = true, é "Ambos" (para manter compatibilidade)
        
        let sendMode = 'both'; // 'whatsapp-only', 'system-only', 'both'
        let shouldSaveToSystem = true; // Se deve salvar resposta no sistema
        
        if (formConfigRes.rows.length > 0) {
            enableGuestListSubmit = formConfigRes.rows[0].enable_guest_list_submit === true || formConfigRes.rows[0].enable_guest_list_submit === 'true' || formConfigRes.rows[0].enable_guest_list_submit === 1 || formConfigRes.rows[0].enable_guest_list_submit === '1';
            enableWhatsapp = formConfigRes.rows[0].enable_whatsapp !== false && formConfigRes.rows[0].enable_whatsapp !== 'false' && formConfigRes.rows[0].enable_whatsapp !== 0 && formConfigRes.rows[0].enable_whatsapp !== '0';
            checkoutEnabled = !!formConfigRes.rows[0].checkout_enabled;
            
            // Determinar modo baseado nas configurações
            if (enableGuestListSubmit && !enableWhatsapp) {
                // Só Sistema (salva no sistema, sem WhatsApp)
                sendMode = 'system-only';
                shouldSaveToSystem = true;
            } else if (enableWhatsapp && !enableGuestListSubmit) {
                // Ambos: WhatsApp + Sistema (salva no sistema E envia WhatsApp)
                sendMode = 'both';
                shouldSaveToSystem = true;
            } else if (enableGuestListSubmit && enableWhatsapp) {
                // Ambos: Sistema + Lista + WhatsApp (salva no sistema, na lista E envia WhatsApp)
                sendMode = 'both';
                shouldSaveToSystem = true;
            } else if (!enableWhatsapp && !enableGuestListSubmit) {
                // Se ambos estão false, não deveria acontecer, mas vamos tratar como "Só Sistema"
                sendMode = 'system-only';
                shouldSaveToSystem = true;
            }
        }
        
        logger.info('🔍 [SUBMIT] Configurações do formulário:', {
            enableWhatsapp,
            enableGuestListSubmit,
            sendMode,
            shouldSaveToSystem,
            isGuestList,
            itemId: itemIdInt
        });
        
        // Se for guest_list, verificar se enable_guest_list_submit está ativo
        let shouldSaveToGuestList = false;
        if (isGuestList) {
            shouldSaveToGuestList = enableGuestListSubmit;
        }
        
        // IMPORTANTE: Se enable_guest_list_submit estiver ativo (mesmo que não seja guest_list),
        // também salvar na lista de convidados se existir uma associada
        if (enableGuestListSubmit && !isGuestList) {
            // Verificar se existe uma guest_list associada a este profile_item
            const guestListCheck = await client.query(
                'SELECT id FROM guest_list_items WHERE profile_item_id = $1',
                [itemIdInt]
            );
            if (guestListCheck.rows.length > 0) {
                shouldSaveToGuestList = true;
            }
        }
        
        // Se deve salvar na lista de convidados, fazer isso primeiro
        if (shouldSaveToGuestList) {
            try {
                // Buscar guest_list_item_id
                const guestListRes = await client.query(
                    'SELECT id FROM guest_list_items WHERE profile_item_id = $1',
                    [itemIdInt]
                );
                
                if (guestListRes.rows.length > 0) {
                    const guestListItemId = guestListRes.rows[0].id;
                    
                    const looksLikeEmail = (s) => typeof s === 'string' && s.includes('@') && s.includes('.');
                    const notEmail = (s) => typeof s === 'string' && s.trim() && !s.includes('@');
                    const emailCandidates = [responder_email, response_data.email, response_data['Email']].filter(Boolean);
                    const phoneCandidates = [responder_phone, response_data.whatsapp, response_data.phone, response_data.telefone, response_data['Telefone/WhatsApp']].filter(Boolean);
                    const pickEmail = () => { for (const c of emailCandidates) { if (looksLikeEmail(c)) return c.trim(); } return null; };
                    const pickPhone = () => { for (const c of phoneCandidates) { if (notEmail(c)) return c.trim(); } return ''; };
                    let doc = response_data.document || response_data.cpf || response_data.cnpj || response_data['CPF'] || response_data['CNPJ'] || null;
                    if (doc && typeof doc === 'string') doc = doc.replace(/[.\-\s]/g, '').trim();
                    const guestData = {
                        name: responder_name || response_data.name || response_data.nome || response_data['Nome completo'] || response_data.nome_completo || 'Visitante',
                        whatsapp: pickPhone(),
                        email: pickEmail(),
                        phone: (() => { const p = response_data.phone || response_data.telefone || response_data['Telefone']; return (p && notEmail(p)) ? String(p).trim() : null; })(),
                        document: doc,
                        address: response_data.address || response_data.endereco || response_data['Endereço'] || response_data['Endereço completo'] || null,
                        neighborhood: response_data.neighborhood || response_data.bairro || response_data['Bairro'] || null,
                        city: response_data.city || response_data.cidade || response_data['Cidade'] || null,
                        state: response_data.state || response_data.estado || response_data['Estado'] || null,
                        zipcode: response_data.zipcode || response_data.cep || response_data['CEP'] || null,
                        instagram: response_data.instagram || response_data['Instagram'] || null,
                        custom_responses: response_data
                    };
                    
                    // Validar nome (obrigatório)
                    if (!guestData.name || !guestData.name.trim()) {
                        guestData.name = 'Visitante';
                    }
                    
                    if (!guestData.whatsapp || !guestData.whatsapp.trim()) {
                        guestData.whatsapp = (guestData.phone && !String(guestData.phone).includes('@')) ? guestData.phone : '';
                    }
                    
                    logger.info('💾 [SUBMIT] Salvando convidado na lista:', {
                        guestListItemId,
                        name: guestData.name,
                        whatsapp: guestData.whatsapp,
                        email: guestData.email,
                        responseDataKeys: Object.keys(response_data)
                    });
                    
                    // Gerar token único para QR Code
                    const qrToken = crypto.randomBytes(32).toString('hex');
                    
                    // Inserir na lista de convidados com QR token
                    const guestInsertResult = await client.query(`
                        INSERT INTO guests (
                            guest_list_id, name, email, phone, whatsapp, document, 
                            address, neighborhood, city, state, zipcode, instagram,
                            status, registration_source, custom_responses, qr_token, qr_code_generated_at
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'registered', 'form', $13::jsonb, $14, NOW())
                        RETURNING id, qr_token
                    `, [
                        guestListItemId,
                        guestData.name.trim(),
                        guestData.email ? guestData.email.trim() : null,
                        guestData.phone ? guestData.phone.trim() : null,
                        guestData.whatsapp ? guestData.whatsapp.trim() : null,
                        guestData.document ? guestData.document.trim() : null,
                        guestData.address ? guestData.address.trim() : null,
                        guestData.neighborhood ? guestData.neighborhood.trim() : null,
                        guestData.city ? guestData.city.trim() : null,
                        guestData.state ? guestData.state.trim() : null,
                        guestData.zipcode ? guestData.zipcode.trim() : null,
                        guestData.instagram ? guestData.instagram.trim() : null,
                        JSON.stringify(guestData.custom_responses),
                        qrToken
                    ]);
                    
                    const savedGuestId = guestInsertResult.rows[0]?.id;
                    const savedQrToken = guestInsertResult.rows[0]?.qr_token;
                    
                    logger.info('✅ [SUBMIT] Convidado salvo na lista via formulário', { 
                        itemId: itemIdInt, 
                        guestListItemId,
                        guestId: savedGuestId,
                        qrToken: savedQrToken ? savedQrToken.substring(0, 10) + '...' : 'null'
                    });
                    
                    // Armazenar guestId e qrToken para passar para a página de sucesso
                    response_guest_id = savedGuestId;
                    response_qr_token = savedQrToken;
                } else {
                    logger.warn('⚠️ [SUBMIT] guest_list_items não encontrado para profile_item_id:', itemIdInt);
                }
            } catch (guestListError) {
                logger.error('❌ [SUBMIT] Erro ao salvar na lista de convidados:', {
                    error: guestListError.message,
                    stack: guestListError.stack,
                    itemId: itemIdInt,
                    responseData: response_data
                });
                // IMPORTANTE: Continuar mesmo se falhar, para salvar a resposta normal
                // Não bloquear o envio se houver erro ao salvar na lista
            }
        } else {
            logger.info('ℹ️ [SUBMIT] Não deve salvar na lista de convidados:', {
                shouldSaveToGuestList,
                isGuestList,
                enableGuestListSubmit
            });
        }

        // Inserir resposta (salvar apenas se shouldSaveToSystem for true)
        // IMPORTANTE: Se sendMode for 'whatsapp-only', não salvar no sistema
        let result = null;
        if (shouldSaveToSystem && sendMode !== 'whatsapp-only') {
            const paymentStatus = checkoutEnabled ? 'PENDING_PAYMENT' : null;
            if (response_guest_id) {
                result = await client.query(`
                    INSERT INTO digital_form_responses (
                        profile_item_id, response_data, responder_name, responder_email, responder_phone, guest_id, payment_status
                    ) VALUES ($1, $2::jsonb, $3, $4, $5, $6, $7::payment_status_enum)
                    RETURNING id, submitted_at, guest_id
                `, [
                    itemIdInt,
                    JSON.stringify(response_data),
                    responder_name || null,
                    responder_email || null,
                    responder_phone || null,
                    response_guest_id,
                    paymentStatus
                ]);
                logger.info('✅ [SUBMIT] Resposta salva no sistema com guest_id' + (checkoutEnabled ? ' (checkout pendente)' : ''), response_guest_id);
            } else {
                result = await client.query(`
                    INSERT INTO digital_form_responses (
                        profile_item_id, response_data, responder_name, responder_email, responder_phone, payment_status
                    ) VALUES ($1, $2::jsonb, $3, $4, $5, $6::payment_status_enum)
                    RETURNING id, submitted_at
                `, [
                    itemIdInt,
                    JSON.stringify(response_data),
                    responder_name || null,
                    responder_email || null,
                    responder_phone || null,
                    paymentStatus
                ]);
                logger.info('✅ [SUBMIT] Resposta salva no sistema (digital_form_responses)' + (checkoutEnabled ? ' (checkout pendente)' : ''));
            }
        } else {
            logger.info('ℹ️ [SUBMIT] Resposta NÃO salva no sistema (modo: whatsapp-only)');
            // Criar resultado mockado para compatibilidade
            result = {
                rows: [{
                    id: null,
                    submitted_at: new Date()
                }]
            };
        }
        
        // IMPORTANTE: Incrementar contador de usos do link de cadastro APÓS cadastro bem-sucedido
        // Estratégia: Buscar todos os cadastro_links desse item e verificar qual foi usado
        // Isso funciona porque apenas um link de cadastro pode estar ativo por vez
        try {
            // Buscar todos os cadastro_links para este item
            const guestListItemCheck = await client.query(`
                SELECT gli.id 
                FROM guest_list_items gli
                INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
                WHERE pi.id = $1 AND pi.user_id = $2
            `, [itemIdInt, userId]);
            
            if (guestListItemCheck.rows.length > 0) {
                const guestListItemId = guestListItemCheck.rows[0].id;
                
                // Tentar encontrar o link usado através do referer ou URL
                const referer = req.headers.referer || '';
                const currentUrl = req.url || req.originalUrl || '';
                let cadastroToken = null;
                
                // Extrair token do referer (form/share, /form/slug ou kingforms)
                if (referer.includes('/form/share/')) {
                    const tokenMatch = referer.match(/\/form\/share\/([^\/\?]+)/);
                    if (tokenMatch && tokenMatch[1] && !tokenMatch[1].startsWith('unique_')) cadastroToken = tokenMatch[1];
                }
                if (!cadastroToken && (referer.includes('/form/') || referer.includes('/kingforms/'))) {
                    const tokenMatch = referer.match(/\/(?:form|kingforms)\/([^\/\?]+)/);
                    if (tokenMatch && tokenMatch[1] && !tokenMatch[1].startsWith('unique_') && tokenMatch[1] !== 'share') cadastroToken = tokenMatch[1];
                }
                if (!cadastroToken && currentUrl.includes('/form/share/')) {
                    const urlMatch = currentUrl.match(/\/form\/share\/([^\/\?]+)/);
                    if (urlMatch && urlMatch[1] && !urlMatch[1].startsWith('unique_')) cadastroToken = urlMatch[1];
                }
                if (!cadastroToken && (currentUrl.includes('/form/') || currentUrl.includes('/kingforms/'))) {
                    const urlMatch = currentUrl.match(/\/(?:form|kingforms)\/([^\/\?]+)/);
                    if (urlMatch && urlMatch[1] && !urlMatch[1].startsWith('unique_') && urlMatch[1] !== 'share') cadastroToken = urlMatch[1];
                }
                
                // Se encontrou um token, tentar incrementar
                if (cadastroToken) {
                    logger.info(`🔗 [CADASTRO_LINK] Token de cadastro detectado: ${cadastroToken}`);
                    
                    // Primeiro, tentar incrementar em cadastro_links (links personalizados múltiplos)
                    const cadastroLinkUpdate = await client.query(
                        `UPDATE cadastro_links 
                         SET current_uses = COALESCE(current_uses, 0) + 1
                         WHERE slug = $1 AND guest_list_item_id = $2
                         RETURNING id`,
                        [cadastroToken, guestListItemId]
                    );
                    
                    if (cadastroLinkUpdate.rows.length > 0) {
                        logger.info(`✅ [CADASTRO_LINKS] Contador de usos incrementado para link personalizado: ${cadastroToken} (ID: ${cadastroLinkUpdate.rows[0].id})`);
                    } else {
                        // Se não encontrou em cadastro_links, tentar cadastro_slug (link único)
                        const cadastroSlugUpdate = await client.query(
                            `UPDATE guest_list_items 
                             SET cadastro_current_uses = COALESCE(cadastro_current_uses, 0) + 1
                             WHERE cadastro_slug = $1 AND id = $2
                             RETURNING id`,
                            [cadastroToken, guestListItemId]
                        );
                        
                        if (cadastroSlugUpdate.rows.length > 0) {
                            logger.info(`✅ [CADASTRO_SLUG] Contador de usos incrementado para link único: ${cadastroToken}`);
                        } else {
                            logger.warn(`⚠️ [CADASTRO_LINK] Token não encontrado em cadastro_links nem em cadastro_slug: ${cadastroToken}`);
                        }
                    }
                } else {
                    // Se não encontrou token no referer/URL, verificar se há apenas um link ativo recente
                    // e incrementar (útil quando o referer não está disponível ou foi alterado)
                    logger.info(`⚠️ [CADASTRO_LINK] Token não encontrado no referer/URL, tentando encontrar link ativo para item ${guestListItemId}`);
                    
                    // Buscar links ativos recentemente acessados (últimos 5 minutos) ou links únicos ativos
                    const activeLinkCheck = await client.query(
                        `SELECT id, slug, current_uses, max_uses
                         FROM cadastro_links 
                         WHERE guest_list_item_id = $1 
                         AND (expires_at IS NULL OR expires_at > NOW())
                         AND (max_uses = 999999 OR current_uses < max_uses)
                         ORDER BY 
                            CASE WHEN created_at > NOW() - INTERVAL '5 minutes' THEN 1 ELSE 2 END,
                            created_at DESC
                         LIMIT 1`,
                        [guestListItemId]
                    );
                    
                    if (activeLinkCheck.rows.length === 1) {
                        const linkId = activeLinkCheck.rows[0].id;
                        const linkSlug = activeLinkCheck.rows[0].slug;
                        await client.query(
                            `UPDATE cadastro_links 
                             SET current_uses = COALESCE(current_uses, 0) + 1
                             WHERE id = $1`,
                            [linkId]
                        );
                        logger.info(`✅ [CADASTRO_LINKS] Contador incrementado via link único ativo: ${linkId} (slug: ${linkSlug})`);
                    } else {
                        logger.warn(`⚠️ [CADASTRO_LINK] Nenhum link ativo encontrado para incrementar (itemId: ${itemIdInt})`);
                    }
                }
            }
        } catch (linkError) {
            logger.error(`❌ [CADASTRO_LINK] Erro ao incrementar contador de usos:`, linkError);
            // Não falhar a requisição se incrementar contador falhar
        }
        

        // Registrar evento 'submit' de analytics
        const user_ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0];
        const user_agent = req.headers['user-agent'] || null;
        const referer = req.headers.referer || null;
        const session_id = req.body.session_id || null;
        
        try {
            await client.query(`
                INSERT INTO digital_form_analytics (
                    profile_item_id, event_type, user_ip, user_agent, referer, session_id
                ) VALUES ($1, 'submit', $2, $3, $4, $5)
            `, [itemIdInt, user_ip, user_agent, referer, session_id]);
        } catch (analyticsError) {
            logger.warn('Erro ao registrar analytics de submit:', analyticsError);
            // Não falhar a requisição se analytics falhar
        }

        logger.info('Resposta do formulário salva', { 
            itemId: itemIdInt, 
            responseId: result.rows[0].id 
        });

        // Buscar dados do formulário para página de sucesso
        const formDataForSuccess = await client.query(
            'SELECT form_title, enable_whatsapp, enable_guest_list_submit, whatsapp_number, primary_color, secondary_color FROM digital_form_items WHERE profile_item_id = $1',
            [itemIdInt]
        );
        
        const formData = formDataForSuccess.rows[0] || {};
        const showSuccessPage = req.query.success_page === 'true' || req.headers['x-success-page'] === 'true';
        
        if (showSuccessPage) {
            // Buscar dados do evento se for lista de convidados OU se enable_guest_list_submit estiver ativo
            let eventData = null;
            const shouldShowEventInfo = (response_guest_id && response_qr_token) || enableGuestListSubmit;
            
            if (shouldShowEventInfo) {
                try {
                    // Primeiro tentar buscar de guest_list_items
                    let eventRes = await client.query(`
                        SELECT gli.event_title, gli.event_date, gli.event_location, dfi.event_date as form_event_date, dfi.event_address
                        FROM guest_list_items gli
                        LEFT JOIN digital_form_items dfi ON dfi.profile_item_id = gli.profile_item_id
                        WHERE gli.profile_item_id = $1
                        LIMIT 1
                    `, [itemIdInt]);
                    
                    // Se não encontrar em guest_list_items, tentar buscar diretamente de digital_form_items
                    if (eventRes.rows.length === 0) {
                        eventRes = await client.query(`
                            SELECT dfi.form_title as event_title, dfi.event_date, dfi.event_address as event_location
                            FROM digital_form_items dfi
                            WHERE dfi.profile_item_id = $1
                            LIMIT 1
                        `, [itemIdInt]);
                    }
                    
                    if (eventRes.rows.length > 0) {
                        eventData = eventRes.rows[0];
                    }
                } catch (err) {
                    logger.warn('Erro ao buscar dados do evento:', err);
                }
            }
            
            // Renderizar página de sucesso
            // IMPORTANTE: Mostrar QR code e informações do evento se enable_guest_list_submit estiver ativo OU se tiver guest_id e qr_token
            const shouldShowGuestListInfo = enableGuestListSubmit || (response_guest_id && response_qr_token);
            
            // Determinar URL do formulário para botão "Preencher Novamente"
            // Mesma lógica da rota GET /success acima
            let formUrlForSubmit = null;
            const refererSubmit = req.headers.referer || req.headers.referrer || '';
            
            if (refererSubmit && (refererSubmit.includes('/form/') || refererSubmit.includes('/kingforms/') || refererSubmit.includes('/forms/'))) {
                try {
                    const refererUrl = new URL(refererSubmit);
                    const path = refererUrl.pathname.replace(/\/success.*$/, '');
                    const m = path.match(/\/(?:kingforms|form\/share|forms|form)\/([^\/\?]+)/);
                    formUrlForSubmit = m ? `/form/${m[1]}` : path;
                    logger.info(`✅ [SUBMIT] Usando link curto: ${formUrlForSubmit}`);
                } catch (urlError) {
                    logger.warn(`⚠️ [SUBMIT] Erro ao parsear referer URL:`, urlError.message);
                }
            }
            
            // Se não encontrou no referer, buscar link ativo no banco
            if (!formUrlForSubmit) {
                try {
                    const guestListItemRes = await client.query(
                        'SELECT id FROM guest_list_items WHERE profile_item_id = $1 LIMIT 1',
                        [itemIdInt]
                    );
                    
                    if (guestListItemRes.rows.length > 0) {
                        const guestListItemId = guestListItemRes.rows[0].id;
                        
                        const activeLinkRes = await client.query(
                            `SELECT slug FROM cadastro_links 
                             WHERE guest_list_item_id = $1 
                             AND is_active_for_profile = TRUE 
                             AND (expires_at IS NULL OR expires_at > NOW())
                             AND (max_uses = 999999 OR current_uses < max_uses)
                             LIMIT 1`,
                            [guestListItemId]
                        );
                        
                        if (activeLinkRes.rows.length > 0) {
                            const activeLinkSlug = activeLinkRes.rows[0].slug;
                            formUrlForSubmit = `/form/${activeLinkSlug}`;
                            logger.info(`✅ [SUBMIT] Link ativo encontrado: ${formUrlForSubmit}`);
                        }
                    }
                } catch (linkError) {
                    logger.warn(`⚠️ [SUBMIT] Erro ao buscar link ativo:`, linkError.message);
                }
            }
            
            return res.render('formSuccess', {
                message: 'Obrigado por preencher o formulário. Sua resposta foi registrada com sucesso.',
                responseId: result && result.rows && result.rows[0] ? result.rows[0].id : null,
                formTitle: formData.form_title || 'Formulário',
                showWhatsAppInfo: formData.enable_whatsapp !== false && formData.whatsapp_number,
                whatsappNumber: formData.whatsapp_number,
                showGuestListInfo: shouldShowGuestListInfo,
                guestId: response_guest_id,
                qrToken: response_qr_token,
                eventTitle: eventData?.event_title || formData.form_title || 'Evento',
                eventDate: eventData?.event_date || eventData?.form_event_date || null,
                eventAddress: eventData?.event_location || eventData?.event_address || null,
                formUrl: formUrlForSubmit, // Usar link personalizado ou null
                primaryColor: formData.primary_color || '#4A90E2',
                secondaryColor: formData.secondary_color || formData.primary_color || '#6BA3F0',
                autoRedirect: false
            });
        }

        // IMPORTANTE: Validar se a resposta foi salva corretamente (exceto se for modo "whatsapp-only")
        if (sendMode !== 'whatsapp-only') {
            if (!result || !result.rows || result.rows.length === 0) {
                logger.error('❌ [SUBMIT] Erro crítico: Resposta não foi salva no banco de dados', {
                    itemId: itemIdInt,
                    responseData: response_data,
                    sendMode: sendMode
                });
                return res.status(500).json({ 
                    success: false,
                    message: 'Erro ao salvar resposta no banco de dados',
                    error: 'Resposta não foi inserida'
                });
            }
        }
        
        const responseId = result && result.rows && result.rows[0] ? result.rows[0].id : null;
        
        logger.info('✅ [SUBMIT] Resposta processada - retornando JSON', {
            response_id: responseId,
            itemId: itemIdInt,
            sendMode: sendMode,
            shouldSaveToSystem: shouldSaveToSystem,
            shouldSaveToGuestList,
            enableGuestListSubmit,
            enableWhatsapp
        });
        
        // IMPORTANTE: Sempre retornar URL de sucesso para que possa ser acessada
        // Mesmo quando envia por WhatsApp, deve aparecer a página de sucesso
        // Se for "whatsapp-only", não retornar success_page_url (não redirecionar)
        
        const successPageUrl = sendMode === 'whatsapp-only'
            ? null
            : checkoutEnabled
                ? `/${slug}/form/${itemId}/checkout?submissionId=${responseId || ''}`
                : `/${slug}/form/${itemId}/success?response_id=${responseId || ''}&show_success_page=true`;

        res.json({
            success: true,
            message: sendMode === 'whatsapp-only' ? 'Enviado via WhatsApp' : (checkoutEnabled ? 'Seus dados foram registrados. Conclua o pagamento para confirmar.' : 'Resposta salva com sucesso'),
            response_id: responseId,
            success_page_url: successPageUrl,
            checkout_enabled: checkoutEnabled,
            guest_id: response_guest_id || null,
            qr_token: response_qr_token || null,
            should_show_guest_list_info: shouldSaveToGuestList || false,
            send_mode: sendMode,
            should_save: shouldSaveToSystem
        });

    } catch (error) {
        logger.error('❌ [SUBMIT] Erro ao salvar resposta do formulário:', {
            error: error.message,
            stack: error.stack,
            itemId: itemId || 'unknown',
            slug: slug || 'unknown'
        });
        
        // IMPORTANTE: Sempre retornar resposta JSON válida, mesmo em caso de erro
        res.status(500).json({ 
            success: false,
            message: 'Erro ao salvar resposta. Tente novamente em alguns instantes.',
            error: error.message || 'Erro desconhecido'
        });
    } finally {
        if (client) {
            client.release();
        }
    }
}));

/**
 * GET /:slug/form/:itemId/checkout - Página de checkout (Pagamento Pix/Cartão)
 */
router.get('/:slug/form/:itemId/checkout', asyncHandler(async (req, res) => {
    const { slug, itemId } = req.params;
    const { submissionId } = req.query;
    if (!submissionId) {
        return res.status(400).send('<h1>Link inválido</h1><p>Falta o parâmetro submissionId.</p>');
    }
    const itemIdInt = parseInt(itemId, 10);
    if (isNaN(itemIdInt)) return res.status(400).send('<h1>ID do formulário inválido</h1>');

    const client = await db.pool.connect();
    try {
        const userRes = await client.query(
            'SELECT id FROM users WHERE profile_slug = $1 OR id = $1',
            [slug]
        );
        if (userRes.rows.length === 0) {
            return res.status(404).send('<h1>Perfil não encontrado</h1>');
        }
        const userId = userRes.rows[0].id;

        const subRes = await client.query(
            `SELECT dfr.id, dfr.profile_item_id, dfr.responder_name, dfr.responder_email, dfr.responder_phone,
                    dfr.submitted_at, dfr.payment_status, dfr.paid_at, dfr.payment_order_id,
                    dfi.form_title, dfi.checkout_enabled, dfi.price_cents, dfi.pay_button_label
             FROM digital_form_responses dfr
             JOIN digital_form_items dfi ON dfi.profile_item_id = dfr.profile_item_id
             JOIN profile_items pi ON pi.id = dfr.profile_item_id AND pi.user_id = $2
             WHERE dfr.id = $1 AND dfr.profile_item_id = $3`,
            [submissionId, userId, itemIdInt]
        );
        if (subRes.rows.length === 0) {
            return res.status(404).send('<h1>Submissão não encontrada</h1>');
        }
        const row = subRes.rows[0];
        if (!row.checkout_enabled) {
            return res.redirect(302, `/${slug}/form/${itemId}/success?response_id=${submissionId}&show_success_page=true`);
        }
        const baseUrl = `${req.protocol}://${req.get('host') || 'tag.conectaking.com.br'}`;
        const checkoutConfig = await checkoutService.getCheckoutConfig(row.profile_item_id) || {};
        return res.render('checkout', {
            submissionId: row.id,
            formTitle: row.form_title || 'Formulário',
            priceCents: row.price_cents || 0,
            payButtonLabel: row.pay_button_label || 'Pagamento',
            responderName: row.responder_name,
            responderEmail: row.responder_email,
            responderPhone: row.responder_phone,
            submittedAt: row.submitted_at,
            paymentStatus: row.payment_status || 'PENDING_PAYMENT',
            paidAt: row.paid_at,
            slug,
            itemId: itemIdInt,
            baseUrl,
            checkoutPageLogoUrl: checkoutConfig.checkout_page_logo_url || '',
            checkoutPagePrimaryColor: checkoutConfig.checkout_page_primary_color || '#22c55e',
            checkoutPageTitle: checkoutConfig.checkout_page_title || '',
            checkoutPageFooter: checkoutConfig.checkout_page_footer || ''
        });
    } finally {
        client.release();
    }
}));

/**
 * GET /:slug/form/:itemId/success - Página de sucesso após envio
 */
router.get('/:slug/form/:itemId/success', asyncHandler(async (req, res) => {
    const { slug, itemId } = req.params;
    const { response_id } = req.query;
    
    // Coletar dados do formulário enviado da query string
    const submittedData = {};
    Object.keys(req.query).forEach(key => {
        if (key.startsWith('data_')) {
            const fieldName = key.replace('data_', '');
            submittedData[fieldName] = req.query[key];
        }
    });
    
    const client = await db.pool.connect();
    
    try {
        const itemIdInt = parseInt(itemId, 10);

        if (isNaN(itemIdInt)) {
            return res.status(400).send('<h1>400 - ID do formulário inválido</h1>');
        }

        // PRIORIDADE 1: Buscar userId pelo itemId primeiro (mais confiável)
        let userId = null;
        const itemCheck = await client.query(
            'SELECT user_id FROM profile_items WHERE id = $1 AND (item_type = \'digital_form\' OR item_type = \'guest_list\') AND is_active = true',
            [itemIdInt]
        );
        
        if (itemCheck.rows.length > 0) {
            userId = itemCheck.rows[0].user_id;
            logger.info(`✅ [SUCCESS] userId encontrado via itemId: ${userId} para itemId: ${itemIdInt}`);
        } else {
            // PRIORIDADE 2: Se não encontrou pelo itemId, tentar buscar pelo slug
            logger.info(`⚠️ [SUCCESS] Item não encontrado pelo itemId, tentando buscar pelo slug: "${slug}"`);
            const userRes = await client.query(
                'SELECT id FROM users WHERE profile_slug = $1 OR id = $1',
                [slug]
            );
            
            if (userRes.rows.length === 0) {
                return res.status(404).send('<h1>404 - Perfil não encontrado</h1>');
            }
            userId = userRes.rows[0].id;
        }

        if (!userId) {
            return res.status(404).send('<h1>404 - Perfil não encontrado</h1>');
        }

        // Buscar dados do formulário (inclui form_fields para ordem correta na exibição)
        const formRes = await client.query(
            `SELECT dfi.form_title, dfi.enable_whatsapp, dfi.enable_guest_list_submit, 
                    dfi.whatsapp_number, dfi.primary_color, dfi.secondary_color,
                    dfi.background_color, dfi.background_image_url, dfi.background_opacity,
                    dfi.form_fields
             FROM digital_form_items dfi
             INNER JOIN profile_items pi ON pi.id = dfi.profile_item_id
             WHERE dfi.profile_item_id = $1 AND pi.user_id = $2
             ORDER BY COALESCE(dfi.updated_at, '1970-01-01'::timestamp) DESC, dfi.id DESC
             LIMIT 1`,
            [itemIdInt, userId]
        );

        if (formRes.rows.length === 0) {
            return res.status(404).send('<h1>404 - Formulário não encontrado</h1>');
        }

        let formData = formRes.rows[0];
        let formFields = [];
        if (formData.form_fields) {
            try {
                formFields = typeof formData.form_fields === 'string' ? JSON.parse(formData.form_fields) : formData.form_fields;
                if (!Array.isArray(formFields)) formFields = [];
            } catch (e) { formFields = []; }
        }

        // IMPORTANTE: Verificar se há dados em guest_list_items também (para enable_guest_list_submit)
        try {
            const guestListCheck = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'guest_list_items' 
                AND column_name = 'enable_guest_list_submit'
            `);
            const hasEnableGuestListSubmit = guestListCheck.rows.length > 0;
            
            if (hasEnableGuestListSubmit) {
                const guestListRes = await client.query(`
                    SELECT enable_guest_list_submit, enable_whatsapp
                    FROM guest_list_items 
                    WHERE profile_item_id = $1 
                    ORDER BY COALESCE(updated_at, '1970-01-01'::timestamp) DESC, id DESC 
                    LIMIT 1
                `, [itemIdInt]);
                
                if (guestListRes.rows.length > 0) {
                    const guestListData = guestListRes.rows[0];
                    // Priorizar valores de guest_list_items se existirem
                    if (guestListData.enable_guest_list_submit !== undefined && guestListData.enable_guest_list_submit !== null) {
                        formData.enable_guest_list_submit = guestListData.enable_guest_list_submit === true || guestListData.enable_guest_list_submit === 'true' || guestListData.enable_guest_list_submit === 1 || guestListData.enable_guest_list_submit === '1';
                    }
                    if (guestListData.enable_whatsapp !== undefined && guestListData.enable_whatsapp !== null) {
                        formData.enable_whatsapp = guestListData.enable_whatsapp === true || guestListData.enable_whatsapp === 'true' || guestListData.enable_whatsapp === 1 || guestListData.enable_whatsapp === '1';
                    }
                }
            }
        } catch (err) {
            logger.warn('Erro ao buscar enable_guest_list_submit de guest_list_items na página de sucesso:', err);
        }
        
        // Buscar dados completos da resposta se tiver response_id
        let responseData = null;
        let qrToken = null;
        let guestId = null;
        let eventData = null;
        
        // IMPORTANTE: response_id pode vir duplicado na query string, pegar o primeiro válido
        let responseIdValue = response_id;
        if (Array.isArray(response_id)) {
            responseIdValue = response_id[0];
        } else if (typeof response_id === 'string' && response_id.includes(',')) {
            // Se vier como string com vírgula, pegar o primeiro
            responseIdValue = response_id.split(',')[0];
        }
        
        if (responseIdValue) {
            try {
                // Converter response_id para inteiro se for string
                const responseIdInt = parseInt(responseIdValue, 10);
                if (isNaN(responseIdInt)) {
                    logger.warn('⚠️ response_id inválido na página de sucesso:', responseIdValue);
                } else {
                    // Buscar resposta incluindo guest_id se existir
                    const responseRes = await client.query(
                        'SELECT response_data, responder_name, responder_email, responder_phone, submitted_at, guest_id FROM digital_form_responses WHERE id = $1',
                        [responseIdInt]
                    );
                    if (responseRes.rows.length > 0) {
                        responseData = responseRes.rows[0];
                        // Parsear response_data se for string
                        if (typeof responseData.response_data === 'string') {
                            try {
                                responseData.response_data = JSON.parse(responseData.response_data);
                            } catch (e) {
                                // Se não conseguir parsear, usar como está
                            }
                        }
                        
                        // PRIORIDADE 1: Se a resposta já tem guest_id, buscar diretamente pelo guest_id
                        if (responseData.guest_id) {
                            try {
                                logger.info('🔍 [SUCCESS] Buscando QR Token via guest_id direto:', responseData.guest_id);
                                const directGuestRes = await client.query(
                                    'SELECT id, qr_token FROM guests WHERE id = $1',
                                    [responseData.guest_id]
                                );
                                if (directGuestRes.rows.length > 0 && directGuestRes.rows[0].qr_token) {
                                    guestId = directGuestRes.rows[0].id;
                                    qrToken = directGuestRes.rows[0].qr_token;
                                    logger.info('✅ [SUCCESS] QR Token encontrado via guest_id direto');
                                    
                                    // Buscar dados do evento
                                    const guestListItemRes = await client.query(
                                        'SELECT id FROM guest_list_items WHERE profile_item_id = $1 LIMIT 1',
                                        [itemIdInt]
                                    );
                                    if (guestListItemRes.rows.length > 0) {
                                        const guestListItemId = guestListItemRes.rows[0].id;
                                        const eventRes = await client.query(
                                            `SELECT event_title, event_date, event_location
                                             FROM guest_list_items
                                             WHERE id = $1`,
                                            [guestListItemId]
                                        );
                                        if (eventRes.rows.length > 0) {
                                            eventData = eventRes.rows[0];
                                        }
                                    }
                                } else {
                                    logger.warn('⚠️ [SUCCESS] guest_id encontrado mas guest não existe ou não tem qr_token');
                                }
                            } catch (directErr) {
                                logger.warn('⚠️ [SUCCESS] Erro ao buscar guest via guest_id direto:', directErr.message);
                            }
                        }
                    }
                    
                    // PRIORIDADE 2: Se ainda não encontrou o qrToken, tentar buscar por nome/email
                    if (!qrToken) {
                        // Buscar convidado associado a esta resposta (via guest_list_id e nome/email)
                        const enableGuestListSubmit = formData.enable_guest_list_submit === true || formData.enable_guest_list_submit === 'true' || formData.enable_guest_list_submit === 1 || formData.enable_guest_list_submit === '1';
                        if (enableGuestListSubmit) {
                        try {
                            // Buscar guest_list_item_id para este profile_item_id
                            const guestListItemRes = await client.query(
                                'SELECT id FROM guest_list_items WHERE profile_item_id = $1 LIMIT 1',
                                [itemIdInt]
                            );
                            
                            if (guestListItemRes.rows.length > 0) {
                                const guestListItemId = guestListItemRes.rows[0].id;
                                
                                // Buscar o convidado mais recente associado a esta resposta (por nome ou email)
                                let guestRes = null;
                                if (responseData && responseData.responder_name) {
                                    guestRes = await client.query(
                                        `SELECT id, qr_token FROM guests 
                                         WHERE guest_list_id = $1 
                                         AND (name = $2 OR email = $3)
                                         ORDER BY created_at DESC LIMIT 1`,
                                        [guestListItemId, responseData.responder_name, responseData.responder_email || responseData.responder_name]
                                    );
                                } else if (responseData && responseData.response_data) {
                                    // Tentar buscar por nome no response_data (buscar em qualquer chave que possa conter o nome)
                                    let nameFromData = null;
                                    if (responseData.response_data.name) {
                                        nameFromData = responseData.response_data.name;
                                    } else if (responseData.response_data.nome) {
                                        nameFromData = responseData.response_data.nome;
                                    } else {
                                        // Tentar encontrar qualquer campo que possa ser o nome
                                        const allValues = Object.values(responseData.response_data);
                                        for (const value of allValues) {
                                            if (typeof value === 'string' && value.trim().length > 0 && value.trim().length < 100) {
                                                nameFromData = value.trim();
                                                break;
                                            }
                                        }
                                    }
                                    
                                    if (nameFromData && typeof nameFromData === 'string') {
                                        guestRes = await client.query(
                                            `SELECT id, qr_token FROM guests 
                                             WHERE guest_list_id = $1 
                                             AND (name = $2 OR name ILIKE $2)
                                             ORDER BY created_at DESC LIMIT 1`,
                                            [guestListItemId, nameFromData]
                                        );
                                    }
                                }
                                
                                if (guestRes && guestRes.rows.length > 0) {
                                    guestId = guestRes.rows[0].id;
                                    qrToken = guestRes.rows[0].qr_token;
                                    
                                    // Buscar dados do evento
                                    const eventRes = await client.query(
                                        `SELECT event_title, event_date, event_location
                                         FROM guest_list_items 
                                         WHERE id = $1`,
                                        [guestListItemId]
                                    );
                                    
                                    if (eventRes.rows.length > 0) {
                                        eventData = eventRes.rows[0];
                                    }
                                }
                            }
                        } catch (err) {
                            logger.warn('Erro ao buscar convidado e QR token:', err);
                        }
                    }
                    }
                }
            } catch (err) {
                logger.warn('Erro ao buscar dados da resposta:', err);
            }
        }

        // Determinar mensagem personalizada baseada no tipo de envio
        const enableGuestListSubmitBool = formData.enable_guest_list_submit === true || formData.enable_guest_list_submit === 'true' || formData.enable_guest_list_submit === 1 || formData.enable_guest_list_submit === '1';
        let successMessage = 'Obrigado por preencher o formulário. Sua resposta foi registrada com sucesso.';
        if (enableGuestListSubmitBool) {
            successMessage = 'Parabéns! Sua inscrição foi realizada com sucesso. Você foi adicionado à nossa lista de convidados.';
        } else if (formData.enable_whatsapp !== false) {
            successMessage = 'Formulário enviado com sucesso! Verifique o WhatsApp para continuar o atendimento.';
        }
        
        // Log para debug
        logger.info('📋 [SUCCESS] Renderizando página de sucesso:', {
            response_id: response_id,
            enableGuestListSubmitBool,
            guestId: guestId || null,
            qrToken: qrToken ? qrToken.substring(0, 10) + '...' : null,
            hasQrToken: !!qrToken
        });
        
        // Determinar URL do formulário para botão "Preencher Novamente"
        // PRIORIDADE 1: Usar referer se for link personalizado (/form/, /form/share/, /kingforms/, /forms/)
        let formUrl = null;
        const referer = req.headers.referer || req.headers.referrer || '';
        
        if (referer && (referer.includes('/form/') || referer.includes('/kingforms/') || referer.includes('/forms/'))) {
            try {
                const refererUrl = new URL(referer);
                const path = refererUrl.pathname.replace(/\/success.*$/, '');
                const m = path.match(/\/(?:kingforms|form\/share|forms|form)\/([^\/\?]+)/);
                formUrl = m ? `/form/${m[1]}` : path;
                logger.info(`✅ [SUCCESS] Usando link curto: ${formUrl}`);
            } catch (urlError) {
                logger.warn(`⚠️ [SUCCESS] Erro ao parsear referer URL:`, urlError.message);
            }
        }
        
        // PRIORIDADE 2: Se não encontrou no referer, buscar link ativo no banco
        if (!formUrl) {
            try {
                const guestListItemRes = await client.query(
                    'SELECT id FROM guest_list_items WHERE profile_item_id = $1 LIMIT 1',
                    [itemIdInt]
                );
                
                if (guestListItemRes.rows.length > 0) {
                    const guestListItemId = guestListItemRes.rows[0].id;
                    
                    const activeLinkRes = await client.query(
                        `SELECT slug FROM cadastro_links 
                         WHERE guest_list_item_id = $1 
                         AND is_active_for_profile = TRUE 
                         AND (expires_at IS NULL OR expires_at > NOW())
                         AND (max_uses = 999999 OR current_uses < max_uses)
                         LIMIT 1`,
                        [guestListItemId]
                    );
                    
                    if (activeLinkRes.rows.length > 0) {
                        const activeLinkSlug = activeLinkRes.rows[0].slug;
                        formUrl = `/form/${activeLinkSlug}`;
                        logger.info(`✅ [SUCCESS] Link ativo encontrado: ${formUrl}`);
                    }
                }
            } catch (linkError) {
                logger.warn(`⚠️ [SUCCESS] Erro ao buscar link ativo:`, linkError.message);
            }
        }
        
        // PRIORIDADE 3: Fallback do referer — extrair slug e usar /form/slug
        if (!formUrl && referer) {
            try {
                const refererUrl = new URL(referer);
                const path = refererUrl.pathname.replace(/\/success.*$/, '');
                if (path && path !== '/') {
                    const m = path.match(/\/(?:kingforms|form\/share|forms|form)\/([^\/\?]+)/);
                    if (m) {
                        formUrl = `/form/${m[1]}`;
                        logger.info(`✅ [SUCCESS] Fallback referer → link curto: ${formUrl}`);
                    }
                }
            } catch (urlError) {
                // Ignorar erro
            }
        }
        
        // PRIORIDADE 4: Último recurso - não mostrar botão se não houver link válido
        // (melhor que redirecionar para link que não existe)
        // formUrl permanece null se não encontrou nenhuma opção válida
        
        res.render('formSuccess', {
            message: successMessage,
            responseId: response_id || null,
            formTitle: formData.form_title || 'Formulário',
            showWhatsAppInfo: formData.enable_whatsapp !== false && formData.whatsapp_number,
            whatsappNumber: formData.whatsapp_number,
            showGuestListInfo: enableGuestListSubmitBool,
            guestId: guestId || null,
            qrToken: qrToken || null,
            eventTitle: eventData?.event_title || formData.form_title || 'Evento',
            eventDate: eventData?.event_date || null,
            eventAddress: eventData?.event_location || eventData?.event_address || null,
            formUrl: formUrl, // Pode ser null se não encontrou link válido
            primaryColor: formData.primary_color || '#4A90E2',
            secondaryColor: formData.secondary_color || formData.primary_color || '#6BA3F0',
            backgroundColor: formData.background_color || '#FFFFFF',
            backgroundImageUrl: formData.background_image_url || null,
            backgroundOpacity: formData.background_opacity || 1.0,
            autoRedirect: false,
            submittedData: submittedData,
            responseData: responseData,
            formFields: formFields
        });

    } catch (error) {
        logger.error('Erro ao carregar página de sucesso:', error);
        return res.status(500).send('<h1>500 - Erro ao carregar página</h1>');
    } finally {
        client.release();
    }
}));

/**
 * GET /:slug/form/:itemId/error - Página de erro após tentativa de envio
 */
router.get('/:slug/form/:itemId/error', asyncHandler(async (req, res) => {
    const { slug, itemId } = req.params;
    const { error: errorMessage, form_url } = req.query;
    
    const client = await db.pool.connect();
    
    try {
        const itemIdInt = parseInt(itemId, 10);
        
        // Buscar dados do formulário para cores
        const formDataRes = await client.query(
            'SELECT form_title, primary_color, secondary_color FROM digital_form_items WHERE profile_item_id = $1',
            [itemIdInt]
        );
        
        const formData = formDataRes.rows[0] || {};
        
        res.render('formError', {
            errorMessage: errorMessage ? decodeURIComponent(errorMessage) : 'Ocorreu um erro ao enviar o formulário. Tente novamente.',
            formTitle: formData.form_title || 'Formulário',
            formUrl: form_url || `/${slug}/form/${itemId}`,
            primaryColor: formData.primary_color || '#4A90E2',
            secondaryColor: formData.secondary_color || formData.primary_color || '#6BA3F0'
        });
        
    } catch (error) {
        logger.error('Erro ao carregar página de erro:', error);
        return res.status(500).send('<h1>500 - Erro ao carregar página</h1>');
    } finally {
        client.release();
    }
}));

module.exports = router;

