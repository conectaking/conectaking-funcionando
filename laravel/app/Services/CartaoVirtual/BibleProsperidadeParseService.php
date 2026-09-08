<?php

namespace App\Services\CartaoVirtual;

/**
 * Parser Prosperidade — paridade com shared/prosperidade-parse.js
 */
class BibleProsperidadeParseService
{
    /**
     * @return array{ok?:bool,partial?:bool,sections?:array<string,string>,warning?:string,error?:string}
     */
    public function parsePastedActivation(string $text): array
    {
        $raw = $this->normalizePaste(trim($text));
        if ($raw === '') {
            return ['error' => 'Texto vazio.'];
        }
        $sections = $this->parseByMarkers($raw);
        $rawLines = preg_split("/\r?\n/", $raw) ?: [];
        if (empty($sections['titulo'])) {
            foreach ($rawLines as $l) {
                if ($this->isIntroLine($l)) {
                    $sections['titulo'] = $this->extractIntroTitle($l);
                    break;
                }
            }
        }
        $sections['titulo'] = $this->sanitizeTitulo($sections['titulo'] ?? '');
        if (empty($sections['decreto_entrada'])) {
            $sections['decreto_entrada'] = $this->extractDecretoQuote($rawLines);
        }
        if (empty($sections['decreto_entrada']) && !empty($sections['sentenca_ativacao'])) {
            $parts = explode("\n", (string) $sections['sentenca_ativacao']);
            $sections['decreto_entrada'] = trim($parts[0] ?? '');
        }
        if ($this->hasMinimumSections($sections)) {
            return ['ok' => true, 'sections' => $sections];
        }
        $n = $this->countSections($sections);
        if ($n >= 2) {
            return [
                'ok' => true,
                'partial' => true,
                'sections' => $sections,
                'warning' => 'Divisão parcial ('.$n.' blocos). Revise sentença e decreto se faltarem.',
            ];
        }
        $found = array_keys(array_filter($sections, static fn ($v) => trim((string) $v) !== ''));

        return [
            'error' => 'Não foi possível dividir. Encontrado: '.(implode(', ', $found) ?: 'nada')
                .'. Use os marcadores: FUNDAMENTO SAGRADO, FRASES DE IMPACTO, SENTENÇA DE ATIVAÇÃO.',
        ];
    }

    public function sanitizeTitulo(mixed $v): string
    {
        $t = trim((string) $v);
        if ($t === '') {
            return '';
        }
        if (preg_match('/["""«\']/u', $t, $m, PREG_OFFSET_CAPTURE) && ($m[0][1] ?? 0) > 0) {
            $t = trim(substr($t, 0, $m[0][1]));
        }
        $t = preg_replace('/\s*[📜🔍💎🦅⚡👁🧠✍🗣📚🎬].*$/u', '', $t) ?? $t;
        $t = preg_replace('/\s+\d+\.\s*.*$/u', '', $t) ?? $t;
        $t = trim($t);
        if (mb_strlen($t) > 200) {
            $t = mb_substr($t, 0, 200);
        }

        return trim($t);
    }

    private function cleanLine(string $line): string
    {
        $s = preg_replace('/^[\s\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}\x{FE0F}\x{200D}]+/u', '', $line) ?? $line;

        return trim($s);
    }

    private function isIntroLine(string $line): bool
    {
        return (bool) preg_match('/(?:FASE|ATIVA[CÇ][AÃ]O)\s*\d+/iu', $this->cleanLine($line));
    }

    private function extractIntroTitle(string $line): string
    {
        $raw = $this->cleanLine($line);
        if (!preg_match('/(?:FASE|ATIVA[CÇ][AÃ]O)\s*\d+\s*[:\-–—]\s*(.+)$/iu', $raw, $m)) {
            return '';
        }
        $title = trim(preg_replace('/\*+/', '', $m[1]) ?? $m[1]);
        if (preg_match('/["""«\']/u', $title, $qm, PREG_OFFSET_CAPTURE)) {
            $title = trim(substr($title, 0, $qm[0][1]));
        }
        $title = preg_replace('/\s*[📜🔍💎🦅⚡👁🧠✍🗣📚🎬].*$/u', '', $title) ?? $title;
        $title = preg_replace('/\s+\d+\.\s*.*$/u', '', $title) ?? $title;
        $title = trim($title);
        if (mb_strlen($title) > 200) {
            $title = mb_substr($title, 0, 200);
        }

        return trim($title);
    }

    private function normalizePaste(string $raw): string
    {
        $t = str_replace("\r\n", "\n", $raw);
        $t = trim($t);
        if ($t === '') {
            return $t;
        }
        $t = preg_replace(
            '/((?:ATIVA[CÇ][AÃ]O|FASE)\s+\d+\s*:[^\n"""«\']{2,120})(["""«\'])/iu',
            "$1\n\n$2",
            $t
        ) ?? $t;
        $markers = [
            '/(\S)\s*(?=(?:📜\s*)?\d+\.\s*(?:O\s+)?FUNDAMENTO\s+SAGRADO\s*:)/iu',
            '/(\S)\s*(?=(?:🔍\s*)?\d+\.\s*(?:EXTRA[ÇC][AÃ]O\s+DE\s+PROSPERIDADE|DIAGN[OÓ]STICO))/iu',
            '/(\S)\s*(?=💎\s*FRASES\s+DE\s+IMPACTO)/iu',
            '/(\S)\s*(?=(?:🦅\s*)?\d+\.\s*NA\s+ESTRADA\s+COM)/iu',
            '/(\S)\s*(?=⚡\s*C[OÓ]DIGO\s+DA\s+VIRADA)/iu',
            '/(\S)\s*(?=👁[^\n]*DIRETRIZ\s+DE\s+ILUSTRA)/iu',
            '/(\S)\s*(?=(?:🧠\s*)?\d+\.\s*REPROGRAMA[ÇC][ÃA]O\s+MENTAL)/iu',
            '/(\S)\s*(?=(?:✍\s*)?\d+\.\s*(?:O\s+)?TREINO\s+DO\s+REI)/iu',
            '/(\S)\s*(?=(?:🗣\s*)?\d+\.\s*SENTEN[ÇC]A\s+DE\s+ATIVA)/iu',
            '/(\S)\s*(?=(?:📚\s*)?\d+\.\s*ATIVA[ÇC][AÃ]O\s+COMPLEMENTAR)/iu',
            '/(\S)\s*(?=🎬\s*PR[OÓ]XIMO\s+EPIS)/iu',
        ];
        foreach ($markers as $re) {
            $t = preg_replace($re, "$1\n\n", $t) ?? $t;
        }
        $t = preg_replace('/(["""»\'"]\s*[—\-–]\s*KING)\s*(?=\S)/iu', "$1\n\n", $t) ?? $t;

        return trim($t);
    }

    private function cleanDecretoText(string $s): string
    {
        $s = preg_replace('/^["""«\']+/u', '', $s) ?? $s;
        $s = preg_replace('/\s*[—\-–]\s*KING\s*$/iu', '', $s) ?? $s;
        $s = preg_replace('/["""»\'"]+\s*$/u', '', $s) ?? $s;

        return trim($s);
    }

    /**
     * @param  list<string>  $lines
     */
    private function extractDecretoQuote(array $lines): string
    {
        foreach ($lines as $i => $line) {
            if (!$this->isIntroLine($line)) {
                continue;
            }
            if (preg_match('/["""«\']([^""»\'"]{10,})["""»\'"]\s*[—\-–]?\s*KING/iu', $line, $same)) {
                return $this->cleanDecretoText($same[1]);
            }
            $max = min($i + 6, count($lines));
            for ($j = $i + 1; $j < $max; $j++) {
                $l = trim($lines[$j]);
                if ($l === '') {
                    continue;
                }
                if (preg_match('/^["\'“"«]/u', $l) || preg_match('/KING\s*$/iu', $l)) {
                    return $this->cleanDecretoText($l) ?: $l;
                }
                $c = $this->cleanLine($l);
                if (preg_match('/FUNDAMENTO\s+SAGRADO|EXTRA[ÇC][AÃ]O\s+DE\s+PROSPERIDADE/iu', $c)) {
                    break;
                }
            }
            break;
        }

        return '';
    }

    /**
     * @return list<array{key:string,re:string}>
     */
    private function markerDefs(): array
    {
        return [
            ['key' => 'fundamento_sagrado', 're' => '/(?:^|\n)\s*\d+\.\s*(?:O\s+)?FUNDAMENTO\s+SAGRADO\s*:[^\n]*/iu'],
            ['key' => 'diagnostico_escassez', 're' => '/(?:^|\n)\s*\d+\.\s*(?:O\s+)?(?:DIAGN[OÓ]STICO\s+DA\s+ESCASSEZ|EXTRA[ÇC][AÃ]O\s+DE\s+PROSPERIDADE)\s*:[^\n]*/iu'],
            ['key' => 'ie_chave', 're' => '/(?:^|\n)\s*FRASES\s+DE\s+IMPACTO\s+DO\s+KING\s*:?\s*/iu'],
            ['key' => 'estrada_com_king', 're' => '/(?:^|\n)\s*\d+\.\s*NA\s+ESTRADA\s+COM\s+(?:O\s+)?KING\s*:[^\n]*/iu'],
            ['key' => '__codigo_virada__', 're' => '/(?:^|\n)\s*C[OÓ]DIGO\s+DA\s+VIRADA\s*:?\s*/iu'],
            ['key' => 'diretriz_ilustracao', 're' => '/(?:^|\n)\s*DIRETRIZ\s+DE\s+ILUSTRA[ÇC][ÃA]O[^:\n]*:\s*/iu'],
            ['key' => '__reprogram__', 're' => '/(?:^|\n)\s*\d+\.\s*REPROGRAMA[ÇC][ÃA]O\s+MENTAL(?:\s+DE\s+IMPACTO)?\s*:[^\n]*/iu'],
            ['key' => '__treino__', 're' => '/(?:^|\n)\s*\d+\.\s*(?:O\s+)?TREINO\s+DO\s+REI[^\n]*/iu'],
            ['key' => 'sentenca_ativacao', 're' => '/(?:^|\n)\s*\d+\.\s*SENTEN[ÇC]A\s+DE\s+ATIVA[ÇC][ÃA]O(?:\s+DI[AÁ]RIA)?\s*/iu'],
            ['key' => '__complementar__', 're' => '/(?:^|\n)\s*\d+\.\s*ATIVA[ÇC][AÃ]O\s+COMPLEMENTAR\s*:[^\n]*/iu'],
            ['key' => 'proximo_episodio', 're' => '/(?:^|\n)\s*PR[OÓ]XIMO\s+EPIS[OÓ]DIO\s*:[^\n]*/iu'],
        ];
    }

    /**
     * @return list<array{key:string,index:int,end:int}>
     */
    private function findMarkers(string $cleanText): array
    {
        $hits = [];
        foreach ($this->markerDefs() as $def) {
            if (!preg_match_all($def['re'], $cleanText, $matches, PREG_OFFSET_CAPTURE)) {
                continue;
            }
            foreach ($matches[0] as $m) {
                $hits[] = [
                    'key' => $def['key'],
                    'index' => (int) $m[1],
                    'end' => (int) $m[1] + strlen($m[0]),
                ];
            }
        }
        usort($hits, static fn ($a, $b) => $a['index'] <=> $b['index']);
        $seen = [];
        $out = [];
        foreach ($hits as $h) {
            $k = $h['index'].':'.$h['key'];
            if (isset($seen[$k])) {
                continue;
            }
            $seen[$k] = true;
            $out[] = $h;
        }

        return $out;
    }

    public function parseFrasesImpacto(string $text): string
    {
        if ($text === '') {
            return '';
        }
        $phrases = [];
        $seen = [];
        $lines = preg_split("/\r?\n/", $text) ?: [];
        foreach ($lines as $raw) {
            $l = trim($raw);
            if ($l === '' || preg_match('/^FRASES\s+DE\s+IMPACTO/iu', $l)) {
                continue;
            }
            if (preg_match('/^\d+\.\s*NA\s+ESTRADA/iu', $this->cleanLine($l))) {
                break;
            }
            if (preg_match('/^C[OÓ]DIGO\s+DA\s+VIRADA/iu', $this->cleanLine($l))) {
                break;
            }
            $bullet = trim(preg_replace('/^\*\s*/', '', $l) ?? $l);
            if (preg_match('/^["""«\']([^""»\'"]+)["""»\'"]/u', $bullet, $q)) {
                $phrase = trim($q[1]);
                if (mb_strlen($phrase) > 8 && !isset($seen[$phrase])) {
                    $seen[$phrase] = true;
                    $phrases[] = '"'.$phrase.'"';
                }
            }
        }
        if ($phrases === []) {
            if (preg_match_all('/["""«\']([^""»\'"]{12,})["""»\'"]/u', $text, $qm)) {
                foreach ($qm[1] as $phraseRaw) {
                    $phrase = trim($phraseRaw);
                    if (!isset($seen[$phrase]) && !preg_match('/KING\s*$/iu', $phrase)) {
                        $seen[$phrase] = true;
                        $phrases[] = '"'.$phrase.'"';
                    }
                }
            }
        }

        return implode("\n\n", $phrases);
    }

    /**
     * @return array<string,string>
     */
    private function parseReprogramacaoBlock(string $text): array
    {
        $out = [];
        if ($text === '') {
            return $out;
        }
        if (preg_match('/DRIVE\s+DE\s+ESCASSEZ[\s\S]*?["\'""]([^""]+)["\'""][\s\t]+["\'""]([^""]+)["\'""]/iu', $text, $tab)) {
            $out['mentalidade_travada'] = '"'.trim($tab[1]).'"';
            $out['nova_mentalidade'] = '"'.trim($tab[2]).'"';
        } else {
            $partsE = preg_split('/DRIVE\s+DE\s+ESCASSEZ/iu', $text, 2);
            $partsG = preg_split('/DRIVE\s+DE\s+GOVERNO/iu', $text, 2);
            if (!empty($partsE[1]) && preg_match('/["\'""]([^""]+)["\'""]/u', $partsE[1], $m)) {
                $out['mentalidade_travada'] = '"'.trim($m[1]).'"';
            }
            if (!empty($partsG[1]) && preg_match('/["\'""]([^""]+)["\'""]/u', $partsG[1], $m)) {
                $out['nova_mentalidade'] = '"'.trim($m[1]).'"';
            }
        }
        if (empty($out['mentalidade_travada']) && preg_match(
            '/A\s+Mentalidade\s+Travada\s*(?:\([^)]*\))?\s*:\s*([\s\S]*?)(?=\n\s*A\s+Nova\s+Mentalidade|$)/iu',
            $text,
            $travada
        )) {
            $out['mentalidade_travada'] = trim($travada[1]);
        }
        if (empty($out['nova_mentalidade']) && preg_match(
            '/A\s+Nova\s+Mentalidade[^:]*(?:\([^)]*\))?\s*:\s*([\s\S]*?)(?=\n\s*(?:Exerc[ií]cio|Ativa[çc][ãa]o\s+Pr[aá]tica|Protocolo)|$)/iu',
            $text,
            $nova
        )) {
            $out['nova_mentalidade'] = trim($nova[1]);
        }
        if (preg_match('/Protocolo\s+Neuro-Celular[^:]*:\s*([\s\S]*?)(?=\n\s*\d+\.\s*(?:O\s+)?TREINO|$)/iu', $text, $protocolo)) {
            $out['exercicio_fixacao'] = trim($protocolo[1]);
        } elseif (preg_match(
            '/(?:Exerc[ií]cio\s+de\s+Fixa[çc][ãa]o\s+Mental|Ativa[çc][ãa]o\s+Pr[aá]tica\s+das\s+Conex[oõ]es\s+de\s+Governo)\s*[^:]*:\s*([\s\S]*?)(?=\n\s*\d+\.\s*(?:O\s+)?TREINO|$)/iu',
            $text,
            $exerc
        )) {
            $out['exercicio_fixacao'] = trim($exerc[1]);
        }

        return $out;
    }

    /**
     * @return array<string,string>
     */
    private function parseTreinoBlock(string $text): array
    {
        $out = [];
        if ($text === '') {
            return $out;
        }
        $introText = '';
        if (preg_match('/^[\s\S]*?(?=Tarefa\s+0?1|BLOCO\s+DE\s+CAMPO|A[çc][ãa]o\s+de\s+Campo)/iu', $text, $intro)) {
            $introText = trim($intro[0]);
        }
        if (preg_match(
            '/(?:BLOCO\s+DE\s+CAMPO|A[çc][ãa]o\s+de\s+Campo)[^:]*:\s*([\s\S]*?)(?=\n\s*(?:BLOCO\s+DE\s+ALTAR|A[çc][ãa]o\s+de\s+Altar)|$)/iu',
            $text,
            $campo
        )) {
            $out['treino_negocios'] = ($introText !== '' ? $introText."\n\n" : '').trim($campo[1]);
        }
        if (preg_match(
            '/(?:BLOCO\s+DE\s+ALTAR|A[çc][ãa]o\s+de\s+Altar)[^:]*:\s*([\s\S]*?)(?=\n\s*\d+\.\s*SENTEN|$)/iu',
            $text,
            $altar
        ) || preg_match('/(?:BLOCO\s+DE\s+ALTAR|A[çc][ãa]o\s+de\s+Altar)[^:]*:\s*([\s\S]*?)$/iu', $text, $altar)) {
            $out['treino_altar'] = trim($altar[1]);
        }

        return $out;
    }

    private function parseSentencaBlock(string $text): string
    {
        if ($text === '') {
            return '';
        }
        $t = trim(preg_replace('/^\([^)]*declare[^)]*\)\s*/iu', '', trim($text)) ?? trim($text));
        if (preg_match_all('/["""«\']([^""»\'"]{30,})["""»\'"]/u', $t, $quotes) && $quotes[1] !== []) {
            return trim(end($quotes[1]));
        }
        $lines = array_values(array_filter(array_map('trim', explode("\n", $t))));
        foreach ($lines as $l) {
            if (preg_match('/^["\'“"]/u', $l) || mb_strlen($l) > 40) {
                return trim(preg_replace('/^["\'“"]+|["\'“"]+$/u', '', $l) ?? $l);
            }
        }

        return $t;
    }

    private function parseProximoBlock(string $text): string
    {
        if ($text === '') {
            return '';
        }
        $lines = array_values(array_filter(array_map('trim', explode("\n", $text))));
        if ($lines === []) {
            return trim($text);
        }
        $titleLine = trim(preg_replace('/^PR[OÓ]XIMO\s+EPIS[OÓ]DIO\s*:\s*/iu', '', $lines[0]) ?? $lines[0]);

        return count($lines) === 1 ? $titleLine : $titleLine."\n\n".implode("\n\n", array_slice($lines, 1));
    }

    private function parseCodigoVirada(string $text): string
    {
        if ($text === '') {
            return '';
        }
        $quoteLine = '';
        if (preg_match('/["""«\']([^""»\'"]+)["""»\'"]/u', $text, $quote)) {
            $quoteLine = '"'.trim($quote[1]).'" — KING';
        }
        $rest = trim(preg_replace('/^["""«\'][^""]+["""»\'"]\s*[—\-–]?\s*KING\s*/iu', '', $text) ?? $text);

        return $quoteLine !== '' ? $quoteLine."\n\n".$rest : trim($text);
    }

    /**
     * @return array<string,string>
     */
    private function parseByMarkers(string $raw): array
    {
        $lines = preg_split("/\r?\n/", $raw) ?: [];
        $cleanText = implode("\n", array_map(fn ($l) => $this->cleanLine($l), $lines));
        $sections = [];
        foreach ($lines as $l) {
            if ($this->isIntroLine($l)) {
                $sections['titulo'] = $this->extractIntroTitle($l);
                break;
            }
        }
        $decreto = $this->extractDecretoQuote($lines);
        if ($decreto !== '') {
            $sections['decreto_entrada'] = $decreto;
        }
        $markers = $this->findMarkers($cleanText);
        $codigoBody = '';
        foreach ($markers as $i => $hit) {
            $start = $hit['end'];
            $end = isset($markers[$i + 1]) ? $markers[$i + 1]['index'] : strlen($cleanText);
            $body = trim(substr($cleanText, $start, $end - $start));
            if ($hit['key'] === '__codigo_virada__') {
                $codigoBody = $this->parseCodigoVirada($body);
                continue;
            }
            if ($hit['key'] === '__reprogram__') {
                $sections = array_merge($sections, $this->parseReprogramacaoBlock($body));
                continue;
            }
            if ($hit['key'] === '__treino__') {
                $sections = array_merge($sections, $this->parseTreinoBlock($body));
                continue;
            }
            if ($hit['key'] === '__complementar__') {
                $sections['__complementar_body__'] = $body;
                continue;
            }
            if ($hit['key'] === 'sentenca_ativacao') {
                $sections['sentenca_ativacao'] = $this->parseSentencaBlock($body);
                continue;
            }
            if ($hit['key'] === 'proximo_episodio') {
                $sections['proximo_episodio'] = $this->parseProximoBlock($body);
                continue;
            }
            if ($hit['key'] === 'ie_chave') {
                $sections['ie_chave'] = $this->parseFrasesImpacto($body);
                continue;
            }
            if ($hit['key'] === 'fundamento_sagrado') {
                $body = trim(preg_replace('/^PROV[EÉ]RBIOS\s+\d+[^\n]*\n?/iu', '', $body) ?? $body);
            }
            if ($body !== '') {
                $sections[$hit['key']] = $body;
            }
        }
        if ($codigoBody !== '') {
            $sections['estrada_com_king'] = !empty($sections['estrada_com_king'])
                ? $sections['estrada_com_king']."\n\n⚡ CÓDIGO DA VIRADA:\n".$codigoBody
                : $codigoBody;
        }
        if (!empty($sections['__complementar_body__'])) {
            $comp = trim((string) $sections['__complementar_body__']);
            $sections['treino_altar'] = !empty($sections['treino_altar'])
                ? $sections['treino_altar']."\n\n---\n\n📚 ATIVAÇÃO COMPLEMENTAR\n\n".$comp
                : "📚 ATIVAÇÃO COMPLEMENTAR\n\n".$comp;
            unset($sections['__complementar_body__']);
        }

        return $sections;
    }

    /**
     * @param  array<string,mixed>  $sections
     */
    private function countSections(array $sections): int
    {
        $n = 0;
        foreach ($sections as $v) {
            if (trim((string) $v) !== '') {
                $n++;
            }
        }

        return $n;
    }

    /**
     * @param  array<string,mixed>  $sections
     */
    private function hasMinimumSections(array $sections): bool
    {
        $hasFund = trim((string) ($sections['fundamento_sagrado'] ?? '')) !== '';
        $hasSent = trim((string) ($sections['sentenca_ativacao'] ?? '')) !== '';
        $hasDecreto = trim((string) ($sections['decreto_entrada'] ?? '')) !== '';

        return $hasFund && $hasSent && ($hasDecreto || $hasFund);
    }
}
