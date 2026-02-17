# TTS da Bíblia (Google Cloud + R2) – Passo a passo

Este guia explica o que foi implementado e o que **você** precisa fazer (contas, variáveis de ambiente, etc.).

---

## O que já está no código (eu fiz por você)

1. **Chave de cache** – Função que normaliza o texto e gera um hash único para cada trecho (assim não pagamos TTS duas vezes pelo mesmo trecho).
2. **Tabela no banco** – `bible_tts_cache` para guardar: qual trecho já virou áudio e onde está no R2.
3. **Serviço de TTS** – Verifica primeiro se o áudio já existe (banco + R2); se não existir, chama o Google TTS (módulo `tts-google.js`), sobe no R2 e grava no cache.
4. **Módulo Google TTS** – `modules/bible/tts/tts-google.js`: usa `GCP_SERVICE_ACCOUNT_JSON_BASE64` para autenticar e gera MP3 com `@google-cloud/text-to-speech`.
5. **Rota da API** – `GET /api/bible/tts/audio?ref=jo 3:16&version=nvi&voice=pt-BR-Standard-A` para pedir o áudio; devolve URL se já existir ou após gerar.

---

## O que VOCÊ precisa fazer

### Passo 1: Conta no Google Cloud (GCP)

1. Acesse [Google Cloud Console](https://console.cloud.google.com/).
2. Crie um projeto (ou use um existente) e anote o **ID do projeto** (ex.: `meu-projeto-123`).
3. Ative a API **Text-to-Speech**:
   - Menu ☰ → **APIs e serviços** → **Biblioteca**.
   - Procure por **Cloud Text-to-Speech API** e clique em **Ativar**.

### Passo 2: Service Account (credencial para o backend)

1. No Google Cloud Console: **APIs e serviços** → **Credenciais**.
2. Clique em **Criar credenciais** → **Conta de serviço**.
3. Dê um nome (ex.: `conectaking-tts`) e clique em **Criar e continuar**.
4. Na etapa “Conceder acesso”, opcional: role **Cloud Text-to-Speech User** (ou apenas usuário do projeto).
5. Conclua a criação.
6. Clique na conta de serviço que acabou de criar → aba **Chaves**.
7. **Adicionar chave** → **Criar nova chave** → **JSON** → **Criar**.  
   O arquivo JSON será baixado. **Guarde em local seguro e nunca suba no Git.**

### Passo 3: Converter o JSON em Base64 (para colocar no .env)

No **PowerShell** (Windows), na pasta onde está o arquivo JSON da Service Account:

```powershell
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes([System.IO.File]::ReadAllText("caminho-do-arquivo.json")))
```

Substitua `caminho-do-arquivo.json` pelo caminho real (ex.: `C:\Users\SeuUsuario\Downloads\meu-projeto-123456.json`).

Copie a saída (uma string longa em base64). Ela será usada no próximo passo.

### Passo 4: Variáveis de ambiente no servidor (Render ou .env local)

No **Render** (ou no seu `.env` local), adicione:

```env
# Obrigatório para TTS
GCP_PROJECT_ID=seu-id-do-projeto-gcp
GCP_SERVICE_ACCOUNT_JSON_BASE64=a_string_gigante_em_base64_que_voce_colou_aqui

# Opcional (pode deixar vazio)
GCP_LOCATION=
```

- **GCP_PROJECT_ID**: o ID do projeto do passo 1.  
- **GCP_SERVICE_ACCOUNT_JSON_BASE64**: a string base64 que você gerou no passo 3.

**Importante:** nunca coloque o conteúdo do JSON “solto” no front-end; ele só deve existir no backend (variável de ambiente).

### Passo 5: R2 já configurado

O projeto já usa R2 (`utils/r2.js`). O **King Selection** usa o bucket **kingselection** (variável `R2_BUCKET`). O TTS da Bíblia pode usar outro bucket (**conectaking-pdfs**) para os áudios, sem atrapalhar o King Selection.

**Variáveis principais:**

- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` – credenciais R2 (usadas por King Selection e, se não houver TTS_*, pelo TTS).
- `R2_BUCKET` – bucket do King Selection (ex.: **kingselection**). **Não troque** para conectaking-pdfs se o King Selection estiver em produção.
- `R2_PUBLIC_URL` – URL pública **dos áudios TTS** (domínio customizado do bucket de TTS, ex.: `https://tts.conectaking.com.br`).

**Para o TTS usar o bucket conectaking-pdfs (ex.: no Render):**

- Defina **TTS_R2_BUCKET** = **conectaking-pdfs**. O upload dos MP3 do TTS passará a usar esse bucket; o King Selection continua usando `R2_BUCKET` (kingselection).
- Se o bucket de TTS estiver na **mesma conta** Cloudflare, não é preciso definir `TTS_R2_ACCOUNT_ID`, `TTS_R2_ACCESS_KEY_ID` ou `TTS_R2_SECRET_ACCESS_KEY`; as credenciais `R2_*` servem para os dois.
- Se for outra conta ou outras chaves, defina também: `TTS_R2_ACCOUNT_ID`, `TTS_R2_ACCESS_KEY_ID`, `TTS_R2_SECRET_ACCESS_KEY`.

Resumo: **não altere** `R2_BUCKET` para conectaking-pdfs; use **TTS_R2_BUCKET** = conectaking-pdfs para que só o TTS use esse bucket e o King Selection não seja afetado.

### Passo 5b: Domínio customizado para TTS (tts.conectaking.com.br)

Para servir os MP3 do TTS por um domínio próprio (evitando 401 da URL de desenvolvimento do R2):

1. Acesse o **Cloudflare Dashboard** → **R2** → bucket **conectaking-pdfs**.
2. Aba **Settings** → seção **Custom Domains** → **Adicionar**.
3. Digite o subdomínio: **tts.conectaking.com.br**.
4. Se o domínio `conectaking.com.br` já estiver na mesma conta Cloudflare, o painel pode oferecer criar o registro DNS automaticamente; confirme.
5. Se pedir registro manual: em **DNS / Registros** do domínio `conectaking.com.br`, crie o registro que o R2 indicar (geralmente **CNAME** `tts` apontando para o alvo que o Cloudflare mostrar, ou um registro do tipo **R2**).
6. Aguarde o status do domínio no bucket ficar **Ativo** (pode levar alguns minutos).
7. No `.env` do projeto já está: `R2_PUBLIC_URL=https://tts.conectaking.com.br`. Reinicie o servidor após o domínio estar ativo.

Depois disso, a API passará a devolver URLs no formato `https://tts.conectaking.com.br/bible-tts/.../arquivo.mp3`.

### Passo 6: Rodar a migration do banco

No servidor (ou no seu ambiente local com Postgres/Neon), rode as migrations do projeto. A migration que cria a tabela `bible_tts_cache` deve rodar junto com as outras (por exemplo):

```bash
npm run migrate
```

(ou o comando que você usa para migrations no projeto.)

---

## Como usar a API (para o front ou testes)

- **Pedir áudio de um trecho:**  
  `GET /api/bible/tts/audio?ref=Jo 3:16&version=nvi&voice=pt-BR-Standard-A`  
  (parâmetros podem variar conforme o que implementamos; a rota pode ser GET ou POST.)

- A resposta pode ser:
  - **URL do áudio** – quando já está em cache (R2).
  - **Em processamento** – quando for implementada fila (job); aí você pode usar um `job_id` para consultar de novo depois.

---

## Resumo do fluxo

1. Usuário pede áudio de um versículo/capítulo.
2. Backend normaliza o texto e gera a **chave de cache**.
3. Backend consulta a tabela `bible_tts_cache` e, se existir, o R2 (pelo caminho guardado).
4. Se o arquivo existir no R2 → devolve a **URL pública** do MP3.
5. Se não existir → (quando o Google TTS estiver ativo) gera o áudio, sobe no R2, grava na `bible_tts_cache` e devolve a URL.

Assim, cada trecho só gera custo de TTS **uma vez**; depois todo mundo reutiliza o mesmo MP3.

---

## Problemas comuns

- **Script tts.js com MIME type text/html:** abra a página com URL que inclua o diretório (ex.: `.../public_html/bibleEdit.html`); o script está como `./js/tts.js`.
- **Erro SSL (handshake failure) ao "Ouvir":** o backend falha ao conectar ao GCP ou R2; em produção confira variáveis; em local pode ser proxy/Node. O front e o backend passaram a exibir mensagem genérica em vez do texto técnico.
- **500 ao clicar em "Ouvir (áudio)" em produção (Render):** abra no Render **Logs** e **Environment**. Confira: `GCP_PROJECT_ID`, `GCP_SERVICE_ACCOUNT_JSON_BASE64` (TTS); `TTS_R2_BUCKET` = `conectaking-pdfs`; `R2_PUBLIC_URL` = `https://tts.conectaking.com.br`; e que `R2_BUCKET` continua `kingselection` para o King Selection. O log do deploy mostrará a exceção exata (ex.: "R2 não configurado para TTS", falha GCP ou SSL).
- **Erro "EPROTO" / "ssl3 alert handshake failure" nos logs (TTS):** a conexão gRPC do Node com a API do Google falha em alguns hosts (ex.: Render). O código tenta **fallback automático via API REST**; se ainda assim falhar, defina no Render **GCP_TTS_USE_REST** = **1** para usar só REST e evitar gRPC.

Se quiser, na próxima mensagem você pode dizer em que passo parou (ex.: “criei a Service Account mas não sei onde colocar a variável no Render”) que eu te guio só naquela parte.
