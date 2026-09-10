<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use App\Services\CartaoVirtual\CartaoPublicService;
use App\Support\SafeIconClass;

/**
 * PUT /api/profile/save-all — paridade Node (informações + tema + itens).
 */
class ProfileSaveService
{
    private const PROTECTED_TYPES = ['sales_page', 'king_selection', 'bible', 'wifi'];

    /** Slugs que colidem com rotas/páginas do sistema. */
    private const RESERVED_SLUGS = [
        'api', 'admin', 'login', 'dashboard', 'registro', 'conta', 'health',
        'form', 'forms', 'bible', 'bibliaking', 'card', 'build', 'legacy',
        'kingforms', 'kingselection', 'kingdocs', 'kingdocsshare',
        'responseslist', 'salespageedit', 'formpageedit', 'guestlistedit',
        'recibos-orcamentos', 'orcamentos', 'documentos-preview', 'documentos-ver',
        'config', 'upload', 'assets', 'css', 'js', 'static', 'public',
        'termos', 'privacidade', 'recuperar-senha', 'resetar-senha',
        'www', 'wwws', 'mail', 'ftp', 'null', 'undefined',
    ];

    /** @var list<string>|null */
    private static ?array $profileItemColumns = null;

    /**
     * @param  array<string, mixed>  $body
     * @return array{success:bool,message:string,items:list<array<string,mixed>>,timestamp:int,refreshHint:bool}
     */
    public function saveAll(string $userId, array $body): array
    {
        $details = is_array($body['details'] ?? null) ? $body['details'] : null;
        $items = is_array($body['items'] ?? null) ? $body['items'] : null;

        return DB::transaction(function () use ($userId, $details, $items) {
            if ($details) {
                $this->updateInformations($userId, $details);
                $this->updateTheme($userId, $details);
            }

            if ($items && count($items) > 0) {
                $this->syncItems($userId, $items);
            }

            $wanted = [
                'id', 'user_id', 'item_type', 'title', 'destination_url', 'image_url',
                'display_order', 'is_active', 'icon_class', 'pdf_url', 'pix_key',
                'recipient_name', 'pix_amount', 'pix_description', 'logo_size',
                'aspect_ratio', 'whatsapp_message', 'tab_id', 'created_at', 'updated_at',
            ];
            $cols = array_values(array_intersect($wanted, $this->profileItemColumns()));
            if ($cols === []) {
                $cols = ['id', 'user_id', 'item_type', 'display_order', 'is_active'];
            }
            $rows = DB::select(
                'SELECT '.implode(', ', $cols).' FROM profile_items WHERE user_id = ? ORDER BY display_order ASC',
                [$userId]
            );
            $now = (int) round(microtime(true) * 1000);
            CartaoPublicService::forgetCardCache($userId);

            return [
                'success' => true,
                'message' => 'Alterações salvas com sucesso!',
                'items' => array_map(static fn ($r) => (array) $r, $rows),
                'timestamp' => $now,
                'refreshHint' => true,
            ];
        });
    }

    /**
     * @param  array<string, mixed>  $details
     */
    private function updateInformations(string $userId, array $details): void
    {
        $exists = DB::selectOne('SELECT user_id FROM user_profiles WHERE user_id = ? LIMIT 1', [$userId]);
        $get = fn (string $k, ?string $alt = null) => $details[$k] ?? ($alt ? ($details[$alt] ?? null) : null);

        $displayName = $get('display_name', 'displayName');
        $bio = $get('bio');
        $profileImage = $get('profile_image_url', 'profileImageUrl');
        $whatsapp = $get('whatsapp', 'whatsappNumber');
        $avatarFormat = $get('avatar_format', 'avatarFormat') ?: 'circular';
        $shareImage = $get('share_image_url');
        $cardLayout = strtolower((string) ($get('card_layout', 'cardLayout') ?: 'classic')) === 'vitrine' ? 'vitrine' : 'classic';

        if (!$exists) {
            DB::insert(
                'INSERT INTO user_profiles (user_id, display_name, bio, profile_image_url, whatsapp, avatar_format, share_image_url, card_layout)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [$userId, $displayName, $bio, $profileImage, $whatsapp, $avatarFormat, $shareImage, $cardLayout]
            );
        } else {
            DB::update(
                'UPDATE user_profiles SET
                    display_name = COALESCE(?, display_name),
                    bio = COALESCE(?, bio),
                    profile_image_url = COALESCE(?, profile_image_url),
                    whatsapp = COALESCE(?, whatsapp),
                    avatar_format = COALESCE(?, avatar_format),
                    share_image_url = COALESCE(?, share_image_url),
                    card_layout = COALESCE(?, card_layout)
                 WHERE user_id = ?',
                [$displayName, $bio, $profileImage, $whatsapp, $avatarFormat, $shareImage, $cardLayout, $userId]
            );

            // Campos vitrine (se enviados)
            $this->maybeUpdateVitrine($userId, $details);
        }

        $slug = $get('profile_slug', 'profileSlug');
        if (is_string($slug) && $slug !== '') {
            $normalized = $this->normalizeAndValidateSlug($slug, $userId);
            DB::update('UPDATE users SET profile_slug = ? WHERE id = ?', [$normalized, $userId]);
        }
    }

    /**
     * Normaliza e valida slug (formato, reservados, unicidade).
     *
     * @throws \InvalidArgumentException
     */
    private function normalizeAndValidateSlug(string $raw, string $userId): string
    {
        $slug = Str::lower(trim($raw));
        $slug = preg_replace('/[^a-z0-9_-]+/', '-', $slug) ?? '';
        $slug = trim($slug, '-_');

        if ($slug === '' || strlen($slug) < 2 || strlen($slug) > 48) {
            throw new \InvalidArgumentException('O link do cartão deve ter entre 2 e 48 caracteres (letras, números, - ou _).');
        }
        if (preg_match('/^[0-9]+$/', $slug)) {
            throw new \InvalidArgumentException('O link do cartão não pode ser só números.');
        }
        if (in_array($slug, self::RESERVED_SLUGS, true) || str_starts_with($slug, 'admin')) {
            throw new \InvalidArgumentException('Este link do cartão está reservado. Escolha outro.');
        }

        $taken = DB::selectOne(
            'SELECT id FROM users WHERE LOWER(profile_slug) = LOWER(?) AND id <> ? LIMIT 1',
            [$slug, $userId]
        );
        if ($taken) {
            throw new \InvalidArgumentException('Este link do cartão já está em uso. Escolha outro.');
        }

        return $slug;
    }

    /**
     * @param  array<string, mixed>  $details
     */
    private function maybeUpdateVitrine(string $userId, array $details): void
    {
        $sets = [];
        $vals = [];
        $map = [
            'vitrine_hero_url' => 'vitrineHeroUrl',
            'vitrine_marquee_text' => 'vitrineMarqueeText',
            'vitrine_marquee_speed' => 'vitrineMarqueeSpeed',
            'vitrine_show_footer' => 'vitrineShowFooter',
            'vitrine_marquee_bg_type' => 'vitrineMarqueeBgType',
            'vitrine_marquee_color1' => 'vitrineMarqueeColor1',
            'vitrine_marquee_color2' => 'vitrineMarqueeColor2',
            'vitrine_marquee_text_color' => 'vitrineMarqueeTextColor',
        ];
        foreach ($map as $snake => $camel) {
            if (array_key_exists($snake, $details) || array_key_exists($camel, $details)) {
                $sets[] = "$snake = ?";
                $vals[] = $details[$snake] ?? $details[$camel] ?? null;
            }
        }
        if (array_key_exists('vitrine_marquee_logos', $details) || array_key_exists('vitrineMarqueeLogos', $details)) {
            $raw = $details['vitrine_marquee_logos'] ?? $details['vitrineMarqueeLogos'] ?? [];
            if (is_array($raw)) {
                $raw = json_encode(array_values(array_filter($raw)), JSON_UNESCAPED_UNICODE);
            }
            $sets[] = 'vitrine_marquee_logos = ?::jsonb';
            $vals[] = is_string($raw) ? $raw : '[]';
        }
        if ($sets === []) {
            return;
        }
        $vals[] = $userId;
        try {
            DB::update('UPDATE user_profiles SET '.implode(', ', $sets).' WHERE user_id = ?', $vals);
        } catch (\Throwable $e) {
            Log::warning('profile.save.vitrine', ['error' => $e->getMessage()]);
        }
    }

    /**
     * @param  array<string, mixed>  $details
     */
    private function updateTheme(string $userId, array $details): void
    {
        $exists = DB::selectOne('SELECT user_id FROM user_profiles WHERE user_id = ? LIMIT 1', [$userId]);
        if (!$exists) {
            return;
        }

        $fields = [
            'font_family' => 'fontFamily',
            'background_color' => 'backgroundColor',
            'text_color' => 'textColor',
            'button_color' => 'buttonColor',
            'button_text_color' => 'buttonTextColor',
            'button_opacity' => 'buttonOpacity',
            'button_border_radius' => 'buttonBorderRadius',
            'button_content_align' => 'buttonContentAlign',
            'background_type' => 'backgroundType',
            'background_image_url' => 'backgroundImageUrl',
            'card_background_color' => 'cardBackgroundColor',
            'card_opacity' => 'cardOpacity',
            'button_font_size' => 'buttonFontSize',
            'background_image_opacity' => 'backgroundImageOpacity',
            'show_vcard_button' => 'showVcardButton',
            'logo_spacing' => 'logoSpacing',
        ];

        $sets = [];
        $vals = [];
        foreach ($fields as $snake => $camel) {
            if (!array_key_exists($snake, $details) && !array_key_exists($camel, $details)) {
                continue;
            }
            $val = $details[$snake] ?? $details[$camel] ?? null;
            if (in_array($snake, ['button_opacity', 'card_opacity', 'background_image_opacity'], true)) {
                $val = $this->normalizeOpacity($val);
            }
            if ($snake === 'button_font_size') {
                $val = $this->normalizeFontSize($val);
            }
            $sets[] = "$snake = ?";
            $vals[] = $val;
        }
        if ($sets === []) {
            return;
        }
        $vals[] = $userId;
        DB::update('UPDATE user_profiles SET '.implode(', ', $sets).' WHERE user_id = ?', $vals);
    }

    /**
     * @param  list<array<string, mixed>>  $items
     */
    private function syncItems(string $userId, array $items): void
    {
        $cols = $this->profileItemColumns();
        $existingRows = DB::select(
            'SELECT id FROM profile_items WHERE user_id = ? AND item_type != ?',
            [$userId, 'sales_page']
        );
        $existingIds = [];
        foreach ($existingRows as $r) {
            $existingIds[(int) $r->id] = true;
        }

        $savedIds = [];
        $salesPageNew = [];

        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }
            $type = (string) ($item['item_type'] ?? 'link');
            $hasValidId = isset($item['id']) && is_numeric($item['id']) && (int) $item['id'] > 0;
            $itemId = $hasValidId ? (int) $item['id'] : null;
            // Só atualiza se o ID já pertence a este utilizador (nunca forçar ID novo / setval)
            $exists = $itemId && isset($existingIds[$itemId]);

            if ($type === 'sales_page') {
                if ($exists) {
                    DB::update(
                        'UPDATE profile_items SET display_order = ?, is_active = ?
                         WHERE id = ? AND user_id = ? AND item_type = \'sales_page\'',
                        [
                            $item['display_order'] ?? 0,
                            array_key_exists('is_active', $item) ? (bool) $item['is_active'] : true,
                            $itemId,
                            $userId,
                        ]
                    );
                    $savedIds[$itemId] = true;
                } else {
                    $newId = $this->insertSalesPageStub($userId, $item, $cols);
                    $savedIds[$newId] = true;
                    $salesPageNew[] = ['id' => $newId, 'item' => $item];
                }
                continue;
            }

            $dest = $this->normalizeDestination($type, $item['destination_url'] ?? null);

            if ($exists) {
                $this->updateItem($userId, $itemId, $item, $dest, $cols);
                $savedIds[$itemId] = true;
            } else {
                $newId = $this->insertItem($userId, $item, $dest, $cols);
                $savedIds[$newId] = true;
            }
        }

        // Deletes: remove o que não veio no payload, exceto tipos protegidos
        $candidateIds = array_keys(array_diff_key($existingIds, $savedIds));
        $toDelete = $candidateIds;
        if ($candidateIds !== []) {
            $protected = DB::select(
                'SELECT id FROM profile_items WHERE user_id = ? AND id IN ('.$this->intList($candidateIds).') AND item_type IN ('.$this->strList(self::PROTECTED_TYPES).')',
                [$userId]
            );
            $protectedIds = [];
            foreach ($protected as $p) {
                $protectedIds[(int) $p->id] = true;
            }
            $toDelete = array_values(array_filter($candidateIds, static fn ($id) => !isset($protectedIds[$id])));
        }

        if ($toDelete !== []) {
            DB::delete(
                'DELETE FROM profile_items WHERE user_id = ? AND id IN ('.$this->intList($toDelete).')',
                [$userId]
            );
        }

        foreach ($salesPageNew as $sp) {
            $this->ensureSalesPageRow((int) $sp['id'], $sp['item']);
        }
    }

    /**
     * @param  array<string, mixed>  $item
     * @param  list<string>  $cols
     */
    private function updateItem(string $userId, int $itemId, array $item, mixed $dest, array $cols): void
    {
        $rawIcon = $item['icon_class'] ?? null;
        $iconClass = ($rawIcon === null || $rawIcon === '')
            ? null
            : SafeIconClass::sanitize((string) $rawIcon);

        $sets = [
            'title = ?',
            'destination_url = COALESCE(?, destination_url)',
            'image_url = COALESCE(?, image_url)',
            'icon_class = ?',
            'display_order = ?',
            'is_active = ?',
        ];
        $vals = [
            $item['title'] ?? null,
            $dest,
            array_key_exists('image_url', $item) ? ($item['image_url'] ?: null) : null,
            $iconClass,
            $item['display_order'] ?? 0,
            array_key_exists('is_active', $item) ? (bool) $item['is_active'] : true,
        ];

        foreach (['pix_key', 'recipient_name', 'pix_description', 'pdf_url', 'whatsapp_message', 'aspect_ratio'] as $opt) {
            if (in_array($opt, $cols, true)) {
                $sets[] = "$opt = ?";
                $vals[] = $item[$opt] ?? null;
            }
        }
        if (in_array('pix_amount', $cols, true)) {
            $sets[] = 'pix_amount = ?';
            $vals[] = isset($item['pix_amount']) && $item['pix_amount'] !== '' ? (float) $item['pix_amount'] : null;
        }
        if (in_array('logo_size', $cols, true)) {
            $sets[] = 'logo_size = ?';
            $parsed = isset($item['logo_size']) ? (int) $item['logo_size'] : 0;
            $vals[] = $parsed > 0 ? $parsed : null;
        }
        if (in_array('logo_fit_mode', $cols, true)) {
            $sets[] = 'logo_fit_mode = ?';
            $mode = $item['logo_fit_mode'] ?? 'contain';
            $vals[] = in_array($mode, ['contain', 'cover'], true) ? $mode : 'contain';
        }

        $vals[] = $itemId;
        $vals[] = $userId;
        DB::update(
            'UPDATE profile_items SET '.implode(', ', $sets).' WHERE id = ? AND user_id = ?',
            $vals
        );
    }

    /**
     * @param  array<string, mixed>  $item
     * @param  list<string>  $cols
     */
    private function insertItem(string $userId, array $item, mixed $dest, array $cols): int
    {
        $rawIcon = $item['icon_class'] ?? null;
        $iconClass = ($rawIcon === null || $rawIcon === '')
            ? null
            : SafeIconClass::sanitize((string) $rawIcon);

        $fields = ['user_id', 'item_type', 'title', 'destination_url', 'image_url', 'icon_class', 'display_order', 'is_active'];
        $vals = [
            $userId, $item['item_type'] ?? 'link', $item['title'] ?? null, $dest,
            $item['image_url'] ?? null, $iconClass, $item['display_order'] ?? 0,
            array_key_exists('is_active', $item) ? (bool) $item['is_active'] : true,
        ];

        foreach (['pix_key', 'recipient_name', 'pix_description', 'pdf_url', 'whatsapp_message', 'aspect_ratio'] as $opt) {
            if (in_array($opt, $cols, true)) {
                $fields[] = $opt;
                $vals[] = $item[$opt] ?? null;
            }
        }
        if (in_array('pix_amount', $cols, true)) {
            $fields[] = 'pix_amount';
            $vals[] = isset($item['pix_amount']) && $item['pix_amount'] !== '' ? (float) $item['pix_amount'] : null;
        }
        if (in_array('logo_size', $cols, true)) {
            $fields[] = 'logo_size';
            $parsed = isset($item['logo_size']) ? (int) $item['logo_size'] : 0;
            $vals[] = $parsed > 0 ? $parsed : null;
        }
        if (in_array('logo_fit_mode', $cols, true)) {
            $fields[] = 'logo_fit_mode';
            $mode = $item['logo_fit_mode'] ?? 'contain';
            $vals[] = in_array($mode, ['contain', 'cover'], true) ? $mode : 'contain';
        }

        $ph = implode(',', array_fill(0, count($vals), '?'));
        $row = DB::selectOne(
            'INSERT INTO profile_items ('.implode(',', $fields).") VALUES ($ph) RETURNING id",
            $vals
        );

        return (int) $row->id;
    }

    /**
     * @param  array<string, mixed>  $item
     * @param  list<string>  $cols
     */
    private function insertSalesPageStub(string $userId, array $item, array $cols): int
    {
        $fields = ['user_id', 'item_type', 'display_order', 'is_active'];
        $vals = [
            $userId, 'sales_page', $item['display_order'] ?? 0,
            array_key_exists('is_active', $item) ? (bool) $item['is_active'] : true,
        ];
        $ph = implode(',', array_fill(0, count($vals), '?'));
        $row = DB::selectOne(
            'INSERT INTO profile_items ('.implode(',', $fields).") VALUES ($ph) RETURNING id",
            $vals
        );

        return (int) $row->id;
    }

    /**
     * @param  array<string, mixed>  $item
     */
    private function ensureSalesPageRow(int $profileItemId, array $item): void
    {
        try {
            $exists = DB::selectOne('SELECT id FROM sales_pages WHERE profile_item_id = ? LIMIT 1', [$profileItemId]);
            if ($exists) {
                return;
            }
            $title = (string) ($item['title'] ?? 'Minha Loja');
            $base = Str::slug($title) ?: 'loja';
            $slug = $base;
            $n = 0;
            while (DB::selectOne('SELECT id FROM sales_pages WHERE slug = ? LIMIT 1', [$slug])) {
                $n++;
                $slug = $base.'-'.$n;
            }
            DB::insert(
                'INSERT INTO sales_pages
                    (profile_item_id, store_title, button_text, button_logo_url, whatsapp_number, theme, status, preview_token, slug, published_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
                [
                    $profileItemId,
                    $title,
                    $title,
                    $item['image_url'] ?? null,
                    '',
                    'dark',
                    'PUBLISHED',
                    bin2hex(random_bytes(32)),
                    $slug,
                ]
            );
        } catch (\Throwable $e) {
            Log::warning('profile.save.sales_page', ['error' => $e->getMessage(), 'itemId' => $profileItemId]);
        }
    }

    private function normalizeDestination(string $type, mixed $raw): mixed
    {
        if ($raw === null || $raw === '') {
            return null;
        }
        if ($type !== 'carousel') {
            return $raw;
        }
        if (is_array($raw)) {
            return json_encode(array_values($raw), JSON_UNESCAPED_UNICODE);
        }
        $s = (string) $raw;
        try {
            $parsed = json_decode($s, true);
            if (is_array($parsed)) {
                return json_encode(array_is_list($parsed) ? $parsed : [$parsed], JSON_UNESCAPED_UNICODE);
            }
        } catch (\Throwable $e) {
            // fallthrough
        }
        if (!str_starts_with($s, '[')) {
            return json_encode([$s], JSON_UNESCAPED_UNICODE);
        }

        return $s;
    }

    /**
     * @return list<string>
     */
    private function profileItemColumns(): array
    {
        if (self::$profileItemColumns !== null) {
            return self::$profileItemColumns;
        }
        $rows = DB::select(
            "SELECT column_name FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'profile_items'"
        );
        self::$profileItemColumns = array_map(static fn ($r) => (string) $r->column_name, $rows);

        return self::$profileItemColumns;
    }

    /** @param list<int> $ids */
    private function intList(array $ids): string
    {
        $ids = array_map('intval', $ids);

        return $ids === [] ? 'NULL' : implode(',', $ids);
    }

    /** @param list<string> $vals */
    private function strList(array $vals): string
    {
        return implode(',', array_map(static fn ($v) => "'".str_replace("'", "''", $v)."'", $vals));
    }

    private function normalizeOpacity(mixed $raw): mixed
    {
        if ($raw === null || $raw === '') {
            return null;
        }
        if (is_numeric($raw)) {
            return (float) $raw;
        }
        $s = trim((string) $raw);
        if (str_ends_with($s, '%')) {
            return ((float) $s) / 100;
        }

        return is_numeric($s) ? (float) $s : null;
    }

    private function normalizeFontSize(mixed $raw): mixed
    {
        if ($raw === null || $raw === '') {
            return null;
        }
        if (is_numeric($raw)) {
            return (int) round((float) $raw);
        }
        if (preg_match('/(\d+(\.\d+)?)/', (string) $raw, $m)) {
            return (int) round((float) $m[1]);
        }

        return null;
    }
}
