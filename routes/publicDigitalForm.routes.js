const express = require('express');
const router = express.Router();
const db = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Rota pública: GET /form/share/:token
 * Acesso via link compartilhável (formulário oculto do cartão público)
 */
router.get('/form/share/:token', asyncHandler(async (req, res) => {
    const { token } = req.params;
    
    // Headers para evitar cache
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
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

        // Buscar dados do formulário com verificação de colunas
        const columnCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'digital_form_items' 
            AND column_name IN ('enable_whatsapp', 'enable_guest_list_submit')
        `);
        
        const hasEnableWhatsapp = columnCheck.rows.some(r => r.column_name === 'enable_whatsapp');
        const hasEnableGuestListSubmit = columnCheck.rows.some(r => r.column_name === 'enable_guest_list_submit');
        
        let formRes;
        if (hasEnableWhatsapp || hasEnableGuestListSubmit) {
            formRes = await client.query(
                `SELECT dfi.*, 
                        ${hasEnableWhatsapp ? 'COALESCE(dfi.enable_whatsapp, true) as enable_whatsapp' : 'true as enable_whatsapp'},
                        ${hasEnableGuestListSubmit ? 'COALESCE(dfi.enable_guest_list_submit, false) as enable_guest_list_submit' : 'false as enable_guest_list_submit'}
                 FROM digital_form_items dfi 
                 WHERE dfi.profile_item_id = $1`,
                [itemIdInt]
            );
        } else {
            formRes = await client.query(
                'SELECT *, true as enable_whatsapp, false as enable_guest_list_submit FROM digital_form_items WHERE profile_item_id = $1',
                [itemIdInt]
            );
        }

        if (formRes.rows.length === 0) {
            return res.status(404).send('<h1>404 - Dados do formulário não encontrados</h1>');
        }

        let formData = formRes.rows[0];
        
        // Garantir valores padrão para enable_whatsapp e enable_guest_list_submit
        if (formData.enable_whatsapp === undefined || formData.enable_whatsapp === null) {
            formData.enable_whatsapp = true; // Default true
        }
        if (formData.enable_guest_list_submit === undefined || formData.enable_guest_list_submit === null) {
            formData.enable_guest_list_submit = false; // Default false
        }
        
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
    
    // Headers para evitar cache
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
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
        const itemRes = await client.query(
            `SELECT pi.* 
             FROM profile_items pi
             WHERE pi.id = $1 AND pi.user_id = $2 AND (pi.item_type = 'digital_form' OR pi.item_type = 'guest_list') AND pi.is_active = true
             AND (pi.is_listed IS NULL OR pi.is_listed = true)`,
            [itemIdInt, userId]
        );

        if (itemRes.rows.length === 0) {
            return res.status(404).send('<h1>404 - Formulário não encontrado</h1><p>Este formulário não está disponível publicamente. Use o link compartilhável se você tiver um.</p>');
        }

        const item = itemRes.rows[0];

        // Buscar dados do formulário (pode ser digital_form ou guest_list)
        // Verificar se as colunas existem antes de selecionar
        const columnCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'digital_form_items' 
            AND column_name IN ('enable_whatsapp', 'enable_guest_list_submit')
        `);
        
        const hasEnableWhatsapp = columnCheck.rows.some(r => r.column_name === 'enable_whatsapp');
        const hasEnableGuestListSubmit = columnCheck.rows.some(r => r.column_name === 'enable_guest_list_submit');
        
        let formRes;
        if (hasEnableWhatsapp || hasEnableGuestListSubmit) {
            formRes = await client.query(
                `SELECT dfi.*, 
                        ${hasEnableWhatsapp ? 'COALESCE(dfi.enable_whatsapp, true) as enable_whatsapp' : 'true as enable_whatsapp'},
                        ${hasEnableGuestListSubmit ? 'COALESCE(dfi.enable_guest_list_submit, false) as enable_guest_list_submit' : 'false as enable_guest_list_submit'}
                 FROM digital_form_items dfi 
                 WHERE dfi.profile_item_id = $1`,
                [itemIdInt]
            );
        } else {
            formRes = await client.query(
                'SELECT *, true as enable_whatsapp, false as enable_guest_list_submit FROM digital_form_items WHERE profile_item_id = $1',
                [itemIdInt]
            );
        }

        if (formRes.rows.length === 0) {
            return res.status(404).send('<h1>404 - Dados do formulário não encontrados</h1>');
        }

        let formData = formRes.rows[0];
        
        // Garantir valores padrão para enable_whatsapp e enable_guest_list_submit
        if (formData.enable_whatsapp === undefined || formData.enable_whatsapp === null) {
            formData.enable_whatsapp = true; // Default true
        }
        if (formData.enable_guest_list_submit === undefined || formData.enable_guest_list_submit === null) {
            formData.enable_guest_list_submit = false; // Default false
        }
        
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

        // Registrar evento 'view' de analytics (será feito via JavaScript no frontend)
        
        // Renderizar página
        res.render('digitalForm', {
            item: item,
            formData: formData,
            profileSlug: profileSlug,
            slug: slug,
            itemId: itemIdInt
        });

    } catch (error) {
        logger.error('Erro ao carregar formulário digital:', error);
        return res.status(500).send('<h1>500 - Erro ao carregar formulário</h1>');
    } finally {
        client.release();
    }
}));

// POST /:slug/form/:itemId/submit - Salvar resposta do formulário (público)
router.post('/:slug/form/:itemId/submit', asyncHandler(async (req, res) => {
    const { slug, itemId } = req.params;
    const { response_data, responder_name, responder_email, responder_phone } = req.body;
    
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
        
        // Se for guest_list, verificar se enable_guest_list_submit está ativo
        let shouldSaveToGuestList = false;
        if (isGuestList) {
            const formDataRes = await client.query(
                'SELECT enable_guest_list_submit FROM digital_form_items WHERE profile_item_id = $1',
                [itemIdInt]
            );
            if (formDataRes.rows.length > 0) {
                shouldSaveToGuestList = formDataRes.rows[0].enable_guest_list_submit === true;
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
                    const guestData = {
                        name: responder_name || response_data.name || response_data.nome || 'Visitante',
                        whatsapp: responder_phone || response_data.whatsapp || response_data.phone || '',
                        email: responder_email || response_data.email || null,
                        phone: response_data.phone || null,
                        document: response_data.document || response_data.cpf || response_data.cnpj || null,
                        address: response_data.address || response_data.endereco || null,
                        neighborhood: response_data.neighborhood || response_data.bairro || null,
                        city: response_data.city || response_data.cidade || null,
                        state: response_data.state || response_data.estado || null,
                        zipcode: response_data.zipcode || response_data.cep || null,
                        instagram: response_data.instagram || null,
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
                    
                    // Inserir na lista de convidados
                    await client.query(`
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
                    
                    logger.info('Convidado salvo na lista via formulário', { itemId: itemIdInt, guestListItemId });
                }
            } catch (guestListError) {
                logger.error('Erro ao salvar na lista de convidados:', guestListError);
                // Continuar mesmo se falhar, para salvar a resposta normal
            }
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

        res.json({
            success: true,
            message: 'Resposta salva com sucesso',
            response_id: result.rows[0].id
        });

    } catch (error) {
        logger.error('Erro ao salvar resposta do formulário:', error);
        res.status(500).json({ message: 'Erro ao salvar resposta', error: error.message });
    } finally {
        client.release();
    }
}));

module.exports = router;

