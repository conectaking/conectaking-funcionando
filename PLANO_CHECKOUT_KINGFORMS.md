# Análise do prompt e plano de implementação – Checkout KingForms (PagBank)

## 1. O prompt faz sentido?

**Sim.** O prompt é coerente com arquitetura modular, separação de responsabilidades e com o que já existe no projeto (módulos em `modules/`, rotas em `routes/` e `server.js`). Resumo:

| Aspecto | Avaliação |
|--------|-----------|
| **Módulo isolado** | Correto. Evita misturar lógica PagBank no core (formulários, listas, check-in). |
| **Interface por contrato** | CheckoutService como única porta entre core e checkout é adequado. |
| **Rebranding "KingForms"** | Consistente com o resto do produto (King Forms já citado em KING_FORMS_MELHORIAS_COMPLETAS.md). |
| **Check-in vs Confirmação de Presença** | Renomear para "Check-in" e abas Pagos/Pendentes faz sentido para eventos com pagamento. |
| **Split 10% plataforma / 90% vendedor** | Alinhado ao que PagBank permite (split de pagamento). |
| **Webhook + idempotência** | Necessário para não duplicar confirmação de pagamento. |
| **Checkout page premium** | Boa UX: página dedicada com Pix + cartão, status e rodapé KingForms. |

**Ajustes ao nosso codebase:**

- No prompt fala-se em **"forms"** e **"form_submissions"**. Aqui temos:
  - **Formulário** = `profile_items` (item_type = `digital_form`) + `digital_form_items`.
  - **Submissões** = `digital_form_responses` (não existe tabela `form_submissions`).
- Por isso:
  - **form_id** do prompt = `profile_item_id` (item do tipo digital_form).
  - Campos de pagamento e status serão adicionados em **digital_form_responses** (e opcionalmente em `digital_form_items` para `checkout_enabled`, `price_cents`, `pay_button_label`).
  - Credenciais PagBank ficam em **form_checkout_configs** com `profile_item_id` (FK para o “formulário”).

---

## 2. Mapeamento prompt → codebase

| Prompt | No projeto |
|--------|-------------|
| forms.checkout_enabled, price_cents, pay_button_label | `digital_form_items` (novos campos) ou só em `form_checkout_configs` |
| form_checkout_configs (pagbank_seller_id, token) | Nova tabela `form_checkout_configs(profile_item_id UNIQUE, ...)` |
| form_submissions.payment_status, paid_at, etc. | `digital_form_responses` (novos campos) |
| Check-in (Inscritos, Não Chegou, Chegou, Pagos, Pendentes) | `formPageEdit.js`, `responsesList.html`, `guestListEdit*` – abas e labels |
| Botão final "Pagamento" / redirect checkout | `views/digitalForm.ejs` + rota pública `/:slug/form/:itemId/submit` |
| Rotas GET/POST checkout, webhook | Novo módulo `modules/checkout/` |

---

## 3. Princípio arquitetural (respeitado)

- **Módulo:** `modules/checkout/`
  - Rotas, controller, service, cliente PagBank, handler de webhook, validações.
  - UI da página de checkout (EJS ou estática) e UI admin (aba Checkout no painel) dentro ou referenciada pelo módulo.
- **Core (King Forms):**
  - Apenas: ler `checkout_enabled` e `pay_button_label`; ao submeter, se checkout ativo, salvar resposta com status pendente e redirecionar para `/forms/:slug/checkout?submissionId=...`.
  - Não contém lógica PagBank, criação de cobrança ou processamento de webhook.
- **Contrato:** Um único ponto de integração, por exemplo `CheckoutService.createCharge(submissionId, method)` / `CheckoutService.getSubmissionStatus(submissionId)`, chamado pelo core ou pela página de checkout.

---

## 4. Entregas planejadas (em ordem sugerida)

1. **Migrations**  
   - `form_checkout_configs` (profile_item_id, pagbank_seller_id, pagbank_access_token_encrypted, etc.).  
   - Campos em `digital_form_responses`: payment_status, paid_at, payment_provider, payment_reference_id, payment_order_id, payment_charge_id, checked_in.  
   - Campos em `digital_form_items`: checkout_enabled, price_cents, pay_button_label (ou só em config – conforme optado).  
   - Opcional: `checkout_webhook_logs`.

2. **Módulo `modules/checkout/`**  
   - Estrutura: `checkout.routes.js`, `checkout.controller.js`, `checkout.service.js`, `pagbank.client.js`, `checkout.validators.js`, `checkout.types.js`.  
   - Rotas:  
     - GET `/forms/:slug/checkout?submissionId=...` (página de checkout).  
     - POST `/api/checkout/create` (criar cobrança Pix/cartão).  
     - POST `/api/checkout/test-connection`.  
     - POST `/api/webhooks/pagbank`.  
   - Montar no `server.js` sem alterar rotas do King Forms (apenas novas rotas).

3. **Core (mínimo)**  
   - Em `digitalForm.ejs` (ou lógica de submit): se `checkout_enabled`, botão "Pagamento" (verde), ao enviar: salvar com status pendente e redirect para checkout.  
   - Em `formPageEdit.js` / painel: aba "Checkout" abaixo de "Check-in" (campos checkout_enabled, price_cents, pay_button_label, seller_id, token, "Testar conexão").  
   - Nenhuma lógica PagBank no core.

4. **Rebranding + Check-in**  
   - Textos "KingForms", "Pagamento", "Pagamento pendente/confirmado", "Pague com Pix/cartão", rodapé "KingForms by ConectaKing".  
   - Renomear "Confirmação de Presença" → "Check-in"; abas Inscritos, Não Chegou, Chegou, **Pagos**, **Pendentes** (sempre visíveis, vazias se não houver checkout).

5. **Bug de refresh no Check-in**  
   - Revisar estado inicial, tab default e conditional rendering em `formPageEdit.js` / `responsesList.html` para não exibir "enviar alguma coisa" indevido.

6. **Página de checkout premium**  
   - Layout: top bar com logo, card 2 colunas (resumo + Pix/cartão), rodapé KingForms, estados loading/erro/pendente/confirmado, link "Não tem conta no PagBank? Crie gratuitamente".

7. **Dashboard admin Checkout**  
   - Aba ou subaba no painel: totais (total pago, qtde pagos/pendentes, taxa 10%), tabela (nome, email/telefone, status, data, valor), filtros e export CSV.

8. **Documentação manual**  
   - `SETUP_CHECKOUT_PAGBANK.md`: conta PagBank, onde pegar token, webhook (URL, eventos, secret), ENV, testes (submission pendente, Pix, webhook, status PAID), troubleshooting (webhook não chega, CORS, assinatura, split).  
   - Checklist: o que é manual vs o que o código já faz.

9. **Testes**  
   - Pelo menos: idempotência do webhook e um teste do service de criação de cobrança (mock ou sandbox).

---

## 5. Garantias (conforme prompt)

- Com **checkout_enabled = false**, o fluxo atual do King Forms permanece inalterado.  
- Alterações no módulo checkout não quebram o builder nem as listas (formPageEdit, guestList, responses).  
- Integração core ↔ checkout apenas via contrato (ex.: CheckoutService); sem require direto de SDK PagBank no core.

---

## 6. Próximos passos imediatos

1. Criar migration `155_add_checkout_module_tables.sql`.  
2. Criar estrutura em `modules/checkout/` (routes, controller, service, client stub).  
3. Registrar rotas do checkout no `server.js`.  
4. Escrever `SETUP_CHECKOUT_PAGBANK.md` (passo a passo manual).  
5. Implementar alterações mínimas no core (botão Pagamento + redirect) e aba Checkout no painel.  
6. Implementar página de checkout e webhook.  
7. Rebranding + Check-in + correção do bug de refresh.  
8. Dashboard admin e testes.

Este documento serve como referência para não afetar o King Forms e manter o módulo isolado.
