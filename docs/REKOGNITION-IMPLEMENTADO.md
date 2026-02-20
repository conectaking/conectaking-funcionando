# Rekognition – O que foi implementado (Fase 1 + 2)

## Concluído

### 1. Migration 181
- **Arquivo:** `migrations/181_rekognition_tables.sql`
- **Tabelas:** `rekognition_client_faces`, `rekognition_photo_jobs`, `rekognition_photo_faces`, `rekognition_face_matches`, `rekognition_processing_cache`
- **Como rodar:** `npm run migrate` (ou o migration já roda no deploy; confira se a 181 foi aplicada no banco).

### 2. R2 (utils/r2.js)
- **r2HeadObject(key)** → `{ etag, contentLength, contentType }` para cache/ETag
- **r2ListObjectsV2(prefix, { maxKeys, continuationToken })** → listagem paginada

### 3. Serviços Rekognition (utils/rekognition/)
- **s3StagingService.js:** `getStagingConfig`, `buildStagingKey`, `putStagingObject`, `deleteStagingObject` (bucket AWS S3 staging em us-east-1)
- **rekognitionService.js:** `getRekogConfig`, `indexFacesFromS3`, `detectFacesFromS3`, `searchFacesByImageBytes`, `searchFacesByImageS3` (collection `kingselection`)
- **imageService.js:** `cropFace(buffer, boundingBox)`, `normalizeImageForRekognition(buffer)` (sharp)

### 4. Dependência
- **@aws-sdk/client-rekognition** adicionado em `package.json`

### 5. Endpoint de enroll
- **POST** `/api/king-selection/galleries/:id/clients/:clientId/enroll-face`
- **Auth:** JWT (protectUser)
- **Body:** `{ "referenceR2Key": "galleries/123/ref.jpg" }`
  - `referenceR2Key` = chave da foto no R2 (ex.: uma foto já enviada para a galeria ou upload em `galleries/<galleryId>/...`)
- **Fluxo:** Baixa imagem do R2 → normaliza tamanho → envia para S3 staging → IndexFaces (ExternalImageId = `g{galleryId}_c{clientId}`) → grava em `rekognition_client_faces` → remove do staging
- **Resposta:** `{ success: true, faceCount, faceIds }` ou erro (nenhum rosto, imagem não encontrada, etc.)

---

## Como testar o enroll

1. **Garantir:** Migration 181 aplicada; variáveis de ambiente no Render (AWS, S3_STAGING_BUCKET, REKOG_COLLECTION_ID); bucket **kingselection-rekog-staging** existe em us-east-1.

2. **Ter:** Uma galeria com um cliente (king_gallery_clients). Uma foto no R2 em `galleries/<galleryId>/alguma-foto.jpg` (pode ser uma foto já existente da galeria).

3. **Chamar a API:**
   ```http
   POST /api/king-selection/galleries/{galleryId}/clients/{clientId}/enroll-face
   Authorization: Bearer {seu_jwt_admin}
   Content-Type: application/json

   { "referenceR2Key": "galleries/123/minha-foto-ref.jpg" }
   ```
   Substitua `galleryId`, `clientId` e a chave R2 pela galeria, pelo cliente e pela foto de referência.

4. **Sucesso:** Resposta 200 com `faceCount` e `faceIds`. Os FaceIds ficam salvos em `rekognition_client_faces`.

---

## Próximos passos (não implementados ainda)

- **Match (uma foto):** Baixar foto do R2 → S3 staging → DetectFaces → para cada rosto: crop → SearchFacesByImage → salvar `rekognition_photo_faces` e `rekognition_face_matches`; cache por ETag.
- **Processar galeria:** Listar fotos no R2, enfileirar (SQS), worker processar em lote.
- **Endpoints:** GET status do processamento, GET resultados por cliente, GET foto com bounding boxes.
- **Frontend:** Tela “Cadastrar rosto” (upload + enroll), “Processar reconhecimento”, resultados.
