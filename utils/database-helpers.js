/**
 * Helpers para operações com banco de dados
 * Facilita queries comuns
 */

const db = require('../db');
const logger = require('./logger');

/**
 * Executa query com tratamento de erro
 */
async function safeQuery(query, params = []) {
    try {
        const result = await db.query(query, params);
        return { success: true, data: result.rows, rowCount: result.rowCount };
    } catch (error) {
        logger.error('Erro na query do banco', error);
        return { success: false, error: error.message };
    }
}

/**
 * Busca um registro por ID
 */
async function findById(table, id, idColumn = 'id') {
    const result = await db.query(
        `SELECT * FROM ${table} WHERE ${idColumn} = $1 LIMIT 1`,
        [id]
    );
    return result.rows[0] || null;
}

/**
 * Verifica se registro existe
 */
async function exists(table, conditions, params = []) {
    const whereClause = Object.keys(conditions)
        .map((key, index) => `${key} = $${index + 1}`)
        .join(' AND ');
    
    const values = Object.values(conditions);
    
    const result = await db.query(
        `SELECT 1 FROM ${table} WHERE ${whereClause} LIMIT 1`,
        values
    );
    
    return result.rows.length > 0;
}

/**
 * Paginação simples
 */
async function paginate(table, page = 1, limit = 10, orderBy = 'id', order = 'ASC', whereClause = '', params = []) {
    const offset = (page - 1) * limit;
    
    // Query para contar total
    const countQuery = `SELECT COUNT(*) as total FROM ${table} ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);
    
    // Query para buscar dados
    const dataQuery = `
        SELECT * FROM ${table} 
        ${whereClause}
        ORDER BY ${orderBy} ${order}
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const dataResult = await db.query(dataQuery, [...params, limit, offset]);
    
    return {
        data: dataResult.rows,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
        }
    };
}

/**
 * Transação helper
 */
async function transaction(callback) {
    const client = await db.pool.connect();
    
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

module.exports = {
    safeQuery,
    findById,
    exists,
    paginate,
    transaction
};

