<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BibleAdminDev365Service
{
    public function __construct(
        private readonly BibleDevotionalService $devotionals,
        private readonly BibleDevotionalAiService $ai,
    ) {
    }

    /**
     * @return array{days:list<array{day:int,has_devocional:bool}>}
     */
    public function daysIndex(): array
    {
        $with = [];
        try {
            $rows = DB::select('SELECT day_of_year FROM bible_devotionals_365 ORDER BY day_of_year');
            $with = array_map(static fn ($r) => (int) $r->day_of_year, $rows);
        } catch (\Throwable) {
        }
        $set = array_flip($with);
        $days = [];
        for ($i = 1; $i <= 365; $i++) {
            $days[] = ['day' => $i, 'has_devocional' => isset($set[$i])];
        }

        return ['days' => $days];
    }

    /**
     * @return array{rows:list<array<string,mixed>>}
     */
    public function adminFull(): array
    {
        $rows = DB::select(
            'SELECT day_of_year, titulo, versiculo_ref, versiculo_texto, reflexao, aplicacao, oracao
             FROM bible_devotionals_365 ORDER BY day_of_year ASC'
        );

        return [
            'rows' => array_map(static fn ($r) => [
                'day_of_year' => (int) $r->day_of_year,
                'titulo' => (string) ($r->titulo ?? ''),
                'versiculo_ref' => (string) ($r->versiculo_ref ?? ''),
                'versiculo_texto' => (string) ($r->versiculo_texto ?? ''),
                'reflexao' => (string) ($r->reflexao ?? ''),
                'aplicacao' => (string) ($r->aplicacao ?? ''),
                'oracao' => (string) ($r->oracao ?? ''),
            ], $rows),
        ];
    }

    /**
     * @return array<string,mixed>|null
     */
    public function getDay(int $day): ?array
    {
        return $this->devotionals->getByDay($day);
    }

    /**
     * @param  array<string,mixed>  $body
     */
    public function upsert(int $day, array $body): void
    {
        if ($day < 1 || $day > 365) {
            throw new \InvalidArgumentException('Dia deve ser entre 1 e 365.');
        }
        DB::statement(
            'INSERT INTO bible_devotionals_365 (day_of_year, titulo, versiculo_ref, versiculo_texto, reflexao, aplicacao, oracao)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT (day_of_year) DO UPDATE SET
               titulo = EXCLUDED.titulo,
               versiculo_ref = EXCLUDED.versiculo_ref,
               versiculo_texto = EXCLUDED.versiculo_texto,
               reflexao = EXCLUDED.reflexao,
               aplicacao = EXCLUDED.aplicacao,
               oracao = EXCLUDED.oracao',
            [
                $day,
                (string) ($body['titulo'] ?? ''),
                (string) ($body['versiculo_ref'] ?? ''),
                (string) ($body['versiculo_texto'] ?? ''),
                (string) ($body['reflexao'] ?? ''),
                (string) ($body['aplicacao'] ?? ''),
                (string) ($body['oracao'] ?? ''),
            ]
        );
    }

    public function delete(int $day): bool
    {
        if ($day < 1 || $day > 365) {
            return false;
        }
        $n = DB::delete('DELETE FROM bible_devotionals_365 WHERE day_of_year = ?', [$day]);

        return $n > 0;
    }

    /**
     * @return array<string,string> month => theme
     */
    public function getMonthThemes(int $year): array
    {
        $out = [];
        for ($m = 1; $m <= 12; $m++) {
            $out[(string) $m] = '';
        }
        try {
            $rows = DB::select(
                'SELECT month, theme_text FROM bible_dev365_month_themes WHERE year = ? ORDER BY month',
                [$year]
            );
            foreach ($rows as $r) {
                $out[(string) ((int) $r->month)] = (string) ($r->theme_text ?? '');
            }
        } catch (\Throwable $e) {
            Log::warning('dev365.themes.get', ['error' => $e->getMessage()]);
        }

        return $out;
    }

    /**
     * @param  array<string,mixed>  $themes
     * @return array<string,string>
     */
    public function setAllMonthThemes(int $year, array $themes): array
    {
        for ($m = 1; $m <= 12; $m++) {
            $key = (string) $m;
            if (!array_key_exists($key, $themes) && !array_key_exists($m, $themes)) {
                continue;
            }
            $text = (string) ($themes[$key] ?? $themes[$m] ?? '');
            $this->setMonthTheme($year, $m, $text);
        }

        return $this->getMonthThemes($year);
    }

    /**
     * @return array<string,string>
     */
    public function setMonthTheme(int $year, int $month, string $text): array
    {
        $m = max(1, min(12, $month));
        $text = mb_substr(trim($text), 0, 500);
        try {
            DB::statement(
                'INSERT INTO bible_dev365_month_themes (year, month, theme_text, updated_at)
                 VALUES (?, ?, ?, NOW())
                 ON CONFLICT (year, month) DO UPDATE SET theme_text = EXCLUDED.theme_text, updated_at = NOW()',
                [$year, $m, $text]
            );
        } catch (\Throwable $e) {
            // fallback sem updated_at / unique
            try {
                $ex = DB::selectOne(
                    'SELECT 1 FROM bible_dev365_month_themes WHERE year = ? AND month = ?',
                    [$year, $m]
                );
                if ($ex) {
                    DB::update(
                        'UPDATE bible_dev365_month_themes SET theme_text = ? WHERE year = ? AND month = ?',
                        [$text, $year, $m]
                    );
                } else {
                    DB::insert(
                        'INSERT INTO bible_dev365_month_themes (year, month, theme_text) VALUES (?, ?, ?)',
                        [$year, $m, $text]
                    );
                }
            } catch (\Throwable $e2) {
                Log::error('dev365.themes.set', ['error' => $e2->getMessage()]);
                throw $e2;
            }
        }

        return $this->getMonthThemes($year);
    }

    /**
     * @param  array{temaModo?:string,temaPersonalizado?:string,estilo?:string}  $options
     * @return array{ok:bool,error?:string,data?:array<string,mixed>}
     */
    public function generateDayAndSave(int $day, int $year, array $options = []): array
    {
        if ($day < 1 || $day > 365) {
            return ['ok' => false, 'error' => 'Dia 1–365.'];
        }
        $y = $year >= 2000 && $year <= 2100 ? $year : (int) now('America/Sao_Paulo')->year;
        $md = $this->devotionals->calendarMonthDay($day, $y);
        $monthDays = $this->daysInCalendarMonth($y, $md['month']);
        $other = array_values(array_filter($monthDays, static fn ($d) => $d !== $day));
        $avoidRows = $this->snapshotsForDays($other);
        $theme = $this->devotionals->resolveThemeForDay($day, $y, [
            'temaModo' => (string) ($options['temaModo'] ?? 'mes_auto'),
            'temaPersonalizado' => (string) ($options['temaPersonalizado'] ?? ''),
        ]);
        $estilo = strtolower((string) ($options['estilo'] ?? 'padrao')) === 'cunha' ? 'cunha' : 'padrao';

        $retryExtra = '';
        $full = null;
        for ($attempt = 0; $attempt < 3; $attempt++) {
            $full = $this->ai->generateFullDevotional365Day([
                'dayOfYear' => $day,
                'year' => $y,
                'estilo' => $estilo,
                'theme' => $theme,
                'avoidSnapshots' => $avoidRows,
                'retryExtra' => $retryExtra,
            ]);
            if (!empty($full['error'])) {
                return ['ok' => false, 'error' => (string) $full['error']];
            }
            $col = $this->collision($full, $avoidRows);
            if ($col === null) {
                break;
            }
            $retryExtra = "Colisão ({$col}): não repita essa passagem nem esse título; escolha outro livro ou capítulo da Bíblia, mantendo o tema.";
        }

        $this->upsert($day, [
            'titulo' => $full['titulo'] ?? '',
            'versiculo_ref' => $full['versiculo_ref'] ?? '',
            'versiculo_texto' => $full['versiculo_texto'] ?? '',
            'reflexao' => $full['reflexao'] ?? '',
            'aplicacao' => $full['aplicacao'] ?? '',
            'oracao' => $full['oracao'] ?? '',
        ]);

        return [
            'ok' => true,
            'data' => [
                'day_of_year' => $day,
                'titulo' => $full['titulo'] ?? '',
                'versiculo_ref' => $full['versiculo_ref'] ?? '',
            ],
        ];
    }

    /**
     * @return list<int>
     */
    private function daysInCalendarMonth(int $year, int $month): array
    {
        $leap = ($year % 4 === 0 && $year % 100 !== 0) || ($year % 400 === 0);
        $dim = [31, $leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        $m = max(1, min(12, $month));
        $start = 1;
        for ($i = 0; $i < $m - 1; $i++) {
            $start += $dim[$i];
        }
        $out = [];
        for ($d = 0; $d < $dim[$m - 1]; $d++) {
            $doy = $start + $d;
            if ($doy <= 365) {
                $out[] = $doy;
            }
        }

        return $out;
    }

    /**
     * @param  list<int>  $days
     * @return list<array{day_of_year:int,titulo:string,versiculo_ref:string}>
     */
    private function snapshotsForDays(array $days): array
    {
        if ($days === []) {
            return [];
        }
        $ph = implode(',', array_fill(0, count($days), '?'));
        try {
            $rows = DB::select(
                "SELECT day_of_year, titulo, versiculo_ref FROM bible_devotionals_365 WHERE day_of_year IN ({$ph})",
                $days
            );
        } catch (\Throwable) {
            return [];
        }

        return array_map(static fn ($r) => [
            'day_of_year' => (int) $r->day_of_year,
            'titulo' => (string) ($r->titulo ?? ''),
            'versiculo_ref' => (string) ($r->versiculo_ref ?? ''),
        ], $rows);
    }

    /**
     * @param  array<string,mixed>  $out
     * @param  list<array<string,mixed>>  $rows
     */
    private function collision(array $out, array $rows): ?string
    {
        $nr = $this->ai->normalizeDev365Ref((string) ($out['versiculo_ref'] ?? ''));
        $nt = $this->ai->normalizeDev365Ref(trim((string) ($out['titulo'] ?? '')));
        foreach ($rows as $row) {
            $rr = $this->ai->normalizeDev365Ref((string) ($row['versiculo_ref'] ?? ''));
            if (strlen($nr) > 6 && strlen($rr) > 6 && $nr === $rr) {
                return 'versiculo_ref';
            }
            $rt = $this->ai->normalizeDev365Ref(trim((string) ($row['titulo'] ?? '')));
            if (strlen($nt) > 10 && strlen($rt) > 10 && $nt === $rt) {
                return 'titulo';
            }
        }

        return null;
    }
}
