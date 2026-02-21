const db = require('./db');
async function check() {
    const client = await db.pool.connect();
    try {
        const tables = ['king_gallery_clients', 'rekognition_client_faces'];
        for (const table of tables) {
            console.log(`--- Schema for ${table} ---`);
            const r = await client.query(`
        SELECT column_name, is_nullable, column_default, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [table]);
            console.log(JSON.stringify(r.rows, null, 2));
        }
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        process.exit();
    }
}
check();
