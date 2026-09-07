const fs = require('fs');
const ver = '2026-09-07-utf8clean';
const files = [
  'public_html/formPageEdit.html',
  'public_html/kingForms.html',
  'public/dashboard.html',
  'public_html/dashboard.html'
];
for (const f of files) {
  if (!fs.existsSync(f)) continue;
  let s = fs.readFileSync(f, 'utf8');
  s = s.replace(/formPageEdit\.js\?v=[^"'&\s]+/g, 'formPageEdit.js?v=' + ver);
  s = s.replace(/dashboard\.js\?v=[^"'&\s]+/g, 'dashboard.js?v=' + ver);
  s = s.replace(/v=2026-09-07-syntax/g, 'v=' + ver);
  fs.writeFileSync(f, s);
  console.log('updated', f);
}
