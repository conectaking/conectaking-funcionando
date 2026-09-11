<?php

namespace App\Services\Auth;

use App\Support\SchemaMeta;
use App\Support\Totp;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AdminTotpService
{
    public function __construct(private readonly JwtService $jwt)
    {
    }

    public function isEnabled(object $user): bool
    {
        return ! empty($user->totp_enabled_at) && ! empty($user->totp_secret_encrypted);
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function beginSetup(string $userId, string $email): array
    {
        if (! Schema::hasColumn('users', 'totp_secret_encrypted')) {
            return ['status' => 503, 'body' => ['success' => false, 'message' => '2FA ainda não migrado.']];
        }
        $secret = Totp::generateSecret();
        DB::update(
            'UPDATE users SET totp_secret_encrypted = ?, totp_enabled_at = NULL WHERE id = ?',
            [Crypt::encryptString($secret), $userId]
        );

        return ['status' => 200, 'body' => [
            'success' => true,
            'secret' => $secret,
            'otpauthUrl' => Totp::otpAuthUrl($secret, $email),
        ]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function confirmSetup(string $userId, string $code): array
    {
        $user = DB::selectOne('SELECT totp_secret_encrypted FROM users WHERE id = ? LIMIT 1', [$userId]);
        if (! $user || empty($user->totp_secret_encrypted)) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'Inicie o setup 2FA primeiro.']];
        }
        $secret = Crypt::decryptString((string) $user->totp_secret_encrypted);
        if (! Totp::verify($secret, $code)) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'Código 2FA inválido.']];
        }
        $recovery = [];
        for ($i = 0; $i < 8; $i++) {
            $recovery[] = bin2hex(random_bytes(4));
        }
        DB::update(
            'UPDATE users SET totp_enabled_at = NOW(), totp_recovery_codes = ?::jsonb WHERE id = ?',
            [json_encode($recovery), $userId]
        );

        return ['status' => 200, 'body' => [
            'success' => true,
            'message' => '2FA ativado.',
            'recoveryCodes' => $recovery,
        ]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function verifyLoginChallenge(string $totpToken, string $code): array
    {
        try {
            $payload = $this->jwt->decode($totpToken);
        } catch (\Throwable) {
            return ['status' => 401, 'body' => ['success' => false, 'message' => 'Desafio 2FA expirado.']];
        }
        if (($payload['type'] ?? '') !== 'admin_totp_challenge') {
            return ['status' => 401, 'body' => ['success' => false, 'message' => 'Token inválido.']];
        }
        $userId = (string) ($payload['userId'] ?? '');
        $user = DB::selectOne('SELECT * FROM users WHERE id = ? LIMIT 1', [$userId]);
        if (! $user || ! $this->isEnabled($user)) {
            return ['status' => 401, 'body' => ['success' => false, 'message' => '2FA não configurado.']];
        }
        $secret = Crypt::decryptString((string) $user->totp_secret_encrypted);
        $ok = Totp::verify($secret, $code);
        if (! $ok) {
            $codes = json_decode((string) ($user->totp_recovery_codes ?? '[]'), true) ?: [];
            $codeNorm = strtolower(preg_replace('/\s+/', '', $code) ?? '');
            $idx = array_search($codeNorm, array_map('strtolower', $codes), true);
            if ($idx === false) {
                return ['status' => 401, 'body' => ['success' => false, 'message' => 'Código 2FA inválido.']];
            }
            unset($codes[$idx]);
            DB::update(
                'UPDATE users SET totp_recovery_codes = ?::jsonb WHERE id = ?',
                [json_encode(array_values($codes)), $userId]
            );
        }

        return ['status' => 200, 'body' => [
            'success' => true,
            'userId' => $userId,
            'user' => $user,
        ]];
    }

    public function challengeToken(string $userId): string
    {
        return $this->jwt->encode([
            'userId' => $userId,
            'type' => 'admin_totp_challenge',
        ], '5m');
    }
}
