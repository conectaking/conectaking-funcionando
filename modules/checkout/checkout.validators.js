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
  const methodOk = method === 'pix' || method === 'card';
  if (!methodOk) return { valid: false, errors: ['method deve ser pix ou card'] };
  return { valid: true, submissionId: idCheck.value, method };
}

module.exports = {
  validateSubmissionId,
  validateCreateChargeBody
};
