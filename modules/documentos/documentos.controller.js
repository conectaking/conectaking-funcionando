const documentosService = require('./documentos.service');
const { uploadImageBuffer } = require('../../utils/cloudflare-image-upload');
const { processarImagem, warmUpOcr } = require('../../utils/recibo-ocr');
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

async function uploadNotaFiscalItem(req, res) {
    try {
        const id = parseInt(req.params.id, 10);
        if (!id) return responseFormatter.error(res, 'ID inválido', 400);
        if (!req.file || !req.file.buffer) return responseFormatter.error(res, 'Envie a foto da nota fiscal.', 400);
        const itemUid = (req.body && req.body.item_uid) ? String(req.body.item_uid).trim() : '';
        if (!itemUid) return responseFormatter.error(res, 'item_uid é obrigatório.', 400);
        const url = await uploadImageBuffer(
            req.file.buffer,
            req.file.mimetype,
            req.file.originalname || 'nota-fiscal.jpg'
        );
        const titulo = (req.body && req.body.titulo) ? String(req.body.titulo).trim().slice(0, 120) : null;
        const doc = await documentosService.setItemNotaFiscal(id, req.user.userId, itemUid, { url, titulo });
        if (!doc) return responseFormatter.error(res, 'Documento ou item não encontrado', 404);
        return responseFormatter.success(res, { url, documento: doc, item_uid: itemUid }, 'Nota fiscal anexada ao item.', 201);
    } catch (e) {
        logger.error('documentos uploadNotaFiscalItem:', e);
        return responseFormatter.error(res, e.message || 'Erro ao enviar nota fiscal', 500);
    }
}

async function removeNotaFiscalItem(req, res) {
    try {
        const id = parseInt(req.params.id, 10);
        if (!id) return responseFormatter.error(res, 'ID inválido', 400);
        const itemUid = (req.body && req.body.item_uid) ? String(req.body.item_uid).trim() : '';
        if (!itemUid) return responseFormatter.error(res, 'item_uid é obrigatório.', 400);
        const doc = await documentosService.removeItemNotaFiscal(id, req.user.userId, itemUid);
        if (!doc) return responseFormatter.error(res, 'Documento ou item não encontrado', 404);
        return responseFormatter.success(res, { documento: doc, item_uid: itemUid }, 'Nota fiscal removida.', 200);
    } catch (e) {
        logger.error('documentos removeNotaFiscalItem:', e);
        return responseFormatter.error(res, e.message || 'Erro ao remover nota fiscal', 500);
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
        let ocrEngine = 'tesseract';
        const forceOpenAi = !!(req.body && (req.body.usar_ia === '1' || req.body.usar_ia === 'true' || req.body.usar_ia === true));
        try {
            const ocrResult = await processarImagem(req.file.buffer, { forceOpenAi });
            if (Array.isArray(ocrResult)) {
                itensSugeridos = ocrResult;
            } else if (ocrResult && ocrResult.itensSugeridos) {
                itensSugeridos = ocrResult.itensSugeridos || [];
                parseResult = ocrResult.parseResult || null;
                ocrEngine = ocrResult.ocrEngine || (parseResult && parseResult.ocrEngine) || 'tesseract';
            }
        } catch (ocrErr) {
            logger.error('documentos processarComprovante OCR:', ocrErr);
        }

        const etiquetaItens = (req.body && req.body.etiqueta_itens != null)
            ? String(req.body.etiqueta_itens).trim().slice(0, 120)
            : '';
        if (etiquetaItens && itensSugeridos.length > 0) {
            itensSugeridos = itensSugeridos.map(s => ({ ...s, etiqueta_ocr: etiquetaItens }));
        }

        // Extrato/OCR: não guarda imagem no Cloudflare — responde mais rápido (crítico no mobile/Render)
        let url = null;

        const acumular = !(req.body && (req.body.substituir === '1' || req.body.substituir === 'true' || req.body.substituir === true))
            && (req.body == null || req.body.acumular === undefined || req.body.acumular === '1' || req.body.acumular === 'true' || req.body.acumular === true);
        const substituir = req.body && (req.body.substituir === '1' || req.body.substituir === 'true' || req.body.substituir === true);
        const result = await documentosService.processarComprovante(id, req.user.userId, { url, itensSugeridos, acumular, substituir });
        const doc = result && result.doc;
        const stats = (result && result.stats) || { lidosOcr: itensSugeridos.length, inseridos: itensSugeridos.length, ignoradosRecusados: 0, ignoradosDuplicata: 0 };
        stats.ocrEngine = ocrEngine;
        stats.openAiTentou = !!(parseResult && parseResult.openAiTentou);
        stats.openAiError = (parseResult && parseResult.openAiError) || null;
        stats.openAiAvailable = parseResult && parseResult.openAiAvailable !== undefined
            ? !!parseResult.openAiAvailable
            : undefined;
        if (!doc) return responseFormatter.error(res, 'Documento não encontrado', 404);
        const responseData = {
            url,
            documento: doc,
            itensAdicionados: itensSugeridos,
            stats
        };
        if (parseResult) responseData.parse_result = parseResult;
        const n = stats.lidosOcr;
        const ins = stats.inseridos;
        const totalNaTabela = (doc.itens_json || []).length;
        let msg;
        if (n === 0) {
            if (stats.openAiError) {
                msg = 'Não foi possível ler a imagem (IA: ' + stats.openAiError + '). Tente outra foto ou preencha manualmente.';
            } else if (stats.openAiAvailable === false) {
                msg = 'Não identificou valores. Configure OPENAI_API_KEY no servidor para leitura com IA, ou preencha manualmente.';
            } else {
                msg = url
                    ? 'Imagem anexada. Preencha descrição e valor se o OCR não identificou.'
                    : 'Imagem recebida mas o OCR não identificou valores. Marque "Usar IA OpenAI" e tente de novo.';
            }
        } else if (ins === 0 && stats.ignoradosDuplicata > 0) {
            msg = `${n} item(ns) lidos na imagem, mas nenhum novo (já estavam na tabela). Total: ${totalNaTabela}.`;
        } else if (ins < n) {
            msg = `${n} item(ns) lidos na imagem, ${ins} adicionados (${n - ins} já existiam). Total na tabela: ${totalNaTabela}.`;
        } else if (n === 1) {
            msg = totalNaTabela > 1
                ? `1 item lido da imagem. Total na tabela: ${totalNaTabela}.`
                : (url ? 'Comprovante processado: 1 item adicionado.' : '1 item extraído da imagem.');
        } else {
            msg = totalNaTabela > ins
                ? `${n} itens lidos na imagem, ${ins} adicionados. Total na tabela: ${totalNaTabela}.`
                : `${n} itens extraídos da imagem.`;
        }
        return responseFormatter.success(res, responseData, msg, 201);
    } catch (e) {
        logger.error('documentos processarComprovante:', e);
        return responseFormatter.error(res, e.message || 'Erro ao processar comprovante', 500);
    }
}

async function warmOcr(req, res) {
    try {
        await warmUpOcr();
        return responseFormatter.success(res, { ready: true }, 'OCR pronto.', 200);
    } catch (e) {
        logger.warn('documentos warmOcr:', e.message);
        return responseFormatter.success(res, { ready: false }, 'OCR em aquecimento.', 200);
    }
}

async function ocrInfo(req, res) {
    try {
        const openAiVision = require('../../utils/recibo-openai-vision');
        return responseFormatter.success(res, {
            openAiAvailable: openAiVision.isAvailable(),
            mode: process.env.RECIBO_OCR_AI || 'auto',
            model: process.env.RECIBO_OCR_AI_MODEL || 'gpt-4o-mini'
        });
    } catch (e) {
        return responseFormatter.error(res, e.message || 'Erro', 500);
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
    uploadNotaFiscalItem,
    removeNotaFiscalItem,
    getPdf,
    getPdfByToken,
    processarComprovante,
    warmOcr,
    ocrInfo
};
