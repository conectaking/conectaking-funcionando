/**
 * Cleanup + sync: backups, orphans, public ↔ public_html for canonical files.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function rm(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) return false;
  const st = fs.statSync(p);
  if (st.isDirectory()) fs.rmSync(p, { recursive: true, force: true });
  else fs.unlinkSync(p);
  console.log('removed', rel);
  return true;
}

function copy(fromRel, toRel) {
  const from = path.join(root, fromRel);
  const to = path.join(root, toRel);
  if (!fs.existsSync(from)) {
    console.log('skip missing', fromRel);
    return;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
  console.log('synced', fromRel, '->', toRel);
}

// 1) Landing backups with encoding junk
[
  'public_html/index-backup.html',
  'public_html/index-backup2.html',
  'public_html/index-new.html',
  'public_html/index-old.html',
  'public_html/index-premium.html',
  'public_html/index-premium-dynamic.html'
].forEach(rm);

// 2) Debug / orphan front assets
[
  'public/js/finance-fix-example.js',
  'public_html/admin/test-api.html',
  'public_html/cors-fix-dashboard.html',
  'tmp_kingSelectionProject.html',
  'tmp_kingSelectionProject.js'
].forEach(rm);

// 3) Typo stubs if present
const stubGlobs = [];
for (const dir of ['public', 'public_html']) {
  const d = path.join(root, dir);
  if (!fs.existsSync(d)) continue;
  for (const name of fs.readdirSync(d)) {
    if (/ringselection/i.test(name) || /^kingSelectionEdit\.html$/i.test(name) && name.includes('stub')) {
      stubGlobs.push(path.join(dir, name));
    }
  }
}
stubGlobs.forEach(rm);

// 4) Sync canonical files: prefer public/ when both exist for shared product pages;
//    prefer public_html for admin/forms/sales that live only there.
const publicWins = [
  'dashboard.js',
  'dashboard.html',
  'dashboard.css',
  'kingSelectionProject.js',
  'kingSelectionProject.html',
  'kingSelectionCliente.js',
  'kingSelectionCliente.html',
  'kingDocs.html',
  'kingDocsShare.html',
  'admin-devocionais-365.html',
  'bible.html',
  'bibliaking.html'
];

for (const name of publicWins) {
  const a = path.join(root, 'public', name);
  const b = path.join(root, 'public_html', name);
  if (fs.existsSync(a)) copy(path.join('public', name), path.join('public_html', name));
  else if (fs.existsSync(b)) copy(path.join('public_html', name), path.join('public', name));
}

// Forms/Sales/Admin live primarily in public_html — mirror into public when useful for Node static
const htmlOnlyPublicHtml = [
  'kingForms.html',
  'formPageEdit.html',
  'formPageEdit.js',
  'salesPageEdit.html',
  'salesPageEdit.js',
  'salesPageEdit.css'
];
for (const name of htmlOnlyPublicHtml) {
  const src = path.join('public_html', name);
  if (fs.existsSync(path.join(root, src))) copy(src, path.join('public', name));
}

console.log('cleanup+sync done');
