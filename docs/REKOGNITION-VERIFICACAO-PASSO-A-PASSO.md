# Verificação passo a passo – Rekognition KingSelection

Use este guia para conferir se tudo está configurado corretamente.

---

## Parte 1: Render (variáveis de ambiente)

1. Acesse **dashboard.render.com** e abra o service **conectaking-api**.
2. Vá em **Environment** (menu lateral).
3. Confira se existem **estas 9 variáveis** com os valores corretos:

   | Variável | Valor esperado | ✓ |
   |----------|----------------|---|
   | `AWS_REGION` | `us-east-1` | |
   | `AWS_ACCESS_KEY_ID` | `AKIAVN2EHWJXYUL4NDMQ` (pode estar como Secret) | |
   | `AWS_SECRET_ACCESS_KEY` | (valor secreto, não visível) | |
   | `REKOG_COLLECTION_ID` | `kingselection` | |
   | `S3_STAGING_BUCKET` | `kingselection-rekog-staging` | |
   | `S3_STAGING_PREFIX` | `staging/` | |
   | `REKOG_FACE_MATCH_THRESHOLD` | `85` | |
   | `REKOG_MAX_FACES_PER_IMAGE` | `10` | |
   | `CACHE_TTL_SECONDS` | `2592000` | |

4. **Salve** se tiver alterado algo (Save, rebuild, and deploy).

**Se todas existem e os valores batem → Parte 1 OK.**

---

## Parte 2: AWS – Collection Rekognition

1. Acesse o **Console AWS** e selecione a região **us-east-1** (canto superior direito).
2. No busca, digite **Rekognition** e abra o serviço **Amazon Rekognition**.
3. No menu lateral, clique em **Collections** (ou "Use Amazon Rekognition" → Collections).
4. Verifique se existe uma collection com o nome **exato**: `kingselection`.

   - **Se existir** → anote que está OK.
   - **Se NÃO existir** → clique em **Create collection**, coloque o nome `kingselection`, região us-east-1, e crie.

**Se a collection `kingselection` existe em us-east-1 → Parte 2 OK.**

---

## Parte 3: AWS – Bucket S3 staging

1. No Console AWS (região **us-east-1**), abra o serviço **S3**.
2. Na lista de buckets, procure por **`kingselection-rekog-staging`**.

   - **Se NÃO existir**:
     - Clique em **Create bucket**.
     - Nome: `kingselection-rekog-staging`.
     - Região: **US East (N. Virginia) us-east-1**.
     - Em "Block Public Access", deixe **todas as opções marcadas** (bucket privado).
     - Crie o bucket.

3. Abra o bucket **kingselection-rekog-staging**.
4. Vá na aba **Management** (Gerenciamento).
5. Em **Lifecycle rules**, verifique se existe uma regra para o prefixo **`staging/`** expirando em **1 dia** (ou 24 horas).

   - **Se NÃO existir**:
     - Clique em **Create lifecycle rule**.
     - Nome da regra: ex. `expire-staging`.
     - Em "Choose a rule scope": **Limit the scope** → Prefix: `staging/`.
     - Em "Lifecycle rule actions": marque **Expire current versions of objects**.
     - Em "Days after object creation": coloque **1**.
     - Crie a regra.

**Se o bucket existe, está privado e a lifecycle em `staging/` está em 1 dia → Parte 3 OK.**

---

## Parte 4: AWS – Permissões do usuário IAM

1. No Console AWS, abra **IAM** (Identity and Access Management).
2. Menu lateral: **Users** → clique no usuário **king-rekognition**.
3. Aba **Permissions** (Permissões):
   - Deve haver uma **Policy** (inline ou anexada) que permita:
     - **Rekognition:** `rekognition:IndexFaces`, `rekognition:DetectFaces`, `rekognition:SearchFacesByImage`, e se for criar collection pelo código: `rekognition:CreateCollection`.
     - **S3:** no bucket `kingselection-rekog-staging`: `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket` (para o prefixo `staging/` se precisar listar).

4. Aba **Security credentials** (Credenciais de segurança):
   - Em **Access keys**, deve aparecer a chave **AKIAVN2EHWJXYUL4NDMQ** com status **Active**.

**Se o usuário tem as permissões de Rekognition e S3 e a chave está ativa → Parte 4 OK.**

---

## Parte 5: Resumo – Está tudo OK quando:

- [ ] **Render:** As 9 variáveis estão preenchidas no service conectaking-api.
- [ ] **Rekognition:** A collection `kingselection` existe em us-east-1.
- [ ] **S3:** O bucket `kingselection-rekog-staging` existe em us-east-1, está privado e tem lifecycle de 1 dia para `staging/`.
- [ ] **IAM:** O usuário king-rekognition tem permissões de Rekognition e S3 (bucket staging) e a Access Key está ativa.

Se todos os itens acima estiverem marcados, a configuração está pronta para a implementação do código (migrations, serviços e endpoints).
