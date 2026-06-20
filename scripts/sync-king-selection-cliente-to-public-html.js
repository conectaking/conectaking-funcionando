#!/usr/bin/env node
/**
 * Copia ficheiros do cliente King Selection (public/) para public_html/ (Hostinger).
 * Uso: npm run sync:king-selection-cliente
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const srcDir = path.join(root, 'public');
const destDir = path.join(root, 'public_html');

const files = [
  'kingSelectionCliente.html',
  'kingSelectionCliente.js',
  'kingSelectionCliente-no-sem-pasta.js',
  'kingSelectionCliente-edit-requests.js',
];

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

for (const file of files) {
  const from = path.join(srcDir, file);
  const to = path.join(destDir, file);
  if (!fs.existsSync(from)) {
    console.warn('skip (não existe):', from);
    continue;
  }
  fs.copyFileSync(from, to);
  console.log('copied', path.relative(root, to));
}

const phpPath = path.join(destDir, 'kingSelectionGallery.php');
if (fs.existsSync(phpPath)) {
  console.log('ok (já em public_html):', path.relative(root, phpPath));
} else {
  console.warn('ATENÇÃO: falta public_html/kingSelectionGallery.php no repo');
}

console.log('Pronto. Envie estes ficheiros para a Hostinger (public_html):');
console.log('  - kingSelectionGallery.php');
files.forEach((f) => console.log('  - ' + f));
