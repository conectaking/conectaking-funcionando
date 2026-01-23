
const express = require('express');
const db = require('../db');
const { protectUser } = require('../middleware/protectUser');
const router = express.Router();

router.get('/kpis', protectUser, async (req, res) => {
    const userId = req.user.userId;
    const period = parseInt(req.query.period || '30', 10); // Padrão: últimos 30 dias
    
    // Validar período
    if (isNaN(period) || period < 1 || period > 365) {
        return res.status(400).json({ message: 'Período inválido. Deve ser entre 1 e 365 dias.' });
    }
    
    try {
        // Filtrar por período selecionado
        const query = `
            SELECT
                COUNT(*) FILTER (WHERE event_type = 'view') AS total_views,
                COUNT(*) FILTER (WHERE event_type = 'click') AS total_clicks,
                COUNT(*) FILTER (WHERE event_type = 'vcard_download') AS total_saves
            FROM analytics_events
            WHERE user_id = $1 
            AND created_at >= NOW() - (INTERVAL '1 day' * $2)
            AND created_at <= NOW();
        `;
        const result = await db.query(query, [userId, period]);
        
        const views = parseInt(result.rows[0].total_views, 10) || 0;
        const clicks = parseInt(result.rows[0].total_clicks, 10) || 0;
        const saves = parseInt(result.rows[0].total_saves, 10) || 0;
        
        const ctr = views > 0 ? ((clicks / views) * 100).toFixed(1) : "0.0";

        res.json({
            totalViews: views,
            totalClicks: clicks,
            totalSaves: saves,
            clickThroughRate: ctr
        });
    } catch (error) {
        console.error("Erro ao buscar KPIs de analytics:", error);
        res.status(500).json({ message: "Erro no servidor ao buscar KPIs." });
    }
});

router.get('/performance', protectUser, async (req, res) => {
    const userId = req.user.userId;
    const period = parseInt(req.query.period || '30', 10);
    
    // Validar período
    if (isNaN(period) || period < 1 || period > 365) {
        return res.status(400).json({ message: 'Período inválido. Deve ser entre 1 e 365 dias.' });
    }
    
    try {
        const query = `
            SELECT
                DATE(created_at) AS date,
                COUNT(*) FILTER (WHERE event_type = 'view') AS views,
                COUNT(*) FILTER (WHERE event_type = 'click') AS clicks
            FROM analytics_events
            WHERE user_id = $1 
            AND created_at >= NOW() - (INTERVAL '1 day' * $2)
            AND created_at <= NOW()
            GROUP BY DATE(created_at)
            ORDER BY date ASC;
        `;
        const { rows } = await db.query(query, [userId, period]);
        res.json(rows);
    } catch (error) {
        console.error("Erro ao buscar dados de performance:", error);
        res.status(500).json({ message: "Erro no servidor ao buscar dados de desempenho." });
    }
});

router.get('/top-items', protectUser, async (req, res) => {
    const userId = req.user.userId;
    const period = parseInt(req.query.period || '30', 10); // Padrão: últimos 30 dias
    
    // Validar período
    if (isNaN(period) || period < 1 || period > 365) {
        return res.status(400).json({ message: 'Período inválido. Deve ser entre 1 e 365 dias.' });
    }
    
    try {
        // Filtrar por período selecionado
        const query = `
            SELECT
                i.title,
                i.icon_class,
                COUNT(e.id) AS click_count
            FROM analytics_events e
            JOIN profile_items i ON e.item_id = i.id
            WHERE e.user_id = $1 
            AND e.event_type = 'click'
            AND e.created_at >= NOW() - (INTERVAL '1 day' * $2)
            AND e.created_at <= NOW()
            GROUP BY i.id, i.title, i.icon_class
            ORDER BY click_count DESC
            LIMIT 5;
        `;
        const { rows } = await db.query(query, [userId, period]);
        res.json(rows);
    } catch (error) {
        console.error("Erro ao buscar top itens:", error);
        res.status(500).json({ message: "Erro no servidor ao buscar top itens." });
    }
});

/**
 * @route   GET /api/analytics/details
 * @desc    Busca analytics detalhados do próprio usuário (cliques por link)
 * @access  Private (User)
 */
router.get('/details', protectUser, async (req, res) => {
    const userId = req.user.userId;
    const period = parseInt(req.query.period || '30', 10); // Padrão: últimos 30 dias
    const client = await db.pool.connect();
    try {
        // Validar período
        if (isNaN(period) || period < 1 || period > 365) {
            return res.status(400).json({ message: 'Período inválido. Deve ser entre 1 e 365 dias.' });
        }
        
        // Buscar cliques por item/link com mais detalhes
        const clicksQuery = `
            SELECT 
                pi.id,
                pi.title,
                pi.destination_url AS url,
                pi.icon_class,
                COALESCE(COUNT(e.id), 0)::INTEGER AS click_count,
                MAX(e.created_at) AS last_click_date,
                MIN(e.created_at) AS first_click_date
            FROM profile_items pi
            LEFT JOIN analytics_events e ON pi.id = e.item_id AND e.event_type = 'click'
            WHERE pi.user_id = $1
            GROUP BY pi.id, pi.title, pi.destination_url, pi.icon_class
            ORDER BY click_count DESC, pi.title ASC
        `;
        
        const { rows: clicksRows } = await client.query(clicksQuery, [userId]);
        console.log(`📊 Links encontrados para usuário ${userId}:`, clicksRows.length);
        
        // Buscar estatísticas gerais do usuário
        // Usar subquery para garantir que sempre retornamos uma linha mesmo sem dados
        const statsQuery = `
            SELECT 
                COALESCE((SELECT COUNT(*) FROM analytics_events WHERE user_id = $1 AND event_type = 'view'), 0)::INTEGER AS total_views,
                COALESCE((SELECT COUNT(*) FROM analytics_events WHERE user_id = $1 AND event_type = 'click'), 0)::INTEGER AS total_clicks,
                COALESCE((SELECT COUNT(*) FROM analytics_events WHERE user_id = $1 AND event_type = 'vcard_download'), 0)::INTEGER AS total_vcard_downloads,
                (SELECT MAX(created_at) FROM analytics_events WHERE user_id = $1 AND event_type = 'view') AS last_view_date,
                (SELECT MAX(created_at) FROM analytics_events WHERE user_id = $1 AND event_type = 'click') AS last_click_date,
                (SELECT MIN(created_at) FROM analytics_events WHERE user_id = $1 AND event_type = 'view') AS first_view_date
        `;
        
        const { rows: statsRows } = await client.query(statsQuery, [userId]);
        
        // Estatísticas por período (últimos N dias) - usar INTERVAL com multiplicação para segurança
        const periodStatsQuery = `
            SELECT 
                COALESCE((SELECT COUNT(*) FROM analytics_events WHERE user_id = $1 AND event_type = 'view' AND created_at >= NOW() - (INTERVAL '1 day' * $2) AND created_at <= NOW()), 0)::INTEGER AS views_period,
                COALESCE((SELECT COUNT(*) FROM analytics_events WHERE user_id = $1 AND event_type = 'click' AND created_at >= NOW() - (INTERVAL '1 day' * $2) AND created_at <= NOW()), 0)::INTEGER AS clicks_period
        `;
        
        const { rows: periodStatsRows } = await client.query(periodStatsQuery, [userId, period]);
        
        // Gráfico de performance (visualizações e cliques por dia)
        const performanceQuery = `
            SELECT 
                DATE(created_at) AS date,
                COALESCE(COUNT(*) FILTER (WHERE event_type = 'view'), 0)::INTEGER AS views,
                COALESCE(COUNT(*) FILTER (WHERE event_type = 'click'), 0)::INTEGER AS clicks
            FROM analytics_events
            WHERE user_id = $1 
            AND created_at >= NOW() - (INTERVAL '1 day' * $2)
            AND created_at <= NOW()
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `;
        
        const { rows: performanceRows } = await client.query(performanceQuery, [userId, period]);
        console.log(`📊 Dados de performance encontrados:`, performanceRows ? performanceRows.length : 0, 'dias');
        
        // Histórico recente de cliques (últimos 20)
        const recentClicksQuery = `
            SELECT 
                e.created_at,
                pi.title,
                pi.destination_url AS url,
                pi.icon_class,
                e.ip_address,
                e.user_agent
            FROM analytics_events e
            JOIN profile_items pi ON e.item_id = pi.id
            WHERE e.user_id = $1 
            AND e.event_type = 'click'
            ORDER BY e.created_at DESC
            LIMIT 20
        `;
        
        const { rows: recentClicksRows } = await client.query(recentClicksQuery, [userId]);
        
        // Estatísticas por link no período
        const linksPeriodQuery = `
            SELECT 
                pi.id,
                pi.title,
                COALESCE(COUNT(e.id), 0)::INTEGER AS click_count_period
            FROM profile_items pi
            LEFT JOIN analytics_events e ON pi.id = e.item_id 
                AND e.event_type = 'click'
                AND e.created_at >= NOW() - (INTERVAL '1 day' * $2)
                AND e.created_at <= NOW()
            WHERE pi.user_id = $1
            GROUP BY pi.id, pi.title
            ORDER BY click_count_period DESC
        `;
        
        const { rows: linksPeriodRows } = await client.query(linksPeriodQuery, [userId, period]);
        console.log(`📊 Estatísticas por link no período ${period} dias:`, linksPeriodRows ? linksPeriodRows.length : 0);
        
        // Combinar dados de links com estatísticas do período
        const linksWithPeriod = clicksRows.map(link => {
            const periodData = linksPeriodRows.find(l => l.id === link.id);
            return {
                ...link,
                click_count: parseInt(link.click_count) || 0,
                click_count_period: parseInt(periodData?.click_count_period || 0, 10)
            };
        });
        
        // Garantir que sempre retornamos valores numéricos, não NULL
        // As subqueries sempre retornam uma linha, então podemos usar [0] com segurança
        const stats = statsRows && statsRows.length > 0 ? statsRows[0] : {};
        const periodStats = periodStatsRows && periodStatsRows.length > 0 ? periodStatsRows[0] : {};
        
        res.json({
            links: linksWithPeriod || [],
            stats: {
                total_views: parseInt(stats.total_views) || 0,
                total_clicks: parseInt(stats.total_clicks) || 0,
                total_vcard_downloads: parseInt(stats.total_vcard_downloads) || 0,
                last_view_date: stats.last_view_date || null,
                last_click_date: stats.last_click_date || null,
                first_view_date: stats.first_view_date || null
            },
            period_stats: {
                views_period: parseInt(periodStats.views_period) || 0,
                clicks_period: parseInt(periodStats.clicks_period) || 0
            },
            performance: performanceRows || [],
            recent_clicks: recentClicksRows || []
        });
    } catch (error) {
        console.error("❌ Erro ao buscar detalhes de analytics do usuário:", error);
        console.error("📋 Stack trace:", error.stack);
        console.error("📋 Mensagem do erro:", error.message);
        console.error("📋 Código do erro:", error.code);
        console.error("📋 Detalhes:", error.detail);
        
        // Retornar mensagem de erro mais detalhada em desenvolvimento
        const errorResponse = {
            message: 'Erro ao buscar detalhes de analytics.',
            error: error.message,
            code: error.code
        };
        
        if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
            errorResponse.stack = error.stack;
            errorResponse.detail = error.detail;
        }
        
        res.status(500).json(errorResponse);
    } finally {
        client.release();
    }
});

module.exports = router;