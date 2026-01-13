const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const db = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
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
 * Rota pública: GET /form/share/:token
 * Acesso via link compartilhável (formulário oculto do cartão público)
 */
router.get('/form/share/:token', asyncHandler(async (req, res) => {
    const { token } = req.params;
    
    // Headers AGressivos para evitar cache no navegador e servidor
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
        // Buscar formulário pelo share_token ou cadastro_slug (pode ser digital_form ou guest_list)
        // Primeiro tentar pelo share_token
        let itemRes = await client.query(
            `SELECT pi.* 
             FROM profile_items pi
             WHERE pi.share_token = $1 AND (pi.item_type = 'digital_form' OR pi.item_type = 'guest_list') AND pi.is_active = true`,
            [token]
        );

        // Se não encontrar pelo share_token, tentar pelo cadastro_slug
        if (itemRes.rows.length === 0) {
            itemRes = await client.query(
                `SELECT pi.* 
                 FROM profile_items pi
                 INNER JOIN guest_list_items gli ON gli.profile_item_id = pi.id
                 WHERE gli.cadastro_slug = $1 AND (pi.item_type = 'digital_form' OR pi.item_type = 'guest_list') AND pi.is_active = true`,
                [token]
            );
        }

        if (itemRes.rows.length === 0) {
            return res.status(404).send('<h1>404 - Formulário não encontrado</h1><p>O link compartilhável é inválido ou expirou.</p>');
        }

        const item = itemRes.rows[0];
        const userId = item.user_id;
        const itemIdInt = item.id;
        const isGuestList = item.item_type === 'guest_list';

        // Buscar dados do formulário com verificação de colunas
        const columnCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'digital_form_items' 
            AND column_name IN ('enable_whatsapp', 'enable_guest_list_submit')
        `);
        
        const hasEnableWhatsapp = columnCheck.rows.some(r => r.column_name === 'enable_whatsapp');
        const hasEnableGuestListSubmit = columnCheck.rows.some(r => r.column_name === 'enable_guest_list_submit');
        
        // Buscar dados de digital_form_items (sempre necessário para form_fields, etc)
        // IMPORTANTE: Buscar o registro mais recente baseado em updated_at e id
        // Usar COALESCE para garantir que registros sem updated_at sejam ordenados corretamente
        let formRes;
        formRes = await client.query(
            `SELECT * FROM digital_form_items 
             WHERE profile_item_id = $1 
             ORDER BY 
                COALESCE(updated_at, '1970-01-01'::timestamp) DESC, 
                id DESC 
             LIMIT 1`,
            [itemIdInt]
        );

        if (formRes.rows.length === 0) {
            return res.status(404).send('<h1>404 - Dados do formulário não encontrados</h1>');
        }

        let formData = formRes.rows[0];
        
        // Log para debug - verificar se está pegando o registro correto
        logger.info(`📋 [FORM/SHARE] Formulário carregado para item ${itemIdInt}:`, {
            formTitle: formData.form_title,
            formDescription: formData.form_description,
            updatedAt: formData.updated_at,
            id: formData.id,
            displayFormat: formData.display_format,
            primaryColor: formData.primary_color,
            secondaryColor: formData.secondary_color
        });
        
        // IMPORTANTE: Sempre verificar se existe dados em guest_list_items (mesmo que item_type não seja guest_list)
        // Isso é necessário porque o item pode estar como digital_form mas ter dados salvos em guest_list_items
        // Verificar quais colunas existem em guest_list_items
        const guestListColumnsCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'guest_list_items' 
            AND column_name IN ('card_color', 'enable_whatsapp', 'enable_guest_list_submit')
        `);
        const hasGuestListCardColor = guestListColumnsCheck.rows.some(r => r.column_name === 'card_color');
        const guestListHasEnableWhatsapp = guestListColumnsCheck.rows.some(r => r.column_name === 'enable_whatsapp');
        const guestListHasEnableGuestListSubmit = guestListColumnsCheck.rows.some(r => r.column_name === 'enable_guest_list_submit');
        
        // Construir SELECT dinamicamente baseado nas colunas disponíveis
        let guestListSelectFields = 'primary_color, secondary_color, text_color, background_color, header_image_url, background_image_url, background_opacity, theme, updated_at';
        if (hasGuestListCardColor) {
            guestListSelectFields += ', card_color';
        }
        if (guestListHasEnableWhatsapp) {
            guestListSelectFields += ', enable_whatsapp';
        }
        if (guestListHasEnableGuestListSubmit) {
            guestListSelectFields += ', enable_guest_list_submit';
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
        
        if (guestListRes.rows.length > 0) {
            const guestListData = guestListRes.rows[0];
            logger.info(`🎨 [FORM/SHARE] Dados encontrados em guest_list_items:`, {
                primary_color: guestListData.primary_color,
                secondary_color: guestListData.secondary_color,
                updated_at: guestListData.updated_at,
                item_type: item.item_type
            });
            
            // Mesclar dados: SEMPRE priorizar cores de guest_list_items se existirem
            // Isso garante que as cores salvas em guest_list_items sejam usadas
            if (guestListData.primary_color) {
                formData.primary_color = guestListData.primary_color;
                logger.info(`🎨 [FORM/SHARE] primary_color atualizado de guest_list_items: ${guestListData.primary_color}`);
            }
            if (guestListData.secondary_color) {
                formData.secondary_color = guestListData.secondary_color;
                logger.info(`🎨 [FORM/SHARE] secondary_color atualizado de guest_list_items: ${guestListData.secondary_color}`);
            }
            if (guestListData.text_color) {
                formData.text_color = guestListData.text_color;
            }
            if (guestListData.background_color) {
                formData.background_color = guestListData.background_color;
            }
            if (guestListData.header_image_url) {
                formData.header_image_url = guestListData.header_image_url;
            }
            if (guestListData.background_image_url) {
                formData.background_image_url = guestListData.background_image_url;
            }
            if (guestListData.background_opacity !== null && guestListData.background_opacity !== undefined) {
                formData.background_opacity = guestListData.background_opacity;
            }
            if (guestListData.theme) {
                formData.theme = guestListData.theme;
            }
            if (hasGuestListCardColor && guestListData.card_color) {
                formData.card_color = guestListData.card_color;
                logger.info(`🎨 [FORM/SHARE] card_color atualizado de guest_list_items: ${guestListData.card_color}`);
            }
            
            // IMPORTANTE: Mesclar enable_whatsapp e enable_guest_list_submit se existirem em guest_list_items
            // Isso garante que as configurações do botão sejam atualizadas corretamente
            if (guestListHasEnableWhatsapp && guestListData.enable_whatsapp !== undefined) {
                formData.enable_whatsapp = guestListData.enable_whatsapp;
                logger.info(`🔘 [FORM/SHARE] enable_whatsapp atualizado de guest_list_items: ${guestListData.enable_whatsapp} (tipo: ${typeof guestListData.enable_whatsapp})`);
            }
            if (guestListHasEnableGuestListSubmit && guestListData.enable_guest_list_submit !== undefined) {
                formData.enable_guest_list_submit = guestListData.enable_guest_list_submit;
                logger.info(`🔘 [FORM/SHARE] enable_guest_list_submit atualizado de guest_list_items: ${guestListData.enable_guest_list_submit} (tipo: ${typeof guestListData.enable_guest_list_submit})`);
            }
            
            logger.info(`🎨 [FORM/SHARE] Dados finais após mesclar guest_list_items:`, {
                primary_color: formData.primary_color,
                secondary_color: formData.secondary_color,
                text_color: formData.text_color,
                enable_whatsapp: formData.enable_whatsapp,
                enable_guest_list_submit: formData.enable_guest_list_submit
            });
        } else {
            logger.info(`ℹ️ [FORM/SHARE] Nenhum dado encontrado em guest_list_items para item ${itemIdInt}`);
        }
        
        // Garantir valores padrão para enable_whatsapp e enable_guest_list_submit
        // IMPORTANTE: Respeitar valores false do banco - não sobrescrever!
        if (hasEnableWhatsapp && (formData.enable_whatsapp === undefined || formData.enable_whatsapp === null)) {
            formData.enable_whatsapp = true; // Default true apenas se não existir coluna ou valor for null
        } else if (!hasEnableWhatsapp) {
            formData.enable_whatsapp = true; // Default se coluna não existir
        }
        // Se hasEnableWhatsapp é true e enable_whatsapp é false, manter false!
        
        if (hasEnableGuestListSubmit && (formData.enable_guest_list_submit === undefined || formData.enable_guest_list_submit === null)) {
            formData.enable_guest_list_submit = false; // Default false apenas se não existir coluna ou valor for null
        } else if (!hasEnableGuestListSubmit) {
            formData.enable_guest_list_submit = false; // Default se coluna não existir
        }
        // Se hasEnableGuestListSubmit é true e enable_guest_list_submit é false, manter false!
        
        logger.info('📋 [FORM/SHARE] Configurações carregadas:', {
            enable_whatsapp: formData.enable_whatsapp,
            enable_guest_list_submit: formData.enable_guest_list_submit,
            hasEnableWhatsapp: hasEnableWhatsapp,
            hasEnableGuestListSubmit: hasEnableGuestListSubmit
        });
        
        // Garantir que secondary_color seja tratado corretamente (pode ser null)
        // Log para debug
        logger.info(`[SECONDARY_COLOR] Carregado do banco: ${formData.secondary_color}, tipo: ${typeof formData.secondary_color}`);
        
        if (!formData.secondary_color || 
            formData.secondary_color === 'null' || 
            formData.secondary_color === 'undefined' ||
            formData.secondary_color === null ||
            formData.secondary_color === undefined ||
            (typeof formData.secondary_color === 'string' && formData.secondary_color.trim() === '')) {
            formData.secondary_color = formData.primary_color || '#4A90E2';
            logger.info(`[SECONDARY_COLOR] Usando fallback (primary_color): ${formData.secondary_color}`);
        } else {
            logger.info(`[SECONDARY_COLOR] Usando valor do banco: ${formData.secondary_color}`);
        }
        
        // Garantir que form_fields seja um array
        logger.info('📋 [FORM] form_fields antes do processamento:', {
            exists: !!formData.form_fields,
            type: typeof formData.form_fields,
            value: typeof formData.form_fields === 'string' ? formData.form_fields.substring(0, 200) : formData.form_fields,
            isArray: Array.isArray(formData.form_fields),
            length: Array.isArray(formData.form_fields) ? formData.form_fields.length : 'N/A'
        });
        
        if (formData.form_fields) {
            if (typeof formData.form_fields === 'string') {
                try {
                    formData.form_fields = JSON.parse(formData.form_fields);
                    logger.info('✅ [FORM] form_fields parseado com sucesso:', {
                        length: Array.isArray(formData.form_fields) ? formData.form_fields.length : 'N/A',
                        firstField: Array.isArray(formData.form_fields) && formData.form_fields.length > 0 ? formData.form_fields[0] : null
                    });
                } catch (e) {
                    logger.error('❌ [FORM] Erro ao parsear form_fields:', e);
                    formData.form_fields = [];
                }
            }
            if (!Array.isArray(formData.form_fields)) {
                logger.warn('⚠️ [FORM] form_fields não é um array após parse:', typeof formData.form_fields);
                formData.form_fields = [];
            }
        } else {
            logger.warn('⚠️ [FORM] form_fields está vazio ou undefined');
            formData.form_fields = [];
        }
        
        logger.info('📋 [FORM] form_fields após processamento:', {
            length: formData.form_fields.length,
            isArray: Array.isArray(formData.form_fields),
            firstFields: formData.form_fields.length > 0 ? formData.form_fields.slice(0, 3).map(f => ({ id: f?.id, label: f?.label, type: f?.type })) : []
        });
        
        // CRÍTICO: Garantir que form_fields está sendo passado para o template
        if (!formData.form_fields || formData.form_fields.length === 0) {
            logger.error('❌ [FORM] ATENÇÃO: form_fields está vazio ou não existe!', {
                itemId: itemIdInt,
                formTitle: formData.form_title,
                hasFormFields: !!formData.form_fields
            });
        }

        // Buscar profile_slug
        const profileSlugRes = await client.query('SELECT profile_slug FROM users WHERE id = $1', [userId]);
        const profileSlug = profileSlugRes.rows[0]?.profile_slug || userId;

        // Garantir que show_logo_corner esteja disponível (pode não existir em versões antigas)
        if (formData.show_logo_corner === undefined) {
            formData.show_logo_corner = false;
        }
        
        // LOG DETALHADO: Verificar se todas as configurações de logo estão presentes
        logger.info('🖼️ [FORM/SHARE] Configurações de logo e texto:', {
            form_logo_url: formData.form_logo_url,
            button_logo_url: formData.button_logo_url,
            button_logo_size: formData.button_logo_size,
            show_logo_corner: formData.show_logo_corner,
            form_title: formData.form_title,
            form_description: formData.form_description,
            updated_at: formData.updated_at,
            itemId: itemIdInt,
            timestamp: Date.now()
        });
        
        // Adicionar headers com timestamp do formulário atualizado
        if (formData.updated_at) {
            res.set('X-Form-Updated-At', new Date(formData.updated_at).getTime().toString());
        }
        res.set('X-Cache-Timestamp', Date.now().toString());
        
        // Sanitizar dados antes de renderizar (prevenir XSS)
        const sanitizedFormData = sanitizeFormDataForRender(formData);
        
        // Renderizar página com timestamp único para forçar atualização
        res.render('digitalForm', {
            item: item,
            formData: sanitizedFormData,
            profileSlug: profileSlug,
            slug: profileSlug,
            itemId: itemIdInt,
            _timestamp: Date.now(),
            _cacheBust: `?t=${Date.now()}`
        });

    } catch (error) {
        logger.error('Erro ao carregar formulário via share_token:', {
            error: error.message,
            stack: error.stack,
            token: req.params.token
        });
        return res.status(500).render('formError', {
            errorMessage: 'Erro ao carregar formulário. Por favor, verifique o link e tente novamente.',
            formTitle: 'Erro',
            formUrl: '/',
            primaryColor: '#4A90E2',
            secondaryColor: '#6BA3F0'
        });
    } finally {
        client.release();
    }
}));

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
        
        // Construir SELECT dinamicamente baseado nas colunas disponíveis
        let guestListSelectFields = 'primary_color, secondary_color, text_color, background_color, header_image_url, background_image_url, background_opacity, theme, updated_at, id';
        if (guestListHasEnableWhatsapp) {
            guestListSelectFields += ', enable_whatsapp';
        }
        if (guestListHasEnableGuestListSubmit) {
            guestListSelectFields += ', enable_guest_list_submit';
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
                enable_whatsapp: guestListData.enable_whatsapp,
                enable_guest_list_submit: guestListData.enable_guest_list_submit,
                updated_at: guestListData.updated_at,
                item_type: item.item_type,
                profile_item_id: itemIdInt
            });
            
            // Mesclar dados: SEMPRE priorizar cores de guest_list_items se existirem
            // IMPORTANTE: Aplicar mesmo se o valor for null (para limpar valores antigos)
            // Isso garante que as cores salvas em guest_list_items sejam usadas
            if (guestListData.primary_color !== undefined && guestListData.primary_color !== null) {
                formData.primary_color = guestListData.primary_color;
                logger.info(`🎨 [FORM/PUBLIC] primary_color atualizado de guest_list_items: ${guestListData.primary_color}`);
            }
            // IMPORTANTE: Aplicar secondary_color mesmo se for null (pode ser intencional)
            // Mas verificar se não é string vazia
            if (guestListData.secondary_color !== undefined) {
                if (guestListData.secondary_color === null || 
                    (typeof guestListData.secondary_color === 'string' && guestListData.secondary_color.trim() === '')) {
                    // Se for null ou vazio, usar primary_color como fallback
                    formData.secondary_color = guestListData.primary_color || formData.primary_color || '#4A90E2';
                    logger.info(`🎨 [FORM/PUBLIC] secondary_color era null/vazio, usando primary_color: ${formData.secondary_color}`);
                } else {
                    formData.secondary_color = guestListData.secondary_color;
                    logger.info(`🎨 [FORM/PUBLIC] secondary_color atualizado de guest_list_items: ${guestListData.secondary_color}`);
                }
            }
            if (guestListData.text_color) {
                formData.text_color = guestListData.text_color;
            }
            if (guestListData.background_color) {
                formData.background_color = guestListData.background_color;
            }
            if (guestListData.header_image_url) {
                formData.header_image_url = guestListData.header_image_url;
            }
            if (guestListData.background_image_url) {
                formData.background_image_url = guestListData.background_image_url;
            }
            if (guestListData.background_opacity !== null && guestListData.background_opacity !== undefined) {
                formData.background_opacity = guestListData.background_opacity;
            }
            if (guestListData.theme) {
                formData.theme = guestListData.theme;
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
            
            logger.info(`🎨 [FORM/PUBLIC] Dados finais após mesclar guest_list_items:`, {
                primary_color: formData.primary_color,
                secondary_color: formData.secondary_color,
                text_color: formData.text_color,
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
            logger.info(`ℹ️ [FORM/PUBLIC] Cores e configurações que serão usadas (de digital_form_items):`, {
                primary_color: formData.primary_color,
                secondary_color: formData.secondary_color,
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
        
        // IMPORTANTE: Aplicar fallback de secondary_color APENAS se não foi encontrado em guest_list_items
        // Isso garante que valores de guest_list_items não sejam sobrescritos pelo fallback
        const hasGuestListData = guestListRes.rows.length > 0;
        const hasGuestListSecondaryColor = hasGuestListData && 
            guestListRes.rows[0].secondary_color && 
            guestListRes.rows[0].secondary_color !== null &&
            guestListRes.rows[0].secondary_color !== 'null' &&
            guestListRes.rows[0].secondary_color !== 'undefined' &&
            (typeof guestListRes.rows[0].secondary_color !== 'string' || guestListRes.rows[0].secondary_color.trim() !== '');
        
        logger.info(`[SECONDARY_COLOR] Verificação:`, {
            hasGuestListData: hasGuestListData,
            hasGuestListSecondaryColor: hasGuestListSecondaryColor,
            current_secondary_color: formData.secondary_color,
            tipo: typeof formData.secondary_color
        });
        
        // Aplicar fallback APENAS se não veio de guest_list_items
        if (!hasGuestListSecondaryColor) {
            if (!formData.secondary_color || 
                formData.secondary_color === 'null' || 
                formData.secondary_color === 'undefined' ||
                formData.secondary_color === null ||
                formData.secondary_color === undefined ||
                (typeof formData.secondary_color === 'string' && formData.secondary_color.trim() === '')) {
                formData.secondary_color = formData.primary_color || '#4A90E2';
                logger.info(`[SECONDARY_COLOR] Usando fallback (primary_color): ${formData.secondary_color}`);
            } else {
                logger.info(`[SECONDARY_COLOR] Usando valor de digital_form_items: ${formData.secondary_color}`);
            }
        } else {
            logger.info(`[SECONDARY_COLOR] Usando valor de guest_list_items (não aplicar fallback): ${formData.secondary_color}`);
        }
        
        // Garantir que form_fields seja um array (pode vir como string JSON do PostgreSQL)
        if (formData.form_fields) {
            if (typeof formData.form_fields === 'string') {
                try {
                    formData.form_fields = JSON.parse(formData.form_fields);
                } catch (e) {
                    logger.error('Erro ao parsear form_fields:', e);
                    formData.form_fields = [];
                }
            }
            // Garantir que seja um array
            if (!Array.isArray(formData.form_fields)) {
                formData.form_fields = [];
            }
        } else {
            formData.form_fields = [];
        }

        // Buscar profile_slug
        const profileSlugRes = await client.query('SELECT profile_slug FROM users WHERE id = $1', [userId]);
        const profileSlug = profileSlugRes.rows[0]?.profile_slug || slug;

        // LOG FINAL ANTES DE RENDERIZAR - MUITO DETALHADO
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
        
        // Renderizar página com cache busting
        res.render('digitalForm', {
            item: item,
            formData: sanitizedFormData,
            profileSlug: profileSlug,
            slug: slug,
            itemId: itemIdInt,
            _timestamp: Date.now(), // Timestamp único para forçar atualização
            _cacheBust: `?t=${Date.now()}`, // Cache busting para assets
            _updatedAt: sanitizedFormData.updated_at ? new Date(sanitizedFormData.updated_at).getTime() : Date.now(),
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
        
        // Se slug for 'form' e itemId for um número, pode ser acesso via share_token
        // Nesse caso, buscar o userId pelo itemId
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
        } else {
            // Buscar usuário por slug
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
        
        // Buscar configurações do formulário (enable_whatsapp e enable_guest_list_submit)
        const formConfigRes = await client.query(
            `SELECT enable_whatsapp, enable_guest_list_submit 
             FROM digital_form_items 
             WHERE profile_item_id = $1`,
            [itemIdInt]
        );
        
        let enableWhatsapp = true; // Default
        let enableGuestListSubmit = false; // Default
        
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
                    
                    // Mapear campos do formulário para campos da lista de convidados
                    // IMPORTANTE: Buscar valores de múltiplos campos possíveis
                    const guestData = {
                        name: responder_name || response_data.name || response_data.nome || response_data['Nome completo'] || response_data.nome_completo || 'Visitante',
                        whatsapp: responder_phone || response_data.whatsapp || response_data.phone || response_data.telefone || response_data['Telefone/WhatsApp'] || '',
                        email: responder_email || response_data.email || response_data['Email'] || null,
                        phone: response_data.phone || response_data.telefone || response_data['Telefone'] || null,
                        document: response_data.document || response_data.cpf || response_data.cnpj || response_data['CPF'] || response_data['CNPJ'] || null,
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
                    
                    // Validar WhatsApp (obrigatório para lista de convidados)
                    if (!guestData.whatsapp || !guestData.whatsapp.trim()) {
                        // Se não tiver WhatsApp, usar phone ou email como fallback
                        guestData.whatsapp = guestData.phone || guestData.email || '';
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
                        qrToken: savedQrToken
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
            result = await client.query(`
                INSERT INTO digital_form_responses (
                    profile_item_id, response_data, responder_name, responder_email, responder_phone
                ) VALUES ($1, $2::jsonb, $3, $4, $5)
                RETURNING id, submitted_at
            `, [
                itemIdInt,
                JSON.stringify(response_data),
                responder_name || null,
                responder_email || null,
                responder_phone || null
            ]);
            
            logger.info('✅ [SUBMIT] Resposta salva no sistema (digital_form_responses)');
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
                formUrl: `/${slug}/form/${itemId}`,
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
        
        res.json({
            success: true,
            message: sendMode === 'whatsapp-only' ? 'Enviado via WhatsApp' : 'Resposta salva com sucesso',
            response_id: responseId,
            success_page_url: sendMode === 'whatsapp-only' ? null : `/${slug}/form/${itemId}/success?response_id=${responseId || ''}&show_success_page=true`,
            // Incluir dados para página de sucesso
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
        // Buscar usuário por slug
        const userRes = await client.query(
            'SELECT id FROM users WHERE profile_slug = $1 OR id = $1',
            [slug]
        );
        
        if (userRes.rows.length === 0) {
            return res.status(404).send('<h1>404 - Perfil não encontrado</h1>');
        }

        const userId = userRes.rows[0].id;
        const itemIdInt = parseInt(itemId, 10);

        if (isNaN(itemIdInt)) {
            return res.status(400).send('<h1>400 - ID do formulário inválido</h1>');
        }

        // Buscar dados do formulário (primeiro de digital_form_items)
        const formRes = await client.query(
            `SELECT dfi.form_title, dfi.enable_whatsapp, dfi.enable_guest_list_submit, 
                    dfi.whatsapp_number, dfi.primary_color, dfi.secondary_color
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
        if (response_id) {
            try {
                const responseRes = await client.query(
                    'SELECT response_data, responder_name, responder_email, responder_phone, submitted_at FROM digital_form_responses WHERE id = $1',
                    [response_id]
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
                }
            } catch (err) {
                logger.warn('Erro ao buscar dados da resposta:', err);
            }
        }

        // Determinar mensagem personalizada baseada no tipo de envio
        let successMessage = 'Obrigado por preencher o formulário. Sua resposta foi registrada com sucesso.';
        if (formData.enable_guest_list_submit === true) {
            successMessage = 'Parabéns! Sua inscrição foi realizada com sucesso. Você foi adicionado à nossa lista de convidados.';
        } else if (formData.enable_whatsapp !== false) {
            successMessage = 'Formulário enviado com sucesso! Verifique o WhatsApp para continuar o atendimento.';
        }
        
        res.render('formSuccess', {
            message: successMessage,
            responseId: response_id || null,
            formTitle: formData.form_title || 'Formulário',
            showWhatsAppInfo: formData.enable_whatsapp !== false && formData.whatsapp_number,
            whatsappNumber: formData.whatsapp_number,
            showGuestListInfo: formData.enable_guest_list_submit === true,
            formUrl: `/${slug}/form/${itemId}`,
            primaryColor: formData.primary_color || '#4A90E2',
            secondaryColor: formData.secondary_color || formData.primary_color || '#6BA3F0',
            autoRedirect: false,
            submittedData: submittedData,
            responseData: responseData
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

