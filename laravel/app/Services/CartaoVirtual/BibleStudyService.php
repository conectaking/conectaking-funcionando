<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Estudos por livro a partir de bible_book_studies / bible_chapter_studies.
 */
class BibleStudyService
{
    public function __construct(private readonly BibleTextService $text)
    {
    }

    /**
     * @return list<string>
     */
    public function bookIdsWithFullStudy(): array
    {
        try {
            $rows = DB::select('SELECT DISTINCT book_id FROM bible_book_studies ORDER BY book_id');

            return array_values(array_map(static fn ($r) => (string) $r->book_id, $rows));
        } catch (\Throwable $e) {
            Log::warning('bible.study.bookIds', ['error' => $e->getMessage()]);

            return [];
        }
    }

    /**
     * @return array{book_id:string,title:?string,content:?string,chapters:list<array{chapter_number:int,title:?string}>}|null
     */
    public function getBookStudy(string $bookId): ?array
    {
        $id = trim($bookId);
        if ($id === '') {
            return null;
        }
        try {
            $row = DB::selectOne(
                'SELECT book_id, title, content FROM bible_book_studies WHERE book_id = ? LIMIT 1',
                [$id]
            );
            if (!$row) {
                return null;
            }
            $chapters = [];
            try {
                $chRows = DB::select(
                    'SELECT chapter_number, title FROM bible_chapter_studies WHERE book_id = ? ORDER BY chapter_number',
                    [$id]
                );
                foreach ($chRows as $c) {
                    $chapters[] = [
                        'chapter_number' => (int) $c->chapter_number,
                        'title' => $c->title !== null ? (string) $c->title : null,
                    ];
                }
            } catch (\Throwable $e) {
                // tabela opcional / ausente
            }

            return [
                'book_id' => (string) $row->book_id,
                'title' => $row->title !== null ? (string) $row->title : null,
                'content' => $row->content !== null ? (string) $row->content : null,
                'chapters' => $chapters,
            ];
        } catch (\Throwable $e) {
            Log::warning('bible.study.get', ['book' => $id, 'error' => $e->getMessage()]);

            return null;
        }
    }

    /**
     * Escapa HTML e transforma "Nome do livro + capítulo" em links.
     */
    public function prepareStudyContentHtml(string $raw, string $slug, string $returnTo = ''): string
    {
        $out = e($raw);
        $out = str_replace(["\r\n", "\r", "\n"], '<br>', $out);

        $manifest = $this->text->manifest();
        $allBooks = array_merge($manifest['at'] ?? [], $manifest['nt'] ?? []);
        $allBooks = array_values(array_filter($allBooks, static fn ($b) => is_array($b) && !empty($b['id']) && !empty($b['name'])));
        if ($allBooks === []) {
            return $out;
        }

        usort($allBooks, static fn ($a, $b) => mb_strlen((string) $b['name']) <=> mb_strlen((string) $a['name']));
        $nameToId = [];
        $parts = [];
        foreach ($allBooks as $b) {
            $name = (string) $b['name'];
            $nameToId[mb_strtolower($name)] = (string) $b['id'];
            $parts[] = preg_quote($name, '/');
        }
        $alternation = implode('|', $parts);
        if ($alternation === '') {
            return $out;
        }

        $returnQ = $returnTo !== '' ? '?returnTo='.rawurlencode($returnTo) : '';
        $re = '/\b('.$alternation.')\s+(\d+)(?::(\d+))?/iu';

        return (string) preg_replace_callback($re, function (array $m) use ($nameToId, $slug, $returnQ) {
            $bookName = $m[1];
            $id = $nameToId[mb_strtolower($bookName)] ?? null;
            if (!$id) {
                return $m[0];
            }
            $ch = $m[2];
            $v = $m[3] ?? '';
            $href = '/'.$slug.'/bible/'.$id.'/'.$ch.($v !== '' ? '#v'.$v : '').$returnQ;

            return '<a href="'.e($href).'" class="bible-ref-link" target="_blank" rel="noopener">'.e($m[0]).'</a>';
        }, $out) ?: $out;
    }
}
