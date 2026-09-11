/**
 * Extract remaining static <style> blocks from blades into pub/pages CSS
 * and wire imports into Vite entries.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

const jobs = [
  { blade: 'resources/views/pages/kingSelectionGallery.blade.php', css: 'resources/css/pub/pages/kingSelectionGallery.css', entry: 'resources/js/pages/kingSelectionGallery.js' },
  { blade: 'resources/views/pages/resetar-senha.blade.php', css: 'resources/css/pub/pages/resetar-senha.css', entry: 'resources/js/pages/resetar-senha.js' },
  { blade: 'resources/views/pages/conviteEdit.blade.php', css: 'resources/css/pub/pages/conviteEdit.css', entry: 'resources/js/pages/conviteEdit.js' },
  { blade: 'resources/views/pages/recuperar-senha.blade.php', css: 'resources/css/pub/pages/recuperar-senha.css', entry: 'resources/js/pages/recuperar-senha.js' },
  { blade: 'resources/views/pages/arquetipo-resultados.blade.php', css: 'resources/css/pub/pages/arquetipo-resultados.css', entry: 'resources/js/pages/arquetipo-resultados.js' },
  { blade: 'resources/views/pages/termos.blade.php', css: 'resources/css/pub/pages/termos.css', entry: null, viteCss: true },
  { blade: 'resources/views/pages/privacidade.blade.php', css: 'resources/css/pub/pages/privacidade.css', entry: null, viteCss: true },
  { blade: 'resources/views/pages/kingSelectionReview.blade.php', css: 'resources/css/pub/pages/kingSelectionReview.css', entry: 'resources/js/pages/kingSelectionReview.js' },
];

const dynRe = /\{\{|@if|@endif|@else|@foreach|@php|@isset|@empty/;

function extract(bladeRel, cssRel) {
  const bladePath = path.join(root, bladeRel);
  let html = fs.readFileSync(bladePath, 'utf8');
  const re = /<style([^>]*)>([\s\S]*?)<\/style>/gi;
  const matches = [];
  let m;
  while ((m = re.exec(html)) !== null) matches.push({ full: m[0], attrs: m[1] || '', body: m[2] });
  const staticCss = [];
  for (const block of matches) {
    if (dynRe.test(block.body) || dynRe.test(block.attrs)) continue;
    staticCss.push(block.body.trim());
    const i = html.indexOf(block.full);
    if (i >= 0) html = html.slice(0, i) + html.slice(i + block.full.length);
  }
  if (!staticCss.length) return null;
  const cssPath = path.join(root, cssRel);
  fs.mkdirSync(path.dirname(cssPath), { recursive: true });
  fs.writeFileSync(cssPath, `/* from ${bladeRel} */\n\n${staticCss.join('\n\n')}\n`);
  html = html.replace(/\n{3,}/g, '\n\n');
  fs.writeFileSync(bladePath, html);
  return cssRel;
}

function ensureImport(entryRel, cssRel) {
  const p = path.join(root, entryRel);
  let s = fs.readFileSync(p, 'utf8');
  const base = path.basename(cssRel);
  const line = `import '@css/pages/${base}';`;
  if (s.includes(base)) return;
  if (/^import /m.test(s)) s = s.replace(/^(import .+;\r?\n)/m, `$1${line}\n`);
  else s = `${line}\n${s}`;
  fs.writeFileSync(p, s);
}

function ensureViteCss(bladeRel, cssRel) {
  const p = path.join(root, bladeRel);
  let html = fs.readFileSync(p, 'utf8');
  if (html.includes(cssRel) || html.includes(path.basename(cssRel))) return;
  if (html.includes("@vite(['resources/css/fontawesome.css'])")) {
    html = html.replace(
      "@vite(['resources/css/fontawesome.css'])",
      `@vite(['resources/css/fontawesome.css', '${cssRel}'])`
    );
  } else if (html.includes('</head>')) {
    html = html.replace('</head>', `    @vite(['${cssRel}'])\n</head>`);
  }
  fs.writeFileSync(p, html);
}

let vite = fs.readFileSync(path.join(root, 'vite.config.js'), 'utf8');

for (const job of jobs) {
  const out = extract(job.blade, job.css);
  if (!out) {
    console.log('SKIP', job.blade);
    continue;
  }
  console.log('OK', job.blade, '→', path.basename(job.css));
  if (job.entry) ensureImport(job.entry, job.css);
  if (job.viteCss) {
    ensureViteCss(job.blade, job.css);
    if (!vite.includes(job.css)) {
      vite = vite.replace(
        "'resources/css/fontawesome.css',",
        `'resources/css/fontawesome.css',\n                '${job.css}',`
      );
    }
  }
}

fs.writeFileSync(path.join(root, 'vite.config.js'), vite);
console.log('done');
