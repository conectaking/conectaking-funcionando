/**
 * Batch-extract remaining static style="" for known pages.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const jobs = [
  ['resources/views/pages/kingSelectionCliente.blade.php', 'resources/css/pub/pages/kingSelectionCliente.css', 'ck-ksc'],
  ['resources/views/pages/guestListEdit.blade.php', 'resources/css/pub/pages/guestListEdit.css', 'ck-gl'],
  ['resources/views/pages/formPageEdit.blade.php', 'resources/css/pub/pages/formPageEdit.css', 'ck-fpe'],
  ['resources/views/pages/kingSelectionProject.blade.php', 'resources/css/pub/pages/kingSelectionProject.css', 'ck-ksp'],
  ['resources/views/pages/admin-devocionais-365.blade.php', 'resources/css/pub/pages/admin-devocionais-365.css', 'ck-ad365'],
  ['resources/views/cartao/public.blade.php', 'resources/css/pub/pages/cartao-public-extra.css', 'ck-cp'],
  ['resources/views/pages/kingDocs.blade.php', 'resources/css/pub/pages/kingDocs.css', 'ck-kd'],
  ['resources/views/pages/salesPageEdit.blade.php', 'resources/css/pub/pages/salesPageEdit-extra.css', 'ck-spe'],
  ['resources/views/pages/responsesList.blade.php', 'resources/css/pub/pages/responsesList.css', 'ck-rl'],
  ['resources/views/pages/kingSelectionEdit.blade.php', 'resources/css/pub/pages/kingSelectionEdit.css', 'ck-kse'],
  ['resources/views/pages/kingSelectionGallery.blade.php', 'resources/css/pub/pages/kingSelectionGallery.css', 'ck-ksg'],
  ['resources/views/pages/kingSelectionReview.blade.php', 'resources/css/pub/pages/kingSelectionReview.css', 'ck-ksr'],
  ['resources/views/cartao/bible-hub.blade.php', 'resources/css/pub/pages/cartao-bible-hub.css', 'ck-bh'],
  ['resources/views/cartao/bible-devotional.blade.php', 'resources/css/pub/pages/cartao-bible-devotional.css', 'ck-bd'],
  ['resources/views/cartao/bible-reader.blade.php', 'resources/css/pub/pages/cartao-bible-reader.css', 'ck-br'],
  ['resources/views/cartao/bible-study.blade.php', 'resources/css/pub/pages/cartao-bible-study.css', 'ck-bs'],
  ['resources/views/cartao/bible-prosperidade.blade.php', 'resources/css/pub/pages/cartao-bible-prosperidade.css', 'ck-bp'],
  ['resources/views/cartao/guest-portaria.blade.php', 'resources/css/pub/pages/cartao-guest-portaria.css', 'ck-gp'],
  ['resources/views/cartao/guest-confirm.blade.php', 'resources/css/pub/pages/cartao-guest-confirm.css', 'ck-gc'],
  ['resources/views/cartao/guest-register.blade.php', 'resources/css/pub/pages/cartao-guest-register.css', 'ck-gr'],
  ['resources/views/cartao/guest-customize.blade.php', 'resources/css/pub/pages/cartao-guest-customize.css', 'ck-gcu'],
  ['resources/views/cartao/form-public.blade.php', 'resources/css/pub/pages/cartao-form-public.css', 'ck-fp'],
  ['resources/views/cartao/form-success.blade.php', 'resources/css/pub/pages/cartao-form-success.css', 'ck-fs'],
  ['resources/views/cartao/ks-public.blade.php', 'resources/css/pub/pages/cartao-ks-public.css', 'ck-kspub'],
  ['resources/views/pages/conviteEdit.blade.php', 'resources/css/pub/pages/conviteEdit.css', 'ck-ce'],
  ['resources/views/pages/zerar-mes.blade.php', 'resources/css/pub/pages/zerar-mes.css', 'ck-zm'],
  ['resources/views/pages/documentos-preview.blade.php', 'resources/css/pub/pages/documentos-preview.css', 'ck-dp'],
  ['resources/views/pages/documentos-ver.blade.php', 'resources/css/pub/pages/documentos-ver.css', 'ck-dv'],
  ['resources/views/pages/recibos-orcamentos.blade.php', 'resources/css/pub/pages/recibos-orcamentos.css', 'ck-ro'],
  ['resources/views/pages/conta.blade.php', 'resources/css/pub/pages/conta-inline.css', 'ck-ct'],
];

const script = path.join(root, 'scripts/extract-inline-to-css.mjs');
for (const [blade, css, prefix] of jobs) {
  if (!fs.existsSync(path.join(root, blade))) {
    console.log('MISS_BLADE', blade);
    continue;
  }
  // ensure css exists so append works
  const cssAbs = path.join(root, css);
  if (!fs.existsSync(cssAbs)) {
    fs.mkdirSync(path.dirname(cssAbs), { recursive: true });
    fs.writeFileSync(cssAbs, `/* ${path.basename(css)} */\n`);
  }
  const r = spawnSync(process.execPath, [script, blade, css, prefix], {
    cwd: root,
    encoding: 'utf8',
  });
  if (r.status !== 0) {
    console.log('FAIL', blade, (r.stderr || r.stdout || '').slice(0, 300));
    continue;
  }
  console.log((r.stdout || '').trim());
}
