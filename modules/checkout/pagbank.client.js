/**
 * Cliente PagBank (wrapper) - Módulo Checkout KingForms
 * Isolado aqui; o core não usa este arquivo.
 * Implementação real depende da API oficial PagBank (ex.: OAuth + Charges API).
 * Este stub permite montar o fluxo e trocar por implementação real depois.
 */

const logger = require('../../utils/logger');

/**
 * Testar conexão com as credenciais (seller_id + access_token)
 * @param {string} sellerId
 * @param {string} accessToken (descriptografado)
 * @returns {Promise<{ ok: boolean, message?: string }>}
 */
async function testConnection(sellerId, accessToken) {
  if (!sellerId || !accessToken) {
    return { ok: false, message: 'Credenciais incompletas' };
  }
  // TODO: chamar API PagBank (ex.: GET /oauth/token ou endpoint de conta)
  logger.info('[Checkout] testConnection stub chamado', { sellerId: sellerId ? '***' : null });
  return { ok: true, message: 'Conexão OK (stub)' };
}

/**
 * Criar cobrança (Pix ou cartão) com split
 * @param {Object} params - { amountCents, sellerId, accessToken, referenceId, platformAccountId?, splitPercent }
 * @returns {Promise<{ success: boolean, chargeId?: string, orderId?: string, qrCode?: string, error?: string }>}
 */
async function createCharge(params) {
  const { amountCents, sellerId, accessToken, referenceId, method } = params || {};
  if (!amountCents || amountCents < 1 || !sellerId || !accessToken || !referenceId) {
    return { success: false, error: 'Parâmetros inválidos para criar cobrança' };
  }
  // TODO: integrar API PagBank (Charges) + split 10% plataforma / 90% vendedor
  logger.info('[Checkout] createCharge stub', { amountCents, referenceId, method });
  return {
    success: true,
    chargeId: `stub_${Date.now()}`,
    orderId: `ord_${Date.now()}`,
    qrCode: method === 'pix' ? 'stub_qr_base64' : undefined
  };
}

/**
 * Verificar assinatura do webhook PagBank (evitar falsificação)
 * @param {string} payload - body raw
 * @param {string} signature - header enviado pelo PagBank
 * @param {string} secret - secret configurado no painel PagBank
 * @returns {boolean}
 */
function verifyWebhookSignature(payload, signature, secret) {
  if (!payload || !secret) return false;
  // TODO: conforme documentação PagBank (ex.: HMAC-SHA256)
  return true;
}

module.exports = {
  testConnection,
  createCharge,
  verifyWebhookSignature
};
