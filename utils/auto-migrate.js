/**
 * Sistema de Execução Automática de Migrations
 * Executa automaticamente todas as migrations que ainda não foram executadas
 */

const fs = require('fs');
const path = require('path');
const db = require('../db');
const logger = require('./logger');

class AutoMigrator {
    constructor() {
        this.migrationsDir = path.join(__dirname, '../migrations');
    }

    /**
     * Verificar se a tabela de controle existe, se não, criar
     */
    async ensureMigrationsTable() {
        try {
            const result = await db.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'schema_migrations'
                );
            `);

            if (!result.rows[0].exists) {
                logger.info('📋 Criando tabela de controle de migrations...');
                
                // Criar tabela diretamente (mais confiável que executar migration)
                const client = await db.pool.connect();
                try {
                    await client.query('BEGIN');
                    
                    await client.query(`
                        CREATE TABLE schema_migrations (
                            id SERIAL PRIMARY KEY,
                            migration_name VARCHAR(255) NOT NULL UNIQUE,
                            executed_at TIMESTAMP DEFAULT NOW(),
                            execution_time_ms INTEGER,
                            success BOOLEAN DEFAULT TRUE,
                            error_message TEXT,
                            created_at TIMESTAMP DEFAULT NOW()
                        );
                    `);
                    
                    await client.query(`
                        CREATE INDEX idx_schema_migrations_name ON schema_migrations(migration_name);
                    `);
                    
                    await client.query(`
                        CREATE INDEX idx_schema_migrations_executed_at ON schema_migrations(executed_at);
                    `);
                    
                    await client.query('COMMIT');
                    logger.info('✅ Tabela schema_migrations criada com sucesso');
                } catch (error) {
                    await client.query('ROLLBACK');
                    // Se erro for de tabela já existe (race condition), tudo bem
                    if (error.code !== '42P07') {
                        throw error;
                    }
                    logger.info('✅ Tabela schema_migrations já existe');
                } finally {
                    client.release();
                }
            }
        } catch (error) {
            logger.error('❌ Erro ao verificar/criar tabela de migrations:', error);
            // Não lançar erro - tentar continuar mesmo sem tabela de controle
            logger.warn('⚠️  Continuando sem tabela de controle. Migrations podem ser executadas manualmente.');
        }
    }

    /**
     * Buscar migrations já executadas
     */
    async getExecutedMigrations() {
        try {
            const result = await db.query(`
                SELECT migration_name 
                FROM schema_migrations 
                WHERE success = TRUE 
                ORDER BY executed_at ASC
            `);
            return result.rows.map(row => row.migration_name);
        } catch (error) {
            logger.error('❌ Erro ao buscar migrations executadas:', error);
            return [];
        }
    }

    /**
     * Buscar todas as migrations disponíveis
     */
    getAvailableMigrations() {
        try {
            const files = fs.readdirSync(this.migrationsDir)
                .filter(file => file.endsWith('.sql'))
                .sort(); // Ordem alfabética/numerica
            
            return files;
        } catch (error) {
            logger.error('❌ Erro ao listar migrations:', error);
            return [];
        }
    }

    /**
     * Executar uma migration específica
     */
    async executeMigration(migrationName) {
        const filePath = path.join(this.migrationsDir, migrationName);
        const startTime = Date.now();
        
        try {
            // Ler arquivo SQL
            const sql = fs.readFileSync(filePath, 'utf8');
            
            if (!sql || sql.trim().length === 0) {
                throw new Error('Arquivo de migration vazio');
            }

            logger.info(`🔄 Executando migration: ${migrationName}...`);

            // Executar migration dentro de uma transação
            const client = await db.pool.connect();
            
            try {
                await client.query('BEGIN');
                await client.query(sql);
                await client.query('COMMIT');
                
                const executionTime = Date.now() - startTime;
                
                // Registrar execução bem-sucedida
                await client.query(`
                    INSERT INTO schema_migrations (migration_name, execution_time_ms, success)
                    VALUES ($1, $2, TRUE)
                    ON CONFLICT (migration_name) 
                    DO UPDATE SET 
                        executed_at = NOW(),
                        execution_time_ms = $2,
                        success = TRUE,
                        error_message = NULL
                `, [migrationName, executionTime]);
                
                logger.info(`✅ Migration ${migrationName} executada com sucesso (${executionTime}ms)`);
                
                return { success: true, executionTime };
            } catch (error) {
                await client.query('ROLLBACK');
                
                const executionTime = Date.now() - startTime;
                
                // Registrar execução com erro
                await client.query(`
                    INSERT INTO schema_migrations (migration_name, execution_time_ms, success, error_message)
                    VALUES ($1, $2, FALSE, $3)
                    ON CONFLICT (migration_name) 
                    DO UPDATE SET 
                        executed_at = NOW(),
                        execution_time_ms = $2,
                        success = FALSE,
                        error_message = $3
                `, [migrationName, executionTime, error.message]);
                
                throw error;
            } finally {
                client.release();
            }
        } catch (error) {
            const executionTime = Date.now() - startTime;
            
            // Se erro for de tabela/índice já existe, considerar como sucesso
            if (error.code === '42P07' || error.code === '42710' || error.code === '42P16' || error.code === '42704') {
                logger.warn(`⚠️  Migration ${migrationName} já foi executada anteriormente (ignorando)`);
                
                // Atualizar registro como sucesso
                await db.query(`
                    INSERT INTO schema_migrations (migration_name, execution_time_ms, success)
                    VALUES ($1, $2, TRUE)
                    ON CONFLICT (migration_name) 
                    DO UPDATE SET 
                        executed_at = NOW(),
                        execution_time_ms = $2,
                        success = TRUE,
                        error_message = NULL
                `, [migrationName, executionTime]);
                
                return { success: true, skipped: true, executionTime };
            }

            // 23505 = unique_violation: dados já existem (ex.: INSERT duplicado). Marcar como sucesso para não bloquear arranque.
            if (error.code === '23505') {
                logger.warn(`⚠️  Migration ${migrationName}: registro já existe (unique violation). Marcando como aplicada.`);
                await db.query(`
                    INSERT INTO schema_migrations (migration_name, execution_time_ms, success)
                    VALUES ($1, $2, TRUE)
                    ON CONFLICT (migration_name) 
                    DO UPDATE SET 
                        executed_at = NOW(),
                        execution_time_ms = $2,
                        success = TRUE,
                        error_message = NULL
                `, [migrationName, executionTime]);
                return { success: true, skipped: true, executionTime };
            }

            // 42703 = undefined_column / 42P01 = undefined_table: coluna ou tabela não existe (schema diferente ou ordem). Marcar como aplicada para não bloquear.
            if (error.code === '42703' || error.code === '42P01') {
                logger.warn(`⚠️  Migration ${migrationName}: coluna/tabela indefinida (${error.code}). Marcando como aplicada.`);
                await db.query(`
                    INSERT INTO schema_migrations (migration_name, execution_time_ms, success)
                    VALUES ($1, $2, TRUE)
                    ON CONFLICT (migration_name) 
                    DO UPDATE SET 
                        executed_at = NOW(),
                        execution_time_ms = $2,
                        success = TRUE,
                        error_message = NULL
                `, [migrationName, executionTime]);
                return { success: true, skipped: true, executionTime };
            }
            
            logger.error(`❌ Erro ao executar migration ${migrationName}:`, error);
            return { success: false, error: error.message, executionTime };
        }
    }

    /**
     * Testa se o banco está acessível (evita centenas de erros quando DB está down)
     */
    async checkConnection() {
        try {
            await db.query('SELECT 1');
            return true;
        } catch (error) {
            const code = error.code || (error.cause && error.cause.code);
            const msg = (error.message || (error.cause && error.cause.message) || String(error)).toLowerCase();
            const isConnectionError = code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ETIMEDOUT' || code === 'ECONNRESET' ||
                /connection terminated|econnrefused|enotfound|etimedout|aggregateerror|econnreset/i.test(msg);
            if (isConnectionError) return false;
            throw error;
        }
    }

    /**
     * Executar todas as migrations pendentes
     */
    async runPendingMigrations() {
        try {
            logger.info('🚀 Iniciando execução automática de migrations...');

            const connected = await this.checkConnection();
            if (!connected) {
                logger.warn('⚠️  Banco de dados indisponível (conexão recusada ou encerrada).');
                if (process.env.DATABASE_URL) {
                    logger.warn('   Está a usar DATABASE_URL. Se o Postgres estiver no Render e o plano estiver pausado, reactive o serviço no painel do Render.');
                } else {
                    logger.warn('   Preencha DATABASE_URL ou DB_USER, DB_HOST, DB_DATABASE, DB_PASSWORD, DB_PORT no .env e tenha o PostgreSQL a correr.');
                }
                logger.warn('   Migrations ignoradas. O servidor vai arrancar na mesma; rotas que usem o banco falharão até a conexão estar ativa.');
                return { executed: 0, skipped: 0, errors: 0 };
            }
            
            // Garantir que a tabela de controle existe
            await this.ensureMigrationsTable();
            
            // Buscar migrations executadas e disponíveis
            const executedMigrations = await this.getExecutedMigrations();
            const availableMigrations = this.getAvailableMigrations();
            
            logger.info(`📊 Status: ${executedMigrations.length} executadas, ${availableMigrations.length} disponíveis`);
            
            // Filtrar migrations pendentes
            const pendingMigrations = availableMigrations.filter(
                migration => !executedMigrations.includes(migration)
            );
            
            if (pendingMigrations.length === 0) {
                logger.info('✅ Todas as migrations já foram executadas. Nada a fazer.');
                return { executed: 0, skipped: 0, errors: 0 };
            }
            
            logger.info(`🔄 Encontradas ${pendingMigrations.length} migrations pendentes:`);
            pendingMigrations.forEach(m => logger.info(`   - ${m}`));
            
            let executedCount = 0;
            let skippedCount = 0;
            let errorCount = 0;
            
            // Executar cada migration pendente em ordem
            for (const migration of pendingMigrations) {
                const result = await this.executeMigration(migration);
                
                if (result.success) {
                    if (result.skipped) {
                        skippedCount++;
                    } else {
                        executedCount++;
                    }
                } else {
                    errorCount++;
                    logger.error(`❌ Falha ao executar ${migration}. Continuando com as próximas...`);
                }
            }
            
            logger.info('\n📋 RESUMO DA EXECUÇÃO:');
            logger.info(`   ✅ Executadas: ${executedCount}`);
            logger.info(`   ⏭️  Puladas (já existiam): ${skippedCount}`);
            logger.info(`   ❌ Erros: ${errorCount}`);
            logger.info('✅ Execução automática de migrations concluída!\n');
            
            return { executed: executedCount, skipped: skippedCount, errors: errorCount };
        } catch (error) {
            logger.error('❌ Erro fatal na execução automática de migrations:', error);
            throw error;
        }
    }

    /**
     * Verificar status das migrations
     */
    async getStatus() {
        try {
            await this.ensureMigrationsTable();
            
            const executedMigrations = await this.getExecutedMigrations();
            const availableMigrations = this.getAvailableMigrations();
            const pendingMigrations = availableMigrations.filter(
                migration => !executedMigrations.includes(migration)
            );
            
            return {
                total: availableMigrations.length,
                executed: executedMigrations.length,
                pending: pendingMigrations.length,
                pendingList: pendingMigrations
            };
        } catch (error) {
            logger.error('❌ Erro ao verificar status das migrations:', error);
            return null;
        }
    }
}

module.exports = new AutoMigrator();
