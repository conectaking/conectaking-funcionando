<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Leitura do perfil para o editor/dashboard (GET /api/profile).
 *
 * Contrato:
 * - full (default): enrichment completo — form_fields, custom_form_fields, contract/bible/location.
 * - slim (?fields=slim|&slim=1): lista dashboard-friendly — ids, titles, types, order, flags;
 *   omite form_fields / custom_form_fields e payloads pesados; mantém meta leve por tipo.
 */
class ProfileEditorService
{
    /**
     * @return array{details:array<string,mixed>,items:list<array<string,mixed>>,mode?:string}|null
     */
    public function getFullProfile(string $userId, bool $slim = false): ?array
    {
        $info = DB::selectOne(
            'SELECT u.id, u.email, u.profile_slug, p.*
             FROM users u
             LEFT JOIN user_profiles p ON u.id = p.user_id
             WHERE u.id = ?
             LIMIT 1',
            [$userId]
        );

        if (!$info) {
            return null;
        }

        $this->ensureDefaultBibleItem($userId);

        $details = (array) $info;
        $details['avatar_format'] = $details['avatar_format'] ?? 'circular';
        $details['card_layout'] = $details['card_layout'] ?? 'classic';
        $details['logo_spacing'] = $details['logo_spacing'] ?? 'center';
        $details['button_color_rgb'] = $this->hexToRgb($details['button_color'] ?? null);
        $details['card_color_rgb'] = $this->hexToRgb($details['card_background_color'] ?? null);

        $rows = DB::select(
            'SELECT * FROM profile_items WHERE user_id = ? ORDER BY display_order ASC',
            [$userId]
        );

        $ids = [];
        foreach ($rows as $row) {
            if (!empty($row->id)) {
                $ids[] = $row->id;
            }
        }

        $maps = $this->loadEnrichmentMaps($ids, $slim);

        $items = [];
        foreach ($rows as $index => $row) {
            $item = (array) $row;
            $type = (string) ($item['item_type'] ?? 'link');
            $item = array_merge($item, $this->enrichEditorItem($item, $type, $maps, $slim));
            $items[] = [
                ...$item,
                'id' => $item['id'] ?? null,
                'item_type' => $type !== '' ? $type : 'link',
                'title' => $item['title'] ?? $type,
                'display_order' => is_numeric($item['display_order'] ?? null) ? (int) $item['display_order'] : $index,
                'is_active' => ($item['is_active'] ?? true) !== false && ($item['is_active'] ?? true) !== 'f',
                'image_url' => $item['image_url'] ?? null,
            ];
        }

        return [
            'details' => $details,
            'items' => $items,
            'mode' => $slim ? 'slim' : 'full',
        ];
    }

    /**
     * @param  list<string|int>  $profileItemIds
     * @return array{
     *   digital_form: array<string, array<string, mixed>>,
     *   contract: array<string, array<string, mixed>>,
     *   guest_list: array<string, array<string, mixed>>,
     *   bible: array<string, array<string, mixed>>,
     *   location: array<string, array<string, mixed>>
     * }
     */
    private function loadEnrichmentMaps(array $profileItemIds, bool $slim = false): array
    {
        $maps = [
            'digital_form' => [],
            'contract' => [],
            'guest_list' => [],
            'bible' => [],
            'location' => [],
        ];

        if ($profileItemIds === []) {
            return $maps;
        }

        $placeholders = implode(',', array_fill(0, count($profileItemIds), '?'));

        try {
            $digitalForms = DB::select(
                "SELECT DISTINCT ON (profile_item_id) *
                 FROM digital_form_items
                 WHERE profile_item_id IN ({$placeholders})
                 ORDER BY profile_item_id,
                          COALESCE(updated_at, '1970-01-01'::timestamp) DESC,
                          id DESC",
                $profileItemIds
            );
            foreach ($digitalForms as $row) {
                $data = (array) $row;
                $key = (string) ($data['profile_item_id'] ?? '');
                if ($key === '') {
                    continue;
                }
                $fieldsRaw = $data['form_fields'] ?? null;
                $parsedFields = [];
                if (is_string($fieldsRaw)) {
                    $decoded = json_decode($fieldsRaw, true);
                    $parsedFields = is_array($decoded) ? $decoded : [];
                } elseif (is_array($fieldsRaw)) {
                    $parsedFields = $fieldsRaw;
                }
                if ($slim) {
                    // Contrato slim: omitir form_fields; expor só fields_count
                    $data['fields_count'] = count($parsedFields);
                    $data['form_fields'] = [];
                    unset($data['confirmation_message'], $data['email_template'], $data['webhook_payload']);
                } else {
                    $data['form_fields'] = $parsedFields;
                }
                $maps['digital_form'][$key] = $data;
            }
        } catch (\Throwable $e) {
            Log::warning('profile.editor.enrich.batch', ['type' => 'digital_form', 'error' => $e->getMessage()]);
        }

        try {
            $contracts = DB::select(
                "SELECT DISTINCT ON (profile_item_id) *
                 FROM contract_items
                 WHERE profile_item_id IN ({$placeholders})
                 ORDER BY profile_item_id, id DESC",
                $profileItemIds
            );
            foreach ($contracts as $row) {
                $data = (array) $row;
                $key = (string) ($data['profile_item_id'] ?? '');
                if ($key !== '') {
                    if ($slim) {
                        // Manter ids/flags; omitir corpo do contrato se existir
                        unset($data['contract_html'], $data['contract_text'], $data['content'], $data['body']);
                    }
                    $maps['contract'][$key] = $data;
                }
            }
        } catch (\Throwable $e) {
            Log::warning('profile.editor.enrich.batch', ['type' => 'contract', 'error' => $e->getMessage()]);
        }

        try {
            $guestLists = DB::select(
                "SELECT DISTINCT ON (profile_item_id) *
                 FROM guest_list_items
                 WHERE profile_item_id IN ({$placeholders})
                 ORDER BY profile_item_id,
                          COALESCE(updated_at, '1970-01-01'::timestamp) DESC,
                          id DESC",
                $profileItemIds
            );
            foreach ($guestLists as $row) {
                $data = (array) $row;
                $key = (string) ($data['profile_item_id'] ?? '');
                if ($key !== '') {
                    if ($slim) {
                        unset(
                            $data['custom_form_fields'],
                            $data['form_fields'],
                            $data['portaria_config'],
                            $data['confirmacao_config'],
                            $data['inscricao_config']
                        );
                    }
                    $maps['guest_list'][$key] = $data;
                }
            }
        } catch (\Throwable $e) {
            Log::warning('profile.editor.enrich.batch', ['type' => 'guest_list', 'error' => $e->getMessage()]);
        }

        try {
            $bibles = DB::select(
                "SELECT DISTINCT ON (profile_item_id) *
                 FROM bible_items
                 WHERE profile_item_id IN ({$placeholders})
                 ORDER BY profile_item_id, id DESC",
                $profileItemIds
            );
            foreach ($bibles as $row) {
                $data = (array) $row;
                $key = (string) ($data['profile_item_id'] ?? '');
                if ($key !== '') {
                    $maps['bible'][$key] = $data;
                }
            }
        } catch (\Throwable $e) {
            Log::warning('profile.editor.enrich.batch', ['type' => 'bible', 'error' => $e->getMessage()]);
        }

        try {
            $locations = DB::select(
                "SELECT DISTINCT ON (profile_item_id)
                        profile_item_id, address, address_formatted, latitude, longitude, place_name
                 FROM location_items
                 WHERE profile_item_id IN ({$placeholders})
                 ORDER BY profile_item_id, id DESC",
                $profileItemIds
            );
            foreach ($locations as $row) {
                $data = (array) $row;
                $key = (string) ($data['profile_item_id'] ?? '');
                if ($key === '') {
                    continue;
                }
                unset($data['profile_item_id']);
                $maps['location'][$key] = $data;
            }
        } catch (\Throwable $e) {
            Log::warning('profile.editor.enrich.batch', ['type' => 'location', 'error' => $e->getMessage()]);
        }

        return $maps;
    }

    /**
     * @param  array<string, mixed>  $item
     * @param  array{
     *   digital_form: array<string, array<string, mixed>>,
     *   contract: array<string, array<string, mixed>>,
     *   guest_list: array<string, array<string, mixed>>,
     *   bible: array<string, array<string, mixed>>,
     *   location: array<string, array<string, mixed>>
     * }  $maps
     * @return array<string, mixed>
     */
    private function enrichEditorItem(array $item, string $type, array $maps, bool $slim = false): array
    {
        try {
            $id = (string) ($item['id'] ?? '');

            if ($type === 'digital_form') {
                $data = $maps['digital_form'][$id] ?? ['form_fields' => []];
                if ($slim && ! isset($data['form_fields'])) {
                    $data['form_fields'] = [];
                }

                return ['digital_form_data' => $data];
            }
            if ($type === 'contract') {
                return ['contract_data' => $maps['contract'][$id] ?? []];
            }
            if ($type === 'guest_list') {
                return ['guest_list_data' => $maps['guest_list'][$id] ?? []];
            }
            if ($type === 'bible') {
                return [
                    'bible_data' => $maps['bible'][$id] ?? [
                        'translation_code' => 'nvi',
                        'is_visible' => true,
                        'verse_position' => 'top',
                        'verse_size' => 'normal',
                    ],
                ];
            }
            if ($type === 'location') {
                return ['location_data' => $maps['location'][$id] ?? null];
            }
        } catch (\Throwable $e) {
            Log::warning('profile.editor.enrich', ['type' => $type, 'error' => $e->getMessage()]);
        }

        return [];
    }

    private function ensureDefaultBibleItem(string $userId): void
    {
        try {
            $cnt = DB::selectOne('SELECT COUNT(*)::int AS c FROM profile_items WHERE user_id = ?', [$userId]);
            if (($cnt->c ?? 0) > 0) {
                return;
            }
            $id = DB::selectOne(
                "INSERT INTO profile_items (user_id, item_type, title, is_active, display_order)
                 VALUES (?, 'bible', 'Bíblia', true, 0) RETURNING id",
                [$userId]
            );
            if ($id && !empty($id->id)) {
                DB::insert(
                    'INSERT INTO bible_items (profile_item_id, translation_code, is_visible) VALUES (?, \'nvi\', true)',
                    [$id->id]
                );
            }
        } catch (\Throwable $e) {
            Log::warning('profile.editor.ensureDefault', ['error' => $e->getMessage()]);
        }
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
