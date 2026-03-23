require('dotenv').config({ quiet: true });
const db = require('../db');
const { getStagingObject } = require('../utils/rekognition/s3StagingService');
const { compareFaces } = require('../utils/rekognition/rekognitionService');

async function getRefBytes(galleryId, clientId) {
  const q = await db.query(
    'SELECT reference_r2_key FROM rekognition_client_faces WHERE gallery_id=$1 AND client_id=$2 LIMIT 1',
    [galleryId, clientId]
  );
  const ref = q.rows[0]?.reference_r2_key;
  if (!ref) return null;
  if (String(ref).toLowerCase().startsWith('staging/')) return getStagingObject(ref);
  return null;
}

async function run() {
  const galleryId = 18;
  const clients = (await db.query(
    `SELECT c.id, c.email, c.created_at,
            COALESCE(m.photos,0)::int AS photos
     FROM king_gallery_clients c
     LEFT JOIN (
       SELECT rfm.client_id, COUNT(DISTINCT rpf.photo_id)::int AS photos
       FROM rekognition_face_matches rfm
       JOIN rekognition_photo_faces rpf ON rpf.id = rfm.photo_face_id
       JOIN king_photos kp ON kp.id = rpf.photo_id
       WHERE kp.gallery_id=$1
       GROUP BY rfm.client_id
     ) m ON m.client_id=c.id
     WHERE c.gallery_id=$1 AND c.email LIKE '__ks_face_sess_%@internal.king'
     ORDER BY c.id DESC
     LIMIT 8`,
    [galleryId]
  )).rows;

  const latest = clients[0];
  if (!latest) {
    console.log(JSON.stringify({ ok: false, reason: 'no_clients' }, null, 2));
    await db.pool.end();
    return;
  }
  const latestId = Number(latest.id);
  const latestRef = await getRefBytes(galleryId, latestId);
  const sims = [];
  if (latestRef && latestRef.length > 0) {
    for (const c of clients.slice(1)) {
      const cid = Number(c.id);
      const ref = await getRefBytes(galleryId, cid);
      if (!ref || ref.length === 0) continue;
      try {
        const out = await compareFaces(latestRef, ref);
        const sim = Number(out?.FaceMatches?.[0]?.Similarity || 0);
        sims.push({ candidateId: cid, similarity: sim, photos: Number(c.photos || 0), email: c.email });
      } catch (e) {
        sims.push({ candidateId: cid, similarity: 0, photos: Number(c.photos || 0), email: c.email, error: e?.message || String(e) });
      }
    }
  }
  sims.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
  console.log(JSON.stringify({
    ok: true,
    latest: { id: latestId, email: latest.email, created_at: latest.created_at, photos: Number(latest.photos || 0), hasRef: !!latestRef },
    clients,
    similarityToLatest: sims
  }, null, 2));
  await db.pool.end();
}

run().catch(async (e) => {
  console.error(e?.message || e);
  try { await db.pool.end(); } catch (_) {}
  process.exit(1);
});
