// Rotas de Notificações Push (Melhoria 21)
const express = require('express');
const router = express.Router();
const { protectUser } = require('../middleware/protectUser');
const asyncHandler = require('../middleware/asyncHandler');
const { savePushSubscription, vapidPublicKey } = require('../utils/pushNotificationService');

/**
 * GET /api/push/vapid-public-key - Obter chave pública VAPID
 */
router.get('/vapid-public-key', (req, res) => {
    if (!vapidPublicKey) {
        return res.status(503).json({
            success: false,
            message: 'Push notifications não configuradas'
        });
    }
    
    res.json({
        success: true,
        publicKey: vapidPublicKey
    });
});

/**
 * POST /api/push/subscribe - Registrar subscrição push
 */
router.post('/subscribe', protectUser, asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { subscription, userAgent } = req.body;
    
    if (!subscription || !subscription.endpoint || !subscription.keys) {
        return res.status(400).json({
            success: false,
            message: 'Subscrição inválida'
        });
    }
    
    try {
        const subscriptionId = await savePushSubscription(userId, {
            ...subscription,
            userAgent: userAgent || req.headers['user-agent']
        });
        
        res.json({
            success: true,
            message: 'Subscrição registrada com sucesso',
            subscriptionId
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Erro ao registrar subscrição',
            error: error.message
        });
    }
}));

module.exports = router;
