<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\File;

/**
 * Texto bíblico a partir de resources/data/bible (NVI embutida).
 */
class BibleTextService
{
    private const CHAPTER_COUNTS_66 = [
        50, 40, 27, 36, 34, 24, 21, 4, 31, 24, 22, 25, 29, 36, 10, 13, 10, 42, 150, 31, 12, 8,
        66, 52, 5, 48, 12, 14, 3, 9, 1, 4, 7, 3, 3, 3, 2, 14, 4, 28, 16, 24, 21, 28, 16, 16,
        13, 6, 6, 4, 4, 5, 3, 6, 4, 3, 1, 13, 5, 5, 3, 5, 1, 1, 1, 22,
    ];

    /** @var array{at:list<array>,nt:list<array>}|null */
    private static ?array $manifest = null;

    /** @var array<string, int>|null */
    private static ?array $chapterCounts = null;

    /** @var list<array{bookId:string,bookName:string,chapter:int}>|null */
    private static ?array $chapterSequence = null;

    /** @var array<string, array<string, mixed>|null> */
    private static array $bookCache = [];

    /** @var array<string, array<string, mixed>|null> */
    private static array $dataFileCache = [];

    /**
     * @return array{at:list<array<string,mixed>>, nt:list<array<string,mixed>>}
     */
    public function manifest(): array
    {
        if (self::$manifest !== null) {
            return self::$manifest;
        }
        $path = resource_path('data/bible/books_manifest.json');
        if (!File::exists($path)) {
            self::$manifest = ['at' => [], 'nt' => []];

            return self::$manifest;
        }
        $data = json_decode(File::get($path), true);
        self::$manifest = [
            'at' => is_array($data['at'] ?? null) ? $data['at'] : [],
            'nt' => is_array($data['nt'] ?? null) ? $data['nt'] : [],
        ];

        return self::$manifest;
    }

    /**
     * @return array<string, int>
     */
    public function chapterCountsByBook(): array
    {
        if (self::$chapterCounts !== null) {
            return self::$chapterCounts;
        }
        $all = array_merge($this->manifest()['at'], $this->manifest()['nt']);
        $out = [];
        foreach ($all as $i => $b) {
            $id = (string) ($b['id'] ?? '');
            if ($id === '') {
                continue;
            }
            $n = self::CHAPTER_COUNTS_66[$i] ?? 1;
            $out[$id] = $n >= 1 ? $n : 1;
        }

        return self::$chapterCounts = $out;
    }

    /**
     * @return array{bookId:string,bookName:string,chapter:int,totalChapters:int,verses:list<array{verse:int,text:string}>}|null
     */
    public function chapter(string $bookId, int|string $chapterNum, string $translation = 'nvi'): ?array
    {
        $trans = strtolower($translation ?: 'nvi');
        $id = trim($bookId);
        if ($id === '') {
            return null;
        }
        $book = $this->loadBook($trans, $id);
        if (!$book) {
            return null;
        }
        $chapters = is_array($book['chapters'] ?? null) ? $book['chapters'] : [];
        $chIndex = ((int) $chapterNum) - 1;
        if ($chIndex < 0 || $chIndex >= count($chapters)) {
            return null;
        }
        $versesRaw = is_array($chapters[$chIndex]) ? $chapters[$chIndex] : [];
        $verses = [];
        foreach ($versesRaw as $i => $text) {
            $verses[] = ['verse' => $i + 1, 'text' => (string) $text];
        }

        return [
            'bookId' => (string) ($book['id'] ?? $id),
            'bookName' => (string) ($book['name'] ?? $id),
            'chapter' => $chIndex + 1,
            'totalChapters' => count($chapters),
            'verses' => $verses,
        ];
    }

    /**
     * Sequência linear de todos os capítulos (AT+NT) para plano 365.
     *
     * @return list<array{bookId:string,bookName:string,chapter:int}>
     */
    public function chapterSequence(): array
    {
        if (self::$chapterSequence !== null) {
            return self::$chapterSequence;
        }
        $counts = $this->chapterCountsByBook();
        $all = array_merge($this->manifest()['at'], $this->manifest()['nt']);
        $seq = [];
        foreach ($all as $b) {
            $id = (string) ($b['id'] ?? '');
            if ($id === '') {
                continue;
            }
            $name = (string) ($b['name'] ?? $id);
            $n = $counts[$id] ?? 1;
            for ($ch = 1; $ch <= $n; $ch++) {
                $seq[] = ['bookId' => $id, 'bookName' => $name, 'chapter' => $ch];
            }
        }

        return self::$chapterSequence = $seq;
    }

    /**
     * Fatia do plano anual (fallback quando a tabela está vazia).
     *
     * @return array{day_number:int,book_id:string,chapter_from:int,chapter_to:int,verse_count:int,summary:?string}|null
     */
    public function readingPlanDayFallback(int $dayNumber): ?array
    {
        $seq = $this->chapterSequence();
        if ($seq === []) {
            return null;
        }
        $day = max(1, min(365, $dayNumber));
        $totalCh = count($seq);
        $chunkSize = (int) ceil($totalCh / 365);
        $startIdx = ($day - 1) * $chunkSize;
        $endIdx = min($day * $chunkSize, $totalCh) - 1;
        if ($startIdx > $endIdx || !isset($seq[$startIdx])) {
            return null;
        }
        $first = $seq[$startIdx];
        $last = $seq[$endIdx];
        $sameBook = ($first['bookId'] ?? '') === ($last['bookId'] ?? '');
        $from = (int) $first['chapter'];
        $to = $sameBook ? (int) $last['chapter'] : $from;
        $summary = $sameBook
            ? ($first['bookName'].' '.$from.($to !== $from ? '–'.$to : ''))
            : ($first['bookName'].' '.$from);

        return [
            'day_number' => $day,
            'book_id' => (string) $first['bookId'],
            'chapter_from' => $from,
            'chapter_to' => $to,
            'verse_count' => 0,
            'summary' => $summary,
        ];
    }

    public function resolveDataPath(string $name): ?string
    {
        $name = ltrim(str_replace(['\\', '..'], '', $name), '/');
        if ($name === '') {
            return null;
        }

        foreach ([resource_path('data/bible/'.$name), base_path('data/bible/'.$name)] as $path) {
            if (File::exists($path)) {
                return $path;
            }
        }

        return null;
    }

    /**
     * Enriquece capítulo com letra vermelha e títulos de seção.
     *
     * @param  array{bookId:string,bookName:string,chapter:int,totalChapters:int,verses:list<array{verse:int,text:string}>}  $chapterData
     * @return array{bookId:string,bookName:string,chapter:int,totalChapters:int,verses:list<array{verse:int,text:string,redLetter:bool}>,sectionHeadings:list<array{beforeVerse:int,text:string}>}
     */
    public function enrichChapter(array $chapterData): array
    {
        $bookId = (string) ($chapterData['bookId'] ?? '');
        $chapter = (int) ($chapterData['chapter'] ?? 0);
        $verses = is_array($chapterData['verses'] ?? null) ? $chapterData['verses'] : [];

        $redRanges = $this->redLetterRanges($bookId, $chapter);
        $headings = $this->sectionHeadings($bookId, $chapter);

        $enrichedVerses = [];
        foreach ($verses as $v) {
            $num = (int) ($v['verse'] ?? 0);
            $enrichedVerses[] = [
                'verse' => $num,
                'text' => (string) ($v['text'] ?? ''),
                'redLetter' => $this->verseInRanges($num, $redRanges),
            ];
        }

        return array_merge($chapterData, [
            'verses' => $enrichedVerses,
            'sectionHeadings' => $headings,
        ]);
    }

    /**
     * @return list<array{int,int}>
     */
    private function redLetterRanges(string $bookId, int $chapter): array
    {
        if ($bookId === '' || $chapter < 1) {
            return [];
        }

        $overrides = $this->loadDataFile('jesus_verses.json');
        $override = $overrides[$bookId][(string) $chapter] ?? $overrides[$bookId][$chapter] ?? null;
        if ($override === 'none') {
            return [];
        }

        $gospels = $this->loadDataFile('red_letter_gospels.json');
        $chData = $gospels[$bookId][(string) $chapter] ?? $gospels[$bookId][$chapter] ?? null;
        if (!is_array($chData)) {
            return [];
        }

        $ranges = [];
        foreach ($chData['r'] ?? [] as $pair) {
            if (!is_array($pair) || count($pair) < 2) {
                continue;
            }
            $start = (int) $pair[0];
            $end = (int) $pair[1];
            if ($start > 0 && $end >= $start) {
                $ranges[] = [$start, $end];
            }
        }

        return $ranges;
    }

    /**
     * @return list<array{beforeVerse:int,text:string}>
     */
    private function sectionHeadings(string $bookId, int $chapter): array
    {
        if ($bookId === '' || $chapter < 1) {
            return [];
        }

        $all = $this->loadDataFile('chapter_section_headings.json');
        $list = $all[$bookId][(string) $chapter] ?? $all[$bookId][$chapter] ?? null;
        if (!is_array($list)) {
            return [];
        }

        $out = [];
        foreach ($list as $item) {
            if (!is_array($item)) {
                continue;
            }
            $before = (int) ($item['beforeVerse'] ?? 0);
            $text = trim((string) ($item['text'] ?? ''));
            if ($before > 0 && $text !== '') {
                $out[] = ['beforeVerse' => $before, 'text' => $text];
            }
        }

        usort($out, static fn ($a, $b) => $a['beforeVerse'] <=> $b['beforeVerse']);

        return $out;
    }

    /**
     * @param  list<array{int,int}>  $ranges
     */
    private function verseInRanges(int $verse, array $ranges): bool
    {
        foreach ($ranges as [$start, $end]) {
            if ($verse >= $start && $verse <= $end) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return array<string, mixed>
     */
    private function loadDataFile(string $name): array
    {
        if (array_key_exists($name, self::$dataFileCache)) {
            return self::$dataFileCache[$name] ?? [];
        }

        $path = $this->resolveDataPath($name);
        if (!$path) {
            self::$dataFileCache[$name] = [];

            return [];
        }

        try {
            $decoded = json_decode(File::get($path), true);
            self::$dataFileCache[$name] = is_array($decoded) ? $decoded : [];
        } catch (\Throwable) {
            self::$dataFileCache[$name] = [];
        }

        return self::$dataFileCache[$name];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function loadBook(string $translation, string $bookId): ?array
    {
        $key = $translation.':'.$bookId;
        if (array_key_exists($key, self::$bookCache)) {
            return self::$bookCache[$key];
        }
        $path = resource_path("data/bible/books/{$translation}/{$bookId}.json");
        if (!File::exists($path) && $translation !== 'nvi') {
            $path = resource_path("data/bible/books/nvi/{$bookId}.json");
        }
        if (!File::exists($path)) {
            self::$bookCache[$key] = null;

            return null;
        }
        $data = json_decode(File::get($path), true);
        self::$bookCache[$key] = is_array($data) ? $data : null;

        return self::$bookCache[$key];
    }
}
