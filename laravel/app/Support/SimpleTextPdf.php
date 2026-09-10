<?php

namespace App\Support;

/**
 * Gerador mínimo de PDF (texto + tabela) sem dependências Composer.
 * Fonte Helvetica com WinAnsiEncoding (Windows-1252) para acentos em PT-BR.
 */
final class SimpleTextPdf
{
    private const PAGE_W = 595.0;

    private const PAGE_H = 842.0;

    private const MARGIN = 40.0;

    private const TITLE_SIZE = 16.0;

    private const LINE_SIZE = 11.0;

    private const TABLE_SIZE = 9.0;

    private const LINE_GAP = 4.0;

    /** @var list<array{type: string, text?: string, headers?: list<string>, rows?: list<list<string>>}> */
    private array $blocks = [];

    public function __construct(?string $title = null)
    {
        if ($title !== null && $title !== '') {
            $this->addTitle($title);
        }
    }

    public function addTitle(string $text): self
    {
        $this->blocks[] = ['type' => 'title', 'text' => $text];

        return $this;
    }

    public function addLine(string $text): self
    {
        $this->blocks[] = ['type' => 'line', 'text' => $text];

        return $this;
    }

    /**
     * @param  list<string>  $headers
     * @param  list<list<string>>  $rows
     */
    public function addTable(array $headers, array $rows): self
    {
        $this->blocks[] = ['type' => 'table', 'headers' => array_values($headers), 'rows' => array_values($rows)];

        return $this;
    }

    public function output(): string
    {
        $streams = $this->buildPageStreams();
        $n = count($streams);
        $objs = [];
        $objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
        $kids = [];
        for ($i = 0; $i < $n; $i++) {
            $kids[] = (3 + $i * 2).' 0 R';
        }
        $objs[2] = '<< /Type /Pages /Kids ['.implode(' ', $kids).'] /Count '.$n.' >>';
        $fontId = 3 + $n * 2;
        for ($i = 0; $i < $n; $i++) {
            $pageId = 3 + $i * 2;
            $contentId = $pageId + 1;
            $stream = $streams[$i];
            $objs[$pageId] = sprintf(
                '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.0f %.0f] /Contents %d 0 R /Resources << /Font << /F1 %d 0 R >> >> >>',
                self::PAGE_W,
                self::PAGE_H,
                $contentId,
                $fontId
            );
            $objs[$contentId] = '<< /Length '.strlen($stream)." >>\nstream\n".$stream."\nendstream";
        }
        $objs[$fontId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';

        ksort($objs);
        $pdf = "%PDF-1.4\n";
        $offsets = [0];
        foreach ($objs as $id => $body) {
            $offsets[$id] = strlen($pdf);
            $pdf .= $id." 0 obj\n".$body."\nendobj\n";
        }
        $xref = strlen($pdf);
        $maxId = max(array_keys($objs));
        $pdf .= "xref\n0 ".($maxId + 1)."\n";
        $pdf .= "0000000000 65535 f \n";
        for ($i = 1; $i <= $maxId; $i++) {
            $pdf .= sprintf("%010d 00000 n \n", $offsets[$i] ?? 0);
        }
        $pdf .= "trailer\n<< /Size ".($maxId + 1)." /Root 1 0 R >>\n";
        $pdf .= "startxref\n".$xref."\n%%EOF\n";

        return $pdf;
    }

    /** @return list<string> */
    private function buildPageStreams(): array
    {
        $pages = [];
        $ops = [];
        $y = self::PAGE_H - self::MARGIN;
        $usableW = self::PAGE_W - 2 * self::MARGIN;
        $flush = static function () use (&$pages, &$ops): void {
            $pages[] = implode("\n", $ops);
            $ops = [];
        };
        $ensure = function (float $need) use (&$y, $flush): void {
            if ($y - $need < self::MARGIN) {
                $flush();
                $y = self::PAGE_H - self::MARGIN;
            }
        };

        foreach ($this->blocks as $block) {
            if ($block['type'] === 'title') {
                $size = self::TITLE_SIZE;
                $ensure($size + self::LINE_GAP);
                $ops[] = $this->tj(self::MARGIN, $y, $size, (string) ($block['text'] ?? ''));
                $y -= $size + self::LINE_GAP + 2;
                continue;
            }
            if ($block['type'] === 'line') {
                $size = self::LINE_SIZE;
                $ensure($size + self::LINE_GAP);
                $ops[] = $this->tj(self::MARGIN, $y, $size, (string) ($block['text'] ?? ''));
                $y -= $size + self::LINE_GAP;
                continue;
            }
            if ($block['type'] !== 'table') {
                continue;
            }
            /** @var list<string> $headers */
            $headers = $block['headers'] ?? [];
            /** @var list<list<string>> $rows */
            $rows = $block['rows'] ?? [];
            $cols = max(1, count($headers));
            $colW = $usableW / $cols;
            $size = self::TABLE_SIZE;
            $rowH = $size + self::LINE_GAP;

            $drawHeader = function () use (&$ops, &$y, $headers, $cols, $colW, $size, $rowH, $ensure): void {
                $ensure($rowH + 2);
                for ($c = 0; $c < $cols; $c++) {
                    $cell = $headers[$c] ?? '';
                    $ops[] = $this->tj(self::MARGIN + $c * $colW, $y, $size, $this->fit($cell, $colW - 4, $size));
                }
                $y -= $rowH;
            };
            $drawHeader();

            foreach ($rows as $row) {
                $ensure($rowH);
                if ($y === self::PAGE_H - self::MARGIN) {
                    $drawHeader();
                    $ensure($rowH);
                }
                for ($c = 0; $c < $cols; $c++) {
                    $cell = isset($row[$c]) ? (string) $row[$c] : '';
                    $ops[] = $this->tj(self::MARGIN + $c * $colW, $y, $size, $this->fit($cell, $colW - 4, $size));
                }
                $y -= $rowH;
            }
            $y -= 6;
        }

        if ($ops === [] && $pages === []) {
            $ops[] = $this->tj(self::MARGIN, $y, self::LINE_SIZE, '');
        }
        if ($ops !== []) {
            $flush();
        }

        return $pages !== [] ? $pages : [''];
    }

    private function tj(float $x, float $y, float $size, string $text): string
    {
        return sprintf(
            'BT /F1 %.2F Tf %.2F %.2F Td (%s) Tj ET',
            $size,
            $x,
            $y,
            $this->escapePdf($this->toWin1252($text))
        );
    }

    private function fit(string $text, float $maxW, float $size): string
    {
        $avg = $size * 0.5;
        $maxChars = max(1, (int) floor($maxW / $avg));
        $enc = $this->toWin1252($text);
        if (strlen($enc) <= $maxChars) {
            return $text;
        }
        $cut = substr($enc, 0, max(1, $maxChars - 1));

        return (mb_convert_encoding($cut, 'UTF-8', 'Windows-1252') ?: $cut).'…';
    }

    private function toWin1252(string $text): string
    {
        $out = @iconv('UTF-8', 'Windows-1252//TRANSLIT', $text);
        if ($out === false) {
            $out = @mb_convert_encoding($text, 'Windows-1252', 'UTF-8');
        }

        return $out === false ? $text : $out;
    }

    private function escapePdf(string $text): string
    {
        return str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $text);
    }
}
