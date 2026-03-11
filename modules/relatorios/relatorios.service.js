/**
 * Service: relatórios (KPIs, performance, top itens, detalhes).
 */
const repository = require('./relatorios.repository');

const PERIOD_MIN = 1;
const PERIOD_MAX = 365;

function parsePeriod(period) {
    const n = parseInt(period || '30', 10);
    if (isNaN(n) || n < PERIOD_MIN || n > PERIOD_MAX) return null;
    return n;
}

async function getKpis(userId, periodParam) {
    const period = parsePeriod(periodParam);
    if (period === null) return { error: 'Período inválido. Deve ser entre 1 e 365 dias.', status: 400 };
    const row = await repository.getKpis(userId, period);
    const views = parseInt(row?.total_views, 10) || 0;
    const clicks = parseInt(row?.total_clicks, 10) || 0;
    const saves = parseInt(row?.total_saves, 10) || 0;
    const ctr = views > 0 ? ((clicks / views) * 100).toFixed(1) : '0.0';
    return {
        totalViews: views,
        totalClicks: clicks,
        totalSaves: saves,
        clickThroughRate: ctr,
    };
}

async function getPerformance(userId, periodParam) {
    const period = parsePeriod(periodParam);
    if (period === null) return { error: 'Período inválido. Deve ser entre 1 e 365 dias.', status: 400 };
    return repository.getPerformance(userId, period);
}

async function getTopItems(userId, periodParam) {
    const period = parsePeriod(periodParam);
    if (period === null) return { error: 'Período inválido. Deve ser entre 1 e 365 dias.', status: 400 };
    return repository.getTopItems(userId, period);
}

async function getDetails(userId, periodParam) {
    const period = parsePeriod(periodParam);
    if (period === null) return { error: 'Período inválido. Deve ser entre 1 e 365 dias.', status: 400 };

    const [
        clicksRows,
        statsRows,
        periodStatsRows,
        performanceRows,
        recentClicksRows,
        linksPeriodRows,
    ] = await Promise.all([
        repository.getDetailsClicks(userId),
        repository.getDetailsStats(userId),
        repository.getDetailsPeriodStats(userId, period),
        repository.getDetailsPerformance(userId, period),
        repository.getDetailsRecentClicks(userId),
        repository.getDetailsLinksPeriod(userId, period),
    ]);

    const linksWithPeriod = (clicksRows || []).map((link) => {
        const periodData = (linksPeriodRows || []).find((l) => l.id === link.id);
        return {
            ...link,
            click_count: parseInt(link.click_count, 10) || 0,
            click_count_period: parseInt(periodData?.click_count_period || 0, 10),
        };
    });

    const stats = statsRows || {};
    const periodStats = periodStatsRows || {};

    return {
        links: linksWithPeriod,
        stats: {
            total_views: parseInt(stats.total_views, 10) || 0,
            total_clicks: parseInt(stats.total_clicks, 10) || 0,
            total_vcard_downloads: parseInt(stats.total_vcard_downloads, 10) || 0,
            last_view_date: stats.last_view_date || null,
            last_click_date: stats.last_click_date || null,
            first_view_date: stats.first_view_date || null,
        },
        period_stats: {
            views_period: parseInt(periodStats.views_period, 10) || 0,
            clicks_period: parseInt(periodStats.clicks_period, 10) || 0,
        },
        performance: performanceRows || [],
        recent_clicks: recentClicksRows || [],
    };
}

module.exports = {
    getKpis,
    getPerformance,
    getTopItems,
    getDetails,
};
