const express = require('express');
const router = express.Router();
const db = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * GET /guest-list/register/:token - Página pública de inscrição
 */
router.get('/register/:token', asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { token } = req.params;
        
        // Buscar lista pelo token (incluindo campos de estilo)
        const listResult = await client.query(`
            SELECT 
                gli.*,
                gli.primary_color,
                gli.text_color,
                gli.background_color,
                gli.header_image_url,
                gli.background_image_url,
                gli.background_opacity,
                gli.theme,
                pi.title,
                pi.user_id,
                u.profile_slug
            FROM guest_list_items gli
            INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
            INNER JOIN users u ON u.id = pi.user_id
            WHERE gli.registration_token = $1 AND pi.is_active = true
        `, [token]);
        
        // Parsear custom_form_fields se for string
        if (listResult.rows.length > 0 && listResult.rows[0].custom_form_fields) {
            if (typeof listResult.rows[0].custom_form_fields === 'string') {
                try {
                    listResult.rows[0].custom_form_fields = JSON.parse(listResult.rows[0].custom_form_fields);
                } catch (e) {
                    listResult.rows[0].custom_form_fields = [];
                }
            }
        }
        
        // Garantir que os campos de estilo estejam presentes (valores padrão se não existirem)
        if (listResult.rows.length > 0) {
            const row = listResult.rows[0];
            row.primary_color = row.primary_color || '#FFC700';
            row.text_color = row.text_color || '#ECECEC';
            row.background_color = row.background_color || '#0D0D0F';
            row.background_opacity = row.background_opacity !== undefined ? parseFloat(row.background_opacity) : 1.0;
            row.theme = row.theme || 'dark';
        }
        
        if (listResult.rows.length === 0) {
            return res.status(404).render('error', {
                message: 'Link de inscrição inválido ou expirado',
                title: 'Erro'
            });
        }
        
        const guestList = listResult.rows[0];
        
        // Parsear custom_form_fields se for string
        if (guestList.custom_form_fields && typeof guestList.custom_form_fields === 'string') {
            try {
                guestList.custom_form_fields = JSON.parse(guestList.custom_form_fields);
            } catch (e) {
                guestList.custom_form_fields = [];
            }
        } else if (!guestList.custom_form_fields) {
            guestList.custom_form_fields = [];
        }
        
        // Garantir que os campos de estilo estejam presentes (valores padrão se não existirem)
        guestList.primary_color = guestList.primary_color || '#FFC700';
        guestList.text_color = guestList.text_color || '#ECECEC';
        guestList.background_color = guestList.background_color || '#0D0D0F';
        guestList.background_opacity = guestList.background_opacity !== undefined && guestList.background_opacity !== null ? parseFloat(guestList.background_opacity) : 1.0;
        guestList.theme = guestList.theme || 'dark';
        
        // Verificar se ainda há vagas
        const countResult = await client.query(`
            SELECT COUNT(*) as count FROM guests WHERE guest_list_id = $1
        `, [guestList.id]);
        
        const currentCount = parseInt(countResult.rows[0].count);
        const isFull = guestList.max_guests && currentCount >= guestList.max_guests;
        
        res.render('guestListRegister', {
            guestList,
            isFull,
            canRegister: guestList.allow_self_registration && !isFull,
            currentCount,
            maxGuests: guestList.max_guests
        });
    } catch (error) {
        logger.error('Erro ao carregar página de inscrição:', error);
        res.status(500).render('error', {
            message: 'Erro ao carregar página de inscrição',
            title: 'Erro'
        });
    } finally {
        client.release();
    }
}));

/**
 * GET /guest-list/confirm/:token - Página pública de confirmação (ou itemId)
 */
router.get('/confirm/:identifier', asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { identifier } = req.params;
        const tab = req.query.tab || 'confirmation';
        
        let listResult;
        
        // Tentar buscar por token primeiro
        listResult = await client.query(`
            SELECT 
                gli.*,
                pi.id as profile_item_id,
                pi.title,
                pi.user_id,
                u.profile_slug
            FROM guest_list_items gli
            INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
            INNER JOIN users u ON u.id = pi.user_id
            WHERE gli.confirmation_token = $1 AND pi.is_active = true
        `, [identifier]);
        
        // Se não encontrou por token, tentar por itemId (profile_item_id)
        if (listResult.rows.length === 0) {
            const itemId = parseInt(identifier, 10);
            if (!isNaN(itemId)) {
                listResult = await client.query(`
                    SELECT 
                        gli.*,
                        pi.id as profile_item_id,
                        pi.title,
                        pi.user_id,
                        u.profile_slug
                    FROM guest_list_items gli
                    INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
                    INNER JOIN users u ON u.id = pi.user_id
                    WHERE pi.id = $1 AND pi.is_active = true
                `, [itemId]);
            }
        }
        
        if (listResult.rows.length === 0) {
            return res.status(404).render('error', {
                message: 'Link de confirmação inválido ou expirado',
                title: 'Erro'
            });
        }
        
        const guestList = listResult.rows[0];
        
        // Buscar convidados para confirmação (status: registered)
        const guestsResult = await client.query(`
            SELECT id, name, email, phone, status, created_at
            FROM guests
            WHERE guest_list_id = $1 AND status = 'registered'
            ORDER BY created_at DESC
        `, [guestList.id]);
        
        res.render('guestListConfirm', {
            guestList,
            guests: guestsResult.rows,
            token: guestList.confirmation_token || identifier,
            profileItemId: guestList.profile_item_id,
            tab: tab
        });
    } catch (error) {
        logger.error('Erro ao carregar página de confirmação:', error);
        res.status(500).render('error', {
            message: 'Erro ao carregar página de confirmação',
            title: 'Erro'
        });
    } finally {
        client.release();
    }
}));

/**
 * GET /guest-list/view-confirmed/:token - Página pública para ver lista de confirmados usando token
 */
router.get('/view-confirmed/:token', asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { token } = req.params;
        const tab = req.query.tab || 'confirmed';
        
        // Buscar lista pelo token de confirmação
        const listResult = await client.query(`
            SELECT 
                gli.*,
                pi.id as profile_item_id,
                pi.title,
                pi.user_id,
                u.profile_slug
            FROM guest_list_items gli
            INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
            INNER JOIN users u ON u.id = pi.user_id
            WHERE gli.confirmation_token = $1 AND pi.is_active = true
        `, [token]);
        
        if (listResult.rows.length === 0) {
            return res.status(404).render('error', {
                message: 'Link inválido ou expirado',
                title: 'Erro'
            });
        }
        
        const guestList = listResult.rows[0];
        
        // Buscar convidados confirmados e conferidos
        const confirmedResult = await client.query(`
            SELECT id, name, email, phone, status, confirmed_at, created_at
            FROM guests
            WHERE guest_list_id = $1 AND status = 'confirmed'
            ORDER BY confirmed_at DESC, created_at DESC
        `, [guestList.id]);
        
        const checkedInResult = await client.query(`
            SELECT id, name, email, phone, status, checked_in_at, confirmed_at, created_at
            FROM guests
            WHERE guest_list_id = $1 AND status = 'checked_in'
            ORDER BY checked_in_at DESC
        `, [guestList.id]);
        
        const registeredResult = await client.query(`
            SELECT id, name, email, phone, status, created_at
            FROM guests
            WHERE guest_list_id = $1 AND status = 'registered'
            ORDER BY created_at DESC
        `, [guestList.id]);
        
        res.render('guestListConfirm', {
            guestList,
            guests: confirmedResult.rows,
            checkedInGuests: checkedInResult.rows,
            registeredGuests: registeredResult.rows,
            token: token,
            profileItemId: guestList.profile_item_id,
            tab: tab,
            viewOnly: true
        });
    } catch (error) {
        logger.error('Erro ao carregar página de visualização:', error);
        res.status(500).render('error', {
            message: 'Erro ao carregar página',
            title: 'Erro'
        });
    } finally {
        client.release();
    }
}));

/**
 * GET /guest-list/view/:itemId - Página pública para ver lista de confirmados
 */
router.get('/view/:itemId', asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { itemId } = req.params;
        const tab = req.query.tab || 'confirmed';
        
        // Buscar lista pelo itemId
        const listResult = await client.query(`
            SELECT 
                gli.*,
                pi.id as profile_item_id,
                pi.title,
                pi.user_id,
                u.profile_slug
            FROM guest_list_items gli
            INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
            INNER JOIN users u ON u.id = pi.user_id
            WHERE pi.id = $1 AND pi.is_active = true
        `, [itemId]);
        
        if (listResult.rows.length === 0) {
            return res.status(404).render('error', {
                message: 'Lista não encontrada',
                title: 'Erro'
            });
        }
        
        const guestList = listResult.rows[0];
        
        // Buscar convidados confirmados
        const guestsResult = await client.query(`
            SELECT id, name, email, phone, status, confirmed_at, created_at
            FROM guests
            WHERE guest_list_id = $1 AND (status = 'confirmed' OR status = 'checked_in')
            ORDER BY confirmed_at DESC, created_at DESC
        `, [guestList.id]);
        
        res.render('guestListConfirm', {
            guestList,
            guests: guestsResult.rows,
            token: guestList.confirmation_token || itemId,
            profileItemId: guestList.profile_item_id,
            tab: tab,
            viewOnly: true
        });
    } catch (error) {
        logger.error('Erro ao carregar página de visualização:', error);
        res.status(500).render('error', {
            message: 'Erro ao carregar página',
            title: 'Erro'
        });
    } finally {
        client.release();
    }
}));

/**
 * GET /guest-list/view-full/:token - Visualização pública completa (portaria - todas as abas)
 */
router.get('/view-full/:token', asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { token } = req.params;
        
        // Buscar lista pelo public_view_token
        const listResult = await client.query(`
            SELECT 
                gli.*,
                pi.id as profile_item_id,
                pi.title,
                pi.user_id,
                u.profile_slug
            FROM guest_list_items gli
            INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
            INNER JOIN users u ON u.id = pi.user_id
            WHERE (gli.public_view_token = $1 OR gli.confirmation_token = $1) AND pi.is_active = true
        `, [token]);
        
        if (listResult.rows.length === 0) {
            return res.status(404).render('error', {
                message: 'Link inválido ou expirado',
                title: 'Erro'
            });
        }
        
        const guestList = listResult.rows[0];
        
        // Parsear custom_form_fields se for string
        if (guestList.custom_form_fields && typeof guestList.custom_form_fields === 'string') {
            try {
                guestList.custom_form_fields = JSON.parse(guestList.custom_form_fields);
            } catch (e) {
                guestList.custom_form_fields = [];
            }
        }
        
        // Buscar form_fields do formulário para mapear labels
        let formFields = [];
        try {
            const formFieldsRes = await client.query(`
                SELECT form_fields FROM digital_form_items 
                WHERE profile_item_id = $1
                ORDER BY COALESCE(updated_at, '1970-01-01'::timestamp) DESC, id DESC LIMIT 1
            `, [guestList.profile_item_id]);
            
            if (formFieldsRes.rows.length > 0 && formFieldsRes.rows[0].form_fields) {
                const fields = formFieldsRes.rows[0].form_fields;
                if (typeof fields === 'string') {
                    formFields = JSON.parse(fields);
                } else if (Array.isArray(fields)) {
                    formFields = fields;
                }
            }
        } catch (e) {
            logger.warn('Erro ao buscar form_fields:', e);
        }
        
        // Buscar todos os convidados por status
        // IMPORTANTE: "Cadastrados" deve mostrar TODOS os convidados, independente do status
        const allGuestsResult = await client.query(`
            SELECT id, name, email, phone, whatsapp, document, address, neighborhood, city, state, zipcode, instagram, status, created_at, confirmed_at, checked_in_at, custom_responses
            FROM guests
            WHERE guest_list_id = $1
            ORDER BY 
                CASE status 
                    WHEN 'checked_in' THEN 1
                    WHEN 'confirmed' THEN 2
                    WHEN 'registered' THEN 3
                    ELSE 4
                END,
                name ASC
        `, [guestList.id]);
        
        // Separar por status para as abas específicas
        const registeredResult = { rows: allGuestsResult.rows.filter(g => g.status === 'registered') };
        const confirmedResult = { rows: allGuestsResult.rows.filter(g => g.status === 'confirmed') };
        const checkedInResult = { rows: allGuestsResult.rows.filter(g => g.status === 'checked_in') };
        
        // Para a aba "Cadastrados" (registered), usar TODOS os convidados
        const registeredGuests = allGuestsResult.rows;
        
        res.render('guestListViewFull', {
            guestList,
            registeredGuests: registeredGuests, // TODOS os convidados (para aba Cadastrados)
            confirmedGuests: confirmedResult.rows,
            checkedInGuests: checkedInResult.rows,
            notArrivedGuests: registeredResult.rows, // Quem não chegou (status registered)
            token: token,
            profileItemId: guestList.profile_item_id,
            formFields: formFields // Campos do formulário para mapear labels
        });
    } catch (error) {
        logger.error('Erro ao carregar visualização completa:', error);
        res.status(500).render('error', {
            message: 'Erro ao carregar página',
            title: 'Erro'
        });
    } finally {
        client.release();
    }
}));

/**
 * POST /guest-list/view-full/:token/checkin/:guestId - Confirmar chegada (portaria pública)
 */
router.post('/view-full/:token/checkin/:guestId', asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { token, guestId } = req.params;
        
        // Buscar lista pelo token
        const listResult = await client.query(`
            SELECT gli.*, pi.id as profile_item_id
            FROM guest_list_items gli
            INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
            WHERE (gli.public_view_token = $1 OR gli.confirmation_token = $1) AND pi.is_active = true
        `, [token]);
        
        if (listResult.rows.length === 0) {
            return res.status(404).json({ message: 'Lista não encontrada' });
        }
        
        const guestList = listResult.rows[0];
        const guestIdInt = parseInt(guestId, 10);
        
        // Verificar se o convidado existe e pertence à lista
        const guestResult = await client.query(`
            SELECT id, name, status FROM guests 
            WHERE id = $1 AND guest_list_id = $2
        `, [guestIdInt, guestList.id]);
        
        if (guestResult.rows.length === 0) {
            return res.status(404).json({ message: 'Convidado não encontrado' });
        }
        
        // Atualizar status para checked_in
        const updateResult = await client.query(`
            UPDATE guests 
            SET status = 'checked_in', 
                checked_in_at = NOW(),
                updated_at = NOW()
            WHERE id = $1 AND guest_list_id = $2
            RETURNING id, name, status, checked_in_at
        `, [guestIdInt, guestList.id]);
        
        if (updateResult.rows.length === 0) {
            return res.status(500).json({ message: 'Erro ao atualizar status' });
        }
        
        res.json({
            success: true,
            message: 'Chegada confirmada com sucesso',
            guest: updateResult.rows[0]
        });
    } catch (error) {
        logger.error('Erro ao confirmar chegada:', error);
        res.status(500).json({ message: 'Erro ao confirmar chegada', error: error.message });
    } finally {
        client.release();
    }
}));

/**
 * POST /guest-list/confirm/qr/:qrToken - Confirmar presença via QR Code
 */
router.post('/confirm/qr/:qrToken', asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { qrToken } = req.params;
        
        // Buscar convidado pelo qr_token
        const guestResult = await client.query(`
            SELECT g.*, gli.public_view_token, gli.profile_item_id
            FROM guests g
            INNER JOIN guest_list_items gli ON gli.id = g.guest_list_id
            WHERE g.qr_token = $1
        `, [qrToken]);
        
        if (guestResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'QR Code inválido ou não encontrado' 
            });
        }
        
        const guest = guestResult.rows[0];
        
        // Verificar se já foi confirmado
        if (guest.status === 'checked_in') {
            return res.json({
                success: true,
                message: 'Presença já confirmada anteriormente',
                guest: {
                    id: guest.id,
                    name: guest.name,
                    status: guest.status,
                    checked_in_at: guest.checked_in_at
                }
            });
        }
        
        // Confirmar presença
        const updateResult = await client.query(`
            UPDATE guests 
            SET status = 'checked_in', 
                checked_in_at = NOW(),
                confirmed_at = COALESCE(confirmed_at, NOW())
            WHERE id = $1
            RETURNING id, name, email, whatsapp, status, checked_in_at
        `, [guest.id]);
        
        logger.info('✅ [QR_CONFIRM] Presença confirmada via QR Code:', {
            guestId: guest.id,
            name: guest.name,
            qrToken: qrToken.substring(0, 16) + '...'
        });
        
        res.json({
            success: true,
            message: 'Presença confirmada com sucesso!',
            guest: updateResult.rows[0]
        });
        
    } catch (error) {
        logger.error('❌ [QR_CONFIRM] Erro ao confirmar via QR Code:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao confirmar presença. Tente novamente.' 
        });
    } finally {
        client.release();
    }
}));

/**
 * POST /guest-list/confirm/cpf - Confirmar presença via CPF
 */
router.post('/confirm/cpf', asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { cpf, token } = req.body;
        
        if (!cpf || !token) {
            return res.status(400).json({ 
                success: false, 
                message: 'CPF e token são obrigatórios' 
            });
        }
        
        // Limpar CPF (remover pontos, traços, espaços)
        const cleanCpf = cpf.replace(/\D/g, '');
        
        if (cleanCpf.length !== 11) {
            return res.status(400).json({ 
                success: false, 
                message: 'CPF inválido. Digite um CPF com 11 dígitos.' 
            });
        }
        
        // Buscar lista pelo token
        const listResult = await client.query(`
            SELECT gli.id as guest_list_id, gli.profile_item_id
            FROM guest_list_items gli
            INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
            WHERE (gli.public_view_token = $1 OR gli.confirmation_token = $1) AND pi.is_active = true
        `, [token]);
        
        if (listResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'Token inválido ou lista não encontrada' 
            });
        }
        
        const guestList = listResult.rows[0];
        
        // Buscar convidado pelo CPF na lista
        const guestResult = await client.query(`
            SELECT * FROM guests
            WHERE guest_list_id = $1 AND document = $2
        `, [guestList.id, cleanCpf]);
        
        if (guestResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'CPF não encontrado na lista de convidados' 
            });
        }
        
        const guest = guestResult.rows[0];
        
        // Verificar se já foi confirmado
        if (guest.status === 'checked_in') {
            return res.json({
                success: true,
                message: 'Presença já confirmada anteriormente',
                guest: {
                    id: guest.id,
                    name: guest.name,
                    status: guest.status,
                    checked_in_at: guest.checked_in_at
                }
            });
        }
        
        // Confirmar presença
        const updateResult = await client.query(`
            UPDATE guests 
            SET status = 'checked_in', 
                checked_in_at = NOW(),
                confirmed_at = COALESCE(confirmed_at, NOW())
            WHERE id = $1
            RETURNING id, name, email, whatsapp, status, checked_in_at
        `, [guest.id]);
        
        logger.info('✅ [CPF_CONFIRM] Presença confirmada via CPF:', {
            guestId: guest.id,
            name: guest.name,
            cpf: cleanCpf.substring(0, 3) + '***.***-**'
        });
        
        res.json({
            success: true,
            message: 'Presença confirmada com sucesso!',
            guest: updateResult.rows[0]
        });
        
    } catch (error) {
        logger.error('❌ [CPF_CONFIRM] Erro ao confirmar via CPF:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao confirmar presença. Tente novamente.' 
        });
    } finally {
        client.release();
    }
}));

module.exports = router;

