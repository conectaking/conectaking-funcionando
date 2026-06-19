/**
 * Botão «Excluir fotos soltas» — funciona mesmo com kingSelectionProject.js antigo em cache.
 */
(function () {
  function galleryIdFromUrl() {
    const q = new URLSearchParams(window.location.search || '');
    return parseInt(q.get('galleryId') || '0', 10) || 0;
  }

  function apiBase() {
    return String(window.API_URL || 'https://conectaking-api.onrender.com').replace(/\/$/, '');
  }

  function authHeaders() {
    const token = localStorage.getItem('conectaKingToken') || '';
    const h = { 'Content-Type': 'application/json' };
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }

  function ensureLooseButton() {
    if (document.getElementById('p-delete-loose')) return document.getElementById('p-delete-loose');
    const anchor = document.getElementById('p-delete-sel')
      || document.getElementById('ks-photo-delete-selected-btn');
    if (!anchor || !anchor.parentElement) return null;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ks-btn';
    btn.id = 'p-delete-loose';
    btn.style.color = '#fca5a5';
    btn.style.borderColor = 'rgba(248,113,113,.55)';
    btn.innerHTML = '<i class="fas fa-unlink"></i> <span id="p-delete-loose-label">Excluir fotos soltas</span>';
    btn.title = 'Apaga fotos sem pasta (ficaram soltas ao excluir uma pasta)';
    anchor.parentElement.insertBefore(btn, anchor.nextSibling);
    return btn;
  }

  function countLoose(photos, folders) {
    const valid = new Set(
      (Array.isArray(folders) ? folders : [])
        .map((f) => parseInt(f?.id, 10) || 0)
        .filter((id) => id > 0)
    );
    return (Array.isArray(photos) ? photos : []).filter((p) => {
      const fid = parseInt(p?.folder_id, 10) || 0;
      return !fid || !valid.has(fid);
    });
  }

  function updateLooseButtonLabel(looseLen) {
    const lbl = document.getElementById('p-delete-loose-label');
    const btn = document.getElementById('p-delete-loose');
    if (lbl) lbl.textContent = looseLen > 0 ? `Excluir fotos soltas (${looseLen})` : 'Excluir fotos soltas';
    if (btn) {
      btn.disabled = looseLen === 0;
      btn.title = looseLen > 0
        ? `Apagar ${looseLen} foto(s) sem pasta`
        : 'Não há fotos soltas nesta galeria';
    }
  }

  async function refreshLooseCount() {
    const gid = galleryIdFromUrl();
    if (!gid) return updateLooseButtonLabel(0);
    try {
      const res = await fetch(`${apiBase()}/api/king-selection/galleries/${gid}`, {
        headers: authHeaders(),
        cache: 'no-store'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return;
      const loose = countLoose(data.gallery?.photos, data.gallery?.folders);
      updateLooseButtonLabel(loose.length);
    } catch (_) { /* ignore */ }
  }

  async function deleteLoosePhotos() {
    const gid = galleryIdFromUrl();
    if (!gid) {
      window.alert('Abra um projeto (galleryId na URL) antes de excluir fotos soltas.');
      return;
    }
    const res = await fetch(`${apiBase()}/api/king-selection/galleries/${gid}`, {
      headers: authHeaders(),
      cache: 'no-store'
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Erro ao carregar galeria');
    const loose = countLoose(data.gallery?.photos, data.gallery?.folders);
    if (!loose.length) {
      window.alert('Não há fotos soltas nesta galeria.');
      updateLooseButtonLabel(0);
      return;
    }
    const ok = window.confirm(
      `Excluir ${loose.length} foto(s) solta(s) (sem pasta)?\n\nEsta ação não pode ser desfeita.`
    );
    if (!ok) return;
    const ids = loose.map((p) => parseInt(p.id, 10)).filter((n) => n > 0);
    const chunkSize = 35;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const del = await fetch(`${apiBase()}/api/king-selection/galleries/${gid}/photos/delete-batch`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ photo_ids: chunk })
      });
      const delData = await del.json().catch(() => ({}));
      if (!del.ok) throw new Error(delData.message || 'Erro ao excluir fotos soltas');
    }
    window.alert(`${ids.length} foto(s) solta(s) excluída(s). A página vai recarregar.`);
    window.location.reload();
  }

  function wire() {
    const btn = ensureLooseButton();
    if (!btn || btn.getAttribute('data-ks-loose-wired') === '1') return;
    btn.setAttribute('data-ks-loose-wired', '1');
    btn.addEventListener('click', () => {
      deleteLoosePhotos().catch((e) => window.alert(e?.message || 'Erro ao excluir fotos soltas'));
    });
    refreshLooseCount();
    window.setInterval(refreshLooseCount, 12000);
  }

  function start() {
    wire();
    const grid = document.getElementById('p-grid');
    if (grid) {
      new MutationObserver(() => wire()).observe(grid.parentElement || document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
  window.addEventListener('load', wire);
})();

/**
 * Pedidos de edição (modo público) — embutido em loose-photos.js para Hostinger sem HTML novo.
 */
(function () {
  'use strict';

  const STYLE_ID = 'ks-edit-request-privacy-patch-style';

  function galleryIdFromUrl() {
    const q = new URLSearchParams(window.location.search || '');
    return parseInt(q.get('galleryId') || '0', 10) || 0;
  }

  function apiBase() {
    return String(window.API_URL || 'https://conectaking-api.onrender.com').replace(/\/$/, '');
  }

  function authHeaders(json) {
    const token = localStorage.getItem('conectaKingToken') || '';
    const h = {};
    if (token) h.Authorization = `Bearer ${token}`;
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent =
      '#ks-public-edit-request-wrap{display:none}' +
      '#ks-access-mode-public-wrap:has(input[name="access_mode"][value="public"]:checked) #ks-public-edit-request-wrap,' +
      '#ks-access-mode-public-wrap.ks-public-mode-on #ks-public-edit-request-wrap{display:block!important}' +
      '#ks-public-edit-request-wrap{border-top:1px solid #c4b5fd;background:rgba(237,233,254,.95);padding:12px 16px}' +
      '#ks-public-edit-request-wrap .ks-er-title{font-weight:800;color:#4c1d95;display:block}' +
      '#ks-public-edit-request-wrap .ks-er-sub{font-size:13px;color:#5b21b6;display:block;margin-top:4px}';
    document.head.appendChild(st);
  }

  function getPublicRadio() {
    return document.querySelector('input[name="access_mode"][value="public"]');
  }

  function isPublicModeSelected() {
    const el = document.querySelector('input[name="access_mode"]:checked');
    return String(el?.value || '').toLowerCase() === 'public';
  }

  function ensurePublicEditMarkup() {
    injectStyles();
    const publicRadio = getPublicRadio();
    if (!publicRadio) return;

    let host = document.getElementById('ks-access-mode-public-wrap');
    if (!host) {
      const oldLabel = publicRadio.closest('label');
      if (!oldLabel || !oldLabel.parentNode) return;
      host = document.createElement('div');
      host.id = 'ks-access-mode-public-wrap';
      host.className = 'flex flex-col gap-0 rounded-xl border border-slate-200 bg-white overflow-hidden';
      oldLabel.parentNode.insertBefore(host, oldLabel);
      host.appendChild(oldLabel);
    }

    if (!document.getElementById('ks-public-edit-request-wrap')) {
      const editBlock = document.createElement('div');
      editBlock.id = 'ks-public-edit-request-wrap';
      editBlock.innerHTML =
        '<label class="flex items-start gap-3 cursor-pointer m-0" style="display:flex;align-items:flex-start;gap:12px">' +
        '<input type="checkbox" id="ks-allow-client-edit-request" class="mt-1" style="margin-top:4px" />' +
        '<span>' +
        '<span class="ks-er-title">Permitir envio para edição</span>' +
        '<span class="ks-er-sub">O cliente marca fotos e clica em «Enviar para edição». Você vê os pedidos em «Atividades do cliente».</span>' +
        '</span></label>';
      host.appendChild(editBlock);
    }

    host.classList.toggle('ks-public-mode-on', isPublicModeSelected());
    const wrap = document.getElementById('ks-public-edit-request-wrap');
    if (wrap) wrap.style.display = isPublicModeSelected() ? 'block' : 'none';
  }

  function syncCheckboxFromGallery(gallery) {
    const chk = document.getElementById('ks-allow-client-edit-request');
    if (!chk || !gallery) return;
    chk.checked = gallery.allow_client_edit_request === true;
  }

  async function refreshCheckboxFromApi() {
    const gid = galleryIdFromUrl();
    if (!gid) return;
    try {
      const res = await fetch(`${apiBase()}/api/king-selection/galleries/${gid}`, {
        headers: authHeaders(false),
        cache: 'no-store'
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.gallery) syncCheckboxFromGallery(data.gallery);
    } catch (_) { /* ignore */ }
  }

  function patchFetchForPrivacySave() {
    if (window.__ksEditRequestFetchPatched) return;
    window.__ksEditRequestFetchPatched = true;
    const orig = window.fetch.bind(window);
    window.fetch = function (url, init) {
      let nextInit = init;
      try {
        const u = String(url || '');
        const method = String(init?.method || 'GET').toUpperCase();
        if (method === 'PUT' && u.includes('/api/king-selection/galleries/') && init?.body) {
          const body = JSON.parse(String(init.body));
          const chk = document.getElementById('ks-allow-client-edit-request');
          const am = String(document.querySelector('input[name="access_mode"]:checked')?.value || '').toLowerCase();
          if (am === 'public' && chk) {
            body.allow_client_edit_request = !!chk.checked;
          } else if (am && am !== 'public') {
            body.allow_client_edit_request = false;
          }
          nextInit = Object.assign({}, init, { body: JSON.stringify(body) });
        }
      } catch (_) { /* ignore */ }
      return orig(url, nextInit).then((res) => {
        try {
          const u = String(url || '');
          if (res.ok && u.includes('/api/king-selection/galleries/') && !u.includes('/photos')) {
            res.clone().json().then((data) => {
              if (data?.gallery) syncCheckboxFromGallery(data.gallery);
            }).catch(() => {});
          }
        } catch (_) { /* ignore */ }
        return res;
      });
    };
  }

  function wireAccessModeRadios() {
    document.querySelectorAll('input[name="access_mode"]').forEach((el) => {
      if (el.getAttribute('data-ks-er-wired') === '1') return;
      el.setAttribute('data-ks-er-wired', '1');
      el.addEventListener('change', () => {
        ensurePublicEditMarkup();
        refreshCheckboxFromApi();
      });
    });
  }

  function start() {
    ensurePublicEditMarkup();
    wireAccessModeRadios();
    patchFetchForPrivacySave();
    refreshCheckboxFromApi();
  }

  function boot() {
    start();
    const pane = document.querySelector('[data-pane="privacy"]');
    if (pane) {
      new MutationObserver(() => start()).observe(pane, { childList: true, subtree: true, attributes: true });
    }
    document.querySelectorAll('.ks-side a[data-tab]').forEach((a) => {
      a.addEventListener('click', () => {
        if (String(a.getAttribute('data-tab') || '') === 'privacy') {
          setTimeout(start, 50);
        }
      });
    });
    window.setInterval(() => {
      if (isPublicModeSelected()) ensurePublicEditMarkup();
    }, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  window.addEventListener('load', start);
})();
