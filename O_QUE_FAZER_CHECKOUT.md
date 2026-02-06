# O que fazer para o Checkout KingForms (PagBank) funcionar

As variáveis do checkout já foram adicionadas no seu `.env`. Siga os passos abaixo.

---

## 1. Preencher as variáveis no `.env`

Abra o arquivo **`.env`** na raiz do projeto (`D:\CONECTA 2026\conectaking-funcionando-1\.env`) e ajuste:

| Variável | O que fazer |
|----------|-------------|
| **PAGBANK_WEBHOOK_SECRET** | Troque `preencher_secret_do_painel_pagbank` pelo **secret** que o PagBank mostra ao cadastrar o webhook (painel PagBank → Webhooks / Notificações). |
| **PAGBANK_WEBHOOK_BASE_URL** | Em **produção**, coloque a URL pública do seu backend (ex.: `https://conectaking-api.onrender.com`). Em desenvolvimento local pode deixar `http://localhost:5000`. |
| **PUBLIC_APP_URL** | Mesma URL do backend que as pessoas acessam (ex.: `https://conectaking-api.onrender.com`). Usada no link “Abrir página de checkout” no painel. Em local pode deixar `http://localhost:5000`. |
| **PAGBANK_API_BASE_URL** | Para **testes** deixe `https://sandbox.api.pagseguro.com`. Em **produção** use a URL da API PagBank conforme a documentação oficial. |

Opcionais (pode deixar comentados):

- **PAGBANK_PLATFORM_ACCOUNT_ID**: só se quiser receber 10% do valor na sua conta (split). Se não definir, 100% vai para o vendedor do formulário.
- **CHECKOUT_ENCRYPTION_KEY**: chave para criptografar o token no banco. Se não definir, o sistema usa o `JWT_SECRET` que já está no `.env`.

---

## 2. Rodar as migrations no banco (uma vez)

Execute no seu banco PostgreSQL, **nesta ordem**:

1. **Migration 155** – estrutura do checkout:  
   Arquivo: `migrations/155_add_checkout_module_tables.sql`
2. **Migration 156** – personalização da página (logo, cor, título, rodapé):  
   Arquivo: `migrations/156_add_checkout_page_personalization.sql`

Se o projeto já tiver um script ou processo que aplica migrations ao subir, basta garantir que essas duas sejam executadas.

---

## 3. Configurar o webhook no painel PagBank

1. Acesse o **painel do PagBank** (conta vendedor / API).
2. Vá em **Webhooks** ou **Notificações**.
3. Cadastre:
   - **URL:** `https://SEU_DOMINIO/api/webhooks/pagbank`  
     (ex.: `https://conectaking-api.onrender.com/api/webhooks/pagbank`)
   - **Eventos:** pagamento aprovado / pago / recusado / cancelado (conforme opções do painel).
   - **Secret:** gere ou copie o valor e coloque no `.env` em **PAGBANK_WEBHOOK_SECRET**.

---

## 4. Em cada formulário que quiser cobrar

1. No painel, abra o formulário e vá em **Checkout** (sidebar ou aba).
2. Ou acesse: **Checkout Config** → `checkoutConfig.html?itemId=ID_DO_FORMULARIO`.
3. Ative **“Pagamento”** (checkout).
4. Preencha **valor (R$)**, **Seller ID** e **Token** do PagBank (credenciais do vendedor que recebe o pagamento).
5. Clique em **“Testar conexão”** para validar.
6. Salve. Opcional: personalize logo, cor, título e rodapé da página de checkout.

O **Seller ID** e o **Token** vêm do painel PagBank (área de integração / API / chaves). Em ambiente de teste use as credenciais de **sandbox/homologação**.

---

## 5. Testar o fluxo

1. Ative o checkout em um formulário e preencha Seller ID + Token (sandbox para teste).
2. Envie o formulário como visitante; você deve ser redirecionado para a **página de checkout** com Pix e cartão.
3. Gere um **Pix** (ou pague com cartão de teste); o PagBank envia o webhook para seu backend.
4. Confira no painel (aba Checkout / respostas) se a submissão aparece como **Pago**.

Se o webhook não chegar, confira: URL correta no PagBank, `PAGBANK_WEBHOOK_BASE_URL` e `PAGBANK_WEBHOOK_SECRET` no `.env`, e se o servidor está acessível pela internet (em produção).

---

## Resumo

- **Variáveis:** já estão no `.env`; você só precisa trocar os placeholders (principalmente **PAGBANK_WEBHOOK_SECRET** e as URLs em produção).
- **Banco:** rodar as migrations **155** e **156** uma vez.
- **PagBank:** cadastrar URL do webhook e o secret no painel.
- **Formulário:** em cada formulário, ativar checkout e preencher Seller ID + Token na tela de Checkout.

Detalhes técnicos e troubleshooting: veja **SETUP_CHECKOUT_PAGBANK.md**.
