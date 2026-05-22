const { parseReceipt, parseTransactionList } = require('../utils/receipt-parser');

const ocr8 = `E:xo[Sp]
20/05
6,70 R$
EixoSp
20/05
11,20 R$
VIA COLINAS
20/05
8,80 R$
Pedágio de Rio das Pedras
20/05
11,00 R$
CONCESSIONARIA
RODOVIA
20/05
4,90 R$
CCR ViaOeste
20/05
9,80 R$
AUTO POSTO CENTRAL
DOS
20/05
144,44 R$
Auto Peças Original de
Barueri
20/05
35,00 R$`;

const t = parseTransactionList(ocr8);
console.log('itens:', t.transactions.length);
t.transactions.forEach((tx, k) => console.log((k + 1) + '.', tx.name, tx.date, tx.amount));
if (t.transactions.length !== 8) process.exit(1);
const esperado = [
    ['EixoSp', 6.7],
    ['EixoSp', 11.2],
    ['VIA COLINAS', 8.8],
    ['Pedágio de Rio das Pedras', 11],
    ['CONCESSIONARIA RODOVIA', 4.9],
    ['CCR ViaOeste', 9.8],
    ['AUTO POSTO CENTRAL DOS', 144.44],
    ['Auto Peças Original de Barueri', 35]
];
for (let i = 0; i < esperado.length; i++) {
    const [nomeEsp, valEsp] = esperado[i];
    const tx = t.transactions[i];
    const okNome = (tx.name || '').toLowerCase().includes(nomeEsp.toLowerCase().split(' ')[0]);
    const okVal = Math.abs((tx.amount || 0) - valEsp) < 0.02;
    if (!okNome || !okVal) {
        console.error('Falha linha', i + 1, 'esperado', nomeEsp, valEsp, 'obteve', tx.name, tx.amount);
        process.exit(1);
    }
}

const ocrQuebrado = `CONCESSIONARIA
4,90
RODOVIA
9,80
AUTO POSTO CENTRAL
DOS
144,44
Auto Peças Original de
Barueri
35,00`;
const t2 = parseTransactionList(ocrQuebrado);
if (t2.transactions.length !== 4) {
    console.error('ocrQuebrado itens:', t2.transactions.length);
    t2.transactions.forEach((tx, k) => console.log((k + 1) + '.', tx.name, tx.amount));
    process.exit(1);
}
console.log('OK 8 itens + layout quebrado');
