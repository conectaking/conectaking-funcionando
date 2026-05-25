/**
 * OCR para comprovantes de recibo: extrai nome do estabelecimento (loja/pessoa que cobrou),
 * valor principal (priorizando Valor Total / Subtotal / VALOR), forma de pagamento e
 * detecta múltiplos comprovantes na mesma imagem.
 * Usa Dicionário de Fontes (issuer profiles) para melhorar extração por tipo de comprovante.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const logger = require('./logger');
const { detectIssuer } = require('./recibo-issuer-profiles');
const receiptParser = require('./receipt-parser');
const openAiVision = require('./recibo-openai-vision');

/** Largura máxima para redimensionar imagem antes do OCR (acelera no Render/mobile). */
const OCR_MAX_WIDTH = 1400;
/** Worker Tesseract reutilizado (evita criar/destruir a cada comprovante). */
let _ocrWorker = null;
let _ocrWorkerPromise = null;

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

// Linhas que são tributos/percentuais — nunca usar como valor pago
const LINHA_EH_TRIBUTO = /Federal\s*R\s*\$|Estadual\s*R\s*\$|Municipal\s*R\s*\$|tributo|ICMS|retenção|retencao|aprox|%\s*\d|ST\s+R\s*\$/i;

/** Valor "redondo" (ex.: 100.00) — totais de compra costumam ser redondos; evita pegar 188.80 por OCR errado */
function valorEhRedondo(valor) {
    if (valor == null) return false;
    const centavos = Math.round(valor * 100) % 100;
    return centavos === 0;
}

/**
 * Escolhe o valor principal: prioriza "Subtotal" e "Valor Total" com valor correto (evita 188,80 quando o certo é 100,00).
 * Ignora linhas de tributos e preferência por valores redondos (100,00) quando a linha diz Subtotal/Valor Total/PIX.
 */
function escolherValorPrincipal(resultados) {
    if (!resultados.length) return null;
    const semTributo = resultados.filter(r => !LINHA_EH_TRIBUTO.test(r.linha));

    const comSubtotalOuTotal = semTributo.filter(r =>
        (/Subtotal\s*R\s*\$|Subtotal\s*\$|VALOR\s*TOTAL|Valor\s*Total\s*R\s*\$|TOTAL\s*R\s*\$/.test(r.linhaNorm) ||
         /Recebimento\s*PIX|Recebimento\s+PIX|PIX\s+\d/.test(r.linhaNorm)) &&
        !/VALOR PAGO\s*\(RS\)|Valor Pago\s*\(RS\)/.test(r.linha)
    );

    if (comSubtotalOuTotal.length > 0) {
        const redondos = comSubtotalOuTotal.filter(r => valorEhRedondo(r.valor));
        if (redondos.length > 0) return redondos[0].valor;
        const comSubtotal = comSubtotalOuTotal.filter(r => /Subtotal/i.test(r.linha));
        if (comSubtotal.length > 0) return comSubtotal[0].valor;
        return comSubtotalOuTotal[0].valor;
    }

    const comTotal = semTributo.filter(r =>
        /VALOR\s*TOTAL|Valor\s*Total|Total\s*R\s*\$|TOTAL\s*R\s*\$/.test(r.linhaNorm) &&
        !/VALOR PAGO|Valor Pago|VALOR PAGO \(RS\)/.test(r.linha)
    );
    if (comTotal.length > 0) {
        const redondos = comTotal.filter(r => valorEhRedondo(r.valor));
        if (redondos.length > 0) return redondos[0].valor;
        return comTotal[0].valor;
    }

    const comValor = semTributo.filter(r =>
        /\bVALOR\b|\bValor\s*:/.test(r.linhaNorm) &&
        !/VALOR PAGO|Valor Pago|Valor\s*aprx|tributos/.test(r.linha)
    );
    if (comValor.length > 0) {
        const redondos = comValor.filter(r => valorEhRedondo(r.valor));
        if (redondos.length > 0) return redondos[0].valor;
        return comValor[0].valor;
    }
    const comValorPago = semTributo.filter(r => /VALOR PAGO|Valor Pago|Valor\s*Pago\s*:|Recebimento\s*PIX|PIX/i.test(r.linha));
    if (comValorPago.length > 0) {
        const redondos = comValorPago.filter(r => valorEhRedondo(r.valor));
        if (redondos.length > 0) return redondos[0].valor;
        return comValorPago[0].valor;
    }

    const primeiro = semTributo.length > 0 ? semTributo[0] : resultados[0];
    const valorEscolhido = primeiro.valor;
    const valorRedondoEmTotal = semTributo.find(r =>
        valorEhRedondo(r.valor) &&
        (/Total|Subtotal|PIX|100|50|200|150/i.test(r.linha) || r.valor >= 1 && r.valor <= 5000)
    );
    if (valorRedondoEmTotal && !valorEhRedondo(valorEscolhido)) return valorRedondoEmTotal.valor;
    return valorEscolhido;
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
        // Ignorar linhas que são só códigos de terminal (EC:, TERM) — não são nome do estabelecimento
        if (/EC\s*:.*TERM|TERM\s+[A-Z0-9]/i.test(linha) && linha.length < 70) continue;
        if (/^\d|^R\s*\$\s*|^[\d.,\s]+$/.test(linha)) continue;
        if (/\b(LTDA|S\/A|ME|EPP)\s*$/i.test(linha) && linha.length > 6) {
            return linha;
        }
        if (/POSTO\s+|AUTO\s*POSTO|ENTREVIAS|VIAPAULISTA|SICREDI|MORADA\s*DO\s*SOL|RODOVIAS\s*DO\s*INTERIOR|CONC\.\s*RODOVIAS/i.test(linha) && linha.length <= 80) {
            if (!melhor || linha.length > melhor.length) melhor = linha;
        }
        if (/laranjinha|LARANJINHA/i.test(linha) && linha.length <= 40) {
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
        if (/VIA\s*CLIENTE|VIA\s*-\s*CLIENTE|VIA\s*ESTAB|REIMPRESSÃO|REIMPRESSAO|VIA\s*CLIENTE\s*\(/i.test(linhas[i])) vias.push(i);
    }
    // Só considerar múltiplos comprovantes quando há 2+ "VIA CLIENTE" (dois recibos na mesma foto).
    // Não criar um item por cada R$ encontrado (evita dezenas de linhas de um único comprovante).
    if (vias.length >= 2) {
        const blocos = [];
        for (let b = 0; b < vias.length; b++) {
            const inicio = vias[b];
            const fim = b < vias.length - 1 ? vias[b + 1] : linhas.length;
            blocos.push(linhas.slice(inicio, fim).join('\n'));
        }
        return { blocos, multiplosValores: null };
    }
    return { blocos: [ocrText], multiplosValores: null };
}

/** Mapeia payment_method do receipt-parser para texto exibido. */
function formaPagamentoFromMethod(method) {
    const map = { PIX: 'PIX', DEBITO: 'Débito', CREDITO: 'Crédito', PEDAGIO: 'Pedágio', NFCe: 'NFC-e', OUTRO: '' };
    return map[method] || '';
}

/** ISO date -> DD/MM/YYYY ou DD/MM para item. */
function paidAtToData(iso) {
    if (!iso) return undefined;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return undefined;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return day + '/' + month + '/' + d.getFullYear();
}

/**
 * Processa um bloco de texto (um comprovante) e retorna um item sugerido.
 * Usa receipt-parser (JSON padrão: amount_paid, DECLINED primeiro, candidates) e fallback em escolherValorPrincipal.
 */
function processarBloco(blocoTexto, categorizar) {
    const parsed = receiptParser.parseReceipt(blocoTexto);
    if (parsed.status === 'DECLINED') return null;

    const valores = extractValoresComContexto(blocoTexto);
    let valor = parsed.amount_paid != null && parsed.amount_paid > 0 ? parsed.amount_paid : null;
    if (valor == null) valor = escolherValorPrincipal(valores);

    const nome = parsed.merchant || extrairNomeEstabelecimento(blocoTexto);
    const formaPagamento = formaPagamentoFromMethod(parsed.payment_method) || extrairFormaPagamento(blocoTexto);
    const categoria = categorizar(blocoTexto);
    const descricao = nome
        ? (formaPagamento ? `${nome} — ${formaPagamento}` : nome)
        : (formaPagamento ? formaPagamento : categoria);

    const item = {
        valor: valor != null ? valor : 0,
        categoria,
        textoTrecho: descricao,
        nome_estabelecimento: nome || undefined,
        forma_pagamento: formaPagamento || undefined
    };
    const data = paidAtToData(parsed.paid_at);
    if (data) item.data = data;
    return item;
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
 * Reconhece se o texto parece fatura de cartão (várias linhas com nome + data DD/MM + valor).
 */
function pareceFaturaCartao(ocrText) {
    const linhas = ocrText.split(/\r?\n/).filter(l => l.trim().length > 4);
    let comDataValor = 0;
    for (const linha of linhas) {
        if (/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s+\d+[,.]\d{2}/.test(linha)) comDataValor++;
    }
    return comDataValor >= 2;
}

/** Layout app de cartão: várias datas DD/MM e valores em linhas separadas do nome. */
function pareceExtratoCartaoApp(ocrText) {
    const linhas = ocrText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let dates = 0;
    let values = 0;
    for (const l of linhas) {
        if (isOnlyDateLine(l)) dates++;
        if (/^(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})\s*R?\$?\s*$/i.test(l) || /^R\s*\$\s*(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})\s*$/i.test(l)) values++;
    }
    return (dates >= 2 && values >= 2) || values >= 3;
}

const PEDAGIO_NAMES = ['P1', 'P3', 'P4', 'P11', 'CCR AUTOBAN', 'CONCESSIONARIA ROTA', 'ENTREVIAS', 'ROTA SO', 'AUTOBAN', 'VIAPAULISTA', 'VIA COLINAS', 'COLINAS TOLL'];

function categoriaFatura(nome) {
    if (!nome || typeof nome !== 'string') return 'Comércio / Outros';
    const upper = nome.toUpperCase();
    for (const p of PEDAGIO_NAMES) {
        if (upper.includes(p)) return 'Pedágio';
    }
    return 'Comércio / Outros';
}

/** Linha contém só data DD/MM ou DD/MM/YY (ex.: 22/02). */
function isOnlyDateLine(line) {
    return line && /^\d{1,2}\/\d{1,2}(?:\/\d{2,4})?$/.test(line.trim());
}

/**
 * Extrai itens de fatura de cartão: cada linha com [Nome] [Data DD/MM] [Valor] vira um item.
 * Ex.: "ImperatrizCarnes 22/02 37,59 R$" -> { data: "22/02", valor: 37.59 }
 * Aceita também data na linha seguinte (layout app: nome+valor numa linha, data abaixo).
 * Ex.: "ImperatrizCarnes 37,59 R$" + próxima linha "22/02" -> data: "22/02".
 */
function processarFaturaCartao(ocrText) {
    const linhas = ocrText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const itens = [];
    for (let i = 0; i < linhas.length; i++) {
        const linha = linhas[i];
        if (isOnlyDateLine(linha)) continue;
        const recusada = /Recusada|Recusado/i.test(linha);
        let match = linha.match(/^(.+?)\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s+(\d+[,.]\d{2})\s*(?:R\s*\$)?/);
        if (!match) match = linha.match(/^(.+?)\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s+R\s*\$\s*(\d+[,.]\d{2})/);
        let dataStr = null;
        let nome = '';
        let valor = null;
        if (match) {
            nome = match[1].trim().replace(/\s+/g, ' ');
            dataStr = match[2].trim();
            valor = parseValor(match[3]);
        } else {
            const matchSemData = linha.match(/^(.+?)\s+(\d+[,.]\d{2})\s*(?:R\s*\$)?/);
            if (matchSemData && i + 1 < linhas.length && isOnlyDateLine(linhas[i + 1])) {
                nome = matchSemData[1].trim().replace(/\s+/g, ' ');
                valor = parseValor(matchSemData[2]);
                dataStr = linhas[i + 1].trim();
                i++;
            } else {
                continue;
            }
        }
        if (valor == null || valor < 0) continue;
        if (recusada) continue;
        if (nome.length > 60) nome = nome.slice(0, 57) + '...';
        const categoria = categoriaFatura(nome);
        itens.push({
            valor: valor,
            categoria,
            textoTrecho: nome,
            nome_estabelecimento: nome,
            data: dataStr || undefined
        });
    }
    return itens;
}

/**
 * Converte transactions[] do receipt-parser (print de lista) em itens para a tabela.
 * Usa name como nome/descrição, date como data, amount como valor; Recusada fica no textoTrecho.
 */
function limparNomeOcr(nome) {
    if (!nome || typeof nome !== 'string') return '';
    return nome.replace(/[|[\]:;]+$/g, '').replace(/^[|[\]:;]+/g, '').replace(/\s+/g, ' ').trim();
}

function itensFromTransactionList(transactions) {
    if (!Array.isArray(transactions) || transactions.length === 0) return [];
    return transactions
        .filter((tx) => tx && tx.status !== 'DECLINED')
        .map((tx) => {
        const nome = limparNomeOcr(tx.name || tx.title || 'Transação');
        const item = {
            valor: tx.amount || 0,
            categoria: 'Comércio / Outros',
            textoTrecho: nome.slice(0, 120),
            nome_estabelecimento: nome
        };
        if (tx.date) item.data = tx.date;
        return item;
    });
}

/**
 * Processa texto OCR: um comprovante = um item (ou 2 itens só se houver 2 blocos "VIA CLIENTE").
 * Se parecer fatura de cartão (várias linhas nome+data+valor), extrai um item por linha com data.
 * Se for print de lista (receipt-parser retorna transactions[]), extrai um item por transação.
 * Retorna lista de { valor, categoria, textoTrecho, nome_estabelecimento?, forma_pagamento?, data? }.
 */
function contarLinhasValorExtratoTexto(ocrText) {
    if (!ocrText) return 0;
    let n = 0;
    for (const l of ocrText.split(/\r?\n/)) {
        const t = l.trim();
        if (/^(\d{1,3}(?:\.\d{3})*|\d+)[,.](\d{2})\s*R?\$?\s*$/i.test(t)
            || /^R\s*\$\s*(\d{1,3}(?:\.\d{3})*|\d+)[,.](\d{2})\s*$/i.test(t)) n++;
    }
    return n;
}

function processarTextoOcr(ocrText) {
    if (!ocrText || !ocrText.trim()) return [];

    if (typeof receiptParser.parseTransactionList === 'function'
        && (contarLinhasValorExtratoTexto(ocrText) >= 2 || pareceExtratoCartaoApp(ocrText) || pareceFaturaCartao(ocrText))) {
        const lista = receiptParser.parseTransactionList(ocrText);
        if (lista.transactions && lista.transactions.length > 0) {
            return itensFromTransactionList(lista.transactions);
        }
    }

    const listParsed = receiptParser.parseReceipt(ocrText);
    if (listParsed.transactions && listParsed.transactions.length > 0) {
        const itens = itensFromTransactionList(listParsed.transactions);
        if (itens.length > 0) return itens;
    }

    if (typeof receiptParser.parseTransactionList === 'function') {
        const forced = receiptParser.parseTransactionList(ocrText);
        if (forced.transactions && forced.transactions.length > 0) {
            return itensFromTransactionList(forced.transactions);
        }
    }

    if (pareceFaturaCartao(ocrText)) {
        const faturaItens = processarFaturaCartao(ocrText);
        if (faturaItens.length > 0) return faturaItens;
    }

    const valoresComContexto = extractValoresComContexto(ocrText);
    const { blocos } = detectarMultiplosComprovantes(ocrText, valoresComContexto);
    const resultados = [];

    for (const bloco of blocos) {
        const item = processarBloco(bloco, categorizar);
        if (item != null && (item.valor > 0 || item.nome_estabelecimento || item.forma_pagamento)) {
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
 * Reduz o tamanho da imagem para acelerar o OCR (mantém proporção; max width OCR_MAX_WIDTH).
 * Retorna buffer JPEG ou o buffer original em caso de erro.
 */
async function redimensionarParaOcr(imageBuffer) {
    try {
        const sharp = require('sharp');
        let pipe = sharp(imageBuffer)
            .rotate()
            .normalize()
            .sharpen({ sigma: 1.2 })
            .resize(OCR_MAX_WIDTH, null, { withoutEnlargement: true, fit: 'inside' });
        return await pipe.jpeg({ quality: 88, mozjpeg: true }).toBuffer();
    } catch (e) {
        logger.warn('recibo-ocr redimensionar:', e.message);
        return imageBuffer;
    }
}

/**
 * Obtém o worker Tesseract (cria uma vez e reutiliza).
 */
async function getOcrWorker() {
    if (_ocrWorker) return _ocrWorker;
    if (_ocrWorkerPromise) return _ocrWorkerPromise;
    _ocrWorkerPromise = (async () => {
        const { createWorker } = require('tesseract.js');
        const worker = await createWorker('por', 1, { logger: () => {} });
        try {
            await worker.setParameters({
                tessedit_pageseg_mode: '4',
                preserve_interword_spaces: '1'
            });
        } catch (_) {}
        _ocrWorker = worker;
        return worker;
    })();
    return _ocrWorkerPromise;
}

/** Pré-carrega o worker Tesseract (evita timeout no 1º OCR após cold start no Render). */
async function warmUpOcr() {
    try {
        await getOcrWorker();
        return true;
    } catch (e) {
        logger.warn('recibo-ocr warmUpOcr:', e.message);
        return false;
    }
}

/**
 * Executa OCR Tesseract na imagem (sem OpenAI).
 */
async function processarImagemTesseract(imageBuffer) {
    if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) return { itensSugeridos: [], parseResult: { source: 'tesseract' }, ocrText: '' };
    const ext = '.jpg';
    const tmpPath = path.join(os.tmpdir(), `recibo-ocr-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    try {
        const bufferParaOcr = await redimensionarParaOcr(imageBuffer);
        fs.writeFileSync(tmpPath, bufferParaOcr);
        const worker = await getOcrWorker();
        const { data: { text } } = await worker.recognize(tmpPath);
        try { fs.unlinkSync(tmpPath); } catch (_) {}
        if (!text || !text.trim()) return { itensSugeridos: [], parseResult: { source: 'tesseract', confidence: 0 }, ocrText: '' };
        const itensSugeridos = sanitizarItensExtrato(processarTextoOcr(text), text, { tessCount: 0, openAiCount: 0 });
        const parseResult = receiptParser.parseReceipt(text);
        const parseResultForApi = {
            source: 'tesseract',
            confidence: parseResult.confidence,
            candidates: (parseResult.candidates || []).slice(0, 5).map(c => ({ value: c.value, score: c.score, evidence: c.evidence || '' })),
            amount_paid: parseResult.amount_paid,
            status: parseResult.status,
            warnings: parseResult.warnings || [],
            total_paid: parseResult.total_paid ?? null,
            transactions: parseResult.transactions || null,
            raw_ocr_text: text.slice(0, 8000)
        };
        return { itensSugeridos, parseResult: parseResultForApi, ocrText: text };
    } catch (e) {
        logger.error('recibo-ocr processarImagem:', e);
        throw e;
    } finally {
        try { fs.unlinkSync(tmpPath); } catch (_) {}
    }
}

function modoOpenAiRecibo() {
    return (process.env.RECIBO_OCR_AI || 'auto').toLowerCase();
}

/** Conta linhas que parecem valor de extrato (ex.: "13,20 R$"). */
function contarLinhasValorExtrato(ocrText) {
    if (!ocrText) return 0;
    const lines = ocrText.split(/\r?\n/);
    let n = 0;
    for (const l of lines) {
        const t = l.trim();
        if (/^(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})\s*R?\$?\s*$/i.test(t)) n++;
    }
    return n;
}

/**
 * Decide se vale chamar OpenAI Vision (auto) ou se modo always/never.
 */
function precisaOpenAiFallback(ocrText, itensSugeridos, parseResult, forceOpenAi) {
    const mode = modoOpenAiRecibo();
    if (mode === 'never' && !forceOpenAi) return false;
    if (forceOpenAi) return openAiVision.isAvailable();
    if (mode === 'always') return openAiVision.isAvailable();
    if (!openAiVision.isAvailable()) return false;

    const n = (itensSugeridos || []).length;
    // Tesseract não leu nada (comum em prints escuros/mobile) → sempre tenta OpenAI
    if (n === 0) return true;

    const valueLines = contarLinhasValorExtrato(ocrText);
    const txParser = (parseResult && parseResult.transactions) || [];
    const pareceLista = valueLines >= 3 || txParser.length >= 3 || n >= 2;

    if (valueLines >= 1 && n < valueLines) return true;
    if (pareceLista && valueLines >= 2 && n < Math.ceil(valueLines * 0.55)) return true;
    if (pareceLista && n >= 1 && n + 1 < valueLines) return true;
    if (txParser.length >= 2 && n < txParser.length) return true;

    return false;
}

function itemKeyOcrMerge(item) {
    const nome = ((item.nome_estabelecimento || item.textoTrecho || '') + '').trim().toLowerCase();
    const data = ((item.data || '') + '').trim();
    const valor = Math.round((Number(item.valor) || 0) * 100);
    return `${nome}|${data}|${valor}`;
}

/** Remove itens recusados/negados (OpenAI às vezes duplica cobrança recusada). */
function filtrarItensNaoRecusados(itens) {
    if (!Array.isArray(itens)) return [];
    return itens.filter((s) => {
        if (!s) return false;
        if (s.status === 'DECLINED' || s.recusada || s.recusado) return false;
        const nome = (s.nome_estabelecimento || '').toString().trim();
        const desc = (nome || s.textoTrecho || s.categoria || '').toString();
        return !/recusad|negad|cancelad|estornad/i.test(desc);
    });
}

function contarPorChaveItens(lista) {
    const m = new Map();
    for (const it of lista || []) {
        const k = itemKeyOcrMerge(it);
        m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
}

/**
 * Funde Tesseract + OpenAI sem inflar recusados: por chave usa o MENOR total quando ambos leram,
 * e se a IA leu mais linhas que o Tesseract, não duplica chaves que o Tesseract já limitou.
 */
function mesclarLeiturasParalelas(tessList, aiList) {
    const t = filtrarItensNaoRecusados(tessList);
    const a = filtrarItensNaoRecusados(aiList);
    if (t.length === 0) return a;
    if (a.length === 0) return t;

    if (a.length > t.length) {
        const keysA = new Set(a.map(itemKeyOcrMerge));
        const extrasT = t.filter((it) => !keysA.has(itemKeyOcrMerge(it)));
        return a.concat(extrasT);
    }

    const tessByKey = contarPorChaveItens(t);
    const aiByKey = contarPorChaveItens(a);
    const keys = new Set([...tessByKey.keys(), ...aiByKey.keys()]);
    const out = [];
    for (const k of keys) {
        const ct = tessByKey.get(k) || 0;
        const ca = aiByKey.get(k) || 0;
        const want = (ct > 0 && ca > 0) ? Math.min(ct, ca) : Math.max(ct, ca);
        const poolT = t.filter((it) => itemKeyOcrMerge(it) === k);
        const poolA = a.filter((it) => itemKeyOcrMerge(it) === k);
        const pool = poolT.length >= poolA.length ? poolT : poolA;
        for (let i = 0; i < want; i++) {
            out.push(pool[i] || pool[0]);
        }
    }
    return out.length > 0 ? out : t;
}

/** Limita repetições por chave ao que o parser do Tesseract já validou (evita recusado duplicado da IA). */
function capItensPorContagemParser(itens, autoritativa) {
    const allow = contarPorChaveItens(autoritativa);
    const used = new Map();
    const out = [];
    for (const it of itens) {
        const k = itemKeyOcrMerge(it);
        const max = allow.get(k);
        if (max == null) {
            out.push(it);
            continue;
        }
        const u = used.get(k) || 0;
        if (u < max) {
            out.push(it);
            used.set(k, u + 1);
        }
    }
    return out.length > 0 ? out : autoritativa;
}

function itensAutoritativosDoTextoOcr(ocrText) {
    if (!ocrText || !ocrText.trim()) return null;
    const lista = receiptParser.parseTransactionList(ocrText);
    const txs = lista.transactions || [];
    if (!txs.length) return null;
    return itensFromTransactionList(txs);
}

/** Parser do texto Tesseract só é confiável com 4+ itens (senão OCR local veio incompleto). */
function parserTesseractConfiavel(autoritativa, ocrText) {
    if (!autoritativa || autoritativa.length < 4) return false;
    const linhasValor = contarLinhasValorExtratoTexto(ocrText);
    if (linhasValor >= 4 && autoritativa.length >= linhasValor - 2) return true;
    return autoritativa.length >= 5;
}

/**
 * Lista final: sem recusados; usa contagem do parser (2x Entrevias, 2x P3 OK); não corta 2ª cópia legítima.
 */
function sanitizarItensExtrato(itens, ocrText, opts) {
    opts = opts || {};
    const ocr = (ocrText || '').trim();
    let out = filtrarItensNaoRecusados(itens || []);
    const autoritativa = ocr ? itensAutoritativosDoTextoOcr(ocr) : null;
    const tessOk = parserTesseractConfiavel(autoritativa, ocr);

    if (tessOk && autoritativa && autoritativa.length > 0) {
        if (out.length > autoritativa.length) {
            logger.info('recibo-ocr sanitizar: cap pelo parser Tesseract', {
                recebidos: out.length,
                parser: autoritativa.length
            });
            return capItensPorContagemParser(out, autoritativa);
        }
        if (out.length < autoritativa.length) {
            return mesclarLeiturasParalelas(autoritativa, out);
        }
        return capItensPorContagemParser(out, autoritativa);
    }

    if (opts.preferOpenAi && (opts.openAiCount || 0) >= 4) {
        return out;
    }

    if (autoritativa && autoritativa.length >= 3) {
        return capItensPorContagemParser(out, autoritativa);
    }

    return out;
}

function escolherMelhorLeitura(tesseractResult, openAiResult) {
    const ocrText = (tesseractResult && tesseractResult.ocrText)
        || (tesseractResult && tesseractResult.parseResult && tesseractResult.parseResult.raw_ocr_text)
        || '';
    const t = filtrarItensNaoRecusados((tesseractResult && tesseractResult.itensSugeridos) || []);
    const a = filtrarItensNaoRecusados((openAiResult && openAiResult.itensSugeridos) || []);

    const authTess = itensAutoritativosDoTextoOcr(ocrText);
    const tessOk = parserTesseractConfiavel(authTess, ocrText);

    let bruto;
    if (tessOk && authTess && authTess.length >= 4) {
        bruto = mesclarLeiturasParalelas(authTess, a);
    } else if (a.length >= 4 && a.length > t.length) {
        bruto = a;
    } else if (a.length >= 4 && a.length >= t.length) {
        bruto = mesclarLeiturasParalelas(t, a);
    } else if (a.length > 0 && t.length === 0) {
        bruto = a;
    } else {
        bruto = mesclarLeiturasParalelas(t, a);
        if (bruto.length === 0) bruto = a.length > t.length ? a : t;
    }

    const itensFinais = sanitizarItensExtrato(bruto, ocrText, {
        preferOpenAi: a.length >= t.length,
        openAiCount: a.length,
        tessCount: t.length
    });
    const engine = a.length > 0 && a.length >= t.length && itensFinais.length > 0
        ? (t.length > 0 ? 'hybrid' : 'openai')
        : (t.length > 0 && a.length > 0 ? 'hybrid' : (a.length >= t.length ? 'openai' : 'tesseract'));
    const parseBase = a.length >= t.length
        ? (openAiResult && openAiResult.parseResult) || {}
        : (tesseractResult && tesseractResult.parseResult) || {};
    return {
        itensSugeridos: itensFinais,
        parseResult: {
            ...parseBase,
            ocrEngine: engine,
            tesseractItens: t.length,
            openAiItens: a.length,
            itensAposSanitizar: itensFinais.length
        },
        ocrEngine: engine
    };
}

/**
 * Híbrido: Tesseract primeiro; OpenAI Vision se leitura incompleta ou modo always.
 */
async function processarImagemHibrida(imageBuffer, opts) {
    opts = opts || {};
    const forceOpenAi = !!opts.forceOpenAi;

    if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
        return { itensSugeridos: [], parseResult: { ocrEngine: 'none' } };
    }

    if (forceOpenAi && openAiVision.isAvailable()) {
        let tess = { itensSugeridos: [], parseResult: { source: 'tesseract' }, ocrText: '' };
        let ai = { itensSugeridos: [], parseResult: {} };
        let openAiError = null;
        try {
            tess = await processarImagemTesseract(imageBuffer);
        } catch (e) {
            logger.warn('recibo-ocr tesseract (usar_ia):', e.message);
        }
        try {
            ai = await openAiVision.extrairComOpenAi(imageBuffer);
        } catch (e) {
            openAiError = e.message || 'Erro na IA OpenAI';
            logger.warn('recibo-ocr openai (usar_ia):', openAiError);
        }
        const escolhido = escolherMelhorLeitura(tess, ai);
        logger.info('recibo-ocr usar_ia:', {
            engine: escolhido.ocrEngine,
            tesseract: (tess.itensSugeridos || []).length,
            openai: (ai.itensSugeridos || []).length,
            merged: (escolhido.itensSugeridos || []).length
        });
        escolhido.parseResult = {
            ...(escolhido.parseResult || {}),
            openAiAvailable: true,
            openAiTentou: true,
            openAiError: openAiError || undefined,
            raw_ocr_text: (tess.parseResult && tess.parseResult.raw_ocr_text) || (tess.ocrText || '').slice(0, 8000)
        };
        const ocrTxt = (tess.ocrText || (tess.parseResult && tess.parseResult.raw_ocr_text) || '');
        escolhido.itensSugeridos = sanitizarItensExtrato(escolhido.itensSugeridos || [], ocrTxt, {
            preferOpenAi: true,
            openAiCount: (ai.itensSugeridos || []).length,
            tessCount: (tess.itensSugeridos || []).length
        });
        if (escolhido.itensSugeridos.length > 0) {
            escolhido.ocrEngine = (ai.itensSugeridos || []).length >= (tess.itensSugeridos || []).length ? 'openai' : escolhido.ocrEngine;
            return escolhido;
        }
        if ((tess.itensSugeridos || []).length > 0) {
            escolhido.itensSugeridos = sanitizarItensExtrato(tess.itensSugeridos, ocrTxt, { tessCount: tess.itensSugeridos.length, openAiCount: 0 });
            escolhido.ocrEngine = 'tesseract';
            return escolhido;
        }
        // Tesseract e IA vazios — continua no fluxo padrão abaixo (não retorna zero cedo)
    } else if (forceOpenAi && !openAiVision.isAvailable()) {
        let tess = { itensSugeridos: [], parseResult: { source: 'tesseract' }, ocrText: '' };
        try {
            tess = await processarImagemTesseract(imageBuffer);
        } catch (e) {
            logger.error('recibo-ocr tesseract (sem IA):', e.message);
        }
        if ((tess.itensSugeridos || []).length > 0) {
            return {
                itensSugeridos: tess.itensSugeridos,
                parseResult: {
                    ...(tess.parseResult || {}),
                    ocrEngine: 'tesseract',
                    openAiAvailable: false,
                    openAiError: 'OPENAI_API_KEY não configurada no servidor. Use a mesma chave do KingBrief no Render.'
                },
                ocrEngine: 'tesseract'
            };
        }
        return {
            itensSugeridos: [],
            parseResult: {
                ocrEngine: 'none',
                openAiAvailable: false,
                openAiError: 'OPENAI_API_KEY não configurada no servidor. Use a mesma chave do KingBrief no Render.'
            },
            ocrEngine: 'none'
        };
    }

    let tess = { itensSugeridos: [], parseResult: { source: 'tesseract' }, ocrText: '' };
    try {
        tess = await processarImagemTesseract(imageBuffer);
    } catch (e) {
        logger.error('recibo-ocr tesseract:', e.message);
    }

    const mode = modoOpenAiRecibo();
    const chamarOpenAi = openAiVision.isAvailable() && (
        forceOpenAi
        || mode === 'always'
        || precisaOpenAiFallback(tess.ocrText, tess.itensSugeridos, tess.parseResult, forceOpenAi)
    );

    if (!chamarOpenAi) {
        const semIa = !openAiVision.isAvailable();
        return {
            itensSugeridos: tess.itensSugeridos || [],
            parseResult: {
                ...(tess.parseResult || {}),
                ocrEngine: 'tesseract',
                openAiAvailable: !semIa,
                openAiSkipped: semIa ? 'OPENAI_API_KEY não configurada no servidor' : 'leitura local suficiente'
            },
            ocrEngine: 'tesseract'
        };
    }

    try {
        const ai = await openAiVision.extrairComOpenAi(imageBuffer);
        const escolhido = escolherMelhorLeitura(tess, ai);
        logger.info('recibo-ocr híbrido:', {
            engine: escolhido.ocrEngine,
            tesseract: (tess.itensSugeridos || []).length,
            openai: (ai.itensSugeridos || []).length,
            forceOpenAi
        });
        escolhido.parseResult = {
            ...(escolhido.parseResult || {}),
            openAiAvailable: true,
            openAiTentou: true
        };
        return escolhido;
    } catch (e) {
        logger.warn('recibo-ocr openai fallback:', e.message);
        return {
            itensSugeridos: tess.itensSugeridos || [],
            parseResult: {
                ...(tess.parseResult || {}),
                ocrEngine: 'tesseract',
                openAiTentou: true,
                openAiError: e.message,
                openAiAvailable: true
            },
            ocrEngine: 'tesseract'
        };
    }
}

/** Alias principal — usa pipeline híbrido. opts: { forceOpenAi: boolean } */
async function processarImagem(imageBuffer, opts) {
    return processarImagemHibrida(imageBuffer, opts);
}

module.exports = {
    parseValor,
    extractValoresComContexto,
    escolherValorPrincipal,
    extrairNomeEstabelecimento,
    extrairFormaPagamento,
    categorizar,
    processarTextoOcr,
    processarImagem,
    processarImagemHibrida,
    processarImagemTesseract,
    warmUpOcr,
    filtrarItensNaoRecusados,
    mesclarLeiturasParalelas,
    sanitizarItensExtrato
};
