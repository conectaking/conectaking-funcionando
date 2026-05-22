const { parseReceipt, parseTransactionList } = require('../utils/receipt-parser');

const ocr = `Consulte o extrato de conta para ver as informações finais da transação.
BBQ BRUNÃO
21/05
105,00 R$
Ponto das variedades
21/05
93,80 R$
Pitcho Pizzaria
20/05
120,60 R$
Shell
20/05
115,76 R$
E:xo[Sp]
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
11,00 R$`;

const r = parseReceipt(ocr);
const t = parseTransactionList(ocr);
console.log('parseReceipt txs:', r.transactions && r.transactions.length);
console.log('parseTransactionList txs:', t.transactions.length);
t.transactions.forEach((tx, k) => console.log((k + 1) + '.', tx.name, tx.date, tx.amount));
if (t.transactions.length !== 8) process.exit(1);
