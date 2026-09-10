<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Admin guest-lists (read/write) — paridade com routes/guestList.routes.js.
 */
class GuestListAdminService
{
    /**
     * @return array{status:int, body:mixed}
     */
    public function index(string $userId): array
    {
        $rows = DB::select(
            "SELECT
                pi.id as profile_item_id,
                pi.user_id,
                pi.item_type,
                pi.title,
                pi.is_active,
                pi.display_order,
                pi.created_at as profile_created_at,
                gli.id as guest_list_item_id,
                gli.event_title,
                gli.event_description,
                gli.event_date,
                gli.event_location,
                gli.registration_token,
                gli.confirmation_token,
                gli.max_guests,
                gli.allow_self_registration,
                gli.require_confirmation,
                gli.custom_form_fields,
                gli.use_custom_form,
                gli.public_view_token,
                gli.portaria_slug,
                gli.cadastro_slug,
                gli.cadastro_description,
                gli.cadastro_expires_at,
                gli.cadastro_max_uses,
                gli.cadastro_current_uses,
                COALESCE(gli.primary_color, '#FFC700') as primary_color,
                COALESCE(gli.text_color, '#ECECEC') as text_color,
                COALESCE(gli.background_color, '#0D0D0F') as background_color,
                gli.secondary_color,
                gli.header_image_url,
                gli.background_image_url,
                COALESCE(gli.background_opacity, 1.0) as background_opacity,
                COALESCE(gli.theme, 'dark') as theme,
                COUNT(DISTINCT g.id) FILTER (WHERE g.status = 'registered') as registered_count,
                COUNT(DISTINCT g.id) FILTER (WHERE g.status = 'confirmed') as confirmed_count,
                COUNT(DISTINCT g.id) FILTER (WHERE g.status = 'checked_in') as checked_in_count
             FROM profile_items pi
             INNER JOIN guest_list_items gli ON gli.profile_item_id = pi.id
             LEFT JOIN guests g ON g.guest_list_id = gli.id
             WHERE pi.user_id = ? AND pi.is_active = true
             GROUP BY pi.id, pi.user_id, pi.item_type, pi.title, pi.is_active, pi.display_order,
                      pi.created_at, gli.id, gli.event_title, gli.event_description,
                      gli.event_date, gli.event_location, gli.registration_token, gli.confirmation_token,
                      gli.max_guests, gli.allow_self_registration, gli.require_confirmation,
                      gli.custom_form_fields, gli.use_custom_form, gli.public_view_token,
                      gli.portaria_slug, gli.cadastro_slug, gli.cadastro_description,
                      gli.cadastro_expires_at, gli.cadastro_max_uses, gli.cadastro_current_uses,
                      gli.primary_color, gli.text_color, gli.background_color, gli.secondary_color,
                      gli.header_image_url, gli.background_image_url, gli.background_opacity, gli.theme
             ORDER BY pi.display_order ASC, pi.created_at DESC",
            [$userId]
        );
        $lists = array_map(static function ($row) {
            $arr = (array) $row;
            $arr['id'] = (int) $row->profile_item_id;

            return $arr;
        }, $rows);

        return ['status' => 200, 'body' => $lists];
    }

    /**
     * @return array{status:int, body:mixed}
     */
    public function show(string $userId, int $listId): array
    {
        if ($listId < 1) {
            return ['status' => 400, 'body' => ['message' => 'ID da lista inválido']];
        }
        $profile = DB::selectOne(
            'SELECT id, item_type, title, user_id FROM profile_items WHERE id = ? AND user_id = ? LIMIT 1',
            [$listId, $userId]
        );
        $resolvedId = $listId;
        if (! $profile) {
            $byGli = DB::selectOne(
                'SELECT pi.id FROM guest_list_items gli
                 INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
                 WHERE gli.id = ? AND pi.user_id = ? LIMIT 1',
                [$listId, $userId]
            );
            if (! $byGli) {
                return ['status' => 404, 'body' => [
                    'message' => 'Item não encontrado ou você não tem permissão para acessá-lo',
                    'code' => 'PROFILE_ITEM_NOT_FOUND',
                ]];
            }
            $resolvedId = (int) $byGli->id;
            $profile = DB::selectOne(
                'SELECT id, item_type, title, user_id FROM profile_items WHERE id = ? AND user_id = ? LIMIT 1',
                [$resolvedId, $userId]
            );
        }

        $gli = DB::selectOne(
            'SELECT id FROM guest_list_items WHERE profile_item_id = ? LIMIT 1',
            [$resolvedId]
        );
        if (! $gli) {
            $this->ensureGuestListItem($resolvedId, (string) ($profile->title ?? 'Lista de Convidados'));
        }

        $extra = $this->optionalGliColumns();
        $select = $this->baseSelectFields($extra);
        $row = DB::selectOne(
            "SELECT {$select}
             FROM profile_items pi
             INNER JOIN guest_list_items gli ON gli.profile_item_id = pi.id
             WHERE pi.id = ? AND pi.user_id = ?
             LIMIT 1",
            [$resolvedId, $userId]
        );
        if (! $row) {
            return ['status' => 404, 'body' => [
                'message' => 'Lista de convidados não encontrada. Certifique-se de que o item foi convertido para lista de convidados.',
                'code' => 'GUEST_LIST_NOT_FOUND',
            ]];
        }
        $data = (array) $row;
        $data['id'] = (int) $row->profile_item_id;

        return ['status' => 200, 'body' => $data];
    }

    /**
     * @param  array<string,mixed>  $query
     * @return array{status:int, body:mixed}
     */
    /**
     * Exportação "PDF" — paridade com Node: JSON com convidados (PDF real nunca foi implementado).
     *
     * @param  array<string,mixed>  $query
     * @return array{status:int, body:mixed}
     */
    public function exportPdf(string $userId, int $listId, array $query = []): array
    {
        if ($listId < 1) {
            return ['status' => 400, 'body' => ['message' => 'ID da lista inválido']];
        }
        $owned = $this->resolveOwned($userId, $listId, false);
        if ($owned === null) {
            return ['status' => 404, 'body' => ['message' => 'Lista não encontrada']];
        }
        $gliId = (int) $owned['guest_list_item_id'];
        $meta = DB::selectOne(
            'SELECT gli.event_title, pi.title
             FROM guest_list_items gli
             INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
             WHERE gli.id = ? LIMIT 1',
            [$gliId]
        );
        $eventTitle = (string) (($meta->event_title ?? null) ?: ($meta->title ?? 'Lista de Convidados'));

        $sql = 'SELECT * FROM guests WHERE guest_list_id = ?';
        $params = [$gliId];
        $status = isset($query['status']) ? trim((string) $query['status']) : '';
        if ($status !== '') {
            $sql .= ' AND status = ?';
            $params[] = $status;
        }
        $sql .= ' ORDER BY name ASC';
        $guests = array_map(static fn ($r) => (array) $r, DB::select($sql, $params));

        return [
            'status' => 200,
            'body' => [
                'success' => true,
                'event_title' => $eventTitle,
                'total' => count($guests),
                'guests' => $guests,
            ],
        ];
    }

    public function guests(string $userId, int $listId, array $query = []): array
    {
        if ($listId < 1) {
            return ['status' => 400, 'body' => ['message' => 'ID da lista inválido']];
        }
        $gliId = $this->resolveGliId($userId, $listId, true);
        if ($gliId === null) {
            return ['status' => 404, 'body' => [
                'message' => 'Item não encontrado ou você não tem permissão para acessá-lo',
                'code' => 'PROFILE_ITEM_NOT_FOUND',
            ]];
        }
        if ($gliId === 0) {
            return ['status' => 200, 'body' => [
                'guests' => [],
                'total' => 0,
                'limit' => 100,
                'offset' => 0,
                'hasMore' => false,
            ]];
        }

        $limit = isset($query['limit']) && is_numeric($query['limit']) ? (int) $query['limit'] : 100;
        $offset = isset($query['offset']) && is_numeric($query['offset']) ? (int) $query['offset'] : 0;
        $limit = max(1, min(500, $limit));
        $offset = max(0, $offset);

        $where = 'guest_list_id = ?';
        $params = [$gliId];

        $status = isset($query['status']) ? trim((string) $query['status']) : '';
        if ($status !== '') {
            $where .= ' AND status = ?';
            $params[] = $status;
        }

        $hasEntryMode = Schema::hasColumn('guests', 'entry_mode');
        $listMode = strtolower(trim((string) ($query['mode'] ?? 'checkin')));
        $entryClause = '';
        if ($hasEntryMode) {
            if ($listMode === 'checkin') {
                $entryClause = " AND COALESCE(entry_mode, 'checkin') = 'checkin'";
            } elseif ($listMode === 'lead') {
                $entryClause = " AND COALESCE(entry_mode, 'checkin') = 'lead'";
            }
        }
        $whereWithEntry = $where.$entryClause;

        $search = isset($query['search']) ? trim((string) $query['search']) : '';
        $searchClause = '';
        $searchParams = [];
        if ($search !== '') {
            $term = '%'.$search.'%';
            $searchClause = ' AND (name ILIKE ? OR COALESCE(email, \'\') ILIKE ? OR COALESCE(phone, \'\') ILIKE ?
                      OR COALESCE(whatsapp, \'\') ILIKE ? OR COALESCE(document, \'\') ILIKE ?
                      OR COALESCE(instagram, \'\') ILIKE ?)';
            $searchParams = [$term, $term, $term, $term, $term, $term];
        }

        $countSql = "SELECT COUNT(*)::int AS total FROM guests WHERE {$whereWithEntry}{$searchClause}";
        $sql = 'SELECT id, guest_list_id, name, email, phone, whatsapp, document,
                       address, neighborhood, city, state, zipcode, instagram,
                       status, registration_source, confirmed_at, confirmed_by,
                       checked_in_at, checked_in_by, notes, custom_responses,
                       created_at, updated_at
                FROM guests WHERE '.$whereWithEntry.$searchClause.' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        $listParams = array_merge($params, $searchParams);

        try {
            $total = (int) (DB::selectOne($countSql, $listParams)->total ?? 0);
            $rows = DB::select($sql, array_merge($listParams, [$limit, $offset]));
        } catch (\Throwable $e) {
            Log::warning('guestList.guests', ['error' => $e->getMessage()]);
            $whereFallback = $where.$searchClause;
            $countSql = "SELECT COUNT(*)::int AS total FROM guests WHERE {$whereFallback}";
            $sql = 'SELECT id, guest_list_id, name, email, phone, whatsapp, document,
                           address, neighborhood, city, state, zipcode, instagram,
                           status, registration_source, confirmed_at, confirmed_by,
                           checked_in_at, checked_in_by, notes, custom_responses,
                           created_at, updated_at
                    FROM guests WHERE '.$whereFallback.' ORDER BY created_at DESC LIMIT ? OFFSET ?';
            $total = (int) (DB::selectOne($countSql, $listParams)->total ?? 0);
            $rows = DB::select($sql, array_merge($listParams, [$limit, $offset]));
        }

        $items = array_map(static fn ($r) => (array) $r, $rows);

        // Contrato: { guests, total, limit, offset, hasMore } — default limit 100, max 500
        return ['status' => 200, 'body' => [
            'guests' => $items,
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
            'hasMore' => ($offset + count($items)) < $total,
        ]];
    }

    /**
     * @return array{status:int, body:mixed}
     */
    public function stats(string $userId, int $listId): array
    {
        if ($listId < 1) {
            return ['status' => 400, 'body' => ['message' => 'ID da lista inválido']];
        }
        $gliId = $this->resolveGliId($userId, $listId, false);
        if (! $gliId) {
            return ['status' => 404, 'body' => ['message' => 'Lista não encontrada']];
        }
        $row = DB::selectOne(
            "SELECT
                COUNT(*) FILTER (WHERE status = 'registered') as registered_count,
                COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_count,
                COUNT(*) FILTER (WHERE status = 'checked_in') as checked_in_count,
                COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
                COUNT(*) as total_count
             FROM guests WHERE guest_list_id = ?",
            [$gliId]
        );

        return ['status' => 200, 'body' => (array) ($row ?: [
            'registered_count' => 0,
            'confirmed_count' => 0,
            'checked_in_count' => 0,
            'cancelled_count' => 0,
            'total_count' => 0,
        ])];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:mixed}
     */
    public function store(string $userId, array $body): array
    {
        try {
            $useExisting = ! empty($body['use_existing_profile_item']) && ! empty($body['profile_item_id']);
            $profileItemId = null;

            if ($useExisting) {
                $pid = (int) $body['profile_item_id'];
                $existing = DB::selectOne(
                    'SELECT id FROM profile_items WHERE id = ? AND user_id = ? LIMIT 1',
                    [$pid, $userId]
                );
                if (! $existing) {
                    return ['status' => 404, 'body' => ['message' => 'Profile item não encontrado']];
                }
                $profileItemId = (int) $existing->id;
                $gli = DB::selectOne(
                    'SELECT id FROM guest_list_items WHERE profile_item_id = ? LIMIT 1',
                    [$profileItemId]
                );
                if ($gli) {
                    return ['status' => 400, 'body' => [
                        'message' => 'Lista de convidados já associada a este formulário',
                        'id' => $profileItemId,
                        'guest_list_item_id' => (int) $gli->id,
                    ]];
                }
            } else {
                $itemTitle = (string) ($body['title'] ?? $body['event_title'] ?? 'Nova Lista de Convidados');
                $next = DB::selectOne(
                    'SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM profile_items WHERE user_id = ?',
                    [$userId]
                );
                $row = DB::selectOne(
                    "INSERT INTO profile_items (user_id, item_type, title, is_active, display_order)
                     VALUES (?, 'guest_list', ?, true, ?) RETURNING id",
                    [$userId, $itemTitle, (int) ($next->next_order ?? 1)]
                );
                $profileItemId = (int) $row->id;
            }

            $customFields = $body['custom_form_fields'] ?? [];
            if (! is_array($customFields)) {
                $customFields = [];
            }
            $useCustom = ($body['use_custom_form'] ?? false) === true;

            $gli = DB::selectOne(
                'INSERT INTO guest_list_items (
                    profile_item_id, event_title, event_description, event_date, event_time,
                    event_location, max_guests, require_confirmation, allow_self_registration,
                    registration_token, confirmation_token, public_view_token,
                    custom_form_fields, use_custom_form,
                    primary_color, text_color, background_color,
                    header_image_url, background_image_url, background_opacity, theme,
                    created_at, updated_at
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?::jsonb, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                 RETURNING *',
                [
                    $profileItemId,
                    $body['event_title'] ?? 'Evento',
                    $body['event_description'] ?? null,
                    $body['event_date'] ?? null,
                    $body['event_time'] ?? null,
                    $body['event_location'] ?? null,
                    $body['max_guests'] ?? null,
                    array_key_exists('require_confirmation', $body) ? $this->boolish($body['require_confirmation']) : true,
                    array_key_exists('allow_self_registration', $body) ? $this->boolish($body['allow_self_registration']) : true,
                    bin2hex(random_bytes(16)),
                    bin2hex(random_bytes(16)),
                    bin2hex(random_bytes(16)),
                    json_encode($customFields, JSON_UNESCAPED_UNICODE),
                    $useCustom,
                    $body['primary_color'] ?? '#4A90E2',
                    $body['text_color'] ?? '#333333',
                    $body['background_color'] ?? '#FFFFFF',
                    $body['header_image_url'] ?? null,
                    $body['background_image_url'] ?? null,
                    isset($body['background_opacity']) ? (float) $body['background_opacity'] : 1.0,
                    $body['theme'] ?? 'light',
                ]
            );

            $gliArr = (array) $gli;
            if ($useExisting) {
                return ['status' => 200, 'body' => [
                    'id' => $profileItemId,
                    'profile_item_id' => $profileItemId,
                    'guest_list_item_id' => (int) $gli->id,
                    'guest_list_data' => $gliArr,
                ]];
            }
            $pi = DB::selectOne('SELECT * FROM profile_items WHERE id = ?', [$profileItemId]);

            return ['status' => 200, 'body' => array_merge((array) $pi, [
                'guest_list_item_id' => (int) $gli->id,
                'guest_list_data' => $gliArr,
            ])];
        } catch (\Throwable $e) {
            Log::error('guestList.store', ['error' => $e->getMessage()]);

            return ['status' => 500, 'body' => ['message' => 'Erro ao criar lista', 'error' => $e->getMessage()]];
        }
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:mixed}
     */
    public function update(string $userId, int $listId, array $body): array
    {
        if ($listId < 1) {
            return ['status' => 400, 'body' => ['message' => 'ID da lista inválido']];
        }
        $owned = $this->resolveOwned($userId, $listId, false);
        if (! $owned) {
            return ['status' => 404, 'body' => ['message' => 'Lista não encontrada']];
        }
        $profileItemId = $owned['profile_item_id'];
        $gliId = $owned['guest_list_item_id'];

        try {
            $piSets = [];
            $piParams = [];
            foreach (['title' => 'title', 'is_active' => 'is_active', 'display_order' => 'display_order'] as $key => $col) {
                if (array_key_exists($key, $body)) {
                    $piSets[] = "{$col} = ?";
                    $piParams[] = $body[$key];
                }
            }
            if ($piSets) {
                $piParams[] = $profileItemId;
                $piParams[] = $userId;
                DB::update(
                    'UPDATE profile_items SET '.implode(', ', $piSets).' WHERE id = ? AND user_id = ?',
                    $piParams
                );
            }

            $gliSets = [];
            $gliParams = [];
            $simple = [
                'event_title', 'event_description', 'event_date', 'event_time', 'event_location',
                'max_guests', 'require_confirmation', 'allow_self_registration', 'use_custom_form',
                'primary_color', 'text_color', 'background_color', 'header_image_url',
                'background_image_url', 'background_opacity', 'theme', 'secondary_color',
            ];
            foreach ($simple as $col) {
                if (! array_key_exists($col, $body)) {
                    continue;
                }
                if (in_array($col, ['secondary_color'], true) && ! Schema::hasColumn('guest_list_items', $col)) {
                    continue;
                }
                $val = $body[$col];
                if (in_array($col, ['event_date', 'event_time', 'event_location', 'max_guests', 'header_image_url', 'background_image_url'], true)) {
                    $val = $val === '' ? null : $val;
                }
                if (in_array($col, ['require_confirmation', 'allow_self_registration', 'use_custom_form'], true)) {
                    $val = $this->boolish($val);
                }
                if ($col === 'background_opacity') {
                    $val = $val !== null ? (float) $val : 1.0;
                }
                if ($col === 'secondary_color') {
                    $val = (is_string($val) && trim($val) !== '' && $val !== 'null' && $val !== 'undefined')
                        ? trim($val) : null;
                }
                $gliSets[] = "{$col} = ?";
                $gliParams[] = $val;
            }
            if (array_key_exists('custom_form_fields', $body)) {
                $gliSets[] = 'custom_form_fields = ?::jsonb';
                $gliParams[] = json_encode($body['custom_form_fields'] ?? [], JSON_UNESCAPED_UNICODE);
            }

            $optionalScalars = [
                'card_color' => fn ($v) => $v ?: '#FFFFFF',
                'decorative_bar_color' => fn ($v) => $v ?: null,
                'separator_line_color' => fn ($v) => $v ?: '#e8eaed',
                'form_logo_url' => fn ($v) => $v ?: null,
                'button_logo_url' => fn ($v) => $v ?: null,
                'button_logo_size' => function ($v) {
                    $n = (int) $v;

                    return ($n >= 20 && $n <= 300) ? $n : 40;
                },
                'show_logo_corner' => fn ($v) => $this->boolish($v),
                'enable_whatsapp' => fn ($v) => $this->boolish($v),
                'enable_guest_list_submit' => fn ($v) => $this->boolish($v),
                'cadastro_description' => fn ($v) => (is_string($v) && trim($v) !== '') ? trim($v) : null,
            ];
            foreach ($optionalScalars as $col => $map) {
                if (! array_key_exists($col, $body) || ! Schema::hasColumn('guest_list_items', $col)) {
                    continue;
                }
                $gliSets[] = "{$col} = ?";
                $gliParams[] = $map($body[$col]);
            }

            foreach (['cadastro_slug', 'portaria_slug'] as $slugCol) {
                if (! array_key_exists($slugCol, $body) || ! Schema::hasColumn('guest_list_items', $slugCol)) {
                    continue;
                }
                $raw = $body[$slugCol];
                if (is_string($raw) && trim($raw) !== '' && ! preg_match('/^[a-z0-9_-]+$/', trim($raw))) {
                    return ['status' => 400, 'body' => [
                        'message' => 'Slug inválido. Use apenas letras minúsculas, números, hífens e underscores.',
                    ]];
                }
                $normalized = (is_string($raw) && trim($raw) !== '') ? strtolower(trim($raw)) : null;
                if ($normalized) {
                    $clash = DB::selectOne(
                        "SELECT id FROM guest_list_items WHERE {$slugCol} = ? AND id != ? LIMIT 1",
                        [$normalized, $gliId]
                    );
                    if ($clash) {
                        return ['status' => 400, 'body' => ['message' => 'Este slug já está em uso. Escolha outro.']];
                    }
                }
                $gliSets[] = "{$slugCol} = ?";
                $gliParams[] = $normalized;
            }

            if (
                Schema::hasColumn('guest_list_items', 'cadastro_expires_at')
                && (
                    array_key_exists('cadastro_expires_at', $body)
                    || array_key_exists('cadastro_expires_in_hours', $body)
                    || array_key_exists('cadastro_expires_in_minutes', $body)
                )
            ) {
                $expiresAt = null;
                if (! empty($body['cadastro_expires_at'])) {
                    $expiresAt = date('c', strtotime((string) $body['cadastro_expires_at']));
                } elseif (isset($body['cadastro_expires_in_hours']) && $body['cadastro_expires_in_hours'] !== null) {
                    $expiresAt = date('c', time() + ((int) $body['cadastro_expires_in_hours'] * 3600));
                } elseif (isset($body['cadastro_expires_in_minutes']) && $body['cadastro_expires_in_minutes'] !== null) {
                    $expiresAt = date('c', time() + ((int) $body['cadastro_expires_in_minutes'] * 60));
                }
                $gliSets[] = 'cadastro_expires_at = ?';
                $gliParams[] = $expiresAt;
            }
            if (array_key_exists('cadastro_max_uses', $body) && Schema::hasColumn('guest_list_items', 'cadastro_max_uses')) {
                $maxUses = $body['cadastro_max_uses'] === null ? 999999 : (int) $body['cadastro_max_uses'];
                $gliSets[] = 'cadastro_max_uses = ?';
                $gliParams[] = $maxUses;
            }

            if ($gliSets) {
                $gliParams[] = $gliId;
                DB::update(
                    'UPDATE guest_list_items SET '.implode(', ', $gliSets).', updated_at = NOW() WHERE id = ?',
                    $gliParams
                );
            }

            $this->syncDigitalFormFromGuestList($profileItemId, $body);

            return $this->show($userId, $profileItemId);
        } catch (\Throwable $e) {
            Log::error('guestList.update', ['error' => $e->getMessage()]);

            return ['status' => 500, 'body' => ['message' => 'Erro ao atualizar lista', 'error' => $e->getMessage()]];
        }
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:mixed}
     */
    public function storeGuest(string $userId, int $listId, array $body): array
    {
        if ($listId < 1) {
            return ['status' => 400, 'body' => ['message' => 'ID da lista inválido']];
        }
        $owned = $this->resolveOwned($userId, $listId, false);
        if (! $owned) {
            return ['status' => 404, 'body' => ['message' => 'Lista não encontrada']];
        }
        $gliId = $owned['guest_list_item_id'];
        $name = trim((string) ($body['name'] ?? ''));
        if ($name === '') {
            return ['status' => 400, 'body' => ['message' => 'Nome é obrigatório']];
        }
        $max = DB::selectOne('SELECT max_guests FROM guest_list_items WHERE id = ?', [$gliId]);
        if ($max && $max->max_guests) {
            $cnt = DB::selectOne('SELECT COUNT(*)::int as c FROM guests WHERE guest_list_id = ?', [$gliId]);
            if ((int) ($cnt->c ?? 0) >= (int) $max->max_guests) {
                return ['status' => 400, 'body' => ['message' => 'Limite de convidados atingido']];
            }
        }
        try {
            $row = DB::selectOne(
                "INSERT INTO guests (
                    guest_list_id, name, email, phone, whatsapp, document,
                    address, neighborhood, city, state, zipcode, instagram,
                    notes, status, registration_source, qr_token, qr_code_generated_at
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'registered', 'admin', ?, NOW())
                 RETURNING *",
                [
                    $gliId,
                    $name,
                    $body['email'] ?? null,
                    $body['phone'] ?? null,
                    $body['whatsapp'] ?? null,
                    $body['document'] ?? null,
                    $body['address'] ?? null,
                    $body['neighborhood'] ?? null,
                    $body['city'] ?? null,
                    $body['state'] ?? null,
                    $body['zipcode'] ?? null,
                    $body['instagram'] ?? null,
                    $body['notes'] ?? null,
                    bin2hex(random_bytes(32)),
                ]
            );

            return ['status' => 200, 'body' => (array) $row];
        } catch (\Throwable $e) {
            Log::error('guestList.storeGuest', ['error' => $e->getMessage()]);

            return ['status' => 500, 'body' => ['message' => 'Erro ao adicionar convidado', 'error' => $e->getMessage()]];
        }
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:mixed}
     */
    public function updateGuest(string $userId, int $listId, int $guestId, array $body): array
    {
        if ($listId < 1 || $guestId < 1) {
            return ['status' => 400, 'body' => ['message' => 'ID inválido']];
        }
        $owned = $this->resolveOwned($userId, $listId, false);
        if (! $owned) {
            return ['status' => 404, 'body' => ['message' => 'Lista não encontrada']];
        }
        $gliId = $owned['guest_list_item_id'];
        $exists = DB::selectOne(
            'SELECT id FROM guests WHERE id = ? AND guest_list_id = ? LIMIT 1',
            [$guestId, $gliId]
        );
        if (! $exists) {
            return ['status' => 404, 'body' => ['message' => 'Convidado não encontrado']];
        }
        $sets = [];
        $params = [];
        foreach (['name', 'email', 'phone', 'whatsapp', 'document', 'address', 'neighborhood', 'city', 'state', 'zipcode', 'instagram', 'notes'] as $col) {
            if (array_key_exists($col, $body)) {
                $sets[] = "{$col} = ?";
                $params[] = $body[$col];
            }
        }
        if (array_key_exists('status', $body)) {
            $sets[] = 'status = ?';
            $params[] = $body['status'];
            if ($body['status'] === 'confirmed') {
                $sets[] = 'confirmed_at = NOW()';
                $sets[] = 'confirmed_by = ?';
                $params[] = $userId;
            }
            if ($body['status'] === 'checked_in') {
                $sets[] = 'checked_in_at = NOW()';
                $sets[] = 'checked_in_by = ?';
                $params[] = $userId;
            }
        }
        if (! $sets) {
            return ['status' => 400, 'body' => ['message' => 'Nenhum campo para atualizar']];
        }
        $params[] = $guestId;
        $params[] = $gliId;
        $row = DB::selectOne(
            'UPDATE guests SET '.implode(', ', $sets).' WHERE id = ? AND guest_list_id = ? RETURNING *',
            $params
        );

        return ['status' => 200, 'body' => (array) $row];
    }

    /**
     * @return array{status:int, body:mixed}
     */
    public function destroyGuest(string $userId, int $listId, int $guestId): array
    {
        if ($listId < 1 || $guestId < 1) {
            return ['status' => 400, 'body' => ['message' => 'ID inválido']];
        }
        $owned = $this->resolveOwned($userId, $listId, false);
        if (! $owned) {
            return ['status' => 404, 'body' => ['message' => 'Lista não encontrada']];
        }
        $gliId = $owned['guest_list_item_id'];
        $exists = DB::selectOne(
            'SELECT id FROM guests WHERE id = ? AND guest_list_id = ? LIMIT 1',
            [$guestId, $gliId]
        );
        if (! $exists) {
            return ['status' => 404, 'body' => ['message' => 'Convidado não encontrado']];
        }
        DB::delete('DELETE FROM guests WHERE id = ? AND guest_list_id = ?', [$guestId, $gliId]);

        return ['status' => 200, 'body' => ['success' => true, 'message' => 'Convidado removido com sucesso']];
    }

    /**
     * Exclusão em lote por IDs (mantém destroyGuest e destroyAllGuests).
     *
     * @param  list<int|string>  $ids
     * @return array{status:int, body:mixed}
     */
    public function destroyGuestsBulk(string $userId, int $listId, array $ids): array
    {
        if ($listId < 1) {
            return ['status' => 400, 'body' => ['message' => 'ID da lista inválido']];
        }
        $owned = $this->resolveOwned($userId, $listId, false);
        if (! $owned) {
            return ['status' => 404, 'body' => ['message' => 'Lista não encontrada']];
        }
        $guestIds = [];
        foreach ($ids as $id) {
            $n = (int) $id;
            if ($n > 0) {
                $guestIds[$n] = $n;
            }
        }
        $guestIds = array_values($guestIds);
        if ($guestIds === []) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'Nenhum ID válido fornecido']];
        }
        if (count($guestIds) > 500) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'Máximo de 500 IDs por pedido']];
        }

        $gliId = $owned['guest_list_item_id'];
        $placeholders = implode(',', array_fill(0, count($guestIds), '?'));
        $deleted = DB::delete(
            "DELETE FROM guests WHERE guest_list_id = ? AND id IN ({$placeholders})",
            array_merge([$gliId], $guestIds)
        );

        return ['status' => 200, 'body' => [
            'success' => true,
            'message' => 'Convidados removidos com sucesso',
            'deleted_count' => $deleted,
        ]];
    }

    /**
     * @return array{status:int, body:mixed}
     */
    public function destroyAllGuests(string $userId, int $listId): array
    {
        if ($listId < 1) {
            return ['status' => 400, 'body' => ['message' => 'ID da lista inválido']];
        }
        $owned = $this->resolveOwned($userId, $listId, false);
        if (! $owned) {
            return ['status' => 404, 'body' => ['message' => 'Lista não encontrada']];
        }
        $deleted = DB::delete('DELETE FROM guests WHERE guest_list_id = ?', [$owned['guest_list_item_id']]);

        return ['status' => 200, 'body' => [
            'success' => true,
            'message' => 'Todos os convidados foram excluídos com sucesso',
            'deleted_count' => $deleted,
        ]];
    }

    /**
     * @return array{status:int, body:mixed}
     */
    public function generateQr(string $userId, int $listId, int $guestId): array
    {
        if ($listId < 1 || $guestId < 1) {
            return ['status' => 400, 'body' => ['message' => 'ID inválido']];
        }
        $owned = $this->resolveOwned($userId, $listId, false);
        if (! $owned) {
            return ['status' => 404, 'body' => ['message' => 'Lista não encontrada']];
        }
        $exists = DB::selectOne(
            'SELECT id FROM guests WHERE id = ? AND guest_list_id = ? LIMIT 1',
            [$guestId, $owned['guest_list_item_id']]
        );
        if (! $exists) {
            return ['status' => 404, 'body' => ['message' => 'Convidado não encontrado nesta lista']];
        }
        $row = DB::selectOne(
            'UPDATE guests SET qr_token = ?, qr_code_generated_at = NOW() WHERE id = ?
             RETURNING id, name, qr_token, qr_code_generated_at',
            [bin2hex(random_bytes(32)), $guestId]
        );

        return ['status' => 200, 'body' => [
            'success' => true,
            'message' => 'QR Code gerado com sucesso',
            'guest' => (array) $row,
        ]];
    }

    /**
     * @return array{status:int, body:mixed}
     */
    public function generateAllQr(string $userId, int $listId): array
    {
        if ($listId < 1) {
            return ['status' => 400, 'body' => ['message' => 'ID inválido']];
        }
        $owned = $this->resolveOwned($userId, $listId, false);
        if (! $owned) {
            return ['status' => 404, 'body' => ['message' => 'Lista não encontrada']];
        }
        $rows = DB::select(
            "SELECT id FROM guests WHERE guest_list_id = ? AND (qr_token IS NULL OR qr_token = '')",
            [$owned['guest_list_item_id']]
        );
        if (! $rows) {
            return ['status' => 200, 'body' => [
                'success' => true,
                'message' => 'Todos os convidados já possuem QR Code',
                'updated_count' => 0,
            ]];
        }
        $ids = array_map(static fn ($g) => (int) $g->id, $rows);
        $totalWithoutQr = count($ids);
        $updated = 0;
        // Um UPDATE set-based por lote (evita N+1 de UPDATE por convidado)
        foreach (array_chunk($ids, 200) as $chunk) {
            $values = [];
            $params = [];
            foreach ($chunk as $id) {
                $values[] = '(?::bigint, ?::text)';
                $params[] = $id;
                $params[] = bin2hex(random_bytes(32));
            }
            $params[] = $owned['guest_list_item_id'];
            try {
                $updated += DB::update(
                    'UPDATE guests AS g
                     SET qr_token = v.token, qr_code_generated_at = NOW()
                     FROM (VALUES '.implode(',', $values).') AS v(id, token)
                     WHERE g.id = v.id
                       AND g.guest_list_id = ?
                       AND (g.qr_token IS NULL OR g.qr_token = \'\')',
                    $params
                );
            } catch (\Throwable $e) {
                Log::warning('guestList.generateAllQr', [
                    'list' => $owned['guest_list_item_id'],
                    'chunk_size' => count($chunk),
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return ['status' => 200, 'body' => [
            'success' => true,
            'message' => "QR Codes gerados para {$updated} convidado(s)",
            'updated_count' => $updated,
            'total_without_qr' => $totalWithoutQr,
        ]];
    }

    /**
     * @return array{status:int, body:mixed}
     */
    public function resetTokens(string $userId, int $listId): array
    {
        if ($listId < 1) {
            return ['status' => 400, 'body' => ['message' => 'ID da lista inválido']];
        }
        $owned = $this->resolveOwned($userId, $listId, false);
        if (! $owned) {
            return ['status' => 404, 'body' => ['message' => 'Lista não encontrada']];
        }
        $reg = bin2hex(random_bytes(16));
        $conf = bin2hex(random_bytes(16));
        $pub = bin2hex(random_bytes(16));
        DB::update(
            'UPDATE guest_list_items SET registration_token = ?, confirmation_token = ?, public_view_token = ?, updated_at = NOW() WHERE id = ?',
            [$reg, $conf, $pub, $owned['guest_list_item_id']]
        );

        return ['status' => 200, 'body' => [
            'success' => true,
            'message' => 'Tokens redefinidos com sucesso',
            'tokens' => [
                'registration_token' => $reg,
                'confirmation_token' => $conf,
                'public_view_token' => $pub,
            ],
        ]];
    }

    /**
     * @return array{status:int, body:mixed}
     */
    public function destroy(string $userId, int $listId): array
    {
        if ($listId < 1) {
            return ['status' => 400, 'body' => ['message' => 'ID da lista inválido']];
        }
        $check = DB::selectOne(
            'SELECT pi.id FROM profile_items pi
             INNER JOIN guest_list_items gli ON gli.profile_item_id = pi.id
             WHERE pi.id = ? AND pi.user_id = ? LIMIT 1',
            [$listId, $userId]
        );
        if (! $check) {
            return ['status' => 404, 'body' => ['message' => 'Lista não encontrada']];
        }
        DB::delete('DELETE FROM profile_items WHERE id = ?', [$listId]);

        return ['status' => 200, 'body' => ['success' => true, 'message' => 'Lista deletada com sucesso']];
    }

    /**
     * @return array{profile_item_id:int, guest_list_item_id:int}|null
     */
    private function resolveOwned(string $userId, int $listId, bool $autoCreate): ?array
    {
        $row = DB::selectOne(
            'SELECT pi.id as profile_item_id, gli.id as guest_list_item_id
             FROM profile_items pi
             INNER JOIN guest_list_items gli ON gli.profile_item_id = pi.id
             WHERE pi.id = ? AND pi.user_id = ? LIMIT 1',
            [$listId, $userId]
        );
        if ($row) {
            return [
                'profile_item_id' => (int) $row->profile_item_id,
                'guest_list_item_id' => (int) $row->guest_list_item_id,
            ];
        }
        $row = DB::selectOne(
            'SELECT pi.id as profile_item_id, gli.id as guest_list_item_id
             FROM guest_list_items gli
             INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
             WHERE gli.id = ? AND pi.user_id = ? LIMIT 1',
            [$listId, $userId]
        );
        if ($row) {
            return [
                'profile_item_id' => (int) $row->profile_item_id,
                'guest_list_item_id' => (int) $row->guest_list_item_id,
            ];
        }
        if (! $autoCreate) {
            return null;
        }
        $profile = DB::selectOne(
            'SELECT id, title FROM profile_items WHERE id = ? AND user_id = ? LIMIT 1',
            [$listId, $userId]
        );
        if (! $profile) {
            return null;
        }
        $gliId = $this->ensureGuestListItem((int) $profile->id, (string) ($profile->title ?? 'Lista de Convidados'));

        return [
            'profile_item_id' => (int) $profile->id,
            'guest_list_item_id' => $gliId,
        ];
    }

    /**
     * @param  array<string,mixed>  $body
     */
    private function syncDigitalFormFromGuestList(int $profileItemId, array $body): void
    {
        $need = array_key_exists('enable_whatsapp', $body)
            || array_key_exists('enable_guest_list_submit', $body)
            || array_key_exists('form_logo_url', $body)
            || array_key_exists('button_logo_url', $body)
            || array_key_exists('button_logo_size', $body)
            || array_key_exists('show_logo_corner', $body)
            || array_key_exists('event_title', $body)
            || array_key_exists('event_date', $body)
            || array_key_exists('event_location', $body)
            || array_key_exists('custom_form_fields', $body);
        if (! $need || ! Schema::hasTable('digital_form_items')) {
            return;
        }
        $map = [
            'enable_whatsapp' => fn ($v) => $this->boolish($v),
            'enable_guest_list_submit' => fn ($v) => $this->boolish($v),
            'form_logo_url' => fn ($v) => $v ?: null,
            'button_logo_url' => fn ($v) => $v ?: null,
            'button_logo_size' => function ($v) {
                $n = (int) $v;

                return ($n >= 20 && $n <= 300) ? $n : 40;
            },
            'show_logo_corner' => fn ($v) => $this->boolish($v),
            'form_title' => null,
            'event_date' => null,
            'event_address' => null,
            'form_fields' => null,
        ];
        $sets = [];
        $params = [];
        foreach (['enable_whatsapp', 'enable_guest_list_submit', 'form_logo_url', 'button_logo_url', 'button_logo_size', 'show_logo_corner'] as $col) {
            if (! array_key_exists($col, $body) || ! Schema::hasColumn('digital_form_items', $col)) {
                continue;
            }
            $sets[] = "{$col} = ?";
            $params[] = $map[$col]($body[$col]);
        }
        if (array_key_exists('event_title', $body) && Schema::hasColumn('digital_form_items', 'form_title')) {
            $sets[] = 'form_title = ?';
            $params[] = $body['event_title'];
        }
        if (array_key_exists('event_date', $body) && Schema::hasColumn('digital_form_items', 'event_date')) {
            $sets[] = 'event_date = ?';
            $params[] = $body['event_date'] ?: null;
        }
        if (array_key_exists('event_location', $body) && Schema::hasColumn('digital_form_items', 'event_address')) {
            $sets[] = 'event_address = ?';
            $params[] = $body['event_location'] ?: null;
        }
        if (array_key_exists('custom_form_fields', $body) && Schema::hasColumn('digital_form_items', 'form_fields')) {
            $fields = is_array($body['custom_form_fields']) ? $body['custom_form_fields'] : [];
            $sets[] = 'form_fields = ?::jsonb';
            $params[] = json_encode($fields, JSON_UNESCAPED_UNICODE);
        }
        if (! $sets) {
            return;
        }
        $params[] = $profileItemId;
        try {
            DB::update(
                'UPDATE digital_form_items SET '.implode(', ', $sets).', updated_at = NOW() WHERE profile_item_id = ?',
                $params
            );
        } catch (\Throwable $e) {
            Log::warning('guestList.syncDigitalForm', ['error' => $e->getMessage()]);
        }
    }

    private function boolish(mixed $v): bool
    {
        return $v === true || $v === 'true' || $v === 1 || $v === '1';
    }

    /**
     * @return int|null null = not found; 0 = just created empty
     */
    private function resolveGliId(string $userId, int $listId, bool $autoCreate): ?int
    {
        $row = DB::selectOne(
            'SELECT gli.id as guest_list_item_id
             FROM profile_items pi
             INNER JOIN guest_list_items gli ON gli.profile_item_id = pi.id
             WHERE pi.id = ? AND pi.user_id = ? LIMIT 1',
            [$listId, $userId]
        );
        if ($row) {
            return (int) $row->guest_list_item_id;
        }
        $row = DB::selectOne(
            'SELECT gli.id as guest_list_item_id
             FROM guest_list_items gli
             INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
             WHERE gli.id = ? AND pi.user_id = ? LIMIT 1',
            [$listId, $userId]
        );
        if ($row) {
            return (int) $row->guest_list_item_id;
        }
        if (! $autoCreate) {
            return null;
        }
        $profile = DB::selectOne(
            'SELECT id, title FROM profile_items WHERE id = ? AND user_id = ? LIMIT 1',
            [$listId, $userId]
        );
        if (! $profile) {
            return null;
        }
        $this->ensureGuestListItem((int) $profile->id, (string) ($profile->title ?? 'Lista de Convidados'));

        return 0;
    }

    private function ensureGuestListItem(int $profileItemId, string $title): int
    {
        $existing = DB::selectOne(
            'SELECT id FROM guest_list_items WHERE profile_item_id = ? LIMIT 1',
            [$profileItemId]
        );
        if ($existing) {
            return (int) $existing->id;
        }
        $row = DB::selectOne(
            'INSERT INTO guest_list_items (
                profile_item_id, event_title, event_description,
                registration_token, confirmation_token, public_view_token,
                allow_self_registration, require_confirmation, max_guests,
                created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?, TRUE, TRUE, NULL, NOW(), NOW())
             RETURNING id',
            [
                $profileItemId,
                $title !== '' ? $title : 'Lista de Convidados',
                '',
                bin2hex(random_bytes(16)),
                bin2hex(random_bytes(16)),
                bin2hex(random_bytes(16)),
            ]
        );

        return (int) $row->id;
    }

    /**
     * @return list<string>
     */
    private function optionalGliColumns(): array
    {
        $candidates = [
            'form_logo_url', 'button_logo_url', 'button_logo_size', 'show_logo_corner',
            'enable_whatsapp', 'enable_guest_list_submit', 'card_color',
            'decorative_bar_color', 'separator_line_color',
            'portaria_slug', 'cadastro_slug', 'cadastro_description',
            'cadastro_expires_at', 'cadastro_max_uses', 'cadastro_current_uses',
        ];
        $out = [];
        foreach ($candidates as $col) {
            if (Schema::hasColumn('guest_list_items', $col)) {
                $out[] = $col;
            }
        }

        return $out;
    }

    /**
     * @param  list<string>  $extra
     */
    private function baseSelectFields(array $extra): string
    {
        $fields = [
            'pi.id as profile_item_id',
            'pi.user_id',
            'pi.item_type',
            'pi.title',
            'pi.is_active',
            'pi.display_order',
            'pi.created_at as profile_created_at',
            'gli.id as guest_list_item_id',
            'gli.event_title',
            'gli.event_description',
            'gli.event_date',
            'gli.event_location',
            'gli.registration_token',
            'gli.confirmation_token',
            'gli.max_guests',
            'gli.allow_self_registration',
            'gli.require_confirmation',
            'gli.custom_form_fields',
            'gli.use_custom_form',
            'gli.public_view_token',
            "COALESCE(gli.primary_color, '#FFC700') as primary_color",
            "COALESCE(gli.text_color, '#ECECEC') as text_color",
            "COALESCE(gli.background_color, '#0D0D0F') as background_color",
            'gli.secondary_color',
            'gli.header_image_url',
            'gli.background_image_url',
            'COALESCE(gli.background_opacity, 1.0) as background_opacity',
            "COALESCE(gli.theme, 'dark') as theme",
            'gli.created_at as guest_list_created_at',
            'gli.updated_at as guest_list_updated_at',
        ];
        foreach ($extra as $col) {
            if (in_array($col, ['portaria_slug', 'cadastro_slug', 'cadastro_description', 'cadastro_expires_at', 'cadastro_max_uses', 'cadastro_current_uses'], true)
                || str_starts_with($col, 'form_') || str_starts_with($col, 'button_') || str_starts_with($col, 'show_')
                || str_starts_with($col, 'enable_') || str_ends_with($col, '_color')) {
                $fields[] = 'gli.'.$col;
            }
        }

        return implode(",\n                ", array_unique($fields));
    }
}
