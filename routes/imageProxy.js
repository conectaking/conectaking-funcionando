const express = require('express');
const router = express.Router();
const sharp = require('sharp');
const fetch = require('node-fetch');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/** WhatsApp/Facebook: preferir JPEG 1200×630 e < ~300 KB */
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;
const OG_JPEG_QUALITY = 82;
const DEFAULT_OG_FALLBACK = 'https://i.ibb.co/60sW9k75/logo.png';

/**
 * Baixa imagem remota e devolve buffer JPEG 1200×630 (cover) com fundo escuro.
 * Usado em og:image do cartão — PNG grande / transparente quebra o preview do WhatsApp.
 */
async function buildOgJpegFromUrl(imageUrl) {
    const imageResponse = await fetch(imageUrl, {
        timeout: 20000,
        headers: { 'User-Agent': 'ConectaKing-OG/1.0' }
    });
    if (!imageResponse.ok) {
        throw new Error(`Erro ao baixar imagem: ${imageResponse.status} ${imageResponse.statusText}`);
    }
    const imageBuffer = await imageResponse.buffer();

    const resized = await sharp(imageBuffer)
        .rotate()
        .resize(OG_WIDTH, OG_HEIGHT, {
            fit: 'cover',
            position: 'centre',
            withoutEnlargement: false
        })
        .jpeg({ quality: OG_JPEG_QUALITY, mozjpeg: true })
        .toBuffer();

    // Se ainda ficar grande, recompacta
    if (resized.length > 450000) {
        return sharp(resized)
            .jpeg({ quality: 70, mozjpeg: true })
            .toBuffer();
    }
    return resized;
}

/**
 * Rota OG do cartão virtual — sempre JPEG 1200×630 para WhatsApp/Telegram/Facebook.
 * Query: ?url=https://...&v=cachebuster
 */
router.get('/profile-image', asyncHandler(async (req, res) => {
    let imageUrl = String(req.query.url || '').trim();
    if (!imageUrl) {
        imageUrl = DEFAULT_OG_FALLBACK;
    }
    // Bloquear URLs não http(s)
    if (!/^https?:\/\//i.test(imageUrl)) {
        return res.status(400).json({ error: 'URL da imagem inválida' });
    }

    try {
        let processedBuffer;
        try {
            processedBuffer = await buildOgJpegFromUrl(imageUrl);
        } catch (inner) {
            logger.warn('OG profile-image: falha na URL, usando fallback', {
                message: inner.message,
                imageUrl: imageUrl.substring(0, 120)
            });
            processedBuffer = await buildOgJpegFromUrl(DEFAULT_OG_FALLBACK);
        }

        res.set('Content-Type', 'image/jpeg');
        res.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
        res.set('Content-Length', String(processedBuffer.length));
        // WhatsApp/Facebook crawlers
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        res.send(processedBuffer);
    } catch (error) {
        logger.error('Erro ao processar imagem OG:', error);
        res.status(500).json({ error: 'Erro ao processar imagem' });
    }
}));

module.exports = router;
