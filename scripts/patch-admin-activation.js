const fs = require('fs');

let html = fs.readFileSync('public/admin/index.html', 'utf8');
html = html.replace('../dashboard.html', '/dashboard');
html = html.replaceAll('../admin-devocionais-365.html', '/admin-devocionais-365');
html = html.replace('admin.css?v=2026-09-07-fix2', 'admin.css?v=2026-09-09-activation1');
html = html.replace('admin.js?v=2026-09-07-fix2', 'admin.js?v=2026-09-09-activation1');

const field = `        <div class="input-group">
            <label for="modal-activation-code">Código de ativação (pulseira / cartão)</label>
            <input type="text" id="modal-activation-code" class="modal-input-text" maxlength="32" placeholder="Ex: ADRIANO-KING" autocomplete="off">
            <small style="display:block;margin-top:6px;opacity:.75;font-size:0.8rem;">Altera o link tag.conectaking.com.br/CODIGO e o slug do cartão. Sem espaços; até 32 caracteres.</small>
        </div>

        <div class="input-group">
            <label for="modal-is-admin">Permissão de Administrador</label>`;

if (!html.includes('modal-activation-code')) {
  html = html.replace(
    `        <div class="input-group">
            <label for="modal-is-admin">Permissão de Administrador</label>`,
    field
  );
}
fs.writeFileSync('public/admin/index.html', html);

let js = fs.readFileSync('public/admin/admin.js', 'utf8');

js = js.replace(
  'data-max-team-invites="${u.max_team_invites}"',
  'data-max-team-invites="${u.max_team_invites}" data-profile-slug="${u.profile_slug || \'\'}"'
);

if (!js.includes('modal-activation-code')) {
  js = js.replace(
    "accountTypeSelect.dispatchEvent(new Event('change'));\n            userModal.classList.add('active');",
    "const actEl = document.getElementById('modal-activation-code');\n            if (actEl) actEl.value = accountTypeCell.dataset.profileSlug || '';\n            accountTypeSelect.dispatchEvent(new Event('change'));\n            userModal.classList.add('active');"
  );

  js = js.replace(
    "document.getElementById('modal-user-email').value = button.dataset.email;\n            document.getElementById('modal-max-invites').value = button.dataset.maxTeamInvites;",
    "document.getElementById('modal-user-email').value = button.dataset.email;\n            document.getElementById('modal-max-invites').value = button.dataset.maxTeamInvites;\n            const actElBtn = document.getElementById('modal-activation-code');\n            if (actElBtn) actElBtn.value = button.dataset.profileSlug || '';"
  );

  js = js.replace(
    "const maxTeamInvites = document.getElementById('modal-max-invites').value;",
    "const maxTeamInvites = document.getElementById('modal-max-invites').value;\n    const activationCode = (document.getElementById('modal-activation-code')?.value || '').trim();"
  );

  js = js.replace(
    "maxTeamInvites\n            })",
    "maxTeamInvites,\n                activationCode\n            })"
  );

  js = js.replace(
    "const tagCode = (d.user && d.user.tag_code) ? String(d.user.tag_code).trim() : '';",
    "const tagCode = (d.user && (d.user.tag_code || d.user.profile_slug)) ? String(d.user.tag_code || d.user.profile_slug).trim() : '';"
  );

  js = js.replace(
    "alert('Código personalizado inválido. Deve ter no máximo 12 caracteres e não conter espaços.');",
    "alert('Código personalizado inválido. Deve ter no máximo 32 caracteres e não conter espaços.');"
  );
  js = js.replace(/customCode\.length > 12/g, 'customCode.length > 32');
}

fs.writeFileSync('public/admin/admin.js', js);
for (const f of ['index.html', 'admin.js', 'admin.css']) {
  fs.copyFileSync('public/admin/' + f, 'public_html/admin/' + f);
}
console.log({
  hasField: html.includes('modal-activation-code'),
  hasSave: js.includes('activationCode'),
  hasSlugAttr: js.includes('data-profile-slug'),
});
