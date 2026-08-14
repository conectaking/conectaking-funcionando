const express = require('express');
const router = express.Router();
const sharp = require('sharp');
const fetch = require('node-fetch');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * WhatsApp mostra o preview em quadrado (corta 16:9).
 * Geramos JPEG 1:1 com a foto INTEIRA (contain + fundo escuro).
 */
const OG_SIZE = 1200;
const OG_JPEG_QUALITY = 84;
const PAD = 48;
const INNER = OG_SIZE - PAD * 2;
const DEFAULT_OG_FALLBACK = 'https://i.ibb.co/60sW9k75/logo.png';
const BG = { r: 13, g: 13, b: 15, alpha: 1 };

async function buildOgJpegFromUrl(imageUrl) {
    const imageResponse = await fetch(imageUrl, {
        timeout: 20000,
        headers: { 'User-Agent': 'ConectaKing-OG/1.0' }
    });
    if (!imageResponse.ok) {
        throw new Error(`Erro ao baixar imagem: ${imageResponse.status} ${imageResponse.statusText}`);
    }
    const imageBuffer = await imageResponse.buffer();

    const fitted = await sharp(imageBuffer)
        .rotate()
        .resize(INNER, INNER, {
            fit: 'contain',
            background: BG,
            withoutEnlargement: false
        })
        .jpeg({ quality: OG_JPEG_QUALITY, mozjpeg: true })
        .toBuffer();

    const composed = await sharp({
        create: {
            width: OG_SIZE,
            height: OG_SIZE,
            channels: 3,
            background: { r: BG.r, g: BG.g, b: BG.b }
        }
    })
        .composite([{ input: fitted, gravity: 'centre' }])
        .jpeg({ quality: OG_JPEG_QUALITY, mozjpeg: true })
        .toBuffer();

    if (composed.length > 450000) {
        return sharp(composed).jpeg({ quality: 72, mozjpeg: true }).toBuffer();
    }
    return composed;
}

router.get('/profile-image', asyncHandler(async (req, res) => {
    let imageUrl = String(req.query.url || '').trim();
    if (!imageUrl) {
        imageUrl = DEFAULT_OG_FALLBACK;
    }
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
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        res.send(processedBuffer);
    } catch (error) {
        logger.error('Erro ao processar imagem OG:', error);
        res.status(500).json({ error: 'Erro ao processar imagem' });
    }
}));

module.exports = router;
