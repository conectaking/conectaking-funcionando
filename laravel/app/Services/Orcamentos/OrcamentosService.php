<?php

namespace App\Services\Orcamentos;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Leads de orçamento (modules/orcamentos). A captação pública foi desativada no Node;
 * só restam leitura, mudança de status e exclusão.
 */
class OrcamentosService
{
    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function list(string $userId, ?string $ticket, ?string $status): array
    {
        if (! Schema::hasTable('orcamento_leads')) {
            return $this->ok(['leads' => []]);
        }

        $sql = 'SELECT * FROM orcamento_leads WHERE user_id = ?';
        $params = [$userId];
        if ($ticket !== null && $ticket !== '') {
            $sql .= ' AND ticket = ?';
            $params[] = $ticket;
        }
        if ($status !== null && $status !== '') {
            $sql .= ' AND status = ?';
            $params[] = $status;
        }
        $sql .= ' ORDER BY created_at DESC';

        $leads = array_map(fn ($row): array => $this->hydrate((array) $row), DB::select($sql, $params));

        return $this->ok(['leads' => $leads]);
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function getOne(int $id, string $userId): array
    {
        $lead = $this->find($id, $userId);
        if ($lead === null) {
            return $this->err('Orçamento não encontrado', 404);
        }

        return $this->ok($lead);
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function updateStatus(int $id, string $userId, string $status): array
    {
        if (! Schema::hasTable('orcamento_leads')) {
            return $this->err('Orçamento não encontrado', 404);
        }

        $row = DB::selectOne(
            'UPDATE orcamento_leads SET status = ?, updated_at = NOW()
             WHERE id = ? AND user_id = ? RETURNING *',
            [$status, $id, $userId]
        );
        if (! $row) {
            return $this->err('Orçamento não encontrado', 404);
        }

        return $this->ok($this->hydrate((array) $row), 'Status atualizado.');
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function remove(int $id, string $userId): array
    {
        if (! Schema::hasTable('orcamento_leads')) {
            return $this->err('Orçamento não encontrado', 404);
        }

        $row = DB::selectOne(
            'DELETE FROM orcamento_leads WHERE id = ? AND user_id = ? RETURNING id',
            [$id, $userId]
        );
        if (! $row) {
            return $this->err('Orçamento não encontrado', 404);
        }

        return $this->ok(['id' => $row->id], 'Orçamento excluído.');
    }

    /**
     * @return array<string,mixed>|null
     */
    private function find(int $id, string $userId): ?array
    {
        if (! Schema::hasTable('orcamento_leads')) {
            return null;
        }

        $row = DB::selectOne('SELECT * FROM orcamento_leads WHERE id = ? AND user_id = ?', [$id, $userId]);

        return $row ? $this->hydrate((array) $row) : null;
    }

    /**
     * @param  array<string,mixed>  $lead
     * @return array<string,mixed>
     */
    private function hydrate(array $lead): array
    {
        $respostas = $lead['respostas'] ?? null;
        if (is_string($respostas)) {
            $decoded = json_decode($respostas, true);
            $lead['respostas'] = json_last_error() === JSON_ERROR_NONE ? $decoded : $respostas;
        }

        return $lead;
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    private function ok(mixed $data, ?string $message = null): array
    {
        $body = [
            'success' => true,
            'data' => $data,
            'error' => null,
        ];
        if ($message !== null) {
            $body['message'] = $message;
        }

        return ['status' => 200, 'body' => $body];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    private function err(string $message, int $status): array
    {
        return ['status' => $status, 'body' => [
            'success' => false,
            'data' => null,
            'message' => $message,
            'error' => ['code' => 'ERROR', 'message' => $message],
        ]];
    }
}
