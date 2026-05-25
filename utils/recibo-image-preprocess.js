/**
 * Pré-processamento para prints de extrato (fundo escuro, texto claro).
 * Melhora Tesseract e OpenAI Vision no app de cartão.
 */
const logger = require('./logger');

async function preprocessarImagemExtrato(imageBuffer) {
    if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) return imageBuffer;
    try {
        const sharp = require('sharp');
        const base = sharp(imageBuffer).rotate();
        const stats = await base.clone().greyscale().stats();
        const mean = stats.channels && stats.channels[0] ? stats.channels[0].mean : 128;
        let pipe = base;
        // App de cartão: fundo marrom/preto, texto branco — inverte para OCR clássico
        if (mean < 100) {
            pipe = pipe.negate({ alpha: false });
        }
        return await pipe
            .normalize()
            .sharpen({ sigma: 1.6 })
            .resize(1600, null, { withoutEnlargement: true, fit: 'inside' })
            .jpeg({ quality: 90, mozjpeg: true })
            .toBuffer();
    } catch (e) {
        logger.warn('recibo-image-preprocess:', e.message);
        return imageBuffer;
    }
}

module.exports = { preprocessarImagemExtrato };
