const fs = require('fs');

const fullCode = fs.readFileSync('scripts/exec_admin_code.js', 'utf8');

// Find where manage_finance tool definition begins and ends
const toolStart = fullCode.indexOf("name: 'manage_finance'");
console.log('manage_finance tool starts at:', toolStart);

// Find where manage_finance dispatch begins and ends
const dispatchStart = fullCode.indexOf("} else if (fnName === 'manage_finance') {");
console.log('manage_finance dispatch starts at:', dispatchStart);

const dispatchEnd = fullCode.indexOf("} else if (fnName === 'send_daily_audio') {");
console.log('manage_finance dispatch ends at (before send_daily_audio):', dispatchEnd);

// Also check check_system_errors
const checkErrorsStart = fullCode.indexOf("} else if (fnName === 'check_system_errors') {");
console.log('check_system_errors starts at:', checkErrorsStart);
