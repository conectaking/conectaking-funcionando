<?php

namespace App\Services\Account;

use App\Services\AuditLogService;
use App\Support\SchemaMeta;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class LgpdService
{
    public function __construct(private readonly AuditLogService $audit)
    {
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function export(string $userId): array
    {
        $user = DB::selectOne(
            'SELECT id, email, account_type, subscription_status, subscription_expires_at, created_at, profile_slug
             FROM users WHERE id = ? LIMIT 1',
            [$userId]
        );
        if (! $user) {
            return ['status' => 404, 'body' => ['success' => false, 'message' => 'Usuário não encontrado.']];
        }

        $profile = null;
        if (SchemaMeta::hasTable('user_profiles')) {
            $profile = DB::selectOne('SELECT * FROM user_profiles WHERE user_id = ? LIMIT 1', [$userId]);
        }
        $items = [];
        if (SchemaMeta::hasTable('profile_items')) {
            $items = DB::select(
                'SELECT id, item_type, title, is_active, display_order, created_at FROM profile_items WHERE user_id = ? ORDER BY display_order',
                [$userId]
            );
        }

        $payload = [
            'exportedAt' => gmdate('c'),
            'user' => (array) $user,
            'profile' => $profile ? (array) $profile : null,
            'profileItems' => array_map(static fn ($r) => (array) $r, $items),
        ];

        $this->audit->log($userId, 'export', 'account', null, ['lgpd' => true]);

        return ['status' => 200, 'body' => [
            'success' => true,
            'data' => $payload,
        ]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function requestDeletion(string $userId, string $password): array
    {
        $user = DB::selectOne('SELECT id, password_hash, email FROM users WHERE id = ? LIMIT 1', [$userId]);
        if (! $user || empty($user->password_hash) || ! password_verify($password, (string) $user->password_hash)) {
            return ['status' => 401, 'body' => ['success' => false, 'message' => 'Senha incorreta.']];
        }
        if (! Schema::hasTable('account_deletion_requests')) {
            return ['status' => 503, 'body' => ['success' => false, 'message' => 'Exclusão LGPD ainda não migrada.']];
        }

        $token = bin2hex(random_bytes(24));
        $hash = hash('sha256', $token);
        DB::delete("DELETE FROM account_deletion_requests WHERE user_id = ? AND status = 'pending'", [$userId]);
        DB::insert(
            "INSERT INTO account_deletion_requests (user_id, token_hash, status, scheduled_at)
             VALUES (?, ?, 'pending', NOW() + interval '30 days')",
            [$userId, $hash]
        );

        $this->audit->log($userId, 'delete_request', 'account', null, ['lgpd' => true]);

        return ['status' => 200, 'body' => [
            'success' => true,
            'message' => 'Pedido de exclusão registado. A conta será removida em até 30 dias. Guarde o token de confirmação se quiser antecipar.',
            'confirmToken' => $token,
            'scheduledDays' => 30,
        ]];
    }

    /**
     * Hard-delete imediato com token (opcional).
     *
     * @return array{status:int, body:array<string,mixed>}
     */
    public function confirmDeletion(string $userId, string $token): array
    {
        if (! Schema::hasTable('account_deletion_requests')) {
            return ['status' => 503, 'body' => ['success' => false, 'message' => 'Exclusão LGPD ainda não migrada.']];
        }
        $hash = hash('sha256', trim($token));
        $row = DB::selectOne(
            "SELECT id FROM account_deletion_requests
             WHERE user_id = ? AND token_hash = ? AND status = 'pending' LIMIT 1",
            [$userId, $hash]
        );
        if (! $row) {
            return ['status' => 400, 'body' => ['success' => false, 'message' => 'Token de exclusão inválido.']];
        }

        try {
            DB::transaction(function () use ($userId, $row) {
                if (SchemaMeta::hasTable('refresh_tokens')) {
                    DB::delete('DELETE FROM refresh_tokens WHERE user_id = ?', [$userId]);
                }
                if (SchemaMeta::hasTable('profile_items')) {
                    DB::delete('DELETE FROM profile_items WHERE user_id = ?', [$userId]);
                }
                if (SchemaMeta::hasTable('user_profiles')) {
                    DB::delete('DELETE FROM user_profiles WHERE user_id = ?', [$userId]);
                }
                DB::update(
                    "UPDATE account_deletion_requests SET status = 'completed', completed_at = NOW() WHERE id = ?",
                    [$row->id]
                );
                DB::delete('DELETE FROM users WHERE id = ?', [$userId]);
            });
        } catch (\Throwable $e) {
            Log::error('lgpd.delete', ['error' => $e->getMessage(), 'userId' => $userId]);

            return ['status' => 500, 'body' => ['success' => false, 'message' => 'Falha ao excluir conta. Contacte o suporte.']];
        }

        $this->audit->log($userId, 'delete_confirm', 'account', null, ['lgpd' => true]);

        return ['status' => 200, 'body' => [
            'success' => true,
            'message' => 'Conta excluída.',
        ]];
    }
}
