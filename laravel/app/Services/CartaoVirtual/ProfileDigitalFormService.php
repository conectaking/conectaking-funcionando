<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * PUT /api/profile/items/digital_form/:id
 */
class ProfileDigitalFormService
{
    /** @var array<string, list<string>> */
    private static array $colCache = [];

    public function __construct(private readonly ProfileTypedItemsService $typed)
    {
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array{status:int, body:array<string, mixed>}
     */
    public function update(string $userId, string $itemId, array $body): array
    {
        if (!ctype_digit($itemId) || (int) $itemId < 1) {
            return ['status' => 400, 'body' => ['message' => 'ID do item inválido.']];
        }
        $id = (int) $itemId;
        $check = DB::selectOne('SELECT * FROM profile_items WHERE id = ? AND user_id = ? LIMIT 1', [$id, $userId]);
        if (!$check) {
            return ['status' => 404, 'body' => ['message' => 'Formulário King não encontrado ou você não tem permissão para editá-lo.']];
        }
        $currentType = (string) ($check->item_type ?? '');
        if ($currentType !== 'digital_form' && $currentType !== 'guest_list') {
            return ['status' => 400, 'body' => ['message' => 'Este item não é um formulário digital.']];
        }

        try {
            $piCols = $this->columns('profile_items');
            $sets = [];
            $vals = [];

            if (array_key_exists('title', $body)) {
                $sets[] = 'title = ?';
                $vals[] = $body['title'] ?: null;
            }
            if (array_key_exists('is_active', $body)) {
                $sets[] = 'is_active = ?';
                $vals[] = $body['is_active'];
            }
            if (array_key_exists('display_order', $body)) {
                $sets[] = 'display_order = ?';
                $vals[] = $body['display_order'];
            }
            if (array_key_exists('is_listed', $body) && in_array('is_listed', $piCols, true)) {
                $sets[] = 'is_listed = ?';
                $vals[] = $this->toBool($body['is_listed']);
            }
            if (($body['generate_share_token'] ?? false) === true && in_array('share_token', $piCols, true)) {
                $existing = $check->share_token ?? null;
                if (!$existing) {
                    $sets[] = 'share_token = ?';
                    $vals[] = strtoupper(bin2hex(random_bytes(16)));
                }
            }
            $displayFormat = $body['display_format'] ?? null;
            if (array_key_exists('banner_image_url', $body) && $displayFormat === 'banner' && in_array('image_url', $piCols, true)) {
                $sets[] = 'image_url = ?';
                $vals[] = $body['banner_image_url'] ?: null;
            }
            $explicitType = $body['item_type'] ?? null;
            if ($currentType === 'guest_list' || $explicitType === 'digital_form' || $explicitType === 'guest_list') {
                $newType = ($explicitType === 'guest_list' || $explicitType === 'digital_form')
                    ? $explicitType
                    : 'digital_form';
                $sets[] = 'item_type = ?';
                $vals[] = $newType;
            }

            if ($sets !== []) {
                $vals[] = $id;
                $vals[] = $userId;
                DB::update(
                    'UPDATE profile_items SET '.implode(', ', $sets).' WHERE id = ? AND user_id = ?',
                    $vals
                );
            }

            $this->upsertFormRow($id, $body);

            $item = DB::selectOne('SELECT * FROM profile_items WHERE id = ? AND user_id = ? LIMIT 1', [$id, $userId]);
            $response = (array) $item;
            $form = DB::selectOne(
                'SELECT * FROM digital_form_items WHERE profile_item_id = ?
                 ORDER BY COALESCE(updated_at, \'1970-01-01\'::timestamp) DESC, id DESC LIMIT 1',
                [$id]
            );
            if ($form) {
                $fd = (array) $form;
                if (isset($fd['form_fields']) && is_string($fd['form_fields'])) {
                    $parsed = json_decode($fd['form_fields'], true);
                    $fd['form_fields'] = is_array($parsed) ? $parsed : [];
                }
                $response['digital_form_data'] = $fd;
            }

            return ['status' => 200, 'body' => $response];
        } catch (\Throwable $e) {
            Log::error('profile.digital_form.update', ['error' => $e->getMessage()]);

            return ['status' => 500, 'body' => ['message' => 'Erro ao atualizar formulário.', 'error' => $e->getMessage()]];
        }
    }

    /**
     * @param  array<string, mixed>  $body
     */
    private function upsertFormRow(int $itemId, array $body): void
    {
        $dfCols = $this->columns('digital_form_items');
        $latest = DB::selectOne(
            'SELECT id, display_format, banner_image_url FROM digital_form_items
             WHERE profile_item_id = ?
             ORDER BY COALESCE(updated_at, \'1970-01-01\'::timestamp) DESC, id DESC LIMIT 1',
            [$itemId]
        );

        $all = DB::select('SELECT id FROM digital_form_items WHERE profile_item_id = ?', [$itemId]);
        if (count($all) > 1 && $latest) {
            DB::delete('DELETE FROM digital_form_items WHERE profile_item_id = ? AND id != ?', [$itemId, $latest->id]);
        }

        if ($latest) {
            $this->updateExistingForm((int) $latest->id, $itemId, $body, $dfCols, (array) $latest);
        } else {
            $this->insertNewForm($itemId, $body, $dfCols);
        }
    }

    /**
     * @param  array<string, mixed>  $body
     * @param  list<string>  $dfCols
     * @param  array<string, mixed>  $current
     */
    private function updateExistingForm(int $formId, int $itemId, array $body, array $dfCols, array $current): void
    {
        // Só sobrescreve form_title se veio no body (melhor que o Node, que sempre resetava).
        $sets = [];
        $vals = [];
        if (array_key_exists('form_title', $body)) {
            $sets[] = 'form_title = ?';
            $vals[] = ($body['form_title'] !== null)
                ? (trim((string) $body['form_title']) ?: 'Formulário King')
                : 'Formulário King';
        }

        $simple = [
            'form_logo_url', 'form_description', 'prayer_requests_text', 'meetings_text', 'welcome_text',
            'whatsapp_number', 'pastor_whatsapp_number', 'header_image_url', 'background_image_url',
            'event_date', 'event_address', 'button_logo_url',
        ];
        foreach ($simple as $f) {
            if (!array_key_exists($f, $body) || !in_array($f, $dfCols, true)) {
                continue;
            }
            $sets[] = "$f = ?";
            $vals[] = $body[$f] ?: null;
        }

        if (array_key_exists('show_logo_corner', $body) && in_array('show_logo_corner', $dfCols, true)) {
            $sets[] = 'show_logo_corner = ?';
            $vals[] = $body['show_logo_corner'] ?: false;
        }
        if (array_key_exists('enable_pastor_button', $body) && in_array('enable_pastor_button', $dfCols, true)) {
            $sets[] = 'enable_pastor_button = ?';
            $vals[] = $body['enable_pastor_button'] ?: false;
        }
        if (array_key_exists('pastor_button_name', $body) && in_array('pastor_button_name', $dfCols, true)) {
            $sets[] = 'pastor_button_name = ?';
            $vals[] = $body['pastor_button_name'] ?: 'Enviar Mensagem para o Pastor';
        }
        if (array_key_exists('button_logo_size', $body) && in_array('button_logo_size', $dfCols, true)) {
            $n = (int) $body['button_logo_size'];
            $sets[] = 'button_logo_size = ?';
            $vals[] = ($n >= 20 && $n <= 300) ? $n : 40;
        }
        foreach (['event_address_lat', 'event_address_lon'] as $coord) {
            if (!array_key_exists($coord, $body) || !in_array($coord, $dfCols, true)) {
                continue;
            }
            if ($body[$coord] === null || $body[$coord] === '') {
                continue;
            }
            $f = (float) $body[$coord];
            if (is_finite($f)) {
                $sets[] = "$coord = ?";
                $vals[] = $f;
            }
        }

        $displayFormat = (array_key_exists('display_format', $body) && trim((string) ($body['display_format'] ?? '')) !== '')
            ? (strtolower(trim((string) $body['display_format'])) === 'banner' ? 'banner' : 'button')
            : ($current['display_format'] ?? 'button');
        $bannerUrl = array_key_exists('banner_image_url', $body)
            ? (($body['banner_image_url'] && trim((string) $body['banner_image_url']) !== '')
                ? trim((string) $body['banner_image_url']) : null)
            : ($current['banner_image_url'] ?? null);
        $sets[] = 'display_format = ?';
        $vals[] = $displayFormat;
        $sets[] = 'banner_image_url = ?';
        $vals[] = $bannerUrl;

        if (array_key_exists('form_fields', $body) && in_array('form_fields', $dfCols, true)) {
            $fields = is_array($body['form_fields']) ? $body['form_fields'] : ($body['form_fields'] ? [$body['form_fields']] : []);
            $sets[] = 'form_fields = ?::jsonb';
            $vals[] = json_encode($fields, JSON_UNESCAPED_UNICODE);
        }
        if (array_key_exists('theme', $body) && in_array('theme', $dfCols, true)) {
            $sets[] = 'theme = ?';
            $vals[] = $body['theme'] ?: 'light';
        }
        if (array_key_exists('primary_color', $body) && in_array('primary_color', $dfCols, true)) {
            $sets[] = 'primary_color = ?';
            $vals[] = ($body['primary_color'] && trim((string) $body['primary_color']) !== '')
                ? trim((string) $body['primary_color']) : '#4A90E2';
        }
        foreach ([
            'secondary_color' => null,
            'text_color' => '#333333',
            'card_color' => '#FFFFFF',
            'background_color' => '#FFFFFF',
            'decorative_bar_color' => null,
            'separator_line_color' => '#e8eaed',
        ] as $color => $default) {
            if (!array_key_exists($color, $body) || !in_array($color, $dfCols, true)) {
                continue;
            }
            $raw = $body[$color];
            if ($color === 'secondary_color') {
                $val = (is_string($raw) && trim($raw) !== '' && $raw !== 'null') ? trim($raw) : ($raw ?: null);
            } elseif ($color === 'decorative_bar_color') {
                $val = $raw ?: ($body['primary_color'] ?? '#4A90E2');
            } elseif ($color === 'separator_line_color') {
                $val = (is_string($raw) && trim($raw) !== '' && $raw !== 'null') ? trim($raw) : ($raw ?? $default);
            } else {
                $val = $raw ?: $default;
            }
            $sets[] = "$color = ?";
            $vals[] = $val;
        }
        if (array_key_exists('background_opacity', $body) && in_array('background_opacity', $dfCols, true)) {
            $sets[] = 'background_opacity = ?';
            $vals[] = $body['background_opacity'] ?? 1.0;
        }
        if (array_key_exists('enable_whatsapp', $body) && in_array('enable_whatsapp', $dfCols, true)) {
            $sets[] = 'enable_whatsapp = ?';
            $vals[] = $this->toBool($body['enable_whatsapp']);
        }
        if (array_key_exists('enable_guest_list_submit', $body) && in_array('enable_guest_list_submit', $dfCols, true)) {
            $sets[] = 'enable_guest_list_submit = ?';
            $vals[] = $this->toBool($body['enable_guest_list_submit']);
        }
        if (array_key_exists('send_mode', $body) && $body['send_mode'] !== null && trim((string) $body['send_mode']) !== ''
            && in_array('send_mode', $dfCols, true)) {
            $mode = strtolower(trim((string) $body['send_mode']));
            if ($mode === 'system-only') {
                $mode = 'checkin';
            }
            if ($mode === 'both' || $mode === 'whatsapp-only') {
                $mode = 'lead';
            }
            if (!in_array($mode, ['lead', 'checkin'], true)) {
                $mode = $this->toBool($body['enable_guest_list_submit'] ?? false) ? 'checkin' : 'lead';
            }
            $sets[] = 'send_mode = ?';
            $vals[] = $mode;
        }

        $vals[] = $formId;
        $updated = DB::selectOne(
            'UPDATE digital_form_items SET '.implode(', ', $sets).', updated_at = NOW() WHERE id = ? RETURNING *',
            $vals
        );
        if ($updated) {
            $this->ensureGuestListForCheckin($itemId, (array) $updated);
        }
    }

    /**
     * @param  array<string, mixed>  $body
     * @param  list<string>  $dfCols
     */
    private function insertNewForm(int $itemId, array $body, array $dfCols): void
    {
        $fields = is_array($body['form_fields'] ?? null)
            ? $body['form_fields']
            : ((isset($body['form_fields']) && $body['form_fields']) ? [$body['form_fields']] : []);
        $cols = [
            'profile_item_id', 'form_title', 'form_logo_url', 'form_description', 'prayer_requests_text',
            'meetings_text', 'welcome_text', 'whatsapp_number', 'display_format', 'banner_image_url',
            'header_image_url', 'background_image_url', 'background_opacity', 'form_fields', 'theme', 'primary_color', 'text_color',
        ];
        $vals = [
            $itemId,
            $body['form_title'] ?? 'Formulário King',
            $body['form_logo_url'] ?? null,
            $body['form_description'] ?? null,
            $body['prayer_requests_text'] ?? null,
            $body['meetings_text'] ?? null,
            $body['welcome_text'] ?? null,
            $body['whatsapp_number'] ?? null,
            $body['display_format'] ?? 'button',
            $body['banner_image_url'] ?? null,
            $body['header_image_url'] ?? null,
            $body['background_image_url'] ?? null,
            $body['background_opacity'] ?? 1.0,
            json_encode($fields, JSON_UNESCAPED_UNICODE),
            $body['theme'] ?? 'light',
            $body['primary_color'] ?? '#4A90E2',
            $body['text_color'] ?? '#333333',
        ];
        $ph = ['?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?', '?::jsonb', '?', '?', '?'];

        $optional = [
            'secondary_color' => $body['secondary_color'] ?? null,
            'card_color' => $body['card_color'] ?? '#FFFFFF',
            'background_color' => $body['background_color'] ?? '#FFFFFF',
            'button_logo_url' => $body['button_logo_url'] ?? null,
            'button_logo_size' => isset($body['button_logo_size']) ? (int) $body['button_logo_size'] : null,
            'enable_pastor_button' => $body['enable_pastor_button'] ?? false,
            'pastor_whatsapp_number' => $body['pastor_whatsapp_number'] ?? null,
            'pastor_button_name' => $body['pastor_button_name'] ?? null,
            'show_logo_corner' => $body['show_logo_corner'] ?? false,
            'enable_whatsapp' => array_key_exists('enable_whatsapp', $body) ? $this->toBool($body['enable_whatsapp']) : null,
            'enable_guest_list_submit' => array_key_exists('enable_guest_list_submit', $body) ? $this->toBool($body['enable_guest_list_submit']) : null,
            'send_mode' => $body['send_mode'] ?? null,
        ];
        foreach ($optional as $c => $v) {
            if (!in_array($c, $dfCols, true) || $v === null && !array_key_exists($c, $body)) {
                continue;
            }
            if ($c === 'send_mode') {
                $mode = strtolower(trim((string) ($v ?: '')));
                if ($mode === 'system-only') {
                    $mode = 'checkin';
                }
                if ($mode === 'both' || $mode === 'whatsapp-only') {
                    $mode = 'lead';
                }
                if ($mode === '' || !in_array($mode, ['lead', 'checkin'], true)) {
                    $mode = $this->toBool($body['enable_guest_list_submit'] ?? false) ? 'checkin' : 'lead';
                }
                $v = $mode;
            }
            if ($c === 'button_logo_size' && $v !== null) {
                $n = (int) $v;
                $v = ($n >= 20 && $n <= 300) ? $n : 40;
            }
            $cols[] = $c;
            $vals[] = $v;
            $ph[] = '?';
        }

        DB::insert(
            'INSERT INTO digital_form_items ('.implode(',', $cols).') VALUES ('.implode(',', $ph).')',
            $vals
        );
    }

    /**
     * @param  array<string, mixed>  $saved
     */
    private function ensureGuestListForCheckin(int $itemId, array $saved): void
    {
        try {
            $savedGl = ($saved['enable_guest_list_submit'] ?? false) === true;
            $mode = strtolower((string) ($saved['send_mode'] ?? ''));
            if ($mode === 'system-only') {
                $mode = 'checkin';
            }
            if ($mode === 'both' || $mode === 'whatsapp-only') {
                $mode = 'lead';
            }
            $isCheckin = $mode === 'checkin' || $savedGl;
            $gl = DB::selectOne(
                'SELECT id FROM guest_list_items WHERE profile_item_id = ? ORDER BY id DESC LIMIT 1',
                [$itemId]
            );
            $glCols = $this->columns('guest_list_items');
            if ($isCheckin && !$gl) {
                $cols = ['profile_item_id', 'event_title', 'require_confirmation', 'allow_self_registration', 'registration_token', 'confirmation_token'];
                $vals = [
                    $itemId,
                    $saved['form_title'] ?? 'Check-in',
                    true,
                    true,
                    bin2hex(random_bytes(16)),
                    bin2hex(random_bytes(16)),
                ];
                if (in_array('public_view_token', $glCols, true)) {
                    $cols[] = 'public_view_token';
                    $vals[] = bin2hex(random_bytes(16));
                }
                if (in_array('enable_whatsapp', $glCols, true)) {
                    $cols[] = 'enable_whatsapp';
                    $vals[] = ($saved['enable_whatsapp'] ?? true) !== false;
                }
                if (in_array('enable_guest_list_submit', $glCols, true)) {
                    $cols[] = 'enable_guest_list_submit';
                    $vals[] = true;
                }
                $ph = implode(',', array_fill(0, count($vals), '?'));
                DB::insert('INSERT INTO guest_list_items ('.implode(',', $cols).") VALUES ($ph)", $vals);
            } elseif ($gl) {
                $sets = [];
                $vals = [];
                if (in_array('enable_guest_list_submit', $glCols, true)) {
                    $sets[] = 'enable_guest_list_submit = ?';
                    $vals[] = (bool) $isCheckin;
                }
                if (in_array('enable_whatsapp', $glCols, true) && array_key_exists('enable_whatsapp', $saved)) {
                    $sets[] = 'enable_whatsapp = ?';
                    $vals[] = ($saved['enable_whatsapp'] ?? false) === true;
                }
                if ($sets !== []) {
                    $vals[] = $gl->id;
                    DB::update(
                        'UPDATE guest_list_items SET '.implode(', ', $sets).', updated_at = NOW() WHERE id = ?',
                        $vals
                    );
                }
            }
        } catch (\Throwable $e) {
            Log::warning('profile.digital_form.ensureGuestList', ['error' => $e->getMessage()]);
        }
    }

    /**
     * @return array{status:int, body:array<string, mixed>}
     */
    public function createImportLink(string $userId, string $itemId): array
    {
        if (!ctype_digit($itemId) || (int) $itemId < 1) {
            return ['status' => 400, 'body' => ['message' => 'ID do formulário inválido.']];
        }
        $id = (int) $itemId;
        $check = DB::selectOne(
            'SELECT id, item_type FROM profile_items WHERE id = ? AND user_id = ? LIMIT 1',
            [$id, $userId]
        );
        if (!$check) {
            return ['status' => 404, 'body' => ['message' => 'Formulário não encontrado ou não é seu.']];
        }
        if ((string) $check->item_type !== 'digital_form') {
            return ['status' => 400, 'body' => ['message' => 'Este item não é um formulário.']];
        }

        $token = bin2hex(random_bytes(24));
        $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $code = 'KING-';
        for ($i = 0; $i < 5; $i++) {
            $code .= $chars[random_int(0, strlen($chars) - 1)];
        }

        $cols = $this->columns('profile_items');
        if (in_array('import_code', $cols, true)) {
            DB::update(
                'UPDATE profile_items SET import_token = ?, import_code = ? WHERE id = ? AND user_id = ?',
                [$token, $code, $id, $userId]
            );
        } else {
            DB::update(
                'UPDATE profile_items SET import_token = ? WHERE id = ? AND user_id = ?',
                [$token, $id, $userId]
            );
            $code = null;
        }

        return [
            'status' => 200,
            'body' => [
                'token' => $token,
                'code' => $code ?: substr($token, 0, 10),
            ],
        ];
    }

    /**
     * @return array{status:int, body:array<string, mixed>}
     */
    public function importFormInfo(string $tokenOrCode): array
    {
        $token = trim($tokenOrCode);
        if ($token === '') {
            return ['status' => 400, 'body' => ['message' => 'Token ou código não informado.']];
        }
        $cols = $this->columns('profile_items');
        $hasCode = in_array('import_code', $cols, true);
        $where = $hasCode
            ? '(pi.import_token = ? OR pi.import_code = ?)'
            : 'pi.import_token = ?';
        $vals = $hasCode ? [$token, $token] : [$token];
        $row = DB::selectOne(
            "SELECT pi.id, pi.title, p.display_name
             FROM profile_items pi
             LEFT JOIN user_profiles p ON p.user_id = pi.user_id
             WHERE pi.item_type = 'digital_form' AND $where
             LIMIT 1",
            $vals
        );
        if (!$row) {
            return ['status' => 404, 'body' => ['message' => 'Link ou código inválido.']];
        }

        return [
            'status' => 200,
            'body' => [
                'formTitle' => $row->title ?: 'Formulário King',
                'ownerName' => $row->display_name ?: 'Um usuário',
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array{status:int, body:array<string, mixed>}
     */
    public function importForm(string $userId, array $body): array
    {
        $tokenOrCode = trim((string) ($body['token'] ?? $body['code'] ?? ''));
        if ($tokenOrCode === '') {
            return ['status' => 400, 'body' => ['message' => 'Token ou código não informado.']];
        }
        $intoRaw = $body['intoItemId'] ?? $body['into_item_id'] ?? null;
        $intoItemId = ($intoRaw !== null && is_numeric($intoRaw)) ? (int) $intoRaw : null;

        try {
            $cols = $this->columns('profile_items');
            $hasCode = in_array('import_code', $cols, true);
            $where = $hasCode
                ? "(import_token = ? OR import_code = ?) AND item_type = 'digital_form'"
                : "import_token = ? AND item_type = 'digital_form'";
            $vals = $hasCode ? [$tokenOrCode, $tokenOrCode] : [$tokenOrCode];
            $src = DB::selectOne("SELECT id, user_id, item_type, title FROM profile_items WHERE $where LIMIT 1", $vals);
            if (!$src) {
                return ['status' => 404, 'body' => ['message' => 'Link ou código inválido.']];
            }
            $sourceId = (int) $src->id;

            if ($intoItemId && $intoItemId > 0) {
                $target = DB::selectOne(
                    'SELECT id, item_type FROM profile_items WHERE id = ? AND user_id = ? LIMIT 1',
                    [$intoItemId, $userId]
                );
                if (!$target) {
                    return ['status' => 404, 'body' => ['message' => 'Formulário de destino não encontrado ou sem permissão.']];
                }
                $targetType = (string) $target->item_type;
                if ($targetType !== 'digital_form' && $targetType !== 'guest_list') {
                    return ['status' => 400, 'body' => ['message' => 'Só é possível importar em um formulário digital ou lista de convidados.']];
                }
                DB::delete('DELETE FROM digital_form_items WHERE profile_item_id = ?', [$intoItemId]);
                $this->typed->copyDigitalFormTo($sourceId, $intoItemId, '');
                $hasGl = DB::selectOne('SELECT 1 AS ok FROM guest_list_items WHERE profile_item_id = ? LIMIT 1', [$sourceId]);
                DB::delete('DELETE FROM guest_list_items WHERE profile_item_id = ?', [$intoItemId]);
                if ($hasGl) {
                    $this->typed->copyGuestListTo($sourceId, $intoItemId, '');
                }

                return ['status' => 200, 'body' => ['id' => $intoItemId, 'itemId' => $intoItemId, 'into' => true]];
            }

            $next = DB::selectOne(
                'SELECT COALESCE(MAX(display_order), -1) + 1 AS next_order FROM profile_items WHERE user_id = ?',
                [$userId]
            );
            $displayOrder = (int) ($next->next_order ?? 0);
            $itemRow = DB::selectOne('SELECT * FROM profile_items WHERE id = ? LIMIT 1', [$sourceId]);
            $item = (array) $itemRow;
            $copyCandidates = [
                'item_type', 'title', 'destination_url', 'image_url', 'icon_class', 'is_active',
                'logo_size', 'pix_key', 'recipient_name', 'pix_amount', 'pix_description', 'pdf_url',
                'whatsapp_message', 'aspect_ratio',
            ];
            $colNames = ['user_id', 'display_order'];
            $insertVals = [$userId, $displayOrder];
            foreach ($copyCandidates as $c) {
                if (in_array($c, $cols, true)) {
                    $colNames[] = $c;
                    $insertVals[] = $item[$c] ?? null;
                }
            }
            $ph = implode(',', array_fill(0, count($insertVals), '?'));
            $new = DB::selectOne(
                'INSERT INTO profile_items ('.implode(',', $colNames).") VALUES ($ph) RETURNING *",
                $insertVals
            );
            $newItem = (array) $new;
            $newId = (int) $newItem['id'];
            $this->typed->copyDigitalFormTo($sourceId, $newId, ' (cópia)');
            $hasGl = DB::selectOne('SELECT 1 AS ok FROM guest_list_items WHERE profile_item_id = ? LIMIT 1', [$sourceId]);
            if ($hasGl) {
                $this->typed->copyGuestListTo($sourceId, $newId, ' (cópia)');
            }

            return [
                'status' => 201,
                'body' => array_merge($newItem, [
                    'id' => $newId,
                    'itemId' => $newId,
                    'title' => $newItem['title'] ?? null,
                ]),
            ];
        } catch (\Throwable $e) {
            Log::error('profile.importForm', ['error' => $e->getMessage()]);

            return ['status' => 500, 'body' => ['message' => $e->getMessage() ?: 'Erro ao importar.']];
        }
    }

    private function toBool(mixed $v): bool
    {
        return $v === true || $v === 'true' || $v === 1 || $v === '1';
    }

    /**
     * @return list<string>
     */
    private function columns(string $table): array
    {
        if (isset(self::$colCache[$table])) {
            return self::$colCache[$table];
        }
        $rows = DB::select(
            'SELECT column_name FROM information_schema.columns
             WHERE table_schema = \'public\' AND table_name = ?',
            [$table]
        );
        self::$colCache[$table] = array_map(static fn ($r) => (string) $r->column_name, $rows);

        return self::$colCache[$table];
    }
}
