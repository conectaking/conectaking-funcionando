const fs = require('fs');
const { spawnSync } = require('child_process');

function escapeDagua(f) {
  let s = fs.readFileSync(f, 'utf8');
  s = s.replace(/d\\'água/g, "d'água");
  s = s.replace(/d'água/g, "d\\'água");
  fs.writeFileSync(f, s);
}

for (const f of [
  'public/kingSelectionCliente.js',
  'public_html/kingSelectionCliente.js'
]) {
  escapeDagua(f);
  const c = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
  console.log(f, c.status === 0 ? 'OK' : (c.stderr || '').split('\n')[0]);
}

// Fix analytics medals
const af = 'public_html/dashboard.analytics.js';
let a = fs.readFileSync(af, 'utf8');
a = a.replace(
  /const medalIcon = position === 1 \? '[^']*' : position === 2 \? '[^']*' : position === 3 \? '[^']*' : `\$\{position\}º`;/,
  "const medalIcon = position === 1 ? '1º' : position === 2 ? '2º' : position === 3 ? '3º' : `${position}º`;"
);
// fallback if pattern different
if (a.includes("'Y—") || a.includes("'Y^'")) {
  a = a.replace(
    /const medalIcon = [^;]+;/,
    "const medalIcon = position === 1 ? '1º' : position === 2 ? '2º' : position === 3 ? '3º' : `${position}º`;"
  );
}
fs.writeFileSync(af, a);
const ca = spawnSync(process.execPath, ['--check', af], { encoding: 'utf8' });
console.log(af, ca.status === 0 ? 'OK' : (ca.stderr || '').split('\n')[0]);

// Also check public copy if exists
if (fs.existsSync('public/dashboard.analytics.js')) {
  let b = fs.readFileSync('public/dashboard.analytics.js', 'utf8');
  if (b.includes("'Y—") || b.includes("'Y^'")) {
    b = b.replace(
      /const medalIcon = [^;]+;/,
      "const medalIcon = position === 1 ? '1º' : position === 2 ? '2º' : position === 3 ? '3º' : `${position}º`;"
    );
    fs.writeFileSync('public/dashboard.analytics.js', b);
  }
}
