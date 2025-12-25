// CRIE ESTE ARQUIVO: backend/gerarCodigo.js

const { nanoid } = require('nanoid');
const db = require('./db');
require('dotenv').config();

async function criarCodigoDeRegistro() {
    const novoCodigo = nanoid(8).toUpperCase();

    try {
        await db.query('INSERT INTO registration_codes (code) VALUES ($1)', [novoCodigo]);
        
        console.log('\n✅ CÓDIGO GERADO COM SUCESSO! ✅\n');
        console.log('Seu novo código de registro é:');
        console.log(`\x1b[33m%s\x1b[0m`, `   ${novoCodigo}   `); // Deixa o código amarelo e destacado
        console.log('\nUse este código na página de registro.');

    } catch (error) {
        console.error('\n❌ Erro ao tentar gerar o código:', error.message);
    } finally {
        if (db.pool) {
            await db.pool.end();
        }
    }
}

// Executa a função
criarCodigoDeRegistro();