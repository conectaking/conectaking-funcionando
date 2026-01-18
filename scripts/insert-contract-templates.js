/**
 * Script para inserir templates de contratos na tabela ck_contracts_templates
 * Este script verifica quais templates faltam e insere apenas os que não existem
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Detectar se deve usar SSL baseado no host (mesmo padrão do run-migrations.js)
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

console.log(`🔌 Conectando ao banco: ${config.db.host}:${config.db.port}`);
console.log(`   isLocalhost: ${isLocalhost}`);
console.log(`   isCloudDatabase: ${isCloudDatabase}`);
console.log(`   SSL: ${useSSL ? 'HABILITADO (requerido)' : 'DESABILITADO'}`);

// Configuração do pool (mesmo padrão do run-migrations.js)
const poolConfig = {
    user: config.db.user,
    host: config.db.host,
    database: config.db.database,
    password: config.db.password,
    port: parseInt(config.db.port, 10)
};

if (useSSL) {
    poolConfig.ssl = config.db.ssl || { rejectUnauthorized: false };
    console.log('   ✅ SSL habilitado para conexão segura');
} else {
    poolConfig.ssl = false;
    console.log('   ✅ SSL desabilitado (localhost)');
}

const pool = new Pool(poolConfig);

async function insertTemplates() {
    const client = await pool.connect();
    
    try {
        console.log('🔍 Verificando templates existentes...\n');
        
        // Verificar quantos templates já existem
        const existingResult = await client.query('SELECT title FROM ck_contracts_templates');
        const existingTitles = existingResult.rows.map(r => r.title);
        
        console.log(`📊 Templates encontrados: ${existingTitles.length}`);
        if (existingTitles.length > 0) {
            console.log('   Templates existentes:');
            existingTitles.forEach(title => console.log(`   - ${title}`));
        }
        
        // Ler apenas a parte de INSERTs da migration 088
        const migrationPath = path.join(__dirname, '..', 'migrations', '088_create_ck_contracts_module.sql');
        const migrationContent = fs.readFileSync(migrationPath, 'utf8');
        
        // Extrair apenas a seção de INSERTs (a partir de "-- 6. SEED")
        const seedStartIndex = migrationContent.indexOf('-- 6. SEED: Templates Iniciais');
        if (seedStartIndex === -1) {
            throw new Error('Seção de SEED não encontrada na migration 088');
        }
        
        // Pegar tudo a partir do SEED até o próximo comentário de seção ou fim do arquivo
        const seedSection = migrationContent.substring(seedStartIndex);
        const nextSectionIndex = seedSection.indexOf('\n-- ============================================');
        const finalSeedSection = nextSectionIndex !== -1 
            ? seedSection.substring(0, nextSectionIndex) 
            : seedSection;
        
        // Usar regex para encontrar todos os INSERTs completos
        // Cada INSERT começa com "INSERT INTO ck_contracts_templates" e termina com "WHERE NOT EXISTS ... ;"
        const insertPattern = /INSERT INTO ck_contracts_templates[\s\S]*?WHERE NOT EXISTS[^;]*;/g;
        const insertStatements = finalSeedSection.match(insertPattern) || [];
        
        console.log(`\n🔄 Encontrados ${insertStatements.length} comandos INSERT para executar...\n`);
        
        let insertedCount = 0;
        let skippedCount = 0;
        
        for (const insertSQL of insertStatements) {
            const sql = insertSQL.trim();
            if (!sql || !sql.startsWith('INSERT')) continue;
            
            // Extrair o título do template
            const titleMatch = sql.match(/title\s*=\s*['"]([^'"]+)['"]/);
            const title = titleMatch ? titleMatch[1] : 'Desconhecido';
            
            // Pular se já existe
            if (existingTitles.includes(title)) {
                console.log(`⚠️  Template "${title}" já existe (ignorando)`);
                skippedCount++;
                continue;
            }
            
            try {
                await client.query('BEGIN');
                await client.query(sql);
                await client.query('COMMIT');
                console.log(`✅ Template "${title}" inserido com sucesso`);
                insertedCount++;
            } catch (error) {
                await client.query('ROLLBACK');
                // Se erro for de violação única ou tabela não existe, ignorar
                if (error.code === '23505' || error.code === '42P01') {
                    console.log(`⚠️  Template "${title}" já existe ou erro ao inserir (ignorando)`);
                    skippedCount++;
                } else {
                    console.error(`❌ Erro ao inserir template "${title}":`, error.message);
                    console.error(`   Código: ${error.code}`);
                    // Continuar mesmo com erro (os INSERTs usam WHERE NOT EXISTS, então são seguros)
                    skippedCount++;
                }
            }
        }
        
        // Verificação final
        const finalResult = await client.query('SELECT COUNT(*) as total FROM ck_contracts_templates');
        const totalTemplates = parseInt(finalResult.rows[0].total, 10);
        
        console.log('\n' + '='.repeat(50));
        console.log('📊 RESUMO:');
        console.log(`   ✅ Templates inseridos: ${insertedCount}`);
        console.log(`   ⚠️  Templates ignorados (já existem): ${skippedCount}`);
        console.log(`   📦 Total de templates no banco: ${totalTemplates}`);
        console.log('='.repeat(50));
        
        if (totalTemplates >= 12) {
            console.log('\n✅ Todos os templates foram inseridos com sucesso!');
        } else {
            console.log(`\n⚠️  Esperava-se 12 templates, mas há apenas ${totalTemplates}.`);
        }
        
    } catch (error) {
        console.error('\n❌ Erro ao inserir templates:', error.message);
        console.error('   Código:', error.code);
        if (error.detail) {
            console.error('   Detalhes:', error.detail);
        }
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

insertTemplates().catch(error => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
});
