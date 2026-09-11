const { execSync } = require('child_process');
const fs = require('fs');

function parseDiff(file, prefix, outCss) {
  const diff = execSync(`git show abc298b -- "${file}"`, { encoding: 'utf8', maxBuffer: 30e6 });
  const map = new Map();
  const lines = diff.split('\n');
  const minus = [];
  const plus = [];
  for (const line of lines) {
    if (line.startsWith('@@')) {
      pairBuffers(minus, plus, prefix, map);
      minus.length = 0;
      plus.length = 0;
      continue;
    }
    if (line.startsWith('-') && !line.startsWith('---')) minus.push(line.slice(1));
    else if (line.startsWith('+') && !line.startsWith('+++')) plus.push(line.slice(1));
  }
  pairBuffers(minus, plus, prefix, map);

  let css = `/* restored from abc298b diff (paired) for ${file} */\n\n`;
  for (const [c, s] of [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    css += `.${c} { ${s} }\n`;
  }
  fs.writeFileSync(outCss, css);
  console.log(file, 'mapped', map.size, '->', outCss);
}

function signature(line) {
  const tag = (line.match(/^\s*<([a-zA-Z0-9]+)/) || [])[1] || '';
  const id = (line.match(/\bid="([^"]*)"/) || [])[1] || '';
  const data = (line.match(/\bdata-layout="([^"]*)"/) || [])[1] || '';
  const type = (line.match(/\btype="([^"]*)"/) || [])[1] || '';
  return `${tag}|${id}|${data}|${type}`;
}

function pairBuffers(minus, plus, prefix, map) {
  const usedPlus = new Set();
  for (const mLine of minus) {
    const sm = mLine.match(/\bstyle="([^"]*)"/);
    if (!sm) continue;
    const sig = signature(mLine);
    let found = null;
    for (let i = 0; i < plus.length; i++) {
      if (usedPlus.has(i)) continue;
      const pLine = plus[i];
      if (signature(pLine) !== sig) continue;
      const cm = pLine.match(new RegExp(`\\b(${prefix}-[a-z0-9]+)\\b`, 'i'));
      if (cm) {
        found = { i, c: cm[1] };
        break;
      }
    }
    if (!found) {
      // fallback: first unused plus with class in same tag family
      for (let i = 0; i < plus.length; i++) {
        if (usedPlus.has(i)) continue;
        const pLine = plus[i];
        const tagM = (mLine.match(/^\s*<([a-zA-Z0-9]+)/) || [])[1];
        const tagP = (pLine.match(/^\s*<([a-zA-Z0-9]+)/) || [])[1];
        if (tagM && tagP && tagM === tagP) {
          const cm = pLine.match(new RegExp(`\\b(${prefix}-[a-z0-9]+)\\b`, 'i'));
          if (cm) {
            found = { i, c: cm[1] };
            break;
          }
        }
      }
    }
    if (found) {
      usedPlus.add(found.i);
      if (!map.has(found.c)) map.set(found.c, sm[1].trim());
    }
  }
}

parseDiff(
  'laravel/resources/views/pages/dashboard.blade.php',
  'ck-db',
  'laravel/resources/css/pub/pages/_restored-ck-db.css'
);
parseDiff(
  'laravel/resources/views/pages/salesPageEdit.blade.php',
  'ck-spe',
  'laravel/resources/css/pub/pages/_restored-ck-spe.css'
);
parseDiff(
  'laravel/resources/views/cartao/public.blade.php',
  'ck-cp',
  'laravel/resources/css/pub/pages/_restored-ck-cp.css'
);

// sanity: print key classes
const db = fs.readFileSync('laravel/resources/css/pub/pages/_restored-ck-db.css', 'utf8');
for (const key of ['ck-db-16363f', 'ck-db-1fe563', 'ck-db-3158e7', 'ck-db-f1ec84', 'ck-db-49296c', 'ck-db-75c55c']) {
  const m = db.match(new RegExp('\\.' + key + ' \\{([^}]+)\\}'));
  console.log(key, '=>', m ? m[1].trim().slice(0, 80) : 'MISSING');
}
