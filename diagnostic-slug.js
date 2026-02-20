require('dotenv').config();
const { Pool } = require('pg');

const p = new Pool({
    user: process.env.DB_USER, host: process.env.DB_HOST,
    database: process.env.DB_DATABASE, password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
    ssl: { rejectUnauthorized: false }
});

async function main() {
    const slug = 'unipiso-2026';
    // Simular o que a rota do backend faz
    const gRes = await p.query('SELECT id, face_recognition_enabled, status FROM king_galleries WHERE slug = $1', [slug]);
    if (gRes.rows.length === 0) {
        console.log('❌ Galeria não encontrada pelo slug:', slug);
        return;
    }
    const galleryId = gRes.rows[0].id;
    const pRes = await p.query('SELECT id FROM king_photos WHERE gallery_id = $1 LIMIT 5', [galleryId]);
    console.log('✅ Galeria encontrada ID:', galleryId);
    console.log('✅ Status:', gRes.rows[0].status);
    console.log('✅ Fotos encontradas:', pRes.rows.length, '(exemplo ids:', pRes.rows.map(r => r.id), ')');
}

main().then(() => p.end()).catch(e => { console.error('ERRO:', e.message); p.end(); });
