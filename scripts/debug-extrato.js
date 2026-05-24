const fs = require('fs');
const { parseTransactionList } = require('../utils/receipt-parser');

// Copy parseTransactionList logic partially to debug - or monkey patch dedupe

const foto1 = fs.readFileSync(__dirname + '/test-extrato-user-photos.js', 'utf8');
// just inline
const ocr = `CONCESSIONARIA ROTA SO
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

const lines = ocr.replace(/\r/g, '').split(/\n/).map(l => l.trim()).filter(Boolean);
console.log('lines:', lines.length);
lines.forEach((l, i) => console.log(i, JSON.stringify(l)));

const t = parseTransactionList(ocr);
console.log('\nresult:', t.transactions.length);
t.transactions.forEach((tx, k) => console.log(k + 1, tx.name, tx.amount));

// Test without dedupe - temporarily patch
const orig = require('../utils/receipt-parser');
// Can't easily patch. Let's check if 11,00 and 141,78 value lines exist

const valueLines = lines.filter(l => /^(\d+),(\d{2})\s*R?\$?\s*$/i.test(l));
console.log('\nvalue-only lines:', valueLines);
