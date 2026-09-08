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
        $list = $this->loadList();
        if ($list === []) {
            return null;
        }
        $index = app(VerseOfDayService::class)->dayIndexForRotation($dateStr) % count($list);
        $item = $list[$index];
        $date = $dateStr && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateStr)
            ? $dateStr
            : now('America/Sao_Paulo')->toDateString();

        return [
            'capitulo' => isset($item['capitulo']) ? (int) $item['capitulo'] : null,
            'versiculo' => isset($item['versiculo']) ? (int) $item['versiculo'] : null,
            'ref' => (string) ($item['ref'] ?? ''),
            'texto' => (string) ($item['texto'] ?? ''),
            'reflexao' => isset($item['reflexao']) ? (string) $item['reflexao'] : null,
            'date' => $date,
        ];
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
