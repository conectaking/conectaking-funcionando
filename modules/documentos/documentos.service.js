const { nanoid } = require('nanoid');
const db = require('../../db');
const documentosRepository = require('./documentos.repository');
const { gerarPdfBuffer } = require('../../utils/documentos-pdf');
const logger = require('../../utils/logger');

async function create(userId, data) {
    const linkToken = data.link_token || nanoid(21);
    const tipo = data.tipo || 'recibo';
    const numeroSequencial = data.numero_sequencial !== undefined
        ? data.numero_sequencial
        : await documentosRepository.nextNumeroSequencial(userId, tipo);
    return documentosRepository.insert(userId, {
        ...data,
        link_token: linkToken,
        numero_sequencial: numeroSequencial
    });
}

async function list(userId, filters) {
    return documentosRepository.listByUserId(userId, filters || {});
}

async function getOne(id, userId) {
    return documentosRepository.getById(id, userId);
}

async function getByLinkToken(linkToken) {
    return documentosRepository.getByLinkToken(linkToken);
}

async function update(id, userId, data) {
    return documentosRepository.update(id, userId, data);
}

async function updateByToken(linkToken, data) {
    return documentosRepository.updateByToken(linkToken, data);
}

async function remove(id, userId) {
    return documentosRepository.remove(id, userId);
}

/** Cria um novo documento com os mesmos dados do original (novo número, novo token de link). */
async function duplicate(sourceId, userId) {
    const src = await documentosRepository.getById(sourceId, userId);
    if (!src) return null;
    const baseTitulo = src.titulo && String(src.titulo).trim() ? String(src.titulo).trim() : null;
    const titulo = baseTitulo ? `${baseTitulo} (cópia)` : null;
    return create(userId, {
        tipo: src.tipo || 'recibo',
        titulo,
        emitente_json: src.emitente_json || {},
        cliente_json: src.cliente_json || {},
        itens_json: src.itens_json || [],
        anexos_json: src.anexos_json || [],
        observacoes: src.observacoes,
        condicoes_pagamento: src.condicoes_pagamento,
        data_documento: src.data_documento,
        validade_ate: src.validade_ate
    });
}

async function addAnexo(id, userId, anexo) {
    const doc = await documentosRepository.getById(id, userId);
    if (!doc) return null;
    const anexos = Array.isArray(doc.anexos_json) ? [...doc.anexos_json] : [];
    anexos.push({
        url: anexo.url,
        tipo_categoria: anexo.tipo_categoria || 'Outros',
        valor: anexo.valor,
        descricao: anexo.descricao || null
    });
    return documentosRepository.update(id, userId, { anexos_json: anexos });
}

function findItemIndexByUid(itens, itemUid) {
    if (!itemUid || !Array.isArray(itens)) return -1;
    return itens.findIndex((row) => row && String(row.item_uid) === String(itemUid));
}

/**
 * Anexa foto da nota fiscal a um item da tabela (não altera valores — só guarda imagem para o PDF).
 */
async function setItemNotaFiscal(id, userId, itemUid, { url, titulo }) {
    const doc = await documentosRepository.getById(id, userId);
    if (!doc) return null;
    const itens = Array.isArray(doc.itens_json) ? doc.itens_json.map((row) => ({ ...row })) : [];
    const idx = findItemIndexByUid(itens, itemUid);
    if (idx < 0) return null;
    if (!url) return null;
    const tituloNota = (titulo || itens[idx].descricao || 'Nota fiscal').toString().trim().slice(0, 120);
    itens[idx] = {
        ...itens[idx],
        nota_fiscal_url: url,
        nota_fiscal_titulo: tituloNota
    };
    return documentosRepository.update(id, userId, { itens_json: itens });
}

async function removeItemNotaFiscal(id, userId, itemUid) {
    const doc = await documentosRepository.getById(id, userId);
    if (!doc) return null;
    const itens = Array.isArray(doc.itens_json) ? doc.itens_json.map((row) => ({ ...row })) : [];
    const idx = findItemIndexByUid(itens, itemUid);
    if (idx < 0) return null;
    const next = { ...itens[idx] };
    delete next.nota_fiscal_url;
    delete next.nota_fiscal_titulo;
    itens[idx] = next;
    return documentosRepository.update(id, userId, { itens_json: itens });
}

/**
 * Processa comprovante/OCR: adiciona itens sugeridos. Em recibo não guarda imagem em anexos_json (só notas fiscais por item no PDF).
 * itensSugeridos: [{ valor, categoria, textoTrecho, nome_estabelecimento?, forma_pagamento? }]
 * url: URL pública da imagem após upload; se null (ex.: falha Cloudflare), só atualiza itens (imagem não é guardada).
 */
function itemExtratoKey(descricao, data, valor) {
    const d = (descricao || '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]/g, '').slice(0, 48);
    const dt = (data || '').trim();
    const v = Math.round((Number(valor) || 0) * 100);
    return d + '|' + dt + '|' + v;
}

function isDescricaoGenericaExtrato(descricao) {
    const raw = (descricao || '').trim().toLowerCase();
    const d = raw.normalize('NFD').replace(/\p{M}/gu, '');
    if (!d || d.length < 4) return true;
    if (d === 'transacao' || d === 'transação') return true;
    if (d.includes('comercio / outros') || d.includes('comércio / outros')) return true;
    if (/^comprovante/i.test(d)) return true;
    return false;
}

function isItemRecusado(descricao, sugerido) {
    const s = sugerido || {};
    if (s.status === 'DECLINED' || s.recusada || s.recusado) return true;
    const txt = ((descricao || '') + ' ' + (s.textoTrecho || '')).toLowerCase();
    return /recusad|negad|cancelad/.test(txt);
}

async function processarComprovante(id, userId, { url, itensSugeridos, acumular, substituir }) {
    const doc = await documentosRepository.getById(id, userId);
    if (!doc) return null;
    const sugeridos = Array.isArray(itensSugeridos) ? itensSugeridos : [];
    const isExtratoLista = sugeridos.length >= 3;
    const substituirExtrato = !!substituir;
    const acumularExtrato = substituirExtrato ? false : (acumular !== false && acumular !== '0');

    function isItemPlaceholder(row) {
        if (!row) return true;
        const d = (row.descricao || '').trim();
        const v = Number(row.valor ?? row.valor_unitario) || 0;
        if (!d || d === '-') return v <= 0;
        if (/^Comprovante \(preencha/i.test(d)) return v <= 0;
        return false;
    }

    const existingItens = Array.isArray(doc.itens_json) ? doc.itens_json : [];
    const hasItensReais = existingItens.some((row) => !isItemPlaceholder(row));

    let itens;
    if (substituirExtrato) {
        itens = [];
    } else if (isExtratoLista && !acumularExtrato && !hasItensReais) {
        itens = [];
    } else {
        itens = existingItens.filter((row) => !isItemPlaceholder(row));
    }
    const isRecibo = (doc.tipo || '').toLowerCase() === 'recibo';
    // Recibo: extrato do cartão só preenche a tabela — fotos para o PDF ficam em item.nota_fiscal_url
    let anexos = isRecibo ? [] : (Array.isArray(doc.anexos_json) ? [...doc.anexos_json] : []);
    const primeiraCategoria = sugeridos.length > 0 ? sugeridos[0].categoria : 'Comprovante';
    const seen = new Set();
    for (const row of itens) {
        seen.add(itemExtratoKey(row.descricao, row.data, row.valor_unitario ?? row.valor));
    }
    let totalValor = 0;
    for (const s of sugeridos) {
        const nome = (s.nome_estabelecimento || '').toString().trim();
        const descricao = (nome || s.textoTrecho || s.categoria).toString().slice(0, 120);
        if (isItemRecusado(descricao, s)) continue;
        const valor = Number(s.valor) || 0;
        const data = s.data ? String(s.data).slice(0, 20) : '';
        const key = itemExtratoKey(descricao, data, valor);
        if (seen.has(key) && !isDescricaoGenericaExtrato(descricao)) continue;
        seen.add(key);
        const item = {
            item_uid: `it-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            descricao,
            quantidade: 1,
            valor_unitario: valor,
            valor
        };
        if (data) item.data = data;
        const etiqueta = (s.etiqueta_ocr || s.observacao_item || '').toString().trim();
        if (etiqueta) item.conteudo_pacote = etiqueta.slice(0, 120);
        itens.push(item);
        totalValor += valor;
    }
    // Orçamento (legado): um comprovante avulso pode ir para anexos_json. Recibo nunca guarda foto do OCR aqui.
    if (!isRecibo && url && !isExtratoLista) {
        if (sugeridos.length > 0) {
            const primeiroNome = sugeridos[0].nome_estabelecimento || primeiraCategoria;
            anexos.push({
                url,
                tipo_categoria: primeiraCategoria,
                valor: totalValor,
                descricao: totalValor > 0
                    ? `${primeiroNome} — R$ ${totalValor.toFixed(2).replace('.', ',')}`
                    : `Comprovante — ${primeiroNome}`
            });
        } else {
            anexos.push({ url, tipo_categoria: 'Comprovante', valor: null, descricao: 'Comprovante' });
        }
    }
    if (!itensSugeridos || itensSugeridos.length === 0) {
        itens.push({
            descricao: 'Comprovante (preencha descrição e valor)',
            quantidade: 1,
            valor_unitario: 0,
            valor: 0
        });
    }
    return documentosRepository.update(id, userId, { itens_json: itens, anexos_json: anexos });
}

async function getSettings(userId) {
    return documentosRepository.getSettings(userId);
}

async function upsertSettings(userId, data) {
    return documentosRepository.upsertSettings(userId, data);
}

async function gerarPdf(id, userId, colors = null) {
    let doc = await documentosRepository.getById(id, userId);
    if (!doc) return null;
    // Limpa anexos antigos de extrato OCR (só leitura de valores) — PDF do recibo usa só nota_fiscal_url nos itens
    if ((doc.tipo || '').toLowerCase() === 'recibo' && Array.isArray(doc.anexos_json) && doc.anexos_json.length > 0) {
        doc = await documentosRepository.update(id, userId, { anexos_json: [] }) || doc;
        doc.anexos_json = [];
    }
    let defaultLogoUrl = null;
    let companyLogoUrl = null;
    try {
        const settings = await documentosRepository.getSettings(userId);
        if (settings && settings.default_logo_url && String(settings.default_logo_url).trim()) {
            defaultLogoUrl = String(settings.default_logo_url).trim();
        }
    } catch (e) {
        logger.warn('documentos gerarPdf: não foi possível obter default_logo_url', { message: e?.message });
    }
    try {
        const r = await db.pool.query(
            `SELECT CASE WHEN u.parent_user_id IS NOT NULL THEN p.company_logo_url ELSE u.company_logo_url END AS company_logo_url
             FROM users u
             LEFT JOIN users p ON p.id = u.parent_user_id
             WHERE u.id = $1`,
            [userId]
        );
        if (r.rows[0] && r.rows[0].company_logo_url) {
            companyLogoUrl = r.rows[0].company_logo_url;
        }
    } catch (e) {
        logger.warn('documentos gerarPdf: não foi possível obter company_logo_url', { message: e?.message });
    }
    return gerarPdfBuffer(doc, colors, { defaultLogoUrl, companyLogoUrl });
}

module.exports = {
    create,
    list,
    getOne,
    getByLinkToken,
    update,
    updateByToken,
    remove,
    duplicate,
    addAnexo,
    setItemNotaFiscal,
    removeItemNotaFiscal,
    processarComprovante,
    gerarPdf,
    getSettings,
    upsertSettings
};
