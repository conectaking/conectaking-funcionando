/**
 * Parser do texto extraído por OCR da tela "Detalhes da dívida" do Serasa.
 * Extrai: empresa/razão social, número do contrato, produto/serviço, data da dívida,
 * valor original, valor atual, total a negociar, tipo (conta atrasada etc.).
 * Não acessa Serasa; processa apenas o texto da imagem enviada pelo usuário.
 */

const { parseValor } = require('./serasa-pdf-parser');

/** Texto do link do Serasa "Não reconhece a empresa?" - nunca usar como dado. */
function isSerasaLinkOrInvalid(s) {
    if (!s || typeof s !== 'string') return true;
    const t = s.trim();
    return /n[aã]o\s+reconhece|reconhece\s+a\s+empresa\s*\??/i.test(t) || t.length < 2;
}

/**
 * Extrai um valor que vem após uma label (na mesma linha ou na próxima).
 * Ex: "Valor original" seguido de "R$ 13.032,04" ou "Valor original R$ 13.032,04"
 */
function valueAfterLabel(text, labelRegex, valueRegex) {
    const label = new RegExp(labelRegex, 'i');
    const value = valueRegex || /R\$\s*[\d.]{1,3}(?:\.\d{3})*,\d{2}/;
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
        if (label.test(lines[i])) {
            const sameLine = lines[i].match(value);
            if (sameLine) return sameLine[0].trim();
            if (lines[i + 1]) {
                const nextLine = lines[i + 1].match(value);
                if (nextLine) return nextLine[0].trim();
                if (/n[aã]o\s+reconhece|reconhece\s+a\s+empresa/i.test(lines[i + 1])) return null;
                if (!/^(Razão|Número|Produto|Data|Valor|Total|Conta atrasada)/i.test(lines[i + 1]))
                    return lines[i + 1].trim();
            }
        }
    }
    return null;
}

/**
 * Extrai texto (não necessariamente R$) que vem após uma label.
 * Tenta: valor na mesma linha (após o label); depois nas próximas linhas.
 */
function textAfterLabel(text, labelRegex, maxLines = 2) {
    const label = new RegExp(labelRegex, 'i');
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
        if (label.test(lines[i])) {
            const line = lines[i];
            const afterLabelSameLine = line.replace(label, '').trim();
            if (afterLabelSameLine && !isSerasaLinkOrInvalid(afterLabelSameLine) && !/^R\$\s*[\d.,\s]+$/.test(afterLabelSameLine))
                return afterLabelSameLine.slice(0, 300);
            const parts = line.split(/\s{2,}|\t/);
            const afterLabel = parts.slice(1).join(' ').trim();
            if (afterLabel && !isSerasaLinkOrInvalid(afterLabel) && !/^R\$\s*[\d.,\s]+$/.test(afterLabel))
                return afterLabel.slice(0, 300);
            for (let j = 1; j <= maxLines && i + j < lines.length; j++) {
                const next = lines[i + j];
                if (/n[aã]o\s+reconhece|reconhece\s+a\s+empresa\s*\??/i.test(next)) continue;
                if (/^(Razão|Número|Produto|Data|Valor|Total|Conta atrasada|Perguntas|O que|Empresa responsável|Entenda)/i.test(next)) break;
                if (next && next.length > 0 && !isSerasaLinkOrInvalid(next) && !/^R\$\s*[\d.,\s]+$/.test(next)) return next.slice(0, 300);
            }
        }
    }
    return null;
}

/**
 * Fallback: extrai "Empresa origem" e "Produto / Serviço" com regex no texto inteiro
 * (útil quando o OCR quebra linhas de forma inesperada).
 */
function fallbackEmpresaOrigem(ocrText) {
    if (!/Empresa\s+origem/i.test(ocrText)) return null;
    const m = ocrText.match(/Empresa\s+origem\s*[\s:\n]*([A-Za-z][A-Za-z0-9\s\-]+?)(?=\s*\n\s*(?:N[uú]mero|Data|Produto|Valor|Total|Perguntas|O que)|$)/im);
    if (m && m[1]) {
        const v = m[1].trim().replace(/\s+/g, ' ').slice(0, 80);
        if (!isSerasaLinkOrInvalid(v) && v.length >= 2) return v;
    }
    const m2 = ocrText.match(/Empresa\s+origem\s+([^\n]+)/i);
    if (m2 && m2[1]) {
        const v = m2[1].trim().replace(/\s+/g, ' ').slice(0, 80);
        if (!isSerasaLinkOrInvalid(v)) return v;
    }
    const bancos = ['Banco Inter', 'Banco Inter S.A.', 'FORT BRASIL', 'Fort Brasil', 'Santander', 'Itau', 'Nubank', 'C6 Bank', 'Bradesco', 'Caixa', 'Recovery'];
    for (const b of bancos) {
        const re = new RegExp('\\b' + b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
        if (re.test(ocrText)) return b;
    }
    return null;
}

function fallbackProdutoServico(ocrText) {
    const m = ocrText.match(/Produto\s*\/?\s*Servi[cç]o\s*[\s:\n]*([^\n]+?)(?=\s*\n\s*(?:Valor\s+original|Valor\s+atual|Total a negociar|Perguntas|O que)|$)/im);
    if (m && m[1]) {
        const v = m[1].trim().replace(/\s+/g, ' ').slice(0, 300);
        if (!isSerasaLinkOrInvalid(v) && !/^R\$\s*[\d.,\s]+$/.test(v)) return v;
    }
    const m2 = ocrText.match(/Produto\s*\/?\s*Servi[cç]o\s+([^\n]+)/i);
    if (m2 && m2[1]) {
        const v = m2[1].trim().replace(/\s+/g, ' ').slice(0, 300);
        if (!isSerasaLinkOrInvalid(v)) return v;
    }
    if (/Cart[aã]o\s+de\s+Cr[eé]dito|CART[AÃ]O\s+GOLD|MASTERCARD/i.test(ocrText)) {
        const cartao = ocrText.match(/(Cart[aã]o\s+de\s+Cr[eé]dito\s*[^\n]*?)(?=\n\s*(?:Valor|Total|Perguntas|O que)|$)/im);
        if (cartao && cartao[1]) {
            const v = cartao[1].trim().replace(/\s+/g, ' ').slice(0, 300);
            if (v.length > 10) return v;
        }
    }
    return null;
}

/**
 * Parse do texto OCR de UMA tela do Serasa.
 * Dois modelos suportados:
 * - Inter/Recovery: Conta atrasada, Empresa origem, Número contrato, Data de origem,
 *   Produto ou serviço, Valor original, Valor atual, Total a negociar.
 * - Santander/outros: Data da dívida, Valor original, Valor atual, Produto/serviço,
 *   Número do contrato, Razão social (banco), Valor da negociação.
 * Retorna: nome, valorTotal, valorOriginal, valorAtual, numeroContrato, produtoServico,
 * dataDivida, empresaOrigem, tipo.
 */
function parseDetalhesDividaText(ocrText) {
    if (!ocrText || typeof ocrText !== 'string') return null;

    let nome = textAfterLabel(ocrText, 'Razão social|Empresa responsável|BANCO|NOME DA EMPRESA') ||
        textAfterLabel(ocrText, 'Razão social') ||
        (ocrText.match(/FIDC\s+[A-Z0-9\s]+/i) || [])[0]?.trim() ||
        (ocrText.match(/^(FIDC\s+[\w\s]+|BANCO\s+[\w\s]+)$/m) || [])[0]?.trim();
    if (isSerasaLinkOrInvalid(nome)) nome = null;
    let empresaOrigem = textAfterLabel(ocrText, 'Empresa\\s+origem|Empresa origem', 3);
    if (!empresaOrigem || isSerasaLinkOrInvalid(empresaOrigem)) empresaOrigem = fallbackEmpresaOrigem(ocrText);
    let numeroContrato = textAfterLabel(ocrText, 'Número do contrato|Número do contrato');
    const contractMatch = ocrText.match(/N[uú]mero\s+do\s+contrato\s*[\s:]*(\d+)/i) || ocrText.match(/(\d{6,20})/);
    if (contractMatch) numeroContrato = (contractMatch[1] || contractMatch[0] || '').toString().replace(/\D/g, '');
    else if (numeroContrato && typeof numeroContrato === 'string') numeroContrato = numeroContrato.replace(/\D/g, '');
    let produtoServico = textAfterLabel(ocrText, 'Produto\\s*\\/\\s*Serviço|Produto / Serviço|Produto\\s+ou\\s+serviço|Produto ou Serviço', 3);
    if (!produtoServico || isSerasaLinkOrInvalid(produtoServico)) produtoServico = fallbackProdutoServico(ocrText);
    let dataDivida = textAfterLabel(ocrText, 'Data da dívida');
    if (!dataDivida) dataDivida = textAfterLabel(ocrText, 'Data de origem', 1);
    const dataMatch = ocrText.match(/Data da d[ií]vida\s*[\s:]*(\d{2}\/\d{2}\/\d{4})/i) ||
        ocrText.match(/Data de origem\s*[\s:]*(\d{2}\/\d{2}\/\d{4})/i) ||
        ocrText.match(/(\d{2}\/\d{2}\/\d{4})/g);
    if (dataMatch) dataDivida = (dataMatch[1] || dataMatch[0] || '').toString().trim();

    const valorOriginalStr = valueAfterLabel(ocrText, 'Valor original');
    let valorAtualStr = valueAfterLabel(ocrText, 'Valor atual');
    if (!valorAtualStr) valorAtualStr = valueAfterLabel(ocrText, 'D[ií]vida\\s+[Nn]egativada|Dívida Negativada');
    if (!valorAtualStr) valorAtualStr = valueAfterLabel(ocrText, 'Conta atrasada');
    const totalNegociarStr = valueAfterLabel(ocrText, 'Total a negociar|Total a negociar') ||
        valueAfterLabel(ocrText, 'Valor da negocia[cç]ão|Valor da negocia[cç]ao');

    const valorOriginal = valorOriginalStr ? parseValor(valorOriginalStr) : null;
    const valorAtual = valorAtualStr ? parseValor(valorAtualStr) : null;
    const valorTotal = totalNegociarStr ? parseValor(totalNegociarStr) : (valorAtual || valorOriginal);

    let tipo = null;
    if (/Conta atrasada/i.test(ocrText)) tipo = 'Conta atrasada';
    else if (/D[ií]vida\s+negativada/i.test(ocrText)) tipo = 'Dívida negativada';

    let razaoFinal = nome || textAfterLabel(ocrText, 'Razão social');
    if (isSerasaLinkOrInvalid(razaoFinal)) razaoFinal = null;
    const nomeClean = razaoFinal && !isSerasaLinkOrInvalid(razaoFinal) ? razaoFinal.trim().slice(0, 120) : null;
    const empresaOrigemClean = empresaOrigem && !isSerasaLinkOrInvalid(empresaOrigem) ? empresaOrigem.trim().slice(0, 80) : undefined;
    const contractNum = typeof numeroContrato === 'string' ? numeroContrato : String(numeroContrato || '');
    const hasContract = contractNum.length >= 6;

    if (!nomeClean && !razaoFinal && !valorTotal && !valorAtual && !valorOriginal) return null;

    return {
        nome: (nomeClean || razaoFinal || 'Credor').trim().slice(0, 120),
        valorTotal: valorTotal != null ? valorTotal : (valorAtual != null ? valorAtual : valorOriginal || 0),
        valorOriginal: valorOriginal != null ? valorOriginal : undefined,
        valorAtual: valorAtual != null ? valorAtual : undefined,
        numeroContrato: hasContract ? contractNum.slice(0, 40) : (numeroContrato || undefined),
        produtoServico: (produtoServico || '').trim().slice(0, 300) || undefined,
        dataDivida: (dataDivida || '').trim().match(/^\d{2}\/\d{2}\/\d{4}$/) ? dataDivida.trim() : undefined,
        empresaOrigem: empresaOrigemClean,
        tipo: tipo || undefined
    };
}

/**
 * Parse de múltiplos textos OCR (várias imagens de detalhes).
 * Retorna array de ofertas com todos os campos preenchidos quando possível.
 */
function parseDetalhesDividaFromMultipleTexts(ocrTexts) {
    const results = [];
    for (const text of ocrTexts) {
        const one = parseDetalhesDividaText(text);
        if (one) results.push(one);
    }
    return results;
}

module.exports = {
    parseDetalhesDividaText,
    parseDetalhesDividaFromMultipleTexts,
    valueAfterLabel,
    textAfterLabel
};
