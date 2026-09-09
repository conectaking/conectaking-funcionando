document.addEventListener('DOMContentLoaded', () => {
  const API_URL = (window.API_URL || window.API_BASE || (window.API_CONFIG && window.API_CONFIG.baseURL) || 'https://www.conectaking.com.br').replace(/\/$/, '');
  const qs = new URLSearchParams(location.search || '');
  const slug = (qs.get('slug') || '').trim();
  if (!slug) {
    alert('Link inválido (faltou ?slug=...)');
    location.href = '/kingSelection';
    return;
  }

  const tokenKey = `ks_client_${slug}`;
  const token = localStorage.getItem(tokenKey) || '';
  if (!token) {
    location.href = `kingSelection/${encodeURIComponent(slug)}`;
    return;
  }

  const HEADERS = { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': `Bearer ${token}` };
  const grid = document.getElementById('ks-grid');
  const titleEl = document.getElementById('ks-g-title');
  const countEl = document.getElementById('ks-count');
  const advanceBtn = document.getElementById('ks-advance-btn');
  const infoBtn = document.getElementById('ks-info-btn');
  const infoModal = document.getElementById('ks-info-modal');
  const infoClose = document.getElementById('ks-info-close');
  const accessBtn = document.getElementById('ks-access-btn');
  const totalPhotosEl = document.getElementById('ks-total-photos');
  const minSelEl = document.getElementById('ks-min-sel');
  const maxSelEl = document.getElementById('ks-max-sel');
  const selectAllBtn = document.getElementById('ks-select-all');
  const clearBtn = document.getElementById('ks-clear');
  const selectAllBtnM = document.getElementById('ks-select-all-m');
  const clearBtnM = document.getElementById('ks-clear-m');
  const selectedToggleBtn = document.getElementById('ks-selected-btn');
  const logoutBtn = document.getElementById('ks-logout');

  let gallery = null;
  let selected = new Set();
  let showSelectedOnly = false;
  let viewerIndex = 0;
  let locked = false;
  const lockedEl = document.getElementById('ks-locked');

  logoutBtn?.addEventListener('click', () => {
    if (!confirm('Sair desta galeria?')) return;
    try { localStorage.removeItem(tokenKey); } catch (_) {}
    location.href = `kingSelection/${encodeURIComponent(slug)}`;
  });

  // viewer
  const viewer = document.getElementById('ks-viewer');
  const vImg = document.getElementById('ks-v-img');
  const vTitle = document.getElementById('ks-v-title');
  const vMeta = document.getElementById('ks-v-meta');
  const vClose = document.getElementById('ks-v-close');
  const vPrev = document.getElementById('ks-v-prev');
  const vNext = document.getElementById('ks-v-next');
  const vToggle = document.getElementById('ks-v-toggle');

  // ============================================
  // Previews: carregar via fetch+blob (mais robusto)
  // ============================================
  const _objUrls = new Map(); // cacheKey(url) -> objectURL
  function revokeObjUrl(key) {
    const u = _objUrls.get(key);
    if (u) URL.revokeObjectURL(u);
    _objUrls.delete(key);
  }
  function pruneObjUrlCache() {
    // evita vazamento (re-render + filtros)
    if (_objUrls.size <= 260) return;
    const keys = Array.from(_objUrls.keys()).slice(0, 120);
    keys.forEach(revokeObjUrl);
  }
  async function fetchObjectUrl(url) {
    const key = String(url || '');
    if (_objUrls.has(key)) return _objUrls.get(key);
    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(t || `Falha ao carregar imagem (${res.status})`);
    }
    const blob = await res.blob();
    const obj = URL.createObjectURL(blob);
    _objUrls.set(key, obj);
    pruneObjUrlCache();
    return obj;
  }
  async function setImgFromApi(imgEl) {
    if (!imgEl) return;
    const url = imgEl.getAttribute('data-src') || '';
    const key = String(url || '');
    imgEl.classList.add('ks-img-loading');
    try {
      const prevKey = imgEl.getAttribute('data-cache-key');
      if (prevKey && prevKey !== key) revokeObjUrl(prevKey);
      imgEl.setAttribute('data-cache-key', key);

      const obj = await fetchObjectUrl(url);
      // se o elemento foi re-renderizado, pode ter sido removido
      if (!imgEl.isConnected) return;
      imgEl.src = obj;
      imgEl.removeAttribute('data-preview-error');
    } catch (e) {
      imgEl.removeAttribute('src');
      imgEl.setAttribute('data-preview-error', '1');
      imgEl.classList.remove('ks-img-loading');
    } finally {
      imgEl.classList.remove('ks-img-loading');
    }
  }
  async function runPool(items, limit, worker) {
    const queue = items.slice();
    const runners = Array.from({ length: Math.max(1, limit) }).map(async () => {
      while (queue.length) {
        const it = queue.shift();
        // eslint-disable-next-line no-await-in-loop
        await worker(it);
      }
    });
    await Promise.all(runners);
  }

  function openInfoModal() {
    if (!infoModal) return;
    infoModal.classList.add('active');
    infoModal.setAttribute('aria-hidden', 'false');
  }
  function closeInfoModal() {
    if (!infoModal) return;
    infoModal.classList.remove('active');
    infoModal.setAttribute('aria-hidden', 'true');
  }

  function render() {
    titleEl.textContent = gallery?.nome_projeto || 'Galeria';
    countEl.textContent = String(selected.size);

    const photosAll = Array.isArray(gallery?.photos) ? gallery.photos : [];
    const photos = showSelectedOnly ? photosAll.filter(p => selected.has(p.id)) : photosAll;

    const totalPhotos = photosAll.length;
    const minSel = parseInt(gallery?.min_selections || 0, 10) || 0;
    const maxSel = 0; // seleção livre

    if (totalPhotosEl) totalPhotosEl.textContent = `${totalPhotos} fotos`;
    if (minSelEl) minSelEl.textContent = minSel > 0 ? String(minSel) : 'Livre';
    if (maxSelEl) maxSelEl.textContent = maxSel > 0 ? String(maxSel) : 'Livre';

    const canAdvance = !locked && (minSel <= 0 ? (selected.size > 0) : (selected.size >= minSel));
    if (advanceBtn) {
      advanceBtn.disabled = !canAdvance;
      advanceBtn.textContent = locked ? 'SELE—fO ENVIADA' : 'AVAN?AR';
      advanceBtn.title = canAdvance ? '' : (locked ? 'Seleção já enviada' : (minSel > 0 ? `Selecione no mínimo ${minSel} foto(s)` : 'Selecione ao menos 1 foto'));
    }
    if (selectAllBtn) selectAllBtn.disabled = !!locked;
    if (clearBtn) clearBtn.disabled = !!locked;
    if (selectAllBtnM) selectAllBtnM.disabled = !!locked;
    if (clearBtnM) clearBtnM.disabled = !!locked;
    if (lockedEl) lockedEl.classList.toggle('hidden', !locked);

    const afterGrid = document.getElementById('ks-after-grid');
    const btnSelecionarMais = document.getElementById('ks-btn-selecionar-mais');
    const hintRevisar = document.getElementById('ks-hint-revisar');
    if (afterGrid) {
      afterGrid.classList.toggle('hidden', !(showSelectedOnly && selected.size > 0));
    }
    if (hintRevisar) {
      hintRevisar.classList.toggle('hidden', !showSelectedOnly);
    }

    grid.innerHTML = photos.map(p => {
      const isSel = selected.has(p.id);
      const imgSrc = `${API_URL}/api/king-selection/client/photos/${p.id}/preview?token=${encodeURIComponent(token)}&slug=${encodeURIComponent(slug)}`;
      return `
        <div
          class="group relative rounded-xl overflow-hidden border ${isSel ? 'border-yellow-400 ring-2 ring-yellow-400/30' : 'border-white/10'} bg-white/5 shadow-sm hover:shadow-md transition"
          data-photo-id="${p.id}"
          data-selected="${isSel ? '1' : '0'}"
        >
          <img loading="lazy"
               class="w-full h-44 object-contain bg-black/40 select-none ks-img-loading cursor-zoom-in"
               src=""
               data-src="${imgSrc}"
               data-action="open"
               alt="${escapeHtml(p.original_name || 'foto')}"
               draggable="false"
               onload="this.classList.remove('ks-img-loading')"
          />
          <div class="antiCopyOverlay" data-action="open"></div>

          <!-- Toggle seleção (não abre viewer) -->
          <button type="button" class="absolute top-2 right-2 z-10 w-9 h-9 rounded-full bg-black/60 border border-white/15 flex items-center justify-center disabled:opacity-40"
                  data-action="toggle" aria-label="Selecionar/remover" ${locked ? 'disabled' : ''}>
            <span class="text-yellow-300 font-black" style="display:${isSel ? 'block' : 'none'}" data-check>o"</span>
          </button>

          <!-- Botão remover: só remove (nunca seleciona) -->
          ${isSel ? `
            <button type="button"
              class="absolute inset-x-0 bottom-10 mx-auto w-fit px-3 py-1 rounded-full text-xs font-extrabold bg-red-600 text-white disabled:opacity-40"
              data-action="remove" ${locked ? 'disabled' : ''}>
            >Remover</button>
          ` : `
            <button type="button"
              class="absolute inset-x-0 bottom-10 mx-auto w-fit px-3 py-1 rounded-full text-xs font-extrabold bg-yellow-300 text-black disabled:opacity-40"
              data-action="toggle" ${locked ? 'disabled' : ''}>
            >Selecionar</button>
          `}

          <div class="p-2 text-xs text-white/55 font-mono truncate">${escapeHtml(p.original_name || '')}</div>
        </div>
      `;
    }).join('');

    // hidratar previews
    const imgs = Array.from(grid.querySelectorAll('img[data-src]'));
    runPool(imgs, 6, async (img) => setImgFromApi(img)).catch(() => {});
  }

  function updateTileUI(tileEl, isSel) {
    if (!tileEl) return;
    tileEl.setAttribute('data-selected', isSel ? '1' : '0');
    tileEl.classList.toggle('border-yellow-400', isSel);
    tileEl.classList.toggle('ring-2', isSel);
    tileEl.classList.toggle('ring-yellow-400/30', isSel);
    const check = tileEl.querySelector('[data-check]');
    if (check) check.style.display = isSel ? 'block' : 'none';
  }

  async function toggleSelection(photoId, { force } = {}) {
    if (locked) {
      alert('Seleção já enviada. Aguarde a revisão ou peça reativação ao fotógrafo.');
      return;
    }
    const id = parseInt(photoId, 10);
    if (!id) return;
    const was = selected.has(id);
    const next = (typeof force === 'boolean') ? force : !was;
    if (was === next) return;
    // Seleção LIVRE: não limitar por total_fotos_contratadas

    // otimista
    if (next) selected.add(id); else selected.delete(id);
    countEl.textContent = String(selected.size);
    const minSel = parseInt(gallery?.min_selections || 0, 10) || 0;
    if (advanceBtn) {
      const canAdvance = minSel <= 0 ? (selected.size > 0) : (selected.size >= minSel);
      advanceBtn.disabled = !canAdvance;
    }

    try {
      const res = await fetch(`${API_URL}/api/king-selection/client/select`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ slug, photo_id: id })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Erro ao salvar seleção');
    } catch (e) {
      // reverter
      if (was) selected.add(id); else selected.delete(id);
      countEl.textContent = String(selected.size);
      alert(e.message || 'Não foi possível salvar sua seleção. Tente novamente.');
    }
  }

  function getVisiblePhotos() {
    const photosAll = Array.isArray(gallery?.photos) ? gallery.photos : [];
    return showSelectedOnly ? photosAll.filter(p => selected.has(p.id)) : photosAll;
  }

  function openViewer(photoId) {
    const list = getVisiblePhotos();
    const idx = list.findIndex(p => p.id === photoId);
    viewerIndex = Math.max(0, idx);
    viewer?.classList.add('active');
    viewer?.setAttribute('aria-hidden', 'false');
    renderViewer();
  }

  function closeViewer() {
    viewer?.classList.remove('active');
    viewer?.setAttribute('aria-hidden', 'true');
    if (vImg) vImg.src = '';
  }

  async function renderViewer() {
    const list = getVisiblePhotos();
    const p = list[viewerIndex];
    if (!p) return;
    const isSel = selected.has(p.id);
    if (vTitle) vTitle.textContent = p.original_name || 'Foto';
    if (vMeta) vMeta.textContent = `${viewerIndex + 1}/${list.length}`;
    if (vPrev) vPrev.disabled = viewerIndex <= 0;
    if (vNext) vNext.disabled = viewerIndex >= list.length - 1;
    if (vToggle) {
      vToggle.textContent = locked ? 'TRAVADO' : (isSel ? 'REMOVER' : 'SELECIONAR');
      vToggle.disabled = !!locked;
      vToggle.title = locked ? 'Seleção já enviada' : '';
    }

    const url = `${API_URL}/api/king-selection/client/photos/${p.id}/preview?token=${encodeURIComponent(token)}&slug=${encodeURIComponent(slug)}`;
    if (vImg) {
      vImg.setAttribute('data-src', url);
      // carregar via blob (reutiliza loader)
      await setImgFromApi(vImg);
    }
  }

  async function bulk(mode, ids) {
    const res = await fetch(`${API_URL}/api/king-selection/client/select-bulk`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ slug, mode, photo_ids: ids || [] })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Erro ao atualizar seleção');
  }

  async function onSelectAll() {
    if (locked) return alert('Seleção já enviada. Aguarde a revisão ou peça reativação ao fotógrafo.');
    const photosAll = Array.isArray(gallery?.photos) ? gallery.photos : [];
    const allIds = photosAll.map(p => p.id);
    const maxSel = parseInt(gallery?.total_fotos_contratadas || 0, 10) || 0;
    const ids = (maxSel > 0) ? allIds.slice(0, maxSel) : allIds;
    await bulk('select', ids);
    selected = new Set(ids);
    render();
  }

  async function onClearAll() {
    if (locked) return alert('Seleção já enviada. Aguarde a revisão ou peça reativação ao fotógrafo.');
    await bulk('unselect', []);
    selected = new Set();
    render();
  }

  async function load() {
    const res = await fetch(`${API_URL}/api/king-selection/client/gallery?slug=${encodeURIComponent(slug)}`, { headers: HEADERS });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Erro ao carregar galeria');
    gallery = data.gallery;
    locked = !!gallery?.locked;
    if (locked) showSelectedOnly = true;
    if (lockedEl && locked) {
      lockedEl.textContent = data.lockedMessage || 'Seleção já enviada. Aguarde revisão ou peça reativação ao fotógrafo.';
    }
    selected = new Set((data.selectedPhotoIds || []).map(x => parseInt(x, 10)));
    render();

    const seenKey = `ks_info_seen_${slug}`;
    if (!sessionStorage.getItem(seenKey)) {
      sessionStorage.setItem(seenKey, '1');
      openInfoModal();
    }
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  load().catch(err => {
    alert(err.message || 'Erro ao carregar');
    localStorage.removeItem(tokenKey);
    location.href = `kingSelection/${encodeURIComponent(slug)}`;
  });

  // Delegação de cliques no grid (evita bug de "remover" selecionar)
  grid?.addEventListener('click', async (e) => {
    const el = e.target;
    const tile = el && el.closest ? el.closest('[data-photo-id]') : null;
    if (!tile) return;
    const photoId = parseInt(tile.getAttribute('data-photo-id') || '0', 10);
    const action = (el?.getAttribute && el.getAttribute('data-action')) || (el?.closest && el.closest('[data-action]')?.getAttribute('data-action')) || null;
    if (!photoId) return;

    if (action === 'open') {
      openViewer(photoId);
      return;
    }
    if (action === 'remove') {
      // remover nunca seleciona
      await toggleSelection(photoId, { force: false });
      render();
      return;
    }
    if (action === 'toggle') {
      await toggleSelection(photoId);
      render();
      return;
    }
  });

  // Viewer binds
  vClose?.addEventListener('click', closeViewer);
  viewer?.addEventListener('click', (e) => { if (e.target === viewer) closeViewer(); });
  vPrev?.addEventListener('click', () => { viewerIndex = Math.max(0, viewerIndex - 1); renderViewer().catch(() => {}); });
  vNext?.addEventListener('click', () => { viewerIndex = viewerIndex + 1; renderViewer().catch(() => {}); });
  vToggle?.addEventListener('click', async () => {
    if (locked) return alert('Seleção já enviada. Aguarde a revisão ou peça reativação ao fotógrafo.');
    const list = getVisiblePhotos();
    const p = list[viewerIndex];
    if (!p) return;
    const isSel = selected.has(p.id);
    await toggleSelection(p.id, { force: !isSel });
    render();
    renderViewer().catch(() => {});
  });
  document.addEventListener('keydown', (e) => {
    if (!viewer?.classList.contains('active')) return;
    if (e.key === 'Escape') closeViewer();
    if (e.key === 'ArrowLeft') { viewerIndex = Math.max(0, viewerIndex - 1); renderViewer().catch(() => {}); }
    if (e.key === 'ArrowRight') { viewerIndex = viewerIndex + 1; renderViewer().catch(() => {}); }
  });

  advanceBtn?.addEventListener('click', () => {
    location.href = `/kingSelectionReview?slug=${encodeURIComponent(slug)}`;
  });

  document.getElementById('ks-btn-selecionar-mais')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!showSelectedOnly) return;
    showSelectedOnly = false;
    selectedToggleBtn?.classList.toggle('active', false);
    render();
  });
  infoBtn?.addEventListener('click', () => openInfoModal());
  infoClose?.addEventListener('click', () => closeInfoModal());
  accessBtn?.addEventListener('click', () => closeInfoModal());
  infoModal?.addEventListener('click', (e) => { if (e.target === infoModal) closeInfoModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && infoModal?.classList.contains('active')) closeInfoModal(); });

  selectedToggleBtn?.addEventListener('click', () => {
    showSelectedOnly = !showSelectedOnly;
    selectedToggleBtn.classList.toggle('active', showSelectedOnly);
    render();
  });

  const bindBulk = (btn, fn) => {
    if (!btn) return;
    btn.addEventListener('click', async () => {
      try {
        btn.disabled = true;
        await fn();
      } catch (e) {
        alert(e.message || 'Erro');
      } finally {
        btn.disabled = false;
      }
    });
  };
  bindBulk(selectAllBtn, onSelectAll);
  bindBulk(clearBtn, onClearAll);
  bindBulk(selectAllBtnM, onSelectAll);
  bindBulk(clearBtnM, onClearAll);
});

