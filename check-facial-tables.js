require('dotenv').config();
const { Pool } = require('pg');

const p = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
    ssl: { rejectUnauthorized: false }
});

async function main() {
    const tables = [
        'rekognition_photo_jobs',
        'rekognition_photo_faces',
        'rekognition_face_matches',
        'rekognition_client_faces'
    ];

    console.log('--- Verificando Tabelas de Facial ---');
    for (const t of tables) {
        try {
            const r = await p.query(`SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name = $1`, [t]);
            console.log(`${t}: ${r.rows.length > 0 ? '✅ EXISTE' : '❌ NÃO EXISTE'}`);
        } catch (e) {
            console.log(`${t}: ERRO - ${e.message}`);
        }
    }
}

main().then(() => p.end()).catch(e => { console.error('ERRO:', e.message); p.end(); });
