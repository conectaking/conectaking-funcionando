<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * King Selection — leitura pública (meta da galeria).
 */
class KingSelectionPublicService
{
    private const PHOTO_PAGE_SIZE = 500;

    /**
     * Lista fotos em páginas (evita um único SELECT gigante).
     * Sem $limit: carrega tudo em chunks de PHOTO_PAGE_SIZE.
     *
     * @return array{photos:list<array{id:int,original_name:string,order:int,folder_id:?int}>, total:int, hasMore:bool, limit:?int, offset:int}
     */
    public function listPhotosForGallery(int $galleryId, ?int $limit = null, int $offset = 0): array
    {
        $offset = max(0, $offset);
        $total = 0;
        try {
            $total = (int) (DB::selectOne(
                'SELECT COUNT(*)::int AS c FROM king_photos WHERE gallery_id = ?',
                [$galleryId]
            )->c ?? 0);
        } catch (\Throwable) {
            return ['photos' => [], 'total' => 0, 'hasMore' => false, 'limit' => $limit, 'offset' => $offset];
        }

        if ($limit !== null && $limit > 0) {
            $limit = min(max(1, $limit), 1000);
            $photos = $this->fetchPhotoPage($galleryId, $limit, $offset);

            return [
                'photos' => $photos,
                'total' => $total,
                'hasMore' => ($offset + count($photos)) < $total,
                'limit' => $limit,
                'offset' => $offset,
            ];
        }

        $photos = [];
        for ($off = 0; $off < $total; $off += self::PHOTO_PAGE_SIZE) {
            foreach ($this->fetchPhotoPage($galleryId, self::PHOTO_PAGE_SIZE, $off) as $p) {
                $photos[] = $p;
            }
        }

        return [
            'photos' => $photos,
            'total' => $total,
            'hasMore' => false,
            'limit' => null,
            'offset' => 0,
        ];
    }

    /**
     * Fotos + pastas prontas para o cliente (público ou autenticado).
     * Com $limit: devolve só uma página de fotos (pastas usam contagens SQL).
     *
     * @return array{photos:list<array<string,mixed>>, folders:list<array<string,mixed>>, folder_layout:string, photos_total:int, photos_has_more:bool, photos_offset:int, photos_limit:?int}
     */
    public function loadClientMedia(int $galleryId, string $folderLayout = 'folders', ?int $limit = null, int $offset = 0): array
    {
        $folderLayout = strtolower(trim($folderLayout)) === 'flat' ? 'flat' : 'folders';
        $this->healOrphanFolderIds($galleryId);
        $offset = max(0, $offset);
        $listed = $this->listPhotosForGallery($galleryId, $limit, $offset);
        $photos = $listed['photos'];
        $folders = [];
        if ($folderLayout === 'flat') {
            $photos = array_map(static function (array $p) {
                $p['folder_id'] = null;

                return $p;
            }, $photos);
        } else {
            $folders = array_values(array_filter(
                $this->listFoldersForGallery($galleryId),
                static fn (array $f) => ((int) ($f['photo_count'] ?? 0)) > 0
            ));
            if ($limit === null) {
                $folders = $this->prepareClientFolders($folders, $photos);
            }
            $photos = $this->sanitizePhotoFolderIds($photos, $folders);
        }

        return [
            'photos' => $photos,
            'folders' => $folders,
            'folder_layout' => $folderLayout,
            'photos_total' => $listed['total'],
            'photos_has_more' => $listed['hasMore'],
            'photos_offset' => $offset,
            'photos_limit' => $listed['limit'],
        ];
    }

    /**
     * @return list<array{id:int,original_name:string,order:int,folder_id:?int}>
     */
    private function fetchPhotoPage(int $galleryId, int $limit, int $offset): array
    {
        $photos = [];
        try {
            $rows = DB::select(
                'SELECT id, original_name, "order", folder_id
                 FROM king_photos WHERE gallery_id = ?
                 ORDER BY "order" ASC, id ASC
                 LIMIT ? OFFSET ?',
                [$galleryId, $limit, $offset]
            );
            foreach ($rows as $p) {
                $photos[] = [
                    'id' => (int) $p->id,
                    'original_name' => (string) ($p->original_name ?? ''),
                    'order' => (int) ($p->order ?? 0),
                    'folder_id' => isset($p->folder_id) && $p->folder_id !== null ? (int) $p->folder_id : null,
                ];
            }
        } catch (\Throwable) {
            try {
                $rows = DB::select(
                    'SELECT id, original_name, "order"
                     FROM king_photos WHERE gallery_id = ?
                     ORDER BY "order" ASC, id ASC
                     LIMIT ? OFFSET ?',
                    [$galleryId, $limit, $offset]
                );
                foreach ($rows as $p) {
                    $photos[] = [
                        'id' => (int) $p->id,
                        'original_name' => (string) ($p->original_name ?? ''),
                        'order' => (int) ($p->order ?? 0),
                        'folder_id' => null,
                    ];
                }
            } catch (\Throwable $e2) {
                Log::warning('ks.fetchPhotoPage', ['error' => $e2->getMessage()]);
            }
        }

        return $photos;
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function publicGallery(string $slug): array
    {
        $slug = trim($slug);
        if ($slug === '') {
            return ['status' => 400, 'body' => ['message' => 'slug é obrigatório.']];
        }

        try {
            $g = DB::selectOne(
                'SELECT id, nome_projeto, slug, status, total_fotos_contratadas,
                        min_selections, allow_self_signup, client_enabled, access_mode,
                        client_folder_layout, client_entry_splash_enabled,
                        gallery_link_cover_photo_id, gallery_link_cover_file_path,
                        tutorial_video_url, allow_client_edit_request, is_published
                 FROM king_galleries WHERE LOWER(TRIM(slug)) = LOWER(TRIM(?)) LIMIT 1',
                [$slug]
            );
        } catch (\Throwable $e) {
            try {
                $g = DB::selectOne(
                    'SELECT id, nome_projeto, slug, status, total_fotos_contratadas
                     FROM king_galleries WHERE LOWER(TRIM(slug)) = LOWER(TRIM(?)) LIMIT 1',
                    [$slug]
                );
            } catch (\Throwable $e2) {
                Log::error('ks.publicGallery', ['error' => $e2->getMessage()]);

                return ['status' => 500, 'body' => ['message' => 'Erro ao carregar galeria.']];
            }
        }

        if (!$g) {
            return ['status' => 404, 'body' => ['message' => 'Galeria não encontrada.']];
        }

        $accessMode = (string) ($g->access_mode ?? 'private');
        if ($accessMode === 'password') {
            $accessMode = 'signup';
        }
        $accessMode = \App\Support\KingSelection\KsAccess::normAccessMode($accessMode);
        $allowSelfSignup = array_key_exists('allow_self_signup', (array) $g)
            ? (bool) $g->allow_self_signup
            : in_array($accessMode, ['signup', 'public', 'paid_event_photos'], true);
        // Modos com cadastro diferido: sempre permitir (flag no DB pode ter falhado a gravar).
        if (in_array($accessMode, ['signup', 'paid_event_photos'], true)) {
            $allowSelfSignup = true;
        }

        $coverPhotoId = null;
        $totalPhotos = 0;
        try {
            $p = DB::selectOne(
                'SELECT id FROM king_photos WHERE gallery_id = ? ORDER BY "order" ASC, id ASC LIMIT 1',
                [$g->id]
            );
            $coverPhotoId = $p->id ?? null;
            $c = DB::selectOne('SELECT COUNT(*)::int AS c FROM king_photos WHERE gallery_id = ?', [$g->id]);
            $totalPhotos = (int) ($c->c ?? 0);
        } catch (\Throwable $e) {
            // fotos opcionais
        }

        $hasLinkCover = !empty($g->gallery_link_cover_photo_id ?? null) || !empty($g->gallery_link_cover_file_path ?? null);
        $splashBoot = $hasLinkCover || !empty($g->client_entry_splash_enabled ?? false);
        $folderLayout = strtolower(trim((string) ($g->client_folder_layout ?? 'folders'))) === 'flat' ? 'flat' : 'folders';

        return [
            'status' => 200,
            'body' => [
                'success' => true,
                'gallery' => [
                    'id' => (int) $g->id,
                    'nome_projeto' => (string) ($g->nome_projeto ?? ''),
                    'slug' => (string) $g->slug,
                    'status' => (string) ($g->status ?? 'preparacao'),
                    'is_published' => filter_var($g->is_published ?? false, FILTER_VALIDATE_BOOLEAN),
                    'total_fotos_contratadas' => (int) ($g->total_fotos_contratadas ?? 0),
                    'min_selections' => (int) ($g->min_selections ?? 0),
                    'allow_self_signup' => $allowSelfSignup,
                    'client_enabled' => array_key_exists('client_enabled', (array) $g) ? (bool) $g->client_enabled : true,
                    'access_mode' => $accessMode,
                    'total_photos' => $totalPhotos,
                    'cover_photo_id' => $coverPhotoId,
                    'deferred_signup_flow' => $allowSelfSignup && in_array($accessMode, ['signup', 'public', 'paid_event_photos'], true),
                    'register_before_gallery' => $accessMode === 'public',
                    'client_folder_layout' => $folderLayout,
                    'client_entry_splash_enabled' => $splashBoot,
                    'entry_splash_url' => $splashBoot
                        ? '/api/king-selection/public/cover?slug='.rawurlencode((string) $g->slug)
                        : null,
                    'tutorial_video_url' => !empty($g->tutorial_video_url ?? null) ? trim((string) $g->tutorial_video_url) : null,
                    'allow_client_edit_request' => $accessMode === 'public' && !empty($g->allow_client_edit_request ?? false),
                ],
            ],
        ];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function shareMeta(string $slug, ?string $host = null): array
    {
        $result = $this->publicGallery($slug);
        if ($result['status'] !== 200) {
            return [
                'status' => $result['status'],
                'body' => ['success' => false, 'message' => $result['body']['message'] ?? 'Erro'],
            ];
        }
        $g = $result['body']['gallery'];
        $name = $g['nome_projeto'] ?: 'King Selection';
        $host = trim((string) $host);
        if ($host === '') {
            $host = request()->getHost();
        }
        $host = preg_replace('#^https?://#i', '', $host) ?: 'www.conectaking.com.br';
        $base = 'https://'.rtrim($host, '/');
        $canonical = $base.'/kingSelection/'.rawurlencode($g['slug']);
        $ogImage = $base.'/api/king-selection/public/og-image?slug='.rawurlencode($g['slug']);
        $photos = (int) ($g['total_photos'] ?? 0);
        $desc = $photos > 0
            ? "Galeria {$name} — {$photos} foto(s). King Selection · ConectaKing."
            : "Galeria {$name}. King Selection · ConectaKing.";

        return [
            'status' => 200,
            'body' => [
                'success' => true,
                'ogTitle' => $name.' — King Selection',
                'ogDescription' => $desc,
                'ogImage' => $ogImage,
                'slug' => $g['slug'],
                'canonicalUrl' => $canonical,
                'status' => $g['status'],
                'total_photos' => $photos,
            ],
        ];
    }

    /**
     * Dados para Blade landing (read-only).
     *
     * @return array{status:int, data?:array<string,mixed>, message?:string}
     */
    public function landing(string $slug): array
    {
        $result = $this->publicGallery($slug);
        if ($result['status'] !== 200) {
            return ['status' => $result['status'], 'message' => $result['body']['message'] ?? 'Não encontrado'];
        }
        $g = $result['body']['gallery'];
        $meta = $this->shareMeta($slug);

        return [
            'status' => 200,
            'data' => [
                'gallery' => $g,
                'og' => $meta['body'] ?? [],
                'coverUrl' => '/api/king-selection/public/cover?slug='.rawurlencode($g['slug']),
                'spaUrl' => '/kingSelection/'.$g['slug'],
                'statusLabel' => $this->statusLabel((string) ($g['status'] ?? '')),
            ],
        ];
    }

    private function statusLabel(string $status): string
    {
        return match ($status) {
            'preparacao' => 'Em preparação',
            'andamento' => 'Em andamento',
            'revisao' => 'Em revisão',
            'finalizado' => 'Finalizado',
            default => $status !== '' ? $status : '—',
        };
    }

    /**
     * Conteúdo completo da galeria em modo público (fotos + pastas).
     * Com $limit: página de fotos + metadados de total/hasMore.
     *
     * @return array{status:int, body:array<string,mixed>}
     */
    public function galleryContent(string $slug, ?int $limit = null, int $offset = 0): array
    {
        $slug = trim($slug);
        if ($slug === '') {
            return ['status' => 400, 'body' => ['message' => 'slug é obrigatório.']];
        }

        try {
            $g = DB::selectOne(
                'SELECT id, nome_projeto, slug, status, total_fotos_contratadas,
                        access_mode, min_selections, allow_download, face_recognition_enabled,
                        tutorial_video_url, client_folder_layout
                 FROM king_galleries WHERE LOWER(TRIM(slug)) = LOWER(TRIM(?)) LIMIT 1',
                [$slug]
            );
        } catch (\Throwable $e) {
            try {
                $g = DB::selectOne(
                    'SELECT id, nome_projeto, slug, status, total_fotos_contratadas
                     FROM king_galleries WHERE LOWER(TRIM(slug)) = LOWER(TRIM(?)) LIMIT 1',
                    [$slug]
                );
            } catch (\Throwable $e2) {
                Log::error('ks.galleryContent', ['error' => $e2->getMessage()]);

                return ['status' => 500, 'body' => ['message' => 'Erro ao carregar galeria.']];
            }
        }

        if (!$g) {
            return ['status' => 404, 'body' => ['message' => 'Galeria não encontrada.']];
        }

        $accessMode = (string) ($g->access_mode ?? 'private');
        if ($accessMode === 'password') {
            $accessMode = 'signup';
        }
        if ($accessMode !== 'public') {
            return ['status' => 403, 'body' => ['message' => 'Esta galeria não é pública.']];
        }

        $folderLayout = strtolower(trim((string) ($g->client_folder_layout ?? 'folders'))) === 'flat' ? 'flat' : 'folders';
        $offset = max(0, $offset);

        if ($limit !== null && $limit > 0) {
            $this->healOrphanFolderIds((int) $g->id);
            $listed = $this->listPhotosForGallery((int) $g->id, $limit, $offset);
            $photos = $listed['photos'];
            $folders = [];
            if ($folderLayout === 'flat') {
                $photos = array_map(static function (array $p) {
                    $p['folder_id'] = null;

                    return $p;
                }, $photos);
            } else {
                $folders = array_values(array_filter(
                    $this->listFoldersForGallery((int) $g->id),
                    static fn (array $f) => ((int) ($f['photo_count'] ?? 0)) > 0
                ));
                $photos = $this->sanitizePhotoFolderIds($photos, $folders);
            }
            $totalPhotos = $listed['total'];
            $hasMore = $listed['hasMore'];
            $effectiveLimit = $listed['limit'];
        } else {
            $media = $this->loadClientMedia((int) $g->id, $folderLayout);
            $photos = $media['photos'];
            $folders = $media['folders'];
            $folderLayout = $media['folder_layout'];
            $totalPhotos = count($photos);
            $hasMore = false;
            $effectiveLimit = null;
        }

        $gallery = [
            'id' => (int) $g->id,
            'nome_projeto' => (string) ($g->nome_projeto ?? ''),
            'slug' => (string) $g->slug,
            'status' => (string) ($g->status ?? 'preparacao'),
            'total_fotos_contratadas' => (int) ($g->total_fotos_contratadas ?? 0),
            'access_mode' => $accessMode,
            'min_selections' => (int) ($g->min_selections ?? 0),
            'allow_download' => true,
            'face_recognition_enabled' => !empty($g->face_recognition_enabled ?? false),
            'tutorial_video_url' => !empty($g->tutorial_video_url ?? null) ? trim((string) $g->tutorial_video_url) : null,
            'client_folder_layout' => $folderLayout,
            'photos' => $photos,
            'folders' => $folders,
            'locked' => true,
            'photos_total' => $totalPhotos,
            'photos_has_more' => $hasMore,
            'photos_offset' => $offset,
            'photos_limit' => $effectiveLimit,
        ];

        return [
            'status' => 200,
            'body' => [
                'success' => true,
                'gallery' => $gallery,
                'selectedPhotoIds' => [],
                'photosTotal' => $totalPhotos,
                'photosHasMore' => $hasMore,
            ],
        ];
    }

    private function healOrphanFolderIds(int $galleryId): void
    {
        try {
            DB::affectingStatement(
                'UPDATE king_photos p SET folder_id = NULL
                 WHERE p.gallery_id = ?
                   AND p.folder_id IS NOT NULL
                   AND NOT EXISTS (
                     SELECT 1 FROM king_photo_folders f
                     WHERE f.id = p.folder_id AND f.gallery_id = p.gallery_id
                   )',
                [$galleryId]
            );
        } catch (\Throwable) {
            // colunas/tabelas opcionais
        }
    }

    /**
     * @return list<array<string,mixed>>
     */
    private function listFoldersForGallery(int $galleryId): array
    {
        try {
            $rows = DB::select(
                'SELECT f.id, f.gallery_id, f.name, f.sort_order, f.cover_photo_id, f.created_at,
                        COALESCE(pc.photo_count, 0)::int AS photo_count
                 FROM king_photo_folders f
                 LEFT JOIN (
                   SELECT folder_id, COUNT(*)::int AS photo_count
                   FROM king_photos WHERE gallery_id = ? AND folder_id IS NOT NULL
                   GROUP BY folder_id
                 ) pc ON pc.folder_id = f.id
                 WHERE f.gallery_id = ?
                 ORDER BY f.sort_order ASC, f.id ASC',
                [$galleryId, $galleryId]
            );
        } catch (\Throwable) {
            return [];
        }

        $out = [];
        foreach ($rows as $row) {
            if ($this->isVirtualFolder($row)) {
                continue;
            }
            $out[] = [
                'id' => (int) $row->id,
                'gallery_id' => (int) $row->gallery_id,
                'name' => (string) ($row->name ?? ''),
                'sort_order' => (int) ($row->sort_order ?? 0),
                'cover_photo_id' => isset($row->cover_photo_id) && $row->cover_photo_id !== null
                    ? (int) $row->cover_photo_id : null,
                'photo_count' => (int) ($row->photo_count ?? 0),
                'created_at' => $row->created_at ?? null,
            ];
        }

        return $out;
    }

    private function isVirtualFolder(object $folderRow): bool
    {
        $id = (int) ($folderRow->id ?? 0);
        if ($id <= 0) {
            return true;
        }
        $name = strtolower(trim((string) ($folderRow->name ?? '')));

        return in_array($name, ['sem pasta', 'sem-pasta', 'unassigned', 'todas', 'todas as fotos', 'fotos soltas'], true);
    }

    /**
     * @param  list<array<string,mixed>>  $folders
     * @param  list<array<string,mixed>>  $photos
     * @return list<array<string,mixed>>
     */
    private function prepareClientFolders(array $folders, array $photos): array
    {
        $validIds = [];
        foreach ($folders as $f) {
            $id = (int) ($f['id'] ?? 0);
            if ($id > 0) {
                $validIds[$id] = true;
            }
        }
        $countByFolder = [];
        foreach ($photos as $p) {
            $fid = (int) ($p['folder_id'] ?? 0);
            if ($fid <= 0 || !isset($validIds[$fid])) {
                continue;
            }
            $countByFolder[$fid] = ($countByFolder[$fid] ?? 0) + 1;
        }
        $out = [];
        foreach ($folders as $f) {
            $id = (int) ($f['id'] ?? 0);
            $count = $countByFolder[$id] ?? 0;
            if ($id <= 0 || $count <= 0) {
                continue;
            }
            $f['photo_count'] = $count;
            $out[] = $f;
        }

        return $out;
    }

    /**
     * @param  list<array<string,mixed>>  $photos
     * @param  list<array<string,mixed>>  $folders
     * @return list<array<string,mixed>>
     */
    private function sanitizePhotoFolderIds(array $photos, array $folders): array
    {
        $valid = [];
        foreach ($folders as $f) {
            $id = (int) ($f['id'] ?? 0);
            if ($id > 0) {
                $valid[$id] = true;
            }
        }

        return array_map(static function (array $p) use ($valid) {
            $fid = (int) ($p['folder_id'] ?? 0);
            if ($fid <= 0 || !isset($valid[$fid])) {
                $p['folder_id'] = null;
            }

            return $p;
        }, $photos);
    }
}
