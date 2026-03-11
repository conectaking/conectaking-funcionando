# Plano de separação dos módulos – Conecta King

Objetivo: deixar cada funcionalidade do cartão em **módulo separado** (backend, frontend e view), com a **mesma lógica de programação** que o restante do projeto, para facilitar manutenção e futura migração para PHP.

---

## 1. Lógica que vamos seguir (padrão do Conecta King)

### Backend (Node/Express)
- **Rota** → recebe a requisição e chama o controller.
- **Controller** → extrai `req`/`res`, chama o **service** e devolve resposta padronizada (`responseFormatter.success` / `responseFormatter.error`).
- **Service** → regras de negócio e validação (usa **validators**); não acessa banco.
- **Repository** → único que faz SELECT/INSERT/UPDATE/DELETE no banco.
- **Validators** → validam e sanitizam dados de entrada.

Cada módulo do cartão que hoje está misturado em `routes/profile.js` terá sua própria pasta em `modules/` (ou um módulo “profileItems” com um handler por tipo).

### Frontend (dashboard – Editar Conecta King)
- **Núcleo** (`dashboard-core.js` ou trecho único) → carrega perfil, lista de itens, ordem, publicar, abrir/fechar modal.
- **Por tipo** → um arquivo (ou bloco) por tipo de item: ex. `dashboard-item-link.js`, `dashboard-item-banner.js`, `dashboard-item-carousel.js`, etc., cada um com a lógica de **renderizar** e **editar** aquele tipo no modal.
- Alternativa: um único `dashboard-items.js` que, conforme `item_type`, chama o “editor” correto (função ou objeto por tipo).

### View do cartão (perfil público)
- **Partial por tipo** → em vez de um `profile.ejs` com dezenas de `else if (item.item_type === '...')`, criar arquivos como:
  - `views/profile/items/link.ejs`
  - `views/profile/items/banner.ejs`
  - `views/profile/items/carousel.ejs`
  - … um para cada tipo.
- O `profile.ejs` principal só percorre os itens e faz `<%- include('profile/items/' + item.item_type) %>` (ou similar), passando `item` e dados do perfil.

### Banco de dados
- A tabela **`profile_items`** continua central; cada item tem `item_type` e as colunas comuns (title, destination_url, image_url, etc.).
- Módulos que precisam de dados extras já usam tabelas próprias (`sales_pages`, `bible_items`, `location_items`, etc.). Ao separar, mantemos isso: cada módulo pode ter sua tabela auxiliar se precisar.

---

## 2. O que já está separado (manter como está)

| Módulo            | Backend                    | Frontend / Edição      | Observação        |
|-------------------|----------------------------|------------------------|-------------------|
| Página de vendas  | `modules/salesPage/`       | `salesPageEdit.html/js`| OK                |
| Agenda            | `modules/agenda/`         | Lógica no dashboard   | OK                |
| King Selection    | `routes/kingSelection.routes.js` | `kingSelectionEdit.html` | OK           |
| King Forms        | Rotas em `publicDigitalForm` etc. | `formPageEdit` / kingForms | OK        |
| Lista de convidados | `guestList*.routes.js`   | Páginas dedicadas     | OK                |
| Contrato          | `modules/contracts/`      | Fluxo próprio         | OK                |
| Bíblia            | `modules/bible/`          | Link lateral + bibliaking.html | OK             |
| Documentos        | `modules/documentos/`     | Recibos/Orçamentos    | OK                |
| Link Limits       | `modules/linkLimits/`     | Aba Separação de Pacotes | OK             |

Esses **não** entram na lista de “separar”; só garantimos que a orquestração (profile, publicProfile) continue chamando esses módulos.

---

## 3. Lista do que vamos separar (módulo por módulo)

Tudo que está hoje **misturado** em:
- `routes/profile.js` (save-all, PUT /items/banner/:id, PUT /items/link/:id, PUT /items/carousel/:id e lógica por `item_type`)
- `public_html/dashboard.js` (um arquivo gigante com todos os tipos)
- `views/profile.ejs` (uma sequência longa de `else if (item.item_type === '...')`)

será dividido nos blocos abaixo. A ordem pode ser seguida em fases (ex.: Fase 1 = Link + Banner + Carousel, Fase 2 = redes sociais, etc.).

---

### 3.1 Backend (criar módulos em `modules/`)

| # | Módulo / Grupo        | Tipos (`item_type`)      | O que criar |
|---|------------------------|---------------------------|-------------|
| 1 | **Link**               | `link`                    | `modules/cardLink/`: routes, controller, service, repository, validators. Rotas: GET/PUT /api/profile/items/link/:id (ou sob um prefixo único). |
| 2 | **Banner**             | `banner`                  | `modules/cardBanner/`: idem. Já existe PUT /items/banner/:id em profile.js → mover para o módulo e chamar da rota. |
| 3 | **Carrossel**          | `carousel`, `banner_carousel` | `modules/cardCarousel/`: idem. Já existe PUT /items/carousel/:id → mover. |
| 4 | **Redes sociais / Link social** | `whatsapp`, `telegram`, `email`, `facebook`, `instagram`, `tiktok`, `twitter`, `youtube`, `linkedin`, `pinterest`, `reddit`, `twitch`, `spotify`, `portfolio` | Um único módulo `modules/cardSocial/` (ou `profileItemSocial`) que trata todos esses tipos com a mesma estrutura (controller/service/repository por tipo ou um handler por tipo). Rotas: GET/PUT /api/profile/items/social/:id com body indicando o tipo. |
| 5 | **PIX**                | `pix`, `pix_qrcode`       | `modules/cardPix/`: rotas, controller, service, repository, validators. |
| 6 | **PDF**                | `pdf`, `pdf_embed`        | `modules/cardPdf/`: idem. |
| 7 | **Embeds**             | `instagram_embed`, `youtube_embed`, `tiktok_embed`, `spotify_embed`, `linkedin_embed`, `pinterest_embed` | `modules/cardEmbed/`: um módulo que trata todos os embeds (estrutura comum, diferença só nos campos por rede). |
| 8 | **Catálogo de produtos**| `product_catalog`         | `modules/cardProductCatalog/` (ou integrar ao módulo de sales page se fizer sentido no negócio). |
| 9 | **Localização**        | `location`                 | Já existe `modules/location/`. Só garantir que a criação/edição do item no cartão use esse módulo e que profile.js não tenha lógica duplicada. |

**Orquestração no profile:**
- O “save-all” em `profile.js` pode continuar existindo, mas **delega** por `item_type`: para cada tipo que tem módulo próprio, chama o service do módulo (ex.: `cardBannerService.update(...)`), em vez de ter if/else gigante no profile.
- Rotas específicas (ex.: PUT /items/banner/:id) passam a ser do módulo (ex.: `cardBanner.routes.js`) montado em `app.use('/api/profile', cardBannerRoutes)` ou similar, para não quebrar a URL se já existir cliente.

---

### 3.2 Frontend – Dashboard (Editar Conecta King)

| # | O que separar | Onde está hoje | O que fazer |
|---|----------------|----------------|--------------|
| 1 | **Núcleo** | `dashboard.js` (carregar perfil, lista, ordem, publicar, abrir modal) | Extrair para `dashboard-core.js` (ou manter um “core” no início do arquivo) e carregar primeiro. |
| 2 | **Editores por tipo** | Vários `case 'link'`, `case 'banner'`, etc. dentro do mesmo `dashboard.js` | Criar arquivos como `dashboard-items-link.js`, `dashboard-items-banner.js`, `dashboard-items-carousel.js`, `dashboard-items-social.js`, `dashboard-items-pix.js`, `dashboard-items-pdf.js`, `dashboard-items-embed.js`, `dashboard-items-product-catalog.js`, `dashboard-items-location.js`. Cada um registra “como renderizar e como editar” aquele tipo (objeto ou função por item_type). O `dashboard.js` (ou core) só chama o editor registrado para o tipo do item. |
| 3 | **Lista de módulos e ícones** | Maps como `getItemTypeName`, `defaultIconsMap`, `defaultTitlesMap` espalhados | Centralizar em um único arquivo, ex. `dashboard-item-types.js`, que exporta nomes, ícones e títulos por `item_type`, e que os editores e o core usem. |

Ordem sugerida no HTML: carregar `dashboard-core.js` (ou o bloco central), depois `dashboard-item-types.js`, depois os `dashboard-items-*.js` (ou um único `dashboard-items.js` que internamente divide por tipo).

---

### 3.3 View – Cartão público (profile.ejs)

| # | Tipo no cartão | Onde está hoje | O que fazer |
|---|----------------|----------------|-------------|
| 1 | `link` | Bloco em `profile.ejs` | Extrair para `views/profile/items/link.ejs`. |
| 2 | `banner` | Bloco em `profile.ejs` | Extrair para `views/profile/items/banner.ejs`. |
| 3 | `carousel` | Bloco em `profile.ejs` | Extrair para `views/profile/items/carousel.ejs`. |
| 4 | `pix` | Bloco em `profile.ejs` | Extrair para `views/profile/items/pix.ejs`. |
| 5 | `pix_qrcode` | Bloco em `profile.ejs` | Extrair para `views/profile/items/pix_qrcode.ejs` (ou reutilizar `pix.ejs` com variável). |
| 6 | `pdf` | Bloco em `profile.ejs` | Extrair para `views/profile/items/pdf.ejs`. |
| 7 | `product_catalog` | Bloco em `profile.ejs` | Extrair para `views/profile/items/product_catalog.ejs`. |
| 8 | Redes sociais | Um bloco por rede (whatsapp, telegram, email, …) | Um partial `views/profile/items/social.ejs` que recebe `item` e usa `item.item_type` para ícone e texto (ou um partial por rede se preferir arquivos menores). |
| 9 | Embeds | instagram_embed, youtube_embed, etc. | Um partial `views/profile/items/embed.ejs` que recebe `item` e trata por `item_type`, ou um partial por tipo de embed. |
| 10 | `digital_form` / `guest_list` | Blocos atuais | Extrair para `views/profile/items/digital_form.ejs` e `views/profile/items/guest_list.ejs`. |
| 11 | `agenda` | Bloco atual | Extrair para `views/profile/items/agenda.ejs`. |
| 12 | `sales_page` | Bloco atual | Extrair para `views/profile/items/sales_page.ejs`. |
| 13 | `contract` | Bloco atual | Extrair para `views/profile/items/contract.ejs`. |
| 14 | `bible` | Bloco atual | Extrair para `views/profile/items/bible.ejs`. |
| 15 | `location` | Se existir bloco, ou fallback | Extrair para `views/profile/items/location.ejs` se houver; senão, manter no fallback. |

No `profile.ejs` principal, onde hoje está a sequência de `else if (item.item_type === '...')`, substituir por algo como:

```ejs
<% items.forEach(function(item) { %>
  <%- include('profile/items/' + (item.item_type || 'link'), { item: item, ... }) %>
<% }); %>
```

(com tratamento para tipos que não tiverem partial, ex. fallback para `link.ejs` ou um `default.ejs`.)

---

## 4. Resumo da ordem de execução sugerida

1. **Fase 1 – View (cartão)**  
   Criar a pasta `views/profile/items/` e extrair os partials (link, banner, carousel, depois redes sociais, PIX, PDF, embeds, etc.). Ajustar `profile.ejs` para usar `include` por tipo.  
   → Cartão continua igual; só a organização do código muda.

2. **Fase 2 – Backend (um tipo por vez)**  
   Começar por um tipo simples (ex.: **Banner**), criar `modules/cardBanner/`, mover a lógica de PUT /items/banner/:id e do save-all para o novo módulo e manter profile.js apenas chamando o módulo. Repetir para **Carousel**, **Link**, depois **Social**, **PIX**, **PDF**, **Embed**, etc.

3. **Fase 3 – Frontend (dashboard)**  
   Introduzir `dashboard-item-types.js` e, em seguida, extrair os editores por tipo para arquivos separados (ou um único `dashboard-items.js` com funções por tipo), e fazer o core do dashboard usar esses editores.

4. **Fase 4 – Limpeza**  
   Remover código duplicado de `profile.js` e `dashboard.js`, e garantir que nenhum tipo fique “solto” fora do módulo correspondente.

---

## 5. Benefícios

- **Manutenção:** alterar “só WhatsApp” ou “só Banner” sem mexer no restante.
- **Migração para PHP:** migrar um módulo por vez (ex.: primeiro o de Banner em PHP, depois Carousel, etc.).
- **Reuso:** no futuro, um módulo (ex.: apenas o de Banner) pode ser reaproveitado em outro projeto.
- **Lógica certa:** mesmo padrão já usado em salesPage, agenda, bible, etc.: rota → controller → service → repository, com validators e view em partials.

---

## 6. Checklist rápido (lista do que separar)

- [ ] **Backend:** Módulo Link  
- [ ] **Backend:** Módulo Banner  
- [ ] **Backend:** Módulo Carrossel  
- [ ] **Backend:** Módulo Social (redes: whatsapp, telegram, …)  
- [ ] **Backend:** Módulo PIX  
- [ ] **Backend:** Módulo PDF  
- [ ] **Backend:** Módulo Embed  
- [ ] **Backend:** Módulo Product Catalog (e/ou integrar a sales)  
- [ ] **Backend:** Localização (garantir uso do módulo existente)  
- [ ] **Frontend:** dashboard-item-types.js (nomes/ícones centralizados)  
- [ ] **Frontend:** Editores por tipo (ou dashboard-items.js único)  
- [ ] **View:** views/profile/items/link.ejs  
- [ ] **View:** views/profile/items/banner.ejs  
- [ ] **View:** views/profile/items/carousel.ejs  
- [ ] **View:** views/profile/items/social.ejs (ou um por rede)  
- [ ] **View:** views/profile/items/pix.ejs, pdf.ejs, embed.ejs, etc.  
- [ ] **View:** views/profile/items/digital_form.ejs, guest_list.ejs, agenda.ejs, sales_page.ejs, contract.ejs, bible.ejs, location.ejs  
- [ ] **Orquestração:** profile.js e publicProfile passam a delegar para os módulos em vez de if/else por tipo  

Quando quiser começar, podemos seguir por fases (por exemplo: só Fase 1 – partials do cartão – e depois partir para o backend).
