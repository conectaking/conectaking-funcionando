# Rekognition KingSelection – Estado atual e escopo da implementação

Documento de referência: o que já está funcionando, o que a IA **não** deve fazer e o que **deve** implementar.

---

## 1. O que já está 100% funcionando (comprovado)

- **Região AWS:** `us-east-1` (N. Virginia)
- **Rekognition:**
  - Collection criada: **`kingselection`**
  - `create-collection` e `list-collections` retornaram sucesso (StatusCode 200)
- **S3 (usado nos testes):**
  - Bucket de **teste**: `kingselection-images` (fotos de teste enviadas; **não** é o bucket de produção)
  - Em **produção** usaremos o bucket **staging**: `kingselection-rekog-staging` (ponte temporária R2 → Rekognition)
- **Indexação facial (ENROLL):** `index-faces` funcionando; retornou FaceId, ExternalImageId (ex.: `cliente1`), Confidence ~99.99%
- **Busca facial (MATCH):** `search-faces-by-image` funcionando; Similarity ~99.99–100%, match com ExternalImageId

**Conclusão:** Rekognition + S3 + permissões + região estão corretos. Não é necessário criar collection nem “testar se Rekognition funciona”.

---

## 2. Arquitetura final (decisão)

| Camada | Onde | Uso |
|--------|------|-----|
| **Fotos oficiais** | **Cloudflare R2** | Storage principal (já usado no KingSelection: `galleries/<id>/...`) |
| **Reconhecimento** | **AWS Rekognition** | IndexFaces (enroll), DetectFaces, SearchFacesByImage (match) |
| **Ponte** | **S3 staging temporário** | Backend copia a foto do R2 → S3 staging → Rekognition lê do S3 staging |

**Fluxo em produção:**

1. Fotos ficam no **R2**.
2. Backend **copia** a foto do R2 para o bucket S3 **`kingselection-rekog-staging`** (chave temporária, ex.: `staging/<eventId>/<hash>.jpg`).
3. Rekognition lê do S3 staging e executa:
   - **IndexFaces** (cadastrar rosto do cliente – enroll)
   - **DetectFaces** + **SearchFacesByImage** (reconhecer em foto do evento – match)
4. Backend salva resultados no **banco** (tabelas `rekognition_*`) e **cache por ETag** (para não reprocessar e não pagar de novo).
5. Objetos no S3 staging são **apagados** após o uso ou **expiram** via lifecycle (ex.: 1 dia).

---

## 3. O que a implementação NÃO deve fazer

- **Não** criar a collection Rekognition (já existe: `kingselection`). O código pode chamar `CreateCollection` só se quiser “create if not exists”; caso contrário, usar a existente.
- **Não** criar o bucket `kingselection-images` (foi só para testes manuais).
- **Não** “testar se Rekognition funciona” (já foi validado via CLI/CloudShell).
- **Não** depender da aba “Collections” no console (pode bugar; CLI/SDK funcionam).

---

## 4. O que a implementação DEVE fazer

### 4.1 Infra e dados
- **Migration:** tabelas `rekognition_client_faces`, `rekognition_photo_jobs`, `rekognition_photo_faces`, `rekognition_face_matches`, `rekognition_processing_cache`.
- **Bucket S3 em produção:** usar **`kingselection-rekog-staging`** (variável `S3_STAGING_BUCKET`), com prefixo `staging/` e lifecycle de 1 dia (configurado na AWS).

### 4.2 Serviços (backend)
- **R2:** obter buffer/stream da foto por key; `headObject` para ETag (cache).
- **S3 staging:** `putObject` (copiar R2 → S3), `deleteObject` (limpar após uso); `buildStagingKey(eventId, r2Key, variant)`.
- **Rekognition (SDK v3):** `IndexFaces` (S3Object do staging), `DetectFaces` (S3Object), `SearchFacesByImage` (S3Object ou Bytes do recorte).
- **Imagem:** crop do rosto com **sharp** a partir do bounding box retornado pelo DetectFaces (para SearchFacesByImage por face).

### 4.3 Fluxos
- **Enroll:** cliente envia referência (foto no R2) → backend copia para S3 staging → IndexFaces com `ExternalImageId` = clientId (ex.: `king_gallery_clients.id` ou composto) → salvar FaceId(s) em `rekognition_client_faces` → apagar objeto do staging.
- **Match (uma foto):** foto no R2 → copiar para S3 staging → DetectFaces → para cada face: crop (sharp) → SearchFacesByImage (bytes ou S3) → salvar `rekognition_photo_faces` + `rekognition_face_matches` → cache por ETag → apagar staging.
- **Cache:** antes de chamar Rekognition, verificar cache por chave `match:<eventId>:<r2Key>:<etag>:t<THRESHOLD>:m<MAXFACES>`; TTL 30 dias; evitar reprocessar foto já com `process_status = done`.

### 4.4 Escala e fila (depois)
- Listar fotos no R2 (prefix do evento/galeria) com paginação.
- Enfileirar (SQS) mensagens `{ eventId/galleryId, r2Key }`.
- Worker: consumir fila, para cada mensagem executar o fluxo de match (com cache), retry e DLQ.

### 4.5 Boas práticas já definidas
- **Cache/idempotência:** ETag do R2 no cacheKey; se ETag igual, não reprocessar.
- **Multi-face:** DetectFaces → um recorte por face → SearchFacesByImage por rosto.
- **Segurança:** JWT nos endpoints; validar que a galeria pertence ao usuário; não logar credenciais.

---

## 5. Configuração atual (variáveis e recursos)

- **Render:** `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `REKOG_COLLECTION_ID=kingselection`, `S3_STAGING_BUCKET=kingselection-rekog-staging`, `S3_STAGING_PREFIX=staging/`, threshold, max faces, cache TTL.
- **Rekognition:** collection **kingselection** em **us-east-1** (já criada e testada).
- **S3 staging (produção):** bucket **kingselection-rekog-staging** em us-east-1 (criar se ainda não existir; lifecycle 1 dia em `staging/`).
- **R2:** já configurado no projeto (fotos das galerias).

---

## 6. Comandos de referência (CLI – só consulta)

```bash
# Collection (já existe)
aws rekognition list-collections --region us-east-1

# Enroll (exemplo com S3)
aws rekognition index-faces \
  --collection-id kingselection \
  --image "S3Object={Bucket=kingselection-rekog-staging,Name=staging/xxx.jpg}" \
  --external-image-id cliente1 \
  --region us-east-1

# Match (exemplo com S3)
aws rekognition search-faces-by-image \
  --collection-id kingselection \
  --image "S3Object={Bucket=kingselection-rekog-staging,Name=staging/yyy.jpg}" \
  --face-match-threshold 85 \
  --max-faces 5 \
  --region us-east-1
```

Em produção o backend usará o **SDK** (Node.js), não o CLI; o bucket será **kingselection-rekog-staging** com chaves temporárias geradas pelo backend.

---

**Resumo:** Implementar no backend do KingSelection o fluxo R2 → S3 staging (`kingselection-rekog-staging`) → Rekognition (collection `kingselection`), com migrations, serviços, cache por ETag e endpoints de enroll + match; fila/worker em fase posterior. Não criar collection nem bucket de teste; não revalidar Rekognition.
