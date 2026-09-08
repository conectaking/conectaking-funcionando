<?php

namespace App\Services\Account;

use App\Support\PlanCodeResolver;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class LinkLimitsService
{
    /**
     * @return array<string, array{limit:mixed, current:int, remaining:mixed}>
     */
    public function getUserLinkLimits(string $userId): array
    {
        try {
            $planCode = $this->resolvePlanCode($userId);
            if ($planCode === '' || ! Schema::hasTable('module_link_limits')) {
                return [];
            }
            $limits = DB::select(
                'SELECT module_type, max_links FROM module_link_limits WHERE plan_code = ? ORDER BY module_type',
                [$planCode]
            );
            $out = [];
            foreach ($limits as $row) {
                $type = (string) $row->module_type;
                $max = $row->max_links;
                $current = $this->countLinks($userId, $type);
                $maxInt = $max === null ? null : (int) $max;
                $out[$type] = [
                    'limit' => $maxInt,
                    'current' => $current,
                    'remaining' => $maxInt === null ? null : max(0, $maxInt - $current),
                ];
            }

            return $out;
        } catch (\Throwable $e) {
            Log::warning('linkLimits.user', ['error' => $e->getMessage()]);

            return [];
        }
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function checkLimit(string $userId, string $moduleType): array
    {
        $moduleType = trim($moduleType);
        if ($moduleType === '') {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'moduleType obrigatório']];
        }
        try {
            $planCode = $this->resolvePlanCode($userId);
            if ($planCode === '') {
                return ['status' => 200, 'body' => [
                    'success' => true,
                    'data' => ['allowed' => true, 'current' => 0, 'limit' => null, 'message' => 'Plano não encontrado, permitindo criação'],
                ]];
            }
            $row = Schema::hasTable('module_link_limits')
                ? DB::selectOne(
                    'SELECT max_links FROM module_link_limits WHERE module_type = ? AND plan_code = ? LIMIT 1',
                    [$moduleType, $planCode]
                )
                : null;
            if (! $row || $row->max_links === null) {
                return ['status' => 200, 'body' => [
                    'success' => true,
                    'data' => ['allowed' => true, 'current' => 0, 'limit' => null, 'message' => 'Limite não configurado (ilimitado)'],
                ]];
            }
            $limit = (int) $row->max_links;
            $current = $this->countLinks($userId, $moduleType);
            $allowed = $current < $limit;

            return ['status' => 200, 'body' => [
                'success' => true,
                'data' => [
                    'allowed' => $allowed,
                    'current' => $current,
                    'limit' => $limit,
                    'message' => $allowed
                        ? 'Você pode adicionar mais '.($limit - $current).' link(s) deste tipo'
                        : "Limite atingido: {$current}/{$limit} links",
                ],
            ]];
        } catch (\Throwable $e) {
            return ['status' => 200, 'body' => [
                'success' => true,
                'data' => ['allowed' => true, 'current' => 0, 'limit' => null, 'message' => 'Erro ao verificar limite, permitindo criação'],
            ]];
        }
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function index(string $adminId): array
    {
        if (! $this->isAdmin($adminId)) {
            return ['status' => 403, 'body' => ['success' => false, 'message' => 'Acesso negado']];
        }
        $rows = Schema::hasTable('module_link_limits')
            ? DB::select('SELECT * FROM module_link_limits ORDER BY plan_code, module_type')
            : [];

        return ['status' => 200, 'body' => ['success' => true, 'data' => array_map(static fn ($r) => (array) $r, $rows)]];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function upsert(string $adminId, array $body): array
    {
        if (! $this->isAdmin($adminId)) {
            return ['status' => 403, 'body' => ['success' => false, 'message' => 'Acesso negado']];
        }
        $moduleType = trim((string) ($body['module_type'] ?? ''));
        $planCode = trim((string) ($body['plan_code'] ?? ''));
        if ($moduleType === '' || $planCode === '') {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'module_type e plan_code obrigatórios']];
        }
        $max = array_key_exists('max_links', $body) ? $body['max_links'] : null;
        DB::statement(
            'INSERT INTO module_link_limits (module_type, plan_code, max_links, updated_at)
             VALUES (?, ?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT (module_type, plan_code)
             DO UPDATE SET max_links = EXCLUDED.max_links, updated_at = CURRENT_TIMESTAMP',
            [$moduleType, $planCode, $max]
        );
        $row = DB::selectOne(
            'SELECT * FROM module_link_limits WHERE module_type = ? AND plan_code = ? LIMIT 1',
            [$moduleType, $planCode]
        );

        return ['status' => 200, 'body' => ['success' => true, 'data' => $row ? (array) $row : null]];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function bulkUpdate(string $adminId, array $body): array
    {
        if (! $this->isAdmin($adminId)) {
            return ['status' => 403, 'body' => ['success' => false, 'message' => 'Acesso negado']];
        }
        $limits = (array) ($body['limits'] ?? []);
        $out = [];
        foreach ($limits as $item) {
            if (! is_array($item)) {
                continue;
            }
            $r = $this->upsert($adminId, $item);
            if (($r['body']['data'] ?? null)) {
                $out[] = $r['body']['data'];
            }
        }

        return ['status' => 200, 'body' => ['success' => true, 'data' => $out]];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function resetPlan(string $adminId, array $body): array
    {
        if (! $this->isAdmin($adminId)) {
            return ['status' => 403, 'body' => ['success' => false, 'message' => 'Acesso negado']];
        }
        $planCode = trim((string) ($body['plan_code'] ?? ''));
        if ($planCode === '') {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'plan_code obrigatório']];
        }
        $deleted = DB::delete('DELETE FROM module_link_limits WHERE plan_code = ?', [$planCode]);

        return ['status' => 200, 'body' => ['success' => true, 'data' => ['deleted' => $deleted]]];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function copyPlan(string $adminId, array $body): array
    {
        if (! $this->isAdmin($adminId)) {
            return ['status' => 403, 'body' => ['success' => false, 'message' => 'Acesso negado']];
        }
        $src = trim((string) ($body['source_plan_code'] ?? ''));
        $dst = trim((string) ($body['target_plan_code'] ?? ''));
        if ($src === '' || $dst === '') {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'source_plan_code e target_plan_code obrigatórios']];
        }
        $rows = DB::select('SELECT module_type, max_links FROM module_link_limits WHERE plan_code = ?', [$src]);
        foreach ($rows as $row) {
            $this->upsert($adminId, [
                'module_type' => $row->module_type,
                'plan_code' => $dst,
                'max_links' => $row->max_links,
            ]);
        }

        return ['status' => 200, 'body' => ['success' => true, 'data' => ['copied' => count($rows)]]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function stats(string $adminId): array
    {
        if (! $this->isAdmin($adminId)) {
            return ['status' => 403, 'body' => ['success' => false, 'message' => 'Acesso negado']];
        }

        return ['status' => 200, 'body' => [
            'success' => true,
            'data' => ['total_limits' => 0, 'plans' => 0, 'modules' => 0],
        ]];
    }

    public function resolvePlanCode(string $userId): string
    {
        $user = DB::selectOne(
            'SELECT account_type, subscription_id FROM users WHERE id = ? LIMIT 1',
            [$userId]
        );
        if (! $user) {
            return '';
        }
        if (! empty($user->subscription_id)) {
            $plan = DB::selectOne(
                'SELECT plan_code, is_active FROM subscription_plans WHERE id = ? LIMIT 1',
                [$user->subscription_id]
            );
            if ($plan && filter_var($plan->is_active ?? true, FILTER_VALIDATE_BOOLEAN)) {
                return PlanCodeResolver::normalize((string) ($plan->plan_code ?? ''));
            }
        }

        return PlanCodeResolver::fromAccountType($user->account_type ?? null);
    }

    private function countLinks(string $userId, string $moduleType): int
    {
        if (! Schema::hasTable('profile_items')) {
            return 0;
        }

        return (int) (DB::selectOne(
            'SELECT COUNT(*)::int AS c FROM profile_items
             WHERE user_id = ? AND item_type = ? AND COALESCE(is_active, true) = true',
            [$userId, $moduleType]
        )->c ?? 0);
    }

    private function isAdmin(string $userId): bool
    {
        $u = DB::selectOne('SELECT is_admin FROM users WHERE id = ? LIMIT 1', [$userId]);

        return $u && filter_var($u->is_admin ?? false, FILTER_VALIDATE_BOOLEAN);
    }
}
