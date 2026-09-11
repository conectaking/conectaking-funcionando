<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use App\Support\PlanCodeResolver;
use App\Support\SafeIconClass;

class ProfileItemsService
{
    private const REMOVED = ['agenda', 'contract', 'photographer_site', 'kingbrief', 'king_bolao'];

    private const OPTIONAL = [
        'pix_key', 'recipient_name', 'pix_amount', 'pix_description',
        'pdf_url', 'logo_size', 'whatsapp_message', 'aspect_ratio', 'logo_fit_mode',
    ];

    /** @var list<string>|null */
    private static ?array $columns = null;

    /**
     * @return list<array<string, mixed>>
     */
    public function list(string $userId): array
    {
        $rows = DB::select(
            'SELECT * FROM profile_items WHERE user_id = ? ORDER BY display_order ASC',
            [$userId]
        );

        return array_map(static fn ($r) => (array) $r, $rows);
    }

    /**
     * @return array{status:int, body:array<string, mixed>}
     */
    public function getById(string $userId, string $itemId): array
    {
        if (!ctype_digit($itemId) || (int) $itemId < 1) {
            return ['status' => 400, 'body' => ['success' => false, 'error' => 'ID do item inválido.']];
        }
        $id = (int) $itemId;
        $check = DB::selectOne('SELECT id, user_id, item_type FROM profile_items WHERE id = ? LIMIT 1', [$id]);
        if (!$check) {
            return ['status' => 404, 'body' => ['success' => false, 'error' => 'Item não encontrado.']];
        }
        if ((string) $check->user_id !== $userId) {
            return ['status' => 403, 'body' => ['success' => false, 'error' => 'Você não tem permissão para acessar este item.']];
        }
        $item = DB::selectOne('SELECT * FROM profile_items WHERE id = ? AND user_id = ? LIMIT 1', [$id, $userId]);
        $data = (array) $item;
        $data['profile_id'] = $userId;
        $type = (string) ($data['item_type'] ?? '');
        if ($type === 'digital_form') {
            $df = DB::selectOne(
                'SELECT * FROM digital_form_items WHERE profile_item_id = ?
                 ORDER BY COALESCE(updated_at, \'1970-01-01\'::timestamp) DESC, id DESC LIMIT 1',
                [$id]
            );
            $form = $df ? (array) $df : ['form_fields' => []];
            if (isset($form['form_fields']) && is_string($form['form_fields'])) {
                $parsed = json_decode($form['form_fields'], true);
                $form['form_fields'] = is_array($parsed) ? $parsed : [];
            }
            $data['digital_form_data'] = $form;
        }
        if ($type === 'guest_list') {
            $gl = DB::selectOne(
                'SELECT * FROM guest_list_items WHERE profile_item_id = ?
                 ORDER BY COALESCE(updated_at, \'1970-01-01\'::timestamp) DESC, id DESC LIMIT 1',
                [$id]
            );
            $data['guest_list_data'] = $gl ? (array) $gl : [];
        }

        return ['status' => 200, 'body' => ['success' => true, 'data' => $data]];
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array{status:int, body:array<string, mixed>}
     */
    public function create(string $userId, array $body): array
    {
        $type = trim((string) ($body['item_type'] ?? ''));
        if ($type === '') {
            return ['status' => 400, 'body' => ['message' => 'Tipo de item é obrigatório.']];
        }
        if (in_array($type, self::REMOVED, true)) {
            return ['status' => 410, 'body' => ['message' => 'Este módulo foi removido do Conecta King.']];
        }

        $limit = $this->checkLinkLimit($userId, $type);
        if (!$limit['allowed']) {
            return [
                'status' => 403,
                'body' => [
                    'error' => 'LIMIT_EXCEEDED',
                    'message' => $limit['message'],
                    'current' => $limit['current'],
                    'limit' => $limit['limit'],
                ],
            ];
        }

        try {
            $next = DB::selectOne(
                'SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order FROM profile_items WHERE user_id = ?',
                [$userId]
            );
            $nextOrder = (int) ($next->next_order ?? 0);
            $cols = $this->columns();

            $fields = ['user_id', 'item_type', 'display_order', 'is_active'];
            $vals = [$userId, $type, $nextOrder, true];

            $title = $body['title'] ?? null;
            if ($title !== null || $type === 'product_catalog') {
                $fields[] = 'title';
                $vals[] = $title ?: ($type === 'product_catalog' ? 'Catálogo de Produtos' : null);
            }
            foreach (['destination_url', 'image_url', 'icon_class'] as $f) {
                if (array_key_exists($f, $body)) {
                    $fields[] = $f;
                    $val = $body[$f] ?: null;
                    if ($f === 'icon_class' && $val !== null) {
                        $val = SafeIconClass::sanitize((string) $val);
                    }
                    $vals[] = $val;
                }
            }
            foreach (self::OPTIONAL as $f) {
                if (in_array($f, $cols, true) && array_key_exists($f, $body)) {
                    $fields[] = $f;
                    $vals[] = $body[$f] ?: null;
                }
            }

            $ph = implode(',', array_fill(0, count($vals), '?'));
            $row = DB::selectOne(
                'INSERT INTO profile_items ('.implode(',', $fields).") VALUES ($ph) RETURNING *",
                $vals
            );
            $item = (array) $row;
            $this->afterCreate((int) $item['id'], $type, $body);
            CartaoPublicService::forgetCardCache($userId);

            return ['status' => 201, 'body' => $item];
        } catch (\Throwable $e) {
            Log::error('profile.items.create', ['error' => $e->getMessage()]);
            $msg = 'Erro ao criar item.';
            if (str_contains($e->getMessage(), 'invalid input value for enum') || ($e->getCode() === '22P02')) {
                $msg = 'Erro ao criar item: o banco de dados ainda não foi atualizado para este tipo de módulo.';
            }

            return ['status' => 500, 'body' => ['message' => $msg]];
        }
    }

    /**
     * @param  array<string, mixed>  $updates
     * @return array{status:int, body:array<string, mixed>}
     */
    public function update(string $userId, string $itemId, array $updates): array
    {
        if (!ctype_digit($itemId) || (int) $itemId < 1) {
            return ['status' => 400, 'body' => ['message' => 'ID do item inválido.']];
        }
        $id = (int) $itemId;
        $check = DB::selectOne('SELECT id FROM profile_items WHERE id = ? AND user_id = ? LIMIT 1', [$id, $userId]);
        if (!$check) {
            return ['status' => 404, 'body' => ['message' => 'Item não encontrado ou você não tem permissão para editá-lo.']];
        }

        $cols = $this->columns();
        $sets = [];
        $vals = [];
        foreach (['title', 'destination_url', 'image_url', 'icon_class', 'display_order', 'is_active'] as $f) {
            if (array_key_exists($f, $updates)) {
                $sets[] = "$f = ?";
                $val = $updates[$f];
                if ($f === 'icon_class' && $val !== null && $val !== '') {
                    $val = SafeIconClass::sanitize((string) $val);
                }
                $vals[] = $val;
            }
        }
        foreach (self::OPTIONAL as $f) {
            if (in_array($f, $cols, true) && array_key_exists($f, $updates)) {
                $sets[] = "$f = ?";
                $vals[] = $updates[$f];
            }
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
        CartaoPublicService::forgetCardCache($userId);

        return ['status' => 200, 'body' => (array) $row];
    }

    /**
     * @return array{status:int, body:array<string, mixed>}
     */
    public function delete(string $userId, string $itemId): array
    {
        if (!ctype_digit($itemId) || (int) $itemId < 1) {
            return ['status' => 400, 'body' => ['message' => 'ID do item inválido.']];
        }
        $id = (int) $itemId;
        $row = DB::selectOne('SELECT * FROM profile_items WHERE id = ? AND user_id = ? LIMIT 1', [$id, $userId]);
        if (!$row) {
            return ['status' => 404, 'body' => ['message' => 'Item não encontrado ou você não tem permissão para removê-lo.']];
        }
        $type = (string) ($row->item_type ?? '');

        try {
            if ($type === 'product_catalog') {
                DB::delete('DELETE FROM product_catalog_items WHERE profile_item_id = ?', [$id]);
            }
            if ($type === 'sales_page') {
                DB::delete('DELETE FROM sales_pages WHERE profile_item_id = ?', [$id]);
            }
            if ($type === 'digital_form') {
                try {
                    DB::delete('DELETE FROM digital_form_responses WHERE profile_item_id = ?', [$id]);
                } catch (\Throwable $e) {
                    // tabela pode não existir em ambientes antigos
                }
                DB::delete('DELETE FROM digital_form_items WHERE profile_item_id = ?', [$id]);
            }
            if ($type === 'guest_list' || $type === 'digital_form') {
                try {
                    $gli = DB::selectOne('SELECT id FROM guest_list_items WHERE profile_item_id = ? LIMIT 1', [$id]);
                    if ($gli && ! empty($gli->id)) {
                        $gliId = (int) $gli->id;
                        try {
                            DB::delete('DELETE FROM cadastro_links WHERE guest_list_item_id = ?', [$gliId]);
                        } catch (\Throwable $e) {
                        }
                        try {
                            DB::delete('DELETE FROM guests WHERE guest_list_id = ?', [$gliId]);
                        } catch (\Throwable $e) {
                        }
                        DB::delete('DELETE FROM guest_list_items WHERE id = ?', [$gliId]);
                    }
                } catch (\Throwable $e) {
                }
            }
            if ($type === 'bible') {
                try {
                    DB::delete('DELETE FROM bible_items WHERE profile_item_id = ?', [$id]);
                } catch (\Throwable $e) {
                }
            }
            if ($type === 'location') {
                try {
                    DB::delete('DELETE FROM location_items WHERE profile_item_id = ?', [$id]);
                } catch (\Throwable $e) {
                }
            }
            DB::delete('DELETE FROM profile_items WHERE id = ? AND user_id = ?', [$id, $userId]);
            CartaoPublicService::forgetCardCache($userId);

            return ['status' => 200, 'body' => ['message' => 'Item removido com sucesso!']];
        } catch (\Throwable $e) {
            Log::error('profile.items.delete', ['error' => $e->getMessage()]);

            return ['status' => 500, 'body' => ['message' => 'Erro ao deletar item.']];
        }
    }

    /**
     * @param  array<string, mixed>  $body
     */
    private function afterCreate(int $itemId, string $type, array $body): void
    {
        $title = $body['title'] ?? null;
        try {
            if ($type === 'sales_page') {
                $base = Str::slug((string) ($title ?: 'loja')) ?: 'loja';
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
                        $itemId,
                        $title ?: 'Minha Loja',
                        $title ?: 'Minha Loja',
                        $body['image_url'] ?? null,
                        (string) ($body['whatsapp_number'] ?? ''),
                        'dark',
                        'PUBLISHED',
                        bin2hex(random_bytes(32)),
                        $slug,
                    ]
                );
            }
            if ($type === 'digital_form') {
                DB::insert(
                    'INSERT INTO digital_form_items (profile_item_id, form_title, display_format) VALUES (?, ?, ?)',
                    [$itemId, $title ?: 'Formulário King', 'button']
                );
            }
            if ($type === 'guest_list') {
                DB::insert(
                    'INSERT INTO guest_list_items
                        (profile_item_id, event_title, require_confirmation, allow_self_registration, registration_token, confirmation_token)
                     VALUES (?, ?, true, true, ?, ?)',
                    [$itemId, $title ?: 'Lista de Convidados', bin2hex(random_bytes(16)), bin2hex(random_bytes(16))]
                );
            }
            if ($type === 'bible') {
                DB::insert(
                    'INSERT INTO bible_items (profile_item_id, translation_code, is_visible) VALUES (?, \'nvi\', true)',
                    [$itemId]
                );
            }
            if ($type === 'location') {
                DB::insert('INSERT INTO location_items (profile_item_id) VALUES (?)', [$itemId]);
            }
        } catch (\Throwable $e) {
            Log::warning('profile.items.afterCreate', ['type' => $type, 'error' => $e->getMessage()]);
        }
    }

    /**
     * @return array{allowed:bool,current:int,limit:mixed,message:string}
     */
    private function checkLinkLimit(string $userId, string $moduleType): array
    {
        try {
            $u = DB::selectOne(
                'SELECT u.account_type, u.subscription_id, u.subscription_status, sp.plan_code, sp.is_active
                 FROM users u
                 LEFT JOIN subscription_plans sp ON u.subscription_id = sp.id::text
                 WHERE u.id = ? LIMIT 1',
                [$userId]
            );
            if (! $u) {
                return ['allowed' => true, 'current' => 0, 'limit' => null, 'message' => 'ok'];
            }
            $subStatus = strtolower((string) ($u->subscription_status ?? ''));
            $subExpired = in_array($subStatus, ['expired', 'cancelled', 'canceled', 'inactive'], true);
            $planCode = null;
            if (! empty($u->subscription_id) && ! $subExpired && filter_var($u->is_active ?? true, FILTER_VALIDATE_BOOLEAN)) {
                $planCode = PlanCodeResolver::normalize((string) ($u->plan_code ?? ''));
            }
            if (! $planCode) {
                $planCode = $subExpired
                    ? 'free'
                    : PlanCodeResolver::fromAccountType((string) ($u->account_type ?? ''));
            }
            if ($planCode === '') {
                return ['allowed' => true, 'current' => 0, 'limit' => null, 'message' => 'ok'];
            }
            $lim = DB::selectOne(
                'SELECT max_links FROM module_link_limits WHERE module_type = ? AND plan_code = ? LIMIT 1',
                [$moduleType, $planCode]
            );
            if (!$lim || $lim->max_links === null) {
                return ['allowed' => true, 'current' => 0, 'limit' => null, 'message' => 'ok'];
            }
            $max = (int) $lim->max_links;
            $cnt = DB::selectOne(
                'SELECT COUNT(*)::int AS c FROM profile_items WHERE user_id = ? AND item_type = ?',
                [$userId, $moduleType]
            );
            $current = (int) ($cnt->c ?? 0);
            if ($current >= $max) {
                return [
                    'allowed' => false,
                    'current' => $current,
                    'limit' => $max,
                    'message' => "Você atingiu o limite de {$max} links do tipo {$moduleType} no seu plano atual.",
                ];
            }

            return ['allowed' => true, 'current' => $current, 'limit' => $max, 'message' => 'ok'];
        } catch (\Throwable $e) {
            Log::warning('profile.items.limit', ['error' => $e->getMessage()]);

            return ['allowed' => true, 'current' => 0, 'limit' => null, 'message' => 'ok'];
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
        $rows = DB::select(
            "SELECT column_name FROM information_schema.columns
             WHERE table_schema='public' AND table_name='profile_items'"
        );
        self::$columns = array_map(static fn ($r) => (string) $r->column_name, $rows);

        return self::$columns;
    }
}
