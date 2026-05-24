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

function test(nome, ocr, esperado) {
    const t = parseTransactionList(ocr);
    console.log('---', nome, 'parse:', t.transactions.length, 'esperado:', esperado);
    t.transactions.forEach((tx, k) => console.log(' ', k + 1, tx.name, tx.date, tx.amount));
    if (t.transactions.length !== esperado) {
        console.error('FALHOU', nome);
        process.exit(1);
    }
}

test('foto1', foto1, 6);
test('foto2', foto2, 8);
