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
console.log('OK 8 itens');
