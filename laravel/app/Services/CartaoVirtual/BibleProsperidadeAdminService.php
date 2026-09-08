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
