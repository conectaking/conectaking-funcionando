# Configurar URL Pública do R2 (resolver erro 502/SSL)

O Render não consegue conectar diretamente ao endpoint S3 do Cloudflare R2 (falha de handshake SSL). A solução é usar **URL pública** para leitura de imagens: o backend busca as imagens via HTTP simples em vez do SDK S3.

## Opção 1: Usar o Worker (r2.conectaking.com.br) — **recomendado**

O Worker já faz upload no R2. Foi adicionado um endpoint para leitura:

- **URL base:** `https://r2.conectaking.com.br/ks/file`
- **Exemplo de URL:** `https://r2.conectaking.com.br/ks/file/galleries/123/abc.jpg`

### Passos

1. **Fazer deploy do Worker atualizado** (com o novo endpoint GET `/ks/file/`).

2. **Definir variável de ambiente no Render:**
   ```
   R2_PUBLIC_BASE_URL=https://r2.conectaking.com.br/ks/file
   ```

3. **Fazer deploy do backend** no Render.

O backend passa a buscar imagens do R2 pelo Worker, em vez de usar o SDK S3.

---

## Opção 2: Acesso público nativo do R2

Se preferir usar o acesso público direto do bucket R2:

### 1. Habilitar acesso público no Cloudflare

1. Acesse o [painel Cloudflare](https://dash.cloudflare.com) → **R2** → seu bucket.
2. Vá em **Settings**.
3. Em **Public access**, clique em **Allow Access**.
4. Escolha:
   - **R2.dev subdomain** (ex.: `https://pub-xxxx.r2.dev`), ou
   - **Custom domain** (ex.: `https://fotos.conectaking.com.br`).

### 2. Variável no Render

```
R2_PUBLIC_BASE_URL=https://pub-XXXX.r2.dev
```

Ou, se usou domínio customizado:

```
R2_PUBLIC_BASE_URL=https://fotos.conectaking.com.br
```

### 3. Formato das URLs

- Base: `R2_PUBLIC_BASE_URL` (sem barra no final)
- Imagem: `{base}/{key}` → ex.: `https://pub-xxx.r2.dev/galleries/123/abc.jpg`

---

## Resumo

| Opção              | R2_PUBLIC_BASE_URL                               | Requer              |
|--------------------|--------------------------------------------------|---------------------|
| Worker (recomendado) | `https://r2.conectaking.com.br/ks/file`         | Deploy do Worker    |
| R2.dev             | `https://pub-XXXX.r2.dev`                        | Acesso público no bucket |
| Custom domain      | `https://fotos.seusite.com.br`                   | Domínio configurado no R2 |

---

## Verificação

Depois de configurar, teste o preview das fotos no King Selection.  
Se as imagens carregarem (com marca d’água), a configuração está correta.
