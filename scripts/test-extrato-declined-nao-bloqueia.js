/**
 * OCR ruim + "Recusada" no texto não pode zerar extrato com vários valores.
 */
const { parseReceipt } = require('../utils/receipt-parser');

const ocrRuimComRecusada = `Nenê Cardoso Pinha
23/05
13,20 R$
Recusada
VIA COLINAS
23/05
8,80 R$
EixoSp
23/05
11,20 R$
P11
23/05
8,60 R$
Recusada
P3
23/05
18,30 R$`;

const r = parseReceipt(ocrRuimComRecusada);
const n = (r.transactions || []).length;
console.log('parseReceipt status:', r.status, 'itens:', n);
if (r.status === 'DECLINED') {
    console.error('FALHOU: extrato não pode virar DECLINED inteiro');
    process.exit(1);
}
if (n < 2) {
    console.error('FALHOU: esperava pelo menos 2 itens, obteve', n);
    process.exit(1);
}

console.log('OK');
