require('dotenv').config();
const { Pool } = require('pg');

const p = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    // Verificar se a coluna existe
    const colRes = await p.query(`
    SELECT column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_name = 'king_galleries' AND column_name = 'face_recognition_enabled'
  `);
    console.log('✅ Coluna face_recognition_enabled existe:', colRes.rows.length > 0);
    if (colRes.rows.length > 0) console.log('   Detalhes:', colRes.rows[0]);

    // Verificar valor na galeria 10
    const galRes = await p.query(`
    SELECT id, nome_projeto, face_recognition_enabled
    FROM king_galleries
    WHERE id IN (10, 9, 8, 7, 6, 5)
    ORDER BY id DESC
    LIMIT 5
  `);
    console.log('\n📋 Galerias:');
    galRes.rows.forEach(r => {
        console.log(`  ID ${r.id}: ${r.nome_projeto} | face_recognition_enabled = ${r.face_recognition_enabled}`);
    });

    // Migration 182 registrada?
    const migRes = await p.query(`
    SELECT migration_name, executed_at, success
    FROM schema_migrations
    WHERE migration_name LIKE '%182%'
    LIMIT 1
  `);
    console.log('\n🔄 Migration 182:', migRes.rows.length > 0 ? migRes.rows[0] : 'NÃO ENCONTRADA na tabela schema_migrations');
}

main().then(() => p.end()).catch(e => { console.error('ERRO:', e.message); p.end(); });
