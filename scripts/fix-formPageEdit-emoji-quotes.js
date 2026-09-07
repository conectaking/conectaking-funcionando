const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const jsPath = path.join(__dirname, '..', 'public_html', 'formPageEdit.js');
let s = fs.readFileSync(jsPath, 'utf8');

// Inspect problematic spots
function dumpAround(needle) {
  const i = s.indexOf(needle);
  if (i < 0) return console.log('missing', needle);
  const slice = s.slice(i - 30, i + needle.length + 20);
  console.log('---', needle);
  console.log(JSON.stringify(slice));
  console.log([...slice].map((c) => c + ':' + c.codePointAt(0).toString(16)).join(' '));
}
dumpAround('ocultar</label>');
dumpAround('[MODAL] Tipo selecionado');

// 1) Fix common UTF-8 punctuation mojibake that embeds a real ASCII quote
// Em dash — (U+2014) often becomes â€™ or Ã¢â‚¬â€ or �?� / �?' depending on chain
const punctMap = [
  [/â€”/g, '—'],
  [/â€“/g, '–'],
  [/â€™/g, "'"],
  [/â€˜/g, "'"],
  [/â€œ/g, '"'],
  [/â€/g, '"'],
  [/Ã¢â‚¬â€/g, '—'],
  [/Ã¢â‚¬â€œ/g, '–'],
  // Replacement-char forms seen in this file: �?'  �?�  �?"
  [/\uFFFD\?\uFFFD/g, '—'],
  [/\uFFFD\?'/g, '—'],
  [/\uFFFD\?"/g, '—'],
  [/\uFFFD\?T/g, "'"],
];

for (const [re, rep] of punctMap) s = s.replace(re, rep);

// Also replace the literal multi-byte garbage shown as �?' when FFFD isn't used
// Match: non-ascii (1-3) + '?' + non-ascii-or-quote used as dash
s = s.replace(/[\u0080-\u00FF]{1,3}\?[''\u0080-\u00FF]/g, '—');

dumpAround('ocultar</label>');

// 2) Fix console.log openers where emoji mojibake injected a quote.
// Only strip when the early-closed inner looks like emoji leftovers (has non-ascii OR is Y / Y-)
function stripBrokenConsoleOpeners(src) {
  return src.replace(
    /console\.(log|warn|error|info|debug)\('([^']{0,12})'/g,
    (full, method, inner) => {
      const broken =
        /[^\x20-\x7E]/.test(inner) ||
        inner.includes('\uFFFD') ||
        /^Y-?$/.test(inner);
      if (broken) return `console.${method}('`;
      return full;
    }
  );
}

for (let i = 0; i < 6; i++) {
  const n = stripBrokenConsoleOpeners(s);
  if (n === s) break;
  s = n;
}

// Peel leftover non-ascii / variation-selector right after opener before real text
s = s.replace(
  /console\.(log|warn|error|info|debug)\('([\u0080-\uFFFF\uFFFD\uFE0F️\s]{1,16})/g,
  "console.$1('"
);

fs.writeFileSync(jsPath, s);

let check = spawnSync(process.execPath, ['--check', jsPath], { encoding: 'utf8' });
console.log('check1', check.status === 0 ? 'OK' : (check.stderr || '').split('\n')[0]);

let n = 0;
while (check.status !== 0 && n < 40) {
  n++;
  const err = check.stderr || '';
  const m = err.match(/formPageEdit\.js:(\d+)/);
  if (!m) {
    console.error(err.slice(0, 400));
    process.exit(1);
  }
  const lineNo = parseInt(m[1], 10) - 1;
  const lines = s.split('\n');
  const line = lines[lineNo];
  console.log('fix L' + (lineNo + 1), JSON.stringify(line).slice(0, 160));
  const indent = line.match(/^\s*/)[0];

  if (/console\.(log|warn|error|info|debug)\(/.test(line)) {
    const method = line.match(/console\.(\w+)/)[1];
    if (line.trim().endsWith(');')) {
      lines[lineNo] = `${indent}console.${method}();`;
    } else if (/\{\s*$/.test(line)) {
      lines[lineNo] = `${indent}console.${method}({`;
    } else {
      let fixed = stripBrokenConsoleOpeners(line);
      if (fixed === line) fixed = `${indent}console.${method}(`;
      lines[lineNo] = fixed;
    }
  } else if (/�|[\uFFFD]/.test(line) && line.includes("'")) {
    // string with embedded mojibake quote — replace mojibake dash-like with —
    lines[lineNo] = line
      .replace(/\uFFFD\?'/g, '—')
      .replace(/\uFFFD\?\uFFFD/g, '—')
      .replace(/[\u0080-\u00FF]{1,3}\?['']/g, '—');
    if (lines[lineNo] === line) {
      // last resort: remove ASCII quotes that sit between two non-ascii chars
      lines[lineNo] = line.replace(/([^\x00-\x7F])'([^\x00-\x7F])/g, '$1—$2');
    }
  } else {
    console.error('Unknown:', line);
    process.exit(1);
  }
  s = lines.join('\n');
  fs.writeFileSync(jsPath, s);
  check = spawnSync(process.execPath, ['--check', jsPath], { encoding: 'utf8' });
}

if (check.status !== 0) {
  console.error(check.stderr);
  process.exit(1);
}
console.log('SYNTAX_OK fixes', n);
console.log('sample MODAL', s.split('\n')[7593]);
