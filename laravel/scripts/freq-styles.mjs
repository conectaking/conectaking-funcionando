import fs from 'node:fs';
import path from 'node:path';

const file = process.argv[2] || 'resources/views/pages/index.blade.php';
const s = fs.readFileSync(file, 'utf8');
const styles = [...s.matchAll(/style="([^"]+)"/g)].map((m) => m[1]);
const freq = {};
for (const x of styles) {
  const k = x.replace(/\s+/g, ' ').trim();
  freq[k] = (freq[k] || 0) + 1;
}
Object.entries(freq)
  .filter(([, n]) => n >= 2)
  .sort((a, b) => b[1] - a[1])
  .forEach(([k, n]) => console.log(n, JSON.stringify(k)));
console.error('TOTAL', styles.length, path.basename(file));
