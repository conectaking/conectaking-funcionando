/**
 * Cópia LOCAL apenas: public/ → public_html/ (pasta que depois envias à Hostinger).
 * Não faz deploy no Render nem “sobe” nada para o back-end — só alinha ficheiros
 * no disco para o teu FTP/File Manager.
 *
 * Inclui: kingDocs*, dashboard.html, landing-exit.js, dashboard-cropper-enhance.js,
 * image-crop-modal.js
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

const dashboardFrom = path.join(srcDir, 'dashboard.html');
const dashboardTo = path.join(destDir, 'dashboard.html');
if (fs.existsSync(dashboardFrom)) {
  fs.copyFileSync(dashboardFrom, dashboardTo);
  console.log('[sync-king-docs] OK dashboard.html → public_html/');
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

const cropEnhanceFrom = path.join(srcDir, 'js', 'dashboard-cropper-enhance.js');
if (fs.existsSync(cropEnhanceFrom)) {
  if (!fs.existsSync(destJsDir)) {
    fs.mkdirSync(destJsDir, { recursive: true });
  }
  fs.copyFileSync(cropEnhanceFrom, path.join(destJsDir, 'dashboard-cropper-enhance.js'));
  console.log('[sync-king-docs] OK js/dashboard-cropper-enhance.js → public_html/js/');
}

const imageCropModalFrom = path.join(srcDir, 'js', 'image-crop-modal.js');
if (fs.existsSync(imageCropModalFrom)) {
  if (!fs.existsSync(destJsDir)) {
    fs.mkdirSync(destJsDir, { recursive: true });
  }
  fs.copyFileSync(imageCropModalFrom, path.join(destJsDir, 'image-crop-modal.js'));
  console.log('[sync-king-docs] OK js/image-crop-modal.js → public_html/js/');
}
