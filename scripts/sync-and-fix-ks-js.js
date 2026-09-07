const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// Sync copies
for (const rel of [
  ['public/dashboard.js', 'public_html/dashboard.js'],
  ['public/kingSelectionProject.js', 'public_html/kingSelectionProject.js'],
  ['public/kingSelectionProject.html', 'public_html/kingSelectionProject.html']
]) {
  fs.copyFileSync(path.join(root, rel[0]), path.join(root, rel[1]));
  console.log('synced', rel[1]);
}

for (const rel of ['public/kingSelectionProject.js', 'public_html/kingSelectionProject.js']) {
  const f = path.join(root, rel);
  let s = fs.readFileSync(f, 'utf8');
  s = s.replace(/Marca d\uFFFD.\uFFFDTágua/g, "Marca d'água");
  s = s.replace(/Marca d\uFFFD+\uFFFDT?água/g, "Marca d'água");
  s = s.replace(/N\uFFFDfO/g, 'NÃO');
  s = s.replace(/\uFFFDsltimo/g, 'Último');
  fs.writeFileSync(f, s);
  console.log(rel, "has Marca d'água", s.includes("Marca d'água"), 'fffd', (s.match(/\uFFFD/g) || []).length);
}
