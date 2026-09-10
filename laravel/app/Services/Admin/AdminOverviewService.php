<?php

namespace App\Services\Admin;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Visão geral do admin (`modules/admin/overview` + listagens de users/codes).
 */
class AdminOverviewService
{
    /**
     * @return array<string,int>
     */
    public function stats(): array
    {
        return [
            'totalUsers' => $this->count('SELECT COUNT(*) AS count FROM users', [], 'users'),
            'totalCodes' => $this->count('SELECT COUNT(*) AS count FROM registration_codes', [], 'registration_codes'),
            'claimedCodes' => $this->count(
                'SELECT COUNT(*) AS count FROM registration_codes WHERE is_claimed = TRUE',
                [],
                'registration_codes'
            ),
            'totalViews' => $this->count(
                'SELECT COUNT(*) AS count FROM analytics_events WHERE event_type = ?',
                ['view'],
                'analytics_events'
            ),
            'totalClicks' => $this->count(
                'SELECT COUNT(*) AS count FROM analytics_events WHERE event_type = ?',
                ['click'],
                'analytics_events'
            ),
        ];
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function plans(): array
    {
        if (! Schema::hasTable('subscription_plans')) {
            return [];
        }

        return $this->rows(
            'SELECT id, plan_code, plan_name, price, description, is_active,
                    kingbrief_minutes_per_month, created_at, updated_at
             FROM subscription_plans
             ORDER BY price ASC NULLS LAST, plan_code'
        );
    }

    /**
     * @return array<string,mixed>|null
     */
    public function updatePlanKingBrief(int $planId, ?int $minutes): ?array
    {
        $row = DB::selectOne(
            'UPDATE subscription_plans
             SET kingbrief_minutes_per_month = ?, updated_at = NOW()
             WHERE id = ?
             RETURNING id, plan_code, plan_name, kingbrief_minutes_per_month, updated_at',
            [$minutes, $planId]
        );

        return $row ? (array) $row : null;
    }

    /**
     * Listagem paginada de users.
     * Contrato: { items, total, limit, offset, hasMore }. Default limit 100, max 200.
     *
     * @return array{items:list<array<string,mixed>>,total:int,limit:int,offset:int,hasMore:bool}
     */
    public function users(int $limit = 100, int $offset = 0): array
    {
        $limit = max(1, min(200, $limit));
        $offset = max(0, $offset);

        if (! Schema::hasTable('users')) {
            return ['items' => [], 'total' => 0, 'limit' => $limit, 'offset' => $offset, 'hasMore' => false];
        }

        $total = $this->count('SELECT COUNT(*) AS count FROM users', [], 'users');
        $items = $this->rows(
            'SELECT u.id, p.display_name, u.email, u.profile_slug, u.is_admin, u.created_at,
                    u.account_type, u.parent_user_id, parent.email AS parent_email,
                    u.subscription_status, u.subscription_expires_at, u.max_team_invites,
                    (
                        SELECT c.code FROM registration_codes c
                        WHERE c.claimed_by_user_id = u.id AND c.is_claimed = TRUE
                        ORDER BY c.claimed_at DESC NULLS LAST
                        LIMIT 1
                    ) AS tag_code
             FROM users u
             LEFT JOIN user_profiles p ON u.id = p.user_id
             LEFT JOIN users parent ON u.parent_user_id = parent.id
             ORDER BY u.created_at DESC
             LIMIT ? OFFSET ?',
            [$limit, $offset]
        );

        return [
            'items' => $items,
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
            'hasMore' => ($offset + count($items)) < $total,
        ];
    }

    /**
     * Listagem paginada de codes.
     * Contrato: { items, total, limit, offset, hasMore }. Default limit 100, max 200.
     *
     * @return array{items:list<array<string,mixed>>,total:int,limit:int,offset:int,hasMore:bool}
     */
    public function codes(?string $filter, int $limit = 100, int $offset = 0): array
    {
        $limit = max(1, min(200, $limit));
        $offset = max(0, $offset);

        if (! Schema::hasTable('registration_codes')) {
            return ['items' => [], 'total' => 0, 'limit' => $limit, 'offset' => $offset, 'hasMore' => false];
        }

        $where = '';
        if ($filter === 'expired') {
            $where = 'WHERE c.expires_at IS NOT NULL AND c.expires_at < NOW()';
        } elseif ($filter === 'active') {
            $where = 'WHERE c.expires_at IS NULL OR c.expires_at >= NOW()';
        }

        $total = $this->count(
            "SELECT COUNT(*) AS count FROM registration_codes c {$where}",
            [],
            'registration_codes'
        );
        $items = $this->rows(
            "SELECT c.code, c.is_claimed, c.created_at, c.claimed_at, c.expires_at,
                    u.email AS claimed_by_email, gen.email AS generated_by_email,
                    CASE
                        WHEN c.expires_at IS NULL THEN 'no_expiration'
                        WHEN c.expires_at < NOW() THEN 'expired'
                        ELSE 'active'
                    END AS expiration_status
             FROM registration_codes c
             LEFT JOIN users u ON c.claimed_by_user_id = u.id
             LEFT JOIN users gen ON c.generated_by_user_id = gen.id
             {$where}
             ORDER BY c.created_at DESC
             LIMIT ? OFFSET ?",
            [$limit, $offset]
        );

        return [
            'items' => $items,
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
            'hasMore' => ($offset + count($items)) < $total,
        ];
    }

    /**
     * Estatísticas avançadas: contagens via SQL COUNT; listas LIMIT 100 ORDER BY.
     *
     * @return array<string,mixed>
     */
    public function advancedStats(): array
    {
        $expiredWhere = "(subscription_expires_at IS NOT NULL
            AND COALESCE(subscription_status, '') <> 'free'
            AND subscription_expires_at < NOW())";
        $activeWhere = "NOT {$expiredWhere}";

        $activitySelect = "SELECT u.id, u.email, p.display_name, u.subscription_status, u.subscription_expires_at,
                    MAX(ua.created_at) AS last_activity_date,
                    CASE WHEN MAX(ua.created_at) IS NULL THEN NULL
                         WHEN DATE(MAX(ua.created_at)) = CURRENT_DATE THEN 0
                         ELSE EXTRACT(DAY FROM (NOW() - MAX(ua.created_at)))::INTEGER END AS days_since_last_activity,
                    CASE WHEN MAX(ua.created_at) IS NULL THEN NULL
                         WHEN DATE(MAX(ua.created_at)) = CURRENT_DATE THEN true ELSE false END AS used_today
             FROM users u
             LEFT JOIN user_profiles p ON u.id = p.user_id
             LEFT JOIN user_activities ua ON u.id = ua.user_id
             GROUP BY u.id, u.email, p.display_name, u.subscription_status, u.subscription_expires_at";

        $baseRow = static fn (array $u): array => [
            'id' => $u['id'],
            'email' => $u['email'],
            'displayName' => $u['display_name'] ?: $u['email'],
            'subscriptionStatus' => $u['subscription_status'],
            'subscriptionExpiresAt' => $u['subscription_expires_at'],
            'lastActivityDate' => $u['last_activity_date'],
            'daysSinceLastActivity' => $u['days_since_last_activity'],
        ];

        $usersActivity = $this->rows(
            "SELECT * FROM ({$activitySelect}) act
             ORDER BY last_activity_date DESC NULLS LAST
             LIMIT 100"
        );

        $activeUsersList = $this->rows(
            "SELECT * FROM ({$activitySelect}) act
             WHERE {$activeWhere}
             ORDER BY last_activity_date DESC NULLS LAST
             LIMIT 100"
        );

        $expiredUsersList = $this->rows(
            "SELECT * FROM ({$activitySelect}) act
             WHERE {$expiredWhere}
             ORDER BY subscription_expires_at ASC NULLS LAST
             LIMIT 100"
        );

        $activeUsersCount = $this->count(
            "SELECT COUNT(*) AS count FROM users u
             WHERE NOT (u.subscription_expires_at IS NOT NULL
                AND COALESCE(u.subscription_status, '') <> 'free'
                AND u.subscription_expires_at < NOW())",
            [],
            'users'
        );
        $expiredUsersCount = $this->count(
            "SELECT COUNT(*) AS count FROM users u
             WHERE u.subscription_expires_at IS NOT NULL
               AND COALESCE(u.subscription_status, '') <> 'free'
               AND u.subscription_expires_at < NOW()",
            [],
            'users'
        );
        $notUsedToday = $this->count(
            "SELECT COUNT(*) AS count FROM (
                SELECT u.id,
                       MAX(ua.created_at) AS last_activity_date,
                       CASE WHEN MAX(ua.created_at) IS NULL THEN NULL
                            WHEN DATE(MAX(ua.created_at)) = CURRENT_DATE THEN true ELSE false END AS used_today
                FROM users u
                LEFT JOIN user_activities ua ON u.id = ua.user_id
                GROUP BY u.id
             ) t
             WHERE used_today IS DISTINCT FROM true OR last_activity_date IS NULL",
            [],
            'users'
        );

        return [
            'activeUsers7d' => $this->count(
                "SELECT COUNT(DISTINCT user_id) AS count FROM user_activities
                 WHERE created_at >= NOW() - INTERVAL '7 days' AND created_at <= NOW()",
                [],
                'user_activities'
            ),
            'activeUsersToday' => $this->count(
                'SELECT COUNT(DISTINCT user_id) AS count FROM user_activities WHERE DATE(created_at) = CURRENT_DATE',
                [],
                'user_activities'
            ),
            'loginsToday' => $this->count(
                "SELECT COUNT(DISTINCT user_id) AS count FROM user_activities
                 WHERE activity_type = 'login' AND DATE(created_at) = CURRENT_DATE",
                [],
                'user_activities'
            ),
            'modifiedToday' => $this->count(
                "SELECT COUNT(DISTINCT user_id) AS count FROM user_activities
                 WHERE activity_type IN ('profile_update', 'link_created', 'link_updated', 'link_deleted', 'settings_updated')
                   AND DATE(created_at) = CURRENT_DATE",
                [],
                'user_activities'
            ),
            'expiredSubscriptions' => $this->count(
                "SELECT COUNT(*) AS count FROM users
                 WHERE subscription_status IN ('expired', 'pre_sale_trial')
                   AND (subscription_expires_at IS NULL OR subscription_expires_at < NOW())",
                [],
                'users'
            ),
            'expiringSoon' => $this->count(
                "SELECT COUNT(*) AS count FROM users
                 WHERE subscription_expires_at IS NOT NULL AND subscription_expires_at >= NOW()
                   AND subscription_expires_at <= NOW() + INTERVAL '7 days' AND subscription_status = 'active'",
                [],
                'users'
            ),
            'usersWithProfile' => $this->count(
                'SELECT COUNT(DISTINCT user_id) AS count FROM profile_items',
                [],
                'profile_items'
            ),
            'totalLinks' => $this->count('SELECT COUNT(*) AS count FROM profile_items', [], 'profile_items'),
            'notUsedToday' => $notUsedToday,
            'activeUsersCount' => $activeUsersCount,
            'expiredUsersCount' => $expiredUsersCount,
            'usersActivity' => array_map(static function (array $u) use ($baseRow): array {
                $exp = $u['subscription_expires_at'] ?? null;
                $isExpired = $exp
                    && ($u['subscription_status'] ?? null) !== 'free'
                    && strtotime((string) $exp) < time();

                return $baseRow($u) + [
                    'usedToday' => (bool) ($u['used_today'] ?? false),
                    'isExpired' => $isExpired,
                ];
            }, $usersActivity),
            'activeUsersList' => array_map($baseRow, $activeUsersList),
            'expiredUsersList' => array_map(static function (array $u) use ($baseRow): array {
                $exp = $u['subscription_expires_at'] ?? null;
                $daysExpired = $exp
                    ? (int) floor((time() - strtotime((string) $exp)) / 86400)
                    : null;

                return $baseRow($u) + ['daysExpired' => $daysExpired];
            }, $expiredUsersList),
        ];
    }

    /**
     * Analytics por user, paginado.
     * Contrato: { items, total, limit, offset, hasMore }. Default limit 100, max 200.
     *
     * @return array{items:list<array<string,mixed>>,total:int,limit:int,offset:int,hasMore:bool}
     */
    public function analyticsUsers(int $limit = 100, int $offset = 0): array
    {
        $limit = max(1, min(200, $limit));
        $offset = max(0, $offset);

        if (! Schema::hasTable('analytics_events') || ! Schema::hasTable('users')) {
            return ['items' => [], 'total' => 0, 'limit' => $limit, 'offset' => $offset, 'hasMore' => false];
        }

        $total = $this->count('SELECT COUNT(*) AS count FROM users', [], 'users');
        $items = $this->rows(
            "SELECT u.id, u.email, p.display_name, u.profile_slug,
                    COALESCE(a.total_views, 0) AS total_views,
                    COALESCE(a.total_clicks, 0) AS total_clicks,
                    a.last_view_date
             FROM users u
             LEFT JOIN user_profiles p ON u.id = p.user_id
             LEFT JOIN (
                 SELECT user_id,
                        COUNT(*) FILTER (WHERE event_type = 'view') AS total_views,
                        COUNT(*) FILTER (WHERE event_type = 'click') AS total_clicks,
                        MAX(created_at) FILTER (WHERE event_type = 'view') AS last_view_date
                 FROM analytics_events
                 GROUP BY user_id
             ) a ON a.user_id = u.id
             ORDER BY total_views DESC
             LIMIT ? OFFSET ?",
            [$limit, $offset]
        );

        return [
            'items' => $items,
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
            'hasMore' => ($offset + count($items)) < $total,
        ];
    }

    /**
     * @return array<string,mixed>
     */
    public function analyticsUserDetails(string $userId, int $period): array
    {
        $links = DB::select(
            "SELECT pi.id, pi.title, pi.destination_url AS url, pi.icon_class,
                    COALESCE(COUNT(e.id), 0)::INTEGER AS click_count,
                    MAX(e.created_at) AS last_click_date, MIN(e.created_at) AS first_click_date
             FROM profile_items pi
             LEFT JOIN analytics_events e ON pi.id = e.item_id AND e.event_type = 'click'
             WHERE pi.user_id = ?
             GROUP BY pi.id, pi.title, pi.destination_url, pi.icon_class
             ORDER BY click_count DESC, pi.title ASC",
            [$userId]
        );
        $stats = DB::selectOne(
            "SELECT
                COALESCE((SELECT COUNT(*) FROM analytics_events WHERE user_id = ? AND event_type = 'view'), 0)::INTEGER AS total_views,
                COALESCE((SELECT COUNT(*) FROM analytics_events WHERE user_id = ? AND event_type = 'click'), 0)::INTEGER AS total_clicks,
                COALESCE((SELECT COUNT(*) FROM analytics_events WHERE user_id = ? AND event_type = 'vcard_download'), 0)::INTEGER AS total_vcard_downloads,
                (SELECT MAX(created_at) FROM analytics_events WHERE user_id = ? AND event_type = 'view') AS last_view_date,
                (SELECT MAX(created_at) FROM analytics_events WHERE user_id = ? AND event_type = 'click') AS last_click_date,
                (SELECT MIN(created_at) FROM analytics_events WHERE user_id = ? AND event_type = 'view') AS first_view_date",
            array_fill(0, 6, $userId)
        );
        $periodStats = DB::selectOne(
            "SELECT
                COALESCE((SELECT COUNT(*) FROM analytics_events WHERE user_id = ? AND event_type = 'view'
                          AND created_at >= NOW() - (INTERVAL '1 day' * ?) AND created_at <= NOW()), 0)::INTEGER AS views_period,
                COALESCE((SELECT COUNT(*) FROM analytics_events WHERE user_id = ? AND event_type = 'click'
                          AND created_at >= NOW() - (INTERVAL '1 day' * ?) AND created_at <= NOW()), 0)::INTEGER AS clicks_period",
            [$userId, $period, $userId, $period]
        );
        $performance = DB::select(
            "SELECT DATE(created_at) AS date,
                    COALESCE(COUNT(*) FILTER (WHERE event_type = 'view'), 0)::INTEGER AS views,
                    COALESCE(COUNT(*) FILTER (WHERE event_type = 'click'), 0)::INTEGER AS clicks
             FROM analytics_events
             WHERE user_id = ? AND created_at >= NOW() - (INTERVAL '1 day' * ?) AND created_at <= NOW()
             GROUP BY DATE(created_at)
             ORDER BY date ASC",
            [$userId, $period]
        );
        $recentClicks = DB::select(
            "SELECT e.created_at, pi.title, pi.destination_url AS url, pi.icon_class, e.ip_address, e.user_agent
             FROM analytics_events e
             JOIN profile_items pi ON e.item_id = pi.id
             WHERE e.user_id = ? AND e.event_type = 'click'
             ORDER BY e.created_at DESC
             LIMIT 20",
            [$userId]
        );
        $linksPeriod = DB::select(
            "SELECT pi.id, COALESCE(COUNT(e.id), 0)::INTEGER AS click_count_period
             FROM profile_items pi
             LEFT JOIN analytics_events e ON pi.id = e.item_id AND e.event_type = 'click'
                 AND e.created_at >= NOW() - (INTERVAL '1 day' * ?) AND e.created_at <= NOW()
             WHERE pi.user_id = ?
             GROUP BY pi.id",
            [$period, $userId]
        );
        $periodByItem = [];
        foreach ($linksPeriod as $row) {
            $periodByItem[(string) $row->id] = (int) $row->click_count_period;
        }

        return [
            'links' => array_map(static function ($link) use ($periodByItem): array {
                $row = (array) $link;
                $row['click_count'] = (int) ($row['click_count'] ?? 0);
                $row['click_count_period'] = $periodByItem[(string) ($row['id'] ?? '')] ?? 0;

                return $row;
            }, $links),
            'stats' => [
                'total_views' => (int) ($stats->total_views ?? 0),
                'total_clicks' => (int) ($stats->total_clicks ?? 0),
                'total_vcard_downloads' => (int) ($stats->total_vcard_downloads ?? 0),
                'last_view_date' => $stats->last_view_date ?? null,
                'last_click_date' => $stats->last_click_date ?? null,
                'first_view_date' => $stats->first_view_date ?? null,
            ],
            'period_stats' => [
                'views_period' => (int) ($periodStats->views_period ?? 0),
                'clicks_period' => (int) ($periodStats->clicks_period ?? 0),
            ],
            'performance' => array_map(static fn ($r): array => (array) $r, $performance),
            'recent_clicks' => array_map(static fn ($r): array => (array) $r, $recentClicks),
        ];
    }

    /**
     * @param  array<int,mixed>  $bindings
     */
    private function count(string $sql, array $bindings, string $table): int
    {
        if (! Schema::hasTable($table)) {
            return 0;
        }

        return (int) (DB::selectOne($sql, $bindings)->count ?? 0);
    }

    /**
     * @param  array<int,mixed>  $bindings
     * @return array<int,array<string,mixed>>
     */
    private function rows(string $sql, array $bindings = []): array
    {
        return array_map(static fn ($row): array => (array) $row, DB::select($sql, $bindings));
    }
}
