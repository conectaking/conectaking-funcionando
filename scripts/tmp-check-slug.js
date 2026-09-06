const db = require('../db');

(async () => {
  const r = await db.query(`
    SELECT id, email, profile_slug
    FROM users
    WHERE profile_slug ILIKE '%adriano%'
       OR email ILIKE '%adriano%'
       OR email ILIKE '%conectaking%'
    ORDER BY email
  `);
  console.log('matches:', JSON.stringify(r.rows, null, 2));

  for (const slug of ['adrianokigg', 'adrianokingg', 'adrianoking']) {
    const c = await db.query('SELECT id, email, profile_slug FROM users WHERE LOWER(profile_slug) = LOWER($1)', [slug]);
    console.log('exact', slug, c.rows[0] || null);
  }

  // preview links from seed/admin
  const all = await db.query(`
    SELECT profile_slug, COUNT(*)::int AS n
    FROM users
    WHERE profile_slug IS NOT NULL AND profile_slug <> ''
    GROUP BY profile_slug
    ORDER BY profile_slug
    LIMIT 40
  `);
  console.log('slugs sample:', all.rows);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
