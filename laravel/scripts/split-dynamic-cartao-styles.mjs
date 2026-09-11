/**
 * Split Blade <style>: keep :root / @if dynamic bits; move static CSS out.
 * Brace-aware :root extraction (Blade `}}` must not truncate).
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');

const jobs = [
  { blade: 'laravel/resources/views/cartao/form-success.blade.php', css: 'laravel/resources/css/pub/pages/cartao-form-success.css' },
  { blade: 'laravel/resources/views/cartao/sales-public.blade.php', css: 'laravel/resources/css/pub/pages/cartao-sales-public.css' },
  { blade: 'laravel/resources/views/cartao/guest-confirm.blade.php', css: 'laravel/resources/css/pub/pages/cartao-guest-confirm.css' },
  { blade: 'laravel/resources/views/cartao/guest-customize.blade.php', css: 'laravel/resources/css/pub/pages/cartao-guest-customize.css' },
  { blade: 'laravel/resources/views/cartao/guest-portaria.blade.php', css: 'laravel/resources/css/pub/pages/cartao-guest-portaria.css' },
  { blade: 'laravel/resources/views/cartao/guest-register.blade.php', css: 'laravel/resources/css/pub/pages/cartao-guest-register.css' },
  { blade: 'laravel/resources/views/cartao/form-public.blade.php', css: 'laravel/resources/css/pub/pages/cartao-form-public.css' },
  { blade: 'laravel/resources/views/cartao/public.blade.php', css: 'laravel/resources/css/pub/pages/cartao-public-extra.css' },
];

const dynRe = /\{\{|@if|@endif|@else|@foreach|@php|@isset|@empty/;

function extractBalancedBlock(src, startIdx) {
  // startIdx points at '{'
  let depth = 0;
  for (let i = startIdx; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return { end: i + 1, text: src.slice(startIdx, i + 1) };
    }
  }
  return null;
}

function pullRootBlocks(css) {
  const roots = [];
  let out = '';
  let i = 0;
  while (i < css.length) {
    const m = css.slice(i).match(/:root\s*/);
    if (!m || m.index === undefined) {
      out += css.slice(i);
      break;
    }
    const abs = i + m.index;
    out += css.slice(i, abs);
    const after = abs + m[0].length;
    if (css[after] !== '{') {
      out += css.slice(abs, after);
      i = after;
      continue;
    }
    const block = extractBalancedBlock(css, after);
    if (!block) {
      out += css.slice(abs);
      break;
    }
    const full = css.slice(abs, block.end);
    if (dynRe.test(full)) roots.push(full);
    else out += full;
    i = block.end;
  }
  return { roots, rest: out };
}

function pullIfBlocks(css) {
  const kept = [];
  // Match @if(...) ... @endif at top level of style (non-nested typically)
  const rest = css.replace(/@if\s*\([\s\S]*?@endif/g, (m) => {
    kept.push(m.trim());
    return '\n';
  });
  return { kept, rest };
}

function splitStyle(css) {
  const { kept: ifs, rest: afterIf } = pullIfBlocks(css);
  const { roots, rest } = pullRootBlocks(afterIf);
  if (dynRe.test(rest)) {
    return { keepCss: css.trim(), staticCss: '' };
  }
  const keepCss = [...roots, ...ifs].join('\n\n').trim();
  return { keepCss, staticCss: rest.trim() };
}

for (const job of jobs) {
  const bladePath = path.join(root, job.blade);
  let html = fs.readFileSync(bladePath, 'utf8');
  const re = /<style([^>]*)>([\s\S]*?)<\/style>/i;
  const m = html.match(re);
  if (!m) {
    console.log('NOSTYLE', job.blade);
    continue;
  }
  const { keepCss, staticCss } = splitStyle(m[2]);
  if (!staticCss) {
    console.log('NOSPLIT', job.blade);
    continue;
  }
  const cssOut = path.join(root, job.css);
  fs.mkdirSync(path.dirname(cssOut), { recursive: true });
  fs.writeFileSync(cssOut, `/* from ${job.blade} */\n\n${staticCss}\n`);
  const replacement = keepCss
    ? `<style${m[1]}>\n${keepCss}\n    </style>`
    : '';
  html = html.replace(m[0], replacement);
  html = html.replace(/\n{3,}/g, '\n\n');
  fs.writeFileSync(bladePath, html);
  console.log(
    'OK',
    path.basename(job.blade),
    'staticKB=',
    Math.round(fs.statSync(cssOut).size / 1024),
    'keepChars=',
    keepCss.length
  );
}
