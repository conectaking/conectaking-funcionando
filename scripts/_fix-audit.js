const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = process.cwd();
const files = [
  'public/dashboard.js',
  ...fs.readdirSync('public/js').filter(f => f.startsWith('dashboard-') && f.endsWith('.js')).map(f => 'public/js/' + f)
];

console.log('=== SYNTAX ===');
let fails = 0;
for (const f of files) {
  try { execSync('node --check "' + f + '"', { stdio: 'pipe' }); }
  catch (e) { fails++; console.log('FAIL', f, String(e.stderr||e.message).split('\n')[0]); }
}
console.log(fails ? 'syntax fails '+fails : 'syntax all OK '+files.length);

console.log('\n=== ENCODING marks ===');
const pat = /f§|f£|fµ|f­|—f|Ys\?|Y""|M"DULO|FUN—.|parf¢|edif§|Visualizaf|perf­odo|Seguranf|padrf£|Doaf§|Lf³gica|delegaf§/g;
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const m = t.match(pat) || [];
  const fffd = (t.match(/\uFFFD/g)||[]).length;
  if (m.length || fffd) console.log(f, 'marks', m.length, 'FFFD', fffd, [...new Set(m)].slice(0,8).join(' | '));
}

console.log('\n=== public vs public_html size drift ===');
function walk(d, acc=[]) {
  if (!fs.existsSync(d)) return acc;
  for (const e of fs.readdirSync(d,{withFileTypes:true})) {
    const p = path.join(d,e.name);
    if (e.isDirectory()) walk(p,acc);
    else if (/\.(js|html|css)$/.test(e.name) && !e.name.includes('node_modules')) acc.push(p);
  }
  return acc;
}
const pub = walk('public').filter(p => /dashboard|kingSelection|kingForms|formPage|salesPage|admin/i.test(p));
let drifts = 0;
for (const p of pub) {
  const rel = p.replace(/^public[\\/]/,'');
  const other = path.join('public_html', rel);
  if (!fs.existsSync(other)) { console.log('MISSING public_html/'+rel); drifts++; continue; }
  const a = fs.statSync(p).size, b = fs.statSync(other).size;
  if (a !== b) { console.log('DRIFT', rel, a, 'vs', b); drifts++; }
}
console.log('drifts', drifts);

console.log('\n=== HTML module scripts ===');
const html = fs.readFileSync('public/dashboard.html','utf8');
const scripts = [...html.matchAll(/src="([^"]*dashboard[^"]*)"/g)].map(m=>m[1]);
scripts.forEach(s=>console.log(s));
