/**
 * OpenAI 8 itens (com recusados duplicados) + Tesseract 6 → merge deve dar 6.
 */
const { parseTransactionList } = require('../utils/receipt-parser');

const foto1 = `CONCESSIONARIA ROTA SO
23/05
13,20 R$
Colinas Toll plaza
23/05
4,90 R$
Churrascaria Formigão
23/05
28,00 R$
Churrascaria Formigão
23/05
28,00 R$
Recusada
Pedágio de Rio das Pedras
23/05
11,00 R$
Habib's
23/05
103,80 R$
Habib's
23/05
103,80 R$
Recusada
AUTO POSTO PARQUE DE P
23/05
141,78 R$`;

function itemKeyOcrMerge(item) {
    const nome = ((item.nome_estabelecimento || item.textoTrecho || '') + '').trim().toLowerCase();
    const data = ((item.data || '') + '').trim();
    const valor = Math.round((Number(item.valor) || 0) * 100);
    return `${nome}|${data}|${valor}`;
}

function filtrarItensNaoRecusados(itens) {
    return (itens || []).filter((s) => {
        if (!s) return false;
        if (s.status === 'DECLINED' || s.recusada || s.recusado) return false;
        const desc = ((s.nome_estabelecimento || '') + ' ' + (s.textoTrecho || '')).toString();
        return !/recusad|negad|cancelad/i.test(desc);
    });
}

function mesclarLeiturasParalelas(tessList, aiList) {
    const t = filtrarItensNaoRecusados(tessList);
    const a = filtrarItensNaoRecusados(aiList);
    if (t.length === 0) return a;
    if (a.length === 0) return t;
    if (a.length > t.length) {
        const keysT = new Set(t.map(itemKeyOcrMerge));
        return t.concat(a.filter((it) => !keysT.has(itemKeyOcrMerge(it))));
    }
    return t;
}

function toItens(transactions) {
    return transactions.map((tx) => ({
        nome_estabelecimento: tx.name,
        textoTrecho: tx.name,
        data: tx.date,
        valor: tx.amount
    }));
}

const tess = toItens(parseTransactionList(foto1).transactions);
const ai = tess.concat([
    { nome_estabelecimento: 'Churrascaria Formigão', textoTrecho: 'Churrascaria Formigão', data: '23/05', valor: 28 },
    { nome_estabelecimento: "Habib's", textoTrecho: "Habib's", data: '23/05', valor: 103.8 }
]);

const merged = mesclarLeiturasParalelas(tess, ai);
console.log('tess', tess.length, 'ai', ai.length, 'merged', merged.length);
if (merged.length !== 6) {
    console.error('FALHOU: esperado 6, obteve', merged.length);
    process.exit(1);
}
console.log('OK merge 6 itens sem recusados');
