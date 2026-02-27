/**
 * Script para criar a tabela refresh_tokens (renovação de token no login).
 * Necessário para que o KingBrief e o dashboard renovem o token sem voltar ao login.
 * Uso: node scripts/run-migration-001-refresh-tokens.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('../config');

const pool = new Pool({
    user: String(config.db.user || ''),
    host: String(config.db.host || 'localhost'),
    database: String(config.db.database || ''),
    password: String(config.db.password || ''),
    port: parseInt(config.db.port || '5432', 10),
    ssl: config.db.ssl || false
});

const migrationFile = path.join(__dirname, '..', 'migrations', '001_create_refresh_tokens_table.sql');

async function run() {
    console.log('Conectando ao banco...');
    const client = await pool.connect();
    try {
        const sql = fs.readFileSync(migrationFile, 'utf8');
        await client.query(sql);
        console.log('Tabela refresh_tokens criada com sucesso. Renovacao de token ativada.');
    } catch (err) {
        if (err.code === '42P07') {
            console.log('Tabela refresh_tokens ja existe. Nada a fazer.');
        } else {
            console.error('Erro:', err.message);
            throw err;
        }
    } finally {
        client.release();
        await pool.end();
    }
}

run().catch(() => process.exit(1));
