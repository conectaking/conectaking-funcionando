/**
 * Script para criar a tabela finance_king_sync (sync Serasa + Quem eu devo entre site/localhost/mobile)
 *
 * Uso: node scripts/run-migration-162-king-sync.js
 * No Render: no Shell do serviço, ou local com .env apontando para o banco de produção.
 */

require('dotenv').config();
const db = require('../db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const client = await db.pool.connect();

    try {
        console.log('🔄 Executando migration 162 (finance_king_sync)...');

        const migrationPath = path.join(__dirname, '..', 'migrations', '162_finance_king_sync.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        await client.query(sql);

        console.log('✅ Tabela finance_king_sync criada com sucesso.');

        const check = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = 'finance_king_sync'
            );
        `);
        if (check.rows[0].exists) {
            console.log('✅ Verificado: tabela existe no banco.');
        }
    } catch (error) {
        console.error('❌ Erro:', error.message);
        process.exit(1);
    } finally {
        client.release();
        await db.pool.end();
        console.log('🔌 Conexão fechada.');
    }
}

runMigration();
