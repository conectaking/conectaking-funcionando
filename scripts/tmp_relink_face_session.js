require('dotenv').config({ quiet: true });
const db = require('../db');

async function run() {
  const galleryId = 18;
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const candidates = (
      await client.query(
        `SELECT c.id AS client_id, c.email, COALESCE(m.photos, 0)::int AS photos
         FROM king_gallery_clients c
         LEFT JOIN (
           SELECT rfm.client_id, COUNT(DISTINCT rpf.photo_id)::int AS photos
           FROM rekognition_face_matches rfm
           JOIN rekognition_photo_faces rpf ON rpf.id = rfm.photo_face_id
           JOIN king_photos kp ON kp.id = rpf.photo_id
           WHERE kp.gallery_id=$1
           GROUP BY rfm.client_id
         ) m ON m.client_id = c.id
         WHERE c.gallery_id=$1
         ORDER BY c.id DESC`,
        [galleryId]
      )
    ).rows;

    const isTechnical = (row) => String(row.email || '').startsWith('__ks_face_sess_');
    const targets = candidates.filter((r) => isTechnical(r) && r.photos === 0);
    const sources = candidates
      .filter((r) => isTechnical(r) && r.photos > 0)
      .sort((a, b) => b.photos - a.photos);

    if (!targets.length || !sources.length) {
      await client.query('ROLLBACK');
      console.log(JSON.stringify({
        ok: false,
        message: 'Sem target/source elegíveis',
        targets: targets.length,
        sources: sources.length
      }, null, 2));
      return;
    }

    const targetId = parseInt(targets[0].client_id, 10);
    const sourceId = parseInt(sources[0].client_id, 10);

    const copyRes = await client.query(
      `INSERT INTO rekognition_face_matches (photo_face_id, client_id, similarity, rekognition_face_id)
       SELECT rfm.photo_face_id, $2 AS client_id, rfm.similarity, rfm.rekognition_face_id
       FROM rekognition_face_matches rfm
       JOIN rekognition_photo_faces rpf ON rpf.id = rfm.photo_face_id
       JOIN king_photos kp ON kp.id = rpf.photo_id
       WHERE kp.gallery_id = $1
         AND rfm.client_id = $3
         AND NOT EXISTS (
           SELECT 1
           FROM rekognition_face_matches x
           WHERE x.photo_face_id = rfm.photo_face_id
             AND x.client_id = $2
         )`,
      [galleryId, targetId, sourceId]
    );

    const photoRows = (
      await client.query(
        `SELECT kp.id AS photo_id, MAX(rfm.similarity) AS max_sim
         FROM king_photos kp
         JOIN rekognition_photo_faces rpf ON rpf.photo_id = kp.id
         JOIN rekognition_face_matches rfm ON rfm.photo_face_id = rpf.id
         WHERE kp.gallery_id = $1 AND rfm.client_id = $2
         GROUP BY kp.id
         ORDER BY max_sim DESC, kp.id`,
        [galleryId, targetId]
      )
    ).rows;

    const photoIds = photoRows.map((r) => r.photo_id);
    const cacheKey = `search:${galleryId}:${targetId}:enroll`;
    await client.query(
      `INSERT INTO rekognition_processing_cache (cache_key, payload_json, expires_at)
       VALUES ($1, $2, NOW() + interval '7 days')
       ON CONFLICT (cache_key) DO UPDATE
       SET payload_json = EXCLUDED.payload_json, expires_at = EXCLUDED.expires_at`,
      [cacheKey, JSON.stringify({ photoIds })]
    );

    await client.query('COMMIT');
    console.log(JSON.stringify({
      ok: true,
      galleryId,
      sourceId,
      targetId,
      copiedRows: copyRes.rowCount,
      photoCount: photoIds.length,
      cacheKey
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
