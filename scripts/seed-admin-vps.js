const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: false });
  const hash = await bcrypt.hash('123456', 10);
  const id = 'ck-admin-001';
  const email = 'conectaking@gmail.com';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM user_profiles WHERE user_id IN (SELECT id FROM users WHERE email = $1)', [email]);
    await client.query('DELETE FROM users WHERE email = $1', [email]);
    await client.query(
      `INSERT INTO users (id, email, password_hash, profile_slug, account_type, subscription_status, subscription_expires_at)
       VALUES ($1, $2, $3, $1, 'individual', 'active', NOW() + interval '1 year')`,
      [id, email, hash]
    );
    await client.query(
      `INSERT INTO user_profiles (user_id, display_name) VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name`,
      [id, 'Conecta King']
    );
    await client.query('COMMIT');
    console.log('USER_OK', email);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
