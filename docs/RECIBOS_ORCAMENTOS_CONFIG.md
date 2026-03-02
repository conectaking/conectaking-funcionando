# Recibos e Orçamentos — Configuração e Checklist

Nada novo precisa ser **instalado** (npm): todas as dependências já estão no projeto (tesseract.js, pdf-lib, nanoid, multer, node-fetch).

## O que verificar

### 1. Banco de dados
- A migration **189_documentos_recibos_orcamentos.sql** já foi executada (tabela `documentos`).
- A migration **198_documentos_condicoes_pagamento.sql** adiciona o campo `condicoes_pagamento` (condições de pagamento no PDF).
- Se em outro ambiente: rode `npm run migrate-auto` para aplicar migrations pendentes.

### 2. Cloudflare Images (fotos de comprovantes e logo)
Usado para guardar as imagens dos comprovantes e a logo no recibo/orçamento.

- **Se você já usa upload de imagens no ConectaKing** (ex.: King Selection, personalização): as mesmas variáveis servem. Não é preciso configurar nada a mais.
- **Se ainda não tiver configurado**, no `.env` (ou no painel do Render/servidor) defina:
  - `CLOUDFLARE_ACCOUNT_ID` — ID da conta Cloudflare
  - `CLOUDFLARE_API_TOKEN` — token com permissão para **Cloudflare Images** (Images: Edit)
  - Opcional: `CLOUDFLARE_ACCOUNT_HASH` — usado na URL pública das imagens (ex.: `imagedelivery.net`); se não definir, o código usa o Account ID.

Alternativas aceitas pelo código: `CF_IMAGES_ACCOUNT_ID`, `CF_IMAGES_API_TOKEN`, `CF_IMAGES_ACCOUNT_HASH`.

### 3. Frontend (site)
- **recibos-orcamentos.html** e **documentos-ver.html** devem estar publicados junto do site (ex.: em `public_html/` no mesmo domínio).
- O link que o cliente abre (ex.: `https://conectaking.com.br/documentos-ver.html?token=...`) depende do domínio onde o front está hospedado; o painel já monta esse link com a origem atual.

### 4. Tesseract (OCR)
- O **tesseract.js** roda em Node e baixa os dados de idioma na primeira vez (idioma `por`).
- Em ambiente serverless (ex.: Render), a primeira requisição que usar OCR pode demorar um pouco; as seguintes tendem a ser mais rápidas.

---

## Resumo

| Item              | Ação |
|-------------------|------|
| Pacotes npm       | Nada a instalar |
| Migration         | Já aplicada; em novo ambiente: `npm run migrate-auto` |
| Cloudflare        | Só configurar se ainda não usa upload de imagens no projeto |
| Páginas HTML      | Garantir que recibos-orcamentos.html e documentos-ver.html estejam no deploy do site |

Se o upload de imagens (ex.: King Selection) já funciona no seu ambiente, o sistema de Recibos e Orçamentos deve funcionar sem configuração extra.

---

## Melhorias implementadas (orçamento / eventos)

### API

- **Condições de pagamento**: envie `condicoes_pagamento` (texto) ao criar/atualizar documento. No PDF aparece abaixo dos valores, antes das observações. Ex.: "20% para marcação; 30% um dia antes do evento; 50% no encerramento."
- **Conteúdo do pacote por item**: em cada elemento de `itens_json` pode enviar `conteudo_pacote` ou `detalhes` (texto). No PDF aparece abaixo da linha do item (ex.: "O que vai no pacote: decoração, som, 4h").
- **Importar logomarca**: `POST /api/documentos/upload-logo` com multipart `image` (ficheiro). Resposta: `{ url }`. Use essa URL em `emitente_json.logo_url` ao criar/editar o documento (em vez de colar URL manual).

### Ordem no PDF

1. Logo, emitente, cliente, tabela de itens (com conteúdo do pacote por item se existir), total  
2. **Condições de pagamento** (se preenchido)  
3. Observações  
4. Data / Válido até  
5. (Recibo) Comprovantes  

### Ideias para o front-end

- **Destaque para observações**: campo "Observações" visível e grande na área do orçamento/recibo.
- **Título e válido até**: mostrar claramente "Título do documento" e "Válido até" (para orçamento); o backend já suporta `titulo` e `validade_ate`.
- **Botão "Importar logomarca"**: em vez de campo URL da logo, usar um botão que chama `POST /api/documentos/upload-logo` com o ficheiro e preenche `emitente_json.logo_url` com a resposta.
- **Separar Orçamento vs Recibo**: na lista/criação, usar dois botões ou abas distintas ("Novo orçamento" e "Novo recibo") para deixar claro o tipo.
- **Texto padrão para condições**: opcionalmente guardar um texto padrão (ex.: "20% marcação, 30% 1 dia antes, 50% no dia") para pré-preencher `condicoes_pagamento` em novos orçamentos de evento.
