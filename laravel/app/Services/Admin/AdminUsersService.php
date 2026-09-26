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
            DB::update('UPDATE registration_codes SET is_claimed = FALSE, claimed_by_user_id = NULL, claimed_at = NULL WHERE claimed_by_user_id = ?', [$id]);
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

    public const PLAN_MAP = [
        'start' => 'basic',
        'king start' => 'basic',
        'basic' => 'basic',
        'prime' => 'premium',
        'king prime' => 'premium',
        'premium' => 'premium',
        'essential' => 'king_base',
        'king essential' => 'king_base',
        'king_base' => 'king_base',
        'finance' => 'king_finance',
        'king finance' => 'king_finance',
        'king_finance' => 'king_finance',
        'finance plus' => 'king_finance_plus',
        'king finance plus' => 'king_finance_plus',
        'king_finance_plus' => 'king_finance_plus',
        'premium plus' => 'king_premium_plus',
        'king premium plus' => 'king_premium_plus',
        'king_premium_plus' => 'king_premium_plus',
        'corporate' => 'king_corporate',
        'king corporate' => 'king_corporate',
        'king_corporate' => 'king_corporate',
        'empresa' => 'king_corporate',
        'individual' => 'individual',
        'free' => 'free',
        'business_owner' => 'business_owner',
        'adm_principal' => 'adm_principal',
    ];

    public const PLAN_NAMES = [
        'basic' => 'King Start',
        'premium' => 'King Prime',
        'king_base' => 'King Essential',
        'king_finance' => 'King Finance',
        'king_finance_plus' => 'King Finance Plus',
        'king_premium_plus' => 'King Premium Plus',
        'king_corporate' => 'King Corporate',
        'individual' => 'Individual',
        'free' => 'Free',
        'business_owner' => 'Business Owner',
        'adm_principal' => 'ADM Principal',
    ];

    /**
     * Cadastro direto de cliente pelo Administrador / Bot King.
     *
     * @param array<string,mixed> $data
     * @return array<string,mixed>
     */
    public function createUser(array $data): array
    {
        $email = strtolower(trim((string) ($data['email'] ?? '')));
        $password = (string) ($data['password'] ?? '');

        if ($email === '' || $password === '') {
            return ['error' => 'E-mail e senha são obrigatórios.', 'status' => 400];
        }
        if (! $this->isValidEmail($email)) {
            return ['error' => 'Formato de e-mail inválido.', 'status' => 400];
        }

        $exists = DB::selectOne('SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1', [$email]);
        if ($exists) {
            return ['error' => "O e-mail {$email} já está cadastrado no Conecta King.", 'status' => 409];
        }

        $rawCode = strtoupper(trim((string) ($data['code'] ?? $data['registrationCode'] ?? '')));
        if ($rawCode === '') {
            $rawCode = 'KING-' . strtoupper(substr(bin2hex(random_bytes(3)), 0, 5));
        }

        $codeRow = DB::selectOne('SELECT * FROM registration_codes WHERE UPPER(code) = ? LIMIT 1', [$rawCode]);
        if ($codeRow && (bool) $codeRow->is_claimed) {
            return ['error' => "O código de convite {$rawCode} já foi utilizado.", 'status' => 409];
        }

        $planKey = strtolower(trim((string) ($data['accountType'] ?? $data['plan'] ?? 'individual')));
        $accountType = self::PLAN_MAP[$planKey] ?? (in_array($planKey, self::VALID_ACCOUNT_TYPES, true) ? $planKey : 'individual');

        $days = isset($data['days']) && is_numeric($data['days']) ? (int) $data['days'] : 30;
        $expiresAt = isset($data['expiresAt']) && ! empty($data['expiresAt'])
            ? (string) $data['expiresAt']
            : now()->addDays($days)->format('Y-m-d H:i:s');

        $status = (string) ($data['subscriptionStatus'] ?? 'active');
        $isAdmin = filter_var($data['isAdmin'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $displayName = (string) ($data['name'] ?? $data['displayName'] ?? $email);

        return DB::transaction(function () use ($rawCode, $email, $password, $accountType, $expiresAt, $status, $isAdmin, $displayName, $codeRow): array {
            $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 10]);
            DB::insert(
                'INSERT INTO users (id, email, password_hash, profile_slug, account_type, is_admin, subscription_status, subscription_expires_at, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
                [$rawCode, $email, $hash, $rawCode, $accountType, $isAdmin, $status, $expiresAt]
            );

            if (! $codeRow) {
                DB::insert(
                    'INSERT INTO registration_codes (code, is_claimed, claimed_by_user_id, claimed_at, created_at) VALUES (?, TRUE, ?, NOW(), NOW())',
                    [$rawCode, $rawCode]
                );
            } else {
                DB::update(
                    'UPDATE registration_codes SET is_claimed = TRUE, claimed_by_user_id = ?, claimed_at = NOW() WHERE UPPER(code) = ?',
                    [$rawCode, $rawCode]
                );
            }

            if (\App\Support\SchemaMeta::hasTable('user_profiles')) {
                DB::insert(
                    'INSERT INTO user_profiles (user_id, display_name, logo_spacing, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
                    [$rawCode, $displayName, 'center']
                );
            }

            try {
                $id = DB::selectOne(
                    "INSERT INTO profile_items (user_id, item_type, title, is_active, display_order)
                     VALUES (?, 'bible', 'Bíblia', true, 0) RETURNING id",
                    [$rawCode]
                );
                if ($id && \App\Support\SchemaMeta::hasTable('bible_items')) {
                    DB::insert(
                        "INSERT INTO bible_items (profile_item_id, translation_code, is_visible) VALUES (?, 'nvi', true)",
                        [$id->id]
                    );
                }
            } catch (\Throwable $e) {}

            return [
                'success' => true,
                'message' => 'Cliente cadastrado com sucesso!',
                'user' => [
                    'id' => $rawCode,
                    'email' => $email,
                    'display_name' => $displayName,
                    'profile_slug' => $rawCode,
                    'tag_code' => $rawCode,
                    'account_type' => $accountType,
                    'plan_name' => self::PLAN_NAMES[$accountType] ?? $accountType,
                    'subscription_status' => $status,
                    'subscription_expires_at' => $expiresAt,
                ],
                'login_url' => 'https://www.conectaking.com.br/login'
            ];
        });
    }

    /**
     * Gestão rápida de usuário (alterar plano, renovar tag/assinatura, alterar código) por identificador flexível.
     *
     * @param array<string,mixed> $data
     * @return array<string,mixed>
     */
    public function quickManage(array $data): array
    {
        $idOrEmail = trim((string) ($data['identifier'] ?? $data['user'] ?? $data['id'] ?? $data['email'] ?? ''));
        if ($idOrEmail === '') {
            return ['error' => 'Identificador do cliente (e-mail, código da tag ou ID) é obrigatório.', 'status' => 400];
        }

        $user = DB::selectOne(
            'SELECT u.*, p.display_name,
                    (SELECT c.code FROM registration_codes c WHERE c.claimed_by_user_id = u.id AND c.is_claimed = TRUE ORDER BY c.claimed_at DESC NULLS LAST LIMIT 1) AS tag_code
             FROM users u
             LEFT JOIN user_profiles p ON u.id = p.user_id
             WHERE LOWER(u.email) = LOWER(?)
                OR LOWER(u.id) = LOWER(?)
                OR LOWER(u.profile_slug) = LOWER(?)
             LIMIT 1',
            [$idOrEmail, $idOrEmail, $idOrEmail]
        );

        if (! $user) {
            $user = DB::selectOne(
                'SELECT u.*, p.display_name, c.code AS tag_code
                 FROM registration_codes c
                 INNER JOIN users u ON c.claimed_by_user_id = u.id
                 LEFT JOIN user_profiles p ON u.id = p.user_id
                 WHERE LOWER(c.code) = LOWER(?)
                 LIMIT 1',
                [$idOrEmail]
            );
        }

        if (! $user) {
            return ['error' => "Cliente '{$idOrEmail}' não foi encontrado no sistema.", 'status' => 404];
        }

        $userId = (string) $user->id;

        // 0. Exclusão de Cliente
        $action = strtolower(trim((string) ($data['action'] ?? '')));
        if ($action === 'delete' || ! empty($data['deleteUser'])) {
            if ($user->account_type === 'adm_principal') {
                return ['error' => 'Não é permitido excluir o usuário Administrador Principal.', 'status' => 403];
            }
            $delRes = $this->delete($userId);
            if (isset($delRes['error'])) {
                return $delRes;
            }

            return [
                'success' => true,
                'message' => "Cliente '{$user->email}' e todos os seus dados foram excluídos com sucesso do sistema.",
                'deleted' => true,
                'user' => [
                    'id' => $user->id,
                    'email' => $user->email,
                    'display_name' => $user->display_name ?: $user->email,
                    'tag_code' => $user->tag_code ?? $user->profile_slug ?? '',
                ],
            ];
        }

        $updates = [];
        $params = [];
        $appliedChanges = [];

        // 0.1 Alteração de E-mail
        $newEmail = trim((string) ($data['newEmail'] ?? $data['new_email'] ?? ($action === 'change_email' ? ($data['email'] ?? '') : '')));
        if ($newEmail !== '' && strtolower($newEmail) !== strtolower($user->email)) {
            if (! filter_var($newEmail, FILTER_VALIDATE_EMAIL)) {
                return ['error' => "O e-mail '{$newEmail}' é inválido.", 'status' => 400];
            }
            $existing = DB::selectOne('SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ? LIMIT 1', [$newEmail, $userId]);
            if ($existing) {
                return ['error' => "O e-mail '{$newEmail}' já está cadastrado para outro usuário.", 'status' => 400];
            }
            $updates[] = 'email = ?';
            $params[] = strtolower($newEmail);
            $appliedChanges[] = "E-mail alterado de '{$user->email}' para '{$newEmail}'";
        }

        // 0.2 Redefinição de Senha
        $newPass = trim((string) ($data['newPassword'] ?? $data['new_password'] ?? ($action === 'change_password' ? ($data['password'] ?? '') : '')));
        if ($newPass !== '' && ($action === 'change_password' || ! empty($data['newPassword']) || ! empty($data['new_password']))) {
            $updates[] = 'password = ?';
            $params[] = \Illuminate\Support\Facades\Hash::make($newPass);
            $appliedChanges[] = "Senha de acesso alterada para '{$newPass}'";
        }

        // 0.3 Definir Administrador (colocar no ADM / tirar do ADM)
        if (isset($data['isAdmin']) || $action === 'set_admin' || $action === 'remove_admin' || ! empty($data['setAdmin'])) {
            $makeAdmin = (isset($data['isAdmin']) ? (bool) $data['isAdmin'] : ($action === 'set_admin' || ! empty($data['setAdmin'])));
            $updates[] = 'is_admin = ?';
            $params[] = $makeAdmin;
            if ($makeAdmin && ! in_array($user->account_type, ['adm_principal', 'abm'], true)) {
                $updates[] = 'account_type = ?';
                $params[] = 'abm';
            } elseif (! $makeAdmin && $user->account_type === 'abm') {
                $updates[] = 'account_type = ?';
                $params[] = 'individual';
            }
            $appliedChanges[] = $makeAdmin ? 'Privilégios de Administrador CONCEDIDOS (Cargo ADM ativado)' : 'Privilégios de Administrador REVOGADOS';
        }

        // 1. Alteração de Plano
        $planInput = trim((string) ($data['newPlan'] ?? $data['plan'] ?? $data['accountType'] ?? ''));
        if ($planInput !== '') {
            $planKey = strtolower($planInput);
            $newAccountType = self::PLAN_MAP[$planKey] ?? (in_array($planKey, self::VALID_ACCOUNT_TYPES, true) ? $planKey : null);
            if (! $newAccountType) {
                return ['error' => "Plano '{$planInput}' não reconhecido. Planos válidos: King Start, King Prime, King Essential, King Finance, King Finance Plus, King Premium Plus, King Corporate.", 'status' => 400];
            }
            $updates[] = 'account_type = ?';
            $params[] = $newAccountType;
            $appliedChanges[] = "Plano alterado para " . (self::PLAN_NAMES[$newAccountType] ?? $newAccountType);
        }

        // 2. Renovação de Validade / Tag
        $newExpiresAt = null;
        if (isset($data['renewMonths']) && is_numeric($data['renewMonths'])) {
            $months = (int) $data['renewMonths'];
            $base = ($user->subscription_expires_at && strtotime($user->subscription_expires_at) > time())
                ? \Illuminate\Support\Carbon::parse($user->subscription_expires_at)
                : now();
            $newExpiresAt = $base->addMonths($months)->format('Y-m-d H:i:s');
            $appliedChanges[] = "Validade renovada por {$months} mês(es) (até " . \Illuminate\Support\Carbon::parse($newExpiresAt)->format('d/m/Y') . ")";
        } elseif (isset($data['renewDays']) && is_numeric($data['renewDays'])) {
            $days = (int) $data['renewDays'];
            $base = ($user->subscription_expires_at && strtotime($user->subscription_expires_at) > time())
                ? \Illuminate\Support\Carbon::parse($user->subscription_expires_at)
                : now();
            $newExpiresAt = $base->addDays($days)->format('Y-m-d H:i:s');
            $appliedChanges[] = "Validade estendida por {$days} dia(s) (até " . \Illuminate\Support\Carbon::parse($newExpiresAt)->format('d/m/Y') . ")";
        } elseif (isset($data['expiresAt']) && ! empty($data['expiresAt'])) {
            $rawExp = trim((string) $data['expiresAt']);
            $parsedDate = null;
            if (preg_match('/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/', $rawExp, $m)) {
                $day = str_pad($m[1], 2, '0', STR_PAD_LEFT);
                $month = str_pad($m[2], 2, '0', STR_PAD_LEFT);
                $year = $m[3];
                $hour = isset($m[4]) ? str_pad($m[4], 2, '0', STR_PAD_LEFT) : '23';
                $min = $m[5] ?? '59';
                $sec = $m[6] ?? '59';
                $parsedDate = "{$year}-{$month}-{$day} {$hour}:{$min}:{$sec}";
            } else {
                $ts = strtotime($rawExp);
                if ($ts !== false && $ts > 0) {
                    $parsedDate = date('Y-m-d H:i:s', $ts);
                }
            }
            if ($parsedDate) {
                $newExpiresAt = $parsedDate;
                $appliedChanges[] = "Validade definida até " . \Illuminate\Support\Carbon::parse($newExpiresAt)->format('d/m/Y');
            }
        }

        if ($newExpiresAt !== null) {
            $updates[] = 'subscription_expires_at = ?';
            $params[] = $newExpiresAt;
            $updates[] = "subscription_status = 'active'";
        }

        // 3. Status de Assinatura
        if (isset($data['subscriptionStatus']) && ! empty($data['subscriptionStatus'])) {
            $updates[] = 'subscription_status = ?';
            $params[] = (string) $data['subscriptionStatus'];
        }

        if ($updates !== []) {
            $params[] = $userId;
            DB::update('UPDATE users SET ' . implode(', ', $updates) . ', updated_at = NOW() WHERE id = ?', $params);
        }

        // 4. Alteração de Tag Code
        $newTag = trim((string) ($data['newTagCode'] ?? $data['tagCode'] ?? $data['activationCode'] ?? ''));
        if ($newTag !== '') {
            $tagRes = $this->updateActivationCode($userId, $newTag);
            if (isset($tagRes['error'])) {
                return ['error' => (string) $tagRes['error'], 'status' => (int) ($tagRes['status'] ?? 400)];
            }
            $appliedChanges[] = "Código da Tag alterado para '{$newTag}'";
        }

        $fresh = DB::selectOne(
            'SELECT u.id, u.email, u.profile_slug, u.account_type, u.subscription_status, u.subscription_expires_at,
                    p.display_name,
                    (SELECT c.code FROM registration_codes c WHERE c.claimed_by_user_id = u.id AND c.is_claimed = TRUE ORDER BY c.claimed_at DESC NULLS LAST LIMIT 1) AS tag_code
             FROM users u
             LEFT JOIN user_profiles p ON u.id = p.user_id
             WHERE u.id = ?',
            [$userId]
        );

        return [
            'success' => true,
            'message' => count($appliedChanges) > 0 ? implode(' | ', $appliedChanges) : 'Dados consultados com sucesso.',
            'changes' => $appliedChanges,
            'user' => [
                'id' => $fresh->id,
                'email' => $fresh->email,
                'display_name' => $fresh->display_name ?: $fresh->email,
                'profile_slug' => $fresh->profile_slug,
                'tag_code' => $fresh->tag_code ?? $fresh->profile_slug,
                'account_type' => $fresh->account_type,
                'plan_name' => self::PLAN_NAMES[$fresh->account_type] ?? $fresh->account_type,
                'subscription_status' => $fresh->subscription_status,
                'subscription_expires_at' => $fresh->subscription_expires_at,
                'formatted_expires_at' => $fresh->subscription_expires_at ? \Illuminate\Support\Carbon::parse($fresh->subscription_expires_at)->format('d/m/Y') : 'Vitalício/Sem data',
            ]
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
