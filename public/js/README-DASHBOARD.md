# Scripts do dashboard (Conecta King)

Scripts que devem ser carregados pelo `dashboard.html` para manter o front organizado por aba/pane.

## Módulos por aba

| Arquivo | Responsabilidade |
|---------|------------------|
| `dashboard-finance.js` | **Finanças** (isolado). Namespace via `window.initFinancePane` etc. Depende de `DashboardCore`. |
| `dashboard-empresa.js` | **Personalização da Marca**. `DashboardEmpresa.loadBrandingData` / `saveBranding` / `clearBranding`. |
| `dashboard-relatorios.js` | **Relatórios**. `window.loadReportsData` / `DashboardRelatorios.init()`. |
| `dashboard-cartao.js` | **Cartão/Preview**. `DashboardCartao.updateLivePreviewFromForm` etc. |
| `dashboard-editor.js` | **Editor de módulos**. `DashboardEditor.renderEditor`. |
| `dashboard-sortable.js` | **Ordenação**. `DashboardSortable.initSortable` / `saveItemOrder`. |
| `dashboard-save.js` | **Publicar**. `DashboardSave.saveAllChanges`. |
| `dashboard-upload.js` | **Cropper/Upload**. `DashboardUpload.openCropper`. |
| `dashboard-edit-modal.js` | **Modal editar**. `DashboardEditModal.openEditModal`. |
| `dashboard-qr.js` | **QR / Compartilhar**. `DashboardQR.generateQRCode`. |
| `dashboard-assinatura.js` | **Assinatura/Planos**. `DashboardAssinatura.loadSubscriptionInfo`. |
| `dashboard-listeners.js` | **Event listeners**. `DashboardListeners.setupEventListeners`. |
| `dashboard-info.js` | Aba **Informações** — namespace `DashboardInfo.init()`. |
| `dashboard-personalizar.js` | Aba **Personalizar** + `reloadPreview()` após Publicar. |
| `dashboard-ocultar-modulos-por-plano.js` | Oculta itens do menu conforme plano. |
| `dashboard-kingDocs-nav.js` | (Opcional) Link King Docs via JS. |
| `dashboard-vitrine.js` | Vitrine. |
| `dashboard-cropper-enhance.js` | Cropper. |

## Inclusão no dashboard.html

Incluir **depois** do `dashboard.js`:

```html
<script src="dashboard.js?v=…" defer></script>
<script src="js/dashboard-finance.js?v=…" defer></script>
<script src="js/dashboard-empresa.js?v=…" defer></script>
<script src="js/dashboard-relatorios.js?v=…" defer></script>
<script src="js/dashboard-cartao.js?v=…" defer></script>
<script src="js/dashboard-editor.js?v=…" defer></script>
<script src="js/dashboard-sortable.js?v=…" defer></script>
<script src="js/dashboard-save.js?v=…" defer></script>
<script src="js/dashboard-upload.js?v=…" defer></script>
<script src="js/dashboard-edit-modal.js?v=…" defer></script>
<script src="js/dashboard-qr.js?v=…" defer></script>
<script src="js/dashboard-assinatura.js?v=…" defer></script>
<script src="js/dashboard-listeners.js?v=…" defer></script>
<script src="js/dashboard-info.js?v=…" defer></script>
<script src="js/dashboard-personalizar.js?v=…" defer></script>
<script src="js/dashboard-vitrine.js?v=…" defer></script>
```

Detalhes: **`docs/DASHBOARD-FRONT-SPLIT.md`**.

