/**
 * Fix admin.js syntax (broken emoji quotes) + admin index.html mojibake.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const jsPath = path.join(root, 'public_html', 'admin', 'admin.js');
const htmlPath = path.join(root, 'public_html', 'admin', 'index.html');

let js = fs.readFileSync(jsPath, 'utf8');

// Replace console.log lines that embed corrupted emoji / stray quotes
js = js.replace(/console\.log\(\s*'[^'\n]*'[^,\n)]*[^'\n]*',\s*/g, (m) => {
  // Only rewrite when the string clearly broke (extra quote before comma pattern is wrong)
  return m;
});

// Targeted: any console.log starting with corrupted emoji bytes that may include '
const lines = js.split('\n');
const out = lines.map((line, idx) => {
  const trimmed = line.trim();
  if (!trimmed.startsWith('console.log(')) return line;
  // Detect likely-broken single-quoted console.log with internal quote before end
  // e.g. console.log('xxx'yyy:', users);
  const m = line.match(/^(\s*)console\.log\((.*)\);\s*$/);
  if (!m) return line;
  const args = m[2];
  // If first arg is a broken string with emoji garbage, simplify
  if (/[\uFFFD]|Ã.|�/.test(args) || /console\.log\('[^']*'[^',)]/.test(line)) {
    // Extract trailing identifiers after last comma if present
    const lastComma = args.lastIndexOf(',');
    if (lastComma > 0) {
      const rest = args.slice(lastComma + 1).trim();
      // Keep data args, drop broken message
      if (/^[a-zA-Z_$][\w$]*(\s*,\s*[a-zA-Z_$][\w$]*)*$/.test(rest) || rest.startsWith('{') || rest.includes(':')) {
        return `${m[1]}console.log(${rest});`;
      }
    }
    // No safe args — comment out
    return `${m[1]}/* console.log removed (encoding) */`;
  }
  return line;
});

js = out.join('\n');

// Extra safety: fix known broken lines by exact patterns
js = js.replace(/console\.log\('�Y'� Renderizando usuários:', users\);/g, "console.log('Renderizando usuarios:', users);");
js = js.replace(/console\.log\('�Y"' Renderizando códigos:', codes\);/g, "console.log('Renderizando codigos:', codes);");

fs.writeFileSync(jsPath, js);

// Verify syntax
const { spawnSync } = require('child_process');
let check = spawnSync('node', ['--check', jsPath], { encoding: 'utf8' });
if (check.status !== 0) {
  console.error('Still broken, applying aggressive console.log cleanup...');
  // Aggressive: neutralize any console.log containing replacement/mojibake in first string literal
  const lines2 = js.split('\n');
  js = lines2.map((line) => {
    if (!/console\.log\(/.test(line)) return line;
    // If line fails when evaluated alone in a function, simplify
    if (/�|[\uFFFD]/.test(line) || /console\.log\('[^'\\]*(?:\\.[^'\\]*)*'[^,)]/.test(line)) {
      const indent = line.match(/^\s*/)[0];
      // Try to keep object/variable args
      const m = line.match(/console\.log\((.*)\);\s*$/);
      if (!m) return `${indent}/* bad console.log removed */`;
      const args = m[1];
      // Find first complete string and drop it
      let i = 0;
      if (args[0] === "'" || args[0] === '"') {
        const q = args[0];
        i = 1;
        while (i < args.length) {
          if (args[i] === '\\') { i += 2; continue; }
          if (args[i] === q) { i++; break; }
          i++;
        }
        // If string ended early due to corruption, whole thing is bad
        if (i < args.length && args[i] !== ',' && args[i] !== ')') {
          // broken — remove message, keep from first comma that looks like data
          const comma = args.indexOf(', ');
          if (comma > 0) return `${indent}console.log(${args.slice(comma + 1).trim()});`;
          return `${indent}/* bad console.log removed */`;
        }
        const rest = args.slice(i).replace(/^\s*,\s*/, '');
        if (rest) return `${indent}console.log(${rest});`;
        return `${indent}/* console.log removed */`;
      }
    }
    return line;
  }).join('\n');
  fs.writeFileSync(jsPath, js);
  check = spawnSync('node', ['--check', jsPath], { encoding: 'utf8' });
}

console.log('admin.js syntax:', check.status === 0 ? 'OK' : check.stderr || check.stdout);

// Fix HTML mojibake (UTF-8 misread as latin1 then saved)
let html = fs.readFileSync(htmlPath, 'utf8');
// Strip BOM if present
if (html.charCodeAt(0) === 0xfeff) html = html.slice(1);
if (html.includes('VisÃ£o') && !html.includes('Visão')) {
  html = Buffer.from(html, 'latin1').toString('utf8');
}
fs.writeFileSync(htmlPath, html);
console.log('index.html Visão?', html.includes('Visão'), 'VisÃ£o?', html.includes('VisÃ£o'));
console.log('Logomarca padrão?', html.includes('Logomarca padrão'));
