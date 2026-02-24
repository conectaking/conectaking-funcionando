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

const PEDAGIO_NAMES = ['P1', 'P4', 'CCR AUTOBAN', 'CONCESSIONARIA ROTA', 'ENTREVIAS', 'ROTA SO', 'AUTOBAN', 'VIAPAULISTA'];

function categoriaFatura(nome) {
    if (!nome || typeof nome !== 'string') return 'Comércio / Outros';
    const upper = nome.toUpperCase();
    for (const p of PEDAGIO_NAMES) {
        if (upper.includes(p)) return 'Pedágio';
    }
    return 'Comércio / Outros';
}

/**
 * Extrai itens de fatura de cartão: cada linha com [Nome] [Data DD/MM] [Valor] vira um item.
 * Ex.: "ImperatrizCarnes 22/02 37,59 R$" -> { descricao: "Imperatriz Carnes", data: "22/02", valor: 37.59 }
 * Aceita também "Nome DD/MM R$ 37,59" ou "Nome 22/02 37,59".
 */
function processarFaturaCartao(ocrText) {
    const linhas = ocrText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const itens = [];
    for (const linha of linhas) {
        const recusada = /Recusada|Recusado/i.test(linha);
        let match = linha.match(/^(.+?)\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s+(\d+[,.]\d{2})\s*(?:R\s*\$)?/);
        if (!match) match = linha.match(/^(.+?)\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s+R\s*\$\s*(\d+[,.]\d{2})/);
        if (!match) continue;
        let nome = match[1].trim().replace(/\s+/g, ' ');
        const dataStr = match[2].trim();
        const valor = parseValor(match[3]);
        if (valor == null || valor < 0) continue;
        if (nome.length > 60) nome = nome.slice(0, 57) + '...';
        if (recusada) nome = nome + ' (Recusada)';
        const categoria = categoriaFatura(nome);
        itens.push({
            valor: valor,
            categoria,
            textoTrecho: nome,
            nome_estabelecimento: nome,
            data: dataStr
        });
    }
    return itens;
}

/**
 * Converte transactions[] do receipt-parser (print de lista) em itens para a tabela.
 * Usa name como nome/descrição, date como data, amount como valor; Recusada fica no textoTrecho.
 */
function itensFromTransactionList(transactions) {
    if (!Array.isArray(transactions) || transactions.length === 0) return [];
    return transactions.map(tx => {
        const nome = tx.name || tx.title || 'Transação';
        const descricao = tx.status === 'DECLINED' ? nome + ' (Recusada)' : nome;
        const item = {
            valor: tx.amount || 0,
            categoria: 'Comércio / Outros',
            textoTrecho: descricao.slice(0, 120),
            nome_estabelecimento: tx.status === 'DECLINED' ? undefined : nome
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
function processarTextoOcr(ocrText) {
    const listParsed = receiptParser.parseReceipt(ocrText);
    if (listParsed.transactions && listParsed.transactions.length > 0) {
        const itens = itensFromTransactionList(listParsed.transactions);
        if (itens.length > 0) return itens;
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
 * Executa OCR na imagem e retorna itens sugeridos + parse_result (confidence, candidates) para a UI.
 * Retorno: { itensSugeridos: Array, parseResult?: { confidence, candidates, amount_paid, status } }
 */
async function processarImagem(imageBuffer) {
    if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) return { itensSugeridos: [] };
    const ext = '.jpg';
    const tmpPath = path.join(os.tmpdir(), `recibo-ocr-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    try {
        fs.writeFileSync(tmpPath, imageBuffer);
        const { createWorker } = require('tesseract.js');
        const worker = await createWorker('por', 1, { logger: () => {} });
        try {
            const { data: { text } } = await worker.recognize(tmpPath);
            if (!text || !text.trim()) return { itensSugeridos: [] };
            const itensSugeridos = processarTextoOcr(text);
            const receiptParser = require('./receipt-parser');
            const parseResult = receiptParser.parseReceipt(text);
            const parseResultForApi = {
                confidence: parseResult.confidence,
                candidates: (parseResult.candidates || []).slice(0, 5).map(c => ({ value: c.value, score: c.score, evidence: c.evidence || '' })),
                amount_paid: parseResult.amount_paid,
                status: parseResult.status,
                warnings: parseResult.warnings || [],
                total_paid: parseResult.total_paid ?? null,
                transactions: parseResult.transactions || null
            };
            return { itensSugeridos, parseResult: parseResultForApi };
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
