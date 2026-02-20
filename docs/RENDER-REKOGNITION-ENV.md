# Configurar variáveis Rekognition no Render

No **Render**, vá no seu **Web Service** (backend) → **Environment** → **Environment Variables** e adicione as variáveis abaixo.

---

## Onde colocar no Render

1. Acesse [dashboard.render.com](https://dashboard.render.com).
2. Abra o **service** do seu backend (API).
3. Menu lateral: **Environment**.
4. Em **Environment Variables**, clique em **Add Environment Variable** e preencha **Key** e **Value** para cada linha abaixo.

---

## Tabela completa: Key → Value (preencher no Render)

| Key (nome) | Value (copie exatamente) |
|------------|-------------------------|
| `AWS_REGION` | `us-east-1` |
| `AWS_ACCESS_KEY_ID` | `AKIAVN2EHWJXYUL4NDMQ` |
| `AWS_SECRET_ACCESS_KEY` | *(cole aqui a chave secreta que você salvou ao criar a chave — só aparece uma vez na AWS)* |
| `REKOG_COLLECTION_ID` | `kingselection` |
| `S3_STAGING_BUCKET` | `kingselection-rekog-staging` |
| `S3_STAGING_PREFIX` | `staging/` |
| `REKOG_FACE_MATCH_THRESHOLD` | `85` |
| `REKOG_MAX_FACES_PER_IMAGE` | `10` |
| `CACHE_TTL_SECONDS` | `2592000` |

---

## Variáveis opcionais (já com valor sugerido na tabela acima)

- **S3_STAGING_PREFIX**, **REKOG_FACE_MATCH_THRESHOLD**, **REKOG_MAX_FACES_PER_IMAGE**, **CACHE_TTL_SECONDS**: se não quiser mudar nada, use os valores da tabela. O backend usa esses padrões quando a variável não existe.

---

## Dicas importantes

1. **Chave secreta (AWS_SECRET_ACCESS_KEY)**  
   A AWS só mostra a Secret Access Key **uma vez**, na tela “Recuperar chaves de acesso”. Se você **baixou o .csv** ou anotou na hora, use esse valor no Render. Se perdeu, crie uma **nova chave de acesso** no IAM (usuário `king-rekognition`) e use a nova Secret; a antiga não dá para recuperar.

2. **No Render: marque como Secret**  
   Ao criar `AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY`, use a opção **Secret** no campo Value. Assim o valor não fica visível nos logs nem na tela.

3. **Não coloque as chaves em código nem no Git**  
   Nunca commite `.env` ou arquivos com Access Key / Secret. Só no Render (Environment Variables).

4. **Região**  
   O usuário está em **us-east-1** (como na sua tela). Rekognition e o bucket S3 staging precisam estar na mesma região (`us-east-1`).

5. **Bucket S3**  
   Confirme que o bucket `kingselection-rekog-staging` foi criado em **us-east-1** e que o usuário IAM `king-rekognition` tem permissão de GetObject, PutObject e DeleteObject nesse bucket.

6. **Depois de salvar**  
   O Render faz redeploy automático. Se algo falhar, confira os logs do service e se todas as variáveis foram salvas (sem espaço antes/depois do valor).

---

## Resumo: copiar e colar os nomes (Key)

Para não errar o nome ao criar no Render, use exatamente estes **Keys**:

```
AWS_REGION
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
REKOG_COLLECTION_ID
S3_STAGING_BUCKET
S3_STAGING_PREFIX
REKOG_FACE_MATCH_THRESHOLD
REKOG_MAX_FACES_PER_IMAGE
CACHE_TTL_SECONDS
```

- **Valores sensíveis** (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`): no Render, ao adicionar a variável, use **"Secret"** para o Value, para não aparecer em texto claro.
- Depois de salvar, o Render faz **redeploy** automático; o backend passará a ler essas variáveis.

---

## SQS (só quando for usar fila + worker)

Quando a fila estiver implementada, adicione também:

| Key | Value |
|-----|--------|
| `SQS_QUEUE_URL` | URL da fila SQS (ex.: `https://sqs.us-east-1.amazonaws.com/123456789/kingselection-rekog-queue`) |
| `SQS_DLQ_URL` | URL da fila DLQ |
| `WORKER_CONCURRENCY` | `10` (ou outro número) |

Por enquanto pode deixar essas três de fora.
