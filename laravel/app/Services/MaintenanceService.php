<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Manutenção diária (paridade com server.js + utils/cleanup.js do Node).
 */
class MaintenanceService
{
    /**
     * @return array{expired_active:int, expiring_soon:int}
     */
    public function expireSubscriptionsMorning(): array
    {
        $expiringSoon = (int) (DB::selectOne(
            "SELECT COUNT(*)::int AS c FROM users
             WHERE subscription_status = 'active'
               AND subscription_expires_at BETWEEN NOW() + interval '2 days' AND NOW() + interval '3 days'"
        )->c ?? 0);

        $expired = DB::affectingStatement(
            "UPDATE users
             SET account_type = 'free', subscription_status = 'expired'
             WHERE subscription_expires_at < NOW()
               AND subscription_status IN ('active', 'active_onetime')"
        );

        Log::info('maintenance.subscriptions.morning', [
            'expired_active' => $expired,
            'expiring_soon' => $expiringSoon,
        ]);

        return ['expired_active' => $expired, 'expiring_soon' => $expiringSoon];
    }

    /**
     * @return array{expired_trial:int, expired_individual:int}
     */
    public function expireSubscriptionsMidnight(): array
    {
        $trial = DB::affectingStatement(
            "UPDATE users
             SET account_type = 'free', subscription_status = 'expired_trial'
             WHERE subscription_expires_at < NOW()
               AND subscription_status = 'pre_sale_trial'"
        );

        $individual = DB::affectingStatement(
            "UPDATE users
             SET account_type = 'free', subscription_status = 'expired'
             WHERE subscription_expires_at < NOW()
               AND account_type = 'individual'
               AND subscription_status = 'active'"
        );

        Log::info('maintenance.subscriptions.midnight', [
            'expired_trial' => $trial,
            'expired_individual' => $individual,
        ]);

        return ['expired_trial' => $trial, 'expired_individual' => $individual];
    }

    /**
     * @return array{refresh_tokens:int, password_reset_tokens:int, cache:int}
     */
    public function cleanupExpiredData(): array
    {
        $refresh = 0;
        $password = 0;
        $cache = 0;

        try {
            if (Schema::hasTable('refresh_tokens')) {
                $refresh = DB::table('refresh_tokens')->where('expires_at', '<', now())->delete();
            }
        } catch (\Throwable $e) {
            Log::warning('maintenance.cleanup.refresh_tokens', ['error' => $e->getMessage()]);
        }

        try {
            if (Schema::hasTable('password_reset_tokens')) {
                $password = DB::table('password_reset_tokens')->where('expires_at', '<', now())->delete();
            }
        } catch (\Throwable $e) {
            Log::warning('maintenance.cleanup.password_reset_tokens', ['error' => $e->getMessage()]);
        }

        try {
            if (Schema::hasTable('cache') && Schema::hasColumn('cache', 'expires_at')) {
                $cache = DB::table('cache')->where('expires_at', '<', now())->delete();
            }
        } catch (\Throwable $e) {
            // tabela pode não existir — ok
        }

        Log::info('maintenance.cleanup', compact('refresh', 'password', 'cache'));

        return [
            'refresh_tokens' => $refresh,
            'password_reset_tokens' => $password,
            'cache' => $cache,
        ];
    }
}
