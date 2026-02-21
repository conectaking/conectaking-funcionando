
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
});

async function checkFaceEnabled() {
    try {
        const res = await pool.query('SELECT id, slug, face_recognition_enabled, access_mode FROM king_galleries WHERE slug = $1', ['unipiso-2026']);
        console.log('Result:', JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

checkFaceEnabled();
