# Organização do front do dashboard

O `dashboard.js` concentra a lógica de todas as abas. Para manter o plano de separação, a lógica pode ser dividida em arquivos por aba/pane, carregados após o `dashboard.js`.

## Estrutura sugerida

| Arquivo | Aba / Conteúdo | Uso |
|---------|----------------|-----|
| `dashboard.js` | Core (auth, sidebar, carregar panes, itens do cartão) | Já existe; permanece como orquestrador. |
| `js/dashboard-info.js` | Aba **Informações** (#info-editor) | Inicialização e handlers da aba Editar Conecta King → Informações. |
| `js/dashboard-personalizar.js` | Aba **Personalizar** (#personalizar-editor) | Tema, cores, botões, logo. |
| `js/dashboard-empresa.js` | Aba **Empresa** (equipe, códigos convite, personalização) | Minha equipe, códigos de convite, branding da empresa. |
| `js/dashboard-assinatura.js` | Assinatura / planos | Já pode existir ou ser extraído de dashboard.js. |
| `js/relatorios.js` | Relatórios | Pane de analytics. |

## Como usar os stubs

Os arquivos `js/dashboard-info.js` e `js/dashboard-empresa.js` definem namespaces vazios. Para ativar:

1. Incluir no `dashboard.html` após `dashboard.js`:
   ```html
   <script src="dashboard.js?v=..." defer></script>
   <script src="js/dashboard-info.js?v=..." defer></script>
   <script src="js/dashboard-empresa.js?v=..." defer></script>
   ```
2. No `dashboard.js`, ao exibir a aba correspondente, chamar (se existir):
   - `if (window.DashboardInfo && typeof DashboardInfo.init === 'function') DashboardInfo.init();`
   - `if (window.DashboardEmpresa && typeof DashboardEmpresa.init === 'function') DashboardEmpresa.init();`
3. Migrar gradualmente a lógica da aba do `dashboard.js` para o arquivo dedicado (ex.: formulário de informações para `dashboard-info.js`).

## Ordem de carregamento

- `global.js` (auth, API_BASE)
- `dashboard.js` (core)
- `js/dashboard-info.js`, `js/dashboard-empresa.js`, etc. (opcional, por aba)

Assim o dashboard continua funcionando com um único `dashboard.js`; os stubs permitem ir separando a lógica por arquivo quando for conveniente.
