import fs from 'node:fs';
import path from 'node:path';

const jobs = [
  {
    blade: 'resources/views/pages/kingSelectionProject.blade.php',
    css: 'resources/css/pub/pages/kingSelectionProject.css',
    entry: 'resources/js/pages/kingSelectionProject.js',
  },
  {
    blade: 'resources/views/pages/kingSelectionCliente.blade.php',
    css: 'resources/css/pub/pages/kingSelectionCliente.css',
    entry: 'resources/js/pages/kingSelectionCliente.js',
  },
  {
    blade: 'resources/views/pages/index.blade.php',
    css: 'resources/css/pub/pages/index-extra.css',
    entry: 'resources/js/pages/index.js',
  },
];

const dynRe = /\{\{|@if|@endif|@else|@foreach|@php|@isset|@empty/;

for (const job of jobs) {
  let html = fs.readFileSync(job.blade, 'utf8');
  const re = /<style([^>]*)>([\s\S]*?)<\/style>/gi;
  const staticCss = [];
  const matches = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    matches.push({ full: m[0], attrs: m[1] || '', body: m[2] });
  }
  for (const block of matches) {
    if (dynRe.test(block.body) || dynRe.test(block.attrs)) continue;
    staticCss.push(block.body.trim());
    const i = html.indexOf(block.full);
    if (i >= 0) html = html.slice(0, i) + html.slice(i + block.full.length);
  }
  if (!staticCss.length) {
    console.log('SKIP', job.blade);
    continue;
  }
  fs.mkdirSync(path.dirname(job.css), { recursive: true });
  const base = path.basename(job.css);
  fs.writeFileSync(job.css, `/* from ${job.blade} */\n\n${staticCss.join('\n\n')}\n`);
  html = html.replace(/\n{3,}/g, '\n\n');
  fs.writeFileSync(job.blade, html);

  let entry = fs.readFileSync(job.entry, 'utf8');
  const imp = `import '@css/pages/${base}';`;
  if (!entry.includes(base)) {
    if (/^import /m.test(entry)) {
      entry = entry.replace(/^(import .+;\r?\n)/m, `$1${imp}\n`);
    } else {
      entry = `${imp}\n${entry}`;
    }
    fs.writeFileSync(job.entry, entry);
  }
  console.log('OK', job.blade, Math.round(fs.statSync(job.css).size / 1024) + 'KB');
}
