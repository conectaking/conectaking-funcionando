const db = require('../db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const client = await db.pool.connect();
    
    try {
        console.log('🔵 Executando migration 095: Adicionar campos de recorrência...');
        
        const migrationPath = path.join(__dirname, '../migrations/095_add_recurring_fields_to_finance_transactions.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        await client.query('BEGIN');
        await client.query(migrationSQL);
        await client.query('COMMIT');
        
        console.log('✅ Migration 095 executada com sucesso!');
        
        // Verificar se as colunas foram criadas
        const checkResult = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'finance_transactions' 
            AND column_name IN ('is_recurring', 'recurring_times')
        `);
        
        console.log('📋 Colunas encontradas:', checkResult.rows.map(r => r.column_name));
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erro ao executar migration:', error);
        throw error;
    } finally {
        client.release();
        process.exit(0);
    }
}

runMigration().catch(err => {
    console.error('❌ Erro fatal:', err);
    process.exit(1);
});
