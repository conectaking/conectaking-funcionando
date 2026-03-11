/**
 * Repository: relatórios/analytics (KPIs, performance, top itens, detalhes).
 */
const db = require('../../db');

async function getKpis(userId, period) {
    const { rows } = await db.query(
        `SELECT
            COUNT(*) FILTER (WHERE event_type = 'view') AS total_views,
            COUNT(*) FILTER (WHERE event_type = 'click') AS total_clicks,
            COUNT(*) FILTER (WHERE event_type = 'vcard_download') AS total_saves
         FROM analytics_events
         WHERE user_id = $1 AND created_at >= NOW() - (INTERVAL '1 day' * $2) AND created_at <= NOW()`,
        [userId, period]
    );
    return rows[0];
}

async function getPerformance(userId, period) {
    const { rows } = await db.query(
        `SELECT DATE(created_at) AS date,
                COUNT(*) FILTER (WHERE event_type = 'view') AS views,
                COUNT(*) FILTER (WHERE event_type = 'click') AS clicks
         FROM analytics_events
         WHERE user_id = $1 AND created_at >= NOW() - (INTERVAL '1 day' * $2) AND created_at <= NOW()
         GROUP BY DATE(created_at) ORDER BY date ASC`,
        [userId, period]
    );
    return rows;
}

async function getTopItems(userId, period) {
    const { rows } = await db.query(
        `SELECT i.title, i.icon_class, COUNT(e.id) AS click_count
         FROM analytics_events e
         JOIN profile_items i ON e.item_id = i.id
         WHERE e.user_id = $1 AND e.event_type = 'click'
           AND e.created_at >= NOW() - (INTERVAL '1 day' * $2) AND e.created_at <= NOW()
         GROUP BY i.id, i.title, i.icon_class
         ORDER BY click_count DESC LIMIT 5`,
        [userId, period]
    );
    return rows;
}

async function getDetailsClicks(userId) {
    const { rows } = await db.query(
        `SELECT pi.id, pi.title, pi.destination_url AS url, pi.icon_class,
                COALESCE(COUNT(e.id), 0)::INTEGER AS click_count,
                MAX(e.created_at) AS last_click_date, MIN(e.created_at) AS first_click_date
         FROM profile_items pi
         LEFT JOIN analytics_events e ON pi.id = e.item_id AND e.event_type = 'click'
         WHERE pi.user_id = $1
         GROUP BY pi.id, pi.title, pi.destination_url, pi.icon_class
         ORDER BY click_count DESC, pi.title ASC`,
        [userId]
    );
    return rows;
}

async function getDetailsStats(userId) {
    const { rows } = await db.query(
        `SELECT
            COALESCE((SELECT COUNT(*) FROM analytics_events WHERE user_id = $1 AND event_type = 'view'), 0)::INTEGER AS total_views,
            COALESCE((SELECT COUNT(*) FROM analytics_events WHERE user_id = $1 AND event_type = 'click'), 0)::INTEGER AS total_clicks,
            COALESCE((SELECT COUNT(*) FROM analytics_events WHERE user_id = $1 AND event_type = 'vcard_download'), 0)::INTEGER AS total_vcard_downloads,
            (SELECT MAX(created_at) FROM analytics_events WHERE user_id = $1 AND event_type = 'view') AS last_view_date,
            (SELECT MAX(created_at) FROM analytics_events WHERE user_id = $1 AND event_type = 'click') AS last_click_date,
            (SELECT MIN(created_at) FROM analytics_events WHERE user_id = $1 AND event_type = 'view') AS first_view_date`,
        [userId]
    );
    return rows[0] || {};
}

async function getDetailsPeriodStats(userId, period) {
    const { rows } = await db.query(
        `SELECT
            COALESCE((SELECT COUNT(*) FROM analytics_events WHERE user_id = $1 AND event_type = 'view' AND created_at >= NOW() - (INTERVAL '1 day' * $2) AND created_at <= NOW()), 0)::INTEGER AS views_period,
            COALESCE((SELECT COUNT(*) FROM analytics_events WHERE user_id = $1 AND event_type = 'click' AND created_at >= NOW() - (INTERVAL '1 day' * $2) AND created_at <= NOW()), 0)::INTEGER AS clicks_period`,
        [userId, period]
    );
    return rows[0] || {};
}

async function getDetailsPerformance(userId, period) {
    const { rows } = await db.query(
        `SELECT DATE(created_at) AS date,
                COALESCE(COUNT(*) FILTER (WHERE event_type = 'view'), 0)::INTEGER AS views,
                COALESCE(COUNT(*) FILTER (WHERE event_type = 'click'), 0)::INTEGER AS clicks
         FROM analytics_events
         WHERE user_id = $1 AND created_at >= NOW() - (INTERVAL '1 day' * $2) AND created_at <= NOW()
         GROUP BY DATE(created_at) ORDER BY date ASC`,
        [userId, period]
    );
    return rows;
}

async function getDetailsRecentClicks(userId) {
    const { rows } = await db.query(
        `SELECT e.created_at, pi.title, pi.destination_url AS url, pi.icon_class, e.ip_address, e.user_agent
         FROM analytics_events e
         JOIN profile_items pi ON e.item_id = pi.id
         WHERE e.user_id = $1 AND e.event_type = 'click'
         ORDER BY e.created_at DESC LIMIT 20`,
        [userId]
    );
    return rows;
}

async function getDetailsLinksPeriod(userId, period) {
    const { rows } = await db.query(
        `SELECT pi.id, pi.title, COALESCE(COUNT(e.id), 0)::INTEGER AS click_count_period
         FROM profile_items pi
         LEFT JOIN analytics_events e ON pi.id = e.item_id AND e.event_type = 'click'
           AND e.created_at >= NOW() - (INTERVAL '1 day' * $2) AND e.created_at <= NOW()
         WHERE pi.user_id = $1
         GROUP BY pi.id, pi.title
         ORDER BY click_count_period DESC`,
        [userId, period]
    );
    return rows;
}

module.exports = {
    getKpis,
    getPerformance,
    getTopItems,
    getDetailsClicks,
    getDetailsStats,
    getDetailsPeriodStats,
    getDetailsPerformance,
    getDetailsRecentClicks,
    getDetailsLinksPeriod,
};
