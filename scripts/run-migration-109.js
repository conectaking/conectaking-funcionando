/**
 * Script para executar a migration 109 - Adicionar módulos para basic, premium e enterprise
 * 
 * Uso: node scripts/run-migration-109.js
 */

const db = require('../db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const client = await db.pool.connect();
    
    try {
        console.log('🔄 Iniciando migration 109...');
        
        // Ler o arquivo da migration
        const migrationPath = path.join(__dirname, '..', 'migrations', '109_add_basic_premium_enterprise_to_module_availability.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Executar a migration
        await client.query(migrationSQL);
        
        console.log('✅ Migration 109 executada com sucesso!');
        
        // Verificar se os módulos foram criados
        const checkResult = await client.query(`
            SELECT 
                plan_code,
                COUNT(*) as total_modulos,
                COUNT(CASE WHEN is_available = true THEN 1 END) as modulos_disponiveis,
                COUNT(CASE WHEN is_available = false THEN 1 END) as modulos_indisponiveis
            FROM module_plan_availability
            WHERE plan_code IN ('basic', 'premium', 'enterprise')
            GROUP BY plan_code
            ORDER BY plan_code
        `);
        
        if (checkResult.rows.length > 0) {
            console.log('✅ Módulos configurados para os planos:');
            checkResult.rows.forEach(row => {
                console.log(`   📋 ${row.plan_code}: ${row.modulos_disponiveis} disponíveis, ${row.modulos_indisponiveis} indisponíveis (total: ${row.total_modulos})`);
            });
        } else {
            console.log('⚠️ Nenhum módulo encontrado para basic, premium ou enterprise. Verifique os logs acima.');
        }
        
        // Verificar módulos premium especificamente
        const premiumCheck = await client.query(`
            SELECT 
                plan_code,
                module_type,
                is_available
            FROM module_plan_availability
            WHERE plan_code IN ('basic', 'premium', 'enterprise')
            AND module_type IN ('finance', 'agenda', 'contract')
            ORDER BY plan_code, module_type
        `);
        
        if (premiumCheck.rows.length > 0) {
            console.log('\n📊 Módulos Premium (finance, agenda, contract):');
            premiumCheck.rows.forEach(row => {
                const status = row.is_available ? '✅ Disponível' : '❌ Indisponível';
                console.log(`   ${row.plan_code}.${row.module_type}: ${status}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Erro ao executar migration:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    } finally {
        client.release();
        await db.pool.end();
        console.log('\n🔌 Conexão fechada.');
    }
}

// Executar
runMigration();
