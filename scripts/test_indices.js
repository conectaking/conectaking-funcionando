const fs = require('fs');
const lines = fs.readFileSync('scripts/exec_admin_code.js', 'utf8').split('\n');
console.log('promptStart:', lines.findIndex(l => l.includes('REGRAS SUPREMAS DE TRABALHOS A RECEBER')));
console.log('promptEnd:', lines.findIndex(l => l.includes('REGRAS SUPREMAS DE ORÇAMENTOS')));
console.log('manage_finance tool:', lines.findIndex(l => l.includes("name: 'manage_finance'")));
console.log('manage_finance dispatch:', lines.findIndex(l => l.includes("fnName === 'manage_finance'")));
console.log('send_daily_audio dispatch:', lines.findIndex(l => l.includes("fnName === 'send_daily_audio'")));
