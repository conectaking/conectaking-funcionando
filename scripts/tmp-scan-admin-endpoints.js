/* Temporário: lista chamadas do front legado aos endpoints admin de users/codes. */
const fs = require('fs');
const path = require('path');

const out = new Map();
const RE = /["'`]([^"'`\n]*\/admin\/(?:users|codes|stats|advanced-stats|analytics|generate-code)[^"'`\n]*)/g;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') walk(p);
      continue;
    }
    if (!/\.(js|html|ejs)$/i.test(entry.name)) continue;
    const src = fs.readFileSync(p, 'utf8');
    for (const m of src.matchAll(RE)) {
      if (!out.has(m[1])) out.set(m[1], p);
    }
  }
}

for (const d of ['public', 'public_html', 'views']) {
  if (fs.existsSync(d)) walk(d);
}
for (const [url, file] of [...out.entries()].sort()) {
  console.log(url.padEnd(60) + '  <-- ' + file);
}
