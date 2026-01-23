/**
 * Script para executar a migration 110 - Corrigir todos os planos e garantir editabilidade
 * 
 * Uso: node scripts/run-migration-110.js
 */

const db = require('../db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const client = await db.pool.connect();
    
    try {
        console.log('🔄 Iniciando migration 110...');
        
        // Ler o arquivo da migration
        const migrationPath = path.join(__dirname, '..', 'migrations', '110_fix_all_plans_and_ensure_editability.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Executar a migration
        await client.query(migrationSQL);
        
        console.log('✅ Migration 110 executada com sucesso!');
        
        // Verificar planos ativos
        const checkResult = await client.query(`
            SELECT 
                plan_code,
                plan_name,
                price,
                is_active
            FROM subscription_plans
            WHERE is_active = true
            ORDER BY price ASC
        `);
        
        console.log(`\n📊 Planos ativos encontrados: ${checkResult.rows.length}`);
        checkResult.rows.forEach((row, index) => {
            console.log(`   ${index + 1}. ${row.plan_name} (${row.plan_code}) - R$ ${parseFloat(row.price).toFixed(2)}`);
        });
        
        if (checkResult.rows.length !== 7) {
            console.warn(`\n⚠️ ATENÇÃO: Esperado 7 planos, mas encontrado ${checkResult.rows.length}`);
        } else {
            console.log('\n✅ Todos os 7 planos estão ativos!');
        }
        
        // Verificar se há duplicatas
        const duplicateCheck = await client.query(`
            SELECT plan_code, COUNT(*) as count
            FROM subscription_plans
            WHERE is_active = true
            GROUP BY plan_code
            HAVING COUNT(*) > 1
        `);
        
        if (duplicateCheck.rows.length > 0) {
            console.warn('\n⚠️ Duplicatas encontradas:');
            duplicateCheck.rows.forEach(row => {
                console.warn(`   ${row.plan_code}: ${row.count} ocorrências`);
            });
        } else {
            console.log('\n✅ Nenhuma duplicata encontrada!');
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
