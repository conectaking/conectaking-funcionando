/**
 * Script para executar migrations SQL
 * Uso: node scripts/run-migrations.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Detectar se deve usar SSL baseado no host
// Render.com e outros serviços em nuvem REQUEREM SSL
// Localhost não precisa de SSL
const isLocalhost = config.db.host === 'localhost' || 
                    config.db.host === '127.0.0.1' || 
                    config.db.host?.includes('localhost') ||
                    config.db.host === '::1' ||
                    !config.db.host;

// Render.com e outros serviços em nuvem REQUEREM SSL
const isCloudDatabase = config.db.host?.includes('render.com') || 
                        config.db.host?.includes('amazonaws.com') ||
                        config.db.host?.includes('azure.com') ||
                        config.db.host?.includes('googleapis.com') ||
                        process.env.DB_REQUIRE_SSL === 'true';

// Usar SSL se for banco em nuvem OU se explicitamente solicitado
const useSSL = isCloudDatabase || (process.env.DB_USE_SSL === 'true' && !isLocalhost);

console.log(`🔌 Conectando ao banco: ${config.db.host}:${config.db.port}`);
console.log(`   isLocalhost: ${isLocalhost}`);
console.log(`   isCloudDatabase: ${isCloudDatabase}`);
console.log(`   SSL: ${useSSL ? 'HABILITADO (requerido)' : 'DESABILITADO'}`);

// Configuração do pool
const poolConfig = {
    user: config.db.user,
    host: config.db.host,
    database: config.db.database,
    password: config.db.password,
    port: parseInt(config.db.port, 10)
};

// Configurar SSL baseado no tipo de banco
if (useSSL) {
    // Usar configuração SSL do config (rejectUnauthorized: false para Render.com)
    poolConfig.ssl = config.db.ssl || { rejectUnauthorized: false };
    console.log('   ✅ SSL habilitado para conexão segura');
} else {
    poolConfig.ssl = false;
    console.log('   ✅ SSL desabilitado (localhost)');
}

const pool = new Pool(poolConfig);

async function runMigrations() {
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort(); // Executar em ordem

    console.log(`📦 Encontradas ${files.length} migrations para executar...\n`);

    const client = await pool.connect();
    
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    try {
        // Executar cada migration em sua própria transação
        for (const file of files) {
            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf8');
            
            console.log(`🔄 Executando: ${file}...`);
            
            // Iniciar transação para esta migration específica
            await client.query('BEGIN');
            
            try {
                await client.query(sql);
                await client.query('COMMIT');
                console.log(`✅ ${file} executado com sucesso\n`);
                successCount++;
            } catch (error) {
                // Rollback da transação desta migration
                await client.query('ROLLBACK');
                
                // Se erro for de tabela/índice já existe, ignora
                if (error.code === '42P07' || error.code === '42710' || error.code === '42P16' || error.code === '42704') {
                    console.log(`⚠️  ${file} já foi executado anteriormente (ignorando)\n`);
                    skippedCount++;
                } else {
                    console.error(`❌ Erro ao executar ${file}:`, error.message);
                    console.error(`   Código: ${error.code}`);
                    errorCount++;
                    // Continuar com próximas migrations mesmo se uma falhar
                    // Mas logar o erro para investigação
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
        }
    } catch (error) {
        console.error('❌ Erro fatal ao executar migrations:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigrations().catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
});

