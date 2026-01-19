/**
 * Script para executar apenas as migrations 093, 094 e 095
 * Módulos: Financeiro e Agenda
 * Uso: node scripts/run-migrations-093-094-095.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Detectar se deve usar SSL baseado no host
const isLocalhost = config.db.host === 'localhost' || 
                    config.db.host === '127.0.0.1' || 
                    config.db.host?.includes('localhost') ||
                    config.db.host === '::1' ||
                    !config.db.host;

const isCloudDatabase = config.db.host?.includes('render.com') || 
                        config.db.host?.includes('amazonaws.com') ||
                        config.db.host?.includes('azure.com') ||
                        config.db.host?.includes('googleapis.com') ||
                        process.env.DB_REQUIRE_SSL === 'true';

const useSSL = isCloudDatabase || (process.env.DB_USE_SSL === 'true' && !isLocalhost);

console.log(`🔌 Conectando ao banco: ${config.db.host}:${config.db.port}`);
console.log(`   SSL: ${useSSL ? 'HABILITADO' : 'DESABILITADO'}\n`);

// Configuração do pool
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

async function runSpecificMigrations() {
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    
    // Migrations específicas para executar
    const migrationsToRun = [
        '093_create_finance_module.sql',
        '094_create_agenda_module.sql',
        '095_add_agenda_to_module_types.sql'
    ];

    console.log(`📦 Executando ${migrationsToRun.length} migrations específicas...\n`);

    const client = await pool.connect();
    
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    try {
        for (const fileName of migrationsToRun) {
            const filePath = path.join(migrationsDir, fileName);
            
            // Verificar se arquivo existe
            if (!fs.existsSync(filePath)) {
                console.error(`❌ Arquivo não encontrado: ${fileName}`);
                errorCount++;
                continue;
            }
            
            const sql = fs.readFileSync(filePath, 'utf8');
            
            console.log(`🔄 Executando: ${fileName}...`);
            
            await client.query('BEGIN');
            
            try {
                await client.query(sql);
                await client.query('COMMIT');
                console.log(`✅ ${fileName} executado com sucesso\n`);
                successCount++;
            } catch (error) {
                await client.query('ROLLBACK');
                
                // Se erro for de tabela/índice já existe, ignora
                if (error.code === '42P07' || error.code === '42710' || error.code === '42P16' || error.code === '42704') {
                    console.log(`⚠️  ${fileName} já foi executado anteriormente (ignorando)\n`);
                    skippedCount++;
                } else {
                    console.error(`❌ Erro ao executar ${fileName}:`, error.message);
                    console.error(`   Código: ${error.code}`);
                    errorCount++;
                }
            }
        }

        // Resumo final
        console.log('\n' + '='.repeat(50));
        console.log('📊 RESUMO DAS MIGRATIONS:');
        console.log(`   ✅ Executadas com sucesso: ${successCount}`);
        console.log(`   ⚠️  Já executadas (ignoradas): ${skippedCount}`);
        if (errorCount > 0) {
            console.log(`   ❌ Erros: ${errorCount}`);
            console.log('\n⚠️  Algumas migrations falharam. Verifique os erros acima.');
            process.exit(1);
        } else {
            console.log('✅ Todas as migrations foram processadas!');
            console.log('\n📋 Módulos criados:');
            console.log('   - Sistema Financeiro (tabelas finance_*)');
            console.log('   - Sistema de Agenda (tabelas agenda_*)');
            console.log('   - Tipo agenda adicionado ao enum de módulos');
        }
    } catch (error) {
        console.error('❌ Erro fatal ao executar migrations:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runSpecificMigrations().catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
});
