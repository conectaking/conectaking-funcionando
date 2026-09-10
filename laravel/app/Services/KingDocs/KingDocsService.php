<?php

namespace App\Services\KingDocs;

use App\Services\CartaoVirtual\R2StorageService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * King Docs — cofre, ficheiros R2, partilhas públicas, PDF mínimo.
 */
class KingDocsService
{
    public function __construct(private readonly R2StorageService $r2)
    {
    }

    /**
     * @return array{status:int, body:mixed}
     */
    public function getVault(string $userId): array
    {
        if (! Schema::hasTable('king_docs_vault')) {
            return $this->ok(['fieldData' => [], 'updatedAt' => null]);
        }
        $row = DB::selectOne(
            'SELECT field_data, updated_at FROM king_docs_vault WHERE user_id = ?',
            [$userId]
        );

        return $this->ok([
            'fieldData' => $this->decodeJson($row->field_data ?? null, []),
            'updatedAt' => $row->updated_at ?? null,
        ]);
    }

    /**
     * @param  array<string,mixed>  $fieldData
     * @return array{status:int, body:mixed}
     */
    public function putVault(string $userId, array $fieldData): array
    {
        if (! Schema::hasTable('king_docs_vault')) {
            return $this->fail('Cofre indisponível.', 503);
        }
        DB::statement(
            'INSERT INTO king_docs_vault (user_id, field_data, updated_at)
             VALUES (?, ?::jsonb, NOW())
             ON CONFLICT (user_id) DO UPDATE SET field_data = EXCLUDED.field_data, updated_at = NOW()',
            [$userId, json_encode($fieldData ?: [], JSON_UNESCAPED_UNICODE)]
        );

        $r = $this->getVault($userId);
        if (($r['status'] ?? 500) < 400 && is_array($r['body'] ?? null)) {
            $r['body']['message'] = 'Guardado.';
        }

        return $r;
    }

    /**
     * @return array{status:int, body:mixed}
     */
    public function listFiles(string $userId): array
    {
        if (! Schema::hasTable('king_docs_files')) {
            return $this->ok(['files' => []]);
        }
        $rows = DB::select(
            'SELECT id, doc_type, mime, original_name, created_at FROM king_docs_files WHERE user_id = ? ORDER BY id ASC',
            [$userId]
        );

        return $this->ok(['files' => array_map(fn ($r) => (array) $r, $rows)]);
    }

    /**
     * @return array{status:int, body:mixed}
     */
    public function uploadFile(
        string $userId,
        string $binary,
        string $originalName,
        string $mime,
        string $docType = 'documento'
    ): array {
        if (! Schema::hasTable('king_docs_files')) {
            return $this->fail('Armazenamento indisponível.', 503);
        }
        if ($binary === '') {
            return $this->fail('Ficheiro em falta.', 400);
        }
        $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION) ?: 'bin');
        $ext = preg_replace('/[^a-z0-9]/', '', $ext) ?: 'bin';
        if (strlen($ext) > 8) {
            $ext = 'bin';
        }
        $key = 'king-docs/'.$userId.'/'.$this->randomToken(8).'.'.$ext;
        $ct = $mime !== '' ? $mime : 'application/octet-stream';
        $ok = $this->r2->putKey($key, $binary, $ct, 'private, max-age=0');
        if (! $ok) {
            return $this->fail('R2: armazenamento indisponível.', 503);
        }
        $row = DB::selectOne(
            'INSERT INTO king_docs_files (user_id, doc_type, storage_key, mime, original_name)
             VALUES (?, ?, ?, ?, ?) RETURNING *',
            [
                $userId,
                mb_substr($docType !== '' ? $docType : 'documento', 0, 80),
                $key,
                $ct,
                mb_substr($originalName !== '' ? $originalName : 'ficheiro', 0, 500),
            ]
        );

        return $this->ok([
            'id' => (int) $row->id,
            'docType' => $row->doc_type,
            'mime' => $row->mime,
            'originalName' => $row->original_name,
            'createdAt' => $row->created_at,
        ], 'Upload OK.', 201);
    }

    /**
     * @return array{status:int, body:mixed}
     */
    public function deleteFile(string $userId, int $fileId): array
    {
        if ($fileId < 1) {
            return $this->fail('ID inválido.', 400);
        }
        if (! Schema::hasTable('king_docs_files')) {
            return $this->fail('Armazenamento indisponível.', 503);
        }
        $row = DB::selectOne(
            'DELETE FROM king_docs_files WHERE id = ? AND user_id = ? RETURNING storage_key',
            [$fileId, $userId]
        );
        if ($row && ! empty($row->storage_key)) {
            $this->r2->deleteObject((string) $row->storage_key);
        }

        return $this->ok(['ok' => true]);
    }

    /**
     * @return array{status:int, buffer?:string, mime?:string, filename?:string, etag?:string, storage_key?:string, signed_url?:string, body?:mixed}
     */
    public function downloadFile(string $userId, int $fileId, bool $preferSigned = false): array
    {
        if ($fileId < 1) {
            return $this->fail('ID inválido.', 400);
        }
        $file = $this->getFileByIdForUser($fileId, $userId);
        if (! $file) {
            return $this->fail('Ficheiro não encontrado.', 404);
        }
        $key = (string) $file->storage_key;
        $etag = '"'.sha1($key.'|'.(string) ($file->updated_at ?? $file->id ?? $fileId)).'"';

        if ($preferSigned) {
            try {
                $url = $this->r2->presignGet($key, 180);
                if (is_string($url) && $url !== '') {
                    return [
                        'status' => 200,
                        'signed_url' => $url,
                        'expires_in' => 180,
                        'mime' => $file->mime ?: 'application/octet-stream',
                        'filename' => $file->original_name ?: ('documento-'.$fileId),
                        'etag' => $etag,
                    ];
                }
            } catch (\Throwable $e) {
                // fallback proxy
            }
        }

        $buf = $this->r2->getObject($key);
        if ($buf === null) {
            return $this->fail('Não foi possível obter o ficheiro.', 503);
        }

        return [
            'status' => 200,
            'buffer' => $buf,
            'mime' => $file->mime ?: 'application/octet-stream',
            'filename' => $file->original_name ?: ('documento-'.$fileId),
            'etag' => $etag,
            'storage_key' => $key,
        ];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:mixed}
     */
    public function createShare(string $userId, array $body): array
    {
        if (! Schema::hasTable('king_docs_share_links')) {
            return $this->fail('Partilhas indisponíveis.', 503);
        }
        $vault = Schema::hasTable('king_docs_vault')
            ? DB::selectOne('SELECT field_data FROM king_docs_vault WHERE user_id = ?', [$userId])
            : null;
        $fieldData = $this->decodeJson($vault->field_data ?? null, []);

        $expiresInHours = isset($body['expiresInHours']) ? (float) $body['expiresInHours'] : 24;
        $hours = is_finite($expiresInHours) ? min(max($expiresInHours, 1), 720) : 24;
        $expiresAt = now()->addHours((int) $hours);

        $password = isset($body['password']) ? trim((string) $body['password']) : '';
        $passwordHash = $password !== '' ? password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]) : null;

        $maxViews = null;
        if (isset($body['maxViews']) && $body['maxViews'] !== '') {
            $n = (int) $body['maxViews'];
            if ($n > 0) {
                $maxViews = min(10000, max(1, $n));
            }
        }

        $snapshot = $this->buildSnapshot($userId, $fieldData, is_array($body['selection'] ?? null) ? $body['selection'] : []);
        $token = $this->randomToken(18);

        $row = DB::selectOne(
            'INSERT INTO king_docs_share_links
                (token, user_id, snapshot, password_hash, viewer_token, expires_at, max_views, view_count)
             VALUES (?, ?, ?::jsonb, ?, NULL, ?, ?, 0) RETURNING *',
            [
                $token,
                $userId,
                json_encode($snapshot, JSON_UNESCAPED_UNICODE),
                $passwordHash,
                $expiresAt,
                $maxViews,
            ]
        );

        return $this->ok([
            'id' => (int) $row->id,
            'token' => $row->token,
            'expiresAt' => $row->expires_at,
            'maxViews' => $row->max_views,
            'hasPassword' => (bool) $passwordHash,
            'shareUrl' => '/kingDocsShare.html?t='.rawurlencode((string) $row->token),
        ], 'Link criado.', 201);
    }

    /**
     * @return array{status:int, body:mixed}
     */
    public function listShares(string $userId): array
    {
        if (! Schema::hasTable('king_docs_share_links')) {
            return $this->ok(['shares' => []]);
        }
        $rows = DB::select(
            'SELECT id, token, expires_at, revoked_at, max_views, view_count, created_at,
                    (password_hash IS NOT NULL) AS has_password
             FROM king_docs_share_links WHERE user_id = ? ORDER BY id DESC',
            [$userId]
        );

        return $this->ok(['shares' => array_map(fn ($r) => (array) $r, $rows)]);
    }

    /**
     * @return array{status:int, body:mixed}
     */
    public function revokeShare(string $userId, int $shareId): array
    {
        if ($shareId < 1) {
            return $this->fail('ID inválido.', 400);
        }
        if (! Schema::hasTable('king_docs_share_links')) {
            return $this->fail('Partilhas indisponíveis.', 503);
        }
        $row = DB::selectOne(
            'UPDATE king_docs_share_links SET revoked_at = NOW() WHERE id = ? AND user_id = ? RETURNING id',
            [$shareId, $userId]
        );
        if (! $row) {
            return $this->fail('Partilha não encontrada.', 404);
        }

        return $this->ok(['ok' => true]);
    }

    /**
     * @return array{status:int, body:mixed}
     */
    public function deleteSharePermanent(string $userId, int $shareId): array
    {
        if ($shareId < 1) {
            return $this->fail('ID inválido.', 400);
        }
        if (! Schema::hasTable('king_docs_share_links')) {
            return $this->fail('Partilhas indisponíveis.', 503);
        }
        $row = DB::selectOne(
            'DELETE FROM king_docs_share_links WHERE id = ? AND user_id = ? RETURNING id',
            [$shareId, $userId]
        );
        if (! $row) {
            return $this->fail('Partilha não encontrada.', 404);
        }

        return $this->ok(['ok' => true]);
    }

    /**
     * Meta pública — shape Node (não usa responseFormatter).
     *
     * @return array{status:int, body:mixed}
     */
    public function publicMeta(string $token): array
    {
        $share = $this->findShareByToken($token);
        if (! $share) {
            return ['status' => 404, 'body' => ['ok' => false, 'message' => 'Link não encontrado.']];
        }
        try {
            $this->assertShareUsable($share);
        } catch (\RuntimeException $e) {
            return [
                'status' => 200,
                'body' => [
                    'ok' => false,
                    'revoked' => ! empty($share->revoked_at),
                    'expired' => ! empty($share->expires_at) && strtotime((string) $share->expires_at) < time(),
                    'maxViewsReached' => $share->max_views !== null
                        && (int) $share->view_count >= (int) $share->max_views,
                    'message' => $e->getMessage(),
                ],
            ];
        }
        $snap = $this->decodeJson($share->snapshot ?? null, []);

        return [
            'status' => 200,
            'body' => [
                'ok' => true,
                'needsPassword' => ! empty($share->password_hash),
                'expiresAt' => $share->expires_at,
                'displayName' => $snap['displayName'] ?? '',
                'profileImageUrl' => $snap['profileImageUrl'] ?? '',
                'profileImageFileId' => $snap['profileImageFileId'] ?? null,
            ],
        ];
    }

    /**
     * @return array{status:int, body:mixed}
     */
    public function publicUnlock(string $token, string $password): array
    {
        $share = $this->findShareByToken($token);
        if (! $share || empty($share->password_hash)) {
            return $this->fail('Link inválido.', 404);
        }
        try {
            $this->assertShareUsable($share);
        } catch (\RuntimeException $e) {
            return $this->fail($e->getMessage(), (int) ($e->getCode() ?: 410));
        }
        if (! password_verify($password, (string) $share->password_hash)) {
            return $this->fail('Senha incorreta.', 401);
        }
        $viewerToken = $this->issueViewerSessionToken((int) $share->id);
        // Não sobrescrever viewer_token partilhado — cada visitante recebe sessão HMAC própria
        $this->incrementViewCountAtomic((int) $share->id, $share->max_views !== null ? (int) $share->max_views : null);

        return $this->ok(['viewerToken' => $viewerToken]);
    }

    /**
     * @return array{status:int, body:mixed}
     */
    public function publicData(string $token, ?string $viewerHeader, ?string $repeatVisit): array
    {
        $share = $this->findShareByToken($token);
        if (! $share) {
            return $this->fail('Link não encontrado.', 404);
        }
        try {
            $this->assertShareUsable($share);
            $this->assertViewer($share, $viewerHeader);
        } catch (\RuntimeException $e) {
            $code = (int) ($e->getCode() ?: 500);
            $body = [
                'success' => false,
                'data' => null,
                'message' => $e->getMessage(),
                'error' => ['code' => 'ERROR', 'message' => $e->getMessage()],
            ];
            if ($e->getMessage() === 'Senha necessária ou sessão inválida.') {
                $body['code'] = 'NEEDS_PASSWORD';
                $body['error']['code'] = 'NEEDS_PASSWORD';
            }

            return ['status' => $code ?: 401, 'body' => $body];
        }
        if (empty($share->password_hash)) {
            $skip = in_array(strtolower((string) $repeatVisit), ['1', 'true', 'yes'], true);
            if (! $skip) {
                $this->incrementViewCountAtomic((int) $share->id, $share->max_views !== null ? (int) $share->max_views : null);
            }
        }

        return $this->ok(['snapshot' => $this->decodeJson($share->snapshot ?? null, [])]);
    }

    /**
     * Download público: HMAC viewer obrigatório; depois tenta signed GET curto,
     * com fallback para proxy (ETag / Cache-Control no controller).
     *
     * @return array{status:int, buffer?:string, mime?:string, filename?:string, etag?:string, signed_url?:string, body?:mixed}
     */
    public function publicDownloadFile(string $token, int $fileId, ?string $viewerHeader, bool $preferSigned = false): array
    {
        $share = $this->findShareByToken($token);
        if (! $share) {
            return $this->fail('Link não encontrado.', 404);
        }
        try {
            $this->assertShareUsable($share);
            $this->assertViewer($share, $viewerHeader);
        } catch (\RuntimeException $e) {
            $code = (int) ($e->getCode() ?: 401);
            $body = [
                'success' => false,
                'message' => $e->getMessage(),
            ];
            if ($e->getMessage() === 'Senha necessária ou sessão inválida.') {
                $body['code'] = 'NEEDS_PASSWORD';
            }

            return ['status' => $code ?: 401, 'body' => $body];
        }
        $snap = $this->decodeJson($share->snapshot ?? null, []);
        $allowed = array_map('intval', $snap['fileIds'] ?? []);
        if (! in_array($fileId, $allowed, true)) {
            return $this->fail('Ficheiro não incluído nesta partilha.', 403);
        }
        $file = $this->getFileByIdForUser($fileId, (string) $share->user_id);
        if (! $file) {
            return $this->fail('Ficheiro não encontrado.', 404);
        }
        $key = (string) $file->storage_key;
        $etag = '"'.sha1($key.'|'.(string) ($file->updated_at ?? $file->id ?? $fileId).'|share:'.$token).'"';

        // Após HMAC: signed GET curto (viewer autenticado). CORS/bucket privado → fallback proxy.
        if ($preferSigned) {
            try {
                $url = $this->r2->presignGet($key, 120);
                if (is_string($url) && $url !== '') {
                    return [
                        'status' => 200,
                        'signed_url' => $url,
                        'expires_in' => 120,
                        'mime' => $file->mime ?: 'application/octet-stream',
                        'filename' => $file->original_name ?: ('documento-'.$fileId),
                        'etag' => $etag,
                    ];
                }
            } catch (\Throwable $e) {
                // fallback proxy
            }
        }

        $buf = $this->r2->getObject($key);
        if ($buf === null) {
            return $this->fail('Não foi possível obter o ficheiro.', 503);
        }

        return [
            'status' => 200,
            'buffer' => $buf,
            'mime' => $file->mime ?: 'application/octet-stream',
            'filename' => $file->original_name ?: ('documento-'.$fileId),
            'etag' => $etag,
        ];
    }

    /**
     * Import simplificado: display_name / email de user_profiles.
     *
     * @return array{status:int, body:mixed}
     */
    public function importProfile(string $userId): array
    {
        $displayName = null;
        $email = null;
        $whatsapp = null;

        if (Schema::hasTable('user_profiles')) {
            try {
                $cols = ['display_name'];
                if (Schema::hasColumn('user_profiles', 'email')) {
                    $cols[] = 'email';
                }
                if (Schema::hasColumn('user_profiles', 'whatsapp')) {
                    $cols[] = 'whatsapp';
                }
                if (Schema::hasColumn('user_profiles', 'whatsapp_number')) {
                    $cols[] = 'whatsapp_number';
                }
                $details = DB::selectOne(
                    'SELECT '.implode(', ', $cols).' FROM user_profiles WHERE user_id = ? LIMIT 1',
                    [$userId]
                );
                if ($details) {
                    $displayName = $details->display_name ?? null;
                    $email = $details->email ?? null;
                    $whatsapp = $details->whatsapp ?? $details->whatsapp_number ?? null;
                }
            } catch (\Throwable) {
                // colunas opcionais
            }
        }

        if (Schema::hasTable('users')) {
            $u = DB::selectOne('SELECT name, email FROM users WHERE id = ? LIMIT 1', [$userId]);
            if ($u) {
                if ($displayName === null || $displayName === '') {
                    $displayName = $u->name ?? null;
                }
                if ($email === null || $email === '') {
                    $email = $u->email ?? null;
                }
            }
        }

        if ($displayName === null && $email === null) {
            return $this->fail('Perfil não encontrado.', 404);
        }

        $vaultR = $this->getVault($userId);
        $fd = $vaultR['body']['data']['fieldData'] ?? [];
        if (! is_array($fd)) {
            $fd = [];
        }
        if (! isset($fd['pessoal']) || ! is_array($fd['pessoal'])) {
            $fd['pessoal'] = [];
        }
        if (! isset($fd['contato']) || ! is_array($fd['contato'])) {
            $fd['contato'] = [];
        }
        if ($displayName) {
            $dn = (string) $displayName;
            $fd['pessoal']['Nome Completo'] = $dn;
            if (! isset($fd['_meta']) || ! is_array($fd['_meta'])) {
                $fd['_meta'] = [];
            }
            $fd['_meta']['displayName'] = $dn;
        }
        if ($whatsapp) {
            $fd['contato']['WhatsApp'] = (string) $whatsapp;
        }
        if ($email) {
            $fd['contato']['E-mail'] = (string) $email;
        }

        $r = $this->putVault($userId, $fd);
        if (($r['status'] ?? 500) < 400 && is_array($r['body'] ?? null)) {
            $r['body']['message'] = 'Dados do perfil importados para o cofre.';
        }

        return $r;
    }

    /**
     * PDF mínimo do cofre.
     *
     * @return array{status:int, pdf?:string, filename?:string, body?:mixed}
     */
    public function exportPdf(string $userId): array
    {
        $v = $this->getVault($userId);
        $fieldData = $v['body']['data']['fieldData'] ?? [];
        if (! is_array($fieldData)) {
            $fieldData = [];
        }
        $lines = ['King Docs — cofre (confidencial)', 'Exportado em '.date('d/m/Y H:i')];
        foreach ($fieldData as $gkey => $obj) {
            if ($gkey === '_meta' || ! is_array($obj)) {
                continue;
            }
            $lines[] = strtoupper((string) $gkey);
            foreach ($obj as $k => $val) {
                $lines[] = $k.': '.(is_scalar($val) ? (string) $val : json_encode($val));
            }
        }
        $pdf = $this->buildMinimalPdf($lines);

        return [
            'status' => 200,
            'pdf' => $pdf,
            'filename' => 'king-docs-cofre.pdf',
        ];
    }

    /**
     * @param  array<string,mixed>  $fieldData
     * @param  array<string,mixed>  $selection
     * @return array<string,mixed>
     */
    private function buildSnapshot(string $userId, array $fieldData, array $selection): array
    {
        $displayName = isset($selection['displayName']) ? trim((string) $selection['displayName']) : '';
        $profileImageUrl = isset($selection['profileImageUrl']) ? trim((string) $selection['profileImageUrl']) : '';
        $profileImageFileId = isset($selection['profileImageFileId'])
            ? (int) $selection['profileImageFileId'] : null;
        $sectionsOut = [];
        $fileIdsUsed = [];

        if ($profileImageFileId && $profileImageFileId > 0) {
            $pf = $this->getFileByIdForUser($profileImageFileId, $userId);
            if ($pf) {
                $fileIdsUsed[$pf->id] = true;
                $profileImageUrl = '';
            }
        }

        foreach ($selection['sections'] ?? [] as $sec) {
            if (! is_array($sec)) {
                continue;
            }
            $title = isset($sec['title']) ? trim((string) $sec['title']) : 'Secção';
            $rowsOut = [];
            foreach ($sec['rows'] ?? [] as $row) {
                if (! is_array($row)) {
                    continue;
                }
                $group = trim((string) ($row['group'] ?? ''));
                $key = trim((string) ($row['key'] ?? ''));
                $label = isset($row['label']) ? trim((string) $row['label']) : $key;
                $showText = ! empty($row['showText']);
                $showFile = ! empty($row['showFile']);
                $fileId = isset($row['fileId']) ? (int) $row['fileId'] : null;
                if (! $showText && ! $showFile) {
                    continue;
                }
                $entry = ['label' => $label, 'showText' => $showText, 'showFile' => $showFile];
                if ($showText && $group !== '' && $key !== '') {
                    $entry['text'] = $this->getFieldValue($fieldData, $group, $key);
                } elseif ($showText) {
                    $entry['text'] = '';
                }
                if ($showFile && $fileId) {
                    $f = $this->getFileByIdForUser($fileId, $userId);
                    if ($f) {
                        $fileIdsUsed[$f->id] = true;
                        $entry['file'] = [
                            'id' => (int) $f->id,
                            'name' => $f->original_name ?: $f->doc_type,
                            'mime' => $f->mime ?: 'application/octet-stream',
                            'docType' => $f->doc_type,
                        ];
                    }
                }
                if ($showText && ! $showFile) {
                    $rowsOut[] = $entry;
                } elseif (! $showText && $showFile) {
                    if (! empty($entry['file'])) {
                        $rowsOut[] = $entry;
                    }
                } elseif ($showText && $showFile) {
                    if (! empty($entry['file'])) {
                        $rowsOut[] = $entry;
                    } else {
                        $rowsOut[] = [
                            'label' => $label,
                            'showText' => true,
                            'showFile' => false,
                            'text' => $entry['text'] ?? '',
                        ];
                    }
                }
            }
            if ($rowsOut !== []) {
                $sectionsOut[] = ['title' => $title, 'rows' => $rowsOut];
            }
        }

        $extraDocs = [];
        foreach ($selection['extraDocs'] ?? [] as $ed) {
            if (! is_array($ed)) {
                continue;
            }
            $fileId = isset($ed['fileId']) ? (int) $ed['fileId'] : null;
            if (! $fileId) {
                continue;
            }
            $f = $this->getFileByIdForUser($fileId, $userId);
            if (! $f) {
                continue;
            }
            $fileIdsUsed[$f->id] = true;
            $extraDocs[] = [
                'id' => (int) $f->id,
                'label' => isset($ed['label']) ? trim((string) $ed['label']) : $f->doc_type,
                'mime' => $f->mime ?: 'application/octet-stream',
            ];
        }

        $out = [
            'displayName' => $displayName,
            'profileImageUrl' => $profileImageUrl,
            'sections' => $sectionsOut,
            'extraDocs' => $extraDocs,
            'fileIds' => array_map('intval', array_keys($fileIdsUsed)),
        ];
        if ($profileImageFileId && isset($fileIdsUsed[$profileImageFileId])) {
            $out['profileImageFileId'] = $profileImageFileId;
        }

        return $out;
    }

    /**
     * @param  array<string,mixed>  $fieldData
     */
    private function getFieldValue(array $fieldData, string $group, string $key): string
    {
        $g = $fieldData[$group] ?? null;
        if (! is_array($g)) {
            return '';
        }

        return isset($g[$key]) ? (string) $g[$key] : '';
    }

    private function assertShareUsable(object $share): void
    {
        if (! empty($share->revoked_at)) {
            throw new \RuntimeException('Este link foi revogado.', 410);
        }
        if (! empty($share->expires_at) && strtotime((string) $share->expires_at) < time()) {
            throw new \RuntimeException('Este link expirou.', 410);
        }
        if ($share->max_views !== null && (int) $share->view_count >= (int) $share->max_views) {
            throw new \RuntimeException('Este link atingiu o número máximo de visualizações.', 410);
        }
    }

    private function assertViewer(object $share, ?string $viewerHeader): void
    {
        if (empty($share->password_hash)) {
            return;
        }
        $v = $viewerHeader !== null ? trim($viewerHeader) : '';
        if ($v === '') {
            throw new \RuntimeException('Senha necessária ou sessão inválida.', 401);
        }
        // Sessão HMAC por visitante (não partilha um único viewer_token)
        if ($this->verifyViewerSessionToken($v, (int) $share->id)) {
            return;
        }
        // Compat: token legado gravado na coluna
        if ($v === (string) $share->viewer_token) {
            return;
        }
        throw new \RuntimeException('Senha necessária ou sessão inválida.', 401);
    }

    private function issueViewerSessionToken(int $shareId): string
    {
        $payload = rtrim(strtr(base64_encode(json_encode([
            'sid' => $shareId,
            'exp' => time() + 86400,
            'n' => bin2hex(random_bytes(8)),
        ])), '+/', '-_'), '=');
        $sig = hash_hmac('sha256', $payload, $this->viewerSessionSecret());

        return $payload.'.'.$sig;
    }

    private function verifyViewerSessionToken(string $token, int $shareId): bool
    {
        $parts = explode('.', $token, 2);
        if (count($parts) !== 2) {
            return false;
        }
        [$payload, $sig] = $parts;
        $expected = hash_hmac('sha256', $payload, $this->viewerSessionSecret());
        if (! hash_equals($expected, $sig)) {
            return false;
        }
        $pad = strlen($payload) % 4;
        $raw = base64_decode(strtr($payload, '-_', '+/').($pad ? str_repeat('=', 4 - $pad) : ''), true);
        if ($raw === false) {
            return false;
        }
        $data = json_decode($raw, true);
        if (! is_array($data)) {
            return false;
        }
        if ((int) ($data['sid'] ?? 0) !== $shareId) {
            return false;
        }
        if ((int) ($data['exp'] ?? 0) < time()) {
            return false;
        }

        return true;
    }

    private function viewerSessionSecret(): string
    {
        return (string) (config('app.key') ?: env('APP_KEY') ?: 'conectaking-king-docs');
    }

    private function incrementViewCountAtomic(int $shareId, ?int $maxViews): void
    {
        if ($maxViews === null) {
            DB::update('UPDATE king_docs_share_links SET view_count = view_count + 1 WHERE id = ?', [$shareId]);

            return;
        }
        $updated = DB::update(
            'UPDATE king_docs_share_links SET view_count = view_count + 1
             WHERE id = ? AND view_count < ?',
            [$shareId, $maxViews]
        );
        if ($updated < 1) {
            throw new \RuntimeException('Este link atingiu o número máximo de visualizações.', 410);
        }
    }

    private function findShareByToken(string $token): ?object
    {
        if (! Schema::hasTable('king_docs_share_links') || trim($token) === '') {
            return null;
        }

        return DB::selectOne('SELECT * FROM king_docs_share_links WHERE token = ?', [trim($token)]);
    }

    private function getFileByIdForUser(int $fileId, string $userId): ?object
    {
        if (! Schema::hasTable('king_docs_files') || $fileId < 1) {
            return null;
        }

        return DB::selectOne(
            'SELECT * FROM king_docs_files WHERE id = ? AND user_id = ?',
            [$fileId, $userId]
        );
    }

    /**
     * @param  list<string>  $lines
     */
    private function buildMinimalPdf(array $lines): string
    {
        $y = 720;
        $content = "BT\n/F1 14 Tf\n50 {$y} Td\n";
        $first = true;
        foreach ($lines as $i => $line) {
            $esc = $this->pdfEscape(mb_substr($line, 0, 90));
            if ($first) {
                $content .= "({$esc}) Tj\n";
                $first = false;
            } else {
                $dy = $i === 1 ? -22 : -14;
                $size = $i === 0 ? 14 : 10;
                $content .= "0 {$dy} Td\n/F1 {$size} Tf\n({$esc}) Tj\n";
            }
        }
        $content .= "ET\n";
        $len = strlen($content);

        $objects = [];
        $objects[] = "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n";
        $objects[] = "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n";
        $objects[] = "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            ."/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n";
        $objects[] = "4 0 obj<< /Length {$len} >>stream\n{$content}endstream\nendobj\n";
        $objects[] = "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n";

        $pdf = "%PDF-1.4\n";
        $offsets = [0];
        foreach ($objects as $obj) {
            $offsets[] = strlen($pdf);
            $pdf .= $obj;
        }
        $xrefPos = strlen($pdf);
        $count = count($objects) + 1;
        $pdf .= "xref\n0 {$count}\n";
        $pdf .= "0000000000 65535 f \n";
        for ($i = 1; $i < $count; $i++) {
            $pdf .= sprintf("%010d 00000 n \n", $offsets[$i]);
        }
        $pdf .= "trailer<< /Size {$count} /Root 1 0 R >>\n";
        $pdf .= "startxref\n{$xrefPos}\n%%EOF\n";

        return $pdf;
    }

    private function pdfEscape(string $s): string
    {
        $s = preg_replace('/[^\x20-\x7E]/', '?', $s) ?? $s;

        return str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $s);
    }

    private function randomToken(int $bytes = 24): string
    {
        return bin2hex(random_bytes($bytes));
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    private function ok(mixed $data, ?string $message = null, int $status = 200): array
    {
        $body = [
            'success' => true,
            'data' => $data,
            'error' => null,
        ];
        if ($message !== null) {
            $body['message'] = $message;
        }

        return ['status' => $status, 'body' => $body];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    private function fail(string $message, int $status = 400): array
    {
        return [
            'status' => $status,
            'body' => [
                'success' => false,
                'data' => null,
                'message' => $message,
                'error' => [
                    'code' => 'ERROR',
                    'message' => $message,
                ],
            ],
        ];
    }

    private function decodeJson(mixed $v, mixed $default = []): mixed
    {
        if ($v === null) {
            return $default;
        }
        if (is_array($v)) {
            return $v;
        }
        if (is_object($v)) {
            return json_decode(json_encode($v), true) ?? $default;
        }
        if (is_string($v)) {
            $d = json_decode($v, true);

            return $d !== null ? $d : $default;
        }

        return $default;
    }
}
