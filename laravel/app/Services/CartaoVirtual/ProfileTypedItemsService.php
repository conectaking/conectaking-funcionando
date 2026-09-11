<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * PUT tipados do editor: banner, link, carousel, pix, pdf + duplicate.
 */
class ProfileTypedItemsService
{
    /** @var list<string>|null */
    private static ?array $columns = null;

    /**
     * @param  array<string, mixed>  $body
     * @return array{status:int, body:array<string, mixed>}
     */
    public function updateBanner(string $userId, string $itemId, array $body): array
    {
        return $this->updateTyped($userId, $itemId, ['banner'], $body, [
            'title' => 'nullable_string',
            'destination_url' => 'nullable_string',
            'image_url' => 'nullable_string',
            'whatsapp_message' => 'optional_string',
            'aspect_ratio' => 'optional_string',
            'is_active' => 'bool',
            'display_order' => 'int_keep',
        ], 'Banner');
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array{status:int, body:array<string, mixed>}
     */
    public function updateLink(string $userId, string $itemId, array $body): array
    {
        return $this->updateTyped($userId, $itemId, ['link'], $body, [
            'title' => 'passthrough',
            'destination_url' => 'passthrough',
            'image_url' => 'passthrough',
            'icon_class' => 'passthrough',
            'logo_size' => 'optional_passthrough',
            'logo_fit_mode' => 'logo_fit',
            'is_active' => 'raw',
            'display_order' => 'raw',
        ], 'Link');
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array{status:int, body:array<string, mixed>}
     */
    public function updateCarousel(string $userId, string $itemId, array $body): array
    {
        return $this->updateTyped($userId, $itemId, ['carousel'], $body, [
            'title' => 'passthrough',
            'destination_url' => 'passthrough',
            'image_url' => 'passthrough',
            'aspect_ratio' => 'optional_passthrough',
            'is_active' => 'raw',
            'display_order' => 'raw',
        ], 'Carousel');
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array{status:int, body:array<string, mixed>}
     */
    public function updatePix(string $userId, string $itemId, array $body): array
    {
        return $this->updateTyped($userId, $itemId, ['pix', 'pix_qrcode'], $body, [
            'title' => 'passthrough',
            'pix_key' => 'optional_passthrough',
            'recipient_name' => 'optional_passthrough',
            'pix_amount' => 'optional_float',
            'pix_description' => 'optional_passthrough',
            'icon_class' => 'passthrough',
            'is_active' => 'raw',
            'display_order' => 'raw',
        ], 'PIX');
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array{status:int, body:array<string, mixed>}
     */
    public function updatePdf(string $userId, string $itemId, array $body): array
    {
        return $this->updateTyped($userId, $itemId, ['pdf', 'pdf_embed'], $body, [
            'title' => 'passthrough',
            'pdf_url' => 'optional_passthrough',
            'destination_url' => 'passthrough',
            'is_active' => 'raw',
            'display_order' => 'raw',
        ], 'PDF');
    }

    /**
     * @return array{status:int, body:array<string, mixed>}
     */
    public function duplicate(string $userId, string $itemId): array
    {
        if (!ctype_digit($itemId) || (int) $itemId < 1) {
            return ['status' => 400, 'body' => ['message' => 'ID do item inválido.']];
        }
        $sourceId = (int) $itemId;
        $src = DB::selectOne('SELECT * FROM profile_items WHERE id = ? AND user_id = ? LIMIT 1', [$sourceId, $userId]);
        if (!$src) {
            return ['status' => 404, 'body' => ['message' => 'Item não encontrado ou sem permissão.']];
        }
        $item = (array) $src;
        $type = (string) ($item['item_type'] ?? '');

        try {
            $next = DB::selectOne(
                'SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order FROM profile_items WHERE user_id = ?',
                [$userId]
            );
            $displayOrder = (int) ($next->next_order ?? 0);
            $copyCandidates = [
                'user_id', 'item_type', 'title', 'destination_url', 'image_url', 'icon_class', 'is_active',
                'logo_size', 'pix_key', 'recipient_name', 'pix_amount', 'pix_description', 'pdf_url',
                'whatsapp_message', 'aspect_ratio',
            ];
            $cols = $this->columns();
            $colNames = ['display_order'];
            $vals = [$displayOrder];
            foreach ($copyCandidates as $c) {
                if (in_array($c, $cols, true)) {
                    $colNames[] = $c;
                    $vals[] = $item[$c] ?? null;
                }
            }
            $ph = implode(',', array_fill(0, count($vals), '?'));
            $new = DB::selectOne(
                'INSERT INTO profile_items ('.implode(',', $colNames).") VALUES ($ph) RETURNING *",
                $vals
            );
            $newItem = (array) $new;
            $newId = (int) $newItem['id'];

            if ($type === 'sales_page') {
                $this->duplicateSalesPage($sourceId, $newId);
            }
            if ($type === 'digital_form') {
                $this->duplicateDigitalForm($sourceId, $newId);
                $hasGl = DB::selectOne('SELECT 1 AS ok FROM guest_list_items WHERE profile_item_id = ? LIMIT 1', [$sourceId]);
                if ($hasGl) {
                    $this->duplicateGuestList($sourceId, $newId);
                }
            }
            if ($type === 'guest_list') {
                $this->duplicateGuestList($sourceId, $newId);
            }

            return ['status' => 201, 'body' => $newItem];
        } catch (\Throwable $e) {
            Log::error('profile.items.duplicate', ['error' => $e->getMessage()]);

            return ['status' => 500, 'body' => ['message' => 'Erro ao duplicar item.']];
        }
    }

    /**
     * @param  list<string>  $types
     * @param  array<string, mixed>  $body
     * @param  array<string, string>  $fieldMap
     * @return array{status:int, body:array<string, mixed>}
     */
    private function updateTyped(string $userId, string $itemId, array $types, array $body, array $fieldMap, string $label): array
    {
        if (!ctype_digit($itemId) || (int) $itemId < 1) {
            return ['status' => 400, 'body' => ['message' => 'ID do item inválido.']];
        }
        $id = (int) $itemId;
        $placeholders = implode(',', array_fill(0, count($types), '?'));
        $check = DB::selectOne(
            "SELECT * FROM profile_items WHERE id = ? AND user_id = ? AND item_type IN ($placeholders) LIMIT 1",
            array_merge([$id, $userId], $types)
        );
        if (!$check) {
            return [
                'status' => 404,
                'body' => ['message' => "{$label} não encontrado ou você não tem permissão para editá-lo."],
            ];
        }

        $cols = $this->columns();
        $sets = [];
        $vals = [];

        foreach ($fieldMap as $field => $mode) {
            if (!array_key_exists($field, $body)) {
                continue;
            }
            $optional = str_starts_with($mode, 'optional_') || $mode === 'logo_fit';
            if ($optional && !in_array($field, $cols, true)) {
                continue;
            }
            $raw = $body[$field];
            $value = match ($mode) {
                'nullable_string' => ($raw !== null && trim((string) $raw) !== '') ? trim((string) $raw) : null,
                'optional_string' => ($raw !== null && trim((string) $raw) !== '') ? trim((string) $raw) : null,
                'passthrough', 'optional_passthrough' => $raw ?: null,
                'bool' => $raw === true || $raw === 'true' || $raw === 1 || $raw === '1',
                'int_keep' => (is_numeric($raw) ? (int) $raw : null),
                'optional_float' => ($raw !== null && $raw !== '' ? (float) $raw : null),
                'logo_fit' => in_array((string) ($raw ?: 'contain'), ['contain', 'cover'], true)
                    ? (string) ($raw ?: 'contain')
                    : 'contain',
                'raw' => $raw,
                default => $raw,
            };
            if ($mode === 'int_keep' && $value === null) {
                continue;
            }
            $sets[] = "$field = ?";
            $vals[] = $value;
        }

        if ($sets === []) {
            return ['status' => 400, 'body' => ['message' => 'Nenhum campo para atualizar.']];
        }

        $vals[] = $id;
        $vals[] = $userId;
        $row = DB::selectOne(
            'UPDATE profile_items SET '.implode(', ', $sets).' WHERE id = ? AND user_id = ? RETURNING *',
            $vals
        );
        if (!$row) {
            return ['status' => 404, 'body' => ['message' => "{$label} não encontrado ou não foi atualizado."]];
        }
        CartaoPublicService::forgetCardCache($userId);

        return ['status' => 200, 'body' => (array) $row];
    }

    private function duplicateSalesPage(int $sourceId, int $newId): void
    {
        $sp = DB::selectOne('SELECT * FROM sales_pages WHERE profile_item_id = ? LIMIT 1', [$sourceId]);
        if (!$sp) {
            return;
        }
        $s = (array) $sp;
        $slug = ($s['slug'] ?? 'loja').'-copia-'.Str::lower(Str::random(8));
        $newSp = DB::selectOne(
            'INSERT INTO sales_pages
                (profile_item_id, slug, store_title, store_description, button_text, button_logo_url, theme,
                 background_color, text_color, button_color, button_text_color, background_image_url,
                 whatsapp_number, meta_title, meta_description, meta_image_url, preview_token, status)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id',
            [
                $newId,
                $slug,
                ($s['store_title'] ?? '').' (cópia)',
                $s['store_description'] ?? null,
                $s['button_text'] ?? null,
                $s['button_logo_url'] ?? null,
                $s['theme'] ?? 'dark',
                $s['background_color'] ?? null,
                $s['text_color'] ?? null,
                $s['button_color'] ?? null,
                $s['button_text_color'] ?? null,
                $s['background_image_url'] ?? null,
                $s['whatsapp_number'] ?? null,
                $s['meta_title'] ?? null,
                $s['meta_description'] ?? null,
                $s['meta_image_url'] ?? null,
                bin2hex(random_bytes(32)),
                'DRAFT',
            ]
        );
        $newSpId = (int) ($newSp->id ?? 0);
        $prods = DB::select('SELECT * FROM sales_page_products WHERE sales_page_id = ? ORDER BY display_order', [$s['id']]);
        foreach ($prods as $p) {
            $row = (array) $p;
            DB::insert(
                'INSERT INTO sales_page_products
                    (sales_page_id, name, description, price, compare_price, stock, variations, image_url,
                     display_order, status, badge, youtube_video_url)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
                [
                    $newSpId,
                    $row['name'] ?? null,
                    $row['description'] ?? null,
                    $row['price'] ?? null,
                    $row['compare_price'] ?? null,
                    $row['stock'] ?? null,
                    $row['variations'] ?? null,
                    $row['image_url'] ?? null,
                    $row['display_order'] ?? 0,
                    $row['status'] ?? null,
                    $row['badge'] ?? null,
                    $row['youtube_video_url'] ?? null,
                ]
            );
        }
    }

    public function copyDigitalFormTo(int $sourceId, int $newId, string $titleSuffix = ' (cópia)'): void
    {
        $this->duplicateDigitalForm($sourceId, $newId, $titleSuffix);
    }

    public function copyGuestListTo(int $sourceId, int $newId, string $titleSuffix = ' (cópia)'): void
    {
        $this->duplicateGuestList($sourceId, $newId, $titleSuffix);
    }

    private function duplicateDigitalForm(int $sourceId, int $newId, string $titleSuffix = ' (cópia)'): void
    {
        $df = DB::selectOne(
            'SELECT * FROM digital_form_items WHERE profile_item_id = ?
             ORDER BY COALESCE(updated_at, \'1970-01-01\'::timestamp) DESC, id DESC LIMIT 1',
            [$sourceId]
        );
        if (!$df) {
            return;
        }
        $src = (array) $df;
        $dfCols = $this->tableColumns('digital_form_items');
        $skip = ['id', 'profile_item_id', 'created_at', 'updated_at'];
        $cols = ['profile_item_id'];
        $vals = [$newId];
        foreach ($dfCols as $c) {
            if (in_array($c, $skip, true)) {
                continue;
            }
            $cols[] = $c;
            $v = $src[$c] ?? null;
            if ($c === 'form_title' && is_string($v) && $titleSuffix !== '') {
                $v = $v.$titleSuffix;
            }
            if ($c === 'form_fields' && (is_array($v) || is_object($v))) {
                $v = json_encode($v, JSON_UNESCAPED_UNICODE);
            }
            $vals[] = $v;
        }
        $ph = [];
        foreach ($cols as $i => $c) {
            $ph[] = ($c === 'form_fields') ? '?::jsonb' : '?';
        }
        DB::insert(
            'INSERT INTO digital_form_items ('.implode(',', $cols).') VALUES ('.implode(',', $ph).')',
            $vals
        );
    }

    private function duplicateGuestList(int $sourceId, int $newId, string $titleSuffix = ' (cópia)'): void
    {
        $gl = DB::selectOne(
            'SELECT * FROM guest_list_items WHERE profile_item_id = ?
             ORDER BY COALESCE(updated_at, \'1970-01-01\'::timestamp) DESC, id DESC LIMIT 1',
            [$sourceId]
        );
        if (!$gl) {
            return;
        }
        $src = (array) $gl;
        $glCols = $this->tableColumns('guest_list_items');
        $skip = ['id', 'profile_item_id', 'created_at', 'updated_at'];
        $cols = ['profile_item_id'];
        $vals = [$newId];
        foreach ($glCols as $c) {
            if (in_array($c, $skip, true)) {
                continue;
            }
            $cols[] = $c;
            $v = $src[$c] ?? null;
            if (in_array($c, ['registration_token', 'confirmation_token', 'public_view_token'], true)) {
                $v = bin2hex(random_bytes(16));
            }
            if ($c === 'event_title' && is_string($v) && $titleSuffix !== '') {
                $v = $v.$titleSuffix;
            }
            if (str_contains($c, 'fields') || str_contains($c, 'json')) {
                if (is_array($v) || is_object($v)) {
                    $v = json_encode($v, JSON_UNESCAPED_UNICODE);
                }
            }
            $vals[] = $v;
        }
        $ph = implode(',', array_fill(0, count($vals), '?'));
        try {
            DB::insert('INSERT INTO guest_list_items ('.implode(',', $cols).") VALUES ($ph)", $vals);
        } catch (\Throwable $e) {
            Log::warning('profile.items.duplicateGuestList', ['error' => $e->getMessage()]);
            DB::insert(
                'INSERT INTO guest_list_items
                    (profile_item_id, event_title, require_confirmation, allow_self_registration, registration_token, confirmation_token)
                 VALUES (?, ?, true, true, ?, ?)',
                [
                    $newId,
                    ($src['event_title'] ?? 'Lista').$titleSuffix,
                    bin2hex(random_bytes(16)),
                    bin2hex(random_bytes(16)),
                ]
            );
        }
    }

    /**
     * @return array{status:int, body:array<string, mixed>}
     */
    public function repairSalesPages(string $userId): array
    {
        try {
            $orphans = DB::select(
                'SELECT pi.id, pi.title, pi.image_url
                 FROM profile_items pi
                 LEFT JOIN sales_pages sp ON pi.id = sp.profile_item_id
                 WHERE pi.user_id = ? AND pi.item_type = \'sales_page\' AND sp.id IS NULL',
                [$userId]
            );
            if ($orphans === []) {
                return [
                    'status' => 200,
                    'body' => [
                        'success' => true,
                        'message' => 'Todos os itens sales_page já têm sales_page associada',
                        'created' => 0,
                        'total' => 0,
                    ],
                ];
            }
            $created = 0;
            $errors = [];
            foreach ($orphans as $item) {
                try {
                    $base = Str::slug((string) ($item->title ?: 'loja')) ?: 'loja';
                    $slug = $base;
                    $n = 0;
                    while (DB::selectOne('SELECT id FROM sales_pages WHERE slug = ? LIMIT 1', [$slug])) {
                        $n++;
                        $slug = $base.'-'.$n;
                    }
                    DB::insert(
                        'INSERT INTO sales_pages
                            (profile_item_id, store_title, button_text, button_logo_url, whatsapp_number,
                             theme, status, preview_token, slug)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [
                            $item->id,
                            $item->title ?: 'Minha Loja',
                            $item->title ?: 'Minha Loja',
                            $item->image_url ?: null,
                            '',
                            'dark',
                            'DRAFT',
                            bin2hex(random_bytes(32)),
                            $slug,
                        ]
                    );
                    $created++;
                } catch (\Throwable $e) {
                    $errors[] = ['itemId' => $item->id, 'error' => $e->getMessage()];
                }
            }

            return [
                'status' => 200,
                'body' => [
                    'success' => true,
                    'message' => "Reparo concluído. {$created} sales_page(s) criada(s)",
                    'created' => $created,
                    'total' => count($orphans),
                    'errors' => $errors !== [] ? $errors : null,
                ],
            ];
        } catch (\Throwable $e) {
            Log::error('profile.repairSalesPages', ['error' => $e->getMessage()]);

            return [
                'status' => 500,
                'body' => [
                    'success' => false,
                    'error' => 'Erro ao reparar sales_pages',
                    'message' => $e->getMessage(),
                ],
            ];
        }
    }

    /**
     * @return list<string>
     */
    private function columns(): array
    {
        if (self::$columns !== null) {
            return self::$columns;
        }
        self::$columns = $this->tableColumns('profile_items');

        return self::$columns;
    }

    /**
     * @return list<string>
     */
    private function tableColumns(string $table): array
    {
        $rows = DB::select(
            'SELECT column_name FROM information_schema.columns
             WHERE table_schema = \'public\' AND table_name = ?',
            [$table]
        );

        return array_map(static fn ($r) => (string) $r->column_name, $rows);
    }
}
