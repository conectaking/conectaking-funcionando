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

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function individualPlans(): array
    {
        try {
            $plans = DB::select(
                'SELECT i.user_id, i.module_type, u.email as user_email, COALESCE(p.display_name, u.email) as user_name
                 FROM individual_user_plans i
                 JOIN users u ON i.user_id = u.id
                 LEFT JOIN user_profiles p ON u.id = p.user_id
                 ORDER BY u.email ASC, i.module_type ASC'
            );

            return ['status' => 200, 'body' => [
                'success' => true,
                'plans' => array_map(static fn ($r) => (array) $r, $plans),
            ]];
        } catch (\Throwable $e) {
            Log::error('modules.individualPlans', ['error' => $e->getMessage()]);

            return ['status' => 500, 'body' => [
                'success' => false,
                'message' => 'Erro ao carregar planos individuais.',
                'plans' => [],
            ]];
        }
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function usersList(): array
    {
        try {
            $users = DB::select(
                "SELECT u.id, u.email, COALESCE(p.display_name, u.name, u.email) as name, u.account_type, u.created_at, u.subscription_expires_at,
                 (CASE WHEN u.subscription_status IN ('cancelled', 'canceled', 'expired', 'inactive') THEN false ELSE true END) as is_active
                 FROM users u
                 LEFT JOIN user_profiles p ON u.id = p.user_id
                 ORDER BY u.email ASC"
            );

            return ['status' => 200, 'body' => [
                'success' => true,
                'users' => array_map(static fn ($r) => (array) $r, $users),
            ]];
        } catch (\Throwable $e) {
            Log::error('modules.usersList', ['error' => $e->getMessage()]);

            return ['status' => 500, 'body' => [
                'success' => false,
                'message' => 'Erro ao carregar lista de usuários.',
                'users' => [],
            ]];
        }
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function getIndividualPlan(string $userId): array
    {
        try {
            $user = DB::selectOne(
                'SELECT u.id, u.email, COALESCE(p.display_name, u.email) as name, u.account_type
                 FROM users u
                 LEFT JOIN user_profiles p ON u.id = p.user_id
                 WHERE u.id = ? LIMIT 1',
                [$userId]
            );
            if (! $user) {
                return ['status' => 404, 'body' => ['success' => false, 'message' => 'Usuário não encontrado.']];
            }

            $planCode = PlanCodeResolver::fromAccountType((string) ($user->account_type ?? ''));

            $baseModules = array_map(
                static fn ($r) => (string) $r->module_type,
                DB::select(
                    'SELECT DISTINCT module_type FROM module_plan_availability WHERE plan_code = ? AND is_available = true',
                    [$planCode]
                )
            );
            $baseSet = array_fill_keys($baseModules, true);

            $exclusions = array_map(
                static fn ($r) => (string) $r->module_type,
                DB::select('SELECT module_type FROM individual_user_plan_exclusions WHERE user_id = ?', [$userId])
            );
            $exSet = array_fill_keys($exclusions, true);

            $adds = array_map(
                static fn ($r) => (string) $r->module_type,
                DB::select('SELECT module_type FROM individual_user_plans WHERE user_id = ?', [$userId])
            );
            $addSet = array_fill_keys($adds, true);

            $allTypes = array_map(
                static fn ($r) => (string) $r->module_type,
                DB::select('SELECT DISTINCT module_type FROM module_plan_availability ORDER BY module_type ASC')
            );
            if (empty($allTypes)) {
                $allTypes = [
                    'whatsapp', 'telegram', 'email', 'pix', 'pix_qrcode', 'wifi',
                    'facebook', 'instagram', 'tiktok', 'twitter', 'youtube',
                    'spotify', 'linkedin', 'pinterest',
                    'link', 'portfolio', 'banner', 'carousel', 'texto_com_botao',
                    'youtube_embed', 'instagram_embed', 'sales_page', 'digital_form',
                    'finance', 'modo_empresa', 'branding', 'bible', 'location',
                    'recibos_orcamentos',
                ];
            }

            $modulesList = [];
            foreach ($allTypes as $type) {
                $inBase = isset($baseSet[$type]);
                $isActive = $inBase ? ! isset($exSet[$type]) : isset($addSet[$type]);
                $modulesList[] = [
                    'module_type' => $type,
                    'in_base_plan' => $inBase,
                    'is_active' => $isActive,
                ];
            }

            $maxFinance = 1;
            try {
                $fp = DB::selectOne(
                    'SELECT max_finance_profiles FROM individual_user_finance_profiles WHERE user_id = ? LIMIT 1',
                    [$userId]
                );
                if ($fp && ! empty($fp->max_finance_profiles)) {
                    $maxFinance = (int) $fp->max_finance_profiles;
                }
            } catch (\Throwable) {
            }

            return ['status' => 200, 'body' => [
                'success' => true,
                'user' => [
                    'id' => (string) $user->id,
                    'email' => (string) $user->email,
                    'name' => (string) $user->name,
                    'account_type' => (string) $user->account_type,
                ],
                'modules' => $modulesList,
                'max_finance_profiles' => $maxFinance,
            ]];
        } catch (\Throwable $e) {
            Log::error('modules.getIndividualPlan', ['error' => $e->getMessage()]);

            return ['status' => 500, 'body' => [
                'success' => false,
                'message' => 'Erro ao carregar plano individual do usuário.',
            ]];
        }
    }

    /**
     * @param  array<string,mixed>  $data
     * @return array{status:int, body:array<string,mixed>}
     */
    public function updateIndividualPlan(string $userId, array $data): array
    {
        try {
            $user = DB::selectOne('SELECT id, account_type FROM users WHERE id = ? LIMIT 1', [$userId]);
            if (! $user) {
                return ['status' => 404, 'body' => ['success' => false, 'message' => 'Usuário não encontrado.']];
            }

            $selectedModules = $data['modules'] ?? [];
            if (! is_array($selectedModules)) {
                $selectedModules = [];
            }
            $selectedModules = array_map('strval', $selectedModules);
            $selectedSet = array_fill_keys($selectedModules, true);

            $planCode = PlanCodeResolver::fromAccountType((string) ($user->account_type ?? ''));

            $baseModules = array_map(
                static fn ($r) => (string) $r->module_type,
                DB::select(
                    'SELECT DISTINCT module_type FROM module_plan_availability WHERE plan_code = ? AND is_available = true',
                    [$planCode]
                )
            );
            $baseSet = array_fill_keys($baseModules, true);

            $allModules = array_map(
                static fn ($r) => (string) $r->module_type,
                DB::select('SELECT DISTINCT module_type FROM module_plan_availability')
            );
            if (empty($allModules)) {
                $allModules = array_keys(array_merge($baseSet, $selectedSet));
            }

            DB::transaction(function () use ($userId, $planCode, $selectedSet, $baseSet, $allModules, $data): void {
                DB::delete('DELETE FROM individual_user_plans WHERE user_id = ?', [$userId]);
                DB::delete('DELETE FROM individual_user_plan_exclusions WHERE user_id = ?', [$userId]);

                foreach ($allModules as $mod) {
                    $inBase = isset($baseSet[$mod]);
                    $selected = isset($selectedSet[$mod]);

                    if ($inBase && ! $selected) {
                        DB::insert(
                            'INSERT INTO individual_user_plan_exclusions (user_id, module_type) VALUES (?, ?)',
                            [$userId, $mod]
                        );
                    } elseif (! $inBase && $selected) {
                        DB::insert(
                            'INSERT INTO individual_user_plans (user_id, module_type, plan_code) VALUES (?, ?, ?)',
                            [$userId, $mod, $planCode]
                        );
                    }
                }

                if (isset($data['max_finance_profiles'])) {
                    $maxP = max(1, min(20, (int) $data['max_finance_profiles']));
                    $hasFp = DB::selectOne(
                        'SELECT 1 FROM individual_user_finance_profiles WHERE user_id = ? LIMIT 1',
                        [$userId]
                    );
                    if ($hasFp) {
                        DB::update(
                            'UPDATE individual_user_finance_profiles SET max_finance_profiles = ?, updated_at = NOW() WHERE user_id = ?',
                            [$maxP, $userId]
                        );
                    } else {
                        DB::insert(
                            'INSERT INTO individual_user_finance_profiles (user_id, max_finance_profiles, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
                            [$userId, $maxP]
                        );
                    }
                }
            });

            return ['status' => 200, 'body' => [
                'success' => true,
                'message' => 'Módulos do usuário atualizados com sucesso.',
            ]];
        } catch (\Throwable $e) {
            Log::error('modules.updateIndividualPlan', ['error' => $e->getMessage()]);

            return ['status' => 500, 'body' => [
                'success' => false,
                'message' => 'Erro ao salvar módulos do usuário: ' . $e->getMessage(),
            ]];
        }
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function deleteIndividualPlan(string $userId): array
    {
        try {
            DB::transaction(function () use ($userId): void {
                DB::delete('DELETE FROM individual_user_plans WHERE user_id = ?', [$userId]);
                DB::delete('DELETE FROM individual_user_plan_exclusions WHERE user_id = ?', [$userId]);
                DB::delete('DELETE FROM individual_user_finance_profiles WHERE user_id = ?', [$userId]);
            });

            return ['status' => 200, 'body' => [
                'success' => true,
                'message' => 'Planos individuais removidos com sucesso.',
            ]];
        } catch (\Throwable $e) {
            Log::error('modules.deleteIndividualPlan', ['error' => $e->getMessage()]);

            return ['status' => 500, 'body' => [
                'success' => false,
                'message' => 'Erro ao remover planos individuais.',
            ]];
        }
    }
}
