import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve('../laravel/resources/views/cartao');
const pages = path.resolve('../laravel/resources/js/pages');
const vitePath = path.resolve('../laravel/vite.config.js');
const files = ['bible-devotional.blade.php', 'bible-prosperidade.blade.php', 'bible-reader.blade.php'];
const added = [];

for (const file of files) {
  const full = path.join(dir, file);
  let html = fs.readFileSync(full, 'utf8');
  const m = html.match(/<script(?![^>]*\bsrc\s*=)([^>]*)>([\s\S]*?)<\/script>/i);
  if (!m) {
    console.log('no script', file);
    continue;
  }
  const base = file.replace(/\.blade\.php$/i, '');
  const entry = `cartao-${base}`;
  const bootKey = `__CK_BOOT_${base.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`;
  let js = m[2];
  const boots = [];

  js = js.replace(/@json\(([^)]*(?:\([^)]*\)[^)]*)*)\)/g, (_, expr) => {
    const k = `j${boots.length}`;
    boots.push([k, expr.trim()]);
    return `window.${bootKey}.${k}`;
  });
  js = js.replace(/\{\{\s*\(int\)\s*\$([a-zA-Z0-9_]+)\s*\}\}/g, (_, name) => {
    const k = `n${boots.length}`;
    boots.push([k, `(int) $${name}`]);
    return `Number(window.${bootKey}.${k})`;
  });
  js = js.replace(/\{\{\s*\$([a-zA-Z0-9_]+)\s*\}\}/g, (_, name) => {
    const k = `n${boots.length}`;
    boots.push([k, `$${name}`]);
    return `window.${bootKey}.${k}`;
  });

  if (/\{\{|@if|@foreach|@json/.test(js)) {
    console.log('still blade', file, js.match(/\{\{|@\w+/g));
    continue;
  }

  fs.writeFileSync(
    path.join(pages, `${entry}.js`),
    `import '../../css/fonts.css';\nimport '../vendor-globals.js';\n\n${js.trim()}\n`,
  );

  const bootObj = boots.map(([k, e]) => `${k}: @json(${e})`).join(', ');
  const boot = `<script>window.${bootKey} = { ${bootObj} };</script>`;
  html = html.replace(m[0], boot);
  if (!html.includes(`${entry}.js`)) {
    html = html.replace(
      '</head>',
      `    @vite(['resources/css/fonts.css', 'resources/js/pages/${entry}.js'])\n</head>`,
    );
  }
  fs.writeFileSync(full, html);
  added.push(`resources/js/pages/${entry}.js`);
  console.log('ok', file, boots.length);
}

let vite = fs.readFileSync(vitePath, 'utf8');
for (const entry of added) {
  if (!vite.includes(entry)) {
    vite = vite.replace(
      "'resources/js/pages/cartao-public.js',",
      `'resources/js/pages/cartao-public.js',\n                '${entry}',`,
    );
  }
}
fs.writeFileSync(vitePath, vite);
console.log(JSON.stringify({ added }));
