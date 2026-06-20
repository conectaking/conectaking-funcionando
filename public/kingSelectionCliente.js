(function () {
  'use strict';

  /** Patches antigos (no-sem-pasta / edit-requests) não devem controlar o mesmo botão. */
  window.__ksNativeEditRequestToolbar = true;

  const KS_FALLBACK_API_ORIGIN = 'https://conectaking-api.onrender.com';

  /** Evita API_URL apontando para conectaking.com.br (img /api/... → 404 sem marca d'água). */
  function resolveKsApiBase() {
    const fallback = KS_FALLBACK_API_ORIGIN;
    const tryList = [
      typeof window !== 'undefined' ? window.API_URL : '',
      typeof window !== 'undefined' ? window.API_BASE : '',
      typeof window !== 'undefined' && window.API_CONFIG ? window.API_CONFIG.baseURL : ''
    ];
    for (const v of tryList) {
      const raw = String(v || '').trim().replace(/\/$/, '');
      if (!raw || !/^https?:\/\//i.test(raw)) continue;
      try {
        const h = new URL(raw).hostname.toLowerCase();
        if (h === 'conectaking.com.br' || h === 'www.conectaking.com.br') continue;
        return raw;
      } catch (_) { /* próximo */ }
    }
    return fallback;
  }

  const API = resolveKsApiBase();

  /** Pedidos ao arranque: sem timeout o Safari/rede móvel pode ficar em "A carregar…" para sempre. */
  const KS_FETCH_BOOT_MS = 35000;
  /** Corpo JSON: se o servidor enviar bytes sem fim, `json()` pode bloquear após o fetch terminar. */
  const KS_JSON_BOOT_MS = 18000;
  /** Se ainda estiver no ecrã de arranque, força mensagem (rede/API bloqueada). */
  const KS_BOOT_WATCHDOG_MS = 22000;

  let _bootWatchdogTimer = null;
  function clearBootWatchdog() {
    if (_bootWatchdogTimer) {
      clearTimeout(_bootWatchdogTimer);
      _bootWatchdogTimer = null;
    }
  }

  function scheduleBootWatchdog() {
    clearBootWatchdog();
    _bootWatchdogTimer = setTimeout(() => {
      _bootWatchdogTimer = null;
      const b = $('ks-boot');
      if (!b || b.classList.contains('ks-hidden')) return;
      showLogin();
      const sub = $('ks-login-sub');
      if (sub) {
        sub.textContent = 'A ligação ao servidor está a demorar. Verifique a rede ou atualize a página.';
      }
      $('ks-login-body')?.classList.add('ks-hidden');
      const errEl = $('ks-login-err');
      if (errEl) {
        errEl.textContent = 'Se isto repetir, o servidor pode estar sobrecarregado ou o link pode estar incorreto.';
        errEl.classList.remove('ks-hidden');
      }
    }, KS_BOOT_WATCHDOG_MS);
  }

  /**
   * Evita `await res.json()` pendente para sempre (corpo grande/stream estranho).
   */
  async function safeResponseJson(res, timeoutMs) {
    const ms = Math.max(2000, parseInt(timeoutMs, 10) || KS_JSON_BOOT_MS);
    return Promise.race([
      res.json().catch(() => ({})),
      new Promise((_, rej) => {
        setTimeout(() => rej(new Error('O servidor demorou a enviar os dados. Atualize a página.')), ms);
      })
    ]);
  }

  function friendlyFetchError(e) {
    if (!e) return new Error('Erro de rede. Tente atualizar a página.');
    const n = String(e.name || '');
    const m = String(e.message || '');
    if (n === 'AbortError' || /aborted|AbortError/i.test(m)) {
      return new Error('A ligação ao servidor demorou demais. Verifique a rede ou tente atualizar a página.');
    }
    return e instanceof Error ? e : new Error(m || 'Erro de rede.');
  }

  /**
   * @param {string} url
   * @param {RequestInit} [init]
   * @param {number} [timeoutMs]
   */
  function fetchWithTimeout(url, init, timeoutMs) {
    const ms = Math.max(8000, parseInt(timeoutMs, 10) || KS_FETCH_BOOT_MS);
    const base = init && typeof init === 'object' ? { ...init } : {};
    if (base.signal) return fetch(url, base);
    const ac = new AbortController();
    const t = setTimeout(() => {
      try { ac.abort(); } catch (_) { }
    }, ms);
    base.signal = ac.signal;
    return fetch(url, base).finally(() => clearTimeout(t));
  }

  function getSlug() {
    // Não tratar ficheiros .html do painel como slug (ex.: /kingSelection/kingSelectionProject.html → 404 na API)
    var RESERVED = {
      'kingselectioncliente.html': 1,
      'kingselectionproject.html': 1,
      'kingselectionedit.html': 1,
      'kingselectiongallery.html': 1,
      'kingselectionreview.html': 1,
      'kingselectionsuccess.html': 1,
      'kingselection.html': 1,
      'index.html': 1
    };
    var m = window.location.pathname.match(/\/(?:mr\/)?(?:kingselection|ringselection|ringsselection)\/([^/]+)/i);
    if (m) {
      var seg = decodeURIComponent(m[1] || '').trim();
      if (seg && !RESERVED[seg.toLowerCase()]) return seg;
    }
    try {
      var q = new URLSearchParams(window.location.search || '');
      var s = (q.get('slug') || '').trim();
      if (s) return s;
    } catch (_) {}
    return null;
  }

  function tokenKey(slug) {
    return `ks_client_jwt_${slug}`;
  }

  function jwtPayloadClientId(token) {
    const t = token != null ? token : jwt;
    if (!t || typeof t !== 'string') return 0;
    try {
      const part = t.split('.')[1];
      if (!part) return 0;
      const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
      const p = JSON.parse(json);
      return parseInt(p.clientId, 10) || 0;
    } catch (_) {
      return 0;
    }
  }

  function isRegisterEmailExistsMessage(msg) {
    const m = String(msg || '').toLowerCase();
    return (
      m.includes('já existe') ||
      m.includes('ja existe') ||
      m.includes('already exists') ||
      m.includes('e-mail nesta galeria')
    );
  }

  function isLoginByDetailsNotFound(msg) {
    const m = String(msg || '').toLowerCase();
    return m.includes('não encontramos') || m.includes('nao encontramos');
  }

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function toast(msg, kind) {
    const el = $('ks-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('ks-hidden');
    el.style.borderColor = kind === 'err' ? '#b91c1c' : '#374151';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.add('ks-hidden'), 4200);
  }

  const slug = getSlug();
  if (!slug) {
    document.body.innerHTML =
      '<div class="ks-wrap" style="padding:32px;max-width:520px;margin:0 auto;text-align:left;color:#9ca3af;line-height:1.6">' +
      '<p style="margin:0 0 12px">URL inválida para a <strong style="color:#e5e7eb">galeria do cliente</strong>.</p>' +
      '<p style="margin:0 0 8px">Use o link do tipo:</p>' +
      '<p style="margin:0 0 12px"><code style="color:#facc15">/kingSelection/slug-da-galeria</code></p>' +
      '<p style="margin:0 0 8px">ou</p>' +
      '<p style="margin:0 0 12px"><code style="color:#facc15">kingSelectionCliente.html?slug=slug-da-galeria</code></p>' +
      '<p style="margin:0;font-size:13px;opacity:.9">O painel do fotógrafo é outra página (<code style="color:#e5e7eb">kingSelectionProject.html</code> com login), não abre aqui.</p>' +
      '</div>';
    return;
  }

  let jwt = null;

  /** Link pessoal (?access=JWT): substitui sessão antiga e evita cair no cadastro de outro cliente. */
  function consumeAccessTokenFromUrl() {
    if (!slug) return false;
    try {
      const q = new URLSearchParams(window.location.search || '');
      const access = String(q.get('access') || q.get('token') || '').trim();
      if (!access) return false;
      jwt = access;
      localStorage.setItem(tokenKey(slug), jwt);
      q.delete('access');
      q.delete('token');
      const qs = q.toString();
      history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''));
      return true;
    } catch (_) {
      return false;
    }
  }

  if (!consumeAccessTokenFromUrl()) {
    try {
      jwt = localStorage.getItem(tokenKey(slug)) || null;
    } catch (_) {}
  }

  let galleryMeta = null;
  /** thumbTargetMode: 'auto' alterna A/B a cada clique na faixa; 'pinA'|'pinB' só mexe nesse lado até tocar de novo na mesma foto/rótulo. */
  let compareState = { thumbTargetMode: 'auto', nextThumbSlot: 'A', idA: null, idB: null };

  function hideBootScreen() {
    clearBootWatchdog();
    const b = $('ks-boot');
    if (b && !b.classList.contains('ks-hidden')) b.classList.add('ks-hidden');
  }

  let state = {
    gallery: null,
    folders: [],
    folderView: 'photos', // photos|folders
    activeFolderId: null,
    selected: new Set(),
    batchByPhoto: {},
    /** API envia mapa de lotes (coluna selection_batch); sem isto, não há rodadas no servidor. */
    hasSelectionBatch: false,
    currentRound: 1,
    frozenIds: new Set(),
    locked: false,
    searchRaw: '',
    sortMode: 'order',
    folderSortMode: 'name',
    /** Cadastro só no envio (JWT com session key). */
    deferredSignupActive: false,
    /** Reconhecimento facial (API: faceRecognitionUsable). */
    faceRecognitionUsable: false,
    /** Subconjunto de IDs após filtro por rosto; null = sem filtro. */
    faceFilterIds: null,
    /** Painel: permitir download com marca d'água (API gallery.allow_download). */
    allowDownload: false,
    /** Fotógrafos: download ativado nas definições (antes do filtro público/anónimo). */
    photographerAllowsDownload: false,
    salesModeActive: false,
    salesConfig: null,
    salesPackages: [],
    salesPricing: null,
    promo: null,
    paymentState: null,
    approvalsState: [],
    approvedPhotoIds: [],
    clientAuthenticated: false,
    /** Modo público: >0 quando o JWT está associado a um registo (king_gallery_clients). */
    resolvedClientId: 0,
    /** pastas | flat — vem da API (painel). */
    clientFolderLayout: 'folders',
    downloadsSelected: new Set(),
    downloadsTouched: false,
    /** Modo público: painel «Fotos para baixar» só visível após o cliente abrir (não ao cadastrar). */
    publicDownloadsPanelOpen: false,
    /** Pré-preenchimento (modo público) quando já existe cadastro real — não usar ficha técnica de sessão/rosto. */
    clientContactPrefill: null,
    /** Modo público: pedido de edição ativado pelo fotógrafo. */
    allowClientEditRequest: false,
    /** Galerias muito grandes: quantas fotos renderizar na grade. */
    gridVirtualShown: 120
  };

  const KS_VIRTUAL_THRESHOLD = 2000;
  const KS_VIRTUAL_BATCH = 120;

  /** Após modal de cadastro público: o que executar quando download já estiver liberado. */
  let pendingPublicDownloadAction = null;

  const KS_OPEN_DOWNLOADS_BTN_HTML =
    '<i class="fas fa-download"></i> Fotos para baixar';

  const naturalCollator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

  function cmpNaturalText(a, b) {
    return naturalCollator.compare(String(a || ''), String(b || ''));
  }

  function formatCentsBr(v) {
    const n = Math.max(0, parseInt(v, 10) || 0) / 100;
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function parseReaisInputToCents(raw) {
    const s = String(raw || '').trim();
    if (!s) return null;
    const clean = s.replace(/[R$\s]/gi, '').replace(/[^\d.,-]/g, '');
    if (!clean) return null;
    const hasComma = clean.includes(',');
    const hasDot = clean.includes('.');
    let normalized = clean;
    if (hasComma && hasDot) normalized = clean.replace(/\./g, '').replace(',', '.');
    else if (hasComma) normalized = clean.replace(',', '.');
    const n = Number.parseFloat(normalized);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.round(n * 100);
  }

  function normalizeLegacyMoneyCents(v) {
    const n = Math.max(0, parseInt(v, 10) || 0);
    if (n > 0 && n < 1000) return n * 100;
    return n;
  }

  /** Alinha com ksBillablePhotoCountAfterPromo no servidor (cupom validado + janela ok). */
  function billablePhotoCountForSalesEstimate(selectedCount) {
    const n = Math.max(0, parseInt(selectedCount, 10) || 0);
    const p = state.promo;
    if (!p || !p.active || p.expired || !p.validated) return n;
    const free = Math.max(1, Math.min(5000, parseInt(p.free_photo_count, 10) || 1));
    const take = Math.min(free, n);
    return Math.max(0, n - take);
  }

  function estimateClientTotalByPackages(selectedCount, packs, mode, unitCents) {
    const qty = Math.max(0, parseInt(selectedCount, 10) || 0);
    if (!qty) return 0;
    const sorted = (Array.isArray(packs) ? packs : [])
      .map((p) => ({
        qty: Math.max(1, parseInt(p?.photo_qty, 10) || 1),
        price: normalizeLegacyMoneyCents(p?.price_cents || 0),
        name: String(p?.name || '')
      }))
      .filter((p) => p.price > 0)
      .sort((a, b) => a.qty - b.qty);
    if (!sorted.length) return Math.max(0, parseInt(unitCents, 10) || 0) * qty;
    const exact = sorted.find((p) => p.qty === qty);
    if (exact) return exact.price;
    if (qty <= sorted[0].qty) {
      const per = sorted[0].price / sorted[0].qty;
      return Math.round(per * qty);
    }
    for (let i = 0; i < sorted.length - 1; i += 1) {
      const cur = sorted[i];
      const next = sorted[i + 1];
      if (qty > cur.qty && qty < next.qty) {
        const nextPer = next.price / next.qty;
        return Math.round(cur.price + (qty - cur.qty) * nextPer);
      }
    }
    const last = sorted[sorted.length - 1];
    const lastPer = last.price / last.qty;
    return Math.round(last.price + (qty - last.qty) * lastPer);
  }

  function normalizeWhatsDigits(v) {
    return String(v || '').replace(/\D/g, '').trim();
  }

  function normalizeClientCardHeightPx(v) {
    return Math.max(160, Math.min(420, parseInt(v, 10) || 220));
  }

  function applyClientCardHeightFromGallery(galleryObj) {
    const px = normalizeClientCardHeightPx(galleryObj?.client_card_height_px);
    document.documentElement.style.setProperty('--ks-photo-frame-h', `${px}px`);
  }

  function renderSupportWhatsButton() {
    const btn = $('ks-support-whats');
    const text = $('ks-support-whats-text');
    if (!btn) return;
    const nCfg = normalizeWhatsDigits(state.gallery?.support_whatsapp_number);
    const nPix = normalizeWhatsDigits(state.salesConfig?.pix_key || '');
    const n = nCfg || ((nPix.length >= 10 && nPix.length <= 15) ? nPix : '');
    if (!n) {
      btn.classList.add('ks-hidden');
      btn.removeAttribute('data-whats-link');
      return;
    }
    const label = String(state.gallery?.support_whatsapp_label || '').trim() || 'Suporte no WhatsApp';
    const msgCfg = String(state.gallery?.support_whatsapp_message || '').trim();
    const msg = msgCfg || `Olá! Preciso de ajuda com a galeria "${state.gallery?.nome_projeto || ''}".`;
    btn.title = label;
    btn.setAttribute('aria-label', label);
    if (text) text.textContent = label;
    btn.setAttribute('data-whats-link', `https://wa.me/${encodeURIComponent(n)}?text=${encodeURIComponent(msg)}`);
    btn.classList.remove('ks-hidden');
  }

  function buildSupportWhatsLink(customMessage) {
    const nCfg = normalizeWhatsDigits(state.gallery?.support_whatsapp_number);
    const nPix = normalizeWhatsDigits(state.salesConfig?.pix_key || '');
    const n = nCfg || ((nPix.length >= 10 && nPix.length <= 15) ? nPix : '');
    if (!n) return '';
    const msg = String(customMessage || '').trim();
    if (!msg) return '';
    return `https://wa.me/${encodeURIComponent(n)}?text=${encodeURIComponent(msg)}`;
  }

  function sortFoldersForClient(folders, mode) {
    const arr = Array.isArray(folders) ? folders.slice() : [];
    if (mode === 'name') {
      arr.sort((a, b) => cmpNaturalText(a.name, b.name) || ((a.id || 0) - (b.id || 0)));
      return arr;
    }
    if (mode === 'count') {
      arr.sort((a, b) => (parseInt(b.photo_count, 10) || 0) - (parseInt(a.photo_count, 10) || 0) || cmpNaturalText(a.name, b.name));
      return arr;
    }
    arr.sort((a, b) => (a.sort_order - b.sort_order) || (a.id - b.id));
    return arr;
  }

  function isVirtualClientFolderRow(f) {
    const id = parseInt(f?.id, 10) || 0;
    if (id <= 0) return true;
    const name = String(f?.name || '').trim().toLowerCase();
    return name === 'sem pasta' || name === 'sem-pasta' || name === 'unassigned'
      || name === 'todas' || name === 'todas as fotos' || name === 'fotos soltas';
  }

  function filterClientVisibleFolders(folders) {
    return (Array.isArray(folders) ? folders : []).filter((f) => {
      if (isVirtualClientFolderRow(f)) return false;
      return (parseInt(f.id, 10) || 0) > 0 && (parseInt(f.photo_count, 10) || 0) > 0;
    });
  }

  function normalizeFolders(rawFolders, rawPhotos) {
    const arr = Array.isArray(rawFolders) ? rawFolders : [];
    const photos = Array.isArray(rawPhotos) ? rawPhotos : [];
    const validFolderIds = new Set(
      arr.map((f) => parseInt(f?.id, 10) || 0).filter((id) => id > 0)
    );
    const byFolder = new Map();
    for (const p of photos) {
      const fid = parseInt(p?.folder_id, 10) || 0;
      if (!fid || !validFolderIds.has(fid)) continue;
      if (!byFolder.has(fid)) byFolder.set(fid, []);
      byFolder.get(fid).push(p);
    }
    const normalized = arr
      .map((f) => ({
        id: parseInt(f?.id, 10) || 0,
        name: String(f?.name || '').trim() || 'Pasta',
        sort_order: parseInt(f?.sort_order, 10) || 0,
        cover_photo_id: parseInt(f?.cover_photo_id, 10) || null,
        photo_count: parseInt(f?.photo_count, 10) || 0
      }))
      .map((f) => {
        const list = byFolder.get(f.id) || [];
        // Capa automática: usa a primeira foto da pasta quando não houver capa definida.
        if (!f.cover_photo_id && list.length) {
          const first = list.find((p) => parseInt(p?.id, 10));
          if (first) f.cover_photo_id = parseInt(first.id, 10) || null;
        }
        // Recalcula sempre no cliente para evitar exibir pasta "0 foto(s)" quando já há fotos carregadas.
        f.photo_count = list.length;
        return f;
      })
      .sort((a, b) => (a.sort_order - b.sort_order) || (a.id - b.id));
    return filterClientVisibleFolders(normalized);
  }

  /** ID de foto vindo da API (int/string/bigint) → número inteiro > 0 ou 0. */
  function normalizePhotoId(v) {
    if (v == null || v === '') return 0;
    const n =
      typeof v === 'number' && Number.isFinite(v)
        ? Math.trunc(v)
        : parseInt(String(v).trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  /** Garante `id` e `folder_id` numéricos — evita falha em `Set.has` e filtros de pasta. */
  function normalizeGalleryPhotosForState(gallery) {
    if (!gallery) return gallery;
    const photos = Array.isArray(gallery.photos)
      ? gallery.photos.map((p) => {
          const id = normalizePhotoId(p.id);
          let folderId = null;
          if (p.folder_id != null && String(p.folder_id).trim() !== '') {
            const fi = parseInt(String(p.folder_id).trim(), 10);
            folderId = Number.isFinite(fi) && fi !== 0 ? fi : null;
          }
          return { ...p, id, folder_id: folderId };
        })
      : gallery.photos;
    return { ...gallery, photos };
  }

  function folderNavStorageKey() {
    return `ks_folder_nav_v1_${slug}`;
  }

  function persistFolderNav() {
    try {
      sessionStorage.setItem(
        folderNavStorageKey(),
        JSON.stringify({
          v: 1,
          folderView: state.folderView,
          activeFolderId:
            state.activeFolderId === null || state.activeFolderId === undefined ? null : state.activeFolderId
        })
      );
    } catch (_) {}
  }

  function getActiveFolder() {
    if (!state.activeFolderId) return null;
    return state.folders.find((f) => f.id === state.activeFolderId) || null;
  }

  function applyFolderCardOrientation(card, img) {
    if (!card || !img) return;
    const w = Number(img.naturalWidth || 0);
    const h = Number(img.naturalHeight || 0);
    card.classList.remove('ks-folder-card--portrait', 'ks-folder-card--landscape', 'ks-folder-card--square');
    if (!w || !h) return;
    const ratio = w / h;
    if (ratio > 1.2) card.classList.add('ks-folder-card--landscape');
    else if (ratio < 0.85) card.classList.add('ks-folder-card--portrait');
    else card.classList.add('ks-folder-card--square');
  }

  function renderFolders() {
    const wrap = $('ks-folder-wrap');
    const grid = $('ks-folder-grid');
    const title = $('ks-folder-title');
    const folderSortSel = $('ks-folder-sort');
    const backBtn = $('ks-folder-back');
    const backTopBtn = $('ks-folder-back-top');
    const searchBlock = $('ks-search-block');
    if (!wrap || !grid) return;

    if (state.locked && state.salesModeActive) {
      wrap.classList.add('ks-hidden');
      searchBlock?.classList.add('ks-hidden');
      backBtn?.classList.add('ks-hidden');
      backTopBtn?.classList.add('ks-hidden');
      syncFolderSelectAllToolbar();
      return;
    }
    if (state.clientFolderLayout === 'flat') {
      wrap.classList.add('ks-hidden');
      grid.classList.add('ks-hidden');
      if (title) title.textContent = '';
      backBtn?.classList.add('ks-hidden');
      backTopBtn?.classList.add('ks-hidden');
      searchBlock?.classList.remove('ks-hidden');
      syncFolderSelectAllToolbar();
      return;
    }

    const visibleFolders = filterClientVisibleFolders(state.folders);
    const hasFolders = visibleFolders.length > 0;
    const sortedFolders = sortFoldersForClient(visibleFolders, state.folderSortMode);
    if (folderSortSel) folderSortSel.value = state.folderSortMode;
    if (!hasFolders) {
      state.folderView = 'photos';
      state.activeFolderId = null;
      wrap.classList.add('ks-hidden');
      searchBlock?.classList.remove('ks-hidden');
      backBtn?.classList.add('ks-hidden');
      backTopBtn?.classList.add('ks-hidden');
      syncFolderSelectAllToolbar();
      return;
    }

    wrap.classList.remove('ks-hidden');
    const inFolderList = state.folderView === 'folders';
    searchBlock?.classList.toggle('ks-hidden', inFolderList);
    backBtn?.classList.add('ks-hidden'); // mantém botão antigo desativado (agora no topo)
    backTopBtn?.classList.toggle('ks-hidden', inFolderList);

    if (inFolderList) {
      if (title) title.textContent = 'Escolha uma pasta';
      const cards = [];
      for (const f of sortedFolders) {
        const cover = f.cover_photo_id
          ? `<div class="ks-folder-cover"><img src="${previewUrl(f.cover_photo_id, false)}" alt="${escapeHtml(f.name)}" loading="lazy" /></div>`
          : `<div class="ks-folder-ph ks-folder-cover"><i class="fas fa-folder-open"></i></div>`;
        cards.push(
          `<button type="button" class="ks-folder-card" data-open-folder="${f.id}">
             ${cover}
             <div class="ks-folder-meta">
               <div class="ks-folder-name">${escapeHtml(f.name)}</div>
               <div class="ks-folder-count">${f.photo_count} foto(s)</div>
             </div>
           </button>`
        );
      }
      grid.innerHTML = cards.join('');
      grid.classList.remove('ks-hidden');
      grid.querySelectorAll('.ks-folder-card img').forEach((img) => {
        const card = img.closest('.ks-folder-card');
        if (!card) return;
        const onDone = () => applyFolderCardOrientation(card, img);
        if (img.complete) onDone();
        else img.addEventListener('load', onDone, { once: true });
      });
      grid.querySelectorAll('[data-open-folder]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const raw = btn.getAttribute('data-open-folder');
          const fid = parseInt(raw, 10);
          if (!fid || fid <= 0 || raw === 'all') return;
          state.activeFolderId = fid;
          state.folderView = 'photos';
          persistFolderNav();
          renderFolders();
          resetGridVirtualPaging();
          renderGrid();
        });
      });
      syncFolderSelectAllToolbar();
      return;
    }

    const active = getActiveFolder();
    if (title) title.textContent = active ? `Pasta: ${active.name}` : (state.gallery?.nome_projeto || '');
    grid.classList.add('ks-hidden');
    syncFolderSelectAllToolbar();
  }

  async function onPromoVerifyClick() {
    const code = String($('ks-promo-code-input')?.value || '').trim();
    const ok = !!$('ks-promo-social-ok')?.checked;
    if (!ok) {
      toast('Só marque a confirmação depois de seguir os perfis de verdade.', 'err');
      return;
    }
    if (!code) {
      toast('Informe o código do cupom.', 'err');
      return;
    }
    try {
      const res = await fetch(`${API}/api/king-selection/client/promo-verify`, {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({ slug, social_confirmed: true, coupon_code: code })
      });
      const data = await res.json().catch(() => ({}));
      if (handleClientUnauthorized(res, data)) return;
      if (!res.ok) throw new Error(data.message || 'Erro ao validar');
      const data2 = await loadGallery();
      applyGalleryData(data2);
      toast(String(data.message || 'Cupom aplicado.'), '');
    } catch (e) {
      toast(e.message || 'Erro', 'err');
    }
  }

  function renderPromoClientBanner() {
    const el = $('ks-promo-banner');
    if (!el) return;
    const p = state.promo;
    const mode = String(p?.mode || '').toLowerCase();
    const showCupom =
      !!p &&
      !!p.active &&
      (state.salesModeActive || normKsAccessModeFromMeta() === 'public');
    if (!showCupom) {
      el.classList.add('ks-hidden');
      el.innerHTML = '';
      return;
    }
    el.classList.remove('ks-hidden');
    if (p.expired) {
      el.innerHTML = '<div style="font-weight:800">Cupom encerrado.</div><div style="font-size:12px;margin-top:6px;opacity:.9">Fale com o fotógrafo.</div>';
      return;
    }
    if (p.validated) {
      const codeDisp = String(p.entered_code || p.coupon_code_display || '').trim();
      const codeBlock = codeDisp
        ? `<div style="margin-top:10px;padding:10px;border-radius:10px;border:1px solid rgba(250,204,21,.5);background:rgba(0,0,0,.35)">
            <div style="font-size:11px;font-weight:800;opacity:.9;margin-bottom:4px;letter-spacing:.04em">CUPOM VALIDADO</div>
            <div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px">
              <code style="font-family:ui-monospace,Consolas,monospace;font-weight:900;color:#fef08a;font-size:14px;word-break:break-all">${escapeHtml(codeDisp)}</code>
              <span style="font-size:11px;font-weight:800;color:#4ade80;white-space:nowrap"><i class="fas fa-circle-check"></i> Ativo</span>
            </div>
          </div>`
        : '';
      if (mode === 'public_download') {
        const n = Math.max(0, parseInt(p.free_photo_count, 10) || 0);
        el.innerHTML = `<div style="font-weight:800"><i class="fas fa-ticket"></i> Cupom aplicado</div>
          <div style="font-size:12px;margin-top:6px;line-height:1.45">Pode baixar até <b>${n}</b> foto(s) selecionada(s) (por ordem da galeria), com marca d’água, conforme definido pelo fotógrafo.</div>${codeBlock}`;
        return;
      }
      const free = p.promo_photos_applied != null ? p.promo_photos_applied : 0;
      const bill = p.billable_photo_count != null ? p.billable_photo_count : 0;
      el.innerHTML = `<div style="font-weight:800"><i class="fas fa-ticket"></i> Cupom aplicado</div>
        <div style="font-size:12px;margin-top:6px;line-height:1.45">No <strong>valor estimado</strong> (total no topo), até <b>${free}</b> foto(s) contam como cortesia deste cupom; a cobrança considera <b>${bill}</b> foto(s). Isso só ajusta o preço mostrado — o fotógrafo continua a aprovar cada foto (cortesia, pago, etc.) como de costume.</div>${codeBlock}`;
      return;
    }
    const links = Array.isArray(p.social_links) ? p.social_links : [];
    const linkHtml = links
      .map((l) => {
        const h = escapeHtml(l.handle || 'Perfil');
        const u = String(l.url || '').trim();
        if (!u) return '';
        return `<a href="${escapeHtml(u)}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;margin:4px 8px 4px 0;padding:8px 12px;border-radius:10px;border:1px solid rgba(250,204,21,.5);background:rgba(0,0,0,.25);color:#fef08a;font-weight:800;text-decoration:none"><i class="fab fa-instagram"></i> ${h}</a>`;
      })
      .join('');
    const instr = p.instructions
      ? `<p style="font-size:12px;margin:8px 0 0;line-height:1.4">${escapeHtml(p.instructions)}</p>`
      : '';
    const lead =
      mode === 'public_download'
        ? `<p style="font-size:12px;margin:0 0 8px;line-height:1.45;opacity:.95"><strong>Siga os perfis</strong>, confirme com verdade abaixo e <strong>digite o cupom à mão</strong> no campo (não preenchemos pelo link) — assim liberamos o número de fotos combinado para download com marca d’água.</p>`
        : `<p style="font-size:12px;margin:0 0 8px;line-height:1.45;opacity:.95">Ao validar, as fotos gratuitas do cupom <strong>saem do cálculo do total estimado</strong>. A aprovação final continua com o fotógrafo.</p>`;
    el.innerHTML = `
      <div style="font-weight:800;margin-bottom:6px"><i class="fas fa-gift"></i> Cupom promocional</div>
      ${lead}
      ${instr}
      <div style="margin-top:8px">${linkHtml}</div>
      <label style="display:flex;align-items:flex-start;gap:8px;margin-top:10px;font-size:12px;line-height:1.45">
        <input type="checkbox" id="ks-promo-social-ok" style="margin-top:2px;flex-shrink:0" />
        <span>Declaro com sinceridade que segui os perfis indicados acima (Instagram / outras redes). <strong>Se marcar sem ter seguido de verdade, está a mentir</strong> — Deus vê e vigia; o fotógrafo também pode conferir.</span>
      </label>
      <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:8px;align-items:center">
        <input type="text" id="ks-promo-code-input" class="ks-input" placeholder="Código do cupom" style="max-width:240px" autocomplete="off" />
        <button type="button" class="ks-btn ks-btn-yellow" id="ks-promo-verify-btn"><i class="fas fa-check"></i> Validar cupom</button>
      </div>`;
    $('ks-promo-verify-btn')?.addEventListener('click', () => onPromoVerifyClick());
  }

  /** Aprovações do modo vendas (DB + fallback approvedPhotoIds da API). */
  function getSalesApprovedEntries() {
    const fromState = Array.isArray(state.approvalsState)
      ? state.approvalsState.filter((a) => String(a.status || '').toLowerCase() === 'approved')
      : [];
    if (fromState.length) return fromState;
    const ids = Array.isArray(state.approvedPhotoIds) ? state.approvedPhotoIds : [];
    if (!ids.length) return [];
    const byId = new Map((state.gallery?.photos || []).map((p) => [parseInt(p.id, 10), p]));
    return ids
      .map((raw) => parseInt(raw, 10))
      .filter((n) => Number.isFinite(n) && n > 0)
      .map((pid) => ({
        photo_id: pid,
        status: 'approved',
        original_name: byId.get(pid)?.original_name || null
      }));
  }

  function scheduleSalesStatusRefresh() {
    clearInterval(state._salesRefreshTimer);
    state._salesRefreshTimer = null;
    if (!state.salesModeActive || !state.locked) return;
    state._salesRefreshTimer = setInterval(async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      try {
        const gd = await loadGallery();
        applyGalleryData(gd);
      } catch (_) {}
    }, 45000);
  }

  function renderSalesUi() {
    const banner = $('ks-sales-banner');
    const downloadsPanel = $('ks-downloads-panel');
    const downloadsMsg = $('ks-downloads-msg');
    const downloadsGrid = $('ks-downloads-grid');
    const downloadsActions = $('ks-downloads-actions');
    const downloadsSelectAll = $('ks-downloads-select-all');
    const downloadsCounter = $('ks-downloads-counter');
    const downloadsCounterIcon = $('ks-downloads-counter-icon');
    const downloadsCounterText = $('ks-downloads-counter-text');
    const setDownloadsCounter = (selectedCount, approvedCount) => {
      if (!downloadsCounter) return;
      const sel = Math.max(0, parseInt(selectedCount, 10) || 0);
      const app = Math.max(0, parseInt(approvedCount, 10) || 0);
      const msg = `${sel} selecionada(s) de ${app} liberada(s)`;
      if (downloadsCounterText) downloadsCounterText.textContent = msg;
      else downloadsCounter.textContent = msg;
      downloadsCounter.classList.remove('ks-dl-counter--partial', 'ks-dl-counter--all');
      if (downloadsCounterIcon) {
        downloadsCounterIcon.classList.remove('fa-circle-minus', 'fa-triangle-exclamation', 'fa-circle-check');
      }
      let nextState = 'none';
      if (app > 0 && sel >= app) {
        nextState = 'all';
        downloadsCounter.classList.add('ks-dl-counter--all');
        if (downloadsCounterIcon) downloadsCounterIcon.classList.add('fa-circle-check');
      } else if (sel > 0) {
        nextState = 'partial';
        downloadsCounter.classList.add('ks-dl-counter--partial');
        if (downloadsCounterIcon) downloadsCounterIcon.classList.add('fa-triangle-exclamation');
      } else if (downloadsCounterIcon) {
        downloadsCounterIcon.classList.add('fa-circle-minus');
      }
      const prevState = String(downloadsCounter.getAttribute('data-state') || '');
      if (prevState && prevState !== nextState) {
        downloadsCounter.classList.remove('ks-dl-counter--pulse');
        // reinicia a animação sempre que muda de estado
        void downloadsCounter.offsetWidth;
        downloadsCounter.classList.add('ks-dl-counter--pulse');
        clearTimeout(downloadsCounter._pulseTimer);
        downloadsCounter._pulseTimer = setTimeout(() => {
          downloadsCounter.classList.remove('ks-dl-counter--pulse');
        }, 340);
      }
      downloadsCounter.setAttribute('data-state', nextState);
    };

    const openDownloadsBtn = $('ks-open-downloads');
    if (!banner || !downloadsPanel || !downloadsGrid || !downloadsMsg || !openDownloadsBtn) return;

    const setDlMsg = (text) => {
      const t = String(text || '').trim();
      downloadsMsg.textContent = t;
      downloadsMsg.classList.toggle('ks-hidden', !t);
    };

    if (!state.salesModeActive) {
      banner.classList.add('ks-hidden');
      downloadsPanel.classList.add('ks-hidden');
      downloadsActions?.classList.add('ks-hidden');
      setDownloadsProgress(0, 1, false);
      openDownloadsBtn.classList.add('ks-hidden');
      $('ks-payment-balance-banner')?.classList.add('ks-hidden');
      return;
    }

    const packs = Array.isArray(state.salesPackages) ? state.salesPackages : [];
    const pricing = state.salesPricing || null;
    const mode = String(state.salesConfig?.sales_price_mode || 'best_price_auto').toLowerCase();
    const unit = normalizeLegacyMoneyCents(state.salesConfig?.sales_unit_price_cents || 0);
    const selectedCount = Math.max(0, parseInt(state.selected?.size || 0, 10) || 0);
    const billableForEstimate = billablePhotoCountForSalesEstimate(selectedCount);
    const computedByClient = estimateClientTotalByPackages(billableForEstimate, packs, mode, unit);
    const maxPkgQty = packs.length
      ? Math.max(...packs.map((p) => parseInt(p?.photo_qty, 10) || 0), 0)
      : 0;
    const overLimitLive =
      String(state.salesConfig?.sales_over_limit_policy || '').toLowerCase() === 'allow_and_warn' &&
      maxPkgQty > 0 &&
      selectedCount > maxPkgQty;
    const approved = getSalesApprovedEntries();
    const packageTheme = (name, idx) => {
      const n = String(name || '').toLowerCase();
      if (n.includes('essencial')) return { border: '#67e8f9', bg: '#ffffff', title: '#111827', value: '#111827', sub: '#6b7280', qtyPillBg: '#ecfeff', qtyPillColor: '#0e7490' };
      if (n.includes('pro')) return { border: '#fdba74', bg: '#ffffff', title: '#111827', value: '#111827', sub: '#6b7280', qtyPillBg: '#fff7ed', qtyPillColor: '#c2410c' };
      if (n.includes('premium')) return { border: '#60a5fa', bg: '#ffffff', title: '#111827', value: '#111827', sub: '#6b7280', qtyPillBg: '#eff6ff', qtyPillColor: '#1d4ed8' };
      if (n.includes('vip')) return { border: '#6ee7b7', bg: '#ffffff', title: '#111827', value: '#111827', sub: '#6b7280', qtyPillBg: '#ecfdf5', qtyPillColor: '#047857' };
      const fallback = [
        { border: '#67e8f9', bg: '#ffffff', title: '#111827', value: '#111827', sub: '#6b7280', qtyPillBg: '#ecfeff', qtyPillColor: '#0e7490' },
        { border: '#fdba74', bg: '#ffffff', title: '#111827', value: '#111827', sub: '#6b7280', qtyPillBg: '#fff7ed', qtyPillColor: '#c2410c' },
        { border: '#60a5fa', bg: '#ffffff', title: '#111827', value: '#111827', sub: '#6b7280', qtyPillBg: '#eff6ff', qtyPillColor: '#1d4ed8' },
        { border: '#6ee7b7', bg: '#ffffff', title: '#111827', value: '#111827', sub: '#6b7280', qtyPillBg: '#ecfdf5', qtyPillColor: '#047857' }
      ];
      return fallback[idx % fallback.length];
    };
    const packageCards = packs.length
      ? packs.map((p, idx) => {
        const name = String(p?.name || '').trim() || `Pacote ${idx + 1}`;
        const qty = Math.max(1, parseInt(p?.photo_qty, 10) || 1);
        const val = formatCentsBr(normalizeLegacyMoneyCents(p?.price_cents || 0));
        const th = packageTheme(name, idx);
        return `
          <div style="border:2px solid ${th.border};background:${th.bg};border-radius:12px;padding:10px;box-shadow:0 6px 16px rgba(15,23,42,.10)">
            <div style="font-size:12px;color:${th.title};font-weight:900;letter-spacing:.02em;text-transform:uppercase">${escapeHtml(name)}</div>
            <div style="margin-top:4px;font-size:19px;color:${th.value};font-weight:900">${escapeHtml(val)}</div>
            <div style="margin-top:6px"><span style="display:inline-block;padding:3px 9px;border-radius:999px;background:${th.qtyPillBg};color:${th.qtyPillColor};font-size:12px;font-weight:900">${qty} foto(s)</span></div>
          </div>
        `;
      }).join('')
      : '<div style="color:#64748b;font-size:12px">Pacotes ainda não configurados.</div>';
    const warn = overLimitLive || pricing?.over_limit_warn
      ? ' • Você ultrapassou a faixa dos pacotes: valor final pode ser negociado com o fotógrafo.'
      : '';
    banner.style.background = '#f8fafc';
    banner.style.borderColor = '#c7d2fe';
    banner.style.color = '#0f172a';
    banner.style.boxShadow = '0 10px 24px rgba(15,23,42,.12)';
    banner.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
        <div style="font-weight:900;color:#4f46e5;letter-spacing:.02em"><i class="fas fa-square-poll-vertical"></i> Resumo da seleção</div>
      </div>
      <div class="ks-sales-resumo-metrics" style="margin-top:10px">
        <div style="border:1px solid #bae6fd;background:#ecfeff;border-radius:12px;padding:10px;min-width:0">
          <div style="font-size:11px;color:#0e7490;font-weight:800;letter-spacing:.02em">FOTOS SELECIONADAS</div>
          <div style="margin-top:4px;font-size:26px;color:#0369a1;font-weight:900;line-height:1">${selectedCount}</div>
        </div>
        <div style="border:1px solid #86efac;background:#ecfdf5;border-radius:12px;padding:10px;min-width:0">
          <div style="font-size:11px;color:#047857;font-weight:800;letter-spacing:.02em">FOTOS LIBERADAS</div>
          <div style="margin-top:4px;font-size:26px;color:#15803d;font-weight:900;line-height:1">${approved.length}</div>
        </div>
        <div style="border:1px solid #86efac;background:#ecfdf5;border-radius:12px;padding:10px;min-width:0">
          <div style="font-size:11px;color:#047857;font-weight:800;letter-spacing:.02em">TOTAL ESTIMADO</div>
          <div style="margin-top:4px;font-size:22px;color:#047857;font-weight:900">${escapeHtml(formatCentsBr(computedByClient))}</div>
        </div>
      </div>
      <div style="margin-top:10px;font-weight:900;color:#111827;letter-spacing:.02em"><i class="fas fa-tags"></i> Pacotes e valores</div>
        <div class="ks-sales-resumo-metrics" style="margin-top:8px">${packageCards}</div>
      ${warn ? `<div style="margin-top:8px;font-size:12px;color:#b45309">${escapeHtml(warn)}</div>` : ''}
    `;
    banner.classList.remove('ks-hidden');
    const payBalEl = $('ks-payment-balance-banner');
    if (payBalEl) {
      const ps = state.paymentState;
      const stp = String(ps?.status || '').toLowerCase();
      const bal = ps?.balance_due_cents != null ? Math.max(0, parseInt(ps.balance_due_cents, 10) || 0) : 0;
      const showFin =
        state.clientAuthenticated &&
        ps &&
        (bal > 0 || stp === 'partial' || (stp === 'pending' && (ps.expected_total_cents || 0) > 0));
      if (showFin) {
        payBalEl.classList.remove('ks-hidden');
        payBalEl.innerHTML = `
          <div style="font-weight:900;margin-bottom:4px"><i class="fas fa-scale-balanced"></i> Situação do pagamento</div>
          <div>Total do pacote (estimado): <b>${escapeHtml(formatCentsBr(ps.expected_total_cents || 0))}</b> • Confirmado pelo fotógrafo: <b>${escapeHtml(formatCentsBr(ps.amount_received_cumulative_cents || 0))}</b> • Cortesia: <b>${escapeHtml(formatCentsBr(ps.courtesy_cents || 0))}</b></div>
          <div style="margin-top:6px;font-weight:900;color:#0369a1">Falta pagar: ${escapeHtml(formatCentsBr(bal))}</div>
          <div style="margin-top:6px;font-size:12px;opacity:.95">Envie o comprovante de cada pagamento parcial pelo fluxo do fotógrafo (comprovante na galeria).</div>`;
      } else {
        payBalEl.classList.add('ks-hidden');
        payBalEl.innerHTML = '';
      }
    }
    const selectedForClient = Array.isArray(state.gallery?.photos)
      ? state.gallery.photos.filter((p) => state.selected.has(parseInt(p?.id, 10)))
      : [];
    const canShowDownloads = approved.length > 0;
    if (canShowDownloads) {
      const approvedIds = new Set(approved.map((a) => parseInt(a.photo_id, 10)).filter(Boolean));
      const selectedApproved = Array.from(state.downloadsSelected || new Set()).filter((id) => approvedIds.has(parseInt(id, 10)));
      state.downloadsSelected = new Set(selectedApproved);
      if (!state.downloadsTouched && state.downloadsSelected.size === 0) {
        state.downloadsSelected = new Set(Array.from(approvedIds));
      }
      if (downloadsActions) downloadsActions.classList.remove('ks-hidden');
      setDownloadsCounter(state.downloadsSelected.size, approvedIds.size);
      if (downloadsSelectAll) {
        downloadsSelectAll.checked = state.downloadsSelected.size > 0 && state.downloadsSelected.size === approvedIds.size;
      }
      const selectedById = new Map(selectedForClient.map((p) => [parseInt(p.id, 10), p]));
      const approvedCards = approved.map((a) => {
        const pid = parseInt(a.photo_id, 10) || 0;
        const fallbackName = selectedById.get(pid)?.original_name || '';
        const isChecked = state.downloadsSelected.has(pid);
        return `
          <div class="ks-ph">
            <label style="display:inline-flex;align-items:center;gap:6px;margin:6px 0 4px 0;font-size:11px;font-weight:700">
              <input type="checkbox" data-dl-pick="${pid}" ${isChecked ? 'checked' : ''} />
              Selecionar
            </label>
            <img src="${previewUrl(pid, true)}" alt="${escapeHtml(a.original_name || fallbackName || '')}" loading="lazy" />
            <div class="ks-ph-meta">${escapeHtml(a.original_name || fallbackName || `Foto #${pid}`)} <span class="ks-dl-badge-liberada">Liberada</span></div>
            <a class="ks-btn" href="${previewDownloadUrl(pid)}" download>
              <i class="fas fa-download"></i> Baixar
            </a>
          </div>
        `;
      });
      const waitingCards = selectedForClient
        .filter((p) => !approvedIds.has(parseInt(p.id, 10)))
        .map((p) => `
          <div class="ks-ph">
            <img src="${previewUrl(p.id, true)}" alt="${escapeHtml(p.original_name || '')}" loading="lazy" />
            <div class="ks-ph-meta">${escapeHtml(p.original_name || `Foto #${p.id}`)}</div>
            <button type="button" class="ks-btn ks-wait-lock" disabled title="Aguardando aprovação">
              <i class="fas fa-hourglass-half"></i> Aguardando aprovação
            </button>
          </div>
        `);
      setDlMsg(
        waitingCards.length
          ? `Você já tem ${approvedCards.length} foto(s) liberada(s). As demais continuam aguardando aprovação do fotógrafo.`
          : 'Todas as fotos selecionadas já foram liberadas para download em alta qualidade.'
      );
      downloadsGrid.innerHTML = approvedCards.concat(waitingCards).join('');
      downloadsGrid.querySelectorAll('input[data-dl-pick]').forEach((inp) => {
        inp.addEventListener('change', () => {
          const pid = parseInt(inp.getAttribute('data-dl-pick') || '0', 10) || 0;
          if (!pid) return;
          state.downloadsTouched = true;
          if (inp.checked) state.downloadsSelected.add(pid);
          else state.downloadsSelected.delete(pid);
          const allChecked = state.downloadsSelected.size > 0 && state.downloadsSelected.size === approvedIds.size;
          if (downloadsSelectAll) downloadsSelectAll.checked = allChecked;
          setDownloadsCounter(state.downloadsSelected.size, approvedIds.size);
        });
      });
    } else {
      setDownloadsProgress(0, 1, false);
      if (downloadsActions) downloadsActions.classList.add('ks-hidden');
      setDownloadsCounter(0, 0);
      if (!selectedForClient.length) {
        setDlMsg('Selecione e envie suas fotos primeiro. Depois aguarde a aprovação do fotógrafo para liberar o download.');
      } else if (!state.clientAuthenticated) {
        setDlMsg(`Você já marcou ${selectedForClient.length} foto(s). Clique em Avançar, envie sua seleção e depois aguarde aprovação para baixar.`);
      } else if (state.locked && state.salesModeActive) {
        setDlMsg(
          'Suas fotos enviadas aparecem abaixo com marca d\'água. Quando o fotógrafo liberar, toque em «Atualizar liberações» ou atualize a página (F5) para baixar em alta qualidade.'
        );
      } else {
        setDlMsg(
          state.locked
            ? 'Sua seleção já foi enviada. Aguarde a liberação do fotógrafo para baixar as fotos aprovadas. Para selecionar mais fotos, peça ao retratista no botão Suporte / Retratos.'
            : 'Sua seleção já foi enviada. Aguarde a liberação do fotógrafo para baixar as fotos aprovadas.'
        );
      }
      downloadsGrid.innerHTML = selectedForClient.map((p) => `
        <div class="ks-ph">
          <img src="${previewUrl(p.id, true)}" alt="${escapeHtml(p.original_name || '')}" loading="lazy" />
          <div class="ks-ph-meta">${escapeHtml(p.original_name || `Foto #${p.id}`)}</div>
          <button type="button" class="ks-btn ks-wait-lock" disabled title="Aguardando liberação">
            <i class="fas fa-lock"></i> Aguardando liberação
          </button>
        </div>
      `).join('');
    }
    openDownloadsBtn.classList.toggle('ks-hidden', false);
    const refreshDl = $('ks-refresh-downloads');
    if (refreshDl) {
      refreshDl.classList.toggle('ks-hidden', !(state.salesModeActive && state.locked));
    }
    renderDownloadsPixBanner();
    renderPromoClientBanner();
    syncSalesConfirmBar();
  }

  /** Modo público + cupom: painel separado. Público gratuito usa só a galeria (syncPublicDownloadToolbar). */
  function renderPublicDownloadsPanel() {
    if (state.salesModeActive || normKsAccessModeFromMeta() !== 'public') return;
    if (isPublicFreeDownloadGallery()) {
      $('ks-downloads-panel')?.classList.add('ks-hidden');
      $('ks-open-downloads')?.classList.add('ks-hidden');
      return;
    }

    const downloadsPanel = $('ks-downloads-panel');
    const downloadsMsg = $('ks-downloads-msg');
    const downloadsGrid = $('ks-downloads-grid');
    const downloadsActions = $('ks-downloads-actions');
    const downloadsSelectAll = $('ks-downloads-select-all');
    const downloadsCounter = $('ks-downloads-counter');
    const downloadsCounterIcon = $('ks-downloads-counter-icon');
    const downloadsCounterText = $('ks-downloads-counter-text');
    const setDownloadsCounter = (selectedCount, approvedCount) => {
      if (!downloadsCounter) return;
      const sel = Math.max(0, parseInt(selectedCount, 10) || 0);
      const app = Math.max(0, parseInt(approvedCount, 10) || 0);
      const msg = `${sel} selecionada(s) de ${app} no conjunto`;
      if (downloadsCounterText) downloadsCounterText.textContent = msg;
      else downloadsCounter.textContent = msg;
      downloadsCounter.classList.remove('ks-dl-counter--partial', 'ks-dl-counter--all');
      if (downloadsCounterIcon) {
        downloadsCounterIcon.classList.remove('fa-circle-minus', 'fa-triangle-exclamation', 'fa-circle-check');
      }
      if (app > 0 && sel >= app) {
        downloadsCounter.classList.add('ks-dl-counter--all');
        if (downloadsCounterIcon) downloadsCounterIcon.classList.add('fa-circle-check');
      } else if (sel > 0) {
        downloadsCounter.classList.add('ks-dl-counter--partial');
        if (downloadsCounterIcon) downloadsCounterIcon.classList.add('fa-triangle-exclamation');
      } else if (downloadsCounterIcon) {
        downloadsCounterIcon.classList.add('fa-circle-minus');
      }
    };

    const openDownloadsBtn = $('ks-open-downloads');
    if (!downloadsPanel || !downloadsGrid || !downloadsMsg || !openDownloadsBtn) return;

    const setDlMsg = (text) => {
      const t = String(text || '').trim();
      downloadsMsg.textContent = t;
      downloadsMsg.classList.toggle('ks-hidden', !t);
    };

    if (!state.photographerAllowsDownload) {
      downloadsPanel.classList.add('ks-hidden');
      downloadsActions?.classList.add('ks-hidden');
      setDownloadsProgress(0, 1, false);
      openDownloadsBtn.classList.add('ks-hidden');
      openDownloadsBtn.innerHTML = KS_OPEN_DOWNLOADS_BTN_HTML;
      return;
    }

    if (publicMustRegisterToDownload()) {
      downloadsPanel.classList.add('ks-hidden');
      downloadsActions?.classList.add('ks-hidden');
      setDlMsg('');
      setDownloadsProgress(0, 1, false);
      openDownloadsBtn.classList.remove('ks-hidden');
      openDownloadsBtn.innerHTML =
        '<i class="fas fa-download"></i> Baixar fotos <span style="opacity:.85;font-weight:700">(cadastro)</span>';
      renderPromoClientBanner();
      return;
    }

    openDownloadsBtn.innerHTML = KS_OPEN_DOWNLOADS_BTN_HTML;

    const lib = getApprovedDownloadsForClient();
    if (!state.allowDownload || !lib.length) {
      downloadsPanel.classList.add('ks-hidden');
      downloadsActions?.classList.add('ks-hidden');
      setDownloadsProgress(0, 1, false);
      openDownloadsBtn.classList.add('ks-hidden');
      renderPromoClientBanner();
      return;
    }

    const approvedIds = new Set(lib.map((x) => x.id));
    const selectedApproved = Array.from(state.downloadsSelected || new Set()).filter((id) =>
      approvedIds.has(parseInt(id, 10))
    );
    state.downloadsSelected = new Set(selectedApproved);
    if (!state.downloadsTouched && state.downloadsSelected.size === 0) {
      state.downloadsSelected = new Set(Array.from(approvedIds));
    }
    if (downloadsActions) downloadsActions.classList.remove('ks-hidden');
    setDownloadsCounter(state.downloadsSelected.size, approvedIds.size);
    if (downloadsSelectAll) {
      downloadsSelectAll.checked =
        state.downloadsSelected.size > 0 && state.downloadsSelected.size === approvedIds.size;
    }

    const cards = lib.map((p) => {
      const pid = p.id;
      const isChecked = state.downloadsSelected.has(pid);
      return `
          <div class="ks-ph">
            <label style="display:inline-flex;align-items:center;gap:6px;margin:6px 0 4px 0;font-size:11px;font-weight:700">
              <input type="checkbox" data-dl-pick="${pid}" ${isChecked ? 'checked' : ''} />
              Selecionar
            </label>
            <img src="${previewUrl(pid, false)}" alt="${escapeHtml(p.name || '')}" loading="lazy" />
            <div class="ks-ph-meta">${escapeHtml(p.name || `Foto #${pid}`)} <span class="ks-dl-badge-liberada">Disponível</span></div>
            <a class="ks-btn" href="${previewDownloadUrl(pid)}" download>
              <i class="fas fa-download"></i> Baixar
            </a>
          </div>
        `;
    });

    setDlMsg(
      'Galeria pública: baixe com marca d’água. Use os botões para várias fotos ou ZIP. As fotos seguem a qualidade definida pelo fotógrafo.'
    );
    downloadsGrid.innerHTML = cards.join('');
    downloadsGrid.querySelectorAll('input[data-dl-pick]').forEach((inp) => {
      inp.addEventListener('change', () => {
        const pid = parseInt(inp.getAttribute('data-dl-pick') || '0', 10) || 0;
        if (!pid) return;
        state.downloadsTouched = true;
        if (inp.checked) state.downloadsSelected.add(pid);
        else state.downloadsSelected.delete(pid);
        const allChecked = state.downloadsSelected.size > 0 && state.downloadsSelected.size === approvedIds.size;
        if (downloadsSelectAll) downloadsSelectAll.checked = allChecked;
        setDownloadsCounter(state.downloadsSelected.size, approvedIds.size);
      });
    });

    if (publicLockedDownloadPhaseActive() || state.publicDownloadsPanelOpen) {
      downloadsPanel.classList.remove('ks-hidden');
    } else {
      downloadsPanel.classList.add('ks-hidden');
    }
    openDownloadsBtn.classList.remove('ks-hidden');
    setDownloadsProgress(0, 1, false);
    renderPromoClientBanner();
  }

  function renderPublicDownloadHintBanner() {
    const el = $('ks-public-dl-hint');
    if (!el) return;
    if (state.salesModeActive || normKsAccessModeFromMeta() !== 'public') {
      el.classList.add('ks-hidden');
      el.innerHTML = '';
      return;
    }
    if (!state.photographerAllowsDownload) {
      el.classList.add('ks-hidden');
      el.innerHTML = '';
      return;
    }
    if (isPublicFreeDownloadGallery()) {
      el.classList.remove('ks-hidden');
      const wmNote = galleryWatermarkEnabled()
        ? ' (com marca d’água na visualização e no download)'
        : ' (sem marca d’água)';
      el.innerHTML = `
      <div style="border:1px solid rgba(34,197,94,.35);background:rgba(34,197,94,.1);color:#dcfce7;border-radius:12px;padding:12px 14px;font-size:13px;line-height:1.45;margin-bottom:10px">
        <strong>Todas as fotos liberadas</strong>${wmNote}. Use a <strong>seta</strong> em cada foto ou os botões <strong>Baixar selecionadas</strong> / <strong>Baixar todas</strong> / <strong>ZIP</strong> no topo.
      </div>`;
      return;
    }
    if (mustRegisterBeforeGallery() && publicJwtHasRegisteredClient() && state.allowDownload) {
      el.classList.remove('ks-hidden');
      el.innerHTML = `
      <div style="border:1px solid rgba(34,197,94,.35);background:rgba(34,197,94,.1);color:#dcfce7;border-radius:12px;padding:12px 14px;font-size:13px;line-height:1.45;margin-bottom:10px">
        <strong>Download liberado.</strong> Marque as fotos e use a <strong>seta de download</strong> em cada uma.
      </div>`;
      return;
    }
    if (!state.photographerAllowsDownload || state.allowDownload) {
      el.classList.add('ks-hidden');
      el.innerHTML = '';
      return;
    }
    el.classList.remove('ks-hidden');
    el.innerHTML = `
      <div style="border:1px solid rgba(250,204,21,.45);background:rgba(234,179,8,.12);color:#fef3c7;border-radius:12px;padding:12px 14px;font-size:13px;line-height:1.45;margin-bottom:10px">
        <strong>Download com marca d’água.</strong> Escolha as fotos; ao clicar em <strong>Baixar</strong> ou em <strong>Fotos para baixar</strong>, pedimos um cadastro rápido (nome, e-mail, WhatsApp) e liberamos na hora.
      </div>`;
  }

  /** PIX + comprovante no painel «Fotos para baixar» (modo vendas após envio). Some quando já não falta liberação nas fotos selecionadas. */
  function renderDownloadsPixBanner() {
    const wrap = $('ks-downloads-pix-wrap');
    const block = $('ks-dl-pix-block');
    const holder = $('ks-dl-pix-holder');
    const keyEl = $('ks-dl-pix-key');
    const copyBtn = $('ks-dl-pix-copy');
    if (!wrap) return;
    const approved = getSalesApprovedEntries();
    const approvedIds = new Set(approved.map((a) => parseInt(a.photo_id, 10)).filter(Boolean));
    const selectedForClient = Array.isArray(state.gallery?.photos)
      ? state.gallery.photos.filter((p) => state.selected.has(parseInt(p?.id, 10)))
      : [];
    const allSelectedReleased =
      selectedForClient.length > 0 &&
      selectedForClient.every((p) => approvedIds.has(parseInt(p.id, 10)));
    const show =
      !!(state.salesModeActive && state.locked && state.clientAuthenticated) && !allSelectedReleased;
    if (!show) {
      wrap.classList.add('ks-hidden');
      return;
    }
    wrap.classList.remove('ks-hidden');
    const cfg = state.salesConfig || {};
    const pixKey = String(cfg.pix_key || '').trim();
    const pixHolder = String(cfg.pix_holder_name || '').trim();
    if (block) block.classList.toggle('ks-hidden', !pixKey);
    if (holder) holder.textContent = pixHolder || '—';
    if (keyEl) keyEl.textContent = pixKey || '—';
    if (copyBtn) copyBtn.setAttribute('data-pix-key', pixKey || '');
  }

  function authHeaders(json) {
    const h = { Authorization: `Bearer ${jwt}` };
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }

  function previewUrl(photoId, thumb) {
    const q = new URLSearchParams({ slug, token: jwt || '', v: 'wm6' });
    if (thumb) q.set('thumb', '1');
    const base = resolveKsApiBase();
    return `${base}/api/king-selection/client/photos/${photoId}/preview?${q.toString()}`;
  }

  function galleryWatermarkEnabled() {
    if (state.gallery && typeof state.gallery.watermark_enabled === 'boolean') {
      return state.gallery.watermark_enabled;
    }
    const m = String(state.gallery?.watermark_mode || '').trim().toLowerCase();
    return m !== 'none' && m !== '';
  }

  function previewDownloadUrl(photoId) {
    const q = new URLSearchParams({ slug, token: jwt || '', download: '1' });
    return `${resolveKsApiBase()}/api/king-selection/client/photos/${photoId}/preview?${q.toString()}`;
  }

  function isMobileDownloadContext() {
    const ua = String(navigator.userAgent || navigator.vendor || '').toLowerCase();
    const touch = (navigator.maxTouchPoints || 0) > 0;
    return /iphone|ipad|ipod|android|mobile/.test(ua) || touch;
  }

  function parseFilenameFromContentDisposition(v) {
    const raw = String(v || '').trim();
    if (!raw) return '';
    const utf8 = raw.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
    if (utf8 && utf8[1]) {
      try { return decodeURIComponent(utf8[1]).replace(/["']/g, '').trim(); } catch (_) { }
    }
    const simple = raw.match(/filename\s*=\s*"?([^";]+)"?/i);
    if (simple && simple[1]) return String(simple[1]).trim();
    return '';
  }

  function getApprovedDownloadsForClient() {
    if (isPublicFreeDownloadGallery()) {
      const list = getPublicGalleryPhotoList();
      if (list.length) return list;
    }
    const modeKs = normKsAccessModeFromMeta();
    if (
      modeKs === 'public' &&
      state.allowDownload &&
      Array.isArray(state.approvedPhotoIds) &&
      state.approvedPhotoIds.length
    ) {
      const byId = new Map((state.gallery?.photos || []).map((p) => [parseInt(p.id, 10), p]));
      return state.approvedPhotoIds
        .map((raw) => parseInt(raw, 10))
        .filter((n) => Number.isFinite(n) && n > 0)
        .map((pid) => {
          const p = byId.get(pid);
          return {
            id: pid,
            name: String(p?.original_name || `foto-${pid}`).trim() || `foto-${pid}`
          };
        });
    }
    const approved = getSalesApprovedEntries();
    return approved
      .map((a) => {
        const pid = parseInt(a.photo_id, 10) || 0;
        if (!pid) return null;
        return { id: pid, name: String(a.original_name || `foto-${pid}`).trim() || `foto-${pid}` };
      })
      .filter(Boolean);
  }

  /** Seleção já enviada + modo público + há fotos no painel «Fotos para baixar»: esconder grelha duplicada. */
  function publicLockedDownloadPhaseActive() {
    if (isPublicFreeDownloadGallery()) return false;
    if (state.salesModeActive) return false;
    if (normKsAccessModeFromMeta() !== 'public') return false;
    if (!state.locked) return false;
    if (!state.photographerAllowsDownload || !state.allowDownload) return false;
    if (publicMustRegisterToDownload()) return false;
    return getApprovedDownloadsForClient().length > 0;
  }

  function syncPublicLockedDownloadMinimalClass() {
    $('ks-step-gallery')?.classList.toggle('ks-public-dl-minimal', publicLockedDownloadPhaseActive());
  }

  /** Modo vendas após envio: só painel de download (marca d'água) — sem grelha de seleção. */
  function salesPostSubmitPhaseActive() {
    return !!(state.salesModeActive && state.locked);
  }

  function syncSalesPostSubmitLayout() {
    const on = salesPostSubmitPhaseActive();
    $('ks-step-gallery')?.classList.toggle('ks-sales-post-submit', on);
    document.body.classList.toggle('ks-sales-post-submit', on);
    const bar = $('ks-sales-confirm-bar');
    if (bar) bar.classList.add('ks-hidden');
    if (on) {
      $('ks-downloads-panel')?.classList.remove('ks-hidden');
      $('ks-step-confirm')?.classList.add('ks-hidden');
      $('ks-step-compare')?.classList.add('ks-hidden');
      $('ks-step-gallery')?.classList.remove('ks-hidden');
    }
  }

  function syncSalesConfirmBar() {
    const bar = $('ks-sales-confirm-bar');
    if (!bar) return;
    const n = state.selected?.size || 0;
    const show = !!(state.salesModeActive && !state.locked && n > 0 && !confirmStepOpen() && !compareStepOpen());
    bar.classList.toggle('ks-hidden', !show);
    const cnt = $('ks-sales-confirm-count');
    if (cnt) cnt.textContent = `${n} foto(s) selecionada(s)`;
  }

  const KS_DL_ZIP_AUTO_BYTES = 500 * 1024 * 1024;
  const KS_DL_ZIP_AUTO_COUNT = 35;

  async function fetchDownloadZipPlan(photoIds) {
    const ids = Array.isArray(photoIds) ? photoIds.map((x) => parseInt(x, 10)).filter(Boolean) : [];
    if (!ids.length) throw new Error('Nenhuma foto para planear o download.');
    const res = await fetch(`${API}/api/king-selection/client/download-zip-plan`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({ slug, photo_ids: ids })
    });
    let data = {};
    try { data = await res.json(); } catch (_) { /* ignore */ }
    if (!res.ok) {
      if (handleClientUnauthorized(res, data)) return null;
      throw new Error(data?.message || 'Não foi possível planear o download.');
    }
    return data;
  }

  async function downloadZipPartBlob(photoIds, partNum) {
    const res = await fetch(`${API}/api/king-selection/client/download-zip`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({
        slug,
        photo_ids: photoIds,
        zip_part: partNum > 0 ? partNum : undefined
      })
    });
    if (!res.ok) {
      let msg = 'Erro ao gerar ZIP.';
      let data = {};
      try {
        data = await res.json();
        msg = data?.message || msg;
      } catch (_) {
        const t = await res.text().catch(() => '');
        if (t) msg = t;
      }
      if (handleClientUnauthorized(res, data)) return null;
      throw new Error(msg);
    }
    return res.blob();
  }

  function triggerBlobDownload(blob, filename) {
    const a = document.createElement('a');
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  async function downloadApprovedZipParts(plan, photoIdsFallback) {
    const parts = Array.isArray(plan?.parts) && plan.parts.length
      ? plan.parts
      : [{ part: 1, photo_ids: photoIdsFallback }];
    const baseName = `${(state.gallery?.nome_projeto || slug || 'fotos').toString().replace(/[^\w\-]+/g, '_')}`;
    const suffix = normKsAccessModeFromMeta() === 'public' ? 'galeria' : 'aprovadas';
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      const pnum = parseInt(part.part, 10) || (i + 1);
      const ids = Array.isArray(part.photo_ids) ? part.photo_ids : [];
      if (!ids.length) continue;
      setDownloadsProgress(i, parts.length, true, 'zip');
      const blob = await downloadZipPartBlob(ids, pnum);
      if (!blob) return;
      const partLabel = parts.length > 1 ? `_parte${pnum}` : '';
      triggerBlobDownload(blob, `${baseName}_${suffix}${partLabel}.zip`);
      if (i < parts.length - 1) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 1200));
      }
    }
    setDownloadsProgress(parts.length, parts.length, true, 'zip');
  }

  async function downloadAllPhotosSmart(photoIds, opts) {
    const ids = Array.isArray(photoIds) ? photoIds.map((x) => parseInt(x, 10)).filter(Boolean) : [];
    if (!ids.length) throw new Error('Nenhuma foto para baixar.');
    if (publicMustRegisterToDownload()) {
      pendingPublicDownloadAction = {
        type: 'sequential',
        photoIds: ids.slice()
      };
      openPublicRegisterModal();
      return { mode: 'pending' };
    }
    let plan = null;
    try {
      plan = await fetchDownloadZipPlan(ids);
    } catch (_) {
      plan = null;
    }
    const totalBytes = parseInt(plan?.total_approx_bytes, 10) || 0;
    const partCount = Array.isArray(plan?.parts) ? plan.parts.length : 1;
    const useZip = partCount > 1 || totalBytes > KS_DL_ZIP_AUTO_BYTES || ids.length > KS_DL_ZIP_AUTO_COUNT;
    if (useZip && plan) {
      setDownloadsProgress(0, partCount || 1, true, 'zip');
      await downloadApprovedZipParts(plan, ids);
      return { mode: 'zip', parts: partCount };
    }
    await downloadPhotosSequentially(ids, opts);
    return { mode: 'sequential' };
  }

  async function downloadPhotosSequentially(photoIds, opts) {
    if (publicMustRegisterToDownload()) {
      pendingPublicDownloadAction = {
        type: 'sequential',
        photoIds: Array.isArray(photoIds) ? photoIds.map((x) => parseInt(x, 10)).filter(Boolean) : []
      };
      openPublicRegisterModal();
      return;
    }
    const ids = Array.isArray(photoIds) ? photoIds.map((x) => parseInt(x, 10)).filter(Boolean) : [];
    if (!ids.length) throw new Error('Nenhuma foto selecionada para baixar.');
    const onProgress = typeof opts?.onProgress === 'function' ? opts.onProgress : null;
    const approvedMap = new Map(getApprovedDownloadsForClient().map((p) => [p.id, p.name]));
    for (let i = 0; i < ids.length; i += 1) {
      const pid = ids[i];
      if (onProgress) onProgress(i + 1, ids.length);
      const res = await fetch(previewDownloadUrl(pid), {
        method: 'GET',
        headers: authHeaders(false)
      });
      let dataErr = {};
      if (!res.ok) {
        dataErr = await res.json().catch(() => ({}));
      }
      if (handleClientUnauthorized(res, dataErr)) return;
      if (!res.ok) {
        throw new Error(dataErr?.message || `Falha ao baixar foto #${pid}.`);
      }
      const blob = await res.blob();
      const fromHeader = parseFilenameFromContentDisposition(res.headers.get('content-disposition'));
      const fallback = String(approvedMap.get(pid) || `foto-${pid}.jpg`).trim() || `foto-${pid}.jpg`;
      const filename = fromHeader || fallback;
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(objUrl), 5000);
      // Pequeno intervalo para o navegador processar os downloads.
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 260));
    }
  }

  function setDownloadsProgress(done, total, visible, mode) {
    const wrap = $('ks-downloads-progress');
    const bar = $('ks-downloads-progress-bar');
    const pct = $('ks-downloads-progress-pct');
    const text = $('ks-downloads-progress-text');
    if (!wrap || !bar || !pct || !text) return;
    const m = String(mode || '').toLowerCase();
    const styleByMode = {
      selected: 'linear-gradient(90deg,#fb923c,#f59e0b)', // laranja
      all: 'linear-gradient(90deg,#22d3ee,#3b82f6)', // azul
      zip: 'linear-gradient(90deg,#a78bfa,#7c3aed)' // roxo
    };
    const bg = styleByMode[m] || styleByMode.all;
    if (!visible) {
      wrap.classList.add('ks-hidden');
      bar.style.width = '0%';
      bar.style.background = styleByMode.all;
      pct.textContent = '0%';
      text.textContent = 'Baixando...';
      return;
    }
    const t = Math.max(1, parseInt(total, 10) || 1);
    const d = Math.max(0, Math.min(t, parseInt(done, 10) || 0));
    const p = Math.round((d / t) * 100);
    wrap.classList.remove('ks-hidden');
    bar.style.width = `${p}%`;
    bar.style.background = bg;
    pct.textContent = `${p}%`;
    if (m === 'zip') {
      text.textContent = t > 1
        ? (p >= 100 ? `ZIP ${d}/${t} pronto` : `Preparando ZIP ${d + 1}/${t}...`)
        : (p >= 100 ? 'ZIP pronto' : 'Preparando ZIP...');
    } else {
      text.textContent = `Baixando ${d}/${t}`;
    }
  }

  async function downloadApprovedZip(photoIds) {
    const ids = Array.isArray(photoIds) ? photoIds.map((x) => parseInt(x, 10)).filter(Boolean) : [];
    if (!ids.length) throw new Error('Nenhuma foto selecionada para ZIP.');
    if (publicMustRegisterToDownload()) {
      pendingPublicDownloadAction = { type: 'zip', photoIds: ids.slice() };
      openPublicRegisterModal();
      return;
    }
    const plan = await fetchDownloadZipPlan(ids);
    if (!plan) return;
    await downloadApprovedZipParts(plan, ids);
  }

  function normalizeExportName(n) {
    let s = String(n || '').trim();
    s = s.replace(/^.*[\\/]/, '');
    const dot = s.lastIndexOf('.');
    if (dot > 0) s = s.slice(0, dot);
    return s.trim();
  }

  function primaryCodeFromBase(base) {
    const s = String(base);
    const matches = [...s.matchAll(/([A-Za-z]{2,})0*(\d+)/gi)];
    if (!matches.length) return null;
    const m = matches[matches.length - 1];
    return { letters: m[1].toUpperCase(), num: parseInt(m[2], 10) };
  }

  function digitTokenMatchesBase(base, digitToken) {
    const tok = String(digitToken);
    if (!/^\d+$/.test(tok)) return false;
    const n = parseInt(tok, 10);
    if (Number.isNaN(n)) return false;
    const runs = String(base).match(/\d+/g) || [];
    const allowSubstring = tok.length >= 3 || n >= 100;
    for (const run of runs) {
      if (parseInt(run, 10) === n) return true;
      if (allowSubstring && run.includes(tok)) return true;
      if (!allowSubstring && run === tok) return true;
    }
    return false;
  }

  function tokenMatchesPhotoBase(base, token) {
    const raw = String(token).trim();
    if (!raw) return false;
    const t = raw.replace(/\s+/g, '');
    const b = String(base).replace(/\s+/g, '');
    if (b.toLowerCase() === raw.toLowerCase() || b.toLowerCase() === t.toLowerCase()) return true;
    const code = primaryCodeFromBase(b);
    if (/^\d+$/.test(t)) {
      const n = parseInt(t, 10);
      if (code && code.num === n) return true;
      if (digitTokenMatchesBase(b, t)) return true;
      if (!code) {
        const re = new RegExp(`(^|[^0-9])0*${n}([^0-9]|$)`);
        return re.test(b);
      }
      return false;
    }
    const tm = t.match(/^([A-Za-z]{2,})0*(\d+)$/i);
    if (tm && code) {
      return tm[1].toUpperCase() === code.letters && parseInt(tm[2], 10) === code.num;
    }
    if (code) {
      const alnum = t.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      if (alnum === `${code.letters}${code.num}`) return true;
    }
    return b.toLowerCase().includes(t.toLowerCase()) || b.toLowerCase().includes(raw.toLowerCase());
  }

  function parseSearchTokens(raw) {
    return String(raw || '')
      .replace(/[,;\n\r]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }

  function photoMatchesToken(p, token) {
    const t = String(token).trim();
    if (!t) return false;
    if (/^\d+$/.test(t.replace(/\s+/g, ''))) {
      const n = parseInt(t.replace(/\s+/g, ''), 10);
      if (Number.isFinite(n) && Number(p.id) === n) return true;
    }
    const base = normalizeExportName(p.original_name);
    return tokenMatchesPhotoBase(base, t);
  }

  function filterPhotosBySearch(photos, searchRaw) {
    const tokens = parseSearchTokens(searchRaw);
    if (!tokens.length) return photos.slice();
    const out = [];
    const seen = new Set();
    for (const p of photos) {
      if (tokens.some(tok => photoMatchesToken(p, tok))) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          out.push(p);
        }
      }
    }
    return out;
  }

  function sortPhotos(photos, mode) {
    const arr = photos.slice();
    if (mode === 'name') {
      arr.sort((a, b) => cmpNaturalText(a.original_name, b.original_name) || ((a.id || 0) - (b.id || 0)));
      return arr;
    }
    if (mode === 'id') {
      arr.sort((a, b) => (a.id || 0) - (b.id || 0));
      return arr;
    }
    arr.sort((a, b) => {
      const oa = parseInt(a.order, 10) || 0;
      const ob = parseInt(b.order, 10) || 0;
      if (oa !== ob) return oa - ob;
      return (a.id || 0) - (b.id || 0);
    });
    return arr;
  }

  /** Lote da seleção no servidor; sem chave, assume 1 (dados antigos / backfill). */
  function effectiveSelectionBatch(photoId) {
    const bRaw = parseInt(state.batchByPhoto[String(photoId)], 10);
    return Number.isFinite(bRaw) ? bRaw : 1;
  }

  function isFrozenPhoto(photoId) {
    if (!state.selected.has(photoId)) return false;
    if (state.frozenIds && state.frozenIds.has(photoId)) return true;
    if (!state.hasSelectionBatch) return false;
    return effectiveSelectionBatch(photoId) < state.currentRound;
  }

  /** Fotos escolhidas nesta rodada (ainda não “congeladas”). */
  function countSelectedThisRound() {
    let n = 0;
    for (const id of state.selected) {
      if (!isFrozenPhoto(id)) n++;
    }
    return n;
  }

  /** Limite de contrato: em galerias com rodadas, só conta a seleção atual. */
  function effectiveSelectedCountForMaxLimit() {
    return state.hasSelectionBatch ? countSelectedThisRound() : state.selected.size;
  }

  const _toggleInFlight = new Set();
  let _gridPreviewIo = null;

  function disconnectGridPreviewIo() {
    if (_gridPreviewIo) {
      try { _gridPreviewIo.disconnect(); } catch (_) { }
      _gridPreviewIo = null;
    }
  }

  function runPreviewPool(items, limit, worker) {
    const queue = items.slice();
    const runners = Array.from({ length: Math.max(1, limit) }).map(async () => {
      while (queue.length) {
        const it = queue.shift();
        // eslint-disable-next-line no-await-in-loop
        await worker(it);
      }
    });
    return Promise.all(runners);
  }

  function loadGridPreviewImg(img) {
    if (!img || img.getAttribute('data-preview-loaded') === '1' || img.getAttribute('data-preview-loading') === '1') {
      return Promise.resolve();
    }
    const url = String(img.getAttribute('data-src') || '').trim();
    if (!url) return Promise.resolve();
    const pid = parseInt(img.getAttribute('data-photo-id') || '0', 10) || 0;
    img.setAttribute('data-preview-loading', '1');
    img.classList.add('ks-img-loading');
    const wrap = img.closest('.ks-ph-imgwrap');
    wrap?.classList.add('ks-ph-imgwrap--loading');

    const attempt = (srcUrl) => new Promise((resolve, reject) => {
      const curPid = parseInt(img.getAttribute('data-photo-id') || '0', 10) || 0;
      if (pid && curPid !== pid) { resolve(); return; }
      const onOk = () => { cleanup(); resolve(); };
      const onErr = () => { cleanup(); reject(new Error('preview')); };
      const cleanup = () => {
        img.removeEventListener('load', onOk);
        img.removeEventListener('error', onErr);
      };
      img.addEventListener('load', onOk, { once: true });
      img.addEventListener('error', onErr, { once: true });
      if (img.getAttribute('src') !== srcUrl) img.setAttribute('src', srcUrl);
      else if (img.complete && img.naturalWidth > 0) onOk();
    });

    const finishOk = () => {
      img.classList.remove('ks-img-loading');
      img.classList.add('ks-img-loaded');
      img.setAttribute('data-preview-loaded', '1');
      img.removeAttribute('data-preview-error');
      wrap?.classList.remove('ks-ph-imgwrap--loading', 'ks-ph-imgwrap--error');
    };
    const finishErr = () => {
      img.classList.remove('ks-img-loading');
      img.classList.add('ks-img-error');
      img.setAttribute('data-preview-error', '1');
      wrap?.classList.remove('ks-ph-imgwrap--loading');
      wrap?.classList.add('ks-ph-imgwrap--error');
    };

    return attempt(url)
      .then(finishOk)
      .catch(() => new Promise((r) => setTimeout(r, 700))
        .then(() => {
          img.removeAttribute('src');
          return attempt(url);
        })
        .then(finishOk)
        .catch(finishErr))
      .finally(() => { img.removeAttribute('data-preview-loading'); });
  }

  function hydrateGridPreviews(grid) {
    disconnectGridPreviewIo();
    if (!grid) return;
    const imgs = Array.from(grid.querySelectorAll('img[data-photo-id][data-src]'))
      .filter((img) => img.getAttribute('data-preview-loaded') !== '1');
    if (!imgs.length) return;

    const loadOne = (img) => loadGridPreviewImg(img);

    if (typeof IntersectionObserver !== 'undefined') {
      _gridPreviewIo = new IntersectionObserver((entries) => {
        entries.forEach((ent) => {
          if (!ent.isIntersecting) return;
          const img = ent.target;
          try { _gridPreviewIo.unobserve(img); } catch (_) { }
          loadOne(img);
        });
      }, { root: null, rootMargin: '320px 0px', threshold: 0.01 });
      imgs.forEach((img) => _gridPreviewIo.observe(img));
      imgs.slice(0, 20).forEach((img) => {
        try { _gridPreviewIo.unobserve(img); } catch (_) { }
        loadOne(img);
      });
    } else {
      runPreviewPool(imgs, 6, loadOne).catch(() => { });
    }
  }

  function photoCardBubbleLabel(sel, fr, publicFree) {
    if (fr) return 'Bloqueada (seleção anterior)';
    if (sel) return 'Desmarcar';
    return publicFree ? 'Marcar (opcional)' : 'Selecionar';
  }

  function photoCardBarActionHtml(p, sel, fr, showSelTag, batch, publicFree) {
    if (fr) {
      return '<span class="ks-ph-act ks-ph-act--lock"><i class="fas fa-lock"></i> Bloqueada</span>';
    }
    if (sel) {
      return `<button type="button" class="ks-ph-act ks-ph-act--remove" data-strip="${p.id}"><i class="fas fa-times"></i> ${publicFree ? 'Desmarcar' : 'Remover'}</button>`;
    }
    return `<button type="button" class="ks-ph-act ks-ph-act--add" data-strip="${p.id}"><i class="fas fa-check"></i> ${publicFree ? 'Marcar' : 'Selecionar'}</button>`;
  }

  function updatePhotoCardUi(photoId) {
    const pid = normalizePhotoId(photoId);
    if (!pid) return false;
    const grid = $('ks-grid');
    if (!grid) return false;
    const el = grid.querySelector(`.ks-ph[data-pid="${pid}"]`);
    if (!el) return false;
    const p = (state.gallery?.photos || []).find((ph) => ph.id === pid);
    if (!p) return false;

    const sel = state.selected.has(pid);
    const fr = sel && isFrozenPhoto(pid);
    const anyFrozenInGallery = [...state.selected].some((id) => isFrozenPhoto(id));
    const batch = parseInt(state.batchByPhoto[String(pid)], 10) || 1;
    const publicFree = isPublicFreeDownloadGallery();
    const bubbleLabel = photoCardBubbleLabel(sel, fr, publicFree);

    el.classList.toggle('selected', sel);
    el.classList.toggle('frozen', fr);

    const bubble = el.querySelector('.ks-check-btn');
    if (bubble) {
      bubble.className = ['ks-check-btn', sel ? 'ks-check-btn--on' : '', fr ? 'ks-check-btn--frozen' : ''].filter(Boolean).join(' ');
      bubble.disabled = fr;
      bubble.setAttribute('data-check', String(pid));
      bubble.setAttribute('aria-label', bubbleLabel);
      bubble.setAttribute('title', bubbleLabel);
      bubble.innerHTML = sel ? '<i class="fas fa-check" aria-hidden="true"></i>' : '';
    }

    const barMain = el.querySelector('.ks-ph-bar-main');
    if (barMain) {
      const showSelTag = sel && anyFrozenInGallery;
      const action = photoCardBarActionHtml(p, sel, fr, showSelTag, batch, publicFree);
      const tag = showSelTag ? ` <span class="ks-ph-batch">S${batch}</span>` : '';
      barMain.innerHTML = `${action}${tag}`;
    }
    return true;
  }

  function syncSelectionUiAfterChange(photoId) {
    if (!updatePhotoCardUi(photoId)) renderGrid();
    else {
      renderSalesUi();
      updateHeaderCounts();
      syncPublicDownloadToolbar();
      refreshSecondarySteps();
      syncSingleViewerSelectUI();
      syncFolderSelectAllToolbar();
      syncEditRequestToolbar();
    }
  }

  function resetGridVirtualPaging() {
    state.gridVirtualShown = KS_VIRTUAL_BATCH;
  }

  function usesVirtualGridPaging(list) {
    return Array.isArray(list) && list.length > KS_VIRTUAL_THRESHOLD;
  }

  function getGridSliceForVirtual(list) {
    if (!usesVirtualGridPaging(list)) return list;
    return list.slice(0, state.gridVirtualShown);
  }

  let _gridVirtualSentinelIo = null;

  function disconnectGridVirtualSentinelIo() {
    if (_gridVirtualSentinelIo) {
      try { _gridVirtualSentinelIo.disconnect(); } catch (_) { }
      _gridVirtualSentinelIo = null;
    }
  }

  function buildPhotoCardHtml(p, anyFrozenInGallery, publicFree) {
    const sel = state.selected.has(p.id);
    const fr = sel && isFrozenPhoto(p.id);
    const batch = parseInt(state.batchByPhoto[String(p.id)], 10) || 1;
    const showSelTag = sel && anyFrozenInGallery;
    const bubbleClass = ['ks-check-btn'];
    if (sel) bubbleClass.push('ks-check-btn--on');
    if (fr) bubbleClass.push('ks-check-btn--frozen');
    const bubbleLabel = fr
      ? 'Bloqueada (seleção anterior)'
      : sel
        ? 'Desmarcar'
        : publicFree
          ? 'Marcar (opcional)'
          : 'Selecionar';
    const barAction = fr
      ? '<span class="ks-ph-act ks-ph-act--lock"><i class="fas fa-lock"></i> Bloqueada</span>'
      : sel
        ? `<button type="button" class="ks-ph-act ks-ph-act--remove" data-strip="${p.id}"><i class="fas fa-times"></i> ${publicFree ? 'Desmarcar' : 'Remover'}</button>`
        : `<button type="button" class="ks-ph-act ks-ph-act--add" data-strip="${p.id}"><i class="fas fa-check"></i> ${publicFree ? 'Marcar' : 'Selecionar'}</button>`;
    const dl =
      state.photographerAllowsDownload && jwt
        ? state.allowDownload
          ? `<a class="ks-ph-dl r" href="${previewDownloadUrl(p.id)}" download target="_blank" rel="noopener" title="Descarregar" aria-label="Descarregar"><i class="fas fa-download"></i></a>`
          : `<button type="button" class="ks-ph-dl r" data-pub-dl="${p.id}" title="Descarregar — cadastro ao baixar" aria-label="Descarregar"><i class="fas fa-download"></i></button>`
        : '';
    return `
        <div class="ks-ph ${sel ? 'selected' : ''} ${fr ? 'frozen' : ''}" data-pid="${p.id}">
          <button type="button" class="${bubbleClass.join(' ')}" data-check="${p.id}" aria-label="${bubbleLabel}" title="${bubbleLabel}" ${fr ? 'disabled' : ''}>
            ${sel ? '<i class="fas fa-check" aria-hidden="true"></i>' : ''}
          </button>
          <div class="ks-ph-imgwrap ks-ph-imgwrap--loading" data-strip-zone="${p.id}" role="button" tabindex="0" aria-label="Alternar seleção">
            <img data-photo-id="${p.id}" data-src="${previewUrl(p.id, true)}" alt="" width="200" height="300" referrerpolicy="no-referrer" decoding="async" class="ks-img-loading" />
          </div>
          <div class="ks-ph-bar">
            <div class="ks-ph-bar-main">${barAction}${showSelTag ? ` <span class="ks-ph-batch">S${batch}</span>` : ''}</div>
            ${dl}
            <button type="button" class="r" data-expand="${p.id}" title="Ampliar"><i class="fas fa-expand"></i></button>
          </div>
        </div>`;
  }

  function updateVirtualGridHint(list) {
    const el = $('ks-virtual-grid-hint');
    if (!el) return;
    if (!usesVirtualGridPaging(list)) {
      el.classList.add('ks-hidden');
      el.textContent = '';
      return;
    }
    const shown = Math.min(state.gridVirtualShown, list.length);
    el.textContent = `A mostrar ${shown} de ${list.length} fotos — continue a rolar para carregar mais`;
    el.classList.remove('ks-hidden');
  }

  function setupGridVirtualSentinel(grid, list) {
    disconnectGridVirtualSentinelIo();
    if (!grid || !usesVirtualGridPaging(list) || state.gridVirtualShown >= list.length) {
      grid?.querySelector('.ks-grid-sentinel')?.remove();
      updateVirtualGridHint(list);
      return;
    }
    let sentinel = grid.querySelector('.ks-grid-sentinel');
    if (!sentinel) {
      sentinel = document.createElement('div');
      sentinel.className = 'ks-grid-sentinel';
      sentinel.setAttribute('aria-hidden', 'true');
      grid.appendChild(sentinel);
    } else {
      grid.appendChild(sentinel);
    }
    updateVirtualGridHint(list);
    if (typeof IntersectionObserver === 'undefined') return;
    _gridVirtualSentinelIo = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) loadMoreVirtualGridPhotos();
    }, { root: null, rootMargin: '500px 0px', threshold: 0.01 });
    _gridVirtualSentinelIo.observe(sentinel);
  }

  function loadMoreVirtualGridPhotos() {
    const list = getOrderedPhotosForGrid();
    if (!usesVirtualGridPaging(list) || state.gridVirtualShown >= list.length) return;
    const prevShown = state.gridVirtualShown;
    state.gridVirtualShown = Math.min(list.length, state.gridVirtualShown + KS_VIRTUAL_BATCH);
    const chunk = list.slice(prevShown, state.gridVirtualShown);
    const grid = $('ks-grid');
    if (!grid || !chunk.length) return;
    grid.querySelector('.ks-grid-sentinel')?.remove();
    const anyFrozenInGallery = [...state.selected].some((id) => isFrozenPhoto(id));
    const publicFree = isPublicFreeDownloadGallery();
    grid.insertAdjacentHTML('beforeend', chunk.map((p) => buildPhotoCardHtml(p, anyFrozenInGallery, publicFree)).join(''));
    setupGridVirtualSentinel(grid, list);
    hydrateGridPreviews(grid);
  }

  function publicEditRequestEnabled() {
    if (normKsAccessModeFromMeta() !== 'public') return false;
    if (state.allowClientEditRequest === true) return true;
    try {
      const boot = window.__KS_BOOT_GALLERY_META;
      if (boot && boot.allow_client_edit_request === true) return true;
    } catch (_) { /* ignore */ }
    return false;
  }

  function ensureClientEditRequestButton() {
    if ($('ks-send-edit')) return;
    const clearBtn = $('ks-clear');
    if (!clearBtn || !clearBtn.parentNode) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'ks-send-edit';
    btn.className = 'ks-btn ks-btn-edit-req ks-hidden';
    btn.hidden = true;
    btn.setAttribute('aria-hidden', 'true');
    btn.title = 'Enviar fotos marcadas para edição';
    btn.innerHTML = '<i class="fas fa-magic"></i> Enviar para edição';
    clearBtn.insertAdjacentElement('afterend', btn);
    btn.addEventListener('click', () => submitEditRequest());
  }

  function syncEditRequestToolbar() {
    ensureClientEditRequestButton();
    const btn = $('ks-send-edit');
    if (!btn) return;
    const show = publicEditRequestEnabled() && !selectionLockedForUi();
    btn.classList.toggle('ks-hidden', !show);
    btn.hidden = !show;
    btn.style.display = show ? '' : 'none';
    btn.setAttribute('aria-hidden', show ? 'false' : 'true');
    const n = countSelectedThisRound();
    btn.disabled = n === 0;
    btn.title = n > 0
      ? `Enviar ${n} foto(s) marcada(s) para edição`
      : 'Marque as fotos que deseja enviar para edição';
  }

  async function submitEditRequest() {
    if (!publicEditRequestEnabled()) return;
    const ids = [...state.selected].filter((id) => !isFrozenPhoto(id));
    if (!ids.length) {
      toast('Marque pelo menos uma foto para enviar à edição.', 'err');
      return;
    }
    if (!publicJwtHasRegisteredClient() && !state.resolvedClientId) {
      toast('Cadastre-se na galeria antes de enviar fotos para edição.', 'err');
      return;
    }
    const note = window.prompt(
      'Observação para o fotógrafo (opcional):\nEx.: remover fundo, ajustar cor, recorte…',
      ''
    );
    if (note === null) return;
    const btn = $('ks-send-edit');
    try {
      if (btn) btn.disabled = true;
      const res = await fetch(`${API}/api/king-selection/client/edit-request`, {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({ slug, photo_ids: ids, note: note || undefined })
      });
      const data = await res.json().catch(() => ({}));
      if (handleClientUnauthorized(res, data)) return;
      if (!res.ok) throw new Error(data.message || 'Erro ao enviar pedido');
      toast(data.message || `${ids.length} foto(s) enviada(s) para edição.`, 'ok');
    } catch (e) {
      toast(e.message || 'Erro ao enviar', 'err');
    } finally {
      syncEditRequestToolbar();
    }
  }

  /** Lotes (selection_batch) já confirmados em rodadas anteriores. */
  function frozenBatchNumberSet() {
    const s = new Set();
    for (const id of state.selected) {
      if (!isFrozenPhoto(id)) continue;
      s.add(effectiveSelectionBatch(id));
    }
    return s;
  }

  /**
   * Nível exibido ao cliente: próxima rodada “humana” após o maior lote congelado.
   * Evita mostrar 4 no topo quando na grelha só existem S1, S2 (buraco no contador do servidor).
   */
  function clientVisibleRoundLevel() {
    const frozen = frozenBatchNumberSet();
    if (frozen.size === 0) return 1;
    return Math.max(...frozen) + 1;
  }

  function normKsAccessModeFromMeta() {
    let m = String(galleryMeta?.access_mode || 'private').toLowerCase().trim();
    if (m === 'password') m = 'signup';
    return m;
  }

  /** Só modo público: cadastro na entrada e download liberado após cadastro (não mistura com privado / vendidas / autocadastro). */
  function mustRegisterBeforeGallery() {
    if (!galleryMeta) return false;
    return normKsAccessModeFromMeta() === 'public';
  }

  function hasRegisteredClientFromData(data) {
    if (normKsAccessModeFromMeta() === 'public') {
      if (data?.clientRegistered === true) return true;
      if (jwtPayloadClientId() > 0) return true;
      if (data?.clientContactPrefill?.email) return true;
      return false;
    }
    const rid = parseInt(data?.resolvedClientId, 10) || 0;
    if (rid <= 0) return false;
    if (data?.clientAuthenticated === false) return false;
    return true;
  }

  function publicJwtHasRegisteredClient() {
    if (jwtPayloadClientId() > 0) return true;
    return parseInt(state.resolvedClientId, 10) > 0 && !!(state.clientContactPrefill?.email);
  }

  /**
   * Modo público: sempre pedir nome/e-mail/WhatsApp no Confirmar.
   * O JWT pode ter `resolvedClientId` por sessão/rosto/cupom (e-mail técnico __ks_face_sess_...), mas o finalize
   * ainda exige dados reais no body — sem isto o utilizador via toast sem campos visíveis.
   */
  function confirmStepNeedsContactFields() {
    if (state.salesModeActive) return true;
    if (state.deferredSignupActive && !publicJwtHasRegisteredClient()) return true;
    if (normKsAccessModeFromMeta() === 'public' && !publicJwtHasRegisteredClient()) return true;
    return false;
  }

  function publicMustRegisterToDownload() {
    return (
      normKsAccessModeFromMeta() === 'public' &&
      !!state.photographerAllowsDownload &&
      !state.allowDownload &&
      !publicJwtHasRegisteredClient()
    );
  }

  /** No modo público gratuito, «bloqueado/revisão» não trava a galeria (só marcação opcional para lote). */
  function selectionLockedForUi() {
    if (isPublicFreeDownloadGallery()) return false;
    return !!state.locked;
  }

  /** Público gratuito (sem cupom/vendas): uma só galeria — tudo liberado para baixar, sem painel «Fotos para baixar». */
  function isPublicFreeDownloadGallery() {
    if (normKsAccessModeFromMeta() !== 'public') return false;
    if (state.salesModeActive) return false;
    if (!state.photographerAllowsDownload || !state.allowDownload) return false;
    if (!publicJwtHasRegisteredClient()) return false;
    if (state.promo?.active) return false;
    return true;
  }

  function getPublicGalleryPhotoList() {
    const byId = new Map((state.gallery?.photos || []).map((p) => [parseInt(p.id, 10), p]));
    let ids = (state.approvedPhotoIds || [])
      .map((raw) => parseInt(raw, 10))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (!ids.length) {
      ids = [...byId.keys()];
    }
    return ids
      .filter((n) => byId.has(n))
      .map((pid) => {
        const p = byId.get(pid);
        return {
          id: pid,
          name: String(p?.original_name || `foto-${pid}`).trim() || `foto-${pid}`
        };
      });
  }

  function getPublicMarkedPhotoIdsForDownload() {
    const allowed = new Set(getPublicGalleryPhotoList().map((p) => p.id));
    return [...state.selected].filter((id) => allowed.has(id));
  }

  function openPublicRegisterModal() {
    const modal = $('ks-modal-public-dl');
    if (!modal) return;
    $('ks-modal-pub-err')?.classList.add('ks-hidden');
    modal.classList.remove('ks-hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('ks-modal-pub-dl-open');
    try {
      $('ks-modal-pub-nome')?.focus();
    } catch (_) {}
  }

  function closePublicRegisterModal() {
    const modal = $('ks-modal-public-dl');
    if (!modal) return;
    modal.classList.add('ks-hidden');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('ks-modal-pub-dl-open');
  }

  async function maybeRunPendingPublicDownload() {
    const p = pendingPublicDownloadAction;
    pendingPublicDownloadAction = null;
    if (!p || !state.allowDownload) return;

    if (p.type === 'photo' && p.photoId) {
      const pid = parseInt(p.photoId, 10) || 0;
      if (!pid) return;
      const url = previewDownloadUrl(pid);
      try {
        window.open(url, '_blank', 'noopener,noreferrer');
      } catch (_) {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      return;
    }

    if (p.type === 'openPanel') {
      state.publicDownloadsPanelOpen = true;
      renderPublicDownloadsPanel();
      $('ks-downloads-panel')?.classList.remove('ks-hidden');
      requestAnimationFrame(() => {
        try {
          $('ks-downloads-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (_) {}
      });
      return;
    }

    if (p.type === 'sequential' && Array.isArray(p.photoIds) && p.photoIds.length) {
      try {
        await downloadPhotosSequentially(p.photoIds, {
          onProgress: (n, total) => {
            setDownloadsProgress(n, total, true, 'selected');
          }
        });
      } catch (e) {
        toast(e?.message || 'Erro ao baixar', 'err');
      } finally {
        setDownloadsProgress(0, 1, false);
      }
      return;
    }

    if (p.type === 'zip' && Array.isArray(p.photoIds) && p.photoIds.length) {
      try {
        const msgEl = $('ks-downloads-msg');
        setDownloadsProgress(0, 1, true, 'zip');
        if (msgEl) msgEl.textContent = 'Preparando ZIP...';
        await downloadApprovedZip(p.photoIds);
        setDownloadsProgress(3, 3, true, 'zip');
        if (msgEl) msgEl.textContent = `ZIP pronto com ${p.photoIds.length} foto(s).`;
        toast(`ZIP gerado com ${p.photoIds.length} foto(s).`, 'ok');
      } catch (e) {
        toast(e?.message || 'Erro ao gerar ZIP', 'err');
      } finally {
        setDownloadsProgress(0, 1, false);
      }
    }
  }

  /**
   * Modo público: entrar com nome + e-mail + WhatsApp (sem senha).
   * Tenta login; se não existir cadastro, cria; se e-mail já existir, valida os dados.
   */
  async function enterPublicGalleryWithContact(nome, email, telefone, opts = {}) {
    const errEl = opts.errEl || $('ks-register-first-err');
    errEl?.classList.add('ks-hidden');
    let isNew = false;
    try {
      jwt = await apiLoginByDetails(nome, email, telefone);
    } catch (loginErr) {
      const loginMsg = loginErr?.message || '';
      if (!isLoginByDetailsNotFound(loginMsg) && !isRegisterEmailExistsMessage(loginMsg)) {
        throw loginErr;
      }
      try {
        const data = await apiRegisterPublic(nome, email, telefone);
        jwt = data.token;
        isNew = true;
      } catch (regErr) {
        const regMsg = regErr?.message || '';
        if (isRegisterEmailExistsMessage(regMsg)) {
          jwt = await apiLoginByDetails(nome, email, telefone);
        } else {
          throw regErr;
        }
      }
    }
    try { localStorage.setItem(tokenKey(slug), jwt); } catch (_) {}
    state.publicDownloadsPanelOpen = false;
    const gd = await loadGallery();
    applyGalleryData(gd);
    if (opts.runPendingDownload) await maybeRunPendingPublicDownload();
    return { isNew };
  }

  async function submitRegisterFirst() {
    const nome = ($('ks-reg-nome')?.value || '').trim();
    const email = ($('ks-reg-email')?.value || '').trim();
    const telefone = ($('ks-reg-tel')?.value || '').trim();
    const err = $('ks-register-first-err');
    if (!nome || !email) {
      if (err) {
        err.textContent = 'Preencha nome e e-mail.';
        err.classList.remove('ks-hidden');
      }
      return;
    }
    try {
      $('ks-register-first-btn').disabled = true;
      const { isNew } = await enterPublicGalleryWithContact(nome, email, telefone, { errEl: err });
      toast(
        isNew
          ? 'Cadastro concluído. Escolha as fotos e use a seta de download ou «Fotos para baixar».'
          : 'Bem-vindo de volta! Escolha as fotos que deseja baixar.',
        'ok'
      );
    } catch (e) {
      if (err) {
        err.textContent = e?.message || 'Erro';
        err.classList.remove('ks-hidden');
      }
    } finally {
      $('ks-register-first-btn').disabled = false;
    }
  }

  async function submitPublicRegisterFromModal() {
    const nome = ($('ks-modal-pub-nome')?.value || '').trim();
    const email = ($('ks-modal-pub-email')?.value || '').trim();
    const telefone = ($('ks-modal-pub-tel')?.value || '').trim();
    const err = $('ks-modal-pub-err');
    err?.classList.add('ks-hidden');
    if (!nome || !email) {
      if (err) {
        err.textContent = 'Preencha nome e e-mail.';
        err.classList.remove('ks-hidden');
      }
      return;
    }
    try {
      $('ks-modal-pub-submit').disabled = true;
      const { isNew } = await enterPublicGalleryWithContact(nome, email, telefone, {
        errEl: err,
        runPendingDownload: true
      });
      closePublicRegisterModal();
      toast(isNew ? 'Cadastro concluído. Download liberado.' : 'Acesso liberado.', 'ok');
    } catch (e) {
      if (err) {
        err.textContent = e.message || 'Erro';
        err.classList.remove('ks-hidden');
      }
    } finally {
      $('ks-modal-pub-submit').disabled = false;
    }
  }

  /**
   * paid_event_photos → nome + e-mail + WhatsApp (API login-by-details).
   * private → e-mail + senha (API client/login).
   * signup → e-mail + senha para voltar (primeira visita costuma usar sessão anónima via signup-enter).
   */
  function configureLoginUI() {
    const body = $('ks-login-body');
    const errBoot = $('ks-login-err');
    const foot = $('ks-login-foot');
    const modeDetails = $('ks-login-mode-details');
    const modePw = $('ks-login-mode-password');
    const modePub = $('ks-login-mode-public');
    const modeRegFirst = $('ks-login-mode-register-first');
    if (modePub) modePub.classList.add('ks-hidden');
    if (modeRegFirst) modeRegFirst.classList.add('ks-hidden');
    if (errBoot) errBoot.classList.add('ks-hidden');
    $('ks-reauth-err')?.classList.add('ks-hidden');
    $('ks-register-first-err')?.classList.add('ks-hidden');
    $('ks-login-pw-err')?.classList.add('ks-hidden');
    $('ks-login-title').textContent = 'King Selection';
    if (!galleryMeta || !body) return;
    body.classList.remove('ks-hidden');
    const mode = normKsAccessModeFromMeta();

    if (mustRegisterBeforeGallery()) {
      modeDetails?.classList.add('ks-hidden');
      modePw?.classList.add('ks-hidden');
      modeRegFirst?.classList.remove('ks-hidden');
      const lead = $('ks-register-first-lead');
      if (lead) {
        lead.innerHTML =
          'Modo <strong>público</strong>: informe <strong>nome</strong>, <strong>e-mail</strong> e <strong>WhatsApp</strong> (sem senha). Na primeira vez criamos seu cadastro; depois use os mesmos dados para voltar.';
      }
      $('ks-login-sub').textContent = galleryMeta.nome_projeto
        ? `${galleryMeta.nome_projeto} — acesso à galeria`
        : 'Informe seus dados para continuar';
      if (foot) {
        foot.style.display = '';
        foot.textContent =
          'Use sempre o mesmo nome, e-mail e WhatsApp. Se trocar de aparelho, basta preencher de novo — não precisa lembrar senha.';
      }
      return;
    }

    if (mode === 'public') {
      modeDetails?.classList.add('ks-hidden');
      modePw?.classList.add('ks-hidden');
      modePub?.classList.remove('ks-hidden');
      $('ks-login-sub').textContent =
        'Modo público: entre de novo como visitante ou com e-mail e senha. O cadastro para baixar pedimos só quando você for descarregar fotos.';
      if (foot) {
        foot.style.display = '';
        foot.textContent =
          'Na galeria você escolhe as fotos primeiro; ao usar Baixar, pedimos nome, e-mail e WhatsApp se o fotógrafo liberou download.';
      }
      return;
    }

    if (mode === 'paid_event_photos') {
      modeDetails?.classList.remove('ks-hidden');
      modePw?.classList.add('ks-hidden');
      $('ks-login-sub').textContent =
        'Modo fotos vendidas: entre com o mesmo nome, e-mail e WhatsApp usados ao enviar a seleção.';
      const lead = $('ks-login-details-lead');
      if (lead) {
        lead.innerHTML =
          'Use o mesmo <strong>nome</strong>, <strong>e-mail</strong> e <strong>WhatsApp</strong> do cadastro (ao enviar a seleção). Informe com DDD e, se necessário, código do país (ex.: 55). Se o fotógrafo não salvou seu WhatsApp no cadastro, pode deixar em branco.';
      }
      if (foot) {
        foot.style.display = '';
        foot.textContent =
          'Na primeira visita você já pode ver as fotos; ao enviar a seleção, confirme nome, e-mail e WhatsApp.';
      }
      return;
    }

    modeDetails?.classList.add('ks-hidden');
    modePw?.classList.remove('ks-hidden');
    $('ks-login-pw-section-h').textContent = mode === 'signup' ? 'Entrar com seu cadastro' : 'Acesso privado à galeria';
    const leadPw = $('ks-login-pw-lead');
    if (leadPw) {
      leadPw.textContent =
        mode === 'signup'
          ? 'Informe o e-mail e a senha que você definiu ao se cadastrar nesta galeria.'
          : 'Informe o e-mail e a senha que o fotógrafo enviou para você (modo privado).';
    }
    $('ks-login-sub').textContent =
      mode === 'signup'
        ? 'Entre com e-mail e senha do seu cadastro.'
        : 'Entre com e-mail e senha fornecidos pelo fotógrafo.';
    if (foot) {
      foot.style.display = '';
      foot.textContent =
        mode === 'signup'
          ? 'Primeira vez neste link? A galeria pode abrir direto; você completa o cadastro ao enviar a seleção.'
          : 'O fotógrafo deve ter enviado o link com e-mail e senha (por exemplo no WhatsApp).';
    }
  }

  function closeAllSteps() {
    $('ks-step-gallery')?.classList.remove('ks-hidden');
    $('ks-step-compare')?.classList.add('ks-hidden');
    $('ks-step-confirm')?.classList.add('ks-hidden');
  }

  function showLogin() {
    hideBootScreen();
    state.publicDownloadsPanelOpen = false;
    $('ks-login').classList.remove('ks-hidden');
    $('ks-app').classList.add('ks-hidden');
    $('ks-locked').classList.add('ks-hidden');
    configureLoginUI();
  }

  function showApp() {
    hideBootScreen();
    $('ks-login').classList.add('ks-hidden');
    $('ks-app').classList.remove('ks-hidden');
    $('ks-locked').classList.add('ks-hidden');
    closeAllSteps();
  }

  function showLockedScreen(title, msg, photographerLineHtml, paymentPix) {
    hideBootScreen();
    $('ks-login').classList.add('ks-hidden');
    $('ks-app').classList.add('ks-hidden');
    $('ks-locked').classList.remove('ks-hidden');
    $('ks-locked-title').textContent = title || 'Obrigado!';
    $('ks-locked-msg').textContent = msg || '';
    const tag = $('ks-locked-tag');
    if (tag) tag.innerHTML = photographerLineHtml || '';
    const wrap = $('ks-locked-pix');
    const holder = $('ks-locked-pix-holder');
    const keyEl = $('ks-locked-pix-key');
    const copyBtn = $('ks-locked-pix-copy');
    const waBtn = $('ks-locked-pix-whats');
    const waPendingBtn = $('ks-locked-pix-whats-pending');
    const openGalleryBtn = $('ks-locked-open-gallery');
    const pixKey = String(paymentPix?.pix_key || '').trim();
    const pixHolder = String(paymentPix?.pix_holder_name || '').trim();
    const shouldShow = !!pixKey;
    if (wrap) wrap.classList.toggle('ks-hidden', !shouldShow);
    if (holder) holder.textContent = pixHolder || 'Não informado';
    if (keyEl) keyEl.textContent = pixKey || '—';
    if (copyBtn) copyBtn.setAttribute('data-pix-key', pixKey || '');
    if (waBtn) {
      const waPaidMsg = `Olá! Acabei de enviar minha seleção na galeria "${state.gallery?.nome_projeto || ''}" e já fiz o pagamento via PIX. Pode confirmar, por favor?`;
      const waLink = buildSupportWhatsLink(waPaidMsg);
      waBtn.classList.toggle('ks-hidden', !waLink);
      waBtn.setAttribute('data-whats-link', waLink || '');
    }
    if (waPendingBtn) {
      const waPendingMsg = `Olá! Acabei de enviar minha seleção na galeria "${state.gallery?.nome_projeto || ''}" e vou realizar o pagamento via PIX em breve.`;
      const waPendingLink = buildSupportWhatsLink(waPendingMsg);
      waPendingBtn.classList.toggle('ks-hidden', !waPendingLink);
      waPendingBtn.setAttribute('data-whats-link', waPendingLink || '');
    }
    if (openGalleryBtn) {
      openGalleryBtn.classList.toggle('ks-hidden', !state.salesModeActive);
    }
  }

  function compareStepOpen() {
    const el = $('ks-step-compare');
    return el && !el.classList.contains('ks-hidden');
  }

  function confirmStepOpen() {
    const el = $('ks-step-confirm');
    return el && !el.classList.contains('ks-hidden');
  }

  async function apiLoginByDetails(nome, email, telefone) {
    let res;
    try {
      res = await fetchWithTimeout(`${API}/api/king-selection/client/login-by-details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, nome, email, telefone })
      }, KS_FETCH_BOOT_MS);
    } catch (e) {
      throw friendlyFetchError(e);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Falha ao entrar');
    return data.token;
  }

  async function apiLoginEmailSenha(email, senha) {
    let res;
    try {
      res = await fetchWithTimeout(`${API}/api/king-selection/client/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, email, senha })
      }, KS_FETCH_BOOT_MS);
    } catch (e) {
      throw friendlyFetchError(e);
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Falha ao entrar');
    return data.token;
  }

  async function apiPublicGuestEnter() {
    let res;
    try {
      res = await fetchWithTimeout(
        `${API}/api/king-selection/client/public-enter`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug })
        },
        KS_FETCH_BOOT_MS
      );
    } catch (e) {
      throw friendlyFetchError(e);
    }
    const data = await safeResponseJson(res, KS_JSON_BOOT_MS).catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Galeria pública indisponível.');
    return data.token;
  }

  async function apiRegisterPublic(nome, email, telefone) {
    let res;
    try {
      res = await fetchWithTimeout(
        `${API}/api/king-selection/client/register`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, nome, email, telefone: telefone || '' })
        },
        KS_FETCH_BOOT_MS
      );
    } catch (e) {
      throw friendlyFetchError(e);
    }
    const data = await safeResponseJson(res, KS_JSON_BOOT_MS).catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Falha no cadastro');
    return data;
  }

  async function loadGallery() {
    let res;
    try {
      res = await fetchWithTimeout(
        `${API}/api/king-selection/client/gallery?slug=${encodeURIComponent(slug)}&_ksnc=${Date.now()}`,
        {
          headers: authHeaders(false),
          cache: 'no-store'
        },
        KS_FETCH_BOOT_MS
      );
    } catch (e) {
      throw friendlyFetchError(e);
    }
    const data = await safeResponseJson(res, KS_JSON_BOOT_MS).catch((e) => {
      throw friendlyFetchError(e);
    });
    if (res.status === 401) {
      jwt = null;
      try { localStorage.removeItem(tokenKey(slug)); } catch (_) {}
      throw new Error('Sessão expirada. Entre novamente.');
    }
    if (!res.ok) throw new Error(data.message || 'Erro ao carregar galeria');
    return data;
  }

  function handleClientUnauthorized(res, data) {
    if (!res || res.status !== 401) return false;
    jwt = null;
    try { localStorage.removeItem(tokenKey(slug)); } catch (_) {}
    showLogin();
    toast(
      String(data?.message || 'Seu acesso foi encerrado pelo fotógrafo. Entre novamente.'),
      'err'
    );
    return true;
  }

  function replaceThankYouPlaceholders(msg, { selectionCount, photographerDisplayName, clientDisplayName }) {
    let s = String(msg || '');
    s = s.replace(/\{\{\s*quantidade\s*\}\}/gi, String(selectionCount ?? ''));
    s = s.replace(/\{\{\s*nome\s*\}\}/gi, photographerDisplayName || 'Fotógrafo');
    s = s.replace(/\{\{\s*nome_cliente\s*\}\}/gi, clientDisplayName || 'Cliente');
    return s;
  }

  function updateHeaderCounts() {
    const g = state.gallery;
    const el = $('ks-counts');
    if (!g || !el) return;
    const total = (g.photos && g.photos.length) || 0;
    const estaRodada = countSelectedThisRound();
    const totalAcumulado = state.selected.size;
    const min = g.min_selections != null ? parseInt(g.min_selections, 10) : 0;
    const max = g.total_fotos_contratadas != null ? parseInt(g.total_fotos_contratadas, 10) : 0;
    let livre = '';
    if (max <= 0) livre = '(livre)';
    else livre = `(máx. ${max})`;

    let topExtra = '';
    if (min > 0) topExtra += ` · mín. ${min}`;
    if (totalAcumulado > estaRodada) {
      topExtra += ` · <span class="ks-summary-muted">Total acumulado: ${totalAcumulado}</span>`;
    }
    const nivel = clientVisibleRoundLevel();
    if (estaRodada > 0 && nivel > 1) {
      topExtra += ` · <span class="ks-summary-muted">seleção atual: nível ${nivel}</span>`;
    }

    const pill = isPublicFreeDownloadGallery()
      ? `<span class="ks-header-sel-pill" title="Fotos marcadas para baixar em lote (opcional)"><span class="ks-header-sel-pill__label">Marcadas</span><span class="ks-header-sel-pill__num">${estaRodada}</span></span>`
      : `<span class="ks-header-sel-pill" title="Fotos selecionadas nesta rodada"><span class="ks-header-sel-pill__label">Selecionadas</span><span class="ks-header-sel-pill__num">${estaRodada}</span></span>`;

    let statsRight = '';
    if (isPublicFreeDownloadGallery()) {
      statsRight += `<span class="ks-summary-livre" style="color:#86efac">download liberado</span>`;
    }
    if (state.salesModeActive) {
      const packs = Array.isArray(state.salesPackages) ? state.salesPackages : [];
      const mode = String(state.salesConfig?.sales_price_mode || 'best_price_auto').toLowerCase();
      const unit = normalizeLegacyMoneyCents(state.salesConfig?.sales_unit_price_cents || 0);
      const nSel = Math.max(0, parseInt(state.selected?.size || 0, 10) || 0);
      const billableForEstimate = billablePhotoCountForSalesEstimate(nSel);
      const computedByClient = estimateClientTotalByPackages(billableForEstimate, packs, mode, unit);
      const priceStr = escapeHtml(formatCentsBr(computedByClient));
      statsRight += `<span class="ks-header-sel-total" title="Valor estimado com pacotes/preço; se o cupom estiver validado, já desconta as fotos gratuitas do cupom. A aprovação (cortesia/pago) é feita pelo fotógrafo depois do envio."><span class="ks-header-sel-total__label">Total</span><span class="ks-header-sel-total__val">${priceStr}</span></span>`;
    }
    statsRight += `<span class="ks-summary-livre">${escapeHtml(livre)}</span>`;

    el.innerHTML = `
      <div class="ks-summary-stack">
        <div class="ks-summary-line ks-summary-line--top">${total} fotos na galeria${topExtra}</div>
        <div class="ks-summary-line ks-summary-line--bottom">
          ${pill}
          <div class="ks-summary-stats-right">${statsRight}</div>
        </div>
      </div>`;
    updateGalleryToolbarButtons();
  }

  /** Reconhecimento facial só quando ainda dá para escolher fotos (não bloqueado e existe foto não selecionada). */
  function refreshFacePanelVisibility() {
    const fp = $('ks-face-panel');
    if (!fp) return;
    const totalPhotos = Array.isArray(state.gallery?.photos) ? state.gallery.photos.length : 0;
    const canSelectMore = !selectionLockedForUi() && totalPhotos > state.selected.size;
    const show = !!state.faceRecognitionUsable && canSelectMore;
    fp.classList.toggle('ks-hidden', !show);
  }

  function applyGalleryData(data) {
    const g = normalizeGalleryPhotosForState(data.gallery);
    state.folders = filterClientVisibleFolders(normalizeFolders(g?.folders, g?.photos));
    const validFolderIds = new Set(state.folders.map((f) => f.id));
    if (Array.isArray(g?.photos)) {
      g.photos = g.photos.map((p) => (
        p.folder_id && !validFolderIds.has(p.folder_id) ? { ...p, folder_id: null } : p
      ));
    }
    state.gallery = g;
    applyClientCardHeightFromGallery(g);
    state.allowClientEditRequest = !!(g && g.allow_client_edit_request === true);
    if (!state.allowClientEditRequest) {
      try {
        const boot = window.__KS_BOOT_GALLERY_META;
        if (boot && boot.allow_client_edit_request === true) state.allowClientEditRequest = true;
      } catch (_) { /* ignore */ }
    }
    state.faceRecognitionUsable = !!data.faceRecognitionUsable;
    state.faceFilterIds = null;
    state.allowDownload = !!(g && g.allow_download);
    state.photographerAllowsDownload = !!(
      g &&
      (Object.prototype.hasOwnProperty.call(g, 'photographer_allows_download')
        ? g.photographer_allows_download
        : g.allow_download)
    );
    state.salesModeActive = !!data.salesModeActive;
    state.salesConfig = data.salesConfig || null;
    state.salesPackages = Array.isArray(data.salesPackages) ? data.salesPackages : [];
    state.salesPricing = data.salesPricing || null;
    state.promo = data.promo || null;
    state.paymentState = data.paymentState || null;
    state.approvalsState = Array.isArray(data.approvalsState) ? data.approvalsState : [];
    state.approvedPhotoIds = Array.isArray(data.approvedPhotoIds) ? data.approvedPhotoIds.map((x) => parseInt(x, 10)).filter(Boolean) : [];
    state.downloadsSelected = new Set(state.approvedPhotoIds);
    state.downloadsTouched = false;
    state.clientAuthenticated = !!data.clientAuthenticated;
    state.clientContactPrefill =
      data.clientContactPrefill && typeof data.clientContactPrefill === 'object' ? data.clientContactPrefill : null;
    state.resolvedClientId = Math.max(0, parseInt(data.resolvedClientId, 10) || 0);
    {
      const lay = String(g?.client_folder_layout || '').toLowerCase() === 'flat' ? 'flat' : 'folders';
      state.clientFolderLayout = lay;
      if (lay === 'flat') {
        state.folderView = 'photos';
        state.activeFolderId = null;
        persistFolderNav();
      }
    }
    state.deferredSignupActive = !!data.deferredSignupActive;
    state.locked = !!g.locked;
    if (isPublicFreeDownloadGallery()) state.locked = false;
    state.selected = new Set(
      (data.selectedPhotoIds || [])
        .map((x) => normalizePhotoId(typeof x === 'object' && x && x.photo_id != null ? x.photo_id : x))
        .filter(Boolean)
    );
    state.hasSelectionBatch = !!(data.selectionBatchByPhotoId && typeof data.selectionBatchByPhotoId === 'object');
    if (state.hasSelectionBatch && data.selectionBatchByPhotoId) {
      state.batchByPhoto = {};
      for (const [k, v] of Object.entries(data.selectionBatchByPhotoId)) {
        const pk = normalizePhotoId(k);
        if (pk) state.batchByPhoto[String(pk)] = parseInt(v, 10) || 1;
      }
    } else {
      state.batchByPhoto = {};
    }
    state.currentRound = parseInt(data.currentSelectionRound, 10) || 1;
    state.frozenIds = new Set((data.frozenSelectionPhotoIds || []).map(x => parseInt(x, 10)).filter(Boolean));
    if (
      state.activeFolderId === -1
      || (state.activeFolderId && !state.folders.some((f) => f.id === state.activeFolderId))
    ) {
      state.activeFolderId = null;
    }

    const hasFolderNav = state.folders.length > 0;
    let storedNav = null;
    try {
      const rawNav = sessionStorage.getItem(folderNavStorageKey());
      if (rawNav) storedNav = JSON.parse(rawNav);
    } catch (_) {}

    if (state.clientFolderLayout === 'flat') {
      state.folderView = 'photos';
      state.activeFolderId = null;
    } else if (storedNav && storedNav.v === 1 && hasFolderNav) {
      state.folderView = storedNav.folderView === 'photos' ? 'photos' : 'folders';
      if (state.folderView === 'folders') {
        state.activeFolderId = null;
      } else {
        const af = storedNav.activeFolderId;
        if (af === null || af === undefined) {
          state.activeFolderId = null;
        } else {
          const n = parseInt(af, 10);
          state.activeFolderId = Number.isNaN(n) ? null : n;
        }
        if (
          state.activeFolderId === -1
          || (state.activeFolderId && !state.folders.some((f) => f.id === state.activeFolderId))
        ) {
          state.activeFolderId = null;
          state.folderView = 'folders';
        }
      }
    } else if (hasFolderNav) {
      state.folderView = !state.activeFolderId ? 'folders' : 'photos';
    } else {
      state.folderView = 'photos';
    }

    showApp();
    $('ks-proj').textContent = g.nome_projeto || slug;
    updateHeaderCounts();

    refreshFacePanelVisibility();
    const fm = $('ks-face-msg');
    if (fm) fm.textContent = '';

    const notice = $('ks-notice');
    if (notice) {
      notice.style.borderColor = '';
      notice.style.background = '';
      notice.style.color = '';
      if (selectionLockedForUi()) {
        notice.textContent = state.salesModeActive
          ? 'Seleção enviada! Suas fotos estão no painel «Fotos para baixar» (marca d\'água). Quando o fotógrafo liberar, use «Atualizar liberações» ou F5.'
          : (data.lockedMessage || 'Sua seleção já foi enviada e está bloqueada. Peça ao fotógrafo para reativar ou abrir uma nova seleção.');
        notice.classList.remove('ks-hidden');
      } else if (data.immutableSelectionNotice) {
        notice.textContent = data.immutableSelectionNotice;
        notice.classList.remove('ks-hidden');
      } else {
        notice.classList.add('ks-hidden');
      }
    }

    $('ks-clear').disabled = selectionLockedForUi();
    renderFolders();
    renderSalesUi();
    renderPublicDownloadsPanel();
    renderPublicDownloadHintBanner();
    resetGridVirtualPaging();
    renderGrid();
    refreshSecondarySteps();
    renderSupportWhatsButton();
    syncSingleViewerSelectUI();
    if (state.locked && state.salesModeActive) {
      $('ks-downloads-panel')?.classList.remove('ks-hidden');
    }
    scheduleEntrySplash();
    scheduleSalesStatusRefresh();
    syncSalesPostSubmitLayout();
    syncSalesConfirmBar();
    syncEditRequestToolbar();
  }

  function absolutizeAssetUrl(url) {
    const u = String(url || '').trim();
    if (!u) return '';
    if (/^https?:\/\//i.test(u)) return u;
    if (u.startsWith('/')) {
      const base = (API || '').replace(/\/$/, '') || (u.startsWith('/api/') ? KS_FALLBACK_API_ORIGIN : '');
      if (base) return `${base}${u}`;
    }
    return u;
  }

  function entrySplashUrlAvailable() {
    return String(state.gallery?.entry_splash_url || galleryMeta?.entry_splash_url || '').trim();
  }

  /** Capa de início: todos os modos quando a API envia a URL da capa do link. */
  function shouldShowEntrySplash() {
    return !!entrySplashUrlAvailable();
  }

  function entrySplashStorageKey() {
    return `ks_entry_splash_${slug}`;
  }

  function entrySplashAlreadySeen() {
    try {
      return !!sessionStorage.getItem(entrySplashStorageKey());
    } catch (_) {
      return false;
    }
  }

  function markEntrySplashSeen() {
    try {
      sessionStorage.setItem(entrySplashStorageKey(), '1');
    } catch (_) { /* ignore */ }
  }

  function afterEntrySplashClosed() {
    if (state.salesModeActive && state.folders.length > 0 && state.clientFolderLayout !== 'flat') {
      state.folderView = 'folders';
      state.activeFolderId = null;
      persistFolderNav();
      renderFolders();
    }
  }

  /** Mostra overlay de capa; devolve false se não houver URL/elementos. */
  function presentEntrySplash(onClose) {
    const raw = entrySplashUrlAvailable();
    const url = absolutizeAssetUrl(raw);
    if (!url) return false;
    const ov = $('ks-entry-splash');
    const im = $('ks-entry-splash-img');
    const ti = $('ks-entry-splash-title');
    const btn = $('ks-entry-splash-btn');
    if (!ov || !im || !btn) return false;
    if (ti) ti.textContent = state.gallery?.nome_projeto || galleryMeta?.nome_projeto || '';
    im.src = url;
    ov.classList.remove('ks-hidden');
    ov.setAttribute('aria-hidden', 'false');
    const close = () => {
      ov.classList.add('ks-hidden');
      ov.setAttribute('aria-hidden', 'true');
      im.removeAttribute('src');
      btn.onclick = null;
      ov.onclick = null;
      if (typeof onClose === 'function') onClose();
    };
    btn.onclick = () => close();
    ov.onclick = (e) => {
      if (e.target && e.target.id === 'ks-entry-splash') close();
    };
    return true;
  }

  /** Ao abrir o link (antes do login): capa + «Ver fotos» como no modo público. */
  async function awaitEntrySplashIfNeeded() {
    if (!shouldShowEntrySplash() || entrySplashAlreadySeen()) return;
    await new Promise((resolve) => {
      if (!presentEntrySplash(() => {
        markEntrySplashSeen();
        resolve();
      })) resolve();
    });
  }

  function scheduleEntrySplash() {
    if (!shouldShowEntrySplash() || entrySplashAlreadySeen()) return;
    presentEntrySplash(() => {
      markEntrySplashSeen();
      afterEntrySplashClosed();
    });
  }

  function syncPublicDownloadToolbar() {
    const pub = isPublicFreeDownloadGallery();
    $('ks-open-downloads')?.classList.toggle('ks-hidden', pub || !state.allowDownload);
    $('ks-advance')?.classList.toggle('ks-hidden', pub);
    $('ks-compare')?.classList.toggle('ks-hidden', pub || normKsAccessModeFromMeta() === 'public');
    $('ks-pub-dl-selected')?.classList.toggle('ks-hidden', !pub);
    $('ks-pub-dl-all')?.classList.toggle('ks-hidden', !pub);
    $('ks-pub-dl-zip')?.classList.toggle('ks-hidden', !pub);
    if (pub) {
      $('ks-downloads-panel')?.classList.add('ks-hidden');
      state.publicDownloadsPanelOpen = false;
    }
    const selBtn = $('ks-pub-dl-selected');
    if (selBtn) {
      const n = getPublicMarkedPhotoIdsForDownload().length;
      selBtn.disabled = n === 0;
      selBtn.title = n ? `Baixar ${n} foto(s) marcada(s)` : 'Marque fotos na galeria (opcional) ou use Baixar todas';
    }
  }

  function updateGalleryToolbarButtons() {
    const adv = $('ks-advance');
    const cmp = $('ks-compare');
    const clr = $('ks-clear');
    const foot = $('ks-gallery-foot');
    const n = state.selected.size;
    const nc = countSelectedThisRound();
    const canCompareRound = n > 0 && nc > 0;
    const simpleSalesFlow = !!state.salesModeActive;
    const publicFree = isPublicFreeDownloadGallery();
    const publicNoCompare = normKsAccessModeFromMeta() === 'public';
    const directReviewFlow = simpleSalesFlow || (publicNoCompare && !publicFree);
    syncPublicDownloadToolbar();
    syncSalesConfirmBar();
    syncEditRequestToolbar();
    if (adv) {
      if (publicFree) {
        adv.classList.add('ks-hidden');
      } else {
        adv.classList.remove('ks-hidden');
        if (directReviewFlow) {
          adv.innerHTML = simpleSalesFlow
            ? '<i class="fas fa-paper-plane"></i> Confirmar'
            : '<i class="fas fa-paper-plane"></i> Confirmar seleção';
          adv.title = simpleSalesFlow ? 'Ir direto para confirmação e envio' : 'Rever a seleção e seguir para baixar (se liberado)';
        } else {
          adv.innerHTML = '<i class="fas fa-arrow-right"></i> Avançar';
          adv.title = 'Ir para comparar e ajustar';
        }
        adv.disabled = selectionLockedForUi() || !canCompareRound;
      }
    }
    if (cmp) {
      cmp.classList.toggle('ks-hidden', directReviewFlow || publicFree);
      cmp.disabled = directReviewFlow ? true : (selectionLockedForUi() || !canCompareRound);
      if (directReviewFlow) {
        cmp.setAttribute('aria-hidden', 'true');
        cmp.tabIndex = -1;
      } else {
        cmp.removeAttribute('aria-hidden');
        cmp.tabIndex = 0;
      }
    }
    if (foot) {
      if (selectionLockedForUi()) {
        foot.innerHTML = '';
        foot.classList.add('ks-hidden');
      } else {
        foot.classList.remove('ks-hidden');
        foot.innerHTML =         publicFree
          ? (galleryWatermarkEnabled()
            ? 'Todas as fotos estão liberadas. Baixe com a <strong>seta</strong> em cada uma ou use <strong>Baixar todas</strong> / <strong>ZIP</strong>. Marcar fotos é opcional (só para <strong>Baixar selecionadas</strong>).'
            : 'Todas as fotos estão liberadas <strong>sem marca d’água</strong>. Baixe com a <strong>seta</strong> em cada uma ou use <strong>Baixar todas</strong> / <strong>ZIP</strong>.')
          : simpleSalesFlow
            ? 'Revise as fotos acima e clique em <strong>Confirmar</strong> para seguir direto ao cadastro e envio da seleção.'
            : publicNoCompare
              ? (state.allowDownload
                ? 'Marque as fotos e baixe com a <strong>seta</strong> em cada foto.'
                : 'Revise as fotos acima.')
              : 'Revise as fotos acima. Use <strong>Avançar</strong> ou <strong>Comparar e ajustar</strong> para comparar; depois <strong>Revisar e enviar</strong> e <strong>Confirmar e enviar seleção</strong>.';
      }
    }
    if (clr) clr.disabled = selectionLockedForUi();
  }

  function updateCompareAdvanceButton() {
    const btn = $('ks-cmp-advance');
    if (!btn) return;
    if (state.salesModeActive || normKsAccessModeFromMeta() === 'public') {
      btn.classList.add('ks-hidden');
      return;
    }
    btn.classList.remove('ks-hidden');
    if (!compareStepOpen()) return;
    const min = state.gallery.min_selections != null ? parseInt(state.gallery.min_selections, 10) : 0;
    const n = state.selected.size;
    btn.disabled = state.locked || n === 0 || (min > 0 && n < min);
  }

  function getOrderedPhotosForGrid() {
    const all = Array.isArray(state.gallery.photos) ? state.gallery.photos : [];
    let filtered = all.slice();
    if (state.activeFolderId) {
      if (state.activeFolderId === -1) {
        filtered = filtered.filter((p) => !(parseInt(p.folder_id, 10) || 0));
      } else {
        filtered = filtered.filter((p) => (parseInt(p.folder_id, 10) || null) === state.activeFolderId);
      }
      // Fallback visual: se o backend não mandar folder_id mas houver fotos na galeria,
      // evita tela vazia total e mantém navegação funcional até o backend sincronizar.
      if (!filtered.length && all.length && !all.some((p) => parseInt(p.folder_id, 10))) {
        filtered = all.slice();
      }
    }
    filtered = filterPhotosBySearch(filtered, state.searchRaw);
    if (state.faceFilterIds && state.faceFilterIds.size) {
      filtered = filtered.filter((p) => state.faceFilterIds.has(parseInt(p.id, 10)));
    }
    return sortPhotos(filtered, state.sortMode);
  }

  /** Fotos do escopo atual da pasta (ou galeria inteira), sem busca nem filtro facial — para “selecionar todas”. */
  function getPhotosInCurrentFolderScopeOnly() {
    const all = Array.isArray(state.gallery?.photos) ? state.gallery.photos : [];
    let filtered = all.slice();
    if (state.activeFolderId) {
      if (state.activeFolderId === -1) {
        filtered = filtered.filter((p) => !(parseInt(p.folder_id, 10) || 0));
      } else {
        filtered = filtered.filter((p) => (parseInt(p.folder_id, 10) || null) === state.activeFolderId);
      }
      if (!filtered.length && all.length && !all.some((p) => parseInt(p.folder_id, 10))) {
        filtered = all.slice();
      }
    }
    return sortPhotos(filtered, state.sortMode);
  }

  /** IDs ainda não selecionáveis em lote (exclui frozen e respeita limite de contrato). */
  function getSelectableIdsForFolderBulk() {
    const photos = getPhotosInCurrentFolderScopeOnly();
    const max = state.gallery?.total_fotos_contratadas != null ? parseInt(state.gallery.total_fotos_contratadas, 10) : 0;
    const ids = [];
    for (const p of photos) {
      const pid = normalizePhotoId(p.id);
      if (!pid || isFrozenPhoto(pid)) continue;
      if (state.selected.has(pid)) continue;
      ids.push(pid);
    }
    if (max > 0) {
      const remaining = max - effectiveSelectedCountForMaxLimit();
      const cap = Math.max(0, remaining);
      return ids.slice(0, cap);
    }
    return ids;
  }

  /** Se o GET da galeria vier desatualizado após select-bulk, garante os IDs escolhidos no estado local. */
  function mergeBulkSelectIntoState(ids) {
    if (!ids || !ids.length) return;
    let changed = false;
    for (const raw of ids) {
      const pid = normalizePhotoId(raw);
      if (!pid) continue;
      if (!state.selected.has(pid)) {
        state.selected.add(pid);
        changed = true;
      }
    }
    if (changed) {
      renderGrid();
      renderSalesUi();
      updateHeaderCounts();
      syncPublicDownloadToolbar();
      refreshSecondarySteps();
    }
  }

  function syncFolderSelectAllToolbar() {
    const btn = $('ks-folder-select-all');
    if (!btn) return;
    const hasFolders = Array.isArray(state.folders) && state.folders.length > 0;
    const inFolderList = state.folderView === 'folders';
    if (!hasFolders || inFolderList || (state.locked && state.salesModeActive)) {
      btn.classList.add('ks-hidden');
      return;
    }
    btn.classList.remove('ks-hidden');
    const ids = getSelectableIdsForFolderBulk();
    const short =
      state.activeFolderId == null
        ? 'Selecionar todas na galeria'
        : state.activeFolderId === -1
          ? 'Selecionar todas (sem pasta)'
          : 'Selecionar todas desta pasta';
    btn.title = short;
    btn.innerHTML = '<i class="fas fa-check-double"></i> Selecionar todas';
    btn.disabled = !!state.locked || ids.length === 0;
  }

  async function selectAllInCurrentFolderScope() {
    if (selectionLockedForUi()) return;
    const ids = getSelectableIdsForFolderBulk();
    if (!ids.length) {
      toast('Não há mais fotos para selecionar neste álbum (ou já atingiu o limite).', '');
      return;
    }
    const btn = $('ks-folder-select-all');
    try {
      if (btn) btn.disabled = true;
      const res = await fetch(`${API}/api/king-selection/client/select-bulk`, {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({ slug, mode: 'select', photo_ids: ids })
      });
      const data = await res.json().catch(() => ({}));
      if (handleClientUnauthorized(res, data)) return;
      if (!res.ok) throw new Error(data.message || 'Erro ao selecionar');
      const data2 = await loadGallery();
      applyGalleryData(data2);
      mergeBulkSelectIntoState(ids);
      toast(`${ids.length} foto(s) selecionada(s).`, '');
    } catch (e) {
      const raw = String(e?.message || '').toLowerCase();
      if (
        raw.includes('já foi enviada') ||
        raw.includes('ja foi enviada') ||
        raw.includes('revisão') ||
        raw.includes('revisao')
      ) {
        toast('Não foi possível atualizar a seleção agora. Atualize a página ou peça ao fotógrafo.', 'err');
      } else {
        toast(e.message || 'Erro', 'err');
      }
    } finally {
      if (btn) btn.disabled = false;
      syncFolderSelectAllToolbar();
    }
  }

  /**
   * Fotos selecionadas em ordem da galeria.
   * @param {{ currentRoundOnly?: boolean }} [opts] — se true, só a rodada atual (exclui bloqueadas de rodadas anteriores); usar em Comparar / Confirmar.
   */
  function getSelectedPhotosOrderedForReview(opts) {
    const currentOnly = !!(opts && opts.currentRoundOnly);
    const all = Array.isArray(state.gallery?.photos) ? state.gallery.photos : [];
    return sortPhotos(all, 'order').filter((p) => {
      if (!state.selected.has(p.id)) return false;
      if (currentOnly && isFrozenPhoto(p.id)) return false;
      return true;
    });
  }

  function renderGrid() {
    const grid = $('ks-grid');
    const empty = $('ks-empty');
    const hint = $('ks-search-hint');
    syncPublicLockedDownloadMinimalClass();

    if (state.locked && state.salesModeActive) {
      disconnectGridPreviewIo();
      disconnectGridVirtualSentinelIo();
      if (grid) grid.innerHTML = '';
      hint?.classList.add('ks-hidden');
      if (empty) {
        empty.textContent = 'Sua seleção já foi enviada. Se quiser selecionar mais fotos, clique em Suporte / Retratos e peça ao retratista para liberar nova seleção.';
        empty.classList.remove('ks-hidden');
      }
      syncFolderSelectAllToolbar();
      syncEditRequestToolbar();
      refreshFacePanelVisibility();
      return;
    }
    if (publicLockedDownloadPhaseActive()) {
      disconnectGridPreviewIo();
      disconnectGridVirtualSentinelIo();
      if (grid) grid.innerHTML = '';
      empty?.classList.add('ks-hidden');
      hint?.classList.add('ks-hidden');
      syncFolderSelectAllToolbar();
      syncEditRequestToolbar();
      refreshFacePanelVisibility();
      return;
    }
    if (state.folderView === 'folders' && state.folders.length) {
      disconnectGridPreviewIo();
      disconnectGridVirtualSentinelIo();
      if (grid) grid.innerHTML = '';
      empty?.classList.add('ks-hidden');
      hint?.classList.add('ks-hidden');
      syncFolderSelectAllToolbar();
      syncEditRequestToolbar();
      refreshFacePanelVisibility();
      return;
    }
    const list = getOrderedPhotosForGrid();
    const tokens = parseSearchTokens(state.searchRaw);
    const faceOn = !!(state.faceFilterIds && state.faceFilterIds.size);

    if (tokens.length || faceOn) {
      const bits = [];
      if (faceOn) bits.push(`Filtro por rosto: ${list.length} foto(s).`);
      if (tokens.length) {
        bits.push(list.length
          ? `Busca por código: ${list.length} foto(s). Limpe o campo para ampliar.`
          : 'Nenhuma foto encontrada para estes códigos/números. Tente o ID da foto ou o trecho ADR… do nome.');
      }
      hint.textContent = bits.join(' ');
      hint.classList.remove('ks-hidden');
    } else {
      hint.classList.add('ks-hidden');
    }

    if (!list.length) {
      disconnectGridPreviewIo();
      grid.innerHTML = '';
      empty.textContent = state.activeFolderId
        ? 'Esta pasta ainda não tem fotos.'
        : 'Nenhuma foto corresponde à busca.';
      empty.classList.toggle('ks-hidden', !(tokens.length || faceOn || state.activeFolderId));
      syncFolderSelectAllToolbar();
      syncEditRequestToolbar();
      refreshFacePanelVisibility();
      return;
    }
    empty.classList.add('ks-hidden');

    disconnectGridPreviewIo();
    const anyFrozenInGallery = [...state.selected].some((id) => isFrozenPhoto(id));
    const publicFree = isPublicFreeDownloadGallery();
    const displayList = getGridSliceForVirtual(list);
    grid.innerHTML = displayList.map((p) => buildPhotoCardHtml(p, anyFrozenInGallery, publicFree)).join('');

    bindPhotoCardGrid(grid);
    hydrateGridPreviews(grid);
    setupGridVirtualSentinel(grid, list);
    syncFolderSelectAllToolbar();
    syncEditRequestToolbar();
    refreshFacePanelVisibility();
  }

  function bindPhotoCardGrid(grid) {
    if (!grid || grid._ksClickDelegated) return;
    grid._ksClickDelegated = true;
    grid.addEventListener('click', (e) => {
      const expand = e.target.closest('[data-expand]');
      if (expand) {
        e.stopPropagation();
        const id = parseInt(expand.getAttribute('data-expand'), 10);
        if (id) openViewer(id);
        return;
      }
      if (e.target.closest('.ks-ph-dl')) return;
      const pubDl = e.target.closest('[data-pub-dl]');
      if (pubDl) {
        e.stopPropagation();
        e.preventDefault();
        const id = parseInt(pubDl.getAttribute('data-pub-dl'), 10) || 0;
        if (!id || !publicMustRegisterToDownload()) return;
        pendingPublicDownloadAction = { type: 'photo', photoId: id };
        openPublicRegisterModal();
        return;
      }
      const check = e.target.closest('[data-check]');
      if (check) {
        e.stopPropagation();
        e.preventDefault();
        if (check.disabled || check.classList.contains('ks-check-btn--frozen')) return;
        const id = parseInt(check.getAttribute('data-check'), 10);
        if (id) onTogglePhoto(id);
        return;
      }
      const strip = e.target.closest('[data-strip]');
      if (strip) {
        e.stopPropagation();
        e.preventDefault();
        const id = parseInt(strip.getAttribute('data-strip'), 10);
        if (id) onTogglePhoto(id);
        return;
      }
      const zone = e.target.closest('[data-strip-zone]');
      if (zone) {
        const id = parseInt(zone.getAttribute('data-strip-zone'), 10);
        if (id) onTogglePhoto(id);
      }
    });
    grid.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const zone = e.target.closest('[data-strip-zone]');
      if (!zone) return;
      e.preventDefault();
      const id = parseInt(zone.getAttribute('data-strip-zone'), 10);
      if (id) onTogglePhoto(id);
    });
  }

  function fillCompareSelects() {
    const list = getSelectedPhotosOrderedForReview({ currentRoundOnly: true });
    const sa = $('ks-cmp-sel-a');
    const sb = $('ks-cmp-sel-b');
    if (!sa || !sb) return;
    if (!list.length) {
      sa.innerHTML = '';
      sb.innerHTML = '';
      return;
    }
    const opts = list.map(p => `<option value="${p.id}">${escapeHtml(p.original_name || 'foto')}</option>`).join('');
    sa.innerHTML = opts;
    sb.innerHTML = opts;
    if (compareState.idA && list.some(p => p.id === compareState.idA)) sa.value = String(compareState.idA);
    else if (list[0]) { compareState.idA = list[0].id; sa.value = String(list[0].id); }
    if (compareState.idB && list.some(p => p.id === compareState.idB)) sb.value = String(compareState.idB);
    else if (list[1]) { compareState.idB = list[1].id; sb.value = String(list[1].id); }
    else if (list[0]) { compareState.idB = list[0].id; sb.value = String(list[0].id); }
  }

  function syncCompareImages() {
    const ia = $('ks-cmp-img-a');
    const ib = $('ks-cmp-img-b');
    if (ia) {
      if (compareState.idA) ia.src = previewUrl(compareState.idA, false);
      ia.classList.add('ks-cmp-img--fit');
      ia.style.objectFit = 'contain';
      ia.style.objectPosition = 'center';
    }
    if (ib) {
      if (compareState.idB) ib.src = previewUrl(compareState.idB, false);
      ib.classList.add('ks-cmp-img--fit');
      ib.style.objectFit = 'contain';
      ib.style.objectPosition = 'center';
    }
  }

  function syncComparePaneHighlight() {
    const pa = $('ks-cmp-pane-a');
    const pb = $('ks-cmp-pane-b');
    if (pa) {
      pa.classList.toggle('ks-cmp-pane--active-a', compareState.thumbTargetMode === 'pinA');
      pa.classList.remove('ks-cmp-pane--active-b');
    }
    if (pb) {
      pb.classList.toggle('ks-cmp-pane--active-b', compareState.thumbTargetMode === 'pinB');
      pb.classList.remove('ks-cmp-pane--active-a');
    }
  }

  function getUnselectedGalleryPhotosForCompare() {
    const all = Array.isArray(state.gallery?.photos) ? state.gallery.photos : [];
    return sortPhotos(all, 'order').filter((p) => !state.selected.has(p.id));
  }

  function compareCanAddMorePhotos() {
    if (state.locked) return false;
    const max = state.gallery.total_fotos_contratadas != null ? parseInt(state.gallery.total_fotos_contratadas, 10) : 0;
    if (max > 0 && effectiveSelectedCountForMaxLimit() >= max) return false;
    return true;
  }

  function closeCompareAddOverlay() {
    const ov = $('ks-cmp-add-overlay');
    if (!ov || ov.classList.contains('ks-hidden')) return;
    ov.classList.add('ks-hidden');
    ov.setAttribute('aria-hidden', 'true');
  }

  function openCompareAddOverlay() {
    const ov = $('ks-cmp-add-overlay');
    if (!ov) return;
    ov.classList.remove('ks-hidden');
    ov.setAttribute('aria-hidden', 'false');
    renderCompareAddGrid();
  }

  function renderCompareAddGrid() {
    const grid = $('ks-cmp-add-grid');
    const empty = $('ks-cmp-add-empty');
    if (!grid) return;
    const avail = getUnselectedGalleryPhotosForCompare();
    if (empty) empty.classList.toggle('ks-hidden', avail.length > 0);
    if (!avail.length) {
      grid.innerHTML = '';
      return;
    }
    grid.innerHTML = avail.map((p) =>
      `<button type="button" class="ks-cmp-add-tile" data-cmp-add-pid="${p.id}" title="Adicionar à seleção">
        <img src="${previewUrl(p.id, true)}" alt="" loading="lazy" />
        <span class="ks-cmp-add-tile-cap">${escapeHtml(normalizeExportName(p.original_name) || 'foto')}</span>
      </button>`
    ).join('');
    grid.querySelectorAll('[data-cmp-add-pid]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-cmp-add-pid'), 10);
        if (!id) return;
        await onTogglePhoto(id);
        if (!compareCanAddMorePhotos() || getUnselectedGalleryPhotosForCompare().length === 0) {
          closeCompareAddOverlay();
        } else {
          renderCompareAddGrid();
        }
      });
    });
  }

  function renderCompareStrip() {
    const strip = $('ks-cmp-strip');
    const title = $('ks-cmp-strip-title');
    if (!strip) return;
    const list = getSelectedPhotosOrderedForReview({ currentRoundOnly: true });
    const n = list.length;
    if (title) {
      const base = n === 1
        ? `1 foto nesta rodada — ajuste A e B (use a mesma em ambos se quiser)`
        : `${n} foto(s) nesta rodada — ajuste A e B juntas`;
      let modeHint = '';
      if (compareState.thumbTargetMode === 'pinA') {
        modeHint = ' · só Foto A (toque de novo na foto ou no rótulo para alternar A/B)';
      } else if (compareState.thumbTargetMode === 'pinB') {
        modeHint = ' · só Foto B (toque de novo na foto ou no rótulo para alternar A/B)';
      } else {
        modeHint = ` · miniaturas: alternância (próximo → Foto ${compareState.nextThumbSlot})`;
      }
      title.textContent = base + modeHint;
    }
    let html = list.map(p => {
      const isA = p.id === compareState.idA;
      const isB = p.id === compareState.idB && compareState.idB !== compareState.idA;
      let cl = 'ks-cmp-thumb';
      if (isA) cl += ' ks-cmp-thumb--a';
      if (isB) cl += ' ks-cmp-thumb--b';
      let tip;
      if (compareState.thumbTargetMode === 'pinA') tip = 'Colocar em Foto A';
      else if (compareState.thumbTargetMode === 'pinB') tip = 'Colocar em Foto B';
      else tip = compareState.nextThumbSlot === 'A' ? 'Colocar em Foto A (depois na B)' : 'Colocar em Foto B (depois na A)';
      return `<button type="button" class="${cl}" data-cmp-pick="${p.id}" title="${tip}">
        <img src="${previewUrl(p.id, true)}" alt="" loading="lazy" />
      </button>`;
    }).join('');
    if (compareCanAddMorePhotos()) {
      html += `<button type="button" class="ks-cmp-thumb ks-cmp-thumb-add" id="ks-cmp-add-trigger" title="Adicionar mais fotos sem voltar à galeria" aria-label="Adicionar fotos à seleção">
        <span class="ks-cmp-thumb-add-inner"><i class="fas fa-plus" aria-hidden="true"></i></span>
      </button>`;
    }
    strip.innerHTML = html;
    strip.querySelectorAll('[data-cmp-pick]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-cmp-pick'), 10);
        if (!id) return;
        if (compareState.thumbTargetMode === 'pinA') {
          compareState.idA = id;
        } else if (compareState.thumbTargetMode === 'pinB') {
          compareState.idB = id;
        } else if (compareState.nextThumbSlot === 'A') {
          compareState.idA = id;
          compareState.nextThumbSlot = 'B';
        } else {
          compareState.idB = id;
          compareState.nextThumbSlot = 'A';
        }
        const sa = $('ks-cmp-sel-a');
        const sb = $('ks-cmp-sel-b');
        if (sa) sa.value = String(compareState.idA);
        if (sb) sb.value = String(compareState.idB);
        syncCompareImages();
        renderCompareStrip();
      });
    });
    const addTrig = $('ks-cmp-add-trigger');
    if (addTrig) {
      addTrig.addEventListener('click', (e) => {
        e.preventDefault();
        openCompareAddOverlay();
      });
    }
    syncComparePaneHighlight();
  }

  function stepCompareIndex(which, delta) {
    const list = getSelectedPhotosOrderedForReview({ currentRoundOnly: true });
    if (!list.length) return;
    const curId = which === 'A' ? compareState.idA : compareState.idB;
    let idx = list.findIndex(p => p.id === curId);
    if (idx < 0) idx = 0;
    idx = (idx + delta + list.length) % list.length;
    const next = list[idx].id;
    if (which === 'A') compareState.idA = next;
    else compareState.idB = next;
    const sel = which === 'A' ? $('ks-cmp-sel-a') : $('ks-cmp-sel-b');
    if (sel) sel.value = String(next);
    syncCompareImages();
    renderCompareStrip();
  }

  function renderCompareUI() {
    const list = getSelectedPhotosOrderedForReview({ currentRoundOnly: true });
    if (!list.length) {
      if (compareStepOpen()) {
        closeCompareStep();
        toast('Sem fotos selecionadas para comparar.', '');
      }
      return;
    }
    fillCompareSelects();
    compareState.idA = parseInt($('ks-cmp-sel-a')?.value, 10) || compareState.idA;
    compareState.idB = parseInt($('ks-cmp-sel-b')?.value, 10) || compareState.idB;
    syncCompareImages();
    renderCompareStrip();
    const fa = compareState.idA && isFrozenPhoto(compareState.idA);
    const fb = compareState.idB && isFrozenPhoto(compareState.idB);
    const ra = $('ks-cmp-rm-a');
    const rb = $('ks-cmp-rm-b');
    if (ra) ra.disabled = !!fa;
    if (rb) rb.disabled = !!fb;
    updateCompareAdvanceButton();
    syncComparePaneHighlight();
  }

  function openCompareStep() {
    if (state.salesModeActive || normKsAccessModeFromMeta() === 'public') {
      openConfirmStep();
      return;
    }
    if (state.locked) return;
    const list = getSelectedPhotosOrderedForReview({ currentRoundOnly: true });
    if (!list.length) {
      toast('Selecione pelo menos uma foto na galeria.', 'err');
      return;
    }
    compareState.idA = list[0].id;
    compareState.idB = (list[1] || list[0]).id;
    compareState.thumbTargetMode = 'auto';
    compareState.nextThumbSlot = 'A';
    closeCompareAddOverlay();
    $('ks-step-gallery')?.classList.add('ks-hidden');
    $('ks-step-confirm')?.classList.add('ks-hidden');
    $('ks-step-compare')?.classList.remove('ks-hidden');
    renderCompareUI();
    window.scrollTo(0, 0);
  }

  function closeCompareStep() {
    closeCompareAddOverlay();
    $('ks-step-compare')?.classList.add('ks-hidden');
    $('ks-step-gallery')?.classList.remove('ks-hidden');
    window.scrollTo(0, 0);
  }

  function updateConfirmLead() {
    const lead = $('ks-confirm-lead');
    if (!lead || !confirmStepOpen()) return;
    const er = countSelectedThisRound();
    const nTotal = state.selected.size;
    if (state.deferredSignupActive) {
      const extra = nTotal > er ? ` Há ${nTotal} foto(s) no total acumulado; abaixo só esta rodada (${er}).` : '';
      lead.textContent = `Revise as ${er} foto(s) desta rodada.${extra} Ao enviar, preencha nome, e-mail e WhatsApp com DDD — não precisa criar senha antes.`;
      return;
    }
    if (normKsAccessModeFromMeta() === 'public' && !publicJwtHasRegisteredClient()) {
      const extra = nTotal > er ? ` (${nTotal} no total acumulado; abaixo só esta rodada — ${er}).` : '';
      lead.textContent = `Revise as ${er} foto(s) selecionada(s).${extra} Para enviar ao fotógrafo, preencha nome, e-mail e WhatsApp (com DDD) abaixo — cadastro rápido, sem senha neste passo.`;
      return;
    }
    if (nTotal > er) {
      lead.textContent = `Revise as ${er} foto(s) escolhida(s) nesta rodada (${nTotal} no total acumulado) e adicione uma mensagem (opcional):`;
    } else {
      lead.textContent = `Revise as ${er} foto(s) selecionadas e adicione uma mensagem (opcional):`;
    }
  }

  function renderConfirmScroll() {
    const wrap = $('ks-confirm-scroll');
    if (!wrap) return;
    updateConfirmLead();
    const list = getSelectedPhotosOrderedForReview({ currentRoundOnly: true });
    const cards = list.map(p => {
      const bar = `<button type="button" class="ks-ph-act ks-ph-act--remove" data-strip="${p.id}" style="font-size:9px"><i class="fas fa-times"></i> Remover</button>`;
      return `
        <div class="ks-ph selected" data-pid="${p.id}">
          <button type="button" class="ks-check-btn ks-check-btn--on" disabled aria-hidden="true"><i class="fas fa-check"></i></button>
          <div class="ks-ph-imgwrap" data-confirm-expand="${p.id}" role="button" tabindex="0" title="Ampliar foto" style="cursor:pointer">
            <img src="${previewUrl(p.id, true)}" alt="" loading="lazy" />
          </div>
          <div class="ks-ph-bar">
            <div class="ks-ph-bar-main">${bar}</div>
            <button type="button" class="r" data-confirm-expand="${p.id}" title="Ampliar"><i class="fas fa-expand"></i></button>
          </div>
        </div>`;
    }).join('');
    const more = `
      <button type="button" class="ks-tile-more ks-confirm-more-tile" id="ks-confirm-more">
        <i class="fas fa-plus-circle" style="font-size:2rem"></i>
        Selecionar mais fotos
      </button>`;
    wrap.innerHTML = cards + more;
    // Evita abrir no meio da lista (aparência de fotos "cortadas" no topo).
    wrap.scrollTop = 0;
    if (!wrap.dataset.ksConfirmDelegate) {
      wrap.dataset.ksConfirmDelegate = '1';
      wrap.addEventListener('click', (e) => {
        const ex = e.target.closest('[data-confirm-expand]');
        if (ex) {
          e.preventDefault();
          e.stopPropagation();
          const id = parseInt(ex.getAttribute('data-confirm-expand'), 10);
          if (id) openViewer(id);
          return;
        }
        const rm = e.target.closest('[data-strip]');
        if (rm) {
          e.preventDefault();
          e.stopPropagation();
          const id = parseInt(rm.getAttribute('data-strip'), 10);
          if (id) onTogglePhoto(id);
          return;
        }
        if (e.target.closest('#ks-confirm-more')) {
          e.preventDefault();
          closeConfirmStep();
        }
      });
      wrap.addEventListener('keydown', (e) => {
        const z = e.target.closest && e.target.closest('[data-confirm-expand]');
        if (!z) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const id = parseInt(z.getAttribute('data-confirm-expand'), 10);
          if (id) openViewer(id);
        }
      });
    }
  }

  function renderConfirmSalesDashboard() {
    const box = $('ks-confirm-sales-dashboard');
    if (!box) return;
    if (!state.salesModeActive) {
      box.classList.add('ks-hidden');
      box.innerHTML = '';
      return;
    }
    const packs = Array.isArray(state.salesPackages) ? state.salesPackages : [];
    const mode = String(state.salesConfig?.sales_price_mode || 'best_price_auto').toLowerCase();
    const unit = normalizeLegacyMoneyCents(state.salesConfig?.sales_unit_price_cents || 0);
    const selectedCount = Math.max(0, parseInt(state.selected?.size || 0, 10) || 0);
    const billableForEstimate = billablePhotoCountForSalesEstimate(selectedCount);
    const total = estimateClientTotalByPackages(billableForEstimate, packs, mode, unit);
    const thisRound = Math.max(0, countSelectedThisRound());
    const approvedCount = getSalesApprovedEntries().length;
    box.innerHTML = `
      <div style="border:1px solid #cbd5e1;background:#f8fafc;border-radius:12px;padding:10px;box-shadow:0 10px 24px rgba(15,23,42,.10)">
        <div style="font-weight:900;color:#4f46e5;letter-spacing:.02em;margin-bottom:8px"><i class="fas fa-square-poll-vertical"></i> Resumo da seleção</div>
        <div class="ks-sales-resumo-metrics">
          <div style="border:1px solid #bae6fd;background:#ecfeff;border-radius:10px;padding:8px;min-width:0">
            <div style="font-size:11px;color:#0e7490;font-weight:800">SELECIONADAS (TOTAL)</div>
            <div style="font-size:19px;color:#0369a1;font-weight:900">${selectedCount}</div>
          </div>
          <div style="border:1px solid #bae6fd;background:#ecfeff;border-radius:10px;padding:8px;min-width:0">
            <div style="font-size:11px;color:#0e7490;font-weight:800">NESTA SESSÃO</div>
            <div style="font-size:19px;color:#0369a1;font-weight:900">${thisRound}</div>
          </div>
          <div style="border:1px solid #86efac;background:#ecfdf5;border-radius:10px;padding:8px;min-width:0">
            <div style="font-size:11px;color:#047857;font-weight:800">LIBERADAS</div>
            <div style="font-size:22px;color:#15803d;font-weight:900">${approvedCount}</div>
          </div>
          <div style="border:1px solid #86efac;background:#ecfdf5;border-radius:10px;padding:8px;min-width:0">
            <div style="font-size:11px;color:#047857;font-weight:800">TOTAL ESTIMADO</div>
            <div style="font-size:19px;color:#047857;font-weight:900">${escapeHtml(formatCentsBr(total))}</div>
          </div>
        </div>
      </div>
    `;
    box.classList.remove('ks-hidden');
  }

  function openConfirmStep() {
    if (state.locked) return;
    closeViewerAb();
    const min = state.gallery.min_selections != null ? parseInt(state.gallery.min_selections, 10) : 0;
    if (min > 0 && state.selected.size < min) {
      toast(`Selecione pelo menos ${min} foto(s).`, 'err');
      return;
    }
    if (state.selected.size === 0) {
      toast('Selecione pelo menos uma foto.', 'err');
      return;
    }
    if (countSelectedThisRound() === 0) {
      toast('Nesta rodada ainda não há fotos novas. Selecione fotos na galeria antes de revisar o envio.', 'err');
      return;
    }
    closeCompareAddOverlay();
    $('ks-step-gallery')?.classList.add('ks-hidden');
    $('ks-step-compare')?.classList.add('ks-hidden');
    $('ks-step-confirm')?.classList.remove('ks-hidden');
    const p = $('ks-confirm-proj');
    if (p) p.textContent = state.gallery.nome_projeto || slug;
    const fb = $('ks-confirm-feedback');
    if (fb) fb.value = '';
    const contactWrap = $('ks-confirm-contact-fields');
    const shouldShowContact = confirmStepNeedsContactFields();
    const preflight = $('ks-confirm-preflight');
    if (preflight) preflight.classList.toggle('ks-hidden', !shouldShowContact);
    if (contactWrap) {
      if (shouldShowContact) {
        contactWrap.classList.remove('ks-hidden');
        const pf = state.clientContactPrefill;
        const n = $('ks-confirm-nome');
        const em = $('ks-confirm-email');
        const tel = $('ks-confirm-tel');
        if (n && !String(n.value || '').trim() && pf?.nome) n.value = String(pf.nome);
        if (em && !String(em.value || '').trim() && pf?.email) em.value = String(pf.email);
        if (tel && !String(tel.value || '').trim() && pf?.telefone) tel.value = String(pf.telefone);
      } else {
        contactWrap.classList.add('ks-hidden');
      }
    }
    const paidWrap = $('ks-confirm-payment-check');
    const paidSel = $('ks-confirm-paid');
    const proofWrap = $('ks-confirm-proof-wrap');
    const proofFile = $('ks-confirm-proof-file');
    if (paidWrap) paidWrap.classList.toggle('ks-hidden', !state.salesModeActive);
    if (paidSel) paidSel.value = 'no';
    if (proofWrap) proofWrap.classList.add('ks-hidden');
    if (proofFile) proofFile.value = '';
    renderConfirmSalesDashboard();
    renderConfirmScroll();
    renderPromoClientBanner();
    window.scrollTo(0, 0);
  }

  function closeConfirmStep() {
    $('ks-step-confirm')?.classList.add('ks-hidden');
    $('ks-step-gallery')?.classList.remove('ks-hidden');
    window.scrollTo(0, 0);
  }

  function refreshSecondarySteps() {
    if (state.salesModeActive && compareStepOpen()) {
      openConfirmStep();
      return;
    }
    updateCompareAdvanceButton();
    if (compareStepOpen()) renderCompareUI();
    if (confirmStepOpen()) {
      renderConfirmSalesDashboard();
      renderConfirmScroll();
    }
  }

  async function onTogglePhoto(photoId) {
    const pid = normalizePhotoId(photoId);
    if (!pid) return;
    if (_toggleInFlight.has(pid)) return;
    if (selectionLockedForUi()) return;
    if (state.selected.has(pid) && isFrozenPhoto(pid)) {
      toast('Esta foto já foi confirmada numa seleção anterior e não pode ser desmarcada.', 'err');
      return;
    }
    const max = state.gallery.total_fotos_contratadas != null ? parseInt(state.gallery.total_fotos_contratadas, 10) : 0;
    if (!state.selected.has(pid) && max > 0 && effectiveSelectedCountForMaxLimit() >= max) {
      toast(`Limite de ${max} foto(s) para esta galeria.`, 'err');
      return;
    }

    const next = !state.selected.has(pid);
    const prev = new Set(state.selected);
    if (next) state.selected.add(pid);
    else state.selected.delete(pid);
    _toggleInFlight.add(pid);
    syncSelectionUiAfterChange(pid);

    try {
      const res = await fetch(`${API}/api/king-selection/client/select`, {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({ slug, photo_id: pid })
      });
      const data = await res.json().catch(() => ({}));
      if (handleClientUnauthorized(res, data)) return;
      if (!res.ok) throw new Error(data.message || 'Erro ao salvar');
      if (data.selected === false) {
        state.selected.delete(pid);
        if (state.hasSelectionBatch) delete state.batchByPhoto[String(pid)];
      } else if (data.selected === true) {
        state.selected.add(pid);
        if (state.hasSelectionBatch && data.selection_batch != null) {
          const br = parseInt(data.selection_batch, 10);
          state.batchByPhoto[String(pid)] = Number.isFinite(br) ? br : state.currentRound;
        }
      }
      syncSelectionUiAfterChange(pid);
    } catch (err) {
      state.selected = prev;
      syncSelectionUiAfterChange(pid);
      toast(err.message || 'Erro ao salvar', 'err');
    } finally {
      _toggleInFlight.delete(pid);
    }
  }

  async function clearCurrentRound() {
    if (selectionLockedForUi()) return;
    const msg = isPublicFreeDownloadGallery()
      ? 'Limpar a marcação das fotos? A galeria continua igual — você pode baixar qualquer foto depois.'
      : 'Limpar todas as fotos desta seleção atual? (Seleções anteriores permanecem.)';
    if (!confirm(msg)) return;
    try {
      const res = await fetch(`${API}/api/king-selection/client/select-bulk`, {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({ slug, mode: 'unselect', photo_ids: [] })
      });
      const data = await res.json().catch(() => ({}));
      if (handleClientUnauthorized(res, data)) return;
      if (!res.ok) throw new Error(data.message || 'Erro');
      const data2 = await loadGallery();
      applyGalleryData(data2);
      toast('Seleção limpa.', '');
    } catch (e) {
      const raw = String(e?.message || '').toLowerCase();
      if (
        raw.includes('já foi enviada') ||
        raw.includes('ja foi enviada') ||
        raw.includes('ja foi finalizada') ||
        raw.includes('já foi finalizada') ||
        raw.includes('nada para enviar')
      ) {
        toast('Sua seleção já foi enviada. Peça ao fotógrafo para abrir nova seleção ou reativar seu cadastro.', 'err');
      } else {
        toast(e.message || 'Erro', 'err');
      }
    }
  }

  async function finalizeSubmit() {
    if (state.locked) return;
    if (state.selected.size === 0) {
      toast('Não há fotos selecionadas.', 'err');
      return;
    }
    const min = state.gallery.min_selections != null ? parseInt(state.gallery.min_selections, 10) : 0;
    if (min > 0 && state.selected.size < min) {
      toast(`Selecione pelo menos ${min} foto(s).`, 'err');
      return;
    }
    const fbEl = $('ks-confirm-feedback');
    const fb = (fbEl && fbEl.value) ? String(fbEl.value).trim() : '';
    const paidChoice = String($('ks-confirm-paid')?.value || 'no').toLowerCase();
    const proofFile = $('ks-confirm-proof-file')?.files?.[0] || null;
    const payload = { slug, feedback: fb || undefined };
    if (confirmStepNeedsContactFields()) {
      const nome = ($('ks-confirm-nome')?.value || '').trim();
      const email = ($('ks-confirm-email')?.value || '').trim();
      const telefone = ($('ks-confirm-tel')?.value || '').trim();
      if (!nome || !email || !telefone) {
        toast('Preencha nome, e-mail e WhatsApp (com DDD).', 'err');
        return;
      }
      payload.nome = nome;
      payload.email = email;
      payload.telefone = telefone;
    }
    if (!confirm('Enviar sua seleção para o fotógrafo?')) return;
    try {
      const res = await fetch(`${API}/api/king-selection/client/finalize`, {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Erro ao enviar');
      if (data.token) {
        jwt = data.token;
        try { localStorage.setItem(tokenKey(slug), jwt); } catch (_) {}
      }
      const ty = data.thankYouConfig || {};
      const rawMsg = ty.message || 'Obrigado! Sua seleção foi recebida.';
      const msg = replaceThankYouPlaceholders(rawMsg, {
        selectionCount: data.selectionCount,
        photographerDisplayName: data.photographerDisplayName,
        clientDisplayName: data.clientDisplayName || null
      });
      closeAllSteps();

      let proofOkWithSelection = false;
      if (state.salesModeActive && paidChoice === 'yes' && proofFile) {
        try {
          const fd = new FormData();
          fd.append('slug', slug);
          fd.append('proof', proofFile);
          fd.append('note', 'Comprovante enviado junto com a finalização da seleção.');
          const up = await fetch(`${API}/api/king-selection/client/payment-proof`, {
            method: 'POST',
            headers: authHeaders(false),
            body: fd
          });
          const upData = await up.json().catch(() => ({}));
          if (!up.ok) throw new Error(upData.message || 'Falha ao enviar comprovante');
          proofOkWithSelection = true;
        } catch (proofErr) {
          toast(proofErr?.message || 'Seleção enviada, mas não foi possível enviar o comprovante agora.', 'err');
        }
      }

      if (state.salesModeActive) {
        try {
          const gd = await loadGallery();
          applyGalleryData(gd);
        } catch (bootErr) {
          toast(bootErr?.message || 'Seleção enviada, mas houve erro ao atualizar a página.', 'err');
        }
        syncSalesPostSubmitLayout();
        $('ks-downloads-panel')?.classList.remove('ks-hidden');
        requestAnimationFrame(() => {
          try {
            $('ks-downloads-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } catch (_) {
            window.scrollTo(0, 0);
          }
        });
        toast(
          proofOkWithSelection
            ? 'Seleção enviada! Abaixo estão suas fotos (marca d\'água). Atualize a página quando o fotógrafo liberar.'
            : 'Seleção enviada! Veja suas fotos abaixo. Quando o fotógrafo liberar, use «Atualizar liberações».',
          'ok'
        );
      } else {
        const tagHtml = data.photographerDisplayName
          ? `<strong>${escapeHtml(data.photographerDisplayName)}</strong>`
          : '';
        let galleryReloadOk = false;
        try {
          const gd = await loadGallery();
          applyGalleryData(gd);
          galleryReloadOk = true;
        } catch (bootErr) {
          toast(bootErr?.message || 'Seleção enviada, mas não foi possível atualizar a página agora.', 'err');
        }

        const canShowPublicDownloads =
          galleryReloadOk &&
          normKsAccessModeFromMeta() === 'public' &&
          state.photographerAllowsDownload &&
          state.allowDownload &&
          !publicMustRegisterToDownload();

        if (canShowPublicDownloads) {
          $('ks-locked')?.classList.add('ks-hidden');
          const notice = $('ks-notice');
          if (notice) {
            notice.innerHTML = `
              <div style="display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:14px">
                <div style="flex:1;min-width:0">
                  <div style="font-weight:900;font-size:1.08rem;margin-bottom:8px">${escapeHtml(ty.title || 'Obrigado!')}</div>
                  <div style="line-height:1.5;opacity:.95">${escapeHtml(msg)}</div>
                </div>
                <button type="button" class="ks-btn ks-btn-yellow" id="ks-post-finalize-dl" style="flex-shrink:0">
                  <i class="fas fa-download"></i> Baixar fotos
                </button>
              </div>`;
            notice.classList.remove('ks-hidden');
            notice.style.borderColor = 'rgba(74,222,128,.45)';
            notice.style.background = 'rgba(34,197,94,.12)';
            notice.style.color = '#ecfdf5';
          }
          renderPublicDownloadsPanel();
          $('ks-downloads-panel')?.classList.remove('ks-hidden');
          requestAnimationFrame(() => {
            try {
              $('ks-downloads-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } catch (_) {
              window.scrollTo(0, 0);
            }
          });
          $('ks-post-finalize-dl')?.addEventListener(
            'click',
            () => {
              try {
                $('ks-downloads-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              } catch (_) {}
            },
            { once: true }
          );
          toast('Seleção enviada! Abaixo você pode baixar suas fotos com marca d’água.', 'ok');
        } else {
          showLockedScreen(ty.title || 'Obrigado!', msg, tagHtml, data.paymentPix || null);
        }
      }
    } catch (e) {
      const raw = String(e?.message || '').toLowerCase();
      if (
        raw.includes('já foi enviada') ||
        raw.includes('ja foi enviada') ||
        raw.includes('ja foi finalizada') ||
        raw.includes('já foi finalizada') ||
        raw.includes('nada para enviar')
      ) {
        toast('Sua seleção já foi enviada. Peça ao fotógrafo para abrir nova seleção ou reativar seu cadastro.', 'err');
      } else {
        toast(e.message || 'Erro', 'err');
      }
    }
  }

  let viewerOpenPhotoId = null;
  let viewerSwipeStartX = 0;
  let viewerSwipeStartY = 0;
  let viewerSwipeActive = false;
  let viewerTouchHintTimer = null;

  function getViewerPhotoList() {
    if (compareStepOpen() || confirmStepOpen()) {
      const selectedList = getSelectedPhotosOrderedForReview({ currentRoundOnly: true });
      if (selectedList.length) return selectedList;
    }
    const gridList = getOrderedPhotosForGrid();
    if (gridList.length) return gridList;
    const all = Array.isArray(state.gallery?.photos) ? state.gallery.photos : [];
    return sortPhotos(all, state.sortMode || 'order');
  }

  function refreshSingleViewerNav() {
    const prevBtn = $('ks-viewer-prev');
    const nextBtn = $('ks-viewer-next');
    const list = getViewerPhotoList();
    const idx = list.findIndex((p) => parseInt(p.id, 10) === parseInt(viewerOpenPhotoId, 10));
    const disable = list.length <= 1 || idx < 0;
    if (prevBtn) prevBtn.disabled = disable;
    if (nextBtn) nextBtn.disabled = disable;
  }

  function viewerShowTouchHint() {
    const ov = $('ks-viewer');
    if (!ov) return;
    ov.classList.add('ks-viewer--touching');
    clearTimeout(viewerTouchHintTimer);
    viewerTouchHintTimer = setTimeout(() => {
      ov.classList.remove('ks-viewer--touching');
    }, 1400);
  }

  function viewerCycle(delta) {
    const list = getViewerPhotoList();
    if (!list.length) return;
    let idx = list.findIndex((p) => parseInt(p.id, 10) === parseInt(viewerOpenPhotoId, 10));
    if (idx < 0) idx = 0;
    const next = (idx + delta + list.length) % list.length;
    const pid = parseInt(list[next]?.id, 10) || 0;
    if (!pid) return;
    viewerOpenPhotoId = pid;
    const im = $('ks-viewer-img');
    if (im) im.src = previewUrl(pid, false);
    syncSingleViewerDownload();
    syncSingleViewerSelectUI();
    refreshSingleViewerNav();
  }

  function syncSingleViewerDownload() {
    const a = $('ks-viewer-download');
    if (!a) return;
    if (!jwt || !viewerOpenPhotoId) {
      a.classList.add('ks-hidden');
      a.removeAttribute('href');
      a.removeAttribute('data-pub-dl');
      return;
    }
    if (state.allowDownload) {
      a.href = previewDownloadUrl(viewerOpenPhotoId);
      a.removeAttribute('data-pub-dl');
      a.classList.remove('ks-hidden');
      return;
    }
    if (publicMustRegisterToDownload()) {
      a.href = '#';
      a.setAttribute('data-pub-dl', String(viewerOpenPhotoId));
      a.classList.remove('ks-hidden');
      return;
    }
    a.classList.add('ks-hidden');
    a.removeAttribute('href');
    a.removeAttribute('data-pub-dl');
  }

  /** Controles de seleção na vista ampliada (mesma lógica dos cartões da grelha). */
  function syncSingleViewerSelectUI() {
    const ov = $('ks-viewer');
    const checkBtn = $('ks-viewer-check');
    const actionBtn = $('ks-viewer-select-action');
    if (!ov || ov.classList.contains('ks-hidden') || viewerOpenPhotoId == null) {
      checkBtn?.classList.add('ks-hidden');
      actionBtn?.classList.add('ks-hidden');
      return;
    }
    const pid = parseInt(viewerOpenPhotoId, 10) || 0;
    if (!pid) {
      checkBtn?.classList.add('ks-hidden');
      actionBtn?.classList.add('ks-hidden');
      return;
    }
    if (state.locked) {
      checkBtn?.classList.add('ks-hidden');
      actionBtn?.classList.add('ks-hidden');
      return;
    }
    const sel = state.selected.has(pid);
    const fr = sel && isFrozenPhoto(pid);
    const bubbleClass = ['ks-check-btn', 'ks-viewer-check'];
    if (sel) bubbleClass.push('ks-check-btn--on');
    if (fr) bubbleClass.push('ks-check-btn--frozen');
    if (checkBtn) {
      checkBtn.className = bubbleClass.join(' ');
      checkBtn.disabled = !!fr;
      checkBtn.innerHTML = sel ? '<i class="fas fa-check" aria-hidden="true"></i>' : '';
      const bubbleLabel = fr
        ? 'Bloqueada (seleção anterior)'
        : sel ? 'Desmarcar' : 'Selecionar';
      checkBtn.setAttribute('aria-label', bubbleLabel);
      checkBtn.title = bubbleLabel;
      checkBtn.classList.remove('ks-hidden');
    }
    if (actionBtn) {
      actionBtn.classList.remove('ks-hidden');
      if (fr) {
        actionBtn.disabled = true;
        actionBtn.className = 'ks-viewer-select-action ks-viewer-select-action--lock';
        actionBtn.innerHTML = '<i class="fas fa-lock"></i> Bloqueada';
      } else if (sel) {
        actionBtn.disabled = false;
        actionBtn.className = 'ks-viewer-select-action ks-viewer-select-action--remove';
        actionBtn.innerHTML = '<i class="fas fa-times"></i> Remover da seleção';
      } else {
        actionBtn.disabled = false;
        actionBtn.className = 'ks-viewer-select-action ks-viewer-select-action--add';
        actionBtn.innerHTML = '<i class="fas fa-check"></i> Selecionar foto';
      }
    }
  }

  function syncViewerAbDownloadLinks() {
    const da = $('ks-viewer-ab-dl-a');
    const db = $('ks-viewer-ab-dl-b');
    const showDl = (el, photoId) => {
      if (!el || !photoId) {
        el?.classList.add('ks-hidden');
        el?.removeAttribute('href');
        el?.removeAttribute('data-pub-dl');
        return;
      }
      if (!jwt) {
        el.classList.add('ks-hidden');
        el.removeAttribute('href');
        el.removeAttribute('data-pub-dl');
        return;
      }
      if (state.allowDownload) {
        el.href = previewDownloadUrl(photoId);
        el.removeAttribute('data-pub-dl');
        el.classList.remove('ks-hidden');
        return;
      }
      if (publicMustRegisterToDownload()) {
        el.href = '#';
        el.setAttribute('data-pub-dl', String(photoId));
        el.classList.remove('ks-hidden');
        return;
      }
      el.classList.add('ks-hidden');
      el.removeAttribute('href');
      el.removeAttribute('data-pub-dl');
    };
    showDl(da, compareState.idA);
    showDl(db, compareState.idB);
  }

  let _viewerScrollY = 0;

  function openViewer(photoId) {
    viewerOpenPhotoId = photoId;
    const ov = $('ks-viewer');
    const im = $('ks-viewer-img');
    if (im) im.src = previewUrl(photoId, false);
    ov?.classList.remove('ks-hidden');
    ov?.setAttribute('aria-hidden', 'false');
    try {
      _viewerScrollY = window.scrollY || window.pageYOffset || 0;
      document.body.classList.add('ks-viewer-open');
      document.body.style.top = `-${_viewerScrollY}px`;
    } catch (_) {}
    syncSingleViewerDownload();
    syncSingleViewerSelectUI();
    refreshSingleViewerNav();
    viewerShowTouchHint();
  }

  function closeViewer() {
    viewerOpenPhotoId = null;
    const ov = $('ks-viewer');
    clearTimeout(viewerTouchHintTimer);
    ov?.classList.remove('ks-viewer--touching');
    ov?.classList.add('ks-hidden');
    ov?.setAttribute('aria-hidden', 'true');
    const im = $('ks-viewer-img');
    if (im) im.src = '';
    try {
      document.body.classList.remove('ks-viewer-open');
      document.body.style.top = '';
      window.scrollTo(0, _viewerScrollY);
    } catch (_) {}
    syncSingleViewerDownload();
    syncSingleViewerSelectUI();
  }

  let viewerAbZoomA = 1;
  let viewerAbZoomB = 1;
  let viewerAbPanXA = 0;
  let viewerAbPanYA = 0;
  let viewerAbPanXB = 0;
  let viewerAbPanYB = 0;
  let viewerAbPanningPanel = null;
  let viewerAbPanStartX = 0;
  let viewerAbPanStartY = 0;
  let viewerAbPanStartPX = 0;
  let viewerAbPanStartPY = 0;
  let viewerAbKeyPanel = 'a';
  const VIEWER_AB_ZOOM_MIN = 0.5;
  const VIEWER_AB_ZOOM_MAX = 4;
  const VIEWER_AB_ZOOM_STEP = 0.25;

  function viewerAbIsOpen() {
    const el = $('ks-viewer-ab');
    return !!(el && !el.classList.contains('ks-hidden'));
  }

  function viewerAbApplyTransform(panel) {
    const img = $(panel === 'a' ? 'ks-viewer-ab-a' : 'ks-viewer-ab-b');
    const wrap = $(panel === 'a' ? 'ks-viewer-ab-zoom-wrap-a' : 'ks-viewer-ab-zoom-wrap-b');
    if (!img || !wrap) return;
    const lvl = panel === 'a' ? viewerAbZoomA : viewerAbZoomB;
    const px = panel === 'a' ? viewerAbPanXA : viewerAbPanXB;
    const py = panel === 'a' ? viewerAbPanYA : viewerAbPanYB;
    img.style.transform = `translate(${px}px,${py}px) scale(${lvl})`;
    wrap.classList.toggle('zoomed', lvl > 1);
  }

  function viewerAbApplyZoom(panel, level) {
    const wrap = $(panel === 'a' ? 'ks-viewer-ab-zoom-wrap-a' : 'ks-viewer-ab-zoom-wrap-b');
    if (!wrap) return;
    level = Math.max(VIEWER_AB_ZOOM_MIN, Math.min(VIEWER_AB_ZOOM_MAX, level));
    if (panel === 'a') {
      viewerAbZoomA = level;
      if (level <= 1) { viewerAbPanXA = 0; viewerAbPanYA = 0; }
    } else {
      viewerAbZoomB = level;
      if (level <= 1) { viewerAbPanXB = 0; viewerAbPanYB = 0; }
    }
    viewerAbApplyTransform(panel);
  }

  function viewerAbZoomIn(panel) {
    viewerAbApplyZoom(panel, (panel === 'a' ? viewerAbZoomA : viewerAbZoomB) + VIEWER_AB_ZOOM_STEP);
  }

  function viewerAbZoomOut(panel) {
    viewerAbApplyZoom(panel, (panel === 'a' ? viewerAbZoomA : viewerAbZoomB) - VIEWER_AB_ZOOM_STEP);
  }

  function viewerAbResetZoom() {
    viewerAbZoomA = viewerAbZoomB = 1;
    viewerAbPanXA = viewerAbPanYA = viewerAbPanXB = viewerAbPanYB = 0;
    viewerAbPanningPanel = null;
    viewerAbApplyZoom('a', 1);
    viewerAbApplyZoom('b', 1);
    $('ks-viewer-ab-zoom-wrap-a')?.classList.remove('panning');
    $('ks-viewer-ab-zoom-wrap-b')?.classList.remove('panning');
  }

  function refreshViewerAbNav() {
    const list = getSelectedPhotosOrderedForReview({ currentRoundOnly: true });
    const n = list.length;
    const idxA = list.findIndex(p => p.id === compareState.idA);
    const idxB = list.findIndex(p => p.id === compareState.idB);
    const pa = $('ks-viewer-ab-prev-a');
    const na = $('ks-viewer-ab-next-a');
    const pb = $('ks-viewer-ab-prev-b');
    const nb = $('ks-viewer-ab-next-b');
    if (pa) pa.disabled = n <= 1 || idxA <= 0;
    if (na) na.disabled = n <= 1 || idxA < 0 || idxA >= n - 1;
    if (pb) pb.disabled = n <= 1 || idxB <= 0;
    if (nb) nb.disabled = n <= 1 || idxB < 0 || idxB >= n - 1;
    const fa = compareState.idA && isFrozenPhoto(compareState.idA);
    const fb = compareState.idB && isFrozenPhoto(compareState.idB);
    const rwa = $('ks-viewer-ab-remove-wrap-a');
    const rwb = $('ks-viewer-ab-remove-wrap-b');
    if (rwa) rwa.style.display = fa ? 'none' : '';
    if (rwb) rwb.style.display = fb ? 'none' : '';
  }

  function refreshViewerAbImages() {
    const ia = $('ks-viewer-ab-a');
    const ib = $('ks-viewer-ab-b');
    if (ia && compareState.idA) {
      ia.style.objectFit = 'contain';
      ia.style.objectPosition = 'center';
      ia.style.width = '100%';
      ia.style.height = '100%';
      ia.style.maxWidth = '100%';
      ia.style.maxHeight = '100%';
      ia.style.transform = 'translate(0px,0px) scale(1)';
      ia.src = previewUrl(compareState.idA, false);
    }
    if (ib && compareState.idB) {
      ib.style.objectFit = 'contain';
      ib.style.objectPosition = 'center';
      ib.style.width = '100%';
      ib.style.height = '100%';
      ib.style.maxWidth = '100%';
      ib.style.maxHeight = '100%';
      ib.style.transform = 'translate(0px,0px) scale(1)';
      ib.src = previewUrl(compareState.idB, false);
    }
    viewerAbApplyZoom('a', 1);
    viewerAbApplyZoom('b', 1);
    refreshViewerAbNav();
    syncViewerAbDownloadLinks();
  }

  function viewerAbCycle(panel, delta) {
    const list = getSelectedPhotosOrderedForReview({ currentRoundOnly: true });
    if (!list.length) return;
    const isA = panel === 'a';
    const current = isA ? compareState.idA : compareState.idB;
    let idx = list.findIndex(p => p.id === current);
    if (idx < 0) idx = 0;
    idx = (idx + delta + list.length) % list.length;
    const nextId = list[idx].id;
    if (isA) {
      compareState.idA = nextId;
      viewerAbZoomA = 1;
      viewerAbPanXA = 0;
      viewerAbPanYA = 0;
    } else {
      compareState.idB = nextId;
      viewerAbZoomB = 1;
      viewerAbPanXB = 0;
      viewerAbPanYB = 0;
    }
    viewerAbApplyTransform('a');
    viewerAbApplyTransform('b');
    refreshViewerAbImages();
    const sa = $('ks-cmp-sel-a');
    const sb = $('ks-cmp-sel-b');
    if (sa && compareState.idA) sa.value = String(compareState.idA);
    if (sb && compareState.idB) sb.value = String(compareState.idB);
    syncCompareImages();
    renderCompareStrip();
  }

  async function removeFromViewerAb(panel) {
    const pid = panel === 'a' ? compareState.idA : compareState.idB;
    if (!pid || isFrozenPhoto(pid)) return;
    closeViewerAb();
    await onTogglePhoto(pid);
    const after = getSelectedPhotosOrderedForReview({ currentRoundOnly: true });
    if (!after.length) {
      closeCompareStep();
      return;
    }
    if (!after.some(p => p.id === compareState.idA)) compareState.idA = after[0].id;
    if (!after.some(p => p.id === compareState.idB)) compareState.idB = after[Math.min(1, after.length - 1)].id;
    if (compareState.idA === compareState.idB && after.length > 1) {
      const o = after.find(p => p.id !== compareState.idA);
      if (o) compareState.idB = o.id;
    }
    renderCompareUI();
  }

  function openViewerAb() {
    if (state.salesModeActive || normKsAccessModeFromMeta() === 'public') {
      openConfirmStep();
      return;
    }
    const a = compareState.idA;
    const b = compareState.idB;
    if (!a || !b) return;
    viewerAbResetZoom();
    refreshViewerAbImages();
    syncViewerAbDownloadLinks();
    $('ks-viewer-ab')?.classList.remove('ks-hidden');
    $('ks-viewer-ab')?.setAttribute('aria-hidden', 'false');
    document.body.classList.add('ks-modal-ab-open');
  }

  function closeViewerAb() {
    viewerAbResetZoom();
    document.body.classList.remove('ks-modal-ab-open');
    $('ks-viewer-ab')?.classList.add('ks-hidden');
    $('ks-viewer-ab')?.setAttribute('aria-hidden', 'true');
    const ia = $('ks-viewer-ab-a');
    const ib = $('ks-viewer-ab-b');
    if (ia) {
      ia.src = '';
      ia.style.transform = '';
    }
    if (ib) {
      ib.src = '';
      ib.style.transform = '';
    }
    $('ks-viewer-ab-zoom-wrap-a')?.classList.remove('zoomed', 'panning');
    $('ks-viewer-ab-zoom-wrap-b')?.classList.remove('zoomed', 'panning');
  }

  $('ks-reauth-btn')?.addEventListener('click', async () => {
    const nome = ($('ks-reauth-nome')?.value || '').trim();
    const email = ($('ks-reauth-email')?.value || '').trim();
    const telefone = ($('ks-reauth-tel')?.value || '').trim();
    const err = $('ks-reauth-err');
    const errLogin = $('ks-login-err');
    err?.classList.add('ks-hidden');
    errLogin?.classList.add('ks-hidden');
    if (!nome || !email) {
      if (err) {
        err.textContent =
          'Preencha nome e e-mail. O WhatsApp só é necessário se já estiver salvo no cadastro (use o mesmo número de quando enviou).';
        err.classList.remove('ks-hidden');
      }
      return;
    }
    try {
      $('ks-reauth-btn').disabled = true;
      jwt = await apiLoginByDetails(nome, email, telefone);
      try { localStorage.setItem(tokenKey(slug), jwt); } catch (_) {}
      const data = await loadGallery();
      applyGalleryData(data);
    } catch (e) {
      if (err) {
        err.textContent = e.message || 'Erro';
        err.classList.remove('ks-hidden');
      }
    } finally {
      $('ks-reauth-btn').disabled = false;
    }
  });

  $('ks-register-first-btn')?.addEventListener('click', () => {
    void submitRegisterFirst();
  });

  $('ks-pub-guest-btn')?.addEventListener('click', async () => {
    const errLogin = $('ks-login-err');
    errLogin?.classList.add('ks-hidden');
    try {
      $('ks-pub-guest-btn').disabled = true;
      jwt = await apiPublicGuestEnter();
      try { localStorage.setItem(tokenKey(slug), jwt); } catch (_) {}
      const data = await loadGallery();
      applyGalleryData(data);
    } catch (e) {
      if (errLogin) {
        errLogin.textContent = e.message || 'Erro';
        errLogin.classList.remove('ks-hidden');
      }
    } finally {
      $('ks-pub-guest-btn').disabled = false;
    }
  });

  $('ks-modal-pub-submit')?.addEventListener('click', () => {
    void submitPublicRegisterFromModal();
  });
  $('ks-modal-pub-cancel')?.addEventListener('click', () => {
    pendingPublicDownloadAction = null;
    closePublicRegisterModal();
  });
  $('ks-modal-public-dl')?.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'ks-modal-public-dl') {
      pendingPublicDownloadAction = null;
      closePublicRegisterModal();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const m = $('ks-modal-public-dl');
    if (m && !m.classList.contains('ks-hidden')) {
      pendingPublicDownloadAction = null;
      closePublicRegisterModal();
    }
  });

  $('ks-viewer-download')?.addEventListener('click', (e) => {
    const a = $('ks-viewer-download');
    if (!a || !a.getAttribute('data-pub-dl')) return;
    if (!publicMustRegisterToDownload()) return;
    e.preventDefault();
    const id = parseInt(a.getAttribute('data-pub-dl'), 10) || 0;
    if (!id) return;
    pendingPublicDownloadAction = { type: 'photo', photoId: id };
    openPublicRegisterModal();
  });
  document.addEventListener(
    'click',
    (e) => {
      const t = e.target && e.target.closest && e.target.closest('#ks-viewer-ab-dl-a, #ks-viewer-ab-dl-b');
      if (!t || !t.getAttribute('data-pub-dl')) return;
      if (!publicMustRegisterToDownload()) return;
      e.preventDefault();
      const id = parseInt(t.getAttribute('data-pub-dl'), 10) || 0;
      if (!id) return;
      pendingPublicDownloadAction = { type: 'photo', photoId: id };
      openPublicRegisterModal();
    },
    true
  );

  $('ks-login-pw-btn')?.addEventListener('click', async () => {
    const email = ($('ks-login-email')?.value || '').trim();
    const senha = ($('ks-login-senha')?.value || '').trim();
    const err = $('ks-login-pw-err');
    const errLogin = $('ks-login-err');
    err?.classList.add('ks-hidden');
    errLogin?.classList.add('ks-hidden');
    if (!email || !senha) {
      if (err) {
        err.textContent = 'Preencha e-mail e senha.';
        err.classList.remove('ks-hidden');
      }
      return;
    }
    try {
      $('ks-login-pw-btn').disabled = true;
      jwt = await apiLoginEmailSenha(email, senha);
      try { localStorage.setItem(tokenKey(slug), jwt); } catch (_) {}
      const data = await loadGallery();
      applyGalleryData(data);
    } catch (e) {
      if (err) {
        err.textContent = e.message || 'Erro';
        err.classList.remove('ks-hidden');
      }
    } finally {
      $('ks-login-pw-btn').disabled = false;
    }
  });

  $('ks-logout').addEventListener('click', () => {
    jwt = null;
    state.publicDownloadsPanelOpen = false;
    try { localStorage.removeItem(tokenKey(slug)); } catch (_) {}
    showLogin();
  });
  $('ks-locked-logout').addEventListener('click', () => {
    jwt = null;
    state.publicDownloadsPanelOpen = false;
    try { localStorage.removeItem(tokenKey(slug)); } catch (_) {}
    showLogin();
  });
  $('ks-locked-open-gallery')?.addEventListener('click', async () => {
    try {
      const gd = await loadGallery();
      applyGalleryData(gd);
      showApp();
      $('ks-downloads-panel')?.classList.remove('ks-hidden');
      window.scrollTo(0, 0);
    } catch (e) {
      toast(e?.message || 'Não foi possível abrir suas fotos agora.', 'err');
    }
  });
  $('ks-confirm-paid')?.addEventListener('change', () => {
    const v = String($('ks-confirm-paid')?.value || 'no').toLowerCase();
    $('ks-confirm-proof-wrap')?.classList.toggle('ks-hidden', v !== 'yes');
  });
  $('ks-locked-pix-copy')?.addEventListener('click', async () => {
    const key = String($('ks-locked-pix-copy')?.getAttribute('data-pix-key') || '').trim();
    if (!key) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(key);
      } else {
        const ta = document.createElement('textarea');
        ta.value = key;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      toast('Chave PIX copiada.', 'ok');
    } catch (_) {
      toast('Não foi possível copiar automaticamente. Copie a chave manualmente.', 'err');
    }
  });
  $('ks-locked-pix-whats')?.addEventListener('click', () => {
    const url = String($('ks-locked-pix-whats')?.getAttribute('data-whats-link') || '').trim();
    if (!url) {
      toast('WhatsApp do fotógrafo não configurado.', 'err');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  });
  $('ks-locked-pix-whats-pending')?.addEventListener('click', () => {
    const url = String($('ks-locked-pix-whats-pending')?.getAttribute('data-whats-link') || '').trim();
    if (!url) {
      toast('WhatsApp do fotógrafo não configurado.', 'err');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  });

  $('ks-dl-pix-copy')?.addEventListener('click', async () => {
    const key = String($('ks-dl-pix-copy')?.getAttribute('data-pix-key') || '').trim();
    if (!key) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(key);
      } else {
        const ta = document.createElement('textarea');
        ta.value = key;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      toast('Chave PIX copiada.', 'ok');
    } catch (_) {
      toast('Não foi possível copiar automaticamente. Copie a chave manualmente.', 'err');
    }
  });

  $('ks-dl-proof-send')?.addEventListener('click', async () => {
    try {
      if (!state.salesModeActive) return;
      if (!state.clientAuthenticated) {
        throw new Error('Finalize e envie sua seleção antes de enviar comprovante.');
      }
      const file = $('ks-dl-proof-file')?.files?.[0];
      if (!file) throw new Error('Selecione a imagem do comprovante.');
      const fd = new FormData();
      fd.append('slug', slug);
      fd.append('proof', file);
      const res = await fetch(`${API}/api/king-selection/client/payment-proof`, {
        method: 'POST',
        headers: authHeaders(false),
        body: fd
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Erro ao enviar comprovante');
      if ($('ks-dl-proof-file')) $('ks-dl-proof-file').value = '';
      if ($('ks-dl-proof-status')) $('ks-dl-proof-status').textContent = 'Comprovante enviado. Aguarde validação do fotógrafo.';
      const gd = await loadGallery();
      applyGalleryData(gd);
      toast('Comprovante enviado com sucesso.', 'ok');
    } catch (e) {
      toast(e?.message || 'Erro ao enviar comprovante', 'err');
    }
  });

  $('ks-clear').addEventListener('click', () => clearCurrentRound());
  $('ks-send-edit')?.addEventListener('click', () => submitEditRequest());
  $('ks-compare')?.addEventListener('click', () => openCompareStep());
  $('ks-advance')?.addEventListener('click', () => {
    if (state.salesModeActive) openConfirmStep();
    else openCompareStep();
  });
  function toggleComparePinA() {
    compareState.thumbTargetMode = compareState.thumbTargetMode === 'pinA' ? 'auto' : 'pinA';
    syncComparePaneHighlight();
    renderCompareStrip();
  }
  function toggleComparePinB() {
    compareState.thumbTargetMode = compareState.thumbTargetMode === 'pinB' ? 'auto' : 'pinB';
    syncComparePaneHighlight();
    renderCompareStrip();
  }
  $('ks-cmp-hit-a')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleComparePinA();
  });
  $('ks-cmp-hit-b')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleComparePinB();
  });
  /** Fixar A/B ao tocar na foto ou na coluna (não no select). Capturing evita perder o clique se algo bloquear a fase bubble. */
  function compareImgcolPinClick(e, toggleFn) {
    const t = e.target;
    if (!(t instanceof Element) || typeof t.closest !== 'function') return;
    if (t.closest('button, select, option, optgroup, label')) return;
    toggleFn();
  }
  $('ks-cmp-imgcol-a')?.addEventListener(
    'click',
    (e) => compareImgcolPinClick(e, toggleComparePinA),
    true
  );
  $('ks-cmp-imgcol-b')?.addEventListener(
    'click',
    (e) => compareImgcolPinClick(e, toggleComparePinB),
    true
  );
  $('ks-cmp-close')?.addEventListener('click', () => closeCompareStep());
  $('ks-cmp-advance')?.addEventListener('click', () => openConfirmStep());
  $('ks-cmp-add-backdrop')?.addEventListener('click', () => closeCompareAddOverlay());
  $('ks-cmp-add-close')?.addEventListener('click', () => closeCompareAddOverlay());
  document.addEventListener('keydown', (e) => {
    if (state.salesModeActive && compareStepOpen()) {
      e.preventDefault();
      openConfirmStep();
      return;
    }
    if (e.key !== 'Escape') return;
    const ov = $('ks-cmp-add-overlay');
    if (!ov || ov.classList.contains('ks-hidden') || !compareStepOpen()) return;
    e.preventDefault();
    closeCompareAddOverlay();
  });

  $('ks-confirm-back-gallery')?.addEventListener('click', () => closeConfirmStep());
  $('ks-confirm-send')?.addEventListener('click', () => finalizeSubmit());

  $('ks-sales-confirm-go')?.addEventListener('click', () => openConfirmStep());

  $('ks-refresh-downloads')?.addEventListener('click', async () => {
    const btn = $('ks-refresh-downloads');
    if (btn) btn.disabled = true;
    try {
      const gd = await loadGallery();
      applyGalleryData(gd);
      const n = getSalesApprovedEntries().length;
      toast(
        n > 0
          ? `${n} foto(s) liberada(s)! Você já pode baixar em alta qualidade.`
          : 'Ainda aguardando liberação do fotógrafo. Tente de novo em instantes.',
        n > 0 ? 'ok' : ''
      );
    } catch (e) {
      toast(e?.message || 'Erro ao atualizar', 'err');
    } finally {
      if (btn) btn.disabled = false;
    }
  });

  $('ks-cmp-sel-a')?.addEventListener('change', () => {
    compareState.idA = parseInt($('ks-cmp-sel-a').value, 10) || null;
    syncCompareImages();
    renderCompareStrip();
  });
  $('ks-cmp-sel-b')?.addEventListener('change', () => {
    compareState.idB = parseInt($('ks-cmp-sel-b').value, 10) || null;
    syncCompareImages();
    renderCompareStrip();
  });
  $('ks-cmp-prev-a')?.addEventListener('click', () => stepCompareIndex('A', -1));
  $('ks-cmp-next-a')?.addEventListener('click', () => stepCompareIndex('A', 1));
  $('ks-cmp-prev-b')?.addEventListener('click', () => stepCompareIndex('B', -1));
  $('ks-cmp-next-b')?.addEventListener('click', () => stepCompareIndex('B', 1));
  $('ks-cmp-zoom-a')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (compareState.idA) openViewer(compareState.idA);
  });
  $('ks-cmp-zoom-b')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (compareState.idB) openViewer(compareState.idB);
  });
  $('ks-cmp-both')?.addEventListener('click', () => openViewerAb());
  $('ks-cmp-rm-a')?.addEventListener('click', () => {
    if (compareState.idA && !isFrozenPhoto(compareState.idA)) onTogglePhoto(compareState.idA);
  });
  $('ks-cmp-rm-b')?.addEventListener('click', () => {
    if (compareState.idB && !isFrozenPhoto(compareState.idB)) onTogglePhoto(compareState.idB);
  });

  $('ks-search').addEventListener('input', () => {
    state.searchRaw = $('ks-search').value;
    resetGridVirtualPaging();
    renderGrid();
  });
  $('ks-search-clear')?.addEventListener('click', () => {
    const inp = $('ks-search');
    if (inp) inp.value = '';
    state.searchRaw = '';
    resetGridVirtualPaging();
    renderGrid();
  });
  const onBackToFolders = () => {
    state.folderView = 'folders';
    state.activeFolderId = null;
    persistFolderNav();
    renderFolders();
    resetGridVirtualPaging();
    renderGrid();
  };
  $('ks-folder-back')?.addEventListener('click', onBackToFolders);
  $('ks-folder-back-top')?.addEventListener('click', onBackToFolders);
  $('ks-folder-select-all')?.addEventListener('click', () => selectAllInCurrentFolderScope());

  function ksOptionalTimeoutSignal(ms) {
    try {
      if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
        return AbortSignal.timeout(ms);
      }
    } catch (_) { }
    return undefined;
  }

  let _faceScanInFlight = false;

  /**
   * @param {HTMLElement | null} msgEl
   * @param {{ fromEnroll?: boolean, cacheClick?: boolean }} [opts]
   */
  async function runFaceScanAllPages(msgEl, opts) {
    if (_faceScanInFlight) {
      throw new Error('Já existe uma busca facial em curso. Aguarde terminar.');
    }
    _faceScanInFlight = true;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 25 * 60 * 1000);
    const o = opts || {};
    const headers = authHeaders(false);
    const noCacheFetchOpts = { headers, signal: ac.signal, cache: 'no-store' };
    const ncu = () => `&_ksnc=${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const speedMode = 'fast';
    const base = `${API}/api/king-selection/client/face-results`;
    async function sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
    async function fetchJsonWithRetry(url, attemptLabel, maxAttempts = 4) {
      let lastErr = null;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const res = await fetch(url, noCacheFetchOpts);
          const data = await res.json().catch(() => ({}));
          if (res.ok) return { ok: true, res, data };
          const status = res.status || 0;
          const isTransient = status === 0 || status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504 || status === 520 || status === 522 || status === 524;
          if (!isTransient) return { ok: false, res, data, permanent: true };
          lastErr = new Error((data && data.message) || `${attemptLabel}: HTTP ${status}`);
        } catch (err) {
          lastErr = err instanceof Error ? err : new Error(String(err || `${attemptLabel}: falha de rede`));
        }
        if (attempt < maxAttempts) {
          await sleep(400 * Math.pow(2, attempt - 1));
        }
      }
      return { ok: false, data: { message: lastErr ? lastErr.message : `${attemptLabel}: erro transitório` }, transientExhausted: true };
    }
    try {
      // Primeira página de cache (limite moderado); modo on-demand sem cache devolve FACE_USE_CHUNKED, não precisa de limit=8000.
      const probe = await fetchJsonWithRetry(`${base}?page=1&limit=500&speedMode=${encodeURIComponent(speedMode)}${ncu()}`, 'Probe face-results', 3);
      if (!probe.ok) {
        throw new Error((probe.data && probe.data.message) || 'Erro ao iniciar reconhecimento facial');
      }
      const resProbe = probe.res;
      const d0 = probe.data || {};

      if (resProbe.ok && d0.code === 'FACE_INDEXING_IN_PROGRESS') {
        return {
          photoIds: [],
          total: 0,
          indexing: true,
          message: String(d0.message || 'Estamos a preparar o reconhecimento desta selfie. Tente novamente em alguns segundos.')
        };
      }

      if (resProbe.ok && d0.fromCache) {
        let merged = (d0.photoIds || []).map((x) => parseInt(x, 10)).filter(Boolean);
        const totalHi = d0.total != null ? parseInt(d0.total, 10) : merged.length;
        const limitPg = 500;
        let page = 2;
        while (merged.length < totalHi) {
          if (msgEl && (!o.fromEnroll || page > 2)) {
            msgEl.textContent = `A carregar resultado guardado… ${merged.length} / ${totalHi}`;
          }
          const r2o = await fetchJsonWithRetry(`${base}?page=${page}&limit=${limitPg}&speedMode=${encodeURIComponent(speedMode)}${ncu()}`, 'Página cache facial', 3);
          if (!r2o.ok) throw new Error((r2o.data && r2o.data.message) || 'Erro ao carregar cache facial');
          const d2 = r2o.data || {};
          const chunk = (d2.photoIds || []).map((x) => parseInt(x, 10)).filter(Boolean);
          if (!chunk.length) break;
          merged.push(...chunk);
          if (chunk.length < limitPg) break;
          page += 1;
        }
        return {
          photoIds: merged,
          total: totalHi,
          message: String(d0.message || '').trim() || undefined
        };
      }

      if (resProbe.ok && (!d0.photoIds || d0.photoIds.length === 0) && (d0.total === 0 || d0.total == null)) {
        const msg = String(d0.message || '');
        if (msg.includes('referência') || msg.includes('referencia') || msg.includes('Cadastre')) {
          return { photoIds: [], total: 0 };
        }
      }

      /**
       * Modo indexado (REKOG_ON_DEMAND=false): API lê matches no Postgres.
       * Não usar chunked=1 aqui — o servidor ignora esse parâmetro e devolve outro JSON; o loop antigo
       * interpretava photoBatchReturned em falta como 40 e saía com anyHasMore=false → zero fotos sempre.
       */
      if (resProbe.ok && !d0.fromCache && d0.code !== 'FACE_USE_CHUNKED' && d0.faceChunk !== true) {
        let merged = (d0.photoIds || []).map((x) => parseInt(x, 10)).filter(Boolean);
        let totalHi = d0.total != null ? parseInt(d0.total, 10) : merged.length;
        if (!Number.isFinite(totalHi)) totalHi = merged.length;
        const limitPg = 500;
        let page = 2;
        while (merged.length < totalHi) {
          if (msgEl && (!o.fromEnroll || page > 2)) {
            msgEl.textContent = `A carregar resultado… ${merged.length} / ${totalHi}`;
          }
          const r2o = await fetchJsonWithRetry(`${base}?page=${page}&limit=${limitPg}&speedMode=${encodeURIComponent(speedMode)}${ncu()}`, 'Página face-results', 3);
          if (!r2o.ok) throw new Error((r2o.data && r2o.data.message) || 'Erro ao filtrar por rosto');
          const d2 = r2o.data || {};
          if (d2.code === 'FACE_USE_CHUNKED') break;
          const chunk = (d2.photoIds || []).map((x) => parseInt(x, 10)).filter(Boolean);
          if (!chunk.length) break;
          merged.push(...chunk);
          if (chunk.length < limitPg) break;
          page += 1;
        }
        return {
          photoIds: merged,
          total: totalHi,
          message: String(d0.message || '').trim() || undefined
        };
      }

      const needChunked =
        d0.code === 'FACE_USE_CHUNKED' ||
        (resProbe.status === 400 && String(d0.message || '').includes('chunked'));
      if (!needChunked && !resProbe.ok) {
        throw new Error(d0.message || 'Erro ao filtrar por rosto');
      }

      // Modo rápido: lotes pequenos e paralelismo moderado.
      const FACE_BATCH = 18;
      const FACE_PARALLEL = speedMode === 'fast' ? 2 : 1;
      const FACE_EARLY_STOP_MIN_MATCHES = 6;
      const FACE_EARLY_STOP_EMPTY_WAVES = 2;
      let skip = 0;
      const mergedSet = new Set();
      let partialFailure = false;
      let emptyWavesSinceLastHit = 0;
      const diagSum = {
        chunks: 0,
        totalRows: 0,
        compareAttempts: 0,
        compareMatches: 0,
        cropFaceCandidates: 0,
        cropCompareAttempts: 0,
        cropCompareMatches: 0,
        fetchErrors: 0,
        compareErrors: 0
      };
      let galleryTotal = null;
      let lastFaceUiAt = 0;
      for (;;) {
        if (msgEl && skip === 0 && galleryTotal == null) {
          msgEl.textContent = o.fromEnroll
            ? 'A comparar o seu rosto com a galeria em blocos no servidor… Não feche.'
            : o.cacheClick
              ? 'A analisar em blocos no servidor…'
              : 'A analisar a galeria em blocos…';
        }
        const waveSkips = [];
        for (let i = 0; i < FACE_PARALLEL; i++) {
          const s = skip + i * FACE_BATCH;
          if (galleryTotal != null && s >= galleryTotal) break;
          waveSkips.push(s);
        }
        if (!waveSkips.length) break;

        // inclui speedMode nas chamadas de chunk para modo rápido no backend
        const resultsFast = await Promise.all(
          waveSkips.map((photoSkip) =>
            fetchJsonWithRetry(
              `${base}?chunked=1&photoSkip=${photoSkip}&photoBatch=${FACE_BATCH}&page=1&limit=${FACE_BATCH}&speedMode=${encodeURIComponent(speedMode)}${ncu()}`,
              `Chunk ${photoSkip}`,
              4
            ).then((out) => {
              if (!out.ok) return { ok: false, cd: out.data || {}, photoSkip, exhausted: true };
              return { ok: true, cd: out.data || {}, photoSkip };
            })
          )
        );

        let nextSkip = skip;
        let anyHasMore = false;
        const mergedBeforeWave = mergedSet.size;
        for (const { ok, cd, photoSkip: psOut } of resultsFast) {
          if (!ok) {
            partialFailure = true;
            const psFail = Number.isFinite(psOut) ? parseInt(psOut, 10) : skip;
            nextSkip = Math.max(nextSkip, psFail + FACE_BATCH);
            anyHasMore = true;
            continue;
          }
          if (cd.galleryPhotoTotal != null) {
            const gt = parseInt(cd.galleryPhotoTotal, 10);
            if (Number.isFinite(gt)) galleryTotal = gt;
          }
          (cd.photoIds || []).forEach((x) => {
            const id = parseInt(x, 10);
            if (Number.isFinite(id) && id > 0) mergedSet.add(id);
          });
          if (cd && cd.diagnostics && typeof cd.diagnostics === 'object') {
            diagSum.chunks += 1;
            diagSum.totalRows += parseInt(cd.diagnostics.totalRows || 0, 10) || 0;
            diagSum.compareAttempts += parseInt(cd.diagnostics.compareAttempts || 0, 10) || 0;
            diagSum.compareMatches += parseInt(cd.diagnostics.compareMatches || 0, 10) || 0;
            diagSum.cropFaceCandidates += parseInt(cd.diagnostics.cropFaceCandidates || 0, 10) || 0;
            diagSum.cropCompareAttempts += parseInt(cd.diagnostics.cropCompareAttempts || 0, 10) || 0;
            diagSum.cropCompareMatches += parseInt(cd.diagnostics.cropCompareMatches || 0, 10) || 0;
            diagSum.fetchErrors += parseInt(cd.diagnostics.fetchErrors || 0, 10) || 0;
            diagSum.compareErrors += parseInt(cd.diagnostics.compareErrors || 0, 10) || 0;
          }
          const br =
            cd.photoBatchReturned != null ? parseInt(cd.photoBatchReturned, 10) : FACE_BATCH;
          const ps = cd.photoSkip != null ? parseInt(cd.photoSkip, 10) : skip;
          if (Number.isFinite(br) && br > 0) {
            nextSkip = Math.max(nextSkip, ps + br);
          }
          if (cd.hasMore) anyHasMore = true;
        }
        const waveHits = mergedSet.size - mergedBeforeWave;
        if (waveHits > 0) {
          emptyWavesSinceLastHit = 0;
        } else {
          emptyWavesSinceLastHit += 1;
        }

        if (msgEl && galleryTotal != null) {
          const now = Date.now();
          const processedEnd = Math.min(galleryTotal, nextSkip);
          const pctDone = Math.min(100, Math.round((processedEnd / galleryTotal) * 100));
          if (now - lastFaceUiAt >= 2000 || !anyHasMore || processedEnd >= galleryTotal) {
            lastFaceUiAt = now;
            msgEl.textContent = o.fromEnroll
              ? `A procurar o seu rosto… ${pctDone}%`
              : `A analisar a galeria… ${pctDone}%`;
          }
        }

        if (galleryTotal != null && nextSkip >= galleryTotal) break;
        if (
          speedMode === 'fast' &&
          mergedSet.size >= FACE_EARLY_STOP_MIN_MATCHES &&
          emptyWavesSinceLastHit >= FACE_EARLY_STOP_EMPTY_WAVES
        ) {
          // Em modo rápido, encerra cedo quando já há resultados e as últimas ondas não trouxeram novos hits.
          break;
        }
        if (!anyHasMore) break;
        skip = nextSkip;
      }
      const merged = Array.from(mergedSet);
      if (merged.length === 0 && diagSum.chunks > 0) {
        try {
          console.warn('[KS face] Sem matches nesta busca', diagSum);
        } catch (_) { }
      }

      const saveRes = await fetch(`${API}/api/king-selection/client/face-enroll-cache`, {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({ photoIds: merged }),
        signal: ac.signal
      });
      const saveD = await saveRes.json().catch(() => ({}));
      if (!saveRes.ok) {
        toast(saveD.message || 'Não foi possível guardar o cache; na próxima pode demorar outra vez.', 'err');
      }

      return {
        photoIds: merged,
        total: merged.length,
        partialFailure,
        message: partialFailure
          ? 'A busca facial concluiu com instabilidade de rede em alguns blocos. Se faltar alguma foto, tente novamente.'
          : undefined
      };
    } finally {
      clearTimeout(timer);
      _faceScanInFlight = false;
    }
  }

  function setFaceActionsDisabled(disabled) {
    ['ks-face-open-btn', 'ks-face-camera-btn', 'ks-face-gallery-btn', 'ks-face-modal-close'].forEach((id) => {
      const el = $(id);
      if (el) el.disabled = !!disabled;
    });
  }

  function closeFaceModal() {
    const modal = $('ks-face-modal');
    if (!modal) return;
    modal.classList.remove('ks-open');
    modal.setAttribute('aria-hidden', 'true');
  }

  function openFaceModal() {
    const modal = $('ks-face-modal');
    if (!modal) return;
    modal.classList.add('ks-open');
    modal.setAttribute('aria-hidden', 'false');
  }

  let _faceImageProcessInFlight = false;
  let _lastFacePickSig = '';
  let _lastFacePickAt = 0;

  async function processFaceImageFile(file) {
    const msg = $('ks-face-msg');
    if (!file || !jwt) return;
    const sig = `${file.name || 'noname'}:${file.size || 0}:${file.lastModified || 0}`;
    const now = Date.now();
    if (_faceImageProcessInFlight) return;
    // Evita duplo disparo quando o input é acionado duas vezes.
    if (_lastFacePickSig === sig && now - _lastFacePickAt < 2500) return;
    _lastFacePickSig = sig;
    _lastFacePickAt = now;
    _faceImageProcessInFlight = true;
    closeFaceModal();
      state.folderView = 'photos';
      state.activeFolderId = null;
      persistFolderNav();
      renderFolders();
      state.faceFilterIds = null;
      resetGridVirtualPaging();
      renderGrid();
    if (msg) msg.textContent = 'Enviando foto do rosto…';
    setFaceActionsDisabled(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const enrollRes = await fetch(`${API}/api/king-selection/client/enroll-face-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
        body: fd,
        signal: ksOptionalTimeoutSignal(180000)
      });
      const enrollData = await enrollRes.json().catch(() => ({}));
      if (!enrollRes.ok) throw new Error(enrollData.message || 'Erro ao registar o rosto');
      if (msg) {
        msg.textContent =
          'A procurar as suas fotos… A análise corre em blocos no servidor (costuma ser bem mais rápida do que “foto a foto”). Não feche.';
      }
      const scan = await runFaceScanAllPages(msg, { fromEnroll: true });
      const ids = scan.photoIds || [];
      state.faceFilterIds = new Set(
        ids.map((x) => parseInt(x, 10)).filter((n) => Number.isFinite(n) && n > 0)
      );
      state.folderView = 'photos';
      state.activeFolderId = null;
      persistFolderNav();
      renderFolders();
      if (scan.indexing) {
        if (msg) msg.textContent = scan.message || 'Estamos a preparar o reconhecimento. Aguarde alguns segundos e tente novamente.';
        toast('Selfie recebida. Estamos a preparar o reconhecimento.', 'ok');
        resetGridVirtualPaging();
        renderGrid();
        return;
      }
      const noResultMsg = String(scan.message || '').trim() || 'Nenhuma foto parecida encontrada nesta galeria.';
      if (msg) {
        msg.textContent = ids.length
          ? `${ids.length} foto(s) com seu rosto.`
          : noResultMsg;
      }
      toast(
        ids.length ? `${ids.length} foto(s) encontradas pelo rosto.` : noResultMsg,
        ids.length ? 'ok' : 'warn'
      );
      resetGridVirtualPaging();
      renderGrid();
    } catch (e) {
      state.faceFilterIds = null;
      resetGridVirtualPaging();
      renderGrid();
      if (msg) msg.textContent = '';
      const aborted = e && (e.name === 'AbortError' || e.name === 'TimeoutError');
      toast(
        aborted
          ? 'Tempo esgotado ou ligação interrompida. Tente de novo (em galerias muito grandes demore um pouco).'
          : (e.message || 'Erro'),
        'err'
      );
    } finally {
      setFaceActionsDisabled(false);
      _faceImageProcessInFlight = false;
    }
  }

  // Botões de selfie/galeria usam fallback inline no HTML para evitar perda de clique por cache antigo.
  // Não ligar listeners duplicados aqui, para não abrir seletor duas vezes.
  $('ks-face-open-btn')?.addEventListener('click', () => openFaceModal());
  $('ks-face-modal-close')?.addEventListener('click', () => closeFaceModal());
  $('ks-face-modal')?.addEventListener('click', (ev) => {
    if (ev.target && ev.target.id === 'ks-face-modal') closeFaceModal();
  });
  $('ks-face-camera-in')?.addEventListener('change', async (ev) => {
    const f = ev.target?.files?.[0];
    ev.target.value = '';
    await processFaceImageFile(f);
  });
  $('ks-face-gallery-in')?.addEventListener('change', async (ev) => {
    const f = ev.target?.files?.[0];
    ev.target.value = '';
    await processFaceImageFile(f);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeFaceModal();
  });

  $('ks-sort').addEventListener('change', () => {
    state.sortMode = $('ks-sort').value;
    resetGridVirtualPaging();
    renderGrid();
  });

  $('ks-open-downloads')?.addEventListener('click', () => {
    if (isPublicFreeDownloadGallery()) return;
    if (publicMustRegisterToDownload()) {
      pendingPublicDownloadAction = { type: 'openPanel' };
      openPublicRegisterModal();
      return;
    }
    state.publicDownloadsPanelOpen = true;
    if (normKsAccessModeFromMeta() === 'public') {
      renderPublicDownloadsPanel();
    } else {
      renderSalesUi();
    }
    $('ks-downloads-panel')?.classList.remove('ks-hidden');
    requestAnimationFrame(() => {
      try {
        $('ks-downloads-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (_) {}
    });
  });

  $('ks-pub-dl-selected')?.addEventListener('click', async () => {
    try {
      const picks = getPublicMarkedPhotoIdsForDownload();
      if (!picks.length) throw new Error('Marque pelo menos 1 foto ou use «Baixar todas».');
      await downloadPhotosSequentially(picks, {
        onProgress: (n, total) => setDownloadsProgress(n, total, true, 'selected')
      });
      toast(`Download iniciado (${picks.length} foto(s)).`, 'ok');
    } catch (e) {
      toast(e?.message || 'Erro ao baixar', 'err');
    } finally {
      setDownloadsProgress(0, 1, false);
    }
  });
  $('ks-pub-dl-all')?.addEventListener('click', async () => {
    try {
      const all = getPublicGalleryPhotoList().map((p) => p.id);
      if (!all.length) throw new Error('Não há fotos na galeria.');
      const out = await downloadAllPhotosSmart(all, {
        onProgress: (n, total) => setDownloadsProgress(n, total, true, 'all')
      });
      if (out?.mode === 'zip') {
        toast(`Download em ${out.parts} ZIP(s) iniciado (${all.length} foto(s)).`, 'ok');
      } else {
        toast(`Download de todas iniciado (${all.length} foto(s)).`, 'ok');
      }
    } catch (e) {
      toast(e?.message || 'Erro ao baixar todas', 'err');
    } finally {
      setDownloadsProgress(0, 1, false);
    }
  });
  $('ks-pub-dl-zip')?.addEventListener('click', async () => {
    try {
      const all = getPublicGalleryPhotoList().map((p) => p.id);
      if (!all.length) throw new Error('Não há fotos na galeria.');
      setDownloadsProgress(0, 1, true, 'zip');
      await downloadApprovedZip(all);
      toast(`ZIP gerado com ${all.length} foto(s).`, 'ok');
    } catch (e) {
      toast(e?.message || 'Erro ao gerar ZIP', 'err');
    } finally {
      setDownloadsProgress(0, 1, false);
    }
  });
  $('ks-downloads-select-all')?.addEventListener('change', () => {
    const approved = getApprovedDownloadsForClient();
    const allIds = approved.map((p) => p.id);
    state.downloadsTouched = true;
    if ($('ks-downloads-select-all')?.checked) {
      state.downloadsSelected = new Set(allIds);
    } else {
      state.downloadsSelected = new Set();
    }
    renderSalesUi();
  });
  $('ks-downloads-select-none')?.addEventListener('click', () => {
    state.downloadsTouched = true;
    state.downloadsSelected = new Set();
    renderSalesUi();
  });
  $('ks-downloads-download-selected')?.addEventListener('click', async () => {
    try {
      const picks = Array.from(state.downloadsSelected || new Set()).map((x) => parseInt(x, 10)).filter(Boolean);
      if (!picks.length) throw new Error('Selecione pelo menos 1 foto liberada.');
      const msgEl = $('ks-downloads-msg');
      const prevMsg = msgEl ? String(msgEl.textContent || '') : '';
      setDownloadsProgress(0, picks.length, true, 'selected');
      if (msgEl) msgEl.textContent = `Baixando 0/${picks.length}...`;
      await downloadPhotosSequentially(picks, {
        onProgress: (n, total) => {
          setDownloadsProgress(n, total, true, 'selected');
          if (msgEl) msgEl.textContent = `Baixando ${n}/${total}...`;
        }
      });
      setDownloadsProgress(picks.length, picks.length, true, 'selected');
      if (msgEl) {
        msgEl.textContent = `Concluído: ${picks.length}/${picks.length} download(s) iniciados.`;
        setTimeout(() => {
          if (msgEl) msgEl.textContent = prevMsg || msgEl.textContent;
          setDownloadsProgress(0, 1, false);
        }, 2200);
      }
      toast(`Download iniciado (${picks.length} foto(s)).`, 'ok');
    } catch (e) {
      setDownloadsProgress(0, 1, false);
      toast(e?.message || 'Erro ao baixar fotos selecionadas', 'err');
    }
  });
  $('ks-downloads-download-all')?.addEventListener('click', async () => {
    try {
      const all = getApprovedDownloadsForClient().map((p) => p.id);
      if (!all.length) throw new Error('Ainda não há fotos liberadas para baixar.');
      const msgEl = $('ks-downloads-msg');
      const prevMsg = msgEl ? String(msgEl.textContent || '') : '';
      setDownloadsProgress(0, all.length, true, 'all');
      if (msgEl) msgEl.textContent = `Baixando 0/${all.length}...`;
      const out = await downloadAllPhotosSmart(all, {
        onProgress: (n, total) => {
          setDownloadsProgress(n, total, true, 'all');
          if (msgEl) msgEl.textContent = `Baixando ${n}/${total}...`;
        }
      });
      if (out?.mode === 'zip') {
        if (msgEl) msgEl.textContent = `ZIP em ${out.parts} parte(s) — ${all.length} foto(s).`;
        toast(`Download em ${out.parts} ZIP(s) (${all.length} foto(s)).`, 'ok');
      } else {
        setDownloadsProgress(all.length, all.length, true, 'all');
        if (msgEl) {
          msgEl.textContent = `Concluído: ${all.length}/${all.length} download(s) iniciados.`;
          setTimeout(() => {
            if (msgEl) msgEl.textContent = prevMsg || msgEl.textContent;
            setDownloadsProgress(0, 1, false);
          }, 2200);
        }
        toast(`Download de todas iniciado (${all.length} foto(s)).`, 'ok');
      }
    } catch (e) {
      setDownloadsProgress(0, 1, false);
      toast(e?.message || 'Erro ao baixar todas', 'err');
    }
  });
  $('ks-downloads-download-zip')?.addEventListener('click', async () => {
    try {
      const all = getApprovedDownloadsForClient().map((p) => p.id);
      if (!all.length) throw new Error('Ainda não há fotos liberadas para baixar em ZIP.');
      const msgEl = $('ks-downloads-msg');
      const prevMsg = msgEl ? String(msgEl.textContent || '') : '';
      setDownloadsProgress(0, 1, true, 'zip');
      if (msgEl) msgEl.textContent = 'Preparando ZIP...';
      setDownloadsProgress(1, 3, true, 'zip');
      await downloadApprovedZip(all);
      setDownloadsProgress(3, 3, true, 'zip');
      if (msgEl) {
        msgEl.textContent = `ZIP pronto com ${all.length} foto(s).`;
        setTimeout(() => {
          if (msgEl) msgEl.textContent = prevMsg || msgEl.textContent;
          setDownloadsProgress(0, 1, false);
        }, 2200);
      }
      toast(`ZIP gerado com ${all.length} foto(s).`, 'ok');
    } catch (e) {
      setDownloadsProgress(0, 1, false);
      toast(e?.message || 'Erro ao gerar ZIP', 'err');
    }
  });
  $('ks-support-whats')?.addEventListener('click', () => {
    const url = String($('ks-support-whats')?.getAttribute('data-whats-link') || '').trim();
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  });
  $('ks-proof-amount')?.addEventListener('blur', () => {
    const el = $('ks-proof-amount');
    if (!el) return;
    const cents = parseReaisInputToCents(el.value);
    if (cents == null) return;
    el.value = (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  });
  $('ks-proof-send')?.addEventListener('click', async () => {
    try {
      if (!state.salesModeActive) return;
      if (!state.clientAuthenticated) {
        throw new Error('Finalize e envie sua seleção antes de enviar comprovante.');
      }
      const file = $('ks-proof-file')?.files?.[0];
      if (!file) throw new Error('Selecione a imagem do comprovante.');
      const fd = new FormData();
      fd.append('slug', slug);
      fd.append('proof', file);
      const note = String($('ks-proof-note')?.value || '').trim();
      const amountRaw = String($('ks-proof-amount')?.value || '').trim();
      const amount = amountRaw ? parseReaisInputToCents(amountRaw) : null;
      if (note) fd.append('note', note);
      if (amount != null) fd.append('amount_cents', String(amount));
      const res = await fetch(`${API}/api/king-selection/client/payment-proof`, {
        method: 'POST',
        headers: authHeaders(false),
        body: fd
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Erro ao enviar comprovante');
      if ($('ks-proof-file')) $('ks-proof-file').value = '';
      if ($('ks-proof-status')) $('ks-proof-status').textContent = 'Comprovante enviado. Aguarde validação do fotógrafo.';
      const gd = await loadGallery();
      applyGalleryData(gd);
      toast('Comprovante enviado com sucesso.', 'ok');
    } catch (e) {
      toast(e?.message || 'Erro ao enviar comprovante', 'err');
    }
  });

  $('ks-folder-sort')?.addEventListener('change', () => {
    const v = String($('ks-folder-sort')?.value || 'manual');
    state.folderSortMode = ['manual', 'name', 'count'].includes(v) ? v : 'manual';
    renderFolders();
  });

  $('ks-viewer-close').addEventListener('click', closeViewer);
  $('ks-viewer-prev')?.addEventListener('click', (e) => {
    e.stopPropagation();
    viewerCycle(-1);
  });
  $('ks-viewer-next')?.addEventListener('click', (e) => {
    e.stopPropagation();
    viewerCycle(1);
  });
  $('ks-viewer').addEventListener('click', (e) => {
    if (e.target.id === 'ks-viewer') closeViewer();
  });
  $('ks-viewer-check')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const pid = parseInt(viewerOpenPhotoId, 10) || 0;
    if (!pid || state.locked) return;
    const cb = $('ks-viewer-check');
    if (cb?.disabled || cb?.classList.contains('ks-check-btn--frozen')) return;
    void onTogglePhoto(pid);
  });
  $('ks-viewer-select-action')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const pid = parseInt(viewerOpenPhotoId, 10) || 0;
    const ab = $('ks-viewer-select-action');
    if (!pid || state.locked || !ab || ab.disabled || ab.classList.contains('ks-viewer-select-action--lock')) return;
    void onTogglePhoto(pid);
  });
  $('ks-viewer-img')?.addEventListener('touchstart', (e) => {
    if (!viewerOpenPhotoId || !e.touches || !e.touches[0]) return;
    viewerSwipeActive = true;
    viewerSwipeStartX = e.touches[0].clientX;
    viewerSwipeStartY = e.touches[0].clientY;
    viewerShowTouchHint();
  }, { passive: true });
  $('ks-viewer-img')?.addEventListener('touchend', (e) => {
    if (!viewerSwipeActive || !e.changedTouches || !e.changedTouches[0]) return;
    viewerSwipeActive = false;
    const dx = e.changedTouches[0].clientX - viewerSwipeStartX;
    const dy = e.changedTouches[0].clientY - viewerSwipeStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (absDx >= 44 && absDx > (absDy * 1.25)) {
      if (dx < 0) viewerCycle(1);
      else viewerCycle(-1);
    }
  }, { passive: true });
  $('ks-viewer-img')?.addEventListener('touchcancel', () => {
    viewerSwipeActive = false;
  }, { passive: true });
  $('ks-viewer-ab-close')?.addEventListener('click', closeViewerAb);

  $('ks-viewer-ab-zoom-in-a')?.addEventListener('click', () => viewerAbZoomIn('a'));
  $('ks-viewer-ab-zoom-out-a')?.addEventListener('click', () => viewerAbZoomOut('a'));
  $('ks-viewer-ab-zoom-in-b')?.addEventListener('click', () => viewerAbZoomIn('b'));
  $('ks-viewer-ab-zoom-out-b')?.addEventListener('click', () => viewerAbZoomOut('b'));
  $('ks-viewer-ab-zoom-reset-a')?.addEventListener('click', () => viewerAbApplyZoom('a', 1));
  $('ks-viewer-ab-zoom-reset-b')?.addEventListener('click', () => viewerAbApplyZoom('b', 1));
  $('ks-viewer-ab-zoom-overlay-a')?.addEventListener('click', (e) => {
    e.stopPropagation();
    viewerAbApplyZoom('a', 1);
  });
  $('ks-viewer-ab-zoom-overlay-b')?.addEventListener('click', (e) => {
    e.stopPropagation();
    viewerAbApplyZoom('b', 1);
  });
  $('ks-viewer-ab-zoom-overlay-a')?.addEventListener('mousedown', (e) => e.stopPropagation());
  $('ks-viewer-ab-zoom-overlay-b')?.addEventListener('mousedown', (e) => e.stopPropagation());

  $('ks-viewer-ab-prev-a')?.addEventListener('click', () => {
    viewerAbKeyPanel = 'a';
    viewerAbCycle('a', -1);
  });
  $('ks-viewer-ab-next-a')?.addEventListener('click', () => {
    viewerAbKeyPanel = 'a';
    viewerAbCycle('a', 1);
  });
  $('ks-viewer-ab-prev-b')?.addEventListener('click', () => {
    viewerAbKeyPanel = 'b';
    viewerAbCycle('b', -1);
  });
  $('ks-viewer-ab-next-b')?.addEventListener('click', () => {
    viewerAbKeyPanel = 'b';
    viewerAbCycle('b', 1);
  });

  $('ks-viewer-ab-remove-a')?.addEventListener('click', () => { void removeFromViewerAb('a'); });
  $('ks-viewer-ab-remove-b')?.addEventListener('click', () => { void removeFromViewerAb('b'); });

  (function initViewerAbWheelPanKeys() {
    const wrapA = $('ks-viewer-ab-zoom-wrap-a');
    const wrapB = $('ks-viewer-ab-zoom-wrap-b');
    function onWheel(e, panel) {
      e.preventDefault();
      e.stopPropagation();
      const d = e.deltaY > 0 ? -VIEWER_AB_ZOOM_STEP : VIEWER_AB_ZOOM_STEP;
      viewerAbApplyZoom(panel, (panel === 'a' ? viewerAbZoomA : viewerAbZoomB) + d);
    }
    wrapA?.addEventListener('wheel', e => onWheel(e, 'a'), { passive: false });
    wrapB?.addEventListener('wheel', e => onWheel(e, 'b'), { passive: false });

    function getCoords(e) {
      if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      return { x: e.clientX, y: e.clientY };
    }
    function startPan(e, panel) {
      const lvl = panel === 'a' ? viewerAbZoomA : viewerAbZoomB;
      if (lvl <= 1) return;
      e.preventDefault();
      viewerAbPanningPanel = panel;
      const w = $(panel === 'a' ? 'ks-viewer-ab-zoom-wrap-a' : 'ks-viewer-ab-zoom-wrap-b');
      w?.classList.add('panning');
      const c = getCoords(e);
      viewerAbPanStartX = c.x;
      viewerAbPanStartY = c.y;
      viewerAbPanStartPX = panel === 'a' ? viewerAbPanXA : viewerAbPanXB;
      viewerAbPanStartPY = panel === 'a' ? viewerAbPanYA : viewerAbPanYB;
    }
    function movePan(e) {
      if (!viewerAbPanningPanel) return;
      e.preventDefault();
      const c = getCoords(e);
      const dx = c.x - viewerAbPanStartX;
      const dy = c.y - viewerAbPanStartY;
      if (viewerAbPanningPanel === 'a') {
        viewerAbPanXA = viewerAbPanStartPX + dx;
        viewerAbPanYA = viewerAbPanStartPY + dy;
      } else {
        viewerAbPanXB = viewerAbPanStartPX + dx;
        viewerAbPanYB = viewerAbPanStartPY + dy;
      }
      viewerAbApplyTransform(viewerAbPanningPanel);
    }
    function endPan() {
      if (viewerAbPanningPanel) {
        const w = $(viewerAbPanningPanel === 'a' ? 'ks-viewer-ab-zoom-wrap-a' : 'ks-viewer-ab-zoom-wrap-b');
        w?.classList.remove('panning');
      }
      viewerAbPanningPanel = null;
    }
    function setupWrap(wrap, panel) {
      if (!wrap) return;
      wrap.addEventListener('mousedown', (e) => {
        if (e.button === 0) startPan(e, panel);
      });
      wrap.addEventListener('touchstart', e => startPan(e, panel), { passive: false });
    }
    setupWrap(wrapA, 'a');
    setupWrap(wrapB, 'b');
    document.addEventListener('mousemove', movePan);
    document.addEventListener('mouseup', endPan);
    document.addEventListener('mouseleave', endPan);
    document.addEventListener('touchmove', movePan, { passive: false });
    document.addEventListener('touchend', endPan);
    document.addEventListener('touchcancel', endPan);
  })();

  document.addEventListener('keydown', (e) => {
    if (state.salesModeActive && compareStepOpen()) {
      e.preventDefault();
      openConfirmStep();
      return;
    }
    if (viewerAbIsOpen()) {
      const tag = (e.target && e.target.tagName) ? String(e.target.tagName).toLowerCase() : '';
      if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          viewerAbCycle(viewerAbKeyPanel, -1);
          return;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          viewerAbCycle(viewerAbKeyPanel, 1);
          return;
        }
      }
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const v = $('ks-viewer');
      if (v && !v.classList.contains('ks-hidden')) {
        const tag = (e.target && e.target.tagName) ? String(e.target.tagName).toLowerCase() : '';
        if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
          e.preventDefault();
          viewerCycle(e.key === 'ArrowLeft' ? -1 : 1);
        }
        return;
      }
    }
    if (e.key !== 'Escape') return;
    const v = $('ks-viewer');
    if (v && !v.classList.contains('ks-hidden')) {
      closeViewer();
      return;
    }
    const vab = $('ks-viewer-ab');
    if (vab && !vab.classList.contains('ks-hidden')) {
      closeViewerAb();
      return;
    }
    if (compareStepOpen()) {
      closeCompareStep();
    }
  });

  async function boot() {
    ensureClientEditRequestButton();
    if (!API) {
      hideBootScreen();
      showLogin();
      $('ks-login-sub').textContent = 'Defina API_URL em config.js.';
      $('ks-login-body')?.classList.add('ks-hidden');
      return;
    }
    scheduleBootWatchdog();
    try {
      let r;
      try {
        r = await fetchWithTimeout(
          `${API}/api/king-selection/public/gallery?slug=${encodeURIComponent(slug)}`,
          { cache: 'no-store' },
          KS_FETCH_BOOT_MS
        );
      } catch (e) {
        throw friendlyFetchError(e);
      }
      const data = await safeResponseJson(r, KS_JSON_BOOT_MS).catch((e) => {
        throw friendlyFetchError(e);
      });
      if (!r.ok) throw new Error(data.message || 'Galeria não encontrada.');
      galleryMeta = data.gallery;
      try {
        const boot = typeof window !== 'undefined' ? window.__KS_BOOT_GALLERY_META : null;
        if (boot && typeof boot === 'object' && boot.access_mode) {
          galleryMeta = {
            ...galleryMeta,
            access_mode: String(boot.access_mode).toLowerCase().trim(),
            ...(typeof boot.allow_self_signup === 'boolean' ? { allow_self_signup: boot.allow_self_signup } : {}),
            ...(boot.allow_client_edit_request === true ? { allow_client_edit_request: true } : {})
          };
        }
      } catch (_) {}
    } catch (e) {
      hideBootScreen();
      showLogin();
      $('ks-login-sub').textContent = (e && e.message) ? e.message : 'Erro ao carregar.';
      $('ks-login-body')?.classList.add('ks-hidden');
      $('ks-login-err').textContent = e.message || '';
      $('ks-login-err').classList.remove('ks-hidden');
      return;
    }

    hideBootScreen();
    await awaitEntrySplashIfNeeded();

    let mode = String(galleryMeta.access_mode || 'private').toLowerCase();
    if (mode === 'password') mode = 'signup';

    if (mustRegisterBeforeGallery()) {
      if (jwt) {
        try {
          const gd = await loadGallery();
          if (hasRegisteredClientFromData(gd)) {
            applyGalleryData(gd);
            return;
          }
          if (!jwtPayloadClientId()) {
            jwt = null;
            try { localStorage.removeItem(tokenKey(slug)); } catch (_) {}
          }
        } catch (e) {
          const msg = String(e?.message || '').toLowerCase();
          const expired =
            msg.includes('sessão expirada') ||
            msg.includes('sessao expirada') ||
            msg.includes('não autorizado') ||
            msg.includes('nao autorizado');
          if (expired || !jwtPayloadClientId()) {
            jwt = null;
            try { localStorage.removeItem(tokenKey(slug)); } catch (_) {}
          }
        }
      }
      hideBootScreen();
      showLogin();
      return;
    }

    configureLoginUI();

    if (galleryMeta.deferred_signup_flow && !jwt) {
      try {
        let res;
        try {
          res = await fetchWithTimeout(
            `${API}/api/king-selection/client/signup-enter`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ slug })
            },
            KS_FETCH_BOOT_MS
          );
        } catch (e) {
          throw friendlyFetchError(e);
        }
        const d = await safeResponseJson(res, KS_JSON_BOOT_MS).catch((e) => {
          throw friendlyFetchError(e);
        });
        if (!res.ok) throw new Error(d.message || 'Não foi possível iniciar a sessão.');
        jwt = d.token;
        try { localStorage.setItem(tokenKey(slug), jwt); } catch (_) {}
        const gd = await loadGallery();
        applyGalleryData(gd);
      } catch (e) {
        hideBootScreen();
        showLogin();
        $('ks-login-sub').textContent = e.message || 'Erro ao abrir galeria.';
        $('ks-login-err').textContent = e.message || '';
        $('ks-login-err').classList.remove('ks-hidden');
      }
      return;
    }

    if (jwt) {
      try {
        const gd = await loadGallery();
        applyGalleryData(gd);
      } catch (e) {
        jwt = null;
        try { localStorage.removeItem(tokenKey(slug)); } catch (_) {}
        hideBootScreen();
        showLogin();
        const msg = (e && e.message) ? e.message : 'Não foi possível restaurar a sessão.';
        const sub = $('ks-login-sub');
        if (sub) sub.textContent = msg;
        const errEl = $('ks-login-err');
        if (errEl) {
          errEl.textContent = msg;
          errEl.classList.remove('ks-hidden');
        }
      }
    } else {
      showLogin();
    }
  }

  boot().catch((e) => {
    try {
      // eslint-disable-next-line no-console
      console.error('[kingSelectionCliente] boot', e);
    } catch (_) { }
    hideBootScreen();
    try {
      $('ks-login')?.classList.remove('ks-hidden');
      $('ks-app')?.classList.add('ks-hidden');
      $('ks-locked')?.classList.add('ks-hidden');
    } catch (_) { }
    const msg = friendlyFetchError(e).message || 'Erro inesperado ao abrir a galeria.';
    const sub = $('ks-login-sub');
    if (sub) sub.textContent = msg;
    $('ks-login-body')?.classList.add('ks-hidden');
    const errEl = $('ks-login-err');
    if (errEl) {
      errEl.textContent = msg;
      errEl.classList.remove('ks-hidden');
    }
  });
})();