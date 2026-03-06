# Atualizações da Gestão Financeira (Backend)

## Resumo das alterações

### 1. Meta sincronizada com receitas
- **total_income_earned** (GET /api/finance/goals) agora inclui:
  - Transações INCOME com status PAID
  - Recibos (documentos tipo=recibo) – soma dos itens
  - Trabalhos (finance_king_sync.data.trabalhos) – valores recebidos

### 2. Saldo disponível e patrimônio
- **accountBalance** / **saldoDisponivel** consideram:
  - Saldo das contas (finance_accounts) quando existem
  - Ou: (receitas pagas acumuladas - despesas pagas) + trabajos (valor_recebido)
- **Recibos**: só entram no patrimônio quando o item tiver `valor_recebido` (o que já entrou de fato). Itens sem `valor_recebido` não são contados, para evitar incluir valores que o cliente ainda não pagou em "Total recebido" e "Patrimônio".

### 3. Balanço Geral – campos adicionados
O dashboard e o relatório resumido (GET /api/finance/dashboard, GET /api/finance/reports/summary) retornam:
- `totalRecebido` – receitas pagas (inclui recibos do período)
- `totalPago` – despesas pagas
- `saldoDisponivel` – patrimônio disponível
- `pendenciasReceber` – total a receber
- `pendenciasPagar` – falta pagar (este mês + meses anteriores)

### 4. Evolução mensal
- Novo campo **evolucaoMensal**: array com ~14 meses, cada item com:
  - `month`, `year`, `monthLabel`
  - `income`, `expense`, `balance`
- Inclui transações + recibos por mês

### 5. Média mensal (últimos 12 meses)
- Novo campo **mediaMensal12**: `{ mediaReceitas, mediaDespesas }`
- Calculado a partir da evolução mensal (inclui recibos)

### 6. Estatísticas gerais
- `totalTransactions` – total de transações no período
- `receitasCount` – quantidade de receitas
- `despesasCount` – quantidade de despesas

### 7. Falta pagar – meses anteriores
- `pendingExpensePreviousMonths` – soma de despesas PENDING com `transaction_date < início do mês atual`
- Para listar transações: `GET /api/finance/transactions?status=PENDING&dateTo=YYYY-MM-DD` (último dia do mês anterior)
- Para pagar: `PUT /api/finance/transactions/:id` com `status: 'PAID'`

### 8. Relatório resumido e perfil
- GET /api/finance/reports/summary aceita `profile_id` na query

---

## Frontend – pendências de UI

O frontend do dashboard financeiro está em outro repositório. Ajustes recomendados:

1. **Botão "Pagar"** – alinhar dentro do card (evitar que saia da borda)
2. **Layout mobile** – padronizar alinhamento de textos e botões
3. **Balanço Geral** – usar os campos `totalRecebido`, `totalPago`, `saldoDisponivel`, `pendenciasReceber`, `pendenciasPagar`
4. **Evolução mensal** – exibir `evolucaoMensal` com `income`, `expense`, `balance`
5. **Média mensal** – exibir `mediaMensal12.mediaReceitas` e `mediaMensal12.mediaDespesas`
6. **Meta** – usar `total_income_earned` de GET /api/finance/goals para o progresso

---

## Estrutura de trabalhos (king sync)

Para Meta, Patrimônio e Saldo: conta-se **apenas** o que foi recebido (não o total do serviço).
- `valor` – valor total do trabalho (não entra)
- `valor_recebido` – valor já recebido (se existir)
- `pagamentos[]` – array de entradas recebidas: `[{ valor, data }]` — soma dos valores conta como recebido

## Recibos (documentos tipo=recibo) – itens_json

Para evitar que "Falta receber" seja contado como "Total recebido" ou "Patrimônio":
- Só conta como recebido quando o item tiver `valor_recebido` (o que efetivamente entrou).
- Itens sem `valor_recebido` não são incluídos (não inflam saldo/patrimônio).
