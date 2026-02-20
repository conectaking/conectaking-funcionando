const db = require('./db');
async function addColumn() {
    const client = await db.pool.connect();
    try {
        await client.query('ALTER TABLE king_galleries ADD COLUMN IF NOT EXISTS face_recognition_enabled BOOLEAN DEFAULT FALSE');
        console.log('✅ Coluna face_recognition_enabled adicionada com sucesso.');
    } catch (err) {
        console.error('❌ Erro ao adicionar coluna:', err.message);
    } finally {
        client.release();
        await db.pool.end();
    }
}
addColumn();
