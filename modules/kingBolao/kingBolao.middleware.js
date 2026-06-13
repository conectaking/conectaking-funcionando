/**
 * King Bolão — middleware isolado
 */
const db = require('../../db');

function parseAllowlist() {
  const raw = String(process.env.KING_BOLAO_ADMIN_USER_IDS || '').trim();
  if (!raw) return new Set();
  return new Set(
    raw.split(/[,;\s]+/)
      .map((x) => parseInt(x, 10))
      .filter((n) => Number.isFinite(n) && n > 0)
  );
}

async function userIsKingBolaoAdmin(userId) {
  const uid = parseInt(userId, 10);
  if (!uid) return false;
  const allow = parseAllowlist();
  if (allow.has(uid)) return true;
  const { rows } = await db.query(
    'SELECT is_admin, account_type FROM users WHERE id = $1 LIMIT 1',
    [uid]
  );
  const u = rows[0];
  if (!u) return false;
  if (u.is_admin === true) return true;
  const at = String(u.account_type || '').toLowerCase();
  return at === 'adm_principal' || at === 'abm';
}

function requireKingBolaoAccess(req, res, next) {
  userIsKingBolaoAdmin(req.user?.userId)
    .then((ok) => {
      if (!ok) {
        return res.status(403).json({ success: false, message: 'Acesso ao King Bolão não liberado para esta conta.' });
      }
      return next();
    })
    .catch(next);
}

async function requireEventOrganizer(req, res, next) {
  try {
    const eventId = parseInt(req.params.eventId || req.params.id, 10);
    if (!eventId) {
      return res.status(400).json({ success: false, message: 'eventId inválido.' });
    }
    const uid = parseInt(req.user?.userId, 10);
    const isAdmin = await userIsKingBolaoAdmin(uid);
    const { rows } = await db.query(
      'SELECT id, organizer_user_id FROM king_bolao_events WHERE id = $1 LIMIT 1',
      [eventId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Bolão não encontrado.' });
    }
    const ev = rows[0];
    if (!isAdmin && parseInt(ev.organizer_user_id, 10) !== uid) {
      return res.status(403).json({ success: false, message: 'Sem permissão neste bolão.' });
    }
    req.kingBolaoEvent = ev;
    return next();
  } catch (e) {
    return next(e);
  }
}

module.exports = {
  userIsKingBolaoAdmin,
  requireKingBolaoAccess,
  requireEventOrganizer
};
