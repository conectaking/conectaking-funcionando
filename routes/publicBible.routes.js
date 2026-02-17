/**
 * Rotas públicas do módulo Bíblia
 * GET /:slug/bible - Página do versículo do dia
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const db = require('../db');
const logger = require('../utils/logger');

router.get('/:slug/bible', asyncHandler(async (req, res) => {
    const { slug } = req.params;
    try {
        const client = await db.pool.connect();
        try {
            const userRes = await client.query(
                `SELECT id FROM users WHERE LOWER(profile_slug) = LOWER($1) LIMIT 1`,
                [slug]
            );
            if (userRes.rows.length === 0) {
                return res.status(404).send(`
                    <!DOCTYPE html>
                    <html><head><meta charset="utf-8"><title>Bíblia não encontrada</title></head>
                    <body style="font-family:sans-serif;text-align:center;padding:3rem;background:#0D0D0F;color:#ECECEC;">
                        <h1>Bíblia não encontrada</h1>
                        <p>O link pode estar incorreto ou o módulo foi desativado.</p>
                    </body></html>
                `);
            }
            const userId = userRes.rows[0].id;

            const itemRes = await client.query(
                `SELECT pi.id, bi.translation_code
                 FROM profile_items pi
                 LEFT JOIN bible_items bi ON bi.profile_item_id = pi.id
                 WHERE pi.user_id = $1 AND pi.item_type = 'bible' AND pi.is_active = true
                 LIMIT 1`,
                [userId]
            );
            if (itemRes.rows.length === 0) {
                return res.status(404).send(`
                    <!DOCTYPE html>
                    <html><head><meta charset="utf-8"><title>Bíblia não encontrada</title></head>
                    <body style="font-family:sans-serif;text-align:center;padding:3rem;background:#0D0D0F;color:#ECECEC;">
                        <h1>Bíblia não encontrada</h1>
                        <p>Este perfil não possui o módulo Bíblia ativo.</p>
                    </body></html>
                `);
            }

            const translation = itemRes.rows[0].translation_code || 'nvi';
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            res.render('biblePublic', {
                slug,
                translation,
                baseUrl,
                API_URL: process.env.FRONTEND_URL || baseUrl
            });
        } finally {
            client.release();
        }
    } catch (e) {
        logger.error('publicBible:', e);
        res.status(500).send('<h1>Erro ao carregar Bíblia</h1>');
    }
}));

module.exports = router;
