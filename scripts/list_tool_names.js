const fs = require('fs');

const fullCode = fs.readFileSync('scripts/exec_admin_code.js', 'utf8');

// Find all tools
const toolDefs = [];
const toolRegex = /\{\s*type:\s*'function',\s*function:\s*\{[\s\S]*?name:\s*'([a-zA-Z0-9_-]+)'[\s\S]*?\}\s*\}\s*([,}])/g;
let m;
while ((m = toolRegex.exec(fullCode)) !== null) {
  toolDefs.push(m[1]);
}
console.log('Tools found in tools array:', toolDefs);
