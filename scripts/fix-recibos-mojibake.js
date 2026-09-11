/**
 * Fix mojibake (UTF-8 interpreted as Latin-1) in recibos blade templates.
 */
const fs = require('fs');
const path = require('path');

const files = [
  'laravel/resources/views/pages/dashboard-recibos-orcamentos.blade.php',
  'laravel/resources/views/pages/configuracoes-recibos-orcamentos.blade.php',
  'laravel/resources/views/pages/clientes-recibos-orcamentos.blade.php',
];

function fixMojibake(s) {
  // Common double-encoded UTF-8 sequences
  const map = {
    'Ã§': 'ç', 'Ã£': 'ã', 'Ã¡': 'á', 'Ã¢': 'â', 'Ã ': 'à', 'Ã©': 'é', 'Ãª': 'ê',
    'Ã­': 'í', 'Ã³': 'ó', 'Ã´': 'ô', 'Ãº': 'ú', 'Ã¼': 'ü', 'Ã±': 'ñ',
    'Ã‡': 'Ç', 'Ãƒ': 'Ã', 'Ã': 'Á', 'Ã‰': 'É', 'Ãš': 'Ú', 'Ã“': 'Ó',
    'Ãµ': 'õ', 'Ãµ': 'õ',
    'â€“': '–', 'â€”': '—', 'â€œ': '“', 'â€': '”', 'â€˜': '‘', 'â€™': '’',
    'â€¢': '•', 'â€¦': '…', 'Â·': '·', 'Â ': ' ',
    'Ã¡reas': 'áreas', 'mÃ³dulo': 'módulo', 'orÃ§amento': 'orçamento',
    'orÃ§amentos': 'orçamentos', 'Ãºltimo': 'último', 'ConfiguraÃ§Ãµes': 'Configurações',
    'serÃ¡': 'será', 'prÃ©': 'pré', 'marcaÃ§Ã£o': 'marcação', 'ServiÃ§os': 'Serviços',
    'catÃ¡logo': 'catálogo',
  };
  let out = s;
  // Try latin1 reinterpretation for whole chunks with Ã
  if (/Ã.|â€/.test(out)) {
    try {
      const buf = Buffer.from(out, 'binary');
      // Only for files that are clearly mojibake-heavy: decode as if latin1 bytes were utf8
      const reinterpreted = Buffer.from(
        [...out].map((ch) => ch.charCodeAt(0) & 0xff)
      ).toString('utf8');
      if (reinterpreted.includes('ç') || reinterpreted.includes('ã') || reinterpreted.includes('–')) {
        // Prefer selective replace to avoid breaking valid UTF-8 mixed in
      }
    } catch (_) {}
  }
  // Apply known replacements longest-first
  Object.keys(map)
    .sort((a, b) => b.length - a.length)
    .forEach((k) => {
      out = out.split(k).join(map[k]);
    });
  return out;
}

for (const f of files) {
  const p = path.resolve(f);
  if (!fs.existsSync(p)) {
    console.log('skip missing', f);
    continue;
  }
  const raw = fs.readFileSync(p, 'utf8');
  const fixed = fixMojibake(raw);
  if (fixed !== raw) {
    fs.writeFileSync(p, fixed, 'utf8');
    console.log('fixed', f);
  } else {
    console.log('no change', f);
  }
}
