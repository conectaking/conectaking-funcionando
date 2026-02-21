const db = require('./db');
async function run() {
    try {
        const res = await db.pool.query("SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'king_gallery_clients' AND column_name = 'status'");
        console.log(JSON.stringify(res.rows[0]));
    } finally {
        process.exit();
    }
}
run();
