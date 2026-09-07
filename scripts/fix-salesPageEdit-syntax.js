/**
 * Fix salesPageEdit.js broken console.log from emoji cleanup leftovers.
 */
const fs = require('fs');
const { spawnSync } = require('child_process');
const path = require('path');

const f = path.join(__dirname, '..', 'public_html', 'salesPageEdit.js');
let s = fs.readFileSync(f, 'utf8');

// Peel broken openers like console.log('Y' Salvando...
s = s.replace(
  /console\.(log|warn|error|info|debug)\('Y'?\s*/g,
  "console.$1('"
);
s = s.replace(
  /console\.(log|warn|error|info|debug)\('([^A-Za-z\[{À-ÿ\n]{0,8})/g,
  (full, method, garbage) => {
    if (garbage.includes("'") || /[^\x20-\x7E]/.test(garbage)) return `console.${method}('`;
    return full;
  }
);

fs.writeFileSync(f, s);

let check = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
let n = 0;
while (check.status !== 0 && n < 40) {
  n++;
  const err = check.stderr || '';
  const m = err.match(/salesPageEdit\.js:(\d+)/);
  if (!m) {
    console.error(err.slice(0, 400));
    process.exit(1);
  }
  const lineNo = parseInt(m[1], 10) - 1;
  const lines = s.split('\n');
  const indent = lines[lineNo].match(/^\s*/)[0];
  const method = (lines[lineNo].match(/console\.(\w+)/) || [])[1] || 'log';
  console.log('fix L' + (lineNo + 1), JSON.stringify(lines[lineNo]).slice(0, 120));
  if (lines[lineNo].trim().endsWith(');')) {
    lines[lineNo] = `${indent}console.${method}();`;
  } else {
    lines[lineNo] = `${indent}console.${method}(`;
  }
  s = lines.join('\n');
  fs.writeFileSync(f, s);
  check = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
}
console.log(check.status === 0 ? 'SYNTAX_OK' : 'FAIL', 'fixes', n);
