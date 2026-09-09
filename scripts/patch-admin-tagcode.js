const fs = require('fs');

// index.html labels
let html = fs.readFileSync('public/admin/index.html', 'utf8');
html = html.replace(
  /<label for="modal-activation-code">[\s\S]*?<\/small>/,
  `<label for="modal-activation-code">Código de ativação / pulseira (camuflado)</label>
            <input type="text" id="modal-activation-code" class="modal-input-text" maxlength="32" placeholder="Ex: ADRIANO-KING" autocomplete="off">
            <small style="display:block;margin-top:6px;opacity:.75;font-size:0.8rem;">Vai na tag NFC. Redireciona para o slug original das Informações (não substitui o slug público).</small>`
);
fs.writeFileSync('public/admin/index.html', html);

let js = fs.readFileSync('public/admin/admin.js', 'utf8');
js = js.replace(
  'data-profile-slug="${u.profile_slug || \'\'}"',
  'data-profile-slug="${u.profile_slug || \'\'}" data-tag-code="${u.tag_code || \'\'}"'
);
js = js.replace(
  "if (actEl) actEl.value = accountTypeCell.dataset.profileSlug || '';",
  "if (actEl) actEl.value = accountTypeCell.dataset.tagCode || accountTypeCell.dataset.profileSlug || '';"
);
js = js.replace(
  "if (actElBtn) actElBtn.value = button.dataset.profileSlug || '';",
  "if (actElBtn) actElBtn.value = button.dataset.tagCode || button.dataset.profileSlug || '';"
);
// dashboard card link should prefer tag code (pulseira) then slug
js = js.replace(
  "const tagCode = (d.user && (d.user.tag_code || d.user.profile_slug)) ? String(d.user.tag_code || d.user.profile_slug).trim() : '';",
  "const tagCode = (d.user && d.user.tag_code) ? String(d.user.tag_code).trim() : ((d.user && d.user.profile_slug) ? String(d.user.profile_slug).trim() : '');"
);
js = js.replace('admin.js?v=2026-09-09-activation1', 'admin.js?v=2026-09-09-tagcode2');
html = fs.readFileSync('public/admin/index.html', 'utf8');
html = html.replace(/admin\.(js|css)\?v=[^"']+/g, (m) => m.replace(/v=[^"']+/, 'v=2026-09-09-tagcode2'));
fs.writeFileSync('public/admin/index.html', html);
fs.writeFileSync('public/admin/admin.js', js);
for (const f of ['index.html', 'admin.js', 'admin.css']) {
  try { fs.copyFileSync('public/admin/' + f, 'public_html/admin/' + f); } catch (_) {}
}
console.log('ok');
