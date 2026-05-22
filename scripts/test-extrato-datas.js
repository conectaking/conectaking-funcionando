const { parseTransactionList } = require('../utils/receipt-parser');

function assertAllDates(label, ocr) {
    const t = parseTransactionList(ocr);
    const missing = t.transactions.filter((x) => !x.date);
    if (missing.length) {
        console.error(label, '— sem data:', missing.map((x) => x.name));
        process.exit(1);
    }
    console.log(label, 'OK', t.transactions.length, 'itens');
}

assertAllDates('layout padrão', `Pedágio de Rio das Pedras
20/05
11,00 R$
AUTO POSTO CENTRAL
DOS
144,44 R$
Auto Peças Original de
Barueri
35,00 R$`);

assertAllDates('data só no fim (dominante)', `Pedágio de Rio das Pedras
11,00 R$
AUTO POSTO CENTRAL
DOS
144,44 R$
Auto Peças Original de
Barueri
35,00 R$
20/05`);

assertAllDates('data abaixo do valor', `AUTO POSTO CENTRAL
DOS
144,44 R$
20/05`);

console.log('Todos os testes de data passaram.');
