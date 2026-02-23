/**
 * OCR para comprovantes de recibo: extrai valores em R$ do texto e categoriza
 * (Pedágio, Refeição, Combustível, Comércio/Outros).
 * Não acessa serviços externos além do Tesseract; processa apenas o texto da imagem.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const logger = require('./logger');

// Regex: R$ seguido de valor (aceita 1.234,56 ou 10,00 ou 25.50)
const REGEX_VALOR_RS = /R\s*\$\s*[\d.]{1,3}(?:\.\d{3})*[,.]\d{2}|R\s*\$\s*\d+[,.]\d{2}/gi;

/**
 * Normaliza string de valor (R$ 1.234,56 ou R$ 25.50) para número.
 */
function parseValor(str) {
    if (!str || typeof str !== 'string') return null;
    const cleaned = str.replace(/\s/g, '').replace(/R\$\s*/i, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
}

/**
 * Encontra todos os valores em R$ no texto e retorna com posição para contexto.
 */
function extractValoresReais(ocrText) {
    if (!ocrText || typeof ocrText !== 'string') return [];
    const results = [];
    let m;
    REGEX_VALOR_RS.lastIndex = 0;
    while ((m = REGEX_VALOR_RS.exec(ocrText)) !== null) {
        const raw = m[0];
        const valor = parseValor(raw);
        if (valor != null && valor >= 0) {
            results.push({
                valor,
                raw,
                startIndex: m.index,
                endIndex: m.index + raw.length
            });
        }
    }
    return results;
}

/**
 * Retorna o contexto (linhas ao redor) de um índice no texto.
 */
function getContextAround(text, startIndex, endIndex, linesBefore = 2, linesAfter = 2) {
    const lines = text.split(/\r?\n/);
    let charCount = 0;
    let lineIndex = 0;
    for (let i = 0; i < lines.length; i++) {
        const lineEnd = charCount + lines[i].length + 1;
        if (startIndex >= charCount && endIndex <= lineEnd) {
            lineIndex = i;
            break;
        }
        charCount = lineEnd;
    }
    const from = Math.max(0, lineIndex - linesBefore);
    const to = Math.min(lines.length, lineIndex + linesAfter + 1);
    return lines.slice(from, to).join(' ').trim();
}

const CATEGORIAS = {
    pedagio: {
        nome: 'Pedágio',
        keywords: ['pedágio', 'pedagio', 'concessionária', 'concessionaria', 'praça', 'praca', 'tag', 'sem parar', 'semparar', 'concebra', 'via 040']
    },
    refeicao: {
        nome: 'Refeição',
        keywords: ['restaurante', 'lanchonete', 'refeição', 'refeicao', 'almoço', 'almoco', 'jantar', 'food', 'delivery', 'ifood', 'uber eats', 'lanche', 'café', 'cafe']
    },
    combustivel: {
        nome: 'Combustível',
        keywords: ['posto', 'combustível', 'combustivel', 'gasolina', 'etanol', 'diesel', 'shell', 'ipiranga', 'br', 'ale']
    },
    comercio: {
        nome: 'Comércio / Outros',
        keywords: ['comércio', 'comercio', 'mercado', 'loja', 'nota fiscal', 'nf-e', 'nf e', 'supermercado', 'farmácia', 'farmacia']
    }
};

/**
 * Classifica o texto por palavras-chave em uma das categorias fixas.
 */
function categorizar(texto) {
    if (!texto || typeof texto !== 'string') return CATEGORIAS.comercio.nome;
    const lower = texto.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
    for (const [key, cat] of Object.entries(CATEGORIAS)) {
        if (key === 'comercio') continue;
        for (const kw of cat.keywords) {
            const kwNorm = kw.normalize('NFD').replace(/\p{M}/gu, '');
            if (lower.includes(kwNorm)) return cat.nome;
        }
    }
    return CATEGORIAS.comercio.nome;
}

/**
 * Processa texto OCR: extrai valores em R$, adiciona contexto e categoriza cada um.
 * Retorna lista de { valor, categoria, textoTrecho } para o usuário revisar.
 */
function processarTextoOcr(ocrText) {
    const valores = extractValoresReais(ocrText);
    return valores.map(({ valor, raw, startIndex, endIndex }) => {
        const textoTrecho = getContextAround(ocrText, startIndex, endIndex, 2, 2);
        const categoria = categorizar(textoTrecho);
        return { valor, categoria, textoTrecho: textoTrecho.slice(0, 200) || raw };
    });
}

/**
 * Executa OCR na imagem (buffer) e retorna itens sugeridos (valor + categoria + textoTrecho).
 * @param {Buffer} imageBuffer - Conteúdo da imagem (JPEG/PNG)
 * @returns {Promise<Array<{ valor: number, categoria: string, textoTrecho: string }>>}
 */
async function processarImagem(imageBuffer) {
    if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) return [];
    const ext = '.jpg';
    const tmpPath = path.join(os.tmpdir(), `recibo-ocr-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    try {
        fs.writeFileSync(tmpPath, imageBuffer);
        const { createWorker } = require('tesseract.js');
        const worker = await createWorker('por', 1, { logger: () => {} });
        try {
            const { data: { text } } = await worker.recognize(tmpPath);
            if (!text || !text.trim()) return [];
            return processarTextoOcr(text);
        } finally {
            await worker.terminate();
        }
    } catch (e) {
        logger.error('recibo-ocr processarImagem:', e);
        throw e;
    } finally {
        try { fs.unlinkSync(tmpPath); } catch (_) {}
    }
}

module.exports = {
    parseValor,
    extractValoresReais,
    categorizar,
    processarTextoOcr,
    processarImagem
};
