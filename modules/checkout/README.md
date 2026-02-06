# Módulo Checkout (KingForms – PagBank)

Módulo **isolado** de checkout para formulários King Forms. Toda a lógica de pagamento (PagBank) fica aqui; o core não depende do PagBank.

## Estrutura

- `checkout.routes.js` – rotas API (config, create, test-connection)
- `webhook.routes.js` – POST /api/webhooks/pagbank
- `checkout.controller.js` – handlers
- `checkout.service.js` – contrato (getCheckoutConfig, createCharge, processWebhook)
- `checkout.validators.js` – validação de entrada
- `checkout.types.js` – constantes e labels KingForms
- `pagbank.client.js` – wrapper da API PagBank (stub; integrar com API real)

## Rotas

| Método | Rota | Quem | Descrição |
|--------|------|------|-----------|
| GET | /api/checkout/page?submissionId=... | Público | Dados da submissão para a página de checkout |
| POST | /api/checkout/create | Público | Criar cobrança Pix/cartão |
| GET | /api/checkout/config/:itemId | Admin | Obter config do formulário |
| PUT | /api/checkout/config/:itemId | Admin | Salvar config (toggle, preço, PagBank) |
| POST | /api/checkout/test-connection | Admin | Testar credenciais PagBank |
| POST | /api/webhooks/pagbank | PagBank | Notificação de pagamento (aceita JSON com assinatura ou urlencoded legacy com notificationCode) |

## Integração com o core

- O core (formulário público) apenas:
  - Lê `checkout_enabled` e `pay_button_label` do formulário.
  - Ao submeter com checkout ativo: salva resposta com `payment_status = PENDING_PAYMENT` e redireciona para a página de checkout com `submissionId`.
- Nenhuma lógica PagBank no core; uso apenas do `CheckoutService` via API (ou chamada interna se necessário).

## Migrations

- `155_add_checkout_module_tables.sql` – tabelas e campos do checkout (form_checkout_configs, campos em digital_form_responses e digital_form_items).

## Notificação de pagamento (dois fluxos)

- **Notificação de transação** (Vendas → Integrações): POST `application/x-www-form-urlencoded` com `notificationCode` e `notificationType=transaction`. Não tem secret; o código consulta a API do PagBank (GET .../v3/transactions/notifications/{code}) com `PAGBANK_EMAIL` e `PAGBANK_TOKEN` e confirma status/referência antes de atualizar.
- **Webhook moderno** (dev.pagbank.com.br): POST JSON com assinatura; exige `PAGBANK_WEBHOOK_SECRET`.

## Setup manual

Ver [SETUP_CHECKOUT_PAGBANK.md](../../SETUP_CHECKOUT_PAGBANK.md) na raiz do projeto.
