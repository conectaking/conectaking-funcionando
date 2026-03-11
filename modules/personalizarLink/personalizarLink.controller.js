/**
 * Controller: imagem OG e configuração do link preview (ADM).
 */
const service = require('./personalizarLink.service');
const logger = require('../../utils/logger');

async function getOgImage(req, res) {
    try {
        const buffer = await service.generateOgImageBuffer();
        res.set('Content-Type', 'image/jpeg');
        res.set('Cache-Control', 'public, max-age=3600');
        res.set('Content-Length', buffer.length);
        return res.send(buffer);
    } catch (err) {
        logger.error('Erro ao gerar imagem OG:', err);
        try {
            const fallback = await service.getFallbackOgImageBuffer();
            res.set('Content-Type', 'image/jpeg');
            return res.send(fallback);
        } catch (e) {
            return res.status(500).send('Erro ao gerar imagem.');
        }
    }
}

async function getLinkPreviewConfig(req, res) {
    try {
        const result = await service.getLinkPreviewConfig();
        return res.json(result);
    } catch (err) {
        logger.error('Erro ao buscar configuração do link preview:', err);
        throw err;
    }
}

async function postLinkPreviewConfig(req, res) {
    try {
        const result = await service.saveLinkPreviewConfig(req.body || {});
        return res.json({ success: true, config: result.config });
    } catch (err) {
        logger.error('Erro ao salvar configuração do link preview:', err);
        throw err;
    }
}

module.exports = {
    getOgImage,
    getLinkPreviewConfig,
    postLinkPreviewConfig,
};
