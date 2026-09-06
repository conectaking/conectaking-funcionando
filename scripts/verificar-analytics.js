/**
 * Script para verificar se a tabela analytics_events foi criada e se hÃ¡ dados
 */

const { Pool } = require('pg');

const pool = new Pool({
    user: 'conecta_king_db_user',
    host: process.env.DB_HOST || '127.0.0.1',
    database: 'conecta_king_db',
    password: 'LGiJv1hsYj7VujzIePXzWDKQnZDBHMJg',
    port: 5432,
    ssl: {
        rejectUnauthorized: false
    }
});

async function verificar() {
    const client = await pool.connect();
    
    try {
        console.log('ðŸ” VERIFICAÃ‡ÃƒO COMPLETA DO BANCO DE DADOS\n');
        console.log('='.repeat(60));
        
        // 1. Verificar se a tabela existe
        console.log('\n1ï¸âƒ£ Verificando se a tabela analytics_events existe...');
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'analytics_events'
            ) AS existe
        `);
        
        if (tableCheck.rows[0].existe) {
            console.log('âœ… Tabela analytics_events EXISTE no banco');
        } else {
            console.log('âŒ ERRO: Tabela analytics_events NÃƒO EXISTE!');
            console.log('ðŸš¨ PRECISA EXECUTAR A MIGRATION!');
            await pool.end();
            return;
        }
        
        // 2. Verificar estrutura da tabela
        console.log('\n2ï¸âƒ£ Verificando estrutura da tabela...');
        const structure = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'analytics_events'
            ORDER BY ordinal_position
        `);
        
        console.log('ðŸ“‹ Colunas encontradas:');
        structure.rows.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
        });
        
        // 3. Verificar Ã­ndices
        console.log('\n3ï¸âƒ£ Verificando Ã­ndices...');
        const indexes = await client.query(`
            SELECT indexname
            FROM pg_indexes
            WHERE tablename = 'analytics_events'
            ORDER BY indexname
        `);
        
        console.log(`ðŸ“Š Ãndices encontrados (${indexes.rows.length}):`);
        indexes.rows.forEach(idx => {
            console.log(`   - ${idx.indexname}`);
        });
        
        // 4. Verificar dados existentes
        console.log('\n4ï¸âƒ£ Verificando dados existentes na tabela...');
        const dados = await client.query(`
            SELECT 
                COUNT(*) as total_eventos,
                COUNT(DISTINCT user_id) as usuarios_unicos,
                COUNT(DISTINCT item_id) as itens_unicos,
                COUNT(*) FILTER (WHERE event_type = 'view') as total_visualizacoes,
                COUNT(*) FILTER (WHERE event_type = 'click') as total_cliques,
                COUNT(*) FILTER (WHERE event_type = 'vcard_download') as total_downloads,
                MIN(created_at) as primeiro_evento,
                MAX(created_at) as ultimo_evento
            FROM analytics_events
        `);
        
        const stats = dados.rows[0];
        console.log(`ðŸ“Š EstatÃ­sticas:`);
        console.log(`   - Total de eventos: ${stats.total_eventos}`);
        console.log(`   - UsuÃ¡rios Ãºnicos: ${stats.usuarios_unicos}`);
        console.log(`   - Itens Ãºnicos: ${stats.itens_unicos}`);
        console.log(`   - VisualizaÃ§Ãµes: ${stats.total_visualizacoes}`);
        console.log(`   - Cliques: ${stats.total_cliques}`);
        console.log(`   - Downloads vCard: ${stats.total_downloads}`);
        console.log(`   - Primeiro evento: ${stats.primeiro_evento || 'Nenhum'}`);
        console.log(`   - Ãšltimo evento: ${stats.ultimo_evento || 'Nenhum'}`);
        
        // 5. Verificar cliques por usuÃ¡rio (especialmente ADRIANO-KING)
        console.log('\n5ï¸âƒ£ Verificando cliques para ADRIANO-KING...');
        const adrianoClicks = await client.query(`
            SELECT 
                COUNT(*) as total_cliques,
                COUNT(DISTINCT item_id) as links_com_cliques,
                MIN(created_at) as primeiro_clique,
                MAX(created_at) as ultimo_clique
            FROM analytics_events
            WHERE user_id = 'ADRIANO-KING' 
            AND event_type = 'click'
        `);
        
        const adrianoStats = adrianoClicks.rows[0];
        console.log(`ðŸ“Š Cliques para ADRIANO-KING:`);
        console.log(`   - Total de cliques: ${adrianoStats.total_cliques}`);
        console.log(`   - Links com cliques: ${adrianoStats.links_com_cliques}`);
        console.log(`   - Primeiro clique: ${adrianoStats.primeiro_clique || 'Nenhum'}`);
        console.log(`   - Ãšltimo clique: ${adrianoStats.ultimo_clique || 'Nenhum'}`);
        
        // 6. Verificar links do ADRIANO-KING
        console.log('\n6ï¸âƒ£ Verificando links cadastrados para ADRIANO-KING...');
        const links = await client.query(`
            SELECT id, title, item_type, destination_url, icon_class
            FROM profile_items
            WHERE user_id = 'ADRIANO-KING'
            ORDER BY id
        `);
        
        console.log(`ðŸ“‹ Links encontrados (${links.rows.length}):`);
        links.rows.forEach((link, index) => {
            console.log(`   ${index + 1}. ID: ${link.id} - ${link.title || 'Sem tÃ­tulo'} (${link.item_type})`);
        });
        
        // 7. Verificar cliques por link do ADRIANO-KING
        if (links.rows.length > 0) {
            console.log('\n7ï¸âƒ£ Verificando cliques por link do ADRIANO-KING...');
            for (const link of links.rows) {
                const linkClicks = await client.query(`
                    SELECT 
                        COUNT(*) as total,
                        MIN(created_at) as primeiro,
                        MAX(created_at) as ultimo
                    FROM analytics_events
                    WHERE user_id = 'ADRIANO-KING'
                    AND event_type = 'click'
                    AND item_id = $1
                `, [link.id]);
                
                const clicks = linkClicks.rows[0];
                console.log(`   - ${link.title || 'Sem tÃ­tulo'} (ID: ${link.id}):`);
                console.log(`     Cliques: ${clicks.total} | Primeiro: ${clicks.primeiro || 'Nunca'} | Ãšltimo: ${clicks.ultimo || 'Nunca'}`);
            }
        }
        
        // 8. Verificar eventos recentes
        console.log('\n8ï¸âƒ£ Ãšltimos 10 eventos registrados...');
        const recentes = await client.query(`
            SELECT 
                id,
                user_id,
                event_type,
                item_id,
                created_at
            FROM analytics_events
            ORDER BY created_at DESC
            LIMIT 10
        `);
        
        if (recentes.rows.length > 0) {
            console.log('ðŸ“‹ Eventos recentes:');
            recentes.rows.forEach(evt => {
                console.log(`   - ${evt.created_at.toLocaleString('pt-BR')} | ${evt.user_id} | ${evt.event_type} | item_id: ${evt.item_id || 'NULL'}`);
            });
        } else {
            console.log('   âš ï¸ Nenhum evento registrado ainda');
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('âœ… VERIFICAÃ‡ÃƒO CONCLUÃDA!');
        
        if (parseInt(stats.total_cliques) === 0) {
            console.log('\nâš ï¸ ATENÃ‡ÃƒO: NÃ£o hÃ¡ cliques registrados ainda!');
            console.log('   Isso pode significar:');
            console.log('   1. NinguÃ©m clicou nos links ainda');
            console.log('   2. O cÃ³digo de registro de cliques nÃ£o estÃ¡ funcionando');
            console.log('   3. Os links nÃ£o tÃªm o atributo data-item-id');
        }
        
    } catch (error) {
        console.error('\nâŒ Erro ao verificar:', error.message);
        console.error('CÃ³digo:', error.code);
        if (error.detail) {
            console.error('Detalhes:', error.detail);
        }
    } finally {
        client.release();
        await pool.end();
    }
}

verificar().catch(error => {
    console.error('\nâŒ Erro fatal:', error);
    process.exit(1);
});
