/**
 * Helpers para migrations e operações de banco
 * Facilita criação e execução de migrations
 */

const db = require('../db');
const logger = require('./logger');

/**
 * Executa uma migration SQL
 */
async function runMigration(sql, migrationName) {
    const client = await db.pool.connect();
    
    try {
        logger.info(`Executando migration: ${migrationName}`);
        await client.query('BEGIN');
        
        await client.query(sql);
        
        await client.query('COMMIT');
        logger.info(`Migration ${migrationName} executada com sucesso`);
        
        return { success: true };
    } catch (error) {
        await client.query('ROLLBACK');
        
        // Se erro for de tabela/índice já existe, não é crítico
        if (error.code === '42P07' || error.code === '42710') {
            logger.warn(`Migration ${migrationName} já foi executada anteriormente`);
            return { success: true, skipped: true };
        }
        
        logger.error(`Erro ao executar migration ${migrationName}`, error);
        return { success: false, error: error.message };
    } finally {
        client.release();
    }
}

/**
 * Verifica se uma tabela existe
 */
async function tableExists(tableName) {
    const result = await db.query(
        `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
        )`,
        [tableName]
    );
    
    return result.rows[0].exists;
}

/**
 * Verifica se uma coluna existe em uma tabela
 */
async function columnExists(tableName, columnName) {
    const result = await db.query(
        `SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = $1 
            AND column_name = $2
        )`,
        [tableName, columnName]
    );
    
    return result.rows[0].exists;
}

/**
 * Verifica se um índice existe
 */
async function indexExists(indexName) {
    const result = await db.query(
        `SELECT EXISTS (
            SELECT FROM pg_indexes 
            WHERE indexname = $1
        )`,
        [indexName]
    );
    
    return result.rows[0].exists;
}

module.exports = {
    runMigration,
    tableExists,
    columnExists,
    indexExists
};

