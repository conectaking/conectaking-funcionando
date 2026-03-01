/**
 * KingBrief – Controller
 * create (upload áudio), list, getById, update (PATCH), delete, usage.
 */

const service = require('./kingbrief.service');
const responseFormatter = require('../../utils/responseFormatter');
const logger = require('../../utils/logger');

/** POST /upload-url: devolve URL assinada para o browser fazer PUT direto no R2 (evita SSL Render→R2). */
async function uploadUrl(req, res) {
    try {
        const userId = req.user.userId;
        const { contentType, filename } = req.body || {};
        if (!contentType || !String(contentType).startsWith('audio/')) {
            return responseFormatter.error(res, 'contentType de áudio é obrigatório (ex.: audio/webm, audio/mpeg).', 400);
        }
        const result = await service.getUploadUrl(userId, {
            contentType: String(contentType).trim(),
            filename: filename ? String(filename).trim() : undefined
        });
        return responseFormatter.success(res, result);
    } catch (err) {
        const msg = err.message || 'Erro ao obter URL de upload.';
        const status = err.statusCode || 500;
        if (msg.includes('R2 não configurado') || msg.includes('R2_PUBLIC_BASE_URL')) {
            return responseFormatter.error(res, msg, 503);
        }
        return responseFormatter.error(res, msg, status);
    }
}

/** POST /confirm: áudio já subido no R2; backend obtém pela URL pública, transcreve e resume. */
async function confirm(req, res) {
    try {
        const userId = req.user.userId;
        const { key, publicUrl, title, contentType, filename, durationSeconds } = req.body || {};
        if (!key || !publicUrl) {
            return responseFormatter.error(res, 'key e publicUrl são obrigatórios.', 400);
        }
        const meeting = await service.processAudioFromUrl(userId, {
            key,
            publicUrl,
            title: title ? String(title).trim() : null,
            contentType: contentType ? String(contentType).trim() : undefined,
            filename: filename ? String(filename).trim() : undefined,
            durationSeconds: durationSeconds != null && Number.isFinite(Number(durationSeconds)) ? Number(durationSeconds) : undefined
        });
        return responseFormatter.success(res, meeting, 'Reunião processada com sucesso.', 201);
    } catch (err) {
        logger.error('KingBrief confirm error', { error: err.message, userId: req.user?.userId });
        let status = err.statusCode || 500;
        let message = err.message || 'Erro ao processar o áudio.';
        if (err.statusCode === 400 || message.includes('demasiado grande') || message.includes('25 MB')) {
            status = 400;
        }
        if (message.includes('OPENAI_API_KEY') || (message.includes('transcrição') && message.includes('não configurado'))) {
            status = 503;
            message = 'Serviço de transcrição/resumo não configurado. Configure a variável OPENAI_API_KEY no servidor (backend) para usar transcrição (Whisper) e resumo (GPT).';
        }
        if (message.includes('R2_PUBLIC_BASE_URL') || message.includes('Não foi possível obter o áudio')) {
            status = 503;
        }
        return responseFormatter.error(res, message, status);
    }
}

async function create(req, res) {
    try {
        const userId = req.user.userId;
        const file = req.file;
        const title = (req.body && req.body.title) ? String(req.body.title).trim() : null;
        const durationSeconds = req.body && req.body.durationSeconds != null ? Number(req.body.durationSeconds) : null;

        if (!file || !file.buffer) {
            return responseFormatter.error(res, 'Nenhum ficheiro de áudio enviado.', 400);
        }

        const meeting = await service.processAudio({
            userId,
            buffer: file.buffer,
            mimeType: file.mimetype,
            originalname: file.originalname,
            title: title || undefined,
            durationSeconds: durationSeconds != null && Number.isFinite(durationSeconds) ? durationSeconds : undefined
        });

        return responseFormatter.success(res, meeting, 'Reunião processada com sucesso.', 201);
    } catch (err) {
        logger.error('KingBrief create error', { error: err.message, userId: req.user?.userId });
        let status = err.statusCode || 500;
        let message = err.message || 'Erro ao processar o áudio.';
        if (err.statusCode === 400 || message.includes('demasiado grande') || message.includes('25 MB')) {
            status = 400;
        }
        if (message.includes('OPENAI_API_KEY') || (message.includes('transcrição') && message.includes('não configurado'))) {
            status = 503;
            message = 'Serviço de transcrição/resumo não configurado. Configure a variável OPENAI_API_KEY no servidor (backend) para usar transcrição (Whisper) e resumo (GPT).';
        }
        if (message.includes('Armazenamento de áudio não configurado') || message.includes('R2_')) {
            status = 503;
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

async function businessReport(req, res) {
    try {
        const userId = req.user.userId;
        const report = await service.getBusinessReport(req.params.id, userId);
        if (!report) {
            return responseFormatter.error(res, 'Reunião não encontrada.', 404);
        }
        return responseFormatter.success(res, report);
    } catch (err) {
        logger.error('KingBrief businessReport error', err);
        const status = err.statusCode || (err.message && err.message.includes('Limite') ? 429 : 503);
        return responseFormatter.error(res, err.message || 'Erro ao gerar relatório de negócio.', status);
    }
}

async function lessonReport(req, res) {
    try {
        const userId = req.user.userId;
        const report = await service.getLessonReport(req.params.id, userId);
        if (!report) {
            return responseFormatter.error(res, 'Reunião não encontrada.', 404);
        }
        return responseFormatter.success(res, report);
    } catch (err) {
        logger.error('KingBrief lessonReport error', err);
        const status = err.statusCode || (err.message && err.message.includes('Limite') ? 429 : 503);
        return responseFormatter.error(res, err.message || 'Erro ao gerar modo aula.', status);
    }
}

async function communicationReport(req, res) {
    try {
        const userId = req.user.userId;
        const report = await service.getCommunicationReport(req.params.id, userId);
        if (!report) {
            return responseFormatter.error(res, 'Reunião não encontrada.', 404);
        }
        return responseFormatter.success(res, report);
    } catch (err) {
        logger.error('KingBrief communicationReport error', err);
        const status = err.statusCode || (err.message && err.message.includes('Limite') ? 429 : 503);
        return responseFormatter.error(res, err.message || 'Erro ao gerar análise de comunicação.', status);
    }
}

async function update(req, res) {
    try {
        const userId = req.user.userId;
        const { actions_json, title, mindmap_json, transcript } = req.body || {};
        const updates = {};
        if (actions_json !== undefined) updates.actions_json = actions_json;
        if (title !== undefined) updates.title = title;
        if (mindmap_json !== undefined) updates.mindmap_json = mindmap_json;
        if (transcript !== undefined) updates.transcript = transcript;
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

/** GET /shared/:token – público, sem auth. Devolve reunião em modo só leitura. */
async function getSharedByToken(req, res) {
    try {
        const token = req.params.token;
        if (!token) return responseFormatter.error(res, 'Token em falta.', 400);
        const meeting = await service.getSharedMeeting(token);
        if (!meeting) return responseFormatter.error(res, 'Link inválido ou expirado.', 404);
        return responseFormatter.success(res, meeting);
    } catch (err) {
        logger.error('KingBrief getSharedByToken error', err);
        return responseFormatter.error(res, err.message || 'Erro ao obter reunião.', 500);
    }
}

/** POST /:id/improve-text – melhora a transcrição (ortografia, fluência). Devolve improved_text; opcional body.apply=true para guardar na reunião. */
async function improveText(req, res) {
    try {
        const userId = req.user.userId;
        const id = req.params.id;
        const apply = !!(req.body && req.body.apply === true);
        const meeting = await service.findById(id, userId);
        if (!meeting) return responseFormatter.error(res, 'Reunião não encontrada.', 404);
        const transcript = meeting.transcript || '';
        if (!transcript.trim()) return responseFormatter.error(res, 'Esta reunião não tem transcrição para melhorar.', 400);
        const result = await service.improveTranscript(id, userId, transcript, apply);
        return responseFormatter.success(res, result, apply ? 'Texto melhorado e guardado.' : 'Texto melhorado (use "Aplicar" para guardar na reunião).');
    } catch (err) {
        logger.error('KingBrief improveText error', err);
        const status = err.statusCode || (err.message && err.message.includes('Limite') ? 429 : 503);
        return responseFormatter.error(res, err.message || 'Erro ao melhorar o texto.', status);
    }
}

/** POST /:id/regenerate-mindmap – regenera mapa mental v2 a partir dos segmentos guardados. */
async function regenerateMindmap(req, res) {
    try {
        const userId = req.user.userId;
        const id = req.params.id;
        const meeting = await service.regenerateMindmapV2(id, userId);
        return responseFormatter.success(res, meeting, 'Mapa mental regenerado. Atualize a página para ver.');
    } catch (err) {
        logger.error('KingBrief regenerateMindmap error', err);
        const status = err.statusCode || 400;
        return responseFormatter.error(res, err.message || 'Erro ao regenerar mapa mental.', status);
    }
}

/** POST /:id/share – gera ou devolve share_token e URL partilhável (requer auth). */
async function generateShareToken(req, res) {
    try {
        const userId = req.user.userId;
        const id = req.params.id;
        if (!id) return responseFormatter.error(res, 'ID da reunião em falta.', 400);
        const result = await service.ensureShareToken(id, userId);
        if (!result) return responseFormatter.error(res, 'Reunião não encontrada.', 404);
        return responseFormatter.success(res, result);
    } catch (err) {
        logger.error('KingBrief generateShareToken error', err);
        return responseFormatter.error(res, err.message || 'Erro ao gerar link.', 500);
    }
}

module.exports = {
    uploadUrl,
    confirm,
    create,
    list,
    getById,
    update,
    remove,
    usage,
    businessReport,
    lessonReport,
    communicationReport,
    improveText,
    regenerateMindmap,
    getSharedByToken,
    generateShareToken
};
