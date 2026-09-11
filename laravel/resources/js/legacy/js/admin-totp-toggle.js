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
      if (!configured) stateEl.textContent = 'não configurado';
      else stateEl.textContent = enabled ? 'ligado' : 'desligado';
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
      if (stateEl) stateEl.textContent = 'erro';
      toggle.disabled = true;
      return null;
    }
  }

  toggle.addEventListener('change', async () => {
    const wantOn = toggle.checked;
    toggle.disabled = true;
    if (stateEl) stateEl.textContent = 'salvando…';
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
