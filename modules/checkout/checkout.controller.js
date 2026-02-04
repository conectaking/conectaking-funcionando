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
  const result = await checkoutService.createCharge(v.submissionId, v.method);
  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error });
  }
  res.json({
    success: true,
    chargeId: result.chargeId,
    orderId: result.orderId,
    qrCode: result.qrCode
  });
}

/**
 * POST /api/checkout/test-connection - Admin testar conexão PagBank
 */
async function testConnection(req, res) {
  const userId = req.user.userId;
  const profileItemId = parseInt(req.body.profile_item_id || req.params.itemId, 10);
  if (!profileItemId || isNaN(profileItemId)) {
    return res.status(400).json({ success: false, message: 'profile_item_id inválido' });
  }
  const result = await checkoutService.testConnection(userId, profileItemId);
  res.json({ ok: result.ok, message: result.message });
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
 */
async function webhookPagbank(req, res) {
  const signature = req.headers['x-pagbank-signature'] || req.headers['x-webhook-signature'] || '';
  const result = await checkoutService.processWebhook(req.body, signature);
  if (!result.processed && result.error) {
    return res.status(400).json({ error: result.error });
  }
  res.status(200).json({ received: true });
}

module.exports = {
  getCheckoutPage,
  createCharge,
  testConnection,
  getConfig,
  saveConfig,
  webhookPagbank
};
