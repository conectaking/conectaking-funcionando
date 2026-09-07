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

        $items = [];
        foreach ($rows as $index => $row) {
            $item = (array) $row;
            $type = (string) ($item['item_type'] ?? 'link');
            $item = array_merge($item, $this->enrichEditorItem($item, $type));
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
     * @param  array<string, mixed>  $item
     * @return array<string, mixed>
     */
    private function enrichEditorItem(array $item, string $type): array
    {
        try {
            if ($type === 'digital_form') {
                $df = DB::selectOne(
                    'SELECT * FROM digital_form_items
                     WHERE profile_item_id = ?
                     ORDER BY COALESCE(updated_at, \'1970-01-01\'::timestamp) DESC, id DESC
                     LIMIT 1',
                    [$item['id'] ?? null]
                );
                $data = $df ? (array) $df : ['form_fields' => []];
                if (isset($data['form_fields']) && is_string($data['form_fields'])) {
                    $parsed = json_decode($data['form_fields'], true);
                    $data['form_fields'] = is_array($parsed) ? $parsed : [];
                } elseif (!isset($data['form_fields']) || !is_array($data['form_fields'])) {
                    $data['form_fields'] = [];
                }

                return ['digital_form_data' => $data];
            }
            if ($type === 'contract') {
                $c = DB::selectOne('SELECT * FROM contract_items WHERE profile_item_id = ? LIMIT 1', [$item['id'] ?? null]);

                return ['contract_data' => $c ? (array) $c : []];
            }
            if ($type === 'guest_list') {
                $g = DB::selectOne(
                    'SELECT * FROM guest_list_items
                     WHERE profile_item_id = ?
                     ORDER BY COALESCE(updated_at, \'1970-01-01\'::timestamp) DESC, id DESC
                     LIMIT 1',
                    [$item['id'] ?? null]
                );

                return ['guest_list_data' => $g ? (array) $g : []];
            }
            if ($type === 'bible') {
                $b = DB::selectOne('SELECT * FROM bible_items WHERE profile_item_id = ? LIMIT 1', [$item['id'] ?? null]);

                return [
                    'bible_data' => $b ? (array) $b : [
                        'translation_code' => 'nvi',
                        'is_visible' => true,
                        'verse_position' => 'top',
                        'verse_size' => 'normal',
                    ],
                ];
            }
            if ($type === 'location') {
                $loc = DB::selectOne(
                    'SELECT address, address_formatted, latitude, longitude, place_name
                     FROM location_items WHERE profile_item_id = ? LIMIT 1',
                    [$item['id'] ?? null]
                );

                return ['location_data' => $loc ? (array) $loc : null];
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
