const express = require('express');
const router = express.Router();
const db = require('../db');
const { protectUser } = require('../middleware/protectUser');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * GET /api/guest-lists - Listar listas de convidados do usuário
 */
router.get('/', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        
        const result = await client.query(`
            SELECT 
                pi.id as profile_item_id,
                pi.user_id,
                pi.item_type,
                pi.title,
                pi.is_active,
                pi.display_order,
                pi.created_at as profile_created_at,
                gli.id as guest_list_item_id,
                gli.event_title,
                gli.event_description,
                gli.event_date,
                gli.event_location,
                gli.registration_token,
                gli.confirmation_token,
                gli.max_guests,
                gli.allow_self_registration,
                gli.require_confirmation,
                gli.custom_form_fields,
                gli.use_custom_form,
                gli.public_view_token,
                COALESCE(gli.primary_color, '#FFC700') as primary_color,
                COALESCE(gli.text_color, '#ECECEC') as text_color,
                COALESCE(gli.background_color, '#0D0D0F') as background_color,
                gli.secondary_color,
                gli.header_image_url,
                gli.background_image_url,
                COALESCE(gli.background_opacity, 1.0) as background_opacity,
                COALESCE(gli.theme, 'dark') as theme,
                COUNT(DISTINCT g.id) FILTER (WHERE g.status = 'registered') as registered_count,
                COUNT(DISTINCT g.id) FILTER (WHERE g.status = 'confirmed') as confirmed_count,
                COUNT(DISTINCT g.id) FILTER (WHERE g.status = 'checked_in') as checked_in_count
            FROM profile_items pi
            INNER JOIN guest_list_items gli ON gli.profile_item_id = pi.id
            LEFT JOIN guests g ON g.guest_list_id = gli.id
            WHERE pi.user_id = $1 AND pi.is_active = true
            GROUP BY pi.id, pi.user_id, pi.item_type, pi.title, pi.is_active, pi.display_order, 
                     pi.created_at, gli.id, gli.event_title, gli.event_description, 
                     gli.event_date, gli.event_location, gli.registration_token, gli.confirmation_token, 
                     gli.max_guests, gli.allow_self_registration, gli.require_confirmation,
                     gli.custom_form_fields, gli.use_custom_form, gli.public_view_token,
                     gli.primary_color, gli.text_color, gli.background_color, gli.secondary_color,
                     gli.header_image_url, gli.background_image_url, gli.background_opacity, gli.theme
            ORDER BY pi.display_order ASC, pi.created_at DESC
        `, [userId]);
        
        // Garantir que id seja o profile_item_id
        const lists = result.rows.map(row => ({
            ...row,
            id: row.profile_item_id
        }));
        
        res.json(lists);
    } catch (error) {
        logger.error('Erro ao listar listas de convidados:', error);
        res.status(500).json({ message: 'Erro ao listar listas', error: error.message });
    } finally {
        client.release();
    }
}));

/**
 * POST /api/guest-lists - Criar nova lista de convidados
 */
router.post('/', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const {
            title,
            event_title,
            event_description,
            event_date,
            event_time,
            event_location,
            max_guests,
            require_confirmation,
            allow_self_registration,
            use_existing_profile_item,
            profile_item_id,
            primary_color,
            text_color,
            background_color,
            header_image_url,
            background_image_url,
            background_opacity,
            theme
        } = req.body;
        
        // Gerar tokens únicos
        const registrationToken = crypto.randomBytes(16).toString('hex');
        const confirmationToken = crypto.randomBytes(16).toString('hex');
        const publicViewToken = crypto.randomBytes(16).toString('hex');
        
        let profileItemId;
        
        // Se use_existing_profile_item é true e profile_item_id foi fornecido, usar o existente
        if (use_existing_profile_item && profile_item_id) {
            // Verificar se o profile_item pertence ao usuário
            const existingItemResult = await client.query(`
                SELECT id, item_type FROM profile_items 
                WHERE id = $1 AND user_id = $2
            `, [profile_item_id, String(userId)]);
            
            if (existingItemResult.rows.length === 0) {
                return res.status(404).json({ message: 'Profile item não encontrado' });
            }
            
            profileItemId = existingItemResult.rows[0].id;
            
            // Verificar se já existe uma guest_list_item associada
            const existingGuestListResult = await client.query(`
                SELECT id FROM guest_list_items WHERE profile_item_id = $1
            `, [profileItemId]);
            
            if (existingGuestListResult.rows.length > 0) {
                // Já existe, retornar o existente
                return res.status(400).json({ 
                    message: 'Lista de convidados já associada a este formulário',
                    id: profileItemId,
                    guest_list_item_id: existingGuestListResult.rows[0].id
                });
            }
        } else {
            // Criar novo profile_item - usar parâmetros separados para evitar erro de tipo inconsistente
            const itemTitle = title || event_title || 'Nova Lista de Convidados';
            const userIdStr = String(userId);
            
            // Primeiro obter o próximo display_order
            const orderResult = await client.query(`
                SELECT COALESCE(MAX(display_order), 0) + 1 as next_order
                FROM profile_items 
                WHERE user_id = $1
            `, [userIdStr]);
            
            const nextOrder = orderResult.rows[0].next_order;
            
            // Agora inserir com o display_order calculado
            const itemResult = await client.query(`
                INSERT INTO profile_items (user_id, item_type, title, is_active, display_order)
                VALUES ($1, 'guest_list', $2, true, $3)
                RETURNING id
            `, [userIdStr, itemTitle, nextOrder]);
            
            profileItemId = itemResult.rows[0].id;
        }
        
        // Campos customizados (se fornecidos)
        const customFormFields = req.body.custom_form_fields || [];
        const useCustomForm = req.body.use_custom_form === true;
        
        // Criar guest_list_item
        const guestListResult = await client.query(`
            INSERT INTO guest_list_items (
                profile_item_id, event_title, event_description, event_date, event_time,
                event_location, max_guests, require_confirmation, allow_self_registration,
                registration_token, confirmation_token, public_view_token,
                custom_form_fields, use_custom_form,
                primary_color, text_color, background_color,
                header_image_url, background_image_url, background_opacity, theme
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
            RETURNING *
        `, [
            profileItemId,
            event_title || 'Evento',
            event_description || null,
            event_date || null,
            event_time || null,
            event_location || null,
            max_guests || null,
            require_confirmation !== undefined ? require_confirmation : true,
            allow_self_registration !== undefined ? allow_self_registration : true,
            registrationToken,
            confirmationToken,
            publicViewToken,
            JSON.stringify(customFormFields),
            useCustomForm,
            primary_color || '#4A90E2',
            text_color || '#333333',
            background_color || '#FFFFFF',
            header_image_url || null,
            background_image_url || null,
            background_opacity !== undefined ? parseFloat(background_opacity) : 1.0,
            theme || 'light'
        ]);
        
        // Retornar dados consistentes
        if (use_existing_profile_item && profile_item_id) {
            res.json({
                id: profileItemId,
                profile_item_id: profileItemId,
                guest_list_item_id: guestListResult.rows[0].id,
                guest_list_data: guestListResult.rows[0]
            });
        } else {
            const itemResult = await client.query(`
                SELECT * FROM profile_items WHERE id = $1
            `, [profileItemId]);
            
            res.json({
                ...itemResult.rows[0],
                guest_list_item_id: guestListResult.rows[0].id,
                guest_list_data: guestListResult.rows[0]
            });
        }
    } catch (error) {
        logger.error('Erro ao criar lista de convidados:', error);
        res.status(500).json({ message: 'Erro ao criar lista', error: error.message });
    } finally {
        client.release();
    }
}));

/**
 * GET /api/guest-lists/:id - Obter lista específica (ADM)
 */
router.get('/:id', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const listId = parseInt(req.params.id, 10);
        
        if (isNaN(listId)) {
            return res.status(400).json({ message: 'ID da lista inválido' });
        }
        
        logger.info(`Buscando lista de convidados: listId=${listId}, userId=${userId}`);
        
        // Primeiro, verificar se o profile_item existe e pertence ao usuário
        const profileItemCheck = await client.query(`
            SELECT id, item_type, title, user_id
            FROM profile_items
            WHERE id = $1 AND user_id = $2
        `, [listId, userId]);
        
        if (profileItemCheck.rows.length === 0) {
            logger.warn(`Profile item não encontrado ou não pertence ao usuário: listId=${listId}, userId=${userId}`);
            return res.status(404).json({ 
                message: 'Item não encontrado ou você não tem permissão para acessá-lo',
                code: 'PROFILE_ITEM_NOT_FOUND'
            });
        }
        
        const profileItem = profileItemCheck.rows[0];
        logger.info(`Profile item encontrado: id=${profileItem.id}, item_type=${profileItem.item_type}, title=${profileItem.title}`);
        
        // IMPORTANTE: Verificar quais colunas de logo existem em guest_list_items
        const logoColumnsCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'guest_list_items' 
            AND column_name IN ('form_logo_url', 'button_logo_url', 'button_logo_size', 'show_logo_corner', 'enable_whatsapp', 'enable_guest_list_submit')
        `);
        const hasFormLogoUrl = logoColumnsCheck.rows.some(r => r.column_name === 'form_logo_url');
        const hasButtonLogoUrl = logoColumnsCheck.rows.some(r => r.column_name === 'button_logo_url');
        const hasButtonLogoSize = logoColumnsCheck.rows.some(r => r.column_name === 'button_logo_size');
        const hasShowLogoCorner = logoColumnsCheck.rows.some(r => r.column_name === 'show_logo_corner');
        const hasEnableWhatsapp = logoColumnsCheck.rows.some(r => r.column_name === 'enable_whatsapp');
        const hasEnableGuestListSubmit = logoColumnsCheck.rows.some(r => r.column_name === 'enable_guest_list_submit');
        
        // Construir SELECT dinamicamente
        let selectFields = `
                pi.id as profile_item_id,
                pi.user_id,
                pi.item_type,
                pi.title,
                pi.is_active,
                pi.display_order,
                pi.created_at as profile_created_at,
                gli.id as guest_list_item_id,
                gli.event_title,
                gli.event_description,
                gli.event_date,
                gli.event_location,
                gli.registration_token,
                gli.confirmation_token,
                gli.max_guests,
                gli.allow_self_registration,
                gli.require_confirmation,
                gli.custom_form_fields,
                gli.use_custom_form,
                gli.public_view_token,
                COALESCE(gli.primary_color, '#FFC700') as primary_color,
                COALESCE(gli.text_color, '#ECECEC') as text_color,
                COALESCE(gli.background_color, '#0D0D0F') as background_color,
                gli.secondary_color,
                gli.header_image_url,
                gli.background_image_url,
                COALESCE(gli.background_opacity, 1.0) as background_opacity,
                COALESCE(gli.theme, 'dark') as theme,
                gli.created_at as guest_list_created_at,
                gli.updated_at as guest_list_updated_at`;
        
        if (hasFormLogoUrl) selectFields += ', gli.form_logo_url';
        if (hasButtonLogoUrl) selectFields += ', gli.button_logo_url';
        if (hasButtonLogoSize) selectFields += ', gli.button_logo_size';
        if (hasShowLogoCorner) selectFields += ', gli.show_logo_corner';
        if (hasEnableWhatsapp) selectFields += ', gli.enable_whatsapp';
        if (hasEnableGuestListSubmit) selectFields += ', gli.enable_guest_list_submit';
        
        // Buscar lista de convidados associada
        let result = await client.query(`
            SELECT ${selectFields}
            FROM profile_items pi
            LEFT JOIN guest_list_items gli ON gli.profile_item_id = pi.id
            WHERE pi.id = $1 AND pi.user_id = $2
        `, [listId, userId]);
        
        // Se não encontrar lista associada, mas o profile_item existe, criar uma lista básica
        if (result.rows.length === 0 || !result.rows[0].guest_list_item_id) {
            logger.info(`Nenhuma lista de convidados associada ao profile_item ${listId}. Verificando se é digital_form...`);
            
            // Se não encontrar, tentar buscar pelo id da guest_list_items
            const guestListByItemId = await client.query(`
                SELECT 
                    pi.id as profile_item_id,
                    pi.user_id,
                    pi.item_type,
                    pi.title,
                    pi.is_active,
                    pi.display_order,
                    pi.created_at as profile_created_at,
                    gli.id as guest_list_item_id,
                    gli.event_title,
                    gli.event_description,
                    gli.event_date,
                    gli.event_location,
                    gli.registration_token,
                    gli.confirmation_token,
                    gli.max_guests,
                    gli.allow_self_registration,
                    gli.require_confirmation,
                    gli.custom_form_fields,
                    gli.use_custom_form,
                    gli.public_view_token,
                    COALESCE(gli.primary_color, '#FFC700') as primary_color,
                    COALESCE(gli.text_color, '#ECECEC') as text_color,
                    COALESCE(gli.background_color, '#0D0D0F') as background_color,
                    gli.secondary_color,
                    gli.header_image_url,
                    gli.background_image_url,
                    COALESCE(gli.background_opacity, 1.0) as background_opacity,
                    COALESCE(gli.theme, 'dark') as theme,
                    gli.created_at as guest_list_created_at,
                    gli.updated_at as guest_list_updated_at
                FROM guest_list_items gli
                INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
                WHERE gli.id = $1 AND pi.user_id = $2
            `, [listId, userId]);
            
            if (guestListByItemId.rows.length > 0) {
                result = guestListByItemId;
            } else {
                // Se o item existe mas não tem lista associada, criar uma lista básica automaticamente
                logger.info(`Criando lista de convidados automaticamente para profile_item ${listId}`);
                
                // Gerar tokens únicos (crypto já está importado no topo do arquivo)
                const registrationToken = crypto.randomBytes(16).toString('hex');
                const confirmationToken = crypto.randomBytes(16).toString('hex');
                const publicViewToken = crypto.randomBytes(16).toString('hex');
                
                const createResult = await client.query(`
                    INSERT INTO guest_list_items (
                        profile_item_id,
                        event_title,
                        event_description,
                        registration_token,
                        confirmation_token,
                        public_view_token,
                        allow_self_registration,
                        require_confirmation,
                        max_guests,
                        created_at,
                        updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
                    RETURNING *
                `, [
                    listId,
                    profileItem.title || 'Lista de Convidados',
                    '',
                    registrationToken,
                    confirmationToken,
                    publicViewToken,
                    true,
                    true,
                    null
                ]);
                
                logger.info(`Lista de convidados criada automaticamente: guest_list_item_id=${createResult.rows[0].id}`);
                
                // Buscar novamente com os dados completos
                result = await client.query(`
                    SELECT 
                        pi.id as profile_item_id,
                        pi.user_id,
                        pi.item_type,
                        pi.title,
                        pi.is_active,
                        pi.display_order,
                        pi.created_at as profile_created_at,
                        gli.id as guest_list_item_id,
                        gli.event_title,
                        gli.event_description,
                        gli.event_date,
                        gli.event_location,
                        gli.registration_token,
                        gli.confirmation_token,
                        gli.max_guests,
                        gli.allow_self_registration,
                        gli.require_confirmation,
                        gli.custom_form_fields,
                        gli.use_custom_form,
                        gli.public_view_token,
                        COALESCE(gli.primary_color, '#FFC700') as primary_color,
                        COALESCE(gli.text_color, '#ECECEC') as text_color,
                        COALESCE(gli.background_color, '#0D0D0F') as background_color,
                        gli.secondary_color,
                        gli.header_image_url,
                        gli.background_image_url,
                        COALESCE(gli.background_opacity, 1.0) as background_opacity,
                        COALESCE(gli.theme, 'dark') as theme,
                        gli.created_at as guest_list_created_at,
                        gli.updated_at as guest_list_updated_at
                    FROM profile_items pi
                    INNER JOIN guest_list_items gli ON gli.profile_item_id = pi.id
                    WHERE pi.id = $1 AND pi.user_id = $2
                `, [listId, userId]);
            }
        }
        
        if (result.rows.length === 0) {
            logger.warn(`Lista não encontrada após todas as tentativas: listId=${listId}, userId=${userId}`);
            return res.status(404).json({ 
                message: 'Lista de convidados não encontrada. Certifique-se de que o item foi convertido para lista de convidados.',
                code: 'GUEST_LIST_NOT_FOUND'
            });
        }
        
        const listData = result.rows[0];
        // Garantir que o id principal seja o profile_item_id
        listData.id = listData.profile_item_id;
        
        logger.info(`Lista encontrada: profile_item_id=${listData.profile_item_id}, guest_list_item_id=${listData.guest_list_item_id}`);
        res.json(listData);
    } catch (error) {
        logger.error('Erro ao buscar lista:', error);
        res.status(500).json({ message: 'Erro ao buscar lista', error: error.message });
    } finally {
        client.release();
    }
}));

/**
 * PUT /api/guest-lists/:id - Atualizar lista de convidados
 */
router.put('/:id', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const listId = parseInt(req.params.id, 10);
        const {
            title,
            event_title,
            event_description,
            event_date,
            event_time,
            event_location,
            max_guests,
            require_confirmation,
            allow_self_registration,
            is_active,
            display_order,
            custom_form_fields,
            use_custom_form,
            primary_color,
            text_color,
            background_color,
            header_image_url,
            background_image_url,
            background_opacity,
            theme,
            secondary_color,
            enable_whatsapp,
            enable_guest_list_submit,
            // IMPORTANTE: Incluir campos de logo
            form_logo_url,
            button_logo_url,
            button_logo_size,
            show_logo_corner
        } = req.body;
        
        // Verificar se a lista pertence ao usuário
        // Aceita tanto item_type = 'guest_list' quanto 'digital_form' (formulário convertido)
        const checkResult = await client.query(`
            SELECT pi.id, gli.id as guest_list_item_id
            FROM profile_items pi
            INNER JOIN guest_list_items gli ON gli.profile_item_id = pi.id
            WHERE pi.id = $1 AND pi.user_id = $2
        `, [listId, userId]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'Lista não encontrada' });
        }
        
        const guestListItemId = checkResult.rows[0].guest_list_item_id;
        
        // Atualizar profile_item
        if (title !== undefined || is_active !== undefined || display_order !== undefined) {
            const updateFields = [];
            const updateValues = [];
            let paramIndex = 1;
            
            if (title !== undefined) {
                updateFields.push(`title = $${paramIndex++}`);
                updateValues.push(title);
            }
            if (is_active !== undefined) {
                updateFields.push(`is_active = $${paramIndex++}`);
                updateValues.push(is_active);
            }
            if (display_order !== undefined) {
                updateFields.push(`display_order = $${paramIndex++}`);
                updateValues.push(display_order);
            }
            
            if (updateFields.length > 0) {
                updateValues.push(listId, userId);
                await client.query(`
                    UPDATE profile_items 
                    SET ${updateFields.join(', ')}
                    WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
                `, updateValues);
            }
        }
        
        // Atualizar guest_list_item
        const guestListUpdateFields = [];
        const guestListUpdateValues = [];
        let guestListParamIndex = 1;
        
        if (event_title !== undefined) {
            guestListUpdateFields.push(`event_title = $${guestListParamIndex++}`);
            guestListUpdateValues.push(event_title);
        }
        if (event_description !== undefined) {
            guestListUpdateFields.push(`event_description = $${guestListParamIndex++}`);
            guestListUpdateValues.push(event_description);
        }
        if (event_date !== undefined) {
            guestListUpdateFields.push(`event_date = $${guestListParamIndex++}`);
            guestListUpdateValues.push(event_date || null);
        }
        if (event_time !== undefined) {
            guestListUpdateFields.push(`event_time = $${guestListParamIndex++}`);
            guestListUpdateValues.push(event_time || null);
        }
        if (event_location !== undefined) {
            guestListUpdateFields.push(`event_location = $${guestListParamIndex++}`);
            guestListUpdateValues.push(event_location || null);
        }
        if (max_guests !== undefined) {
            guestListUpdateFields.push(`max_guests = $${guestListParamIndex++}`);
            guestListUpdateValues.push(max_guests || null);
        }
        if (require_confirmation !== undefined) {
            guestListUpdateFields.push(`require_confirmation = $${guestListParamIndex++}`);
            guestListUpdateValues.push(require_confirmation);
        }
        if (allow_self_registration !== undefined) {
            guestListUpdateFields.push(`allow_self_registration = $${guestListParamIndex++}`);
            guestListUpdateValues.push(allow_self_registration);
        }
        if (custom_form_fields !== undefined) {
            guestListUpdateFields.push(`custom_form_fields = $${guestListParamIndex++}::jsonb`);
            guestListUpdateValues.push(JSON.stringify(custom_form_fields));
        }
        if (use_custom_form !== undefined) {
            guestListUpdateFields.push(`use_custom_form = $${guestListParamIndex++}`);
            guestListUpdateValues.push(use_custom_form);
        }
        if (primary_color !== undefined) {
            guestListUpdateFields.push(`primary_color = $${guestListParamIndex++}`);
            guestListUpdateValues.push(primary_color);
        }
        if (text_color !== undefined) {
            guestListUpdateFields.push(`text_color = $${guestListParamIndex++}`);
            guestListUpdateValues.push(text_color);
        }
        if (background_color !== undefined) {
            guestListUpdateFields.push(`background_color = $${guestListParamIndex++}`);
            guestListUpdateValues.push(background_color);
        }
        if (header_image_url !== undefined) {
            guestListUpdateFields.push(`header_image_url = $${guestListParamIndex++}`);
            guestListUpdateValues.push(header_image_url || null);
        }
        if (background_image_url !== undefined) {
            guestListUpdateFields.push(`background_image_url = $${guestListParamIndex++}`);
            guestListUpdateValues.push(background_image_url || null);
        }
        if (background_opacity !== undefined) {
            guestListUpdateFields.push(`background_opacity = $${guestListParamIndex++}`);
            guestListUpdateValues.push(background_opacity !== null ? parseFloat(background_opacity) : 1.0);
        }
        if (theme !== undefined) {
            guestListUpdateFields.push(`theme = $${guestListParamIndex++}`);
            guestListUpdateValues.push(theme);
        }
        // Verificar se a coluna secondary_color existe antes de tentar atualizar
        if (secondary_color !== undefined) {
            try {
                // Verificar se a coluna existe
                const columnCheck = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'guest_list_items' 
                    AND column_name = 'secondary_color'
                `);
                
                if (columnCheck.rows.length > 0) {
                    // Tratar string vazia como null, mas manter valores válidos
                    const valueToSave = (secondary_color && typeof secondary_color === 'string' && secondary_color.trim() !== '' && secondary_color !== 'null' && secondary_color !== 'undefined') 
                        ? secondary_color.trim() 
                        : (secondary_color && secondary_color !== null && secondary_color !== undefined && secondary_color !== 'null' && secondary_color !== 'undefined' ? secondary_color : null);
                    
                    guestListUpdateFields.push(`secondary_color = $${guestListParamIndex++}`);
                    guestListUpdateValues.push(valueToSave);
                    
                    logger.info(`🎨 [GUEST_LIST] Salvando secondary_color: "${secondary_color}" -> "${valueToSave}" (tipo: ${typeof secondary_color})`);
                } else {
                    logger.warn('Coluna secondary_color não existe na tabela guest_list_items. Execute a migration 068.');
                }
            } catch (err) {
                logger.warn('Erro ao verificar coluna secondary_color:', err.message);
            }
        }
        
        // IMPORTANTE: Atualizar campos de logo em guest_list_items
        // Verificar se as colunas existem antes de tentar atualizar
        if (form_logo_url !== undefined) {
            try {
                const columnCheck = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'guest_list_items' 
                    AND column_name = 'form_logo_url'
                `);
                if (columnCheck.rows.length > 0) {
                    guestListUpdateFields.push(`form_logo_url = $${guestListParamIndex++}`);
                    guestListUpdateValues.push(form_logo_url || null);
                    logger.info(`🖼️ [GUEST_LIST] Salvando form_logo_url em guest_list_items: ${form_logo_url || 'null'}`);
                }
            } catch (err) {
                logger.warn('Erro ao verificar coluna form_logo_url:', err.message);
            }
        }
        
        if (button_logo_url !== undefined) {
            try {
                const columnCheck = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'guest_list_items' 
                    AND column_name = 'button_logo_url'
                `);
                if (columnCheck.rows.length > 0) {
                    guestListUpdateFields.push(`button_logo_url = $${guestListParamIndex++}`);
                    guestListUpdateValues.push(button_logo_url || null);
                    logger.info(`🖼️ [GUEST_LIST] Salvando button_logo_url em guest_list_items: ${button_logo_url || 'null'}`);
                }
            } catch (err) {
                logger.warn('Erro ao verificar coluna button_logo_url:', err.message);
            }
        }
        
        if (button_logo_size !== undefined) {
            try {
                const columnCheck = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'guest_list_items' 
                    AND column_name = 'button_logo_size'
                `);
                if (columnCheck.rows.length > 0) {
                    const parsedSize = parseInt(button_logo_size, 10);
                    const validSize = (!isNaN(parsedSize) && parsedSize >= 20 && parsedSize <= 80) ? parsedSize : 40;
                    guestListUpdateFields.push(`button_logo_size = $${guestListParamIndex++}`);
                    guestListUpdateValues.push(validSize);
                    logger.info(`🖼️ [GUEST_LIST] Salvando button_logo_size em guest_list_items: ${validSize} (recebido: ${button_logo_size})`);
                }
            } catch (err) {
                logger.warn('Erro ao verificar coluna button_logo_size:', err.message);
            }
        }
        
        if (show_logo_corner !== undefined) {
            try {
                const columnCheck = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'guest_list_items' 
                    AND column_name = 'show_logo_corner'
                `);
                if (columnCheck.rows.length > 0) {
                    const showLogoCornerValue = show_logo_corner === true || show_logo_corner === 'true' || show_logo_corner === 1 || show_logo_corner === '1';
                    guestListUpdateFields.push(`show_logo_corner = $${guestListParamIndex++}`);
                    guestListUpdateValues.push(showLogoCornerValue);
                    logger.info(`🖼️ [GUEST_LIST] Salvando show_logo_corner em guest_list_items: ${showLogoCornerValue}`);
                }
            } catch (err) {
                logger.warn('Erro ao verificar coluna show_logo_corner:', err.message);
            }
        }
        
        // IMPORTANTE: Também atualizar enable_whatsapp e enable_guest_list_submit em guest_list_items
        // Verificar se as colunas existem em guest_list_items
        if (enable_whatsapp !== undefined) {
            try {
                const columnCheck = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'guest_list_items' 
                    AND column_name = 'enable_whatsapp'
                `);
                
                if (columnCheck.rows.length > 0) {
                    const enableWhatsappValue = enable_whatsapp === true || enable_whatsapp === 'true' || enable_whatsapp === 1 || enable_whatsapp === '1';
                    guestListUpdateFields.push(`enable_whatsapp = $${guestListParamIndex++}`);
                    guestListUpdateValues.push(enableWhatsappValue);
                    logger.info(`🔘 [GUEST_LIST] Salvando enable_whatsapp em guest_list_items: ${enableWhatsappValue} (recebido: ${enable_whatsapp}, tipo: ${typeof enable_whatsapp})`);
                } else {
                    logger.warn('Coluna enable_whatsapp não existe na tabela guest_list_items.');
                }
            } catch (err) {
                logger.warn('Erro ao verificar coluna enable_whatsapp:', err.message);
            }
        }
        
        if (enable_guest_list_submit !== undefined) {
            try {
                const columnCheck = await client.query(`
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'guest_list_items' 
                    AND column_name = 'enable_guest_list_submit'
                `);
                
                if (columnCheck.rows.length > 0) {
                    const enableGuestListSubmitValue = enable_guest_list_submit === true || enable_guest_list_submit === 'true' || enable_guest_list_submit === 1 || enable_guest_list_submit === '1';
                    guestListUpdateFields.push(`enable_guest_list_submit = $${guestListParamIndex++}`);
                    guestListUpdateValues.push(enableGuestListSubmitValue);
                    logger.info(`🔘 [GUEST_LIST] Salvando enable_guest_list_submit em guest_list_items: ${enableGuestListSubmitValue} (recebido: ${enable_guest_list_submit}, tipo: ${typeof enable_guest_list_submit})`);
                } else {
                    logger.warn('Coluna enable_guest_list_submit não existe na tabela guest_list_items.');
                }
            } catch (err) {
                logger.warn('Erro ao verificar coluna enable_guest_list_submit:', err.message);
            }
        }
        
        if (guestListUpdateFields.length > 0) {
            guestListUpdateValues.push(guestListItemId);
            const updateResult = await client.query(`
                UPDATE guest_list_items 
                SET ${guestListUpdateFields.join(', ')}, updated_at = NOW()
                WHERE id = $${guestListParamIndex++}
                RETURNING *
            `, guestListUpdateValues);
            
            // LOG DETALHADO APÓS UPDATE
            if (updateResult.rows.length > 0) {
                logger.info(`✅ [GUEST_LIST] UPDATE executado com sucesso:`, {
                    guestListItemId: guestListItemId,
                    profile_item_id: listId,
                    primary_color: updateResult.rows[0].primary_color,
                    secondary_color: updateResult.rows[0].secondary_color,
                    updated_at: updateResult.rows[0].updated_at
                });
            }
        }
        
        // IMPORTANTE: Também atualizar enable_whatsapp, enable_guest_list_submit e campos de logo em digital_form_items
        // Isso garante que a página pública tenha acesso a esses valores
        if (enable_whatsapp !== undefined || enable_guest_list_submit !== undefined || 
            form_logo_url !== undefined || button_logo_url !== undefined || 
            button_logo_size !== undefined || show_logo_corner !== undefined) {
            const digitalFormUpdateFields = [];
            const digitalFormUpdateValues = [];
            let digitalFormParamIndex = 1;
            
            // Verificar se as colunas existem em digital_form_items
            const digitalFormColumnCheck = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'digital_form_items' 
                AND column_name IN ('enable_whatsapp', 'enable_guest_list_submit', 'form_logo_url', 'button_logo_url', 'button_logo_size', 'show_logo_corner')
            `);
            const hasEnableWhatsapp = digitalFormColumnCheck.rows.some(r => r.column_name === 'enable_whatsapp');
            const hasEnableGuestListSubmit = digitalFormColumnCheck.rows.some(r => r.column_name === 'enable_guest_list_submit');
            const hasFormLogoUrl = digitalFormColumnCheck.rows.some(r => r.column_name === 'form_logo_url');
            const hasButtonLogoUrl = digitalFormColumnCheck.rows.some(r => r.column_name === 'button_logo_url');
            const hasButtonLogoSize = digitalFormColumnCheck.rows.some(r => r.column_name === 'button_logo_size');
            const hasShowLogoCorner = digitalFormColumnCheck.rows.some(r => r.column_name === 'show_logo_corner');
            
            if (enable_whatsapp !== undefined && hasEnableWhatsapp) {
                const enableWhatsappValue = enable_whatsapp === true || enable_whatsapp === 'true' || enable_whatsapp === 1 || enable_whatsapp === '1';
                digitalFormUpdateFields.push(`enable_whatsapp = $${digitalFormParamIndex++}`);
                digitalFormUpdateValues.push(enableWhatsappValue);
                logger.info(`🔘 [GUEST_LIST] Salvando enable_whatsapp em digital_form_items: ${enableWhatsappValue}`);
            }
            
            if (enable_guest_list_submit !== undefined && hasEnableGuestListSubmit) {
                const enableGuestListSubmitValue = enable_guest_list_submit === true || enable_guest_list_submit === 'true' || enable_guest_list_submit === 1 || enable_guest_list_submit === '1';
                digitalFormUpdateFields.push(`enable_guest_list_submit = $${digitalFormParamIndex++}`);
                digitalFormUpdateValues.push(enableGuestListSubmitValue);
                logger.info(`🔘 [GUEST_LIST] Salvando enable_guest_list_submit em digital_form_items: ${enableGuestListSubmitValue}`);
            }
            
            // IMPORTANTE: Sincronizar campos de logo também em digital_form_items
            if (form_logo_url !== undefined && hasFormLogoUrl) {
                digitalFormUpdateFields.push(`form_logo_url = $${digitalFormParamIndex++}`);
                digitalFormUpdateValues.push(form_logo_url || null);
                logger.info(`🖼️ [GUEST_LIST] Sincronizando form_logo_url em digital_form_items: ${form_logo_url || 'null'}`);
            }
            
            if (button_logo_url !== undefined && hasButtonLogoUrl) {
                digitalFormUpdateFields.push(`button_logo_url = $${digitalFormParamIndex++}`);
                digitalFormUpdateValues.push(button_logo_url || null);
                logger.info(`🖼️ [GUEST_LIST] Sincronizando button_logo_url em digital_form_items: ${button_logo_url || 'null'}`);
            }
            
            if (button_logo_size !== undefined && hasButtonLogoSize) {
                const parsedSize = parseInt(button_logo_size, 10);
                const validSize = (!isNaN(parsedSize) && parsedSize >= 20 && parsedSize <= 80) ? parsedSize : 40;
                digitalFormUpdateFields.push(`button_logo_size = $${digitalFormParamIndex++}`);
                digitalFormUpdateValues.push(validSize);
                logger.info(`🖼️ [GUEST_LIST] Sincronizando button_logo_size em digital_form_items: ${validSize} (recebido: ${button_logo_size})`);
            }
            
            if (show_logo_corner !== undefined && hasShowLogoCorner) {
                const showLogoCornerValue = show_logo_corner === true || show_logo_corner === 'true' || show_logo_corner === 1 || show_logo_corner === '1';
                digitalFormUpdateFields.push(`show_logo_corner = $${digitalFormParamIndex++}`);
                digitalFormUpdateValues.push(showLogoCornerValue);
                logger.info(`🖼️ [GUEST_LIST] Sincronizando show_logo_corner em digital_form_items: ${showLogoCornerValue}`);
            }
            
            if (digitalFormUpdateFields.length > 0) {
                digitalFormUpdateValues.push(listId);
                await client.query(`
                    UPDATE digital_form_items 
                    SET ${digitalFormUpdateFields.join(', ')}, updated_at = NOW()
                    WHERE profile_item_id = $${digitalFormParamIndex++}
                `, digitalFormUpdateValues);
                logger.info(`✅ [GUEST_LIST] digital_form_items atualizado com enable_whatsapp/enable_guest_list_submit/logo`);
            }
        }
        
        // IMPORTANTE: Verificar quais colunas de logo existem em guest_list_items (buscar novamente para garantir)
        const logoColumnsCheckFinal = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'guest_list_items' 
            AND column_name IN ('form_logo_url', 'button_logo_url', 'button_logo_size', 'show_logo_corner', 'enable_whatsapp', 'enable_guest_list_submit')
        `);
        const hasFormLogoUrlFinal = logoColumnsCheckFinal.rows.some(r => r.column_name === 'form_logo_url');
        const hasButtonLogoUrlFinal = logoColumnsCheckFinal.rows.some(r => r.column_name === 'button_logo_url');
        const hasButtonLogoSizeFinal = logoColumnsCheckFinal.rows.some(r => r.column_name === 'button_logo_size');
        const hasShowLogoCornerFinal = logoColumnsCheckFinal.rows.some(r => r.column_name === 'show_logo_corner');
        const hasEnableWhatsappFinal = logoColumnsCheckFinal.rows.some(r => r.column_name === 'enable_whatsapp');
        const hasEnableGuestListSubmitFinal = logoColumnsCheckFinal.rows.some(r => r.column_name === 'enable_guest_list_submit');
        
        // Construir SELECT dinamicamente para dados atualizados
        let selectFieldsFinal = `
                pi.id as profile_item_id,
                pi.user_id,
                pi.item_type,
                pi.title,
                pi.is_active,
                pi.display_order,
                pi.created_at as profile_created_at,
                gli.id as guest_list_item_id,
                gli.event_title,
                gli.event_description,
                gli.event_date,
                gli.event_time,
                gli.event_location,
                gli.registration_token,
                gli.confirmation_token,
                gli.max_guests,
                gli.allow_self_registration,
                gli.require_confirmation,
                gli.custom_form_fields,
                gli.use_custom_form,
                gli.public_view_token,
                COALESCE(gli.primary_color, '#FFC700') as primary_color,
                COALESCE(gli.text_color, '#ECECEC') as text_color,
                COALESCE(gli.background_color, '#0D0D0F') as background_color,
                gli.secondary_color,
                gli.header_image_url,
                gli.background_image_url,
                COALESCE(gli.background_opacity, 1.0) as background_opacity,
                COALESCE(gli.theme, 'dark') as theme,
                gli.created_at as guest_list_created_at,
                gli.updated_at as guest_list_updated_at`;
        
        if (hasFormLogoUrlFinal) selectFieldsFinal += ', gli.form_logo_url';
        if (hasButtonLogoUrlFinal) selectFieldsFinal += ', gli.button_logo_url';
        if (hasButtonLogoSizeFinal) selectFieldsFinal += ', gli.button_logo_size';
        if (hasShowLogoCornerFinal) selectFieldsFinal += ', gli.show_logo_corner';
        if (hasEnableWhatsappFinal) selectFieldsFinal += ', gli.enable_whatsapp';
        if (hasEnableGuestListSubmitFinal) selectFieldsFinal += ', gli.enable_guest_list_submit';
        
        // Buscar dados atualizados
        const result = await client.query(`
            SELECT ${selectFieldsFinal}
            FROM profile_items pi
            INNER JOIN guest_list_items gli ON gli.profile_item_id = pi.id
            WHERE pi.id = $1
        `, [listId]);
        
        const listData = result.rows[0];
        if (listData) {
            listData.id = listData.profile_item_id;
        }
        
        res.json({
            ...listData,
            guest_list_data: listData
        });
    } catch (error) {
        logger.error('Erro ao atualizar lista de convidados:', error);
        res.status(500).json({ message: 'Erro ao atualizar lista', error: error.message });
    } finally {
        client.release();
    }
}));

/**
 * GET /api/guest-lists/:id/guests - Listar convidados de uma lista
 */
router.get('/:id/guests', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const listId = parseInt(req.params.id, 10);
        const { status } = req.query;
        
        if (isNaN(listId)) {
            return res.status(400).json({ message: 'ID da lista inválido' });
        }
        
        // Verificar se a lista pertence ao usuário - tentar por profile_item_id primeiro
        let checkResult = await client.query(`
            SELECT gli.id as guest_list_item_id
            FROM profile_items pi
            INNER JOIN guest_list_items gli ON gli.profile_item_id = pi.id
            WHERE pi.id = $1 AND pi.user_id = $2
        `, [listId, userId]);
        
        // Se não encontrar, tentar buscar pelo id da guest_list_items
        if (checkResult.rows.length === 0) {
            checkResult = await client.query(`
                SELECT gli.id as guest_list_item_id
                FROM guest_list_items gli
                INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
                WHERE gli.id = $1 AND pi.user_id = $2
            `, [listId, userId]);
        }
        
        if (checkResult.rows.length === 0) {
            // Se não encontrou, pode ser que o formulário ainda não tenha uma lista associada
            // Verificar se o profile_item existe e criar a lista automaticamente
            const profileItemCheck = await client.query(`
                SELECT id, item_type, title, user_id
                FROM profile_items
                WHERE id = $1 AND user_id = $2
            `, [listId, userId]);
            
            if (profileItemCheck.rows.length === 0) {
                logger.warn(`Profile item não encontrado: listId=${listId}, userId=${userId}`);
                return res.status(404).json({ 
                    message: 'Item não encontrado ou você não tem permissão para acessá-lo',
                    code: 'PROFILE_ITEM_NOT_FOUND'
                });
            }
            
            // Criar lista automaticamente
            const profileItem = profileItemCheck.rows[0];
            logger.info(`Criando lista de convidados automaticamente para profile_item ${listId}`);
            
            const registrationToken = crypto.randomBytes(16).toString('hex');
            const confirmationToken = crypto.randomBytes(16).toString('hex');
            const publicViewToken = crypto.randomBytes(16).toString('hex');
            
            const createResult = await client.query(`
                INSERT INTO guest_list_items (
                    profile_item_id,
                    event_title,
                    event_description,
                    registration_token,
                    confirmation_token,
                    public_view_token,
                    allow_self_registration,
                    require_confirmation,
                    max_guests,
                    created_at,
                    updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
                RETURNING id
            `, [
                listId,
                profileItem.title || 'Lista de Convidados',
                '',
                registrationToken,
                confirmationToken,
                publicViewToken,
                true,
                true,
                null
            ]);
            
            const guestListItemId = createResult.rows[0].id;
            logger.info(`Lista de convidados criada automaticamente: guest_list_item_id=${guestListItemId}`);
            
            // Retornar array vazio já que acabou de criar
            return res.json([]);
        }
        
        const guestListItemId = checkResult.rows[0].guest_list_item_id;
        
        let query = `SELECT 
            id, guest_list_id, name, email, phone, whatsapp, document, 
            address, neighborhood, city, state, zipcode, instagram, 
            status, registration_source, confirmed_at, confirmed_by, 
            checked_in_at, checked_in_by, notes, custom_responses, 
            created_at, updated_at 
        FROM guests WHERE guest_list_id = $1`;
        const params = [guestListItemId];
        let paramIndex = 2;
        
        if (status) {
            query += ` AND status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }
        
        // Busca por texto (se fornecido)
        const { search } = req.query;
        if (search && search.trim()) {
            const searchTerm = `%${search.trim()}%`;
            query += ` AND (name ILIKE $${paramIndex} OR `;
            query += `COALESCE(email, '') ILIKE $${paramIndex} OR `;
            query += `COALESCE(phone, '') ILIKE $${paramIndex} OR `;
            query += `COALESCE(whatsapp, '') ILIKE $${paramIndex} OR `;
            query += `COALESCE(document, '') ILIKE $${paramIndex} OR `;
            query += `COALESCE(instagram, '') ILIKE $${paramIndex})`;
            params.push(searchTerm);
            paramIndex++;
        }
        
        query += ' ORDER BY created_at DESC';
        
        const result = await client.query(query, params);
        
        // Parsear custom_responses se for string (PostgreSQL JSONB pode retornar como string)
        const guests = result.rows.map(row => {
            if (row.custom_responses && typeof row.custom_responses === 'string') {
                try {
                    row.custom_responses = JSON.parse(row.custom_responses);
                } catch (e) {
                    row.custom_responses = {};
                }
            } else if (!row.custom_responses) {
                row.custom_responses = {};
            }
            return row;
        });
        
        res.json(guests);
    } catch (error) {
        logger.error('Erro ao listar convidados:', error);
        res.status(500).json({ message: 'Erro ao listar convidados', error: error.message });
    } finally {
        client.release();
    }
}));

/**
 * POST /api/guest-lists/:id/guests - Adicionar convidado (ADM)
 */
router.post('/:id/guests', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const listId = parseInt(req.params.id, 10);
        const {
            name,
            email,
            phone,
            whatsapp,
            document,
            address,
            neighborhood,
            city,
            state,
            zipcode,
            instagram,
            notes
        } = req.body;
        
        if (isNaN(listId)) {
            return res.status(400).json({ message: 'ID da lista inválido' });
        }
        
        // Verificar se a lista pertence ao usuário - tentar por profile_item_id primeiro
        let checkResult = await client.query(`
            SELECT gli.id as guest_list_item_id, gli.max_guests
            FROM profile_items pi
            INNER JOIN guest_list_items gli ON gli.profile_item_id = pi.id
            WHERE pi.id = $1 AND pi.user_id = $2
        `, [listId, userId]);
        
        // Se não encontrar, tentar buscar pelo id da guest_list_items
        if (checkResult.rows.length === 0) {
            checkResult = await client.query(`
                SELECT gli.id as guest_list_item_id, gli.max_guests
                FROM guest_list_items gli
                INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
                WHERE gli.id = $1 AND pi.user_id = $2
            `, [listId, userId]);
        }
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'Lista não encontrada' });
        }
        
        const guestListItemId = checkResult.rows[0].guest_list_item_id;
        const maxGuests = checkResult.rows[0].max_guests;
        
        // Verificar limite de convidados
        if (maxGuests) {
            const countResult = await client.query(`
                SELECT COUNT(*) as count FROM guests WHERE guest_list_id = $1
            `, [guestListItemId]);
            
            if (parseInt(countResult.rows[0].count) >= maxGuests) {
                return res.status(400).json({ message: 'Limite de convidados atingido' });
            }
        }
        
        // Gerar token único para QR Code
        const qrToken = crypto.randomBytes(32).toString('hex');
        
        const result = await client.query(`
            INSERT INTO guests (
                guest_list_id, name, email, phone, whatsapp, document, 
                address, neighborhood, city, state, zipcode, instagram,
                notes, status, registration_source, qr_token, qr_code_generated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'registered', 'admin', $14, NOW())
            RETURNING *
        `, [
            guestListItemId,
            name,
            email || null,
            phone || null,
            whatsapp || null,
            document || null,
            address || null,
            neighborhood || null,
            city || null,
            state || null,
            zipcode || null,
            instagram || null,
            notes || null,
            qrToken
        ]);
        
        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Erro ao adicionar convidado:', error);
        res.status(500).json({ message: 'Erro ao adicionar convidado', error: error.message });
    } finally {
        client.release();
    }
}));

/**
 * PUT /api/guest-lists/:id/guests/:guestId - Atualizar convidado
 */
router.put('/:id/guests/:guestId', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const listId = parseInt(req.params.id, 10);
        const guestId = parseInt(req.params.guestId, 10);
        
        if (isNaN(listId) || isNaN(guestId)) {
            return res.status(400).json({ message: 'ID inválido' });
        }
        
        // Verificar se a lista pertence ao usuário - tentar por profile_item_id primeiro
        let checkResult = await client.query(`
            SELECT gli.id as guest_list_item_id
            FROM profile_items pi
            INNER JOIN guest_list_items gli ON gli.profile_item_id = pi.id
            WHERE pi.id = $1 AND pi.user_id = $2
        `, [listId, userId]);
        
        // Se não encontrar, tentar buscar pelo id da guest_list_items
        if (checkResult.rows.length === 0) {
            checkResult = await client.query(`
                SELECT gli.id as guest_list_item_id
                FROM guest_list_items gli
                INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
                WHERE gli.id = $1 AND pi.user_id = $2
            `, [listId, userId]);
        }
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'Lista não encontrada' });
        }
        
        const guestListItemId = checkResult.rows[0].guest_list_item_id;
        const {
            name,
            email,
            phone,
            whatsapp,
            document,
            address,
            neighborhood,
            city,
            state,
            zipcode,
            instagram,
            status,
            notes
        } = req.body;
        
        // Verificar se o convidado pertence à lista
        const guestCheck = await client.query(`
            SELECT id
            FROM guests
            WHERE id = $1 AND guest_list_id = $2
        `, [guestId, guestListItemId]);
        
        if (guestCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Convidado não encontrado' });
        }
        
        const updateFields = [];
        const updateValues = [];
        let paramIndex = 1;
        
        if (name !== undefined) {
            updateFields.push(`name = $${paramIndex++}`);
            updateValues.push(name);
        }
        if (email !== undefined) {
            updateFields.push(`email = $${paramIndex++}`);
            updateValues.push(email);
        }
        if (phone !== undefined) {
            updateFields.push(`phone = $${paramIndex++}`);
            updateValues.push(phone);
        }
        if (whatsapp !== undefined) {
            updateFields.push(`whatsapp = $${paramIndex++}`);
            updateValues.push(whatsapp);
        }
        if (document !== undefined) {
            updateFields.push(`document = $${paramIndex++}`);
            updateValues.push(document);
        }
        if (address !== undefined) {
            updateFields.push(`address = $${paramIndex++}`);
            updateValues.push(address);
        }
        if (neighborhood !== undefined) {
            updateFields.push(`neighborhood = $${paramIndex++}`);
            updateValues.push(neighborhood);
        }
        if (city !== undefined) {
            updateFields.push(`city = $${paramIndex++}`);
            updateValues.push(city);
        }
        if (state !== undefined) {
            updateFields.push(`state = $${paramIndex++}`);
            updateValues.push(state);
        }
        if (zipcode !== undefined) {
            updateFields.push(`zipcode = $${paramIndex++}`);
            updateValues.push(zipcode);
        }
        if (instagram !== undefined) {
            updateFields.push(`instagram = $${paramIndex++}`);
            updateValues.push(instagram);
        }
        if (status !== undefined) {
            updateFields.push(`status = $${paramIndex++}`);
            updateValues.push(status);
            
            // Atualizar timestamps baseado no status
            if (status === 'confirmed') {
                updateFields.push(`confirmed_at = NOW()`);
                updateFields.push(`confirmed_by = $${paramIndex++}`);
                updateValues.push(userId);
            }
            if (status === 'checked_in') {
                updateFields.push(`checked_in_at = NOW()`);
                updateFields.push(`checked_in_by = $${paramIndex++}`);
                updateValues.push(userId);
            }
        }
        if (notes !== undefined) {
            updateFields.push(`notes = $${paramIndex++}`);
            updateValues.push(notes);
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ message: 'Nenhum campo para atualizar' });
        }
        
        updateValues.push(guestId);
        updateValues.push(guestListItemId);
        const result = await client.query(`
            UPDATE guests 
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex++} AND guest_list_id = $${paramIndex}
            RETURNING *
        `, updateValues);
        
        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Erro ao atualizar convidado:', error);
        res.status(500).json({ message: 'Erro ao atualizar convidado', error: error.message });
    } finally {
        client.release();
    }
}));

/**
 * DELETE /api/guest-lists/:id/guests/:guestId - Remover convidado
 */
router.delete('/:id/guests/:guestId', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const listId = parseInt(req.params.id, 10);
        const guestId = parseInt(req.params.guestId, 10);
        
        if (isNaN(listId) || isNaN(guestId)) {
            return res.status(400).json({ message: 'ID inválido' });
        }
        
        // Verificar se a lista pertence ao usuário - tentar por profile_item_id primeiro
        let checkResult = await client.query(`
            SELECT gli.id as guest_list_item_id
            FROM profile_items pi
            INNER JOIN guest_list_items gli ON gli.profile_item_id = pi.id
            WHERE pi.id = $1 AND pi.user_id = $2
        `, [listId, userId]);
        
        // Se não encontrar, tentar buscar pelo id da guest_list_items
        if (checkResult.rows.length === 0) {
            checkResult = await client.query(`
                SELECT gli.id as guest_list_item_id
                FROM guest_list_items gli
                INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
                WHERE gli.id = $1 AND pi.user_id = $2
            `, [listId, userId]);
        }
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'Lista não encontrada' });
        }
        
        const guestListItemId = checkResult.rows[0].guest_list_item_id;
        
        // Verificar se o convidado pertence à lista
        const guestCheck = await client.query(`
            SELECT id
            FROM guests
            WHERE id = $1 AND guest_list_id = $2
        `, [guestId, guestListItemId]);
        
        if (guestCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Convidado não encontrado' });
        }
        
        await client.query('DELETE FROM guests WHERE id = $1 AND guest_list_id = $2', [guestId, guestListItemId]);
        
        res.json({ success: true, message: 'Convidado removido com sucesso' });
    } catch (error) {
        logger.error('Erro ao remover convidado:', error);
        res.status(500).json({ message: 'Erro ao remover convidado', error: error.message });
    } finally {
        client.release();
    }
}));

/**
 * GET /api/guest-lists/:id/stats - Estatísticas da lista (ADM)
 */
router.get('/:id/stats', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const listId = parseInt(req.params.id, 10);
        
        if (isNaN(listId)) {
            return res.status(400).json({ message: 'ID da lista inválido' });
        }
        
        // Verificar se a lista pertence ao usuário - tentar por profile_item_id primeiro
        let checkResult = await client.query(`
            SELECT gli.id as guest_list_item_id
            FROM profile_items pi
            INNER JOIN guest_list_items gli ON gli.profile_item_id = pi.id
            WHERE pi.id = $1 AND pi.user_id = $2
        `, [listId, userId]);
        
        // Se não encontrar, tentar buscar pelo id da guest_list_items
        if (checkResult.rows.length === 0) {
            checkResult = await client.query(`
                SELECT gli.id as guest_list_item_id
                FROM guest_list_items gli
                INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
                WHERE gli.id = $1 AND pi.user_id = $2
            `, [listId, userId]);
        }
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'Lista não encontrada' });
        }
        
        const guestListItemId = checkResult.rows[0].guest_list_item_id;
        
        const stats = await client.query(`
            SELECT 
                COUNT(*) FILTER (WHERE status = 'registered') as registered_count,
                COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_count,
                COUNT(*) FILTER (WHERE status = 'checked_in') as checked_in_count,
                COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
                COUNT(*) as total_count
            FROM guests
            WHERE guest_list_id = $1
        `, [guestListItemId]);
        
        res.json(stats.rows[0]);
    } catch (error) {
        logger.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ message: 'Erro ao buscar estatísticas', error: error.message });
    } finally {
        client.release();
    }
}));

/**
 * POST /api/guest-lists/public/register/:token - Inscrição pública
 */
router.post('/public/register/:token', asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { token } = req.params;
        const {
            name,
            email,
            phone,
            whatsapp,
            document,
            address,
            neighborhood,
            city,
            state,
            zipcode,
            instagram
        } = req.body;
        
        // Validações obrigatórias
        if (!name || !name.trim()) {
            return res.status(400).json({ message: 'Nome completo é obrigatório' });
        }
        
        if (!whatsapp || !whatsapp.trim()) {
            return res.status(400).json({ message: 'WhatsApp é obrigatório' });
        }
        
        if (!document || !document.trim()) {
            return res.status(400).json({ message: 'CPF/CNPJ é obrigatório' });
        }
        
        // Buscar lista pelo token
        const listResult = await client.query(`
            SELECT gli.*, pi.is_active
            FROM guest_list_items gli
            INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
            WHERE gli.registration_token = $1 AND pi.is_active = true
        `, [token]);
        
        if (listResult.rows.length === 0) {
            return res.status(404).json({ message: 'Link de inscrição inválido' });
        }
        
        const guestList = listResult.rows[0];
        
        if (!guestList.allow_self_registration) {
            return res.status(403).json({ message: 'Inscrições não estão abertas para este evento' });
        }
        
        // Verificar limite
        if (guestList.max_guests) {
            const countResult = await client.query(`
                SELECT COUNT(*) as count FROM guests WHERE guest_list_id = $1
            `, [guestList.id]);
            
            if (parseInt(countResult.rows[0].count) >= guestList.max_guests) {
                return res.status(400).json({ message: 'Limite de convidados atingido' });
            }
        }
        
        // Gerar token único para QR Code
        const qrToken = crypto.randomBytes(32).toString('hex');
        
        // Criar convidado com todos os campos
        const result = await client.query(`
            INSERT INTO guests (
                guest_list_id, name, email, phone, whatsapp, document, 
                address, neighborhood, city, state, zipcode, instagram,
                status, registration_source, qr_token, qr_code_generated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'self', $14, NOW())
            RETURNING *
        `, [
            guestList.id,
            name.trim(),
            email ? email.trim() : null,
            phone ? phone.trim() : null,
            whatsapp.trim(),
            document.trim(),
            address ? address.trim() : null,
            neighborhood ? neighborhood.trim() : null,
            city ? city.trim() : null,
            state ? state.trim() : null,
            zipcode ? zipcode.trim() : null,
            instagram ? instagram.trim() : null,
            guestList.require_confirmation ? 'registered' : 'confirmed',
            qrToken
        ]);
        
        // Salvar respostas customizadas se houver
        const customResponses = req.body.custom_responses || {};
        if (Object.keys(customResponses).length > 0) {
            await client.query(`
                UPDATE guests 
                SET custom_responses = $1::jsonb
                WHERE id = $2
            `, [JSON.stringify(customResponses), result.rows[0].id]);
        }
        
        // Se não requer confirmação, já confirmar
        if (!guestList.require_confirmation) {
            await client.query(`
                UPDATE guests 
                SET confirmed_at = NOW(), status = 'confirmed'
                WHERE id = $1
            `, [result.rows[0].id]);
        }
        
        res.json({
            success: true,
            guest: result.rows[0],
            requires_confirmation: guestList.require_confirmation
        });
    } catch (error) {
        logger.error('Erro ao registrar convidado:', error);
        res.status(500).json({ message: 'Erro ao registrar convidado', error: error.message });
    } finally {
        client.release();
    }
}));

/**
 * POST /api/guest-lists/public/confirm/:token - Confirmação pública
 */
router.post('/public/confirm/:token', asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { token } = req.params;
        const { guest_ids } = req.body; // Array de IDs de convidados para confirmar
        
        // Buscar lista pelo token
        const listResult = await client.query(`
            SELECT gli.*, pi.is_active
            FROM guest_list_items gli
            INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
            WHERE gli.confirmation_token = $1 AND pi.is_active = true
        `, [token]);
        
        if (listResult.rows.length === 0) {
            return res.status(404).json({ message: 'Link de confirmação inválido' });
        }
        
        const guestList = listResult.rows[0];
        
        if (!Array.isArray(guest_ids) || guest_ids.length === 0) {
            return res.status(400).json({ message: 'IDs de convidados são obrigatórios' });
        }
        
        // Confirmar convidados
        const result = await client.query(`
            UPDATE guests 
            SET status = 'confirmed', confirmed_at = NOW()
            WHERE guest_list_id = $1 AND id = ANY($2::int[]) AND status = 'registered'
            RETURNING *
        `, [guestList.id, guest_ids]);
        
        res.json({
            success: true,
            confirmed_count: result.rows.length,
            guests: result.rows
        });
    } catch (error) {
        logger.error('Erro ao confirmar convidados:', error);
        res.status(500).json({ message: 'Erro ao confirmar convidados', error: error.message });
    } finally {
        client.release();
    }
}));

/**
 * GET /api/guest-lists/public/confirm/:token - Listar convidados para confirmação (público)
 */
router.get('/public/confirm/:token', asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { token } = req.params;
        
        // Buscar lista pelo token
        const listResult = await client.query(`
            SELECT 
                gli.*,
                pi.title,
                pi.user_id
            FROM guest_list_items gli
            INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
            WHERE gli.confirmation_token = $1 AND pi.is_active = true
        `, [token]);
        
        if (listResult.rows.length === 0) {
            return res.status(404).json({ message: 'Link de confirmação inválido' });
        }
        
        const guestList = listResult.rows[0];
        
        // Buscar convidados não confirmados
        const guestsResult = await client.query(`
            SELECT id, name, email, phone, status, created_at
            FROM guests
            WHERE guest_list_id = $1 AND status IN ('registered', 'confirmed')
            ORDER BY created_at DESC
        `, [guestList.id]);
        
        res.json({
            guest_list: guestList,
            guests: guestsResult.rows
        });
    } catch (error) {
        logger.error('Erro ao buscar convidados para confirmação:', error);
        res.status(500).json({ message: 'Erro ao buscar convidados', error: error.message });
    } finally {
        client.release();
    }
}));

/**
 * GET /api/guest-lists/public/register/:token - Obter informações da lista para inscrição (público)
 */
router.get('/public/register/:token', asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { token } = req.params;
        
        // Buscar lista pelo token
        const listResult = await client.query(`
            SELECT 
                gli.*,
                pi.title,
                COUNT(g.id) as current_guests,
                gli.max_guests
            FROM guest_list_items gli
            INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
            LEFT JOIN guests g ON g.guest_list_id = gli.id
            WHERE gli.registration_token = $1 AND pi.is_active = true
            GROUP BY gli.id, pi.id
        `, [token]);
        
        if (listResult.rows.length === 0) {
            return res.status(404).json({ message: 'Link de inscrição inválido' });
        }
        
        const guestList = listResult.rows[0];
        const isFull = guestList.max_guests && parseInt(guestList.current_guests) >= guestList.max_guests;
        
        res.json({
            ...guestList,
            is_full: isFull,
            can_register: guestList.allow_self_registration && !isFull
        });
    } catch (error) {
        logger.error('Erro ao buscar lista para inscrição:', error);
        res.status(500).json({ message: 'Erro ao buscar lista', error: error.message });
    } finally {
        client.release();
    }
}));

/**
 * DELETE /api/guest-lists/:id - Deletar lista de convidados
 */
router.delete('/:id', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const listId = parseInt(req.params.id, 10);
        
        if (isNaN(listId)) {
            return res.status(400).json({ message: 'ID da lista inválido' });
        }
        
        // Verificar se a lista pertence ao usuário
        const checkResult = await client.query(`
            SELECT pi.id
            FROM profile_items pi
            INNER JOIN guest_list_items gli ON gli.profile_item_id = pi.id
            WHERE pi.id = $1 AND pi.user_id = $2
        `, [listId, userId]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'Lista não encontrada' });
        }
        
        // Deletar profile_item (CASCADE vai deletar guest_list_items e guests)
        await client.query(`DELETE FROM profile_items WHERE id = $1`, [listId]);
        
        res.json({ success: true, message: 'Lista deletada com sucesso' });
    } catch (error) {
        logger.error('Erro ao deletar lista:', error);
        res.status(500).json({ message: 'Erro ao deletar lista', error: error.message });
    } finally {
        client.release();
    }
}));

/**
 * GET /api/guest-lists/:id/export/pdf - Exportar convidados em PDF
 */
router.get('/:id/export/pdf', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const listId = parseInt(req.params.id, 10);
        const { status } = req.query;
        
        if (isNaN(listId)) {
            return res.status(400).json({ message: 'ID da lista inválido' });
        }
        
        // Verificar se a lista pertence ao usuário
        let checkResult = await client.query(`
            SELECT gli.id as guest_list_item_id, gli.event_title, pi.title
            FROM profile_items pi
            INNER JOIN guest_list_items gli ON gli.profile_item_id = pi.id
            WHERE pi.id = $1 AND pi.user_id = $2
        `, [listId, userId]);
        
        if (checkResult.rows.length === 0) {
            checkResult = await client.query(`
                SELECT gli.id as guest_list_item_id, gli.event_title, pi.title
                FROM guest_list_items gli
                INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
                WHERE gli.id = $1 AND pi.user_id = $2
            `, [listId, userId]);
        }
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ message: 'Lista não encontrada' });
        }
        
        const guestListItemId = checkResult.rows[0].guest_list_item_id;
        const eventTitle = checkResult.rows[0].event_title || checkResult.rows[0].title;
        
        // Buscar convidados
        let query = 'SELECT * FROM guests WHERE guest_list_id = $1';
        const params = [guestListItemId];
        
        if (status) {
            query += ' AND status = $2';
            params.push(status);
        }
        
        query += ' ORDER BY name ASC';
        
        const guestsResult = await client.query(query, params);
        const guests = guestsResult.rows;
        
        // Por enquanto, retornar JSON (PDF será implementado com biblioteca)
        // TODO: Implementar geração de PDF com pdfkit ou similar
        res.json({
            success: true,
            event_title: eventTitle,
            total: guests.length,
            guests: guests
        });
    } catch (error) {
        logger.error('Erro ao exportar PDF:', error);
        res.status(500).json({ message: 'Erro ao exportar PDF', error: error.message });
    } finally {
        client.release();
    }
}));

module.exports = router;

