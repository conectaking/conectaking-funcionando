const documentosService = require('./documentos.service');
const { uploadImageBuffer } = require('../../utils/cloudflare-image-upload');
const { processarImagem } = require('../../utils/recibo-ocr');
const responseFormatter = require('../../utils/responseFormatter');
const logger = require('../../utils/logger');

async function create(req, res) {
    try {
        const body = req.body || {};
        const doc = await documentosService.create(req.user.userId, {
            tipo: body.tipo || 'recibo',
            titulo: body.titulo,
            emitente_json: body.emitente_json || {},
            cliente_json: body.cliente_json || {},
            itens_json: body.itens_json || [],
            anexos_json: body.anexos_json || [],
            observacoes: body.observacoes,
            data_documento: body.data_documento,
            validade_ate: body.validade_ate
        });
        return responseFormatter.success(res, doc, 'Documento criado.', 201);
    } catch (e) {
        logger.error('documentos create:', e);
        return responseFormatter.error(res, e.message || 'Erro ao criar documento', 500);
    }
}

async function list(req, res) {
    try {
        const tipo = req.query.tipo || null;
        const docs = await documentosService.list(req.user.userId, { tipo });
        return responseFormatter.success(res, { documentos: docs });
    } catch (e) {
        logger.error('documentos list:', e);
        return responseFormatter.error(res, e.message || 'Erro ao listar documentos', 500);
    }
}

async function getOne(req, res) {
    try {
        const id = parseInt(req.params.id, 10);
        if (!id) return responseFormatter.error(res, 'ID inválido', 400);
        const doc = await documentosService.getOne(id, req.user.userId);
        if (!doc) return responseFormatter.error(res, 'Documento não encontrado', 404);
        return responseFormatter.success(res, doc);
    } catch (e) {
        logger.error('documentos getOne:', e);
        return responseFormatter.error(res, e.message || 'Erro', 500);
    }
}

async function update(req, res) {
    try {
        const id = parseInt(req.params.id, 10);
        if (!id) return responseFormatter.error(res, 'ID inválido', 400);
        const body = req.body || {};
        const doc = await documentosService.update(id, req.user.userId, {
            titulo: body.titulo,
            emitente_json: body.emitente_json,
            cliente_json: body.cliente_json,
            itens_json: body.itens_json,
            anexos_json: body.anexos_json,
            observacoes: body.observacoes,
            data_documento: body.data_documento,
            validade_ate: body.validade_ate
        });
        if (!doc) return responseFormatter.error(res, 'Documento não encontrado', 404);
        return responseFormatter.success(res, doc, 'Documento atualizado.');
    } catch (e) {
        logger.error('documentos update:', e);
        return responseFormatter.error(res, e.message || 'Erro', 500);
    }
}

async function remove(req, res) {
    try {
        const id = parseInt(req.params.id, 10);
        if (!id) return responseFormatter.error(res, 'ID inválido', 400);
        const deleted = await documentosService.remove(id, req.user.userId);
        if (!deleted) return responseFormatter.error(res, 'Documento não encontrado', 404);
        return responseFormatter.success(res, { id: deleted.id }, 'Documento excluído.');
    } catch (e) {
        logger.error('documentos remove:', e);
        return responseFormatter.error(res, e.message || 'Erro', 500);
    }
}

async function uploadAnexo(req, res) {
    try {
        const id = parseInt(req.params.id, 10);
        if (!id) return responseFormatter.error(res, 'ID inválido', 400);
        if (!req.file || !req.file.buffer) return responseFormatter.error(res, 'Nenhuma imagem enviada.', 400);
        const url = await uploadImageBuffer(
            req.file.buffer,
            req.file.mimetype,
            req.file.originalname || 'comprovante.jpg'
        );
        const tipo_categoria = (req.body && req.body.tipo_categoria) || 'Outros';
        const valor = req.body && req.body.valor != null ? parseFloat(req.body.valor) : null;
        const descricao = (req.body && req.body.descricao) || null;
        const doc = await documentosService.addAnexo(id, req.user.userId, {
            url,
            tipo_categoria,
            valor,
            descricao
        });
        if (!doc) return responseFormatter.error(res, 'Documento não encontrado', 404);
        return responseFormatter.success(res, {
            url,
            documento: doc,
            anexo: { url, tipo_categoria, valor, descricao }
        }, 'Anexo adicionado.', 201);
    } catch (e) {
        logger.error('documentos uploadAnexo:', e);
        return responseFormatter.error(res, e.message || 'Erro ao enviar anexo', 500);
    }
}

async function processarComprovante(req, res) {
    try {
        const id = parseInt(req.params.id, 10);
        if (!id) return responseFormatter.error(res, 'ID inválido', 400);
        if (!req.file || !req.file.buffer) return responseFormatter.error(res, 'Envie uma imagem do comprovante.', 400);
        const url = await uploadImageBuffer(
            req.file.buffer,
            req.file.mimetype,
            req.file.originalname || 'comprovante.jpg'
        );
        const itensSugeridos = await processarImagem(req.file.buffer);
        const doc = await documentosService.processarComprovante(id, req.user.userId, { url, itensSugeridos });
        if (!doc) return responseFormatter.error(res, 'Documento não encontrado', 404);
        return responseFormatter.success(res, {
            url,
            documento: doc,
            itensAdicionados: itensSugeridos
        }, 'Comprovante processado e itens adicionados.', 201);
    } catch (e) {
        logger.error('documentos processarComprovante:', e);
        return responseFormatter.error(res, e.message || 'Erro ao processar comprovante', 500);
    }
}

module.exports = {
    create,
    list,
    getOne,
    update,
    remove,
    uploadAnexo,
    processarComprovante
};
