const db = require('./db');
async function run() {
    try {
        const res = await db.pool.query("SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'rekognition_client_faces' ORDER BY ordinal_position LIMIT 10");
        console.log(res.rows);
    } finally {
        process.exit();
    }
}
run();
