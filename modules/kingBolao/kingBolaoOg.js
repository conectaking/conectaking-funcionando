/**
 * King Bolão — OG image (1200x630)
 */
const sharp = require('sharp');
const repo = require('./kingBolao.repository');

async function renderKingBolaoOgImage(slug) {
  const event = await repo.getEventBySlug(slug);
  if (!event) return null;

  const title = String(event.title || 'King Bolão').slice(0, 80);
  const match = `${event.team_home_name || 'Casa'} × ${event.team_away_name || 'Visitante'}`.slice(0, 60);

  const svg = `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#14532d"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <text x="600" y="200" text-anchor="middle" fill="#fbbf24" font-family="Arial,sans-serif" font-size="42" font-weight="bold">KING BOLÃO</text>
  <text x="600" y="290" text-anchor="middle" fill="#ffffff" font-family="Arial,sans-serif" font-size="52" font-weight="bold">${escapeXml(title)}</text>
  <text x="600" y="380" text-anchor="middle" fill="#86efac" font-family="Arial,sans-serif" font-size="36">${escapeXml(match)}</text>
  <text x="600" y="520" text-anchor="middle" fill="#94a3b8" font-family="Arial,sans-serif" font-size="28">Palpite · Pix · Prêmio</text>
</svg>`;

  if (event.cover_image_path) {
    try {
      const fs = require('fs');
      if (fs.existsSync(event.cover_image_path)) {
        const cover = await sharp(event.cover_image_path).resize(1200, 630, { fit: 'cover' }).toBuffer();
        const overlay = Buffer.from(svg);
        return sharp(cover).composite([{ input: overlay, blend: 'over' }]).jpeg({ quality: 88 }).toBuffer();
      }
    } catch (_) { /* fallback svg */ }
  }

  return sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toBuffer();
}

function escapeXml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { renderKingBolaoOgImage };
