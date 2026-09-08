<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Devocionais 365 a partir de bible_devotionals_365 (sem enriquecimento IA).
 */
class BibleDevotionalService
{
    public function __construct(private readonly BibleTextService $text)
    {
    }

    /**
     * @return array{
     *   day_of_year:int,
     *   titulo:?string,
     *   versiculo_ref:?string,
     *   versiculo_texto:?string,
     *   reflexao:?string,
     *   aplicacao:?string,
     *   oracao:?string
     * }|null
     */
    public function getByDay(int $dayOfYear): ?array
    {
        $day = max(1, min(365, $dayOfYear));
        try {
            $row = DB::selectOne(
                'SELECT day_of_year, titulo, versiculo_ref, versiculo_texto, reflexao, aplicacao, oracao
                 FROM bible_devotionals_365 WHERE day_of_year = ? LIMIT 1',
                [$day]
            );
            if (!$row) {
                return null;
            }

            return $this->shape($row);
        } catch (\Throwable $e) {
            Log::warning('bible.devotional.get', ['day' => $day, 'error' => $e->getMessage()]);

            return null;
        }
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getForDate(?string $dateStr = null): ?array
    {
        $day = $this->dayOfYear($dateStr);
        $shaped = $this->getByDay($day);
        if (!$shaped) {
            return null;
        }
        $date = $dateStr && preg_match('/^\d{4}-\d{2}-\d{2}$/', $dateStr)
            ? $dateStr
            : now('America/Sao_Paulo')->toDateString();

        return array_merge($shaped, [
            'versiculo' => $shaped['versiculo_ref'],
            'texto' => $shaped['reflexao'],
            'date' => $date,
        ]);
    }

    public function dayOfYear(?string $dateStr = null): int
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
        $day += $d;

        return max(1, min(365, $day));
    }

    public function hasContent(array $row): bool
    {
        foreach (['titulo', 'versiculo_ref', 'versiculo_texto', 'reflexao', 'aplicacao', 'oracao'] as $k) {
            if (!empty(trim((string) ($row[$k] ?? '')))) {
                return true;
            }
        }

        return false;
    }

    /**
     * Plano de leitura do dia + devocional embutido (quando existir).
     *
     * @return array<string, mixed>|null
     */
    public function readingPlanDay(int $dayNumber): ?array
    {
        $day = max(1, min(365, $dayNumber));
        try {
            $plan = DB::selectOne(
                'SELECT day_number, book_id, chapter_from, chapter_to, verse_count, summary
                 FROM bible_reading_plan_days WHERE day_number = ? LIMIT 1',
                [$day]
            );
        } catch (\Throwable $e) {
            $plan = null;
            try {
                $plan = DB::selectOne(
                    'SELECT day_number, book_id, chapter_from, chapter_to, verse_count
                     FROM bible_reading_plan_days WHERE day_number = ? LIMIT 1',
                    [$day]
                );
            } catch (\Throwable $e2) {
                Log::warning('bible.readingPlan', ['error' => $e2->getMessage()]);
            }
        }

        $dev = $this->getByDay($day);
        $fallback = null;
        if (!$plan) {
            $fallback = $this->text->readingPlanDayFallback($day);
        }

        if (!$plan && !$fallback && !$dev) {
            return null;
        }

        if ($plan) {
            $out = [
                'day_number' => (int) $plan->day_number,
                'book_id' => (string) ($plan->book_id ?? ''),
                'chapter_from' => isset($plan->chapter_from) ? (int) $plan->chapter_from : null,
                'chapter_to' => isset($plan->chapter_to) ? (int) $plan->chapter_to : null,
                'verse_count' => isset($plan->verse_count) ? (int) $plan->verse_count : null,
                'summary' => isset($plan->summary) ? (string) $plan->summary : null,
                'source' => 'db',
            ];
        } elseif ($fallback) {
            $out = array_merge($fallback, ['source' => 'fallback']);
        } else {
            $out = [
                'day_number' => $day,
                'book_id' => null,
                'chapter_from' => null,
                'chapter_to' => null,
                'verse_count' => null,
                'summary' => null,
                'source' => 'devotional-only',
            ];
        }
        $out['devocional'] = $dev;

        return $out;
    }

    /**
     * @return array{success:bool, day_of_year:int}
     */
    public function markRead(?string $userId, ?string $visitorId, mixed $dayOfYear, ?string $userNote = null, ?string $slug = null): array
    {
        $day = (int) $dayOfYear;
        if ($day < 1 || $day > 365) {
            throw new \InvalidArgumentException('day_of_year deve ser entre 1 e 365');
        }
        if (!$userId && !$visitorId) {
            throw new \InvalidArgumentException('Informe user_id (logado) ou visitor_id');
        }

        if ($userId) {
            $ex = DB::selectOne(
                'SELECT id FROM bible_devotional_reads WHERE user_id = ? AND day_of_year = ?',
                [$userId, $day]
            );
            if ($ex) {
                DB::update(
                    'UPDATE bible_devotional_reads SET read_at = NOW(), user_note = COALESCE(?, user_note)
                     WHERE user_id = ? AND day_of_year = ?',
                    [$userNote, $userId, $day]
                );
            } else {
                DB::insert(
                    'INSERT INTO bible_devotional_reads (user_id, day_of_year, user_note, slug) VALUES (?, ?, ?, ?)',
                    [$userId, $day, $userNote, $slug]
                );
            }
        } else {
            $vid = substr((string) $visitorId, 0, 64);
            if ($vid === '') {
                throw new \InvalidArgumentException('visitor_id não pode ser vazio');
            }
            $ex = DB::selectOne(
                'SELECT id FROM bible_devotional_reads WHERE visitor_id = ? AND day_of_year = ?',
                [$vid, $day]
            );
            if ($ex) {
                DB::update(
                    'UPDATE bible_devotional_reads SET read_at = NOW(), user_note = COALESCE(?, user_note)
                     WHERE visitor_id = ? AND day_of_year = ?',
                    [$userNote, $vid, $day]
                );
            } else {
                DB::insert(
                    'INSERT INTO bible_devotional_reads (visitor_id, day_of_year, user_note, slug) VALUES (?, ?, ?, ?)',
                    [$vid, $day, $userNote, $slug]
                );
            }
        }

        return ['success' => true, 'day_of_year' => $day];
    }

    /**
     * @return list<array{day_of_year:int, read_at:mixed, user_note:?string}>
     */
    public function getReadStatus(?string $userId, ?string $visitorId, mixed $days = null): array
    {
        $dayList = [];
        if ($days !== null && $days !== '') {
            $dayList = array_values(array_unique(array_filter(
                array_map(static fn ($d) => (int) trim((string) $d), explode(',', (string) $days)),
                static fn ($d) => $d >= 1 && $d <= 365
            )));
        }

        try {
            if ($userId) {
                if ($dayList !== []) {
                    $ph = implode(',', array_fill(0, count($dayList), '?'));
                    $rows = DB::select(
                        "SELECT day_of_year, read_at, user_note FROM bible_devotional_reads
                         WHERE user_id = ? AND day_of_year IN ({$ph})",
                        array_merge([$userId], $dayList)
                    );
                } else {
                    $rows = DB::select(
                        'SELECT day_of_year, read_at, user_note FROM bible_devotional_reads WHERE user_id = ?',
                        [$userId]
                    );
                }
            } elseif ($visitorId) {
                $vid = substr((string) $visitorId, 0, 64);
                if ($dayList !== []) {
                    $ph = implode(',', array_fill(0, count($dayList), '?'));
                    $rows = DB::select(
                        "SELECT day_of_year, read_at, user_note FROM bible_devotional_reads
                         WHERE visitor_id = ? AND day_of_year IN ({$ph})",
                        array_merge([$vid], $dayList)
                    );
                } else {
                    $rows = DB::select(
                        'SELECT day_of_year, read_at, user_note FROM bible_devotional_reads WHERE visitor_id = ?',
                        [$vid]
                    );
                }
            } else {
                return [];
            }
        } catch (\Throwable) {
            return [];
        }

        return array_map(static fn ($r) => [
            'day_of_year' => (int) $r->day_of_year,
            'read_at' => $r->read_at,
            'user_note' => $r->user_note !== null ? (string) $r->user_note : null,
        ], $rows);
    }

    /**
     * @param  object  $row
     * @return array{
     *   day_of_year:int,
     *   titulo:?string,
     *   versiculo_ref:?string,
     *   versiculo_texto:?string,
     *   reflexao:?string,
     *   aplicacao:?string,
     *   oracao:?string
     * }
     */
    private function shape(object $row): array
    {
        return [
            'day_of_year' => (int) $row->day_of_year,
            'titulo' => $row->titulo !== null ? (string) $row->titulo : null,
            'versiculo_ref' => $row->versiculo_ref !== null ? (string) $row->versiculo_ref : null,
            'versiculo_texto' => $row->versiculo_texto !== null ? (string) $row->versiculo_texto : null,
            'reflexao' => $row->reflexao !== null ? (string) $row->reflexao : null,
            'aplicacao' => $row->aplicacao !== null ? (string) $row->aplicacao : null,
            'oracao' => $row->oracao !== null ? (string) $row->oracao : null,
        ];
    }
}
