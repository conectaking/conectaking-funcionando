<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Responses + dashboard do Formulário King (editor).
 */
class ProfileFormResponsesService
{
    /**
     * Exporta TODAS as respostas de um formulário como CSV.
     * Inclui: ID, data, nome, email, telefone e todos os campos personalizados.
     *
     * @return array{status:int, body:array<string,mixed>}
     */
    public function exportCsv(string $userId, string $itemId): array
    {
        $owned = $this->assertOwnedForm($userId, $itemId);
        if ($owned !== null) {
            return $owned;
        }
        $id = (int) $itemId;

        try {
            // Busca o título do formulário
            $formInfo = DB::selectOne(
                "SELECT COALESCE(dfi.form_title, pi.title, 'Formulário') AS title
                 FROM profile_items pi
                 LEFT JOIN digital_form_items dfi ON dfi.profile_item_id = pi.id
                 WHERE pi.id = ?
                 ORDER BY dfi.id DESC LIMIT 1",
                [$id]
            );
            $formTitle = preg_replace('/[^A-Za-z0-9\-_]/', '_', (string) ($formInfo->title ?? 'formulario'));

            // Busca todas as respostas (sem paginação para export)
            $rows = DB::select(
                'SELECT id, responder_name, responder_email, responder_phone,
                        submitted_at, response_data, entry_mode, payment_status
                 FROM digital_form_responses
                 WHERE profile_item_id = ?
                 ORDER BY submitted_at DESC',
                [$id]
            );

            // Descobre todos os campos únicos presentes nas respostas
            $allFields = [];
            $parsedRows = [];
            foreach ($rows as $row) {
                $r = (array) $row;
                $data = $r['response_data'] ?? null;
                if (is_string($data)) {
                    $parsed = json_decode($data, true);
                    $r['response_data'] = is_array($parsed) ? $parsed : [];
                } elseif (!is_array($r['response_data'])) {
                    $r['response_data'] = [];
                }
                foreach (array_keys($r['response_data']) as $k) {
                    $allFields[$k] = true;
                }
                $parsedRows[] = $r;
            }
            $dynamicFields = array_keys($allFields);

            // Monta o CSV em memória
            $output = fopen('php://temp', 'r+');

            // Cabeçalho
            $header = ['ID', 'Data/Hora', 'Nome', 'Email', 'Telefone', 'Modo', 'Status Pgto'];
            foreach ($dynamicFields as $f) {
                $header[] = $f;
            }
            fputcsv($output, $header);

            // Linhas
            foreach ($parsedRows as $r) {
                $line = [
                    $r['id'],
                    $r['submitted_at'],
                    $r['responder_name']  ?? '',
                    $r['responder_email'] ?? '',
                    $r['responder_phone'] ?? '',
                    $r['entry_mode']      ?? 'lead',
                    $r['payment_status']  ?? '',
                ];
                $rd = $r['response_data'];
                foreach ($dynamicFields as $f) {
                    $val = $rd[$f] ?? '';
                    if (is_array($val)) {
                        $val = implode(', ', array_map('strval', $val));
                    }
                    $line[] = (string) $val;
                }
                fputcsv($output, $line);
            }

            rewind($output);
            $csvContent = stream_get_contents($output);
            fclose($output);

            return [
                'status' => 200,
                'body'   => [
                    'csv'      => $csvContent,
                    'filename' => "king-forms_{$formTitle}_" . date('Y-m-d') . '.csv',
                    'count'    => count($parsedRows),
                ],
            ];
        } catch (\Throwable $e) {
            Log::error('profile.form.export_csv', ['error' => $e->getMessage()]);

            return ['status' => 500, 'body' => ['message' => 'Erro ao exportar respostas.', 'error' => $e->getMessage()]];
        }
    }

    /**
     * @return array{status:int, body:array<string, mixed>}
     */
    public function list(string $userId, string $itemId, ?string $mode = null, bool $checkoutOnly = false, int $limit = 100, int $offset = 0): array
    {
        $owned = $this->assertOwnedForm($userId, $itemId);
        if ($owned !== null) {
            return $owned;
        }
        $id = (int) $itemId;
        $listMode = strtolower((string) ($mode ?? ''));
        $limit = max(1, min(200, $limit));
        $offset = max(0, $offset);

        try {
            $where = ['profile_item_id = ?'];
            $vals = [$id];
            if ($checkoutOnly) {
                $where[] = 'payment_status IS NOT NULL';
            }
            if ($listMode === 'lead') {
                $where[] = "(COALESCE(entry_mode, CASE WHEN guest_id IS NOT NULL THEN 'checkin' ELSE 'lead' END) = 'lead')";
            } elseif ($listMode === 'checkin') {
                $where[] = "(COALESCE(entry_mode, CASE WHEN guest_id IS NOT NULL THEN 'checkin' ELSE 'lead' END) = 'checkin')";
            }

            $whereSql = implode(' AND ', $where);

            try {
                $total = (int) (DB::selectOne(
                    'SELECT COUNT(*)::int AS total FROM digital_form_responses WHERE '.$whereSql,
                    $vals
                )->total ?? 0);

                $rows = DB::select(
                    'SELECT id, response_data, responder_name, responder_email, responder_phone, submitted_at,
                            payment_status, paid_at, guest_id, entry_mode
                     FROM digital_form_responses
                     WHERE '.$whereSql.'
                     ORDER BY submitted_at DESC
                     LIMIT ? OFFSET ?',
                    array_merge($vals, [$limit, $offset])
                );
            } catch (\Throwable $e) {
                $fbWhere = ['profile_item_id = ?'];
                $fbVals = [$id];
                if ($checkoutOnly) {
                    $fbWhere[] = 'payment_status IS NOT NULL';
                }
                $total = (int) (DB::selectOne(
                    'SELECT COUNT(*)::int AS total FROM digital_form_responses WHERE '.implode(' AND ', $fbWhere),
                    $fbVals
                )->total ?? 0);
                $rows = DB::select(
                    'SELECT id, response_data, responder_name, responder_email, responder_phone, submitted_at,
                            payment_status, paid_at, guest_id
                     FROM digital_form_responses
                     WHERE '.implode(' AND ', $fbWhere).'
                     ORDER BY submitted_at DESC
                     LIMIT ? OFFSET ?',
                    array_merge($fbVals, [$limit, $offset])
                );
                if ($listMode === 'lead' || $listMode === 'checkin') {
                    $rows = array_values(array_filter($rows, static function ($row) use ($listMode) {
                        $isCheckin = !empty($row->guest_id);

                        return $listMode === 'checkin' ? $isCheckin : !$isCheckin;
                    }));
                    $total = count($rows);
                }
            }

            $responses = array_map(static function ($row) {
                $r = (array) $row;
                $data = $r['response_data'] ?? null;
                if (is_string($data)) {
                    $parsed = json_decode($data, true);
                    $r['response_data'] = is_array($parsed) ? $parsed : [];
                }

                return $r;
            }, $rows);

            return [
                'status' => 200,
                'body' => [
                    'responses' => $responses,
                    'total' => $total,
                    'limit' => $limit,
                    'offset' => $offset,
                    'hasMore' => ($offset + count($responses)) < $total,
                ],
            ];
        } catch (\Throwable $e) {
            Log::error('profile.form.responses', ['error' => $e->getMessage()]);

            return ['status' => 500, 'body' => ['message' => 'Erro ao buscar respostas.', 'error' => $e->getMessage()]];
        }
    }

    /**
     * @return array{status:int, body:array<string, mixed>}
     */
    public function deleteOne(string $userId, string $itemId, string $responseId): array
    {
        $owned = $this->assertOwnedForm($userId, $itemId);
        if ($owned !== null) {
            return $owned;
        }
        if (!ctype_digit($responseId) || (int) $responseId < 1) {
            return ['status' => 400, 'body' => ['message' => 'ID inválido.']];
        }
        $deleted = DB::delete(
            'DELETE FROM digital_form_responses WHERE id = ? AND profile_item_id = ?',
            [(int) $responseId, (int) $itemId]
        );
        if ($deleted < 1) {
            return ['status' => 404, 'body' => ['message' => 'Resposta não encontrada.']];
        }

        return ['status' => 200, 'body' => ['success' => true]];
    }

    /**
     * @param  list<mixed>  $responseIds
     * @return array{status:int, body:array<string, mixed>}
     */
    public function deleteBulk(string $userId, string $itemId, array $responseIds): array
    {
        $owned = $this->assertOwnedForm($userId, $itemId);
        if ($owned !== null) {
            return $owned;
        }
        $ids = [];
        foreach ($responseIds as $rid) {
            if (is_numeric($rid) && (int) $rid > 0) {
                $ids[] = (int) $rid;
            }
        }
        $ids = array_values(array_unique($ids));
        if ($ids === []) {
            return ['status' => 400, 'body' => ['message' => 'Informe ao menos um ID de resposta.']];
        }
        $ph = implode(',', array_fill(0, count($ids), '?'));
        $deleted = DB::delete(
            "DELETE FROM digital_form_responses WHERE profile_item_id = ? AND id IN ($ph)",
            array_merge([(int) $itemId], $ids)
        );

        return ['status' => 200, 'body' => ['success' => true, 'deleted' => $deleted]];
    }

    /**
     * @return array{status:int, body:array<string, mixed>}
     */
    public function dashboard(string $userId, string $itemId): array
    {
        $owned = $this->assertOwnedForm($userId, $itemId);
        if ($owned !== null) {
            return $owned;
        }
        $id = (int) $itemId;

        try {
            $total = (int) (DB::selectOne(
                'SELECT COUNT(*)::int AS total FROM digital_form_responses WHERE profile_item_id = ?',
                [$id]
            )->total ?? 0);
            $last7 = (int) (DB::selectOne(
                "SELECT COUNT(*)::int AS total FROM digital_form_responses
                 WHERE profile_item_id = ? AND submitted_at >= NOW() - INTERVAL '7 days'",
                [$id]
            )->total ?? 0);
            $last30 = (int) (DB::selectOne(
                "SELECT COUNT(*)::int AS total FROM digital_form_responses
                 WHERE profile_item_id = ? AND submitted_at >= NOW() - INTERVAL '30 days'",
                [$id]
            )->total ?? 0);
            $daily = DB::select(
                "SELECT DATE(submitted_at) AS date, COUNT(*)::int AS count
                 FROM digital_form_responses
                 WHERE profile_item_id = ? AND submitted_at >= NOW() - INTERVAL '30 days'
                 GROUP BY DATE(submitted_at) ORDER BY date ASC",
                [$id]
            );
            $hourly = DB::select(
                "SELECT EXTRACT(HOUR FROM submitted_at)::int AS hour, COUNT(*)::int AS count
                 FROM digital_form_responses
                 WHERE profile_item_id = ? AND submitted_at >= NOW() - INTERVAL '24 hours'
                 GROUP BY EXTRACT(HOUR FROM submitted_at) ORDER BY hour ASC",
                [$id]
            );

            $analyticsRaw = [];
            try {
                $analyticsRaw = DB::select(
                    'SELECT event_type, COUNT(*)::int AS count
                     FROM digital_form_analytics WHERE profile_item_id = ?
                     GROUP BY event_type',
                    [$id]
                );
            } catch (\Throwable $e) {
                // tabela pode não existir em ambientes antigos
            }
            $analytics = [];
            foreach ($analyticsRaw as $row) {
                $analytics[(string) $row->event_type] = (int) $row->count;
            }

            $contact = DB::selectOne(
                'SELECT
                    COUNT(*) FILTER (WHERE responder_email IS NOT NULL)::int AS with_email,
                    COUNT(*) FILTER (WHERE responder_phone IS NOT NULL)::int AS with_phone,
                    COUNT(*) FILTER (WHERE responder_name IS NOT NULL)::int AS with_name
                 FROM digital_form_responses WHERE profile_item_id = ?',
                [$id]
            );

            $views = $analytics['view'] ?? 0;
            $starts = $analytics['start'] ?? 0;
            $conversion = $views > 0 ? round((($analytics['submit'] ?? 0) / $views) * 100, 2) : 0.0;
            $abandon = $starts > 0 ? round((($analytics['abandon'] ?? 0) / $starts) * 100, 2) : 0.0;

            return [
                'status' => 200,
                'body' => [
                    'total_responses' => $total,
                    'last_7_days' => $last7,
                    'last_30_days' => $last30,
                    'daily_data' => array_map(static fn ($r) => [
                        'date' => $r->date,
                        'count' => (int) $r->count,
                    ], $daily),
                    'hourly_data' => array_map(static fn ($r) => [
                        'hour' => (int) $r->hour,
                        'count' => (int) $r->count,
                    ], $hourly),
                    'analytics' => [
                        'views' => $analytics['view'] ?? 0,
                        'clicks' => $analytics['click'] ?? 0,
                        'submits' => $analytics['submit'] ?? 0,
                        'starts' => $analytics['start'] ?? 0,
                        'abandons' => $analytics['abandon'] ?? 0,
                    ],
                    'metrics' => [
                        'conversion_rate' => $conversion,
                        'abandonment_rate' => $abandon,
                        'with_email' => (int) ($contact->with_email ?? 0),
                        'with_phone' => (int) ($contact->with_phone ?? 0),
                        'with_name' => (int) ($contact->with_name ?? 0),
                    ],
                ],
            ];
        } catch (\Throwable $e) {
            Log::error('profile.form.dashboard', ['error' => $e->getMessage()]);

            return ['status' => 500, 'body' => ['message' => 'Erro ao buscar dashboard.', 'error' => $e->getMessage()]];
        }
    }

    /**
     * @return array{status:int, body:array<string, mixed>}|null
     */
    private function assertOwnedForm(string $userId, string $itemId): ?array
    {
        if (!ctype_digit($itemId) || (int) $itemId < 1) {
            return ['status' => 400, 'body' => ['message' => 'ID do formulário inválido.']];
        }
        $row = DB::selectOne(
            'SELECT id FROM profile_items WHERE id = ? AND user_id = ? AND item_type = ? LIMIT 1',
            [(int) $itemId, $userId, 'digital_form']
        );
        if (!$row) {
            return ['status' => 404, 'body' => ['message' => 'Formulário não encontrado ou você não tem permissão.']];
        }

        return null;
    }
}
