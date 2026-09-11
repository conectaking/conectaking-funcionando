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
        $this->devotionals->forgetDayCache($day);
    }

    public function delete(int $day): bool
    {
        if ($day < 1 || $day > 365) {
            return false;
        }
        $n = DB::delete('DELETE FROM bible_devotionals_365 WHERE day_of_year = ?', [$day]);
        if ($n > 0) {
            $this->devotionals->forgetDayCache($day);
        }

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
     * @param  array{temaModo?:string,temaPersonalizado?:string,estilo?:string,sessionAvoid?:list<array<string,mixed>>}  $options
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
        $sess = is_array($options['sessionAvoid'] ?? null) ? array_slice($options['sessionAvoid'], -42) : [];
        if ($sess !== []) {
            $avoidRows = array_merge($avoidRows, $sess);
        }
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
     * Lote síncrono (máx. 31 dias por request — um mês civil).
     *
     * @param  array{delayMs?:int,temaModo?:string,temaPersonalizado?:string,estilo?:string}  $options
     * @return array{ok:bool,error?:string,results?:list<array<string,mixed>>,total?:int,errors?:int}
     */
    public function generateRangeAndSave(int $startDay, int $endDay, int $year, array $options = []): array
    {
        $a = max(1, min(365, $startDay));
        $b = max(1, min(365, $endDay));
        $from = min($a, $b);
        $to = max($a, $b);
        if (($to - $from + 1) > 31) {
            return ['ok' => false, 'error' => 'Máximo 31 dias por lote síncrono. Divida o intervalo.'];
        }
        $y = $year >= 2000 && $year <= 2100 ? $year : (int) now('America/Sao_Paulo')->year;
        $delayMs = max(0, (int) ($options['delayMs'] ?? 400));
        $results = [];
        $sessionAvoid = [];
        for ($d = $from; $d <= $to; $d++) {
            $r = $this->generateDayAndSave($d, $y, [
                'temaModo' => (string) ($options['temaModo'] ?? 'mes_auto'),
                'temaPersonalizado' => (string) ($options['temaPersonalizado'] ?? ''),
                'estilo' => (string) ($options['estilo'] ?? 'padrao'),
                'sessionAvoid' => $sessionAvoid,
            ]);
            if (!empty($r['ok']) && !empty($r['data'])) {
                $sessionAvoid[] = [
                    'day_of_year' => $d,
                    'titulo' => $r['data']['titulo'] ?? '',
                    'versiculo_ref' => $r['data']['versiculo_ref'] ?? '',
                ];
            }
            $results[] = ['day' => $d, 'ok' => !empty($r['ok']), 'error' => $r['error'] ?? null];
            if ($delayMs > 0 && $d < $to) {
                usleep($delayMs * 1000);
            }
        }

        return [
            'ok' => true,
            'results' => $results,
            'total' => count($results),
            'errors' => count(array_filter($results, static fn ($x) => empty($x['ok']))),
        ];
    }

    /**
     * Gera todos os dias do mês civil (síncrono; paridade com Node).
     *
     * @param  array{delayMs?:int,temaModo?:string,temaPersonalizado?:string,estilo?:string}  $options
     * @return array{ok:bool,error?:string,results?:list<array<string,mixed>>,total?:int,errors?:int,month?:int,year?:int}
     */
    public function generateMonthAndSave(int $year, int $month, array $options = []): array
    {
        $y = $year >= 2000 && $year <= 2100 ? $year : (int) now('America/Sao_Paulo')->year;
        $m = max(1, min(12, $month));
        $days = $this->daysInCalendarMonth($y, $m);
        if ($days === []) {
            return ['ok' => false, 'error' => 'Mês inválido.', 'results' => [], 'total' => 0, 'errors' => 0];
        }
        $delayMs = max(0, (int) ($options['delayMs'] ?? 400));
        $results = [];
        $sessionAvoid = [];
        $last = count($days) - 1;
        foreach ($days as $i => $d) {
            $r = $this->generateDayAndSave($d, $y, [
                'temaModo' => (string) ($options['temaModo'] ?? 'mes_auto'),
                'temaPersonalizado' => (string) ($options['temaPersonalizado'] ?? ''),
                'estilo' => (string) ($options['estilo'] ?? 'padrao'),
                'sessionAvoid' => $sessionAvoid,
            ]);
            if (!empty($r['ok']) && !empty($r['data'])) {
                $sessionAvoid[] = [
                    'day_of_year' => $d,
                    'titulo' => $r['data']['titulo'] ?? '',
                    'versiculo_ref' => $r['data']['versiculo_ref'] ?? '',
                ];
            }
            $results[] = ['day' => $d, 'ok' => !empty($r['ok']), 'error' => $r['error'] ?? null];
            if ($delayMs > 0 && $i < $last) {
                usleep($delayMs * 1000);
            }
        }

        return [
            'ok' => true,
            'year' => $y,
            'month' => $m,
            'results' => $results,
            'total' => count($results),
            'errors' => count(array_filter($results, static fn ($x) => empty($x['ok']))),
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

    /**
     * @param  mixed  $monthsInput
     * @return list<int>
     */
    public function normalizeMonthsInput(mixed $monthsInput): array
    {
        if ($monthsInput === 'all' || $monthsInput === true) {
            return range(1, 12);
        }
        if (!is_array($monthsInput)) {
            return [];
        }
        $set = [];
        foreach ($monthsInput as $x) {
            $m = (int) $x;
            if ($m >= 1 && $m <= 12) {
                $set[$m] = true;
            }
        }
        $out = array_keys($set);
        sort($out);

        return $out;
    }

    /**
     * @param  list<int>  $months
     * @return list<int>
     */
    public function collectDaysForCalendarMonths(int $year, array $months): array
    {
        $set = [];
        foreach ($months as $m) {
            foreach ($this->daysInCalendarMonth($year, (int) $m) as $d) {
                $set[$d] = true;
            }
        }
        $out = array_keys($set);
        sort($out);

        return $out;
    }

    /**
     * @param  mixed  $monthsInput
     * @param  array{delayMs?:int,temaModo?:string,temaPersonalizado?:string,estilo?:string}  $options
     * @return array{ok:bool,error?:string,jobId?:string,total?:int}
     */
    public function startCalendarMonthsBackgroundJob(int $year, mixed $monthsInput, array $options = []): array
    {
        if ($year < 2000 || $year > 2100) {
            return ['ok' => false, 'error' => 'Ano inválido (2000–2100).'];
        }
        $months = $this->normalizeMonthsInput($monthsInput);
        if ($months === []) {
            return ['ok' => false, 'error' => 'Selecione pelo menos um mês ou envie months: "all".'];
        }
        $days = $this->collectDaysForCalendarMonths($year, $months);
        if ($days === []) {
            return ['ok' => false, 'error' => 'Nenhum dia a gerar.'];
        }
        $jobId = (string) \Illuminate\Support\Str::uuid();
        $nowMs = (int) (microtime(true) * 1000);
        $job = [
            'id' => $jobId,
            'status' => 'queued',
            'year' => $year,
            'months' => $months,
            'days' => $days,
            'total' => count($days),
            'processed' => 0,
            'errors' => 0,
            'etaSeconds' => null,
            'currentDay' => null,
            'startedAt' => $nowMs,
            'updatedAt' => $nowMs,
            'errorMessage' => null,
            'failedSamples' => [],
            'cancelRequested' => false,
            'options' => [
                'delayMs' => max(0, (int) ($options['delayMs'] ?? 400)),
                'temaModo' => (string) ($options['temaModo'] ?? 'mes_auto'),
                'temaPersonalizado' => (string) ($options['temaPersonalizado'] ?? ''),
                'estilo' => ($options['estilo'] ?? '') === 'cunha' ? 'cunha' : 'padrao',
            ],
        ];
        \Illuminate\Support\Facades\Cache::put($this->jobCacheKey($jobId), $job, now()->addHours(12));

        \App\Jobs\RunDev365CalendarJob::dispatch($jobId);

        return ['ok' => true, 'jobId' => $jobId, 'total' => count($days)];
    }

    public function runCalendarMonthsJob(string $jobId): void
    {
        $this->executeCalendarMonthsJob($jobId);
    }

    /**
     * @return array{ok:bool,error?:string}
     */
    public function cancelGenerationJob(string $jobId): array
    {
        $key = $this->jobCacheKey($jobId);
        $job = \Illuminate\Support\Facades\Cache::get($key);
        if (!is_array($job)) {
            return ['ok' => false, 'error' => 'Trabalho não encontrado ou já expirou.'];
        }
        $status = (string) ($job['status'] ?? '');
        if (in_array($status, ['done', 'error', 'cancelled'], true)) {
            return ['ok' => false, 'error' => 'Este trabalho já terminou.'];
        }
        $job['cancelRequested'] = true;
        $job['updatedAt'] = (int) (microtime(true) * 1000);
        \Illuminate\Support\Facades\Cache::put($key, $job, now()->addHours(12));

        return ['ok' => true];
    }

    /**
     * @return array<string,mixed>|null
     */
    public function getGenerationJob(string $jobId): ?array
    {
        $job = \Illuminate\Support\Facades\Cache::get($this->jobCacheKey($jobId));
        if (!is_array($job)) {
            return null;
        }
        $total = (int) ($job['total'] ?? 0);
        $processed = (int) ($job['processed'] ?? 0);
        $progress = $total > 0 ? min(100, (int) floor((100 * $processed) / $total)) : 0;
        if (($job['status'] ?? '') === 'done') {
            $progress = 100;
        }
        $etaSeconds = $job['etaSeconds'] ?? null;
        $etaMinutes = null;
        if ($etaSeconds !== null && ($job['status'] ?? '') === 'running') {
            $etaMinutes = round(((int) $etaSeconds / 60) * 10) / 10;
        }

        return [
            'id' => $job['id'] ?? $jobId,
            'status' => $job['status'] ?? 'unknown',
            'year' => $job['year'] ?? null,
            'months' => $job['months'] ?? [],
            'total' => $total,
            'processed' => $processed,
            'progress' => $progress,
            'errors' => (int) ($job['errors'] ?? 0),
            'etaSeconds' => $etaSeconds,
            'etaMinutes' => $etaMinutes,
            'currentDay' => $job['currentDay'] ?? null,
            'errorMessage' => $job['errorMessage'] ?? null,
            'failedSamples' => array_slice($job['failedSamples'] ?? [], 0, 20),
            'updatedAt' => $job['updatedAt'] ?? null,
            'startedAt' => $job['startedAt'] ?? null,
            'cancelRequested' => !empty($job['cancelRequested']),
        ];
    }

    private function jobCacheKey(string $jobId): string
    {
        return 'dev365_gen_job:'.$jobId;
    }

    private function executeCalendarMonthsJob(string $jobId): void
    {
        $key = $this->jobCacheKey($jobId);
        $job = \Illuminate\Support\Facades\Cache::get($key);
        if (!is_array($job)) {
            return;
        }
        $days = is_array($job['days'] ?? null) ? $job['days'] : [];
        $year = (int) ($job['year'] ?? now('America/Sao_Paulo')->year);
        $opts = is_array($job['options'] ?? null) ? $job['options'] : [];
        $delayMs = max(0, (int) ($opts['delayMs'] ?? 400));
        $total = count($days);

        $job['status'] = 'running';
        $job['updatedAt'] = (int) (microtime(true) * 1000);
        \Illuminate\Support\Facades\Cache::put($key, $job, now()->addHours(12));

        $sessionAvoid = [];
        try {
            foreach ($days as $i => $d) {
                $job = \Illuminate\Support\Facades\Cache::get($key);
                if (!is_array($job)) {
                    return;
                }
                if (!empty($job['cancelRequested'])) {
                    $job['status'] = 'cancelled';
                    $job['currentDay'] = null;
                    $job['etaSeconds'] = 0;
                    $job['updatedAt'] = (int) (microtime(true) * 1000);
                    \Illuminate\Support\Facades\Cache::put($key, $job, now()->addHours(12));

                    return;
                }

                $day = (int) $d;
                $job['currentDay'] = $day;
                $job['updatedAt'] = (int) (microtime(true) * 1000);
                \Illuminate\Support\Facades\Cache::put($key, $job, now()->addHours(12));

                $r = $this->generateDayAndSave($day, $year, [
                    'temaModo' => (string) ($opts['temaModo'] ?? 'mes_auto'),
                    'temaPersonalizado' => (string) ($opts['temaPersonalizado'] ?? ''),
                    'estilo' => (string) ($opts['estilo'] ?? 'padrao'),
                    'sessionAvoid' => $sessionAvoid,
                ]);
                if (!empty($r['ok']) && !empty($r['data'])) {
                    $sessionAvoid[] = [
                        'day_of_year' => $day,
                        'titulo' => $r['data']['titulo'] ?? '',
                        'versiculo_ref' => $r['data']['versiculo_ref'] ?? '',
                    ];
                }

                $job = \Illuminate\Support\Facades\Cache::get($key);
                if (!is_array($job)) {
                    return;
                }
                $job['processed'] = $i + 1;
                if (empty($r['ok'])) {
                    $job['errors'] = (int) ($job['errors'] ?? 0) + 1;
                    $samples = $job['failedSamples'] ?? [];
                    if (count($samples) < 50) {
                        $samples[] = ['day' => $day, 'error' => $r['error'] ?? '?'];
                        $job['failedSamples'] = $samples;
                    }
                }
                $elapsed = (int) (microtime(true) * 1000) - (int) ($job['startedAt'] ?? 0);
                $avg = $job['processed'] > 0 ? $elapsed / $job['processed'] : 0;
                $job['etaSeconds'] = max(0, (int) round((($total - $job['processed']) * $avg) / 1000));
                $job['updatedAt'] = (int) (microtime(true) * 1000);
                \Illuminate\Support\Facades\Cache::put($key, $job, now()->addHours(12));

                if ($delayMs > 0 && $i < $total - 1) {
                    usleep($delayMs * 1000);
                }
            }

            $job = \Illuminate\Support\Facades\Cache::get($key);
            if (!is_array($job)) {
                return;
            }
            if (!empty($job['cancelRequested'])) {
                $job['status'] = 'cancelled';
            } else {
                $job['status'] = 'done';
                $job['processed'] = $total;
            }
            $job['currentDay'] = null;
            $job['etaSeconds'] = 0;
            $job['updatedAt'] = (int) (microtime(true) * 1000);
            \Illuminate\Support\Facades\Cache::put($key, $job, now()->addHours(12));
        } catch (\Throwable $e) {
            Log::error('dev365.executeCalendarMonthsJob', ['error' => $e->getMessage()]);
            $job = \Illuminate\Support\Facades\Cache::get($key);
            if (!is_array($job)) {
                return;
            }
            $job['status'] = 'error';
            $job['errorMessage'] = $e->getMessage();
            $job['updatedAt'] = (int) (microtime(true) * 1000);
            \Illuminate\Support\Facades\Cache::put($key, $job, now()->addHours(12));
        }
    }
}
