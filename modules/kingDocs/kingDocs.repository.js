/**
 * Repository: King Docs (isolado — apenas tabelas king_docs_*)
 */
const db = require('../../db');

async function getVault(userId) {
  const { rows } = await db.query(
    'SELECT field_data, updated_at FROM king_docs_vault WHERE user_id = $1',
    [userId]
  );
  return rows[0] || null;
}

async function upsertVault(userId, fieldData) {
  await db.query(
    `INSERT INTO king_docs_vault (user_id, field_data, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (user_id) DO UPDATE SET field_data = EXCLUDED.field_data, updated_at = NOW()`,
    [userId, JSON.stringify(fieldData || {})]
  );
}

async function insertFile(row) {
  const { rows } = await db.query(
    `INSERT INTO king_docs_files (user_id, doc_type, storage_key, mime, original_name)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [row.userId, row.docType, row.storageKey, row.mime || null, row.originalName || null]
  );
  return rows[0];
}

async function listFiles(userId) {
  const { rows } = await db.query(
    `SELECT id, doc_type, mime, original_name, created_at FROM king_docs_files WHERE user_id = $1 ORDER BY id ASC`,
    [userId]
  );
  return rows;
}

async function getFileByIdForUser(fileId, userId) {
  const { rows } = await db.query(
    'SELECT * FROM king_docs_files WHERE id = $1 AND user_id = $2',
    [fileId, userId]
  );
  return rows[0] || null;
}

async function deleteFile(fileId, userId) {
  const { rows } = await db.query(
    'DELETE FROM king_docs_files WHERE id = $1 AND user_id = $2 RETURNING storage_key',
    [fileId, userId]
  );
  return rows[0] || null;
}

async function insertShare(row) {
  const { rows } = await db.query(
    `INSERT INTO king_docs_share_links
      (token, user_id, snapshot, password_hash, viewer_token, expires_at, max_views, view_count)
     VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, 0)
     RETURNING *`,
    [
      row.token,
      row.userId,
      JSON.stringify(row.snapshot || {}),
      row.passwordHash || null,
      row.viewerToken || null,
      row.expiresAt || null,
      row.maxViews != null ? row.maxViews : null
    ]
  );
  return rows[0];
}

async function findShareByToken(token) {
  const { rows } = await db.query('SELECT * FROM king_docs_share_links WHERE token = $1', [token]);
  return rows[0] || null;
}

async function listShares(userId) {
  const { rows } = await db.query(
    `SELECT id, token, expires_at, revoked_at, max_views, view_count, created_at,
            (password_hash IS NOT NULL) AS has_password
     FROM king_docs_share_links WHERE user_id = $1 ORDER BY id DESC`,
    [userId]
  );
  return rows;
}

async function revokeShare(shareId, userId) {
  const { rows } = await db.query(
    `UPDATE king_docs_share_links SET revoked_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING id`,
    [shareId, userId]
  );
  return rows[0] || null;
}

/** Remove o registo da partilha (deixa de aparecer na lista). */
async function deleteSharePermanent(shareId, userId) {
  const { rows } = await db.query(
    'DELETE FROM king_docs_share_links WHERE id = $1 AND user_id = $2 RETURNING id',
    [shareId, userId]
  );
  return rows[0] || null;
}

async function setViewerToken(shareId, viewerToken) {
  await db.query('UPDATE king_docs_share_links SET viewer_token = $1 WHERE id = $2', [viewerToken, shareId]);
}

async function incrementViewCount(shareId) {
  await db.query(
    'UPDATE king_docs_share_links SET view_count = view_count + 1 WHERE id = $1',
    [shareId]
  );
}

module.exports = {
  getVault,
  upsertVault,
  insertFile,
  listFiles,
  getFileByIdForUser,
  deleteFile,
  insertShare,
  findShareByToken,
  listShares,
  revokeShare,
  deleteSharePermanent,
  setViewerToken,
  incrementViewCount
};
