const fs = require('fs');
const code = fs.readFileSync('scripts/exec_admin_code.js', 'utf8');

console.log('--- Tools declared in tools array ---');
const toolMatches = code.match(/name:\s*['\"][a-zA-Z0-9_-]+['\"]/g);
console.log(toolMatches);

const lines = code.split('\n');
console.log('Total lines:', lines.length);

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('SYSTEM_PROMPT') || line.includes('function ') || line.includes('tools =') || line.includes('call_function') || line.includes('manage_finance') || line.includes('check_system_errors') || line.includes('generate_invite_code')) {
    if (line.length < 150) {
      console.log(`L${i+1}: ${line.trim()}`);
    }
  }
}
