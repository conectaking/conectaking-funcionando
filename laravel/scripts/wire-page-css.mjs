/**
 * Wire extracted page CSS into Vite entries and blades.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

const entryImports = [
  ['resources/js/pages/cartao-form-success.js', "import '@css/pages/cartao-form-success.css';"],
  ['resources/js/pages/cartao-guest-confirm.js', "import '@css/pages/cartao-guest-confirm.css';"],
  ['resources/js/pages/cartao-guest-customize.js', "import '@css/pages/cartao-guest-customize.css';"],
  ['resources/js/pages/cartao-guest-portaria.js', "import '@css/pages/cartao-guest-portaria.css';"],
  ['resources/js/pages/cartao-guest-register.js', "import '@css/pages/cartao-guest-register.css';"],
  ['resources/js/pages/cartao-form-public.js', "import '@css/pages/cartao-form-public.css';"],
  ['resources/js/pages/cartao-public.js', "import '@css/pages/cartao-public-extra.css';"],
  ['resources/js/pages/cartao-ks-public.js', "import '@css/pages/cartao-ks-public.css';"],
  ['resources/js/pages/cartao-bible-devotional.js', "import '@css/pages/cartao-bible-devotional.css';"],
  ['resources/js/pages/cartao-bible-prosperidade.js', "import '@css/pages/cartao-bible-prosperidade.css';"],
  ['resources/js/pages/cartao-bible-reader.js', "import '@css/pages/cartao-bible-reader.css';"],
  ['resources/js/pages/cartao-bible-study.js', "import '@css/pages/cartao-bible-study.css';"],
  ['resources/js/pages/kingDocs.js', "import '@css/pages/kingDocs.css';"],
  ['resources/js/pages/kingSelectionEdit.js', "import '@css/pages/kingSelectionEdit.css';"],
  ['resources/js/pages/documentos-preview.js', "import '@css/pages/documentos-preview.css';"],
  ['resources/js/pages/admin-devocionais-365.js', "import '@css/pages/admin-devocionais-365.css';"],
  ['resources/js/pages/zerar-mes.js', "import '@css/pages/zerar-mes.css';"],
  ['resources/js/pages/bibliaking.js', "import '@css/pages/bibliaking.css';"],
  ['resources/js/pages/recibos-orcamentos.js', "import '@css/pages/recibos-orcamentos.css';"],
  ['resources/js/pages/kingForms.js', "import '@css/pages/kingForms.css';"],
  ['resources/js/pages/kingDocsShare.js', "import '@css/pages/kingDocsShare.css';"],
  ['resources/js/pages/orcamentos.js', "import '@css/pages/orcamentos.css';"],
];

function ensureImport(file, line) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) {
    console.log('MISSING entry', file);
    return;
  }
  let s = fs.readFileSync(p, 'utf8');
  const needle = line.replace(/^import\s+/, '').replace(/;$/, '');
  if (s.includes(needle)) {
    console.log('HAS', file);
    return;
  }
  if (/^import /m.test(s)) {
    s = s.replace(/^(import .+;\r?\n)/m, `$1${line}\n`);
  } else {
    s = `${line}\n${s}`;
  }
  fs.writeFileSync(p, s);
  console.log('ADD', file);
}

for (const [f, line] of entryImports) ensureImport(f, line);

// CSS-only entries for pages without JS entry yet
const cssOnly = [
  {
    css: 'resources/css/pub/pages/cartao-inactive.css',
    blade: 'resources/views/cartao/inactive.blade.php',
    vite: "@vite(['resources/css/fonts.css', 'resources/css/pub/pages/cartao-inactive.css'])",
  },
  {
    css: 'resources/css/pub/pages/cartao-bible-hub.css',
    blade: 'resources/views/cartao/bible-hub.blade.php',
    vite: "@vite(['resources/css/fonts.css', 'resources/css/pub/pages/cartao-bible-hub.css'])",
  },
  {
    css: 'resources/css/pub/pages/cartao-bible-plan.css',
    blade: 'resources/views/cartao/bible-plan.blade.php',
    vite: "@vite(['resources/css/fonts.css', 'resources/css/pub/pages/cartao-bible-plan.css'])",
  },
  {
    css: 'resources/css/pub/pages/cartao-bible-salmo.css',
    blade: 'resources/views/cartao/bible-salmo.blade.php',
    vite: "@vite(['resources/css/fonts.css', 'resources/css/pub/pages/cartao-bible-salmo.css'])",
  },
  {
    css: 'resources/css/pub/pages/cartao-bible-whole.css',
    blade: 'resources/views/cartao/bible-whole.blade.php',
    vite: "@vite(['resources/css/fonts.css', 'resources/css/pub/pages/cartao-bible-whole.css'])",
  },
  {
    css: 'resources/css/pub/pages/cartao-sales-public.css',
    blade: 'resources/views/cartao/sales-public.blade.php',
    vite: "@vite(['resources/css/fonts.css', 'resources/css/pub/pages/cartao-sales-public.css'])",
  },
];

const viteConfigPath = path.join(root, 'vite.config.js');
let viteCfg = fs.readFileSync(viteConfigPath, 'utf8');

for (const item of cssOnly) {
  const bladePath = path.join(root, item.blade);
  let html = fs.readFileSync(bladePath, 'utf8');
  if (html.includes(item.css.replace('resources/', ''))) {
    // already has path fragment
  }
  if (!html.includes(item.css) && !html.includes(path.basename(item.css))) {
    if (html.includes("@vite(['resources/css/fonts.css'])")) {
      html = html.replace(
        "@vite(['resources/css/fonts.css'])",
        item.vite
      );
    } else if (html.includes('</head>')) {
      html = html.replace('</head>', `    ${item.vite}\n</head>`);
    } else if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>\n    ${item.vite}`);
    }
    fs.writeFileSync(bladePath, html);
    console.log('BLADE', item.blade);
  } else {
    console.log('BLADE_OK', item.blade);
  }

  if (!viteCfg.includes(item.css)) {
    viteCfg = viteCfg.replace(
      "'resources/css/fonts.css',",
      `'resources/css/fonts.css',\n                '${item.css}',`
    );
  }
}

fs.writeFileSync(viteConfigPath, viteCfg);
console.log('vite.config updated');
