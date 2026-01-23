/**
 * Script para adicionar todas as categorias ao sistema IA KING
 * Uso: node scripts/add-categories.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Usar a mesma lógica do db.js para SSL
const pool = new Pool({
    user: config.db.user,
    host: config.db.host,
    database: config.db.database,
    password: config.db.password,
    port: config.db.port,
    ssl: config.db.ssl
});

async function addCategories() {
    const client = await pool.connect();
    
    try {
        console.log('🔌 Conectando ao banco de dados...');
        console.log(`📊 Host: ${config.db.host}`);
        console.log(`📊 Database: ${config.db.database}\n`);
        
        const migrationPath = path.join(__dirname, '..', 'migrations', '032_add_all_categories.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('🔄 Executando migration de categorias...\n');
        
        await client.query(sql);
        
        console.log('✅ Migration executada com sucesso!\n');
        
        // Verificar categorias adicionadas
        const result = await client.query(`
            SELECT id, name, description, priority, is_active 
            FROM ia_categories 
            WHERE is_active = true
            ORDER BY priority DESC, name ASC
        `);
        
        console.log(`📋 Total de categorias ativas: ${result.rows.length}\n`);
        console.log('📝 Categorias disponíveis:');
        result.rows.forEach(cat => {
            console.log(`   - ${cat.name} (Prioridade: ${cat.priority})`);
        });
        
    } catch (error) {
        console.error('❌ Erro ao executar migration:', error.message);
        if (error.code) {
            console.error(`   Código do erro: ${error.code}`);
        }
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

addCategories().catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
});

