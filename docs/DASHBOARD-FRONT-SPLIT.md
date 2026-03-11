# Organização do front do dashboard

O `dashboard.js` concentra a lógica de todas as abas. Para manter o plano de separação, a lógica foi dividida em arquivos por aba/pane, carregados após o `dashboard.js`.

## Estrutura (implementada e sugerida)

| Arquivo | Aba / Conteúdo | Uso |
|---------|----------------|-----|
| `dashboard.js` | Core (auth, sidebar, carregar panes, itens do cartão) | Permanece como orquestrador. |
| `js/dashboard-info.js` | Aba **Informações** (#info-editor) | ✅ Criado. Inicialização e handlers da aba Editar Conecta King → Informações. |
| `js/dashboard-empresa.js` | Aba **Empresa** + **Personalização da Marca** (#branding-pane) | ✅ Criado. Equipe, códigos de convite, branding; `loadBrandingData()` e suporte a hash `#branding-pane` no mobile. |
| `js/dashboard-personalizar.js` | Aba **Personalizar** (#personalizar-editor) | ✅ Criado. Tema, cores, botões, logo do cartão; migrar lógica do dashboard.js. |
| `js/dashboard-assinatura.js` | Assinatura / planos | A extrair de dashboard.js quando for conveniente. |
| `js/relatorios.js` | Relatórios | Pane de analytics. |

Os arquivos de dashboard ficam em **`public/js/`** (junto a `dashboard-ocultar-modulos-por-plano.js`). O `dashboard.html` deve referenciar esse mesmo diretório (ex.: se o HTML estiver em `public_html/`, use `../public/js/` ou o path correto para onde os scripts são servidos).

## Como ativar no dashboard.html

1. Incluir após `dashboard.js` (e após `global.js` ou equivalente):

   ```html
   <script src="dashboard.js?v=1" defer></script>
   <script src="js/dashboard-info.js?v=1" defer></script>
   <script src="js/dashboard-empresa.js?v=1" defer></script>
   <script src="js/dashboard-personalizar.js?v=1" defer></script>
   ```

2. No `dashboard.js`, ao exibir a aba correspondente, chamar:

   - **Aba Informações** (Editar Conecta King → Informações):
     ```js
     if (window.DashboardInfo && typeof DashboardInfo.init === 'function') DashboardInfo.init();
     ```
   - **Aba Empresa** (sidebar → Empresa / times):
     ```js
     if (window.DashboardEmpresa && typeof DashboardEmpresa.init === 'function') DashboardEmpresa.init();
     ```
   - **Aba Personalizar** (Editar Conecta King → Personalizar):
     ```js
     if (window.DashboardPersonalizar && typeof DashboardPersonalizar.init === 'function') DashboardPersonalizar.init();
     ```

3. Migrar gradualmente a lógica que hoje está no `dashboard.js` para cada arquivo:
   - Formulário de informações (nome, WhatsApp, @, bio, avatar) → `dashboard-info.js` (método `_bindForm`).
   - Minha equipe, códigos de convite, branding da empresa → `dashboard-empresa.js`.
   - Tema, cores, botões, logo do cartão → `dashboard-personalizar.js`.

## Fluxo mobile – hash #branding-pane

No `dashboard-empresa.js` está implementado:

- Ao carregar a página ou ao mudar o hash, se a URL tiver **`#branding-pane`**, é chamado **`DashboardEmpresa.loadBrandingData()`**.
- Assim, no fluxo mobile (menu que abre por hash), ao navegar para Personalização da Marca com `#branding-pane`, os dados da marca são carregados automaticamente.

Se o dashboard mobile usar outro hash (ex.: `#branding`), basta garantir que o link para a Personalização da Marca use `#branding-pane` ou ajustar o listener em `dashboard-empresa.js` para esse hash.

## Ordem de carregamento

1. `global.js` (auth, API_BASE)
2. `dashboard.js` (core)
3. `js/dashboard-info.js`, `js/dashboard-empresa.js`, `js/dashboard-personalizar.js`

Assim o dashboard continua funcionando com um único `dashboard.js`; os módulos por aba já existem e podem receber a lógica migrada quando for conveniente.
