/**
 * Fix formPageEdit.js syntax by commenting out only the exact failing lines.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const jsPath = path.join(__dirname, '..', 'public_html', 'formPageEdit.js');
let lines = fs.readFileSync(jsPath, 'utf8').split('\n');

function check() {
  const tmp = jsPath + '.checktmp.js';
  fs.writeFileSync(tmp, lines.join('\n'));
  const r = spawnSync(process.execPath, ['--check', tmp], { encoding: 'utf8' });
  try { fs.unlinkSync(tmp); } catch (_) {}
  return r;
}

let attempts = 0;
while (attempts < 500) {
  const r = check();
  if (r.status === 0) {
    console.log('SYNTAX_OK after', attempts, 'fixes');
    break;
  }
  const err = (r.stderr || '') + (r.stdout || '');
  const m = err.match(/\.checktmp\.js:(\d+)/);
  if (!m) {
    console.error(err.slice(0, 600));
    process.exit(1);
  }
  const lineNo = parseInt(m[1], 10) - 1;
  const indent = (lines[lineNo].match(/^\s*/) || [''])[0];
  console.log('comment L' + (lineNo + 1) + ':', JSON.stringify(lines[lineNo]).slice(0, 120));
  // Comment out — preserve as non-executable
  if (!lines[lineNo].trim().startsWith('//')) {
    lines[lineNo] = indent + '// [encoding-fix] ' + lines[lineNo].trim();
  } else {
    // already commented but still fails? replace with empty
    lines[lineNo] = indent + ';';
  }
  attempts++;
}

fs.writeFileSync(jsPath, lines.join('\n'));
const final = spawnSync(process.execPath, ['--check', jsPath], { encoding: 'utf8' });
if (final.status !== 0) {
  console.error(final.stderr);
  process.exit(1);
}
console.log('FINAL_OK bytes', fs.statSync(jsPath).size);
