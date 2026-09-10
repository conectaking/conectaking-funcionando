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
     * @return array{status:int, body:array<string,mixed>}
     */
    public function register(string $email, string $password, string $registrationCode): array
    {
        $email = strtolower(trim($email));
        $registrationCode = trim($registrationCode);
        if ($email === '' || $password === '' || $registrationCode === '') {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'E-mail, senha e código são obrigatórios.']];
        }
        if (strlen($password) < 6) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'Senha deve ter no mínimo 6 caracteres.']];
        }
        if (! Schema::hasTable('registration_codes') || ! Schema::hasTable('users')) {
            return ['status' => 503, 'body' => ['success' => false, 'message' => 'Registro indisponível.']];
        }

        try {
            return DB::transaction(function () use ($email, $password, $registrationCode) {
                $code = DB::selectOne(
                    'SELECT * FROM registration_codes WHERE code = ? AND is_claimed = FALSE LIMIT 1 FOR UPDATE',
                    [$registrationCode]
                );
                if (! $code) {
                    return ['status' => 400, 'body' => ['success' => false, 'message' => 'Código de registro inválido ou já utilizado.']];
                }
                $exists = DB::selectOne('SELECT id FROM users WHERE email = ? LIMIT 1', [$email]);
                if ($exists) {
                    return ['status' => 400, 'body' => ['success' => false, 'message' => 'Este e-mail já está em uso.']];
                }
                $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);
                $accountType = 'individual';
                $parentUserId = null;
                $expiresAt = now()->addDays(30);
                $subStatus = 'pre_sale_trial';
                if (! empty($code->generated_by_user_id)) {
                    $accountType = 'team_member';
                    $parentUserId = $code->generated_by_user_id;
                    $expiresAt = null;
                    $subStatus = null;
                }
                DB::insert(
                    'INSERT INTO users (id, email, password_hash, profile_slug, account_type, parent_user_id, subscription_status, subscription_expires_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [$registrationCode, $email, $hash, $registrationCode, $accountType, $parentUserId, $subStatus, $expiresAt]
                );
                if (Schema::hasTable('user_profiles')) {
                    DB::insert(
                        'INSERT INTO user_profiles (user_id, display_name) VALUES (?, ?)',
                        [$registrationCode, $email]
                    );
                }
                $this->ensureDefaultBibleItem($registrationCode);
                DB::update(
                    'UPDATE registration_codes SET is_claimed = TRUE, claimed_by_user_id = ?, claimed_at = NOW() WHERE code = ?',
                    [$registrationCode, $registrationCode]
                );

                return ['status' => 201, 'body' => [
                    'success' => true,
                    'message' => 'Usuário registrado com sucesso! Você ganhou 30 dias de acesso. Faça o login para continuar.',
                ]];
            });
        } catch (\Throwable $e) {
            Log::error('auth.register', ['error' => $e->getMessage()]);

            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Erro ao registrar.']];
        }
    }

    private function ensureDefaultBibleItem(string $userId): void
    {
        if (! Schema::hasTable('profile_items')) {
            return;
        }
        $n = (int) (DB::selectOne(
            'SELECT COUNT(*)::int AS c FROM profile_items WHERE user_id = ?',
            [$userId]
        )->c ?? 0);
        if ($n > 0) {
            return;
        }
        try {
            $id = DB::selectOne(
                "INSERT INTO profile_items (user_id, item_type, title, is_active, display_order)
                 VALUES (?, 'bible', 'Bíblia', true, 0) RETURNING id",
                [$userId]
            );
            if ($id && Schema::hasTable('bible_items')) {
                DB::insert(
                    "INSERT INTO bible_items (profile_item_id, translation_code, is_visible) VALUES (?, 'nvi', true)",
                    [$id->id]
                );
            }
        } catch (\Throwable $e) {
            Log::warning('auth.ensureBible', ['error' => $e->getMessage()]);
        }
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
        ], (string) (env('JWT_EXPIRES_IN') ?: '24h'));

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
