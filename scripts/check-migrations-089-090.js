/**
 * Script para verificar se as migrations 089 e 090 foram executadas
 * Uso: node scripts/check-migrations-089-090.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const config = require('../config');

// Detectar SSL
const isLocalhost = config.db.host === 'localhost' || 
                    config.db.host === '127.0.0.1' || 
                    config.db.host?.includes('localhost') ||
                    config.db.host === '::1' ||
                    !config.db.host;

const isCloudDatabase = config.db.host?.includes('render.com') || 
                        config.db.host?.includes('amazonaws.com') ||
                        config.db.host?.includes('azure.com') ||
                        config.db.host?.includes('googleapis.com') ||
                        process.env.DB_REQUIRE_SSL === 'true';

const useSSL = isCloudDatabase || (process.env.DB_USE_SSL === 'true' && !isLocalhost);

console.log(`🔌 Conectando ao banco: ${config.db.host}:${config.db.port}\n`);

const poolConfig = {
    user: config.db.user,
    host: config.db.host,
    database: config.db.database,
    password: config.db.password,
    port: parseInt(config.db.port, 10)
};

if (useSSL) {
    poolConfig.ssl = config.db.ssl || { rejectUnauthorized: false };
} else {
    poolConfig.ssl = false;
}

const pool = new Pool(poolConfig);

async function checkMigrations() {
    const client = await pool.connect();
    
    try {
        console.log('='.repeat(60));
        console.log('📋 VERIFICAÇÃO DAS MIGRATIONS 089 E 090');
        console.log('='.repeat(60));
        console.log();

        // Verificar Migration 089 - Campos de posicionamento
        console.log('🔍 Migration 089: Posicionamento de Assinaturas');
        console.log('   Verificando tabela: ck_contracts_signatures\n');
        
        try {
            const result089 = await client.query(`
                SELECT 
                    column_name, 
                    data_type,
                    column_default,
                    is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'ck_contracts_signatures' 
                AND column_name IN ('signature_page', 'signature_x', 'signature_y', 'signature_width', 'signature_height')
                ORDER BY column_name;
            `);

            const expectedColumns = ['signature_page', 'signature_x', 'signature_y', 'signature_width', 'signature_height'];
            const foundColumns = result089.rows.map(r => r.column_name);

            if (result089.rows.length === 0) {
                console.log('   ❌ Migration 089 NÃO foi executada');
                console.log('   ⚠️  Nenhuma coluna de posicionamento encontrada\n');
            } else {
                console.log(`   ✅ Migration 089 EXECUTADA (${result089.rows.length}/5 colunas encontradas)`);
                
                // Mostrar colunas encontradas
                result089.rows.forEach(col => {
                    console.log(`      ✓ ${col.column_name} (${col.data_type})`);
                });

                // Verificar se faltam colunas
                const missingColumns = expectedColumns.filter(col => !foundColumns.includes(col));
                if (missingColumns.length > 0) {
                    console.log(`   ⚠️  Colunas faltando: ${missingColumns.join(', ')}\n`);
                } else {
                    console.log('   ✅ Todas as colunas foram criadas corretamente\n');
                }
            }
        } catch (error) {
            if (error.code === '42P01') {
                console.log('   ❌ Tabela ck_contracts_signatures não existe');
                console.log('   ⚠️  Execute a migration 088 primeiro\n');
            } else {
                console.log(`   ❌ Erro ao verificar: ${error.message}\n`);
            }
        }

        // Verificar Migration 090 - Código de verificação
        console.log('🔍 Migration 090: Código de Verificação');
        console.log('   Verificando tabela: ck_contracts_signers\n');
        
        try {
            const result090 = await client.query(`
                SELECT 
                    column_name, 
                    data_type,
                    column_default,
                    is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'ck_contracts_signers' 
                AND column_name IN ('verification_code', 'verification_code_expires_at', 'verification_code_attempts', 'verification_code_verified')
                ORDER BY column_name;
            `);

            const expectedColumns090 = ['verification_code', 'verification_code_expires_at', 'verification_code_attempts', 'verification_code_verified'];
            const foundColumns090 = result090.rows.map(r => r.column_name);

            if (result090.rows.length === 0) {
                console.log('   ❌ Migration 090 NÃO foi executada');
                console.log('   ⚠️  Nenhuma coluna de verificação encontrada\n');
            } else {
                console.log(`   ✅ Migration 090 EXECUTADA (${result090.rows.length}/4 colunas encontradas)`);
                
                // Mostrar colunas encontradas
                result090.rows.forEach(col => {
                    console.log(`      ✓ ${col.column_name} (${col.data_type})`);
                });

                // Verificar se faltam colunas
                const missingColumns090 = expectedColumns090.filter(col => !foundColumns090.includes(col));
                if (missingColumns090.length > 0) {
                    console.log(`   ⚠️  Colunas faltando: ${missingColumns090.join(', ')}\n`);
                } else {
                    console.log('   ✅ Todas as colunas foram criadas corretamente\n');
                }
            }

            // Verificar índice
            try {
                const indexResult = await client.query(`
                    SELECT indexname 
                    FROM pg_indexes 
                    WHERE tablename = 'ck_contracts_signers' 
                    AND indexname = 'idx_contracts_signers_verification_code';
                `);

                if (indexResult.rows.length > 0) {
                    console.log('   ✅ Índice idx_contracts_signers_verification_code criado');
                } else {
                    console.log('   ⚠️  Índice idx_contracts_signers_verification_code não encontrado');
                }
            } catch (error) {
                console.log(`   ⚠️  Erro ao verificar índice: ${error.message}`);
            }
            console.log();

        } catch (error) {
            if (error.code === '42P01') {
                console.log('   ❌ Tabela ck_contracts_signers não existe');
                console.log('   ⚠️  Execute a migration 088 primeiro\n');
            } else {
                console.log(`   ❌ Erro ao verificar: ${error.message}\n`);
            }
        }

        // Resumo final
        console.log('='.repeat(60));
        console.log('📊 RESUMO:');
        
        try {
            const check089 = await client.query(`
                SELECT COUNT(*) as count
                FROM information_schema.columns 
                WHERE table_name = 'ck_contracts_signatures' 
                AND column_name IN ('signature_page', 'signature_x', 'signature_y', 'signature_width', 'signature_height');
            `);
            
            const check090 = await client.query(`
                SELECT COUNT(*) as count
                FROM information_schema.columns 
                WHERE table_name = 'ck_contracts_signers' 
                AND column_name IN ('verification_code', 'verification_code_expires_at', 'verification_code_attempts', 'verification_code_verified');
            `);

            const migration089Ok = check089.rows[0].count === '5';
            const migration090Ok = check090.rows[0].count === '4';

            console.log(`   Migration 089: ${migration089Ok ? '✅ EXECUTADA' : '❌ NÃO EXECUTADA'}`);
            console.log(`   Migration 090: ${migration090Ok ? '✅ EXECUTADA' : '❌ NÃO EXECUTADA'}`);
            console.log();

            if (migration089Ok && migration090Ok) {
                console.log('✅ Todas as migrations foram executadas com sucesso!');
            } else {
                console.log('⚠️  Execute as migrations faltantes com:');
                console.log('   node scripts/run-migrations-089-090.js');
            }
        } catch (error) {
            console.log('⚠️  Erro ao gerar resumo:', error.message);
        }

    } catch (error) {
        console.error('❌ Erro ao verificar migrations:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

checkMigrations().catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
});
