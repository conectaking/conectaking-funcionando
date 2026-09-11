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

    /**
     * Admin: atualiza disponibilidade módulo×plano (Separação de Pacotes).
     *
     * @param  array<string,mixed>  $payload
     * @return array{status:int, body:array<string,mixed>}
     */
    public function updatePlanAvailability(array $payload): array
    {
        if (! Schema::hasTable('module_plan_availability')) {
            return ['status' => 503, 'body' => [
                'success' => false,
                'message' => 'Tabela module_plan_availability indisponível.',
            ]];
        }

        $updates = $payload['updates'] ?? null;
        if (! is_array($updates) || $updates === []) {
            return ['status' => 400, 'body' => [
                'success' => false,
                'message' => 'Envie { updates: [{ module_type, plan_code, is_available }] }.',
            ]];
        }

        $saved = 0;
        try {
            DB::transaction(function () use ($updates, &$saved): void {
                foreach ($updates as $row) {
                    if (! is_array($row)) {
                        continue;
                    }
                    $moduleType = trim((string) ($row['module_type'] ?? ''));
                    $planCode = trim((string) ($row['plan_code'] ?? ''));
                    if ($moduleType === '' || $planCode === '') {
                        continue;
                    }
                    if (strlen($moduleType) > 64 || strlen($planCode) > 64) {
                        continue;
                    }
                    $raw = $row['is_available'] ?? false;
                    $isAvailable = $raw === true || $raw === 1 || $raw === '1' || $raw === 'true';

                    $exists = DB::selectOne(
                        'SELECT id FROM module_plan_availability WHERE module_type = ? AND plan_code = ? LIMIT 1',
                        [$moduleType, $planCode]
                    );
                    if ($exists) {
                        DB::update(
                            'UPDATE module_plan_availability
                             SET is_available = ?, updated_at = CURRENT_TIMESTAMP
                             WHERE module_type = ? AND plan_code = ?',
                            [$isAvailable, $moduleType, $planCode]
                        );
                    } else {
                        DB::insert(
                            'INSERT INTO module_plan_availability (module_type, plan_code, is_available)
                             VALUES (?, ?, ?)',
                            [$moduleType, $planCode, $isAvailable]
                        );
                    }
                    $saved++;
                }
            });
        } catch (\Throwable $e) {
            Log::error('modules.updatePlanAvailability', ['error' => $e->getMessage()]);

            return ['status' => 500, 'body' => [
                'success' => false,
                'message' => 'Erro ao salvar disponibilidade dos módulos.',
            ]];
        }

        if ($saved === 0) {
            return ['status' => 400, 'body' => [
                'success' => false,
                'message' => 'Nenhuma atualização válida recebida.',
            ]];
        }

        return ['status' => 200, 'body' => [
            'success' => true,
            'message' => 'Disponibilidade atualizada.',
            'saved' => $saved,
        ]];
    }
}
