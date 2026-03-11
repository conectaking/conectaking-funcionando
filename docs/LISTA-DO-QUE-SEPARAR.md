# Lista completa do que vamos separar – Conecta King

Objetivo: deixar o sistema **organizado e mais rápido**, com cada parte em módulo ou arquivos dedicados, sem atrapalhar o que já funciona.

---

## Parte 1 – O que você pediu para separar

### 1.1 Admin (hoje tudo em `routes/admin.js` + `public_html/admin/`)

| O que separar | Backend hoje | Frontend hoje | Ação |
|---------------|--------------|---------------|------|
| **Visão Geral** | Rotas `/stats`, `/advanced-stats` em admin.js | Aba `overview-pane` em index.html + admin.js | Criar `modules/admin/overview/` (controller, service, routes). Front: `admin-overview.js` (ou seção carregada por aba). |
| **Gerenciar Usuários** | Rotas users (GET, PUT, DELETE, manage, update-role, auto-delete) em admin.js | Aba `users-pane` no mesmo admin.js | Criar `modules/admin/users/` (controller, service, repository, routes). Front: `admin-users.js`. |
| **Gerenciar Códigos** | Rotas codes (GET, POST generate, batch, PUT, DELETE, auto-delete) em admin.js | Aba `codes-pane` no mesmo admin.js | Criar `modules/admin/codes/` (controller, service, repository, routes). Front: `admin-codes.js`. |
| **Logomarca padrão** | Rotas GET/PUT `/default-branding` em admin.js | Aba `branding-pane` no mesmo admin.js | Criar `modules/admin/branding/` (controller, service, routes). Front: `admin-branding.js`. |
| **Analytics do admin** | Rotas `/analytics/users`, `/analytics/user/:userId/details` em admin.js | Parte da Visão Geral / analytics | Pode ir no módulo `admin/overview` ou criar `modules/admin/analytics/`. |
| **Planos (admin)** | Rotas GET/PATCH `/plans` em admin.js | (se tiver tela no admin) | Criar `modules/admin/plans/` ou juntar em um módulo `admin/settings`. |

**Estrutura alvo backend:**  
`modules/admin/` com subpastas: `overview/`, `users/`, `codes/`, `branding/`, (opcional) `analytics/`, `plans/`.  
Cada uma exporta um router; o `routes/admin.js` vira um “wrapper” que monta todos sob `/api/admin`.

**Estrutura alvo frontend:**  
`public_html/admin/` com `index.html` carregando scripts por aba ou por seção: `admin-overview.js`, `admin-users.js`, `admin-codes.js`, `admin-branding.js` (e um `admin-core.js` mínimo para layout e troca de abas).

---

### 1.2 Compartilhar (vCard / salvar contato)

| O que separar | Onde está hoje | Ação |
|---------------|----------------|------|
| **Compartilhar cartão (vCard)** | `routes/vcard.js` (um arquivo só, ~200 linhas) | Criar `modules/vcard/` (controller, service, repository, routes). Manter rota `/vcard/:identifier`; lógica de negócio no service/repository. |

---

### 1.3 Personalização de marca / Logomarca

| O que separar | Onde está hoje | Ação |
|---------------|----------------|------|
| **Logomarca padrão (admin)** | Dentro de `routes/admin.js` | Já incluído no item **Admin → Logomarca padrão** acima (`modules/admin/branding/`). |
| **Preview de link (og-image)** | `routes/ogImage.js` (personalização de imagem para WhatsApp, etc.) | Opcional: criar `modules/branding/` com `ogImage` (controller, service, routes) e mover lógica para lá; ou manter `ogImage.js` como rota fina que chama o módulo. |

---

### 1.4 Resumo do que você pediu

- **Admin:** Visão Geral, Gerenciar Usuários, Gerenciar Códigos, Logomarca padrão → **separar em submódulos (backend) e em scripts/abas (frontend).**
- **Compartilhar (vCard):** → **módulo `modules/vcard/`.**
- **Personalização de marca / Logomarca:** → **admin branding em `modules/admin/branding/`;** og-image pode ficar em `modules/branding/` ou só chamar serviço de branding.

---

## Parte 2 – Outros pontos que vale separar (organização e performance)

### 2.1 Backend – Rotas que viram módulos

| # | Funcionalidade | Onde está hoje | Ação |
|---|----------------|----------------|------|
| 1 | **Assinatura (subscription)** | `routes/subscription.js` (um arquivo grande) | Criar `modules/subscription/` (controller, service, repository, validators, routes). Wrapper `routes/subscription.routes.js` só monta o router do módulo. |
| 2 | **Disponibilidade de módulos por plano** | `routes/moduleAvailability.js` (várias rotas) | Criar `modules/moduleAvailability/` (controller, service, repository, routes) e wrapper em `routes/moduleAvailability.routes.js`. |
| 3 | **Formulário digital (King Forms)** | `routes/publicDigitalForm.routes.js` + `routes/publicDigitalFormAnalytics.routes.js` | Criar `modules/digitalForm/` (controller, service, repository, routes públicas + analytics). Rotas atuais passam a chamar o módulo. |
| 4 | **Analytics do perfil (KPIs do usuário)** | `routes/analytics.js` | Criar `modules/analytics/` (ou `modules/profileAnalytics/`) com controller, service, repository, routes. Evita misturar com analytics do admin e da sales page. |
| 5 | **Lista de convidados (guest list)** | Vários arquivos: `guestList.routes.js`, `cadastroLinks.routes.js`, `guestListCustomize.routes.js`, `confirmationHistory.routes.js` | Unificar em um único módulo `modules/guestList/` (subpastas ou arquivos por contexto: lista, cadastro-links, customização, histórico de confirmações). Rotas sob `/api/guest-lists` montadas a partir do módulo. |
| 6 | **Profile (cartão – itens por tipo)** | `routes/profile.js` (muito grande, ~28 rotas + lógica por item_type) | Conforme `PLANO-SEPARACAO-MODULOS.md`: criar módulos por tipo de item (cardLink, cardBanner, cardCarousel, cardSocial, cardPix, cardPdf, cardEmbed, etc.) e profile.js só orquestra (save-all delega para os services). |
| 7 | **Relatórios do admin** | Dentro de `routes/admin.js` (analytics de usuários) | Extrair para `modules/admin/analytics/` (controller, service, routes) e montar sob `/api/admin/analytics`. |

---

### 2.2 Frontend – Arquivos únicos que vale quebrar

| # | Onde está hoje | Ação |
|---|----------------|------|
| 1 | **Dashboard (Editar Conecta King)** – `public_html/dashboard.js` (um arquivo com todos os tipos de item) | Conforme plano: `dashboard-core.js` + `dashboard-item-types.js` + `dashboard-items-*.js` (um por tipo: link, banner, carousel, social, pix, pdf, embed, etc.). |
| 2 | **Admin** – `public_html/admin/admin.js` (toda a lógica das 4 abas) | Quebrar em: `admin-core.js`, `admin-overview.js`, `admin-users.js`, `admin-codes.js`, `admin-branding.js`. |
| 3 | **Cartão público** – `views/profile.ejs` (muitos `else if` por item_type) | Extrair partials em `views/profile/items/*.ejs` (um por item_type) e no profile.ejs só fazer `include` por tipo. |

---

### 2.3 Outros arquivos de rota (menor prioridade)

- **ogImage.js** – Poucas rotas; pode virar `modules/branding/ogImage` se quiser tudo de “marca” junto.
- **kingSelection.routes.js** – Muitas rotas (proxy para o app PHP). Se for só proxy, pode manter um único arquivo; se tiver lógica Node, extrair para um módulo `modules/kingSelectionProxy/` ou similar.
- **publicProfile.js** – Poucas rotas; é a “porta” do perfil público. Manter como está ou, no futuro, virar módulo `modules/publicProfile/` se crescer.

---

## Parte 3 – O que já está separado (não mexer na estrutura)

- **Agenda** – `modules/agenda/`
- **King Selection (app)** – `modules/KingSelection/` (PHP)
- **Contratos** – `modules/contracts/`
- **King Briefing** – `modules/kingbrief/`
- **Recibos e orçamentos** – `modules/orcamentos/`, `modules/documentos/`
- **Separação de pacotes (link limits)** – `modules/linkLimits/`
- **Financeiro** – `modules/finance/`
- **Sales Page (e produtos, analytics)** – `modules/salesPage/`
- **Bíblia** – `modules/bible/`
- **Localização** – `modules/location/`
- **Sites** – `modules/sites/`
- **Checkout** – `modules/checkout/`

---

## Parte 4 – Ordem sugerida para implementar

1. **Admin** – Separar backend em `modules/admin/*` (overview, users, codes, branding, analytics, plans) e front em `admin-*.js`.
2. **Compartilhar (vCard)** – Criar `modules/vcard/`.
3. **Assinatura** – Criar `modules/subscription/`.
4. **Formulário digital (King Forms)** – Criar `modules/digitalForm/`.
5. **Module availability** – Criar `modules/moduleAvailability/`.
6. **Analytics do perfil** – Criar `modules/analytics/` (ou `profileAnalytics`).
7. **Lista de convidados** – Unificar em `modules/guestList/`.
8. **Profile (itens do cartão)** – Módulos por tipo de item + partials no profile.ejs + dashboard por tipo (conforme `PLANO-SEPARACAO-MODULOS.md`).
9. **Branding (og-image)** – Opcional: `modules/branding/`.

Assim você separa tudo o que pediu (admin, compartilhar, personalização de marca) e ainda deixa o resto do sistema mais organizado e mais rápido, sem atrapalhar o que já está modularizado.
