<?php

namespace App\Services\Account;

use App\Support\PlanCodeResolver;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SubscriptionService
{
    private const MODULE_NAME_TO_CODE = [
        'Carrossel' => 'carousel',
        'Loja Virtual' => 'sales_page',
        'King Forms' => 'digital_form',
        'Portfólio' => 'portfolio',
        'Banner' => 'banner',
        'Gestão Financeira' => 'finance',
        'Modo Empresa' => 'modo_empresa',
        'King Docs' => 'king_docs',
    ];

    private const PLAN_SELECT = "id, plan_code, plan_name, price, monthly_price, annual_price, description, features,
        whatsapp_number, whatsapp_message, pix_key, is_active,
        COALESCE(custom_included_modules, '') as custom_included_modules,
        COALESCE(custom_excluded_modules, '') as custom_excluded_modules";

    /**
     * @return array{status:int, body:mixed}
     */
    public function info(string $userId): array
    {
        $user = DB::selectOne(
            'SELECT id, email, account_type, subscription_status, subscription_expires_at, subscription_id, created_at, is_admin
             FROM users WHERE id = ? LIMIT 1',
            [$userId]
        );
        if (! $user) {
            return ['status' => 404, 'body' => ['message' => 'Usuário não encontrado.']];
        }
        $plans = $this->activePlans();
        $current = $this->resolveCurrentPlan($user, $plans);

        return ['status' => 200, 'body' => [
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'accountType' => $user->account_type,
                'subscriptionStatus' => $user->subscription_status,
                'subscriptionExpiresAt' => $user->subscription_expires_at,
                'subscriptionId' => $user->subscription_id,
                'createdAt' => $user->created_at,
                'isAdmin' => filter_var($user->is_admin ?? false, FILTER_VALIDATE_BOOLEAN),
            ],
            'currentPlan' => $current,
            'availablePlans' => $plans,
        ]];
    }

    /**
     * @return array{status:int, body:mixed}
     */
    public function plansForAdmin(string $userId): array
    {
        if (! $this->isAdmin($userId)) {
            return ['status' => 403, 'body' => ['message' => 'Acesso negado. Apenas administradores podem acessar.']];
        }
        $plans = array_values(array_filter(
            $this->activePlans(true),
            static fn ($p) => ($p['plan_code'] ?? '') !== 'adm_principal' && ($p['plan_code'] ?? '') !== 'abm'
        ));

        return ['status' => 200, 'body' => ['plans' => $plans]];
    }

    /**
     * @return array{status:int, body:mixed}
     */
    public function plansPublic(): array
    {
        $plans = array_values(array_filter(
            $this->activePlans(),
            static fn ($p) => ($p['plan_code'] ?? '') !== 'adm_principal' && ($p['plan_code'] ?? '') !== 'abm'
        ));

        return ['status' => 200, 'body' => ['success' => true, 'plans' => $plans]];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:mixed}
     */
    public function updatePlan(string $adminId, int $planId, array $body): array
    {
        if (! $this->isAdmin($adminId)) {
            return ['status' => 403, 'body' => ['message' => 'Acesso negado. Apenas administradores podem editar planos.']];
        }
        $plan = DB::selectOne('SELECT id, plan_code FROM subscription_plans WHERE id = ? LIMIT 1', [$planId]);
        if (! $plan) {
            return ['status' => 404, 'body' => ['message' => 'Plano não encontrado.']];
        }
        $allowed = [
            'plan_name', 'price', 'monthly_price', 'annual_price', 'description', 'features',
            'whatsapp_number', 'whatsapp_message', 'pix_key', 'is_active',
            'custom_included_modules', 'custom_excluded_modules', 'plan_code',
        ];
        $sets = [];
        $params = [];
        foreach ($allowed as $col) {
            if (! array_key_exists($col, $body)) {
                continue;
            }
            $v = $body[$col];
            if ($col === 'features') {
                $sets[] = 'features = ?::jsonb';
                $params[] = is_string($v) ? $v : json_encode($v ?? new \stdClass);
            } elseif (in_array($col, ['price', 'monthly_price', 'annual_price'], true)) {
                $sets[] = "{$col} = ?";
                $params[] = $v !== null && $v !== '' ? (float) $v : null;
            } else {
                $sets[] = "{$col} = ?";
                $params[] = $v;
            }
        }
        if ($sets !== []) {
            $params[] = $planId;
            DB::update(
                'UPDATE subscription_plans SET '.implode(', ', $sets).', updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                $params
            );
        }
        $modulesUpdated = array_key_exists('included_modules', $body) || array_key_exists('excluded_modules', $body);
        if ($modulesUpdated) {
            $this->syncModuleAvailability(
                (string) $plan->plan_code,
                $body['included_modules'] ?? null,
                $body['excluded_modules'] ?? null
            );
        }
        $full = DB::selectOne(
            'SELECT *, COALESCE(custom_included_modules, \'\') as custom_included_modules,
                    COALESCE(custom_excluded_modules, \'\') as custom_excluded_modules
             FROM subscription_plans WHERE id = ? LIMIT 1',
            [$planId]
        );

        return ['status' => 200, 'body' => [
            'message' => 'Plano atualizado',
            'plan' => $this->normalizePlan($full ? (array) $full : []),
            'modulesUpdated' => $modulesUpdated,
        ]];
    }

    /**
     * @return list<array<string,mixed>>
     */
    private function activePlans(bool $withTimestamps = false): array
    {
        if (! Schema::hasTable('subscription_plans')) {
            return [];
        }
        $extra = $withTimestamps ? ', created_at, updated_at' : '';
        $rows = DB::select(
            'SELECT '.self::PLAN_SELECT.$extra.'
             FROM subscription_plans WHERE is_active = true
             ORDER BY COALESCE(monthly_price, price) ASC'
        );

        return array_map(fn ($r) => $this->normalizePlan((array) $r), $rows);
    }

    /**
     * @param  list<array<string,mixed>>  $plans
     * @return array<string,mixed>|null
     */
    private function resolveCurrentPlan(object $user, array $plans): ?array
    {
        if ($plans === []) {
            return null;
        }
        if (! empty($user->subscription_id)) {
            foreach ($plans as $p) {
                if ((string) ($p['id'] ?? '') === (string) $user->subscription_id) {
                    return $p;
                }
            }
        }
        $code = PlanCodeResolver::ACCOUNT_TYPE_TO_PLAN[$user->account_type ?? ''] ?? null;
        if ($code) {
            foreach ($plans as $p) {
                if (($p['plan_code'] ?? '') === $code) {
                    return $p;
                }
            }
        }
        if (! empty($user->account_type)) {
            foreach ($plans as $p) {
                if (($p['plan_code'] ?? '') === $user->account_type) {
                    return $p;
                }
            }
        }
        if (($user->account_type ?? '') !== 'free') {
            return $plans[0];
        }

        return null;
    }

    /**
     * @param  array<string,mixed>  $plan
     * @return array<string,mixed>
     */
    private function normalizePlan(array $plan): array
    {
        $plan['custom_included_modules'] = $plan['custom_included_modules'] ?? '';
        $plan['custom_excluded_modules'] = $plan['custom_excluded_modules'] ?? '';

        return $plan;
    }

    private function syncModuleAvailability(string $planCode, mixed $includedModules, mixed $excludedModules): void
    {
        if (! Schema::hasTable('module_plan_availability')) {
            return;
        }
        $includedList = $includedModules !== null && trim((string) $includedModules) !== ''
            ? array_values(array_filter(array_map('trim', explode(',', (string) $includedModules))))
            : [];
        $excludedList = $excludedModules !== null && trim((string) $excludedModules) !== ''
            ? array_values(array_filter(array_map('trim', explode(',', (string) $excludedModules))))
            : [];
        $includedSet = array_fill_keys($includedList, true);
        $excludedSet = array_fill_keys($excludedList, true);
        foreach (self::MODULE_NAME_TO_CODE as $name => $code) {
            $isAvailable = false;
            if (isset($includedSet[$name])) {
                $isAvailable = true;
            } elseif (isset($excludedSet[$name])) {
                $isAvailable = false;
            } else {
                $cur = DB::selectOne(
                    'SELECT is_available FROM module_plan_availability WHERE module_type = ? AND plan_code = ? LIMIT 1',
                    [$code, $planCode]
                );
                $isAvailable = $cur ? filter_var($cur->is_available ?? false, FILTER_VALIDATE_BOOLEAN) : false;
            }
            $exists = DB::selectOne(
                'SELECT id FROM module_plan_availability WHERE module_type = ? AND plan_code = ? LIMIT 1',
                [$code, $planCode]
            );
            if ($exists) {
                DB::update(
                    'UPDATE module_plan_availability SET is_available = ?, updated_at = CURRENT_TIMESTAMP WHERE module_type = ? AND plan_code = ?',
                    [$isAvailable, $code, $planCode]
                );
            } else {
                DB::insert(
                    'INSERT INTO module_plan_availability (module_type, plan_code, is_available) VALUES (?, ?, ?)',
                    [$code, $planCode, $isAvailable]
                );
            }
        }
    }

    private function isAdmin(string $userId): bool
    {
        $u = DB::selectOne('SELECT is_admin FROM users WHERE id = ? LIMIT 1', [$userId]);

        return $u && filter_var($u->is_admin ?? false, FILTER_VALIDATE_BOOLEAN);
    }
}
