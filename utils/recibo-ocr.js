/**
 * OCR para comprovantes de recibo: extrai nome do estabelecimento (loja/pessoa que cobrou),
 * valor principal (priorizando Valor Total / Subtotal / VALOR), forma de pagamento e
 * detecta múltiplos comprovantes na mesma imagem.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const logger = require('./logger');

// Valores em R$: 1.234,56 ou 10,00 ou 25.50 ou 173,78
const REGEX_VALOR_RS = /R\s*\$\s*[\d.]{1,3}(?:\.\d{3})*[,.]\d{2}|R\s*\$\s*\d+[,.]\d{2}/gi;
// Número sozinho (valor sem R$ na mesma linha): "173,78" ou "100,00"
const REGEX_NUMERO_VALOR = /\d{1,3}(?:\.\d{3})*[,.]\d{2}|\d+[,.]\d{2}/g;

function parseValor(str) {
    if (!str || typeof str !== 'string') return null;
    const cleaned = str.replace(/\s/g, '').replace(/R\$\s*/gi, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
}

/**
 * Extrai todos os valores monetários do texto com contexto (linha).
 */
function extractValoresComContexto(ocrText) {
    const linhas = ocrText.split(/\r?\n/);
    const resultados = [];
    for (let i = 0; i < linhas.length; i++) {
        const linha = linhas[i];
        const linhaNorm = linha.toUpperCase();
        // R$ explícito
        let m;
        REGEX_VALOR_RS.lastIndex = 0;
        while ((m = REGEX_VALOR_RS.exec(linha)) !== null) {
            const valor = parseValor(m[0]);
            if (valor != null && valor >= 0 && valor < 1000000) {
                resultados.push({
                    valor,
                    raw: m[0],
                    linha: linha.trim(),
                    linhaNorm,
                    indexLinha: i
                });
            }
        }
        // "VALOR" ou "Valor:" na linha e número na mesma linha (ex.: VALOR 173,78) ou na linha seguinte
        if (/\bVALOR\b|\bValor\s*:/i.test(linha) && !/VALOR PAGO|Valor Pago/i.test(linha) && !/Valor\s*aprx|tributos/i.test(linha)) {
            let numeros = linha.match(REGEX_NUMERO_VALOR);
            if (!numeros && i + 1 < linhas.length) {
                const proxLinha = linhas[i + 1];
                numeros = proxLinha.match(REGEX_NUMERO_VALOR);
                if (numeros) {
                    const v = parseValor(numeros[0]);
                    if (v != null && v >= 0 && v < 1000000)
                        resultados.push({ valor: v, raw: numeros[0], linha: (linha + ' ' + proxLinha).trim(), linhaNorm: (linha + ' ' + proxLinha).toUpperCase(), indexLinha: i });
                }
            } else if (numeros && numeros.length > 0) {
                const ultimo = numeros[numeros.length - 1];
                const v = parseValor(ultimo);
                if (v != null && v >= 0 && v < 1000000)
                    resultados.push({ valor: v, raw: ultimo, linha: linha.trim(), linhaNorm, indexLinha: i });
            }
        }
        // "Valor:" seguido de número (sem R$)
        const matchValor = linha.match(/Valor\s*:\s*(\d{1,3}(?:\.\d{3})*[,.]\d{2}|\d+[,.]\d{2})/i);
        if (matchValor) {
            const v = parseValor(matchValor[1]);
            if (v != null && v >= 0 && v < 1000000)
                resultados.push({ valor: v, raw: matchValor[1], linha: linha.trim(), linhaNorm, indexLinha: i });
        }
    }
    return resultados;
}

/**
 * Escolhe o valor principal: prioriza "Valor Total", "Subtotal", "Total R$", depois "VALOR"/"Valor:",
 * evita "Valor Pago" quando há outro valor que seja o total da compra (ex.: Total 100 e Pago 180).
 */
function escolherValorPrincipal(resultados) {
    if (!resultados.length) return null;
    const comTotal = resultados.filter(r =>
        /VALOR\s*TOTAL|Valor\s*Total|Subtotal|Total\s*R\s*\$|TOTAL\s*R\s*\$/.test(r.linhaNorm) &&
        !/VALOR PAGO|Valor Pago|VALOR PAGO \(RS\)/.test(r.linha)
    );
    if (comTotal.length > 0) {
        const primeiro = comTotal[0];
        return primeiro.valor;
    }
    const comValor = resultados.filter(r =>
        /\bVALOR\b|\bValor\s*:/.test(r.linhaNorm) &&
        !/VALOR PAGO|Valor Pago|Valor\s*aprx|tributos/.test(r.linha)
    );
    if (comValor.length > 0) return comValor[0].valor;
    const comValorPago = resultados.filter(r => /VALOR PAGO|Valor Pago|Valor\s*Pago\s*:/i.test(r.linha));
    if (comValorPago.length > 0) return comValorPago[0].valor;
    return resultados[0].valor;
}

/**
 * Extrai nome do estabelecimento (loja/pessoa que cobrou).
 */
function extrairNomeEstabelecimento(ocrText) {
    const linhas = ocrText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const ignorar = new Set(['getnet', 'cielo', 'linx', 'via cliente', 'via estab', 'reimpressao', 'documento auxiliar', 'consumidor nao identificado']);
    let melhor = '';
    for (let i = 0; i < linhas.length; i++) {
        const linha = linhas[i];
        const lower = linha.toLowerCase();
        if (ignorar.has(lower) || lower.length < 4) continue;
        if (/^\d|^R\s*\$\s*|^[\d.,\s]+$/.test(linha)) continue;
        if (/\b(LTDA|S\/A|ME|EPP)\s*$/i.test(linha) && linha.length > 6) {
            return linha;
        }
        if (/POSTO\s+|AUTO\s*POSTO|ENTREVIAS|VIAPAULISTA|SICREDI/i.test(linha) && linha.length <= 80) {
            if (!melhor || linha.length > melhor.length) melhor = linha;
        }
        if (linha.includes('CNPJ') && i > 0) {
            const anterior = linhas[i - 1];
            if (anterior.length > 3 && anterior.length < 80 && !/^\d/.test(anterior))
                return anterior;
        }
    }
    if (melhor) return melhor;
    for (const linha of linhas) {
        if (linha.length >= 8 && linha.length <= 60 && !/^\d|R\s*\$/i.test(linha) && !ignorar.has(linha.toLowerCase()))
            return linha;
    }
    return '';
}

/**
 * Extrai forma de pagamento.
 */
function extrairFormaPagamento(ocrText) {
    const t = ocrText.toUpperCase();
    if (/\bPIX\b|RECEBIMENTO PIX/.test(t)) return 'PIX';
    if (/\bCREDITO\b|CRÉDITO|CREDITO A VISTA|À VISTA/.test(t)) return 'Crédito';
    if (/\bDEBITO\b|DÉBITO|DEBITO\b/.test(t)) return 'Débito';
    if (/\bCARTAO\b|CARTÃO|PGTO\s*:\s*CARTAO/.test(t)) return 'Cartão';
    return '';
}

/**
 * Detecta blocos de múltiplos comprovantes (ex.: duas "VIA CLIENTE" ou dois valores com contexto de cartão).
 * Retorna { blocos: string[], multiplosValores: number[] } — se multiplosValores tiver 2+ itens, são dois comprovantes com esses valores.
 */
function detectarMultiplosComprovantes(ocrText, valoresComContexto) {
    const linhas = ocrText.split(/\r?\n/);
    const vias = [];
    for (let i = 0; i < linhas.length; i++) {
        if (/VIA\s*CLIENTE|VIA\s*ESTAB|REIMPRESSÃO|REIMPRESSAO/i.test(linhas[i])) vias.push(i);
    }
    if (vias.length >= 2) {
        const blocos = [];
        for (let b = 0; b < vias.length; b++) {
            const inicio = vias[b];
            const fim = b < vias.length - 1 ? vias[b + 1] : linhas.length;
            blocos.push(linhas.slice(inicio, fim).join('\n'));
        }
        return { blocos, multiplosValores: null };
    }
    const comCreditoDebito = valoresComContexto.filter(r =>
        /CREDITO|DEBITO|CRÉDITO|DÉBITO|R\s*\$\s*\d|VALOR\s*\d/.test(r.linha)
    );
    const valoresUnicos = [...new Set(comCreditoDebito.map(r => r.valor).filter(v => v > 0))];
    if (valoresUnicos.length >= 2) {
        return { blocos: [ocrText], multiplosValores: valoresUnicos };
    }
    return { blocos: [ocrText], multiplosValores: null };
}

/**
 * Processa um bloco de texto (um comprovante) e retorna um item sugerido.
 */
function processarBloco(blocoTexto, categorizar) {
    const valores = extractValoresComContexto(blocoTexto);
    const valor = escolherValorPrincipal(valores);
    const nome = extrairNomeEstabelecimento(blocoTexto);
    const formaPagamento = extrairFormaPagamento(blocoTexto);
    const categoria = categorizar(blocoTexto);
    const descricao = nome
        ? (formaPagamento ? `${nome} — ${formaPagamento}` : nome)
        : (formaPagamento ? formaPagamento : categoria);
    return {
        valor: valor != null ? valor : 0,
        categoria,
        textoTrecho: descricao,
        nome_estabelecimento: nome || undefined,
        forma_pagamento: formaPagamento || undefined
    };
}

const CATEGORIAS = {
    pedagio: { nome: 'Pedágio', keywords: ['pedágio', 'pedagio', 'concessionária', 'concessionaria', 'entrevias', 'viapaulista', 'arteris', 'dfe', 'km\\d', 'placa'] },
    refeicao: { nome: 'Refeição', keywords: ['restaurante', 'lanchonete', 'refeição', 'refeicao', 'almoço', 'almoco', 'jantar', 'food', 'delivery', 'ifood', 'uber eats', 'lanche', 'café', 'cafe'] },
    combustivel: { nome: 'Combustível', keywords: ['posto', 'combustível', 'combustivel', 'gasolina', 'etanol', 'diesel', 'shell', 'ipiranga', 'ale', 'auto posto'] },
    comercio: { nome: 'Comércio / Outros', keywords: ['comércio', 'comercio', 'mercado', 'loja', 'nota fiscal', 'nf-e', 'nf e', 'supermercado', 'farmácia', 'farmacia', 'laranjinha'] }
};

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
 * Processa texto OCR: detecta um ou mais comprovantes, extrai valor principal, nome e forma de pagamento.
 * Retorna lista de { valor, categoria, textoTrecho, nome_estabelecimento?, forma_pagamento? }.
 */
function processarTextoOcr(ocrText) {
    const valoresComContexto = extractValoresComContexto(ocrText);
    const { blocos, multiplosValores } = detectarMultiplosComprovantes(ocrText, valoresComContexto);
    const resultados = [];

    if (multiplosValores && multiplosValores.length >= 2) {
        const nome = extrairNomeEstabelecimento(ocrText);
        const formaPagamento = extrairFormaPagamento(ocrText);
        const cat = categorizar(ocrText);
        for (const v of multiplosValores) {
            const descricao = nome ? (formaPagamento ? `${nome} — ${formaPagamento}` : nome) : (formaPagamento || cat);
            resultados.push({
                valor: v,
                categoria: cat,
                textoTrecho: descricao,
                nome_estabelecimento: nome || undefined,
                forma_pagamento: formaPagamento || undefined
            });
        }
        return resultados;
    }

    for (const bloco of blocos) {
        const item = processarBloco(bloco, categorizar);
        if (item.valor > 0 || item.nome_estabelecimento || item.forma_pagamento) {
            resultados.push(item);
        }
    }
    if (resultados.length === 0 && valoresComContexto.length > 0) {
        const valor = escolherValorPrincipal(valoresComContexto);
        if (valor != null && valor > 0) {
            resultados.push(processarBloco(ocrText, categorizar));
        }
    }
    if (resultados.length === 0) {
        const nome = extrairNomeEstabelecimento(ocrText);
        if (nome) resultados.push({ valor: 0, categoria: 'Comércio / Outros', textoTrecho: nome, nome_estabelecimento: nome });
    }
    return resultados;
}

/**
 * Executa OCR na imagem e retorna itens sugeridos (nome, valor, forma de pagamento, um por comprovante).
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
    extractValoresComContexto,
    escolherValorPrincipal,
    extrairNomeEstabelecimento,
    extrairFormaPagamento,
    categorizar,
    processarTextoOcr,
    processarImagem
};
