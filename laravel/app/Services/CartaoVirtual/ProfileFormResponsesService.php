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
     * @return array{status:int, body:array<string, mixed>}
     */
    public function list(string $userId, string $itemId, ?string $mode = null, bool $checkoutOnly = false): array
    {
        $owned = $this->assertOwnedForm($userId, $itemId);
        if ($owned !== null) {
            return $owned;
        }
        $id = (int) $itemId;
        $listMode = strtolower((string) ($mode ?? ''));

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

            try {
                $rows = DB::select(
                    'SELECT id, response_data, responder_name, responder_email, responder_phone, submitted_at,
                            payment_status, paid_at, guest_id, entry_mode
                     FROM digital_form_responses
                     WHERE '.implode(' AND ', $where).'
                     ORDER BY submitted_at DESC',
                    $vals
                );
            } catch (\Throwable $e) {
                $fbWhere = ['profile_item_id = ?'];
                $fbVals = [$id];
                if ($checkoutOnly) {
                    $fbWhere[] = 'payment_status IS NOT NULL';
                }
                $rows = DB::select(
                    'SELECT id, response_data, responder_name, responder_email, responder_phone, submitted_at,
                            payment_status, paid_at, guest_id
                     FROM digital_form_responses
                     WHERE '.implode(' AND ', $fbWhere).'
                     ORDER BY submitted_at DESC',
                    $fbVals
                );
                if ($listMode === 'lead' || $listMode === 'checkin') {
                    $rows = array_values(array_filter($rows, static function ($row) use ($listMode) {
                        $isCheckin = !empty($row->guest_id);

                        return $listMode === 'checkin' ? $isCheckin : !$isCheckin;
                    }));
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

            return ['status' => 200, 'body' => ['responses' => $responses]];
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
