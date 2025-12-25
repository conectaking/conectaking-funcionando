/**
 * Script para testar a API de analytics e ver o que ela retorna
 */

const { Pool } = require('pg');

const pool = new Pool({
    user: 'conecta_king_db_user',
    host: 'virginia-postgres.render.com',
    database: 'conecta_king_db',
    password: 'LGiJv1hsYj7VujzIePXzWDKQnZDBHMJg',
    port: 5432,
    ssl: {
        rejectUnauthorized: false
    }
});

async function testarQueries() {
    console.log('🧪 TESTANDO QUERIES DA API DE ANALYTICS\n');
    console.log('='.repeat(60));
    
    const client = await pool.connect();
    const userId = 'ADRIANO-KING';
    const period = 30;
    
    try {
        // 1. Testar query de cliques por link (clicksQuery)
        console.log('\n1️⃣ Testando query de cliques por link...');
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
        console.log(`   ✅ Retornou ${clicksRows.length} links`);
        
        if (clicksRows.length > 0) {
            console.log('   📋 Primeiros 3 links:');
            clicksRows.slice(0, 3).forEach((link, i) => {
                console.log(`      ${i + 1}. ${link.title || 'Sem título'} - Cliques: ${link.click_count}, Último: ${link.last_click_date ? new Date(link.last_click_date).toLocaleString('pt-BR') : 'Nunca'}`);
            });
        }
        
        // 2. Testar query de estatísticas gerais
        console.log('\n2️⃣ Testando query de estatísticas gerais...');
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
        const stats = statsRows[0];
        console.log('   ✅ Estatísticas:');
        console.log(`      - Total Views: ${stats.total_views}`);
        console.log(`      - Total Clicks: ${stats.total_clicks}`);
        console.log(`      - Total vCards: ${stats.total_vcard_downloads}`);
        console.log(`      - Último Clique: ${stats.last_click_date ? new Date(stats.last_click_date).toLocaleString('pt-BR') : 'Nunca'}`);
        
        // 3. Testar query de período
        console.log(`\n3️⃣ Testando query de período (${period} dias)...`);
        const periodStatsQuery = `
            SELECT 
                COALESCE((SELECT COUNT(*) FROM analytics_events WHERE user_id = $1 AND event_type = 'view' AND created_at >= NOW() - (INTERVAL '1 day' * $2) AND created_at <= NOW()), 0)::INTEGER AS views_period,
                COALESCE((SELECT COUNT(*) FROM analytics_events WHERE user_id = $1 AND event_type = 'click' AND created_at >= NOW() - (INTERVAL '1 day' * $2) AND created_at <= NOW()), 0)::INTEGER AS clicks_period
        `;
        
        const { rows: periodStatsRows } = await client.query(periodStatsQuery, [userId, period]);
        const periodStats = periodStatsRows[0];
        console.log('   ✅ Estatísticas do período:');
        console.log(`      - Views no período: ${periodStats.views_period}`);
        console.log(`      - Clicks no período: ${periodStats.clicks_period}`);
        
        // 4. Testar query de performance
        console.log(`\n4️⃣ Testando query de performance (${period} dias)...`);
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
        console.log(`   ✅ Retornou ${performanceRows.length} dias de performance`);
        if (performanceRows.length > 0) {
            console.log('   📋 Últimos 3 dias:');
            performanceRows.slice(-3).forEach((p, i) => {
                console.log(`      ${i + 1}. ${p.date}: ${p.views} views, ${p.clicks} clicks`);
            });
        }
        
        // 5. Testar query de cliques por link no período
        console.log(`\n5️⃣ Testando query de cliques por link no período...`);
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
        console.log(`   ✅ Retornou ${linksPeriodRows.length} links com estatísticas de período`);
        
        const linksWithClicks = linksPeriodRows.filter(l => parseInt(l.click_count_period) > 0);
        if (linksWithClicks.length > 0) {
            console.log('   📋 Links com cliques no período:');
            linksWithClicks.forEach(link => {
                console.log(`      - ${link.title || 'Sem título'} (ID: ${link.id}): ${link.click_count_period} cliques`);
            });
        } else {
            console.log('   ⚠️ Nenhum link com cliques no período');
        }
        
        // 6. Simular resposta completa da API
        console.log('\n6️⃣ Simulando resposta completa da API...');
        const linksWithPeriod = clicksRows.map(link => {
            const periodData = linksPeriodRows.find(l => l.id === link.id);
            return {
                ...link,
                click_count: parseInt(link.click_count) || 0,
                click_count_period: parseInt(periodData?.click_count_period || 0, 10)
            };
        });
        
        const responseData = {
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
            recent_clicks: [] // Simplificado para o teste
        };
        
        console.log('   ✅ Resposta simulada:');
        console.log(`      - Links: ${responseData.links.length}`);
        console.log(`      - Total Clicks: ${responseData.stats.total_clicks}`);
        console.log(`      - Clicks no período: ${responseData.period_stats.clicks_period}`);
        console.log(`      - Links com cliques: ${responseData.links.filter(l => l.click_count > 0).length}`);
        
        const linksComCliques = responseData.links.filter(l => l.click_count > 0);
        if (linksComCliques.length > 0) {
            console.log('\n   📋 Links que DEVEM aparecer no dashboard:');
            linksComCliques.forEach((link, i) => {
                console.log(`      ${i + 1}. ${link.title || 'Sem título'}:`);
                console.log(`         - Cliques totais: ${link.click_count}`);
                console.log(`         - Cliques no período: ${link.click_count_period}`);
                console.log(`         - Último clique: ${link.last_click_date ? new Date(link.last_click_date).toLocaleString('pt-BR') : 'Nunca'}`);
            });
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ TESTE CONCLUÍDO!');
        console.log('\n💡 CONCLUSÃO:');
        console.log('   Se os dados aparecem aqui mas não no dashboard,');
        console.log('   o problema está no FRONTEND (admin.js) que não está');
        console.log('   processando ou exibindo os dados corretamente.');
        
    } catch (error) {
        console.error('\n❌ Erro ao testar queries:', error.message);
        console.error('Código:', error.code);
        if (error.detail) {
            console.error('Detalhes:', error.detail);
        }
    } finally {
        client.release();
        await pool.end();
    }
}

testarQueries().catch(error => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
});
