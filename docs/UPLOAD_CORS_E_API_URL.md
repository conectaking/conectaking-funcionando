# Upload de imagens (banner/carrossel) e CORS

## Erro "Failed to fetch" ou CORS ao enviar imagens

Se o dashboard (frontend) estiver em **http://127.0.0.1:5500** (ou outro host local) e aparecer:

- **"Failed to fetch"**
- **"blocked by CORS policy: No 'Access-Control-Allow-Origin' header"**
- **ERR_BLOCKED_BY_CLIENT** (por vezes causado por extensões do navegador)

faça o seguinte:

### 1. Usar a URL correta da API no frontend

Configure a **base URL da API** no dashboard para apontar **diretamente** para a API, sem redirect:

- **Produção:** `https://conectaking-api.onrender.com`
- **Evite:** `https://conectaking.com.br` ou `https://www.conectaking.com.br` como base da API se esses domínios fizerem **redirect** (ex.: de `conectaking.com.br` para `www.conectaking.com.br`). O redirect pode devolver a resposta sem cabeçalhos CORS e o browser bloqueia.

Ou seja: no painel/dashboard, onde está configurada a variável ou constante da API (tipo `API_BASE_URL` ou `VITE_API_URL`), use:

```text
https://conectaking-api.onrender.com
```

e não apenas `https://conectaking.com.br` (a menos que aí não haja redirect e o CORS esteja configurado nesse host).

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
