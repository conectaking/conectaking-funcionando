<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\DB;

class BibleSatelliteService
{
    public function __construct(
        private readonly BibleTextService $text,
        private readonly BibleStudyService $studies,
        private readonly BibleDevotionalService $devotionals,
        private readonly BibleSalmoService $salmos,
        private readonly BibleWholeDevotionalService $whole,
        private readonly BibleProsperidadeService $prosperidade,
    ) {
    }

    /**
     * @return array{status:int, data?:array<string,mixed>, message?:string}
     */
    public function hub(string $slug): array
    {
        $ctx = $this->context($slug);
        if ($ctx === null) {
            return ['status' => 404, 'message' => 'Este perfil não possui o módulo Bíblia ativo.'];
        }

        $verse = app(VerseOfDayService::class)->get(null, $ctx['translation']);
        $manifest = $this->text->manifest();
        $counts = $this->text->chapterCountsByBook();
        $withStudy = array_fill_keys($this->studies->bookIdsWithFullStudy(), true);
        $todayDay = $this->devotionals->dayOfYear(null);
        $devToday = $this->devotionals->get365($todayDay) ?? $this->devotionals->getByDay($todayDay);
        $salmo = $this->salmos->get(null);
        $plan = $this->devotionals->readingPlanDay($todayDay);

        return [
            'status' => 200,
            'data' => [
                'slug' => $ctx['slug'],
                'translation' => $ctx['translation'],
                'verse' => $verse,
                'profileUrl' => '/'.$ctx['slug'],
                'at' => $manifest['at'],
                'nt' => $manifest['nt'],
                'chapterCounts' => $counts,
                'booksWithStudy' => $withStudy,
                'devotionalToday' => $devToday,
                'devotionalUrl' => '/'.$ctx['slug'].'/biblia/devocional',
                'devotionalDay' => $todayDay,
                'salmo' => $salmo,
                'salmoUrl' => '/'.$ctx['slug'].'/biblia/salmo',
                'plan' => $plan,
                'planUrl' => '/'.$ctx['slug'].'/biblia/plano',
                'wholeUrl' => '/'.$ctx['slug'].'/biblia/biblia-inteira',
                'prosperidadeUrl' => '/'.$ctx['slug'].'/biblia/prosperidade',
                'cunhaUrl' => trim((string) env('BIBLE_CUNHA_URL', '')),
                'bibleAiUrl' => trim((string) env('BIBLE_AI_URL', '')),
            ],
        ];
    }

    /**
     * @return array{status:int, data?:array<string,mixed>, message?:string}
     */
    public function devotional(string $slug, ?string $dayParam = null): array
    {
        $ctx = $this->context($slug);
        if ($ctx === null) {
            return ['status' => 404, 'message' => 'Bíblia não encontrada.'];
        }

        if ($dayParam !== null && $dayParam !== '') {
            if (!ctype_digit($dayParam) || (int) $dayParam < 1 || (int) $dayParam > 365) {
                return ['status' => 400, 'message' => 'Dia deve ser entre 1 e 365.'];
            }
            $day = (int) $dayParam;
        } else {
            $day = $this->devotionals->dayOfYear(null);
        }

        $dev = $this->devotionals->get365($day) ?? $this->devotionals->getByDay($day);
        $prev = $day > 1 ? $day - 1 : null;
        $next = $day < 365 ? $day + 1 : null;

        return [
            'status' => 200,
            'data' => [
                'slug' => $ctx['slug'],
                'hubUrl' => '/'.$ctx['slug'].'/biblia',
                'profileUrl' => '/'.$ctx['slug'],
                'day' => $day,
                'devotional' => $dev,
                'prevUrl' => $prev ? '/'.$ctx['slug'].'/biblia/devocional/'.$prev : null,
                'nextUrl' => $next ? '/'.$ctx['slug'].'/biblia/devocional/'.$next : null,
                'todayUrl' => '/'.$ctx['slug'].'/biblia/devocional',
                'markReadApi' => '/api/bible/devotional/mark-read',
                'readStatusApi' => '/api/bible/devotional/read-status',
            ],
        ];
    }

    /**
     * @return array{status:int, data?:array<string,mixed>, message?:string}
     */
    public function reader(string $slug, string $bookId, string $chapter, ?string $translation = null): array
    {
        $ctx = $this->context($slug);
        if ($ctx === null) {
            return ['status' => 404, 'message' => 'Bíblia não encontrada.'];
        }
        $trans = strtolower($translation ?: $ctx['translation']);
        $chapterData = $this->text->chapter($bookId, $chapter, $trans);
        if (!$chapterData) {
            return ['status' => 404, 'message' => 'Capítulo não encontrado.'];
        }

        $chapterData = $this->text->enrichChapter($chapterData);

        $total = (int) $chapterData['totalChapters'];
        $ch = (int) $chapterData['chapter'];
        $prev = $ch > 1 ? $ch - 1 : null;
        $next = $ch < $total ? $ch + 1 : null;
        $tParam = $trans !== 'nvi' ? '?translation='.urlencode($trans) : '';
        $hasStudy = in_array($bookId, $this->studies->bookIdsWithFullStudy(), true);

        $chapterStudy = $this->studies->getChapterStudy($bookId, $ch);
        $chapterStudyHtml = '';
        if ($chapterStudy && !empty($chapterStudy['content'])) {
            $returnTo = '/'.$ctx['slug'].'/bible/'.$bookId.'/'.$ch.$tParam;
            $chapterStudyHtml = $this->studies->prepareStudyContentHtml($chapterStudy['content'], $ctx['slug'], $returnTo);
        }

        return [
            'status' => 200,
            'data' => [
                'slug' => $ctx['slug'],
                'translation' => $trans,
                'bookId' => $bookId,
                'chapter' => $ch,
                'chapterData' => $chapterData,
                'chapterStudy' => $chapterStudy,
                'chapterStudyHtml' => $chapterStudyHtml,
                'hubUrl' => '/'.$ctx['slug'].'/biblia',
                'profileUrl' => '/'.$ctx['slug'],
                'studyUrl' => $hasStudy ? '/'.$ctx['slug'].'/biblia/estudos-livro/'.$bookId : null,
                'prevUrl' => $prev ? '/'.$ctx['slug'].'/bible/'.$bookId.'/'.$prev.$tParam : null,
                'nextUrl' => $next ? '/'.$ctx['slug'].'/bible/'.$bookId.'/'.$next.$tParam : null,
                'tParam' => $tParam,
                'markReadApi' => '/api/bible/mark-read',
            ],
        ];
    }

    /**
     * @return array{status:int, data?:array<string,mixed>, message?:string}
     */
    public function bookStudy(string $slug, string $bookId): array
    {
        $ctx = $this->context($slug);
        if ($ctx === null) {
            return ['status' => 404, 'message' => 'Bíblia não encontrada.'];
        }

        $manifest = $this->text->manifest();
        $all = array_merge($manifest['at'] ?? [], $manifest['nt'] ?? []);
        $bookName = $bookId;
        foreach ($all as $b) {
            if (($b['id'] ?? '') === $bookId) {
                $bookName = (string) ($b['name'] ?? $bookId);
                break;
            }
        }

        $study = $this->studies->getBookStudy($bookId);
        $hubUrl = '/'.$ctx['slug'].'/biblia';
        $returnTo = '/'.$ctx['slug'].'/biblia/estudos-livro/'.rawurlencode($bookId);
        $contentHtml = '';
        $sections = [];
        if ($study && !empty($study['content'])) {
            $contentHtml = $this->studies->prepareStudyContentHtml($study['content'], $ctx['slug'], $returnTo);
            $sections = $this->studies->parseStudySections($study['content']);
            foreach ($sections as $i => $sec) {
                $sections[$i]['html'] = $this->studies->prepareStudyContentHtml(
                    (string) ($sec['body'] ?? ''),
                    $ctx['slug'],
                    $returnTo
                );
            }
        }

        return [
            'status' => 200,
            'data' => [
                'slug' => $ctx['slug'],
                'bookId' => $bookId,
                'bookName' => $bookName,
                'hubUrl' => $hubUrl,
                'profileUrl' => '/'.$ctx['slug'],
                'readUrl' => '/'.$ctx['slug'].'/bible/'.$bookId.'/1',
                'study' => $study,
                'contentHtml' => $contentHtml,
                'sections' => $sections,
            ],
        ];
    }

    /**
     * @return array{status:int, data?:array<string,mixed>, message?:string}
     */
    public function salmo(string $slug): array
    {
        $ctx = $this->context($slug);
        if ($ctx === null) {
            return ['status' => 404, 'message' => 'Bíblia não encontrada.'];
        }
        $salmo = $this->salmos->get(null);
        $readUrl = null;
        if ($salmo && !empty($salmo['capitulo'])) {
            $readUrl = '/'.$ctx['slug'].'/bible/ps/'.$salmo['capitulo']
                .(!empty($salmo['versiculo']) ? '#v'.$salmo['versiculo'] : '');
        }

        return [
            'status' => 200,
            'data' => [
                'slug' => $ctx['slug'],
                'hubUrl' => '/'.$ctx['slug'].'/biblia',
                'profileUrl' => '/'.$ctx['slug'],
                'salmo' => $salmo,
                'readUrl' => $readUrl,
            ],
        ];
    }

    /**
     * @return array{status:int, data?:array<string,mixed>, message?:string}
     */
    public function readingPlan(string $slug, ?string $dayParam = null): array
    {
        $ctx = $this->context($slug);
        if ($ctx === null) {
            return ['status' => 404, 'message' => 'Bíblia não encontrada.'];
        }
        if ($dayParam !== null && $dayParam !== '') {
            if (!ctype_digit($dayParam) || (int) $dayParam < 1 || (int) $dayParam > 365) {
                return ['status' => 400, 'message' => 'Dia deve ser entre 1 e 365.'];
            }
            $day = (int) $dayParam;
        } else {
            $day = $this->devotionals->dayOfYear(null);
        }
        $plan = $this->devotionals->readingPlanDay($day);
        $prev = $day > 1 ? $day - 1 : null;
        $next = $day < 365 ? $day + 1 : null;
        $readUrl = null;
        if ($plan && !empty($plan['book_id']) && !empty($plan['chapter_from'])) {
            $readUrl = '/'.$ctx['slug'].'/bible/'.$plan['book_id'].'/'.$plan['chapter_from'];
        }

        return [
            'status' => 200,
            'data' => [
                'slug' => $ctx['slug'],
                'hubUrl' => '/'.$ctx['slug'].'/biblia',
                'profileUrl' => '/'.$ctx['slug'],
                'day' => $day,
                'plan' => $plan,
                'readUrl' => $readUrl,
                'devotionalUrl' => '/'.$ctx['slug'].'/biblia/devocional/'.$day,
                'prevUrl' => $prev ? '/'.$ctx['slug'].'/biblia/plano/'.$prev : null,
                'nextUrl' => $next ? '/'.$ctx['slug'].'/biblia/plano/'.$next : null,
                'todayUrl' => '/'.$ctx['slug'].'/biblia/plano',
            ],
        ];
    }

    /**
     * @return array{status:int, data?:array<string,mixed>, message?:string}
     */
    public function wholeBible(string $slug, ?string $dayParam = null): array
    {
        $ctx = $this->context($slug);
        if ($ctx === null) {
            return ['status' => 404, 'message' => 'Bíblia não encontrada.'];
        }
        $seq = $this->text->chapterSequence();
        $total = max(1, count($seq));
        if ($dayParam !== null && $dayParam !== '') {
            if (!ctype_digit($dayParam) || (int) $dayParam < 1) {
                return ['status' => 400, 'message' => 'Dia inválido.'];
            }
            $day = (int) $dayParam;
        } else {
            $day = $this->devotionals->dayOfYear(null);
        }
        $item = $this->whole->bySequenceDay($day);
        if (!$item) {
            return ['status' => 404, 'message' => 'Devocional não encontrado.'];
        }
        $prev = $day > 1 ? $day - 1 : null;
        $next = $day + 1;
        $readUrl = '/'.$ctx['slug'].'/bible/'.$item['bookId'].'/'.$item['chapter'];

        return [
            'status' => 200,
            'data' => [
                'slug' => $ctx['slug'],
                'hubUrl' => '/'.$ctx['slug'].'/biblia',
                'profileUrl' => '/'.$ctx['slug'],
                'day' => $day,
                'totalDays' => $total,
                'item' => $item,
                'readUrl' => $readUrl,
                'prevUrl' => $prev ? '/'.$ctx['slug'].'/biblia/biblia-inteira/'.$prev : null,
                'nextUrl' => '/'.$ctx['slug'].'/biblia/biblia-inteira/'.$next,
                'todayUrl' => '/'.$ctx['slug'].'/biblia/biblia-inteira',
            ],
        ];
    }

    /**
     * @return array{status:int, data?:array<string,mixed>, message?:string}
     */
    public function prosperidade(string $slug, ?string $nParam = null): array
    {
        $ctx = $this->context($slug);
        if ($ctx === null) {
            return ['status' => 404, 'message' => 'Bíblia não encontrada.'];
        }

        if ($nParam !== null && $nParam !== '') {
            if (!ctype_digit($nParam) || (int) $nParam < 1 || (int) $nParam > 31) {
                return ['status' => 400, 'message' => 'Ativação deve ser entre 1 e 31.'];
            }
            $n = (int) $nParam;
        } else {
            $n = $this->prosperidade->activationForToday();
        }

        $result = $this->prosperidade->getAtivacaoPublic($n);
        $ativacao = !empty($result['ok']) ? ($result['data'] ?? null) : null;
        $list = $this->prosperidade->getList();
        $prev = $n > 1 ? $n - 1 : null;
        $next = $n < 31 ? $n + 1 : null;
        $base = '/'.$ctx['slug'].'/biblia/prosperidade';

        return [
            'status' => 200,
            'data' => [
                'slug' => $ctx['slug'],
                'hubUrl' => '/'.$ctx['slug'].'/biblia',
                'profileUrl' => '/'.$ctx['slug'],
                'n' => $n,
                'ativacao' => $ativacao,
                'notPublished' => empty($result['ok']),
                'message' => $result['message'] ?? null,
                'nearest' => $result['nearest_published'] ?? null,
                'activations' => $list,
                'prevUrl' => $prev ? $base.'/'.$prev : null,
                'nextUrl' => $next ? $base.'/'.$next : null,
                'todayUrl' => $base,
                'markReadApi' => '/api/bible/prosperidade/mark-read',
            ],
        ];
    }

    /**
     * @return array{slug:string,translation:string}|null
     */
    private function context(string $slug): ?array
    {
        $user = DB::selectOne(
            'SELECT id, profile_slug FROM users WHERE LOWER(profile_slug) = LOWER(?) LIMIT 1',
            [$slug]
        );
        if (!$user) {
            return null;
        }
        $item = DB::selectOne(
            "SELECT pi.id, bi.translation_code
             FROM profile_items pi
             LEFT JOIN bible_items bi ON bi.profile_item_id = pi.id
             WHERE pi.user_id = ? AND pi.item_type = 'bible' AND pi.is_active = true
             LIMIT 1",
            [$user->id]
        );
        if (!$item) {
            return null;
        }

        return [
            'slug' => (string) $user->profile_slug,
            'translation' => (string) ($item->translation_code ?: 'nvi'),
        ];
    }
}
