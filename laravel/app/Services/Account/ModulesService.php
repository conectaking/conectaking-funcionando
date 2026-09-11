<?php

namespace App\Services\Account;

use App\Support\PlanCodeResolver;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class ModulesService
{
    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function available(string $userId, ?string $planCodeQuery): array
    {
        $accountType = null;
        $planCode = null;

        if ($planCodeQuery) {
            $accountType = $planCodeQuery;
            $planCode = PlanCodeResolver::fromAccountType($planCodeQuery);
        } else {
            $user = DB::selectOne(
                'SELECT id, account_type, subscription_id, subscription_status FROM users WHERE id = ? LIMIT 1',
                [$userId]
            );
            if (! $user) {
                return ['status' => 404, 'body' => ['message' => 'Usuário não encontrado.']];
            }
            $accountType = $user->account_type ?? null;
            $subStatus = strtolower((string) ($user->subscription_status ?? ''));
            $subExpired = in_array($subStatus, ['expired', 'cancelled', 'canceled', 'inactive'], true);
            if (! empty($user->subscription_id) && ! $subExpired) {
                try {
                    $plan = DB::selectOne(
                        'SELECT plan_code, is_active FROM subscription_plans WHERE id = ? LIMIT 1',
                        [$user->subscription_id]
                    );
                    if ($plan && filter_var($plan->is_active ?? true, FILTER_VALIDATE_BOOLEAN)) {
                        $planCode = PlanCodeResolver::normalize((string) ($plan->plan_code ?? ''));
                    }
                } catch (\Throwable $e) {
                    Log::warning('modules.plan', ['error' => $e->getMessage()]);
                }
            }
            if (! $planCode) {
                $planCode = $subExpired
                    ? 'free'
                    : PlanCodeResolver::fromAccountType((string) $accountType);
            }
        }
        if (! $planCode) {
            $planCode = 'basic';
        }

        $available = [];
        try {
            $available = array_map(
                static fn ($r) => (string) $r->module_type,
                DB::select(
                    'SELECT DISTINCT module_type FROM module_plan_availability WHERE plan_code = ? AND is_available = true',
                    [$planCode]
                )
            );
        } catch (\Throwable) {
            $available = [];
        }

        if (! $planCodeQuery) {
            $exclusions = [];
            $adds = [];
            try {
                $exclusions = array_map(
                    static fn ($r) => (string) $r->module_type,
                    DB::select('SELECT module_type FROM individual_user_plan_exclusions WHERE user_id = ?', [$userId])
                );
            } catch (\Throwable) {
            }
            try {
                $adds = array_map(
                    static fn ($r) => (string) $r->module_type,
                    DB::select('SELECT module_type FROM individual_user_plans WHERE user_id = ?', [$userId])
                );
            } catch (\Throwable) {
            }
            $exSet = array_fill_keys($exclusions, true);
            $merged = array_unique(array_merge($available, $adds));
            $available = array_values(array_filter($merged, static fn ($m) => ! ($exSet[$m] ?? false)));
            sort($available);
            if (! ($exSet['wifi'] ?? false) && ! in_array('wifi', $available, true)) {
                $available[] = 'wifi';
                sort($available);
            }
        }

        return ['status' => 200, 'body' => [
            'account_type' => $accountType,
            'plan_code' => $planCode,
            'available_modules' => $available,
        ]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function planAvailability(): array
    {
        $plans = [];
        try {
            $plans = DB::select(
                'SELECT plan_code, plan_name, price FROM subscription_plans WHERE is_active = true ORDER BY plan_code ASC'
            );
        } catch (\Throwable) {
            $plans = [];
        }

        $modulesMap = [];
        try {
            $rows = DB::select(
                'SELECT id, module_type, plan_code, is_available FROM module_plan_availability ORDER BY module_type, plan_code'
            );
            foreach ($rows as $r) {
                $type = (string) $r->module_type;
                if (! isset($modulesMap[$type])) {
                    $modulesMap[$type] = ['module_type' => $type, 'plans' => []];
                }
                $modulesMap[$type]['plans'][(string) $r->plan_code] = [
                    'is_available' => filter_var($r->is_available ?? false, FILTER_VALIDATE_BOOLEAN),
                    'id' => $r->id ?? null,
                ];
            }
        } catch (\Throwable) {
            $modulesMap = [];
        }

        return ['status' => 200, 'body' => [
            'plans' => $plans,
            'modules' => array_values($modulesMap),
        ]];
    }

    /**
     * Público (landing): subset de módulos para o planRenderer da index.
     *
     * @return array{status:int, body:array<string,mixed>}
     */
    public function planAvailabilityPublic(): array
    {
        $types = [
            'whatsapp', 'telegram', 'email', 'pix', 'pix_qrcode', 'wifi',
            'facebook', 'instagram', 'tiktok', 'twitter', 'youtube',
            'spotify', 'linkedin', 'pinterest',
            'link', 'portfolio', 'banner', 'carousel', 'texto_com_botao',
            'youtube_embed', 'instagram_embed', 'sales_page', 'digital_form',
            'finance',
            'modo_empresa', 'branding', 'bible', 'location',
            'recibos_orcamentos',
        ];

        $modulesMap = [];
        try {
            if (! Schema::hasTable('module_plan_availability')) {
                return ['status' => 200, 'body' => ['success' => true, 'modules' => []]];
            }
            $placeholders = implode(',', array_fill(0, count($types), '?'));
            $rows = DB::select(
                "SELECT id, module_type, plan_code, is_available
                 FROM module_plan_availability
                 WHERE module_type IN ($placeholders)
                 ORDER BY module_type, plan_code",
                $types
            );
            foreach ($rows as $r) {
                $type = (string) $r->module_type;
                if (! isset($modulesMap[$type])) {
                    $modulesMap[$type] = ['module_type' => $type, 'plans' => []];
                }
                $modulesMap[$type]['plans'][(string) $r->plan_code] = [
                    'is_available' => filter_var($r->is_available ?? false, FILTER_VALIDATE_BOOLEAN),
                    'id' => $r->id ?? null,
                ];
            }
        } catch (\Throwable) {
            return ['status' => 500, 'body' => ['success' => false, 'error' => 'Erro ao buscar módulos', 'modules' => []]];
        }

        return ['status' => 200, 'body' => [
            'success' => true,
            'modules' => array_values($modulesMap),
        ]];
    }
}
