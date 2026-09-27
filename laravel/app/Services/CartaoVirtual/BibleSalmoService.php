<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\File;

/**
 * Salmo do dia a partir de resources/data/bible/salmos_do_dia.json.
 */
class BibleSalmoService
{
    /** @var list<array<string, mixed>>|null */
    private static ?array $cache = null;

    /**
     * @return array<string, mixed>|null
     */
    public function get(?string $dateStr = null): ?array
    {
        $date = $dateStr && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateStr)
            ? $dateStr
            : now('America/Sao_Paulo')->toDateString();

        $overrides = $this->loadOverrides();
        if (isset($overrides[$date])) {
            $ov = $overrides[$date];
            return [
                'capitulo' => isset($ov['capitulo']) ? (int) $ov['capitulo'] : null,
                'versiculo' => isset($ov['versiculo']) ? (int) $ov['versiculo'] : null,
                'ref' => (string) ($ov['ref'] ?? 'Salmo do Dia'),
                'texto' => (string) ($ov['texto'] ?? ''),
                'reflexao' => isset($ov['reflexao']) ? (string) $ov['reflexao'] : null,
                'date' => $date,
                'is_custom' => true,
            ];
        }

        $list = $this->loadList();
        if ($list === []) {
            return null;
        }
        $index = app(VerseOfDayService::class)->dayIndexForRotation($dateStr) % count($list);
        $item = $list[$index];

        return [
            'capitulo' => isset($item['capitulo']) ? (int) $item['capitulo'] : null,
            'versiculo' => isset($item['versiculo']) ? (int) $item['versiculo'] : null,
            'ref' => (string) ($item['ref'] ?? ''),
            'texto' => (string) ($item['texto'] ?? ''),
            'reflexao' => isset($item['reflexao']) ? (string) $item['reflexao'] : null,
            'date' => $date,
        ];
    }

    public function setOverride(string $date, array $data): bool
    {
        $overrides = $this->loadOverrides();
        $overrides[$date] = [
            'ref' => (string) ($data['ref'] ?? 'Salmo do Dia'),
            'texto' => (string) ($data['texto'] ?? ''),
            'reflexao' => $data['reflexao'] ?? null,
            'capitulo' => isset($data['capitulo']) ? (int) $data['capitulo'] : null,
            'versiculo' => isset($data['versiculo']) ? (int) $data['versiculo'] : null,
            'updated_at' => now('America/Sao_Paulo')->toIso8601String(),
        ];
        $path = storage_path('app/bible/salmo_overrides.json');
        File::ensureDirectoryExists(dirname($path));
        File::put($path, json_encode($overrides, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        return true;
    }

    public function removeOverride(string $date): bool
    {
        $overrides = $this->loadOverrides();
        if (isset($overrides[$date])) {
            unset($overrides[$date]);
            $path = storage_path('app/bible/salmo_overrides.json');
            File::ensureDirectoryExists(dirname($path));
            File::put($path, json_encode($overrides, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            return true;
        }
        return false;
    }

    public function loadOverrides(): array
    {
        $path = storage_path('app/bible/salmo_overrides.json');
        if (!File::exists($path)) {
            return [];
        }
        try {
            $decoded = json_decode(File::get($path), true);
            return is_array($decoded) ? $decoded : [];
        } catch (\Throwable) {
            return [];
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function loadList(): array
    {
        if (self::$cache !== null) {
            return self::$cache;
        }
        $path = resource_path('data/bible/salmos_do_dia.json');
        if (!File::exists($path)) {
            self::$cache = [];

            return self::$cache;
        }
        $decoded = json_decode(File::get($path), true);
        self::$cache = is_array($decoded) ? array_values($decoded) : [];

        return self::$cache;
    }
}
