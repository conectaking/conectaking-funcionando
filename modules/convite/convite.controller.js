const path = require('path');
const fs = require('fs');
const conviteService = require('./convite.service');
const responseFormatter = require('../../utils/responseFormatter');
const logger = require('../../utils/logger');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'convite', 'audio');

async function getConfig(req, res) {
    try {
        const itemId = parseInt(req.params.itemId, 10);
        if (!itemId) return responseFormatter.error(res, 'itemId inválido', 400);
        const config = await conviteService.getConfig(itemId, req.user.userId);
        return responseFormatter.success(res, config);
    } catch (e) {
        logger.error('convite getConfig:', e);
        return responseFormatter.error(res, e.message || 'Erro ao carregar convite', 403);
    }
}

async function saveConfig(req, res) {
    try {
        const itemId = parseInt(req.params.itemId, 10);
        if (!itemId) return responseFormatter.error(res, 'itemId inválido', 400);
        const config = await conviteService.saveConfig(itemId, req.user.userId, req.body || {});
        return responseFormatter.success(res, config, 'Convite salvo.');
    } catch (e) {
        logger.error('convite saveConfig:', e);
        return responseFormatter.error(res, e.message || 'Erro ao salvar convite', 400);
    }
}

async function getPreviewLink(req, res) {
    try {
        const itemId = parseInt(req.query.itemId || req.params.itemId, 10);
        if (!itemId) return responseFormatter.error(res, 'itemId inválido', 400);
        const url = await conviteService.getPreviewLink(itemId, req.user.userId);
        if (!url) return responseFormatter.error(res, 'Convite não encontrado', 404);
        return responseFormatter.success(res, { preview_url: url });
    } catch (e) {
        logger.error('convite getPreviewLink:', e);
        return responseFormatter.error(res, e.message || 'Erro', 400);
    }
}

async function getStats(req, res) {
    try {
        const itemId = parseInt(req.params.itemId, 10);
        if (!itemId) return responseFormatter.error(res, 'itemId inválido', 400);
        const stats = await conviteService.getStats(itemId, req.user.userId);
        return responseFormatter.success(res, stats);
    } catch (e) {
        logger.error('convite getStats:', e);
        return responseFormatter.error(res, e.message || 'Erro', 403);
    }
}

/** Servir áudio do convite (rota pública para o convite poder tocar) */
function serveAudio(req, res) {
    const filename = (req.params.filename || '').replace(/[^a-zA-Z0-9._-]/g, '');
    if (!filename) return res.status(400).send('Nome inválido');
    const filePath = path.join(UPLOAD_DIR, filename);
    if (!fs.existsSync(filePath)) return res.status(404).send('Arquivo não encontrado');
    const ext = path.extname(filename).toLowerCase();
    const types = { '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.m4a': 'audio/mp4' };
    res.type(types[ext] || 'application/octet-stream');
    res.sendFile(filePath);
}

/** Upload de áudio: salva em uploads/convite/audio e retorna URL */
async function uploadAudio(req, res) {
    try {
        if (!req.file) return responseFormatter.error(res, 'Nenhum arquivo enviado', 400);
        const ext = (path.extname(req.file.originalname) || '.mp3').toLowerCase().replace(/[^a-z.]/g, '') || '.mp3';
        if (!['.mp3', '.ogg', '.wav', '.m4a'].includes(ext)) {
            return responseFormatter.error(res, 'Formato de áudio não permitido. Use MP3, OGG, WAV ou M4A.', 400);
        }
        const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        const dest = path.join(UPLOAD_DIR, safeName);
        fs.writeFileSync(dest, req.file.buffer);
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const url = `${baseUrl}/api/convite/audio/${safeName}`;
        return responseFormatter.success(res, { url });
    } catch (e) {
        logger.error('convite uploadAudio:', e);
        return responseFormatter.error(res, e.message || 'Erro ao enviar áudio', 500);
    }
}

module.exports = {
    getConfig,
    saveConfig,
    getPreviewLink,
    getStats,
    serveAudio,
    uploadAudio
};
