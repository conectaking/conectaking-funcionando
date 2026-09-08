<?php

namespace App\Services\Auth;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class AuthService
{
    public function __construct(private readonly JwtService $jwt)
    {
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function login(string $email, string $password): array
    {
        $email = strtolower(trim($email));
        $password = (string) $password;
        if ($email === '' || $password === '') {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'Informe e-mail e senha.']];
        }

        $user = DB::selectOne('SELECT * FROM users WHERE email = ? LIMIT 1', [$email]);
        if (! $user) {
            $alt = $this->emailLocalPartWithoutDots($email);
            if ($alt !== $email) {
                $user = DB::selectOne('SELECT * FROM users WHERE email = ? LIMIT 1', [$alt]);
            }
        }
        if (! $user) {
            return ['status' => 401, 'body' => ['success' => false, 'message' => 'Credenciais inválidas.']];
        }
        if (empty($user->password_hash)) {
            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Erro interno: conta sem senha cadastrada. Entre em contato com o suporte.']];
        }
        if (! password_verify($password, (string) $user->password_hash)) {
            return ['status' => 401, 'body' => ['success' => false, 'message' => 'Credenciais inválidas.']];
        }

        [$access, $refresh] = $this->tokenPair($user);
        $this->saveRefreshToken((string) $user->id, $refresh);

        return ['status' => 200, 'body' => [
            'success' => true,
            'message' => 'Login bem-sucedido!',
            'token' => $access,
            'refreshToken' => $refresh,
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'name' => $user->name ?? null,
                'isAdmin' => filter_var($user->is_admin ?? false, FILTER_VALIDATE_BOOLEAN),
                'accountType' => $user->account_type ?? null,
            ],
        ]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function refresh(string $refreshToken): array
    {
        $refreshToken = trim($refreshToken);
        if ($refreshToken === '') {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'Refresh token é obrigatório.']];
        }

        try {
            $decoded = $this->jwt->decode($refreshToken);
        } catch (\Throwable) {
            return ['status' => 401, 'body' => ['success' => false, 'message' => 'Refresh token inválido.']];
        }
        if (($decoded['type'] ?? '') !== 'refresh') {
            return ['status' => 401, 'body' => ['success' => false, 'message' => 'Refresh token inválido.']];
        }
        $userId = (string) ($decoded['userId'] ?? '');
        if ($userId === '') {
            return ['status' => 401, 'body' => ['success' => false, 'message' => 'Refresh token inválido.']];
        }

        if (Schema::hasTable('refresh_tokens')) {
            $row = DB::selectOne(
                'SELECT id FROM refresh_tokens WHERE token = ? AND user_id = ? AND expires_at > NOW() LIMIT 1',
                [$refreshToken, $userId]
            );
            if (! $row) {
                return ['status' => 401, 'body' => ['success' => false, 'message' => 'Refresh token inválido ou expirado.']];
            }
        }

        $user = DB::selectOne('SELECT * FROM users WHERE id = ? LIMIT 1', [$userId]);
        if (! $user) {
            return ['status' => 401, 'body' => ['success' => false, 'message' => 'Usuário não encontrado.']];
        }

        [$access, $newRefresh] = $this->tokenPair($user);
        $this->revokeRefreshToken($refreshToken);
        $this->saveRefreshToken((string) $user->id, $newRefresh);

        return ['status' => 200, 'body' => [
            'success' => true,
            'token' => $access,
            'refreshToken' => $newRefresh,
        ]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function logout(?string $refreshToken): array
    {
        if ($refreshToken) {
            $this->revokeRefreshToken(trim($refreshToken));
        }

        return ['status' => 200, 'body' => ['success' => true, 'message' => 'Logout realizado.']];
    }

    /**
     * @return array{0:string,1:string}
     */
    private function tokenPair(object $user): array
    {
        $access = $this->jwt->encode([
            'userId' => $user->id,
            'email' => $user->email,
            'isAdmin' => filter_var($user->is_admin ?? false, FILTER_VALIDATE_BOOLEAN),
            'accountType' => $user->account_type ?? null,
        ], (string) (env('JWT_EXPIRES_IN') ?: '7d'));

        $refresh = $this->jwt->encode([
            'userId' => $user->id,
            'type' => 'refresh',
        ], (string) (env('JWT_REFRESH_EXPIRES_IN') ?: '30d'));

        return [$access, $refresh];
    }

    private function saveRefreshToken(string $userId, string $token): void
    {
        if (! Schema::hasTable('refresh_tokens')) {
            return;
        }
        try {
            DB::delete('DELETE FROM refresh_tokens WHERE user_id = ? AND expires_at < NOW()', [$userId]);
            DB::table('refresh_tokens')->insert([
                'user_id' => $userId,
                'token' => $token,
                'expires_at' => now()->addDays(30),
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('auth.saveRefresh', ['error' => $e->getMessage()]);
        }
    }

    private function revokeRefreshToken(string $token): void
    {
        if ($token === '' || ! Schema::hasTable('refresh_tokens')) {
            return;
        }
        try {
            DB::delete('DELETE FROM refresh_tokens WHERE token = ?', [$token]);
        } catch (\Throwable $e) {
            Log::warning('auth.revokeRefresh', ['error' => $e->getMessage()]);
        }
    }

    private function emailLocalPartWithoutDots(string $email): string
    {
        $parts = explode('@', $email, 2);
        if (count($parts) !== 2) {
            return $email;
        }

        return str_replace('.', '', $parts[0]).'@'.$parts[1];
    }
}
