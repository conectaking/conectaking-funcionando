/**
 * Repository: estatísticas gerais, advanced-stats, analytics e planos (admin).
 * Único que acessa o banco para overview admin.
 */
const db = require('../../../db');

async function getStats() {
    const [usersCount, codesCount, claimedCodes, viewsCount, clicksCount] = await Promise.all([
        db.query('SELECT COUNT(*) FROM users;'),
        db.query('SELECT COUNT(*) FROM registration_codes;'),
        db.query('SELECT COUNT(*) FROM registration_codes WHERE is_claimed = TRUE;'),
        db.query("SELECT COUNT(*) FROM analytics_events WHERE event_type = 'view';"),
        db.query("SELECT COUNT(*) FROM analytics_events WHERE event_type = 'click';"),
    ]);
    return {
        totalUsers: parseInt(usersCount.rows[0].count, 10),
        totalCodes: parseInt(codesCount.rows[0].count, 10),
        claimedCodes: parseInt(claimedCodes.rows[0].count, 10),
        totalViews: parseInt(viewsCount.rows[0].count, 10),
        totalClicks: parseInt(clicksCount.rows[0].count, 10),
    };
}

async function getAdvancedStatsRaw() {
    const [
        activeUsers7d,
        activeToday,
        loginsToday,
        modifiedToday,
        expiredSubscriptions,
        expiringSoon,
        usersWithProfile,
        totalLinks,
        usersLastActivity,
    ] = await Promise.all([
        db.query(`
            SELECT COUNT(DISTINCT user_id) as count FROM user_activities
            WHERE created_at >= NOW() - INTERVAL '7 days' AND created_at <= NOW()
        `),
        db.query(`
            SELECT COUNT(DISTINCT user_id) as count FROM user_activities
            WHERE DATE(created_at) = CURRENT_DATE
        `),
        db.query(`
            SELECT COUNT(DISTINCT user_id) as count FROM user_activities
            WHERE activity_type = 'login' AND DATE(created_at) = CURRENT_DATE
        `),
        db.query(`
            SELECT COUNT(DISTINCT user_id) as count FROM user_activities
            WHERE activity_type IN ('profile_update', 'link_created', 'link_updated', 'link_deleted', 'settings_updated')
            AND DATE(created_at) = CURRENT_DATE
        `),
        db.query(`
            SELECT COUNT(*) as count FROM users
            WHERE subscription_status IN ('expired', 'pre_sale_trial')
            AND (subscription_expires_at IS NULL OR subscription_expires_at < NOW())
        `),
        db.query(`
            SELECT COUNT(*) as count FROM users
            WHERE subscription_expires_at IS NOT NULL AND subscription_expires_at >= NOW()
            AND subscription_expires_at <= NOW() + INTERVAL '7 days' AND subscription_status = 'active'
        `),
        db.query('SELECT COUNT(DISTINCT user_id) as count FROM profile_items'),
        db.query('SELECT COUNT(*) as count FROM profile_items'),
        db.query(`
            SELECT u.id, u.email, p.display_name, u.subscription_status, u.subscription_expires_at,
                MAX(ua.created_at) as last_activity_date,
                CASE WHEN MAX(ua.created_at) IS NULL THEN NULL
                    WHEN DATE(MAX(ua.created_at)) = CURRENT_DATE THEN 0
                    ELSE EXTRACT(DAY FROM (NOW() - MAX(ua.created_at)))::INTEGER END as days_since_last_activity,
                CASE WHEN MAX(ua.created_at) IS NULL THEN NULL
                    WHEN DATE(MAX(ua.created_at)) = CURRENT_DATE THEN true ELSE false END as used_today
            FROM users u
            LEFT JOIN user_profiles p ON u.id = p.user_id
            LEFT JOIN user_activities ua ON u.id = ua.user_id
            GROUP BY u.id, u.email, p.display_name, u.subscription_status, u.subscription_expires_at
            ORDER BY last_activity_date DESC NULLS LAST
        `),
    ]);
    return {
        activeUsers7d: activeUsers7d.rows,
        activeToday: activeToday.rows,
        loginsToday: loginsToday.rows,
        modifiedToday: modifiedToday.rows,
        expiredSubscriptions: expiredSubscriptions.rows,
        expiringSoon: expiringSoon.rows,
        usersWithProfile: usersWithProfile.rows,
        totalLinks: totalLinks.rows,
        usersLastActivity: usersLastActivity.rows,
    };
}

async function getAnalyticsUsers() {
    const query = `
        SELECT u.id, u.email, p.display_name, u.profile_slug,
            COALESCE((SELECT COUNT(*) FROM analytics_events WHERE user_id = u.id AND event_type = 'view'), 0) AS total_views,
            COALESCE((SELECT COUNT(*) FROM analytics_events WHERE user_id = u.id AND event_type = 'click'), 0) AS total_clicks,
            (SELECT MAX(created_at) FROM analytics_events WHERE user_id = u.id AND event_type = 'view') AS last_view_date
        FROM users u
        LEFT JOIN user_profiles p ON u.id = p.user_id
        ORDER BY total_views DESC
    `;
    const { rows } = await db.query(query);
    return rows;
}

async function getAnalyticsUserDetails(userId, period) {
    const clicksQuery = `
        SELECT pi.id, pi.title, pi.destination_url AS url, pi.icon_class,
            COALESCE(COUNT(e.id), 0)::INTEGER AS click_count,
            MAX(e.created_at) AS last_click_date, MIN(e.created_at) AS first_click_date
        FROM profile_items pi
        LEFT JOIN analytics_events e ON pi.id = e.item_id AND e.event_type = 'click'
        WHERE pi.user_id = $1
        GROUP BY pi.id, pi.title, pi.destination_url, pi.icon_class
        ORDER BY click_count DESC, pi.title ASC
    `;
    const statsQuery = `
        SELECT
            COALESCE((SELECT COUNT(*) FROM analytics_events WHERE user_id = $1 AND event_type = 'view'), 0)::INTEGER AS total_views,
            COALESCE((SELECT COUNT(*) FROM analytics_events WHERE user_id = $1 AND event_type = 'click'), 0)::INTEGER AS total_clicks,
            COALESCE((SELECT COUNT(*) FROM analytics_events WHERE user_id = $1 AND event_type = 'vcard_download'), 0)::INTEGER AS total_vcard_downloads,
            (SELECT MAX(created_at) FROM analytics_events WHERE user_id = $1 AND event_type = 'view') AS last_view_date,
            (SELECT MAX(created_at) FROM analytics_events WHERE user_id = $1 AND event_type = 'click') AS last_click_date,
            (SELECT MIN(created_at) FROM analytics_events WHERE user_id = $1 AND event_type = 'view') AS first_view_date
    `;
    const periodStatsQuery = `
        SELECT
            COALESCE((SELECT COUNT(*) FROM analytics_events WHERE user_id = $1 AND event_type = 'view' AND created_at >= NOW() - (INTERVAL '1 day' * $2) AND created_at <= NOW()), 0)::INTEGER AS views_period,
            COALESCE((SELECT COUNT(*) FROM analytics_events WHERE user_id = $1 AND event_type = 'click' AND created_at >= NOW() - (INTERVAL '1 day' * $2) AND created_at <= NOW()), 0)::INTEGER AS clicks_period
    `;
    const performanceQuery = `
        SELECT DATE(created_at) AS date,
            COALESCE(COUNT(*) FILTER (WHERE event_type = 'view'), 0)::INTEGER AS views,
            COALESCE(COUNT(*) FILTER (WHERE event_type = 'click'), 0)::INTEGER AS clicks
        FROM analytics_events
        WHERE user_id = $1 AND created_at >= NOW() - (INTERVAL '1 day' * $2) AND created_at <= NOW()
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    `;
    const recentClicksQuery = `
        SELECT e.created_at, pi.title, pi.destination_url AS url, pi.icon_class, e.ip_address, e.user_agent
        FROM analytics_events e
        JOIN profile_items pi ON e.item_id = pi.id
        WHERE e.user_id = $1 AND e.event_type = 'click'
        ORDER BY e.created_at DESC
        LIMIT 20
    `;
    const linksPeriodQuery = `
        SELECT pi.id, pi.title,
            COALESCE(COUNT(e.id), 0)::INTEGER AS click_count_period
        FROM profile_items pi
        LEFT JOIN analytics_events e ON pi.id = e.item_id AND e.event_type = 'click'
            AND e.created_at >= NOW() - (INTERVAL '1 day' * $2) AND created_at <= NOW()
        WHERE pi.user_id = $1
        GROUP BY pi.id, pi.title
        ORDER BY click_count_period DESC
    `;

    const [clicksRes, statsRes, periodRes, performanceRes, recentRes, linksPeriodRes] = await Promise.all([
        db.query(clicksQuery, [userId]),
        db.query(statsQuery, [userId]),
        db.query(periodStatsQuery, [userId, period]),
        db.query(performanceQuery, [userId, period]),
        db.query(recentClicksQuery, [userId]),
        db.query(linksPeriodQuery, [userId, period]),
    ]);

    const stats = statsRes.rows && statsRes.rows[0] ? statsRes.rows[0] : {};
    const periodStats = periodRes.rows && periodRes.rows[0] ? periodRes.rows[0] : {};
    const linksWithPeriod = clicksRes.rows.map(link => {
        const periodData = linksPeriodRes.rows.find(l => l.id === link.id);
        return {
            ...link,
            click_count: parseInt(link.click_count) || 0,
            click_count_period: parseInt(periodData?.click_count_period || 0, 10),
        };
    });

    return {
        links: linksWithPeriod,
        stats: {
            total_views: parseInt(stats.total_views) || 0,
            total_clicks: parseInt(stats.total_clicks) || 0,
            total_vcard_downloads: parseInt(stats.total_vcard_downloads) || 0,
            last_view_date: stats.last_view_date || null,
            last_click_date: stats.last_click_date || null,
            first_view_date: stats.first_view_date || null,
        },
        period_stats: {
            views_period: parseInt(periodStats.views_period) || 0,
            clicks_period: parseInt(periodStats.clicks_period) || 0,
        },
        performance: performanceRes.rows || [],
        recent_clicks: recentRes.rows || [],
    };
}

async function getPlans() {
    const { rows } = await db.query(`
        SELECT id, plan_code, plan_name, price, description, is_active,
               kingbrief_minutes_per_month, created_at, updated_at
        FROM subscription_plans
        ORDER BY price ASC NULLS LAST, plan_code
    `);
    return rows;
}

async function updatePlanKingBrief(planId, minutes) {
    const { rows } = await db.query(
        `UPDATE subscription_plans
         SET kingbrief_minutes_per_month = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, plan_code, plan_name, kingbrief_minutes_per_month, updated_at`,
        [minutes, planId]
    );
    return rows[0] || null;
}

module.exports = {
    getStats,
    getAdvancedStatsRaw,
    getAnalyticsUsers,
    getAnalyticsUserDetails,
    getPlans,
    updatePlanKingBrief,
};
