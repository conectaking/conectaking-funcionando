/**
 * Parser de texto extraído de relatório PDF "Suas ofertas na Serasa".
 * Extrai credor, valor original, valor negociado, % desconto, tipo, parcelas.
 * Não acessa Serasa nem serviços externos; apenas processa o texto do PDF enviado pelo usuário.
 */

/**
 * Converte string de valor brasileiro (R$ 1.234,56 ou 1234,56) para número.
 */
function parseValor(str) {
    if (!str || typeof str !== 'string') return null;
    const cleaned = str.replace(/\s/g, '').replace(/R\$\s*/i, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return isNaN(n) ? null : n;
}

/**
 * Lista de nomes de credores conhecidos (Serasa / ofertas). Usada para identificar quem é o credor em cada bloco.
 * Ordenados por tamanho decrescente para dar match em nomes compostos primeiro (ex: "Banco do Brasil" antes de "Banco").
 */
const CREDORES_CONHECIDOS = [
    'Banco do Brasil', 'Banco Do Brasil', 'Fort Brasil', 'Atacadão', 'Carrefour', 'PagSeguro',
    'Santander', 'Nubank', 'Itaú', 'Itau', 'Bradesco', 'Recovery', 'Ipanema', 'Inter',
    'Creditas', 'Original', 'C6 Bank', 'C6', 'BTG', 'XP', 'Safra', 'IPK', 'Dandel',
    'Cetam', 'Cétam', 'Magazine Luiza', 'Magalu', 'Casas Bahia', 'Americanas',
    'Serasa', 'Bemol', 'Riachuelo', 'Renner', 'C&A', 'Via', 'Lebes', 'Marisa',
    'Digio', 'Neon', 'Next', 'PicPay', 'Mercado Pago', 'Banco Pan', 'Pan',
    'Porto Seguro', 'SulAmérica', 'Bradesco Saúde', 'Unimed', 'Notre Dame',
    'Credicard', 'Hipercard', 'Elo', 'Visa', 'Mastercard', 'Alelo', 'Ticket',
    'Cooperativa', 'Sicoob', 'Sicredi', 'Banrisul', 'Caixa', 'BB', 'CEF'
].filter(Boolean);

/** Regex que casa qualquer um dos credores no texto (case insensitive, palavra inteira quando possível) */
function buildCredorRegex() {
    const escaped = CREDORES_CONHECIDOS
        .slice()
        .sort((a, b) => b.length - a.length)
        .map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return new RegExp('(?:' + escaped.join('|') + ')', 'gi');
}

let _credorRegex = null;
function getCredorRegex() {
    if (!_credorRegex) _credorRegex = buildCredorRegex();
    return _credorRegex;
}

/**
 * Encontra o último nome de credor conhecido que aparece em `texto` (antes da posição opcional endIdx).
 */
function findLastCredorBefore(texto, endIdx) {
    const str = endIdx != null ? texto.slice(0, endIdx) : texto;
    const re = getCredorRegex();
    let last = null;
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(str)) !== null) {
        last = m[0];
    }
    return last;
}

/**
 * Dado um bloco de linhas, escolhe a linha que mais parece nome do credor:
 * prioridade 1 = linha que contém um credor conhecido; 2 = linha que parece nome (sem números, tamanho razoável).
 */
function pickCredorNameFromBlock(blockLines) {
    const skipPatterns = [
        /^R\$\s*[\d.,\s]+$/i, /^De\s+R\$/i, /Ver\s+detalhes/i, /Negociar\s+agora/i, /Negociar/i,
        /^Pague\s+com\s+Pix/i, /At[eé]\s+\d+\s+vezes/i, /^Origem\s+/i,
        /Conta\s+atrasada/i, /D[ií]vida\s+negativada/i, /^\d+\s*%\s*de\s+desconto/i,
        /↓\s*\d+\s*%/i, /^Suas\s+ofertas/i, /^por\s*$/i, /^R\$\s*$/i,
        /^\d{2}\/\d{2}\/\d{4}$/, /^\d+$/
    ];
    const re = getCredorRegex();
    let bestByKnown = null;
    let bestByShape = null;
    for (let k = 0; k < blockLines.length; k++) {
        const ln = (blockLines[k] || '').trim();
        if (ln.length < 2 || ln.length > 70) continue;
        if (skipPatterns.some(p => p.test(ln))) continue;
        if (/^[\d.,\s]+$/.test(ln)) continue;
        re.lastIndex = 0;
        const m = ln.match(re);
        if (m && m[0]) {
            bestByKnown = m[0].trim();
            break;
        }
        if (!bestByShape && /^[A-Za-zÀ-ÿ\s&.-]+$/.test(ln) && ln.indexOf('R$') === -1)
            bestByShape = ln;
    }
    return bestByKnown || bestByShape || null;
}

/**
 * Extrai ofertas da página "Suas ofertas na Serasa" a partir do texto do PDF.
 * Retorna array de { nome, valorTotal, valorOriginal?, percentualDesconto?, tipo?, parcelas? }.
 */
function parseSerasaOfertas(text) {
    if (!text || typeof text !== 'string') return [];
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const offers = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        const matchDe = line.match(/De\s+R\$\s*([\d.,\s]+)\s+por/i);
        if (matchDe) {
            const valorOriginal = parseValor(matchDe[1]);
            let valorNegociado = null;
            let percentualDesconto = null;
            let tipo = null;
            let parcelas = null;
            let origem = null;

            const blockLines = [line];
            let j = i + 1;
            while (j < lines.length && j < i + 25) {
                const next = lines[j];
                if (j > i && next.match(/^De\s+R\$/i)) break;
                blockLines.push(next);

                if (!valorNegociado && next.match(/^R\$\s*[\d.,\s]+$/)) {
                    valorNegociado = parseValor(next);
                }
                const matchPct = next.match(/↓\s*(\d+)\s*%|(\d+)\s*%\s*de\s+desconto/i);
                if (matchPct) percentualDesconto = parseInt(matchPct[1] || matchPct[2], 10);
                const matchParcelas = next.match(/At[eé]\s+(\d+)\s+vezes/i);
                if (matchParcelas) parcelas = parseInt(matchParcelas[1], 10);
                if (next.match(/Conta\s+atrasada|D[ií]vida\s+negativada/i)) tipo = next;
                if (next.match(/^Origem\s+/i)) origem = next.replace(/^Origem\s+/i, '').trim();
                j++;
            }

            let nome = pickCredorNameFromBlock(blockLines);
            if (origem && nome) nome = nome + ' (' + origem + ')';
            else if (origem && !nome) nome = origem;

            if (!nome) {
                const textBeforeBlock = lines.slice(Math.max(0, i - 5), i).join(' ');
                nome = findLastCredorBefore(textBeforeBlock) || null;
            }

            const valorTotal = valorNegociado != null ? valorNegociado : valorOriginal;
            if (nome || valorTotal != null) {
                offers.push({
                    nome: nome || 'Credor',
                    valorTotal: valorTotal != null ? valorTotal : 0,
                    valorOriginal: valorOriginal != null ? valorOriginal : undefined,
                    percentualDesconto: percentualDesconto != null ? percentualDesconto : undefined,
                    tipo: tipo || undefined,
                    parcelas: parcelas != null ? parcelas : undefined
                });
            }
            i = j;
            continue;
        }
        i++;
    }

    // Fallback: PDF com layout diferente — procurar cada "R$ X.XXX,XX" e associar ao último credor que aparece ANTES no texto
    if (offers.length === 0) {
        const reValor = /R\$\s*[\d.]{1,3}(?:\.\d{3})*,\d{2}/g;
        let m;
        const pares = [];
        while ((m = reValor.exec(text)) !== null) {
            const valor = parseValor(m[0]);
            if (valor == null || valor <= 0) continue;
            const textoAntes = text.slice(Math.max(0, m.index - 400), m.index);
            const credor = findLastCredorBefore(textoAntes);
            pares.push({ nome: credor, valor });
        }
        pares.forEach((p, idx) => {
            offers.push({
                nome: p.nome || `Credor ${idx + 1}`,
                valorTotal: p.valor,
                valorOriginal: undefined,
                percentualDesconto: undefined,
                tipo: undefined,
                parcelas: undefined
            });
        });
    }

    return offers;
}

module.exports = { parseSerasaOfertas, parseValor, CREDORES_CONHECIDOS, findLastCredorBefore };
