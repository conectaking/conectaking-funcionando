/* Temporário: compara os prefixos /api/* servidos pelo Express e pelo Laravel. */
const fs = require('fs');
const path = require('path');

function prefixOf(url) {
  const parts = url.replace(/^\/l\//, '/').split('?')[0].split('/').filter(Boolean);
  if (parts[0] !== 'api') return null;
  if (parts[1] === 'v1') return '/api/v1/' + (parts[2] || '');
  return '/api/' + (parts[1] || '');
}

// Laravel: Route::verb('/path', ...)
const web = fs.readFileSync('laravel/routes/web.php', 'utf8');
const laravel = new Set();
for (const m of web.matchAll(/Route::(get|post|put|patch|delete|any|match)\(\s*(?:\[[^\]]*\]\s*,\s*)?['"]([^'"]+)['"]/g)) {
  const p = prefixOf(m[2]);
  if (p) laravel.add(p);
}
for (const m of web.matchAll(/Route::(get|post|put|patch|delete)\(\s*\$p\s*\.\s*['"]([^'"]+)['"]/g)) {
  const p = prefixOf(m[2]);
  if (p) laravel.add(p);
}

// Express: app.use('/api/xxx', ...)
const server = fs.readFileSync('server.js', 'utf8');
const express = new Set();
for (const m of server.matchAll(/app\.(use|get|post|put|patch|delete)\(\s*['"](\/api\/[^'"]*)['"]/g)) {
  const p = prefixOf(m[2]);
  if (p) express.add(p);
}

const missing = [...express].filter((p) => !laravel.has(p)).sort();
const extra = [...laravel].filter((p) => !express.has(p)).sort();

console.log('Prefixos /api no Express : ' + express.size);
console.log('Prefixos /api no Laravel : ' + laravel.size);
console.log('\nNo Express e NAO no Laravel:\n  ' + (missing.join('\n  ') || '(nenhum)'));
console.log('\nSo no Laravel (montados noutro sitio no Express):\n  ' + (extra.join('\n  ') || '(nenhum)'));
