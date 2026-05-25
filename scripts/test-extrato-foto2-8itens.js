/**
 * Foto pedágios: 9 linhas, 1 P11 recusada → 8 itens.
 */
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

function contarPorChave(txs) {
    const m = new Map();
    for (const tx of txs) {
        const k = `${(tx.name || '').toLowerCase()}|${tx.date || ''}|${Math.round((tx.amount || 0) * 100)}`;
        m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
}

const r = parseTransactionList(foto2);
const n = r.transactions.length;
console.log('itens parser:', n);
r.transactions.forEach((tx, i) => console.log(' ', i + 1, tx.name, tx.amount));

const entrevias = contarPorChave(r.transactions).get('entrevias s/a|23/05|910') || 0;
const p3 = contarPorChave(r.transactions).get('p3|23/05|1830') || 0;
if (n !== 8) {
    console.error('FALHOU: esperado 8, obteve', n);
    process.exit(1);
}
if (entrevias !== 2 || p3 !== 2) {
    console.error('FALHOU: Entrevias ou P3 duplicados legítimos', entrevias, p3);
    process.exit(1);
}
console.log('OK foto2 = 8 (2x Entrevias, 2x P3)');
