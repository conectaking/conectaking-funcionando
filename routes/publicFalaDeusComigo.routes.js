/**
 * Rotas públicas do módulo Fala Deus Comigo
 * GET /:slug/fala-deus-comigo - Página que sorteia uma mensagem/versículo por visita
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const db = require('../db');
const logger = require('../utils/logger');
const falaDeusComigoService = require('../modules/falaDeusComigo/falaDeusComigo.service');

router.get('/:slug/fala-deus-comigo', asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const client = await db.pool.connect();
    try {
        const userRes = await client.query(
            'SELECT id FROM users WHERE LOWER(profile_slug) = LOWER($1) LIMIT 1',
            [slug]
        );
        if (userRes.rows.length === 0) {
            return res.status(404).send(
                '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Não encontrado</title></head>' +
                '<body style="font-family:sans-serif;text-align:center;padding:3rem;background:#0D0D0F;color:#ECECEC;">' +
                '<h1>Página não encontrada</h1><p>Este perfil não existe ou o módulo Fala Deus Comigo não está ativo.</p></body></html>'
            );
        }
        const itemRes = await client.query(
            `SELECT pi.id, pi.title, pi.image_url
             FROM profile_items pi
             INNER JOIN fala_deus_comigo_items fdci ON fdci.profile_item_id = pi.id
             WHERE pi.user_id = $1 AND pi.item_type = 'fala_deus_comigo' AND pi.is_active = true
             LIMIT 1`,
            [userRes.rows[0].id]
        );
        if (itemRes.rows.length === 0) {
            return res.status(404).send(
                '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Não encontrado</title></head>' +
                '<body style="font-family:sans-serif;text-align:center;padding:3rem;background:#0D0D0F;color:#ECECEC;">' +
                '<h1>Módulo não disponível</h1><p>Fala Deus Comigo não está configurado para este perfil.</p></body></html>'
            );
        }
        const profileItemId = itemRes.rows[0].id;
        const message = await falaDeusComigoService.getRandomMessageByProfileItemId(profileItemId);
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const cardUrl = `${baseUrl}/${slug}`;
        res.render('falaDeusComigoPublic', {
            slug,
            cardUrl,
            title: itemRes.rows[0].title || 'Fala Deus Comigo',
            logoUrl: itemRes.rows[0].image_url || null,
            message: message || null
        });
    } catch (e) {
        logger.error('publicFalaDeusComigo:', e);
        res.status(500).send('<h1>Erro ao carregar</h1>');
    } finally {
        client.release();
    }
}));

module.exports = router;
