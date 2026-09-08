<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\File;

/**
 * Versículo do dia a partir de resources/data/bible/verse_of_day.json (paridade Node).
 */
class VerseOfDayService
{
    /** @var list<array<string, mixed>>|null */
    private static ?array $cache = null;

    /**
     * @return array<string, mixed>|null
     */
    public function get(?string $dateStr = null, string $translation = 'nvi'): ?array
    {
        $list = $this->loadList();
        if ($list === []) {
            return null;
        }

        $dayOfYear = $this->dayOfYearIndex($dateStr);
        $index = $dayOfYear % count($list);
        $item = $list[$index];

        // Traduções completas ficam no Node; aqui usamos o texto do JSON (padrão NVI).
        $date = $dateStr && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateStr)
            ? $dateStr
            : now('America/Sao_Paulo')->toDateString();

        return array_merge($item, [
            'texto' => $item['texto'] ?? '',
            'date' => $date,
            'translation' => strtolower($translation ?: 'nvi'),
        ]);
    }

    /** Índice 0-based do dia no ano (igual Node getVerseOfDayIndex) para rotação de listas. */
    public function dayIndexForRotation(?string $dateStr = null): int
    {
        return $this->dayOfYearIndex($dateStr);
    }

    /**
     * Formato usado pelo Blade do cartão.
     *
     * @return array{ref:string,texto:string,reflexao:?string}|null
     */
    public function forCard(?string $translation = 'nvi'): ?array
    {
        $verse = $this->get(null, $translation ?: 'nvi');
        if (!$verse || empty($verse['texto'])) {
            return null;
        }

        return [
            'ref' => (string) ($verse['ref'] ?? 'Versículo do Dia'),
            'texto' => (string) $verse['texto'],
            'reflexao' => $verse['reflexao'] ?? null,
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

        $paths = [
            resource_path('data/bible/verse_of_day.json'),
            storage_path('app/bible/verse_of_day.json'),
            base_path('data/bible/verse_of_day.json'),
        ];

        foreach ($paths as $path) {
            if (!File::exists($path)) {
                continue;
            }
            try {
                $decoded = json_decode(File::get($path), true);
                if (is_array($decoded) && $decoded !== []) {
                    self::$cache = array_values($decoded);

                    return self::$cache;
                }
            } catch (\Throwable $e) {
                // try next
            }
        }

        self::$cache = [];

        return self::$cache;
    }

    private function dayOfYearIndex(?string $dateStr): int
    {
        if ($dateStr && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateStr)) {
            [$y, $m, $d] = array_map('intval', explode('-', $dateStr));
        } else {
            $now = now('America/Sao_Paulo');
            $y = (int) $now->year;
            $m = (int) $now->month;
            $d = (int) $now->day;
        }

        $daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        if (($y % 4 === 0 && $y % 100 !== 0) || ($y % 400 === 0)) {
            $daysInMonth[1] = 29;
        }

        $day = 0;
        for ($i = 0; $i < $m - 1; $i++) {
            $day += $daysInMonth[$i];
        }

        return $day + $d;
    }
}
