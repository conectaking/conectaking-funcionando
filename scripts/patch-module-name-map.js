const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const f = path.join(root, 'public', 'dashboard.js');
let s = fs.readFileSync(f, 'utf8');
const old = `'Contratos': 'contract',
                'Agenda Inteligente': 'agenda'`;
const neu = `'King Selection': 'king_selection',
                'King Docs': 'king_docs'`;
if (!s.includes(old)) {
  console.log('pattern not found exact; trying loose');
  s = s.replace(/'Contratos': 'contract',\s*'Agenda Inteligente': 'agenda'/, neu);
} else {
  s = s.split(old).join(neu);
}
fs.writeFileSync(f, s);
fs.copyFileSync(f, path.join(root, 'public_html', 'dashboard.js'));
fs.copyFileSync(path.join(root, 'public', 'kingSelectionProject.html'), path.join(root, 'public_html', 'kingSelectionProject.html'));
console.log('updated', s.includes("'King Selection': 'king_selection'"));
