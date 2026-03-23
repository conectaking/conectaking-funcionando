require('dotenv').config({ quiet: true });
const db = require('../db');

async function run() {
  const galleryId = 18;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const rows = (
      await client.query(
        `SELECT c.id AS client_id, c.email, c.created_at,
                COALESCE(m.photos, 0)::int AS photos
         FROM king_gallery_clients c
         LEFT JOIN (
           SELECT rfm.client_id, COUNT(DISTINCT rpf.photo_id)::int AS photos
           FROM rekognition_face_matches rfm
           JOIN rekognition_photo_faces rpf ON rpf.id = rfm.photo_face_id
           JOIN king_photos kp ON kp.id = rpf.photo_id
           WHERE kp.gallery_id = $1
           GROUP BY rfm.client_id
         ) m ON m.client_id = c.id
         WHERE c.gallery_id = $1
           AND c.email LIKE '__ks_face_sess_%@internal.king'
         ORDER BY c.created_at DESC`,
        [galleryId]
      )
    ).rows;

    const targets = rows.filter((r) => (parseInt(r.photos, 10) || 0) === 0);
    const sources = rows.filter((r) => (parseInt(r.photos, 10) || 0) > 0)
      .sort((a, b) => (parseInt(b.photos, 10) || 0) - (parseInt(a.photos, 10) || 0));
    if (!targets.length || !sources.length) {
      await client.query('ROLLBACK');
      console.log(JSON.stringify({ ok: false, message: 'Sem target/source elegíveis' }, null, 2));
      return;
    }
    const targetId = parseInt(targets[0].client_id, 10);
    const sourceId = parseInt(sources[0].client_id, 10);

    const copyRes = await client.query(
      `INSERT INTO rekognition_face_matches (photo_face_id, client_id, similarity, rekognition_face_id)
       SELECT rfm.photo_face_id, $2, rfm.similarity, rfm.rekognition_face_id
       FROM rekognition_face_matches rfm
       JOIN rekognition_photo_faces rpf ON rpf.id = rfm.photo_face_id
       JOIN king_photos kp ON kp.id = rpf.photo_id
       WHERE kp.gallery_id=$1
         AND rfm.client_id=$3
         AND NOT EXISTS (
           SELECT 1 FROM rekognition_face_matches x
           WHERE x.photo_face_id = rfm.photo_face_id AND x.client_id = $2
         )`,
      [galleryId, targetId, sourceId]
    );

    const data = (
      await client.query(
        `SELECT kp.id AS photo_id
         FROM king_photos kp
         JOIN rekognition_photo_faces rpf ON rpf.photo_id = kp.id
         JOIN rekognition_face_matches rfm ON rfm.photo_face_id = rpf.id
         WHERE kp.gallery_id=$1 AND rfm.client_id=$2
         GROUP BY kp.id
         ORDER BY MAX(rfm.similarity) DESC, kp.id`,
        [galleryId, targetId]
      )
    ).rows.map((r) => r.photo_id);

    await client.query(
      `INSERT INTO rekognition_processing_cache (cache_key, payload_json, expires_at)
       VALUES ($1, $2, NOW() + interval '7 days')
       ON CONFLICT (cache_key) DO UPDATE SET payload_json=EXCLUDED.payload_json, expires_at=EXCLUDED.expires_at`,
      [`search:${galleryId}:${targetId}:enroll`, JSON.stringify({ photoIds: data })]
    );

    await client.query('COMMIT');
    console.log(JSON.stringify({
      ok: true,
      galleryId,
      sourceId,
      targetId,
      copiedRows: copyRes.rowCount || 0,
      photoCount: data.length
    }, null, 2));
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw e;
  } finally {
    client.release();
    await db.pool.end();
  }
}

run().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
