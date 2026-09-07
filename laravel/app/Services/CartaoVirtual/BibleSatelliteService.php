<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\DB;

class BibleSatelliteService
{
    public function __construct(
        private readonly BibleTextService $text,
        private readonly BibleStudyService $studies,
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

        $total = (int) $chapterData['totalChapters'];
        $ch = (int) $chapterData['chapter'];
        $prev = $ch > 1 ? $ch - 1 : null;
        $next = $ch < $total ? $ch + 1 : null;
        $tParam = $trans !== 'nvi' ? '?translation='.urlencode($trans) : '';
        $hasStudy = in_array($bookId, $this->studies->bookIdsWithFullStudy(), true);

        return [
            'status' => 200,
            'data' => [
                'slug' => $ctx['slug'],
                'translation' => $trans,
                'chapterData' => $chapterData,
                'hubUrl' => '/'.$ctx['slug'].'/biblia',
                'profileUrl' => '/'.$ctx['slug'],
                'studyUrl' => $hasStudy ? '/'.$ctx['slug'].'/biblia/estudos-livro/'.$bookId : null,
                'prevUrl' => $prev ? '/'.$ctx['slug'].'/bible/'.$bookId.'/'.$prev.$tParam : null,
                'nextUrl' => $next ? '/'.$ctx['slug'].'/bible/'.$bookId.'/'.$next.$tParam : null,
                'tParam' => $tParam,
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
        if ($study && !empty($study['content'])) {
            $contentHtml = $this->studies->prepareStudyContentHtml($study['content'], $ctx['slug'], $returnTo);
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
