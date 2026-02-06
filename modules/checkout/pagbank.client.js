/**
 * Cliente PagBank (API de Pedidos) - Módulo Checkout KingForms
 * Documentação: https://developer.pagbank.com.br/docs/apis-pagbank
 * Orders: POST /orders (PIX com split), notificações via webhook
 */

const crypto = require('crypto');
const logger = require('../../utils/logger');
const { SPLIT_PLATFORM_PERCENT, SPLIT_SELLER_PERCENT } = require('./checkout.types');

const BASE_URL = process.env.PAGBANK_API_BASE_URL || process.env.PAGBANK_API_URL || 'https://sandbox.api.pagseguro.com';
// API legada para consultar notificação (Notificação de transação - painel comercial)
const LEGACY_BASE_URL = process.env.PAGBANK_LEGACY_API_URL || 'https://ws.sandbox.pagseguro.uol.com.br';

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
    const rawMsg = (e && e.message) || 'Falha ao conectar na API PagBank';
    logger.warn('[Checkout] testConnection failed', { error: rawMsg, sellerId, baseUrl: BASE_URL });
    const friendlyMsg = /fetch failed|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|network/i.test(rawMsg)
      ? 'Não foi possível conectar à API PagBank. Verifique: (1) URL da API no servidor (sandbox vs produção), (2) token válido, (3) se o servidor consegue acessar a internet.'
      : rawMsg;
    return { ok: false, message: friendlyMsg };
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
 * Endereço mínimo para pedido com cartão (exigido pela API em alguns fluxos)
 */
function defaultShipping() {
  return {
    address: {
      street: 'Avenida Brigadeiro Faria Lima',
      number: '1384',
      complement: 'Sala 1',
      locality: 'Pinheiros',
      city: 'São Paulo',
      region_code: 'SP',
      country: 'BRA',
      postal_code: '01452002'
    }
  };
}

/**
 * Criar pedido com cartão (crédito ou débito) e split 10% plataforma / 90% vendedor
 * Documentação: Crie e pague um pedido com divisão do pagamento (cartão)
 */
async function createOrderCard(accessToken, params) {
  const {
    amountCents,
    referenceId,
    customerName,
    customerEmail,
    customerTaxId,
    notificationUrl,
    platformAccountId,
    sellerAccountId,
    cardNumber,
    expMonth,
    expYear,
    securityCode,
    holderName,
    holderTaxId,
    cardType,
    installments
  } = params || {};

  const onlyNumbers = (v) => String(v || '').replace(/\D/g, '');
  const taxId = onlyNumbers(customerTaxId || holderTaxId || '').slice(0, 11) || '00000000000';
  const holderTaxIdClean = onlyNumbers(holderTaxId || customerTaxId || '').slice(0, 11) || taxId;

  const body = {
    reference_id: String(referenceId),
    customer: {
      name: customerName || 'Cliente',
      email: customerEmail || 'cliente@email.com',
      tax_id: taxId,
      phones: [{ country: '55', area: '11', number: '999999999', type: 'MOBILE' }]
    },
    items: [
      { reference_id: `sub-${referenceId}`, name: 'Formulário KingForms', quantity: 1, unit_amount: amountCents }
    ],
    shipping: defaultShipping(),
    notification_urls: notificationUrl ? [notificationUrl] : [],
    charges: [
      {
        reference_id: `sub-${referenceId}`,
        description: 'Pagamento KingForms',
        amount: { value: amountCents, currency: 'BRL' },
        payment_method: {
          type: cardType === 'debit' ? 'DEBIT_CARD' : 'CREDIT_CARD',
          installments: Math.min(Math.max(parseInt(installments, 10) || 1, 1), 12),
          capture: true,
          card: {
            number: onlyNumbers(cardNumber),
            exp_month: String(expMonth || '').padStart(2, '0').slice(-2),
            exp_year: String(expYear || '').slice(-2),
            security_code: String(securityCode || '').replace(/\D/g, '').slice(0, 4),
            holder: {
              name: (holderName || customerName || 'Titular').trim().slice(0, 64),
              tax_id: holderTaxIdClean
            },
            store: false
          }
        },
        splits: {
          method: 'PERCENTAGE',
          receivers: [
            ...(platformAccountId && SPLIT_PLATFORM_PERCENT > 0
              ? [{ account: { id: platformAccountId }, amount: { value: SPLIT_PLATFORM_PERCENT } }]
              : []),
            { account: { id: sellerAccountId }, amount: { value: SPLIT_SELLER_PERCENT } }
          ]
        }
      }
    ]
  };

  const order = await apiRequest(accessToken, 'POST', '/orders', body);
  const charge = order.charges && order.charges[0];
  const chargeId = charge?.id;
  const status = charge?.status || order.status;

  return {
    success: true,
    orderId: order.id,
    chargeId: chargeId || order.id,
    status,
    paid: status === 'PAID'
  };
}

/**
 * Criar cobrança (Pix ou cartão com split 10% plataforma / 90% vendedor)
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

  if (method === 'card' || method === 'credit_card' || method === 'debit_card') {
    const cardType = method === 'debit_card' ? 'debit' : 'credit';
    const cardNumber = params.card_number || params.card?.number;
    const expMonth = params.exp_month || params.card?.exp_month;
    const expYear = params.exp_year || params.card?.exp_year;
    const securityCode = params.security_code || params.card?.security_code;
    const holderName = params.holder_name || params.card?.holder_name;
    const holderTaxId = params.holder_tax_id || params.card?.holder_tax_id;
    if (!cardNumber || !expMonth || !expYear || !securityCode || !holderName) {
      return { success: false, error: 'Dados do cartão incompletos (número, validade, CVV e nome do titular)' };
    }
    try {
      return await createOrderCard(accessToken, {
        amountCents,
        referenceId,
        customerName: params.customerName || customerName,
        customerEmail: params.customerEmail || customerEmail,
        customerTaxId: params.customerTaxId || customerTaxId,
        notificationUrl,
        platformAccountId,
        sellerAccountId,
        cardNumber,
        expMonth,
        expYear,
        securityCode,
        holderName,
        holderTaxId,
        cardType,
        installments: params.installments || 1
      });
    } catch (e) {
      return { success: false, error: e.message || 'Falha ao processar cartão' };
    }
  }

  return { success: false, error: 'Método inválido. Use pix, card, credit_card ou debit_card.' };
}

/**
 * Verificar assinatura do webhook PagBank (só existe no webhook moderno de dev.pagbank.com.br)
 * Header: x-authenticity-token = SHA256(secret + '-' + payload)
 */
function verifyWebhookSignature(payload, signature, secret) {
  if (!payload || !secret) return false;
  const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const toHash = `${secret}-${payloadStr}`;
  const hash = crypto.createHash('sha256').update(toHash, 'utf8').digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(hash, 'hex'));
}

/**
 * Consultar transação pela notificação legada (Notificação de transação - painel comercial)
 * GET .../v3/transactions/notifications/{notificationCode}?email=...&token=...
 * Resposta XML: <reference>, <status> (1=aguardando, 2=em análise, 3=paga, 7=cancelada, etc.)
 * Não usa Bearer; usa email + token na query (credenciais da conta).
 */
async function getTransactionByNotificationCode(notificationCode) {
  const email = process.env.PAGBANK_EMAIL || '';
  const token = process.env.PAGBANK_TOKEN || '';
  if (!notificationCode || !email || !token) {
    return { success: false, error: 'notificationCode, PAGBANK_EMAIL e PAGBANK_TOKEN são obrigatórios para consulta legada' };
  }
  const url = `${LEGACY_BASE_URL}/v3/transactions/notifications/${encodeURIComponent(notificationCode)}?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
  try {
    const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/xml' } });
    const text = await res.text();
    if (!res.ok) {
      logger.warn('[Checkout] PagBank legacy notification consult error', { status: res.status, notificationCode });
      return { success: false, error: `PagBank API ${res.status}` };
    }
    const reference = (text.match(/<reference>([^<]*)<\/reference>/i) || [])[1];
    const statusStr = (text.match(/<status>([^<]*)<\/status>/i) || [])[1];
    const status = statusStr ? parseInt(statusStr, 10) : null;
    return { success: true, reference: (reference || '').trim(), status };
  } catch (e) {
    logger.warn('[Checkout] PagBank legacy consult exception', { message: e.message });
    return { success: false, error: e.message || 'Falha ao consultar notificação' };
  }
}

/**
 * Mapear status numérico da API legada para nosso status
 * 1=aguardando, 2=em análise, 3=paga, 4=disponível, 5=em disputa, 6=devolvida, 7=cancelada, 8=debitado, 9=retenção
 */
function legacyStatusToPaymentStatus(legacyStatus) {
  if (legacyStatus === 3 || legacyStatus === 4) return 'PAID';
  if (legacyStatus === 7 || legacyStatus === 8) return 'CANCELED';
  if (legacyStatus === 5 || legacyStatus === 6 || legacyStatus === 9) return 'FAILED';
  return null;
}

module.exports = {
  testConnection,
  createCharge,
  verifyWebhookSignature,
  apiRequest,
  getTransactionByNotificationCode,
  legacyStatusToPaymentStatus
};
