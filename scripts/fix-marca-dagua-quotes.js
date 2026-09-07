const fs = require('fs');
const { spawnSync } = require('child_process');

for (const f of ['public/kingSelectionProject.js', 'public_html/kingSelectionProject.js']) {
  let s = fs.readFileSync(f, 'utf8');
  // Avoid double-escaping
  s = s.replace(/d\\'água/g, "d'água");
  s = s.replace(/d'água/g, "d\\'água");
  fs.writeFileSync(f, s);
  const c = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
  console.log(f, c.status === 0 ? 'OK' : (c.stderr || '').split('\n').slice(0, 3).join(' | '));
}

// Scan other JS for same trap after FFFD cleanup
const path = require('path');
function walk(d, a = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, a);
    else if (/\.js$/i.test(e.name)) a.push(p);
  }
  return a;
}
for (const root of ['public', 'public_html']) {
  for (const f of walk(root)) {
    const c = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
    if (c.status !== 0) {
      const err = (c.stderr || '').split('\n')[0];
      if (/água|Unexpected/.test(err + (c.stderr || ''))) console.log('BROKEN', f, err);
    }
  }
}
console.log('scan done');
