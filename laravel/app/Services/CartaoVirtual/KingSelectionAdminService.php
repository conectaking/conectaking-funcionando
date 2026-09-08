<?php

namespace App\Services\CartaoVirtual;

use App\Services\Auth\JwtService;
use App\Support\KingSelection\KsAccess;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * Painel fotógrafo KS — list/create/get/status + upload proxy/batch/cfimage.
 */
class KingSelectionAdminService
{
    private const STATUS_RANK = [
        'preparacao' => 0,
        'andamento' => 1,
        'revisao' => 2,
        'finalizado' => 3,
    ];

    private const RANK_TO_STATUS = [
        0 => 'preparacao',
        1 => 'andamento',
        2 => 'revisao',
        3 => 'finalizado',
    ];

    public function __construct(
        private readonly KingSelectionPasswordCrypto $passwordCrypto,
        private readonly JwtService $jwt,
    ) {
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function listGalleries(string $userId, mixed $profileItemIdRaw): array
    {
        $profileItemId = (int) $profileItemIdRaw;
        if ($profileItemId < 1) {
            return ['status' => 400, 'body' => ['message' => 'profileItemId é obrigatório']];
        }
        if (! $this->ownsProfileItem($userId, $profileItemId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão para este módulo.']];
        }

        $galleries = DB::select(
            'SELECT * FROM king_galleries WHERE profile_item_id = ? ORDER BY id DESC',
            [$profileItemId]
        );
        $ids = array_map(static fn ($g) => (int) $g->id, $galleries);
        $photosByGallery = [];
        $selectionStats = [];
        $statusAgg = [];

        if ($ids !== []) {
            $hasFav = Schema::hasColumn('king_photos', 'is_favorite');
            $hasCover = Schema::hasColumn('king_photos', 'is_cover');
            $fav = $hasFav ? 'is_favorite' : 'FALSE AS is_favorite';
            $cover = $hasCover ? 'is_cover' : 'FALSE AS is_cover';
            $phRows = DB::select(
                'SELECT id, gallery_id, original_name, "order", '.$fav.', '.$cover.'
                 FROM king_photos WHERE gallery_id IN ('.$this->placeholders($ids).')
                 ORDER BY gallery_id, "order" ASC, id ASC',
                $ids
            );
            foreach ($phRows as $p) {
                $gid = (int) $p->gallery_id;
                $photosByGallery[$gid] ??= [];
                $photosByGallery[$gid][] = $p;
            }

            $sRows = DB::select(
                'SELECT gallery_id, COUNT(*)::int AS selected_count, MAX(feedback_cliente) AS feedback_cliente
                 FROM king_selections WHERE gallery_id IN ('.$this->placeholders($ids).')
                 GROUP BY gallery_id',
                $ids
            );
            foreach ($sRows as $r) {
                $selectionStats[(int) $r->gallery_id] = [
                    'selected_count' => (int) ($r->selected_count ?? 0),
                    'feedback_cliente' => $r->feedback_cliente ?? null,
                ];
            }

            if (Schema::hasTable('king_gallery_clients') && Schema::hasColumn('king_gallery_clients', 'status')) {
                $enabledSql = Schema::hasColumn('king_gallery_clients', 'enabled')
                    ? 'AND (gc.enabled IS DISTINCT FROM false)'
                    : '';
                $agg = DB::select(
                    "SELECT gc.gallery_id,
                        MIN(
                          CASE LOWER(TRIM(COALESCE(gc.status::text, '')))
                            WHEN 'preparacao' THEN 0
                            WHEN 'andamento' THEN 1
                            WHEN 'revisao' THEN 2
                            WHEN 'finalizado' THEN 3
                            ELSE 999
                          END
                        ) AS min_rank
                     FROM king_gallery_clients gc
                     WHERE gc.gallery_id IN (".$this->placeholders($ids).")
                       {$enabledSql}
                       AND (
                         gc.email IS NULL
                         OR NOT (
                           lower(gc.email) LIKE '__ks_face_default_%@internal.king'
                           OR lower(gc.email) LIKE '__ks_face_sess_%@internal.king'
                         )
                       )
                     GROUP BY gc.gallery_id
                     HAVING COUNT(*) >= 2",
                    $ids
                );
                foreach ($agg as $row) {
                    $mr = (int) ($row->min_rank ?? 999);
                    if (isset(self::RANK_TO_STATUS[$mr])) {
                        $statusAgg[(int) $row->gallery_id] = self::RANK_TO_STATUS[$mr];
                    }
                }
            }
        }

        $payload = [];
        foreach ($galleries as $g) {
            $gid = (int) $g->id;
            $photos = $photosByGallery[$gid] ?? [];
            $row = (array) $g;
            $row['photos'] = $photos;
            $row['status'] = $statusAgg[$gid] ?? $g->status;
            $row['selected_count'] = $selectionStats[$gid]['selected_count'] ?? 0;
            $row['feedback_cliente'] = $selectionStats[$gid]['feedback_cliente'] ?? null;
            $row['photos_count'] = count($photos);
            $payload[] = $row;
        }

        $shareBase = $this->shareBaseUrl();

        return ['status' => 200, 'body' => array_filter([
            'success' => true,
            'share_base_url' => $shareBase,
            'galleries' => $payload,
        ], static fn ($v) => $v !== null)];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function createGallery(string $userId, array $body): array
    {
        $pid = (int) ($body['profileItemId'] ?? 0);
        $nome = trim((string) ($body['nome_projeto'] ?? ''));
        if ($pid < 1 || $nome === '') {
            return ['status' => 400, 'body' => ['message' => 'Campos obrigatórios: profileItemId e nome do projeto.']];
        }
        if (! $this->ownsProfileItem($userId, $pid)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão para este módulo.']];
        }

        $accessType = KsAccess::normAccessMode(
            $body['access_type'] ?? $body['tipo_acesso'] ?? $body['access_mode'] ?? 'private'
        );
        $useWatermark = ! (
            ($body['use_watermark'] ?? null) === false
            || ($body['use_watermark'] ?? null) === 'false'
            || ($body['com_marca_dagua'] ?? null) === false
            || ($body['com_marca_dagua'] ?? null) === 'false'
        );

        $slug = $this->uniqueSlug($nome);
        $clientPasswordResponse = null;

        if ($accessType === 'private') {
            $em = strtolower(trim((string) ($body['cliente_email'] ?? '')));
            $pw = (string) ($body['senha'] ?? '');
            if ($em === '' || strlen($pw) < 6) {
                return ['status' => 400, 'body' => [
                    'message' => 'Acesso privado: informe e-mail do cliente e senha (mínimo 6 caracteres).',
                ]];
            }
            $emailToStore = $em;
            $plainPassword = $pw;
            $clientPasswordResponse = $pw;
        } elseif ($accessType === 'signup' || $accessType === 'paid_event_photos') {
            $plainPassword = Str::random(32);
            $local = substr(($accessType === 'paid_event_photos' ? 'paid' : 'visitante').'+'.$slug, 0, 200);
            $emailToStore = substr($local.'@cadastro.kingselection.invalid', 0, 255);
        } else {
            $plainPassword = Str::random(32);
            $local = substr('publico+'.$slug, 0, 200);
            $emailToStore = substr($local.'@publico.kingselection.invalid', 0, 255);
        }

        $senhaHash = password_hash($plainPassword, PASSWORD_BCRYPT);
        $total = (int) ($body['total_fotos_contratadas'] ?? 0);
        $minSel = (int) ($body['min_selections'] ?? 0);
        $hasMin = Schema::hasColumn('king_galleries', 'min_selections');
        $hasEnc = Schema::hasColumn('king_galleries', 'senha_enc');
        $senhaEnc = $hasEnc ? $this->passwordCrypto->encrypt($plainPassword) : null;

        $cols = ['profile_item_id', 'nome_projeto', 'slug', 'cliente_email', 'senha_hash', 'status', 'total_fotos_contratadas'];
        $vals = [$pid, $nome, $slug, $emailToStore, $senhaHash, 'preparacao', $total];
        if ($hasEnc) {
            $cols[] = 'senha_enc';
            $vals[] = $senhaEnc;
        }
        if ($hasMin) {
            $cols[] = 'min_selections';
            $vals[] = $minSel;
        }

        $ph = $this->placeholders($vals);
        $inserted = DB::selectOne(
            'INSERT INTO king_galleries ('.implode(', ', $cols).') VALUES ('.$ph.') RETURNING id',
            $vals
        );
        $gid = (int) ($inserted->id ?? 0);
        if ($gid < 1) {
            $row = DB::selectOne('SELECT id FROM king_galleries WHERE slug = ? LIMIT 1', [$slug]);
            $gid = (int) ($row->id ?? 0);
        }

        $dataTrabalho = date('Y-m-d');
        $nomeCliente = trim((string) ($body['cliente_nome'] ?? '')) ?: null;
        $cat = trim((string) ($body['categoria'] ?? '')) ?: null;

        $sets = [];
        $params = [];
        if (Schema::hasColumn('king_galleries', 'access_mode')) {
            $sets[] = 'access_mode = ?';
            $params[] = $accessType;
        }
        if (Schema::hasColumn('king_galleries', 'allow_self_signup')) {
            $sets[] = 'allow_self_signup = ?';
            $params[] = KsAccess::allowsSelfSignup($accessType);
        }
        if (Schema::hasColumn('king_galleries', 'cliente_nome') && $nomeCliente) {
            $sets[] = 'cliente_nome = ?';
            $params[] = substr($nomeCliente, 0, 255);
        }
        if (Schema::hasColumn('king_galleries', 'categoria') && $cat) {
            $sets[] = 'categoria = ?';
            $params[] = substr($cat, 0, 255);
        }
        if (Schema::hasColumn('king_galleries', 'data_trabalho')) {
            $sets[] = 'data_trabalho = ?';
            $params[] = $dataTrabalho;
        }
        if (Schema::hasColumn('king_galleries', 'watermark_mode')) {
            if ($useWatermark) {
                $sets[] = "watermark_mode = COALESCE(NULLIF(watermark_mode,''),'tile_dense')";
            } else {
                $sets[] = 'watermark_mode = ?';
                $params[] = 'none';
            }
        }
        if ($useWatermark && Schema::hasColumn('king_galleries', 'watermark_opacity')) {
            $sets[] = 'watermark_opacity = COALESCE(watermark_opacity, 0.22)';
        }
        if ($sets !== []) {
            $params[] = $gid;
            try {
                DB::update(
                    'UPDATE king_galleries SET '.implode(', ', $sets).', updated_at = NOW() WHERE id = ?',
                    $params
                );
            } catch (\Throwable) {
                // colunas opcionais
            }
        }

        $gallery = DB::selectOne('SELECT * FROM king_galleries WHERE id = ? LIMIT 1', [$gid]);
        if ($gallery) {
            $this->ensurePrimaryClient((array) $gallery, $nomeCliente);
        }

        return ['status' => 201, 'body' => array_filter([
            'success' => true,
            'gallery' => $gallery,
            'client_password' => $clientPasswordResponse,
            'access_type' => $accessType,
            'data_trabalho' => Schema::hasColumn('king_galleries', 'data_trabalho') ? $dataTrabalho : null,
        ], static fn ($v) => $v !== null)];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function getGallery(string $userId, int $galleryId, mixed $focusClientRaw = null): array
    {
        if ($galleryId < 1) {
            return ['status' => 400, 'body' => ['message' => 'galleryId inválido']];
        }
        $g = $this->ownedGallery($userId, $galleryId);
        if (! $g) {
            return ['status' => 404, 'body' => ['message' => 'Galeria não encontrada.']];
        }

        $this->ensurePrimaryClient((array) $g);

        $focusCid = (int) $focusClientRaw;
        $focusCid = $focusCid > 0 ? $focusCid : null;

        $clients = [];
        if (Schema::hasTable('king_gallery_clients')) {
            $cols = ['id', 'nome', 'email', 'telefone', 'enabled', 'note', 'created_at'];
            foreach (['status', 'selection_round', 'feedback_cliente'] as $c) {
                if (Schema::hasColumn('king_gallery_clients', $c)) {
                    $cols[] = $c;
                }
            }
            $cRows = DB::select(
                'SELECT '.implode(', ', $cols).' FROM king_gallery_clients WHERE gallery_id = ? ORDER BY created_at ASC, id ASC',
                [$galleryId]
            );
            foreach ($cRows as $row) {
                if (! KsAccess::isTechnicalFaceEmail($row->email ?? null)) {
                    $clients[] = $row;
                }
            }
        }

        if (! $focusCid && count($clients) > 1 && Schema::hasColumn('king_selections', 'client_id')) {
            $firstId = (int) ($clients[0]->id ?? 0);
            if ($firstId > 0) {
                $focusCid = $firstId;
            }
        }

        $hasFav = Schema::hasColumn('king_photos', 'is_favorite');
        $hasCover = Schema::hasColumn('king_photos', 'is_cover');
        $hasFolder = Schema::hasColumn('king_photos', 'folder_id');
        $photoCols = [
            'id', 'gallery_id', 'original_name', '"order"', 'created_at',
            $hasFav ? 'is_favorite' : 'FALSE AS is_favorite',
            $hasCover ? 'is_cover' : 'FALSE AS is_cover',
            $hasFolder ? 'folder_id' : 'NULL::INTEGER AS folder_id',
        ];
        $photos = DB::select(
            'SELECT '.implode(', ', $photoCols).' FROM king_photos WHERE gallery_id = ? ORDER BY "order" ASC, id ASC',
            [$galleryId]
        );

        $hasSelClient = Schema::hasColumn('king_selections', 'client_id');
        $hasSelBatch = Schema::hasColumn('king_selections', 'selection_batch');
        $selCols = ['photo_id', 'feedback_cliente', 'created_at'];
        if ($hasSelClient) {
            $selCols[] = 'client_id';
        }
        if ($hasSelBatch) {
            $selCols[] = 'selection_batch';
        }
        $selRows = DB::select(
            'SELECT '.implode(', ', $selCols).' FROM king_selections WHERE gallery_id = ? ORDER BY created_at ASC',
            [$galleryId]
        );

        $onlyClientId = count($clients) === 1 ? (int) ($clients[0]->id ?? 0) : 0;
        $filtered = $selRows;
        if ($focusCid && $hasSelClient) {
            $allowed = array_map(static fn ($c) => (int) $c->id, $clients);
            if (in_array($focusCid, $allowed, true)) {
                $filtered = array_values(array_filter(
                    $selRows,
                    static fn ($r) => (int) ($r->client_id ?? 0) === $focusCid
                ));
            }
        } elseif ($onlyClientId > 0 && $hasSelClient) {
            $filtered = array_values(array_filter(
                $selRows,
                static fn ($r) => (int) ($r->client_id ?? 0) === $onlyClientId
            ));
        }

        $selectedPhotoIds = array_map(static fn ($r) => (int) $r->photo_id, $filtered);
        $feedback = null;
        foreach ($filtered as $r) {
            if (! empty($r->feedback_cliente)) {
                $feedback = $r->feedback_cliente;
                break;
            }
        }
        $focusRow = null;
        if ($focusCid) {
            foreach ($clients as $c) {
                if ((int) $c->id === $focusCid) {
                    $focusRow = $c;
                    break;
                }
            }
        } elseif (count($clients) === 1) {
            $focusRow = $clients[0];
        }
        if ($focusRow && ! empty($focusRow->feedback_cliente)) {
            $feedback = $focusRow->feedback_cliente;
        }

        $selectionBatchByPhotoId = [];
        $selectionRoundsSummary = [];
        foreach ($filtered as $r) {
            $pid = (int) $r->photo_id;
            $b = $hasSelBatch ? max(1, (int) ($r->selection_batch ?? 1)) : 1;
            $selectionBatchByPhotoId[$pid] = $b;
            $key = (string) $b;
            $selectionRoundsSummary[$key] = ($selectionRoundsSummary[$key] ?? 0) + 1;
        }

        $folders = [];
        if (Schema::hasTable('king_gallery_folders')) {
            try {
                $folders = DB::select(
                    'SELECT * FROM king_gallery_folders WHERE gallery_id = ? ORDER BY "order" ASC, id ASC',
                    [$galleryId]
                );
            } catch (\Throwable) {
                $folders = [];
            }
        }

        $statusSummary = $this->aggregateStatusFromClients($clients);
        $galleryOut = (array) $g;
        $galleryOut['status'] = $statusSummary ?? $g->status;
        $galleryOut['photos'] = $photos;
        $galleryOut['selectedPhotoIds'] = $selectedPhotoIds;
        $galleryOut['feedback_cliente'] = $feedback;
        $galleryOut['clients'] = $clients;
        $galleryOut['folders'] = $folders;
        $galleryOut['selectionBatchByPhotoId'] = $selectionBatchByPhotoId;
        $galleryOut['selectionRoundsSummary'] = $selectionRoundsSummary;

        return ['status' => 200, 'body' => array_filter([
            'success' => true,
            'share_base_url' => $this->shareBaseUrl(),
            'focus_client_id' => $focusCid,
            'gallery' => $galleryOut,
        ], static fn ($v) => $v !== null)];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function updateStatus(string $userId, int $galleryId, array $body): array
    {
        $status = KsAccess::normStatus($body['status'] ?? '');
        if ($galleryId < 1 || $status === '') {
            return ['status' => 400, 'body' => ['message' => 'Parâmetros inválidos']];
        }
        if (! in_array($status, ['preparacao', 'andamento', 'revisao', 'finalizado'], true)) {
            return ['status' => 400, 'body' => ['message' => 'Status inválido']];
        }
        $g = $this->ownedGallery($userId, $galleryId);
        if (! $g) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }

        $rawClientId = $body['clientId'] ?? null;
        $bodyCid = ($rawClientId !== null && trim((string) $rawClientId) !== '')
            ? (int) $rawClientId
            : null;

        $hasCliStatus = Schema::hasTable('king_gallery_clients')
            && Schema::hasColumn('king_gallery_clients', 'status');
        $enabledRows = [];
        if ($hasCliStatus) {
            $enabledRows = DB::select(
                'SELECT id FROM king_gallery_clients WHERE gallery_id = ? AND enabled = TRUE ORDER BY id ASC',
                [$galleryId]
            );
        }

        if ($hasCliStatus && count($enabledRows) > 1) {
            $cid = $bodyCid;
            if (! $cid) {
                return ['status' => 400, 'body' => [
                    'message' => 'Informe clientId para alterar o status com vários visitantes ativos.',
                ]];
            }
            $ok = DB::update(
                'UPDATE king_gallery_clients SET status = ?, updated_at = NOW() WHERE id = ? AND gallery_id = ?',
                [$status, $cid, $galleryId]
            );
            if ($ok < 1) {
                return ['status' => 404, 'body' => ['message' => 'Cliente não encontrado nesta galeria.']];
            }

            return ['status' => 200, 'body' => ['success' => true, 'status' => $status, 'clientId' => $cid]];
        }

        DB::update('UPDATE king_galleries SET status = ?, updated_at = NOW() WHERE id = ?', [$status, $galleryId]);
        if ($hasCliStatus && count($enabledRows) === 1) {
            DB::update(
                'UPDATE king_gallery_clients SET status = ?, updated_at = NOW() WHERE id = ?',
                [$status, (int) $enabledRows[0]->id]
            );
        }

        return ['status' => 200, 'body' => ['success' => true, 'status' => $status]];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function addPhoto(string $userId, int $galleryId, array $body): array
    {
        $imageId = trim((string) ($body['imageId'] ?? ''));
        if ($galleryId < 1 || $imageId === '') {
            return ['status' => 400, 'body' => ['message' => 'galleryId e imageId são obrigatórios']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        $filePath = 'cfimage:'.$imageId;
        $name = substr((string) ($body['original_name'] ?? 'foto'), 0, 500) ?: 'foto';
        $order = (int) ($body['order'] ?? 0);
        $folderId = $this->resolveFolderId($galleryId, $body['folder_id'] ?? $body['folderId'] ?? null);
        if (($body['folder_id'] ?? $body['folderId'] ?? null) !== null && Schema::hasColumn('king_photos', 'folder_id') && $folderId === null) {
            return ['status' => 400, 'body' => ['message' => 'Pasta inválida para esta galeria.']];
        }

        $photo = $this->insertPhoto($galleryId, $filePath, $name, $order, $folderId);

        return ['status' => 201, 'body' => ['success' => true, 'photo' => $photo]];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function photosBatch(string $userId, int $galleryId, array $body): array
    {
        $list = $body['images'] ?? [];
        if (! is_array($list) || $list === []) {
            return ['status' => 400, 'body' => ['message' => 'images é obrigatório']];
        }
        if (count($list) > 200) {
            return ['status' => 400, 'body' => ['message' => 'Máximo de 200 imagens por chamada.']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }

        $hasFolder = Schema::hasColumn('king_photos', 'folder_id');
        $validFolders = $this->validFolderIds($galleryId);
        $photos = [];
        foreach ($list as $img) {
            if (! is_array($img)) {
                continue;
            }
            $key = ltrim(trim((string) ($img['key'] ?? '')), '/');
            if ($key === '') {
                continue;
            }
            $name = substr((string) ($img['name'] ?? 'foto'), 0, 500) ?: 'foto';
            $order = (int) ($img['order'] ?? 0);
            $folderRaw = $img['folder_id'] ?? $img['folderId'] ?? null;
            $folderId = null;
            if ($folderRaw !== null && $hasFolder) {
                $fid = (int) $folderRaw;
                $folderId = ($fid > 0 && isset($validFolders[$fid])) ? $fid : null;
            }
            $photos[] = $this->insertPhoto($galleryId, 'r2:'.$key, $name, $order, $folderId);
        }
        if ($photos === []) {
            return ['status' => 400, 'body' => ['message' => 'Nenhuma imagem válida.']];
        }

        return ['status' => 201, 'body' => ['success' => true, 'photos' => $photos]];
    }

    /**
     * Worker: registrar fotos no banco com recibo HMAC (ks_receipt).
     *
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function workerCommit(string $userId, int $galleryId, array $body): array
    {
        if ($galleryId < 1) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'galleryId inválido']];
        }
        $secret = trim((string) (env('KINGSELECTION_WORKER_SECRET') ?: ''));
        if ($secret === '') {
            return ['status' => 501, 'body' => ['success' => false, 'message' => 'Worker não configurado (KINGSELECTION_WORKER_SECRET).']];
        }
        $items = $body['items'] ?? [];
        if (! is_array($items) || $items === []) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'items é obrigatório']];
        }
        if (count($items) > 200) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'Máximo de 200 itens por chamada.']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['success' => false, 'message' => 'Sem permissão']];
        }

        $hasFolder = Schema::hasColumn('king_photos', 'folder_id');
        $validFolders = $this->validFolderIds($galleryId);
        $prefix = 'galleries/'.$galleryId.'/';
        $photos = [];

        foreach ($items as $it) {
            if (! is_array($it)) {
                continue;
            }
            $key = ltrim(trim((string) ($it['key'] ?? '')), '/');
            $receipt = trim((string) ($it['receipt'] ?? ''));
            $name = substr((string) ($it['name'] ?? 'foto'), 0, 500) ?: 'foto';
            $order = (int) ($it['order'] ?? 0);
            if ($key === '' || $receipt === '') {
                continue;
            }
            if (! str_starts_with($key, $prefix)) {
                continue;
            }
            $payload = $this->verifyWorkerToken($receipt, $secret);
            if (! $payload || ($payload['typ'] ?? '') !== 'ks_receipt') {
                continue;
            }
            if ((int) ($payload['galleryId'] ?? 0) !== $galleryId) {
                continue;
            }
            if ((string) ($payload['key'] ?? '') !== $key) {
                continue;
            }
            $folderRaw = $it['folder_id'] ?? $it['folderId'] ?? null;
            $folderId = null;
            if ($folderRaw !== null && $hasFolder) {
                $fid = (int) $folderRaw;
                $folderId = ($fid > 0 && isset($validFolders[$fid])) ? $fid : null;
            }
            $photos[] = $this->insertPhoto($galleryId, 'r2:'.$key, $name, $order, $folderId);
        }

        if ($photos === []) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'Nenhum item válido (recibo/key inválidos).']];
        }

        return ['status' => 201, 'body' => ['success' => true, 'photos' => $photos]];
    }

    /**
     * Upload via proxy (multipart) → R2 + INSERT king_photos.
     *
     * @return array{status:int, body:array<string,mixed>}
     */
    public function uploadProxy(
        string $userId,
        int $galleryId,
        string $binary,
        string $mime,
        string $originalName,
        int $order,
        mixed $folderRaw,
        R2StorageService $r2
    ): array {
        if ($galleryId < 1) {
            return ['status' => 400, 'body' => ['message' => 'galleryId inválido']];
        }
        if ($binary === '') {
            return ['status' => 400, 'body' => ['message' => 'Arquivo é obrigatório']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        if (! $r2->config()['enabled']) {
            return ['status' => 501, 'body' => ['message' => 'R2 não configurado.']];
        }

        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION) ?: 'jpg');
        $ext = preg_replace('/[^a-z0-9]/', '', $ext) ?: 'jpg';
        $key = 'galleries/'.$galleryId.'/'.(string) Str::uuid().'.'.$ext;
        $contentType = str_starts_with($mime, 'image/') ? $mime : 'application/octet-stream';
        if (! $r2->putKey($key, $binary, $contentType)) {
            return ['status' => 502, 'body' => ['success' => false, 'message' => 'Falha ao enviar para o R2']];
        }

        $folderId = $this->resolveFolderId($galleryId, $folderRaw);
        if ($folderRaw !== null && Schema::hasColumn('king_photos', 'folder_id') && $folderId === null) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'Pasta inválida para esta galeria.']];
        }

        $photo = $this->insertPhoto(
            $galleryId,
            'r2:'.$key,
            substr($originalName !== '' ? $originalName : 'foto', 0, 500),
            $order,
            $folderId
        );

        return ['status' => 201, 'body' => ['success' => true, 'photo' => $photo]];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function presignBatch(string $userId, int $galleryId, array $body, R2StorageService $r2): array
    {
        if ($galleryId < 1) {
            return ['status' => 400, 'body' => ['message' => 'galleryId inválido']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        $list = is_array($body['files'] ?? null) ? $body['files'] : [];
        if ($list === []) {
            return ['status' => 400, 'body' => ['message' => 'files é obrigatório']];
        }
        if (count($list) > 100) {
            return ['status' => 400, 'body' => ['message' => 'Máximo de 100 arquivos por chamada.']];
        }
        if (! $r2->config()['enabled']) {
            return ['status' => 501, 'body' => [
                'message' => 'R2 não configurado (R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET).',
            ]];
        }
        $prefixRaw = (string) ($body['prefix'] ?? "galleries/{$galleryId}");
        $safePrefix = ltrim(str_replace('..', '', $prefixRaw), '/');
        $items = [];
        foreach ($list as $f) {
            if (! is_array($f)) {
                continue;
            }
            $clientId = isset($f['id']) ? substr((string) $f['id'], 0, 80) : (string) Str::uuid();
            $name = isset($f['name']) ? (string) $f['name'] : 'foto';
            $type = isset($f['type']) ? (string) $f['type'] : 'application/octet-stream';
            $ext = 'jpg';
            if (preg_match('/\.([a-zA-Z0-9]{1,8})$/', $name, $m)) {
                $ext = strtolower($m[1]);
            }
            $key = $safePrefix.'/'.(string) Str::uuid().'.'.$ext;
            $signed = $r2->presignPut($key, $type, 'public, max-age=31536000, immutable', 900);
            if (! $signed) {
                return ['status' => 502, 'body' => ['message' => 'Falha ao gerar URL de upload.']];
            }
            $items[] = [
                'id' => $clientId,
                'key' => $key,
                'uploadUrl' => $signed['uploadUrl'],
                'publicUrl' => $signed['publicUrl'] ?? null,
            ];
        }

        return ['status' => 200, 'body' => ['success' => true, 'items' => $items]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function deleteGallery(string $userId, int $galleryId): array
    {
        if ($galleryId < 1) {
            return ['status' => 400, 'body' => ['message' => 'galleryId inválido']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        try {
            DB::delete('DELETE FROM king_photos WHERE gallery_id = ?', [$galleryId]);
        } catch (\Throwable) {
        }
        try {
            if (Schema::hasTable('king_gallery_clients')) {
                DB::delete('DELETE FROM king_gallery_clients WHERE gallery_id = ?', [$galleryId]);
            }
        } catch (\Throwable) {
        }
        DB::delete('DELETE FROM king_galleries WHERE id = ?', [$galleryId]);

        return ['status' => 200, 'body' => ['success' => true]];
    }

    /**
     * @return array<int,true>
     */
    private function validFolderIds(int $galleryId): array
    {
        if (! Schema::hasTable('king_photo_folders')) {
            return [];
        }
        try {
            $rows = DB::select('SELECT id FROM king_photo_folders WHERE gallery_id = ?', [$galleryId]);
        } catch (\Throwable) {
            return [];
        }
        $out = [];
        foreach ($rows as $r) {
            $out[(int) $r->id] = true;
        }

        return $out;
    }

    private function resolveFolderId(int $galleryId, mixed $raw): ?int
    {
        if ($raw === null || $raw === '' || ! Schema::hasColumn('king_photos', 'folder_id')) {
            return null;
        }
        $fid = (int) $raw;
        if ($fid < 1) {
            return null;
        }
        $valid = $this->validFolderIds($galleryId);

        return isset($valid[$fid]) ? $fid : null;
    }

    private function insertPhoto(int $galleryId, string $filePath, string $name, int $order, ?int $folderId): object
    {
        $hasFolder = Schema::hasColumn('king_photos', 'folder_id');
        if ($hasFolder) {
            return DB::selectOne(
                'INSERT INTO king_photos (gallery_id, file_path, original_name, "order", folder_id)
                 VALUES (?, ?, ?, ?, ?)
                 RETURNING id, gallery_id, original_name, "order", file_path, folder_id',
                [$galleryId, $filePath, $name, $order, $folderId]
            );
        }

        return DB::selectOne(
            'INSERT INTO king_photos (gallery_id, file_path, original_name, "order")
             VALUES (?, ?, ?, ?)
             RETURNING id, gallery_id, original_name, "order", file_path',
            [$galleryId, $filePath, $name, $order]
        );
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function listFolders(string $userId, int $galleryId): array
    {
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        if (! Schema::hasTable('king_photo_folders')) {
            return ['status' => 200, 'body' => ['success' => true, 'folders' => []]];
        }
        $folders = DB::select(
            'SELECT id, gallery_id, name, sort_order, cover_photo_id, created_at
             FROM king_photo_folders WHERE gallery_id = ? ORDER BY sort_order ASC, id ASC',
            [$galleryId]
        );

        return ['status' => 200, 'body' => ['success' => true, 'folders' => $folders]];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function createFolder(string $userId, int $galleryId, array $body): array
    {
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        $name = trim((string) ($body['name'] ?? ''));
        if ($name === '') {
            return ['status' => 400, 'body' => ['message' => 'Nome da pasta é obrigatório']];
        }
        if (! Schema::hasTable('king_photo_folders')) {
            return ['status' => 412, 'body' => ['message' => 'Migrations de pasta ainda não aplicadas no banco.']];
        }
        $sort = (int) ($body['sort_order'] ?? $body['sortOrder'] ?? 0);
        $safe = substr($name, 0, 120);
        try {
            $folder = DB::selectOne(
                'INSERT INTO king_photo_folders (gallery_id, name, sort_order)
                 VALUES (?, ?, ?)
                 RETURNING id, gallery_id, name, sort_order, cover_photo_id, created_at',
                [$galleryId, $safe, $sort]
            );
        } catch (\Throwable $e) {
            $ex = DB::selectOne(
                'SELECT id, gallery_id, name, sort_order, cover_photo_id, created_at
                 FROM king_photo_folders WHERE gallery_id = ? AND lower(name) = lower(?) LIMIT 1',
                [$galleryId, $safe]
            );
            $list = $this->listFolders($userId, $galleryId);

            return ['status' => 200, 'body' => [
                'success' => true,
                'folder' => $ex,
                'folders' => $list['body']['folders'] ?? [],
                'alreadyExists' => true,
            ]];
        }
        $list = $this->listFolders($userId, $galleryId);

        return ['status' => 201, 'body' => [
            'success' => true,
            'folder' => $folder,
            'folders' => $list['body']['folders'] ?? [],
        ]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function deleteFolder(string $userId, int $galleryId, int $folderId): array
    {
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        if (! Schema::hasTable('king_photo_folders') || $folderId < 1) {
            return ['status' => 404, 'body' => ['message' => 'Pasta não encontrada']];
        }
        if (Schema::hasColumn('king_photos', 'folder_id')) {
            DB::update('UPDATE king_photos SET folder_id = NULL WHERE gallery_id = ? AND folder_id = ?', [$galleryId, $folderId]);
        }
        $n = DB::delete('DELETE FROM king_photo_folders WHERE id = ? AND gallery_id = ?', [$folderId, $galleryId]);
        if ($n < 1) {
            return ['status' => 404, 'body' => ['message' => 'Pasta não encontrada']];
        }

        return ['status' => 200, 'body' => ['success' => true]];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function generateFolders(string $userId, int $galleryId, array $body): array
    {
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        $count = min(200, max(1, (int) ($body['count'] ?? 0)));
        if ($count < 1) {
            return ['status' => 400, 'body' => ['message' => 'count é obrigatório (1-200)']];
        }
        if (! Schema::hasTable('king_photo_folders')) {
            return ['status' => 412, 'body' => ['message' => 'Migrations de pasta ainda não aplicadas no banco.']];
        }
        $startAt = max(1, (int) ($body['startAt'] ?? $body['start_at'] ?? 1));
        $prefix = substr(trim((string) ($body['prefix'] ?? 'Pasta')) ?: 'Pasta', 0, 80);
        $max = DB::selectOne('SELECT COALESCE(MAX(sort_order), 0) AS v FROM king_photo_folders WHERE gallery_id = ?', [$galleryId]);
        $sortBase = (int) ($max->v ?? 0);
        $created = 0;
        for ($i = 0; $i < $count; $i++) {
            $name = substr(trim($prefix.' '.($startAt + $i)), 0, 120);
            $sortBase += 10;
            try {
                DB::insert(
                    'INSERT INTO king_photo_folders (gallery_id, name, sort_order) VALUES (?, ?, ?)',
                    [$galleryId, $name, $sortBase]
                );
                $created++;
            } catch (\Throwable $e) {
                if (! str_contains(strtolower($e->getMessage()), 'unique') && ! str_contains(strtolower($e->getMessage()), 'uniq')) {
                    throw $e;
                }
            }
        }
        $list = $this->listFolders($userId, $galleryId);

        return ['status' => 201, 'body' => [
            'success' => true,
            'created' => $created,
            'folders' => $list['body']['folders'] ?? [],
        ]];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function reorderFolders(string $userId, int $galleryId, array $body): array
    {
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        $folderIds = [];
        if (is_array($body['folder_ids'] ?? null)) {
            foreach ($body['folder_ids'] as $v) {
                $id = (int) $v;
                if ($id > 0) {
                    $folderIds[] = $id;
                }
            }
        }
        if ($folderIds === []) {
            return ['status' => 400, 'body' => ['message' => 'folder_ids é obrigatório']];
        }
        if (! Schema::hasTable('king_photo_folders')) {
            return ['status' => 200, 'body' => ['success' => true, 'folders' => []]];
        }
        $dbRows = DB::select(
            'SELECT id FROM king_photo_folders WHERE gallery_id = ? ORDER BY sort_order ASC, id ASC',
            [$galleryId]
        );
        $dbIds = array_map(static fn ($r) => (int) $r->id, $dbRows);
        if ($dbIds === []) {
            return ['status' => 200, 'body' => ['success' => true, 'folders' => []]];
        }
        $seen = [];
        $wanted = [];
        foreach ($folderIds as $id) {
            if (! in_array($id, $dbIds, true) || isset($seen[$id])) {
                continue;
            }
            $seen[$id] = true;
            $wanted[] = $id;
        }
        foreach ($dbIds as $id) {
            if (! isset($seen[$id])) {
                $wanted[] = $id;
            }
        }
        $sort = 10;
        foreach ($wanted as $id) {
            DB::update(
                'UPDATE king_photo_folders SET sort_order = ?, updated_at = NOW() WHERE gallery_id = ? AND id = ?',
                [$sort, $galleryId, $id]
            );
            $sort += 10;
        }
        $list = $this->listFolders($userId, $galleryId);

        return ['status' => 200, 'body' => ['success' => true, 'folders' => $list['body']['folders'] ?? []]];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function assignPhotosFolder(string $userId, int $galleryId, array $body): array
    {
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        $photoIds = [];
        if (is_array($body['photo_ids'] ?? null)) {
            foreach ($body['photo_ids'] as $v) {
                $id = (int) $v;
                if ($id > 0) {
                    $photoIds[] = $id;
                }
            }
        }
        if ($photoIds === []) {
            return ['status' => 400, 'body' => ['message' => 'photo_ids é obrigatório']];
        }
        if (! Schema::hasColumn('king_photos', 'folder_id')) {
            return ['status' => 412, 'body' => ['message' => 'Migrations de pasta ainda não aplicadas no banco.']];
        }
        $incoming = $body['folder_id'] ?? $body['folderId'] ?? null;
        $wantedFolderId = $this->resolveFolderId($galleryId, $incoming);
        if ($incoming !== null && $incoming !== '' && $wantedFolderId === null) {
            return ['status' => 400, 'body' => ['message' => 'Pasta inválida para esta galeria.']];
        }
        $placeholders = implode(', ', array_fill(0, count($photoIds), '?'));
        $params = array_merge([$wantedFolderId, $galleryId], $photoIds);
        $updated = DB::update(
            "UPDATE king_photos SET folder_id = ? WHERE gallery_id = ? AND id IN ({$placeholders})",
            $params
        );
        if ($wantedFolderId && Schema::hasColumn('king_photo_folders', 'cover_photo_id')) {
            DB::update(
                'UPDATE king_photo_folders f
                 SET cover_photo_id = COALESCE(
                   f.cover_photo_id,
                   (SELECT p.id FROM king_photos p WHERE p.gallery_id = ? AND p.folder_id = ? ORDER BY p."order" ASC, p.id ASC LIMIT 1)
                 ),
                 updated_at = NOW()
                 WHERE f.gallery_id = ? AND f.id = ?',
                [$galleryId, $wantedFolderId, $galleryId, $wantedFolderId]
            );
        }
        $list = $this->listFolders($userId, $galleryId);

        return ['status' => 200, 'body' => [
            'success' => true,
            'updated' => $updated,
            'folders' => $list['body']['folders'] ?? [],
        ]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function uploadWatermark(
        string $userId,
        int $galleryId,
        string $binary,
        string $mime,
        string $originalName,
        string $which,
        R2StorageService $r2
    ): array {
        if ($galleryId < 1) {
            return ['status' => 400, 'body' => ['message' => 'galleryId inválido']];
        }
        if ($binary === '') {
            return ['status' => 400, 'body' => ['message' => 'Arquivo é obrigatório']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        if (! $r2->config()['enabled']) {
            return ['status' => 501, 'body' => ['message' => 'R2 não configurado']];
        }
        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION) ?: 'png');
        $ext = preg_replace('/[^a-z0-9]/', '', $ext) ?: 'png';
        $key = 'galleries/'.$galleryId.'/watermark/'.(string) Str::uuid().'.'.$ext;
        $ct = str_starts_with($mime, 'image/') ? $mime : 'image/png';
        if (! $r2->putKey($key, $binary, $ct)) {
            return ['status' => 502, 'body' => ['success' => false, 'message' => 'Falha ao enviar marca d\'água para o R2']];
        }
        $r2Path = 'r2:'.$key;
        $which = strtolower(trim($which));
        $hasPathP = Schema::hasColumn('king_galleries', 'watermark_path_portrait');
        $hasPathL = Schema::hasColumn('king_galleries', 'watermark_path_landscape');
        $cur = DB::selectOne(
            'SELECT watermark_path'
            .($hasPathP ? ', watermark_path_portrait' : '')
            .($hasPathL ? ', watermark_path_landscape' : '')
            .' FROM king_galleries WHERE id = ?',
            [$galleryId]
        );
        $legacyEmpty = trim((string) ($cur->watermark_path ?? '')) === '';
        $sets = [];
        $vals = [];
        if ($which === 'portrait' && $hasPathP) {
            $sets[] = 'watermark_path_portrait = ?';
            $vals[] = $r2Path;
            if ($legacyEmpty) {
                $sets[] = 'watermark_path = ?';
                $vals[] = $r2Path;
            }
        } elseif ($which === 'landscape' && $hasPathL) {
            $sets[] = 'watermark_path_landscape = ?';
            $vals[] = $r2Path;
            if ($legacyEmpty) {
                $sets[] = 'watermark_path = ?';
                $vals[] = $r2Path;
            }
        } else {
            $sets[] = 'watermark_path = ?';
            $vals[] = $r2Path;
        }
        if (Schema::hasColumn('king_galleries', 'watermark_mode')) {
            $sets[] = 'watermark_mode = ?';
            $vals[] = 'logo';
        }
        $vals[] = $galleryId;
        DB::update('UPDATE king_galleries SET '.implode(', ', $sets).', updated_at = NOW() WHERE id = ?', $vals);
        $json = ['success' => true, 'watermark_path' => $r2Path];
        if ($which === 'portrait' && $hasPathP) {
            $json['watermark_path_portrait'] = $r2Path;
        }
        if ($which === 'landscape' && $hasPathL) {
            $json['watermark_path_landscape'] = $r2Path;
        }

        return ['status' => 200, 'body' => $json];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function uploadThankYouImage(
        string $userId,
        int $galleryId,
        string $binary,
        string $mime,
        string $originalName,
        R2StorageService $r2
    ): array {
        if ($galleryId < 1) {
            return ['status' => 400, 'body' => ['message' => 'galleryId inválido']];
        }
        if ($binary === '') {
            return ['status' => 400, 'body' => ['message' => 'Arquivo é obrigatório']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        if (! $r2->config()['enabled']) {
            return ['status' => 501, 'body' => ['success' => false, 'message' => 'R2 não configurado']];
        }
        $safe = preg_replace('/[^a-zA-Z0-9._-]/', '_', $originalName ?: 'thank-you.png') ?: 'thank-you.png';
        $safe = substr($safe, 0, 80);
        $ext = strtolower(pathinfo($safe, PATHINFO_EXTENSION) ?: 'png');
        $key = 'galleries/'.$galleryId.'/thank-you/'.(string) Str::uuid().'.'.$ext;
        $ct = str_starts_with($mime, 'image/') ? $mime : 'image/png';
        if (! $r2->putKey($key, $binary, $ct)) {
            return ['status' => 502, 'body' => ['success' => false, 'message' => 'Falha ao enviar imagem para o R2']];
        }
        $publicUrl = null;
        $cfg = $r2->config();
        if (! empty($cfg['publicBaseUrl'])) {
            $segments = array_map('rawurlencode', array_values(array_filter(explode('/', ltrim($key, '/')))));
            $publicUrl = $cfg['publicBaseUrl'].'/'.implode('/', $segments);
        }
        if (Schema::hasColumn('king_galleries', 'thank_you_image_url')) {
            DB::update(
                'UPDATE king_galleries SET thank_you_image_url = ?, updated_at = NOW() WHERE id = ?',
                [$publicUrl, $galleryId]
            );
        }

        return ['status' => 200, 'body' => ['success' => true, 'thank_you_image_url' => $publicUrl]];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function deletePhotosBatch(string $userId, int $galleryId, array $body): array
    {
        $ids = [];
        foreach ((array) ($body['photo_ids'] ?? []) as $x) {
            $id = (int) $x;
            if ($id > 0) {
                $ids[] = $id;
            }
        }
        $ids = array_values(array_unique($ids));
        if ($galleryId < 1 || $ids === []) {
            return ['status' => 400, 'body' => ['message' => 'galleryId e photo_ids são obrigatórios']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        $ph = $this->placeholders($ids);
        $params = array_merge([$galleryId], $ids);
        $own = DB::select("SELECT id FROM king_photos WHERE gallery_id = ? AND id IN ({$ph})", $params);
        $toDelete = array_map(static fn ($r) => (int) $r->id, $own);
        if ($toDelete === []) {
            return ['status' => 200, 'body' => ['success' => true, 'deleted' => 0]];
        }
        try {
            DB::delete('DELETE FROM king_selections WHERE gallery_id = ? AND photo_id IN ('.$this->placeholders($toDelete).')', array_merge([$galleryId], $toDelete));
        } catch (\Throwable) {
        }
        $deleted = DB::delete(
            'DELETE FROM king_photos WHERE gallery_id = ? AND id IN ('.$this->placeholders($toDelete).')',
            array_merge([$galleryId], $toDelete)
        );

        return ['status' => 200, 'body' => ['success' => true, 'deleted' => $deleted]];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function updateGallery(string $userId, int $galleryId, array $body): array
    {
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        $allowed = [
            'nome_projeto', 'status', 'total_fotos_contratadas', 'min_selections', 'access_mode',
            'is_published', 'cliente_nome', 'cliente_email', 'cliente_telefone', 'cliente_nota',
            'allow_self_signup', 'categoria', 'data_trabalho', 'idioma', 'mensagem_acesso',
            'allow_download', 'allow_comments', 'allow_social_sharing', 'client_card_height_px',
            'watermark_mode', 'watermark_opacity', 'watermark_scale', 'client_image_quality',
            'thank_you_title', 'thank_you_message', 'thank_you_image_url', 'thank_you_photographer_name',
            'support_whatsapp_number', 'support_whatsapp_label', 'support_whatsapp_message',
            'promo_enabled', 'promo_coupon_code', 'promo_valid_until', 'promo_free_photo_count',
            'promo_instructions', 'face_recognition_enabled', 'allow_client_edit_request',
        ];
        $sets = [];
        $params = [];
        foreach ($allowed as $col) {
            if (! array_key_exists($col, $body) || ! Schema::hasColumn('king_galleries', $col)) {
                continue;
            }
            $sets[] = "{$col} = ?";
            $val = $body[$col];
            if (is_bool($val)) {
                $val = $val ? true : false;
            }
            if (is_array($val)) {
                $val = json_encode($val, JSON_UNESCAPED_UNICODE);
            }
            $params[] = $val;
        }
        if ($sets === []) {
            $g = $this->ownedGallery($userId, $galleryId);

            return ['status' => 200, 'body' => ['success' => true, 'gallery' => $g]];
        }
        $params[] = $galleryId;
        DB::update('UPDATE king_galleries SET '.implode(', ', $sets).', updated_at = NOW() WHERE id = ?', $params);
        $g = $this->ownedGallery($userId, $galleryId);

        return ['status' => 200, 'body' => ['success' => true, 'gallery' => $g]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function listClients(string $userId, int $galleryId): array
    {
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        if (! Schema::hasTable('king_gallery_clients')) {
            return ['status' => 200, 'body' => ['success' => true, 'clients' => []]];
        }
        $cols = ['id', 'nome', 'email', 'telefone', 'enabled', 'note', 'created_at'];
        foreach (['status', 'selection_round'] as $c) {
            if (Schema::hasColumn('king_gallery_clients', $c)) {
                $cols[] = $c;
            }
        }
        $rows = DB::select(
            'SELECT '.implode(', ', $cols).' FROM king_gallery_clients WHERE gallery_id = ? ORDER BY created_at ASC, id ASC',
            [$galleryId]
        );
        $clients = array_values(array_filter(
            $rows,
            static fn ($r) => ! KsAccess::isTechnicalFaceEmail($r->email ?? null)
        ));

        return ['status' => 200, 'body' => ['success' => true, 'clients' => $clients]];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function createClient(string $userId, int $galleryId, array $body): array
    {
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        if (! Schema::hasTable('king_gallery_clients')) {
            return ['status' => 500, 'body' => ['message' => 'Tabela de clientes não disponível (migração pendente).']];
        }
        $nome = trim((string) ($body['nome'] ?? ''));
        $email = strtolower(trim((string) ($body['email'] ?? '')));
        if ($nome === '' || $email === '') {
            return ['status' => 400, 'body' => ['message' => 'Informe nome e e-mail.']];
        }
        $pass = (string) ($body['senha'] ?? '');
        if ($pass === '') {
            $pass = (string) random_int(100000, 999999);
        }
        $hash = password_hash($pass, PASSWORD_BCRYPT);
        $enc = Schema::hasColumn('king_gallery_clients', 'senha_enc')
            ? $this->passwordCrypto->encrypt($pass)
            : null;
        $tel = trim((string) ($body['telefone'] ?? '')) ?: null;
        $note = array_key_exists('note', $body) ? (trim((string) $body['note']) ?: null) : null;

        try {
            if (Schema::hasColumn('king_gallery_clients', 'status')) {
                $row = DB::selectOne(
                    'INSERT INTO king_gallery_clients
                     (gallery_id, nome, email, telefone, senha_hash, senha_enc, enabled, note, status, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, TRUE, ?, \'preparacao\', NOW(), NOW())
                     RETURNING id, nome, email, telefone, enabled, created_at',
                    [$galleryId, substr($nome, 0, 255), $email, $tel, $hash, $enc, $note]
                );
            } else {
                $row = DB::selectOne(
                    'INSERT INTO king_gallery_clients
                     (gallery_id, nome, email, telefone, senha_hash, senha_enc, enabled, note, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, TRUE, ?, NOW(), NOW())
                     RETURNING id, nome, email, telefone, enabled, created_at',
                    [$galleryId, substr($nome, 0, 255), $email, $tel, $hash, $enc, $note]
                );
            }
        } catch (\Throwable $e) {
            if (str_contains(strtolower($e->getMessage()), 'uniq') || str_contains(strtolower($e->getMessage()), 'unique')) {
                return ['status' => 409, 'body' => ['message' => 'Já existe um cliente com este e-mail nesta galeria.']];
            }
            throw $e;
        }

        return ['status' => 201, 'body' => ['success' => true, 'client' => $row, 'client_password' => $pass]];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function updateClient(string $userId, int $galleryId, int $clientId, array $body): array
    {
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        $sets = [];
        $params = [];
        if (array_key_exists('nome', $body)) {
            $sets[] = 'nome = ?';
            $params[] = substr(trim((string) $body['nome']), 0, 255);
        }
        if (array_key_exists('email', $body)) {
            $sets[] = 'email = ?';
            $params[] = strtolower(trim((string) $body['email']));
        }
        if (array_key_exists('telefone', $body)) {
            $sets[] = 'telefone = ?';
            $params[] = trim((string) $body['telefone']) ?: null;
        }
        if (array_key_exists('enabled', $body)) {
            $sets[] = 'enabled = ?';
            $params[] = filter_var($body['enabled'], FILTER_VALIDATE_BOOLEAN);
        }
        if (array_key_exists('note', $body)) {
            $sets[] = 'note = ?';
            $params[] = $body['note'] === null ? null : trim((string) $body['note']);
        }
        if ($sets === []) {
            return ['status' => 200, 'body' => ['success' => true]];
        }
        $params[] = $galleryId;
        $params[] = $clientId;
        DB::update(
            'UPDATE king_gallery_clients SET '.implode(', ', $sets).', updated_at = NOW() WHERE gallery_id = ? AND id = ?',
            $params
        );

        return ['status' => 200, 'body' => ['success' => true]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function deleteClient(string $userId, int $galleryId, int $clientId): array
    {
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        try {
            DB::delete('DELETE FROM king_selections WHERE gallery_id = ? AND client_id = ?', [$galleryId, $clientId]);
        } catch (\Throwable) {
        }
        $n = DB::delete('DELETE FROM king_gallery_clients WHERE gallery_id = ? AND id = ?', [$galleryId, $clientId]);
        if ($n < 1) {
            return ['status' => 404, 'body' => ['message' => 'Cliente não encontrado.']];
        }

        return ['status' => 200, 'body' => ['success' => true]];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function resetClientPassword(string $userId, int $galleryId, int $clientId, array $body): array
    {
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        $senha = (string) ($body['senha'] ?? '');
        if ($galleryId < 1 || $clientId < 1 || $senha === '') {
            return ['status' => 400, 'body' => ['message' => 'Informe galleryId, clientId e senha.']];
        }
        if (! Schema::hasTable('king_gallery_clients')) {
            return ['status' => 500, 'body' => ['message' => 'Tabela de clientes não disponível (migração pendente).']];
        }
        $hash = password_hash($senha, PASSWORD_BCRYPT);
        $enc = Schema::hasColumn('king_gallery_clients', 'senha_enc')
            ? $this->passwordCrypto->encrypt($senha)
            : null;
        if ($enc !== null) {
            $n = DB::update(
                'UPDATE king_gallery_clients SET senha_hash = ?, senha_enc = ?, updated_at = NOW() WHERE gallery_id = ? AND id = ?',
                [$hash, $enc, $galleryId, $clientId]
            );
        } else {
            $n = DB::update(
                'UPDATE king_gallery_clients SET senha_hash = ?, updated_at = NOW() WHERE gallery_id = ? AND id = ?',
                [$hash, $galleryId, $clientId]
            );
        }
        if ($n < 1) {
            return ['status' => 404, 'body' => ['message' => 'Cliente não encontrado.']];
        }

        return ['status' => 200, 'body' => ['success' => true, 'client_password' => $senha]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function createClientAccessLink(string $userId, int $galleryId, int $clientId): array
    {
        $g = $this->ownedGallery($userId, $galleryId);
        if (! $g) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        if ($clientId < 1) {
            return ['status' => 400, 'body' => ['message' => 'IDs inválidos']];
        }
        if (! Schema::hasTable('king_gallery_clients')) {
            return ['status' => 500, 'body' => ['message' => 'Tabela de clientes indisponível.']];
        }
        $row = DB::selectOne(
            'SELECT id, email, enabled FROM king_gallery_clients WHERE gallery_id = ? AND id = ? LIMIT 1',
            [$galleryId, $clientId]
        );
        if (! $row) {
            return ['status' => 404, 'body' => ['message' => 'Cliente não encontrado.']];
        }
        if (isset($row->enabled) && filter_var($row->enabled, FILTER_VALIDATE_BOOLEAN) === false) {
            return ['status' => 409, 'body' => ['message' => 'Cliente desativado.']];
        }
        if (KsAccess::isTechnicalFaceEmail($row->email ?? null)) {
            return ['status' => 409, 'body' => ['message' => 'Este cadastro é técnico (sessão). Use o cliente real da lista.']];
        }
        $slug = trim((string) ($g->slug ?? ''));
        if ($slug === '') {
            return ['status' => 500, 'body' => ['message' => 'Slug da galeria indisponível.']];
        }
        $token = $this->jwt->encode([
            'type' => 'kingselection_client',
            'galleryId' => $galleryId,
            'slug' => $slug,
            'clientId' => $clientId,
            'tyh' => false,
        ], '90d');
        $path = '/kingSelection/'.rawurlencode($slug);
        $q = 'access='.rawurlencode($token);
        $base = $this->shareBaseUrl();
        $url = $base ? ($base.$path.'?'.$q) : ($path.'?'.$q);

        return ['status' => 200, 'body' => ['success' => true, 'token' => $token, 'url' => $url]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function workerToken(string $userId, int $galleryId): array
    {
        if ($galleryId < 1) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'galleryId inválido']];
        }
        $secret = trim((string) (env('KINGSELECTION_WORKER_SECRET') ?: ''));
        if ($secret === '') {
            return ['status' => 501, 'body' => ['success' => false, 'message' => 'Worker não configurado (KINGSELECTION_WORKER_SECRET).']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['success' => false, 'message' => 'Sem permissão']];
        }
        $now = time();
        $exp = $now + 10 * 60;
        $token = $this->signWorkerToken([
            'typ' => 'ks_upload',
            'userId' => $userId,
            'galleryId' => $galleryId,
            'iat' => $now,
            'exp' => $exp,
        ], $secret);
        $workerUrl = trim((string) (env('KINGSELECTION_WORKER_URL') ?: '')) ?: null;

        return ['status' => 200, 'body' => [
            'success' => true,
            'token' => $token,
            'expiresInSeconds' => $exp - $now,
            'workerUrl' => $workerUrl,
        ]];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function resetGalleryPassword(string $userId, int $galleryId, array $body): array
    {
        $senha = (string) ($body['senha'] ?? '');
        if ($galleryId < 1 || $senha === '') {
            return ['status' => 400, 'body' => ['message' => 'galleryId e senha são obrigatórios']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        $hash = password_hash($senha, PASSWORD_BCRYPT);
        if (Schema::hasColumn('king_galleries', 'senha_enc')) {
            DB::update(
                'UPDATE king_galleries SET senha_hash = ?, senha_enc = ?, updated_at = NOW() WHERE id = ?',
                [$hash, $this->passwordCrypto->encrypt($senha), $galleryId]
            );
        } else {
            DB::update(
                'UPDATE king_galleries SET senha_hash = ?, updated_at = NOW() WHERE id = ?',
                [$hash, $galleryId]
            );
        }

        return ['status' => 200, 'body' => ['success' => true, 'client_password' => $senha]];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function openSelectionRound(string $userId, int $galleryId, array $body): array
    {
        if ($galleryId < 1) {
            return ['status' => 400, 'body' => ['message' => 'galleryId inválido']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        $bodyCid = isset($body['clientId']) && trim((string) $body['clientId']) !== ''
            ? (int) $body['clientId']
            : null;
        $hasClients = Schema::hasTable('king_gallery_clients');
        $hasCliRound = $hasClients && Schema::hasColumn('king_gallery_clients', 'selection_round');
        $hasCliStatus = $hasClients && Schema::hasColumn('king_gallery_clients', 'status');
        $hasGalRound = Schema::hasColumn('king_galleries', 'selection_round');

        $enabledRows = $hasClients
            ? DB::select(
                'SELECT id FROM king_gallery_clients WHERE gallery_id = ? AND enabled IS DISTINCT FROM false ORDER BY id ASC',
                [$galleryId]
            )
            : [];
        $targetCid = ($bodyCid !== null && $bodyCid > 0) ? $bodyCid : null;
        if (count($enabledRows) > 1 && ! $targetCid) {
            return ['status' => 400, 'body' => ['message' => 'Esta galeria tem vários clientes. Informe clientId no corpo da requisição.']];
        }
        if (count($enabledRows) === 1 && ! $targetCid) {
            $targetCid = (int) $enabledRows[0]->id;
        }

        if ($targetCid && $hasCliRound && $hasCliStatus) {
            $ok = false;
            foreach ($enabledRows as $r) {
                if ((int) $r->id === $targetCid) {
                    $ok = true;
                    break;
                }
            }
            if (! $ok) {
                return ['status' => 404, 'body' => ['message' => 'Cliente não encontrado nesta galeria.']];
            }
            $u = DB::selectOne(
                "UPDATE king_gallery_clients
                 SET status='andamento', selection_round = selection_round + 1, updated_at=NOW()
                 WHERE gallery_id = ? AND id = ? AND status='revisao'
                 RETURNING selection_round",
                [$galleryId, $targetCid]
            );
            if (! $u) {
                return ['status' => 400, 'body' => [
                    'message' => 'Só é possível abrir nova rodada quando o cliente está em revisão (já enviou a seleção).',
                ]];
            }

            return ['status' => 200, 'body' => [
                'success' => true,
                'selection_round' => (int) $u->selection_round,
                'clientId' => $targetCid,
            ]];
        }

        if (! $hasGalRound) {
            return ['status' => 500, 'body' => ['message' => 'Migração pendente: coluna selection_round em king_galleries.']];
        }
        $u = DB::selectOne(
            "UPDATE king_galleries
             SET status='andamento', selection_round = selection_round + 1, updated_at=NOW()
             WHERE id = ? AND status='revisao'
             RETURNING selection_round",
            [$galleryId]
        );
        if (! $u) {
            return ['status' => 400, 'body' => [
                'message' => 'Só é possível abrir nova rodada quando a galeria está em revisão.',
            ]];
        }
        if ($hasCliStatus && $enabledRows !== []) {
            DB::update(
                "UPDATE king_gallery_clients SET status='andamento', updated_at=NOW() WHERE gallery_id = ?",
                [$galleryId]
            );
        }

        return ['status' => 200, 'body' => [
            'success' => true,
            'selection_round' => (int) $u->selection_round,
        ]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function listEditRequestsAdmin(string $userId, int $galleryId): array
    {
        if ($galleryId < 1) {
            return ['status' => 400, 'body' => ['message' => 'galleryId inválido']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 404, 'body' => ['message' => 'Galeria não encontrada.']];
        }
        if (! Schema::hasTable('king_client_edit_requests')) {
            return ['status' => 200, 'body' => ['success' => true, 'requests' => []]];
        }
        $hasBatch = Schema::hasColumn('king_client_edit_requests', 'selection_batch');
        $batchSel = $hasBatch ? 'r.selection_batch,' : '';
        $rows = DB::select(
            "SELECT r.id, r.gallery_id, r.client_id, {$batchSel} r.status, r.note_client, r.created_at, r.updated_at,
                    c.nome AS client_name, c.email AS client_email, c.telefone AS client_phone,
                    (SELECT COUNT(*)::int FROM king_client_edit_request_photos p WHERE p.edit_request_id = r.id) AS photo_count
             FROM king_client_edit_requests r
             LEFT JOIN king_gallery_clients c ON c.id = r.client_id
             WHERE r.gallery_id = ?
             ORDER BY r.created_at DESC, r.id DESC
             LIMIT 200",
            [$galleryId]
        );
        $reqIds = array_values(array_filter(array_map(static fn ($r) => (int) $r->id, $rows)));
        $photosByRequest = [];
        if ($reqIds !== [] && Schema::hasTable('king_client_edit_request_photos')) {
            $placeholders = implode(', ', array_fill(0, count($reqIds), '?'));
            $ph = DB::select(
                "SELECT erp.edit_request_id, erp.photo_id, kp.original_name, kp.\"order\"
                 FROM king_client_edit_request_photos erp
                 JOIN king_photos kp ON kp.id = erp.photo_id
                 WHERE erp.edit_request_id IN ({$placeholders})
                 ORDER BY kp.\"order\" ASC, kp.id ASC",
                $reqIds
            );
            foreach ($ph as $row) {
                $rid = (int) $row->edit_request_id;
                $photosByRequest[$rid][] = [
                    'photo_id' => (int) $row->photo_id,
                    'original_name' => $row->original_name,
                    'order' => $row->order,
                ];
            }
        }
        $out = [];
        foreach ($rows as $r) {
            $rid = (int) $r->id;
            $out[] = [
                'id' => $rid,
                'status' => (string) ($r->status ?: 'pending'),
                'note_client' => $r->note_client ?? null,
                'created_at' => $r->created_at,
                'updated_at' => $r->updated_at,
                'client_id' => $r->client_id,
                'client_name' => $r->client_name ?: 'Cliente',
                'client_email' => $r->client_email ?? null,
                'client_phone' => $r->client_phone ?? null,
                'selection_batch' => $hasBatch ? ((int) ($r->selection_batch ?? 0) ?: null) : null,
                'photo_count' => (int) ($r->photo_count ?? 0),
                'photos' => $photosByRequest[$rid] ?? [],
            ];
        }

        return ['status' => 200, 'body' => ['success' => true, 'requests' => $out]];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function updateEditRequest(string $userId, int $galleryId, int $requestId, array $body): array
    {
        if ($galleryId < 1 || $requestId < 1) {
            return ['status' => 400, 'body' => ['message' => 'Parâmetros inválidos.']];
        }
        $statusIn = strtolower(trim((string) ($body['status'] ?? '')));
        $releaseDownload = ! empty($body['release_download']);
        $allowed = ['pending', 'in_progress', 'done', 'rejected'];
        if (! in_array($statusIn, $allowed, true)) {
            return ['status' => 400, 'body' => ['message' => 'Status inválido.']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 404, 'body' => ['message' => 'Galeria não encontrada.']];
        }
        if (! Schema::hasTable('king_client_edit_requests')) {
            return ['status' => 503, 'body' => ['message' => 'Pedidos de edição indisponíveis.']];
        }
        $hasBatch = Schema::hasColumn('king_client_edit_requests', 'selection_batch');
        $batchSel = $hasBatch ? ', selection_batch' : '';
        $upd = DB::selectOne(
            "UPDATE king_client_edit_requests
             SET status = ?, updated_at = NOW()
             WHERE id = ? AND gallery_id = ?
             RETURNING id, status, client_id{$batchSel}",
            [$statusIn, $requestId, $galleryId]
        );
        if (! $upd) {
            return ['status' => 404, 'body' => ['message' => 'Pedido não encontrado.']];
        }

        $releasedCount = 0;
        if (($statusIn === 'done' || $releaseDownload) && Schema::hasTable('king_selection_photo_approvals')) {
            $clientId = (int) ($upd->client_id ?? 0);
            $batch = $hasBatch ? ((int) ($upd->selection_batch ?? 0)) : 0;
            $photoIds = [];
            if (Schema::hasTable('king_client_edit_request_photos')) {
                foreach (DB::select(
                    'SELECT photo_id FROM king_client_edit_request_photos WHERE edit_request_id = ?',
                    [$requestId]
                ) as $pr) {
                    $pid = (int) $pr->photo_id;
                    if ($pid > 0) {
                        $photoIds[] = $pid;
                    }
                }
            }
            if ($clientId > 0 && $photoIds !== []) {
                if ($batch < 1 && Schema::hasColumn('king_selections', 'selection_batch')) {
                    $placeholders = implode(', ', array_fill(0, count($photoIds), '?'));
                    $params = array_merge([$galleryId, $clientId], $photoIds);
                    $bRes = DB::selectOne(
                        "SELECT COALESCE(MAX(selection_batch), 1)::int AS b
                         FROM king_selections WHERE gallery_id = ? AND client_id = ? AND photo_id IN ({$placeholders})",
                        $params
                    );
                    $batch = (int) ($bRes->b ?? 1) ?: 1;
                } elseif ($batch < 1) {
                    $batch = 1;
                }
                foreach ($photoIds as $photoId) {
                    DB::statement(
                        "INSERT INTO king_selection_photo_approvals
                           (gallery_id, client_id, selection_batch, photo_id, status, delivery_mode, decided_by_user_id, decided_at, created_at, updated_at)
                         VALUES (?, ?, ?, ?, 'approved', 'original', ?, NOW(), NOW(), NOW())
                         ON CONFLICT (gallery_id, client_id, selection_batch, photo_id)
                         DO UPDATE SET status='approved', delivery_mode=EXCLUDED.delivery_mode,
                                       decided_by_user_id=EXCLUDED.decided_by_user_id, decided_at=NOW(), updated_at=NOW()",
                        [$galleryId, $clientId, $batch, $photoId, $userId]
                    );
                    $releasedCount++;
                }
            }
        }

        return ['status' => 200, 'body' => [
            'success' => true,
            'id' => $requestId,
            'status' => $upd->status,
            'released_photos' => $releasedCount,
        ]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function deleteEditRequest(string $userId, int $galleryId, int $requestId): array
    {
        if ($galleryId < 1 || $requestId < 1) {
            return ['status' => 400, 'body' => ['message' => 'Parâmetros inválidos.']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 404, 'body' => ['message' => 'Galeria não encontrada.']];
        }
        if (! Schema::hasTable('king_client_edit_requests')) {
            return ['status' => 503, 'body' => ['message' => 'Pedidos de edição indisponíveis.']];
        }
        $n = DB::delete(
            'DELETE FROM king_client_edit_requests WHERE id = ? AND gallery_id = ?',
            [$requestId, $galleryId]
        );
        if ($n < 1) {
            return ['status' => 404, 'body' => ['message' => 'Pedido não encontrado.']];
        }

        return ['status' => 200, 'body' => ['success' => true, 'id' => $requestId, 'deleted' => true]];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function deleteSelectionBatch(string $userId, int $galleryId, int $clientId, array $body): array
    {
        $batch = (int) ($body['batch'] ?? 0);
        if ($galleryId < 1 || $clientId < 1 || $batch < 1) {
            return ['status' => 400, 'body' => ['message' => 'galleryId, clientId e batch (número >= 1) são obrigatórios.']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão.']];
        }
        if (! $this->enabledClient($galleryId, $clientId)) {
            return ['status' => 404, 'body' => ['message' => 'Cliente não encontrado.']];
        }
        if (! Schema::hasColumn('king_selections', 'selection_batch')) {
            return ['status' => 400, 'body' => ['message' => 'Esta base não tem rodadas de seleção (migration pendente?).']];
        }
        $deleted = 0;
        DB::transaction(function () use ($galleryId, $clientId, $batch, &$deleted) {
            $deleted = DB::delete(
                'DELETE FROM king_selections WHERE gallery_id = ? AND client_id = ? AND selection_batch = ?',
                [$galleryId, $clientId, $batch]
            );
            if (Schema::hasTable('king_selection_photo_approvals')) {
                DB::delete(
                    'DELETE FROM king_selection_photo_approvals WHERE gallery_id = ? AND client_id = ? AND selection_batch = ?',
                    [$galleryId, $clientId, $batch]
                );
            }
            if (Schema::hasTable('king_client_payment_requests')) {
                DB::delete(
                    'DELETE FROM king_client_payment_requests WHERE gallery_id = ? AND client_id = ? AND selection_batch = ?',
                    [$galleryId, $clientId, $batch]
                );
            }
            if (Schema::hasTable('king_download_audit')) {
                DB::delete(
                    'DELETE FROM king_download_audit WHERE gallery_id = ? AND client_id = ? AND selection_batch = ?',
                    [$galleryId, $clientId, $batch]
                );
            }
        });

        return ['status' => 200, 'body' => ['success' => true, 'deleted' => $deleted]];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function reactivateSelectionBatch(string $userId, int $galleryId, int $clientId, array $body): array
    {
        $batch = (int) ($body['batch'] ?? 0);
        if ($galleryId < 1 || $clientId < 1 || $batch < 1) {
            return ['status' => 400, 'body' => ['message' => 'galleryId, clientId e batch (número >= 1) são obrigatórios.']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão.']];
        }
        if (! $this->enabledClient($galleryId, $clientId)) {
            return ['status' => 404, 'body' => ['message' => 'Cliente não encontrado.']];
        }
        if (! Schema::hasColumn('king_selections', 'selection_batch')) {
            return ['status' => 400, 'body' => ['message' => 'Esta base não tem rodadas de seleção (migration pendente?).']];
        }
        $exists = DB::selectOne(
            'SELECT 1 AS ok FROM king_selections WHERE gallery_id = ? AND client_id = ? AND selection_batch = ? LIMIT 1',
            [$galleryId, $clientId, $batch]
        );
        if (! $exists) {
            return ['status' => 404, 'body' => ['message' => 'Rodada não encontrada para este cliente.']];
        }
        if (Schema::hasColumn('king_gallery_clients', 'selection_round')) {
            DB::update(
                "UPDATE king_gallery_clients
                 SET status = 'andamento', selection_round = ?, updated_at = NOW()
                 WHERE gallery_id = ? AND id = ?",
                [$batch, $galleryId, $clientId]
            );
        } else {
            DB::update(
                "UPDATE king_gallery_clients
                 SET status = 'andamento', updated_at = NOW()
                 WHERE gallery_id = ? AND id = ?",
                [$galleryId, $clientId]
            );
        }

        return ['status' => 200, 'body' => [
            'success' => true,
            'selection_round' => $batch,
            'clientId' => $clientId,
            'batch' => $batch,
        ]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function clearReview(string $userId, int $galleryId, int $clientId): array
    {
        if ($galleryId < 1 || $clientId < 1) {
            return ['status' => 400, 'body' => ['message' => 'galleryId e clientId são obrigatórios.']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão.']];
        }
        if (! $this->enabledClient($galleryId, $clientId)) {
            return ['status' => 404, 'body' => ['message' => 'Cliente não encontrado.']];
        }
        $deleted = 0;
        DB::transaction(function () use ($galleryId, $clientId, &$deleted) {
            $deleted = DB::delete(
                'DELETE FROM king_selections WHERE gallery_id = ? AND client_id = ?',
                [$galleryId, $clientId]
            );
            if (Schema::hasTable('king_selection_photo_approvals')) {
                DB::delete(
                    'DELETE FROM king_selection_photo_approvals WHERE gallery_id = ? AND client_id = ?',
                    [$galleryId, $clientId]
                );
            }
            if (Schema::hasTable('king_client_payment_requests')) {
                DB::delete(
                    'DELETE FROM king_client_payment_requests WHERE gallery_id = ? AND client_id = ?',
                    [$galleryId, $clientId]
                );
            }
            if (Schema::hasTable('king_download_audit')) {
                DB::delete(
                    'DELETE FROM king_download_audit WHERE gallery_id = ? AND client_id = ?',
                    [$galleryId, $clientId]
                );
            }
            if (Schema::hasColumn('king_gallery_clients', 'status')) {
                $sets = "status = 'andamento', updated_at = NOW()";
                if (Schema::hasColumn('king_gallery_clients', 'feedback_cliente')) {
                    $sets = "status = 'andamento', feedback_cliente = NULL, updated_at = NOW()";
                }
                DB::update(
                    "UPDATE king_gallery_clients SET {$sets} WHERE gallery_id = ? AND id = ?",
                    [$galleryId, $clientId]
                );
            }
        });

        return ['status' => 200, 'body' => ['success' => true, 'deleted' => $deleted]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function exportGallery(string $userId, int $galleryId, mixed $batchRaw, mixed $clientIdRaw): array
    {
        if ($galleryId < 1) {
            return ['status' => 400, 'body' => ['message' => 'galleryId inválido']];
        }
        $g = $this->ownedGallery($userId, $galleryId);
        if (! $g) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        $batchParam = trim((string) ($batchRaw ?? ''));
        $filterBatch = ($batchParam !== '' && $batchParam !== 'all') ? (int) $batchParam : null;
        $clientIdParam = ($clientIdRaw !== null && trim((string) $clientIdRaw) !== '')
            ? (int) $clientIdRaw
            : null;

        $hasSelBatch = Schema::hasColumn('king_selections', 'selection_batch');
        $hasSelClientId = Schema::hasColumn('king_selections', 'client_id');
        $where = 's.gallery_id = ?';
        $params = [$galleryId];
        $selExtra = '';
        if ($hasSelBatch && $filterBatch !== null && $filterBatch > 0) {
            $where .= ' AND s.selection_batch = ?';
            $params[] = $filterBatch;
        }
        if ($hasSelClientId && $clientIdParam !== null && $clientIdParam > 0) {
            $where .= ' AND s.client_id = ?';
            $params[] = $clientIdParam;
        }
        if ($hasSelBatch) {
            $selExtra = ', s.selection_batch';
        }
        $rows = DB::select(
            "SELECT p.original_name, s.feedback_cliente{$selExtra}
             FROM king_selections s
             JOIN king_photos p ON p.id = s.photo_id
             WHERE {$where}
             ORDER BY p.\"order\" ASC, p.id ASC",
            $params
        );
        $names = [];
        $feedback = null;
        foreach ($rows as $r) {
            $n = $this->normalizeExportName((string) ($r->original_name ?? ''));
            if ($n !== '') {
                $names[] = $n;
            }
            if ($feedback === null && ! empty($r->feedback_cliente)) {
                $feedback = $r->feedback_cliente;
            }
        }
        $senhaPlain = null;
        if (Schema::hasColumn('king_galleries', 'senha_enc')) {
            $senhaPlain = $this->passwordCrypto->decrypt($g->senha_enc ?? null);
        }

        return ['status' => 200, 'body' => [
            'success' => true,
            'gallery' => [
                'id' => (int) $g->id,
                'nome_projeto' => $g->nome_projeto ?? null,
                'slug' => $g->slug ?? null,
                'cliente_email' => $g->cliente_email ?? null,
                'status' => $g->status ?? null,
                'total_fotos_contratadas' => $g->total_fotos_contratadas ?? null,
                'min_selections' => $g->min_selections ?? 0,
                'senha' => $senhaPlain,
            ],
            'feedback' => $feedback,
            'lightroom' => implode(', ', $names),
            'windows' => implode(' OR ', array_map(static fn ($n) => '"'.str_replace('"', '', $n).'"', $names)),
            'finder' => implode(' OR ', $names),
            'count' => count($names),
            'exportBatch' => ($filterBatch !== null && $filterBatch > 0) ? $filterBatch : 'all',
            'exportClientId' => ($clientIdParam !== null && $clientIdParam > 0) ? $clientIdParam : null,
        ]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function getClientPassword(string $userId, int $galleryId, int $clientId): array
    {
        if ($galleryId < 1 || $clientId < 1) {
            return ['status' => 400, 'body' => ['message' => 'IDs inválidos']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        if (! Schema::hasTable('king_gallery_clients')) {
            return ['status' => 500, 'body' => ['message' => 'Tabela de clientes não disponível (migração pendente).']];
        }
        $row = DB::selectOne(
            'SELECT senha_enc FROM king_gallery_clients WHERE gallery_id = ? AND id = ? LIMIT 1',
            [$galleryId, $clientId]
        );
        $plain = $this->passwordCrypto->decrypt($row->senha_enc ?? null);
        if ($plain === null || $plain === '') {
            return ['status' => 409, 'body' => ['message' => 'Senha indisponível. Gere uma nova senha em Editar.']];
        }

        return ['status' => 200, 'body' => ['success' => true, 'password' => $plain]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function uploadLinkCover(
        string $userId,
        int $galleryId,
        string $binary,
        string $mime,
        string $originalName,
        R2StorageService $r2
    ): array {
        if ($galleryId < 1) {
            return ['status' => 400, 'body' => ['message' => 'galleryId inválido']];
        }
        if ($binary === '') {
            return ['status' => 400, 'body' => ['message' => 'Arquivo de capa é obrigatório.']];
        }
        if (! str_starts_with(strtolower($mime), 'image/')) {
            return ['status' => 400, 'body' => ['message' => 'Envie apenas imagem para capa.']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        if (! Schema::hasColumn('king_galleries', 'gallery_link_cover_photo_id')
            || ! Schema::hasColumn('king_galleries', 'gallery_link_cover_file_path')) {
            return ['status' => 503, 'body' => ['message' => 'Campos de capa do link indisponíveis. Execute a migration 210.']];
        }
        if (! $r2->config()['enabled']) {
            return ['status' => 501, 'body' => ['message' => 'R2 não configurado']];
        }
        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION) ?: 'jpg');
        $ext = preg_replace('/[^a-z0-9]/', '', $ext) ?: 'jpg';
        $key = 'galleries/'.$galleryId.'/link-cover/'.(string) \Illuminate\Support\Str::uuid().'.'.$ext;
        $ct = str_starts_with($mime, 'image/') ? $mime : 'image/jpeg';
        if (! $r2->putKey($key, $binary, $ct)) {
            return ['status' => 502, 'body' => ['success' => false, 'message' => 'Falha ao enviar capa para o R2']];
        }
        $newPath = 'r2:'.$key;
        DB::update(
            'UPDATE king_galleries
             SET gallery_link_cover_file_path = ?, gallery_link_cover_photo_id = NULL, updated_at = NOW()
             WHERE id = ?',
            [$newPath, $galleryId]
        );

        return ['status' => 200, 'body' => [
            'success' => true,
            'gallery_link_cover_photo_id' => null,
            'gallery_link_cover_file_path' => $newPath,
        ]];
    }

    /**
     * @return array{status:int, binary?:string, contentType?:string, message?:string}
     */
    public function linkCoverPreview(string $userId, int $galleryId, KingSelectionMediaService $media): array
    {
        if ($galleryId < 1) {
            return ['status' => 400, 'message' => 'galleryId inválido'];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'message' => 'Sem permissão'];
        }
        foreach ($this->linkCoverCandidatePaths($galleryId) as $path) {
            $buf = $media->readFileBuffer($path);
            if ($buf === null || strlen($buf) < 12) {
                continue;
            }
            $out = $this->jpegPreviewResize($buf, 1200);
            if ($out === null) {
                return ['status' => 502, 'message' => 'Falha ao processar imagem da capa'];
            }

            return ['status' => 200, 'binary' => $out, 'contentType' => 'image/jpeg'];
        }

        return ['status' => 404, 'message' => 'Sem capa'];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function editedUpload(
        string $userId,
        int $galleryId,
        int $photoId,
        string $binary,
        string $mime,
        string $originalName,
        R2StorageService $r2
    ): array {
        if ($galleryId < 1 || $photoId < 1) {
            return ['status' => 400, 'body' => ['message' => 'IDs inválidos.']];
        }
        if ($binary === '') {
            return ['status' => 400, 'body' => ['message' => 'Arquivo editado é obrigatório.']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        if (! Schema::hasColumn('king_photos', 'edited_file_path')) {
            return ['status' => 503, 'body' => ['message' => 'Coluna edited_file_path indisponível. Execute a migration 208.']];
        }
        $belongs = DB::selectOne(
            'SELECT id FROM king_photos WHERE id = ? AND gallery_id = ? LIMIT 1',
            [$photoId, $galleryId]
        );
        if (! $belongs) {
            return ['status' => 404, 'body' => ['message' => 'Foto não encontrada para esta galeria.']];
        }
        if (! $r2->config()['enabled']) {
            return ['status' => 501, 'body' => ['message' => 'R2 não configurado']];
        }
        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION) ?: 'jpg');
        $ext = preg_replace('/[^a-z0-9]/', '', $ext) ?: 'jpg';
        $key = 'galleries/'.$galleryId.'/edited/'.(string) \Illuminate\Support\Str::uuid().'.'.$ext;
        $ct = str_starts_with($mime, 'image/') ? $mime : 'image/jpeg';
        if (! $r2->putKey($key, $binary, $ct)) {
            return ['status' => 502, 'body' => ['success' => false, 'message' => 'Falha ao enviar arquivo editado']];
        }
        $editedPath = 'r2:'.$key;
        DB::update(
            'UPDATE king_photos SET edited_file_path = ? WHERE id = ? AND gallery_id = ?',
            [$editedPath, $photoId, $galleryId]
        );

        return ['status' => 200, 'body' => [
            'success' => true,
            'photo_id' => $photoId,
            'edited_file_path' => $editedPath,
        ]];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function patchPhoto(string $userId, int $photoId, array $body): array
    {
        if ($photoId < 1) {
            return ['status' => 400, 'body' => ['message' => 'photoId inválido']];
        }
        $own = $this->ownedPhoto($userId, $photoId);
        if (! $own) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        $galleryId = (int) $own->gallery_id;
        $sets = [];
        $params = [];
        if (array_key_exists('is_favorite', $body) && Schema::hasColumn('king_photos', 'is_favorite')) {
            $sets[] = 'is_favorite = ?';
            $params[] = (bool) $body['is_favorite'];
        }
        if (array_key_exists('original_name', $body)) {
            $sets[] = 'original_name = ?';
            $params[] = substr((string) ($body['original_name'] ?? ''), 0, 500);
        }
        if (array_key_exists('order', $body)) {
            $sets[] = '"order" = ?';
            $params[] = (int) ($body['order'] ?? 0);
        }
        if (array_key_exists('edited_file_path', $body) && Schema::hasColumn('king_photos', 'edited_file_path')) {
            $v = $body['edited_file_path'];
            $sets[] = 'edited_file_path = ?';
            $params[] = $v === null ? null : (trim((string) $v) ?: null);
        }
        if (array_key_exists('is_cover', $body) && Schema::hasColumn('king_photos', 'is_cover')) {
            if ($body['is_cover']) {
                DB::update('UPDATE king_photos SET is_cover = FALSE WHERE gallery_id = ?', [$galleryId]);
                $sets[] = 'is_cover = ?';
                $params[] = true;
            } else {
                $sets[] = 'is_cover = ?';
                $params[] = false;
            }
        }
        if ($sets === []) {
            return ['status' => 200, 'body' => ['success' => true]];
        }
        $params[] = $photoId;
        DB::update('UPDATE king_photos SET '.implode(', ', $sets).' WHERE id = ?', $params);

        return ['status' => 200, 'body' => ['success' => true]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function deletePhoto(string $userId, int $photoId): array
    {
        if ($photoId < 1) {
            return ['status' => 400, 'body' => ['message' => 'photoId inválido']];
        }
        $own = $this->ownedPhoto($userId, $photoId);
        if (! $own) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        $galleryId = (int) $own->gallery_id;
        $filePath = (string) ($own->file_path ?? '');
        try {
            DB::delete('DELETE FROM king_selections WHERE gallery_id = ? AND photo_id = ?', [$galleryId, $photoId]);
        } catch (\Throwable) {
        }
        try {
            if (Schema::hasTable('king_photo_faces')) {
                DB::delete('DELETE FROM king_photo_faces WHERE photo_id = ?', [$photoId]);
            }
        } catch (\Throwable) {
        }
        DB::delete('DELETE FROM king_photos WHERE id = ? AND gallery_id = ?', [$photoId, $galleryId]);

        return ['status' => 200, 'body' => [
            'success' => true,
            'cloudflare' => ['attempted' => false, 'deleted' => false, 'skipped' => false],
            'r2' => [
                'attempted' => str_starts_with($filePath, 'r2:'),
                'deleted' => false,
            ],
        ]];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function replacePhotoR2(string $userId, int $photoId, array $body): array
    {
        if ($photoId < 1) {
            return ['status' => 400, 'body' => ['message' => 'photoId, key e receipt são obrigatórios']];
        }
        $key = ltrim(trim((string) ($body['key'] ?? '')), '/');
        $receipt = trim((string) ($body['receipt'] ?? ''));
        if ($key === '' || $receipt === '') {
            return ['status' => 400, 'body' => ['message' => 'photoId, key e receipt são obrigatórios']];
        }
        $secret = trim((string) (env('KINGSELECTION_WORKER_SECRET') ?: ''));
        if ($secret === '') {
            return ['status' => 501, 'body' => ['success' => false, 'message' => 'Worker não configurado (KINGSELECTION_WORKER_SECRET).']];
        }
        $payload = $this->verifyWorkerToken($receipt, $secret);
        if (! $payload || ($payload['typ'] ?? '') !== 'ks_receipt') {
            return ['status' => 400, 'body' => ['message' => 'Recibo inválido']];
        }
        $own = $this->ownedPhoto($userId, $photoId);
        if (! $own) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        $galleryId = (int) $own->gallery_id;
        if ((int) ($payload['galleryId'] ?? 0) !== $galleryId || (string) ($payload['key'] ?? '') !== $key) {
            return ['status' => 400, 'body' => ['message' => 'Key ou recibo não corresponde à galeria']];
        }
        if (! str_starts_with($key, 'galleries/'.$galleryId.'/')) {
            return ['status' => 400, 'body' => ['message' => 'Key inválida']];
        }
        $name = substr((string) ($body['original_name'] ?? 'foto'), 0, 500) ?: 'foto';
        DB::update(
            'UPDATE king_photos SET file_path = ?, original_name = ? WHERE id = ?',
            ['r2:'.$key, $name, $photoId]
        );

        return ['status' => 200, 'body' => ['success' => true]];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function replacePhotoCf(string $userId, int $photoId, array $body): array
    {
        $imageId = trim((string) ($body['imageId'] ?? ''));
        if ($photoId < 1 || $imageId === '') {
            return ['status' => 400, 'body' => ['message' => 'photoId e imageId são obrigatórios']];
        }
        $own = $this->ownedPhoto($userId, $photoId);
        if (! $own) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        $name = substr((string) ($body['original_name'] ?? 'foto'), 0, 500) ?: 'foto';
        DB::update(
            'UPDATE king_photos SET file_path = ?, original_name = ? WHERE id = ?',
            ['cfimage:'.$imageId, $name, $photoId]
        );

        return ['status' => 200, 'body' => [
            'success' => true,
            'cloudflare' => ['attempted' => false, 'deleted' => false, 'skipped' => true],
        ]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function replacePhotoProxy(
        string $userId,
        int $photoId,
        string $binary,
        string $mime,
        string $originalName,
        R2StorageService $r2
    ): array {
        if ($photoId < 1) {
            return ['status' => 400, 'body' => ['message' => 'photoId inválido']];
        }
        if ($binary === '') {
            return ['status' => 400, 'body' => ['message' => 'Arquivo é obrigatório']];
        }
        $own = $this->ownedPhoto($userId, $photoId);
        if (! $own) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        if (! $r2->config()['enabled']) {
            return ['status' => 501, 'body' => ['message' => 'R2 não configurado']];
        }
        $galleryId = (int) $own->gallery_id;
        $safe = preg_replace('/[^a-zA-Z0-9._-]/', '_', $originalName ?: 'foto.jpg') ?: 'foto.jpg';
        $ext = strtolower(pathinfo($safe, PATHINFO_EXTENSION) ?: 'jpg');
        $key = 'galleries/'.$galleryId.'/photos/'.(string) \Illuminate\Support\Str::uuid().'.'.$ext;
        $ct = str_starts_with($mime, 'image/') ? $mime : 'image/jpeg';
        if (! $r2->putKey($key, $binary, $ct)) {
            return ['status' => 502, 'body' => ['success' => false, 'message' => 'Falha ao enviar para o R2']];
        }
        $name = substr($originalName ?: 'foto', 0, 500) ?: 'foto';
        DB::update(
            'UPDATE king_photos SET file_path = ?, original_name = ? WHERE id = ?',
            ['r2:'.$key, $name, $photoId]
        );

        return ['status' => 200, 'body' => ['success' => true]];
    }

    /**
     * @param  array<string,mixed>  $query
     * @return array{status:int, binary?:string, contentType?:string, message?:string, filename?:string}
     */
    public function adminPhotoPreview(string $userId, int $photoId, array $query, KingSelectionMediaService $media): array
    {
        if ($photoId < 1) {
            return ['status' => 400, 'message' => 'photoId inválido'];
        }
        $own = $this->ownedPhoto($userId, $photoId);
        if (! $own) {
            return ['status' => 404, 'message' => 'Não encontrado'];
        }
        $path = trim((string) ($own->file_path ?? ''));
        if ($path === '') {
            return ['status' => 502, 'message' => 'Não foi possível carregar a imagem (armazenamento indisponível ou ficheiro em falta no R2).'];
        }
        $qMax = (int) ($query['max'] ?? 1200);
        $maxSide = ($qMax >= 320 && $qMax <= 2000) ? $qMax : 1200;
        $skipWm = strtolower((string) ($query['wm_mode'] ?? '')) === 'none';
        $wm = null;
        if (! $skipWm && Schema::hasColumn('king_galleries', 'watermark_mode')) {
            $g = DB::selectOne('SELECT watermark_mode, watermark_opacity FROM king_galleries WHERE id = ? LIMIT 1', [(int) $own->gallery_id]);
            $mode = strtolower((string) ($g->watermark_mode ?? 'none'));
            if ($mode !== '' && $mode !== 'none') {
                $wm = [
                    'enabled' => true,
                    'mode' => $mode,
                    'opacity' => (float) ($g->watermark_opacity ?? 0.22),
                ];
            }
        }
        $thumb = $maxSide <= 400;
        $r = $media->previewFromStoragePath($path, $thumb, $wm);
        if (($r['status'] ?? 500) === 200 && ! $thumb && $maxSide !== 1200 && ! empty($r['binary'])) {
            $resized = $this->jpegPreviewResize((string) $r['binary'], $maxSide);
            if ($resized !== null) {
                $r['binary'] = $resized;
            }
        }

        return $r;
    }

    /**
     * @return array{status:int, binary?:string, contentType?:string, message?:string, filename?:string}
     */
    public function adminPhotoDownload(string $userId, int $photoId, KingSelectionMediaService $media): array
    {
        if ($photoId < 1) {
            return ['status' => 400, 'message' => 'photoId inválido'];
        }
        $own = $this->ownedPhoto($userId, $photoId);
        if (! $own) {
            return ['status' => 404, 'message' => 'Não encontrado'];
        }
        $path = trim((string) ($own->file_path ?? ''));
        if ($path === '') {
            return ['status' => 500, 'message' => 'Não foi possível carregar a imagem (Cloudflare/R2 não configurado).'];
        }
        $wm = null;
        if (Schema::hasColumn('king_galleries', 'watermark_mode')) {
            $g = DB::selectOne('SELECT watermark_mode, watermark_opacity FROM king_galleries WHERE id = ? LIMIT 1', [(int) $own->gallery_id]);
            $mode = strtolower((string) ($g->watermark_mode ?? 'none'));
            if ($mode !== '' && $mode !== 'none') {
                $wm = [
                    'enabled' => true,
                    'mode' => $mode,
                    'opacity' => (float) ($g->watermark_opacity ?? 0.22),
                ];
            }
        }
        $r = $media->previewFromStoragePath($path, false, $wm);
        if (($r['status'] ?? 500) !== 200 || empty($r['binary'])) {
            return ['status' => (int) ($r['status'] ?? 500), 'message' => (string) ($r['message'] ?? 'Erro')];
        }
        $big = $this->jpegPreviewResize((string) $r['binary'], 2400);
        $name = (string) ($own->original_name ?? ('foto-'.$photoId.'.jpg'));
        $name = preg_replace('/[\\\\\\/:*?"<>|]+/', '-', $name) ?: ('foto-'.$photoId.'.jpg');
        if (! preg_match('/\\.(jpe?g)$/i', $name)) {
            $name .= '.jpg';
        }

        return [
            'status' => 200,
            'binary' => $big ?? (string) $r['binary'],
            'contentType' => 'image/jpeg',
            'filename' => $name,
        ];
    }

    /**
     * @param  array<string,mixed>  $query
     * @return array{status:int, body:array<string,mixed>}
     */
    public function watermarkSuggestScales(string $userId, int $galleryId, array $query): array
    {
        if ($galleryId < 1) {
            return ['status' => 400, 'body' => ['message' => 'galleryId inválido']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        $pw = max(100, min(4000, (int) ($query['portrait_w'] ?? 900) ?: 900));
        $ph = max(100, min(6000, (int) ($query['portrait_h'] ?? 1200) ?: 1200));
        $lw = max(100, min(6000, (int) ($query['landscape_w'] ?? 1600) ?: 1600));
        $lh = max(100, min(4000, (int) ($query['landscape_h'] ?? 900) ?: 900));
        $mode = strtolower((string) ($query['mode'] ?? 'fill'));
        $m = in_array($mode, ['fill', 'fit', 'center'], true) ? $mode : 'fill';

        return ['status' => 200, 'body' => [
            'success' => true,
            'watermark_scale_portrait' => $this->suggestWatermarkScale($pw, $ph, $m),
            'watermark_scale_landscape' => $this->suggestWatermarkScale($lw, $lh, $m),
            'wm_auto_mode' => $m,
            'reference_dims' => [
                'portrait' => $pw.'x'.$ph,
                'landscape' => $lw.'x'.$lh,
            ],
        ]];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function updateFolder(string $userId, int $galleryId, int $folderId, array $body): array
    {
        if ($galleryId < 1 || $folderId < 1) {
            return ['status' => 400, 'body' => ['message' => 'galleryId/folderId inválidos']];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        if (! Schema::hasTable('king_photo_folders')) {
            return ['status' => 404, 'body' => ['message' => 'Pasta não encontrada']];
        }
        $f = DB::selectOne(
            'SELECT id FROM king_photo_folders WHERE id = ? AND gallery_id = ? LIMIT 1',
            [$folderId, $galleryId]
        );
        if (! $f) {
            return ['status' => 404, 'body' => ['message' => 'Pasta não encontrada']];
        }
        $name = array_key_exists('name', $body) ? substr(trim((string) ($body['name'] ?? '')), 0, 120) : null;
        $sortOrder = null;
        if (array_key_exists('sort_order', $body) || array_key_exists('sortOrder', $body)) {
            $sortOrder = (int) ($body['sort_order'] ?? $body['sortOrder'] ?? 0);
        }
        $wantsCover = array_key_exists('cover_photo_id', $body) || array_key_exists('coverPhotoId', $body);
        $coverPhotoId = null;
        if ($wantsCover) {
            $raw = $body['cover_photo_id'] ?? $body['coverPhotoId'] ?? null;
            $coverPhotoId = ($raw === null || $raw === '') ? null : (int) $raw;
            if ($coverPhotoId !== null && $coverPhotoId > 0) {
                $p = DB::selectOne(
                    'SELECT id FROM king_photos WHERE id = ? AND gallery_id = ? AND folder_id = ? LIMIT 1',
                    [$coverPhotoId, $galleryId, $folderId]
                );
                if (! $p) {
                    return ['status' => 400, 'body' => ['message' => 'A capa deve ser uma foto dessa pasta.']];
                }
            } else {
                $coverPhotoId = null;
            }
        }
        $sets = [];
        $params = [];
        if ($name !== null) {
            $sets[] = 'name = ?';
            $params[] = $name !== '' ? $name : 'Pasta';
        }
        if ($sortOrder !== null) {
            $sets[] = 'sort_order = ?';
            $params[] = $sortOrder;
        }
        if ($wantsCover && Schema::hasColumn('king_photo_folders', 'cover_photo_id')) {
            $sets[] = 'cover_photo_id = ?';
            $params[] = $coverPhotoId;
        }
        if ($sets === []) {
            return ['status' => 400, 'body' => ['message' => 'Nenhum campo para atualizar.']];
        }
        $params[] = $folderId;
        $params[] = $galleryId;
        DB::update(
            'UPDATE king_photo_folders SET '.implode(', ', $sets).', updated_at = NOW() WHERE id = ? AND gallery_id = ?',
            $params
        );
        $list = $this->listFolders($userId, $galleryId);

        return ['status' => 200, 'body' => [
            'success' => true,
            'folders' => $list['body']['folders'] ?? [],
        ]];
    }

    private function suggestWatermarkScale(int $outW, int $outH, string $mode): float
    {
        $div = $mode === 'fit' ? 5.0 : ($mode === 'center' ? 5.4 : 2.15);
        $s = 1 / $div;
        $ar = max($outW, $outH) / max(1, min($outW, $outH));
        if ($ar > 1.35) {
            $s *= 1 + min(0.12, ($ar - 1.35) * 0.08);
        }
        $s = max(0.15, min(5.0, $s));

        return round($s * 100) / 100;
    }

    private function ownedPhoto(string $userId, int $photoId): ?object
    {
        return DB::selectOne(
            'SELECT p.*
             FROM king_photos p
             JOIN king_galleries g ON g.id = p.gallery_id
             JOIN profile_items pi ON pi.id = g.profile_item_id
             WHERE p.id = ? AND pi.user_id = ?
             LIMIT 1',
            [$photoId, $userId]
        );
    }

    private function normalizeExportName(string $n): string
    {
        $s = trim($n);
        $s = preg_replace('#^.*[\\\\/]#', '', $s) ?? $s;
        $dot = strrpos($s, '.');
        if ($dot !== false && $dot > 0) {
            $s = substr($s, 0, $dot);
        }

        return trim($s);
    }

    /**
     * @return list<string>
     */
    private function linkCoverCandidatePaths(int $galleryId): array
    {
        $out = [];
        $seen = [];
        $push = static function (string $path) use (&$out, &$seen): void {
            $path = trim($path);
            if ($path === '' || isset($seen[$path])) {
                return;
            }
            $seen[$path] = true;
            $out[] = $path;
        };

        $hasFile = Schema::hasColumn('king_galleries', 'gallery_link_cover_file_path');
        $hasPhoto = Schema::hasColumn('king_galleries', 'gallery_link_cover_photo_id');
        if ($hasFile || $hasPhoto) {
            $cols = ['id'];
            if ($hasFile) {
                $cols[] = 'gallery_link_cover_file_path';
            }
            if ($hasPhoto) {
                $cols[] = 'gallery_link_cover_photo_id';
            }
            $g = DB::selectOne('SELECT '.implode(', ', $cols).' FROM king_galleries WHERE id = ? LIMIT 1', [$galleryId]);
            if ($g) {
                if ($hasFile) {
                    $push((string) ($g->gallery_link_cover_file_path ?? ''));
                }
                $pid = $hasPhoto ? (int) ($g->gallery_link_cover_photo_id ?? 0) : 0;
                if ($pid > 0) {
                    $p = DB::selectOne(
                        'SELECT file_path FROM king_photos WHERE id = ? AND gallery_id = ? LIMIT 1',
                        [$pid, $galleryId]
                    );
                    if ($p) {
                        $push((string) ($p->file_path ?? ''));
                    }
                }
            }
        }
        $order = Schema::hasColumn('king_photos', 'is_cover')
            ? 'is_cover DESC, "order" ASC, id ASC'
            : '"order" ASC, id ASC';
        $fallback = DB::selectOne(
            "SELECT file_path FROM king_photos WHERE gallery_id = ? ORDER BY {$order} LIMIT 1",
            [$galleryId]
        );
        if ($fallback) {
            $push((string) ($fallback->file_path ?? ''));
        }

        return $out;
    }

    private function jpegPreviewResize(string $binary, int $max): ?string
    {
        if (! function_exists('imagecreatefromstring')) {
            return $binary;
        }
        $img = @imagecreatefromstring($binary);
        if ($img === false) {
            return null;
        }
        $w = imagesx($img);
        $h = imagesy($img);
        if ($w < 1 || $h < 1) {
            imagedestroy($img);

            return null;
        }
        $scale = min($max / max($w, $h), 1.0);
        $outW = max(1, (int) round($w * $scale));
        $outH = max(1, (int) round($h * $scale));
        $dst = imagecreatetruecolor($outW, $outH);
        imagecopyresampled($dst, $img, 0, 0, 0, 0, $outW, $outH, $w, $h);
        ob_start();
        imagejpeg($dst, null, 86);
        $out = ob_get_clean();
        imagedestroy($img);
        imagedestroy($dst);

        return is_string($out) ? $out : null;
    }

    private function enabledClient(int $galleryId, int $clientId): bool
    {
        if (! Schema::hasTable('king_gallery_clients') || $clientId < 1) {
            return false;
        }
        $row = DB::selectOne(
            'SELECT id FROM king_gallery_clients WHERE gallery_id = ? AND id = ? AND enabled IS DISTINCT FROM false LIMIT 1',
            [$galleryId, $clientId]
        );

        return (bool) $row;
    }

    /**
     * @param  array<string,mixed>  $payload
     */
    private function signWorkerToken(array $payload, string $secret): string
    {
        $header = ['alg' => 'HS256', 'typ' => 'KS'];
        $h = $this->b64UrlJson($header);
        $p = $this->b64UrlJson($payload);
        $sig = rtrim(strtr(base64_encode(hash_hmac('sha256', $h.'.'.$p, $secret, true)), '+/', '-_'), '=');

        return $h.'.'.$p.'.'.$sig;
    }

    /**
     * @return array<string,mixed>|null
     */
    private function verifyWorkerToken(string $token, string $secret): ?array
    {
        $parts = explode('.', trim($token));
        if (count($parts) !== 3) {
            return null;
        }
        [$h, $p, $sig] = $parts;
        $expected = rtrim(strtr(base64_encode(hash_hmac('sha256', $h.'.'.$p, $secret, true)), '+/', '-_'), '=');
        if (! hash_equals($expected, $sig)) {
            return null;
        }
        $json = base64_decode(strtr($p, '-_', '+/'), true);
        if ($json === false) {
            return null;
        }
        $payload = json_decode($json, true);
        if (! is_array($payload)) {
            return null;
        }
        if (isset($payload['exp']) && (int) $payload['exp'] < time()) {
            return null;
        }

        return $payload;
    }

    /**
     * @param  array<string,mixed>  $data
     */
    private function b64UrlJson(array $data): string
    {
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}';

        return rtrim(strtr(base64_encode($json), '+/', '-_'), '=');
    }

    private function ownsProfileItem(string $userId, int $profileItemId): bool
    {
        $row = DB::selectOne(
            'SELECT id FROM profile_items WHERE id = ? AND user_id = ? LIMIT 1',
            [$profileItemId, $userId]
        );

        return (bool) $row;
    }

    private function ownedGallery(string $userId, int $galleryId): ?object
    {
        return DB::selectOne(
            'SELECT g.* FROM king_galleries g
             JOIN profile_items pi ON pi.id = g.profile_item_id
             WHERE g.id = ? AND pi.user_id = ? LIMIT 1',
            [$galleryId, $userId]
        );
    }

    /**
     * @param  array<string,mixed>  $g
     */
    private function ensurePrimaryClient(array $g, ?string $nomeOverride = null): void
    {
        if (! Schema::hasTable('king_gallery_clients')) {
            return;
        }
        $gid = (int) ($g['id'] ?? 0);
        $em = trim((string) ($g['cliente_email'] ?? ''));
        if ($gid < 1 || $em === '' || KsAccess::isTechnicalFaceEmail($em)) {
            return;
        }
        if (empty($g['senha_hash'])) {
            return;
        }
        $ex = DB::selectOne(
            'SELECT id FROM king_gallery_clients WHERE gallery_id = ? AND lower(email) = lower(?) LIMIT 1',
            [$gid, $em]
        );
        if ($ex) {
            return;
        }

        $nome = $nomeOverride
            ?: (trim((string) ($g['cliente_nome'] ?? '')) ?: trim((string) ($g['nome_projeto'] ?? '')) ?: 'Cliente');
        $tel = Schema::hasColumn('king_galleries', 'cliente_telefone')
            ? (trim((string) ($g['cliente_telefone'] ?? '')) ?: null)
            : null;
        $enc = Schema::hasColumn('king_gallery_clients', 'senha_enc')
            ? ($g['senha_enc'] ?? null)
            : null;

        try {
            if (Schema::hasColumn('king_gallery_clients', 'status')) {
                DB::insert(
                    'INSERT INTO king_gallery_clients
                     (gallery_id, nome, email, telefone, senha_hash, senha_enc, enabled, status, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, TRUE, \'preparacao\', NOW(), NOW())',
                    [$gid, substr($nome, 0, 255), strtolower($em), $tel, $g['senha_hash'], $enc]
                );
            } else {
                DB::insert(
                    'INSERT INTO king_gallery_clients
                     (gallery_id, nome, email, telefone, senha_hash, senha_enc, enabled, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, TRUE, NOW(), NOW())',
                    [$gid, substr($nome, 0, 255), strtolower($em), $tel, $g['senha_hash'], $enc]
                );
            }
        } catch (\Throwable) {
            // unique race ok
        }
    }

    /**
     * @param  list<object>  $clients
     */
    private function aggregateStatusFromClients(array $clients): ?string
    {
        if (count($clients) < 2) {
            return null;
        }
        $min = 999;
        foreach ($clients as $c) {
            if (isset($c->enabled) && filter_var($c->enabled, FILTER_VALIDATE_BOOLEAN) === false) {
                continue;
            }
            $st = KsAccess::normStatus($c->status ?? '');
            $rank = self::STATUS_RANK[$st] ?? 999;
            if ($rank < $min) {
                $min = $rank;
            }
        }

        return self::RANK_TO_STATUS[$min] ?? null;
    }

    private function uniqueSlug(string $nome): string
    {
        $base = Str::slug($nome, '-');
        if ($base === '') {
            $base = 'galeria-'.time();
        }
        $slug = $base;
        $i = 2;
        while (DB::selectOne('SELECT 1 FROM king_galleries WHERE slug = ? LIMIT 1', [$slug])) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }

    private function shareBaseUrl(): ?string
    {
        $raw = env('KING_SELECTION_SHARE_BASE_URL')
            ?: env('SHARE_BASE_URL')
            ?: env('FRONTEND_URL')
            ?: env('APP_URL')
            ?: null;
        if (! $raw) {
            return null;
        }

        return rtrim((string) $raw, '/');
    }

    /**
     * @param  list<mixed>  $vals
     */
    private function placeholders(array $vals): string
    {
        return implode(', ', array_fill(0, count($vals), '?'));
    }
}
