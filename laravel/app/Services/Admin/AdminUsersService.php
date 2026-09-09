<?php

namespace App\Services\Admin;

use Illuminate\Support\Facades\DB;

/**
 * Gestão de usuários no painel admin (porte de `modules/admin/users`).
 */
class AdminUsersService
{
    public const VALID_ACCOUNT_TYPES = [
        'adm_principal', 'abm', 'basic', 'premium', 'king_base', 'king_finance', 'king_finance_plus',
        'king_premium_plus', 'king_corporate', 'team_member', 'free', 'individual', 'individual_com_logo',
        'business_owner',
    ];

    /**
     * @return array<string,mixed>|null
     */
    public function dashboard(string $userId): ?array
    {
        $user = DB::selectOne(
            'SELECT u.id, u.email, u.profile_slug, u.created_at, p.display_name
             FROM users u
             LEFT JOIN user_profiles p ON u.id = p.user_id
             WHERE u.id = ?',
            [$userId]
        );
        if (! $user) {
            return null;
        }

        $logins = DB::selectOne(
            "SELECT COUNT(*) AS total, MAX(created_at) AS last_at
             FROM user_activities WHERE user_id = ? AND activity_type = 'login'",
            [$userId]
        );
        $views = DB::selectOne(
            "SELECT COUNT(*) AS total, MAX(created_at) AS last_at
             FROM analytics_events WHERE user_id = ? AND event_type = 'view'",
            [$userId]
        );
        $clicks = DB::selectOne(
            "SELECT COUNT(*) AS total, MAX(created_at) AS last_at
             FROM analytics_events WHERE user_id = ? AND event_type = 'click'",
            [$userId]
        );
        $byIp = DB::select(
            "SELECT ip_address, user_agent,
                    COUNT(*) FILTER (WHERE event_type = 'view') AS views,
                    COUNT(*) FILTER (WHERE event_type = 'click') AS clicks,
                    MAX(created_at) AS last_at
             FROM analytics_events
             WHERE user_id = ? AND (ip_address IS NOT NULL OR user_agent IS NOT NULL)
             GROUP BY ip_address, user_agent
             ORDER BY last_at DESC NULLS LAST
             LIMIT 100",
            [$userId]
        );
        $byLink = DB::select(
            "SELECT ae.item_id, pi.title, pi.item_type, pi.destination_url,
                    COUNT(*) AS clicks, MAX(ae.created_at) AS last_at
             FROM analytics_events ae
             LEFT JOIN profile_items pi ON ae.item_id = pi.id
             WHERE ae.user_id = ? AND ae.event_type = 'click'
             GROUP BY ae.item_id, pi.title, pi.item_type, pi.destination_url
             ORDER BY clicks DESC, last_at DESC NULLS LAST
             LIMIT 50",
            [$userId]
        );
        $lastLogin = DB::selectOne(
            "SELECT created_at, ip_address, user_agent
             FROM user_activities
             WHERE user_id = ? AND activity_type = 'login'
             ORDER BY created_at DESC LIMIT 1",
            [$userId]
        );
        $tagCode = DB::selectOne(
            'SELECT code FROM registration_codes
             WHERE claimed_by_user_id = ? AND is_claimed = TRUE
             ORDER BY claimed_at DESC LIMIT 1',
            [$userId]
        );

        return [
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'display_name' => $user->display_name ?: $user->email,
                'profile_slug' => $user->profile_slug,
                'tag_code' => $tagCode->code ?? null,
                'created_at' => $user->created_at,
            ],
            'logins' => [
                'total' => (int) ($logins->total ?? 0),
                'last_at' => $logins->last_at ?? null,
                'last_detail' => $lastLogin ? (array) $lastLogin : null,
            ],
            'card_views' => [
                'total' => (int) ($views->total ?? 0),
                'last_at' => $views->last_at ?? null,
            ],
            'link_clicks' => [
                'total' => (int) ($clicks->total ?? 0),
                'last_at' => $clicks->last_at ?? null,
            ],
            'by_ip' => array_map(static fn ($r) => [
                'ip_address' => $r->ip_address,
                'user_agent' => $r->user_agent,
                'views' => (int) $r->views,
                'clicks' => (int) $r->clicks,
                'last_at' => $r->last_at,
            ], $byIp),
            'by_link' => array_map(static fn ($r) => [
                'item_id' => $r->item_id,
                'title' => $r->title,
                'item_type' => $r->item_type,
                'destination_url' => $r->destination_url,
                'clicks' => (int) $r->clicks,
                'last_at' => $r->last_at,
            ], $byLink),
        ];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array<string,mixed>
     */
    public function updateManage(string $id, array $body): array
    {
        $accountType = (string) ($body['accountType'] ?? '');
        $isAdmin = $body['isAdmin'] ?? null;

        $maxInvites = $this->computeMaxInvites($accountType, $body['maxTeamInvites'] ?? null);
        if ($maxInvites === false) {
            return ['error' => 'O valor para máximo de convites é inválido.', 'status' => 400];
        }
        if (! in_array($accountType, self::VALID_ACCOUNT_TYPES, true) || ! is_bool($isAdmin)) {
            return ['error' => 'Dados inválidos.', 'status' => 400];
        }

        $activationRaw = $body['activationCode'] ?? $body['activation_code'] ?? $body['profileSlug'] ?? $body['profile_slug'] ?? null;
        $activationCode = is_string($activationRaw) ? trim($activationRaw) : null;

        return DB::transaction(function () use ($id, $body, $accountType, $isAdmin, $maxInvites, $activationCode): array {
            $current = DB::selectOne('SELECT email FROM users WHERE id = ?', [$id]);
            if (! $current) {
                return ['error' => 'Usuário não encontrado.', 'status' => 404];
            }
            $emailToUse = (string) $current->email;

            $email = $body['email'] ?? null;
            if ($email !== null && trim((string) $email) !== '') {
                $e = trim((string) $email);
                if (! $this->isValidEmail($e)) {
                    return ['error' => 'E-mail inválido.', 'status' => 400];
                }
                if ($e !== $emailToUse) {
                    $exists = DB::selectOne('SELECT id FROM users WHERE email = ? AND id != ?', [$e, $id]);
                    if ($exists) {
                        return ['error' => 'O novo e-mail já está em uso por outra conta.', 'status' => 409];
                    }
                    $emailToUse = $e;
                }
            }

            $user = DB::selectOne(
                'UPDATE users
                 SET email = ?, account_type = ?, is_admin = ?, subscription_status = ?,
                     subscription_expires_at = ?, max_team_invites = ?
                 WHERE id = ?
                 RETURNING id, email, account_type, is_admin, subscription_status,
                           subscription_expires_at, max_team_invites, profile_slug',
                [
                    $emailToUse,
                    $accountType,
                    $isAdmin,
                    ($body['subscriptionStatus'] ?? null) ?: null,
                    ($body['expiresAt'] ?? null) ?: null,
                    $maxInvites,
                    $id,
                ]
            );

            $activationResult = null;
            if ($activationCode !== null && $activationCode !== '') {
                $activationResult = $this->updateActivationCode($id, $activationCode);
                if (isset($activationResult['error'])) {
                    throw new \RuntimeException(
                        (string) $activationResult['error'],
                        (int) ($activationResult['status'] ?? 400)
                    );
                }
            }

            return [
                'user' => $user ? (array) $user : null,
                'message' => 'Usuário atualizado com sucesso!',
                'activation_code' => $activationResult['activation_code'] ?? null,
                'profile_slug' => $user->profile_slug ?? null,
            ];
        });
    }

    /**
     * Altera só o código de ativação da pulseira/tag (camuflado).
     * NÃO altera o profile_slug das Informações — a tag redireciona para o slug original.
     *
     * @return array<string,mixed>
     */
    public function updateActivationCode(string $id, string $rawCode): array
    {
        $code = trim($rawCode);
        if ($code === '' || strlen($code) > 32 || preg_match('/\s/u', $code)) {
            return ['error' => 'Código inválido. Máx. 32 caracteres, sem espaços.', 'status' => 400];
        }
        if (! preg_match('/^[A-Za-z0-9._-]+$/', $code)) {
            return ['error' => 'Código inválido. Use letras, números, hífen, ponto ou underscore.', 'status' => 400];
        }

        $user = DB::selectOne('SELECT id, profile_slug FROM users WHERE id = ?', [$id]);
        if (! $user) {
            return ['error' => 'Usuário não encontrado.', 'status' => 404];
        }

        // Não pode colidir com slug de outra conta (senão a pulseira abriria o cartão errado)
        $slugTaken = DB::selectOne(
            'SELECT id FROM users WHERE LOWER(profile_slug) = LOWER(?) AND id <> ? LIMIT 1',
            [$code, $id]
        );
        if ($slugTaken) {
            return ['error' => 'Este código já é o slug público de outra conta.', 'status' => 409];
        }

        $codeRow = DB::selectOne(
            'SELECT code, is_claimed, claimed_by_user_id FROM registration_codes WHERE LOWER(code) = LOWER(?) LIMIT 1',
            [$code]
        );
        if ($codeRow && (bool) $codeRow->is_claimed && (string) ($codeRow->claimed_by_user_id ?? '') !== (string) $id) {
            return ['error' => 'Este código já foi reivindicado por outro cliente.', 'status' => 409];
        }
        if ($codeRow && ! (bool) $codeRow->is_claimed) {
            DB::delete('DELETE FROM registration_codes WHERE LOWER(code) = LOWER(?) AND is_claimed = FALSE', [$code]);
        }

        $claimed = DB::selectOne(
            'SELECT code FROM registration_codes
             WHERE claimed_by_user_id = ? AND is_claimed = TRUE
             ORDER BY claimed_at DESC NULLS LAST
             LIMIT 1',
            [$id]
        );
        if ($claimed) {
            DB::update(
                'UPDATE registration_codes SET code = ? WHERE claimed_by_user_id = ? AND is_claimed = TRUE AND code = ?',
                [$code, $id, $claimed->code]
            );
        } else {
            DB::insert(
                'INSERT INTO registration_codes (code, is_claimed, claimed_by_user_id, claimed_at)
                 VALUES (?, TRUE, ?, NOW())',
                [$code, $id]
            );
        }

        return [
            'activation_code' => $code,
            'profile_slug' => $user->profile_slug,
            'message' => 'Código de ativação (pulseira/tag) atualizado. O slug das Informações permanece '.$user->profile_slug.'.',
        ];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array<string,mixed>
     */
    public function updateRole(string $id, array $body): array
    {
        $accountType = (string) ($body['accountType'] ?? '');
        $isAdmin = $body['isAdmin'] ?? null;
        if (! in_array($accountType, self::VALID_ACCOUNT_TYPES, true) || ! is_bool($isAdmin)) {
            return ['error' => 'Dados de atualização inválidos.', 'status' => 400];
        }
        $user = DB::selectOne(
            'UPDATE users SET account_type = ?, is_admin = ? WHERE id = ? RETURNING id, account_type, is_admin',
            [$accountType, $isAdmin, $id]
        );
        if (! $user) {
            return ['error' => 'Usuário não encontrado.', 'status' => 404];
        }

        return ['user' => (array) $user, 'message' => 'Usuário atualizado com sucesso!'];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array<string,mixed>
     */
    public function updateAccountType(string $id, array $body): array
    {
        $accountType = (string) ($body['account_type'] ?? '');
        if ($accountType === '' || ! in_array($accountType, self::VALID_ACCOUNT_TYPES, true)) {
            return ['error' => 'Tipo de conta inválido.', 'status' => 400];
        }
        $user = DB::selectOne(
            'UPDATE users SET account_type = ? WHERE id = ? RETURNING id, account_type',
            [$accountType, $id]
        );
        if (! $user) {
            return ['error' => 'Usuário não encontrado.', 'status' => 404];
        }

        return ['user' => (array) $user, 'message' => 'Tipo de conta atualizado com sucesso!'];
    }

    /**
     * @return array<string,mixed>
     */
    public function delete(string $id): array
    {
        return DB::transaction(function () use ($id): array {
            DB::delete('DELETE FROM analytics_events WHERE user_id = ?', [$id]);
            DB::delete('DELETE FROM profile_items WHERE user_id = ?', [$id]);
            DB::delete('DELETE FROM user_profiles WHERE user_id = ?', [$id]);
            DB::update('UPDATE registration_codes SET generated_by_user_id = NULL WHERE generated_by_user_id = ?', [$id]);
            $deleted = DB::delete('DELETE FROM users WHERE id = ?', [$id]);
            if ($deleted < 1) {
                return ['error' => 'Usuário não encontrado.', 'status' => 404];
            }

            return ['message' => 'Usuário e todos os seus dados foram deletados com sucesso.'];
        });
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function autoDeleteConfig(): array
    {
        return array_map(
            static fn ($r): array => (array) $r,
            DB::select('SELECT * FROM user_auto_delete_config ORDER BY days_after_expiration')
        );
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array<string,mixed>
     */
    public function saveAutoDeleteConfig(array $body): array
    {
        $days = $body['days_after_expiration'] ?? null;
        $isActive = array_key_exists('is_active', $body) ? (bool) $body['is_active'] : true;
        $config = DB::selectOne(
            'INSERT INTO user_auto_delete_config (days_after_expiration, is_active, updated_at)
             VALUES (?, ?, NOW())
             ON CONFLICT (days_after_expiration)
             DO UPDATE SET is_active = EXCLUDED.is_active, updated_at = NOW()
             RETURNING *',
            [$days, $isActive]
        );

        return ['config' => $config ? (array) $config : null, 'message' => 'Configuração salva com sucesso!'];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array<string,mixed>
     */
    public function executeAutoDelete(array $body): array
    {
        $raw = $body['days_after_expiration'] ?? null;
        $days = (int) $raw;
        if (! $raw || $days < 1) {
            return ['error' => 'Número de dias inválido. Informe um valor maior que 0.', 'status' => 400];
        }
        $cutoff = now()->subDays($days)->toDateTimeString();

        $count = (int) (DB::selectOne(
            'SELECT COUNT(*) AS count FROM users
             WHERE subscription_expires_at IS NOT NULL
               AND subscription_expires_at < ?
               AND is_admin = false',
            [$cutoff]
        )->count ?? 0);
        if ($count === 0) {
            return [
                'message' => "Nenhum usuário encontrado vencido há mais de {$days} dias para excluir.",
                'deleted' => 0,
                'count' => 0,
            ];
        }
        $deleted = DB::delete(
            'DELETE FROM users
             WHERE subscription_expires_at IS NOT NULL
               AND subscription_expires_at < ?
               AND is_admin = false',
            [$cutoff]
        );

        return [
            'message' => "Exclusão executada com sucesso! {$deleted} usuário(s) vencido(s) há mais de {$days} dias foram excluído(s).",
            'deleted' => $deleted,
            'count' => $count,
        ];
    }

    /**
     * @return int|null|false false = valor inválido; null = ilimitado não se aplica aqui
     */
    private function computeMaxInvites(string $accountType, mixed $maxTeamInvites): int|false
    {
        if ($accountType === 'king_corporate' || $accountType === 'business_owner') {
            if (! is_numeric($maxTeamInvites)) {
                return false;
            }
            $n = (int) $maxTeamInvites;

            return $n < 0 ? false : $n;
        }
        if ($accountType === 'adm_principal' || $accountType === 'abm') {
            return 999;
        }

        return 3;
    }

    private function isValidEmail(string $value): bool
    {
        $t = trim($value);

        return $t !== '' && preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]+$/', $t) === 1;
    }
}
