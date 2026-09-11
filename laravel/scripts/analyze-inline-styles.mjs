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

const files = walk('resources/views');
const counts = [];
const patterns = {};

for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  const styles = [...s.matchAll(/\sstyle="([^"]*)"/gi)].map((m) => m[1].trim());
  if (!styles.length) continue;
  counts.push([styles.length, f]);
  for (const st of styles) {
    const key = st.replace(/\s+/g, ' ').slice(0, 100);
    patterns[key] = (patterns[key] || 0) + 1;
  }
}

counts.sort((a, b) => b[0] - a[0]);
console.log('TOP BLADES');
counts.slice(0, 12).forEach(([n, f]) => console.log(n, f.replace(/\\/g, '/')));
console.log('TOP STYLE PATTERNS');
Object.entries(patterns)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 30)
  .forEach(([k, n]) => console.log(n, JSON.stringify(k)));
console.log('TOTAL', counts.reduce((a, c) => a + c[0], 0));
