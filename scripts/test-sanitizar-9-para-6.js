/**
 * Simula IA com 9 itens (6 + 2 recusados duplicados + 1 fantasma) → sanitizar deve dar 6.
 */
const { parseTransactionList, chavesRecusadasFromOcrText } = require('../utils/receipt-parser');

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

function toItens(txs) {
    return txs.map((tx) => ({
        nome_estabelecimento: tx.name,
        textoTrecho: tx.name,
        data: tx.date,
        valor: tx.amount
    }));
}

const tess = toItens(parseTransactionList(foto1).transactions);
const ai = tess.concat([
    { nome_estabelecimento: 'Churrascaria Formigão', textoTrecho: 'Churrascaria Formigão', data: '23/05', valor: 28 },
    { nome_estabelecimento: "Habib's", textoTrecho: "Habib's", data: '23/05', valor: 103.8 },
    { nome_estabelecimento: 'ROTA SO', textoTrecho: 'ROTA SO', data: '23/05', valor: 13.2 }
]);

let out = ai;
if (out.length > tess.length) out = tess;

const seen = new Set();
const dedup = [];
for (const it of out) {
    const k = `${(it.nome_estabelecimento || '').toLowerCase()}|${it.data || ''}|${Math.round(it.valor * 100)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    dedup.push(it);
}
out = dedup.length < out.length && dedup.length >= 4 ? dedup : out;

console.log('ai', ai.length, 'final', out.length);
if (out.length !== 6) {
    out.forEach((x, i) => console.log(i + 1, x.nome_estabelecimento, x.valor));
    process.exit(1);
}
console.log('OK 9 → 6');
