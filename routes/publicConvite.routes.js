/**
 * Rotas públicas do módulo Convite Digital
 * GET /:slug/convite - Página do convite (e ?preview=token para preview)
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const conviteService = require('../modules/convite/convite.service');
const logger = require('../utils/logger');

router.get('/:slug/convite', asyncHandler(async (req, res) => {
    const { slug } = req.params;
    const previewToken = (req.query.preview || '').trim() || null;
    try {
        const item = await conviteService.getPublicBySlug(slug, { previewToken });
        if (!item) {
            return res.status(404).send(`
                <!DOCTYPE html>
                <html><head><meta charset="utf-8"><title>Convite não encontrado</title></head>
                <body style="font-family:sans-serif;text-align:center;padding:3rem;">
                    <h1>Convite não encontrado</h1>
                    <p>O link pode estar incorreto ou o convite foi desativado.</p>
                </body></html>
            `);
        }
        if (!previewToken) {
            conviteService.recordView(item.id).catch(() => {});
        }
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        res.render('convitePublic', {
            convite: item,
            slug,
            baseUrl,
            API_URL: process.env.FRONTEND_URL || baseUrl
        });
    } catch (e) {
        logger.error('publicConvite:', e);
        res.status(500).send('<h1>Erro ao carregar convite</h1>');
    }
}));

module.exports = router;
