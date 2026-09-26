/**
 * Toggle 2FA admin (liga/desliga sem apagar o secret do autenticador).
 * Usado no dashboard e no painel /admin.
 */
export async function bindAdminTotpToggle(opts) {
  const apiBase = String(opts.apiBase || '').replace(/\/$/, '');
  const toggle = document.getElementById(opts.toggleId || 'admin-2fa-toggle');
  const stateEl = document.getElementById(opts.stateId || 'admin-2fa-state');
  const row = opts.rowId ? document.getElementById(opts.rowId) : null;
  if (!toggle) return;

  if (row) {
    row.classList.remove('ck-hidden');
    row.style.display = 'flex';
  }

  function headers(method) {
    const h = { Accept: 'application/json', 'Content-Type': 'application/json' };
    const token = (window.CkAuth && window.CkAuth.lsToken && window.CkAuth.lsToken())
      || localStorage.getItem('conectaKingToken')
      || '';
    if (token && !/^Bearer\s*(null|undefined)?\s*$/i.test(token)) {
      h.Authorization = token.startsWith('Bearer ') ? token : ('Bearer ' + token);
    }
    if (window.CkCsrf && typeof window.CkCsrf.attachToHeaders === 'function') {
      return window.CkCsrf.attachToHeaders(h, method || 'GET');
    }
    return h;
  }

  function paint(data) {
    const configured = !!(data && data.configured);
    const enabled = !!(data && data.enabled);
    toggle.disabled = !configured;
    toggle.checked = enabled;
    if (stateEl) {
      stateEl.classList.remove('is-active', 'is-inactive', 'is-unconfigured', 'is-loading');
      if (!configured) {
        stateEl.textContent = 'Não configurado';
        stateEl.classList.add('is-unconfigured');
      } else if (enabled) {
        stateEl.textContent = 'Ligado';
        stateEl.classList.add('is-active');
      } else {
        stateEl.textContent = 'Desligado';
        stateEl.classList.add('is-inactive');
      }
    }

    const badgeEl = document.getElementById('admin-2fa-badge');
    if (badgeEl) {
      badgeEl.classList.remove('badge-active', 'badge-inactive', 'badge-unconfigured');
      if (!configured) {
        badgeEl.innerHTML = '<i class="fas fa-exclamation-circle"></i> Não configurado';
        badgeEl.classList.add('badge-unconfigured');
      } else if (enabled) {
        badgeEl.innerHTML = '<i class="fas fa-check-circle"></i> Ativo';
        badgeEl.classList.add('badge-active');
      } else {
        badgeEl.innerHTML = '<i class="fas fa-times-circle"></i> Desativado';
        badgeEl.classList.add('badge-inactive');
      }
    }

    if (row) {
      row.classList.toggle('has-2fa-active', enabled);
    }
  }

  async function refresh() {
    try {
      const r = await fetch(apiBase + '/api/admin/totp/status', {
        credentials: 'include',
        headers: headers('GET'),
        cache: 'no-store',
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.message || 'Falha ao ler 2FA');
      paint(data);
      return data;
    } catch (e) {
      if (stateEl) {
        stateEl.textContent = 'Indisponível';
        stateEl.className = 'ck-admin-2fa-state is-unconfigured';
      }
      toggle.disabled = true;
      return null;
    }
  }

  toggle.addEventListener('change', async () => {
    const wantOn = toggle.checked;
    toggle.disabled = true;
    if (stateEl) {
      stateEl.textContent = 'Salvando…';
      stateEl.classList.add('is-loading');
    }
    try {
      const r = await fetch(apiBase + (wantOn ? '/api/admin/totp/enable' : '/api/admin/totp/disable'), {
        method: 'POST',
        credentials: 'include',
        headers: headers('POST'),
        body: '{}',
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (data.needsSetup) {
          alert('Configure o autenticador antes de ativar o 2FA.');
        } else {
          alert(data.message || 'Não foi possível alterar o 2FA.');
        }
        await refresh();
        return;
      }
      paint(data);
    } catch (e) {
      alert('Erro de rede ao alterar 2FA.');
      await refresh();
    }
  });

  await refresh();
}
