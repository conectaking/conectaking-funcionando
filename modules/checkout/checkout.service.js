/**
 * CheckoutService - Contrato do módulo Checkout (KingForms - PagBank)
 * Única interface que o core pode usar; toda lógica PagBank fica aqui dentro do módulo.
 */

const db = require('../../db');
const logger = require('../../utils/logger');
const { encrypt, decrypt } = require('../../utils/encryption');
const pagbank = require('./pagbank.client');
const { PAYMENT_STATUS, PAY_BUTTON_LABEL_DEFAULT } = require('./checkout.types');

const ENCRYPTION_KEY = process.env.CHECKOUT_ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-key-change-me';

/**
 * Obter configuração de checkout do formulário (profile_item_id = item digital_form)
 */
async function getCheckoutConfig(profileItemId) {
  const r = await db.query(
    `SELECT fcc.id, fcc.profile_item_id, fcc.pagbank_seller_id, fcc.pagbank_access_token_encrypted, fcc.created_at, fcc.updated_at,
            dfi.checkout_enabled, dfi.price_cents, dfi.pay_button_label
     FROM profile_items pi
     LEFT JOIN form_checkout_configs fcc ON fcc.profile_item_id = pi.id
     LEFT JOIN digital_form_items dfi ON dfi.profile_item_id = pi.id
     WHERE pi.id = $1 AND pi.item_type = 'digital_form'`,
    [profileItemId]
  );
  if (!r.rows.length) return null;
  const row = r.rows[0];
  return {
    profile_item_id: row.profile_item_id,
    checkout_enabled: !!row.checkout_enabled,
    price_cents: row.price_cents,
    pay_button_label: row.pay_button_label || PAY_BUTTON_LABEL_DEFAULT,
    pagbank_seller_id: row.pagbank_seller_id || null
    // token nunca exposto; só usado internamente
  };
}

/**
 * Salvar/atualizar configuração de checkout (admin)
 */
async function saveCheckoutConfig(userId, profileItemId, data) {
  const client = await db.pool.connect();
  try {
    const check = await client.query(
      'SELECT id FROM profile_items WHERE id = $1 AND user_id = $2 AND item_type = $3',
      [profileItemId, userId, 'digital_form']
    );
    if (!check.rows.length) throw new Error('Formulário não encontrado ou sem permissão');

    const { checkout_enabled, price_cents, pay_button_label, pagbank_seller_id, pagbank_access_token } = data || {};

    await client.query('BEGIN');

    await client.query(
      `UPDATE digital_form_items SET
        checkout_enabled = COALESCE($2, FALSE),
        price_cents = $3,
        pay_button_label = COALESCE(NULLIF(TRIM($4), ''), 'Pagamento'),
        updated_at = NOW()
       WHERE profile_item_id = $1`,
      [profileItemId, checkout_enabled, price_cents, pay_button_label || PAY_BUTTON_LABEL_DEFAULT]
    );

    const encryptedToken = pagbank_access_token ? encrypt(pagbank_access_token, ENCRYPTION_KEY) : null;
    await client.query(
      `INSERT INTO form_checkout_configs (profile_item_id, pagbank_seller_id, pagbank_access_token_encrypted, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (profile_item_id) DO UPDATE SET
         pagbank_seller_id = COALESCE($2, form_checkout_configs.pagbank_seller_id),
         pagbank_access_token_encrypted = COALESCE($3, form_checkout_configs.pagbank_access_token_encrypted),
         updated_at = NOW()`,
      [profileItemId, pagbank_seller_id || null, encryptedToken]
    );

    await client.query('COMMIT');
    return { success: true };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Testar conexão PagBank (admin)
 */
async function testConnection(userId, profileItemId) {
  const config = await getCheckoutConfig(profileItemId);
  if (!config) throw new Error('Formulário não encontrado');
  const tokenRow = await db.query(
    'SELECT pagbank_access_token_encrypted FROM form_checkout_configs WHERE profile_item_id = $1',
    [profileItemId]
  );
  const encrypted = tokenRow.rows[0]?.pagbank_access_token_encrypted;
  if (!encrypted || !config.pagbank_seller_id) {
    return { ok: false, message: 'Configure seller ID e token antes de testar' };
  }
  const token = decrypt(encrypted, ENCRYPTION_KEY);
  return pagbank.testConnection(config.pagbank_seller_id, token);
}

/**
 * Obter submissão por ID (para página de checkout e status)
 */
async function getSubmission(submissionId) {
  const r = await db.query(
    `SELECT dfr.id, dfr.profile_item_id, dfr.response_data, dfr.responder_name, dfr.responder_email, dfr.responder_phone,
            dfr.submitted_at, dfr.payment_status, dfr.paid_at, dfr.payment_order_id, dfr.payment_charge_id,
            dfi.form_title, dfi.checkout_enabled, dfi.price_cents, dfi.pay_button_label
     FROM digital_form_responses dfr
     JOIN digital_form_items dfi ON dfi.profile_item_id = dfr.profile_item_id
     WHERE dfr.id = $1`,
    [submissionId]
  );
  if (!r.rows.length) return null;
  return r.rows[0];
}

/**
 * Criar cobrança (Pix ou cartão) - chamado pela página de checkout
 * Retorna { success, chargeId, orderId, qrCode? } ou { success: false, error }
 */
async function createCharge(submissionId, method) {
  const submission = await getSubmission(submissionId);
  if (!submission) return { success: false, error: 'Submissão não encontrada' };
  if (!submission.checkout_enabled) return { success: false, error: 'Checkout não está ativo para este formulário' };
  if (submission.payment_status === 'PAID') return { success: false, error: 'Pagamento já confirmado' };
  const amountCents = submission.price_cents;
  if (!amountCents || amountCents < 1) return { success: false, error: 'Valor não configurado' };

  const tokenRow = await db.query(
    'SELECT pagbank_access_token_encrypted FROM form_checkout_configs WHERE profile_item_id = $1',
    [submission.profile_item_id]
  );
  const encrypted = tokenRow.rows[0]?.pagbank_access_token_encrypted;
  if (!encrypted) return { success: false, error: 'Configuração PagBank não encontrada' };
  const accessToken = decrypt(encrypted, ENCRYPTION_KEY);
  const sellerId = (await db.query(
    'SELECT pagbank_seller_id FROM form_checkout_configs WHERE profile_item_id = $1',
    [submission.profile_item_id]
  )).rows[0]?.pagbank_seller_id;
  if (!sellerId) return { success: false, error: 'Seller ID não configurado' };

  const notificationUrl = process.env.PAGBANK_WEBHOOK_BASE_URL
    ? `${process.env.PAGBANK_WEBHOOK_BASE_URL.replace(/\/$/, '')}/api/webhooks/pagbank`
    : null;
  const platformAccountId = process.env.PAGBANK_PLATFORM_ACCOUNT_ID || null;

  const result = await pagbank.createCharge({
    amountCents,
    sellerId,
    accessToken,
    referenceId: String(submissionId),
    method,
    notificationUrl,
    platformAccountId,
    customerName: submission.responder_name,
    customerEmail: submission.responder_email,
    customerTaxId: (submission.response_data && submission.response_data.cpf) ? submission.response_data.cpf : null
  });

  if (!result.success) return result;

  await db.query(
    `UPDATE digital_form_responses SET
      payment_reference_id = $2, payment_order_id = $3, payment_charge_id = $4, payment_status = $5
     WHERE id = $1`,
    [submissionId, String(submissionId), result.orderId || null, result.chargeId || null, PAYMENT_STATUS.PENDING_PAYMENT]
  );

  return {
    success: true,
    chargeId: result.chargeId,
    orderId: result.orderId,
    qrCode: result.qrCode,
    qrCodeText: result.qrCodeText
  };
}

/**
 * Processar webhook PagBank (idempotente: mesmo evento 2x não duplica)
 * @param {object} payload - payload já parseado (para lógica)
 * @param {string} rawBody - body bruto para assinatura (token-{rawBody})
 * @param {string} signature - header x-authenticity-token
 */
async function processWebhook(payload, rawBody, signature) {
  const secret = process.env.PAGBANK_WEBHOOK_SECRET;
  if (!secret) {
    return { processed: false, error: 'PAGBANK_WEBHOOK_SECRET não configurado' };
  }
  if (!rawBody || !pagbank.verifyWebhookSignature(rawBody, signature, secret)) {
    return { processed: false, error: 'Assinatura inválida' };
  }

  const refId = payload.reference_id;
  const orderId = payload.id || payload.order_id;
  const chargeId = payload.id || payload.charge_id;
  const status = (payload.status || '').toUpperCase();

  const submissionId = refId ? parseInt(String(refId).replace(/^sub-/, ''), 10) : null;
  if (!submissionId || isNaN(submissionId)) {
    const byOrder = orderId ? await db.query(
      'SELECT id FROM digital_form_responses WHERE payment_order_id = $1 LIMIT 1',
      [orderId]
    ) : { rows: [] };
    const byCharge = chargeId && !byOrder.rows.length ? await db.query(
      'SELECT id FROM digital_form_responses WHERE payment_charge_id = $1 LIMIT 1',
      [chargeId]
    ) : { rows: [] };
    const row = byOrder.rows[0] || byCharge.rows[0];
    if (!row) {
      logger.warn('[Checkout] Webhook sem reference_id e sem order/charge conhecido', { orderId, chargeId });
      return { processed: true };
    }
    const sid = row.id;
    await updateSubmissionStatus(sid, status);
    return { processed: true };
  }

  const existing = await db.query(
    'SELECT id, payment_status FROM digital_form_responses WHERE id = $1',
    [submissionId]
  );
  if (!existing.rows.length) {
    logger.warn('[Checkout] Webhook reference_id não encontrado', { submissionId });
    return { processed: true };
  }
  if (existing.rows[0].payment_status === 'PAID' && status === 'PAID') {
    return { processed: true };
  }
  await updateSubmissionStatus(submissionId, status);
  return { processed: true };
}

function updateSubmissionStatus(submissionId, status) {
  if (status === 'PAID') {
    return db.query(
      `UPDATE digital_form_responses SET payment_status = $2, paid_at = NOW() WHERE id = $1`,
      [submissionId, PAYMENT_STATUS.PAID]
    );
  }
  if (['DECLINED', 'CANCELED', 'CANCELLED', 'EXPIRED', 'REFUNDED'].includes(status)) {
    return db.query(
      `UPDATE digital_form_responses SET payment_status = $2 WHERE id = $1`,
      [submissionId, status === 'CANCELED' || status === 'CANCELLED' ? PAYMENT_STATUS.CANCELED : PAYMENT_STATUS.FAILED]
    );
  }
  return Promise.resolve();
}

module.exports = {
  getCheckoutConfig,
  saveCheckoutConfig,
  testConnection,
  getSubmission,
  createCharge,
  processWebhook
};
