const express = require('express');
const router = express.Router();
const db = require('../db');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * GET /contract/sign/:id - Página pública para assinar contrato
 */
router.get('/sign/:id', asyncHandler(async (req, res) => {
    const client = await db.pool.connect();
    try {
        const contractId = parseInt(req.params.id, 10);
        
        // Buscar contrato
        const result = await client.query(`
            SELECT 
                pi.*,
                ci.*,
                u.profile_slug
            FROM profile_items pi
            INNER JOIN contract_items ci ON ci.profile_item_id = pi.id
            INNER JOIN users u ON u.id = pi.user_id
            WHERE pi.id = $1 AND pi.item_type = 'contract' AND pi.is_active = true
        `, [contractId]);
        
        if (result.rows.length === 0) {
            return res.status(404).render('error', {
                message: 'Contrato não encontrado ou inativo',
                title: 'Erro'
            });
        }
        
        const contract = result.rows[0];
        
        res.render('contractSign', {
            contract
        });
    } catch (error) {
        logger.error('Erro ao carregar página de assinatura:', error);
        res.status(500).render('error', {
            message: 'Erro ao carregar contrato',
            title: 'Erro'
        });
    } finally {
        client.release();
    }
}));

module.exports = router;

