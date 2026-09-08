<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BibleProsperidadeAdminService
{
    private const FIELDS = [
        'titulo', 'decreto_entrada', 'fundamento_sagrado', 'diagnostico_escassez',
        'estrada_com_king', 'diretriz_ilustracao', 'mentalidade_travada', 'nova_mentalidade',
        'exercicio_fixacao', 'ie_chave', 'treino_negocios', 'treino_altar',
        'sentenca_ativacao', 'proximo_episodio', 'proverbs_ref', 'storytelling_fase',
        'content_source', 'published',
    ];

    public function __construct(
        private readonly BibleProsperidadeService $public,
        private readonly BibleProsperidadeAiService $ai,
        private readonly BibleProsperidadeParseService $parse,
    ) {
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function listAll(): array
    {
        $rows = DB::select('SELECT * FROM bible_prosperidade_ativacoes ORDER BY activation_number ASC');

        return array_map(fn ($r) => $this->summary((array) $r), $rows);
    }

    /**
     * @return array<string,mixed>
     */
    public function get(int $n): array
    {
        $num = $this->public->clampActivation($n);
        if ($num === null) {
            throw new \InvalidArgumentException('Ativação deve ser entre 1 e 31.');
        }
        $row = DB::selectOne('SELECT * FROM bible_prosperidade_ativacoes WHERE activation_number = ? LIMIT 1', [$num]);
        if (!$row) {
            throw new \RuntimeException('Ativação não encontrada.');
        }
        $dto = $this->rowToDto((array) $row);
        $dto['status'] = $this->computeStatus((array) $row);
        $dto['storytelling'] = $this->ai->getPhaseInfo($num);
        $this->attachPublishHints($dto, (array) $row);

        return $dto;
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array<string,mixed>
     */
    public function save(int $n, array $body, string $mergeSource = 'manual'): array
    {
        $num = $this->public->clampActivation($n);
        if ($num === null) {
            throw new \InvalidArgumentException('Ativação deve ser entre 1 e 31.');
        }
        $existing = DB::selectOne('SELECT * FROM bible_prosperidade_ativacoes WHERE activation_number = ? LIMIT 1', [$num]);
        $existingArr = $existing ? (array) $existing : [];

        $payload = [];
        foreach (self::FIELDS as $field) {
            if (!array_key_exists($field, $body)) {
                continue;
            }
            $val = $body[$field];
            if ($field === 'published') {
                $payload[$field] = (bool) $val;
                continue;
            }
            if ($field === 'storytelling_fase') {
                $payload[$field] = is_numeric($val) ? (int) $val : $num;
                continue;
            }
            if (is_string($val)) {
                $val = trim($val);
                if ($val === '' && !empty(trim((string) ($existingArr[$field] ?? '')))) {
                    $payload[$field] = $existingArr[$field];
                    continue;
                }
            }
            $payload[$field] = $val;
        }

        if (empty(trim((string) ($payload['titulo'] ?? '')))) {
            $phase = $this->ai->getPhaseInfo($num);
            if ($phase['titulo'] !== '') {
                $payload['titulo'] = $phase['titulo'];
            }
        }
        if (empty(trim((string) ($payload['decreto_entrada'] ?? '')))
            && !empty(trim((string) ($payload['sentenca_ativacao'] ?? '')))) {
            $payload['decreto_entrada'] = explode("\n", (string) $payload['sentenca_ativacao'])[0];
        }

        $prevSource = (string) ($existingArr['content_source'] ?? '');
        if ($prevSource === 'ai' && $mergeSource === 'manual') {
            $payload['content_source'] = 'mixed';
        } elseif (empty($payload['content_source'])) {
            $payload['content_source'] = $mergeSource;
        }
        if (empty($payload['proverbs_ref'])) {
            $payload['proverbs_ref'] = 'Provérbios '.$num;
        }
        if (empty($payload['storytelling_fase'])) {
            $payload['storytelling_fase'] = $num;
        }

        $row = $this->update($num, $payload);
        if (!$row) {
            throw new \RuntimeException('Ativação não encontrada na base.');
        }
        $dto = $this->rowToDto($row);
        $dto['status'] = $this->computeStatus($row);
        $this->attachPublishHints($dto, $row);

        return $dto;
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array<string,mixed>
     */
    public function publish(int $n, bool $published, array $body = []): array
    {
        $num = $this->public->clampActivation($n);
        if ($num === null) {
            throw new \InvalidArgumentException('Ativação deve ser entre 1 e 31.');
        }
        if ($published) {
            $contentKeys = array_intersect_key($body, array_flip(self::FIELDS));
            if ($contentKeys !== []) {
                $this->save($num, $contentKeys, 'manual');
            }
            $row = DB::selectOne('SELECT * FROM bible_prosperidade_ativacoes WHERE activation_number = ? LIMIT 1', [$num]);
            $missing = $this->missingForPublish($row ? (array) $row : []);
            if ($missing !== []) {
                throw new \RuntimeException('Para publicar, falta: '.implode(', ', $missing).'.');
            }
        }
        $row = $this->update($num, ['published' => $published]);
        if (!$row) {
            throw new \RuntimeException('Ativação não encontrada na base.');
        }
        $dto = $this->rowToDto($row);
        $dto['status'] = $this->computeStatus($row);
        $this->attachPublishHints($dto, $row);

        return $dto;
    }

    /**
     * @return array{error?:string,data?:array<string,mixed>,tokens?:array{total:int}}
     */
    public function generateAi(int $n): array
    {
        $num = $this->public->clampActivation($n);
        if ($num === null) {
            return ['error' => 'Ativação inválida.'];
        }

        return $this->ai->generateActivation($num);
    }

    /**
     * @return array{ok?:bool,partial?:bool,sections?:array<string,string>,activation_number?:int,warning?:string,error?:string}
     */
    public function parsePaste(int $n, string $text): array
    {
        $parsed = $this->parse->parsePastedActivation($text);
        if (!empty($parsed['error'])) {
            return $parsed;
        }
        $num = $this->public->clampActivation($n);
        if ($num === null) {
            return ['error' => 'Ativação inválida.'];
        }

        return [
            'ok' => true,
            'partial' => !empty($parsed['partial']),
            'sections' => $parsed['sections'] ?? [],
            'activation_number' => $num,
            'warning' => $parsed['warning'] ?? null,
        ];
    }

    /**
     * Lote síncrono (máx. 15).
     *
     * @param  array{delayMs?:int}  $options
     * @return array{results:list<array<string,mixed>>,tokensTotal:int}
     */
    public function generateRangeAndSave(int $start, int $end, array $options = []): array
    {
        if ($start < 1 || $end > 31 || $start > $end) {
            throw new \InvalidArgumentException('Intervalo inválido (1–31).');
        }
        if (($end - $start + 1) > 15) {
            throw new \InvalidArgumentException('Máximo 15 Ativações por lote síncrono. Use async: true ou divida o intervalo.');
        }
        $delayMs = max(0, (int) ($options['delayMs'] ?? 800));
        $results = [];
        $tokensTotal = 0;
        for ($n = $start; $n <= $end; $n++) {
            $gen = $this->generateAi($n);
            if (!empty($gen['error'])) {
                $results[] = ['activation_number' => $n, 'ok' => false, 'error' => $gen['error']];
                continue;
            }
            $data = array_merge($gen['data'] ?? [], ['content_source' => 'ai']);
            $this->update($n, $data);
            $tok = (int) ($gen['tokens']['total'] ?? 0);
            $tokensTotal += $tok;
            $results[] = ['activation_number' => $n, 'ok' => true, 'tokens' => $gen['tokens'] ?? null];
            if ($delayMs > 0 && $n < $end) {
                usleep($delayMs * 1000);
            }
        }

        return ['results' => $results, 'tokensTotal' => $tokensTotal];
    }

    /**
     * @param  array{delayMs?:int}  $options
     * @return array{ok:bool,jobId:string,total:int}
     */
    public function startRangeBackgroundJob(int $start, int $end, array $options = []): array
    {
        if ($start < 1 || $end > 31 || $start > $end) {
            throw new \InvalidArgumentException('Intervalo inválido (1–31).');
        }
        if (($end - $start + 1) > 15) {
            throw new \InvalidArgumentException('Máximo 15 Ativações por lote. Divida em intervalos menores.');
        }
        $jobId = (string) \Illuminate\Support\Str::uuid();
        $total = $end - $start + 1;
        $job = [
            'id' => $jobId,
            'status' => 'running',
            'start' => $start,
            'end' => $end,
            'current' => $start,
            'done' => 0,
            'total' => $total,
            'errors' => [],
            'tokensTotal' => 0,
            'cancelRequested' => false,
            'startedAt' => (int) (microtime(true) * 1000),
            'delayMs' => max(0, (int) ($options['delayMs'] ?? 800)),
        ];
        \Illuminate\Support\Facades\Cache::put($this->jobCacheKey($jobId), $job, now()->addHours(6));

        $jobIdCopy = $jobId;
        dispatch(static function () use ($jobIdCopy) {
            app(self::class)->runRangeJob($jobIdCopy);
        })->afterResponse();

        return ['ok' => true, 'jobId' => $jobId, 'total' => $total];
    }

    public function runRangeJob(string $jobId): void
    {
        $this->executeRangeJob($jobId);
    }

    /**
     * @return array<string,mixed>|null
     */
    public function getGenerationJob(string $jobId): ?array
    {
        $job = \Illuminate\Support\Facades\Cache::get($this->jobCacheKey($jobId));
        if (!is_array($job)) {
            return null;
        }
        $elapsed = (int) (microtime(true) * 1000) - (int) ($job['startedAt'] ?? 0);
        $done = (int) ($job['done'] ?? 0);
        $total = (int) ($job['total'] ?? 0);
        $etaMs = $done > 0 ? (int) round(($elapsed / $done) * ($total - $done)) : null;

        return [
            'id' => $job['id'] ?? $jobId,
            'status' => $job['status'] ?? 'unknown',
            'start' => $job['start'] ?? null,
            'end' => $job['end'] ?? null,
            'current' => $job['current'] ?? null,
            'done' => $done,
            'total' => $total,
            'errors' => $job['errors'] ?? [],
            'tokensTotal' => $job['tokensTotal'] ?? 0,
            'etaMs' => $etaMs,
            'cancelRequested' => !empty($job['cancelRequested']),
        ];
    }

    /**
     * @return array{ok:bool,message:string}
     */
    public function cancelGenerationJob(string $jobId): array
    {
        $key = $this->jobCacheKey($jobId);
        $job = \Illuminate\Support\Facades\Cache::get($key);
        if (!is_array($job)) {
            return ['ok' => false, 'message' => 'Job não encontrado.'];
        }
        $job['cancelRequested'] = true;
        \Illuminate\Support\Facades\Cache::put($key, $job, now()->addHours(6));

        return ['ok' => true, 'message' => 'Cancelamento solicitado.'];
    }

    private function jobCacheKey(string $jobId): string
    {
        return 'prosperidade_gen_job:'.$jobId;
    }

    private function executeRangeJob(string $jobId): void
    {
        $key = $this->jobCacheKey($jobId);
        $job = \Illuminate\Support\Facades\Cache::get($key);
        if (!is_array($job)) {
            return;
        }
        $delayMs = max(0, (int) ($job['delayMs'] ?? 800));
        $start = (int) $job['start'];
        $end = (int) $job['end'];

        for ($n = $start; $n <= $end; $n++) {
            $job = \Illuminate\Support\Facades\Cache::get($key);
            if (!is_array($job)) {
                return;
            }
            if (!empty($job['cancelRequested'])) {
                $job['status'] = 'cancelled';
                $job['finishedAt'] = (int) (microtime(true) * 1000);
                \Illuminate\Support\Facades\Cache::put($key, $job, now()->addHours(6));

                return;
            }
            $job['current'] = $n;
            try {
                $gen = $this->generateAi($n);
                if (!empty($gen['error'])) {
                    $job['errors'][] = ['activation_number' => $n, 'error' => $gen['error']];
                } else {
                    $this->update($n, array_merge($gen['data'] ?? [], ['content_source' => 'ai']));
                    $job['tokensTotal'] = (int) ($job['tokensTotal'] ?? 0) + (int) ($gen['tokens']['total'] ?? 0);
                }
            } catch (\Throwable $e) {
                Log::error('prosperidade range job', ['n' => $n, 'error' => $e->getMessage()]);
                $job['errors'][] = ['activation_number' => $n, 'error' => $e->getMessage()];
            }
            $job['done'] = (int) ($job['done'] ?? 0) + 1;
            \Illuminate\Support\Facades\Cache::put($key, $job, now()->addHours(6));
            if ($n < $end && $delayMs > 0) {
                usleep($delayMs * 1000);
            }
        }

        $job = \Illuminate\Support\Facades\Cache::get($key);
        if (!is_array($job)) {
            return;
        }
        $errCount = count($job['errors'] ?? []);
        $total = (int) ($job['total'] ?? 0);
        if ($errCount === $total) {
            $job['status'] = 'failed';
        } elseif ($errCount > 0) {
            $job['status'] = 'partial';
        } else {
            $job['status'] = 'done';
        }
        $job['finishedAt'] = (int) (microtime(true) * 1000);
        \Illuminate\Support\Facades\Cache::put($key, $job, now()->addHours(6));
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function exportAll(): array
    {
        $rows = DB::select('SELECT * FROM bible_prosperidade_ativacoes ORDER BY activation_number ASC');

        return array_map(fn ($r) => $this->rowToDto((array) $r), $rows);
    }

    /**
     * @param  mixed  $items
     * @return array{imported:int}
     */
    public function importAll(mixed $items): array
    {
        if (!is_array($items)) {
            throw new \InvalidArgumentException('JSON deve ser um array de Ativações.');
        }
        $count = 0;
        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }
            $n = (int) ($item['activation_number'] ?? 0);
            if ($n < 1 || $n > 31) {
                continue;
            }
            $payload = [];
            foreach (self::FIELDS as $field) {
                if (array_key_exists($field, $item)) {
                    $payload[$field] = $item[$field];
                }
            }
            $this->update($n, $payload);
            $count++;
        }

        return ['imported' => $count];
    }

    /**
     * @return array{phases:list<array<string,mixed>>}
     */
    public function storytellingMap(): array
    {
        return $this->ai->loadStorytellingMap();
    }

    /**
     * @param  array<string,mixed>  $data
     * @return array<string,mixed>|null
     */
    private function update(int $n, array $data): ?array
    {
        $sets = [];
        $bindings = [];
        foreach (self::FIELDS as $field) {
            if (!array_key_exists($field, $data)) {
                continue;
            }
            $val = $data[$field];
            if ($field === 'published') {
                $val = (bool) $val;
            }
            if ($field === 'storytelling_fase' && $val !== null) {
                $val = (int) $val;
            }
            $sets[] = "{$field} = ?";
            $bindings[] = $val;
        }
        if ($sets === []) {
            $row = DB::selectOne('SELECT * FROM bible_prosperidade_ativacoes WHERE activation_number = ? LIMIT 1', [$n]);

            return $row ? (array) $row : null;
        }
        $sets[] = 'updated_at = NOW()';
        $bindings[] = $n;
        try {
            DB::update(
                'UPDATE bible_prosperidade_ativacoes SET '.implode(', ', $sets).' WHERE activation_number = ?',
                $bindings
            );
        } catch (\Throwable $e) {
            Log::error('prosperidade.admin.update', ['error' => $e->getMessage()]);
            throw $e;
        }
        $row = DB::selectOne('SELECT * FROM bible_prosperidade_ativacoes WHERE activation_number = ? LIMIT 1', [$n]);

        return $row ? (array) $row : null;
    }

    /**
     * @param  array<string,mixed>  $row
     * @return array<string,mixed>
     */
    private function rowToDto(array $row): array
    {
        $n = (int) ($row['activation_number'] ?? 0);

        return [
            'activation_number' => $n,
            'titulo' => (string) ($row['titulo'] ?? ''),
            'decreto_entrada' => (string) ($row['decreto_entrada'] ?? ''),
            'fundamento_sagrado' => (string) ($row['fundamento_sagrado'] ?? ''),
            'diagnostico_escassez' => (string) ($row['diagnostico_escassez'] ?? ''),
            'estrada_com_king' => (string) ($row['estrada_com_king'] ?? ''),
            'diretriz_ilustracao' => (string) ($row['diretriz_ilustracao'] ?? ''),
            'mentalidade_travada' => (string) ($row['mentalidade_travada'] ?? ''),
            'nova_mentalidade' => (string) ($row['nova_mentalidade'] ?? ''),
            'exercicio_fixacao' => (string) ($row['exercicio_fixacao'] ?? ''),
            'ie_chave' => (string) ($row['ie_chave'] ?? ''),
            'treino_negocios' => (string) ($row['treino_negocios'] ?? ''),
            'treino_altar' => (string) ($row['treino_altar'] ?? ''),
            'sentenca_ativacao' => (string) ($row['sentenca_ativacao'] ?? ''),
            'proximo_episodio' => (string) ($row['proximo_episodio'] ?? ''),
            'proverbs_ref' => (string) ($row['proverbs_ref'] ?? ('Provérbios '.$n)),
            'storytelling_fase' => (int) ($row['storytelling_fase'] ?? $n),
            'content_source' => (string) ($row['content_source'] ?? 'manual'),
            'published' => !empty($row['published']),
            'updated_at' => $row['updated_at'] ?? null,
        ];
    }

    /**
     * @param  array<string,mixed>  $row
     * @return array<string,mixed>
     */
    private function summary(array $row): array
    {
        $n = (int) ($row['activation_number'] ?? 0);
        $titulo = trim((string) ($row['titulo'] ?? ''));

        return [
            'activation_number' => $n,
            'titulo' => $titulo !== '' ? $titulo : ('Ativação '.$n),
            'proverbs_ref' => (string) ($row['proverbs_ref'] ?? ('Provérbios '.$n)),
            'published' => !empty($row['published']),
            'content_source' => (string) ($row['content_source'] ?? 'manual'),
            'status' => $this->computeStatus($row),
            'updated_at' => $row['updated_at'] ?? null,
        ];
    }

    /**
     * @param  array<string,mixed>  $row
     */
    private function computeStatus(array $row): string
    {
        if (!empty($row['published'])) {
            return 'publicado';
        }
        $keys = array_diff(self::FIELDS, ['published', 'content_source', 'storytelling_fase']);
        foreach ($keys as $k) {
            if (trim((string) ($row[$k] ?? '')) !== '') {
                return 'rascunho';
            }
        }

        return 'vazio';
    }

    /**
     * @param  array<string,mixed>  $row
     * @return list<string>
     */
    private function missingForPublish(array $row): array
    {
        $labels = [
            'titulo' => 'Título',
            'decreto_entrada' => 'Decreto de entrada',
            'fundamento_sagrado' => 'Fundamento sagrado',
            'sentenca_ativacao' => 'Sentença de ativação',
        ];
        $missing = [];
        foreach ($labels as $k => $label) {
            if (trim((string) ($row[$k] ?? '')) === '') {
                $missing[] = $label;
            }
        }

        return $missing;
    }

    /**
     * @param  array<string,mixed>  $dto
     * @param  array<string,mixed>  $row
     */
    private function attachPublishHints(array &$dto, array $row): void
    {
        $missing = $this->missingForPublish($row);
        $dto['missing_for_publish'] = $missing;
        $dto['can_publish'] = $missing === [];
    }
}
