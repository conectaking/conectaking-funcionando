<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AnalyticsLogService
{
    public function logEvent(string $userId, string $eventType, ?int $itemId, Request $request): void
    {
        try {
            $ip = $request->headers->get('x-forwarded-for')
                ?: $request->ip();
            if (is_string($ip) && str_contains($ip, ',')) {
                $ip = trim(explode(',', $ip)[0]);
            }
            $ua = $request->userAgent();

            DB::insert(
                'INSERT INTO analytics_events (user_id, event_type, item_id, ip_address, user_agent)
                 VALUES (?, ?, ?, ?, ?)',
                [$userId, $eventType, $itemId, $ip, $ua]
            );
        } catch (\Throwable $e) {
            Log::warning('analytics.logEvent', ['error' => $e->getMessage()]);
        }
    }

    public function resolveUserIdForItem(int $itemId): ?string
    {
        $row = DB::selectOne('SELECT user_id FROM profile_items WHERE id = ? LIMIT 1', [$itemId]);

        return $row ? (string) $row->user_id : null;
    }
}
