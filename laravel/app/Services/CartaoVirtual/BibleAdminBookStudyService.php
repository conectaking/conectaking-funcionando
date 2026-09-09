<?php

namespace App\Services\CartaoVirtual;

use App\Support\BackgroundArtisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Admin de estudos por livro (paridade com routes/adminBibleStudy.js + bible.adminBookStudyAiJobs).
 */
class BibleAdminBookStudyService
{
    private const BOOKS_MANIFEST_FALLBACK = [
        'at' => [
            ['id' => 'gn', 'name' => 'Gênesis'], ['id' => 'ex', 'name' => 'Êxodo'], ['id' => 'lv', 'name' => 'Levítico'],
            ['id' => 'nm', 'name' => 'Números'], ['id' => 'dt', 'name' => 'Deuteronômio'], ['id' => 'js', 'name' => 'Josué'],
            ['id' => 'jud', 'name' => 'Juízes'], ['id' => 'rt', 'name' => 'Rute'], ['id' => '1sm', 'name' => '1 Samuel'],
            ['id' => '2sm', 'name' => '2 Samuel'], ['id' => '1kgs', 'name' => '1 Reis'], ['id' => '2kgs', 'name' => '2 Reis'],
            ['id' => '1ch', 'name' => '1 Crônicas'], ['id' => '2ch', 'name' => '2 Crônicas'], ['id' => 'ezr', 'name' => 'Esdras'],
            ['id' => 'ne', 'name' => 'Neemias'], ['id' => 'et', 'name' => 'Ester'], ['id' => 'job', 'name' => 'Jó'],
            ['id' => 'ps', 'name' => 'Salmos'], ['id' => 'prv', 'name' => 'Provérbios'], ['id' => 'ec', 'name' => 'Eclesiastes'],
            ['id' => 'so', 'name' => 'Cânticos'], ['id' => 'is', 'name' => 'Isaías'], ['id' => 'jr', 'name' => 'Jeremias'],
            ['id' => 'lm', 'name' => 'Lamentações'], ['id' => 'ez', 'name' => 'Ezequiel'], ['id' => 'dn', 'name' => 'Daniel'],
            ['id' => 'ho', 'name' => 'Oseias'], ['id' => 'jl', 'name' => 'Joel'], ['id' => 'am', 'name' => 'Amós'],
            ['id' => 'ob', 'name' => 'Obadias'], ['id' => 'jn', 'name' => 'Jonas'], ['id' => 'mi', 'name' => 'Miqueias'],
            ['id' => 'na', 'name' => 'Naum'], ['id' => 'hk', 'name' => 'Habacuque'], ['id' => 'zp', 'name' => 'Sofonias'],
            ['id' => 'hg', 'name' => 'Ageu'], ['id' => 'zc', 'name' => 'Zacarias'], ['id' => 'ml', 'name' => 'Malaquias'],
        ],
        'nt' => [
            ['id' => 'mt', 'name' => 'Mateus'], ['id' => 'mk', 'name' => 'Marcos'], ['id' => 'lk', 'name' => 'Lucas'],
            ['id' => 'jo', 'name' => 'João'], ['id' => 'act', 'name' => 'Atos'], ['id' => 'rm', 'name' => 'Romanos'],
            ['id' => '1co', 'name' => '1 Coríntios'], ['id' => '2co', 'name' => '2 Coríntios'], ['id' => 'gl', 'name' => 'Gálatas'],
            ['id' => 'eph', 'name' => 'Efésios'], ['id' => 'ph', 'name' => 'Filipenses'], ['id' => 'cl', 'name' => 'Colossenses'],
            ['id' => '1ts', 'name' => '1 Tessalonicenses'], ['id' => '2ts', 'name' => '2 Tessalonicenses'],
            ['id' => '1tm', 'name' => '1 Timóteo'], ['id' => '2tm', 'name' => '2 Timóteo'], ['id' => 'tt', 'name' => 'Tito'],
            ['id' => 'phm', 'name' => 'Filemom'], ['id' => 'hb', 'name' => 'Hebreus'], ['id' => 'jm', 'name' => 'Tiago'],
            ['id' => '1pe', 'name' => '1 Pedro'], ['id' => '2pe', 'name' => '2 Pedro'], ['id' => '1jo', 'name' => '1 João'],
            ['id' => '2jo', 'name' => '2 João'], ['id' => '3jo', 'name' => '3 João'], ['id' => 'jd', 'name' => 'Judas'],
            ['id' => 're', 'name' => 'Apocalipse'],
        ],
    ];

    public function __construct(
        private readonly BibleTextService $text,
        private readonly BibleStudyService $studies,
        private readonly BibleDevotionalAiService $ai,
    ) {
    }

    /**
     * @return list<array{book_id:string,book_name:string,has_study:bool}>
     */
    public function listStudyBooks(): array
    {
        $manifest = $this->text->manifest();
        $allBooks = array_merge($manifest['at'] ?? [], $manifest['nt'] ?? []);
        if ($allBooks === []) {
            $allBooks = array_merge(self::BOOKS_MANIFEST_FALLBACK['at'], self::BOOKS_MANIFEST_FALLBACK['nt']);
        }
        $withStudy = array_fill_keys($this->studies->bookIdsWithFullStudy(), true);
        $out = [];
        foreach ($allBooks as $b) {
            if (!is_array($b) || empty($b['id'])) {
                continue;
            }
            $id = (string) $b['id'];
            $out[] = [
                'book_id' => $id,
                'book_name' => (string) ($b['name'] ?? $id),
                'has_study' => isset($withStudy[$id]),
            ];
        }

        return $out;
    }

    /**
     * @return array{id:string,name:string}|null
     */
    public function resolveBookMeta(string $bookId): ?array
    {
        $id = trim($bookId);
        if ($id === '') {
            return null;
        }
        $manifest = $this->text->manifest();
        $all = array_merge($manifest['at'] ?? [], $manifest['nt'] ?? []);
        if ($all === []) {
            $all = array_merge(self::BOOKS_MANIFEST_FALLBACK['at'], self::BOOKS_MANIFEST_FALLBACK['nt']);
        }
        foreach ($all as $b) {
            if (!is_array($b) || empty($b['id'])) {
                continue;
            }
            if (strcasecmp((string) $b['id'], $id) === 0) {
                return ['id' => (string) $b['id'], 'name' => (string) ($b['name'] ?? $b['id'])];
            }
        }

        return null;
    }

    public function upsertBookStudy(string $bookId, ?string $title, string $content): void
    {
        $safeBookId = trim($bookId);
        if ($safeBookId === '') {
            throw new \InvalidArgumentException('book_id é obrigatório');
        }
        $safeTitle = $title !== null ? (trim($title) !== '' ? trim($title) : null) : null;
        $safeContent = (string) $content;
        DB::statement(
            'INSERT INTO bible_book_studies (book_id, title, content, created_at, updated_at)
             VALUES (?, ?, ?, NOW(), NOW())
             ON CONFLICT (book_id) DO UPDATE SET
               title = COALESCE(EXCLUDED.title, bible_book_studies.title),
               content = EXCLUDED.content,
               updated_at = NOW()',
            [$safeBookId, $safeTitle, $safeContent]
        );
    }

    public function deleteBookStudy(string $bookId): bool
    {
        $safeBookId = trim($bookId);
        if ($safeBookId === '') {
            throw new \InvalidArgumentException('book_id é obrigatório');
        }
        $n = DB::affectingStatement('DELETE FROM bible_book_studies WHERE book_id = ?', [$safeBookId]);

        return $n > 0;
    }

    public function extractUploadText(string $path, string $mime, string $ext): string
    {
        if ($path === '' || !is_file($path)) {
            throw new \RuntimeException('Arquivo inválido.');
        }
        $mime = strtolower($mime);
        $ext = strtolower(ltrim($ext, '.'));

        if ($mime === 'application/pdf' || $ext === 'pdf') {
            return $this->extractPdfText($path);
        }

        if ($ext === 'docx' || str_contains($mime, 'wordprocessingml')) {
            return $this->extractDocxText($path);
        }

        // .doc legado: sem mammoth — tenta leitura bruta de strings (melhor esforço).
        if ($ext === 'doc' || $mime === 'application/msword') {
            $raw = @file_get_contents($path);
            if ($raw === false || $raw === '') {
                throw new \RuntimeException('Falha ao ler .doc');
            }
            // Preferir .docx; extrai sequências ASCII/UTF-8 legíveis.
            if (preg_match_all('/[\x20-\x7E\xC0-\xFF]{4,}/u', $raw, $m)) {
                $joined = trim(implode(' ', $m[0]));
                if (mb_strlen($joined) >= 80) {
                    return $joined;
                }
            }
            throw new \RuntimeException('Não foi possível extrair texto do .doc; use .docx ou PDF.');
        }

        throw new \RuntimeException('Formato não suportado.');
    }

    private function extractPdfText(string $path): string
    {
        $bin = trim((string) shell_exec('command -v pdftotext 2>/dev/null'));
        if ($bin === '' && DIRECTORY_SEPARATOR === '\\') {
            $where = trim((string) shell_exec('where pdftotext 2>NUL'));
            $bin = $where !== '' ? explode("\n", $where)[0] : '';
        }
        if ($bin === '') {
            throw new \RuntimeException('pdftotext não disponível no servidor.');
        }
        $cmd = escapeshellarg($bin).' -layout '.escapeshellarg($path).' -';
        $out = shell_exec($cmd);

        return (string) ($out ?? '');
    }

    private function extractDocxText(string $path): string
    {
        $zip = new \ZipArchive;
        if ($zip->open($path) !== true) {
            throw new \RuntimeException('DOCX inválido.');
        }
        $xml = $zip->getFromName('word/document.xml');
        $zip->close();
        if ($xml === false || $xml === '') {
            throw new \RuntimeException('document.xml ausente.');
        }
        $xml = preg_replace('/<\/w:p>/', "\n", $xml) ?? $xml;
        $xml = preg_replace('/<\/w:tr>/', "\n", $xml) ?? $xml;
        $text = strip_tags($xml);
        $text = html_entity_decode($text, ENT_QUOTES | ENT_XML1, 'UTF-8');
        $text = preg_replace("/[ \t]+/", ' ', $text) ?? $text;
        $text = preg_replace("/\n{3,}/", "\n\n", $text) ?? $text;

        return trim($text);
    }

    /**
     * @return array{book_id?:string,book_name?:string,content_length?:int,error?:string}
     */
    public function generateAndSave(string $bookId, bool $baseadoEmGenesis = false): array
    {
        $meta = $this->resolveBookMeta($bookId);
        if (!$meta) {
            return ['error' => 'Livro não encontrado no manifesto.'];
        }
        $bookName = $meta['name'];
        $referenceSample = '';
        if (strcasecmp($bookId, 'gn') !== 0) {
            $gn = $this->studies->getBookStudy('gn');
            if ($gn && !empty($gn['content'])) {
                $referenceSample = trim((string) $gn['content']);
            }
        }

        $r = $this->ai->generateBookStudyFullText([
            'bookId' => $bookId,
            'bookName' => $bookName,
            'referenceSample' => $referenceSample,
            'baseadoEmGenesis' => $baseadoEmGenesis ?: null,
            'profundidadeEstiloGenesis' => $baseadoEmGenesis,
        ]);
        if (!empty($r['error'])) {
            return ['error' => (string) $r['error']];
        }
        $text = (string) ($r['text'] ?? '');
        $this->upsertBookStudy($bookId, 'Estudo: '.$bookName, $text);

        return [
            'book_id' => $bookId,
            'book_name' => $bookName,
            'content_length' => mb_strlen($text),
        ];
    }

    /**
     * @param  mixed  $bookIdsInput
     * @param  array{baseadoEmGenesis?:bool}  $options
     * @return array{ok:bool,error?:string,jobId?:string,total?:int}
     */
    public function startBookStudyAiBackgroundJob(mixed $bookIdsInput, array $options = []): array
    {
        $raw = is_array($bookIdsInput) ? $bookIdsInput : [];
        $bookIds = [];
        $seen = [];
        foreach ($raw as $b) {
            $s = trim((string) $b);
            if ($s === '') {
                continue;
            }
            $k = strtolower($s);
            if (isset($seen[$k])) {
                continue;
            }
            $seen[$k] = true;
            $bookIds[] = $s;
        }
        if ($bookIds === []) {
            return ['ok' => false, 'error' => 'Indique pelo menos um livro.'];
        }
        if (count($bookIds) > 45) {
            return ['ok' => false, 'error' => 'Máximo 45 livros por trabalho.'];
        }

        $jobId = (string) Str::uuid();
        $nowMs = (int) (microtime(true) * 1000);
        $job = [
            'id' => $jobId,
            'status' => 'queued',
            'bookIds' => $bookIds,
            'total' => count($bookIds),
            'processed' => 0,
            'progress' => 0,
            'errors' => 0,
            'currentBookId' => null,
            'currentBookName' => null,
            'baseadoEmGenesis' => !empty($options['baseadoEmGenesis']),
            'failedSamples' => [],
            'cancelRequested' => false,
            'errorMessage' => null,
            'startedAt' => $nowMs,
            'updatedAt' => $nowMs,
        ];
        Cache::put($this->jobCacheKey($jobId), $job, now()->addHours(12));
        BackgroundArtisan::run('book-study:run-ai-job', $jobId);

        return ['ok' => true, 'jobId' => $jobId, 'total' => count($bookIds)];
    }

    public function runBookStudyAiJob(string $jobId): void
    {
        $this->executeBookStudyAiJob($jobId);
    }

    /**
     * @return array<string,mixed>|null
     */
    public function getBookStudyAiJob(string $jobId): ?array
    {
        $j = Cache::get($this->jobCacheKey($jobId));
        if (!is_array($j)) {
            return null;
        }
        $total = (int) ($j['total'] ?? 0);
        $processed = (int) ($j['processed'] ?? 0);
        $progress = $total > 0 ? min(100, (int) floor((100 * $processed) / $total)) : 0;
        if (($j['status'] ?? '') === 'running' && !empty($j['currentBookId']) && $total > 0) {
            $progress = min(99, (int) floor((100 * $processed) / $total));
        }
        if (($j['status'] ?? '') === 'done') {
            $progress = 100;
        }

        return [
            'id' => $j['id'] ?? $jobId,
            'status' => $j['status'] ?? 'unknown',
            'total' => $total,
            'processed' => $processed,
            'progress' => $progress,
            'errors' => (int) ($j['errors'] ?? 0),
            'currentBookId' => $j['currentBookId'] ?? null,
            'currentBookName' => $j['currentBookName'] ?? null,
            'baseadoEmGenesis' => !empty($j['baseadoEmGenesis']),
            'failedSamples' => array_slice($j['failedSamples'] ?? [], 0, 25),
            'errorMessage' => $j['errorMessage'] ?? null,
            'updatedAt' => $j['updatedAt'] ?? null,
            'startedAt' => $j['startedAt'] ?? null,
        ];
    }

    /**
     * @return array{ok:bool,error?:string}
     */
    public function cancelBookStudyAiJob(string $jobId): array
    {
        $key = $this->jobCacheKey($jobId);
        $j = Cache::get($key);
        if (!is_array($j)) {
            return ['ok' => false, 'error' => 'Trabalho não encontrado ou expirado.'];
        }
        $status = (string) ($j['status'] ?? '');
        if (in_array($status, ['done', 'error', 'cancelled'], true)) {
            return ['ok' => false, 'error' => 'Este trabalho já terminou.'];
        }
        $j['cancelRequested'] = true;
        $j['updatedAt'] = (int) (microtime(true) * 1000);
        Cache::put($key, $j, now()->addHours(12));

        return ['ok' => true];
    }

    private function jobCacheKey(string $jobId): string
    {
        return 'book_study_ai_job:'.$jobId;
    }

    private function executeBookStudyAiJob(string $jobId): void
    {
        $key = $this->jobCacheKey($jobId);
        $job = Cache::get($key);
        if (!is_array($job)) {
            return;
        }
        $bookIds = is_array($job['bookIds'] ?? null) ? $job['bookIds'] : [];
        $baseadoEmGenesis = !empty($job['baseadoEmGenesis']);
        $total = count($bookIds);

        $job['status'] = 'running';
        $job['updatedAt'] = (int) (microtime(true) * 1000);
        Cache::put($key, $job, now()->addHours(12));

        $gnSample = '';
        if ($baseadoEmGenesis) {
            try {
                $gn = $this->studies->getBookStudy('gn');
                if ($gn && !empty($gn['content'])) {
                    $gnSample = trim((string) $gn['content']);
                }
            } catch (\Throwable $e) {
                Log::warning('bookStudyAiJob: sem Gênesis na base para amostra');
            }
        }

        try {
            foreach ($bookIds as $i => $bid) {
                $jCheck = Cache::get($key);
                if (is_array($jCheck) && !empty($jCheck['cancelRequested'])) {
                    $jCheck['status'] = 'cancelled';
                    $jCheck['currentBookId'] = null;
                    $jCheck['currentBookName'] = null;
                    $jCheck['updatedAt'] = (int) (microtime(true) * 1000);
                    Cache::put($key, $jCheck, now()->addHours(12));

                    return;
                }

                $meta = $this->resolveBookMeta((string) $bid);
                $job = Cache::get($key);
                if (!is_array($job)) {
                    return;
                }
                $job['currentBookId'] = $bid;
                $job['currentBookName'] = $meta ? ($meta['name'] ?? $bid) : $bid;
                $job['progress'] = $total > 0 ? min(99, (int) floor((100 * $i) / $total)) : 0;
                $job['updatedAt'] = (int) (microtime(true) * 1000);
                Cache::put($key, $job, now()->addHours(12));

                if (!$meta) {
                    $job['errors'] = (int) ($job['errors'] ?? 0) + 1;
                    $job['processed'] = $i + 1;
                    if (count($job['failedSamples'] ?? []) < 40) {
                        $job['failedSamples'][] = ['bookId' => $bid, 'error' => 'Livro não encontrado no manifesto.'];
                    }
                    Cache::put($key, $job, now()->addHours(12));
                    continue;
                }

                $referenceSample = '';
                if (strcasecmp((string) $bid, 'gn') !== 0) {
                    if ($baseadoEmGenesis && $gnSample !== '') {
                        $referenceSample = $gnSample;
                    } else {
                        try {
                            $gnRow = $this->studies->getBookStudy('gn');
                            if ($gnRow && !empty($gnRow['content'])) {
                                $referenceSample = trim((string) $gnRow['content']);
                            }
                        } catch (\Throwable $e) {
                            // ignore
                        }
                    }
                }

                $r = $this->ai->generateBookStudyFullText([
                    'bookId' => (string) $bid,
                    'bookName' => $meta['name'] ?? $bid,
                    'referenceSample' => $referenceSample,
                    'baseadoEmGenesis' => $baseadoEmGenesis ?: null,
                    'profundidadeEstiloGenesis' => $baseadoEmGenesis,
                ]);

                $job = Cache::get($key);
                if (!is_array($job)) {
                    return;
                }
                if (!empty($r['error'])) {
                    $job['errors'] = (int) ($job['errors'] ?? 0) + 1;
                    if (count($job['failedSamples'] ?? []) < 40) {
                        $job['failedSamples'][] = ['bookId' => $bid, 'error' => (string) $r['error']];
                    }
                } else {
                    $title = 'Estudo: '.($meta['name'] ?? $bid);
                    $this->upsertBookStudy((string) $bid, $title, (string) ($r['text'] ?? ''));
                }

                $job['processed'] = $i + 1;
                $job['progress'] = $total > 0 ? min(100, (int) floor((100 * $job['processed']) / $total)) : 100;
                $job['updatedAt'] = (int) (microtime(true) * 1000);
                Cache::put($key, $job, now()->addHours(12));
            }

            $job = Cache::get($key);
            if (!is_array($job)) {
                return;
            }
            $job['status'] = 'done';
            $job['currentBookId'] = null;
            $job['currentBookName'] = null;
            $job['progress'] = 100;
            $job['updatedAt'] = (int) (microtime(true) * 1000);
            Cache::put($key, $job, now()->addHours(12));
        } catch (\Throwable $e) {
            Log::error('bible.adminBookStudyAiJobs execute: '.$e->getMessage());
            $job = Cache::get($key);
            if (is_array($job)) {
                $job['status'] = 'error';
                $job['errorMessage'] = $e->getMessage() ?: (string) $e;
                $job['updatedAt'] = (int) (microtime(true) * 1000);
                Cache::put($key, $job, now()->addHours(12));
            }
        }
    }
}
