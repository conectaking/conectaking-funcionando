/**
 * Script para executar a migration 075 - Adicionar cadastro_slug
 * 
 * Uso: node run-migration-075.js
 */

const db = require('./db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const client = await db.pool.connect();
    
    try {
        console.log('🔄 Iniciando migration 075...');
        
        // Ler o arquivo da migration
        const migrationPath = path.join(__dirname, 'migrations', '075_add_cadastro_slug_to_guest_list.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Executar a migration
        await client.query(migrationSQL);
        
        console.log('✅ Migration 075 executada com sucesso!');
        
        // Verificar se a coluna foi criada
        const checkResult = await client.query(`
            SELECT column_name, data_type, character_maximum_length 
            FROM information_schema.columns 
            WHERE table_name = 'guest_list_items' 
            AND column_name = 'cadastro_slug'
        `);
        
        if (checkResult.rows.length > 0) {
            console.log('✅ Campo cadastro_slug criado com sucesso!');
            console.log('📊 Detalhes:', checkResult.rows[0]);
        } else {
            console.log('⚠️ Campo cadastro_slug não encontrado. Verifique os logs acima.');
        }
        
    } catch (error) {
        console.error('❌ Erro ao executar migration:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    } finally {
        client.release();
        await db.pool.end();
        console.log('🔌 Conexão fechada.');
    }
}

// Executar
runMigration();
