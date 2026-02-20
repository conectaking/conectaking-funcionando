require('dotenv').config();
const { Pool } = require('pg');

const p = new Pool({
    user: process.env.DB_USER, host: process.env.DB_HOST,
    database: process.env.DB_DATABASE, password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
    ssl: { rejectUnauthorized: false }
});

async function main() {
    const r = await p.query(`
    SELECT id, nome_projeto, status FROM king_galleries WHERE id = 10
  `);
    console.log('✅ Status Galeria:', r.rows[0]);

    const r2 = await p.query(`
    SELECT id, name, status FROM king_gallery_clients WHERE gallery_id = 10
  `);
    console.log('✅ Status Clientes na Galeria:', r2.rows);
}

main().then(() => p.end()).catch(e => { console.error('ERRO:', e.message); p.end(); });
