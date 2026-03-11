# Lista completa do que separar – conforme pedido

Nome correto do formulário: **King Forms** (no “Adicionar” aparece como “Formulário King” – é o mesmo; manter nome **King Forms** no código e na organização).

---

## 1. PAINEL / EMPRESA (aba “Empresa” no dashboard)

| # | O que separar | Onde está hoje | Ação |
|---|----------------|----------------|------|
| 1 | **Empresa** (aba/conteúdo da aba Empresa) | Aba “Empresa” no sidebar (data-tab="times") | Módulo ou seção dedicada: estrutura separada para tudo que pertence à “Empresa”. |
| 2 | **Minha equipe** | Dentro da área Empresa / lógica no dashboard | Módulo separado: `modules/empresa/equipe/` (backend) + front separado (ex.: `empresa-equipe.js` ou pane dedicado). |
| 3 | **Códigos de convite** (que estão em “Minha empresa”) | Provavelmente ligado a admin (códigos de registro) ou conta/equipe | Módulo separado: `modules/empresa/codigosConvite/` (ou `modules/codigosConvite/`) + front separado. |
| 4 | **Personalização** (que está em “Minha empresa”) | Pode ser branding, logo, ou configurações da empresa | Módulo separado: `modules/empresa/personalizacao/` + front separado (não misturar com “Personalizar” do cartão). |

---

## 2. CARTÃO VIRTUAL (Ver Cartão)

| # | O que separar | Onde está hoje | Ação |
|---|----------------|----------------|------|
| 5 | **Ver Cartão** (link que leva ao cartão: tag.conectaking.com.br/… ou cnking.bio/…) | Botão “Ver Cartão” no sidebar → abre o cartão público | Módulo **Cartão Virtual (público)**: `modules/cartaoVirtual/` ou garantir que `publicProfile` + view do perfil estejam em estrutura dedicada (rotas, controller, service, view separados). |
| 6 | **Página principal do cartão** (tag.conectaking.com.br/slug) | `routes/publicProfile.js`, `views/profile.ejs` | Deixar organizado: rotas e renderização do cartão em módulo/pasta clara (ex.: `modules/cartaoPublico/` ou `publicProfile` como módulo). |

---

## 3. EDITAR CONECTA KING (abas Informações e Personalizar)

| # | O que separar | Onde está hoje | Ação |
|---|----------------|----------------|------|
| 7 | **Informações** (aba do editor: nome, WhatsApp, @, bio, avatar, etc.) | `#info-editor` em dashboard.html + lógica no dashboard.js | Módulo separado: backend `modules/editarCartao/informacoes/` (ou `modules/profileInfo/`), front `dashboard-info.js` (ou seção carregada só nessa aba). |
| 8 | **Personalizar** (aba do editor: configurações visuais do cartão) | `#personalizar-editor` em dashboard.html + dashboard.js | Módulo separado: backend `modules/editarCartao/personalizar/` (ou `modules/cartaoPersonalizar/`), front `dashboard-personalizar.js`. |

---

## 4. MÓDULOS DO CARTÃO (Adicionar → cada tipo um por um)

Cada item abaixo = **um módulo separado** (backend + front no dashboard + partial na view do cartão).

### Itens do modal "Adicionar novo módulo" (26 itens)

Lista exata do que aparece no modal (definido em `public_html/dashboard.html`). No código há 26 cards ativos; se na tela aparecem menos, é por ocultação por plano.

| # | item_type | Nome exibido no modal |
|---|-----------|------------------------|
| 1 | whatsapp | WhatsApp |
| 2 | telegram | Telegram |
| 3 | email | Email |
| 4 | pix | PIX (Copia e Cola) |
| 5 | pix_qrcode | PIX QR Code |
| 6 | instagram | Instagram |
| 7 | facebook | Facebook |
| 8 | tiktok | TikTok |
| 9 | twitter | X (Twitter) |
| 10 | youtube | YouTube |
| 11 | spotify | Spotify |
| 12 | linkedin | LinkedIn |
| 13 | pinterest | Pinterest |
| 14 | link | Link Personalizado |
| 15 | portfolio | Portfólio |
| 16 | banner | Banner |
| 17 | carousel | Carrossel |
| 18 | instagram_embed | Instagram Incorporado |
| 19 | youtube_embed | YouTube Incorporado |
| 20 | digital_form | Formulário King (King Forms) |
| 21 | sales_page | Página de Vendas |
| 22 | guest_list | Lista de Convidados |
| 23 | contract | Contrato Digital |
| 24 | agenda | Agenda Inteligente |
| 25 | bible | Bíblia |
| 26 | location | Localização |

No modal existem apenas **dois** tipos PIX: **PIX (Copia e Cola)** (`pix`) e **PIX QR Code** (`pix_qrcode`). Não há item separado "PIX Cola".

### Redes / Contato

| # | Nome no sistema | item_type | Ação |
|---|------------------|-----------|------|
| 9 | WhatsApp | `whatsapp` | Módulo `modules/cardWhatsapp/` (ou dentro de `modules/cardSocial/` com handler específico). |
| 10 | Telegram | `telegram` | Módulo `modules/cardTelegram/`. |
| 11 | E-mail | `email` | Módulo `modules/cardEmail/`. |
| 12 | PIX (Copia e Cola) | `pix` | Módulo `modules/cardPix/` (só copia e cola). |
| 13 | PIX QR Code | `pix_qrcode` | Módulo `modules/cardPixQrcode/` (ou junto em `cardPix` com dois handlers). |
| 14 | Instagram | `instagram` | Módulo `modules/cardInstagram/`. |
| 15 | Facebook | `facebook` | Módulo `modules/cardFacebook/`. |
| 16 | TikTok | `tiktok` | Módulo `modules/cardTiktok/`. |
| 17 | X (Twitter) | `twitter` | Módulo `modules/cardTwitter/`. |
| 18 | YouTube | `youtube` | Módulo `modules/cardYoutube/`. |
| 19 | Spotify | `spotify` | Módulo `modules/cardSpotify/`. |
| 20 | LinkedIn | `linkedin` | Módulo `modules/cardLinkedin/`. |
| 21 | Pinterest | `pinterest` | Módulo `modules/cardPinterest/`. |

### Outros (links, mídia, embeds, etc.)

| # | Nome no sistema | item_type | Ação |
|---|------------------|-----------|------|
| 22 | Link personalizado | `link` | Módulo `modules/cardLink/`. |
| 23 | Portfólio | `portfolio` | Módulo `modules/cardPortfolio/`. |
| 24 | Banner | `banner` | Módulo `modules/cardBanner/`. |
| 25 | Carrossel | `carousel` | Módulo `modules/cardCarousel/`. |
| 26 | Instagram incorporado | `instagram_embed` | Módulo `modules/cardInstagramEmbed/`. |
| 27 | YouTube incorporado | `youtube_embed` | Módulo `modules/cardYoutubeEmbed/`. |
| 28 | **King Forms** (Formulário King) | `digital_form` | Módulo `modules/kingForms/` (nome correto: King Forms). Já tem rotas dedicadas; virar módulo completo. |
| 29 | Página de vendas | `sales_page` | Já existe `modules/salesPage/` – manter separado. |
| 30 | Lista de convidados | `guest_list` | Módulo `modules/guestList/` (unificar rotas atuais). |
| 31 | Contrato digital | `contract` | Já existe `modules/contracts/` – manter separado. |
| 32 | Agenda Inteligente | `agenda` | Já existe `modules/agenda/` – manter separado. |
| 33 | Bíblia | `bible` | Já existe `modules/bible/` – manter separado. |
| 34 | Localização | `location` | Já existe `modules/location/` – manter separado. |

---

## 5. LINKS DO SIDEBAR (páginas/abas do dashboard)

Cada um = módulo ou bloco separado (backend quando houver + front em arquivo/pane dedicado).

| # | Nome no menu | Onde está hoje | Ação |
|---|--------------|----------------|------|
| 36 | **Separação de pacotes** | `separacao-pacotes-pane` + `modules/linkLimits/` | Já em módulo; front: garantir pane/script dedicado (ex.: `separacao-pacotes.js`). |
| 37 | **Gestão financeira** | `finance-pane` + `modules/finance/` | Já em módulo; front: `finance.js` ou pane dedicado. |
| 38 | **King Forms** | Página `kingForms.html` + rotas publicDigitalForm | Módulo `modules/kingForms/` (backend) + front já em página própria. |
| 39 | **King Selection** | `modules/KingSelection/` (PHP) + kingSelection.routes.js | Já separado; manter. |
| 40 | **King Briefing** | `modules/kingbrief/` | Já separado; manter. |
| 41 | **Bíblia** | `modules/bible/` + link no sidebar | Já separado; manter. |
| 42 | **Meu site** | `meu-site-pane` + `modules/sites/` | Já em módulo; front dedicado. |
| 43 | **Recibos e orçamentos** | `modules/orcamentos/` + `modules/documentos/` | Já separados; manter. |
| 44 | **Contratos** | `contratos-pane` + `modules/contracts/` | Já separado; manter. |
| 45 | **Agenda Inteligente** | `agenda-pane` + `modules/agenda/` | Já separado; manter. |
| 46 | **Relatórios** | `relatorios-pane` + `routes/analytics.js` | Módulo `modules/relatorios/` (ou `analytics`) + front `relatorios.js` dedicado. |
| 47 | **Compartilhar** | `compartilhar-pane` + `routes/vcard.js` | Módulo `modules/compartilhar/` (vcard + geração de link) + front `compartilhar.js`. |
| 48 | **Personalização da Marca** | `branding-pane` + lógica no dashboard | Módulo `modules/personalizacaoMarca/` (backend) + front `branding.js` dedicado. |
| 49 | **ADM** | `admin/index.html` + `routes/admin.js` | Separar em submódulos (ver bloco 6). |
| 50 | **Personalizar Link do Site** | `personalizar-link-pane` + `routes/ogImage.js` | Módulo `modules/personalizarLink/` (ou dentro de branding) + front dedicado. |
| 51 | **Assinatura** | `assinatura-pane` + `routes/subscription.js` | Módulo `modules/assinatura/` + front `assinatura.js`. |
| 52 | **Personalizar Logo** | Link para `business/index.html?only=logo` | Manter como está ou integrar ao módulo de personalização da marca. |

---

## 6. ADM (admin) – separado em partes

| # | O que separar | Onde está hoje | Ação |
|---|----------------|----------------|------|
| 53 | **Visão Geral** | `overview-pane` em admin/index.html + admin.js | Backend: `modules/admin/overview/`. Front: `admin-overview.js`. |
| 54 | **Gerenciar Usuários** | `users-pane` + admin.js | Backend: `modules/admin/users/`. Front: `admin-users.js`. |
| 55 | **Gerenciar Códigos** | `codes-pane` + admin.js | Backend: `modules/admin/codes/`. Front: `admin-codes.js`. |
| 56 | **Logomarca padrão** | `branding-pane` (admin) + admin.js | Backend: `modules/admin/branding/`. Front: `admin-branding.js`. |

---

## 7. ASSINATURA E PACOTES

| # | O que separar | Onde está hoje | Ação |
|---|----------------|----------------|------|
| 57 | **Assinatura** (planos, renovação, upgrade) | `routes/subscription.js` | Módulo `modules/assinatura/` (controller, service, repository, routes). |
| 58 | **Cada pacote/plano** (se fizer sentido no código) | Tabelas/regras de planos, limites por plano | Se houver lógica por plano (ex.: “plano básico”, “pro”), considerar subpastas ou serviços por plano dentro de `modules/assinatura/` ou `modules/planos/`. |

---

## 8. PÁGINA PRINCIPAL (index / entrada)

| # | O que separar | Onde está hoje | Ação |
|---|----------------|----------------|------|
| 59 | **Página principal** (landing, login, entrada do site) | index.html e rotas de auth/landing | **Feito:** lógica de GET / em `modules/main/` (service, controller, routes). Assets continuam em `public_html/`; opcional mover landing para `public_html/main/` depois. |

---

## 9. RESUMO NUMERADO (tudo que vai ser separado)

1. Empresa (estrutura da aba)
2. Minha equipe
3. Códigos de convite (minha empresa)
4. Personalização (minha empresa)
5. Ver Cartão / Cartão virtual (público)
6. Página principal do cartão (organizada)
7. Informações (Editar Conecta King)
8. Personalizar (Editar Conecta King)
9–21. WhatsApp, Telegram, E-mail, PIX (Copia e Cola), PIX QR Code, Instagram, Facebook, TikTok, X, YouTube, Spotify, LinkedIn, Pinterest (cada um módulo)
22. Link personalizado
23. Portfólio
24. Banner
25. Carrossel
26. Instagram incorporado
27. YouTube incorporado
28. King Forms
29. Página de vendas (já separada)
30. Lista de convidados
31. Contrato (já separado)
32. Agenda (já separada)
33. Bíblia (já separada)
34. Localização (já separada)
36. Separação de pacotes (já separada)
37. Gestão financeira (já separada)
38. King Forms – sidebar (já em página própria)
39. King Selection (já separado)
40. King Briefing (já separado)
41. Bíblia – sidebar (já separado)
42. Meu site (já separado)
43. Recibos e orçamentos (já separados)
44. Contratos – sidebar (já separado)
45. Agenda – sidebar (já separada)
46. Relatórios
47. Compartilhar
48. Personalização da Marca
49. ADM (estrutura)
50. Personalizar Link do Site
51. Assinatura
52. Personalizar Logo (ou dentro de marca)
53. ADM – Visão Geral
54. ADM – Gerenciar Usuários
55. ADM – Gerenciar Códigos
56. ADM – Logomarca padrão
57. Assinatura (módulo backend)
58. Pacotes/planos (se aplicável)
59. Página principal (organizada)

---

## 10. FAZ SENTIDO SEPARAR TUDO?

- **Sim**, para organização e para não mexer em um módulo e afetar outros. Cada item acima pode virar:
  - **Backend:** pasta em `modules/` com controller, service, repository, routes (quando houver API).
  - **Frontend:** arquivo JS (ou pasta) dedicado para cada aba/página.
  - **View:** partial por tipo de item no cartão (`views/profile/items/...`).

- **Agrupamentos que fazem sentido** (para não criar 50 pastas soltas):
  - **Itens do cartão** (WhatsApp, link, banner, etc.): podem ficar em `modules/cardWhatsapp/`, `modules/cardLink/`, etc., ou um único `modules/cartaoItens/` com subpastas por `item_type`.
  - **Empresa:** um único `modules/empresa/` com subpastas `equipe/`, `codigosConvite/`, `personalizacao/`.
  - **Admin:** um único `modules/admin/` com subpastas `overview/`, `users/`, `codes/`, `branding/`.
  - **Editar cartão:** `modules/editarCartao/` com `informacoes/` e `personalizar/`.

- **Ordem sugerida para implementar** (sem quebrar o que já funciona):
  1. Admin (Visão Geral, Usuários, Códigos, Logomarca).
  2. Empresa (Equipe, Códigos de convite, Personalização).
  3. Editar Conecta King (Informações, Personalizar).
  4. Assinatura e Compartilhar (módulos).
  5. Relatórios e Personalização da Marca.
  6. Cartão virtual (estrutura dedicada).
  7. Itens do cartão (um por um: link, banner, PIX, redes, King Forms, etc.). **Partials:** iniciado em `views/profile/items/types/` (link, banner, whatsapp); os demais tipos podem ser extraídos gradualmente – ver `views/profile/items/README.md`.
  8. Página principal organizada.

Assim tudo fica listado, separado e com uma ordem de execução clara.
