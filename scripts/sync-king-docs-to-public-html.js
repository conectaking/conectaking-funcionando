/**
 * Copia King Docs (e landing-exit.js) de public/ para public_html/.
 * Na Hostinger, o domínio aponta para public_html — sem isto, o site mostra HTML antigo.
 *
 * Uso: node scripts/sync-king-docs-to-public-html.js
 *      npm run sync:king-docs
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'public');
const destDir = path.join(root, 'public_html');
const files = ['kingDocs.html', 'kingDocsShare.html'];

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

for (const name of files) {
  const from = path.join(srcDir, name);
  const to = path.join(destDir, name);
  if (!fs.existsSync(from)) {
    console.error('[sync-king-docs] Ficheiro em falta:', from);
    process.exit(1);
  }
  fs.copyFileSync(from, to);
  console.log('[sync-king-docs] OK', name, '→ public_html/');
}

const landingExitFrom = path.join(srcDir, 'js', 'landing-exit.js');
const destJsDir = path.join(destDir, 'js');
if (fs.existsSync(landingExitFrom)) {
  if (!fs.existsSync(destJsDir)) {
    fs.mkdirSync(destJsDir, { recursive: true });
  }
  fs.copyFileSync(landingExitFrom, path.join(destJsDir, 'landing-exit.js'));
  console.log('[sync-king-docs] OK js/landing-exit.js → public_html/js/');
}
