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
const t = parseTransactionList(foto2);
console.log('foto2:', t.transactions.length);
t.transactions.forEach((tx,k)=>console.log(k+1, tx.name, tx.amount));
