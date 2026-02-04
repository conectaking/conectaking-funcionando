/**
 * Tipos e constantes do módulo Checkout (KingForms - PagBank)
 * Isolado: não expõe detalhes do PagBank ao core.
 */

const PAYMENT_STATUS = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PAID: 'PAID',
  FAILED: 'FAILED',
  CANCELED: 'CANCELED'
};

const PAYMENT_PROVIDER = 'pagbank';

const PAY_BUTTON_LABEL_DEFAULT = 'Pagamento';

/** Labels oficiais para UI (rebranding KingForms) */
const LABELS = {
  BUTTON_PAYMENT: 'Pagamento',
  STATUS_PENDING: 'Pagamento pendente',
  STATUS_PAID: 'Pagamento confirmado',
  PIX: 'Pague com Pix (instantâneo)',
  CARD: 'Pague com cartão',
  POST_SUBMIT_MESSAGE: 'Seus dados foram registrados. Conclua o pagamento para confirmar.',
  FOOTER: 'KingForms by ConectaKing'
};

/** Split: 10% plataforma, 90% vendedor */
const SPLIT_PLATFORM_PERCENT = 10;
const SPLIT_SELLER_PERCENT = 90;

module.exports = {
  PAYMENT_STATUS,
  PAYMENT_PROVIDER,
  PAY_BUTTON_LABEL_DEFAULT,
  LABELS,
  SPLIT_PLATFORM_PERCENT,
  SPLIT_SELLER_PERCENT
};
