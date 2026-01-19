/**
 * Script para verificar se a migration 088 foi executada
 * Uso: node scripts/check-contracts-migration.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const config = require('../config');

// Detectar SSL
const isLocalhost = config.db.host === 'localhost' || 
                    config.db.host === '127.0.0.1' || 
                    config.db.host?.includes('localhost') ||
                    config.db.host === '::1' ||
                    !config.db.host;

const isCloudDatabase = config.db.host?.includes('render.com') || 
                        process.env.DB_REQUIRE_SSL === 'true';

const useSSL = isCloudDatabase || (process.env.DB_USE_SSL === 'true' && !isLocalhost);

const poolConfig = {
    user: config.db.user,
    host: config.db.host,
    database: config.db.database,
    password: config.db.password,
    port: parseInt(config.db.port, 10)
};

if (useSSL) {
    poolConfig.ssl = config.db.ssl || { rejectUnauthorized: false };
} else {
    poolConfig.ssl = false;
}

const pool = new Pool(poolConfig);

async function checkMigration() {
    console.log('='.repeat(60));
    console.log('🔍 VERIFICAÇÃO DA MIGRATION 088 - MÓDULO DE CONTRATOS');
    console.log('='.repeat(60));
    
    const client = await pool.connect();
    
    try {
        // Verificar tabelas
        const tables = [
            'ck_contracts_templates',
            'ck_contracts',
            'ck_contracts_signers',
            'ck_contracts_signatures',
            'ck_contracts_audit_logs'
        ];
        
        console.log('\n📋 Verificando tabelas...\n');
        
        let allTablesExist = true;
        for (const tableName of tables) {
            const result = await client.query(
                `SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                )`,
                [tableName]
            );
            
            const exists = result.rows[0].exists;
            if (exists) {
                console.log(`✅ ${tableName} - EXISTE`);
                
                // Contar registros
                const countResult = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
                const count = parseInt(countResult.rows[0].count);
                console.log(`   └─ Registros: ${count}`);
            } else {
                console.log(`❌ ${tableName} - NÃO EXISTE`);
                allTablesExist = false;
            }
        }
        
        // Verificar colunas importantes
        console.log('\n📋 Verificando colunas importantes...\n');
        
        const columnsToCheck = [
            { table: 'ck_contracts_signers', column: 'sign_token' },
            { table: 'ck_contracts_signers', column: 'verification_code' },
            { table: 'ck_contracts_signatures', column: 'signature_page' },
            { table: 'ck_contracts_signatures', column: 'signature_x' }
        ];
        
        for (const { table, column } of columnsToCheck) {
            const result = await client.query(
                `SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_schema = 'public' 
                    AND table_name = $1 
                    AND column_name = $2
                )`,
                [table, column]
            );
            
            const exists = result.rows[0].exists;
            if (exists) {
                console.log(`✅ ${table}.${column} - EXISTE`);
            } else {
                console.log(`❌ ${table}.${column} - NÃO EXISTE`);
            }
        }
        
        // Verificar templates
        console.log('\n📋 Verificando templates...\n');
        const templatesResult = await client.query('SELECT COUNT(*) as count FROM ck_contracts_templates');
        const templatesCount = parseInt(templatesResult.rows[0].count);
        console.log(`Templates cadastrados: ${templatesCount}`);
        
        if (templatesCount > 0) {
            const sampleTemplates = await client.query('SELECT id, title, category FROM ck_contracts_templates LIMIT 5');
            console.log('\nExemplos de templates:');
            sampleTemplates.rows.forEach(t => {
                console.log(`  - [${t.category}] ${t.title} (ID: ${t.id})`);
            });
        }
        
        console.log('\n' + '='.repeat(60));
        if (allTablesExist) {
            console.log('✅ Migration 088 FOI EXECUTADA - Todas as tabelas existem!');
        } else {
            console.log('❌ Migration 088 NÃO FOI EXECUTADA - Algumas tabelas estão faltando!');
            console.log('\n💡 Execute: npm run migrate');
        }
        console.log('='.repeat(60));
        
    } catch (error) {
        console.error('❌ Erro ao verificar migration:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

checkMigration().catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
});
