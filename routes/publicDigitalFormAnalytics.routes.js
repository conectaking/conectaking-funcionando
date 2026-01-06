const express = require('express');
const router = express.Router();
const db = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');

// POST /:slug/form/:itemId/analytics - Registrar evento de analytics (público)
router.post('/:slug/form/:itemId/analytics', asyncHandler(async (req, res) => {
    const { slug, itemId } = req.params;
    const { event_type, session_id } = req.body;
    
    const client = await db.pool.connect();
    try {
        const itemIdInt = parseInt(itemId, 10);
        
        if (!itemIdInt || isNaN(itemIdInt)) {
            return res.json({ success: false, message: 'ID do formulário inválido.' });
        }
        
        if (!event_type || !['view', 'click', 'submit', 'start', 'abandon'].includes(event_type)) {
            return res.json({ success: false, message: 'Tipo de evento inválido.' });
        }
        
        // Verificar se o formulário existe
        const formCheck = await client.query(
            `SELECT pi.id 
             FROM profile_items pi
             JOIN users u ON u.id = pi.user_id
             WHERE pi.id = $1 AND (u.profile_slug = $2 OR u.id::text = $2) AND pi.item_type = 'digital_form' AND pi.is_active = true`,
            [itemIdInt, slug]
        );
        
        if (formCheck.rows.length === 0) {
            return res.json({ success: false, message: 'Formulário não encontrado.' });
        }
        
        const user_ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0];
        const user_agent = req.headers['user-agent'] || null;
        const referer = req.headers.referer || null;
        
        await client.query(`
            INSERT INTO digital_form_analytics (
                profile_item_id, event_type, user_ip, user_agent, referer, session_id
            ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [itemIdInt, event_type, user_ip, user_agent, referer, session_id || null]);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao registrar analytics:', error);
        res.json({ success: false, message: 'Erro ao registrar analytics.' });
    } finally {
        client.release();
    }
}));

module.exports = router;

