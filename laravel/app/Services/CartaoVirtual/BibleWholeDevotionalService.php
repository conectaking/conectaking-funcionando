<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\File;

/**
 * Devocional “Bíblia inteira” (1 capítulo por dia na sequência, ~1189 dias).
 */
class BibleWholeDevotionalService
{
    /** @var array<string, array<string, mixed>>|null */
    private static ?array $contentCache = null;

    public function __construct(private readonly BibleTextService $text)
    {
    }

    /**
     * @return array<string, mixed>|null
     */
    public function bySequenceDay(int $dayNumber): ?array
    {
        $seq = $this->text->chapterSequence();
        if ($seq === []) {
            return null;
        }
        $total = count($seq);
        $day = max(1, $dayNumber);
        $index = ($day - 1) % $total;
        $entry = $seq[$index];
        $chapterData = $this->text->chapter($entry['bookId'], $entry['chapter'], 'nvi');
        $verses = is_array($chapterData['verses'] ?? null) ? $chapterData['verses'] : [];
        $v1 = $verses[0] ?? null;
        $v2 = $verses[1] ?? null;
        $verseRef = $v1 && $v2
            ? ($entry['bookName'].' '.$entry['chapter'].':'.$v1['verse'].'-'.$v2['verse'])
            : ($entry['bookName'].' '.$entry['chapter'].($v1 ? ':'.$v1['verse'] : ''));
        $verseText = $v1 && $v2
            ? trim(($v1['text'] ?? '').' '.($v2['text'] ?? ''))
            : (string) ($v1['text'] ?? '');
        $content = $this->contentForChapter($entry['bookId'], (int) $entry['chapter']);
        $ref = $entry['bookName'].' '.$entry['chapter'];
        $hoje = now('America/Sao_Paulo')->format('d/m/Y');

        return [
            'mode' => 'sequence',
            'dayNumber' => $day,
            'totalDays' => $total,
            'bookId' => $entry['bookId'],
            'bookName' => $entry['bookName'],
            'chapter' => (int) $entry['chapter'],
            'totalChapters' => (int) ($chapterData['totalChapters'] ?? 1),
            'ref' => $ref,
            'verse_ref' => $verseRef,
            'verse_text' => $verseText !== '' ? $verseText : null,
            'titulo' => (string) ($content['titulo'] ?? ($ref.' — Devocional')),
            'resumo_capitulo' => (string) ($content['resumo_capitulo'] ?? (
                'Este capítulo faz parte da jornada da Bíblia inteira em devocionais diários. '
                .'Um ou dois versículos destacados trazem a essência do trecho. Hoje ('.$hoje.') deixe que esta Palavra ilumine o seu dia.'
            )),
            'reflexao' => (string) ($content['reflexao'] ?? (
                'Leia o capítulo completo na Bíblia. Reflita sobre o que o Senhor está falando ao seu coração hoje. '
                .'Este devocional percorre toda a Escritura: quando terminar, recomeça — para toda a vida.'
            )),
            'aplicacao' => (string) ($content['aplicacao'] ?? 'Aplique em sua vida o que o Espírito Santo destacar na leitura.'),
            'oracao' => (string) ($content['oracao'] ?? 'Senhor, abre meus olhos para ver as maravilhas da Tua Palavra. Amém.'),
        ];
    }

    /**
     * Modo calendário (mês 1–12, dia 1–31) — paridade Node.
     *
     * @return array<string, mixed>|null
     */
    public function byCalendar(int $month, int $day): ?array
    {
        $m = max(1, min(12, $month));
        $d = max(1, min(31, $day));
        $all = array_merge($this->text->manifest()['at'], $this->text->manifest()['nt']);
        if ($all === []) {
            return null;
        }
        $book = $all[($m - 1) % count($all)];
        $bookId = (string) ($book['id'] ?? '');
        $bookName = (string) ($book['name'] ?? $bookId);
        if ($bookId === '') {
            return null;
        }
        $counts = $this->text->chapterCountsByBook();
        $totalChapters = $counts[$bookId] ?? 1;
        $chapter = min($d, $totalChapters);
        $chapterData = $this->text->chapter($bookId, $chapter, 'nvi');
        $verses = is_array($chapterData['verses'] ?? null) ? $chapterData['verses'] : [];
        $v1 = $verses[0] ?? null;
        $content = $this->contentForChapter($bookId, $chapter);
        $ref = $bookName.' '.$chapter;

        return [
            'mode' => 'calendar',
            'month' => $m,
            'day' => $d,
            'bookId' => $bookId,
            'bookName' => $bookName,
            'chapter' => $chapter,
            'totalChapters' => $totalChapters,
            'ref' => $ref,
            'verse_ref' => $ref.':1',
            'verse_text' => $v1['text'] ?? null,
            'titulo' => (string) ($content['titulo'] ?? ($ref.' — Devocional')),
            'resumo_capitulo' => $content['resumo_capitulo'] ?? null,
            'reflexao' => (string) ($content['reflexao'] ?? (
                'Leia o capítulo '.$chapter.' de '.$bookName.' na Bíblia. Reflita sobre o que o Senhor está falando ao seu coração hoje.'
            )),
            'aplicacao' => (string) ($content['aplicacao'] ?? 'Aplique em sua vida o que o Espírito Santo destacar na leitura.'),
            'oracao' => (string) ($content['oracao'] ?? 'Senhor, abre meus olhos para ver as maravilhas da Tua Palavra. Amém.'),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function contentForChapter(string $bookId, int $chapter): ?array
    {
        $map = $this->loadContentMap();
        $key = $bookId.'-'.$chapter;
        $alt = $bookId.'_'.$chapter;
        $row = $map[$key] ?? $map[$alt] ?? null;

        return is_array($row) ? $row : null;
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function loadContentMap(): array
    {
        if (self::$contentCache !== null) {
            return self::$contentCache;
        }
        $path = resource_path('data/bible/devocional_biblia_inteira.json');
        if (!File::exists($path)) {
            self::$contentCache = [];

            return self::$contentCache;
        }
        $decoded = json_decode(File::get($path), true);
        self::$contentCache = is_array($decoded) ? $decoded : [];

        return self::$contentCache;
    }
}
