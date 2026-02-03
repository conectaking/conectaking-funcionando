# Configurar tag.conectaking.com.br (corrigir DNS_PROBE_FINISHED_NXDOMAIN)

O erro **"Não é possível aceder a este site"** com **DNS_PROBE_FINISHED_NXDOMAIN** significa que o domínio **tag.conectaking.com.br** não está resolvendo — o DNS não encontra o endereço. Isso se corrige na **configuração de DNS** e no **Render**, não no código.

## Passo 1: No Render

1. Acesse [Render](https://dashboard.render.com) → seu serviço **conectaking-api** (ou o que usa **cnking.bio**).
2. Vá em **Settings** → **Custom Domains**.
3. Clique em **Add Custom Domain**.
4. Digite: **tag.conectaking.com.br**
5. O Render vai mostrar uma instrução do tipo:
   - **Tipo:** CNAME  
   - **Nome:** `tag` (ou `tag.conectaking.com.br`, conforme o painel)  
   - **Valor/Destino:** algo como `conectaking-api.onrender.com` (ou o host que o Render indicar)

Anote o **valor/destino** exato que o Render mostrar.

## Passo 2: Onde criar o registro DNS

**Importante:** O domínio **conectaking.com.br** usa nameservers da **Cloudflare** (`*.ns.cloudflare.com`). Por isso os registros DNS devem ser criados no **painel da Cloudflare**, não na Hostinger.

### Se usar Cloudflare (o seu caso)
1. Acesse [Cloudflare Dashboard](https://dash.cloudflare.com) → selecione o domínio **conectaking.com.br** → **DNS** → **Records**.
2. Adicione um registro:
   - **Type:** CNAME  
   - **Name:** `tag` (só o subdomínio; em alguns painéis aparece como "tag.conectaking.com.br")  
   - **Target:** o que o Render pediu (ex.: `conectaking-api.onrender.com`)  
   - **Proxy status:** pode deixar em "Proxied" (laranja) ou "DNS only" (cinza); se o Render não verificar, teste em "DNS only".  
3. Salve.

### Se o DNS estivesse na Hostinger
1. Hostinger → domínio **conectaking.com.br** → **DNS / Zona DNS**.
2. CNAME **tag** → destino (ex.: `conectaking-api.onrender.com`).
3. Salvar.

## Passo 3: Aguardar e testar

- A propagação do DNS pode levar de **alguns minutos a 24–48 horas**.
- Depois, acesse: **https://tag.conectaking.com.br/adrianokigg**

## Resumo

| Onde        | O que fazer |
|------------|-------------|
| **Render** | Adicionar domínio customizado **tag.conectaking.com.br** no serviço da API. |
| **Cloudflare** (conectaking.com.br usa NS da Cloudflare) | Criar CNAME **tag** → hostname que o Render indicar (ex.: conectaking-api.onrender.com). |

Se **cnking.bio** já funciona, o serviço está no ar; falta só o DNS de **tag** apontar para o mesmo lugar.

---

# Configurar cnking.bio e www.cnking.bio (corrigir "We weren't able to verify www.cnking.bio")

Quando o Render mostra **"We weren't able to verify www.cnking.bio"**, é porque o DNS ainda não está correto ou não propagou. Configure assim no provedor do domínio **cnking.bio** (ex.: get.bio, Hostinger, etc.):

## Registros a criar

| Domínio        | Tipo  | Nome/Host | Valor/Destino                    |
|----------------|-------|-----------|----------------------------------|
| www.cnking.bio | CNAME | `www`     | `conectaking-api.onrender.com`   |
| cnking.bio     | A     | `@`       | `216.24.57.1`                    |

- **www**: use **CNAME** com nome `www` e destino `conectaking-api.onrender.com` (sem `https://` e sem barra no fim).
- **Raiz (@)**: muitos provedores **não permitem CNAME no domínio raiz**. Use **registro A** com valor **216.24.57.1**. Se o seu provedor tiver "ANAME" ou "ALIAS", pode usar CNAME/ANAME `@` → `conectaking-api.onrender.com`.

## Depois de salvar o DNS

1. Espere **5–30 minutos** (às vezes até 24 h).
2. No Render, no modal **Add Custom Domain**, clique em **Retry Verification**.
3. Se ainda falhar, confira no provedor DNS se não há erro de digitação e se não existe outro registro para `www` ou `@` em conflito.

## Documentação do Render

Use o link **"Read the docs"** dentro do aviso amarelo no Render para ver requisitos extras (AAAA, CAA), se aparecerem.
