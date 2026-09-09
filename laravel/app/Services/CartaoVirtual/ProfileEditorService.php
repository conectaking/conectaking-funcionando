<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Leitura do perfil para o editor/dashboard (GET /api/profile).
 */
class ProfileEditorService
{
    /**
     * @return array{details:array<string,mixed>,items:list<array<string,mixed>>}|null
     */
    public function getFullProfile(string $userId): ?array
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

        $maps = $this->loadEnrichmentMaps($ids);

        $items = [];
        foreach ($rows as $index => $row) {
            $item = (array) $row;
            $type = (string) ($item['item_type'] ?? 'link');
            $item = array_merge($item, $this->enrichEditorItem($item, $type, $maps));
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
    private function loadEnrichmentMaps(array $profileItemIds): array
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
                if (isset($data['form_fields']) && is_string($data['form_fields'])) {
                    $parsed = json_decode($data['form_fields'], true);
                    $data['form_fields'] = is_array($parsed) ? $parsed : [];
                } elseif (!isset($data['form_fields']) || !is_array($data['form_fields'])) {
                    $data['form_fields'] = [];
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
    private function enrichEditorItem(array $item, string $type, array $maps): array
    {
        try {
            $id = (string) ($item['id'] ?? '');

            if ($type === 'digital_form') {
                $data = $maps['digital_form'][$id] ?? ['form_fields' => []];

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
