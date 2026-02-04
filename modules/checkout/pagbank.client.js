/**
 * Cliente PagBank (API de Pedidos) - Módulo Checkout KingForms
 * Documentação: https://developer.pagbank.com.br/docs/apis-pagbank
 * Orders: POST /orders (PIX com split), notificações via webhook
 */

const crypto = require('crypto');
const logger = require('../../utils/logger');
const { SPLIT_PLATFORM_PERCENT, SPLIT_SELLER_PERCENT } = require('./checkout.types');

const BASE_URL = process.env.PAGBANK_API_BASE_URL || 'https://sandbox.api.pagseguro.com';

/**
 * Chamada HTTP à API PagBank (Bearer token)
 */
async function apiRequest(accessToken, method, path, body = null) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  const opts = { method, headers };
  if (body && (method === 'POST' || method === 'PUT')) {
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    data = null;
  }
  if (!res.ok) {
    logger.warn('[Checkout] PagBank API error', { status: res.status, path, message: data?.error_description || data?.message || text });
    throw new Error(data?.error_description || data?.message || `PagBank API ${res.status}: ${text.substring(0, 200)}`);
  }
  return data;
}

/**
 * Testar conexão (GET orders com limit 1)
 */
async function testConnection(sellerId, accessToken) {
  if (!sellerId || !accessToken) {
    return { ok: false, message: 'Credenciais incompletas' };
  }
  try {
    await apiRequest(accessToken, 'GET', '/orders?limit=1');
    return { ok: true, message: 'Conexão OK' };
  } catch (e) {
    return { ok: false, message: e.message || 'Falha ao conectar na API PagBank' };
  }
}

/**
 * Criar pedido com PIX e split (10% plataforma, 90% vendedor)
 * referenceId = submissionId (digital_form_responses.id)
 */
async function createOrderPix(accessToken, params) {
  const {
    amountCents,
    referenceId,
    customerName,
    customerEmail,
    customerTaxId,
    notificationUrl,
    platformAccountId,
    sellerAccountId
  } = params;

  const expirationDate = new Date(Date.now() + 30 * 60 * 1000); // 30 min
  const expirationStr = expirationDate.toISOString().replace(/\.\d{3}Z$/, '-00:00');

  const platformValue = Math.round((amountCents * SPLIT_PLATFORM_PERCENT) / 100);
  const sellerValue = amountCents - platformValue;

  const body = {
    reference_id: String(referenceId),
    customer: {
      name: customerName || 'Cliente',
      email: customerEmail || 'cliente@email.com',
      tax_id: (customerTaxId || '').replace(/\D/g, '').slice(0, 11) || '00000000000',
      phones: [{ country: '55', area: '11', number: '999999999', type: 'MOBILE' }]
    },
    items: [
      { reference_id: `sub-${referenceId}`, name: 'Formulário KingForms', quantity: 1, unit_amount: amountCents }
    ],
    qr_codes: [
      {
        amount: { value: amountCents },
        expiration_date: expirationStr,
        splits: {
          method: 'FIXED',
          receivers: [
            ...(platformAccountId && platformValue > 0
              ? [{ account: { id: platformAccountId }, amount: { value: platformValue } }]
              : []),
            { account: { id: sellerAccountId }, amount: { value: sellerValue } }
          ]
        }
      }
    ],
    notification_urls: notificationUrl ? [notificationUrl] : []
  };

  const order = await apiRequest(accessToken, 'POST', '/orders', body);
  const qr = order.qr_codes && order.qr_codes[0];
  const qrId = qr?.id;
  const qrText = qr?.text;
  let qrCodeBase64 = null;
  if (qrId) {
    try {
      const qrRes = await fetch(`${BASE_URL}/qrcode/${qrId}/base64`, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'text/plain' }
      });
      if (qrRes.ok) qrCodeBase64 = await qrRes.text();
    } catch (_) {}
  }
  return {
    success: true,
    orderId: order.id,
    chargeId: qrId || order.id,
    qrCode: qrCodeBase64 || qrText,
    qrCodeText: qrText
  };
}

/**
 * Criar cobrança (Pix ou cartão)
 * Cartão: por ora retorna erro "use Pix" ou podemos implementar POST /orders/{id}/pay com payment_method depois
 */
async function createCharge(params) {
  const {
    amountCents,
    sellerId,
    accessToken,
    referenceId,
    method,
    notificationUrl,
    platformAccountId,
    customerName,
    customerEmail,
    customerTaxId
  } = params || {};

  if (!amountCents || amountCents < 1 || !accessToken || !referenceId) {
    return { success: false, error: 'Parâmetros inválidos para criar cobrança' };
  }

  const sellerAccountId = sellerId || params.sellerAccountId;
  if (!sellerAccountId) {
    return { success: false, error: 'ID da conta do vendedor (seller) não configurado' };
  }

  if (method === 'pix') {
    try {
      return await createOrderPix(accessToken, {
        amountCents,
        referenceId,
        customerName,
        customerEmail,
        customerTaxId,
        notificationUrl,
        platformAccountId,
        sellerAccountId
      });
    } catch (e) {
      return { success: false, error: e.message || 'Falha ao criar PIX' };
    }
  }

  if (method === 'card') {
    return { success: false, error: 'Pagamento com cartão: em breve. Use Pix por enquanto.' };
  }

  return { success: false, error: 'Método inválido. Use pix ou card.' };
}

/**
 * Verificar assinatura do webhook PagBank
 * Header: x-authenticity-token = SHA256(secret + '-' + payload)
 */
function verifyWebhookSignature(payload, signature, secret) {
  if (!payload || !secret) return false;
  const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const toHash = `${secret}-${payloadStr}`;
  const hash = crypto.createHash('sha256').update(toHash, 'utf8').digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(hash, 'hex'));
}

module.exports = {
  testConnection,
  createCharge,
  verifyWebhookSignature,
  apiRequest
};
