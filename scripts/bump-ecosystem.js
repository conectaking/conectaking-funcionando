const fs = require('fs');
const ver = 'dashboard.js?v=2026-09-07-ecosystem';
for (const f of ['public/dashboard.html', 'public_html/dashboard.html']) {
  let s = fs.readFileSync(f, 'utf8');
  s = s.replace(/dashboard\.js\?v=[^"'&\s]+/g, ver);
  fs.writeFileSync(f, s);
  console.log('bumped', f);
}
fs.copyFileSync('public/dashboard.js', 'public_html/dashboard.js');
fs.copyFileSync('public/dashboard.html', 'public_html/dashboard.html');
console.log('synced dashboard');
