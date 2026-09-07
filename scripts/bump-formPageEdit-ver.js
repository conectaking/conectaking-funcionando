const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const ver = 'formPageEdit.js?v=2026-09-07-syntax';
for (const rel of ['public_html/formPageEdit.html', 'public_html/kingForms.html']) {
  const f = path.join(root, rel);
  if (!fs.existsSync(f)) continue;
  let s = fs.readFileSync(f, 'utf8');
  s = s.replace(/formPageEdit\.js\?v=[^"'&\s]+/g, ver);
  fs.writeFileSync(f, s);
  console.log(rel, (s.match(/formPageEdit\.js\?v=[^"'&\s]+/) || [])[0] || 'no ref');
}
