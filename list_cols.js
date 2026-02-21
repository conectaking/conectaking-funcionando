const db = require('./db');
async function run() {
    try {
        const res = await db.pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'king_gallery_clients' ORDER BY ordinal_position LIMIT 10");
        console.log(res.rows.map(x => x.column_name));
    } finally {
        process.exit();
    }
}
run();
