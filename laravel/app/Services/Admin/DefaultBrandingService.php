<?php

namespace App\Services\Admin;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Logomarca padrão do admin (modules/admin/branding), guardada em app_config.default_branding.
 */
class DefaultBrandingService
{
    private const KEY = 'default_branding';

    private const DEFAULT_SIZE = 60;

    /**
     * @return array{logo_url:string|null, logo_size:int, logo_link:string|null}
     */
    public function get(): array
    {
        $raw = [];
        if (Schema::hasTable('app_config')) {
            $row = DB::selectOne('SELECT value FROM app_config WHERE key = ? LIMIT 1', [self::KEY]);
            $value = $row->value ?? null;
            if (is_string($value)) {
                $value = json_decode($value, true);
            }
            $raw = is_array($value) ? $value : [];
        }

        return [
            'logo_url' => $raw['logo_url'] ?? null,
            'logo_size' => isset($raw['logo_size']) ? (int) $raw['logo_size'] : self::DEFAULT_SIZE,
            'logo_link' => $raw['logo_link'] ?? null,
        ];
    }

    /**
     * @param  array<string,mixed>  $input
     */
    public function update(array $input): string
    {
        $logoUrl = $this->trimOrNull($input['logo_url'] ?? null);
        $logoLink = $this->trimOrNull($input['logo_link'] ?? null);
        $size = is_numeric($input['logo_size'] ?? null) ? (int) $input['logo_size'] : self::DEFAULT_SIZE;
        $size = min(420, max(20, $size ?: self::DEFAULT_SIZE));

        DB::insert(
            'INSERT INTO app_config (key, value, updated_at)
             VALUES (?, ?::jsonb, NOW())
             ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()',
            [self::KEY, json_encode([
                'logo_url' => $logoUrl,
                'logo_size' => $size,
                'logo_link' => $logoLink,
            ])]
        );

        return 'Logomarca padrão atualizada. Contas que já definiram a própria logo (modo empresa) não são afetadas.';
    }

    private function trimOrNull(mixed $value): ?string
    {
        if ($value === null || ! is_scalar($value)) {
            return null;
        }
        $trimmed = trim((string) $value);

        return $trimmed !== '' ? $trimmed : null;
    }
}
