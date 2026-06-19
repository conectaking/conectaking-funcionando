/**
 * Pedidos de edição (modo público) — funciona na Hostinger com HTML/JS antigos em cache.
 * Injeta «Permitir envio para edição» e envia allow_client_edit_request no PUT da privacidade.
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
