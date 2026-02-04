# Setup Checkout PagBank (KingForms) – Passo a passo

Este guia descreve **o que é manual** (conta PagBank, webhook, ENV) e **o que o código já faz**. Use como checklist antes de ativar o checkout em produção.

---

## 1) Criar / confirmar conta PagBank (vendedor)

- Acesse [PagBank](https://www.pagbank.com.br) e crie uma conta ou use a existente.
- Conclua a verificação de identidade e dados bancários para receber pagamentos.
- **Sandbox/homologação:** se o PagBank oferecer ambiente de testes, use-o primeiro (veja documentação oficial).

---

## 2) Onde pegar token e credenciais no PagBank

- Faça login no **Painel do vendedor** (PagBank Empresas / API).
- **Seller ID (ou Client ID):** em geral em “Minha conta” / “Integrações” / “API” – é o identificador da sua conta como recebedor.
- **Access Token (ou Client Secret):** gerado na mesma área (ex.: “Chaves de API” ou “Credenciais OAuth”). Use o token que permite **criar cobranças** e **receber webhooks**.
- **Passo a passo por menus:** como os menus mudam, consulte a documentação oficial atual:
  - [PagBank Desenvolvedores](https://dev.pagbank.com.br) ou equivalente.
  - Procure por “OAuth”, “Chaves de API”, “Credenciais” ou “Integração”.

---

## 3) Registrar webhook no PagBank

- No painel PagBank, abra a seção de **Webhooks** ou **Notificações**.
- **URL do webhook:**  
  `https://SEU_DOMINIO/api/webhooks/pagbank`  
  (ex.: `https://conectaking-api.onrender.com/api/webhooks/pagbank`).
- **Eventos:** marque os que indicam **pagamento aprovado**, **pago**, **recusado**, **cancelado** (nomes exatos conforme a documentação PagBank).
- **Secret:** gere ou copie o **secret** que o PagBank mostra para assinatura. Você vai usar em `PAGBANK_WEBHOOK_SECRET` no servidor.
- Salve a configuração.

---

## 4) Variáveis de ambiente no servidor (Render / VPS / Docker)

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `PAGBANK_WEBHOOK_SECRET` | Sim (para webhook) | Secret configurado no painel PagBank para validar a assinatura do webhook. |
| `CHECKOUT_ENCRYPTION_KEY` | Recomendado | Chave para criptografar o token PagBank no banco. Se não definir, o código usa `JWT_SECRET`. |

- No **Render:** Environment → Add Variable.  
- Em **VPS/Docker:** defina no `.env` ou no processo que inicia a aplicação.

---

## 5) Testar em sandbox / homologação (se aplicável)

- Use as credenciais de **homologação** do PagBank no formulário (Seller ID e Token de teste).
- Crie uma submissão com checkout ativo, gere uma cobrança Pix ou cartão de teste e confira se o webhook é chamado e se o status da submissão muda para “Pago” no painel.

---

## 6) Fluxo de teste completo

1. **Criar submissão pendente:** ative o checkout em um formulário, preencha e envie; a submissão deve ficar com status “Pagamento pendente” e redirecionar para a página de checkout.
2. **Gerar cobrança Pix:** na página de checkout, escolha “Pague com Pix”; deve aparecer QR Code (ou link) e o status “Pagamento pendente”.
3. **Receber webhook:** no ambiente de teste, pague ou simule o pagamento; o PagBank envia o evento para `/api/webhooks/pagbank`.
4. **Status virar PAID:** após processar o webhook, a submissão deve passar para “Pagamento confirmado” e `paid_at` preenchido.

---

## 7) Checklist de troubleshooting

| Problema | O que verificar |
|----------|------------------|
| Webhook não chega | URL correta no painel PagBank; servidor acessível pela internet; firewall não bloqueia POST. |
| CORS / redirect | CORS é para o front; webhook é chamado pelo servidor PagBank. Se o redirect após pagamento falhar, confira a URL de retorno configurada no checkout. |
| Assinatura inválida | `PAGBANK_WEBHOOK_SECRET` igual ao do painel; body do webhook recebido sem alteração (usar raw body para validação, se a doc pedir). |
| Split não aplicando | Conferir na documentação PagBank como enviar split (recebedor principal + recebedor secundário); no código, 10% plataforma e 90% vendedor. |

**Regra do split:** Os **10% são da plataforma (sua conta)** — valor líquido, sem dedução das taxas do PagBank. Os **90% vão para o vendedor** (conta de quem configurou o formulário); as taxas e comissões do PagBank são descontadas conforme o contrato deles (sobre o total ou sobre a parte do vendedor). Ou seja: seu 10% é livre; o vendedor recebe os 90% já descontadas as taxas do PagBank.

---

## 8) O que é manual vs automatizado

| Ação | Manual / Automático |
|------|----------------------|
| Criar conta PagBank | **Manual** |
| Copiar Seller ID e Token no painel | **Manual** |
| Cadastrar URL e secret do webhook no PagBank | **Manual** |
| Definir `PAGBANK_WEBHOOK_SECRET` e `CHECKOUT_ENCRYPTION_KEY` no servidor | **Manual** |
| Preencher “Seller ID” e “Token” na aba Checkout do formulário (admin) | **Manual** (pelo usuário no painel) |
| Criptografar e salvar o token no banco | **Automático** (código) |
| Testar conexão (botão “Testar conexão”) | **Automático** (chama API PagBank) |
| Criar cobrança Pix/cartão ao clicar na página de checkout | **Automático** |
| Receber webhook e atualizar `payment_status` e `paid_at` | **Automático** (com idempotência) |
| Exibir abas Pagos / Pendentes no Check-in | **Automático** (código) |

---

Para detalhes da API PagBank (payload do webhook, nomes dos eventos, split), use sempre a **documentação oficial** mais recente.
