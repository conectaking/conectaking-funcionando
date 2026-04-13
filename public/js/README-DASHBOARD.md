# Scripts do dashboard (Conecta King)

Scripts que devem ser carregados pelo `dashboard.html` para manter o front organizado por aba/pane.

## Módulos por aba

| Arquivo | Responsabilidade |
|---------|------------------|
| `dashboard-info.js` | Aba **Informações** (Editar Conecta King): nome, WhatsApp, @, bio, avatar. Namespace: `window.DashboardInfo`, método `init()`. |
| `dashboard-empresa.js` | Aba **Empresa**: Minha equipe, códigos de convite, Personalização da Marca. Namespace: `window.DashboardEmpresa`, métodos `init()` e `loadBrandingData()`. Suporta hash `#branding-pane` no mobile. |
| `dashboard-personalizar.js` | Aba **Personalizar** (Editar Conecta King): tema, cores, botões, logo do cartão. Namespace: `window.DashboardPersonalizar`, métodos `init()` e `reloadPreview(timestamp)`. Após **Publicar alterações** (save-all) com sucesso, chamar `DashboardPersonalizar.reloadPreview(data.timestamp)` para recarregar o iframe de preview sem o usuário precisar atualizar a página. |
| `dashboard-ocultar-modulos-por-plano.js` | Oculta itens do menu conforme plano (Gestão Financeira, Contratos, Agenda, Modo Empresa, etc.). Chama `applyModulesVisibility(user)` ou `initModulesByPlan()`. |
| `dashboard-kingDocs-nav.js` | (Opcional) Insere o link **King Docs** via JS se não existir no HTML. O **`dashboard.html`** em `public/` já inclui o item estático no menu, logo abaixo de **Bíblia**. Namespace: `window.DashboardKingDocsNav`, método `init()`. |

## Inclusão no dashboard.html

Incluir após o `dashboard.js`:

```html
<script src="js/dashboard-info.js" defer></script>
<script src="js/dashboard-empresa.js" defer></script>
<script src="js/dashboard-personalizar.js" defer></script>
<script src="js/dashboard-ocultar-modulos-por-plano.js" defer></script>
<script src="js/dashboard-kingDocs-nav.js" defer></script>
```

No `DOMContentLoaded` (ou após carregar o utilizador), chamar `DashboardKingDocsNav.init()` e depois `applyModulesVisibility(user)` para o King Docs respeitar o plano.

Detalhes e ordem de carregamento: **`docs/DASHBOARD-FRONT-SPLIT.md`**.

**Nota:** O painel em produção costuma servir **`public_html/`** (ex.: `public_html/dashboard.html`). Mantenha **`public_html/dashboard.html`** alinhado com `public/dashboard.html` (link **King Docs** logo abaixo de **Bíblia**) e copie `kingDocs.html`, `kingDocsShare.html` e `js/dashboard-ocultar-modulos-por-plano.js` para a mesma pasta ao publicar.
