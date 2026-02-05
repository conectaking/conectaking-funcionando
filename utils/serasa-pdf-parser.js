/**
 * Parser de texto extraído de relatório PDF "Suas ofertas na Serasa".
 * Estrutura esperada (por oferta): contratado, valor original, valor negociado, % desconto, tipo, parcelas.
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

        // Bloco começa com "De R$ X por" (valor original)
        const matchDe = line.match(/De\s+R\$\s*([\d.,\s]+)\s+por/i);
        if (matchDe) {
            const valorOriginal = parseValor(matchDe[1]);
            let valorNegociado = null;
            let percentualDesconto = null;
            let nome = null;
            let tipo = null;
            let parcelas = null;
            let origem = null;

            // Próximas linhas: valor negociado (R$ X), depois possivelmente credor, tipo, desconto
            const blockLines = [line];
            let j = i + 1;
            while (j < lines.length && j < i + 25) {
                const next = lines[j];
                // Parar em próximo bloco "De R$"
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

            // Credor: linha que não é valor, não é "Ver detalhes", "Negociar", "PIX", "Até X vezes", "Origem", tipo
            const skipPatterns = [
                /^R\$\s*[\d.,\s]+$/i, /^De\s+R\$/i, /Ver\s+detalhes/i, /Negociar/i, /^Pague\s+com\s+Pix/i,
                /At[eé]\s+\d+\s+vezes/i, /^Origem\s+/i, /Conta\s+atrasada/i, /D[ií]vida\s+negativada/i,
                /^\d+\s*%\s*de\s+desconto/i, /↓\s*\d+\s*%/i, /^Suas\s+ofertas/i
            ];
            for (let k = 0; k < blockLines.length; k++) {
                const ln = blockLines[k];
                if (skipPatterns.some(p => p.test(ln))) continue;
                if (ln.length > 2 && ln.length < 80 && !/^\d+[,.]?\d*$/.test(ln)) {
                    nome = ln;
                    break;
                }
            }
            if (origem && nome) nome = nome + ' (' + origem + ')';
            else if (origem && !nome) nome = origem;

            // Usar valor negociado como valor total a pagar; se não achar, usar valor original
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

    // Fallback: procurar pares "R$ X" que pareçam valor negociado sem "De R$" explícito (PDF com layout diferente)
    if (offers.length === 0) {
        const allR$ = text.match(/R\$\s*[\d.]{1,3}(?:\.\d{3})*,\d{2}/g);
        const credorNames = text.match(/(?:Santander|Nubank|Ita[uú]|Bradesco|Banco do Brasil|Inter|Recovery|Ipanema|Fort Brasil|C[eé]tam|Creditas|Original|PagSeguro|C6|BTG|XP|Safra)/gi);
        if (allR$ && allR$.length >= 1) {
            const uniq = [...new Set(credorNames || [])];
            allR$.slice(0, 20).forEach((r, idx) => {
                const v = parseValor(r);
                if (v != null && v > 0) {
                    offers.push({
                        nome: uniq[idx] || `Credor ${idx + 1}`,
                        valorTotal: v,
                        valorOriginal: undefined,
                        percentualDesconto: undefined,
                        tipo: undefined,
                        parcelas: undefined
                    });
                }
            });
        }
    }

    return offers;
}

module.exports = { parseSerasaOfertas, parseValor };
