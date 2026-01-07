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
        
        // Buscar lista pelo token
        const listResult = await client.query(`
            SELECT 
                gli.*,
                pi.title,
                pi.user_id,
                u.profile_slug
            FROM guest_list_items gli
            INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
            INNER JOIN users u ON u.id = pi.user_id
            WHERE gli.registration_token = $1 AND pi.is_active = true
        `, [token]);
        
        if (listResult.rows.length === 0) {
            return res.status(404).render('error', {
                message: 'Link de inscrição inválido ou expirado',
                title: 'Erro'
            });
        }
        
        const guestList = listResult.rows[0];
        
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

module.exports = router;

