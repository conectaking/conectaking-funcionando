/**
 * Extrai scripts inline de cartao/*.blade.php para entries Vite.
 * Blade @json / {{ }} → window.__CK_BOOT_* no Blade; JS lê o boot.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('..');
const cartaoDir = path.join(root, 'laravel/resources/views/cartao');
const pagesDir = path.join(root, 'laravel/resources/js/pages');
const viteConfigPath = path.join(root, 'laravel/vite.config.js');

const files = fs.readdirSync(cartaoDir).filter((f) => f.endsWith('.blade.php'));
const re = /<script(?![^>]*\bsrc\s*=)([^>]*)>([\s\S]*?)<\/script>/i;
const addedVite = [];

for (const file of files) {
  if (file === 'public.blade.php' || file === 'inactive.blade.php') continue;
  const full = path.join(cartaoDir, file);
  let html = fs.readFileSync(full, 'utf8');
  const m = html.match(re);
  if (!m) continue;
  const body = m[2].trim();
  if (!body) continue;

  const base = file.replace(/\.blade\.php$/i, '');
  const entryName = `cartao-${base}`;
  const bootKey = `__CK_BOOT_${base.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`;

  // Collect @json(...) usages and replace with boot props
  const jsons = [];
  let js = body.replace(/@json\(([^)]+)\)/g, (_, expr) => {
    const key = `j${jsons.length}`;
    jsons.push({ key, expr: expr.trim() });
    return `window.${bootKey}.${key}`;
  });
  // remaining blade {{ }} in script — skip file if any left
  if (/\{\{|@if|@foreach|@php/.test(js)) {
    console.log('skip (blade remains):', file);
    continue;
  }

  const imports = [
    "import '../../css/fonts.css';",
    "import '../vendor-globals.js';",
    '',
  ].join('\n');

  fs.writeFileSync(path.join(pagesDir, `${entryName}.js`), `${imports}\n${js}\n`, 'utf8');

  const bootObj = jsons.map((j) => `${j.key}: @json(${j.expr})`).join(', ');
  const bootScript = jsons.length
    ? `<script>window.${bootKey} = { ${bootObj} };</script>\n`
    : '';
  const viteTag = `@vite(['resources/css/fonts.css', 'resources/js/pages/${entryName}.js'])`;

  html = html.replace(m[0], `${bootScript}`);
  if (!html.includes(`resources/js/pages/${entryName}.js`)) {
    if (html.includes("@vite(['resources/css/fonts.css'])")) {
      html = html.replace(
        "@vite(['resources/css/fonts.css'])",
        `@vite(['resources/css/fonts.css', 'resources/js/pages/${entryName}.js'])`,
      );
    } else if (html.includes('</head>')) {
      html = html.replace('</head>', `    ${viteTag}\n</head>`);
    } else {
      html = html.replace('<head>', `<head>\n    ${viteTag}\n`);
    }
  }
  fs.writeFileSync(full, html, 'utf8');
  addedVite.push(`resources/js/pages/${entryName}.js`);
  console.log('ok', file, '->', entryName, 'bootKeys', jsons.length);
}

let vite = fs.readFileSync(viteConfigPath, 'utf8');
for (const entry of ['resources/js/pages/cartao-public.js', ...addedVite]) {
  if (!vite.includes(entry)) {
    vite = vite.replace(
      "'resources/js/pages/index.js',",
      `'resources/js/pages/index.js',\n                '${entry}',`,
    );
  }
}
fs.writeFileSync(viteConfigPath, vite, 'utf8');
console.log(JSON.stringify({ addedVite }, null, 2));
