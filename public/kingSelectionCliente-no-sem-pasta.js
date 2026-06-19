/**
 * Remove pastas virtuais «Sem pasta», «Todas» e «Fotos soltas» do cliente
 * (fallback se o browser ainda tiver kingSelectionCliente.js antigo em cache).
 */
(function () {
  function shouldRemoveCard(btn) {
    if (!btn || !btn.classList.contains('ks-folder-card')) return false;
    if (btn.classList.contains('ks-folder-card--all')) return true;
    const rawId = btn.getAttribute('data-open-folder');
    if (rawId === 'all' || rawId === '-1' || rawId === '0') return true;
    const nameEl = btn.querySelector('.ks-folder-name');
    const name = String(nameEl?.textContent || '').trim().toLowerCase();
    if (!name) return false;
    if (name === 'todas' || name === 'sem pasta' || name === 'fotos soltas') return true;
    if (/sem\s*pasta/i.test(name)) return true;
    if (/todas\s+as\s+fotos/i.test(name)) return true;
    return false;
  }

  function stripVirtualFolderCards() {
    document.querySelectorAll('.ks-folder-card').forEach((btn) => {
      if (shouldRemoveCard(btn)) btn.remove();
    });
    const grid = document.getElementById('ks-folder-grid');
    const wrap = document.getElementById('ks-folder-wrap');
    if (grid && wrap && !grid.querySelector('.ks-folder-card')) {
      wrap.classList.add('ks-hidden');
      const search = document.getElementById('ks-search-block');
      search?.classList.remove('ks-hidden');
    }
  }

  function start() {
    stripVirtualFolderCards();
    const grid = document.getElementById('ks-folder-grid');
    if (grid) {
      new MutationObserver(stripVirtualFolderCards).observe(grid, { childList: true, subtree: true });
    }
    let n = 0;
    const t = setInterval(() => {
      stripVirtualFolderCards();
      if (++n >= 12) clearInterval(t);
    }, 500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
  window.addEventListener('load', stripVirtualFolderCards);
})();

/**
 * Botão «Enviar para edição» no cliente — embutido em no-sem-pasta.js para Hostinger sem HTML novo.
 */
(function () {
  'use strict';

  const STYLE_ID = 'ks-client-edit-req-patch-style';
  let allowEdit = false;
  let gallerySlug = '';

  function apiBase() {
    return String(window.API_URL || 'https://conectaking-api.onrender.com').replace(/\/$/, '');
  }

  function getSlug() {
    const m = window.location.pathname.match(/\/(?:mr\/)?(?:kingselection|ringselection|ringsselection)\/([^/]+)/i);
    if (m) {
      const seg = decodeURIComponent(m[1] || '').trim();
      if (seg && !/\.html$/i.test(seg)) return seg;
    }
    try {
      const s = new URLSearchParams(window.location.search || '').get('slug');
      if (s) return s.trim();
    } catch (_) {}
    return '';
  }

  function tokenKey(slug) {
    return `ks_client_jwt_${slug}`;
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent =
      '.ks-btn-edit-req{background:linear-gradient(135deg,#7c3aed,#6d28d9)!important;color:#f5f3ff!important;' +
      'border-color:#8b5cf6!important;font-weight:800}' +
      '.ks-btn-edit-req:disabled{opacity:.45!important}';
    document.head.appendChild(st);
  }

  function ensureSendButton() {
    if (document.getElementById('ks-send-edit')) return document.getElementById('ks-send-edit');
    const anchor = document.getElementById('ks-clear');
    if (!anchor || !anchor.parentNode) return null;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'ks-send-edit';
    btn.className = 'ks-btn ks-btn-edit-req ks-hidden';
    btn.hidden = true;
    btn.setAttribute('aria-hidden', 'true');
    btn.title = 'Enviar fotos marcadas para edição';
    btn.innerHTML = '<i class="fas fa-magic"></i> Enviar para edição';
    anchor.insertAdjacentElement('afterend', btn);
    btn.addEventListener('click', () => submitEditRequest());
    return btn;
  }

  function countSelected() {
    const pill = document.querySelector('.ks-header-sel-pill__num');
    if (pill) {
      const n = parseInt(String(pill.textContent || '').trim(), 10);
      if (Number.isFinite(n)) return n;
    }
    return document.querySelectorAll('.ks-ph.selected, .ks-ph.frozen').length;
  }

  function syncButton() {
    const btn = ensureSendButton();
    if (!btn) return;
    const show = allowEdit === true;
    btn.classList.toggle('ks-hidden', !show);
    btn.hidden = !show;
    btn.style.display = show ? '' : 'none';
    btn.setAttribute('aria-hidden', show ? 'false' : 'true');
    if (show) {
      const n = countSelected();
      btn.disabled = n === 0;
      btn.title = n > 0 ? `Enviar ${n} foto(s) para edição` : 'Marque as fotos que deseja enviar para edição';
    }
  }

  function collectSelectedPhotoIds() {
    const ids = [];
    document.querySelectorAll('.ks-ph.selected[data-pid]').forEach((el) => {
      const id = parseInt(el.getAttribute('data-pid'), 10);
      if (id > 0) ids.push(id);
    });
    return [...new Set(ids)];
  }

  function toast(msg, kind) {
    const el = document.getElementById('ks-toast');
    if (!el) {
      window.alert(msg);
      return;
    }
    el.textContent = msg;
    el.classList.remove('ks-hidden');
    el.style.borderColor = kind === 'err' ? '#b91c1c' : '#374151';
  }

  async function submitEditRequest() {
    if (!allowEdit) return;
    gallerySlug = gallerySlug || getSlug();
    const jwt = localStorage.getItem(tokenKey(gallerySlug)) || '';
    if (!jwt) {
      toast('Cadastre-se na galeria antes de enviar fotos para edição.', 'err');
      return;
    }
    const ids = collectSelectedPhotoIds();
    if (!ids.length) {
      toast('Marque pelo menos uma foto para enviar à edição.', 'err');
      return;
    }
    const note = window.prompt(
      'Observação para o fotógrafo (opcional):\nEx.: remover fundo, ajustar cor, recorte…',
      ''
    );
    if (note === null) return;
    const btn = document.getElementById('ks-send-edit');
    try {
      if (btn) btn.disabled = true;
      const res = await fetch(`${apiBase()}/api/king-selection/client/edit-request`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ slug: gallerySlug, photo_ids: ids, note: note || undefined })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Erro ao enviar pedido');
      toast(data.message || `${ids.length} foto(s) enviada(s) para edição.`, 'ok');
    } catch (e) {
      toast(e.message || 'Erro ao enviar', 'err');
    } finally {
      syncButton();
    }
  }

  function patchFetchForGallery() {
    if (window.__ksClientEditFetchPatched) return;
    window.__ksClientEditFetchPatched = true;
    const orig = window.fetch.bind(window);
    window.fetch = function (url, init) {
      return orig(url, init).then((res) => {
        try {
          const u = String(url || '');
          if (res.ok && u.includes('/api/king-selection/client/gallery')) {
            res.clone().json().then((data) => {
              const g = data?.gallery;
              allowEdit = !!(g && g.allow_client_edit_request === true);
              syncButton();
            }).catch(() => {});
          }
        } catch (_) { /* ignore */ }
        return res;
      });
    };
  }

  function start() {
    gallerySlug = getSlug();
    injectStyles();
    patchFetchForGallery();
    ensureSendButton();
    syncButton();
    const grid = document.getElementById('ks-grid');
    if (grid) {
      new MutationObserver(() => syncButton()).observe(grid, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    }
    const pill = document.querySelector('.ks-header-sel-pill__num');
    if (pill) {
      new MutationObserver(() => syncButton()).observe(pill, { childList: true, characterData: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
  window.addEventListener('load', start);
  window.setInterval(syncButton, 2500);
})();
