# Deploy no Render

## 1. Erro 500 ao clonar do GitHub

Se aparecer **"The requested URL returned error: 500"** ao clonar:

- **Repositório privado:** no Render, ao conectar o GitHub, autorize o acesso à organização/conta onde está o repositório. Ou deixe o repositório **público** temporariamente para testar.
- **GitHub instável:** tente de novo em alguns minutos; 500 costuma ser falha temporária do GitHub.
- **URL do repositório:** confira se está correta: `https://github.com/conectaking/conectaking-funcionando` (ou o que você usa). Se o repositório tiver outro nome ou estiver em outra organização, atualize no Render em **Settings → Build & Deploy → Repository**.

## 2. "package.json not found" (ENOENT)

Esse erro costuma aparecer quando:

1. **O clone falhou (500)** – então a pasta do projeto fica vazia e o `npm install` não acha o `package.json`. Resolva primeiro o item 1 acima.
2. **Raiz do repositório errada** – se no GitHub a raiz do repositório **não** for a pasta onde está o `package.json` (por exemplo, o código está em um subdiretório), no Render:
   - Vá em **Settings → Build & Deploy** do seu serviço.
   - Em **Root Directory**, informe a pasta que contém `package.json` (ex.: `conectaking-funcionando` se a estrutura for `repo/conectaking-funcionando/package.json`).
   - Salve e faça um novo deploy.

## 3. Configuração sugerida no Render

- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Root Directory:** deixe em branco se o `package.json` está na raiz do repositório; caso contrário, use a pasta correta (veja item 2).

## 4. Variáveis de ambiente

Configure no Render (**Environment**) as variáveis que a aplicação usa (banco, APIs, etc.), por exemplo:

- `DATABASE_URL` (ou o que seu projeto usa)
- Outras que estiverem no `.env` local

---

**Resumo:** o erro 500 vem do GitHub ao clonar. Corrija o acesso ao repositório (permissões/URL) e, se o código estiver em uma subpasta, defina o **Root Directory** no Render. Depois disso, o build deve encontrar o `package.json` e o deploy seguir normalmente.
