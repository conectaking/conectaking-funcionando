/**
 * Garante que linha "Recusada" no extrato NÃO zera a leitura inteira.
 */
const { parseReceipt } = require('../utils/receipt-parser');

const extratoComRecusada = `CONCESSIONARIA ROTA SO
23/05
13,20 R$
Churrascaria Formigão
23/05
28,00 R$
Churrascaria Formigão
23/05
28,00 R$
Recusada
AUTO POSTO PARQUE DE P
23/05
141,78 R$`;

const r = parseReceipt(extratoComRecusada);
const n = (r.transactions || []).length;
console.log('status:', r.status, 'itens:', n);
if (r.status === 'DECLINED' || n < 2) {
    console.error('FALHOU: extrato com Recusada não deve bloquear lista');
    process.exit(1);
}
console.log('OK — Recusada não bloqueia extrato');
