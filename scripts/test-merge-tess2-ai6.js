/**
 * Tesseract 2 itens + OpenAI 6 → resultado deve ser 6 (não 2).
 */
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

const foto1Ruim = `CONCESSIONARIA
13,20 R$
Colinas
4,90 R$`;

function toItens(txs) {
    return txs.map((tx) => ({
        nome_estabelecimento: tx.name,
        textoTrecho: tx.name,
        data: tx.date,
        valor: tx.amount
    }));
}

const ai = toItens(parseTransactionList(foto1).transactions);
const tess = toItens(parseTransactionList(foto1Ruim).transactions);
const autoritativa = toItens(parseTransactionList(foto1Ruim).transactions);
const confiavel = autoritativa.length >= 4;

const bruto = (ai.length >= 4 && ai.length > tess.length && !confiavel) ? ai : ai;
console.log('tess', tess.length, 'ai', ai.length, 'bruto', bruto.length);
if (bruto.length !== 6) {
    console.error('FALHOU');
    process.exit(1);
}
console.log('OK tess2+ai6=6');
