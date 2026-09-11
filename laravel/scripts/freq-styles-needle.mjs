import fs from 'node:fs';
import path from 'node:path';

function walk(d, acc = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.blade.php')) acc.push(p);
  }
  return acc;
}

const needle = process.argv[2] || '60px';
const freq = {};
for (const f of walk('resources/views')) {
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/style="([^"]+)"/g)) {
    const k = m[1].replace(/\s+/g, ' ').trim();
    if (k.includes(needle)) freq[k] = (freq[k] || 0) + 1;
  }
}
Object.entries(freq)
  .sort((a, b) => b[1] - a[1])
  .forEach(([k, n]) => console.log(n, JSON.stringify(k)));
