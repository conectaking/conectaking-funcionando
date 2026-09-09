<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class BibleConfigService
{
    /**
     * @return array<string, mixed>
     */
    public function getConfig(int $profileItemId, string $userId): array
    {
        if (! $this->ownsItem($profileItemId, $userId)) {
            throw new \RuntimeException('Sem permissão para este item.');
        }

        $item = $this->findOrCreate($profileItemId);
        $item['profile_slug'] = $this->profileSlug($profileItemId, $userId);

        return $item;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function saveConfig(int $profileItemId, string $userId, array $data): array
    {
        if (! $this->ownsItem($profileItemId, $userId)) {
            throw new \RuntimeException('Sem permissão para este item.');
        }

        $this->findOrCreate($profileItemId);

        $allowed = ['translation_code', 'voice_id', 'is_visible', 'verse_position', 'verse_size'];
        $sets = [];
        $values = [];

        foreach ($allowed as $key) {
            if (! array_key_exists($key, $data)) {
                continue;
            }
            $val = $data[$key];
            if ($key === 'verse_position') {
                $val = in_array((string) $val, ['top', 'bottom'], true) ? (string) $val : 'top';
            }
            if ($key === 'verse_size') {
                $val = in_array((string) $val, ['normal', 'small', 'xsmall'], true) ? (string) $val : 'normal';
            }
            if ($key === 'is_visible') {
                $val = filter_var($val, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
                if ($val === null) {
                    $val = true;
                }
            }
            $sets[] = "{$key} = ?";
            $values[] = $val;
        }

        if ($sets !== []) {
            $values[] = $profileItemId;
            DB::update(
                'UPDATE bible_items SET '.implode(', ', $sets).', updated_at = NOW() WHERE profile_item_id = ?',
                $values
            );
        }

        return $this->getConfig($profileItemId, $userId);
    }

    private function ownsItem(int $profileItemId, string $userId): bool
    {
        $row = DB::selectOne(
            'SELECT 1 AS ok FROM profile_items WHERE id = ? AND user_id = ? LIMIT 1',
            [$profileItemId, $userId]
        );

        return (bool) $row;
    }

    /**
     * @return array<string, mixed>
     */
    private function findOrCreate(int $profileItemId): array
    {
        if (! Schema::hasTable('bible_items')) {
            return [
                'profile_item_id' => $profileItemId,
                'translation_code' => 'nvi',
                'is_visible' => true,
                'verse_position' => 'top',
                'verse_size' => 'normal',
            ];
        }

        $row = DB::selectOne('SELECT * FROM bible_items WHERE profile_item_id = ? LIMIT 1', [$profileItemId]);
        if ($row) {
            return (array) $row;
        }

        DB::insert(
            "INSERT INTO bible_items (profile_item_id, translation_code, is_visible) VALUES (?, 'nvi', true)",
            [$profileItemId]
        );

        $row = DB::selectOne('SELECT * FROM bible_items WHERE profile_item_id = ? LIMIT 1', [$profileItemId]);

        return $row ? (array) $row : [
            'profile_item_id' => $profileItemId,
            'translation_code' => 'nvi',
            'is_visible' => true,
        ];
    }

    private function profileSlug(int $profileItemId, string $userId): ?string
    {
        $row = DB::selectOne(
            'SELECT u.profile_slug
             FROM profile_items pi
             INNER JOIN users u ON u.id = pi.user_id
             WHERE pi.id = ? AND pi.user_id = ?
             LIMIT 1',
            [$profileItemId, $userId]
        );

        return $row->profile_slug ?? null;
    }
}
