<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Devocionais 365 a partir de bible_devotionals_365 (+ temas e IA opcional).
 */
class BibleDevotionalService
{
    private const TEMAS_MES = [
        'Janeiro — Propósito em Deus e novos começos',
        'Fevereiro — Amor, fé e relacionamentos restaurados',
        'Março — Vida no Espírito e renovação interior',
        'Abril — Esperança viva e a vitória em Cristo',
        'Maio — Família, cuidado e bênção sob o olhar de Deus',
        'Junho — Serviço humilde e missão no cotidiano',
        'Julho — Descanso em Deus e confiança no tempo dEle',
        'Agosto — Sabedoria divina para decisões e palavras',
        'Setembro — Fidelidade e perseverança na caminhada',
        'Outubro — Reavivamento pessoal e testemunho sincero',
        'Novembro — Gratidão e generosidade cristã',
        'Dezembro — Luz de Cristo e encerramento do ano com fé',
    ];

    private const TEMAS_ANO = [
        'Ano da fé que se manifesta nas atitudes',
        'Ano da esperança que ancora a alma em Cristo',
        'Ano do amor que transforma corações',
        'Ano da graça que fortalece o caminho',
        'Ano da Palavra vivida no dia a dia',
    ];

    private const MESES_PT = [
        'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
    ];

    public function __construct(
        private readonly BibleTextService $text,
        private readonly BibleDevotionalAiService $ai,
    ) {
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
     * Devocional 365 completo (temas + IA opcional). Paridade com Node getDevocional365.
     *
     * @param  array{plain?:bool,useAi?:bool,aiExplicitOff?:bool,year?:int,temaModo?:string,temaPersonalizado?:string,estilo?:string}  $options
     * @return array<string,mixed>|null
     */
    public function get365(int $dayOfYear, array $options = []): ?array
    {
        $day = max(1, min(365, $dayOfYear));
        $row = $this->getByDay($day);
        if (!$row || !$this->hasContent($row)) {
            return null;
        }

        if (!empty($options['plain'])) {
            return $row;
        }

        $year = (int) ($options['year'] ?? 0);
        if ($year < 2000 || $year > 2100) {
            $year = (int) now('America/Sao_Paulo')->year;
        }

        $theme = $this->resolveTheme($day, $year, [
            'temaModo' => (string) ($options['temaModo'] ?? 'mes_auto'),
            'temaPersonalizado' => (string) ($options['temaPersonalizado'] ?? ''),
        ]);
        $result = array_merge($row, $theme);
        $estilo = strtolower((string) ($options['estilo'] ?? 'padrao')) === 'cunha' ? 'cunha' : 'padrao';
        $result['estilo_devocional'] = $estilo;

        if ($this->shouldUseAi($options)) {
            $ai = $this->ai->enrichDevotional365($result, [
                'dayOfYear' => $day,
                'year' => $year,
                'estilo' => $estilo,
            ]);
            if (!empty($ai['reflexao'])) {
                $result['reflexao_estatica'] = $result['reflexao'];
                $result['reflexao'] = $ai['reflexao'];
                if (!empty($ai['aplicacao'])) {
                    $result['aplicacao'] = $ai['aplicacao'];
                }
                if (!empty($ai['oracao'])) {
                    $result['oracao'] = $ai['oracao'];
                }
                $result['ai_gerado'] = true;
            } else {
                $result['ai_gerado'] = false;
                $result['ai_aviso'] = $ai['error'] ?? 'IA indisponível.';
            }
        }

        unset($result['tema_ia_instrucao']);

        return $result;
    }

    /**
     * Temas + instrução IA (uso admin generate).
     *
     * @param  array{temaModo?:string,temaPersonalizado?:string}  $options
     * @return array<string,mixed>
     */
    public function resolveThemeForDay(int $dayOfYear, int $year, array $options = []): array
    {
        return $this->resolveTheme($dayOfYear, $year, $options);
    }

    /**
     * @return array{month:int,day:int}
     */
    public function calendarMonthDay(int $dayOfYear, int $year): array
    {
        return $this->dayOfYearToMonthDay($dayOfYear, $year);
    }

    /**
     * @param  array{useAi?:bool,aiExplicitOff?:bool}  $options
     */
    private function shouldUseAi(array $options): bool
    {
        if (!empty($options['aiExplicitOff'])) {
            return false;
        }
        $def = trim((string) env('BIBLE_DEV365_AI_DEFAULT', ''));
        if ($def === '0') {
            return false;
        }
        if ($def === '1') {
            return true;
        }

        return ($options['useAi'] ?? true) !== false;
    }

    /**
     * @param  array{temaModo?:string,temaPersonalizado?:string}  $options
     * @return array<string,mixed>
     */
    private function resolveTheme(int $dayOfYear, int $year, array $options): array
    {
        $base = $this->baseThemes($dayOfYear, $year);
        $modo = strtolower(str_replace('-', '_', (string) ($options['temaModo'] ?? 'mes_auto')));
        $custom = mb_substr(trim((string) ($options['temaPersonalizado'] ?? '')), 0, 500);
        $uniq = $this->uniquenessInstruction($dayOfYear, $year);

        if (($modo === 'personalizado' || $modo === 'custom') && $custom !== '') {
            $md = $this->dayOfYearToMonthDay($dayOfYear, $year);
            $temaMesCal = self::TEMAS_MES[$md['month'] - 1] ?? self::TEMAS_MES[0];

            return array_merge($base, [
                'tema_mes' => $custom,
                'tema_mes_calendario' => $temaMesCal,
                'tema_modo_aplicado' => 'personalizado',
                'tema_ia_instrucao' =>
                    'O devocional deve girar em torno deste tema escolhido pelo usuário: "'.$custom.'". '.
                    'Inclua também uma ligação clara ao TEMA DO MÊS CALENDÁRIO ('.$md['month'].'/'.$year.'): '.$temaMesCal.
                    ' — pelo menos uma frase no corpo da reflexão. '.
                    'A abertura e o fecho devem deixar o tema personalizado explícito.'.$uniq,
            ]);
        }
        if ($modo === 'ano_auto' || $modo === 'ano') {
            return array_merge($base, [
                'tema_modo_aplicado' => 'ano',
                'tema_ia_instrucao' =>
                    'Priorize o TEMA DO ANO em toda a reflexão (introdução e conclusão centrados nele). '.
                    'TEMA DO ANO: '.$base['tema_ano'].'. O tema do mês é apenas apoio.'.$uniq,
            ]);
        }
        if (in_array($modo, ['mes_e_ano', 'mes_ano', 'ambos'], true)) {
            return array_merge($base, [
                'tema_modo_aplicado' => 'mes_e_ano',
                'tema_ia_instrucao' =>
                    'Integre de forma visível o TEMA DO MÊS ('.$base['tema_mes'].') e o TEMA DO ANO ('.$base['tema_ano'].') — '.
                    'pelo menos uma frase para cada, além da ligação com a passagem.'.$uniq,
            ]);
        }

        return array_merge($base, [
            'tema_modo_aplicado' => 'mes',
            'tema_ia_instrucao' =>
                'Priorize o TEMA DO MÊS ('.$base['tema_mes'].'). O tema do ano pode aparecer só no fecho se couber.'.$uniq,
        ]);
    }

    /**
     * @return array{mes:int,dia_mes:int,ano_calendario:int,tema_mes:string,tema_ano:string}
     */
    private function baseThemes(int $dayOfYear, int $year): array
    {
        $md = $this->dayOfYearToMonthDay($dayOfYear, $year);
        $temaMes = self::TEMAS_MES[$md['month'] - 1] ?? self::TEMAS_MES[0];
        try {
            $ov = DB::selectOne(
                'SELECT theme_text FROM bible_dev365_month_themes WHERE year = ? AND month = ? LIMIT 1',
                [$year, $md['month']]
            );
            if ($ov && trim((string) $ov->theme_text) !== '') {
                $temaMes = mb_substr(trim((string) $ov->theme_text), 0, 500);
            }
        } catch (\Throwable) {
            // tabela pode não existir
        }
        $temaAno = self::TEMAS_ANO[((($year % 5) + 5) % 5)];

        return [
            'mes' => $md['month'],
            'dia_mes' => $md['day'],
            'ano_calendario' => $year,
            'tema_mes' => $temaMes,
            'tema_ano' => $temaAno,
        ];
    }

    private function uniquenessInstruction(int $dayOfYear, int $year): string
    {
        $md = $this->dayOfYearToMonthDay($dayOfYear, $year);
        $nomeMes = self::MESES_PT[$md['month'] - 1] ?? (string) $md['month'];

        return ' UNICIDADE: Dia '.$dayOfYear.'/365 do calendário devocional ('.$md['day'].' de '.$nomeMes.' de '.$year.'). '.
            'Não repita frases, aberturas nem estrutura de outros dias; varie exemplos e ângulo pastoral. '.
            'O texto final deve ser claramente diferente de qualquer outro dia.';
    }

    /**
     * @return array{month:int,day:int}
     */
    private function dayOfYearToMonthDay(int $doy, int $year): array
    {
        $leap = ($year % 4 === 0 && $year % 100 !== 0) || ($year % 400 === 0);
        $dim = [31, $leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        $d = $doy;
        for ($m = 0; $m < 12; $m++) {
            if ($d <= $dim[$m]) {
                return ['month' => $m + 1, 'day' => $d];
            }
            $d -= $dim[$m];
        }

        return ['month' => 12, 'day' => $dim[11]];
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
