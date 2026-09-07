const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const safer = [
    [/disponibiliza as funf§fµes/gi, 'disponibiliza as funções'],
    [/Funf§f£o/g, 'Função'],
    [/funf§f£o/g, 'função'],
    [/funf§fµes/gi, 'funções'],
    [/M"DULOS/g, 'MÓDULOS'],
    [/edif§f£o/g, 'edição'],
    [/configuraf§f£o/g, 'configuração']
];

const root = path.join(__dirname, '..');
const files = [
    path.join(root, 'public', 'dashboard.js'),
    ...fs.readdirSync(path.join(root, 'public', 'js'))
        .filter((f) => f.startsWith('dashboard-') && f.endsWith('.js'))
        .map((f) => path.join(root, 'public', 'js', f))
];

for (const p of files) {
    let t = fs.readFileSync(p, 'utf8');
    const o = t;
    for (const [re, to] of safer) t = t.replace(re, to);
    if (t !== o) {
        fs.writeFileSync(p, t, 'utf8');
        console.log('fixed', path.relative(root, p));
    }
    execSync('node --check "' + p + '"', { stdio: 'pipe' });
}
console.log('all syntax OK', files.length);
