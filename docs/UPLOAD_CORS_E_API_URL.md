# Upload de imagens (banner/carrossel) e CORS

## Erro "Failed to fetch" ou CORS ao enviar imagens

Se o dashboard (frontend) estiver em **http://127.0.0.1:5500** (ou outro host local) e aparecer:

- **"Failed to fetch"**
- **"blocked by CORS policy: No 'Access-Control-Allow-Origin' header"**
- **"redirected from conectaking.com.br/api/u.."** (redirect quebra CORS)
- **ERR_BLOCKED_BY_CLIENT** (por vezes causado por extensões do navegador)

faça o seguinte:

### 1. Usar a URL correta da API no frontend (obrigatório)

O dashboard **tem de chamar a API em** `https://conectaking-api.onrender.com` e **não** em `https://conectaking.com.br`. O domínio conectaking.com.br faz redirect para www e a resposta do redirect não envia CORS, por isso o browser bloqueia.

**Opção A – Definir a base no projeto do dashboard**

Onde estiver definida a base da API (ex.: `API_BASE_URL`, `VITE_API_URL`, `window.API_BASE`), use:

```text
https://conectaking-api.onrender.com
```

**Opção B – Script automático**

Inclua no HTML do dashboard (antes dos scripts que usam a API):

```html
<script src="https://conectaking-api.onrender.com/api-config.js"></script>
```

Depois, no JavaScript do dashboard, use `window.CONECTAKING_API_BASE` para as chamadas à API (ex.: `fetch(window.CONECTAKING_API_BASE + '/api/upload/auth', ...)`).

**Opção C – Obter a URL em tempo de execução**

```js
const { apiBaseUrl } = await fetch('https://conectaking-api.onrender.com/api/public-api-url').then(r => r.json());
// usar apiBaseUrl para todas as chamadas à API
```

### 2. Bloqueio por extensão (ERR_BLOCKED_BY_CLIENT)

Se no console aparecer **net::ERR_BLOCKED_BY_CLIENT**:

- Desative temporariamente **ad-blockers** ou extensões de privacidade no site onde corre o dashboard.
- Ou teste em janela anónima / outro perfil do Chrome sem extensões.

### 3. CORS no backend

A API já envia cabeçalhos CORS para origens de desenvolvimento e produção (incluindo `http://127.0.0.1:5500` e `http://localhost:5500`). As rotas de upload têm CORS explícito em `routes/upload.js`. Se precisar de mais origens, use a variável de ambiente:

```bash
CORS_ORIGIN=https://outro-dominio.com,http://127.0.0.1:8080
```

(separadas por vírgula, sem espaços).
