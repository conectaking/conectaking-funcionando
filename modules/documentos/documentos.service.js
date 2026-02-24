const { nanoid } = require('nanoid');
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

/**
 * Processa comprovante: adiciona itens sugeridos pelo OCR (nome estabelecimento, valor, forma pagamento) + anexo.
 * itensSugeridos: [{ valor, categoria, textoTrecho, nome_estabelecimento?, forma_pagamento? }]
 * url: URL pública da imagem após upload.
 */
async function processarComprovante(id, userId, { url, itensSugeridos }) {
    const doc = await documentosRepository.getById(id, userId);
    if (!doc) return null;
    const itens = Array.isArray(doc.itens_json) ? [...doc.itens_json] : [];
    const anexos = Array.isArray(doc.anexos_json) ? [...doc.anexos_json] : [];
    const primeiraCategoria = itensSugeridos && itensSugeridos.length > 0 ? itensSugeridos[0].categoria : 'Comprovante';
    let totalValor = 0;
    for (const s of itensSugeridos || []) {
        const descricao = (s.nome_estabelecimento || s.textoTrecho || s.categoria).toString().slice(0, 120);
        const valor = Number(s.valor) || 0;
        const item = {
            descricao,
            quantidade: 1,
            valor_unitario: valor,
            valor
        };
        if (s.data) item.data = String(s.data).slice(0, 20);
        itens.push(item);
        totalValor += valor;
    }
    if (itensSugeridos && itensSugeridos.length > 0) {
        const primeiroNome = itensSugeridos[0].nome_estabelecimento || primeiraCategoria;
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
        itens.push({
            descricao: 'Comprovante (preencha descrição e valor)',
            quantidade: 1,
            valor_unitario: 0,
            valor: 0
        });
    }
    return documentosRepository.update(id, userId, { itens_json: itens, anexos_json: anexos });
}

async function gerarPdf(id, userId) {
    const doc = await documentosRepository.getById(id, userId);
    if (!doc) return null;
    return gerarPdfBuffer(doc);
}

module.exports = {
    create,
    list,
    getOne,
    getByLinkToken,
    update,
    updateByToken,
    remove,
    addAnexo,
    processarComprovante,
    gerarPdf
};
