const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const files = [
  'public/dashboard.js',
  ...fs.readdirSync('public/js').filter(f => f.startsWith('dashboard-') && f.endsWith('.js')).map(f => 'public/js/' + f)
];
let fail = 0;
for (const f of files) {
  try {
    execSync('node --check "' + f + '"', { stdio: 'pipe' });
    console.log('OK', f);
  } catch (e) {
    fail++;
    console.log('FAIL', f, (e.stderr || e.message).toString().split('\n')[0]);
  }
}

// FFFD / mojibake scan on key files
let mojibake = 0;
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const c = (t.match(/\uFFFD/g) || []).length;
  const m = (t.match(/f§|f£|fµ|—f|Ys\?|Y""|O Erro/g) || []).length;
  if (c || m) {
    console.log('ENC', f, 'FFFD', c, 'mojibakeish', m);
    mojibake += c + m;
  }
}
console.log('mojibake total marks', mojibake);

// Cross-module: DashboardX used but script maybe missing in html
const html = fs.readFileSync('public/dashboard.html', 'utf8');
const needed = ['finance','empresa','relatorios','cartao','editor','sortable','save','upload','edit-modal','qr','assinatura','listeners'];
for (const n of needed) {
  const ok = html.includes('dashboard-' + n + '.js');
  if (!ok) console.log('MISSING SCRIPT', n);
}
console.log('done');
