const fs = require('fs');
const path = require('path');

const MOJI = /Ã§|Ã£|Ã©|Ã³|Ã¡|Ã­|Ãº|Ãµ|Ã¢|Ãª|Ã´|â€|Â /g;
const map = {
  'Ã§': 'ç', 'Ã£': 'ã', 'Ã©': 'é', 'Ã³': 'ó', 'Ã¡': 'á', 'Ã­': 'í', 'Ãº': 'ú', 'Ãµ': 'õ',
  'Ã¢': 'â', 'Ãª': 'ê', 'Ã´': 'ô', 'Ã ': 'à', 'Â': '',
  'â€“': '–', 'â€”': '—', 'â€™': "'", 'â€œ': '"', 'â€': '"'
};

function tryLatin1(text) {
  const before = (text.match(MOJI) || []).length;
  if (!before) return null;
  try {
    const fixed = Buffer.from(text, 'latin1').toString('utf8');
    const after = (fixed.match(MOJI) || []).length;
    if (after < before && !fixed.includes('\uFFFD')) return fixed;
  } catch (_) {}
  return null;
}

function tryMap(text) {
  let out = text;
  let n = 0;
  for (const [a, b] of Object.entries(map)) {
    const c = out.split(a).length - 1;
    if (c) { out = out.split(a).join(b); n += c; }
  }
  return n ? out : null;
}

const files = [
  'public/js/landing-exit.js',
  'public_html/js/landing-exit.js',
  'public_html/main.js',
  'public_html/registro.html',
  'views/guestListCustomizePortaria.ejs',
];
const root = 'c:/Users/playa/OneDrive/Documentos/conectaking-funcionando/';
for (const f of files) {
  const p = root + f;
  if (!fs.existsSync(p)) { console.log('missing', f); continue; }
  const t = fs.readFileSync(p, 'utf8');
  const fixed = tryLatin1(t) || tryMap(t);
  if (fixed) {
    fs.writeFileSync(p, fixed);
    console.log('fixed', f);
  } else console.log('ok/skip', f);
}
