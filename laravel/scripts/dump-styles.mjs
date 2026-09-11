import fs from 'node:fs';

const file = process.argv[2];
const s = fs.readFileSync(file, 'utf8');
const styles = [...s.matchAll(/\sstyle="([^"]*)"/gi)].map((m) => m[1].replace(/\s+/g, ' ').trim());
styles.forEach((x, i) => console.log(String(i + 1).padStart(2), JSON.stringify(x)));
