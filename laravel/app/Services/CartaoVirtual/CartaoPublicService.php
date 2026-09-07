<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Leitura do cartão público a partir do schema existente (Node/Postgres).
 * Sem migrations — só SELECT no banco Conecta King.
 */
class CartaoPublicService
{
    private const RESERVED = [
        'privacidade', 'termos', 'recuperar-senha', 'resetar-senha',
        'esqueci-senha', 'forgot', 'l', 'api', 'dashboard', 'login', 'admin',
    ];

    /**
     * @return array{type:string, message?:string, statusCode?:int, url?:string, data?:array}
     */
    public function getPageData(string $identifier, string $origin, string $queryString = ''): array
    {
        $raw = trim($identifier);
        if ($raw === '' || in_array(strtolower($raw), self::RESERVED, true)) {
            return ['type' => 'notFound', 'message' => '404 - Página não encontrada'];
        }

        $user = $this->findUser($raw);
        if (!$user) {
            return ['type' => 'notFound', 'message' => '404 - Perfil não encontrado'];
        }

        $slug = (string) ($user->profile_slug ?? '');
        if ($slug !== '' && strtolower($raw) === strtolower($slug) && $raw !== $slug) {
            return [
                'type' => 'redirect',
                'statusCode' => 301,
                'url' => '/l/card/'.$slug.$queryString,
            ];
        }

        if (($user->account_type ?? '') === 'free') {
            return ['type' => 'inactive'];
        }

        $profile = $this->loadProfile((string) $user->id);
        if (!$profile) {
            return ['type' => 'notFound', 'message' => '404 - Perfil não configurado'];
        }

        $items = $this->loadItems((string) $user->id);
        $details = (array) $profile;
        $details['logo_spacing'] = $this->normalizeLogoSpacing($details['logo_spacing'] ?? 'center');
        $details['button_content_align'] = $this->normalizeAlign($details['button_content_align'] ?? 'center');
        $details['button_color_rgb'] = $this->hexToRgb($details['button_color'] ?? null);
        $details['card_color_rgb'] = $this->hexToRgb($details['card_background_color'] ?? null);
        if (empty($details['profile_slug'])) {
            $details['profile_slug'] = $slug !== '' ? $slug : $raw;
        }

        if (empty($details['company_logo_url']) || trim((string) $details['company_logo_url']) === '') {
            $details = array_merge($details, $this->defaultBranding());
        }

        $profileSlug = $details['profile_slug'];
        $ogImage = trim((string) ($details['share_image_url'] ?? $details['profile_image_url'] ?? ''))
            ?: 'https://i.ibb.co/60sW9k75/logo.png';
        $ogDescription = trim((string) ($details['bio'] ?? '')) !== ''
            ? mb_substr(trim((string) $details['bio']), 0, 200)
            : 'Confira meu cartão de visita digital Conecta King!';

        return [
            'type' => 'render',
            'data' => [
                'details' => $details,
                'items' => $items,
                'origin' => $origin,
                'ogImageUrl' => $ogImage,
                'ogPageUrl' => rtrim($origin, '/').'/'.$profileSlug,
                'ogDescription' => $ogDescription,
                'profile_slug' => $profileSlug,
                'identifier' => $raw,
                'laravel_preview' => true,
            ],
        ];
    }

    /**
     * Paridade com Node getProfileApi (JSON enxuto).
     *
     * @return array{type:string, message?:string, data?:array}
     */
    public function getApiData(string $identifier, string $origin): array
    {
        $user = $this->findUser(trim($identifier));
        if (!$user) {
            return ['type' => 'notFound', 'message' => 'Perfil não encontrado'];
        }

        $row = DB::selectOne(
            'SELECT u.id AS user_id, u.profile_slug, p.display_name, p.bio, p.profile_image_url,
                    p.background_color, p.text_color, p.button_color,
                    COALESCE(p.avatar_format, \'circular\') as avatar_format
             FROM users u
             INNER JOIN user_profiles p ON u.id = p.user_id
             WHERE u.id = ?',
            [$user->id]
        );

        if (!$row) {
            return ['type' => 'notFound', 'message' => 'Perfil não configurado'];
        }

        $items = DB::select(
            'SELECT item_type, title, destination_url, image_url
             FROM profile_items
             WHERE user_id = ? AND is_active = true
             ORDER BY display_order ASC
             LIMIT 10',
            [$user->id]
        );

        $slug = $user->profile_slug ?: $identifier;

        return [
            'type' => 'ok',
            'data' => [
                'success' => true,
                'profile' => (array) $row,
                'items' => array_map(static fn ($i) => (array) $i, $items),
                'profileUrl' => rtrim($origin, '/').'/'.$slug,
                'engine' => 'laravel',
            ],
        ];
    }

    private function findUser(string $identifier): ?object
    {
        return DB::selectOne(
            'SELECT id, account_type, profile_slug
             FROM users
             WHERE LOWER(profile_slug) = LOWER(?) OR id::text = ?
             LIMIT 1',
            [$identifier, $identifier]
        );
    }

    private function loadProfile(string $userId): ?object
    {
        return DB::selectOne(
            'SELECT
                u.id AS user_id,
                u.profile_slug,
                p.*,
                COALESCE(p.logo_spacing, \'center\') as logo_spacing,
                CASE WHEN u.parent_user_id IS NOT NULL THEN parent.company_logo_url ELSE u.company_logo_url END AS company_logo_url,
                CASE WHEN u.parent_user_id IS NOT NULL THEN parent.company_logo_size ELSE u.company_logo_size END AS company_logo_size,
                CASE WHEN u.parent_user_id IS NOT NULL THEN parent.company_logo_link ELSE u.company_logo_link END AS company_logo_link
             FROM users u
             INNER JOIN user_profiles p ON u.id = p.user_id
             LEFT JOIN users parent ON u.parent_user_id = parent.id
             WHERE u.id = ?',
            [$userId]
        );
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function loadItems(string $userId): array
    {
        try {
            $rows = DB::select(
                'SELECT * FROM profile_items
                 WHERE user_id = ?
                   AND is_active = true
                   AND (is_listed IS NULL OR is_listed = true)
                 ORDER BY display_order ASC',
                [$userId]
            );
        } catch (\Throwable $e) {
            Log::warning('cartao.is_listed fallback', ['error' => $e->getMessage()]);
            $rows = DB::select(
                'SELECT * FROM profile_items
                 WHERE user_id = ? AND is_active = true
                 ORDER BY display_order ASC',
                [$userId]
            );
        }

        $out = [];
        foreach ($rows as $row) {
            $item = (array) $row;
            $type = (string) ($item['item_type'] ?? '');
            if ($type === 'banner_carousel' || $type === 'bible') {
                continue;
            }
            if ($type === 'banner' && empty($item['image_url'])) {
                continue;
            }
            $out[] = $item;
        }

        return $out;
    }

    /**
     * @return array{company_logo_url?:string, company_logo_size?:mixed, company_logo_link?:mixed}
     */
    private function defaultBranding(): array
    {
        try {
            $row = DB::selectOne("SELECT value FROM app_config WHERE key = 'default_branding' LIMIT 1");
            if (!$row || empty($row->value)) {
                return [];
            }
            $def = is_string($row->value) ? json_decode($row->value, true) : (array) $row->value;
            if (!is_array($def) || empty($def['logo_url'])) {
                return [];
            }

            return [
                'company_logo_url' => $def['logo_url'],
                'company_logo_size' => $def['logo_size'] ?? 60,
                'company_logo_link' => $def['logo_link'] ?? null,
            ];
        } catch (\Throwable $e) {
            return [];
        }
    }

    private function normalizeLogoSpacing(mixed $value): string
    {
        if (is_string($value) && in_array($value, ['left', 'center', 'right'], true)) {
            return $value;
        }
        if (is_numeric($value)) {
            $n = (float) $value;
            if ($n <= 5) {
                return 'left';
            }
            if ($n >= 20) {
                return 'right';
            }
        }

        return 'center';
    }

    private function normalizeAlign(mixed $value): string
    {
        return in_array($value, ['left', 'center', 'right'], true) ? $value : 'center';
    }

    /**
     * @return array{r:int,g:int,b:int}
     */
    private function hexToRgb(?string $hex): array
    {
        if (!$hex || !preg_match('/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i', $hex, $m)) {
            return ['r' => 20, 'g' => 20, 'b' => 23];
        }

        return [
            'r' => hexdec($m[1]),
            'g' => hexdec($m[2]),
            'b' => hexdec($m[3]),
        ];
    }
}
