<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\Cache;
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
        $date = $dateStr && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateStr)
            ? $dateStr
            : now('America/Sao_Paulo')->toDateString();
        $trans = strtolower($translation ?: 'nvi');

        $overrides = $this->loadOverrides();
        if (isset($overrides[$date])) {
            $ov = $overrides[$date];
            return [
                'ref' => (string) ($ov['ref'] ?? 'Versículo do Dia'),
                'texto' => (string) ($ov['texto'] ?? ''),
                'reflexao' => $ov['reflexao'] ?? null,
                'date' => $date,
                'translation' => $trans,
                'is_custom' => true,
            ];
        }

        $key = "bible:vod:{$date}:{$trans}";

        return Cache::remember($key, 3600, function () use ($dateStr, $trans, $date) {
            $list = $this->loadList();
            if ($list === []) {
                return null;
            }

            $dayOfYear = $this->dayOfYearIndex($dateStr);
            $index = $dayOfYear % count($list);
            $item = $list[$index];

            return array_merge($item, [
                'texto' => $item['texto'] ?? '',
                'date' => $date,
                'translation' => $trans,
            ]);
        });
    }

    public function setOverride(string $date, array $data): bool
    {
        $overrides = $this->loadOverrides();
        $overrides[$date] = [
            'ref' => (string) ($data['ref'] ?? 'Palavra do Dia'),
            'texto' => (string) ($data['texto'] ?? ''),
            'reflexao' => $data['reflexao'] ?? null,
            'updated_at' => now('America/Sao_Paulo')->toIso8601String(),
        ];
        $path = storage_path('app/bible/verse_overrides.json');
        File::ensureDirectoryExists(dirname($path));
        File::put($path, json_encode($overrides, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        Cache::forget("bible:vod:{$date}:nvi");
        Cache::forget("bible:vod:{$date}:acf");
        Cache::forget("bible:vod:{$date}:aa");
        return true;
    }

    public function removeOverride(string $date): bool
    {
        $overrides = $this->loadOverrides();
        if (isset($overrides[$date])) {
            unset($overrides[$date]);
            $path = storage_path('app/bible/verse_overrides.json');
            File::ensureDirectoryExists(dirname($path));
            File::put($path, json_encode($overrides, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            Cache::forget("bible:vod:{$date}:nvi");
            Cache::forget("bible:vod:{$date}:acf");
            Cache::forget("bible:vod:{$date}:aa");
            return true;
        }
        return false;
    }

    public function loadOverrides(): array
    {
        $path = storage_path('app/bible/verse_overrides.json');
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
