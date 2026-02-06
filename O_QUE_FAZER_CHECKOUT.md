# O que fazer para o Checkout KingForms (PagBank) funcionar

As variáveis do checkout já foram adicionadas no seu `.env`. Siga os passos abaixo.

---

## 1. Preencher as variáveis no `.env`

Abra o arquivo **`.env`** na raiz do projeto (`D:\CONECTA 2026\conectaking-funcionando-1\.env`) e ajuste:

| Variável | O que fazer |
|----------|-------------|
| **PAGBANK_EMAIL** | E-mail da sua conta PagBank (usado para consultar a notificação na API). |
| **PAGBANK_TOKEN** | Token da conta (Configurações → Token de Segurança; pode enviar por e-mail). |
| **PAGBANK_WEBHOOK_BASE_URL** | Em **produção**, coloque a URL pública do seu backend (ex.: `https://conectaking-api.onrender.com`). Em desenvolvimento local pode deixar `http://localhost:5000`. |
| **PUBLIC_APP_URL** | Mesma URL do backend que as pessoas acessam (ex.: `https://conectaking-api.onrender.com`). Usada no link “Abrir página de checkout” no painel. Em local pode deixar `http://localhost:5000`. |
| **PAGBANK_API_BASE_URL** | Para **testes** deixe `https://sandbox.api.pagseguro.com`. Em **produção** use a URL da API PagBank conforme a documentação oficial. |

**Checkout transparente / Marketplace (recomendado):** defina **PAGBANK_PLATFORM_ACCESS_TOKEN** e **PAGBANK_PLATFORM_ACCOUNT_ID** com o token e o ID da **sua** conta PagBank (plataforma). Seus clientes só colocam o **Identificador para marketplace** no formulário (pegam em **PagBank → Vendas → Plataformas e Checkout → Identificador para marketplace**). Split: 10% para você, 90% para o vendedor; o vendedor não precisa passar token.

**Não use** `PAGBANK_WEBHOOK_SECRET` no fluxo "Notificação de transação" — ele só existe no webhook de dev.pagbank.com.br.

Opcionais: **CHECKOUT_ENCRYPTION_KEY**, **PAGBANK_LEGACY_API_URL**.

---

## 2. Rodar as migrations no banco (uma vez)

Execute no seu banco PostgreSQL, **nesta ordem**:

1. **Migration 155** – estrutura do checkout:  
   Arquivo: `migrations/155_add_checkout_module_tables.sql`
2. **Migration 156** – personalização da página (logo, cor, título, rodapé):  
   Arquivo: `migrations/156_add_checkout_page_personalization.sql`

Se o projeto já tiver um script ou processo que aplica migrations ao subir, basta garantir que essas duas sejam executadas.

---

## 3. Configurar a notificação no painel PagBank

1. Acesse o **painel do PagBank** → **Vendas** → **Integrações** → **Configurações**.
2. Em **Notificação de transação**, cadastre:
   - **URL:** `https://SEU_BACKEND/api/webhooks/pagbank`  
     (ex.: `https://conectaking-api.onrender.com/api/webhooks/pagbank`)
3. Salve. Não há secret nessa tela — o sistema valida consultando a API do PagBank com **PAGBANK_EMAIL** e **PAGBANK_TOKEN**.

---

## 4. Em cada formulário que quiser cobrar

1. No painel, abra o formulário e vá em **Checkout** (sidebar ou aba).
2. Ou acesse: **Checkout Config** → `checkoutConfig.html?itemId=ID_DO_FORMULARIO`.
3. Ative **“Pagamento”** (checkout).
4. Preencha **valor (R$)** e **Identificador para marketplace** (o vendedor pega em **PagBank → Vendas → Plataformas e Checkout → Identificador para marketplace**). Deixe **Token** em branco para usar a conta da plataforma; split 10% / 90% é aplicado automaticamente.
5. Clique em **“Testar conexão”** para validar.
6. Salve. Opcional: personalize logo, cor, título e rodapé da página de checkout.

O **Identificador para marketplace** o vendedor pega em **PagBank → Vendas → Plataformas e Checkout → Identificador para marketplace**. Em ambiente de teste use o Account ID de homologação.

---

## 5. Testar o fluxo

1. Ative o checkout em um formulário e preencha o **Identificador para marketplace** (token em branco = conta da plataforma).
2. Envie o formulário como visitante; você deve ser redirecionado para a **página de checkout** com Pix e cartão.
3. Gere um **Pix** (ou pague com cartão de teste); o PagBank envia o webhook para seu backend.
4. Confira no painel (aba Checkout / respostas) se a submissão aparece como **Pago**.

Se o status não virar "Pago", confira: URL de notificação correta no PagBank, **PAGBANK_EMAIL** e **PAGBANK_TOKEN** no `.env`, e se o backend está acessível pela internet (produção).

---

## Resumo

- **Variáveis:** preencha **PAGBANK_EMAIL** e **PAGBANK_TOKEN** (notificação); para split 10%/90%, use **PAGBANK_PLATFORM_ACCESS_TOKEN** e **PAGBANK_PLATFORM_ACCOUNT_ID**. Não use `PAGBANK_WEBHOOK_SECRET` no fluxo "Notificação de transação".
- **Banco:** rodar as migrations **155** e **156** uma vez.
- **PagBank:** em Vendas → Integrações, configurar a URL de notificação de transação (sem secret).
- **Formulário:** em cada formulário, ativar checkout e preencher **Identificador para marketplace** (vendedor pega em PagBank → Vendas → Plataformas e Checkout). Token em branco = usa conta da plataforma e split 10%/90%.

Detalhes técnicos e troubleshooting: veja **SETUP_CHECKOUT_PAGBANK.md**.
