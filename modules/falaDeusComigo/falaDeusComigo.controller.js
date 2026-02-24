const service = require('./falaDeusComigo.service');
const responseFormatter = require('../../utils/responseFormatter');
const logger = require('../../utils/logger');

async function getConfig(req, res) {
    try {
        const itemId = parseInt(req.params.itemId, 10);
        if (!itemId) return responseFormatter.error(res, 'itemId inválido', 400);
        const config = await service.getConfig(itemId, req.user.userId);
        if (!config) return responseFormatter.error(res, 'Módulo não encontrado ou acesso negado', 404);
        return responseFormatter.success(res, config);
    } catch (e) {
        logger.error('falaDeusComigo getConfig:', e);
        return responseFormatter.error(res, e.message || 'Erro ao buscar config', 500);
    }
}

async function listMensagens(req, res) {
    try {
        const itemId = parseInt(req.params.itemId, 10);
        if (!itemId) return responseFormatter.error(res, 'itemId inválido', 400);
        const list = await service.listMensagens(itemId, req.user.userId);
        return responseFormatter.success(res, { mensagens: list });
    } catch (e) {
        logger.error('falaDeusComigo listMensagens:', e);
        return responseFormatter.error(res, e.message || 'Erro ao listar mensagens', 500);
    }
}

async function createMensagem(req, res) {
    try {
        const itemId = parseInt(req.params.itemId, 10);
        if (!itemId) return responseFormatter.error(res, 'itemId inválido', 400);
        const body = req.body || {};
        const created = await service.createMensagem(itemId, req.user.userId, {
            versiculo_ref: body.versiculo_ref,
            versiculo_texto: body.versiculo_texto,
            resumo: body.resumo,
            mensagem: body.mensagem,
            attachment_url: body.attachment_url,
            display_order: body.display_order
        });
        return res.status(201).json(created);
    } catch (e) {
        logger.error('falaDeusComigo createMensagem:', e);
        return responseFormatter.error(res, e.message || 'Erro ao criar mensagem', 500);
    }
}

async function updateMensagem(req, res) {
    try {
        const itemId = parseInt(req.params.itemId, 10);
        const mensagemId = parseInt(req.params.mensagemId, 10);
        if (!itemId || !mensagemId) return responseFormatter.error(res, 'itemId ou mensagemId inválido', 400);
        const body = req.body || {};
        const updated = await service.updateMensagem(mensagemId, itemId, req.user.userId, {
            versiculo_ref: body.versiculo_ref,
            versiculo_texto: body.versiculo_texto,
            resumo: body.resumo,
            mensagem: body.mensagem,
            attachment_url: body.attachment_url,
            display_order: body.display_order
        });
        if (!updated) return responseFormatter.error(res, 'Mensagem não encontrada', 404);
        return responseFormatter.success(res, updated);
    } catch (e) {
        logger.error('falaDeusComigo updateMensagem:', e);
        return responseFormatter.error(res, e.message || 'Erro ao atualizar mensagem', 500);
    }
}

async function deleteMensagem(req, res) {
    try {
        const itemId = parseInt(req.params.itemId, 10);
        const mensagemId = parseInt(req.params.mensagemId, 10);
        if (!itemId || !mensagemId) return responseFormatter.error(res, 'itemId ou mensagemId inválido', 400);
        await service.deleteMensagem(mensagemId, itemId, req.user.userId);
        return responseFormatter.success(res, { deleted: true });
    } catch (e) {
        logger.error('falaDeusComigo deleteMensagem:', e);
        return responseFormatter.error(res, e.message || 'Erro ao excluir mensagem', 500);
    }
}

async function uploadAndExtractText(req, res) {
    try {
        const itemId = parseInt(req.params.itemId, 10);
        if (!itemId) return responseFormatter.error(res, 'itemId inválido', 400);
        if (!req.file || !req.file.buffer) {
            return responseFormatter.error(res, 'Envie um arquivo PDF ou Word (.doc, .docx).', 400);
        }
        const repo = require('./falaDeusComigo.repository');
        const owned = await repo.ensureOwnership(itemId, req.user.userId);
        if (!owned) return responseFormatter.error(res, 'Acesso negado a este módulo.', 403);

        const buffer = req.file.buffer;
        const mime = (req.file.mimetype || '').toLowerCase();
        const pathModule = require('path');
        const ext = pathModule.extname((req.file.originalname || '').toLowerCase());
        let text = '';
        const pdfParse = require('pdf-parse');
        const mammoth = require('mammoth');

        if (mime === 'application/pdf' || ext === '.pdf') {
            const data = await pdfParse(buffer);
            text = (data && data.text) ? data.text : '';
        } else {
            const result = await mammoth.extractRawText({ buffer });
            text = (result && result.value) ? result.value : '';
        }
        text = (text || '').trim();

        const uploadHelper = require('./falaDeusComigo.upload');
        let attachmentUrl = null;
        if (uploadHelper.isR2Configured()) {
            try {
                attachmentUrl = await uploadHelper.uploadAttachment(
                    buffer,
                    req.user.userId,
                    itemId,
                    req.file.originalname,
                    req.file.mimetype
                );
            } catch (upErr) {
                logger.warn('falaDeusComigo uploadAndExtract: upload falhou', upErr.message);
            }
        }
        return responseFormatter.success(res, { text, attachment_url: attachmentUrl });
    } catch (e) {
        logger.error('falaDeusComigo uploadAndExtractText:', e);
        return responseFormatter.error(res, e.message || 'Erro ao processar arquivo.', 500);
    }
}

async function uploadAttachment(req, res) {
    try {
        const itemId = parseInt(req.params.itemId, 10);
        if (!itemId) return responseFormatter.error(res, 'itemId inválido', 400);
        if (!req.file || !req.file.buffer) {
            return responseFormatter.error(res, 'Envie um arquivo PDF ou Word (.doc, .docx).', 400);
        }
        const repo = require('./falaDeusComigo.repository');
        const owned = await repo.ensureOwnership(itemId, req.user.userId);
        if (!owned) return responseFormatter.error(res, 'Acesso negado a este módulo.', 403);
        const uploadHelper = require('./falaDeusComigo.upload');
        const attachmentUrl = await uploadHelper.uploadAttachment(
            req.file.buffer,
            req.user.userId,
            itemId,
            req.file.originalname,
            req.file.mimetype
        );
        return responseFormatter.success(res, { attachment_url: attachmentUrl });
    } catch (e) {
        logger.error('falaDeusComigo uploadAttachment:', e);
        if (e.message && e.message.includes('não está configurado')) {
            return res.status(503).json({ success: false, message: e.message });
        }
        return responseFormatter.error(res, e.message || 'Erro no upload.', 500);
    }
}

module.exports = {
    getConfig,
    listMensagens,
    createMensagem,
    updateMensagem,
    deleteMensagem,
    uploadAttachment,
    uploadAndExtractText
};
