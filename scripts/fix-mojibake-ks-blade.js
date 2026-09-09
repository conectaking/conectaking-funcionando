const fs = require('fs');
const path = process.argv[2] || 'laravel/resources/views/pages/kingSelectionProject.blade.php';
let t = fs.readFileSync(path, 'utf8');
const map = [
  ['Ã§Ã£o', 'ção'],
  ['Ã§Ãµes', 'ções'],
  ['permissÃ£o', 'permissão'],
  ['temporÃ¡rio', 'temporário'],
  ['seleÃ§Ã£o', 'seleção'],
  ['VocÃª', 'Você'],
  ['vocÃª', 'você'],
  ['nÃ£o', 'não'],
  ['NÃ£o', 'Não'],
  ['tambÃ©m', 'também'],
  ['jÃ¡', 'já'],
  ['sÃ³', 'só'],
  ['SÃ³', 'Só'],
  ['Ã£o', 'ão'],
  ['Ã¡', 'á'],
  ['Ã ', 'à'],
  ['Ã¢', 'â'],
  ['Ã£', 'ã'],
  ['Ã©', 'é'],
  ['Ãª', 'ê'],
  ['Ã¨', 'è'],
  ['Ã­', 'í'],
  ['Ã³', 'ó'],
  ['Ã´', 'ô'],
  ['Ãµ', 'õ'],
  ['Ãº', 'ú'],
  ['Ã§', 'ç'],
  ['Ã', 'Á'],
  ['Ã‰', 'É'],
  ['Ã', 'Í'],
  ['Ã“', 'Ó'],
  ['Ãš', 'Ú'],
  ['Ã‡', 'Ç'],
];
const before = (t.match(/Ã/g) || []).length;
for (const [a, b] of map) t = t.split(a).join(b);
const after = (t.match(/Ã/g) || []).length;
fs.writeFileSync(path, t, 'utf8');
console.log({ before, after, voce: (t.match(/Você/g) || []).length, permissao: (t.match(/permissão/g) || []).length });
