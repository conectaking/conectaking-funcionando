const fs = require('fs');
const lines = fs.readFileSync('scripts/exec_admin_code.js', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("name: 'manage_finance'")) {
    console.log('manage_finance line:', i + 1);
    // Find the opening { type: 'function'
    let startLine = i;
    while (startLine > 0 && !lines[startLine].includes("{ type: 'function'")) {
      startLine--;
    }
    console.log('tool start line:', startLine + 1, lines[startLine]);

    // Find the next { type: 'function'
    let endLine = i;
    while (endLine < lines.length && !lines[endLine].includes("name: 'send_daily_audio'")) {
      endLine++;
    }
    while (endLine > 0 && !lines[endLine].includes("{ type: 'function'")) {
      endLine--;
    }
    console.log('tool end line (before next tool):', endLine + 1, lines[endLine]);
    break;
  }
}
