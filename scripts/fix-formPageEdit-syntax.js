/**
 * Fix formPageEdit.js SyntaxErrors caused by corrupted emoji inside console.log strings.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const jsPath = path.join(root, 'public_html', 'formPageEdit.js');

let js = fs.readFileSync(jsPath, 'utf8');
const lines = js.split('\n');

function looksBrokenConsoleLog(line) {
  if (!/console\.(log|warn|error|info|debug)\(/.test(line)) return false;
  if (/�|[\uFFFD]/.test(line)) return true;
  // single-quoted string that closes early then has more text before comma/paren
  // e.g. console.log('xxx'yyy:', a);
  return /console\.\w+\('[^'\\]*(?:\\.[^'\\]*)*'[^',\s)]/.test(line);
}

function simplifyConsoleLine(line) {
  const indent = (line.match(/^\s*/) || [''])[0];
  const m = line.match(/^(\s*)console\.(log|warn|error|info|debug)\((.*)\);?\s*(?:\/\/.*)?$/);
  if (!m) return `${indent}/* console call removed (encoding) */`;
  const method = m[2];
  let args = m[3];
  // Drop leading broken string literal(s); keep remaining args after first comma that looks like data
  // Prefer: keep everything after the first ', ' that separates message from values
  // Heuristic: find last occurrence of "', " or '", ' pattern from a would-be string end — unreliable.
  // Better: strip first argument if it's a string starting with quote, walking carefully;
  // if walk fails (corruption), fall back to args after first ", var" pattern.

  if (args[0] === "'" || args[0] === '"') {
    const q = args[0];
    let i = 1;
    let ok = false;
    while (i < args.length) {
      if (args[i] === '\\') {
        i += 2;
        continue;
      }
      if (args[i] === q) {
        i++;
        ok = true;
        break;
      }
      i++;
    }
    // If string "ended" but next char is not , or ) — corruption inside string
    const next = args[i];
    if (!ok || (next && next !== ',' && next !== ')' && !/\s/.test(next))) {
      // Find ", identifier" or ", {" from the right half
      const comma = args.search(/,\s*([a-zA-Z_$]|\{|\[)/);
      if (comma > 0) {
        return `${indent}console.${method}(${args.slice(comma + 1).trim()});`;
      }
      return `${indent}/* console.${method} removed */`;
    }
    // Valid string end — still may want to drop mojibake message
    const rest = args.slice(i).replace(/^\s*,\s*/, '').trim();
    if (/�|[\uFFFD]/.test(args.slice(0, i))) {
      if (rest) return `${indent}console.${method}(${rest});`;
      return `${indent}/* console.${method} removed */`;
    }
    // Message has mojibake but parse ok — still drop message for safety
    if (/�|[\uFFFD]/.test(line)) {
      if (rest) return `${indent}console.${method}(${rest});`;
      return `${indent}/* console.${method} removed */`;
    }
  }
  // No leading string — keep as-is if parseable later
  return line;
}

let changed = 0;
const out = lines.map((line) => {
  if (!looksBrokenConsoleLog(line)) return line;
  const next = simplifyConsoleLine(line);
  if (next !== line) changed++;
  return next;
});

js = out.join('\n');
fs.writeFileSync(jsPath, js);
console.log('rewrote console lines:', changed);

let check = spawnSync(process.execPath, ['--check', jsPath], { encoding: 'utf8' });
let attempts = 0;
while (check.status !== 0 && attempts < 20) {
  attempts++;
  const err = (check.stderr || '') + (check.stdout || '');
  const m = err.match(/formPageEdit\.js:(\d+)/);
  if (!m) {
    console.error(err);
    break;
  }
  const lineNo = parseInt(m[1], 10) - 1;
  const cur = js.split('\n');
  console.log('fixing line', lineNo + 1, JSON.stringify(cur[lineNo]).slice(0, 160));
  cur[lineNo] = simplifyConsoleLine(cur[lineNo]);
  // If still same pattern, comment out entirely
  if (looksBrokenConsoleLog(cur[lineNo]) || /�|[\uFFFD]/.test(cur[lineNo])) {
    const indent = (cur[lineNo].match(/^\s*/) || [''])[0];
    cur[lineNo] = `${indent}/* broken console removed L${lineNo + 1} */`;
  }
  js = cur.join('\n');
  fs.writeFileSync(jsPath, js);
  check = spawnSync(process.execPath, ['--check', jsPath], { encoding: 'utf8' });
}

console.log('syntax:', check.status === 0 ? 'OK' : (check.stderr || check.stdout));
console.log('attempts:', attempts);
