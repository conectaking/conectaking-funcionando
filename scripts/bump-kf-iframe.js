const fs = require('fs');
const f = 'public_html/kingForms.html';
let s = fs.readFileSync(f, 'utf8');
s = s.replace(
  /formPageEdit\.html\?itemId=' \+ encodeURIComponent\(editId\) \+ '&v=[^']+'/g,
  "formPageEdit.html?itemId=' + encodeURIComponent(editId) + '&v=2026-09-07-syntax'"
);
fs.writeFileSync(f, s);
console.log('ok', s.includes('v=2026-09-07-syntax'));
