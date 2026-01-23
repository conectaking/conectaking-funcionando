/**
 * Script para gerar link de teste para assinatura de contrato
 * Uso: node scripts/generate-test-sign-link.js
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
                        process.env.DB_REQUIRE_SSL === 'true';

const useSSL = isCloudDatabase || (process.env.DB_USE_SSL === 'true' && !isLocalhost);

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

async function generateTestLink() {
    console.log('='.repeat(60));
    console.log('🔗 GERANDO LINK DE TESTE PARA ASSINATURA');
    console.log('='.repeat(60));
    
    const client = await pool.connect();
    
    try {
        // Buscar um signatário com token válido (não expirado e não assinado)
        const result = await client.query(`
            SELECT 
                s.id,
                s.name,
                s.email,
                s.sign_token,
                s.token_expires_at,
                s.signed_at,
                c.id as contract_id,
                c.title as contract_title,
                c.status as contract_status
            FROM ck_contracts_signers s
            INNER JOIN ck_contracts c ON c.id = s.contract_id
            WHERE s.token_expires_at > NOW()
                AND s.signed_at IS NULL
            ORDER BY s.created_at DESC
            LIMIT 1
        `);
        
        if (result.rows.length === 0) {
            console.log('\n❌ Nenhum signatário pendente encontrado.');
            console.log('\n💡 Opções:');
            console.log('   1. Criar um novo contrato e enviar para assinatura');
            console.log('   2. Verificar se há contratos no sistema');
            
            // Verificar se há contratos
            const contractsResult = await client.query('SELECT COUNT(*) as count FROM ck_contracts');
            const contractsCount = parseInt(contractsResult.rows[0].count);
            console.log(`\n   Contratos no sistema: ${contractsCount}`);
            
            if (contractsCount > 0) {
                const signersResult = await client.query(`
                    SELECT COUNT(*) as count 
                    FROM ck_contracts_signers 
                    WHERE token_expires_at > NOW() AND signed_at IS NULL
                `);
                const signersCount = parseInt(signersResult.rows[0].count);
                console.log(`   Signatários pendentes: ${signersCount}`);
            }
            
            process.exit(0);
        }
        
        const signer = result.rows[0];
        
        console.log('\n✅ Signatário encontrado:');
        console.log(`   Nome: ${signer.name}`);
        console.log(`   Email: ${signer.email}`);
        console.log(`   Contrato: ${signer.contract_title}`);
        console.log(`   Status: ${signer.contract_status}`);
        console.log(`   Token: ${signer.sign_token}`);
        console.log(`   Expira em: ${new Date(signer.token_expires_at).toLocaleString('pt-BR')}`);
        
        // Gerar URLs
        // Priorizar URL de produção, depois Render, depois localhost
        const baseUrl = process.env.FRONTEND_URL || 
                        process.env.APP_URL || 
                        'https://www.conectaking.com.br';
        const signUrl = `${baseUrl}/contract/sign/${signer.sign_token}`;
        
        // Também gerar URL do Render se diferente
        const renderUrl = 'https://conectaking-api.onrender.com';
        const signUrlRender = `${renderUrl}/contract/sign/${signer.sign_token}`;
        
        console.log('\n' + '='.repeat(60));
        console.log('🔗 LINK DE TESTE (Produção):');
        console.log('='.repeat(60));
        console.log(signUrl);
        console.log('='.repeat(60));
        
        if (baseUrl !== renderUrl) {
            console.log('\n🔗 LINK DE TESTE (Render):');
            console.log('='.repeat(60));
            console.log(signUrlRender);
            console.log('='.repeat(60));
        }
        
        console.log('\n📋 Informações adicionais:');
        console.log(`   Base URL: ${baseUrl}`);
        console.log(`   Token length: ${signer.sign_token.length} caracteres`);
        console.log(`   Token tem hífen: ${signer.sign_token.includes('-') ? 'SIM' : 'NÃO'}`);
        
        // Verificar se há outros signatários para o mesmo contrato
        const otherSignersResult = await client.query(`
            SELECT COUNT(*) as count 
            FROM ck_contracts_signers 
            WHERE contract_id = $1 AND id != $2
        `, [signer.contract_id, signer.id]);
        
        const otherSignersCount = parseInt(otherSignersResult.rows[0].count);
        if (otherSignersCount > 0) {
            console.log(`\n   ⚠️  Este contrato tem ${otherSignersCount} outro(s) signatário(s)`);
        }
        
    } catch (error) {
        console.error('❌ Erro ao gerar link de teste:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

generateTestLink().catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
});
