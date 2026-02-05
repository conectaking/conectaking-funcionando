/**
 * Parser do texto extraído por OCR da tela "Detalhes da dívida" do Serasa.
 * Extrai: empresa/razão social, número do contrato, produto/serviço, data da dívida,
 * valor original, valor atual, total a negociar, tipo (conta atrasada etc.).
 * Não acessa Serasa; processa apenas o texto da imagem enviada pelo usuário.
 */

const { parseValor } = require('./serasa-pdf-parser');

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
                if (!/^(Razão|Número|Produto|Data|Valor|Total)/i.test(lines[i + 1]))
                    return lines[i + 1].trim();
            }
        }
    }
    return null;
}

/**
 * Extrai texto (não necessariamente R$) que vem após uma label.
 */
function textAfterLabel(text, labelRegex, maxLines = 2) {
    const label = new RegExp(labelRegex, 'i');
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
        if (label.test(lines[i])) {
            const parts = lines[i].split(/\s{2,}|\t/);
            const afterLabel = parts.slice(1).join(' ').trim();
            if (afterLabel) return afterLabel.slice(0, 200);
            for (let j = 1; j <= maxLines && i + j < lines.length; j++) {
                const next = lines[i + j];
                if (/^(Razão|Número|Produto|Data|Valor|Total|Perguntas|O que)/i.test(next)) break;
                if (next && next.length > 0) return next.slice(0, 200);
            }
        }
    }
    return null;
}

/**
 * Parse do texto OCR de UMA tela "Detalhes da dívida".
 * Retorna um objeto com: nome, valorTotal (total a negociar), valorOriginal, valorAtual,
 * numeroContrato, produtoServico, dataDivida, tipo.
 */
function parseDetalhesDividaText(ocrText) {
    if (!ocrText || typeof ocrText !== 'string') return null;

    const nome = textAfterLabel(ocrText, 'Razão social|Empresa responsável|BANCO|NOME DA EMPRESA') ||
        textAfterLabel(ocrText, 'Razão social');
    let numeroContrato = textAfterLabel(ocrText, 'Número do contrato|Número do contrato');
    const contractMatch = ocrText.match(/N[uú]mero\s+do\s+contrato\s*[\s:]*(\d+)/i) || ocrText.match(/(\d{10,14})/);
    if (contractMatch) numeroContrato = (contractMatch[1] || contractMatch[0] || '').toString().replace(/\D/g, '');
    else if (numeroContrato && typeof numeroContrato === 'string') numeroContrato = numeroContrato.replace(/\D/g, '');
    const produtoServico = textAfterLabel(ocrText, 'Produto\\s*\\/\\s*Serviço|Produto / Serviço', 2);
    let dataDivida = textAfterLabel(ocrText, 'Data da dívida');
    const dataMatch = ocrText.match(/Data da d[ií]vida\s*[\s:]*(\d{2}\/\d{2}\/\d{4})/i) || ocrText.match(/(\d{2}\/\d{2}\/\d{4})/g);
    if (dataMatch) dataDivida = (dataMatch[1] || dataMatch[0] || '').toString().trim();

    const valorOriginalStr = valueAfterLabel(ocrText, 'Valor original');
    const valorAtualStr = valueAfterLabel(ocrText, 'Valor atual');
    const totalNegociarStr = valueAfterLabel(ocrText, 'Total a negociar|Total a negociar');

    const valorOriginal = valorOriginalStr ? parseValor(valorOriginalStr) : null;
    const valorAtual = valorAtualStr ? parseValor(valorAtualStr) : null;
    const valorTotal = totalNegociarStr ? parseValor(totalNegociarStr) : (valorAtual || valorOriginal);

    const tipo = /Conta atrasada|D[ií]vida negativada|Dívida negativada/i.test(ocrText)
        ? (ocrText.match(/Conta atrasada[^.\n]*|D[ií]vida negativada[^.\n]*/i) || [])[0] || 'Conta atrasada'
        : null;

    const razaoFinal = nome || textAfterLabel(ocrText, 'Razão social');
    const contractNum = typeof numeroContrato === 'string' ? numeroContrato : String(numeroContrato || '');
    const hasContract = contractNum.length >= 8;

    if (!razaoFinal && !valorTotal && !valorAtual && !valorOriginal) return null;

    return {
        nome: (razaoFinal || 'Credor').trim().slice(0, 120),
        valorTotal: valorTotal != null ? valorTotal : (valorAtual != null ? valorAtual : valorOriginal || 0),
        valorOriginal: valorOriginal != null ? valorOriginal : undefined,
        valorAtual: valorAtual != null ? valorAtual : undefined,
        numeroContrato: hasContract ? contractNum.slice(0, 30) : (numeroContrato || undefined),
        produtoServico: (produtoServico || '').trim().slice(0, 200) || undefined,
        dataDivida: (dataDivida || '').trim().match(/^\d{2}\/\d{2}\/\d{4}$/) ? dataDivida.trim() : undefined,
        tipo: tipo ? tipo.slice(0, 100) : undefined
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
