const fs = require('fs');
const { spawnSync } = require('child_process');
const file = 'public/dashboard.js';

function check() {
  const r = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (r.status === 0) return { ok: true };
  const err = String(r.stderr || '');
  const m = err.match(/\.js:(\d+)/);
  return { ok: false, line: m ? +m[1] : null, err: err.slice(0, 500) };
}

function globalFix(s) {
  return s
    // Só quando a aspas fecha cedo e a seguir vem palavra (não concatenação +)
    .replace(/'(?:â�|âŒ|\uFFFD)'\s+(?=[A-Za-zÀ-ÿ])/g, "'")
    .replace(/(console\.(?:error|log|warn)|throw new Error)\('\uFFFDY'\uFFFD\s+(?=[A-Za-zÀ-ÿ])/g, "$1('")
    .replace(/(console\.(?:error|log|warn)|throw new Error)\('\uFFFD[^']{0,8}'\s+(?=[A-Za-zÀ-ÿ])/g, "$1('")
    .replace(/N�f�'O/g, 'NAO')
    .replace(/n�f�'o/g, 'nao')
    .replace(/�f�'O/g, 'AO')
    .replace(/�f�'o/g, 'ao')
    .replace(/\uFFFDf\uFFFD'O/g, 'AO')
    .replace(/'Wi-'Fi'/g, "'Wi-Fi'")
    .replace(/Wi-'Fi/g, 'Wi-Fi')
    .replace(/Wi\uFFFD\?'Fi/g, 'Wi-Fi')
    .replace(/Wi�\?'Fi/g, 'Wi-Fi')
    .replace(/Wi.{0,4}'Fi/g, 'Wi-Fi')
    .replace(/\uFFFD\?"/g, '-')
    .replace(/�\?"/g, '-')
    .replace(/slice\(0,\s*48\)\s*\+\s*'[^']*'\s*:/g, "slice(0, 48) + '...':")
    .replace(/\+\s*'\uFFFD[^']{0,6}'?\s*:/g, "+ '...':")
    .replace(/\|\|\s*'\uFFFD[^']{0,10}'+/g, "|| ''")
    .replace(/\|\|\s*''+'/g, "|| ''")
    .replace(/,\s*'\uFFFD[^']{0,6}'+/g, ", ''")
    .replace(/,\s*'�\?'+'/g, ", ''")
    // receita ? '▲' : '-' corrompido para '�?''
    .replace(/\?\s*'\uFFFD[^']{0,4}'+/g, "? '+'")
    .replace(/\?\s*'�\?'+/g, "? '+'")
    // prefixo emoji já comido: console.log('+ var + ' rest → console.log(var + ' rest
    .replace(/console\.log\('\+\s*([A-Za-z_][\w]*)\s*\+\s*'/g, "console.log($1 + '");
}

let s = fs.readFileSync(file, 'utf8');
s = globalFix(s);
fs.writeFileSync(file, s);

for (let i = 0; i < 80; i++) {
  const c = check();
  if (c.ok) {
    console.log('OK after', i, 'surgical fixes');
    break;
  }
  const lines = s.split(/\n/);
  const L = lines[c.line - 1] || '';
  console.log(c.line, JSON.stringify(L.trim().slice(0, 160)));
  let n = globalFix(L);
  if (n === L) {
    n = L.replace(/([A-Za-zÀ-ÿ])'([A-Za-zÀ-ÿ]{2,})/g, '$1$2');
  }
  if (n === L) {
    n = L.replace(/(console\.(?:error|log|warn)|throw new Error)\('[^']{0,12}'\s+(?=[A-Za-zÀ-ÿ])/g, "$1('");
  }
  if (n === L && /throw new Error/.test(L)) {
    n = L.replace(/throw new Error\([^;]*\)/, "throw new Error('Erro')");
  }
  if (n === L && /\|\|\s*'/.test(L)) {
    n = L.replace(/\|\|\s*'[^']*'/g, "|| ''");
  }
  if (n === L && /,\s*'/.test(L) && /console\.|throw /.test(L)) {
    n = L.replace(/,\s*'\uFFFD[^']{0,12}'+/g, ", ''").replace(/,\s*'�[^']{0,8}'+/g, ", ''");
  }
  if (n === L && /\+\s*'/.test(L) && !/\+\s*'[^']*'\s*\+/.test(L)) {
    n = L.replace(/\+\s*'[^']*'\s*:/, "+ '...':").replace(/\+\s*'[^':]*:/, "+ '...':");
  }
  if (n === L) {
    console.log('STOP\n', c.err);
    process.exit(1);
  }
  lines[c.line - 1] = n;
  s = lines.join('\n');
  fs.writeFileSync(file, s);
}

const final = check();
fs.copyFileSync(file, 'public_html/dashboard.js');
console.log('final', final);
process.exit(final.ok ? 0 : 1);
