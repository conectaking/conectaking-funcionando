# Botões Gestão Financeira, Contratos e Agenda no Dashboard

## Comportamento (igual Modo Empresa)

Os botões **Gestão Financeira**, **Contratos** e **Agenda Inteligente** devem **sumir** quando o usuário **não tiver** esse módulo no plano (Separação de Pacotes + planos individuais), da mesma forma que o botão **Modo Empresa** some quando a pessoa não tem Modo Empresa.

---

## API: GET `/api/account/status`

A resposta inclui:

- `hasModoEmpresa` – mostrar/ocultar Modo Empresa
- `hasFinance` – mostrar/ocultar **Gestão Financeira**
- `hasContract` – mostrar/ocultar **Contratos**
- `hasAgenda` – mostrar/ocultar **Agenda Inteligente**

Cada um é `true` quando o usuário tem o módulo no plano (plano base + extras individuais − exclusões).

---

## Solução rápida: script pronto (public_html/dashboard.html)

Foi criado o script **`public/js/dashboard-ocultar-modulos-por-plano.js`** neste repositório. Use-o no seu dashboard (`public_html/`):

### 1. Copiar o script para o seu dashboard

- Copie o arquivo **`public/js/dashboard-ocultar-modulos-por-plano.js`** para dentro da pasta **`public_html`** do seu projeto (por exemplo: `public_html/js/dashboard-ocultar-modulos-por-plano.js`).

### 2. Incluir no `dashboard.html`

No **`dashboard.html`**, antes do `</body>`, adicione:

```html
<!-- Oculta Gestão Financeira, Contratos e Agenda conforme o plano -->
<script>
  // Se o dashboard estiver em outro endereço que a API (ex.: 5500 vs 3000), defina a URL da API:
  // window.API_BASE = 'http://localhost:3000';
</script>
<script src="js/dashboard-ocultar-modulos-por-plano.js"></script>
```

Se o dashboard e a API estiverem em portas diferentes (ex.: dashboard em `127.0.0.1:5500` e API em `http://localhost:3000`), descomente e ajuste:

```html
<script> window.API_BASE = 'http://localhost:3000'; </script>
<script src="js/dashboard-ocultar-modulos-por-plano.js"></script>
```

(Use a URL real da sua API, por exemplo em produção: `https://sua-api.com`.)

### 3. O que o script faz

- Ao carregar a página, chama **GET `/api/account/status`** (com o token em `localStorage`/`sessionStorage` ou cookie).
- Esconde no menu os itens cujo texto contém **"Gestão Financeira"**, **"Contratos"**, **"Agenda Inteligente"** ou **"Modo Empresa"** quando o usuário **não** tem esse módulo (`hasFinance`, `hasContract`, `hasAgenda`, `hasModoEmpresa` = false).

Não é obrigatório alterar o HTML: o script procura pelos textos. Se quiser, pode marcar cada item do menu com `data-module="finance"`, `data-module="contract"`, `data-module="agenda"` ou `data-module="modo_empresa"` para o script achar com mais precisão.

---

## Se você já chama `/api/account/status` no dashboard

Se o seu `dashboard.js` já carrega o usuário (por exemplo em `user` ou `account`), basta aplicar a visibilidade após receber a resposta:

```js
// Após obter user (ex.: do GET /api/account/status)
if (window.applyModulesVisibility) {
  window.applyModulesVisibility(user);
}
```

Assim, quem não tem o módulo no plano não vê o botão (e ao tentar acessar a rota recebe 403 no backend).
