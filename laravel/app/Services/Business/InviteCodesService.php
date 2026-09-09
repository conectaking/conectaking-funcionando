<?php

namespace App\Services\Business;

use App\Support\NanoId;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Códigos de convite da empresa (modules/empresa/codigosConvite).
 */
class InviteCodesService
{
    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function listCodes(string $userId): array
    {
        $denied = $this->guard($userId);
        if ($denied !== null) {
            return $denied;
        }
        if (! Schema::hasTable('registration_codes')) {
            return $this->err('Erro ao buscar códigos.', 500);
        }

        $rows = DB::select(
            'SELECT code, is_claimed, claimed_at,
                (SELECT email FROM users WHERE id = claimed_by_user_id) as claimed_by_email
             FROM registration_codes WHERE generated_by_user_id = ?',
            [$userId]
        );

        return ['status' => 200, 'body' => [
            'success' => true,
            'data' => $rows,
            'error' => null,
        ]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function generateCode(string $userId): array
    {
        return $this->insertCode($userId, NanoId::generate(10), 'Novo código de equipe gerado!');
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function generateManual(string $userId, mixed $customCode): array
    {
        $denied = $this->guard($userId);
        if ($denied !== null) {
            return $denied;
        }

        $code = is_scalar($customCode) ? trim((string) $customCode) : '';
        if ($code === '' || mb_strlen($code) > 12 || str_contains($code, ' ')) {
            return $this->err('Código personalizado inválido. Deve ter no máximo 12 caracteres e não conter espaços.', 400);
        }

        return $this->insertCode($userId, $code, "Código '{$code}' criado com sucesso!", false);
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    private function insertCode(string $userId, string $code, string $message, bool $uppercase = true): array
    {
        $denied = $this->guard($userId);
        if ($denied !== null) {
            return $denied;
        }
        if (! Schema::hasTable('registration_codes')) {
            return $this->err('Erro ao gerar código.', 500);
        }

        $user = DB::selectOne('SELECT max_team_invites FROM users WHERE id = ? LIMIT 1', [$userId]);
        if (! $user) {
            return $this->err('Usuário não encontrado.', 404);
        }
        $maxInvites = (int) ($user->max_team_invites ?? 0);

        $countRow = DB::selectOne(
            'SELECT COUNT(*) AS count FROM registration_codes WHERE generated_by_user_id = ?',
            [$userId]
        );
        $count = (int) ($countRow->count ?? 0);
        if ($count >= $maxInvites) {
            return $this->err("Limite de {$maxInvites} códigos de equipe atingido.", 403);
        }

        $finalCode = $uppercase ? mb_strtoupper($code) : $code;

        try {
            DB::transaction(function () use ($finalCode, $userId): void {
                DB::insert(
                    'INSERT INTO registration_codes (code, generated_by_user_id) VALUES (?, ?)',
                    [$finalCode, $userId]
                );
            });
        } catch (\Illuminate\Database\QueryException $e) {
            if ($this->isUniqueViolation($e)) {
                return $this->err('Este código personalizado já existe. Tente outro.', 409);
            }
            throw $e;
        }

        return ['status' => 201, 'body' => [
            'success' => true,
            'data' => ['code' => $finalCode],
            'message' => $message,
            'code' => $finalCode,
        ]];
    }

    /**
     * Modo empresa: King Corporate, business_owner, enterprise, plano com modo_empresa ou ADM.
     *
     * @return array{status:int, body:array<string,mixed>}|null
     */
    private function guard(string $userId): ?array
    {
        $user = DB::selectOne('SELECT is_admin, account_type FROM users WHERE id = ? LIMIT 1', [$userId]);
        if (! $user) {
            return $this->err('Não autorizado.', 401);
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

        if ($isAdmin || $hasEnterprise || $hasModoEmpresa) {
            return null;
        }

        return $this->err('Acesso negado. Apenas para contas empresariais (King Corporate), plano com Modo Empresa ou ADM.', 403);
    }

    private function isUniqueViolation(\Illuminate\Database\QueryException $e): bool
    {
        return ($e->errorInfo[0] ?? null) === '23505';
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
