const db = require('./db');
async function check() {
    const client = await db.pool.connect();
    try {
        const r = await client.query(`
        SELECT column_name, is_nullable, column_default 
        FROM information_schema.columns 
        WHERE table_name = 'king_gallery_clients'
    `);
        console.log('--- COLUMNS ---');
        r.rows.forEach(row => {
            console.log(`${row.column_name}: nullable=${row.is_nullable}, default=${row.column_default}`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        process.exit();
    }
}
check();
