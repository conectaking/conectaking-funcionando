# Plano: Reconhecimento facial no KingSelection (AWS Rekognition)

## O que o prompt pede vs o que o repo já tem

| Item | Prompt | Repo atual | Ação |
|------|--------|------------|------|
| Storage fotos | R2 (principal) | ✅ R2 em `utils/r2.js`, prefix `galleries/` | Reusar; adicionar `headObject` e listagem paginada se necessário |
| Reconhecimento | AWS Rekognition | ❌ | Implementar (collection `kingselection`, us-east-1) |
| Ponte para Rekognition | S3 staging temporário | ❌ | Criar bucket `kingselection-rekog-staging` + serviço |
| Banco | Postgres | ✅ `db.js` + raw SQL, migrações em `migrations/` | Novas tabelas via migration |
| ORM | “Prisma se não houver” | Raw SQL (pg) | Manter raw SQL |
| Fila | SQS (ou Bull/Redis se existir) | Nenhum | Introduzir **AWS SQS** + worker |
| Sharp | crop/normalize | ✅ Já usado em `kingSelection.routes.js` | Reusar para crop de rostos |
| Auth | JWT | ✅ `protectUser` + `requireClient` | Reusar; endpoints admin = protectUser |

---

## Adaptação ao KingSelection existente

- **Clientes**: Usar **king_gallery_clients** como base. Cada “cliente” é um cliente de uma galeria. Para Rekognition precisamos de:
  - **Cadastro de rosto (enroll)**: por cliente da galeria (ou um “cliente global” se quiser reconhecer entre galerias). O prompt fala em `ExternalImageId = clientId` → podemos usar `king_gallery_clients.id` (ou um ID composto `galleryId_clientId`).
- **Eventos**: No prompt, “evento” = conjunto de fotos em R2 em `events/<eventId>/`. No repo, o que mais se aproxima é uma **galeria** (fotos em R2 em `galleries/<galleryId>/...`). Duas opções:
  - **Opção A**: Tratar cada **galeria** como um “evento” de reconhecimento: prefix R2 = `galleries/<galleryId>/`, e as fotos da galeria são as que serão analisadas.
  - **Opção B**: Criar entidade **event** separada (tabela `rekognition_events`) com `r2_prefix` (ex: `events/123/`) e opcionalmente `gallery_id` para amarrar a uma galeria. Mais flexível para “eventos” que não são só uma galeria.

Recomendação inicial: **Opção A** (galeria = evento) para menos tabelas e integração direta com o fluxo atual. Se depois precisar de eventos independentes, criamos `rekognition_events`.

- **Fotos**: Hoje `king_photos` tem `file_path` (ex: `r2:galleries/123/xyz.jpg`). Para “processamento Rekognition” podemos:
  - Criar tabela **rekognition_photo_jobs** (ou similar): `photo_id` (FK king_photos), `etag`, `process_status`, `processed_at`, etc., e tabelas **rekognition_photo_faces** e **rekognition_face_matches** para rostos e matches.

Nomes sugeridos para não misturar com lógica atual: prefixo **rekognition_** nas tabelas novas.

---

## O que você já configurou na AWS

Você disse que já configurou no Amazon o reconhecimento facial. Assumindo:

- Collection Rekognition: **kingselection** (us-east-1)
- Região: **us-east-1**

Ainda precisamos que você confirme/crie:

1. **Bucket S3 staging**
   - Nome: `kingselection-rekog-staging` (us-east-1).
   - Lifecycle: expirar objetos em `staging/` após 1 dia.
   - Sem acesso público.
   - IAM: usuário/role do backend com `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` nesse bucket.

2. **Credenciais AWS**
   - Para o backend (Render ou onde rodar): `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (ou role IAM se for EC2/ECS).
   - Permissões necessárias:
     - Rekognition: `rekognition:IndexFaces`, `rekognition:DetectFaces`, `rekognition:SearchFacesByImage`, `rekognition:DeleteFaces` (e criar collection se ainda não existir).
     - S3 (só staging): `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject` no bucket `kingselection-rekog-staging`.

3. **SQS (quando formos fazer fila)**
   - Fila principal (ex: `kingselection-rekog-queue`) e DLQ (ex: `kingselection-rekog-dlq`).
   - IAM: `sqs:SendMessage`, `sqs:ReceiveMessage`, `sqs:DeleteMessage`, `sqs:GetQueueAttributes` nas duas filas.

Não precisa me enviar as chaves aqui; basta garantir que essas variáveis/permissões existam no ambiente onde o backend e o worker rodam.

---

## O que falta fazer (checklist)

### Fase 1 – Infra e dados
- [ ] Criar bucket S3 `kingselection-rekog-staging` + lifecycle 1 dia (você na AWS).
- [ ] Variáveis de ambiente (ver `.env.example` na raiz ou em `docs/`).
- [ ] Migration: tabelas `rekognition_client_faces`, `rekognition_photo_jobs`, `rekognition_photo_faces`, `rekognition_face_matches`, `rekognition_processing_cache` (e, se usar Opção B, `rekognition_events`).

### Fase 2 – Serviços (backend)
- [ ] **r2Service** (ou estender `utils/r2.js`): `headObject(key)` → etag/size; `listObjects(prefix, continuationToken)` paginado.
- [ ] **s3StagingService**: putObject, deleteObject, `buildStagingKey(eventId, r2Key, variant)`.
- [ ] **rekognitionService**: indexFacesFromS3, detectFacesFromS3, searchFacesByImageBytes (SDK v3: `@aws-sdk/client-rekognition`).
- [ ] **imageService**: cropFace(buffer, boundingBox) com sharp; normalização opcional.

### Fase 3 – Fluxos principais
- [ ] **Enroll**: POST `/api/king-selection/galleries/:galleryId/clients/:clientId/enroll-face` (ou similar). Body: referência à foto no R2 (ex: `referenceR2Key`). Backend: copiar R2 → S3 staging → IndexFaces (ExternalImageId = clientId) → salvar faceId em `rekognition_client_faces` → limpar staging.
- [ ] **Match (uma foto)**: lógica “foto do evento”: baixar do R2 → staging → DetectFaces → para cada rosto: crop → SearchFacesByImage (bytes) → salvar photo_faces + face_matches. Com cache por ETag (cacheKey + TTL 30 dias).
- [ ] **Processar galeria (evento)**: POST `/api/king-selection/galleries/:id/process-faces`: listar fotos da galeria no R2, criar jobs (pending), enviar mensagens SQS; worker processa com concorrência configurável, retry e DLQ.

### Fase 4 – Fila e worker
- [ ] Configurar SQS (URL da fila + DLQ) e env vars.
- [ ] Worker (script ou processo separado): consome SQS, para cada mensagem { galleryId, r2Key }: head R2 → cache? → baixar → staging → detect → crop → search → salvar → marcar done → apagar staging.
- [ ] Endpoint de status: GET `/api/king-selection/galleries/:id/face-process-status` (pending/done/error, contagens).
- [ ] Endpoints de resultado: GET resultados por cliente, GET fotos com bounding boxes (como no prompt).

### Fase 5 – Segurança e custo
- [ ] Cache obrigatório por ETag (cacheKey com eventId, r2Key, etag, threshold, maxFaces); TTL 30 dias; evitar reprocessar foto já com `process_status = done`.
- [ ] JWT em todos os endpoints admin; validar que a galeria pertence ao usuário/tenant.
- [ ] Rate limit em enroll e process (já existe kingSelectionLimiter; ajustar se necessário).
- [ ] Logs estruturados (correlationId); sem logar credenciais.

### Fase 6 – Frontend (simples)
- [ ] Tela/aba: clientes da galeria + “Cadastrar rosto” (upload referência → R2 → chamar enroll).
- [ ] Tela/aba: “Processar reconhecimento” na galeria + barra de progresso.
- [ ] Tela: resultados por cliente (quantas fotos aparecem) + galeria filtrada.

---

## O que preciso de você agora

1. **Confirmar ambiente AWS**
   - Collection Rekognition já existe e se chama exatamente `kingselection`?
   - Região é `us-east-1`?

2. **Bucket S3 staging**
   - Você já criou o bucket `kingselection-rekog-staging` em us-east-1?
   - Se sim, confirma o nome exato. Se não, crie e configure o lifecycle (1 dia em `staging/`).

3. **Credenciais**
   - As env vars `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (e `AWS_REGION=us-east-1`) já estão no ambiente do backend (ex: Render)? Só preciso que existam; não envie os valores no chat.

4. **SQS**
   - Para a Fase 4: você prefere que eu te passe o nome sugerido das filas e você cria (e me informa as URLs), ou quer que o código/documentação descreva a criação via Terraform/CloudFormation/CLI?

5. **Escopo inicial**
   - Quer que eu implemente já a **Fase 1 + Fase 2** (migrations + serviços R2/S3/Rekognition/image) e um endpoint de teste (ex: enroll de um cliente ou match de uma foto), para você testar com uma foto manual? Assim você valida Rekognition + S3 staging antes de ligar a fila.

Responda com: (1) confirmação da collection/região, (2) nome do bucket staging (ou “ainda não criei”), (3) se credenciais já estão no backend, (4) preferência SQS, (5) se devo seguir com Fase 1+2 + endpoint de teste. Com isso sigo na implementação na estrutura atual do repo (rotas em `routes/kingSelection.routes.js` ou módulo `rekognition`, migrações em `migrations/`, serviços em `utils/` ou `services/`).
