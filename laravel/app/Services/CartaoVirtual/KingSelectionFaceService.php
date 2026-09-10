<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * KS face — enroll + listagem (Rekognition IndexFaces com Bytes).
 */
class KingSelectionFaceService
{
    public function __construct(
        private readonly KingSelectionMediaService $media,
        private readonly R2StorageService $r2,
    ) {
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function enrolledFaces(string $userId, int $galleryId): array
    {
        if ($galleryId < 1) {
            return ['status' => 400, 'body' => ['message' => 'galleryId inválido.']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão.']];
        }
        if (! Schema::hasTable('rekognition_client_faces')) {
            return ['status' => 200, 'body' => ['success' => true, 'clientIds' => []]];
        }
        $rows = DB::select(
            'SELECT DISTINCT client_id FROM rekognition_client_faces WHERE gallery_id = ?',
            [$galleryId]
        );
        $ids = array_map(static fn ($r) => (int) $r->client_id, $rows);

        return ['status' => 200, 'body' => ['success' => true, 'clientIds' => $ids]];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function enrollFace(string $userId, int $galleryId, int $clientId, array $body): array
    {
        if ($galleryId < 1 || $clientId < 1) {
            return ['status' => 400, 'body' => ['message' => 'galleryId e clientId são obrigatórios.']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão.']];
        }
        $cfg = $this->rekogConfig();
        if (! $cfg['enabled']) {
            return ['status' => 503, 'body' => ['message' => 'Reconhecimento facial não configurado (AWS).']];
        }
        $r2Key = trim((string) ($body['referenceR2Key'] ?? $body['reference_r2_key'] ?? ''));
        $r2Key = preg_replace('#^/+#', '', $r2Key) ?: '';
        if (str_starts_with(strtolower($r2Key), 'r2:')) {
            $r2Key = substr($r2Key, 3);
        }
        if ($r2Key === '' || ! str_starts_with($r2Key, 'galleries/')) {
            return ['status' => 400, 'body' => ['message' => 'referenceR2Key deve ser uma chave R2 válida (ex: galleries/123/ref.jpg).']];
        }
        if (! Schema::hasTable('king_gallery_clients')) {
            return ['status' => 500, 'body' => ['message' => 'Tabela de clientes não disponível.']];
        }
        $clientRow = DB::selectOne(
            'SELECT id FROM king_gallery_clients WHERE gallery_id = ? AND id = ? AND enabled IS DISTINCT FROM false LIMIT 1',
            [$galleryId, $clientId]
        );
        if (! $clientRow) {
            return ['status' => 404, 'body' => ['message' => 'Cliente não encontrado ou desativado.']];
        }

        $buf = $this->media->bufferFromStoragePath('r2:'.$r2Key);
        if ($buf === null || $buf === '') {
            return ['status' => 400, 'body' => ['message' => 'Não foi possível obter a imagem do R2. Verifique a chave.']];
        }
        $jpeg = $this->normalizeJpeg($buf);
        if ($jpeg === null) {
            return ['status' => 400, 'body' => ['message' => 'Imagem inválida para Rekognition.']];
        }

        $externalImageId = 'g'.$galleryId.'_c'.$clientId;
        try {
            $indexResult = $this->indexFacesBytes($jpeg, $externalImageId, $cfg);
        } catch (\Throwable $e) {
            Log::error('ks.face.enroll', ['error' => $e->getMessage()]);

            return ['status' => 502, 'body' => ['message' => 'Falha no Rekognition: '.$e->getMessage()]];
        }

        $faceRecords = $indexResult['FaceRecords'] ?? [];
        if (! is_array($faceRecords) || $faceRecords === []) {
            return ['status' => 400, 'body' => [
                'message' => 'Nenhum rosto detectado na imagem. Use uma foto com o rosto visível.',
                'UnindexedFaces' => $indexResult['UnindexedFaces'] ?? [],
            ]];
        }

        if (! Schema::hasTable('rekognition_client_faces')) {
            return ['status' => 200, 'body' => [
                'success' => true,
                'message' => 'Rosto indexado no Rekognition. Tabela rekognition_client_faces não existe (rode a migration 181).',
                'faceCount' => count($faceRecords),
                'faceIds' => array_values(array_filter(array_map(
                    static fn ($r) => $r['Face']['FaceId'] ?? null,
                    $faceRecords
                ))),
            ]];
        }

        $faceIds = [];
        foreach ($faceRecords as $rec) {
            $faceId = $rec['Face']['FaceId'] ?? null;
            $imageId = $rec['Face']['ImageId'] ?? null;
            if (! $faceId) {
                continue;
            }
            $faceIds[] = $faceId;
            DB::statement(
                'INSERT INTO rekognition_client_faces (gallery_id, client_id, face_id, image_id, reference_r2_key)
                 VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT (gallery_id, client_id, face_id)
                 DO UPDATE SET image_id = EXCLUDED.image_id, reference_r2_key = EXCLUDED.reference_r2_key',
                [$galleryId, $clientId, $faceId, $imageId, $r2Key]
            );
        }

        return ['status' => 200, 'body' => [
            'success' => true,
            'message' => 'Rosto(s) cadastrado(s) com sucesso.',
            'faceCount' => count($faceIds),
            'faceIds' => $faceIds,
        ]];
    }

    /**
     * Cliente: selfie → IndexFaces (Bytes). Reprocessamento em massa da galeria continua no Node se necessário.
     *
     * @param  array<string,mixed>  $payload
     * @return array{status:int, body:array<string,mixed>}
     */
    public function enrollClientFaceImage(array $payload, string $binary): array
    {
        if ($binary === '') {
            return ['status' => 400, 'body' => ['message' => 'Nenhuma imagem enviada.']];
        }
        $cfg = $this->rekogConfig();
        if (! $cfg['enabled']) {
            return ['status' => 503, 'body' => ['message' => 'Reconhecimento facial não configurado no servidor.']];
        }
        $galleryId = (int) ($payload['galleryId'] ?? 0);
        $ctx = \App\Support\KingSelection\KsAccess::parseClientContext($payload);
        $clientId = (int) ($ctx['cid'] ?? 0);
        if ($galleryId < 1 || $clientId < 1) {
            return ['status' => 403, 'body' => [
                'message' => 'Cadastro de rosto requer acesso individual ou uma única ficha de visitante nesta galeria.',
            ]];
        }
        if (Schema::hasColumn('king_galleries', 'face_recognition_enabled')) {
            $ge = DB::selectOne('SELECT face_recognition_enabled FROM king_galleries WHERE id = ? LIMIT 1', [$galleryId]);
            if ($ge && empty($ge->face_recognition_enabled)) {
                return ['status' => 403, 'body' => ['message' => 'Reconhecimento facial está desativado nesta galeria.']];
            }
        }
        $jpeg = $this->normalizeJpeg($binary);
        if ($jpeg === null) {
            return ['status' => 400, 'body' => [
                'message' => 'Não encontramos um rosto nítido nesta imagem. Tire uma selfie com boa luz, rosto de frente e sem óculos escuros ou boné.',
            ]];
        }
        $externalImageId = 'g'.$galleryId.'_c'.$clientId;
        try {
            $indexResult = $this->indexFacesBytes($jpeg, $externalImageId, $cfg);
        } catch (\Throwable $e) {
            Log::error('ks.face.clientEnroll', ['error' => $e->getMessage()]);

            return ['status' => 502, 'body' => ['message' => 'Falha no Rekognition.']];
        }
        $faceRecords = $indexResult['FaceRecords'] ?? [];
        if (! is_array($faceRecords) || $faceRecords === []) {
            return ['status' => 400, 'body' => ['message' => 'Nenhum rosto detectado na foto. Tente uma selfie mais nítida.']];
        }
        if (Schema::hasTable('rekognition_client_faces')) {
            DB::delete('DELETE FROM rekognition_client_faces WHERE gallery_id = ? AND client_id = ?', [$galleryId, $clientId]);
            foreach ($faceRecords as $rec) {
                $faceId = $rec['Face']['FaceId'] ?? null;
                if (! $faceId) {
                    continue;
                }
                DB::insert(
                    'INSERT INTO rekognition_client_faces (gallery_id, client_id, face_id, image_id, reference_r2_key)
                     VALUES (?, ?, ?, ?, ?)',
                    [$galleryId, $clientId, $faceId, $rec['Face']['ImageId'] ?? null, 'upload-manual']
                );
            }
        }

        return ['status' => 200, 'body' => [
            'success' => true,
            'message' => 'Rosto cadastrado com sucesso! Se a galeria usa indexação em massa, o processamento completo pode continuar em segundo plano no servidor.',
            'faceCount' => count($faceRecords),
        ]];
    }

    /**
     * Público: enroll anônimo (galeria access_mode=public) → guest client + IndexFaces + JWT.
     *
     * @return array{status:int, body:array<string,mixed>}
     */
    public function enrollFaceAnonymous(string $slug, string $binary, ?string $visitorId = null): array
    {
        $slug = trim($slug);
        if ($slug === '') {
            return ['status' => 400, 'body' => ['message' => 'Slug é obrigatório.']];
        }
        if ($binary === '') {
            return ['status' => 400, 'body' => ['message' => 'Nenhuma imagem enviada.']];
        }
        $cfg = $this->rekogConfig();
        if (! $cfg['enabled']) {
            return ['status' => 503, 'body' => ['message' => 'Reconhecimento facial não configurado no servidor.']];
        }
        if (! Schema::hasTable('rekognition_client_faces')) {
            return ['status' => 503, 'body' => [
                'message' => 'Reconhecimento facial não está disponível. Execute as migrations do banco (rekognition) no servidor.',
            ]];
        }
        $g = DB::selectOne('SELECT id, slug, access_mode FROM king_galleries WHERE slug = ? LIMIT 1', [$slug]);
        if (! $g) {
            return ['status' => 404, 'body' => ['message' => 'Galeria não encontrada.']];
        }
        $accessMode = \App\Support\KingSelection\KsAccess::normAccessMode($g->access_mode ?? null);
        if ($accessMode !== 'public') {
            return ['status' => 403, 'body' => ['message' => 'Esta galeria não é pública. Use o login normal.']];
        }
        $galleryId = (int) $g->id;
        $visitorId = trim((string) ($visitorId ?: ''));
        if ($visitorId === '') {
            $visitorId = bin2hex(random_bytes(16));
        }
        $guestEmail = 'guest_'.$visitorId.'@guest.com';
        $guest = DB::selectOne(
            'SELECT id FROM king_gallery_clients WHERE gallery_id = ? AND email = ? LIMIT 1',
            [$galleryId, $guestEmail]
        );
        if ($guest) {
            $clientId = (int) $guest->id;
        } else {
            $placeholderPass = bin2hex(random_bytes(16));
            $clientId = (int) DB::selectOne(
                'INSERT INTO king_gallery_clients (gallery_id, nome, email, senha_hash, enabled, created_at, updated_at)
                 VALUES (?, ?, ?, ?, TRUE, NOW(), NOW()) RETURNING id',
                [$galleryId, 'Visitante', $guestEmail, $placeholderPass]
            )->id;
        }
        $jpeg = $this->normalizeJpeg($binary);
        if ($jpeg === null) {
            return ['status' => 400, 'body' => ['message' => 'Imagem inválida ou corrompida. Tente outra foto.']];
        }
        $externalImageId = 'g'.$galleryId.'_c'.$clientId;
        try {
            $indexResult = $this->indexFacesBytes($jpeg, $externalImageId, $cfg);
        } catch (\Throwable $e) {
            Log::error('ks.face.anonEnroll', ['error' => $e->getMessage()]);

            return ['status' => 503, 'body' => [
                'message' => 'Serviço de reconhecimento facial temporariamente indisponível. Verifique no servidor: AWS Rekognition e coleção.',
            ]];
        }
        $faceRecords = $indexResult['FaceRecords'] ?? [];
        if (! is_array($faceRecords) || $faceRecords === []) {
            return ['status' => 400, 'body' => ['message' => 'Rosto não detectado na imagem. Tente uma foto mais clara.']];
        }
        if (Schema::hasTable('rekognition_processing_cache')) {
            DB::delete(
                'DELETE FROM rekognition_processing_cache WHERE cache_key LIKE ?',
                ['search:'.$galleryId.':'.$clientId.':%']
            );
        }
        if (Schema::hasTable('rekognition_face_matches') && Schema::hasTable('rekognition_photo_faces')) {
            DB::delete(
                'DELETE FROM rekognition_face_matches
                 WHERE client_id = ?
                   AND photo_face_id IN (
                     SELECT rpf.id FROM rekognition_photo_faces rpf
                     JOIN king_photos kp ON kp.id = rpf.photo_id
                     WHERE kp.gallery_id = ?
                   )',
                [$clientId, $galleryId]
            );
        }
        DB::delete('DELETE FROM rekognition_client_faces WHERE gallery_id = ? AND client_id = ?', [$galleryId, $clientId]);
        foreach ($faceRecords as $rec) {
            $faceId = $rec['Face']['FaceId'] ?? null;
            if (! $faceId) {
                continue;
            }
            DB::insert(
                'INSERT INTO rekognition_client_faces (gallery_id, client_id, face_id, image_id, reference_r2_key)
                 VALUES (?, ?, ?, ?, ?)',
                [$galleryId, $clientId, $faceId, $rec['Face']['ImageId'] ?? null, 'anon']
            );
        }
        $token = app(\App\Services\Auth\JwtService::class)->encode([
            'type' => 'kingselection_client',
            'galleryId' => $galleryId,
            'clientId' => $clientId,
            'slug' => (string) $g->slug,
            'tyh' => false,
        ], '14d');

        return ['status' => 200, 'body' => [
            'success' => true,
            'token' => $token,
            'visitorId' => $visitorId,
        ]];
    }

    /**
     * Cliente: busca fotos por outra selfie (SearchFacesByImage + matches indexados).
     * Em REKOG_ON_DEMAND devolve FACE_USE_CHUNKED (CompareFaces chunked continua no fluxo do front).
     *
     * @param  array<string,mixed>  $payload
     * @return array{status:int, body:array<string,mixed>}
     */
    public function searchFaceByPhoto(array $payload, string $binary): array
    {
        if ($binary === '') {
            return ['status' => 400, 'body' => ['message' => 'Envie uma foto.']];
        }
        $cfg = $this->rekogConfig();
        if (! $cfg['enabled']) {
            return ['status' => 503, 'body' => ['message' => 'Reconhecimento facial não configurado.']];
        }
        $galleryId = (int) ($payload['galleryId'] ?? 0);
        $ctx = \App\Support\KingSelection\KsAccess::parseClientContext($payload);
        $clientId = (int) ($ctx['cid'] ?? 0);
        if ($galleryId < 1 || $clientId < 1) {
            return ['status' => 400, 'body' => [
                'message' => 'Busca por rosto requer acesso individual ou uma única ficha nesta galeria.',
            ]];
        }
        if (Schema::hasColumn('king_galleries', 'face_recognition_enabled')) {
            $ge = DB::selectOne('SELECT face_recognition_enabled FROM king_galleries WHERE id = ? LIMIT 1', [$galleryId]);
            if ($ge && empty($ge->face_recognition_enabled)) {
                return ['status' => 403, 'body' => ['message' => 'Reconhecimento facial está desativado nesta galeria.']];
            }
        }
        if ($this->isRekogOnDemand()) {
            return ['status' => 200, 'body' => [
                'success' => true,
                'code' => 'FACE_USE_CHUNKED',
                'total' => 0,
                'photoIds' => [],
                'message' => 'Use análise em etapas (chunked) neste modo.',
            ]];
        }
        $jpeg = $this->normalizeJpeg($binary);
        if ($jpeg === null) {
            return ['status' => 400, 'body' => ['message' => 'Imagem inválida. Tente outra foto.']];
        }
        try {
            $searchResult = $this->rekogCall('SearchFacesByImage', [
                'CollectionId' => $cfg['collectionId'],
                'Image' => ['Bytes' => base64_encode($jpeg)],
                'MaxFaces' => 10,
                'FaceMatchThreshold' => 70,
            ], $cfg);
        } catch (\Throwable $e) {
            Log::error('ks.face.searchByPhoto', ['error' => $e->getMessage()]);

            return ['status' => 503, 'body' => ['message' => 'Busca temporariamente indisponível. Tente de novo.']];
        }
        $matches = $searchResult['FaceMatches'] ?? [];
        $matchedFaceIds = [];
        foreach (is_array($matches) ? $matches : [] as $m) {
            $fid = $m['Face']['FaceId'] ?? null;
            if ($fid) {
                $matchedFaceIds[] = (string) $fid;
            }
        }
        if ($matchedFaceIds === []) {
            return ['status' => 200, 'body' => [
                'success' => true,
                'total' => 0,
                'photoIds' => [],
                'message' => 'Nenhum rosto parecido encontrado na galeria.',
            ]];
        }
        if (! Schema::hasTable('rekognition_client_faces')) {
            return ['status' => 200, 'body' => ['success' => true, 'total' => 0, 'photoIds' => []]];
        }
        $placeholders = implode(',', array_fill(0, count($matchedFaceIds), '?'));
        $ours = DB::selectOne(
            "SELECT 1 AS ok FROM rekognition_client_faces
             WHERE gallery_id = ? AND client_id = ? AND face_id IN ($placeholders) LIMIT 1",
            array_merge([$galleryId, $clientId], $matchedFaceIds)
        );
        if (! $ours) {
            return ['status' => 200, 'body' => [
                'success' => true,
                'total' => 0,
                'photoIds' => [],
                'message' => 'Esta foto não corresponde ao rosto cadastrado. Tente outra ou use "Filtrar minhas fotos".',
            ]];
        }
        $minSim = max(50.0, min(100.0, (float) (env('REKOG_FACE_RESULT_MIN_SIMILARITY') ?: 70)));
        if (! Schema::hasTable('rekognition_face_matches') || ! Schema::hasTable('rekognition_photo_faces')) {
            return ['status' => 200, 'body' => ['success' => true, 'total' => 0, 'photoIds' => []]];
        }
        $total = (int) (DB::selectOne(
            'SELECT COUNT(DISTINCT kp.id)::int AS cnt
             FROM king_photos kp
             JOIN rekognition_photo_faces rpf ON rpf.photo_id = kp.id
             JOIN rekognition_face_matches rfm ON rfm.photo_face_id = rpf.id
             WHERE kp.gallery_id = ? AND rfm.client_id = ? AND rfm.similarity >= ?',
            [$galleryId, $clientId, $minSim]
        )->cnt ?? 0);
        $rows = DB::select(
            'SELECT kp.id AS photo_id
             FROM king_photos kp
             JOIN rekognition_photo_faces rpf ON rpf.photo_id = kp.id
             JOIN rekognition_face_matches rfm ON rfm.photo_face_id = rpf.id
             WHERE kp.gallery_id = ? AND rfm.client_id = ? AND rfm.similarity >= ?
             GROUP BY kp.id
             ORDER BY MAX(rfm.similarity) DESC, kp.id
             LIMIT 500',
            [$galleryId, $clientId, $minSim]
        );
        $photoIds = array_map(static fn ($r) => (int) $r->photo_id, $rows);

        return ['status' => 200, 'body' => [
            'success' => true,
            'total' => $total,
            'photoIds' => $photoIds,
        ]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function faceProcessStatus(string $userId, int $galleryId): array
    {
        if ($galleryId < 1) {
            return ['status' => 400, 'body' => ['message' => 'galleryId inválido.']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão.']];
        }
        $total = (int) (DB::selectOne(
            'SELECT COUNT(*)::int AS total FROM king_photos WHERE gallery_id = ?',
            [$galleryId]
        )->total ?? 0);
        $jobs = ['pending' => 0, 'processing' => 0, 'done' => 0, 'error' => 0];
        if (Schema::hasTable('rekognition_photo_jobs')) {
            $rows = DB::select(
                'SELECT process_status, COUNT(*)::int AS cnt
                 FROM rekognition_photo_jobs WHERE gallery_id = ?
                 GROUP BY process_status',
                [$galleryId]
            );
            foreach ($rows as $row) {
                $s = (string) ($row->process_status ?? '');
                if (array_key_exists($s, $jobs)) {
                    $jobs[$s] = (int) $row->cnt;
                }
            }
        }
        return ['status' => 200, 'body' => [
            'success' => true,
            'galleryId' => $galleryId,
            'totalPhotos' => $total,
            'jobs' => $jobs,
            'onDemand' => $this->isRekogOnDemand(),
        ]];
    }

    /**
     * @param  array<string,mixed>  $query
     * @return array{status:int, body:array<string,mixed>}
     */
    public function faceResultsAdmin(string $userId, int $galleryId, array $query): array
    {
        if ($galleryId < 1) {
            return ['status' => 400, 'body' => ['message' => 'galleryId inválido.']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão.']];
        }
        if (! Schema::hasTable('rekognition_photo_faces') || ! Schema::hasTable('rekognition_face_matches')) {
            return ['status' => 200, 'body' => [
                'success' => true,
                'galleryId' => $galleryId,
                'clientId' => null,
                'pagination' => ['page' => 1, 'limit' => 20, 'total' => 0, 'pages' => 0],
                'photos' => [],
            ]];
        }
        $clientId = (int) ($query['clientId'] ?? 0) ?: null;
        $page = max(1, (int) ($query['page'] ?? 1));
        $limit = min(100, max(1, (int) ($query['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;
        $photos = [];
        $total = 0;

        if ($clientId) {
            $total = (int) (DB::selectOne(
                'SELECT COUNT(DISTINCT kp.id)::int AS cnt
                 FROM king_photos kp
                 JOIN rekognition_photo_faces rpf ON rpf.photo_id = kp.id
                 JOIN rekognition_face_matches rfm ON rfm.photo_face_id = rpf.id
                 WHERE kp.gallery_id = ? AND rfm.client_id = ?',
                [$galleryId, $clientId]
            )->cnt ?? 0);
            $rows = DB::select(
                'SELECT kp.id AS photo_id, kp.file_path, kp.original_name,
                        MAX(rfm.similarity) AS max_similarity,
                        COUNT(DISTINCT rfm.id)::int AS match_count
                 FROM king_photos kp
                 JOIN rekognition_photo_faces rpf ON rpf.photo_id = kp.id
                 JOIN rekognition_face_matches rfm ON rfm.photo_face_id = rpf.id
                 WHERE kp.gallery_id = ? AND rfm.client_id = ?
                 GROUP BY kp.id, kp.file_path, kp.original_name
                 ORDER BY max_similarity DESC, kp.id
                 LIMIT ? OFFSET ?',
                [$galleryId, $clientId, $limit, $offset]
            );
            foreach ($rows as $r) {
                $photos[] = [
                    'photoId' => (int) $r->photo_id,
                    'filePath' => $r->file_path,
                    'originalName' => $r->original_name,
                    'publicUrl' => $this->publicUrlFromPath((string) $r->file_path),
                    'maxSimilarity' => $r->max_similarity !== null ? (float) $r->max_similarity : null,
                    'matchCount' => (int) $r->match_count,
                ];
            }
        } else {
            $total = (int) (DB::selectOne(
                'SELECT COUNT(DISTINCT kp.id)::int AS cnt
                 FROM king_photos kp
                 JOIN rekognition_photo_faces rpf ON rpf.photo_id = kp.id
                 JOIN rekognition_face_matches rfm ON rfm.photo_face_id = rpf.id
                 WHERE kp.gallery_id = ?',
                [$galleryId]
            )->cnt ?? 0);
            $rows = DB::select(
                'SELECT kp.id AS photo_id, kp.file_path, kp.original_name,
                        COUNT(DISTINCT rfm.client_id)::int AS client_count,
                        COUNT(DISTINCT rfm.id)::int AS match_count
                 FROM king_photos kp
                 JOIN rekognition_photo_faces rpf ON rpf.photo_id = kp.id
                 JOIN rekognition_face_matches rfm ON rfm.photo_face_id = rpf.id
                 WHERE kp.gallery_id = ?
                 GROUP BY kp.id, kp.file_path, kp.original_name
                 ORDER BY kp.id
                 LIMIT ? OFFSET ?',
                [$galleryId, $limit, $offset]
            );
            foreach ($rows as $r) {
                $photos[] = [
                    'photoId' => (int) $r->photo_id,
                    'filePath' => $r->file_path,
                    'originalName' => $r->original_name,
                    'publicUrl' => $this->publicUrlFromPath((string) $r->file_path),
                    'clientCount' => (int) $r->client_count,
                    'matchCount' => (int) $r->match_count,
                ];
            }
        }

        return ['status' => 200, 'body' => [
            'success' => true,
            'galleryId' => $galleryId,
            'clientId' => $clientId,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'pages' => $limit > 0 ? (int) ceil($total / $limit) : 0,
            ],
            'photos' => $photos,
        ]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function faceDetail(string $userId, int $galleryId, int $photoId): array
    {
        if ($galleryId < 1 || $photoId < 1) {
            return ['status' => 400, 'body' => ['message' => 'galleryId e photoId inválidos.']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão.']];
        }
        $photo = DB::selectOne(
            'SELECT id, file_path, original_name FROM king_photos WHERE id = ? AND gallery_id = ? LIMIT 1',
            [$photoId, $galleryId]
        );
        if (! $photo) {
            return ['status' => 404, 'body' => ['message' => 'Foto não encontrada.']];
        }
        $faces = [];
        if (Schema::hasTable('rekognition_photo_faces')) {
            $faceRows = DB::select(
                'SELECT id, face_index, bounding_box_json, confidence
                 FROM rekognition_photo_faces WHERE photo_id = ? ORDER BY face_index',
                [$photoId]
            );
            foreach ($faceRows as $faceRow) {
                $matches = [];
                if (Schema::hasTable('rekognition_face_matches')) {
                    $matchRows = DB::select(
                        'SELECT rfm.client_id, rfm.similarity, rfm.rekognition_face_id,
                                kgc.nome AS client_name, kgc.email AS client_email
                         FROM rekognition_face_matches rfm
                         LEFT JOIN king_gallery_clients kgc ON kgc.id = rfm.client_id
                         WHERE rfm.photo_face_id = ?
                         ORDER BY rfm.similarity DESC',
                        [$faceRow->id]
                    );
                    foreach ($matchRows as $m) {
                        $matches[] = [
                            'clientId' => (int) $m->client_id,
                            'clientName' => $m->client_name ?? null,
                            'clientEmail' => $m->client_email ?? null,
                            'similarity' => $m->similarity !== null ? (float) $m->similarity : null,
                            'rekognitionFaceId' => $m->rekognition_face_id ?? null,
                        ];
                    }
                }
                $bbox = null;
                if (! empty($faceRow->bounding_box_json)) {
                    $decoded = is_string($faceRow->bounding_box_json)
                        ? json_decode($faceRow->bounding_box_json, true)
                        : $faceRow->bounding_box_json;
                    $bbox = is_array($decoded) ? $decoded : null;
                }
                $faces[] = [
                    'index' => (int) $faceRow->face_index,
                    'boundingBox' => $bbox,
                    'confidence' => $faceRow->confidence !== null ? (float) $faceRow->confidence : null,
                    'matches' => $matches,
                ];
            }
        }
        $job = null;
        if (Schema::hasTable('rekognition_photo_jobs')) {
            $job = DB::selectOne(
                'SELECT process_status, processed_at, error_message
                 FROM rekognition_photo_jobs WHERE gallery_id = ? AND photo_id = ? LIMIT 1',
                [$galleryId, $photoId]
            );
        }

        return ['status' => 200, 'body' => [
            'success' => true,
            'photoId' => $photoId,
            'galleryId' => $galleryId,
            'filePath' => $photo->file_path,
            'publicUrl' => $this->publicUrlFromPath((string) $photo->file_path),
            'processStatus' => $job->process_status ?? 'not_processed',
            'processedAt' => $job->processed_at ?? null,
            'errorMessage' => $job->error_message ?? null,
            'faces' => $faces,
        ]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function autoSeparateJobLatest(string $userId, int $galleryId): array
    {
        if ($galleryId < 1) {
            return ['status' => 400, 'body' => ['message' => 'galleryId inválido']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        if (! Schema::hasTable('king_folder_auto_jobs')) {
            return ['status' => 200, 'body' => ['success' => true, 'job' => null]];
        }
        $job = DB::selectOne(
            'SELECT * FROM king_folder_auto_jobs WHERE gallery_id = ? ORDER BY id DESC LIMIT 1',
            [$galleryId]
        );

        return ['status' => 200, 'body' => ['success' => true, 'job' => $job]];
    }

    /**
     * @param  array<string,mixed>  $query
     * @return array{status:int, body:array<string,mixed>}
     */
    public function autoSeparateJobsList(string $userId, int $galleryId, array $query): array
    {
        if ($galleryId < 1) {
            return ['status' => 400, 'body' => ['message' => 'galleryId inválido']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        if (! Schema::hasTable('king_folder_auto_jobs')) {
            return ['status' => 200, 'body' => ['success' => true, 'jobs' => []]];
        }
        $limit = min(50, max(1, (int) ($query['limit'] ?? 20)));
        $jobs = DB::select(
            'SELECT * FROM king_folder_auto_jobs WHERE gallery_id = ? ORDER BY id DESC LIMIT ?',
            [$galleryId, $limit]
        );

        return ['status' => 200, 'body' => ['success' => true, 'jobs' => $jobs]];
    }

    /**
     * Separação síncrona por matches já processados (sem Rekognition).
     *
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function autoSeparateByFace(string $userId, int $galleryId, array $body): array
    {
        if ($galleryId < 1) {
            return ['status' => 400, 'body' => ['message' => 'galleryId inválido']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        $minSimilarity = (float) ($body['minSimilarity'] ?? 72);
        if (! is_finite($minSimilarity)) {
            $minSimilarity = 72.0;
        }
        $minSimilarity = max(45.0, min(99.0, $minSimilarity));
        $out = $this->runAutoSeparateByFaceInternal($galleryId, $minSimilarity);

        return ['status' => 200, 'body' => [
            'success' => true,
            'updated' => $out['updated'],
            'folders' => $out['folders'],
            'assignments' => $out['assignments'],
            'message' => $out['message'] ?? null,
        ]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function cancelAutoSeparateJob(string $userId, int $galleryId, int $jobId): array
    {
        if ($galleryId < 1 || $jobId < 1) {
            return ['status' => 400, 'body' => ['message' => 'IDs inválidos']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        if (! Schema::hasTable('king_folder_auto_jobs')) {
            return ['status' => 412, 'body' => ['message' => 'Tabela king_folder_auto_jobs não encontrada.']];
        }
        $job = DB::selectOne(
            'SELECT id, status FROM king_folder_auto_jobs WHERE id = ? AND gallery_id = ? LIMIT 1',
            [$jobId, $galleryId]
        );
        if (! $job) {
            return ['status' => 404, 'body' => ['message' => 'Job não encontrado']];
        }
        if (! in_array((string) $job->status, ['pending', 'processing'], true)) {
            return ['status' => 200, 'body' => ['success' => true, 'message' => 'Job já finalizado.', 'job' => $job]];
        }
        DB::update(
            "UPDATE king_folder_auto_jobs
             SET status = 'cancelled', stage = 'cancelled', message = 'Cancelado pelo usuário.',
                 finished_at = NOW(), updated_at = NOW()
             WHERE id = ? AND gallery_id = ?",
            [$jobId, $galleryId]
        );
        $updated = DB::selectOne('SELECT * FROM king_folder_auto_jobs WHERE id = ? LIMIT 1', [$jobId]);

        return ['status' => 200, 'body' => ['success' => true, 'job' => $updated]];
    }

    /**
     * @return array{updated:int, assignments:list<array{photoId:int,folderId:int}>, folders:list<object>, message:?string}
     */
    private function runAutoSeparateByFaceInternal(int $galleryId, float $minSimilarity): array
    {
        $foldersEmpty = [];
        if (Schema::hasTable('king_photo_folders')) {
            $foldersEmpty = DB::select(
                'SELECT id, gallery_id, name, sort_order, cover_photo_id, created_at
                 FROM king_photo_folders WHERE gallery_id = ? ORDER BY sort_order ASC, id ASC',
                [$galleryId]
            );
        }
        foreach (['king_photo_folders', 'rekognition_photo_faces', 'rekognition_face_matches', 'king_gallery_clients'] as $t) {
            if (! Schema::hasTable($t)) {
                return [
                    'updated' => 0,
                    'assignments' => [],
                    'folders' => $foldersEmpty,
                    'message' => "Tabela {$t} não encontrada. Execute as migrations faciais e de pastas.",
                ];
            }
        }
        if (! Schema::hasColumn('king_photos', 'folder_id')) {
            return [
                'updated' => 0,
                'assignments' => [],
                'folders' => $foldersEmpty,
                'message' => 'Coluna king_photos.folder_id não encontrada. Execute a migration 206.',
            ];
        }

        $picked = DB::select(
            'WITH ranked AS (
               SELECT
                 kp.id AS photo_id,
                 kgc.id AS client_id,
                 COALESCE(NULLIF(BTRIM(kgc.nome), \'\'), CONCAT(\'Pessoa \', kgc.id::text)) AS folder_name,
                 MAX(rfm.similarity)::float8 AS best_similarity
               FROM king_photos kp
               JOIN rekognition_photo_faces rpf ON rpf.photo_id = kp.id
               JOIN rekognition_face_matches rfm ON rfm.photo_face_id = rpf.id
               JOIN king_gallery_clients kgc ON kgc.id = rfm.client_id AND kgc.gallery_id = kp.gallery_id
               WHERE kp.gallery_id = ?
                 AND (kgc.email IS NULL OR lower(kgc.email) NOT LIKE \'__ks_face_%@internal.king\')
               GROUP BY kp.id, kgc.id, COALESCE(NULLIF(BTRIM(kgc.nome), \'\'), CONCAT(\'Pessoa \', kgc.id::text))
             ),
             picked AS (
               SELECT DISTINCT ON (photo_id)
                 photo_id, client_id, folder_name, best_similarity
               FROM ranked
               WHERE best_similarity >= ?
               ORDER BY photo_id, best_similarity DESC, client_id ASC
             )
             SELECT * FROM picked',
            [$galleryId, $minSimilarity]
        );
        if ($picked === []) {
            return [
                'updated' => 0,
                'assignments' => [],
                'folders' => $foldersEmpty,
                'message' => 'Não encontrei correspondências faciais suficientes. Rode "Processar reconhecimento em todas as fotos" e tente novamente.',
            ];
        }

        $folderIdByName = [];
        foreach ($foldersEmpty as $f) {
            $folderIdByName[mb_strtolower(trim((string) ($f->name ?? '')))] = (int) $f->id;
        }
        $sortBase = 10;
        if ($foldersEmpty !== []) {
            $sortBase = max(array_map(static fn ($f) => (int) ($f->sort_order ?? 0), $foldersEmpty)) + 10;
        }
        $folderNames = [];
        foreach ($picked as $row) {
            $n = trim((string) ($row->folder_name ?? ''));
            if ($n !== '') {
                $folderNames[$n] = true;
            }
        }
        foreach (array_keys($folderNames) as $name) {
            $key = mb_strtolower($name);
            if (isset($folderIdByName[$key])) {
                continue;
            }
            $ins = DB::selectOne(
                'INSERT INTO king_photo_folders (gallery_id, name, sort_order)
                 VALUES (?, ?, ?) RETURNING id',
                [$galleryId, substr($name, 0, 120), $sortBase]
            );
            $sortBase += 10;
            if ($ins) {
                $folderIdByName[$key] = (int) $ins->id;
            }
        }

        $assignments = [];
        foreach ($picked as $row) {
            $photoId = (int) $row->photo_id;
            $folderId = $folderIdByName[mb_strtolower(trim((string) ($row->folder_name ?? '')))] ?? null;
            if ($photoId < 1 || ! $folderId) {
                continue;
            }
            $assignments[] = ['photoId' => $photoId, 'folderId' => (int) $folderId];
        }
        if ($assignments === []) {
            $folders = DB::select(
                'SELECT id, gallery_id, name, sort_order, cover_photo_id, created_at
                 FROM king_photo_folders WHERE gallery_id = ? ORDER BY sort_order ASC, id ASC',
                [$galleryId]
            );

            return [
                'updated' => 0,
                'assignments' => [],
                'folders' => $folders,
                'message' => 'Nenhuma atribuição válida foi gerada.',
            ];
        }

        DB::beginTransaction();
        try {
            foreach ($assignments as $a) {
                DB::update(
                    'UPDATE king_photos SET folder_id = ? WHERE id = ? AND gallery_id = ?',
                    [$a['folderId'], $a['photoId'], $galleryId]
                );
            }
            $folderIds = array_values(array_unique(array_map(static fn ($a) => $a['folderId'], $assignments)));
            foreach ($folderIds as $fid) {
                if (Schema::hasColumn('king_photo_folders', 'cover_photo_id')) {
                    DB::update(
                        'UPDATE king_photo_folders f
                         SET cover_photo_id = COALESCE(
                           f.cover_photo_id,
                           (SELECT p.id FROM king_photos p
                            WHERE p.gallery_id = ? AND p.folder_id = ?
                            ORDER BY p."order" ASC, p.id ASC LIMIT 1)
                         ), updated_at = NOW()
                         WHERE f.gallery_id = ? AND f.id = ?',
                        [$galleryId, $fid, $galleryId, $fid]
                    );
                }
            }
            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }

        $folders = DB::select(
            'SELECT id, gallery_id, name, sort_order, cover_photo_id, created_at
             FROM king_photo_folders WHERE gallery_id = ? ORDER BY sort_order ASC, id ASC',
            [$galleryId]
        );

        return [
            'updated' => count($assignments),
            'assignments' => $assignments,
            'folders' => $folders,
            'message' => null,
        ];
    }

    /**
     * Processa uma foto (DetectFaces + SearchFacesByImage via Bytes).
     *
     * @param  array<string,mixed>  $options
     * @return array{status:int, body:array<string,mixed>}
     */
    public function processPhotoFaces(string $userId, int $galleryId, int $photoId, array $options = []): array
    {
        if ($galleryId < 1 || $photoId < 1) {
            return ['status' => 400, 'body' => ['message' => 'galleryId e photoId inválidos.']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão.']];
        }
        $cfg = $this->rekogConfig();
        if (! $cfg['enabled']) {
            return ['status' => 503, 'body' => ['message' => 'Reconhecimento facial não configurado (AWS).']];
        }
        $photo = DB::selectOne(
            'SELECT id, file_path, original_name FROM king_photos WHERE id = ? AND gallery_id = ? LIMIT 1',
            [$photoId, $galleryId]
        );
        if (! $photo) {
            return ['status' => 404, 'body' => ['message' => 'Foto não encontrada.']];
        }
        try {
            $out = $this->processOnePhotoFaces($galleryId, $photo, $cfg, $options);
        } catch (\Throwable $e) {
            Log::error('ks.face.processPhoto', ['photoId' => $photoId, 'error' => $e->getMessage()]);

            return ['status' => 502, 'body' => ['message' => 'Falha ao processar rostos: '.$e->getMessage()]];
        }

        return ['status' => 200, 'body' => array_merge(['success' => true], $out)];
    }

    /**
     * Inicia processamento em massa (após a resposta HTTP).
     *
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function processAllFaces(string $userId, int $galleryId, array $body): array
    {
        if ($galleryId < 1) {
            return ['status' => 400, 'body' => ['message' => 'galleryId inválido.']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão.']];
        }
        $cfg = $this->rekogConfig();
        if (! $cfg['enabled']) {
            return ['status' => 503, 'body' => ['message' => 'Reconhecimento facial não configurado (AWS).']];
        }
        $force = ($body['forceReprocess'] ?? false) === true;
        $concurrency = min(4, max(1, (int) ($body['concurrency'] ?? 3)));
        $speedMode = strtolower(trim((string) ($body['speedMode'] ?? env('REKOG_SPEED_MODE_DEFAULT') ?: 'auto')));

        dispatch(new \App\Jobs\ProcessGalleryFacesJob($galleryId, $force, $concurrency, $speedMode));

        return ['status' => 200, 'body' => [
            'success' => true,
            'message' => 'Processamento facial enfileirado.',
            'galleryId' => $galleryId,
        ]];
    }

    /**
     * Job async: processa faces + auto-separate.
     *
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function startAutoSeparateJob(string $userId, int $galleryId, array $body): array
    {
        if ($galleryId < 1) {
            return ['status' => 400, 'body' => ['message' => 'galleryId inválido']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        if (! Schema::hasTable('king_folder_auto_jobs')) {
            return ['status' => 412, 'body' => ['message' => 'Tabela king_folder_auto_jobs não encontrada. Execute a migration 207.']];
        }
        $minSimilarity = max(45.0, min(99.0, (float) ($body['minSimilarity'] ?? 72) ?: 72));
        $force = ($body['forceReprocess'] ?? false) === true;
        $concurrency = min(4, max(1, (int) ($body['concurrency'] ?? 3)));
        $speedMode = strtolower(trim((string) ($body['speedMode'] ?? env('REKOG_SPEED_MODE_DEFAULT') ?: 'auto')));

        $active = DB::selectOne(
            "SELECT * FROM king_folder_auto_jobs
             WHERE gallery_id = ? AND status IN ('pending','processing')
             ORDER BY created_at DESC, id DESC LIMIT 1",
            [$galleryId]
        );
        if ($active) {
            return ['status' => 200, 'body' => [
                'success' => true,
                'message' => 'Já existe um job em andamento para esta galeria.',
                'job' => $active,
                'alreadyRunning' => true,
            ]];
        }

        $job = DB::selectOne(
            "INSERT INTO king_folder_auto_jobs
               (gallery_id, status, stage, message, min_similarity, force_reprocess, options_json)
             VALUES (?, 'pending', 'queued', ?, ?, ?, ?::jsonb)
             RETURNING *",
            [
                $galleryId,
                'Job enfileirado.',
                $minSimilarity,
                $force,
                json_encode(['speedMode' => $speedMode, 'concurrency' => $concurrency], JSON_UNESCAPED_UNICODE),
            ]
        );
        $jobId = (int) $job->id;

        dispatch(new \App\Jobs\AutoSeparateGalleryJob(
            $galleryId,
            $jobId,
            $force,
            $concurrency,
            $speedMode,
            (float) $minSimilarity
        ));

        return ['status' => 200, 'body' => ['success' => true, 'job' => $job]];
    }

    /**
     * Cliente: resultados faciais (modo indexado). On-demand devolve FACE_USE_CHUNKED.
     *
     * @param  array<string,mixed>  $payload JWT client
     * @param  array<string,mixed>  $query
     * @return array{status:int, body:array<string,mixed>}
     */
    public function clientFaceResults(array $payload, array $query): array
    {
        $galleryId = (int) ($payload['galleryId'] ?? 0);
        $ctx = \App\Support\KingSelection\KsAccess::parseClientContext($payload);
        $clientId = (int) ($ctx['cid'] ?? 0);
        if ($galleryId < 1 || $clientId < 1) {
            return ['status' => 400, 'body' => [
                'message' => 'Reconhecimento facial requer acesso individual ou uma única ficha de visitante nesta galeria. Peça ao fotógrafo.',
            ]];
        }
        if (Schema::hasColumn('king_galleries', 'face_recognition_enabled')) {
            $ge = DB::selectOne('SELECT face_recognition_enabled FROM king_galleries WHERE id = ? LIMIT 1', [$galleryId]);
            if ($ge && empty($ge->face_recognition_enabled)) {
                return ['status' => 403, 'body' => ['message' => 'Reconhecimento facial está desativado nesta galeria.']];
            }
        }
        $page = max(1, (int) ($query['page'] ?? 1));
        $limit = min(8000, max(1, (int) ($query['limit'] ?? 500)));
        $offset = ($page - 1) * $limit;

        if ($this->isRekogOnDemand()) {
            if ($this->useFaceSearchCache()) {
                $cached = $this->getSearchCache($galleryId, $clientId, 'enroll');
                if (is_array($cached) && $cached !== []) {
                    return ['status' => 200, 'body' => [
                        'success' => true,
                        'total' => count($cached),
                        'photoIds' => array_values(array_slice($cached, $offset, $limit)),
                        'fromCache' => true,
                    ]];
                }
            }
            $refBytes = $this->getReferenceImageBytes($galleryId, $clientId);
            if ($refBytes === null || $refBytes === '') {
                return ['status' => 200, 'body' => [
                    'success' => true,
                    'total' => 0,
                    'photoIds' => [],
                    'message' => 'Nenhuma foto de referência. Cadastre seu rosto primeiro.',
                ]];
            }
            /**
             * Um scan completo num único pedido estoura o timeout do proxy: o front pede vários
             * GET curtos com chunked=1 e depois grava o resultado em POST /client/face-enroll-cache.
             */
            $chunked = in_array(strtolower(trim((string) ($query['chunked'] ?? ''))), ['1', 'true'], true);
            if (! $chunked) {
                return ['status' => 200, 'body' => [
                    'success' => true,
                    'code' => 'FACE_USE_CHUNKED',
                    'photoIds' => [],
                    'total' => null,
                    'message' => 'Use análise em etapas (chunked). Atualize a página (Ctrl+F5) se a galeria estiver em cache antigo.',
                ]];
            }
            $batch = min(96, max(8, (int) ($query['photoBatch'] ?? 40) ?: 40));
            $skip = max(0, (int) ($query['photoSkip'] ?? 0));
            $totalGallery = (int) (DB::selectOne(
                'SELECT COUNT(*)::int AS c FROM king_photos WHERE gallery_id = ?',
                [$galleryId]
            )->c ?? 0);
            $rows = DB::select(
                'SELECT id, file_path FROM king_photos WHERE gallery_id = ? ORDER BY id LIMIT ? OFFSET ?',
                [$galleryId, $batch, $skip]
            );
            $chunk = $this->compareFacesAgainstPhotoRows($refBytes, $rows, [
                'verifySourceFace' => $skip === 0,
                'speedMode' => (string) ($query['speedMode'] ?? ''),
            ]);
            $photoIds = $chunk['photoIds'];

            return ['status' => 200, 'body' => [
                'success' => true,
                'faceChunk' => true,
                'photoIds' => $photoIds,
                'galleryPhotoTotal' => $totalGallery,
                'photoSkip' => $skip,
                'photoBatchReturned' => count($rows),
                'hasMore' => ($skip + count($rows)) < $totalGallery,
                'total' => count($photoIds),
                'diagnostics' => $chunk['diagnostics'],
            ]];
        }

        if (! Schema::hasTable('rekognition_face_matches') || ! Schema::hasTable('rekognition_photo_faces')) {
            return ['status' => 200, 'body' => ['success' => true, 'total' => 0, 'photoIds' => []]];
        }
        $minSim = max(50.0, min(100.0, (float) (env('REKOG_FACE_RESULT_MIN_SIMILARITY') ?: 70)));
        $total = (int) (DB::selectOne(
            'SELECT COUNT(DISTINCT kp.id)::int AS cnt
             FROM king_photos kp
             JOIN rekognition_photo_faces rpf ON rpf.photo_id = kp.id
             JOIN rekognition_face_matches rfm ON rfm.photo_face_id = rpf.id
             WHERE kp.gallery_id = ? AND rfm.client_id = ? AND rfm.similarity >= ?',
            [$galleryId, $clientId, $minSim]
        )->cnt ?? 0);
        $rows = DB::select(
            'SELECT kp.id AS photo_id
             FROM king_photos kp
             JOIN rekognition_photo_faces rpf ON rpf.photo_id = kp.id
             JOIN rekognition_face_matches rfm ON rfm.photo_face_id = rpf.id
             WHERE kp.gallery_id = ? AND rfm.client_id = ? AND rfm.similarity >= ?
             GROUP BY kp.id
             ORDER BY MAX(rfm.similarity) DESC, kp.id
             LIMIT ? OFFSET ?',
            [$galleryId, $clientId, $minSim, $limit, $offset]
        );
        $photoIds = array_map(static fn ($r) => (int) $r->photo_id, $rows);

        return ['status' => 200, 'body' => ['success' => true, 'total' => $total, 'photoIds' => $photoIds]];
    }

    /**
     * @param  array<string,mixed>  $payload
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function clientFaceEnrollCache(array $payload, array $body): array
    {
        $galleryId = (int) ($payload['galleryId'] ?? 0);
        $ctx = \App\Support\KingSelection\KsAccess::parseClientContext($payload);
        $clientId = (int) ($ctx['cid'] ?? 0);
        if ($galleryId < 1 || $clientId < 1) {
            return ['status' => 400, 'body' => ['message' => 'Sessão inválida.']];
        }
        $ids = [];
        foreach ((array) ($body['photoIds'] ?? []) as $x) {
            $id = (int) $x;
            if ($id > 0) {
                $ids[] = $id;
            }
        }
        $ids = array_values(array_unique($ids));
        if (! Schema::hasTable('rekognition_processing_cache')) {
            return ['status' => 200, 'body' => ['success' => true, 'saved' => count($ids)]];
        }
        $this->setSearchCache($galleryId, $clientId, 'enroll', $ids);

        return ['status' => 200, 'body' => ['success' => true, 'saved' => count($ids)]];
    }

    /**
     * @param  array<string,mixed>  $payload
     * @return array{status:int, body:array<string,mixed>}
     */
    public function clientResetFaceSession(array $payload): array
    {
        $galleryId = (int) ($payload['galleryId'] ?? 0);
        $ctx = \App\Support\KingSelection\KsAccess::parseClientContext($payload);
        $clientId = (int) ($ctx['cid'] ?? 0);
        if ($galleryId < 1 || $clientId < 1) {
            return ['status' => 403, 'body' => ['message' => 'Sessão facial não encontrada para este acesso.']];
        }
        if (Schema::hasTable('rekognition_processing_cache')) {
            DB::delete(
                'DELETE FROM rekognition_processing_cache WHERE cache_key LIKE ?',
                ['search:'.$galleryId.':'.$clientId.':%']
            );
        }
        if (Schema::hasTable('rekognition_face_matches') && Schema::hasTable('rekognition_photo_faces')) {
            DB::delete(
                'DELETE FROM rekognition_face_matches
                 WHERE client_id = ?
                   AND photo_face_id IN (
                     SELECT rpf.id FROM rekognition_photo_faces rpf
                     JOIN king_photos kp ON kp.id = rpf.photo_id
                     WHERE kp.gallery_id = ?
                   )',
                [$clientId, $galleryId]
            );
        }
        if (Schema::hasTable('rekognition_client_faces')) {
            DB::delete(
                'DELETE FROM rekognition_client_faces WHERE gallery_id = ? AND client_id = ?',
                [$galleryId, $clientId]
            );
        }

        return ['status' => 200, 'body' => [
            'success' => true,
            'clientId' => $clientId,
            'message' => 'Sessão facial limpa com sucesso.',
        ]];
    }

    /**
     * @param  array<string,mixed>  $query
     * @return array{status:int, body:array<string,mixed>}
     */
    public function publicMyPhotos(string $slug, string $clientToken, array $query): array
    {
        $slug = trim($slug);
        if ($slug === '') {
            return ['status' => 400, 'body' => ['message' => 'slug inválido.']];
        }
        if ($clientToken === '') {
            return ['status' => 401, 'body' => ['message' => 'clientToken obrigatório.']];
        }
        try {
            $jwt = app(\App\Services\Auth\JwtService::class);
            $payload = $jwt->decode($clientToken);
        } catch (\Throwable) {
            return ['status' => 401, 'body' => ['message' => 'Token inválido ou expirado.']];
        }
        if (! is_array($payload) || ($payload['type'] ?? '') !== 'kingselection_client') {
            // alguns tokens usam type diferente — aceitar se tiver galleryId/clientId
            if (! is_array($payload)) {
                return ['status' => 401, 'body' => ['message' => 'Token inválido ou expirado.']];
            }
        }
        $g = DB::selectOne('SELECT id FROM king_galleries WHERE slug = ? LIMIT 1', [$slug]);
        if (! $g) {
            return ['status' => 404, 'body' => ['message' => 'Galeria não encontrada.']];
        }
        $galleryId = (int) $g->id;
        $clientId = (int) ($payload['clientId'] ?? $payload['client_id'] ?? 0);
        if ($clientId < 1) {
            return ['status' => 401, 'body' => ['message' => 'Token não contém clientId.']];
        }
        $c = DB::selectOne(
            'SELECT id FROM king_gallery_clients WHERE id = ? AND gallery_id = ? AND enabled IS DISTINCT FROM false LIMIT 1',
            [$clientId, $galleryId]
        );
        if (! $c) {
            return ['status' => 403, 'body' => ['message' => 'Acesso negado.']];
        }
        $page = max(1, (int) ($query['page'] ?? 1));
        $limit = min(100, max(1, (int) ($query['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;
        $minSim = max(50.0, min(100.0, (float) (env('REKOG_FACE_RESULT_MIN_SIMILARITY') ?: 70)));
        if (! Schema::hasTable('rekognition_face_matches')) {
            return ['status' => 200, 'body' => [
                'success' => true,
                'galleryId' => $galleryId,
                'clientId' => $clientId,
                'pagination' => ['page' => $page, 'limit' => $limit, 'total' => 0, 'pages' => 0],
                'photos' => [],
            ]];
        }
        $total = (int) (DB::selectOne(
            'SELECT COUNT(DISTINCT kp.id)::int AS cnt
             FROM king_photos kp
             JOIN rekognition_photo_faces rpf ON rpf.photo_id = kp.id
             JOIN rekognition_face_matches rfm ON rfm.photo_face_id = rpf.id
             WHERE kp.gallery_id = ? AND rfm.client_id = ? AND rfm.similarity >= ?',
            [$galleryId, $clientId, $minSim]
        )->cnt ?? 0);
        $rows = DB::select(
            'SELECT kp.id AS photo_id, kp.file_path, kp.original_name,
                    MAX(rfm.similarity) AS max_similarity
             FROM king_photos kp
             JOIN rekognition_photo_faces rpf ON rpf.photo_id = kp.id
             JOIN rekognition_face_matches rfm ON rfm.photo_face_id = rpf.id
             WHERE kp.gallery_id = ? AND rfm.client_id = ? AND rfm.similarity >= ?
             GROUP BY kp.id, kp.file_path, kp.original_name
             ORDER BY max_similarity DESC, kp.id
             LIMIT ? OFFSET ?',
            [$galleryId, $clientId, $minSim, $limit, $offset]
        );
        $photos = [];
        foreach ($rows as $r) {
            $photos[] = [
                'photoId' => (int) $r->photo_id,
                'originalName' => $r->original_name,
                'publicUrl' => $this->publicUrlFromPath((string) $r->file_path),
                'maxSimilarity' => $r->max_similarity !== null ? (float) $r->max_similarity : null,
            ];
        }

        return ['status' => 200, 'body' => [
            'success' => true,
            'galleryId' => $galleryId,
            'clientId' => $clientId,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'pages' => $limit > 0 ? (int) ceil($total / $limit) : 0,
            ],
            'photos' => $photos,
        ]];
    }

    public function runAutoSeparateJobWorker(
        int $galleryId,
        int $jobId,
        bool $force,
        int $concurrency,
        string $speedMode,
        float $minSimilarity
    ): void {
        $patch = function (array $fields) use ($jobId): void {
            $sets = [];
            $params = [];
            foreach ($fields as $col => $val) {
                $sets[] = "{$col} = ?";
                $params[] = $val;
            }
            $sets[] = 'updated_at = NOW()';
            $params[] = $jobId;
            DB::update('UPDATE king_folder_auto_jobs SET '.implode(', ', $sets).' WHERE id = ?', $params);
        };

        try {
            $cur = DB::selectOne('SELECT status FROM king_folder_auto_jobs WHERE id = ? LIMIT 1', [$jobId]);
            if ($cur && (string) $cur->status === 'cancelled') {
                return;
            }
            $patch([
                'status' => 'processing',
                'stage' => 'processing_faces',
                'message' => 'Processando rostos…',
                'started_at' => now()->toDateTimeString(),
            ]);
            $stats = $this->runGalleryPhotosThroughRekognition($galleryId, $force, $concurrency, ['speedMode' => $speedMode]);
            $cur = DB::selectOne('SELECT status FROM king_folder_auto_jobs WHERE id = ? LIMIT 1', [$jobId]);
            if ($cur && (string) $cur->status === 'cancelled') {
                return;
            }
            $patch([
                'stage' => 'separating_folders',
                'message' => 'Separando pastas…',
                'total_photos' => $stats['total'] ?? 0,
                'processed_photos' => $stats['processed'] ?? 0,
                'error_photos' => $stats['errors'] ?? 0,
            ]);
            $sep = $this->runAutoSeparateByFaceInternal($galleryId, $minSimilarity);
            $patch([
                'status' => 'done',
                'stage' => 'done',
                'message' => $sep['message'] ?: 'Concluído.',
                'assigned_photos' => $sep['updated'],
                'finished_at' => now()->toDateTimeString(),
                'error_message' => null,
            ]);
        } catch (\Throwable $e) {
            Log::error('ks.face.autoJob', ['jobId' => $jobId, 'error' => $e->getMessage()]);
            $patch([
                'status' => 'error',
                'stage' => 'error',
                'message' => 'Erro no job.',
                'error_message' => substr($e->getMessage(), 0, 500),
                'finished_at' => now()->toDateTimeString(),
            ]);
        }
    }

    /**
     * @param  array<string,mixed>  $options
     * @return array{total:int, processed:int, errors:int}
     */
    public function runGalleryPhotosThroughRekognition(int $galleryId, bool $force, int $concurrency, array $options = []): array
    {
        $cfg = $this->rekogConfig();
        if ($force) {
            $photos = DB::select('SELECT id, file_path, original_name FROM king_photos WHERE gallery_id = ? ORDER BY id ASC', [$galleryId]);
        } else {
            $photos = DB::select(
                "SELECT p.id, p.file_path, p.original_name
                 FROM king_photos p
                 LEFT JOIN rekognition_photo_jobs j ON j.gallery_id = p.gallery_id AND j.photo_id = p.id
                 WHERE p.gallery_id = ?
                   AND (j.id IS NULL OR j.process_status IS DISTINCT FROM 'done')
                 ORDER BY p.id ASC",
                [$galleryId]
            );
        }
        $processed = 0;
        $errors = 0;
        $chunks = array_chunk($photos, max(1, $concurrency));
        foreach ($chunks as $chunk) {
            foreach ($chunk as $photo) {
                try {
                    $this->processOnePhotoFaces($galleryId, $photo, $cfg, $options);
                    $processed++;
                } catch (\Throwable $e) {
                    $errors++;
                    Log::warning('ks.face.batchPhoto', ['photoId' => $photo->id ?? null, 'error' => $e->getMessage()]);
                }
            }
        }

        return ['total' => count($photos), 'processed' => $processed, 'errors' => $errors];
    }

    /**
     * @param  object  $photo
     * @param  array{enabled:bool, region:string, collectionId:string, accessKeyId:string, secretAccessKey:string}  $cfg
     * @param  array<string,mixed>  $options
     * @return array<string,mixed>
     */
    private function processOnePhotoFaces(int $galleryId, object $photo, array $cfg, array $options = []): array
    {
        $photoId = (int) $photo->id;
        $filePath = (string) ($photo->file_path ?? '');
        $r2Key = $filePath;
        if (str_starts_with(strtolower($r2Key), 'r2:')) {
            $r2Key = substr($r2Key, 3);
        }
        $r2Key = ltrim($r2Key, '/');
        if ($r2Key === '' || ! str_starts_with($r2Key, 'galleries/')) {
            throw new \RuntimeException('file_path R2 inválido');
        }

        $maxFaces = min(10, max(1, (int) ($options['maxFacesToProcess'] ?? env('REKOG_FAST_MAX_FACES_PER_PHOTO') ?: 3)));
        $minArea = min(0.2, max(0.0, (float) ($options['minFaceAreaRatio'] ?? env('REKOG_FAST_MIN_FACE_AREA_RATIO') ?: 0.02)));
        $minConf = min(100.0, max(0.0, (float) ($options['minFaceConfidence'] ?? env('REKOG_FAST_MIN_FACE_CONFIDENCE') ?: 75)));
        $searchT = (int) (env('REKOG_SEARCH_FACE_MATCH_THRESHOLD') ?: env('REKOG_COMPARE_SIMILARITY_THRESHOLD') ?: 68);
        $searchT = max(50, min(100, $searchT));

        $buf = $this->media->bufferFromStoragePath('r2:'.$r2Key);
        if ($buf === null || $buf === '') {
            throw new \RuntimeException('Não foi possível obter a imagem do R2.');
        }
        $jpeg = $this->normalizeJpeg($buf);
        if ($jpeg === null) {
            throw new \RuntimeException('Imagem inválida para Rekognition.');
        }

        $detect = $this->rekogCall('DetectFaces', [
            'Image' => ['Bytes' => base64_encode($jpeg)],
            'Attributes' => ['DEFAULT'],
        ], $cfg);
        $rawFaces = $detect['FaceDetails'] ?? [];
        if (! is_array($rawFaces)) {
            $rawFaces = [];
        }
        $faces = [];
        foreach ($rawFaces as $idx => $face) {
            $box = $face['BoundingBox'] ?? [];
            $w = (float) ($box['Width'] ?? 0);
            $h = (float) ($box['Height'] ?? 0);
            $area = ($w > 0 && $h > 0) ? ($w * $h) : 0.0;
            $conf = (float) ($face['Confidence'] ?? 0);
            if ($area < $minArea || $conf < $minConf) {
                continue;
            }
            $faces[] = ['idx' => (int) $idx, 'box' => $box, 'confidence' => $conf, 'area' => $area];
        }
        usort($faces, static fn ($a, $b) => $b['area'] <=> $a['area']);
        $faces = array_slice($faces, 0, $maxFaces);

        if (Schema::hasTable('rekognition_face_matches') && Schema::hasTable('rekognition_photo_faces')) {
            DB::delete(
                'DELETE FROM rekognition_face_matches
                 WHERE photo_face_id IN (SELECT id FROM rekognition_photo_faces WHERE photo_id = ?)',
                [$photoId]
            );
            DB::delete('DELETE FROM rekognition_photo_faces WHERE photo_id = ?', [$photoId]);
        }

        $resultFaces = [];
        foreach ($faces as $face) {
            $photoFaceId = null;
            if (Schema::hasTable('rekognition_photo_faces')) {
                $ins = DB::selectOne(
                    'INSERT INTO rekognition_photo_faces (photo_id, face_index, bounding_box_json, confidence)
                     VALUES (?, ?, ?, ?) RETURNING id',
                    [$photoId, $face['idx'], json_encode($face['box']), $face['confidence']]
                );
                $photoFaceId = $ins ? (int) $ins->id : null;
            }
            $matches = [];
            try {
                $crop = $this->cropFaceJpeg($jpeg, $face['box']);
                if ($crop !== null) {
                    $search = $this->rekogCall('SearchFacesByImage', [
                        'CollectionId' => $cfg['collectionId'],
                        'Image' => ['Bytes' => base64_encode($crop)],
                        'FaceMatchThreshold' => $searchT,
                        'MaxFaces' => 5,
                    ], $cfg);
                    foreach (($search['FaceMatches'] ?? []) as $fm) {
                        $extId = $fm['Face']['ExternalImageId'] ?? null;
                        $clientId = $this->parseExternalImageId(is_string($extId) ? $extId : null, $galleryId);
                        if (! $clientId) {
                            continue;
                        }
                        $similarity = (float) ($fm['Similarity'] ?? 0);
                        $rekFaceId = $fm['Face']['FaceId'] ?? null;
                        if ($photoFaceId && Schema::hasTable('rekognition_face_matches')) {
                            DB::insert(
                                'INSERT INTO rekognition_face_matches (photo_face_id, client_id, similarity, rekognition_face_id)
                                 VALUES (?, ?, ?, ?)',
                                [$photoFaceId, $clientId, $similarity, $rekFaceId]
                            );
                        }
                        $matches[] = [
                            'clientId' => $clientId,
                            'similarity' => $similarity,
                            'rekognitionFaceId' => $rekFaceId,
                        ];
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('ks.face.searchFace', ['photoId' => $photoId, 'error' => $e->getMessage()]);
            }
            $resultFaces[] = [
                'index' => $face['idx'],
                'boundingBox' => $face['box'],
                'confidence' => $face['confidence'],
                'matches' => $matches,
            ];
        }

        if (Schema::hasTable('rekognition_photo_jobs')) {
            DB::statement(
                'INSERT INTO rekognition_photo_jobs (gallery_id, photo_id, r2_key, process_status, processed_at, error_message)
                 VALUES (?, ?, ?, \'done\', NOW(), NULL)
                 ON CONFLICT (gallery_id, photo_id) DO UPDATE SET
                   r2_key = EXCLUDED.r2_key,
                   process_status = EXCLUDED.process_status,
                   processed_at = EXCLUDED.processed_at,
                   error_message = NULL',
                [$galleryId, $photoId, $r2Key]
            );
        }

        return [
            'fromCache' => false,
            'galleryId' => $galleryId,
            'photoId' => $photoId,
            'faces' => $resultFaces,
        ];
    }

    private function useFaceSearchCache(): bool
    {
        $raw = strtolower(trim((string) (env('REKOG_FACE_USE_CACHE') ?: '0')));

        return in_array($raw, ['1', 'true', 'yes', 'on'], true);
    }

    /**
     * Mesmo formato de payload do Node (`{"photoIds":[...]}`), tolerando o array cru antigo.
     *
     * @return list<int>|null
     */
    private function getSearchCache(int $galleryId, int $clientId, string $key): ?array
    {
        if (! Schema::hasTable('rekognition_processing_cache')) {
            return null;
        }
        $row = DB::selectOne(
            'SELECT payload_json FROM rekognition_processing_cache WHERE cache_key = ? AND expires_at > NOW() LIMIT 1',
            ['search:'.$galleryId.':'.$clientId.':'.$key]
        );
        if (! $row) {
            return null;
        }
        $raw = $row->payload_json;
        $decoded = is_string($raw) ? json_decode($raw, true) : $raw;
        if (is_array($decoded) && isset($decoded['photoIds']) && is_array($decoded['photoIds'])) {
            $decoded = $decoded['photoIds'];
        }
        if (! is_array($decoded) || ! array_is_list($decoded)) {
            return null;
        }

        return array_values(array_filter(array_map('intval', $decoded), static fn ($id) => $id > 0));
    }

    /**
     * @param  list<int>  $photoIds
     */
    private function setSearchCache(int $galleryId, int $clientId, string $key, array $photoIds, int $ttlDays = 7): void
    {
        if (! Schema::hasTable('rekognition_processing_cache')) {
            return;
        }
        DB::statement(
            "INSERT INTO rekognition_processing_cache (cache_key, payload_json, expires_at)
             VALUES (?, ?, NOW() + (? || ' days')::interval)
             ON CONFLICT (cache_key) DO UPDATE SET payload_json = EXCLUDED.payload_json, expires_at = EXCLUDED.expires_at",
            [
                'search:'.$galleryId.':'.$clientId.':'.$key,
                json_encode(['photoIds' => array_values($photoIds)]),
                (string) $ttlDays,
            ]
        );
    }

    /**
     * Bytes da selfie/referência gravada no enroll (R2). `staging/` é legado do S3 do Node.
     */
    private function getReferenceImageBytes(int $galleryId, int $clientId): ?string
    {
        if (! Schema::hasTable('rekognition_client_faces')) {
            return null;
        }
        $row = DB::selectOne(
            'SELECT reference_r2_key FROM rekognition_client_faces WHERE gallery_id = ? AND client_id = ? LIMIT 1',
            [$galleryId, $clientId]
        );
        $ref = trim((string) ($row->reference_r2_key ?? ''));
        if ($ref === '' || str_starts_with(strtolower($ref), 'staging/')) {
            return null;
        }
        $key = str_starts_with(strtolower($ref), 'r2:') ? substr($ref, 3) : $ref;
        $key = ltrim($key, '/');
        if (! str_starts_with($key, 'galleries/')) {
            return null;
        }

        return $this->media->bufferFromStoragePath('r2:'.$key);
    }

    /**
     * Compara a referência do cliente contra um lote de `king_photos` via CompareFaces (modo sob demanda).
     * Sem collection indexada: cada chunk faz fetch das fotos e compara, com fallback por recorte de rosto.
     *
     * @param  list<object>  $photoRows  linhas com `id` e `file_path`
     * @param  array<string,mixed>  $opts
     * @return array{photoIds:list<int>, diagnostics:array<string,int>}
     */
    private function compareFacesAgainstPhotoRows(string $sourceImageBytes, array $photoRows, array $opts = []): array
    {
        $diag = [
            'totalRows' => count($photoRows),
            'compareAttempts' => 0,
            'compareMatches' => 0,
            'cropFaceCandidates' => 0,
            'cropCompareAttempts' => 0,
            'cropCompareMatches' => 0,
            'fetchErrors' => 0,
            'compareErrors' => 0,
        ];
        $cfg = $this->rekogConfig();
        if ($photoRows === [] || ! $cfg['enabled']) {
            return ['photoIds' => [], 'diagnostics' => $diag];
        }

        $sourceNorm = $this->normalizeJpegMax($sourceImageBytes, 2048, 84) ?? $sourceImageBytes;

        $speedMode = strtolower(trim((string) ($opts['speedMode'] ?? '') ?: (env('REKOG_SPEED_MODE_DEFAULT') ?: 'auto')));
        $isFast = in_array($speedMode, ['fast', 'turbo', 'rapid'], true);
        $compareMaxPx = min(2048, max(400, (int) (env('KINGSELECTION_FACE_COMPARE_MAX_PX') ?: ($isFast ? 720 : 960))));
        $concurrency = min(24, max(2, (int) (env('KINGSELECTION_FACE_COMPARE_CONCURRENCY') ?: ($isFast ? 10 : 8))));
        $cropMinConfidence = min(100, max(0, (int) (env('KINGSELECTION_FACE_CROP_MIN_CONFIDENCE') ?: 45)));
        $cropMaxFaces = min(12, max(1, (int) (env('KINGSELECTION_FACE_CROP_MAX_FACES') ?: ($isFast ? 4 : 8))));
        $cropFallbackEnabled = trim((string) (env('KINGSELECTION_FACE_CROP_FALLBACK') ?? '1')) !== '0';
        $deferCropFallback = strtolower(trim((string) (env('KINGSELECTION_FACE_DEFER_CROP_FALLBACK') ?? '1'))) !== '0';
        $compareThreshold = min(100, max(50, (int) (env('REKOG_COMPARE_SIMILARITY_THRESHOLD') ?: 68)));
        $relaxed = min(95, max(50, (int) (env('KINGSELECTION_FACE_RELAXED_THRESHOLD') ?: 62)));
        $thresholdMain = (float) max($relaxed, $compareThreshold);
        $thresholdFallback = (float) max(50, min($thresholdMain, (int) (env('KINGSELECTION_FACE_FALLBACK_THRESHOLD') ?: max(58, (int) $thresholdMain - 8))));

        if (($opts['verifySourceFace'] ?? false) === true) {
            $minConf = min(99, max(45, (int) (env('REKOG_SOURCE_VERIFY_MIN_CONFIDENCE') ?: 55)));
            $det = $this->detectFacesSafe($sourceNorm, $cfg);
            if ($det !== null) {
                $ok = array_filter($det, static fn ($f) => (float) ($f['Confidence'] ?? 0) >= $minConf);
                if ($ok === []) {
                    return ['photoIds' => [], 'diagnostics' => $diag];
                }
            }
        }

        // Recorta o rosto principal da selfie: reduz falso negativo quando o fundo tem outras pessoas.
        $sourceCmp = $sourceNorm;
        $srcFaces = $this->detectFacesSafe($sourceNorm, $cfg);
        if ($srcFaces !== null) {
            $srcFaces = $this->sortFacesByArea(array_filter(
                $srcFaces,
                static fn ($f) => (float) ($f['Confidence'] ?? 0) >= $cropMinConfidence && ! empty($f['BoundingBox'])
            ));
            if ($srcFaces !== []) {
                $crop = $this->cropFaceJpeg($sourceNorm, $srcFaces[0]['BoundingBox'], 0.12);
                if ($crop !== null) {
                    $sourceCmp = $this->normalizeJpegMax($crop, 1024, 84) ?? $crop;
                }
            }
        }
        $sourceB64 = base64_encode($sourceCmp);

        $matched = [];
        $misses = [];
        foreach (array_chunk($photoRows, $concurrency) as $slice) {
            $targets = [];
            foreach ($slice as $row) {
                $buf = $this->fetchPhotoBuffer((string) ($row->file_path ?? ''));
                if ($buf === null || $buf === '') {
                    $diag['fetchErrors']++;

                    continue;
                }
                $targets[(int) $row->id] = $this->normalizeJpegMax($buf, $compareMaxPx, 80) ?? $buf;
            }
            if ($targets === []) {
                continue;
            }
            $requests = [];
            foreach ($targets as $id => $bin) {
                $requests[$id] = $this->rekogSignedRequest('CompareFaces', [
                    'SourceImage' => ['Bytes' => $sourceB64],
                    'TargetImage' => ['Bytes' => base64_encode($bin)],
                    'SimilarityThreshold' => $compareThreshold,
                ], $cfg);
            }
            $diag['compareAttempts'] += count($requests);
            foreach ($this->rekogPool($requests) as $id => $out) {
                if ($out === null) {
                    $diag['compareErrors']++;

                    continue;
                }
                $best = (float) ($out['FaceMatches'][0]['Similarity'] ?? 0);
                if (($out['FaceMatches'] ?? []) !== [] && $best >= $thresholdMain) {
                    $matched[(int) $id] = true;
                    $diag['compareMatches']++;

                    continue;
                }
                if ($cropFallbackEnabled) {
                    $misses[(int) $id] = $targets[$id];
                }
            }
        }

        $runFallback = $cropFallbackEnabled && $misses !== [] && (! $deferCropFallback || $matched === []);
        if ($runFallback) {
            $maxCandidates = min(500, max(1, (int) (env('KINGSELECTION_FACE_FAST_FALLBACK_MAX_CANDIDATES') ?: ($isFast ? 120 : count($misses)))));
            if ($isFast && count($misses) > $maxCandidates) {
                $misses = array_slice($misses, 0, $maxCandidates, true);
            }
            $fallbackConcurrency = min(8, max(1, intdiv($concurrency, 2)));
            foreach (array_chunk($misses, $fallbackConcurrency, true) as $slice) {
                $cropRequests = [];
                foreach ($slice as $id => $targetBuf) {
                    if (isset($matched[$id])) {
                        continue;
                    }
                    $faces = $this->detectFacesSafe($targetBuf, $cfg);
                    if ($faces === null) {
                        continue;
                    }
                    $faces = array_slice($this->sortFacesByArea(array_filter(
                        $faces,
                        static fn ($f) => (float) ($f['Confidence'] ?? 0) >= $cropMinConfidence && ! empty($f['BoundingBox'])
                    )), 0, $cropMaxFaces);
                    $diag['cropFaceCandidates'] += count($faces);
                    foreach ($faces as $i => $face) {
                        $crop = $this->cropFaceJpeg($targetBuf, $face['BoundingBox'], 0.12);
                        if ($crop === null) {
                            continue;
                        }
                        $crop = $this->normalizeJpegMax($crop, 1024, 84) ?? $crop;
                        $cropRequests[$id.':'.$i] = $this->rekogSignedRequest('CompareFaces', [
                            'SourceImage' => ['Bytes' => $sourceB64],
                            'TargetImage' => ['Bytes' => base64_encode($crop)],
                            'SimilarityThreshold' => $compareThreshold,
                        ], $cfg);
                    }
                }
                if ($cropRequests === []) {
                    continue;
                }
                $diag['cropCompareAttempts'] += count($cropRequests);
                foreach ($this->rekogPool($cropRequests) as $key => $out) {
                    if ($out === null) {
                        $diag['compareErrors']++;

                        continue;
                    }
                    $id = (int) strtok((string) $key, ':');
                    if (isset($matched[$id])) {
                        continue;
                    }
                    $best = (float) ($out['FaceMatches'][0]['Similarity'] ?? 0);
                    if (($out['FaceMatches'] ?? []) !== [] && $best >= $thresholdFallback) {
                        $matched[$id] = true;
                        $diag['cropCompareMatches']++;
                    }
                }
            }
        }

        return ['photoIds' => array_map('intval', array_keys($matched)), 'diagnostics' => $diag];
    }

    /**
     * @return list<array<string,mixed>>|null null quando a chamada falhou (não é "sem rostos")
     */
    private function detectFacesSafe(string $jpeg, array $cfg): ?array
    {
        try {
            $out = $this->rekogCall('DetectFaces', [
                'Image' => ['Bytes' => base64_encode($jpeg)],
                'Attributes' => ['DEFAULT'],
            ], $cfg);
        } catch (\Throwable) {
            return null;
        }
        $faces = $out['FaceDetails'] ?? [];

        return is_array($faces) ? array_values($faces) : [];
    }

    /**
     * @param  iterable<array<string,mixed>>  $faces
     * @return list<array<string,mixed>>
     */
    private function sortFacesByArea(iterable $faces): array
    {
        $list = is_array($faces) ? array_values($faces) : iterator_to_array($faces, false);
        usort($list, static function ($a, $b) {
            $aa = (float) ($a['BoundingBox']['Width'] ?? 0) * (float) ($a['BoundingBox']['Height'] ?? 0);
            $bb = (float) ($b['BoundingBox']['Width'] ?? 0) * (float) ($b['BoundingBox']['Height'] ?? 0);

            return $bb <=> $aa;
        });

        return $list;
    }

    private function fetchPhotoBuffer(string $filePath): ?string
    {
        $path = trim($filePath);
        if ($path === '') {
            return null;
        }
        try {
            return $this->media->bufferFromStoragePath($path);
        } catch (\Throwable $e) {
            Log::warning('ks.face.fetchPhoto', ['path' => $path, 'error' => $e->getMessage()]);

            return null;
        }
    }

    /**
     * @param  array<string,mixed>  $box
     */
    private function cropFaceJpeg(string $jpegBinary, array $box, float $pad = 0.15): ?string
    {
        $img = @imagecreatefromstring($jpegBinary);
        if ($img === false) {
            return null;
        }
        $w = imagesx($img);
        $h = imagesy($img);
        $left = (float) ($box['Left'] ?? 0);
        $top = (float) ($box['Top'] ?? 0);
        $bw = (float) ($box['Width'] ?? 0);
        $bh = (float) ($box['Height'] ?? 0);
        $x = (int) max(0, floor(($left - $pad * $bw) * $w));
        $y = (int) max(0, floor(($top - $pad * $bh) * $h));
        $cw = (int) min($w - $x, ceil(($bw + 2 * $pad * $bw) * $w));
        $ch = (int) min($h - $y, ceil(($bh + 2 * $pad * $bh) * $h));
        if ($cw < 8 || $ch < 8) {
            imagedestroy($img);

            return null;
        }
        $crop = imagecrop($img, ['x' => $x, 'y' => $y, 'width' => $cw, 'height' => $ch]);
        imagedestroy($img);
        if ($crop === false) {
            return null;
        }
        ob_start();
        imagejpeg($crop, null, 90);
        $out = (string) ob_get_clean();
        imagedestroy($crop);

        return $out !== '' ? $out : null;
    }

    private function parseExternalImageId(?string $extId, int $galleryId): ?int
    {
        if ($extId === null || $extId === '') {
            return null;
        }
        if (preg_match('/^g(\d+)_c(\d+)$/', $extId, $m)) {
            if ((int) $m[1] !== $galleryId) {
                return null;
            }

            return (int) $m[2];
        }

        return null;
    }

    private function publicUrlFromPath(string $filePath): ?string
    {
        $key = trim($filePath);
        if (str_starts_with(strtolower($key), 'r2:')) {
            $key = substr($key, 3);
        }
        $key = ltrim($key, '/');
        if ($key === '') {
            return null;
        }
        $base = rtrim((string) ($this->r2->config()['publicBaseUrl'] ?? ''), '/');
        if ($base === '') {
            return null;
        }
        $segments = array_map('rawurlencode', array_values(array_filter(explode('/', $key))));

        return $base.'/'.implode('/', $segments);
    }

    /**
     * @return array{enabled:bool, region:string, collectionId:string, accessKeyId:string, secretAccessKey:string}
     */
    private function rekogConfig(): array
    {
        $key = trim((string) (env('AWS_ACCESS_KEY_ID') ?: ''));
        $secret = trim((string) (env('AWS_SECRET_ACCESS_KEY') ?: ''));

        return [
            'enabled' => $key !== '' && $secret !== '',
            'region' => trim((string) (env('AWS_REGION') ?: 'us-east-1')),
            'collectionId' => trim((string) (env('REKOG_COLLECTION_ID') ?: 'kingselection')),
            'accessKeyId' => $key,
            'secretAccessKey' => $secret,
        ];
    }

    private function normalizeJpeg(string $binary): ?string
    {
        return $this->normalizeJpegMax($binary, 1600, 90);
    }

    private function normalizeJpegMax(string $binary, int $max, int $quality): ?string
    {
        $img = @imagecreatefromstring($binary);
        if ($img === false) {
            return null;
        }
        $w = imagesx($img);
        $h = imagesy($img);
        if (max($w, $h) > $max) {
            $scale = $max / max($w, $h);
            $nw = max(1, (int) round($w * $scale));
            $nh = max(1, (int) round($h * $scale));
            $dst = imagecreatetruecolor($nw, $nh);
            imagecopyresampled($dst, $img, 0, 0, 0, 0, $nw, $nh, $w, $h);
            imagedestroy($img);
            $img = $dst;
        }
        ob_start();
        imagejpeg($img, null, max(40, min(100, $quality)));
        $out = (string) ob_get_clean();
        imagedestroy($img);

        return $out !== '' ? $out : null;
    }

    /**
     * @param  array{region:string, collectionId:string, accessKeyId:string, secretAccessKey:string}  $cfg
     * @return array<string,mixed>
     */
    private function indexFacesBytes(string $jpeg, string $externalImageId, array $cfg): array
    {
        return $this->rekogCall('IndexFaces', [
            'CollectionId' => $cfg['collectionId'],
            'ExternalImageId' => substr(preg_replace('/[^A-Za-z0-9_.\-:]/', '_', $externalImageId) ?: 'face', 0, 255),
            'Image' => ['Bytes' => base64_encode($jpeg)],
            'MaxFaces' => 3,
            'QualityFilter' => 'AUTO',
            'DetectionAttributes' => [],
        ], $cfg);
    }

    /**
     * @param  array<string,mixed>  $payload
     * @param  array{region:string, accessKeyId:string, secretAccessKey:string}  $cfg
     * @return array<string,mixed>
     */
    private function rekogCall(string $action, array $payload, array $cfg): array
    {
        $req = $this->rekogSignedRequest($action, $payload, $cfg);

        $res = Http::withHeaders($req['headers'])
            ->withBody($req['body'], 'application/x-amz-json-1.1')
            ->timeout(60)
            ->post($req['url']);

        if (! $res->successful()) {
            throw new \RuntimeException('HTTP '.$res->status().': '.substr($res->body(), 0, 200));
        }
        $json = $res->json();
        if (! is_array($json)) {
            throw new \RuntimeException('Resposta Rekognition inválida');
        }

        return $json;
    }

    /**
     * Dispara vários pedidos Rekognition em paralelo (CompareFaces por chunk cabe no timeout do proxy).
     *
     * @param  array<array-key, array{url:string, headers:array<string,string>, body:string}>  $requests
     * @return array<array-key, array<string,mixed>|null> null = falha nesse pedido
     */
    private function rekogPool(array $requests): array
    {
        if ($requests === []) {
            return [];
        }
        $keys = array_keys($requests);
        $responses = Http::pool(function (\Illuminate\Http\Client\Pool $pool) use ($requests) {
            $pending = [];
            foreach ($requests as $key => $req) {
                $pending[] = $pool->as((string) $key)
                    ->withHeaders($req['headers'])
                    ->withBody($req['body'], 'application/x-amz-json-1.1')
                    ->timeout(60)
                    ->post($req['url']);
            }

            return $pending;
        });

        $out = [];
        foreach ($keys as $key) {
            $res = $responses[(string) $key] ?? null;
            if (! $res instanceof \Illuminate\Http\Client\Response || ! $res->successful()) {
                if ($res instanceof \Throwable) {
                    Log::warning('ks.face.rekogPool', ['error' => $res->getMessage()]);
                }
                $out[$key] = null;

                continue;
            }
            $json = $res->json();
            $out[$key] = is_array($json) ? $json : null;
        }

        return $out;
    }

    /**
     * @param  array<string,mixed>  $payload
     * @param  array{region:string, accessKeyId:string, secretAccessKey:string}  $cfg
     * @return array{url:string, headers:array<string,string>, body:string}
     */
    private function rekogSignedRequest(string $action, array $payload, array $cfg): array
    {
        $body = json_encode($payload, JSON_UNESCAPED_SLASHES);
        if ($body === false) {
            throw new \RuntimeException('JSON inválido');
        }
        $amzTarget = 'RekognitionService.'.$action;
        $host = 'rekognition.'.$cfg['region'].'.amazonaws.com';
        $amzDate = gmdate('Ymd\THis\Z');
        $dateStamp = gmdate('Ymd');
        $payloadHash = hash('sha256', $body);
        $canonicalHeaders = "content-type:application/x-amz-json-1.1\n"
            ."host:{$host}\n"
            ."x-amz-date:{$amzDate}\n"
            ."x-amz-target:{$amzTarget}\n";
        $signedHeaders = 'content-type;host;x-amz-date;x-amz-target';
        $canonicalRequest = "POST\n/\n\n{$canonicalHeaders}\n{$signedHeaders}\n{$payloadHash}";
        $credentialScope = "{$dateStamp}/{$cfg['region']}/rekognition/aws4_request";
        $stringToSign = "AWS4-HMAC-SHA256\n{$amzDate}\n{$credentialScope}\n".hash('sha256', $canonicalRequest);
        $kDate = hash_hmac('sha256', $dateStamp, 'AWS4'.$cfg['secretAccessKey'], true);
        $kRegion = hash_hmac('sha256', $cfg['region'], $kDate, true);
        $kService = hash_hmac('sha256', 'rekognition', $kRegion, true);
        $kSigning = hash_hmac('sha256', 'aws4_request', $kService, true);
        $signature = hash_hmac('sha256', $stringToSign, $kSigning);
        $authorization = "AWS4-HMAC-SHA256 Credential={$cfg['accessKeyId']}/{$credentialScope}, SignedHeaders={$signedHeaders}, Signature={$signature}";

        return [
            'url' => 'https://'.$host.'/',
            'headers' => [
                'Authorization' => $authorization,
                'Content-Type' => 'application/x-amz-json-1.1',
                'Host' => $host,
                'X-Amz-Date' => $amzDate,
                'X-Amz-Target' => $amzTarget,
            ],
            'body' => $body,
        ];
    }

    /**
     * Painel admin: GET /facial/status
     *
     * @return array{status:int, body:array<string,mixed>}
     */
    public function facialStatus(string $userId, int $galleryId): array
    {
        if ($galleryId < 1) {
            return ['status' => 400, 'body' => ['message' => 'galleryId é obrigatório.']];
        }
        $g = DB::selectOne(
            'SELECT g.id, g.nome_projeto FROM king_galleries g
             JOIN profile_items pi ON pi.id = g.profile_item_id
             WHERE g.id = ? AND pi.user_id = ? LIMIT 1',
            [$galleryId, $userId]
        );
        if (! $g) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão.']];
        }
        $totalPhotos = (int) (DB::selectOne(
            'SELECT COUNT(*)::int AS n FROM king_photos WHERE gallery_id = ?',
            [$galleryId]
        )->n ?? 0);
        $processedPhotos = 0;
        $errorPhotos = 0;
        $pendingPhotos = 0;
        $totalFaces = 0;
        $enrolledClients = 0;
        if (Schema::hasTable('rekognition_photo_jobs')) {
            $processedPhotos = (int) (DB::selectOne(
                "SELECT COUNT(*)::int AS n FROM rekognition_photo_jobs WHERE gallery_id = ? AND process_status = 'done'",
                [$galleryId]
            )->n ?? 0);
            $errorPhotos = (int) (DB::selectOne(
                "SELECT COUNT(*)::int AS n FROM rekognition_photo_jobs WHERE gallery_id = ? AND process_status = 'error'",
                [$galleryId]
            )->n ?? 0);
            $pendingPhotos = (int) (DB::selectOne(
                "SELECT COUNT(*)::int AS n FROM rekognition_photo_jobs
                 WHERE gallery_id = ? AND process_status IN ('pending','processing')",
                [$galleryId]
            )->n ?? 0);
        }
        if (Schema::hasTable('rekognition_photo_faces')) {
            $totalFaces = (int) (DB::selectOne(
                'SELECT COUNT(*)::int AS n FROM rekognition_photo_faces rpf
                 JOIN king_photos kp ON kp.id = rpf.photo_id WHERE kp.gallery_id = ?',
                [$galleryId]
            )->n ?? 0);
        }
        if (Schema::hasTable('rekognition_client_faces')) {
            $enrolledClients = (int) (DB::selectOne(
                'SELECT COUNT(DISTINCT client_id)::int AS n FROM rekognition_client_faces WHERE gallery_id = ?',
                [$galleryId]
            )->n ?? 0);
        }

        return ['status' => 200, 'body' => [
            'success' => true,
            'galleryName' => (string) ($g->nome_projeto ?? ''),
            'totalPhotos' => $totalPhotos,
            'processedPhotos' => $processedPhotos,
            'errorPhotos' => $errorPhotos,
            'pendingPhotos' => $pendingPhotos,
            'totalFaces' => $totalFaces,
            'enrolledClients' => $enrolledClients,
            'rekogOnDemand' => $this->isRekogOnDemand(),
        ]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function facialClients(string $userId, int $galleryId): array
    {
        if ($galleryId < 1) {
            return ['status' => 400, 'body' => ['message' => 'galleryId é obrigatório.']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão.']];
        }
        if (! Schema::hasTable('rekognition_client_faces')) {
            return ['status' => 200, 'body' => ['success' => true, 'clients' => []]];
        }
        $hasMatches = Schema::hasTable('rekognition_face_matches') && Schema::hasTable('rekognition_photo_faces');
        $matchSub = $hasMatches
            ? '(SELECT COUNT(DISTINCT kp.id)::int
                 FROM rekognition_face_matches rfm
                 JOIN rekognition_photo_faces rpf ON rpf.id = rfm.photo_face_id
                 JOIN king_photos kp ON kp.id = rpf.photo_id
                 WHERE rfm.client_id = c.id AND kp.gallery_id = ?)'
            : '0';
        $params = $hasMatches ? [$galleryId, $galleryId, $galleryId] : [$galleryId, $galleryId];
        $rows = DB::select(
            "SELECT c.id AS \"clientId\", c.nome, c.email,
                    COUNT(rcf.id)::int AS \"faceCount\",
                    {$matchSub} AS \"matchCount\"
             FROM king_gallery_clients c
             JOIN rekognition_client_faces rcf ON rcf.client_id = c.id AND rcf.gallery_id = ?
             WHERE c.gallery_id = ?
             GROUP BY c.id, c.nome, c.email
             ORDER BY c.nome",
            $params
        );
        $clients = array_map(static function ($r) {
            return [
                'clientId' => (int) $r->clientId,
                'nome' => $r->nome,
                'email' => $r->email,
                'faceCount' => (int) $r->faceCount,
                'matchCount' => (int) $r->matchCount,
            ];
        }, $rows);

        return ['status' => 200, 'body' => ['success' => true, 'clients' => $clients]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function facialJobs(string $userId, int $galleryId, int $limit = 50): array
    {
        if ($galleryId < 1) {
            return ['status' => 400, 'body' => ['message' => 'galleryId é obrigatório.']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão.']];
        }
        $limit = min(200, max(1, $limit));
        if (! Schema::hasTable('rekognition_photo_jobs')) {
            return ['status' => 200, 'body' => ['success' => true, 'jobs' => []]];
        }
        $faceCountSel = Schema::hasTable('rekognition_photo_faces')
            ? '(SELECT COUNT(*)::int FROM rekognition_photo_faces WHERE photo_id = rpj.photo_id)'
            : '0';
        $rows = DB::select(
            "SELECT rpj.photo_id AS \"photoId\", kp.original_name AS \"photoName\",
                    rpj.process_status AS status, rpj.processed_at AS \"processedAt\",
                    rpj.error_message AS \"errorMessage\",
                    {$faceCountSel} AS \"faceCount\"
             FROM rekognition_photo_jobs rpj
             JOIN king_photos kp ON kp.id = rpj.photo_id
             WHERE rpj.gallery_id = ?
             ORDER BY rpj.processed_at DESC NULLS LAST, rpj.photo_id DESC
             LIMIT ?",
            [$galleryId, $limit]
        );
        $jobs = array_map(static function ($r) {
            return [
                'photoId' => (int) $r->photoId,
                'photoName' => $r->photoName,
                'status' => $r->status,
                'processedAt' => $r->processedAt,
                'errorMessage' => $r->errorMessage,
                'faceCount' => (int) $r->faceCount,
            ];
        }, $rows);

        return ['status' => 200, 'body' => ['success' => true, 'jobs' => $jobs]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function facialMatches(string $userId, int $galleryId, int $clientId): array
    {
        if ($galleryId < 1 || $clientId < 1) {
            return ['status' => 400, 'body' => ['message' => 'galleryId e clientId são obrigatórios.']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão.']];
        }
        if (! Schema::hasTable('rekognition_face_matches') || ! Schema::hasTable('rekognition_photo_faces')) {
            return ['status' => 200, 'body' => ['success' => true, 'matches' => []]];
        }
        $rows = DB::select(
            'SELECT kp.id AS "photoId", kp.original_name AS "photoName",
                    MAX(rfm.similarity) AS similarity
             FROM king_photos kp
             JOIN rekognition_photo_faces rpf ON rpf.photo_id = kp.id
             JOIN rekognition_face_matches rfm ON rfm.photo_face_id = rpf.id
             WHERE kp.gallery_id = ? AND rfm.client_id = ?
             GROUP BY kp.id, kp.original_name
             ORDER BY similarity DESC, kp.id',
            [$galleryId, $clientId]
        );
        $matches = array_map(static function ($r) {
            return [
                'photoId' => (int) $r->photoId,
                'photoName' => $r->photoName,
                'similarity' => $r->similarity !== null ? (float) $r->similarity : null,
            ];
        }, $rows);

        return ['status' => 200, 'body' => ['success' => true, 'matches' => $matches]];
    }

    /**
     * POST /facial/process — reutiliza processAllFaces (background após resposta).
     *
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function facialProcess(string $userId, int $galleryId, array $body = []): array
    {
        if ($galleryId < 1) {
            return ['status' => 400, 'body' => ['message' => 'galleryId é obrigatório.']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão.']];
        }
        $cfg = $this->rekogConfig();
        if (! $cfg['enabled']) {
            return ['status' => 503, 'body' => [
                'message' => 'Reconhecimento facial não configurado. Verifique as variáveis de ambiente AWS e S3 staging.',
            ]];
        }
        if (! Schema::hasTable('rekognition_photo_jobs')) {
            return ['status' => 503, 'body' => [
                'message' => 'Tabelas de reconhecimento facial não encontradas. Execute as migrations.',
            ]];
        }
        $queued = (int) (DB::selectOne(
            "SELECT COUNT(*)::int AS n FROM king_photos kp
             WHERE kp.gallery_id = ?
               AND NOT EXISTS (
                 SELECT 1 FROM rekognition_photo_jobs rpj
                 WHERE rpj.gallery_id = ? AND rpj.photo_id = kp.id
                   AND rpj.process_status IN ('done', 'processing')
               )",
            [$galleryId, $galleryId]
        )->n ?? 0);
        if ($queued === 0) {
            return ['status' => 200, 'body' => [
                'success' => true,
                'queued' => 0,
                'message' => 'Todas as fotos já foram processadas.',
            ]];
        }
        $r = $this->processAllFaces($userId, $galleryId, $body);

        return [
            'status' => $r['status'],
            'body' => array_merge($r['body'], [
                'queued' => $queued,
                'message' => $r['body']['message'] ?? "{$queued} foto(s) enviadas para processamento. Acompanhe o progresso no painel.",
            ]),
        ];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function facialProgress(string $userId, int $galleryId): array
    {
        if ($galleryId < 1) {
            return ['status' => 400, 'body' => ['message' => 'galleryId é obrigatório.']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão.']];
        }
        $total = (int) (DB::selectOne(
            'SELECT COUNT(*)::int AS n FROM king_photos WHERE gallery_id = ?',
            [$galleryId]
        )->n ?? 0);
        $done = 0;
        $processing = 0;
        $pending = 0;
        $error = 0;
        if (Schema::hasTable('rekognition_photo_jobs')) {
            $rows = DB::select(
                'SELECT process_status, COUNT(*)::int AS cnt FROM rekognition_photo_jobs WHERE gallery_id = ? GROUP BY process_status',
                [$galleryId]
            );
            foreach ($rows as $r) {
                $s = (string) ($r->process_status ?? '');
                if ($s === 'done') {
                    $done = (int) $r->cnt;
                } elseif ($s === 'processing') {
                    $processing = (int) $r->cnt;
                } elseif ($s === 'pending') {
                    $pending = (int) $r->cnt;
                } elseif ($s === 'error') {
                    $error = (int) $r->cnt;
                }
            }
        }
        $isRunning = $processing > 0 || $pending > 0;

        return ['status' => 200, 'body' => [
            'success' => true,
            'total' => $total,
            'done' => $done,
            'processing' => $processing,
            'pending' => $pending,
            'error' => $error,
            'isRunning' => $isRunning,
            'pct' => $total > 0 ? (int) round(($done / $total) * 100) : 0,
        ]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function facialDeleteClientFaces(string $userId, int $galleryId, int $clientId): array
    {
        if ($galleryId < 1 || $clientId < 1) {
            return ['status' => 400, 'body' => ['message' => 'galleryId e clientId são obrigatórios.']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão.']];
        }
        if (Schema::hasTable('rekognition_face_matches')) {
            DB::delete('DELETE FROM rekognition_face_matches WHERE client_id = ?', [$clientId]);
        }
        $deleted = 0;
        if (Schema::hasTable('rekognition_client_faces')) {
            $deleted = DB::delete(
                'DELETE FROM rekognition_client_faces WHERE gallery_id = ? AND client_id = ?',
                [$galleryId, $clientId]
            );
        }

        return ['status' => 200, 'body' => [
            'success' => true,
            'deleted' => $deleted,
            'message' => "{$deleted} rosto(s) removido(s).",
        ]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function facialDiagnose(string $userId, ?int $galleryId = null): array
    {
        // Auth já validado pelo middleware JWT; userId só para exigir sessão.
        if ($userId === '') {
            return ['status' => 401, 'body' => ['message' => 'Não autenticado.']];
        }
        $colExists = Schema::hasColumn('king_galleries', 'face_recognition_enabled');
        $tables = ['rekognition_client_faces', 'rekognition_photo_jobs', 'rekognition_photo_faces', 'rekognition_face_matches'];
        $tableStatus = [];
        foreach ($tables as $t) {
            $tableStatus[$t] = Schema::hasTable($t);
        }
        $cfg = $this->rekogConfig();
        $env = [
            'AWS_ACCESS_KEY_ID' => trim((string) (env('AWS_ACCESS_KEY_ID') ?: '')) !== '',
            'AWS_SECRET_ACCESS_KEY' => trim((string) (env('AWS_SECRET_ACCESS_KEY') ?: '')) !== '',
            'AWS_REGION' => trim((string) (env('AWS_REGION') ?: '')) !== '',
            'S3_STAGING_BUCKET' => trim((string) (env('S3_STAGING_BUCKET') ?: '')) !== '',
            'REKOGNITION_COLLECTION_ID' => $cfg['collectionId'] !== '',
        ];
        $galleryFaceEnabled = null;
        if ($galleryId && $galleryId > 0 && $colExists) {
            $r = DB::selectOne('SELECT face_recognition_enabled FROM king_galleries WHERE id = ? LIMIT 1', [$galleryId]);
            $galleryFaceEnabled = $r->face_recognition_enabled ?? null;
        }

        return ['status' => 200, 'body' => [
            'success' => true,
            'migration182' => $colExists
                ? 'OK: coluna face_recognition_enabled EXISTS'
                : 'MISSING: coluna face_recognition_enabled — migration 182 nao rodou',
            'tables' => $tableStatus,
            'envConfigured' => $env,
            'galleryId' => $galleryId ?: null,
            'galleryFaceEnabled' => $galleryFaceEnabled !== null ? (bool) $galleryFaceEnabled : null,
            'rekogEnabled' => $cfg['enabled'],
            'rekogOnDemand' => $this->isRekogOnDemand(),
        ]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function awsCheck(): array
    {
        $cfg = $this->rekogConfig();
        $bucket = trim((string) (env('S3_STAGING_BUCKET') ?: env('AWS_S3_STAGING_BUCKET') ?: ''));

        return ['status' => 200, 'body' => [
            's3' => [
                'enabled' => $bucket !== '' && $cfg['enabled'],
            ],
            'rekog' => [
                'enabled' => $cfg['enabled'],
            ],
        ]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function awsPing(): array
    {
        $cfg = $this->rekogConfig();
        $bucket = trim((string) (env('S3_STAGING_BUCKET') ?: env('AWS_S3_STAGING_BUCKET') ?: ''));

        return ['status' => 200, 'body' => [
            'success' => true,
            's3' => $bucket !== '' && $cfg['enabled'],
            'rekog' => $cfg['enabled'],
            // Sem nomes de bucket/collection em claro (só estado on/off)
            'bucket' => $bucket !== '',
            'collection' => ! empty($cfg['collectionId']),
        ]];
    }

    /**
     * Mesma semântica do Node (`useRekogOnDemand`): ligado por omissão, só desliga com `0`/`false`.
     * Divergir daqui faz o front receber lista vazia em vez de FACE_USE_CHUNKED.
     */
    private function isRekogOnDemand(): bool
    {
        $v = strtolower(trim((string) (env('REKOG_ON_DEMAND') ?? '')));
        if ($v === '') {
            return true;
        }

        return $v !== '0' && $v !== 'false';
    }

    private function ownedGallery(string $userId, int $galleryId): bool
    {
        return (bool) DB::selectOne(
            'SELECT g.id FROM king_galleries g
             JOIN profile_items pi ON pi.id = g.profile_item_id
             WHERE g.id = ? AND pi.user_id = ? LIMIT 1',
            [$galleryId, $userId]
        );
    }
}
