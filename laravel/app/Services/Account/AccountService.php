<?php

namespace App\Services\Account;

use App\Support\PlanCodeResolver;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AccountService
{
    public function __construct(private readonly LinkLimitsService $linkLimits)
    {
    }

    /**
     * @return array{status:int, body:mixed}
     */
    public function details(string $userId): array
    {
        $row = DB::selectOne('SELECT id, name, email, created_at FROM users WHERE id = ? LIMIT 1', [$userId]);
        if (! $row) {
            return ['status' => 404, 'body' => ['message' => 'Usuário não encontrado.']];
        }

        return ['status' => 200, 'body' => (array) $row];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:mixed}
     */
    public function updateDetails(string $userId, array $body): array
    {
        $name = trim((string) ($body['name'] ?? ''));
        $email = strtolower(trim((string) ($body['email'] ?? '')));
        if ($name === '' || $email === '') {
            return ['status' => 400, 'body' => ['message' => 'Nome e email são obrigatórios.']];
        }
        $row = DB::selectOne(
            'UPDATE users SET name = ?, email = ? WHERE id = ? RETURNING id, name, email',
            [$name, $email, $userId]
        );
        if (! $row) {
            return ['status' => 404, 'body' => ['message' => 'Usuário não encontrado.']];
        }

        return ['status' => 200, 'body' => ['message' => 'Dados atualizados com sucesso!', 'user' => (array) $row]];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:mixed}
     */
    public function changePassword(string $userId, array $body): array
    {
        $current = (string) ($body['currentPassword'] ?? '');
        $new = (string) ($body['newPassword'] ?? '');
        if ($current === '' || $new === '') {
            return ['status' => 400, 'body' => ['message' => 'Todos os campos de senha são obrigatórios.']];
        }
        $user = DB::selectOne('SELECT password_hash FROM users WHERE id = ? LIMIT 1', [$userId]);
        if (! $user || empty($user->password_hash)) {
            return ['status' => 404, 'body' => ['message' => 'Usuário não encontrado.']];
        }
        if (! password_verify($current, (string) $user->password_hash)) {
            return ['status' => 401, 'body' => ['message' => 'A senha atual está incorreta.']];
        }
        $hash = password_hash($new, PASSWORD_BCRYPT, ['cost' => 10]);
        DB::update('UPDATE users SET password_hash = ? WHERE id = ?', [$hash, $userId]);

        return ['status' => 200, 'body' => ['message' => 'Senha alterada com sucesso!']];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:mixed}
     */
    public function upgrade(string $actorId, array $body): array
    {
        $admin = DB::selectOne('SELECT is_admin FROM users WHERE id = ? LIMIT 1', [$actorId]);
        if (! $admin || ! filter_var($admin->is_admin ?? false, FILTER_VALIDATE_BOOLEAN)) {
            return ['status' => 403, 'body' => ['message' => 'Acesso negado. Apenas administradores.']];
        }

        $target = (string) ($body['targetUserId'] ?? '');
        $newPlan = (string) ($body['newPlan'] ?? '');
        if (! in_array($newPlan, ['individual', 'individual_com_logo', 'business_owner', 'free'], true)) {
            return ['status' => 400, 'body' => ['message' => 'Plano inválido.']];
        }
        if ($target === '') {
            return ['status' => 400, 'body' => ['message' => 'targetUserId obrigatório.']];
        }

        $exists = DB::selectOne('SELECT id FROM users WHERE id = ? LIMIT 1', [$target]);
        if (! $exists) {
            return ['status' => 404, 'body' => ['message' => 'Usuário não encontrado.']];
        }

        // Plano efetivo: account_type + limpar subscription para não mascarar com plano antigo
        if ($newPlan === 'free') {
            DB::update(
                "UPDATE users
                 SET account_type = 'free',
                     subscription_id = NULL,
                     subscription_status = 'expired',
                     subscription_expires_at = NULL
                 WHERE id = ?",
                [$target]
            );
        } else {
            DB::update(
                "UPDATE users
                 SET account_type = ?,
                     subscription_id = NULL,
                     subscription_status = 'active',
                     subscription_expires_at = NULL
                 WHERE id = ?",
                [$newPlan, $target]
            );
        }

        return ['status' => 200, 'body' => ['message' => "Usuário {$target} atualizado para o plano {$newPlan}!"]];
    }

    /**
     * @return array{status:int, body:mixed}
     */
    public function debugPlan(string $adminId, string $email): array
    {
        $admin = DB::selectOne('SELECT is_admin FROM users WHERE id = ? LIMIT 1', [$adminId]);
        if (! $admin || ! filter_var($admin->is_admin ?? false, FILTER_VALIDATE_BOOLEAN)) {
            return ['status' => 403, 'body' => ['message' => 'Acesso negado. Apenas administradores podem usar esta rota.']];
        }
        $email = strtolower(trim($email));
        $user = DB::selectOne(
            'SELECT id, email, account_type, subscription_id FROM users WHERE email = ? LIMIT 1',
            [$email]
        );
        if (! $user) {
            return ['status' => 404, 'body' => ['message' => "Usuário com email {$email} não encontrado."]];
        }
        $planCode = null;
        $planInfo = null;
        $planSource = null;
        if (! empty($user->subscription_id)) {
            $planInfo = DB::selectOne(
                'SELECT id, plan_code, plan_name, price, monthly_price, annual_price, is_active
                 FROM subscription_plans WHERE id = ? LIMIT 1',
                [$user->subscription_id]
            );
            if ($planInfo) {
                if (filter_var($planInfo->is_active ?? true, FILTER_VALIDATE_BOOLEAN)) {
                    $planCode = PlanCodeResolver::normalize((string) $planInfo->plan_code);
                    $planSource = 'subscription_id='.$user->subscription_id;
                } else {
                    $planSource = 'subscription_id='.$user->subscription_id.' (PLANO INATIVO: '.$planInfo->plan_code.')';
                }
            } else {
                $planSource = 'subscription_id='.$user->subscription_id.' (PLANO NÃO EXISTE NA TABELA)';
            }
        }
        if (! $planCode) {
            $planCode = PlanCodeResolver::fromAccountType($user->account_type ?? null);
            $planSource = 'account_type='.($user->account_type ?? '').' → '.$planCode;
        }
        $modules = Schema::hasTable('module_plan_availability')
            ? DB::select(
                'SELECT module_type, is_available FROM module_plan_availability WHERE plan_code = ? ORDER BY module_type',
                [$planCode]
            )
            : [];
        $available = [];
        $unavailable = [];
        foreach ($modules as $m) {
            if (filter_var($m->is_available ?? false, FILTER_VALIDATE_BOOLEAN)) {
                $available[] = (string) $m->module_type;
            } else {
                $unavailable[] = (string) $m->module_type;
            }
        }
        $ind = [];
        $excl = [];
        try {
            $ind = array_map(static fn ($r) => (string) $r->module_type, DB::select(
                'SELECT module_type FROM individual_user_plans WHERE user_id = ?',
                [$user->id]
            ));
        } catch (\Throwable) {
        }
        try {
            $excl = array_map(static fn ($r) => (string) $r->module_type, DB::select(
                'SELECT module_type FROM individual_user_plan_exclusions WHERE user_id = ?',
                [$user->id]
            ));
        } catch (\Throwable) {
        }
        $final = array_values(array_unique(array_filter(
            array_merge($available, $ind),
            static fn ($m) => ! in_array($m, $excl, true)
        )));
        sort($final);

        return ['status' => 200, 'body' => [
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'account_type' => $user->account_type,
                'subscription_id' => $user->subscription_id,
            ],
            'plan_resolution' => [
                'plan_code' => $planCode,
                'source' => $planSource,
                'subscription_plan' => $planInfo ? (array) $planInfo : null,
            ],
            'modules' => [
                'available' => $available,
                'unavailable' => $unavailable,
                'individual_adds' => $ind,
                'individual_exclusions' => $excl,
                'final_available' => $final,
            ],
            'flags' => [
                'hasFinance' => in_array('finance', $final, true),
                'hasContract' => false,
                'hasAgenda' => false,
                'hasModoEmpresa' => in_array('modo_empresa', $final, true),
                'hasBranding' => in_array('branding', $final, true),
                'hasKingBrief' => false,
                'hasPhotographerSite' => false,
            ],
        ]];
    }
}
