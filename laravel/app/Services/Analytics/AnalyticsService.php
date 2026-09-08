<?php

namespace App\Services\Analytics;

use Illuminate\Support\Facades\DB;

class AnalyticsService
{
    /**
     * @return array{status:int, body:mixed}
     */
    public function kpis(string $userId, mixed $periodParam): array
    {
        $period = $this->parsePeriod($periodParam);
        if ($period === null) {
            return ['status' => 400, 'body' => ['message' => 'Período inválido. Deve ser entre 1 e 365 dias.']];
        }
        $row = DB::selectOne(
            "SELECT
                COUNT(*) FILTER (WHERE event_type = 'view') AS total_views,
                COUNT(*) FILTER (WHERE event_type = 'click') AS total_clicks,
                COUNT(*) FILTER (WHERE event_type = 'vcard_download') AS total_saves
             FROM analytics_events
             WHERE user_id = ? AND created_at >= NOW() - (INTERVAL '1 day' * ?) AND created_at <= NOW()",
            [$userId, $period]
        );
        $views = (int) ($row->total_views ?? 0);
        $clicks = (int) ($row->total_clicks ?? 0);
        $saves = (int) ($row->total_saves ?? 0);

        return ['status' => 200, 'body' => [
            'totalViews' => $views,
            'totalClicks' => $clicks,
            'totalSaves' => $saves,
            'clickThroughRate' => $views > 0 ? number_format(($clicks / $views) * 100, 1, '.', '') : '0.0',
        ]];
    }

    /**
     * @return array{status:int, body:mixed}
     */
    public function performance(string $userId, mixed $periodParam): array
    {
        $period = $this->parsePeriod($periodParam);
        if ($period === null) {
            return ['status' => 400, 'body' => ['message' => 'Período inválido. Deve ser entre 1 e 365 dias.']];
        }
        $rows = DB::select(
            "SELECT DATE(created_at) AS date,
                    COUNT(*) FILTER (WHERE event_type = 'view') AS views,
                    COUNT(*) FILTER (WHERE event_type = 'click') AS clicks
             FROM analytics_events
             WHERE user_id = ? AND created_at >= NOW() - (INTERVAL '1 day' * ?) AND created_at <= NOW()
             GROUP BY DATE(created_at) ORDER BY date ASC",
            [$userId, $period]
        );

        return ['status' => 200, 'body' => $rows];
    }

    /**
     * @return array{status:int, body:mixed}
     */
    public function topItems(string $userId, mixed $periodParam): array
    {
        $period = $this->parsePeriod($periodParam);
        if ($period === null) {
            return ['status' => 400, 'body' => ['message' => 'Período inválido. Deve ser entre 1 e 365 dias.']];
        }
        $rows = DB::select(
            "SELECT i.title, i.icon_class, COUNT(e.id) AS click_count
             FROM analytics_events e
             JOIN profile_items i ON e.item_id = i.id
             WHERE e.user_id = ? AND e.event_type = 'click'
               AND e.created_at >= NOW() - (INTERVAL '1 day' * ?) AND e.created_at <= NOW()
             GROUP BY i.id, i.title, i.icon_class
             ORDER BY click_count DESC LIMIT 5",
            [$userId, $period]
        );

        return ['status' => 200, 'body' => $rows];
    }

    /**
     * @return array{status:int, body:mixed}
     */
    public function details(string $userId, mixed $periodParam): array
    {
        $period = $this->parsePeriod($periodParam);
        if ($period === null) {
            return ['status' => 400, 'body' => ['message' => 'Período inválido. Deve ser entre 1 e 365 dias.']];
        }

        $clicks = DB::select(
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
            [$userId, $userId, $userId, $userId, $userId, $userId]
        );
        $periodStats = DB::selectOne(
            "SELECT
                COALESCE((SELECT COUNT(*) FROM analytics_events WHERE user_id = ? AND event_type = 'view' AND created_at >= NOW() - (INTERVAL '1 day' * ?) AND created_at <= NOW()), 0)::INTEGER AS views_period,
                COALESCE((SELECT COUNT(*) FROM analytics_events WHERE user_id = ? AND event_type = 'click' AND created_at >= NOW() - (INTERVAL '1 day' * ?) AND created_at <= NOW()), 0)::INTEGER AS clicks_period",
            [$userId, $period, $userId, $period]
        );
        $performance = DB::select(
            "SELECT DATE(created_at) AS date,
                    COALESCE(COUNT(*) FILTER (WHERE event_type = 'view'), 0)::INTEGER AS views,
                    COALESCE(COUNT(*) FILTER (WHERE event_type = 'click'), 0)::INTEGER AS clicks
             FROM analytics_events
             WHERE user_id = ? AND created_at >= NOW() - (INTERVAL '1 day' * ?) AND created_at <= NOW()
             GROUP BY DATE(created_at) ORDER BY date ASC",
            [$userId, $period]
        );
        $recent = DB::select(
            "SELECT e.created_at, pi.title, pi.destination_url AS url, pi.icon_class, e.ip_address, e.user_agent
             FROM analytics_events e
             JOIN profile_items pi ON e.item_id = pi.id
             WHERE e.user_id = ? AND e.event_type = 'click'
             ORDER BY e.created_at DESC LIMIT 20",
            [$userId]
        );
        $linksPeriod = DB::select(
            "SELECT pi.id, pi.title, COALESCE(COUNT(e.id), 0)::INTEGER AS click_count_period
             FROM profile_items pi
             LEFT JOIN analytics_events e ON pi.id = e.item_id AND e.event_type = 'click'
               AND e.created_at >= NOW() - (INTERVAL '1 day' * ?) AND e.created_at <= NOW()
             WHERE pi.user_id = ?
             GROUP BY pi.id, pi.title",
            [$period, $userId]
        );
        $periodById = [];
        foreach ($linksPeriod as $lp) {
            $periodById[(int) $lp->id] = (int) $lp->click_count_period;
        }
        $links = [];
        foreach ($clicks as $link) {
            $arr = (array) $link;
            $arr['click_count'] = (int) ($link->click_count ?? 0);
            $arr['click_count_period'] = $periodById[(int) $link->id] ?? 0;
            $links[] = $arr;
        }

        return ['status' => 200, 'body' => [
            'links' => $links,
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
            'performance' => $performance,
            'recent_clicks' => $recent,
        ]];
    }

    private function parsePeriod(mixed $period): ?int
    {
        $n = (int) ($period ?: 30);
        if ($n < 1 || $n > 365) {
            return null;
        }

        return $n;
    }
}
