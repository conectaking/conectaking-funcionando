/**
 * King Bolão — Pix QR / copia e cola (módulo isolado)
 */
const { QrCodePix } = require('qrcode-pix');

function buildPixPayload({ pixKey, holderName, amountCents, title }) {
  const key = String(pixKey || '').trim();
  if (!key) throw new Error('Chave Pix não configurada.');
  const cents = Math.max(0, parseInt(amountCents, 10) || 0);
  const amount = cents / 100;
  const opts = {
    version: '01',
    key,
    name: String(holderName || 'Organizador').trim().slice(0, 25) || 'Organizador',
    city: 'BRASILIA',
    message: String(title || 'Bolao King').trim().slice(0, 40) || 'Bolao King'
  };
  if (amount > 0) {
    opts.value = amount;
  }
  const qr = QrCodePix(opts);
  return qr.payload();
}

module.exports = { buildPixPayload };
