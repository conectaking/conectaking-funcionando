const express = require('express');
const router = express.Router();
const db = require('../db');
const { protectUser } = require('../middleware/protectUser');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * GET /api/checkin/:itemId - Endpoint agregado que retorna todos os dados necessários
 * para o check-in em uma única chamada, reduzindo significativamente o número de requisições.
 * 
 * Retorna:
 * - profile: Dados do perfil do usuário
 * - item: Dados do item/evento
 * - guestList: Dados da lista de convidados
 * - guests: Lista de convidados
 * - responses: Respostas do formulário digital (se aplicável)
 */
router.get('/:itemId', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const itemId = parseInt(req.params.itemId, 10);
        
        if (isNaN(itemId)) {
            return res.status(400).json({ 
                success: false,
                message: 'ID do item inválido' 
            });
        }
        
        logger.info(`[CHECKIN] Carregando dados agregados: itemId=${itemId}, userId=${userId}`);
        
        // 1. BUSCAR DADOS DO PERFIL DO USUÁRIO (paralelo com outros dados)
        const profilePromise = client.query(`
            SELECT 
                u.id, u.email, u.profile_slug,
                p.display_name, p.bio, p.profile_image_url,
                p.font_family,
                p.background_color, p.text_color, p.button_color, p.button_text_color,
                p.button_opacity, p.button_border_radius, p.button_content_align,
                p.background_type, p.background_image_url,
                p.card_background_color, p.card_opacity,
                p.button_font_size, p.background_image_opacity,
                p.show_vcard_button
            FROM users u
            LEFT JOIN user_profiles p ON u.id = p.user_id
            WHERE u.id = $1
        `, [userId]);
        
        // 2. BUSCAR DADOS DO ITEM/PROFILE_ITEM (verificação de propriedade)
        const profileItemResult = await client.query(`
            SELECT id, item_type, title, user_id, is_active, display_order, created_at
            FROM profile_items
            WHERE id = $1 AND user_id = $2
        `, [itemId, userId]);
        
        if (profileItemResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Item não encontrado ou você não tem permissão para acessá-lo',
                code: 'PROFILE_ITEM_NOT_FOUND'
            });
        }
        
        const profileItem = profileItemResult.rows[0];
        
        // 3. BUSCAR DADOS DA GUEST LIST (se aplicável)
        let guestListPromise = Promise.resolve({ rows: [] });
        if (profileItem.item_type === 'guest_list' || profileItem.item_type === 'digital_form') {
            guestListPromise = client.query(`
                SELECT 
                    gli.id as guest_list_item_id,
                    gli.event_title,
                    gli.event_description,
                    gli.event_date,
                    gli.event_location,
                    gli.registration_token,
                    gli.confirmation_token,
                    gli.public_view_token,
                    gli.portaria_slug,
                    gli.cadastro_slug,
                    gli.cadastro_description,
                    gli.cadastro_expires_at,
                    gli.cadastro_max_uses,
                    gli.cadastro_current_uses,
                    gli.max_guests,
                    gli.allow_self_registration,
                    gli.require_confirmation,
                    gli.custom_form_fields,
                    gli.use_custom_form,
                    COALESCE(gli.primary_color, '#FFC700') as primary_color,
                    COALESCE(gli.text_color, '#ECECEC') as text_color,
                    COALESCE(gli.background_color, '#0D0D0F') as background_color,
                    gli.secondary_color,
                    gli.header_image_url,
                    gli.background_image_url,
                    COALESCE(gli.background_opacity, 1.0) as background_opacity,
                    COALESCE(gli.theme, 'dark') as theme
                FROM guest_list_items gli
                WHERE gli.profile_item_id = $1
            `, [itemId]);
        }
        
        // 4. BUSCAR CONVIDADOS (paralelo) - aguardar guestList primeiro para obter guest_list_id
        let guestsPromise = Promise.resolve({ rows: [] });
        if (profileItem.item_type === 'guest_list' || profileItem.item_type === 'digital_form') {
            // Aguardar guestList primeiro para ter o guest_list_item_id
            const guestListRes = await guestListPromise;
            if (guestListRes.rows.length > 0 && guestListRes.rows[0].guest_list_item_id) {
                const guestListId = guestListRes.rows[0].guest_list_item_id;
                guestsPromise = client.query(`
                    SELECT 
                        id, name, email, phone, document, status,
                        registered_at, confirmed_at, checked_in_at,
                        custom_data, notes
                    FROM guests
                    WHERE guest_list_id = $1
                    ORDER BY registered_at DESC
                `, [guestListId]);
            }
        }
        
        // 5. BUSCAR RESPOSTAS DO FORMULÁRIO DIGITAL (se aplicável)
        let responsesPromise = Promise.resolve({ rows: [] });
        if (profileItem.item_type === 'digital_form') {
            responsesPromise = client.query(`
                SELECT 
                    id, response_data, submitted_at, ip_address, user_agent
                FROM form_responses
                WHERE profile_item_id = $1
                ORDER BY submitted_at DESC
            `, [itemId]);
        }
        
        // 6. BUSCAR DADOS DO FORMULÁRIO DIGITAL (se aplicável)
        let digitalFormPromise = Promise.resolve({ rows: [] });
        if (profileItem.item_type === 'digital_form') {
            digitalFormPromise = client.query(`
                SELECT 
                    dfi.id as digital_form_item_id,
                    dfi.form_title,
                    dfi.form_description,
                    dfi.form_fields,
                    dfi.share_token,
                    dfi.require_email,
                    dfi.require_phone,
                    dfi.button_text,
                    dfi.success_message,
                    dfi.redirect_url,
                    dfi.email_notifications,
                    dfi.notification_emails
                FROM digital_form_items dfi
                WHERE dfi.profile_item_id = $1
            `, [itemId]);
        }
        
        // Aguardar queries principais em paralelo (exceto guests que depende de guestList)
        const [profileRes, guestListRes, responsesRes, digitalFormRes] = await Promise.all([
            profilePromise,
            guestListPromise,
            responsesPromise,
            digitalFormPromise
        ]);
        
        // Aguardar guests separadamente (já está configurado acima com await do guestListPromise)
        const guestsRes = await guestsPromise;
        
        // Processar resultado do perfil
        const profile = profileRes.rows.length > 0 ? profileRes.rows[0] : null;
        
        // Processar resultado da guest list
        let guestList = null;
        if (guestListRes.rows.length > 0) {
            guestList = guestListRes.rows[0];
            // Parsear custom_form_fields se for string
            if (guestList.custom_form_fields && typeof guestList.custom_form_fields === 'string') {
                try {
                    guestList.custom_form_fields = JSON.parse(guestList.custom_form_fields);
                } catch (e) {
                    logger.warn('[CHECKIN] Erro ao parsear custom_form_fields:', e);
                    guestList.custom_form_fields = [];
                }
            }
        }
        
        // Processar convidados
        const guests = guestsRes.rows || [];
        guests.forEach(guest => {
            // Parsear custom_data se for string
            if (guest.custom_data && typeof guest.custom_data === 'string') {
                try {
                    guest.custom_data = JSON.parse(guest.custom_data);
                } catch (e) {
                    // Ignorar erro
                }
            }
        });
        
        // Processar respostas do formulário
        const responses = (responsesRes.rows || []).map(response => {
            let responseData = response.response_data;
            if (typeof responseData === 'string') {
                try {
                    responseData = JSON.parse(responseData);
                } catch (e) {
                    // Ignorar erro
                }
            }
            return {
                ...response,
                response_data: responseData
            };
        });
        
        // Processar dados do formulário digital
        let digitalForm = null;
        if (digitalFormRes.rows.length > 0) {
            digitalForm = digitalFormRes.rows[0];
            // Parsear form_fields se for string
            if (digitalForm.form_fields && typeof digitalForm.form_fields === 'string') {
                try {
                    digitalForm.form_fields = JSON.parse(digitalForm.form_fields);
                } catch (e) {
                    logger.warn('[CHECKIN] Erro ao parsear form_fields:', e);
                    digitalForm.form_fields = [];
                }
            }
        }
        
        // Montar resposta agregada
        const result = {
            success: true,
            profile: profile || null,
            item: {
                ...profileItem,
                digital_form_data: digitalForm,
                guest_list_data: guestList
            },
            guestList: guestList,
            guests: guests,
            responses: responses
        };
        
        logger.info(`[CHECKIN] Dados agregados carregados: itemId=${itemId}, guests=${guests.length}, responses=${responses.length}`);
        
        res.json(result);
        
    } catch (error) {
        logger.error('[CHECKIN] Erro ao carregar dados agregados:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao carregar dados',
            error: error.message
        });
    } finally {
        client.release();
    }
}));

module.exports = router;
