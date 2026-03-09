# Recibos e Orçamentos — Configuração e Checklist

Nada novo precisa ser **instalado** (npm): todas as dependências já estão no projeto (tesseract.js, pdf-lib, nanoid, multer, node-fetch).

## O que verificar

### 1. Banco de dados
- A migration **189_documentos_recibos_orcamentos.sql** já foi executada (tabela `documentos`).
- A migration **198_documentos_condicoes_pagamento.sql** adiciona o campo `condicoes_pagamento` (condições de pagamento no PDF).
- A migration **199_documentos_user_settings.sql** cria a tabela `documentos_user_settings` (cores e último documento por usuário), para as configurações persistirem entre dispositivos e ao voltar da página de Configuração.
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
- **recibos-orcamentos.html** (em `public/`): formulário premium (tema escuro, dourado, sidebar) para criar e editar orçamentos/recibos. Integra com a API: salvar (POST/PUT), importar logomarca (POST /upload-logo), visualizar (abre documentos-preview.html com dados em sessionStorage), exportar PDF (GET /:id/pdf). Acesso: autenticado (cookie/sessão). URL exemplo: `https://seu-dominio/recibos-orcamentos.html` ou `?id=123` para editar.
- **documentos-preview.html** (em `public/`): preview do documento no estilo da fatura (azul/laranja). Preenche com `fillPreview(doc)`; se aberto a partir de "Visualizar" do formulário, lê o documento do sessionStorage.
- **documentos-ver.html** (link do cliente): se existir noutro deploy, o cliente abre pelo token; o painel monta o link com a origem atual.

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
- **Configurações persistentes (cores e último documento)**:
  - `GET /api/documentos/settings` — devolve `headerColor`, `accentColor`, `bgColor`, `lastDocumentId`, `companyLogoUrl`. Use no carregamento da página para aplicar o tema e, se não houver `?id=` na URL, redirecionar para `?id=<lastDocumentId>` (assim o orçamento não “some” ao voltar de Configuração).
  - `PUT /api/documentos/settings` — body: `{ headerColor?, accentColor?, bgColor?, lastDocumentId? }`. Ao abrir um documento, envie `lastDocumentId` com o id do documento atual. Ao salvar cores na página de Configuração, envie `headerColor`, `accentColor`, `bgColor`. Assim as cores e a logo ficam iguais em qualquer computador e ao exportar o PDF.
- **Exportar PDF com cores e logo**: o endpoint `GET /api/documentos/:id/pdf` aceita opcionalmente `headerColor`, `accentColor`, `bgColor` na query. Se não forem enviados, são usadas as cores salvas em `/api/documentos/settings`. A logo no PDF vem de `emitente_json.logo_url` (do documento) ou, se falhar ou estiver vazio, da logo da empresa (`company_logo_url` do usuário).

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

---

## Layout do PDF (estilo fatura — azul e laranja)

O PDF exportado usa o mesmo estilo da fatura de referência:

- **Topo**: faixa azul com título "ORÇAMENTO" ou "RECIBO" e número à direita; faixa laranja fina por baixo.
- **Logo**: logo abaixo do topo, à esquerda (ou use o upload de logomarca para aparecer no documento).
- **Colunas**: "Faturado para" (cliente) à esquerda; "Emitido por" (emitente) à direita.
- **Tabela**: cabeçalho laranja (Descrição, Data, Qtd, Valor unit., Total); total geral em caixa laranja.
- **Condições de pagamento** e **Observações** abaixo da tabela; **Data** e **Válido até**; rodapé "Obrigado pela preferência.".
- Cores: azul escuro (#1e3a5f), laranja (#e67e22), branco no cabeçalho e no total.

---

## Ver na página e exportar a própria página (WYSIWYG)

**Ideia:** ter o mesmo layout (azul, laranja, logo no topo) na própria página do painel e um botão "Exportar PDF" que gera o PDF a partir do que se vê (ou que abre o PDF do backend no mesmo visual).

**Opções:**

1. **Backend gera o PDF (atual)**  
   O servidor gera o PDF com o layout estilo fatura. O utilizador clica em "Descarregar PDF" e recebe o ficheiro. **Vantagem:** funciona em qualquer cliente; não depende de JavaScript no browser. **Desvantagem:** não há pré-visualização idêntica no ecrã antes de descarregar.

2. **Preview na página + exportar a página (recomendado)**  
   - Na área Recibos/Orçamentos, uma **vista de pré-visualização** em HTML/CSS com o mesmo layout (header azul, logo, colunas, tabela laranja, total, condições, observações).  
   - O utilizador vê exactamente o que sairá no documento.  
   - Botão **"Exportar PDF"** pode fazer uma de duas coisas:  
     - **A)** Chamar o endpoint actual `GET /api/documentos/:id/pdf` (ou por token) e descarregar o PDF gerado no backend (layout já igual ao da imagem).  
     - **B)** Usar "Imprimir" do browser (Ctrl+P) com CSS `@media print` desenhado para essa preview, e "Guardar como PDF" na janela de impressão — assim o PDF é literalmente "a página exportada".  
   - **Recomendação:** ter **preview em HTML** com o mesmo estilo + botão que descarrega o PDF do backend (opção A). Assim: vê na página o resultado e, ao exportar, recebe o PDF oficial com o mesmo layout. Opcionalmente, adicionar um segundo botão "Imprimir / Guardar como PDF" que abre a janela de impressão (opção B) para quem quiser exportar a própria página.

3. **Só imprimir a página**  
   Se a página de edição já tiver o layout de fatura, o utilizador pode usar Ctrl+P e "Guardar como PDF". Não é necessário novo endpoint; basta que o CSS da preview esteja preparado para impressão.

**Resumo:** O layout do PDF no backend já está como na imagem (azul, laranja, logo no topo). Para "ver na página e exportar a página", o melhor é: **criar uma preview em HTML com o mesmo visual** e um botão "Exportar PDF" que descarrega o PDF gerado no servidor; opcionalmente, um botão "Imprimir" que usa a impressão do browser para guardar a própria página como PDF.

### Template de preview (HTML/CSS)

Foi criado o ficheiro **`public/documentos-preview.html`**, que replica o layout da fatura (header azul, faixa laranja, colunas Faturado para / Emitido por, tabela com cabeçalho laranja, total em destaque, condições, observações, rodapé). Serve como base para a pré-visualização na página.

- **Como usar:** Carregue esta página no front (iframe ou rota que a sirva) e preencha os dados com o documento da API. No próprio ficheiro existe a função `fillPreview(doc)` em JavaScript: recebe o objeto documento (como devolvido por `GET /api/documentos/:id` ou `GET /api/documentos/ver/:token`) e preenche todos os campos (título, número, emitente, cliente, itens, total, condições, observações, datas).
- **Integração:** Na página de listagem/edição de documentos, ao abrir um orçamento/recibo: 1) obter o documento com a API; 2) abrir ou injetar o conteúdo de `documentos-preview.html`; 3) chamar `fillPreview(doc)`; 4) botão "Exportar PDF" que faz download de `GET /api/documentos/:id/pdf` (ou `/ver/:token/pdf`).
- **Imprimir a página:** A folha de estilo inclui `@media print`; o utilizador pode usar Ctrl+P e "Guardar como PDF" para exportar a própria preview.
