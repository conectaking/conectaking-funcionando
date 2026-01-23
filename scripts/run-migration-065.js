/**
 * Script para executar apenas a migration 065 (campos de estilo da lista de convidados)
 * Uso: node scripts/run-migration-065.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Forçar SSL=false explicitamente
const pool = new Pool({
    user: String(config.db.user || ''),
    host: String(config.db.host || 'localhost'),
    database: String(config.db.database || ''),
    password: String(config.db.password || ''),
    port: parseInt(config.db.port || '5432', 10),
    ssl: false  // Forçar desabilitado
});

console.log(`🔌 Conectando ao banco: ${config.db.host}:${config.db.port}`);
console.log(`   Database: ${config.db.database}`);
console.log(`   User: ${config.db.user}`);

async function runMigration() {
    const migrationFile = path.join(__dirname, '..', 'migrations', '065_add_styling_fields_to_guest_list.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    console.log(`🔄 Executando migration: 065_add_styling_fields_to_guest_list.sql...`);
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log('✅ Migration executada com sucesso!');
    } catch (error) {
        await client.query('ROLLBACK');
        if (error.code === '42704' || error.message.includes('does not exist')) {
            console.log('⚠️  Alguns objetos já existem (ignorando)');
        } else {
            console.error('❌ Erro ao executar migration:', error.message);
            console.error('   Código:', error.code);
            throw error;
        }
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration().catch(error => {
    console.error('Erro fatal:', error.message);
    process.exit(1);
});

