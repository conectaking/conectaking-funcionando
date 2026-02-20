require('dotenv').config();
const { Pool } = require('pg');

// Tentar DATABASE_URL ou variáveis separadas
const poolConfig = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host: process.env.DB_HOST || process.env.PGHOST,
        port: parseInt(process.env.DB_PORT || process.env.PGPORT || '5432'),
        database: process.env.DB_NAME || process.env.PGDATABASE,
        user: process.env.DB_USER || process.env.PGUSER,
        password: process.env.DB_PASSWORD || process.env.PGPASSWORD,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000
    };

console.log('Conectando ao banco:', poolConfig.connectionString
    ? poolConfig.connectionString.replace(/:([^:@]{3})[^@]*@/, ':***@').slice(0, 60)
    : `${poolConfig.host}:${poolConfig.port}/${poolConfig.database}`
);

const p = new Pool(poolConfig);

async function main() {
    const colRes = await p.query(`
    SELECT column_name, column_default
    FROM information_schema.columns
    WHERE table_name = 'king_galleries' AND column_name = 'face_recognition_enabled'
  `);
    console.log('\n✅ Coluna face_recognition_enabled existe:', colRes.rows.length > 0);

    const galRes = await p.query(`
    SELECT id, nome_projeto, face_recognition_enabled
    FROM king_galleries ORDER BY id DESC LIMIT 6
  `);
    console.log('\n📋 Galerias recentes:');
    galRes.rows.forEach(r => console.log(`  ID ${r.id}: "${r.nome_projeto}" | face_recognition_enabled = ${r.face_recognition_enabled}`));

    const migRes = await p.query(`
    SELECT migration_name, executed_at, success FROM schema_migrations WHERE migration_name LIKE '%182%' LIMIT 1
  `);
    console.log('\n🔄 Migration 182:', migRes.rows.length > 0 ? JSON.stringify(migRes.rows[0]) : 'NÃO ENCONTRADA na schema_migrations');
}

main()
    .then(() => { console.log('\nConcluído.'); p.end(); })
    .catch(e => { console.error('\nERRO:', e.message); p.end(); });
