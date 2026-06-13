/**
 * King Bolão — middleware isolado
 */
const db = require('../../db');
const { normalizePlanCodeForModuleAvailability } = require('../../utils/plan-module-code');
const { requireModule } = require('../../middleware/requireModule');

const accountTypeToPlanCode = {
  individual: 'basic',
  individual_com_logo: 'premium',
  basic: 'basic',
  king_start: 'basic',
  premium: 'premium',
  king_prime: 'premium',
  business_owner: 'king_corporate',
  enterprise: 'king_corporate',
  king_base: 'king_base',
  king_essential: 'king_base',
  king_finance: 'king_finance',
  king_finance_plus: 'king_finance_plus',
  king_premium_plus: 'king_premium_plus',
  king_corporate: 'king_corporate',
  free: 'free',
  adm_principal: 'adm_principal',
  abm: 'adm_principal',
  team_member: 'basic'
};

async function userHasKingBolaoModule(userId) {
  const uid = String(userId || '').trim();
  if (!uid) return false;

  const userRow = await db.query(
    'SELECT is_admin, account_type, subscription_id FROM users WHERE id = $1 LIMIT 1',
    [uid]
  );
  const user = userRow.rows[0];
  if (!user) return false;

  let planCode = null;
  if (user.subscription_id) {
    const planRow = await db.query(
      'SELECT plan_code FROM subscription_plans WHERE id = $1 AND is_active = true',
      [user.subscription_id]
    );
    if (planRow.rows.length > 0) {
      planCode = normalizePlanCodeForModuleAvailability(planRow.rows[0].plan_code);
    }
  }
  if (!planCode) {
    planCode = accountTypeToPlanCode[user.account_type] || user.account_type;
  }
  planCode = normalizePlanCodeForModuleAvailability(planCode);

  const exclRow = await db.query(
    'SELECT 1 FROM individual_user_plan_exclusions WHERE user_id = $1 AND module_type = $2',
    [uid, 'king_bolao']
  ).catch(() => ({ rows: [] }));
  if (exclRow.rows && exclRow.rows.length > 0) return false;

  const indRow = await db.query(
    'SELECT 1 FROM individual_user_plans WHERE user_id = $1 AND module_type = $2',
    [uid, 'king_bolao']
  ).catch(() => ({ rows: [] }));
  if (indRow.rows && indRow.rows.length > 0) return true;

  const modRow = await db.query(
    `SELECT 1 FROM module_plan_availability
     WHERE plan_code = $1 AND module_type = 'king_bolao' AND is_available = true`,
    [planCode]
  );
  return modRow.rows.length > 0;
}

function requireKingBolaoAccess(req, res, next) {
  return requireModule('king_bolao')(req, res, next);
}

async function requireEventOrganizer(req, res, next) {
  try {
    const eventId = parseInt(req.params.eventId || req.params.id, 10);
    if (!eventId) {
      return res.status(400).json({ success: false, message: 'eventId inválido.' });
    }
    const uid = String(req.user?.userId || '').trim();
    const userRow = await db.query('SELECT is_admin FROM users WHERE id = $1 LIMIT 1', [uid]);
    const isPlatformAdmin = userRow.rows[0]?.is_admin === true;
    const { rows } = await db.query(
      'SELECT id, organizer_user_id FROM king_bolao_events WHERE id = $1 LIMIT 1',
      [eventId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Bolão não encontrado.' });
    }
    const ev = rows[0];
    if (!isPlatformAdmin && String(ev.organizer_user_id || '').trim() !== uid) {
      return res.status(403).json({ success: false, message: 'Sem permissão neste bolão.' });
    }
    req.kingBolaoEvent = ev;
    return next();
  } catch (e) {
    return next(e);
  }
}

module.exports = {
  userHasKingBolaoModule,
  requireKingBolaoAccess,
  requireEventOrganizer
};
