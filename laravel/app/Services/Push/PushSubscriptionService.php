<?php

namespace App\Services\Push;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Subscrições Web Push (utils/pushNotificationService.js — parte de leitura/escrita).
 */
class PushSubscriptionService
{
    public function vapidPublicKey(): string
    {
        return trim((string) (env('VAPID_PUBLIC_KEY') ?: ''));
    }

    /**
     * Cria ou atualiza a subscrição (chave natural: endpoint).
     */
    public function save(string $userId, string $endpoint, string $p256dh, string $auth, ?string $userAgent): int
    {
        if (! Schema::hasTable('push_subscriptions')) {
            throw new \RuntimeException('Tabela push_subscriptions indisponível.');
        }

        $existing = DB::selectOne('SELECT id FROM push_subscriptions WHERE endpoint = ? LIMIT 1', [$endpoint]);

        if ($existing) {
            DB::update(
                'UPDATE push_subscriptions
                 SET user_id = ?, p256dh_key = ?, auth_key = ?, user_agent = ?, updated_at = NOW()
                 WHERE endpoint = ?',
                [$userId, $p256dh, $auth, $userAgent, $endpoint]
            );

            return (int) $existing->id;
        }

        $row = DB::selectOne(
            'INSERT INTO push_subscriptions (user_id, endpoint, p256dh_key, auth_key, user_agent)
             VALUES (?, ?, ?, ?, ?) RETURNING id',
            [$userId, $endpoint, $p256dh, $auth, $userAgent]
        );

        return (int) ($row->id ?? 0);
    }
}
