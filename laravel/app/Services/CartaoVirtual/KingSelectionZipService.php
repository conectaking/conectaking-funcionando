<?php

namespace App\Services\CartaoVirtual;

use App\Support\KingSelection\KsAccess;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use App\Support\SchemaMeta;
use ZipArchive;

/**
 * ZIP do cliente KS — paridade com POST /client/download-zip(-plan).
 */
class KingSelectionZipService
{
    private const MAX_PHOTOS = 10000;

    public function __construct(
        private readonly KingSelectionMediaService $media,
        private readonly KingSelectionSalesService $sales,
    ) {
    }

    /**
     * @param  array<string,mixed>  $payload
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function downloadZipPlan(array $payload, array $body): array
    {
        $slug = trim((string) ($body['slug'] ?? ''));
        if ($slug !== '' && $slug !== (string) ($payload['slug'] ?? '')) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão para esta galeria.']];
        }
        $wantedIds = $this->parseWantedIds($body['photo_ids'] ?? null);
        if ($wantedIds === []) {
            return ['status' => 400, 'body' => ['message' => 'Selecione pelo menos 1 foto para planear o ZIP.']];
        }
        $galleryId = (int) ($payload['galleryId'] ?? 0);
        $g = $this->loadGallery($galleryId);
        if (! $g) {
            return ['status' => 404, 'body' => ['message' => 'Galeria não encontrada.']];
        }
        $accessMode = KsAccess::normAccessMode($g->access_mode ?? 'private');
        $items = [];

        if ($accessMode === 'paid_event_photos') {
            $built = $this->resolvePaidZipRows($payload, $wantedIds, $galleryId);
            if (($built['status'] ?? 200) !== 200) {
                return ['status' => $built['status'], 'body' => $built['body']];
            }
            foreach ($wantedIds as $id) {
                $r = $built['byPhoto'][$id] ?? null;
                if (! $r) {
                    continue;
                }
                $mode = $this->sales->normalizeDeliveryMode($r->delivery_mode ?? null);
                if ($mode === 'edited' && trim((string) ($r->edited_file_path ?? '')) === '') {
                    continue;
                }
                $sourcePath = $mode === 'edited'
                    ? trim((string) ($r->edited_file_path ?? ''))
                    : trim((string) ($r->file_path ?? ''));
                if ($sourcePath === '') {
                    continue;
                }
                $items[] = ['photo_id' => $id, 'approx_bytes' => $this->approxBytes()];
            }
        } elseif ($accessMode === 'public') {
            $rights = $this->resolvePublicVisitorDownloadRights($galleryId, $payload);
            if (! $rights['ok']) {
                return ['status' => 403, 'body' => ['message' => $rights['denyMessage']]];
            }
            foreach ($wantedIds as $wid) {
                if (! isset($rights['allowedPhotoIdSet'][$wid])) {
                    return ['status' => 403, 'body' => [
                        'message' => 'Algumas fotos não estão liberadas para o seu download (cupom ou seleção).',
                    ]];
                }
            }
            $rows = $this->photosByIds($galleryId, $wantedIds);
            $byId = [];
            foreach ($rows as $r) {
                $byId[(int) $r->id] = $r;
            }
            foreach ($wantedIds as $id) {
                $r = $byId[$id] ?? null;
                if (! $r || trim((string) ($r->file_path ?? '')) === '') {
                    continue;
                }
                $items[] = ['photo_id' => $id, 'approx_bytes' => $this->approxBytes()];
            }
        } else {
            return ['status' => 403, 'body' => ['message' => 'Plano de ZIP não disponível neste modo de galeria.']];
        }

        $maxPart = $this->partMaxBytes();
        $parts = $this->partitionItems($items, $maxPart);
        $totalApprox = array_sum(array_map(static fn ($it) => (int) ($it['approx_bytes'] ?? 0), $items));

        return ['status' => 200, 'body' => [
            'success' => true,
            'gallery_name' => trim((string) ($g->nome_projeto ?? '')) ?: null,
            'part_max_bytes' => $maxPart,
            'part_max_photos' => $this->partMaxPhotos(),
            'total_photos' => count($items),
            'total_approx_bytes' => $totalApprox,
            'parts' => $parts,
            'hint' => count($parts) > 1
                ? 'São '.count($parts).' partes (máx. '.$this->partMaxPhotos().' fotos por ZIP). Baixe cada parte em sequência.'
                : 'Pode gerar um único ZIP com POST /client/download-zip com estes photo_ids.',
        ]];
    }

    /**
     * @param  array<string,mixed>  $payload
     * @param  array<string,mixed>  $body
     * @return array{status:int, body?:array<string,mixed>, binary?:string, zip_path?:string, filename?:string, entries?:int}
     */
    public function downloadZip(array $payload, array $body, ?string $ip, ?string $userAgent): array
    {
        $slug = trim((string) ($body['slug'] ?? ''));
        if ($slug !== '' && $slug !== (string) ($payload['slug'] ?? '')) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão para esta galeria.']];
        }
        $wantedIds = $this->parseWantedIds($body['photo_ids'] ?? null);
        if ($wantedIds === []) {
            return ['status' => 400, 'body' => ['message' => 'Selecione pelo menos 1 foto liberada para gerar ZIP.']];
        }
        $galleryId = (int) ($payload['galleryId'] ?? 0);
        $g = $this->loadGallery($galleryId);
        if (! $g) {
            return ['status' => 404, 'body' => ['message' => 'Galeria não encontrada.']];
        }
        $accessMode = KsAccess::normAccessMode($g->access_mode ?? 'private');
        $zipPart = isset($body['zip_part']) && (int) $body['zip_part'] > 0 ? (int) $body['zip_part'] : 0;
        $partLabel = $zipPart > 0 ? '_part'.$zipPart : '';
        $zipNameBase = $this->safeZipBase((string) ($g->nome_projeto ?? ''), (string) ($payload['slug'] ?? 'fotos'));

        if ($accessMode === 'paid_event_photos') {
            $built = $this->resolvePaidZipRows($payload, $wantedIds, $galleryId);
            if (($built['status'] ?? 200) !== 200) {
                return ['status' => $built['status'], 'body' => $built['body']];
            }
            $cid = (int) ($built['cid'] ?? 0);
            if (! $this->enforceDownloadRateLimit($galleryId, $cid, $ip)) {
                return ['status' => 429, 'body' => ['message' => 'Muitas tentativas de download. Tente novamente em instantes.']];
            }
            $rows = array_values($built['byPhoto'] ?? []);
            if ($rows === []) {
                return ['status' => 404, 'body' => ['message' => 'Nenhuma foto aprovada encontrada para as seleções informadas.']];
            }
            $appendable = [];
            foreach ($rows as $r) {
                $mode = $this->sales->normalizeDeliveryMode($r->delivery_mode ?? null);
                if ($mode === 'edited' && trim((string) ($r->edited_file_path ?? '')) === '') {
                    continue;
                }
                $sourcePath = $mode === 'edited'
                    ? trim((string) ($r->edited_file_path ?? ''))
                    : trim((string) ($r->file_path ?? ''));
                if ($sourcePath === '') {
                    continue;
                }
                $appendable[] = [
                    'photo_id' => (int) $r->photo_id,
                    'selection_batch' => (int) ($r->selection_batch ?? 0),
                    'original_name' => (string) ($r->original_name ?? ''),
                    'source_path' => $sourcePath,
                ];
            }
            if ($appendable === []) {
                return ['status' => 409, 'body' => ['message' => 'As fotos aprovadas em modo editado ainda não possuem arquivo enviado.']];
            }
            $builtZip = $this->buildZipFile($appendable);
            if ($builtZip['entries'] < 1 || ($builtZip['path'] ?? '') === '') {
                return ['status' => 404, 'body' => ['message' => 'Nenhuma foto com arquivo disponível para o ZIP.']];
            }
            $this->auditZipDownloads($galleryId, $cid, $appendable, $ip, $userAgent);

            return [
                'status' => 200,
                'zip_path' => $builtZip['path'],
                'filename' => $zipNameBase.'_aprovadas'.$partLabel.'.zip',
                'entries' => $builtZip['entries'],
            ];
        }

        if ($accessMode === 'public') {
            $rights = $this->resolvePublicVisitorDownloadRights($galleryId, $payload);
            if (! $rights['ok']) {
                return ['status' => 403, 'body' => ['message' => $rights['denyMessage']]];
            }
            foreach ($wantedIds as $wid) {
                if (! isset($rights['allowedPhotoIdSet'][$wid])) {
                    return ['status' => 403, 'body' => [
                        'message' => 'Algumas fotos não estão liberadas para o seu download (cupom ou seleção).',
                    ]];
                }
            }
            if (! $this->enforceDownloadRateLimit($galleryId, (int) $rights['rateLimitClientId'], $ip)) {
                return ['status' => 429, 'body' => ['message' => 'Muitas tentativas de download. Tente novamente em instantes.']];
            }
            $rows = $this->photosByIds($galleryId, $wantedIds);
            $found = [];
            foreach ($rows as $r) {
                $found[(int) $r->id] = true;
            }
            foreach ($wantedIds as $id) {
                if (! isset($found[$id])) {
                    return ['status' => 400, 'body' => ['message' => 'Algumas fotos não pertencem a esta galeria.']];
                }
            }
            if ($rows === []) {
                return ['status' => 404, 'body' => ['message' => 'Nenhuma foto encontrada para o ZIP.']];
            }
            $appendable = [];
            foreach ($rows as $photo) {
                $fp = trim((string) ($photo->file_path ?? ''));
                if ($fp === '') {
                    continue;
                }
                $appendable[] = [
                    'photo_id' => (int) $photo->id,
                    'selection_batch' => null,
                    'original_name' => (string) ($photo->original_name ?? ''),
                    'source_path' => $fp,
                ];
            }
            $builtZip = $this->buildZipFile($appendable);
            if ($builtZip['entries'] < 1 || ($builtZip['path'] ?? '') === '') {
                return ['status' => 404, 'body' => ['message' => 'Nenhuma foto com arquivo disponível para o ZIP.']];
            }

            return [
                'status' => 200,
                'zip_path' => $builtZip['path'],
                'filename' => $zipNameBase.'_galeria'.$partLabel.'.zip',
                'entries' => $builtZip['entries'],
            ];
        }

        return ['status' => 403, 'body' => ['message' => 'ZIP não disponível neste modo de galeria.']];
    }

    /**
     * @param  array<string,mixed>  $payload
     * @param  list<int>  $wantedIds
     * @return array{status:int, body?:array<string,mixed>, cid?:int, byPhoto?:array<int,object>}
     */
    private function resolvePaidZipRows(array $payload, array $wantedIds, int $galleryId): array
    {
        if (! SchemaMeta::hasTable('king_selection_photo_approvals')) {
            return ['status' => 503, 'body' => ['message' => 'Aprovação de download indisponível no servidor.']];
        }
        $cid = (int) ($payload['clientId'] ?? 0);
        if ($cid < 1) {
            $ctx = KsAccess::parseClientContext($payload);
            $cid = (int) ($ctx['cid'] ?? 0);
        }
        if ($cid < 1) {
            return ['status' => 403, 'body' => ['message' => 'Faça login para baixar as fotos aprovadas.']];
        }
        $hasEdited = SchemaMeta::hasColumn('king_photos', 'edited_file_path');
        $placeholders = implode(', ', array_fill(0, count($wantedIds), '?'));
        $params = array_merge([$galleryId, $cid], $wantedIds);
        $rows = DB::select(
            "SELECT DISTINCT ON (a.photo_id) a.photo_id, a.selection_batch, a.delivery_mode, p.original_name, p.file_path"
            .($hasEdited ? ', p.edited_file_path' : ', NULL::text AS edited_file_path')."
             FROM king_selection_photo_approvals a
             JOIN king_photos p ON p.id = a.photo_id AND p.gallery_id = a.gallery_id
             WHERE a.gallery_id = ?
               AND a.client_id = ?
               AND lower(a.status) = 'approved'
               AND a.photo_id IN ({$placeholders})
             ORDER BY a.photo_id ASC, a.selection_batch DESC",
            $params
        );
        $byPhoto = [];
        foreach ($rows as $r) {
            $byPhoto[(int) $r->photo_id] = $r;
        }
        foreach ($wantedIds as $photoId) {
            if (isset($byPhoto[$photoId])) {
                continue;
            }
            $d = $this->sales->clientDownloadApprovedOrPaid($galleryId, $cid, $photoId);
            if (! ($d['ok'] ?? false)) {
                continue;
            }
            $pr = DB::selectOne(
                'SELECT ?::int AS photo_id, ?::int AS selection_batch, ?::text AS delivery_mode, p.original_name, p.file_path'
                .($hasEdited ? ', p.edited_file_path' : ', NULL::text AS edited_file_path').'
                 FROM king_photos p
                 WHERE p.id = ? AND p.gallery_id = ?
                 LIMIT 1',
                [$photoId, $d['selection_batch'], $d['delivery_mode'], $photoId, $galleryId]
            );
            if ($pr) {
                $byPhoto[$photoId] = $pr;
            }
        }

        return ['status' => 200, 'cid' => $cid, 'byPhoto' => $byPhoto];
    }

    /**
     * @param  array<string,mixed>  $payload
     * @return array{ok:bool, denyMessage:string, rateLimitClientId:int, allowedPhotoIdSet:array<int,true>}
     */
    private function resolvePublicVisitorDownloadRights(int $galleryId, array $payload): array
    {
        $out = [
            'ok' => false,
            'denyMessage' => 'Download não disponível.',
            'rateLimitClientId' => 0,
            'allowedPhotoIdSet' => [],
        ];
        $cols = ['id'];
        if (SchemaMeta::hasColumn('king_galleries', 'access_mode')) {
            $cols[] = 'access_mode';
        }
        if (SchemaMeta::hasColumn('king_galleries', 'promo_enabled')) {
            $cols = array_merge($cols, ['promo_enabled', 'promo_coupon_code', 'promo_valid_until', 'promo_free_photo_count']);
        }
        $galleryRow = DB::selectOne('SELECT '.implode(', ', $cols).' FROM king_galleries WHERE id = ? LIMIT 1', [$galleryId]);
        if (! $galleryRow) {
            $out['denyMessage'] = 'Galeria não encontrada.';

            return $out;
        }
        $accessMode = KsAccess::normAccessMode($galleryRow->access_mode ?? 'private');
        if ($accessMode !== 'public') {
            $out['denyMessage'] = 'Esta galeria não está em modo público.';

            return $out;
        }
        $ctx = KsAccess::parseClientContext($payload);
        $cidJwt = (int) ($ctx['cid'] ?? 0);
        $sk = $ctx['sk'] ?? null;
        $hasPromo = SchemaMeta::hasColumn('king_galleries', 'promo_enabled');
        $promoResolveCid = $cidJwt;
        if ($promoResolveCid < 1 && $sk && $hasPromo && ! empty($galleryRow->promo_enabled)) {
            $promoResolveCid = $this->sessionClientId($galleryId, $sk);
        }
        $promoClientRow = null;
        if ($promoResolveCid > 0 && $hasPromo && SchemaMeta::hasColumn('king_gallery_clients', 'promo_coupon_validated_at')) {
            $promoClientRow = DB::selectOne(
                'SELECT promo_social_confirmed_at, promo_coupon_validated_at, promo_coupon_entered
                 FROM king_gallery_clients WHERE id = ? AND gallery_id = ? LIMIT 1',
                [$promoResolveCid, $galleryId]
            );
        }
        $promoValidated = $hasPromo && ! empty($galleryRow->promo_enabled)
            && $this->sales->isClientPromoEligible($galleryRow, $promoClientRow);
        $effectiveAllow = $hasPromo && ! empty($galleryRow->promo_enabled) ? $promoValidated : ($cidJwt > 0);
        $publicDlGate = $cidJwt > 0 || $promoResolveCid > 0;
        if (! $effectiveAllow || ! $publicDlGate) {
            $out['denyMessage'] = $hasPromo && ! empty($galleryRow->promo_enabled) && ! $promoValidated
                ? 'Conclua as etapas do cupom (redes + código) para liberar o download.'
                : 'Cadastre-se nesta galeria para baixar as fotos.';

            return $out;
        }
        if ($hasPromo && ! empty($galleryRow->promo_enabled) && $promoValidated && $promoResolveCid > 0
            && SchemaMeta::hasColumn('king_gallery_clients', 'status')) {
            $st = DB::selectOne(
                'SELECT status FROM king_gallery_clients WHERE id = ? AND gallery_id = ? LIMIT 1',
                [$promoResolveCid, $galleryId]
            );
            if ($st && ! KsAccess::isLockedStatus($st->status ?? '')) {
                $out['denyMessage'] = 'Confirme para baixar (nome, e-mail e WhatsApp) antes de baixar as fotos.';

                return $out;
            }
        }
        $out['rateLimitClientId'] = $cidJwt > 0 ? $cidJwt : $promoResolveCid;
        $selectedPhotoIds = [];
        if (SchemaMeta::hasColumn('king_selections', 'client_id')) {
            if ($cidJwt > 0) {
                $selectedPhotoIds = array_map(
                    static fn ($r) => (int) $r->photo_id,
                    DB::select(
                        'SELECT photo_id FROM king_selections WHERE gallery_id = ? AND client_id = ? ORDER BY id ASC',
                        [$galleryId, $cidJwt]
                    )
                );
            } elseif ($sk && SchemaMeta::hasColumn('king_selections', 'session_key')) {
                $selectedPhotoIds = array_map(
                    static fn ($r) => (int) $r->photo_id,
                    DB::select(
                        'SELECT photo_id FROM king_selections WHERE gallery_id = ? AND client_id IS NULL AND session_key = ? ORDER BY id ASC',
                        [$galleryId, $sk]
                    )
                );
            }
        }
        $allowed = [];
        if ($hasPromo && ! empty($galleryRow->promo_enabled)) {
            foreach ($selectedPhotoIds as $id) {
                if ($id > 0) {
                    $allowed[$id] = true;
                }
            }
        } elseif ($cidJwt > 0) {
            foreach (DB::select(
                'SELECT id FROM king_photos WHERE gallery_id = ? ORDER BY "order" ASC NULLS LAST, id ASC',
                [$galleryId]
            ) as $r) {
                $id = (int) $r->id;
                if ($id > 0) {
                    $allowed[$id] = true;
                }
            }
        }
        $out['allowedPhotoIdSet'] = $allowed;
        $out['ok'] = true;
        $out['denyMessage'] = '';

        return $out;
    }

    /**
     * @param  list<array{photo_id:int, selection_batch:?int, original_name:string, source_path:string}>  $appendable
     * @return array{path:string, entries:int}
     */
    private function buildZipFile(array $appendable): array
    {
        $tmp = tempnam(sys_get_temp_dir(), 'kszip');
        if ($tmp === false) {
            return ['path' => '', 'entries' => 0];
        }
        $zipPath = $tmp.'.zip';
        @unlink($tmp);
        $zip = new ZipArchive;
        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            return ['path' => '', 'entries' => 0];
        }
        $used = [];
        $entries = 0;
        foreach ($appendable as $item) {
            $buf = $this->media->readFileBuffer($item['source_path']);
            if ($buf === null || $buf === '') {
                continue;
            }
            $fname = $this->uniqueZipName($item['original_name'], $item['photo_id'], $used);
            $zip->addFromString($fname, $buf);
            unset($buf);
            $entries++;
        }
        $zip->close();
        if ($entries < 1 || ! is_file($zipPath)) {
            @unlink($zipPath);

            return ['path' => '', 'entries' => 0];
        }

        return ['path' => $zipPath, 'entries' => $entries];
    }

    /**
     * @param  array<string,true>  $used
     */
    private function uniqueZipName(string $originalName, int $photoId, array &$used): string
    {
        $fname = preg_replace('/[\/\\\\:*?"<>|]+/', '-', trim($originalName)) ?: '';
        if ($fname === '') {
            $fname = 'foto-'.$photoId.'.jpg';
        }
        if (! preg_match('/\.[a-z0-9]{2,5}$/i', $fname)) {
            $fname .= '.jpg';
        }
        $key = strtolower($fname);
        if (! isset($used[$key])) {
            $used[$key] = true;

            return $fname;
        }
        $dot = strrpos($fname, '.');
        $base = $dot !== false ? substr($fname, 0, $dot) : $fname;
        $ext = $dot !== false ? substr($fname, $dot) : '.jpg';
        $k = 2;
        do {
            $candidate = $base.' ('.$k.')'.$ext;
            $ck = strtolower($candidate);
            $k++;
        } while (isset($used[$ck]));
        $used[$ck] = true;

        return $candidate;
    }

    /**
     * @param  list<array{photo_id:int, selection_batch:?int}>  $appendable
     */
    private function auditZipDownloads(int $galleryId, int $clientId, array $appendable, ?string $ip, ?string $userAgent): void
    {
        if (! SchemaMeta::hasTable('king_download_audit')) {
            return;
        }
        foreach ($appendable as $a) {
            $pid = (int) ($a['photo_id'] ?? 0);
            if ($pid < 1) {
                continue;
            }
            try {
                DB::insert(
                    'INSERT INTO king_download_audit
                       (gallery_id, client_id, photo_id, selection_batch, action, ip_address, user_agent, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
                    [
                        $galleryId,
                        $clientId,
                        $pid,
                        $a['selection_batch'] ?? null,
                        'download_zip',
                        substr((string) ($ip ?? ''), 0, 100),
                        substr((string) ($userAgent ?? ''), 0, 400),
                    ]
                );
            } catch (\Throwable $e) {
                // ignore
            }
        }
    }

    private function enforceDownloadRateLimit(int $galleryId, int $clientId, ?string $ip): bool
    {
        $key = 'ks-dl:'.$galleryId.':'.$clientId.':'.md5((string) ($ip ?? ''));
        $n = (int) Cache::get($key, 0);
        if ($n >= 40) {
            return false;
        }
        Cache::put($key, $n + 1, 60);

        return true;
    }

    private function sessionClientId(int $galleryId, string $sk): int
    {
        if (! SchemaMeta::hasTable('king_gallery_clients') || ! SchemaMeta::hasColumn('king_gallery_clients', 'session_key')) {
            return 0;
        }
        $row = DB::selectOne(
            'SELECT id FROM king_gallery_clients WHERE gallery_id = ? AND session_key = ? LIMIT 1',
            [$galleryId, $sk]
        );

        return $row ? (int) $row->id : 0;
    }

    private function loadGallery(int $galleryId): ?object
    {
        if ($galleryId < 1) {
            return null;
        }
        $cols = ['id', 'nome_projeto'];
        if (SchemaMeta::hasColumn('king_galleries', 'access_mode')) {
            $cols[] = 'access_mode';
        }

        return DB::selectOne('SELECT '.implode(', ', $cols).' FROM king_galleries WHERE id = ? LIMIT 1', [$galleryId]);
    }

    /**
     * @param  list<int>  $ids
     * @return list<object>
     */
    private function photosByIds(int $galleryId, array $ids): array
    {
        if ($ids === []) {
            return [];
        }
        $placeholders = implode(', ', array_fill(0, count($ids), '?'));
        $params = array_merge([$galleryId], $ids);

        return DB::select(
            "SELECT id, original_name, file_path FROM king_photos WHERE gallery_id = ? AND id IN ({$placeholders})",
            $params
        );
    }

    /**
     * @return list<int>
     */
    private function parseWantedIds(mixed $raw): array
    {
        if (! is_array($raw)) {
            return [];
        }
        $ids = [];
        foreach ($raw as $x) {
            $id = (int) $x;
            if ($id > 0) {
                $ids[$id] = true;
            }
        }
        $out = array_keys($ids);

        return array_slice($out, 0, self::MAX_PHOTOS);
    }

    /**
     * @param  list<array{photo_id:int, approx_bytes:int}>  $items
     * @return list<array{part:int, photo_count:int, approx_bytes:int, photo_ids:list<int>}>
     */
    private function partitionItems(array $items, int $maxPartBytes): array
    {
        $maxPhotos = $this->partMaxPhotos();
        $parts = [];
        $cur = ['photo_ids' => [], 'approx_bytes' => 0];
        foreach ($items as $it) {
            $sz = max(0, (int) ($it['approx_bytes'] ?? 0));
            $hitPhoto = count($cur['photo_ids']) >= $maxPhotos;
            $hitByte = count($cur['photo_ids']) > 0 && ($cur['approx_bytes'] + $sz) > $maxPartBytes;
            if ($hitPhoto || $hitByte) {
                $parts[] = $cur;
                $cur = ['photo_ids' => [], 'approx_bytes' => 0];
            }
            $cur['photo_ids'][] = (int) $it['photo_id'];
            $cur['approx_bytes'] += $sz;
        }
        if ($cur['photo_ids'] !== []) {
            $parts[] = $cur;
        }
        $out = [];
        foreach ($parts as $i => $p) {
            $out[] = [
                'part' => $i + 1,
                'photo_count' => count($p['photo_ids']),
                'approx_bytes' => $p['approx_bytes'],
                'photo_ids' => $p['photo_ids'],
            ];
        }

        return $out;
    }

    private function approxBytes(): int
    {
        return 6 * 1024 * 1024;
    }

    private function partMaxBytes(): int
    {
        $raw = env('KINGSELECTION_ZIP_PART_MAX_BYTES');
        $n = is_numeric($raw) ? (int) $raw : 0;
        if ($n >= 128 * 1024 * 1024) {
            return min($n, 4 * 1024 * 1024 * 1024);
        }

        return 750 * 1024 * 1024;
    }

    private function partMaxPhotos(): int
    {
        $raw = env('KINGSELECTION_ZIP_PART_MAX_PHOTOS');
        $n = is_numeric($raw) ? (int) $raw : 0;
        if ($n >= 5) {
            return min($n, 200);
        }

        return 35;
    }

    private function safeZipBase(string $nome, string $slug): string
    {
        $s = preg_replace('/[^\w\-]+/', '_', $nome !== '' ? $nome : $slug) ?? 'fotos';
        $s = trim($s, '_');
        $s = substr($s, 0, 60);

        return $s !== '' ? $s : 'fotos';
    }
}
