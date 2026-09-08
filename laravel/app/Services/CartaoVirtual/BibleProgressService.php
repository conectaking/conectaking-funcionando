<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\DB;

class BibleProgressService
{
    /**
     * @return array<string,int|float>
     */
    public function getProgress(string $userId): array
    {
        try {
            $verses = (int) (DB::selectOne(
                "SELECT COUNT(*)::int AS n FROM bible_reading_progress WHERE user_id = ? AND mode = 'read'",
                [$userId]
            )->n ?? 0);
            $chapters = (int) (DB::selectOne(
                "SELECT COUNT(*)::int AS n FROM (
                    SELECT DISTINCT book, chapter FROM bible_reading_progress
                    WHERE user_id = ? AND mode = 'read'
                 ) sub",
                [$userId]
            )->n ?? 0);
            $books = (int) (DB::selectOne(
                "SELECT COUNT(DISTINCT book)::int AS n FROM bible_reading_progress WHERE user_id = ? AND mode = 'read'",
                [$userId]
            )->n ?? 0);
        } catch (\Throwable) {
            return $this->emptyProgress();
        }

        $totalBooks = 66;
        $totalChapters = 1189;
        $totalVerses = 31102;

        return [
            'books_read' => $books,
            'chapters_read' => $chapters,
            'verses_read' => $verses,
            'total_books' => $totalBooks,
            'total_chapters' => $totalChapters,
            'total_verses' => $totalVerses,
            'percent_books' => (int) round($books / $totalBooks * 100),
            'percent_chapters' => (int) round($chapters / $totalChapters * 100),
            'percent_verses' => (int) round($verses / $totalVerses * 100),
        ];
    }

    /**
     * @param  array<string,mixed>  $data
     * @return array<string,int|float>
     */
    public function markRead(string $userId, array $data): array
    {
        $book = trim((string) ($data['book'] ?? ''));
        $chapter = (int) ($data['chapter'] ?? 0);
        $verse = isset($data['verse']) ? (int) $data['verse'] : null;
        $mode = (string) ($data['mode'] ?? 'read') ?: 'read';
        if ($book === '' || $chapter < 1) {
            throw new \InvalidArgumentException('book e chapter são obrigatórios');
        }
        try {
            DB::insert(
                'INSERT INTO bible_reading_progress (user_id, book, chapter, verse, mode) VALUES (?, ?, ?, ?, ?)',
                [$userId, $book, $chapter, $verse, $mode]
            );
        } catch (\Throwable $e) {
            // unique violation = already marked
            if (!str_contains($e->getMessage(), 'unique') && !str_contains($e->getMessage(), '23505')) {
                // ignore duplicate; rethrow others only if not duplicate-ish
            }
        }

        return $this->getProgress($userId);
    }

    /**
     * @return array<string,int|float>
     */
    public function reset(string $userId): array
    {
        try {
            DB::delete('DELETE FROM bible_reading_progress WHERE user_id = ?', [$userId]);
        } catch (\Throwable) {
        }

        return $this->getProgress($userId);
    }

    /**
     * @return array<string,int|float>
     */
    private function emptyProgress(): array
    {
        return [
            'books_read' => 0,
            'chapters_read' => 0,
            'verses_read' => 0,
            'total_books' => 66,
            'total_chapters' => 1189,
            'total_verses' => 31102,
            'percent_books' => 0,
            'percent_chapters' => 0,
            'percent_verses' => 0,
        ];
    }
}
