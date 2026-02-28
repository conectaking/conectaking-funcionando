const { Pool } = require('pg');
require('dotenv').config();
const config = require('./config');
const logger = require('./utils/logger');

const poolOptions = {
  max: config.db.pool.max,
  min: config.db.pool.min,
  idleTimeoutMillis: config.db.pool.idleTimeoutMillis
};

// Preferir DATABASE_URL (ex.: Render External URL). Render exige SSL; forçar uso.
const databaseUrl = process.env.DATABASE_URL && process.env.DATABASE_URL.trim();
const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: process.env.DATABASE_SSL !== 'false' ? { rejectUnauthorized: false } : false,
      ...poolOptions
    })
  : new Pool({
      user: config.db.user,
      host: config.db.host,
      database: config.db.database,
      password: config.db.password,
      port: config.db.port,
      ssl: config.db.ssl,
      ...poolOptions
    });

pool.on('connect', () => {
    logger.info('🔗 Base de dados conectada com sucesso!');
});

pool.on('error', (err) => {
    logger.error('❌ Erro inesperado no pool de conexões do banco de dados', err);
});

// Função helper para queries com melhor tratamento de erros
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        logger.debug('Query executada', { 
            duration: `${duration}ms`,
            query: text.substring(0, 100) // Log apenas início da query por segurança
        });
        return res;
    } catch (error) {
        const duration = Date.now() - start;
        logger.error('Erro na query do banco de dados', error, {
            duration: `${duration}ms`,
            query: text.substring(0, 100)
        });
        throw error;
    }
};

module.exports = {
  query,
  pool: pool,
};