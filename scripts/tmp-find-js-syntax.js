const fs = require('fs');
const s = fs.readFileSync('public/dashboard.js', 'utf8');

// Find console/throw strings that close too early: 'xxx' Word
const re = /(console\.(?:error|log|warn)|throw new Error)\('((?:\\.|[^'\\])*)'\s+([A-Za-zÀ-ÿ])/g;
let m;
let n = 0;
while ((m = re.exec(s)) && n < 40) {
  const line = s.slice(0, m.index).split(/\n/).length;
  console.log(line + ':', JSON.stringify(m[0].slice(0, 100)));
  n++;
}
console.log('hits', n);

// Also find bare quote anomalies like ?' inside strings via line-level try
const lines = s.split(/\n/);
let lo = 0;
let hi = lines.length - 1;
function ok(upto) {
  try {
    // wrap in async function to allow top-level await-ish and keep braces balanced better — still fails on incomplete
    // Better: use Function on whole file only; for binary search use acorn-free approach:
    // accumulate and check with Function only when brace depth is 0 at end — too hard
    new Function(lines.slice(0, upto + 1).join('\n') + '\n'.repeat(50) + '});'.repeat(20));
    return true;
  } catch (e) {
    return !/missing \)|Unexpected token|Invalid or unexpected/.test(e.message);
  }
}

// Brute: scan every 50 lines with full-file replacements? 
// Use node child with --check and error message
try {
  new Function(s);
  console.log('PARSE OK');
} catch (e) {
  console.log('PARSE:', e.message);
}

// Search for pattern: letter then ' then letter outside comments (WiFi style leftovers)
const re2 = /[A-Za-zÀ-ÿ]\?'[A-Za-zÀ-ÿ]|'[A-Za-zÀ-ÿ]{0,3}'\s+[A-Za-zÀ-ÿ]/g;
n = 0;
while ((m = re2.exec(s)) && n < 30) {
  const line = s.slice(0, m.index).split(/\n/).length;
  const snippet = lines[line - 1] || '';
  if (/console\.|throw new Error|alert\(/.test(snippet)) {
    console.log('anom', line, JSON.stringify(m[0]), JSON.stringify(snippet.trim().slice(0, 120)));
    n++;
  }
}
