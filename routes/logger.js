const express = require('express');
const db = require('../db');
const router = express.Router();

const logEvent = async (userId, eventType, itemId = null, req) => {
    try {
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const userAgent = req.headers['user-agent'];
        
        await db.query(
            'INSERT INTO analytics_events (user_id, event_type, item_id, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5)',
            [userId, eventType, itemId, ip, userAgent]
        );
    } catch (error) {
        console.error('Erro ao registrar evento de analytics:', error);
    }
};

router.post('/view/:userId', async (req, res) => {
    await logEvent(req.params.userId, 'view', null, req);
    res.sendStatus(204);
});

router.post('/click/item/:itemId', async (req, res) => {
    const { itemId } = req.params;
    const client = await db.pool.connect();
    try {
        const itemRes = await client.query('SELECT user_id FROM profile_items WHERE id = $1', [itemId]);
        if (itemRes.rows.length > 0) {
            const userId = itemRes.rows[0].user_id;
            await logEvent(userId, 'click', itemId, req);
        }
        res.sendStatus(204);
    } catch (error) {
        res.sendStatus(500);
    } finally {
        client.release();
    }
});

router.post('/vcard/:userId', async (req, res) => {
    await logEvent(req.params.userId, 'vcard_download', null, req);
    res.sendStatus(204);
});

module.exports = router;