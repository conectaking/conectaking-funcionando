<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Item de localização do cartão (tabela location_items).
 */
class LocationService
{
    private const FIELDS = ['address', 'address_formatted', 'latitude', 'longitude', 'place_name'];

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function getConfig(int $profileItemId, string $userId): array
    {
        if (! $this->tablesReady()) {
            return $this->err('Localização não encontrada ou acesso negado', 404);
        }
        if (! $this->ownsItem($profileItemId, $userId)) {
            return $this->err('Localização não encontrada ou acesso negado', 404);
        }

        $row = $this->findByProfileItemId($profileItemId);
        if (! $row) {
            return $this->err('Localização não encontrada ou acesso negado', 404);
        }

        return $this->ok($row);
    }

    /**
     * @param  array<string,mixed>  $data
     * @return array{status:int, body:array<string,mixed>}
     */
    public function saveConfig(int $profileItemId, string $userId, array $data): array
    {
        if (! $this->tablesReady()) {
            return $this->err('Tabela location_items indisponível.', 500);
        }
        if (! $this->ownsItem($profileItemId, $userId)) {
            return $this->err('Acesso negado a este item.', 500);
        }

        $row = $this->findByProfileItemId($profileItemId);
        if (! $row) {
            DB::insert('INSERT INTO location_items (profile_item_id) VALUES (?)', [$profileItemId]);
            $row = $this->findByProfileItemId($profileItemId);
        }

        $sets = [];
        $values = [];
        foreach (self::FIELDS as $key) {
            if (! array_key_exists($key, $data)) {
                continue;
            }
            $value = $data[$key];
            if (($key === 'latitude' || $key === 'longitude') && $value !== null) {
                $value = (float) $value;
            }
            $sets[] = "{$key} = ?";
            $values[] = $value;
        }

        if ($sets === []) {
            return $this->ok($row);
        }

        $values[] = $profileItemId;
        DB::update(
            'UPDATE location_items SET '.implode(', ', $sets).', updated_at = NOW() WHERE profile_item_id = ?',
            $values
        );

        return $this->ok($this->findByProfileItemId($profileItemId) ?? $row);
    }

    /**
     * @return array<string,mixed>|null
     */
    private function findByProfileItemId(int $profileItemId): ?array
    {
        $row = DB::selectOne(
            'SELECT id, profile_item_id, address, address_formatted, latitude, longitude, place_name, created_at, updated_at
             FROM location_items WHERE profile_item_id = ? LIMIT 1',
            [$profileItemId]
        );

        return $row ? (array) $row : null;
    }

    private function ownsItem(int $profileItemId, string $userId): bool
    {
        return (bool) DB::selectOne(
            'SELECT 1 AS ok FROM profile_items WHERE id = ? AND user_id = ? LIMIT 1',
            [$profileItemId, $userId]
        );
    }

    private function tablesReady(): bool
    {
        return Schema::hasTable('location_items') && Schema::hasTable('profile_items');
    }

    /**
     * @param  array<string,mixed>|null  $data
     * @return array{status:int, body:array<string,mixed>}
     */
    private function ok(?array $data): array
    {
        return ['status' => 200, 'body' => [
            'success' => true,
            'data' => $data,
            'error' => null,
        ]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    private function err(string $message, int $status): array
    {
        return ['status' => $status, 'body' => [
            'success' => false,
            'data' => null,
            'message' => $message,
            'error' => ['code' => 'ERROR', 'message' => $message],
        ]];
    }
}
