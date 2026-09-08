<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * King Selection — leitura pública (meta da galeria).
 */
class KingSelectionPublicService
{
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
        $allowSelfSignup = array_key_exists('allow_self_signup', (array) $g)
            ? (bool) $g->allow_self_signup
            : in_array($accessMode, ['signup', 'public'], true);

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
                    'deferred_signup_flow' => $allowSelfSignup && in_array($accessMode, ['signup', 'public'], true),
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
                'spaUrl' => '/kingSelection/'.$g['slug'].'?engine=node',
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
}
