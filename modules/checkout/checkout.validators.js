/**
 * Validações do módulo Checkout (KingForms - PagBank)
 */

function validateSubmissionId(submissionId) {
  const id = parseInt(submissionId, 10);
  if (!submissionId || isNaN(id) || id < 1) {
    return { valid: false, error: 'submissionId inválido' };
  }
  return { valid: true, value: id };
}

function validateCreateChargeBody(body) {
  const { submissionId, method } = body || {};
  const idCheck = validateSubmissionId(submissionId);
  if (!idCheck.valid) return { valid: false, errors: [idCheck.error] };
  const methodOk = method === 'pix' || method === 'card' || method === 'credit_card' || method === 'debit_card';
  if (!methodOk) return { valid: false, errors: ['method deve ser pix, card, credit_card ou debit_card'] };
  const result = { valid: true, submissionId: idCheck.value, method };
  if (method === 'card' || method === 'credit_card' || method === 'debit_card') {
    const card = body.card || {};
    result.card = {
      number: body.card_number || card.number,
      exp_month: body.exp_month || card.exp_month,
      exp_year: body.exp_year || card.exp_year,
      security_code: body.security_code || card.security_code,
      holder_name: body.holder_name || card.holder_name,
      holder_tax_id: body.holder_tax_id || card.holder_tax_id
    };
    result.installments = body.installments || card.installments || 1;
  }
  return result;
}

module.exports = {
  validateSubmissionId,
  validateCreateChargeBody
};
