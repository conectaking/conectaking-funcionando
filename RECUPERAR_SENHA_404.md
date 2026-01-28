# 404 em /recuperar-senha – Como corrigir

## O que está acontecendo

A **landing / painel** (conectaking.com.br) é servida pelo **frontend** em `public_html/`.  
As páginas **Esqueci senha** e **Nova senha** (`/recuperar-senha`, `/resetar-senha`) são servidas pelo **backend Node** (este projeto).

Quando o usuário acessa **conectaking.com.br/recuperar-senha**:

- O pedido vai para o **frontend** (public_html).
- O frontend **não tem** essa rota → **404 "This Page Does Not Exist"**.

Ou seja: o 404 não é do backend, e sim do **frontend** que não expõe essa URL.

---

## Solução rápida (recomendada)

**1. Link “Esqueci senha” no login (frontend)**  
No HTML/JS do login (em `public_html/`), altere o link de “Esqueci senha” para apontar para a **API**:

- **Antes:** `href="/recuperar-senha"` ou `href="https://conectaking.com.br/recuperar-senha"`
- **Depois:** `href="https://conectaking-api.onrender.com/recuperar-senha"`  
  (ou a URL real da sua API, se for outra)

Assim, o clique em “Esqueci senha” leva direto para a página de recuperação na API, sem 404.

**2. Link no e-mail de recuperação**  
O backend já foi ajustado: o link de “Resetar senha” no e-mail usa a **URL da API** (`config.urls.api`). O usuário que clica no e-mail cai em `API/resetar-senha?token=...`, que funciona.

Resumo: corrija apenas o link “Esqueci senha” no login para a URL da API. O fluxo completo (esqueci senha → e-mail → nova senha) passa a funcionar.

---

## Outras soluções (redirect, proxy)

### Opção A: Redirecionar no frontend

Criar **recuperar-senha.html** (e se quiser **resetar-senha.html**) no `public_html/` que **redirecionam** para a API.

**1. Descobrir a URL da API**

Exemplos: `https://conectaking-api.onrender.com` ou `https://api.conectaking.com.br`.  
Use a mesma base que o login/painel usam para chamar `/api/...`.

**2. Criar `recuperar-senha.html`** em `public_html/`:

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0;url=SUA_URL_DA_API/recuperar-senha">
    <title>Recuperar senha - Conecta King</title>
</head>
<body>
    <p>Redirecionando para recuperar senha…</p>
    <script>window.location.replace('SUA_URL_DA_API/recuperar-senha');</script>
</body>
</html>
```

Substitua `SUA_URL_DA_API` pela URL real da API (ex.: `https://conectaking-api.onrender.com`).

**3. Configurar o servidor para servir essa página em `/recuperar-senha`**

- Se for **estático** (apenas arquivos): depende do host. Em muitos casos é preciso que o **dominio/recuperar-senha** aponte para **recuperar-senha.html** (ex.: regra de rewrite ou pasta `recuperar-senha` com `index.html` que redireciona).
- Em **Netlify**: `_redirects` ou `netlify.toml` para mapear `/recuperar-senha` → `/recuperar-senha.html`.
- Em **Vercel**: `vercel.json` com rewrite de `/recuperar-senha` para `/recuperar-senha.html`.

**4. Opcional – `resetar-senha`**

Se o link do e-mail for `API/resetar-senha?token=...`, o usuário já cai na API.  
Se em algum lugar do frontend você usar **conectaking.com.br/resetar-senha**, aí vale criar **resetar-senha.html** que redireciona para `SUA_URL_DA_API/resetar-senha` (e configurar rewrite da mesma forma).

---

### Opção B: Proxy /recuperar-senha e /resetar-senha para a API

No servidor que responde por **conectaking.com.br**:

- Fazer **proxy** de `/recuperar-senha` e `/resetar-senha` (e possivelmente `/esqueci-senha`, `/forgot`) para a **API** (mesma base usada para `/api/...`).

Assim, **conectaking.com.br/recuperar-senha** é atendido pela API, e o 404 some.

---

### Opção C: Link “Esqueci senha” direto para a API

No **login** (e onde mais tiver “Esqueci senha”):

- Em vez de `href="/recuperar-senha"`, usar  
  `href="https://SUA_URL_DA_API/recuperar-senha"`.

O usuário passa a abrir a página de recuperação **na API**.  
O e-mail de reset já deve usar `FRONTEND_URL` ou `API_URL` conforme configurado no backend; o importante é que **recuperar** e **resetar** estejam na mesma base (API ou frontend) que você usar no link e no e-mail.

---

## O que já foi ajustado no backend

- Rotas `/recuperar-senha`, `/resetar-senha`, `/esqueci-senha`, `/forgot` estão registradas **antes** das rotas genéricas.
- O perfil público **não** trata mais `recuperar-senha` nem `resetar-senha` como `/:slug`.

Ou seja: **no backend**, essas URLs estão corretas. O 404 em **conectaking.com.br/recuperar-senha** vem do **frontend** (public_html) não oferecer essa rota.  
Resolvendo com uma das opções acima (redirect, proxy ou link direto para a API), o “Esqueci senha” deixa de dar 404.
