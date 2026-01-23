/**
 * Script para adicionar novos tipos de embed ao ENUM item_type_enum
 * IMPORTANTE: ALTER TYPE ADD VALUE não pode ser executado em transação
 * 
 * Uso: node scripts/add-embed-types-to-enum.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const config = require('../config');

// Detectar se deve usar SSL baseado no host
const isLocalhost = config.db.host === 'localhost' || 
                    config.db.host === '127.0.0.1' || 
                    config.db.host.includes('localhost');

const sslConfig = isLocalhost ? false : config.db.ssl;

console.log(`🔌 Conectando ao banco: ${config.db.host} (SSL: ${sslConfig ? 'habilitado' : 'desabilitado'})\n`);

const pool = new Pool({
    user: config.db.user,
    host: config.db.host,
    database: config.db.database,
    password: config.db.password,
    port: config.db.port,
    ssl: sslConfig
});

async function addEnumValues() {
    const newTypes = [
        'tiktok_embed',
        'spotify_embed',
        'linkedin_embed',
        'pinterest_embed'
    ];

    const client = await pool.connect();
    
    try {
        console.log('🔄 Adicionando novos tipos ao ENUM item_type_enum...\n');
        
        for (const type of newTypes) {
            try {
                // Executar cada comando separadamente (sem transação)
                await client.query(`ALTER TYPE item_type_enum ADD VALUE IF NOT EXISTS '${type}'`);
                console.log(`✅ ${type} adicionado com sucesso`);
            } catch (error) {
                // Se o valor já existe, apenas avisar
                if (error.code === '42710' || error.message.includes('already exists')) {
                    console.log(`⚠️  ${type} já existe no ENUM (ignorando)`);
                } else {
                    console.error(`❌ Erro ao adicionar ${type}:`, error.message);
                    throw error;
                }
            }
        }
        
        console.log('\n✅ Todos os tipos foram processados com sucesso!');
        
        // Verificar os valores do ENUM
        console.log('\n📋 Valores atuais do ENUM item_type_enum:');
        const result = await client.query(`
            SELECT enumlabel 
            FROM pg_enum 
            WHERE enumtypid = (
                SELECT oid 
                FROM pg_type 
                WHERE typname = 'item_type_enum'
            )
            ORDER BY enumsortorder;
        `);
        
        result.rows.forEach((row, index) => {
            console.log(`   ${index + 1}. ${row.enumlabel}`);
        });
        
    } catch (error) {
        console.error('\n❌ Erro ao executar migration:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

addEnumValues().catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
});

