const express = require('express');
const router = express.Router();
const controller = require('./linkLimits.controller');
const { protectUser } = require('../../middleware/protectUser');
const { asyncHandler } = require('../../middleware/errorHandler');

// Middleware para verificar se é admin
const protectAdmin = async (req, res, next) => {
    if (!req.user || !req.user.userId) {
        return res.status(401).json({ success: false, error: { message: 'Não autenticado' } });
    }

    try {
        const db = require('../../db');
        const result = await db.query('SELECT is_admin FROM users WHERE id = $1', [req.user.userId]);
        
        if (result.rows.length === 0 || !result.rows[0].is_admin) {
            return res.status(403).json({ success: false, error: { message: 'Acesso negado. Apenas administradores.' } });
        }
        
        next();
    } catch (error) {
        return res.status(500).json({ success: false, error: { message: 'Erro ao verificar permissões' } });
    }
};

// Todas as rotas requerem autenticação
router.use(protectUser);

// Rotas públicas (usuário autenticado)
router.get('/user', asyncHandler(async (req, res) => {
    await controller.getUserLimits(req, res);
}));

router.get('/check/:moduleType', asyncHandler(async (req, res) => {
    await controller.checkLimit(req, res);
}));

// Rotas administrativas (requerem admin)
router.get('/', protectAdmin, asyncHandler(async (req, res) => {
    await controller.getAll(req, res);
}));

router.put('/', protectAdmin, asyncHandler(async (req, res) => {
    await controller.upsert(req, res);
}));

router.post('/bulk-update', protectAdmin, asyncHandler(async (req, res) => {
    await controller.bulkUpdate(req, res);
}));

router.post('/reset-plan', protectAdmin, asyncHandler(async (req, res) => {
    await controller.resetPlan(req, res);
}));

router.post('/copy-plan', protectAdmin, asyncHandler(async (req, res) => {
    await controller.copyPlan(req, res);
}));

router.get('/stats', protectAdmin, asyncHandler(async (req, res) => {
    await controller.getStats(req, res);
}));

module.exports = router;
