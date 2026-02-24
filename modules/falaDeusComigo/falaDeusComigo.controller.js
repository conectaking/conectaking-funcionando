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

module.exports = {
    getConfig,
    listMensagens,
    createMensagem,
    updateMensagem,
    deleteMensagem
};
