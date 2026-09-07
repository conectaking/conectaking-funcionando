# Organização do front do dashboard

O `dashboard.js` é o **orquestrador** (auth, sidebar, cartão, itens). Módulos pesados ficam em ficheiros separados para mexer num sem partir outro.

## Módulos carregados (ordem no `dashboard.html`)

| Arquivo | Responsabilidade |
|---------|------------------|
| `dashboard.js` | Core + `window.DashboardCore` (API_URL, headers, safeFetch) |
| `js/dashboard-finance.js` | Gestão financeira (`window.initFinancePane`, gráficos, lançamentos…) |
| `js/dashboard-empresa.js` | Personalização da marca (logo upload/save) — `DashboardEmpresa` / `loadBrandingData` |
| `js/dashboard-relatorios.js` | Relatórios / analytics (`window.loadReportsData`, `DashboardRelatorios`) |
| `js/dashboard-cartao.js` | Preview ao vivo, vCard, estado dos módulos (`DashboardCartao`) |
| `js/dashboard-editor.js` | `renderEditor` — lista/form dos módulos do cartão (`DashboardEditor`) |
| `js/dashboard-sortable.js` | Drag-and-drop / reordenar módulos (`DashboardSortable`) |
| `js/dashboard-save.js` | **Publicar alterações** (`DashboardSave.saveAllChanges`) |
| `js/dashboard-upload.js` | Cropper + upload de imagens (`DashboardUpload`) |
| `js/dashboard-edit-modal.js` | Modal editar módulo (`DashboardEditModal.openEditModal`) |
| `js/dashboard-qr.js` | QR Code / Compartilhar (`DashboardQR`) |
| `js/dashboard-assinatura.js` | Assinatura e planos (`DashboardAssinatura`) |
| `js/dashboard-listeners.js` | `setupEventListeners` — wiring da UI (`DashboardListeners`) |
| `js/dashboard-info.js` | Stub/namespace aba Informações (`DashboardInfo.init`) |
| `js/dashboard-personalizar.js` | Preview após publicar (`DashboardPersonalizar.reloadPreview`) |
| `js/dashboard-vitrine.js` | Vitrine |
| `js/dashboard-ocultar-modulos-por-plano.js` | Visibilidade por plano |
| `js/dashboard-cropper-enhance.js` | Cropper de imagens |

## Bridge `window.DashboardCore`

Definido no boot do dashboard. Os módulos isolados **não** partilham closures do monólito — pedem API/headers via:

- `DashboardCore.getApiUrl()`
- `DashboardCore.getHeadersAuth()`
- `DashboardCore.safeFetch(url, options)`

## Re-extrair Finanças / Branding

Se voltares a juntar código no monólito por engano:

```bash
node scripts/extract-dashboard-modules.js
```

(só usar se o bloco Finanças/Branding ainda estiver *dentro* de `dashboard.js`)

## Produtos já isolados (páginas próprias)

King Forms, King Selection, Página de Vendas, Admin, King Docs — editar esses ficheiros **não** passa pelo `dashboard.js`.

## Cache bust

Ao publicar, bump `?v=` nos `<script>` do `dashboard.html` (ex.: `2026-09-07-mods`).
