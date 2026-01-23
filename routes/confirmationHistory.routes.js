// Rotas de Histórico de Confirmações (Melhoria 7)
const express = require('express');
const router = express.Router();
const { protectUser } = require('../middleware/protectUser');
const { asyncHandler } = require('../middleware/errorHandler');
const { getGuestConfirmationHistory, getListConfirmationHistory } = require('../utils/confirmationHistory');
const db = require('../db');

/**
 * GET /api/guest-lists/:id/history - Histórico de confirmações de uma lista
 */
router.get('/:id/history', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const listId = parseInt(req.params.id, 10);
        const limit = parseInt(req.query.limit, 10) || 100;
        
        // Verificar se a lista pertence ao usuário
        let checkResult = await client.query(`
            SELECT gli.id as guest_list_item_id
            FROM profile_items pi
            INNER JOIN guest_list_items gli ON gli.profile_item_id = pi.id
            WHERE pi.id = $1 AND pi.user_id = $2
        `, [listId, userId]);
        
        if (checkResult.rows.length === 0) {
            checkResult = await client.query(`
                SELECT gli.id as guest_list_item_id
                FROM guest_list_items gli
                INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
                WHERE gli.id = $1 AND pi.user_id = $2
            `, [listId, userId]);
        }
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lista não encontrada'
            });
        }
        
        const guestListItemId = checkResult.rows[0].guest_list_item_id;
        const history = await getListConfirmationHistory(guestListItemId, limit);
        
        res.json({
            success: true,
            history
        });
    } finally {
        client.release();
    }
}));

/**
 * GET /api/guest-lists/:listId/guests/:guestId/history - Histórico de confirmações de um convidado
 */
router.get('/:listId/guests/:guestId/history', protectUser, asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const userId = req.user.userId;
        const listId = parseInt(req.params.listId, 10);
        const guestId = parseInt(req.params.guestId, 10);
        const limit = parseInt(req.query.limit, 10) || 50;
        
        // Verificar se a lista pertence ao usuário
        let checkResult = await client.query(`
            SELECT gli.id as guest_list_item_id
            FROM profile_items pi
            INNER JOIN guest_list_items gli ON gli.profile_item_id = pi.id
            WHERE pi.id = $1 AND pi.user_id = $2
        `, [listId, userId]);
        
        if (checkResult.rows.length === 0) {
            checkResult = await client.query(`
                SELECT gli.id as guest_list_item_id
                FROM guest_list_items gli
                INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
                WHERE gli.id = $1 AND pi.user_id = $2
            `, [listId, userId]);
        }
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Lista não encontrada'
            });
        }
        
        // Verificar se o convidado pertence à lista
        const guestCheck = await client.query(`
            SELECT id FROM guests 
            WHERE id = $1 AND guest_list_id = $2
        `, [guestId, checkResult.rows[0].guest_list_item_id]);
        
        if (guestCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Convidado não encontrado'
            });
        }
        
        const history = await getGuestConfirmationHistory(guestId, limit);
        
        res.json({
            success: true,
            history
        });
    } finally {
        client.release();
    }
}));

module.exports = router;
