const { parseTransactionList } = require('../utils/receipt-parser');

const foto2 = `VIA COLINAS
23/05
8,80 R$
EixoSp
23/05
11,20 R$
E:xo[Sp]
23/05
6,70 R$
P11
23/05
8,60 R$
P11
23/05
8,60 R$
Recusada
P3
23/05
18,30 R$
Entrevias S/A
23/05
9,10 R$
Entrevias S/A
23/05
9,10 R$
P3
23/05
18,30 R$`;

function toItens(txs) {
    return txs.map((tx) => ({
        nome_estabelecimento: tx.name,
        data: tx.date,
        valor: tx.amount
    }));
}

const tess = toItens(parseTransactionList(foto2).transactions);
const ai = tess.slice(0, 5);

function itemKey(it) {
    return `${(it.nome_estabelecimento || '').toLowerCase()}|${it.data || ''}|${Math.round(it.valor * 100)}`;
}

function mesclar(t, a) {
    if (t.length > a.length) {
        if (t.length >= 4) return t;
    }
    return t;
}

const m = mesclar(tess, ai);
console.log('tess', tess.length, 'ai', ai.length, 'merge', m.length);
if (m.length !== 8) process.exit(1);
console.log('OK tess8 ai5 → 8');
