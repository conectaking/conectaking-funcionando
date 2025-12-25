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
// Se for localhost ou 127.0.0.1, não usar SSL
// Se for um host remoto (Render, etc), usar SSL
const isLocalhost = config.db.host === 'localhost' || 
                    config.db.host === '127.0.0.1' || 
                    config.db.host.includes('localhost');

const sslConfig = isLocalhost ? false : config.db.ssl;

console.log(`🔌 Conectando ao banco: ${config.db.host} (SSL: ${sslConfig ? 'habilitado' : 'desabilitado'})`);

// Usar a mesma configuração do db.js, mas ajustar SSL para ambiente local
const pool = new Pool({
    user: config.db.user,
    host: config.db.host,
    database: config.db.database,
    password: config.db.password,
    port: config.db.port,
    ssl: sslConfig
});

async function runMigrations() {
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort(); // Executar em ordem

    console.log(`📦 Encontradas ${files.length} migrations para executar...\n`);

    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        for (const file of files) {
            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf8');
            
            console.log(`🔄 Executando: ${file}...`);
            
            try {
                await client.query(sql);
                console.log(`✅ ${file} executado com sucesso\n`);
            } catch (error) {
                // Se erro for de tabela/índice já existe, ignora
                if (error.code === '42P07' || error.code === '42710') {
                    console.log(`⚠️  ${file} já foi executado anteriormente (ignorando)\n`);
                } else {
                    throw error;
                }
            }
        }

        await client.query('COMMIT');
        console.log('✅ Todas as migrations foram executadas com sucesso!');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erro ao executar migrations:', error);
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

