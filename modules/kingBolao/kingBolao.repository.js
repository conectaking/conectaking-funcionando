/**
 * King Bolão — repository (apenas tabelas king_bolao_*)
 */
const db = require('../../db');

async function listEventsByOrganizer(userId) {
  const { rows } = await db.query(
    `SELECT e.*,
            (SELECT COUNT(*)::int FROM king_bolao_participants p WHERE p.event_id = e.id AND p.status IN ('approved','winner','loser')) AS approved_count
     FROM king_bolao_events e
     WHERE e.organizer_user_id = $1
     ORDER BY e.created_at DESC`,
    [userId]
  );
  return rows;
}

async function getEventBySlug(slug) {
  const { rows } = await db.query(
    `SELECT * FROM king_bolao_events WHERE lower(trim(slug)) = lower(trim($1)) LIMIT 1`,
    [String(slug || '').trim()]
  );
  return rows[0] || null;
}

async function getEventById(id) {
  const { rows } = await db.query('SELECT * FROM king_bolao_events WHERE id = $1 LIMIT 1', [id]);
  return rows[0] || null;
}

async function insertEvent(row) {
  const { rows } = await db.query(
    `INSERT INTO king_bolao_events
      (organizer_user_id, slug, title, team_home_name, team_home_logo_url, team_away_name, team_away_logo_url,
       kickoff_at, status, pix_key, pix_holder_name, pix_instructions, owner_share_pct, winner_share_pct)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [
      row.organizerUserId,
      row.slug,
      row.title,
      row.teamHomeName || '',
      row.teamHomeLogoUrl || null,
      row.teamAwayName || '',
      row.teamAwayLogoUrl || null,
      row.kickoffAt || null,
      row.status || 'draft',
      row.pixKey || null,
      row.pixHolderName || null,
      row.pixInstructions || null,
      row.ownerSharePct ?? 30,
      row.winnerSharePct ?? 70
    ]
  );
  return rows[0];
}

async function updateEvent(id, fields) {
  const allowed = [
    'title', 'slug', 'team_home_name', 'team_home_logo_url', 'team_away_name', 'team_away_logo_url',
    'kickoff_at', 'status', 'pix_key', 'pix_holder_name', 'pix_instructions', 'cover_image_path',
    'result_home', 'result_away', 'result_published_at', 'live_home', 'live_away',
    'owner_share_pct', 'winner_share_pct', 'no_winner_policy'
  ];
  const sets = [];
  const vals = [];
  let i = 1;
  for (const [k, v] of Object.entries(fields)) {
    const col = k.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
    if (!allowed.includes(col)) continue;
    sets.push(`${col} = $${i++}`);
    vals.push(v);
  }
  if (!sets.length) return getEventById(id);
  sets.push('updated_at = NOW()');
  vals.push(id);
  const { rows } = await db.query(
    `UPDATE king_bolao_events SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    vals
  );
  return rows[0] || null;
}

async function listGroups(eventId) {
  const { rows } = await db.query(
    `SELECT * FROM king_bolao_groups WHERE event_id = $1 ORDER BY sort_order ASC, id ASC`,
    [eventId]
  );
  return rows;
}

async function insertGroup(row) {
  const { rows } = await db.query(
    `INSERT INTO king_bolao_groups (event_id, name, entry_cents, sort_order, active)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [row.eventId, row.name, row.entryCents, row.sortOrder ?? 0, row.active !== false]
  );
  return rows[0];
}

async function updateGroup(id, fields) {
  const { rows } = await db.query(
    `UPDATE king_bolao_groups SET
       name = COALESCE($2, name),
       entry_cents = COALESCE($3, entry_cents),
       sort_order = COALESCE($4, sort_order),
       active = COALESCE($5, active),
       rollover_cents = COALESCE($6, rollover_cents)
     WHERE id = $1 RETURNING *`,
    [
      id,
      fields.name ?? null,
      fields.entryCents ?? null,
      fields.sortOrder ?? null,
      fields.active ?? null,
      fields.rolloverCents ?? null
    ]
  );
  return rows[0] || null;
}

async function deleteGroup(id) {
  await db.query('DELETE FROM king_bolao_groups WHERE id = $1', [id]);
}

async function getParticipantByToken(token) {
  const { rows } = await db.query(
    `SELECT p.*, g.name AS group_name, g.entry_cents, e.slug AS event_slug, e.title AS event_title,
            e.team_home_name, e.team_away_name, e.status AS event_status,
            e.result_home, e.result_away, e.live_home, e.live_away,
            e.pix_key, e.pix_holder_name, e.pix_instructions, e.winner_share_pct, e.owner_share_pct
     FROM king_bolao_participants p
     JOIN king_bolao_groups g ON g.id = p.group_id
     JOIN king_bolao_events e ON e.id = p.event_id
     WHERE p.access_token = $1 LIMIT 1`,
    [String(token || '').trim()]
  );
  return rows[0] || null;
}

async function insertParticipant(row) {
  const { rows } = await db.query(
    `INSERT INTO king_bolao_participants
      (event_id, group_id, name, whatsapp, prediction_home, prediction_away, access_token, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [
      row.eventId,
      row.groupId,
      row.name,
      row.whatsapp,
      row.predictionHome,
      row.predictionAway,
      row.accessToken,
      row.status || 'pending_payment'
    ]
  );
  return rows[0];
}

async function updateParticipant(id, fields) {
  const { rows } = await db.query(
    `UPDATE king_bolao_participants SET
       status = COALESCE($2, status),
       proof_file_path = COALESCE($3, proof_file_path),
       proof_hash = COALESCE($4, proof_hash),
       approved_at = COALESCE($5, approved_at),
       updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [
      id,
      fields.status ?? null,
      fields.proofFilePath ?? null,
      fields.proofHash ?? null,
      fields.approvedAt ?? null
    ]
  );
  return rows[0] || null;
}

async function listParticipantsByEvent(eventId, { statuses } = {}) {
  let q = `SELECT p.*, g.name AS group_name, g.entry_cents
           FROM king_bolao_participants p
           JOIN king_bolao_groups g ON g.id = p.group_id
           WHERE p.event_id = $1`;
  const vals = [eventId];
  if (statuses?.length) {
    q += ` AND p.status = ANY($2::text[])`;
    vals.push(statuses);
  }
  q += ' ORDER BY p.created_at ASC';
  const { rows } = await db.query(q, vals);
  return rows;
}

async function listApprovedByGroup(groupId) {
  const { rows } = await db.query(
    `SELECT id, name, prediction_home, prediction_away, status
     FROM king_bolao_participants
     WHERE group_id = $1 AND status IN ('approved','winner','loser')
     ORDER BY approved_at ASC NULLS LAST, id ASC`,
    [groupId]
  );
  return rows;
}

async function countApprovedByGroup(groupId) {
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS n FROM king_bolao_participants
     WHERE group_id = $1 AND status IN ('approved','winner','loser')`,
    [groupId]
  );
  return rows[0]?.n || 0;
}

async function sumApprovedEntryByGroup(groupId) {
  const { rows } = await db.query(
    `SELECT COALESCE(SUM(g.entry_cents), 0)::int AS total
     FROM king_bolao_participants p
     JOIN king_bolao_groups g ON g.id = p.group_id
     WHERE p.group_id = $1 AND p.status IN ('approved','winner','loser')`,
    [groupId]
  );
  return rows[0]?.total || 0;
}

async function findDuplicateProofHash(hash, excludeParticipantId) {
  const { rows } = await db.query(
    `SELECT id FROM king_bolao_participants
     WHERE proof_hash = $1 AND id <> $2 LIMIT 1`,
    [hash, excludeParticipantId]
  );
  return rows[0] || null;
}

async function setParticipantsStatusByGroup(groupId, fromStatuses, toStatus, filterPred) {
  let q = `UPDATE king_bolao_participants SET status = $1, updated_at = NOW()
           WHERE group_id = $2 AND status = ANY($3::text[])`;
  const vals = [toStatus, groupId, fromStatuses];
  if (filterPred) {
    q += ' AND prediction_home = $4 AND prediction_away = $5';
    vals.push(filterPred.home, filterPred.away);
  }
  await db.query(q, vals);
}

module.exports = {
  listEventsByOrganizer,
  getEventBySlug,
  getEventById,
  insertEvent,
  updateEvent,
  listGroups,
  insertGroup,
  updateGroup,
  deleteGroup,
  getParticipantByToken,
  insertParticipant,
  updateParticipant,
  listParticipantsByEvent,
  listApprovedByGroup,
  countApprovedByGroup,
  sumApprovedEntryByGroup,
  findDuplicateProofHash,
  setParticipantsStatusByGroup
};
