/**
 * KingBrief – Controller
 * create (multipart audio), list, getById, update (PATCH), remove, usage
 */

const config = require('../../config');
const logger = require('../../utils/logger');
const repository = require('./kingbrief.repository');
const service = require('./kingbrief.service');
const { asyncHandler } = require('../../middleware/errorHandler');
const responseFormatter = require('../../utils/responseFormatter');

/**
 * POST /api/kingbrief – Upload áudio, transcrever, gerar resumo/mapa mental, gravar
 */
async function create(req, res) {
    const file = req.file;
    if (!file || !file.buffer) {
        return responseFormatter.error(res, 'Nenhum ficheiro de áudio enviado.', 400);
    }
    const maxSize = config.upload.kingbriefMaxFileSize || 200 * 1024 * 1024;
    if (file.size > maxSize) {
        return responseFormatter.error(res, `Ficheiro demasiado grande. Máximo: ${Math.round(maxSize / 1024 / 1024)}MB.`, 413);
    }
    const mime = (file.mimetype || '').toLowerCase();
    if (!mime.startsWith('audio/')) {
        return responseFormatter.error(res, 'Apenas ficheiros de áudio são permitidos.', 400);
    }

    const title = (req.body && req.body.title) ? String(req.body.title).trim() || null : null;
    const userId = req.user.userId;

    try {
        const meeting = await service.processAudio(
            userId,
            file.buffer,
            file.mimetype,
            file.originalname,
            title
        );
        return responseFormatter.success(res, meeting, 'Reunião processada com sucesso.', 201);
    } catch (err) {
        logger.error('KingBrief create error', { userId, error: err.message });
        if (err.message && (err.message.includes('transcrição') || err.message.includes('resumo') || err.message.includes('indisponível') || err.message.includes('Limite'))) {
            return res.status(503).json({
                success: false,
                message: err.message || 'Serviço temporariamente indisponível. Tente novamente.'
            });
        }
        return responseFormatter.error(res, err.message || 'Erro ao processar áudio.', 500);
    }
}

/**
 * GET /api/kingbrief – Listar reuniões do utilizador (paginação)
 */
async function list(req, res) {
    const userId = req.user.userId;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    try {
        const { items, total } = await repository.findByUserId(userId, page, limit);
        return responseFormatter.success(res, { items, total });
    } catch (err) {
        logger.error('KingBrief list error', { userId, error: err.message });
        return responseFormatter.error(res, err.message || 'Erro ao listar reuniões.', 500);
    }
}

/**
 * GET /api/kingbrief/:id – Obter uma reunião
 */
async function getById(req, res) {
    const userId = req.user.userId;
    const id = req.params.id;
    if (!id) return responseFormatter.error(res, 'ID inválido.', 400);

    try {
        const meeting = await repository.findById(id, userId);
        if (!meeting) return responseFormatter.error(res, 'Reunião não encontrada.', 404);
        return responseFormatter.success(res, meeting);
    } catch (err) {
        logger.error('KingBrief getById error', { userId, id, error: err.message });
        return responseFormatter.error(res, err.message || 'Erro.', 500);
    }
}

/**
 * PATCH /api/kingbrief/:id – Atualizar actions_json e/ou title
 */
async function update(req, res) {
    const userId = req.user.userId;
    const id = req.params.id;
    if (!id) return responseFormatter.error(res, 'ID inválido.', 400);
    const body = req.body || {};
    const updates = {};
    if (body.actions_json !== undefined) updates.actions_json = body.actions_json;
    if (body.title !== undefined) updates.title = body.title;
    if (Object.keys(updates).length === 0) {
        return responseFormatter.error(res, 'Nada para atualizar (actions_json ou title).', 400);
    }

    try {
        const meeting = await repository.update(id, userId, updates);
        if (!meeting) return responseFormatter.error(res, 'Reunião não encontrada.', 404);
        return responseFormatter.success(res, meeting, 'Reunião atualizada.');
    } catch (err) {
        logger.error('KingBrief update error', { userId, id, error: err.message });
        return responseFormatter.error(res, err.message || 'Erro.', 500);
    }
}

/**
 * DELETE /api/kingbrief/:id
 */
async function remove(req, res) {
    const userId = req.user.userId;
    const id = req.params.id;
    if (!id) return responseFormatter.error(res, 'ID inválido.', 400);

    try {
        const deleted = await repository.remove(id, userId);
        if (!deleted) return responseFormatter.error(res, 'Reunião não encontrada.', 404);
        return res.status(204).send();
    } catch (err) {
        logger.error('KingBrief remove error', { userId, id, error: err.message });
        return responseFormatter.error(res, err.message || 'Erro.', 500);
    }
}

/**
 * GET /api/kingbrief/usage – Estatísticas de uso (total e opcionalmente este mês)
 */
async function usage(req, res) {
    const userId = req.user.userId;
    try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const { total, countThisMonth } = await repository.countByUser(userId, startOfMonth.toISOString());
        return responseFormatter.success(res, { total, countThisMonth });
    } catch (err) {
        logger.error('KingBrief usage error', { userId, error: err.message });
        return responseFormatter.error(res, err.message || 'Erro.', 500);
    }
}

module.exports = {
    create,
    list,
    getById,
    update,
    remove,
    usage
};
