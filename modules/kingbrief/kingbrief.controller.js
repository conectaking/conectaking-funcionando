/**
 * KingBrief – Controller
 * create (upload áudio), list, getById, update (PATCH), delete, usage.
 */

const service = require('./kingbrief.service');
const responseFormatter = require('../../utils/responseFormatter');
const logger = require('../../utils/logger');

async function create(req, res) {
    try {
        const userId = req.user.userId;
        const file = req.file;
        const title = (req.body && req.body.title) ? String(req.body.title).trim() : null;

        if (!file || !file.buffer) {
            return responseFormatter.error(res, 'Nenhum ficheiro de áudio enviado.', 400);
        }

        const meeting = await service.processAudio({
            userId,
            buffer: file.buffer,
            mimeType: file.mimetype,
            originalname: file.originalname,
            title: title || undefined
        });

        return responseFormatter.success(res, meeting, 'Reunião processada com sucesso.', 201);
    } catch (err) {
        logger.error('KingBrief create error', { error: err.message, userId: req.user?.userId });
        let status = err.statusCode || 500;
        let message = err.message || 'Erro ao processar o áudio.';
        if (message.includes('OPENAI_API_KEY') || message.includes('não configurado') || message.includes('não configurada')) {
            status = 503;
            message = 'Serviço de transcrição/resumo não configurado. Configure a variável OPENAI_API_KEY no servidor (backend) para usar transcrição (Whisper) e resumo (GPT).';
        }
        return responseFormatter.error(res, message, status);
    }
}

async function list(req, res) {
    try {
        const userId = req.user.userId;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const { items, total } = await service.findByUserId(userId, page, limit);
        return responseFormatter.success(res, { items, total });
    } catch (err) {
        logger.error('KingBrief list error', err);
        return responseFormatter.error(res, err.message || 'Erro ao listar reuniões.', 500);
    }
}

async function getById(req, res) {
    try {
        const userId = req.user.userId;
        const meeting = await service.findById(req.params.id, userId);
        if (!meeting) {
            return responseFormatter.error(res, 'Reunião não encontrada.', 404);
        }
        return responseFormatter.success(res, meeting);
    } catch (err) {
        logger.error('KingBrief getById error', err);
        return responseFormatter.error(res, err.message || 'Erro ao obter reunião.', 500);
    }
}

async function update(req, res) {
    try {
        const userId = req.user.userId;
        const { actions_json, title } = req.body || {};
        const updates = {};
        if (actions_json !== undefined) updates.actions_json = actions_json;
        if (title !== undefined) updates.title = title;
        const meeting = await service.update(req.params.id, userId, updates);
        if (!meeting) {
            return responseFormatter.error(res, 'Reunião não encontrada.', 404);
        }
        return responseFormatter.success(res, meeting, 'Alterações guardadas.');
    } catch (err) {
        logger.error('KingBrief update error', err);
        return responseFormatter.error(res, err.message || 'Erro ao atualizar.', 500);
    }
}

async function remove(req, res) {
    try {
        const userId = req.user.userId;
        const deleted = await service.remove(req.params.id, userId);
        if (!deleted) {
            return responseFormatter.error(res, 'Reunião não encontrada.', 404);
        }
        return res.status(204).send();
    } catch (err) {
        logger.error('KingBrief remove error', err);
        return responseFormatter.error(res, err.message || 'Erro ao eliminar.', 500);
    }
}

async function usage(req, res) {
    try {
        const userId = req.user.userId;
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setUTCHours(0, 0, 0, 0);
        const { total, countThisMonth } = await service.countByUser(userId, startOfMonth.toISOString());
        return responseFormatter.success(res, { total, countThisMonth });
    } catch (err) {
        logger.error('KingBrief usage error', err);
        return responseFormatter.error(res, err.message || 'Erro ao obter uso.', 500);
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
