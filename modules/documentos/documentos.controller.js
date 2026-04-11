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
            condicoes_pagamento: body.condicoes_pagamento,
            data_documento: body.data_documento,
            validade_ate: body.validade_ate
        });
        return responseFormatter.success(res, doc, 'Documento criado.', 201);
    } catch (e) {
        logger.error('documentos create:', e);
        return responseFormatter.error(res, e.message || 'Erro ao criar documento', 500);
    }
}

async function getSettings(req, res) {
    try {
        const settings = await documentosService.getSettings(req.user.userId);
        const db = require('../../db');
        let companyLogoUrl = null;
        try {
            const r = await db.pool.query(
                `SELECT CASE WHEN u.parent_user_id IS NOT NULL THEN p.company_logo_url ELSE u.company_logo_url END AS company_logo_url
                 FROM users u LEFT JOIN users p ON p.id = u.parent_user_id WHERE u.id = $1`,
                [req.user.userId]
            );
            if (r.rows[0] && r.rows[0].company_logo_url) companyLogoUrl = r.rows[0].company_logo_url;
        } catch (_) {}
        const defaultLogoUrl = (settings?.default_logo_url && String(settings.default_logo_url).trim()) || null;
        const extra = settings?.extra_settings || {};
        const payload = {
            headerColor: settings?.header_color || null,
            accentColor: settings?.accent_color || null,
            bgColor: settings?.bg_color || null,
            lastDocumentId: settings?.last_document_id != null ? settings.last_document_id : null,
            defaultLogoUrl: defaultLogoUrl || null,
            companyLogoUrl: companyLogoUrl || null,
            condicoesPagamentoPadrao: extra.condicoesPagamentoPadrao != null ? String(extra.condicoesPagamentoPadrao) : null,
            pixChave: extra.pixChave != null ? String(extra.pixChave) : null,
            pixNome: extra.pixNome != null ? String(extra.pixNome) : null,
            pixCidade: extra.pixCidade != null ? String(extra.pixCidade) : null,
            catalogoServicos: Array.isArray(extra.catalogoServicos) ? extra.catalogoServicos : null
        };
        return responseFormatter.success(res, payload);
    } catch (e) {
        logger.error('documentos getSettings:', e);
        return responseFormatter.error(res, e.message || 'Erro ao obter configurações', 500);
    }
}

async function putSettings(req, res) {
    try {
        const body = req.body || {};
        const data = {};
        if (body.headerColor !== undefined) data.header_color = body.headerColor;
        if (body.accentColor !== undefined) data.accent_color = body.accentColor;
        if (body.bgColor !== undefined) data.bg_color = body.bgColor;
        if (body.lastDocumentId !== undefined) data.last_document_id = body.lastDocumentId;
        if (body.defaultLogoUrl !== undefined) data.default_logo_url = body.defaultLogoUrl;
        const extraKeys = ['condicoesPagamentoPadrao', 'pixChave', 'pixNome', 'pixCidade', 'catalogoServicos'];
        const extraSettings = {};
        for (const k of extraKeys) {
            if (body[k] !== undefined) extraSettings[k] = body[k];
        }
        if (Object.keys(extraSettings).length) data.extra_settings = extraSettings;
        const updated = await documentosService.upsertSettings(req.user.userId, data);
        const extra = updated?.extra_settings || {};
        const payload = {
            headerColor: updated?.header_color || null,
            accentColor: updated?.accent_color || null,
            bgColor: updated?.bg_color || null,
            lastDocumentId: updated?.last_document_id != null ? updated.last_document_id : null,
            defaultLogoUrl: (updated?.default_logo_url && String(updated.default_logo_url).trim()) || null,
            condicoesPagamentoPadrao: extra.condicoesPagamentoPadrao != null ? String(extra.condicoesPagamentoPadrao) : null,
            pixChave: extra.pixChave != null ? String(extra.pixChave) : null,
            pixNome: extra.pixNome != null ? String(extra.pixNome) : null,
            pixCidade: extra.pixCidade != null ? String(extra.pixCidade) : null,
            catalogoServicos: Array.isArray(extra.catalogoServicos) ? extra.catalogoServicos : null
        };
        return responseFormatter.success(res, payload, 'Configurações salvas.');
    } catch (e) {
        logger.error('documentos putSettings:', e);
        return responseFormatter.error(res, e.message || 'Erro ao salvar configurações', 500);
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
            condicoes_pagamento: body.condicoes_pagamento,
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

async function duplicate(req, res) {
    try {
        const id = parseInt(req.params.id, 10);
        if (!id) return responseFormatter.error(res, 'ID inválido', 400);
        const doc = await documentosService.duplicate(id, req.user.userId);
        if (!doc) return responseFormatter.error(res, 'Documento não encontrado', 404);
        return responseFormatter.success(res, doc, 'Documento duplicado.', 201);
    } catch (e) {
        logger.error('documentos duplicate:', e);
        return responseFormatter.error(res, e.message || 'Erro ao duplicar', 500);
    }
}

/** POST /upload-logo — importar logomarca (upload de imagem). Devolve { url } para usar em emitente_json.logo_url. */
async function uploadLogo(req, res) {
    try {
        if (!req.file || !req.file.buffer) return responseFormatter.error(res, 'Nenhuma imagem enviada. Envie um ficheiro (ex.: logo.png).', 400);
        const url = await uploadImageBuffer(
            req.file.buffer,
            req.file.mimetype,
            req.file.originalname || 'logo.png'
        );
        return responseFormatter.success(res, { url }, 'Logomarca enviada. Use o campo "url" em emitente_json.logo_url.', 201);
    } catch (e) {
        logger.error('documentos uploadLogo:', e);
        return responseFormatter.error(res, e.message || 'Erro ao enviar logomarca', 500);
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

async function getByToken(req, res) {
    try {
        const token = (req.params.token || '').trim();
        if (!token) return responseFormatter.error(res, 'Token inválido', 400);
        const doc = await documentosService.getByLinkToken(token);
        if (!doc) return responseFormatter.error(res, 'Documento não encontrado', 404);
        return responseFormatter.success(res, doc);
    } catch (e) {
        logger.error('documentos getByToken:', e);
        return responseFormatter.error(res, e.message || 'Erro', 500);
    }
}

async function updateByToken(req, res) {
    try {
        const token = (req.params.token || '').trim();
        if (!token) return responseFormatter.error(res, 'Token inválido', 400);
        const body = req.body || {};
        const doc = await documentosService.updateByToken(token, {
            cliente_json: body.cliente_json,
            itens_json: body.itens_json,
            observacoes: body.observacoes,
            condicoes_pagamento: body.condicoes_pagamento
        });
        if (!doc) return responseFormatter.error(res, 'Documento não encontrado', 404);
        return responseFormatter.success(res, doc, 'Alterações salvas.');
    } catch (e) {
        logger.error('documentos updateByToken:', e);
        return responseFormatter.error(res, e.message || 'Erro', 500);
    }
}

async function getPdfByToken(req, res) {
    try {
        const token = (req.params.token || '').trim();
        if (!token) return responseFormatter.error(res, 'Token inválido', 400);
        const doc = await documentosService.getByLinkToken(token);
        if (!doc) return responseFormatter.error(res, 'Documento não encontrado', 404);
        const buffer = await documentosService.gerarPdf(doc.id, doc.user_id);
        if (!buffer) return responseFormatter.error(res, 'Erro ao gerar PDF', 500);
        const tipo = (doc.tipo || 'documento').toLowerCase();
        const num = doc.numero_sequencial != null ? doc.numero_sequencial : doc.id;
        const nome = tipo === 'recibo' ? `recibo-${num}.pdf` : (tipo === 'orcamento' ? `orcamento-${num}.pdf` : `documento-${num}.pdf`);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${nome}"`);
        res.send(buffer);
    } catch (e) {
        logger.error('documentos getPdfByToken:', e);
        return responseFormatter.error(res, e.message || 'Erro ao gerar PDF', 500);
    }
}

async function getPdf(req, res) {
    try {
        const id = parseInt(req.params.id, 10);
        if (!id) return responseFormatter.error(res, 'ID inválido', 400);
        let colors = {};
        const h = (req.query.headerColor || '').toString().trim().replace(/^#/, '');
        const a = (req.query.accentColor || '').toString().trim().replace(/^#/, '');
        const b = (req.query.bgColor || '').toString().trim().replace(/^#/, '');
        if (/^[0-9A-Fa-f]{6}$/.test(h)) colors.headerColor = h;
        if (/^[0-9A-Fa-f]{6}$/.test(a)) colors.accentColor = a;
        if (/^[0-9A-Fa-f]{6}$/.test(b)) colors.bgColor = b;
        if (Object.keys(colors).length === 0) {
            const settings = await documentosService.getSettings(req.user.userId);
            if (settings) {
                if (settings.header_color) colors.headerColor = settings.header_color.replace(/^#/, '');
                if (settings.accent_color) colors.accentColor = settings.accent_color.replace(/^#/, '');
                if (settings.bg_color) colors.bgColor = settings.bg_color.replace(/^#/, '');
            }
        }
        const buffer = await documentosService.gerarPdf(id, req.user.userId, Object.keys(colors).length ? colors : null);
        if (!buffer) return responseFormatter.error(res, 'Documento não encontrado', 404);
        const doc = await documentosService.getOne(id, req.user.userId);
        const tipo = ((doc && doc.tipo) || 'documento').toLowerCase();
        const num = (doc && doc.numero_sequencial != null) ? doc.numero_sequencial : id;
        const nome = tipo === 'recibo' ? `recibo-${num}.pdf` : (tipo === 'orcamento' ? `orcamento-${num}.pdf` : `documento-${num}.pdf`);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${nome}"`);
        res.send(buffer);
    } catch (e) {
        logger.error('documentos getPdf:', e);
        return responseFormatter.error(res, e.message || 'Erro ao gerar PDF', 500);
    }
}

async function processarComprovante(req, res) {
    try {
        const id = parseInt(req.params.id, 10);
        if (!id) return responseFormatter.error(res, 'ID inválido', 400);
        if (!req.file || !req.file.buffer) return responseFormatter.error(res, 'Envie uma imagem do comprovante.', 400);

        // 1) OCR primeiro: extrair valor/itens mesmo que o upload falhe depois (ex.: throttling Cloudflare)
        let itensSugeridos = [];
        let parseResult = null;
        try {
            const ocrResult = await processarImagem(req.file.buffer);
            if (Array.isArray(ocrResult)) {
                itensSugeridos = ocrResult;
            } else if (ocrResult && ocrResult.itensSugeridos) {
                itensSugeridos = ocrResult.itensSugeridos || [];
                parseResult = ocrResult.parseResult || null;
            }
        } catch (ocrErr) {
            logger.error('documentos processarComprovante OCR:', ocrErr);
        }

        // 2) Tentar upload para Cloudflare; se falhar, continuamos e devolvemos só o valor (imagem descartada)
        let url = null;
        try {
            url = await uploadImageBuffer(
                req.file.buffer,
                req.file.mimetype,
                req.file.originalname || 'comprovante.jpg'
            );
        } catch (uploadErr) {
            logger.error('documentos processarComprovante upload:', uploadErr);
            // Não retornar erro: utilizador fica com o valor extraído pelo OCR; imagem não é guardada
        }

        const doc = await documentosService.processarComprovante(id, req.user.userId, { url, itensSugeridos });
        if (!doc) return responseFormatter.error(res, 'Documento não encontrado', 404);
        const responseData = { url, documento: doc, itensAdicionados: itensSugeridos };
        if (parseResult) responseData.parse_result = parseResult;
        const msg = itensSugeridos.length > 0
            ? (url ? 'Comprovante processado e itens adicionados.' : 'Valor extraído da imagem e itens adicionados. (A imagem não foi guardada por falha no envio.)')
            : (url ? 'Imagem anexada. Preencha descrição e valor se o OCR não identificou.' : 'Imagem recebida mas o envio falhou e o OCR não identificou valor. Tente novamente ou preencha manualmente.');
        return responseFormatter.success(res, responseData, msg, 201);
    } catch (e) {
        logger.error('documentos processarComprovante:', e);
        return responseFormatter.error(res, e.message || 'Erro ao processar comprovante', 500);
    }
}

module.exports = {
    create,
    list,
    getOne,
    getByToken,
    update,
    updateByToken,
    remove,
    duplicate,
    getSettings,
    putSettings,
    uploadLogo,
    uploadAnexo,
    getPdf,
    getPdfByToken,
    processarComprovante
};
