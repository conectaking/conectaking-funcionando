/**
 * Script para executar a migration de analytics_events
 * Uso: node scripts/run-analytics-migration.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Credenciais do banco do Render
const pool = new Pool({
    user: 'conecta_king_db_user',
    host: process.env.DB_HOST || '127.0.0.1',
    database: 'conecta_king_db',
    password: 'LGiJv1hsYj7VujzIePXzWDKQnZDBHMJg',
    port: 5432,
    ssl: {
        rejectUnauthorized: false
    }
});

async function runMigration() {
    console.log('ðŸ”„ Conectando ao banco de dados...\n');
    
    const client = await pool.connect();
    
    try {
        // Ler o arquivo SQL
        const sqlFilePath = path.join(__dirname, '..', 'migrations', '004_create_analytics_events_table.sql');
        const sql = fs.readFileSync(sqlFilePath, 'utf8');
        
        console.log('ðŸ“¦ Executando migration: 004_create_analytics_events_table.sql\n');
        console.log('â³ Aguarde, isso pode levar alguns segundos...\n');
        
        // Separar comandos SQL (dividir por ; mas manter comentÃ¡rios)
        const commands = sql
            .split(';')
            .map(cmd => cmd.trim())
            .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
        
        await client.query('BEGIN');
        
        // Executar cada comando
        for (let i = 0; i < commands.length; i++) {
            const command = commands[i];
            if (command.trim().length === 0) continue;
            
            try {
                await client.query(command + ';');
                console.log(`âœ… Comando ${i + 1}/${commands.length} executado`);
            } catch (error) {
                // Se erro for de tabela/Ã­ndice jÃ¡ existe, ignora
                if (error.code === '42P07' || error.code === '42710') {
                    console.log(`âš ï¸  Comando ${i + 1}: jÃ¡ existe (ignorando)`);
                } else {
                    throw error;
                }
            }
        }
        
        // Executar tambÃ©m a migration de Ã­ndices
        const indexesFilePath = path.join(__dirname, '..', 'migrations', '005_add_analytics_indexes.sql');
        if (fs.existsSync(indexesFilePath)) {
            console.log('\nðŸ“¦ Executando migration: 005_add_analytics_indexes.sql\n');
            const indexesSql = fs.readFileSync(indexesFilePath, 'utf8');
            const indexCommands = indexesSql
                .split(';')
                .map(cmd => cmd.trim())
                .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
            
            for (let i = 0; i < indexCommands.length; i++) {
                const command = indexCommands[i];
                if (command.trim().length === 0) continue;
                
                try {
                    await client.query(command + ';');
                    console.log(`âœ… Ãndice ${i + 1}/${indexCommands.length} criado`);
                } catch (error) {
                    if (error.code === '42P07' || error.code === '42710') {
                        console.log(`âš ï¸  Ãndice ${i + 1}: jÃ¡ existe (ignorando)`);
                    } else {
                        throw error;
                    }
                }
            }
        }
        
        await client.query('COMMIT');
        
        console.log('\nâœ… Migration executada com sucesso!');
        
        // Verificar se a tabela foi criada
        console.log('\nðŸ” Verificando criaÃ§Ã£o da tabela...');
        const checkResult = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'analytics_events'
            ) AS tabela_existe
        `);
        
        if (checkResult.rows[0].tabela_existe) {
            console.log('âœ… Tabela analytics_events existe no banco!');
        } else {
            console.log('âŒ ERRO: Tabela analytics_events NÃƒO foi criada!');
        }
        
        // Verificar estrutura
        const structureResult = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'analytics_events'
            ORDER BY ordinal_position
        `);
        
        console.log('\nðŸ“‹ Estrutura da tabela:');
        structureResult.rows.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\nâŒ Erro ao executar migration:', error.message);
        console.error('CÃ³digo do erro:', error.code);
        if (error.detail) {
            console.error('Detalhes:', error.detail);
        }
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration().catch(error => {
    console.error('\nâŒ Erro fatal:', error);
    process.exit(1);
});
