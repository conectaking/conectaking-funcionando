/**
 * Extrai <script> inline (sem src) das Blades para public/js/ck-inline/*.js
 * e troca por <script src="...">. Boot com @json fica como type=application/json quando possível.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('..');
const views = path.join(root, 'laravel/resources/views');
const outDir = path.join(root, 'public/js/ck-inline');
fs.mkdirSync(outDir, { recursive: true });

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (ent.name.endsWith('.blade.php')) acc.push(p);
  }
  return acc;
}

const re = /<script(?![^>]*\bsrc\s*=)([^>]*)>([\s\S]*?)<\/script>/gi;
let filesChanged = 0;
let blocks = 0;

for (const file of walk(views)) {
  let html = fs.readFileSync(file, 'utf8');
  let i = 0;
  const base = path
    .relative(views, file)
    .replace(/\\/g, '/')
    .replace(/\.blade\.php$/i, '')
    .replace(/[^a-zA-Z0-9]+/g, '-');

  const next = html.replace(re, (full, attrs, body) => {
    const code = String(body || '').trim();
    if (!code) return full;
    // Precisa de Blade (@json, {{ }}, @if…) — permanece inline (nonce CSP cobre).
    if (/@json|@if|@foreach|\{\{|\}\}|@php|@endphp/.test(code) || /@json|@if|@foreach|\{\{/.test(String(attrs || ''))) {
      return full;
    }
    i += 1;
    blocks += 1;
    const name = `${base}-${i}.js`;
    const out = path.join(outDir, name);
    fs.writeFileSync(out, code + '\n', 'utf8');
    const attr = String(attrs || '').trim();
    return `<script src="/js/ck-inline/${name}"${attr ? ' ' + attr : ''}></script>`;
  });

  if (next !== html) {
    fs.writeFileSync(file, next, 'utf8');
    filesChanged += 1;
    console.log('extracted', path.relative(root, file), '->', i, 'blocks');
  }
}

console.log(JSON.stringify({ filesChanged, blocks, outDir }));
