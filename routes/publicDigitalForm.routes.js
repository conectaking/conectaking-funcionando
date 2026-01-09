const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const db = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { validateFormSubmission, handleValidationErrors, sanitizeResponseData } = require('../utils/formValidators');

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
    
    // Headers para evitar cache no navegador e servidor
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Last-Modified', new Date().toUTCString());
    res.set('ETag', `"${Date.now()}"`);
    
    const client = await db.pool.connect();
    
    try {
        // Buscar formulário pelo share_token (pode ser digital_form ou guest_list)
        const itemRes = await client.query(
            `SELECT pi.* 
             FROM profile_items pi
             WHERE pi.share_token = $1 AND (pi.item_type = 'digital_form' OR pi.item_type = 'guest_list') AND pi.is_active = true`,
            [token]
        );

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
        const guestListRes = await client.query(
            `SELECT primary_color, secondary_color, text_color, background_color, 
                    header_image_url, background_image_url, background_opacity, theme, updated_at
             FROM guest_list_items 
             WHERE profile_item_id = $1 
             ORDER BY updated_at DESC NULLS LAST, id DESC 
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
        if (formData.form_fields) {
            if (typeof formData.form_fields === 'string') {
                try {
                    formData.form_fields = JSON.parse(formData.form_fields);
                } catch (e) {
                    logger.error('Erro ao parsear form_fields:', e);
                    formData.form_fields = [];
                }
            }
            if (!Array.isArray(formData.form_fields)) {
                formData.form_fields = [];
            }
        } else {
            formData.form_fields = [];
        }

        // Buscar profile_slug
        const profileSlugRes = await client.query('SELECT profile_slug FROM users WHERE id = $1', [userId]);
        const profileSlug = profileSlugRes.rows[0]?.profile_slug || userId;

        // Garantir que show_logo_corner esteja disponível (pode não existir em versões antigas)
        if (formData.show_logo_corner === undefined) {
            formData.show_logo_corner = false;
        }
        
        // Renderizar página
        res.render('digitalForm', {
            item: item,
            formData: formData,
            profileSlug: profileSlug,
            slug: profileSlug,
            itemId: itemIdInt
        });

    } catch (error) {
        logger.error('Erro ao carregar formulário via share_token:', error);
        return res.status(500).send('<h1>500 - Erro ao carregar formulário</h1>');
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
    
    // Headers para evitar cache no navegador e servidor
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Last-Modified', new Date().toUTCString());
    res.set('ETag', `"${Date.now()}"`);
    
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
             ORDER BY updated_at DESC NULLS LAST, id DESC 
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
            logger.warn(`⚠️ [FORM/PUBLIC] Nenhum dado encontrado em guest_list_items para item ${itemIdInt} - usando cores de digital_form_items`);
            logger.info(`ℹ️ [FORM/PUBLIC] Cores que serão usadas (de digital_form_items):`, {
                primary_color: formData.primary_color,
                secondary_color: formData.secondary_color
            });
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
            primary_color: formData.primary_color,
            primary_color_type: typeof formData.primary_color,
            secondary_color: formData.secondary_color,
            secondary_color_type: typeof formData.secondary_color,
            text_color: formData.text_color,
            theme: formData.theme,
            enable_whatsapp: formData.enable_whatsapp,
            enable_guest_list_submit: formData.enable_guest_list_submit,
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
        
        if (!formData.secondary_color || formData.secondary_color === '#6BA3F0' || formData.secondary_color === '#4A90E2') {
            logger.warn('⚠️ [FORM/PUBLIC] ATENÇÃO: secondary_color pode estar com valor padrão!', {
                secondary_color: formData.secondary_color,
                primary_color: formData.primary_color,
                itemId: itemIdInt
            });
        }

        // HEADERS ANTI-CACHE AGRESSIVOS
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Last-Modified': new Date().toUTCString(),
            'ETag': `"${Date.now()}-${itemIdInt}"`,
            'X-Timestamp': Date.now().toString(),
            'X-Form-Updated-At': formData.updated_at ? new Date(formData.updated_at).toISOString() : 'unknown'
        });

        // Registrar evento 'view' de analytics (será feito via JavaScript no frontend)
        
        // Renderizar página
        res.render('digitalForm', {
            item: item,
            formData: formData,
            profileSlug: profileSlug,
            slug: slug,
            itemId: itemIdInt,
            _timestamp: Date.now(), // Adicionar timestamp para forçar atualização
            _debug: {
                primary_color: formData.primary_color,
                secondary_color: formData.secondary_color,
                updated_at: formData.updated_at
            }
        });

    } catch (error) {
        logger.error('Erro ao carregar formulário digital:', error);
        return res.status(500).send('<h1>500 - Erro ao carregar formulário</h1>');
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
    
    // Sanitizar todos os inputs
    response_data = sanitizeResponseData(response_data);
    responder_name = responder_name ? sanitizeResponseData({ name: responder_name }).name : null;
    responder_email = responder_email ? sanitizeResponseData({ email: responder_email }).email : null;
    responder_phone = responder_phone ? sanitizeResponseData({ phone: responder_phone }).phone : null;
    
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

        if (!response_data || typeof response_data !== 'object') {
            return res.status(400).json({ message: 'Dados de resposta são obrigatórios' });
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
        
        if (formConfigRes.rows.length > 0) {
            enableGuestListSubmit = formConfigRes.rows[0].enable_guest_list_submit === true || formConfigRes.rows[0].enable_guest_list_submit === 'true' || formConfigRes.rows[0].enable_guest_list_submit === 1 || formConfigRes.rows[0].enable_guest_list_submit === '1';
            // IMPORTANTE: Se "Salvar na Lista" está ativo, WhatsApp deve ser false
            enableWhatsapp = enableGuestListSubmit ? false : (formConfigRes.rows[0].enable_whatsapp !== false && formConfigRes.rows[0].enable_whatsapp !== 'false' && formConfigRes.rows[0].enable_whatsapp !== 0 && formConfigRes.rows[0].enable_whatsapp !== '0');
        }
        
        logger.info('🔍 [SUBMIT] Configurações do formulário:', {
            enableWhatsapp,
            enableGuestListSubmit,
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
                    
                    // Inserir na lista de convidados
                    const guestInsertResult = await client.query(`
                        INSERT INTO guests (
                            guest_list_id, name, email, phone, whatsapp, document, 
                            address, neighborhood, city, state, zipcode, instagram,
                            status, registration_source, custom_responses
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'registered', 'form', $13::jsonb)
                        RETURNING id
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
                        JSON.stringify(guestData.custom_responses)
                    ]);
                    
                    logger.info('✅ [SUBMIT] Convidado salvo na lista via formulário', { 
                        itemId: itemIdInt, 
                        guestListItemId,
                        guestId: guestInsertResult.rows[0]?.id
                    });
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

        // Inserir resposta (sempre salvar resposta do formulário também)
        const result = await client.query(`
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
            // Renderizar página de sucesso
            return res.render('formSuccess', {
                message: 'Obrigado por preencher o formulário. Sua resposta foi registrada com sucesso.',
                responseId: result.rows[0].id,
                formTitle: formData.form_title || 'Formulário',
                showWhatsAppInfo: formData.enable_whatsapp !== false && formData.whatsapp_number,
                whatsappNumber: formData.whatsapp_number,
                showGuestListInfo: formData.enable_guest_list_submit === true,
                formUrl: `/${slug}/form/${itemId}`,
                primaryColor: formData.primary_color || '#4A90E2',
                secondaryColor: formData.secondary_color || formData.primary_color || '#6BA3F0',
                autoRedirect: false
            });
        }

        // IMPORTANTE: Validar se a resposta foi salva corretamente
        if (!result || !result.rows || result.rows.length === 0) {
            logger.error('❌ [SUBMIT] Erro crítico: Resposta não foi salva no banco de dados', {
                itemId: itemIdInt,
                responseData: response_data
            });
            return res.status(500).json({ 
                success: false,
                message: 'Erro ao salvar resposta no banco de dados',
                error: 'Resposta não foi inserida'
            });
        }
        
        logger.info('✅ [SUBMIT] Resposta salva com sucesso - retornando JSON', {
            response_id: result.rows[0].id,
            itemId: itemIdInt,
            shouldSaveToGuestList,
            enableGuestListSubmit,
            enableWhatsapp
        });
        
        res.json({
            success: true,
            message: 'Resposta salva com sucesso',
            response_id: result.rows[0].id,
            success_page_url: `/${slug}/form/${itemId}/success?response_id=${result.rows[0].id}`
        });

    } catch (error) {
        logger.error('Erro ao salvar resposta do formulário:', error);
        res.status(500).json({ message: 'Erro ao salvar resposta', error: error.message });
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

        // Buscar dados do formulário
        const formRes = await client.query(
            `SELECT dfi.form_title, dfi.enable_whatsapp, dfi.enable_guest_list_submit, 
                    dfi.whatsapp_number, dfi.primary_color, dfi.secondary_color
             FROM digital_form_items dfi
             INNER JOIN profile_items pi ON pi.id = dfi.profile_item_id
             WHERE dfi.profile_item_id = $1 AND pi.user_id = $2`,
            [itemIdInt, userId]
        );

        if (formRes.rows.length === 0) {
            return res.status(404).send('<h1>404 - Formulário não encontrado</h1>');
        }

        const formData = formRes.rows[0];
        
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

        res.render('formSuccess', {
            message: 'Obrigado por preencher o formulário. Sua resposta foi registrada com sucesso.',
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

