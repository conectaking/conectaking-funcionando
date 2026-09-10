<?php

namespace App\Services\CartaoVirtual;

use App\Support\SchemaMeta;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class GuestListCustomizeService
{
    private const PORTARIA_FIELDS = [
        'primary_color', 'secondary_color', 'text_color', 'background_color',
        'background_image_url', 'background_opacity', 'header_image_url', 'header_banner_fit',
        'form_logo_url', 'theme_portaria', 'event_title_custom', 'portaria_subtitle',
        'title_text_color', 'qr_code_button_text', 'qr_code_button_color',
        'qr_code_button_color_secondary', 'qr_code_button_text_color',
        'search_button_color', 'search_button_color_secondary', 'search_button_text_color',
        'search_input_text_color', 'quick_confirm_title_color', 'quick_confirm_icon_color',
        'stats_number_color',
    ];

    private const CONFIRMACAO_FIELDS = [
        'primary_color', 'secondary_color', 'text_color', 'background_color',
        'background_image_url', 'background_opacity', 'header_image_url',
        'form_logo_url', 'theme_confirmacao',
    ];

    private const INSCRICAO_FIELDS = [
        'primary_color', 'secondary_color', 'background_color',
        'background_image_url', 'background_opacity',
    ];

    /**
     * @return array{status:int, view?:string, data?:array<string,mixed>, message?:string}
     */
    public function page(string $kind, string $userId, string $listId): array
    {
        if (!in_array($kind, ['portaria', 'confirmacao', 'inscricao'], true)) {
            return ['status' => 404, 'message' => 'Página não encontrada'];
        }
        if (!ctype_digit($listId) || (int) $listId < 1) {
            return ['status' => 400, 'message' => 'ID inválido'];
        }

        if ($kind === 'inscricao') {
            return $this->pageInscricao($userId, (int) $listId);
        }

        $list = $this->findGuestListForUser($userId, (int) $listId);
        if (!$list) {
            return ['status' => 404, 'message' => 'Lista não encontrada'];
        }

        $defaults = [
            'primary_color' => '#FFC700',
            'secondary_color' => '#FFB700',
            'text_color' => '#ECECEC',
            'background_color' => '#0D0D0F',
            'background_opacity' => 1.0,
        ];
        foreach ($defaults as $k => $v) {
            if (empty($list[$k])) {
                $list[$k] = $v;
            }
        }
        if ($kind === 'portaria' && empty($list['theme_portaria'])) {
            $list['theme_portaria'] = 'default';
        }
        if ($kind === 'confirmacao' && empty($list['theme_confirmacao'])) {
            $list['theme_confirmacao'] = 'default';
        }

        return [
            'status' => 200,
            'view' => 'cartao.guest-customize',
            'data' => [
                'kind' => $kind,
                'title' => $kind === 'portaria' ? 'Personalizar Portaria' : 'Personalizar Confirmação',
                'profileItemId' => (int) $listId,
                'record' => $list,
                'saveUrl' => "/api/guest-lists/{$listId}/customize-{$kind}",
                'fields' => $kind === 'portaria' ? self::PORTARIA_FIELDS : self::CONFIRMACAO_FIELDS,
            ],
        ];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function save(string $kind, string $userId, string $listId, array $body): array
    {
        if (!in_array($kind, ['portaria', 'confirmacao', 'inscricao'], true)) {
            return ['status' => 404, 'body' => ['success' => false, 'message' => 'Recurso não encontrado']];
        }
        if (!ctype_digit($listId) || (int) $listId < 1) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'ID inválido']];
        }

        if ($kind === 'inscricao') {
            return $this->saveInscricao($userId, (int) $listId, $body);
        }

        $list = $this->findGuestListForUser($userId, (int) $listId);
        if (!$list) {
            return ['status' => 404, 'body' => ['success' => false, 'message' => 'Lista não encontrada']];
        }

        $allowed = $kind === 'portaria' ? self::PORTARIA_FIELDS : self::CONFIRMACAO_FIELDS;
        $updates = [];
        $bindings = [];
        foreach ($allowed as $field) {
            if (!array_key_exists($field, $body)) {
                continue;
            }
            if (!$this->columnExists('guest_list_items', $field)) {
                continue;
            }
            $val = $body[$field];
            if ($field === 'background_opacity') {
                $val = is_numeric($val) ? (float) $val : 1.0;
            } elseif ($field === 'header_banner_fit') {
                $val = in_array($val, ['auto', 'cover'], true) ? $val : 'cover';
            } elseif (in_array($field, ['event_title_custom', 'portaria_subtitle', 'qr_code_button_text'], true)) {
                $val = is_string($val) && trim($val) !== '' ? trim($val) : null;
                if ($field === 'portaria_subtitle' && $val === null && array_key_exists($field, $body)) {
                    $val = 'Visualização completa para portaria';
                }
            } elseif (str_ends_with($field, '_url') || str_ends_with($field, '_color') || str_contains($field, 'color')) {
                $val = ($val === '' || $val === null) ? null : $val;
            }
            $updates[] = "\"{$field}\" = ?";
            $bindings[] = $val;
        }

        if ($updates === []) {
            return ['status' => 200, 'body' => ['success' => true, 'message' => 'Nada para atualizar']];
        }

        $updates[] = 'updated_at = NOW()';
        $bindings[] = (int) $list['id'];

        try {
            DB::update(
                'UPDATE guest_list_items SET '.implode(', ', $updates).' WHERE id = ?',
                $bindings
            );
            if ($kind === 'portaria' && array_key_exists('event_title_custom', $body)) {
                $title = is_string($body['event_title_custom'] ?? null) ? trim((string) $body['event_title_custom']) : '';
                DB::update(
                    'UPDATE digital_form_items SET form_title = ?, updated_at = NOW() WHERE profile_item_id = ?',
                    [$title !== '' ? $title : 'Formulário King', (int) $listId]
                );
            }
        } catch (\Throwable $e) {
            Log::error('guest.customize.save', ['kind' => $kind, 'error' => $e->getMessage()]);

            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Erro ao salvar personalização']];
        }

        return ['status' => 200, 'body' => ['success' => true, 'message' => 'Personalização salva com sucesso!']];
    }

    /**
     * @return array{status:int, view?:string, data?:array<string,mixed>, message?:string}
     */
    private function pageInscricao(string $userId, int $listId): array
    {
        $form = DB::selectOne(
            'SELECT dfi.*, pi.id AS profile_item_id
             FROM digital_form_items dfi
             INNER JOIN profile_items pi ON pi.id = dfi.profile_item_id
             WHERE pi.id = ? AND pi.user_id = ?
             ORDER BY COALESCE(dfi.updated_at, \'1970-01-01\'::timestamp) DESC, dfi.id DESC
             LIMIT 1',
            [$listId, $userId]
        );
        if (!$form) {
            return ['status' => 404, 'message' => 'Formulário não encontrado'];
        }
        $record = (array) $form;
        if (empty($record['primary_color'])) {
            $record['primary_color'] = '#4A90E2';
        }
        if (empty($record['secondary_color'])) {
            $record['secondary_color'] = '#6BA3F0';
        }
        if (empty($record['background_color'])) {
            $record['background_color'] = '#FFFFFF';
        }
        if (!isset($record['background_opacity'])) {
            $record['background_opacity'] = 1.0;
        }
        $slug = DB::selectOne('SELECT profile_slug FROM users WHERE id = ? LIMIT 1', [$userId]);

        return [
            'status' => 200,
            'view' => 'cartao.guest-customize',
            'data' => [
                'kind' => 'inscricao',
                'title' => 'Personalizar Inscrição',
                'profileItemId' => $listId,
                'profileSlug' => (string) ($slug->profile_slug ?? $userId),
                'record' => $record,
                'saveUrl' => "/api/guest-lists/{$listId}/customize-inscricao",
                'fields' => self::INSCRICAO_FIELDS,
            ],
        ];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    private function saveInscricao(string $userId, int $listId, array $body): array
    {
        $form = DB::selectOne(
            'SELECT dfi.id
             FROM digital_form_items dfi
             INNER JOIN profile_items pi ON pi.id = dfi.profile_item_id
             WHERE pi.id = ? AND pi.user_id = ?
             ORDER BY COALESCE(dfi.updated_at, \'1970-01-01\'::timestamp) DESC, dfi.id DESC
             LIMIT 1',
            [$listId, $userId]
        );
        if (!$form) {
            return ['status' => 404, 'body' => ['success' => false, 'message' => 'Formulário não encontrado']];
        }

        $updates = [];
        $bindings = [];
        foreach (self::INSCRICAO_FIELDS as $field) {
            if (!array_key_exists($field, $body)) {
                continue;
            }
            if (!$this->columnExists('digital_form_items', $field)) {
                continue;
            }
            $val = $body[$field];
            if ($field === 'background_opacity') {
                $val = is_numeric($val) ? (float) $val : 1.0;
            } elseif ($field === 'primary_color') {
                $val = $val ?: '#4A90E2';
            } elseif ($field === 'secondary_color') {
                $val = $val ?: '#6BA3F0';
            } elseif ($field === 'background_color') {
                $val = $val ?: '#FFFFFF';
            } elseif ($field === 'background_image_url') {
                $val = $val ?: null;
            }
            $updates[] = "\"{$field}\" = ?";
            $bindings[] = $val;
        }
        if ($updates === []) {
            return ['status' => 200, 'body' => ['success' => true, 'message' => 'Nada para atualizar']];
        }
        $updates[] = 'updated_at = NOW()';
        $bindings[] = (int) $form->id;
        try {
            DB::update('UPDATE digital_form_items SET '.implode(', ', $updates).' WHERE id = ?', $bindings);
        } catch (\Throwable $e) {
            Log::error('guest.customize.inscricao', ['error' => $e->getMessage()]);

            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Erro ao salvar personalização']];
        }

        return ['status' => 200, 'body' => ['success' => true, 'message' => 'Personalização salva com sucesso!']];
    }

    /**
     * @return array<string,mixed>|null
     */
    private function findGuestListForUser(string $userId, int $listId): ?array
    {
        $row = DB::selectOne(
            'SELECT gli.*, pi.id AS profile_item_id, pi.title, pi.user_id
             FROM guest_list_items gli
             INNER JOIN profile_items pi ON pi.id = gli.profile_item_id
             WHERE pi.id = ? AND pi.user_id = ? AND pi.is_active = true
             LIMIT 1',
            [$listId, $userId]
        );

        return $row ? (array) $row : null;
    }

    private function columnExists(string $table, string $column): bool
    {
        static $cache = [];
        $key = $table.'.'.$column;
        if (!array_key_exists($key, $cache)) {
            try {
                $cache[$key] = SchemaMeta::hasColumn($table, $column);
            } catch (\Throwable $e) {
                $cache[$key] = false;
            }
        }

        return $cache[$key];
    }
}
