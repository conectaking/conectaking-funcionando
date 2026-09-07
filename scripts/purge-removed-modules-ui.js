/**
 * Remove dead UI paths for discontinued modules from dashboard.js
 * (agenda, contract, kingbrief, king_bolao, photographer_site / meusite).
 * Recibos e Orçamentos is kept.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const file = path.join(__dirname, '..', 'public', 'dashboard.js');
let s = fs.readFileSync(file, 'utf8');
const before = s.length;

// 1) Sidebar click stubs that only return — remove the whole if blocks
s = s.replace(/\n\s*if \(link\.id === 'king-bolao-sidebar-link'\) \{\s*return;\s*\}/g, '\n');
s = s.replace(/\n\s*if \(link\.id === 'contratos-link'\) \{\s*return;\s*\}/g, '\n');
s = s.replace(/\n\s*if \(link\.id === 'kingbrief-sidebar-link'\) \{\s*return;\s*\}/g, '\n');

// 2) Meu Site (photographer site) loader — neutralize
s = s.replace(
  /\n\s*if \(link\.id === 'meusite-sidebar-link'\) \{[\s\S]*?\n\s*\}/g,
  '\n'
);

// 3) Pane map entries
s = s.replace(/\n\s*'contratos': 'contratos-pane',/g, '\n');
s = s.replace(/\n\s*'agenda': 'agenda-pane',/g, '\n');

// 4) contratos-pane / agenda-pane click handlers — replace bodies with return
s = s.replace(
  /if \(targetId === 'contratos-pane'\) \{[\s\S]*?\n\s*\}/g,
  "if (targetId === 'contratos-pane') { return; }"
);
s = s.replace(
  /if \(targetId === 'agenda-pane'\) \{[\s\S]*?\n\s*\}(?=\s*if \(targetId|\s*\}\s*\)\s*;|\s*\/\/)/g,
  "if (targetId === 'agenda-pane') { return; }"
);

// Broader: remove else-if initContractsPane line
s = s.replace(
  /\n\s*else if \(targetId === 'contratos-pane' && typeof window\.initContractsPane === 'function'\) window\.initContractsPane\(\);/g,
  '\n'
);

// 5) Icon map leftovers (safe to leave labels but remove dedicated keys from display maps if simple)
s = s.replace(/\n\s*'agenda': 'fas fa-calendar-check',/g, '\n');
s = s.replace(/\n\s*'contract': 'fas fa-file-contract',/g, '\n');

// 6) Filter placeholder
s = s.replace(
  'Ex: Banner, Carrossel, Agenda...',
  'Ex: Banner, Carrossel, King Forms...'
);

fs.writeFileSync(file, s);
console.log('bytes', before, '->', s.length);

const check = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
if (check.status !== 0) {
  console.error(check.stderr);
  process.exit(1);
}
console.log('SYNTAX_OK');

fs.copyFileSync(file, path.join(__dirname, '..', 'public_html', 'dashboard.js'));
console.log('synced public_html/dashboard.js');
