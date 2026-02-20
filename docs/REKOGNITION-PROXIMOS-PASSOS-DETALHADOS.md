# Rekognition – Próximos passos (detalhados)

Ordem sugerida para continuar após a Fase 1 + 2 (enroll já implementado).

---

## Passo 1 – Match de uma foto (reconhecer rostos em uma imagem)

**Objetivo:** Dada uma foto da galeria no R2, detectar rostos e ver quais clientes foram reconhecidos.

**O que fazer:**
1. Endpoint **POST** `/api/king-selection/galleries/:id/photos/:photoId/process-faces` (ou similar).
2. Fluxo:
   - Validar galeria (protectUser + dono da galeria).
   - Obter `king_photos` por `photoId` e extrair R2 key de `file_path`.
   - **Cache:** `r2HeadObject(r2Key)` → ETag. Montar `cacheKey = "match:" + galleryId + ":" + r2Key + ":" + etag + ":t" + threshold + ":m" + maxFaces`. Consultar `rekognition_processing_cache` onde `cache_key = cacheKey` e `expires_at > NOW()`. Se existir, retornar `payload_json` e não chamar Rekognition.
   - Baixar imagem do R2 (buffer).
   - Colocar no S3 staging (buildStagingKey + putStagingObject).
   - Chamar **DetectFaces** (rekognitionService.detectFacesFromS3).
   - Para cada face em `FaceDetails`: usar **cropFace(buffer, face.BoundingBox)** → **searchFacesByImageBytes(cropBuffer)**.
   - Para cada match: inserir em `rekognition_photo_faces` (photo_id, face_index, bounding_box_json, confidence) e em `rekognition_face_matches` (photo_face_id, client_id extraído do ExternalImageId do match, similarity).
   - Gravar resultado em `rekognition_processing_cache` (cache_key, payload_json, expires_at = NOW() + CACHE_TTL).
   - Opcional: criar/atualizar `rekognition_photo_jobs` (gallery_id, photo_id, r2_key, r2_etag, process_status = 'done', processed_at).
   - Remover objeto do S3 staging.
3. Resposta: `{ success: true, faceCount, matches: [...] }` ou uso do cache.

**Dependências:** Nenhuma além do que já existe (R2, S3 staging, Rekognition, imageService.cropFace).

---

## Passo 2 – Status e resultados (endpoints de consulta)

**Objetivo:** Frontend ou admin poder ver progresso e listar onde cada cliente apareceu.

**O que fazer:**
1. **GET** `/api/king-selection/galleries/:id/face-process-status`  
   - Retornar contagens: fotos pendentes, processadas, com erro; totais de rostos e matches (a partir de `rekognition_photo_jobs` e das tabelas de faces/matches).
2. **GET** `/api/king-selection/galleries/:id/face-results?clientId=&page=&limit=`  
   - Listar fotos em que o cliente foi reconhecido (via `rekognition_face_matches` + `rekognition_photo_faces` + `king_photos`), com paginação.
3. **GET** `/api/king-selection/galleries/:id/photos/:photoId/face-detail`  
   - Detalhes da foto: bounding boxes dos rostos e, para cada um, lista de clientes reconhecidos (similarity).

**Dependências:** Passo 1 (match) gerando dados em `rekognition_photo_faces` e `rekognition_face_matches`.

---

## Passo 3 – Processar galeria inteira (sem fila, síncrono simples)

**Objetivo:** Disparar o processamento de todas as fotos da galeria em uma única requisição (útil para galerias pequenas/médias).

**O que fazer:**
1. **POST** `/api/king-selection/galleries/:id/process-all-faces`  
   - Listar todas as fotos da galeria (king_photos com file_path R2).
   - Para cada foto: chamar a mesma lógica do Passo 1 (match), em sequência (ou com concorrência limitada, ex.: 3 em paralelo).
   - Retornar resumo: total de fotos, processadas, com erro, tempo aproximado.

**Dependências:** Passo 1 implementado (função de match reutilizável).

**Limitação:** Para galerias muito grandes (centenas/milhares de fotos), a requisição pode estourar timeout. Aí entra o Passo 4.

---

## Passo 4 – Fila (SQS) + worker (processamento em background)

**Objetivo:** Escalar para muitas fotos sem travar a API.

**O que fazer:**
1. **AWS:** Criar fila SQS (ex.: `kingselection-rekog-queue`) e DLQ; configurar env vars no Render: `SQS_QUEUE_URL`, `SQS_DLQ_URL`, `WORKER_CONCURRENCY`.
2. **POST** `/api/king-selection/galleries/:id/process-faces` (ou manter o nome do Passo 3 e renomear o síncrono):  
   - Listar fotos no R2 (prefix `galleries/<galleryId>/`) com paginação (r2ListObjectsV2).  
   - Para cada foto: criar/atualizar `rekognition_photo_jobs` (status pending) e enviar mensagem SQS `{ galleryId, r2Key, photoId }`.
   - Resposta imediata: `{ success: true, queued: N }`.
3. **Worker** (script ou processo separado, ex.: `workers/rekognition-worker.js`):  
   - Consumir mensagens da fila (concorrência = WORKER_CONCURRENCY).  
   - Para cada mensagem: executar o mesmo fluxo de match do Passo 1 (incluindo cache por ETag).  
   - Em sucesso: marcar job como done; em falha: retry com backoff e, após N tentativas, enviar para DLQ.

**Dependências:** Passo 1; conta AWS com SQS criada; variáveis de ambiente.

---

## Passo 5 – Frontend (telas no painel KingSelection)

**Objetivo:** Usuário fazer tudo pelo painel, sem chamar API manualmente.

**O que fazer:**
1. **Clientes da galeria:** Botão “Cadastrar rosto” por cliente; upload de foto (para R2, ex.: mesmo fluxo de upload da galeria) e chamada a `POST .../enroll-face` com a `referenceR2Key` retornada.
2. **Galeria:** Botão “Processar reconhecimento” que chama o endpoint de processar galeria (Passo 3 ou 4); exibir barra de progresso ou “Processando… X/Y” (usando GET status do Passo 2).
3. **Resultados:** Aba ou tela “Reconhecimento” com lista de clientes e quantas fotos cada um aparece; ao clicar no cliente, galeria filtrada (usando GET face-results do Passo 2).

**Dependências:** Passos 1, 2 e 3 (ou 4) implementados.

---

## Resumo em ordem

| # | Passo | Entrega principal |
|---|--------|--------------------|
| 1 | Match de uma foto | Endpoint que processa uma foto (DetectFaces + SearchFaces por rosto + cache ETag + salvar em photo_faces e face_matches). |
| 2 | Status e resultados | GET status, GET face-results, GET photo face-detail. |
| 3 | Processar galeria (síncrono) | POST process-all-faces: percorre fotos e chama a lógica do match. |
| 4 | Fila + worker | SQS + worker para enfileirar e processar em background; POST que enfileira, GET status refletindo jobs. |
| 5 | Frontend | Telas: cadastrar rosto, processar reconhecimento, ver resultados por cliente. |

Recomendação: implementar **Passo 1** em seguida (match + cache); depois **Passo 2** para consultar; em seguida **Passo 3** ou **4** conforme o tamanho das galerias.
