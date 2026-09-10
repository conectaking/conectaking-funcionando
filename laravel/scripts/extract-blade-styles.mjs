/**
 * Extract <style> blocks from Blade into resources/css/pub/pages/*.css
 * Leaves Blade-dynamic {{ }} / @if styles in the blade (small residue).
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const jobs = [
  {
    blade: 'laravel/resources/views/pages/responsesList.blade.php',
    css: 'laravel/resources/css/pub/pages/responsesList.css',
    importHint: "import '@css/pages/responsesList.css';",
  },
  {
    blade: 'laravel/resources/views/pages/formPageEdit.blade.php',
    css: 'laravel/resources/css/pub/pages/formPageEdit.css',
    importHint: "import '@css/pages/formPageEdit.css';",
  },
  {
    blade: 'laravel/resources/views/pages/guestListEdit.blade.php',
    css: 'laravel/resources/css/pub/pages/guestListEdit.css',
    importHint: "import '@css/pages/guestListEdit.css';",
  },
  {
    blade: 'laravel/resources/views/pages/salesPageEdit.blade.php',
    css: 'laravel/resources/css/pub/pages/salesPageEdit-extra.css',
    importHint: "import '@css/pages/salesPageEdit-extra.css';",
  },
  {
    blade: 'laravel/resources/views/pages/dashboard.blade.php',
    css: 'laravel/resources/css/pub/pages/dashboard-extra.css',
    importHint: "import '@css/pages/dashboard-extra.css';",
  },
  {
    blade: 'laravel/resources/views/cartao/ks-config-finalizacao.blade.php',
    css: 'laravel/resources/css/pub/pages/cartao-ks-config-finalizacao.css',
  },
  {
    blade: 'laravel/resources/views/cartao/form-public.blade.php',
    css: 'laravel/resources/css/pub/pages/cartao-form-public.css',
  },
  {
    blade: 'laravel/resources/views/cartao/public.blade.php',
    css: 'laravel/resources/css/pub/pages/cartao-public-extra.css',
  },
  {
    blade: 'laravel/resources/views/cartao/form-success.blade.php',
    css: 'laravel/resources/css/pub/pages/cartao-form-success.css',
  },
];

const dynRe = /\{\{|@if|@endif|@else|@foreach|@php|@isset|@empty/;

function extract(job) {
  const bladePath = path.join(root, job.blade);
  let html = fs.readFileSync(bladePath, 'utf8');
  const re = /<style([^>]*)>([\s\S]*?)<\/style>/gi;
  const staticCss = [];
  const keepBlocks = [];
  let m;
  const matches = [];
  while ((m = re.exec(html)) !== null) {
    matches.push({ full: m[0], attrs: m[1] || '', body: m[2], index: m.index });
  }
  // process from end to start for safe splice via replace of exact full match once each
  for (const block of matches) {
    if (dynRe.test(block.body) || dynRe.test(block.attrs)) {
      keepBlocks.push(block.full);
      continue;
    }
    staticCss.push(block.body.trim());
    // remove this style block from html (first occurrence of exact full)
    const i = html.indexOf(block.full);
    if (i >= 0) {
      html = html.slice(0, i) + html.slice(i + block.full.length);
    }
  }
  if (!staticCss.length) {
    console.log('SKIP (no static styles):', job.blade);
    return null;
  }
  const cssOut = path.join(root, job.css);
  fs.mkdirSync(path.dirname(cssOut), { recursive: true });
  const header = `/* Extracted from ${job.blade} — do not edit Blade for these rules */\n\n`;
  fs.writeFileSync(cssOut, header + staticCss.join('\n\n') + '\n', 'utf8');
  // tidy multiple blank lines
  html = html.replace(/\n{3,}/g, '\n\n');
  fs.writeFileSync(bladePath, html, 'utf8');
  console.log('OK', job.blade, '→', job.css, 'keptDynamic=', keepBlocks.length, 'cssKB=', Math.round(fs.statSync(cssOut).size / 1024));
  return job;
}

const done = jobs.map(extract).filter(Boolean);
console.log('DONE', done.length);
