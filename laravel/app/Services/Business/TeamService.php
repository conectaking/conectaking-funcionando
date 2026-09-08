<?php

namespace App\Services\Business;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class TeamService
{
    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function list(string $userId): array
    {
        $user = DB::selectOne('SELECT id, is_admin, account_type FROM users WHERE id = ? LIMIT 1', [$userId]);
        if (! $user) {
            return ['status' => 401, 'body' => ['success' => false, 'message' => 'Não autorizado.']];
        }
        $isAdmin = filter_var($user->is_admin ?? false, FILTER_VALIDATE_BOOLEAN);
        $accountType = (string) ($user->account_type ?? '');
        $hasEnterprise = in_array($accountType, ['business_owner', 'king_corporate', 'enterprise'], true);
        $hasModoEmpresa = false;
        if ($accountType !== '' && Schema::hasTable('module_plan_availability')) {
            $hasModoEmpresa = (bool) DB::selectOne(
                "SELECT 1 AS ok FROM module_plan_availability
                 WHERE module_type = 'modo_empresa' AND plan_code = ? AND is_available = true LIMIT 1",
                [$accountType]
            );
        }
        if (! $isAdmin && ! $hasEnterprise && ! $hasModoEmpresa) {
            return ['status' => 403, 'body' => [
                'success' => false,
                'message' => 'Acesso negado. Apenas para contas empresariais (King Corporate), plano com Modo Empresa ou ADM.',
            ]];
        }

        $rows = DB::select(
            'SELECT u.id, p.display_name, u.email, u.created_at
             FROM users u
             LEFT JOIN user_profiles p ON u.id = p.user_id
             WHERE u.parent_user_id = ?',
            [$userId]
        );

        return ['status' => 200, 'body' => [
            'success' => true,
            'data' => $rows,
            'error' => null,
            'message' => null,
        ]];
    }
}
