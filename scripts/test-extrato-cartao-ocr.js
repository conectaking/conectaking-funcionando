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

const eixo = t.transactions.find(tx => /eixosp/i.test(tx.name) && tx.amount > 10);
if (!eixo || Math.abs(eixo.amount - 11.2) > 0.01) {
    console.error('EixoSp deve ser 11,20, obteve', eixo && eixo.amount);
    process.exit(1);
}

const dupOcr = ocr + '\nBBQ BRUNÃO 105,00 R$\nPonto das variedades 93,80 R$';
const dup = parseTransactionList(dupOcr);
if (dup.transactions.length !== 8) {
    console.error('Duplicatas: esperado 8, obteve', dup.transactions.length);
    process.exit(1);
}
console.log('OK: sem duplicar, EixoSp 11,20');
