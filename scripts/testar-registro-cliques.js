/**
 * Script para testar se o registro de cliques estÃ¡ funcionando
 * Uso: node scripts/testar-registro-cliques.js
 */

const { Pool } = require('pg');
const fetch = require('node-fetch');

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

async function testarRegistroCliques() {
    console.log('ðŸ§ª TESTE DE REGISTRO DE CLIQUES\n');
    console.log('='.repeat(60));
    
    const client = await pool.connect();
    
    try {
        // 1. Buscar links do ADRIANO-KING para testar
        console.log('\n1ï¸âƒ£ Buscando links do ADRIANO-KING...');
        const linksRes = await client.query(`
            SELECT id, title, item_type, destination_url
            FROM profile_items
            WHERE user_id = 'ADRIANO-KING'
            ORDER BY id
            LIMIT 5
        `);
        
        if (linksRes.rows.length === 0) {
            console.log('âŒ Nenhum link encontrado para ADRIANO-KING');
            return;
        }
        
        console.log(`âœ… Encontrados ${linksRes.rows.length} links para testar:\n`);
        linksRes.rows.forEach((link, index) => {
            console.log(`   ${index + 1}. ID: ${link.id} - ${link.title || 'Sem tÃ­tulo'} (${link.item_type})`);
        });
        
        // 2. Verificar cliques antes do teste
        console.log('\n2ï¸âƒ£ Verificando cliques ANTES do teste...');
        const antes = await client.query(`
            SELECT COUNT(*) as total
            FROM analytics_events
            WHERE user_id = 'ADRIANO-KING'
            AND event_type = 'click'
        `);
        const totalAntes = parseInt(antes.rows[0].total);
        console.log(`   Cliques antes: ${totalAntes}`);
        
        // 3. Simular cliques via API
        console.log('\n3ï¸âƒ£ Simulando cliques via API...');
        const API_URL = 'https://www.conectaking.com.br';
        
        for (const link of linksRes.rows.slice(0, 3)) { // Testar apenas 3 primeiros
            try {
                const response = await fetch(`${API_URL}/log/click/item/${link.id}`, {
                    method: 'POST',
                    headers: {
                        'User-Agent': 'Test-Script/1.0'
                    }
                });
                
                if (response.status === 204 || response.status === 200) {
                    console.log(`   âœ… Clique registrado para link ID ${link.id} (${link.title || 'Sem tÃ­tulo'})`);
                } else {
                    console.log(`   âŒ Erro ao registrar clique para link ID ${link.id}: Status ${response.status}`);
                }
            } catch (error) {
                console.log(`   âŒ Erro ao chamar API para link ID ${link.id}: ${error.message}`);
            }
        }
        
        // Aguardar um pouco para garantir que foi salvo
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 4. Verificar cliques depois do teste
        console.log('\n4ï¸âƒ£ Verificando cliques DEPOIS do teste...');
        const depois = await client.query(`
            SELECT COUNT(*) as total
            FROM analytics_events
            WHERE user_id = 'ADRIANO-KING'
            AND event_type = 'click'
        `);
        const totalDepois = parseInt(depois.rows[0].total);
        console.log(`   Cliques depois: ${totalDepois}`);
        
        if (totalDepois > totalAntes) {
            console.log(`\nâœ… SUCESSO! Foram registrados ${totalDepois - totalAntes} novos cliques!`);
        } else {
            console.log(`\nâŒ PROBLEMA! Nenhum clique foi registrado.`);
            console.log('   PossÃ­veis causas:');
            console.log('   1. O endpoint /log/click/item/:itemId nÃ£o estÃ¡ funcionando');
            console.log('   2. O cÃ³digo JavaScript nÃ£o estÃ¡ chamando a API');
            console.log('   3. HÃ¡ algum erro no servidor ao salvar');
        }
        
        // 5. Verificar os cliques mais recentes
        console.log('\n5ï¸âƒ£ Verificando cliques mais recentes...');
        const recentes = await client.query(`
            SELECT 
                id,
                item_id,
                created_at,
                ip_address
            FROM analytics_events
            WHERE user_id = 'ADRIANO-KING'
            AND event_type = 'click'
            ORDER BY created_at DESC
            LIMIT 5
        `);
        
        if (recentes.rows.length > 0) {
            console.log('   ðŸ“‹ Ãšltimos cliques registrados:');
            recentes.rows.forEach(click => {
                console.log(`   - ID: ${click.item_id} | ${click.created_at.toLocaleString('pt-BR')}`);
            });
        } else {
            console.log('   âš ï¸ Nenhum clique encontrado ainda');
        }
        
        // 6. Verificar se o endpoint estÃ¡ respondendo
        console.log('\n6ï¸âƒ£ Testando endpoint /log/click/item/...');
        try {
            const testResponse = await fetch(`${API_URL}/log/click/item/999999`, {
                method: 'POST'
            });
            console.log(`   Status do endpoint: ${testResponse.status}`);
            if (testResponse.status === 204 || testResponse.status === 500) {
                console.log('   âœ… Endpoint estÃ¡ acessÃ­vel (mesmo com item_id invÃ¡lido)');
            } else {
                console.log(`   âš ï¸ Endpoint retornou status inesperado: ${testResponse.status}`);
            }
        } catch (error) {
            console.log(`   âŒ Erro ao testar endpoint: ${error.message}`);
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('âœ… TESTE CONCLUÃDO!');
        
    } catch (error) {
        console.error('\nâŒ Erro durante o teste:', error.message);
        console.error('CÃ³digo:', error.code);
        if (error.detail) {
            console.error('Detalhes:', error.detail);
        }
    } finally {
        client.release();
        await pool.end();
    }
}

testarRegistroCliques().catch(error => {
    console.error('\nâŒ Erro fatal:', error);
    process.exit(1);
});
