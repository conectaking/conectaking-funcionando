<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\DB;

/**
 * Ativações públicas "Prosperidade antes de dormir" (bible_prosperidade_ativacoes).
 */
class BibleProsperidadeService
{
    public function clampActivation(mixed $n): ?int
    {
        $x = (int) $n;
        if ($x < 1 || $x > 31) {
            return null;
        }

        return $x;
    }

    public function activationForToday(?\DateTimeInterface $date = null): int
    {
        $dt = $date instanceof \DateTimeInterface
            ? \DateTimeImmutable::createFromInterface($date)
            : new \DateTimeImmutable('now', new \DateTimeZone('America/Sao_Paulo'));

        return min(31, max(1, (int) $dt->format('j')));
    }

    /**
     * @return array{ok:bool, code?:int, error?:string, data?:array, notPublished?:bool, activation_number?:int, message?:string, nearest_published?:?array}
     */
    public function getAtivacaoPublic(mixed $n): array
    {
        $num = $this->clampActivation($n);
        if ($num === null) {
            return ['ok' => false, 'code' => 400, 'error' => 'Ativação deve ser entre 1 e 31.'];
        }
        $dto = $this->getPublishedByNumber($num);
        if ($dto) {
            return ['ok' => true, 'data' => $dto];
        }
        $nearest = $this->getNearestPublished($num, 'prev')
            ?? $this->getNearestPublished($num, 'next');

        return [
            'ok' => false,
            'notPublished' => true,
            'activation_number' => $num,
            'message' => 'Esta Ativação ainda não foi publicada.',
            'nearest_published' => $nearest,
        ];
    }

    /**
     * @return array{ok:bool, code?:int, error?:string, data?:array, notPublished?:bool, activation_number:int, calendar_day:int, message?:string, nearest_published?:?array}
     */
    public function getHoje(mixed $queryDay = null): array
    {
        if ($queryDay !== null && $queryDay !== '') {
            $n = $this->clampActivation($queryDay);
        } else {
            $n = $this->activationForToday();
        }
        if ($n === null) {
            return [
                'ok' => false,
                'code' => 400,
                'error' => 'Dia inválido.',
                'activation_number' => 0,
                'calendar_day' => 0,
            ];
        }
        $result = $this->getAtivacaoPublic($n);

        return array_merge($result, [
            'calendar_day' => $n,
            'activation_number' => $n,
        ]);
    }

    /**
     * @return list<array{activation_number:int,titulo:string,proverbs_ref:string,published:bool}>
     */
    public function getList(): array
    {
        try {
            $rows = DB::select(
                'SELECT activation_number, titulo, proverbs_ref, published
                 FROM bible_prosperidade_ativacoes ORDER BY activation_number ASC'
            );
        } catch (\Throwable) {
            return [];
        }

        return array_map(function ($row) {
            $n = (int) $row->activation_number;
            $titulo = trim((string) ($row->titulo ?? ''));

            return [
                'activation_number' => $n,
                'titulo' => $titulo !== '' ? $titulo : ('Ativação '.$n),
                'proverbs_ref' => (string) ($row->proverbs_ref ?? ('Provérbios '.$n)),
                'published' => (bool) $row->published,
            ];
        }, $rows);
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getNearestPublishedAny(mixed $n): ?array
    {
        $num = $this->clampActivation($n);
        if ($num === null) {
            return null;
        }

        return $this->getNearestPublished($num, 'prev')
            ?? $this->getNearestPublished($num, 'next');
    }

    /**
     * @return array{activation_number:int, read:bool}
     */
    public function markRead(?string $userId, ?string $visitorId, mixed $activationNumber, ?string $slug = null): array
    {
        $n = $this->clampActivation($activationNumber);
        if ($n === null) {
            throw new \InvalidArgumentException('activation_number deve ser entre 1 e 31.');
        }
        if ($userId) {
            $ex = DB::selectOne(
                'SELECT id FROM bible_prosperidade_reads WHERE user_id = ? AND activation_number = ?',
                [$userId, $n]
            );
            if ($ex) {
                DB::update(
                    'UPDATE bible_prosperidade_reads SET read_at = NOW() WHERE user_id = ? AND activation_number = ?',
                    [$userId, $n]
                );
            } else {
                DB::insert(
                    'INSERT INTO bible_prosperidade_reads (user_id, activation_number, slug) VALUES (?, ?, ?)',
                    [$userId, $n, $slug]
                );
            }
        } elseif ($visitorId) {
            $ex = DB::selectOne(
                'SELECT id FROM bible_prosperidade_reads WHERE visitor_id = ? AND activation_number = ?',
                [$visitorId, $n]
            );
            if ($ex) {
                DB::update(
                    'UPDATE bible_prosperidade_reads SET read_at = NOW() WHERE visitor_id = ? AND activation_number = ?',
                    [$visitorId, $n]
                );
            } else {
                DB::insert(
                    'INSERT INTO bible_prosperidade_reads (visitor_id, activation_number, slug) VALUES (?, ?, ?)',
                    [$visitorId, $n, $slug]
                );
            }
        } else {
            throw new \InvalidArgumentException('user_id ou visitor_id obrigatório.');
        }

        return ['activation_number' => $n, 'read' => true];
    }

    /**
     * @return list<array{activation_number:int, read_at:mixed}>
     */
    public function getReadStatus(?string $userId, ?string $visitorId, mixed $numbers = null): array
    {
        $nums = null;
        if ($numbers !== null && $numbers !== '') {
            $arr = array_values(array_filter(
                array_map(static fn ($x) => (int) trim((string) $x), explode(',', (string) $numbers)),
                static fn ($x) => $x >= 1 && $x <= 31
            ));
            if ($arr !== []) {
                $nums = $arr;
            }
        }

        try {
            if ($userId) {
                if ($nums) {
                    $placeholders = implode(',', array_fill(0, count($nums), '?'));
                    $rows = DB::select(
                        "SELECT activation_number, read_at FROM bible_prosperidade_reads
                         WHERE user_id = ? AND activation_number IN ({$placeholders})",
                        array_merge([$userId], $nums)
                    );
                } else {
                    $rows = DB::select(
                        'SELECT activation_number, read_at FROM bible_prosperidade_reads WHERE user_id = ?',
                        [$userId]
                    );
                }
            } elseif ($visitorId) {
                if ($nums) {
                    $placeholders = implode(',', array_fill(0, count($nums), '?'));
                    $rows = DB::select(
                        "SELECT activation_number, read_at FROM bible_prosperidade_reads
                         WHERE visitor_id = ? AND activation_number IN ({$placeholders})",
                        array_merge([$visitorId], $nums)
                    );
                } else {
                    $rows = DB::select(
                        'SELECT activation_number, read_at FROM bible_prosperidade_reads WHERE visitor_id = ?',
                        [$visitorId]
                    );
                }
            } else {
                return [];
            }
        } catch (\Throwable) {
            return [];
        }

        return array_map(static fn ($r) => [
            'activation_number' => (int) $r->activation_number,
            'read_at' => $r->read_at,
        ], $rows);
    }

    /**
     * @return array<string, mixed>|null
     */
    private function getPublishedByNumber(int $n): ?array
    {
        try {
            $row = DB::selectOne(
                'SELECT * FROM bible_prosperidade_ativacoes WHERE activation_number = ? AND published = TRUE',
                [$n]
            );
        } catch (\Throwable) {
            return null;
        }

        return $row ? $this->rowToDto($row) : null;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function getNearestPublished(int $n, string $direction): ?array
    {
        $op = $direction === 'prev' ? '<' : '>';
        $dir = $direction === 'prev' ? 'DESC' : 'ASC';
        try {
            $row = DB::selectOne(
                "SELECT * FROM bible_prosperidade_ativacoes
                 WHERE published = TRUE AND activation_number {$op} ?
                 ORDER BY activation_number {$dir} LIMIT 1",
                [$n]
            );
        } catch (\Throwable) {
            return null;
        }

        return $row ? $this->rowToDto($row) : null;
    }

    /**
     * @param  object  $row
     * @return array<string, mixed>
     */
    private function rowToDto(object $row): array
    {
        $n = (int) $row->activation_number;
        $out = [
            'activation_number' => $n,
            'titulo' => (string) ($row->titulo ?? ''),
            'decreto_entrada' => (string) ($row->decreto_entrada ?? ''),
            'fundamento_sagrado' => (string) ($row->fundamento_sagrado ?? ''),
            'diagnostico_escassez' => (string) ($row->diagnostico_escassez ?? ''),
            'estrada_com_king' => (string) ($row->estrada_com_king ?? ''),
            'diretriz_ilustracao' => (string) ($row->diretriz_ilustracao ?? ''),
            'mentalidade_travada' => (string) ($row->mentalidade_travada ?? ''),
            'nova_mentalidade' => (string) ($row->nova_mentalidade ?? ''),
            'exercicio_fixacao' => (string) ($row->exercicio_fixacao ?? ''),
            'ie_chave' => (string) ($row->ie_chave ?? ''),
            'treino_negocios' => (string) ($row->treino_negocios ?? ''),
            'treino_altar' => (string) ($row->treino_altar ?? ''),
            'sentenca_ativacao' => (string) ($row->sentenca_ativacao ?? ''),
            'proximo_episodio' => (string) ($row->proximo_episodio ?? ''),
            'proverbs_ref' => (string) ($row->proverbs_ref ?? ('Provérbios '.$n)),
            'storytelling_fase' => $row->storytelling_fase ?? $n,
            'content_source' => (string) ($row->content_source ?? 'manual'),
            'published' => (bool) ($row->published ?? false),
            'updated_at' => $row->updated_at ?? null,
        ];

        return $out;
    }
}
