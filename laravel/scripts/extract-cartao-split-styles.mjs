/**
 * Split Blade <style>: keep only dynamic bits (:root with {{ }} / @if blocks),
 * move static CSS to resources/css/pub/pages/*.css
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');

const jobs = [
  // cartao — static (full extract)
  { blade: 'laravel/resources/views/cartao/inactive.blade.php', css: 'laravel/resources/css/pub/pages/cartao-inactive.css', mode: 'full' },
  { blade: 'laravel/resources/views/cartao/bible-hub.blade.php', css: 'laravel/resources/css/pub/pages/cartao-bible-hub.css', mode: 'full' },
  { blade: 'laravel/resources/views/cartao/bible-plan.blade.php', css: 'laravel/resources/css/pub/pages/cartao-bible-plan.css', mode: 'full' },
  { blade: 'laravel/resources/views/cartao/bible-salmo.blade.php', css: 'laravel/resources/css/pub/pages/cartao-bible-salmo.css', mode: 'full' },
  { blade: 'laravel/resources/views/cartao/bible-whole.blade.php', css: 'laravel/resources/css/pub/pages/cartao-bible-whole.css', mode: 'full' },
  { blade: 'laravel/resources/views/cartao/ks-public.blade.php', css: 'laravel/resources/css/pub/pages/cartao-ks-public.css', mode: 'full' },
  { blade: 'laravel/resources/views/cartao/bible-devotional.blade.php', css: 'laravel/resources/css/pub/pages/cartao-bible-devotional.css', mode: 'full' },
  { blade: 'laravel/resources/views/cartao/bible-prosperidade.blade.php', css: 'laravel/resources/css/pub/pages/cartao-bible-prosperidade.css', mode: 'full' },
  { blade: 'laravel/resources/views/cartao/bible-reader.blade.php', css: 'laravel/resources/css/pub/pages/cartao-bible-reader.css', mode: 'full' },
  { blade: 'laravel/resources/views/cartao/bible-study.blade.php', css: 'laravel/resources/css/pub/pages/cartao-bible-study.css', mode: 'full' },
  // cartao — keep :root / @if dynamic, extract rest
  { blade: 'laravel/resources/views/cartao/form-success.blade.php', css: 'laravel/resources/css/pub/pages/cartao-form-success.css', mode: 'split-root' },
  { blade: 'laravel/resources/views/cartao/sales-public.blade.php', css: 'laravel/resources/css/pub/pages/cartao-sales-public.css', mode: 'split-root' },
  { blade: 'laravel/resources/views/cartao/guest-confirm.blade.php', css: 'laravel/resources/css/pub/pages/cartao-guest-confirm.css', mode: 'split-root' },
  { blade: 'laravel/resources/views/cartao/guest-customize.blade.php', css: 'laravel/resources/css/pub/pages/cartao-guest-customize.css', mode: 'split-root' },
  { blade: 'laravel/resources/views/cartao/guest-portaria.blade.php', css: 'laravel/resources/css/pub/pages/cartao-guest-portaria.css', mode: 'split-root' },
  { blade: 'laravel/resources/views/cartao/guest-register.blade.php', css: 'laravel/resources/css/pub/pages/cartao-guest-register.css', mode: 'split-root' },
  { blade: 'laravel/resources/views/cartao/form-public.blade.php', css: 'laravel/resources/css/pub/pages/cartao-form-public.css', mode: 'split-root' },
  { blade: 'laravel/resources/views/cartao/public.blade.php', css: 'laravel/resources/css/pub/pages/cartao-public-extra.css', mode: 'split-root' },
  // pages — full static extract
  { blade: 'laravel/resources/views/pages/kingDocs.blade.php', css: 'laravel/resources/css/pub/pages/kingDocs.css', mode: 'full' },
  { blade: 'laravel/resources/views/pages/kingSelectionEdit.blade.php', css: 'laravel/resources/css/pub/pages/kingSelectionEdit.css', mode: 'full' },
  { blade: 'laravel/resources/views/pages/documentos-preview.blade.php', css: 'laravel/resources/css/pub/pages/documentos-preview.css', mode: 'full' },
  { blade: 'laravel/resources/views/pages/admin-devocionais-365.blade.php', css: 'laravel/resources/css/pub/pages/admin-devocionais-365.css', mode: 'full' },
  { blade: 'laravel/resources/views/pages/zerar-mes.blade.php', css: 'laravel/resources/css/pub/pages/zerar-mes.css', mode: 'full' },
  { blade: 'laravel/resources/views/pages/bibliaking.blade.php', css: 'laravel/resources/css/pub/pages/bibliaking.css', mode: 'full' },
  { blade: 'laravel/resources/views/pages/recibos-orcamentos.blade.php', css: 'laravel/resources/css/pub/pages/recibos-orcamentos.css', mode: 'full' },
  { blade: 'laravel/resources/views/pages/kingForms.blade.php', css: 'laravel/resources/css/pub/pages/kingForms.css', mode: 'full' },
  { blade: 'laravel/resources/views/pages/kingDocsShare.blade.php', css: 'laravel/resources/css/pub/pages/kingDocsShare.css', mode: 'full' },
  { blade: 'laravel/resources/views/pages/orcamentos.blade.php', css: 'laravel/resources/css/pub/pages/orcamentos.css', mode: 'full' },
];

const dynRe = /\{\{|@if|@endif|@else|@foreach|@php|@isset|@empty/;

function extractRootAndDynamic(css) {
  // Keep :root { ... } if it has blade, and any @if...@endif blocks
  const keep = [];
  let rest = css;

  // Pull @if ... @endif blocks (non-greedy, may nest poorly — good enough for our blades)
  const ifBlocks = [];
  rest = rest.replace(/@if\([\s\S]*?@endif/g, (m) => {
    ifBlocks.push(m);
    return `\n/*__DYN_IF_${ifBlocks.length - 1}__*/\n`;
  });

  // Pull :root { ... }
  let rootBlock = '';
  rest = rest.replace(/:root\s*\{[\s\S]*?\}/, (m) => {
    if (dynRe.test(m)) {
      rootBlock = m;
      return '\n';
    }
    return m;
  });

  if (rootBlock) keep.push(rootBlock);
  ifBlocks.forEach((b, i) => {
    keep.push(b);
    rest = rest.replace(`/*__DYN_IF_${i}__*/`, '');
  });

  // If anything dynamic remains in rest, keep whole as dynamic (abort split)
  if (dynRe.test(rest)) {
    return { keepCss: css.trim(), staticCss: '' };
  }

  return { keepCss: keep.join('\n\n').trim(), staticCss: rest.trim() };
}

function processJob(job) {
  const bladePath = path.join(root, job.blade);
  if (!fs.existsSync(bladePath)) {
    console.log('MISSING', job.blade);
    return null;
  }
  let html = fs.readFileSync(bladePath, 'utf8');
  const re = /<style([^>]*)>([\s\S]*?)<\/style>/gi;
  const matches = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    matches.push({ full: m[0], attrs: m[1] || '', body: m[2] });
  }
  if (!matches.length) {
    console.log('NOSTYLE', job.blade);
    return null;
  }

  const staticParts = [];
  const keepParts = [];

  for (const block of matches) {
    const hasDyn = dynRe.test(block.body) || dynRe.test(block.attrs);
    if (job.mode === 'full') {
      if (hasDyn) {
        keepParts.push(block.full);
        continue;
      }
      staticParts.push(block.body.trim());
      // remove from html
      const i = html.indexOf(block.full);
      if (i >= 0) html = html.slice(0, i) + html.slice(i + block.full.length);
    } else {
      // split-root
      if (!hasDyn) {
        staticParts.push(block.body.trim());
        const i = html.indexOf(block.full);
        if (i >= 0) html = html.slice(0, i) + html.slice(i + block.full.length);
        continue;
      }
      const { keepCss, staticCss } = extractRootAndDynamic(block.body);
      if (staticCss) staticParts.push(staticCss);
      if (keepCss) {
        const replacement = `<style${block.attrs}>\n${keepCss}\n    </style>`;
        const i = html.indexOf(block.full);
        if (i >= 0) html = html.slice(0, i) + replacement + html.slice(i + block.full.length);
      } else {
        const i = html.indexOf(block.full);
        if (i >= 0) html = html.slice(0, i) + html.slice(i + block.full.length);
      }
    }
  }

  if (!staticParts.length) {
    console.log('SKIP_STATIC', job.blade);
    return null;
  }

  const cssOut = path.join(root, job.css);
  fs.mkdirSync(path.dirname(cssOut), { recursive: true });
  fs.writeFileSync(cssOut, `/* from ${job.blade} */\n\n${staticParts.join('\n\n')}\n`);
  html = html.replace(/\n{3,}/g, '\n\n');
  fs.writeFileSync(bladePath, html);
  console.log('OK', job.blade, '→', path.basename(job.css), Math.round(fs.statSync(cssOut).size / 1024) + 'KB', 'keptDyn=', keepParts.length || 'split');
  return job;
}

const done = jobs.map(processJob).filter(Boolean);
console.log('DONE', done.length);
