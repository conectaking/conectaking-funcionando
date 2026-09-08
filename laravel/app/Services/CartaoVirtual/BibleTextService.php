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

    /** @var array<string, array<string, mixed>|null> */
    private static array $bookCache = [];

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

        return $out;
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

        return $seq;
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
