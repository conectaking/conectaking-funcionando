const fs = require('fs');
const code = fs.readFileSync('scripts/exec_admin_code.js', 'utf8');

const actions = [];
const regex = /action\s*===\s*['"]([^'"]+)['"]/g;
let match;
while ((match = regex.exec(code)) !== null) {
  if (!actions.includes(match[1])) actions.push(match[1]);
}
console.log('Detected actions in code:', actions);
