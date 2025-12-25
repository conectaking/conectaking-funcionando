/**
 * Script para testar se o registro de cliques está funcionando
 * Uso: node scripts/testar-registro-cliques.js
 */

const { Pool } = require('pg');
const fetch = require('node-fetch');

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

async function testarRegistroCliques() {
    console.log('🧪 TESTE DE REGISTRO DE CLIQUES\n');
    console.log('='.repeat(60));
    
    const client = await pool.connect();
    
    try {
        // 1. Buscar links do ADRIANO-KING para testar
        console.log('\n1️⃣ Buscando links do ADRIANO-KING...');
        const linksRes = await client.query(`
            SELECT id, title, item_type, destination_url
            FROM profile_items
            WHERE user_id = 'ADRIANO-KING'
            ORDER BY id
            LIMIT 5
        `);
        
        if (linksRes.rows.length === 0) {
            console.log('❌ Nenhum link encontrado para ADRIANO-KING');
            return;
        }
        
        console.log(`✅ Encontrados ${linksRes.rows.length} links para testar:\n`);
        linksRes.rows.forEach((link, index) => {
            console.log(`   ${index + 1}. ID: ${link.id} - ${link.title || 'Sem título'} (${link.item_type})`);
        });
        
        // 2. Verificar cliques antes do teste
        console.log('\n2️⃣ Verificando cliques ANTES do teste...');
        const antes = await client.query(`
            SELECT COUNT(*) as total
            FROM analytics_events
            WHERE user_id = 'ADRIANO-KING'
            AND event_type = 'click'
        `);
        const totalAntes = parseInt(antes.rows[0].total);
        console.log(`   Cliques antes: ${totalAntes}`);
        
        // 3. Simular cliques via API
        console.log('\n3️⃣ Simulando cliques via API...');
        const API_URL = 'https://conectaking-api.onrender.com';
        
        for (const link of linksRes.rows.slice(0, 3)) { // Testar apenas 3 primeiros
            try {
                const response = await fetch(`${API_URL}/log/click/item/${link.id}`, {
                    method: 'POST',
                    headers: {
                        'User-Agent': 'Test-Script/1.0'
                    }
                });
                
                if (response.status === 204 || response.status === 200) {
                    console.log(`   ✅ Clique registrado para link ID ${link.id} (${link.title || 'Sem título'})`);
                } else {
                    console.log(`   ❌ Erro ao registrar clique para link ID ${link.id}: Status ${response.status}`);
                }
            } catch (error) {
                console.log(`   ❌ Erro ao chamar API para link ID ${link.id}: ${error.message}`);
            }
        }
        
        // Aguardar um pouco para garantir que foi salvo
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 4. Verificar cliques depois do teste
        console.log('\n4️⃣ Verificando cliques DEPOIS do teste...');
        const depois = await client.query(`
            SELECT COUNT(*) as total
            FROM analytics_events
            WHERE user_id = 'ADRIANO-KING'
            AND event_type = 'click'
        `);
        const totalDepois = parseInt(depois.rows[0].total);
        console.log(`   Cliques depois: ${totalDepois}`);
        
        if (totalDepois > totalAntes) {
            console.log(`\n✅ SUCESSO! Foram registrados ${totalDepois - totalAntes} novos cliques!`);
        } else {
            console.log(`\n❌ PROBLEMA! Nenhum clique foi registrado.`);
            console.log('   Possíveis causas:');
            console.log('   1. O endpoint /log/click/item/:itemId não está funcionando');
            console.log('   2. O código JavaScript não está chamando a API');
            console.log('   3. Há algum erro no servidor ao salvar');
        }
        
        // 5. Verificar os cliques mais recentes
        console.log('\n5️⃣ Verificando cliques mais recentes...');
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
            console.log('   📋 Últimos cliques registrados:');
            recentes.rows.forEach(click => {
                console.log(`   - ID: ${click.item_id} | ${click.created_at.toLocaleString('pt-BR')}`);
            });
        } else {
            console.log('   ⚠️ Nenhum clique encontrado ainda');
        }
        
        // 6. Verificar se o endpoint está respondendo
        console.log('\n6️⃣ Testando endpoint /log/click/item/...');
        try {
            const testResponse = await fetch(`${API_URL}/log/click/item/999999`, {
                method: 'POST'
            });
            console.log(`   Status do endpoint: ${testResponse.status}`);
            if (testResponse.status === 204 || testResponse.status === 500) {
                console.log('   ✅ Endpoint está acessível (mesmo com item_id inválido)');
            } else {
                console.log(`   ⚠️ Endpoint retornou status inesperado: ${testResponse.status}`);
            }
        } catch (error) {
            console.log(`   ❌ Erro ao testar endpoint: ${error.message}`);
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('✅ TESTE CONCLUÍDO!');
        
    } catch (error) {
        console.error('\n❌ Erro durante o teste:', error.message);
        console.error('Código:', error.code);
        if (error.detail) {
            console.error('Detalhes:', error.detail);
        }
    } finally {
        client.release();
        await pool.end();
    }
}

testarRegistroCliques().catch(error => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
});
