<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Services\CartaoVirtual\VerseOfDayService;

/**
 * Leitura do cartão público a partir do schema existente (Node/Postgres).
 * Sem migrations — só SELECT no banco Conecta King.
 */
class CartaoPublicService
{
    private const RESERVED = [
        'privacidade', 'termos', 'recuperar-senha', 'resetar-senha',
        'esqueci-senha', 'forgot', 'l', 'api', 'dashboard', 'login', 'admin',
        'form', 'forms', 'biblia', 'bible', 'produto', 'product', 'king-selection',
        'kingselection', 'upload', 'uploads', 'vcard', 'log', 'card', 'download',
        'health', 'static', 'js', 'css', 'img', 'assets', 'public', 'loja', 'up',
        'portaria', 'guest-list', 'kingdocs', 'documentos', 'checkoutconfig',
    ];

    /**
     * @return array{type:string, message?:string, statusCode?:int, url?:string, data?:array}
     */
    public function getPageData(string $identifier, string $origin, string $queryString = '', bool $publicMode = false): array
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
        $redirectBase = $publicMode ? '/' : '/l/card/';
        // Código de pulseira/ativação (≠ slug): redireciona para o slug original das Informações
        if ($slug !== '' && strtolower($raw) !== strtolower($slug)) {
            return [
                'type' => 'redirect',
                'statusCode' => 301,
                'url' => $redirectBase.ltrim($slug, '/').$queryString,
            ];
        }
        // Canonicaliza maiúsculas/minúsculas do slug
        if ($slug !== '' && strtolower($raw) === strtolower($slug) && $raw !== $slug) {
            return [
                'type' => 'redirect',
                'statusCode' => 301,
                'url' => $redirectBase.ltrim($slug, '/').$queryString,
            ];
        }

        if (($user->account_type ?? '') === 'free') {
            return ['type' => 'inactive'];
        }

        $profile = $this->loadProfile((string) $user->id);
        if (!$profile) {
            return ['type' => 'notFound', 'message' => '404 - Perfil não configurado'];
        }

        $items = $this->loadItems((string) $user->id, $slug !== '' ? $slug : $raw);
        $details = (array) $profile;
        $details['logo_spacing'] = $this->normalizeLogoSpacing($details['logo_spacing'] ?? 'center');
        $details['button_content_align'] = $this->normalizeAlign($details['button_content_align'] ?? 'center');
        $details['button_color_rgb'] = $this->hexToRgb($details['button_color'] ?? null);
        $details['card_color_rgb'] = $this->hexToRgb($details['card_background_color'] ?? null);
        if (empty($details['profile_slug'])) {
            $details['profile_slug'] = $slug !== '' ? $slug : $raw;
        }

        // Mapa a partir do item location (como no cartão Node)
        foreach ($items as $it) {
            if (($it['item_type'] ?? '') === 'location' && !empty($it['map_url'])) {
                $details['map_url'] = $it['map_url'];
                break;
            }
        }

        // Bíblia: versículo do dia (não aparece como botão na lista)
        $verseOfDay = null;
        $verseDisplay = ['position' => 'top', 'size' => 'normal'];
        $bibleMeta = null;
        foreach ($items as $it) {
            if (($it['item_type'] ?? '') === 'bible') {
                $bibleMeta = $it['bible_data'] ?? null;
                break;
            }
        }
        if (is_array($bibleMeta) && ($bibleMeta['is_visible'] ?? true) !== false) {
            $pos = (string) ($bibleMeta['verse_position'] ?? 'top');
            $size = (string) ($bibleMeta['verse_size'] ?? 'normal');
            $verseDisplay = [
                'position' => $pos === 'bottom' ? 'bottom' : 'top',
                'size' => in_array($size, ['small', 'xsmall'], true) ? $size : 'normal',
            ];
            $verseOfDay = $this->fetchVerseOfDay((string) ($bibleMeta['translation_code'] ?? 'nvi'));
        }

        $itemsForLinks = array_values(array_filter(
            $items,
            static fn ($it) => ($it['item_type'] ?? '') !== 'bible'
        ));

        if (empty($details['company_logo_url']) || trim((string) $details['company_logo_url']) === '') {
            $details = array_merge($details, $this->defaultBranding());
        }

        $profileSlug = $details['profile_slug'];
        $ogSource = trim((string) ($details['share_image_url'] ?? $details['profile_image_url'] ?? ''))
            ?: 'https://i.ibb.co/60sW9k75/logo.png';
        $ogBuster = substr(md5($ogSource.(string) ($details['updated_at'] ?? '')), 0, 12);
        $ogImage = rtrim($origin, '/').'/api/image/profile-image?url='.rawurlencode($ogSource)
            .'&v='.rawurlencode($ogBuster).'&frm=sq1';
        $ogDescription = trim((string) ($details['bio'] ?? '')) !== ''
            ? mb_substr(trim((string) $details['bio']), 0, 200)
            : 'Confira meu cartão de visita digital Conecta King!';

        $logoAlign = $details['logo_spacing'];
        $buttonAlign = $details['button_content_align'];
        if ($logoAlign === 'center') {
            $alignValue = 'center';
        } elseif ($buttonAlign === 'left') {
            $alignValue = 'flex-start';
        } elseif ($buttonAlign === 'right') {
            $alignValue = 'flex-end';
        } else {
            $alignValue = 'center';
        }

        return [
            'type' => 'render',
            'data' => [
                'details' => $details,
                'items' => $itemsForLinks,
                'verseOfDay' => $verseOfDay,
                'verseDisplay' => $verseDisplay,
                'origin' => $origin,
                'ogImageUrl' => $ogImage,
                'ogPageUrl' => rtrim($origin, '/').'/'.$profileSlug,
                'ogDescription' => $ogDescription,
                'profile_slug' => $profileSlug,
                'identifier' => $raw,
                'user_id' => (string) $user->id,
                'laravel_preview' => true,
                'alignValue' => $alignValue,
                'buttonAlign' => $buttonAlign,
                'logoAlign' => $logoAlign,
            ],
        ];
    }

    /**
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
        $user = DB::selectOne(
            'SELECT id, account_type, profile_slug
             FROM users
             WHERE LOWER(profile_slug) = LOWER(?) OR id::text = ?
             LIMIT 1',
            [$identifier, $identifier]
        );
        if ($user) {
            return $user;
        }

        // Código de ativação / pulseira (camuflado): registration_codes → dono → profile_slug
        $claimed = DB::selectOne(
            'SELECT u.id, u.account_type, u.profile_slug
             FROM registration_codes c
             INNER JOIN users u ON u.id = c.claimed_by_user_id
             WHERE LOWER(c.code) = LOWER(?)
               AND c.is_claimed = TRUE
               AND c.claimed_by_user_id IS NOT NULL
             LIMIT 1',
            [$identifier]
        );

        return $claimed ?: null;
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
    private function loadItems(string $userId, string $profileSlug): array
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

        $itemIds = [];
        foreach ($rows as $row) {
            if (!empty($row->id)) {
                $itemIds[] = $row->id;
            }
        }
        $maps = $this->prefetchItemEnrichmentMaps($itemIds);

        $out = [];
        foreach ($rows as $row) {
            $item = (array) $row;
            $type = (string) ($item['item_type'] ?? '');

            // Tipos removidos do produto
            if (in_array($type, ['banner_carousel', 'agenda', 'contract'], true)) {
                continue;
            }

            if ($type === 'bible') {
                $item['bible_data'] = $this->enrichBible($item, $maps);
                $out[] = $item;
                continue;
            }

            if ($type === 'king_selection') {
                $item = array_merge($item, $this->enrichKingSelection($item, $maps));
                if (empty($item['ks_public_url']) || $item['ks_public_url'] === '#') {
                    continue;
                }
                if (empty($item['title'])) {
                    $item['title'] = 'King Selection';
                }
                $out[] = $item;
                continue;
            }

            if ($type === 'location') {
                $item = array_merge($item, $this->enrichLocation($item, $maps));
            }

            if ($type === 'banner') {
                $img = trim((string) ($item['image_url'] ?? ''));
                if ($img === '' || str_contains($img, 'placeholder') || str_starts_with($img, 'data:image/svg')) {
                    continue;
                }
                $dest = trim((string) ($item['destination_url'] ?? ''));
                if (str_starts_with($dest, '[')) {
                    continue;
                }
                $item['primary_url'] = $this->resolveBannerUrl($dest, (string) ($item['whatsapp_message'] ?? ''));
            }

            if ($type === 'sales_page') {
                $item = array_merge($item, $this->enrichSalesPage($item, $profileSlug, $maps));
            }

            if ($type === 'digital_form' || $type === 'guest_list') {
                $item = array_merge($item, $this->enrichDigitalForm($item, $profileSlug, $maps));
            }

            if ($type === 'guest_list') {
                $item = array_merge($item, $this->enrichGuestList($item, $maps));
                // Preferir formulário digital convertido quando existir
                if (!empty($item['digital_form_data']) && !empty($item['active_cadastro_link_slug'])) {
                    $item['item_type'] = 'digital_form';
                    $type = 'digital_form';
                }
            }

            if ($type === 'product_catalog') {
                $item = array_merge($item, $this->enrichProductCatalog($item, $maps));
            }

            if ($type === 'carousel') {
                $item['carousel_images'] = $this->parseCarouselImages($item);
                if (empty($item['carousel_images'])) {
                    continue;
                }
            }

            if ($type === 'instagram_embed') {
                $item = array_merge($item, $this->enrichInstagramEmbed($item));
            }

            if ($type === 'youtube_embed') {
                $item = array_merge($item, $this->enrichYoutubeEmbed($item));
            }

            if ($type === 'pix_qrcode' || $type === 'pix') {
                if (empty($item['title'])) {
                    $item['title'] = $type === 'pix' ? 'PIX' : 'PIX QR Code';
                }
            }

            // Formulário sem URL pública não aparece
            if ($type === 'digital_form' && empty($item['form_public_url'])) {
                continue;
            }

            $out[] = $item;
        }

        return $out;
    }

    /**
     * Prefetch related rows for all profile_items in a few batch queries (no per-item N+1).
     *
     * @param  list<mixed>  $itemIds
     * @return array{
     *     bible: array<string, object>,
     *     king_galleries: array<string, object>,
     *     sales_pages: array<string, object>,
     *     location: array<string, object>,
     *     digital_forms: array<string, object>,
     *     guest_lists: array<string, object>,
     *     cadastro_slugs: array<string, string>,
     *     guest_stats: array<string, array<string, int>>,
     *     products: array<string, list<object>>
     * }
     */
    private function prefetchItemEnrichmentMaps(array $itemIds): array
    {
        $maps = [
            'bible' => [],
            'king_galleries' => [],
            'sales_pages' => [],
            'location' => [],
            'digital_forms' => [],
            'guest_lists' => [],
            'cadastro_slugs' => [],
            'guest_stats' => [],
            'products' => [],
        ];

        if ($itemIds === []) {
            return $maps;
        }

        $placeholders = implode(',', array_fill(0, count($itemIds), '?'));

        try {
            $rows = DB::select(
                "SELECT * FROM bible_items WHERE profile_item_id IN ({$placeholders})",
                $itemIds
            );
            foreach ($rows as $r) {
                $key = (string) $r->profile_item_id;
                if (!isset($maps['bible'][$key])) {
                    $maps['bible'][$key] = $r;
                }
            }
        } catch (\Throwable $e) {
            // table may be missing
        }

        try {
            $rows = DB::select(
                "SELECT DISTINCT ON (profile_item_id) profile_item_id, slug, is_published, status, nome_projeto
                 FROM king_galleries
                 WHERE profile_item_id IN ({$placeholders})
                 ORDER BY profile_item_id, updated_at DESC NULLS LAST, id DESC",
                $itemIds
            );
            foreach ($rows as $r) {
                $maps['king_galleries'][(string) $r->profile_item_id] = $r;
            }
        } catch (\Throwable $e) {
            // table may be missing
        }

        try {
            $rows = DB::select(
                "SELECT * FROM sales_pages WHERE profile_item_id IN ({$placeholders})",
                $itemIds
            );
            foreach ($rows as $r) {
                $key = (string) $r->profile_item_id;
                if (!isset($maps['sales_pages'][$key])) {
                    $maps['sales_pages'][$key] = $r;
                }
            }
        } catch (\Throwable $e) {
            // table may be missing
        }

        try {
            $rows = DB::select(
                "SELECT address, address_formatted, latitude, longitude, place_name, profile_item_id
                 FROM location_items WHERE profile_item_id IN ({$placeholders})",
                $itemIds
            );
            foreach ($rows as $r) {
                $key = (string) $r->profile_item_id;
                if (!isset($maps['location'][$key])) {
                    $maps['location'][$key] = $r;
                }
            }
        } catch (\Throwable $e) {
            // table may be missing
        }

        try {
            $rows = DB::select(
                "SELECT DISTINCT ON (profile_item_id) *
                 FROM digital_form_items
                 WHERE profile_item_id IN ({$placeholders})
                 ORDER BY profile_item_id, COALESCE(updated_at, '1970-01-01'::timestamp) DESC, id DESC",
                $itemIds
            );
            foreach ($rows as $r) {
                $maps['digital_forms'][(string) $r->profile_item_id] = $r;
            }
        } catch (\Throwable $e) {
            // table may be missing
        }

        try {
            $rows = DB::select(
                "SELECT * FROM guest_list_items WHERE profile_item_id IN ({$placeholders})",
                $itemIds
            );
            foreach ($rows as $r) {
                $key = (string) $r->profile_item_id;
                if (!isset($maps['guest_lists'][$key])) {
                    $maps['guest_lists'][$key] = $r;
                }
            }
        } catch (\Throwable $e) {
            // table may be missing
        }

        $guestListIds = [];
        foreach ($maps['guest_lists'] as $gl) {
            if (!empty($gl->id)) {
                $guestListIds[] = $gl->id;
            }
        }

        if ($guestListIds !== []) {
            $glPlaceholders = implode(',', array_fill(0, count($guestListIds), '?'));

            try {
                $rows = DB::select(
                    "SELECT guest_list_item_id, slug FROM cadastro_links
                     WHERE guest_list_item_id IN ({$glPlaceholders})
                       AND is_active_for_profile = TRUE
                       AND (expires_at IS NULL OR expires_at > NOW())
                       AND (max_uses = 999999 OR current_uses < max_uses)",
                    $guestListIds
                );
                foreach ($rows as $r) {
                    $key = (string) $r->guest_list_item_id;
                    if (!isset($maps['cadastro_slugs'][$key]) && !empty($r->slug)) {
                        $maps['cadastro_slugs'][$key] = (string) $r->slug;
                    }
                }
            } catch (\Throwable $e) {
                // table may be missing
            }

            try {
                $rows = DB::select(
                    "SELECT guest_list_id,
                            COUNT(*)::int AS total_count,
                            COUNT(*) FILTER (WHERE status = 'registered')::int AS registered_count,
                            COUNT(*) FILTER (WHERE status = 'confirmed')::int AS confirmed_count,
                            COUNT(*) FILTER (WHERE status = 'checked_in')::int AS checked_in_count
                     FROM guests
                     WHERE guest_list_id IN ({$glPlaceholders})
                     GROUP BY guest_list_id",
                    $guestListIds
                );
                foreach ($rows as $r) {
                    $maps['guest_stats'][(string) $r->guest_list_id] = (array) $r;
                }
            } catch (\Throwable $e) {
                // table may be missing
            }
        }

        try {
            $rows = DB::select(
                "SELECT * FROM product_catalog_items
                 WHERE profile_item_id IN ({$placeholders})
                 ORDER BY display_order ASC, created_at ASC",
                $itemIds
            );
            foreach ($rows as $r) {
                $key = (string) $r->profile_item_id;
                $maps['products'][$key][] = $r;
            }
        } catch (\Throwable $e) {
            // table may be missing
        }

        return $maps;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function fetchVerseOfDay(string $translation = 'nvi'): ?array
    {
        try {
            return app(VerseOfDayService::class)->forCard($translation ?: 'nvi');
        } catch (\Throwable $e) {
            Log::warning('cartao.verse_of_day.local', ['error' => $e->getMessage()]);

            return null;
        }
    }

    /**
     * @param  array<string, mixed>  $item
     * @param  array<string, mixed>  $maps
     * @return array<string, mixed>
     */
    private function enrichBible(array $item, array $maps): array
    {
        try {
            $key = (string) ($item['id'] ?? '');
            $row = $maps['bible'][$key] ?? null;
            if ($row) {
                $data = (array) $row;
                // Postgres bool pode vir como string
                if (array_key_exists('is_visible', $data)) {
                    $data['is_visible'] = filter_var($data['is_visible'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true;
                }

                return $data;
            }
        } catch (\Throwable $e) {
            // ignore
        }

        return [
            'translation_code' => 'nvi',
            'is_visible' => true,
            'verse_position' => 'top',
            'verse_size' => 'normal',
        ];
    }

    /**
     * @param  array<string, mixed>  $item
     * @param  array<string, mixed>  $maps
     * @return array<string, mixed>
     */
    private function enrichKingSelection(array $item, array $maps): array
    {
        try {
            $key = (string) ($item['id'] ?? '');
            $g = $maps['king_galleries'][$key] ?? null;
            if (!$g || empty($g->slug)) {
                return ['ks_public_url' => '#', 'title' => ($item['title'] ?? null) ?: 'King Selection'];
            }
            $published = filter_var($g->is_published, FILTER_VALIDATE_BOOLEAN);
            $url = $published ? '/kingSelection/'.$g->slug : '#';

            return [
                'ks_public_url' => $url,
                'ks_gallery_slug' => $g->slug,
                'title' => ($item['title'] ?? null) ?: ($g->nome_projeto ?: 'King Selection'),
            ];
        } catch (\Throwable $e) {
            return ['ks_public_url' => '#'];
        }
    }

    /**
     * @param  array<string, mixed>  $item
     * @param  array<string, mixed>  $maps
     * @return array<string, mixed>
     */
    private function enrichSalesPage(array $item, string $profileSlug, array $maps): array
    {
        try {
            $key = (string) ($item['id'] ?? '');
            $sp = $maps['sales_pages'][$key] ?? null;
            if (!$sp) {
                return [
                    'sales_page_slug' => null,
                    'sales_page_status' => null,
                    'sales_page_display_format' => 'button',
                    'sales_page_url' => '#',
                    'title' => $item['title'] ?: 'Página de Vendas',
                ];
            }
            $status = (string) ($sp->status ?? '');
            $slug = ($status === 'PUBLISHED') ? ($sp->slug ?? null) : null;
            $fmt = strtolower(trim((string) ($sp->display_format ?? 'button')));
            $url = ($slug && $profileSlug) ? '/'.$profileSlug.'/'.$slug : '#';

            return [
                'sales_page_slug' => $slug,
                'sales_page_status' => $status,
                'sales_page_display_format' => $fmt === 'banner' ? 'banner' : 'button',
                'sales_page_banner_image_url' => $sp->card_banner_image_url ?? null,
                'sales_page_url' => $url,
                'title' => ($item['title'] ?? null) ?: 'Página de Vendas',
            ];
        } catch (\Throwable $e) {
            return [
                'sales_page_url' => '#',
                'title' => ($item['title'] ?? null) ?: 'Página de Vendas',
            ];
        }
    }

    /**
     * @param  array<string, mixed>  $item
     * @param  array<string, mixed>  $maps
     * @return array<string, mixed>
     */
    private function enrichLocation(array $item, array $maps): array
    {
        try {
            $key = (string) ($item['id'] ?? '');
            $loc = $maps['location'][$key] ?? null;
            if (!$loc) {
                return ['map_url' => null, 'title' => ($item['title'] ?? null) ?: 'Ver no Mapa'];
            }
            $lat = $loc->latitude ?? null;
            $lng = $loc->longitude ?? null;
            $addr = trim((string) ($loc->address_formatted ?? $loc->address ?? $loc->place_name ?? ''));
            $mapUrl = null;
            if ($lat !== null && $lng !== null && $lat !== '' && $lng !== '') {
                $mapUrl = 'https://www.google.com/maps?q='.rawurlencode($lat.','.$lng);
            } elseif ($addr !== '') {
                $mapUrl = 'https://www.google.com/maps/search/?api=1&query='.rawurlencode($addr);
            }

            $locData = (array) $loc;
            unset($locData['profile_item_id']);

            return [
                'map_url' => $mapUrl,
                'location_data' => $locData,
                'title' => ($item['title'] ?? null) ?: 'Ver no Mapa',
            ];
        } catch (\Throwable $e) {
            return ['map_url' => null];
        }
    }

    /**
     * @param  array<string, mixed>  $item
     * @param  array<string, mixed>  $maps
     * @return array<string, mixed>
     */
    private function enrichDigitalForm(array $item, string $profileSlug, array $maps): array
    {
        $title = trim((string) ($item['title'] ?? ''));
        if ($title === '') {
            $title = 'Formulário';
        }
        $formData = null;
        $activeSlug = null;

        try {
            $key = (string) ($item['id'] ?? '');
            $df = $maps['digital_forms'][$key] ?? null;
            if ($df) {
                $formData = (array) $df;
                if ($title === 'Formulário' && !empty($formData['form_title'])) {
                    $title = (string) $formData['form_title'];
                }
            }
        } catch (\Throwable $e) {
            // ignore
        }

        try {
            $key = (string) ($item['id'] ?? '');
            $gli = $maps['guest_lists'][$key] ?? null;
            if ($gli && !empty($gli->id)) {
                $activeSlug = $maps['cadastro_slugs'][(string) $gli->id] ?? null;
            }
        } catch (\Throwable $e) {
            // ignore
        }

        // Preferir link curto; fallback para rota pública Node /:slug/form/:itemId
        $url = '';
        if ($activeSlug) {
            $url = '/form/'.$activeSlug;
        } elseif ($profileSlug !== '' && !empty($item['id'])) {
            $url = '/'.$profileSlug.'/form/'.$item['id'];
        }

        return [
            'title' => $title,
            'form_public_url' => $url,
            'active_cadastro_link_slug' => $activeSlug,
            'digital_form_data' => $formData,
        ];
    }

    /**
     * @param  array<string, mixed>  $item
     * @param  array<string, mixed>  $maps
     * @return array<string, mixed>
     */
    private function enrichGuestList(array $item, array $maps): array
    {
        try {
            $key = (string) ($item['id'] ?? '');
            $gl = $maps['guest_lists'][$key] ?? null;
            if (!$gl) {
                return ['guest_list_data' => null];
            }
            $data = (array) $gl;
            try {
                $stats = $maps['guest_stats'][(string) $gl->id] ?? null;
                if ($stats) {
                    unset($stats['guest_list_id']);
                    $data['stats'] = $stats;
                } else {
                    $data['stats'] = [
                        'total_count' => 0, 'registered_count' => 0, 'confirmed_count' => 0, 'checked_in_count' => 0,
                    ];
                }
            } catch (\Throwable $e) {
                $data['stats'] = [
                    'total_count' => 0, 'registered_count' => 0, 'confirmed_count' => 0, 'checked_in_count' => 0,
                ];
            }
            $token = (string) ($data['registration_token'] ?? '');
            $data['registration_url'] = $token !== '' ? '/guest-list/register/'.$token : '#';

            return [
                'guest_list_data' => $data,
                'title' => ($item['title'] ?? null) ?: ($data['event_title'] ?? 'Lista de Convidados'),
            ];
        } catch (\Throwable $e) {
            return ['guest_list_data' => null];
        }
    }

    /**
     * @param  array<string, mixed>  $item
     * @param  array<string, mixed>  $maps
     * @return array<string, mixed>
     */
    private function enrichProductCatalog(array $item, array $maps): array
    {
        try {
            $key = (string) ($item['id'] ?? '');
            $rows = $maps['products'][$key] ?? [];

            return [
                'products' => array_map(static fn ($r) => (array) $r, $rows),
                'title' => ($item['title'] ?? null) ?: 'Minha Loja',
            ];
        } catch (\Throwable $e) {
            return ['products' => [], 'title' => ($item['title'] ?? null) ?: 'Minha Loja'];
        }
    }

    /**
     * @param  array<string, mixed>  $item
     * @return list<string>
     */
    private function parseCarouselImages(array $item): array
    {
        $images = [];
        $raw = trim((string) ($item['destination_url'] ?? ''));
        if ($raw !== '' && (str_starts_with($raw, '[') || str_starts_with($raw, '{'))) {
            try {
                $parsed = json_decode($raw, true);
                if (is_array($parsed)) {
                    if (isset($parsed['images']) && is_array($parsed['images'])) {
                        $parsed = $parsed['images'];
                    }
                    foreach ($parsed as $img) {
                        $url = is_array($img) ? trim((string) ($img['url'] ?? $img['image_url'] ?? '')) : trim((string) $img);
                        if ($url !== '' && !str_contains($url, 'placeholder')) {
                            $images[] = $url;
                        }
                    }
                }
            } catch (\Throwable $e) {
                // ignore
            }
        }
        $fallback = trim((string) ($item['image_url'] ?? ''));
        if ($images === [] && $fallback !== '' && !str_contains($fallback, 'placeholder')) {
            $images[] = $fallback;
        }

        return array_values(array_unique($images));
    }

    /**
     * @param  array<string, mixed>  $item
     * @return array<string, mixed>
     */
    private function enrichInstagramEmbed(array $item): array
    {
        $url = trim((string) ($item['destination_url'] ?? ''));
        if ($url === '') {
            return [];
        }
        $normalized = rtrim($url, '/');
        $isProfile = (bool) preg_match('#instagram\.com/([A-Za-z0-9._]+)/?$#i', $normalized, $m)
            && !preg_match('#/(p|reel|tv)/#i', $normalized);
        $username = $isProfile ? strtolower($m[1]) : null;

        return [
            'instagram_is_profile' => $isProfile,
            'instagram_username' => $username,
            'instagram_embed_url' => $isProfile ? null : ($normalized.'/embed/'),
        ];
    }

    /**
     * @param  array<string, mixed>  $item
     * @return array<string, mixed>
     */
    private function enrichYoutubeEmbed(array $item): array
    {
        $raw = trim((string) ($item['embed_url'] ?? $item['destination_url'] ?? ''));
        if ($raw === '') {
            return ['youtube_embed_src' => null];
        }
        if (preg_match('/^[a-zA-Z0-9_-]{11}$/', $raw)) {
            return ['youtube_embed_src' => 'https://www.youtube.com/embed/'.$raw];
        }
        $patterns = [
            '/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/',
            '/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/',
            '/youtube\.com\/live\/([a-zA-Z0-9_-]{11})/',
        ];
        foreach ($patterns as $p) {
            if (preg_match($p, $raw, $m)) {
                return ['youtube_embed_src' => 'https://www.youtube.com/embed/'.$m[1]];
            }
        }
        if (str_contains($raw, 'live_stream') || str_contains($raw, 'channel=')) {
            return ['youtube_embed_src' => $raw];
        }

        return ['youtube_embed_src' => null, 'embed_url' => $raw];
    }

    private function resolveBannerUrl(string $rawDest, string $whatsappMessage = ''): string
    {
        $primary = $rawDest;
        if (str_starts_with($rawDest, '{')) {
            try {
                $o = json_decode($rawDest, true);
                $primary = trim((string) ($o['primary_url'] ?? $o['link'] ?? ''));
            } catch (\Throwable $e) {
                $primary = $rawDest;
            }
        }
        if ($primary && $whatsappMessage !== '') {
            if (str_contains($primary, 'wa.me') && !str_contains($primary, '?text=')) {
                if (preg_match('#wa\.me/([^/?]+)#', $primary, $m) && preg_match('/^\d+$/', explode('?', $m[1])[0])) {
                    $primary = 'https://wa.me/'.explode('?', $m[1])[0].'?text='.rawurlencode($whatsappMessage);
                }
            }
        }

        return $primary;
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
