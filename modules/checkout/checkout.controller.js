/**
 * CheckoutController - Módulo Checkout KingForms (PagBank)
 */

const checkoutService = require('./checkout.service');
const validators = require('./checkout.validators');
const { asyncHandler } = require('../../middleware/errorHandler');
const { protectUser } = require('../../middleware/protectUser');
const db = require('../../db');

/**
 * GET página de checkout (público) - dados para renderizar
 * Rota real pode ser GET /:slug/form/checkout?submissionId=... ou GET /forms/:slug/checkout?submissionId=...
 */
async function getCheckoutPage(req, res) {
  const { submissionId } = req.query;
  const v = validators.validateSubmissionId(submissionId);
  if (!v.valid) {
    return res.status(400).json({ success: false, message: v.error });
  }
  const submission = await checkoutService.getSubmission(v.value);
  if (!submission) {
    return res.status(404).json({ success: false, message: 'Submissão não encontrada' });
  }
  const status = submission.payment_status || 'PENDING_PAYMENT';
  res.json({
    success: true,
    submission: {
      id: submission.id,
      form_title: submission.form_title,
      price_cents: submission.price_cents,
      responder_name: submission.responder_name,
      responder_email: submission.responder_email,
      responder_phone: submission.responder_phone,
      submitted_at: submission.submitted_at,
      payment_status: status,
      paid_at: submission.paid_at
    }
  });
}

/**
 * POST /api/checkout/create - Criar cobrança (Pix ou cartão)
 */
async function createCharge(req, res) {
  const v = validators.validateCreateChargeBody(req.body);
  if (!v.valid) {
    return res.status(400).json({ success: false, errors: v.errors });
  }
  const cardData = v.card || null;
  const installments = v.installments || 1;
  const result = await checkoutService.createCharge(v.submissionId, v.method, { card: cardData, installments });
  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error });
  }
  res.json({
    success: true,
    chargeId: result.chargeId,
    orderId: result.orderId,
    qrCode: result.qrCode,
    qrCodeText: result.qrCodeText,
    paid: result.paid
  });
}

/**
 * POST /api/checkout/test-connection - Admin testar conexão PagBank
 * Body opcional: pagbank_seller_id, pagbank_access_token (para testar antes de salvar)
 */
async function testConnection(req, res) {
  const userId = req.user.userId;
  const profileItemId = parseInt(req.body.profile_item_id || req.params.itemId, 10);
  if (!profileItemId || isNaN(profileItemId)) {
    return res.status(400).json({ success: false, message: 'profile_item_id inválido' });
  }
  const tokenFromBody = (req.body.pagbank_access_token || '').trim();
  const sellerIdFromBody = (req.body.pagbank_seller_id || '').trim();
  const result = await checkoutService.testConnection(userId, profileItemId, {
    pagbank_access_token: tokenFromBody || undefined,
    pagbank_seller_id: sellerIdFromBody || undefined
  });
  res.json({ ok: result.ok, message: result.message });
}

/**
 * GET /api/checkout/preview-link?itemId=123 - Admin obter link para visualizar a página de checkout (protegido)
 * Retorna { url, slug, itemId, submissionId } ou { url: null, message } se não houver nenhuma resposta ainda.
 */
async function getPreviewLink(req, res) {
  const userId = req.user.userId;
  const itemId = parseInt(req.query.itemId, 10);
  if (!itemId || isNaN(itemId)) {
    return res.status(400).json({ success: false, message: 'itemId inválido' });
  }
  const check = await db.query(
    'SELECT pi.id, u.profile_slug FROM profile_items pi JOIN users u ON u.id = pi.user_id WHERE pi.id = $1 AND pi.user_id = $2 AND pi.item_type = $3',
    [itemId, userId, 'digital_form']
  );
  if (!check.rows.length) {
    return res.status(404).json({ success: false, message: 'Formulário não encontrado' });
  }
  const slug = check.rows[0].profile_slug || '';
  if (!slug) {
    return res.json({ url: null, message: 'Configure o slug do seu perfil para gerar o link.' });
  }
  const resp = await db.query(
    'SELECT id FROM digital_form_responses WHERE profile_item_id = $1 ORDER BY submitted_at DESC LIMIT 1',
    [itemId]
  );
  if (!resp.rows.length) {
    return res.json({
      url: null,
      slug,
      itemId,
      message: 'Nenhuma resposta ainda. Envie o formulário uma vez (como visitante) para gerar o link. Depois use o botão abaixo para abrir a página de checkout.'
    });
  }
  const submissionId = resp.rows[0].id;
  const baseUrl = process.env.PUBLIC_APP_URL || process.env.APP_URL || '';
  const url = baseUrl
    ? `${baseUrl.replace(/\/$/, '')}/${encodeURIComponent(slug)}/form/${itemId}/checkout?submissionId=${submissionId}`
    : null;
  return res.json({ url, slug, itemId, submissionId });
}

/**
 * GET /api/checkout/config/:itemId - Admin obter config (protegido)
 */
async function getConfig(req, res) {
  const userId = req.user.userId;
  const itemId = parseInt(req.params.itemId, 10);
  if (!itemId || isNaN(itemId)) {
    return res.status(400).json({ success: false, message: 'itemId inválido' });
  }
  const check = await db.query(
    'SELECT id FROM profile_items WHERE id = $1 AND user_id = $2 AND item_type = $3',
    [itemId, userId, 'digital_form']
  );
  if (!check.rows.length) {
    return res.status(404).json({ success: false, message: 'Formulário não encontrado' });
  }
  const config = await checkoutService.getCheckoutConfig(itemId);
  res.json({ success: true, config: config || {} });
}

/**
 * PUT /api/checkout/config/:itemId - Admin salvar config (protegido)
 */
async function saveConfig(req, res) {
  const userId = req.user.userId;
  const itemId = parseInt(req.params.itemId, 10);
  if (!itemId || isNaN(itemId)) {
    return res.status(400).json({ success: false, message: 'itemId inválido' });
  }
  await checkoutService.saveCheckoutConfig(userId, itemId, req.body);
  res.json({ success: true });
}

/**
 * POST /api/webhooks/pagbank - Webhook PagBank (sem protectUser)
 * Aceita: application/json (webhook moderno) ou application/x-www-form-urlencoded (Notificação de transação)
 * req.body é Buffer (raw); assinatura: x-authenticity-token (só no fluxo moderno)
 */
async function webhookPagbank(req, res) {
  const signature = (req.headers['x-authenticity-token'] || req.headers['x-pagbank-signature'] || '').trim();
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : (typeof req.body === 'string' ? req.body : '');
  const contentType = (req.headers['content-type'] || '').toLowerCase();
  let payload = {};
  if (rawBody) {
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const qs = require('querystring');
      payload = qs.parse(rawBody);
    } else {
      try {
        payload = JSON.parse(rawBody);
      } catch (_) {
        return res.status(400).json({ error: 'Payload JSON inválido' });
      }
    }
  }
  const result = await checkoutService.processWebhook(payload, rawBody, signature);
  if (!result.processed && result.error) {
    return res.status(400).json({ error: result.error });
  }
  res.status(200).json({ received: true });
}

module.exports = {
  getCheckoutPage,
  createCharge,
  testConnection,
  getPreviewLink,
  getConfig,
  saveConfig,
  webhookPagbank
};
