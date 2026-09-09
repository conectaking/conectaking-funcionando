document.addEventListener('DOMContentLoaded', () => {
  const API_URL = (window.API_URL || window.API_BASE || (window.API_CONFIG && window.API_CONFIG.baseURL) || 'https://www.conectaking.com.br').replace(/\/$/, '');
  const qs = new URLSearchParams(location.search || '');
  const slug = (qs.get('slug') || '').trim();
  if (!slug) {
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

  const titleEl = document.getElementById('ks-r-title');
  const backEl = document.getElementById('ks-back');
  const errEl = document.getElementById('ks-r-error');
  const gridEl = document.getElementById('ks-selected-grid');
  const emptyEl = document.getElementById('ks-empty');
  const minEl = document.getElementById('ks-min');
  const totalSelEl = document.getElementById('ks-total-selected');
  const feedbackEl = document.getElementById('ks-feedback');
  const finishBtn = document.getElementById('ks-finish');
  const finishBtnTop = document.getElementById('ks-finish-top');
  const totalPhotosEl = document.getElementById('ks-r-total-photos');
  const selectedNEl = document.getElementById('ks-r-selected-n');
  const clearLink = document.getElementById('ks-r-clear');
  const sairLink = document.getElementById('ks-r-sair');

  const galleryUrl = `/kingSelectionGallery?slug=${encodeURIComponent(slug)}`;
  backEl.href = galleryUrl;
  if (clearLink) clearLink.href = galleryUrl;
  if (sairLink) sairLink.href = galleryUrl;

  const btnSelecionarMais = document.getElementById('ks-btn-selecionar-mais');
  const btnSelecionarMaisSide = document.getElementById('ks-btn-selecionar-mais-side');
  const galleryReviewUrl = `/kingSelectionGallery?slug=${encodeURIComponent(slug)}`;
  if (btnSelecionarMais) btnSelecionarMais.href = galleryReviewUrl;
  if (btnSelecionarMaisSide) btnSelecionarMaisSide.href = galleryReviewUrl;

  const thankYouEl = document.getElementById('ks-thank-you');
  const thankYouImg = document.getElementById('ks-thank-you-img');
  const thankYouTitle = document.getElementById('ks-thank-you-title');
  const thankYouMessage = document.getElementById('ks-thank-you-message');
  const thankYouHome = document.getElementById('ks-thank-you-home');

  function showThankYou(opts) {
    if (thankYouTitle) thankYouTitle.textContent = opts.titulo || 'Obrigado!';
    if (thankYouMessage) thankYouMessage.textContent = opts.mensagem || '';
    if (thankYouImg) {
      if (opts.imageUrl) {
        thankYouImg.src = opts.imageUrl;
        thankYouImg.classList.remove('hidden');
      } else {
        thankYouImg.removeAttribute('src');
        thankYouImg.classList.add('hidden');
      }
    }
    if (thankYouHome) thankYouHome.href = `/kingSelectionGallery?slug=${encodeURIComponent(slug)}`;
    if (thankYouEl) {
      thankYouEl.classList.remove('hidden');
      thankYouEl.setAttribute('aria-hidden', 'false');
    }
  }

  // Viewer
  const viewer = document.getElementById('ks-viewer');
  const vImg = document.getElementById('ks-v-img');
  const vTitle = document.getElementById('ks-v-title');
  const vMeta = document.getElementById('ks-v-meta');
  const vClose = document.getElementById('ks-v-close');
  const vPrev = document.getElementById('ks-v-prev');
  const vNext = document.getElementById('ks-v-next');

  // Previews via fetch+blob (robusto)
  const _objUrls = new Map(); // cacheKey(url) -> objectURL
  function revokeObjUrl(key) {
    const u = _objUrls.get(key);
    if (u) URL.revokeObjectURL(u);
    _objUrls.delete(key);
  }
  function pruneObjUrlCache() {
    if (_objUrls.size <= 220) return;
    const keys = Array.from(_objUrls.keys()).slice(0, 100);
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
      if (!imgEl.isConnected) return;
      imgEl.src = obj;
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

  let _selectedPhotos = [];
  let _viewerIndex = 0;

  function showError(msg) {
    errEl.classList.remove('hidden');
    errEl.textContent = msg || 'Erro';
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function renderSelected(gallery, selectedIds) {
    const photosAll = Array.isArray(gallery?.photos) ? gallery.photos : [];
    const selectedSet = new Set(selectedIds);
    const selectedPhotos = photosAll.filter(p => selectedSet.has(p.id));
    _selectedPhotos = selectedPhotos;

    const minSel = parseInt(gallery?.min_selections || 0, 10) || 0;
    const totalPhotos = photosAll.length;
    if (minEl) minEl.textContent = minSel > 0 ? String(minSel) : 'Livre';
    if (totalSelEl) totalSelEl.textContent = String(selectedPhotos.length);
    if (totalPhotosEl) totalPhotosEl.textContent = `${totalPhotos} fotos na galeria`;
    if (selectedNEl) selectedNEl.textContent = String(selectedPhotos.length);

    if (!selectedPhotos.length) {
      if (emptyEl) emptyEl.classList.remove('hidden');
      if (gridEl) gridEl.innerHTML = '';
      finishBtn.disabled = true;
      if (finishBtnTop) finishBtnTop.disabled = true;
      if (totalPhotosEl) totalPhotosEl.textContent = `${totalPhotos} fotos na galeria`;
      if (selectedNEl) selectedNEl.textContent = '0';
      return;
    }

    if (emptyEl) emptyEl.classList.add('hidden');
    if (gridEl) {
      gridEl.innerHTML = selectedPhotos.map(p => {
        const imgSrc = `${API_URL}/api/king-selection/client/photos/${p.id}/preview?token=${encodeURIComponent(token)}&slug=${encodeURIComponent(slug)}`;
        return `
          <div class="rounded-xl overflow-hidden border border-white/10 bg-white/5 shadow-sm">
            <img loading="lazy"
                 class="w-full h-36 object-contain bg-black/40 ks-img-loading cursor-zoom-in"
                 src=""
                 data-src="${imgSrc}"
                 data-action="open"
                 data-photo-id="${p.id}"
                 alt="${escapeHtml(p.original_name || 'foto')}" />
            <div class="p-2 text-[11px] text-white/55 font-mono truncate">${escapeHtml(p.original_name || '')}</div>
          </div>
        `;
      }).join('');
    }

    // hidratar previews
    const imgs = Array.from(gridEl.querySelectorAll('img[data-src]'));
    runPool(imgs, 6, async (img) => setImgFromApi(img)).catch(() => {});

    const ok = minSel <= 0 ? true : selectedPhotos.length >= minSel;
    finishBtn.disabled = !ok;
    if (finishBtnTop) finishBtnTop.disabled = !ok;
    if (!ok) {
      finishBtn.title = `Selecione no mínimo ${minSel} foto(s)`;
      if (finishBtnTop) finishBtnTop.title = finishBtn.title;
    } else {
      finishBtn.title = '';
      if (finishBtnTop) finishBtnTop.title = '';
    }
  }

  async function load() {
    const res = await fetch(`${API_URL}/api/king-selection/client/gallery?slug=${encodeURIComponent(slug)}`, { headers: HEADERS });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Erro ao carregar galeria');
    const g = data.gallery;
    const selectedIds = (data.selectedPhotoIds || []).map(x => parseInt(x, 10)).filter(Boolean);
    titleEl.textContent = g?.nome_projeto || 'Galeria';
    renderSelected(g, selectedIds);
    // se já foi enviada (bloqueada), não deixa reenviar
    if (g && g.locked) {
      showError('Sua seleção já foi enviada. Aguarde a revisão ou peça reativação ao fotógrafo.');
      finishBtn.disabled = true;
    }
  }

  function openViewer(photoId) {
    const idx = _selectedPhotos.findIndex(p => p.id === photoId);
    _viewerIndex = Math.max(0, idx);
    viewer?.classList.add('active');
    viewer?.setAttribute('aria-hidden', 'false');
    renderViewer().catch(() => {});
  }
  function closeViewer() {
    viewer?.classList.remove('active');
    viewer?.setAttribute('aria-hidden', 'true');
    if (vImg) vImg.src = '';
  }
  async function renderViewer() {
    const p = _selectedPhotos[_viewerIndex];
    if (!p) return;
    if (vTitle) vTitle.textContent = p.original_name || 'Foto';
    if (vMeta) vMeta.textContent = `${_viewerIndex + 1}/${_selectedPhotos.length}`;
    if (vPrev) vPrev.disabled = _viewerIndex <= 0;
    if (vNext) vNext.disabled = _viewerIndex >= _selectedPhotos.length - 1;
    const url = `${API_URL}/api/king-selection/client/photos/${p.id}/preview?token=${encodeURIComponent(token)}&slug=${encodeURIComponent(slug)}`;
    if (vImg) {
      vImg.setAttribute('data-src', url);
      await setImgFromApi(vImg);
    }
  }

  function onFinishClick() {
    if (finishBtn) finishBtn.click();
  }
  if (finishBtnTop) finishBtnTop.addEventListener('click', onFinishClick);
  finishBtn.addEventListener('click', async () => {
    errEl.classList.add('hidden');
    finishBtn.disabled = true;
    finishBtn.textContent = 'Enviando...';
    if (finishBtnTop) finishBtnTop.textContent = 'Enviando...';
    let showedThankYou = false;
    try {
      const res = await fetch(`${API_URL}/api/king-selection/client/finalize`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ slug, feedback: (feedbackEl.value || '').trim() })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Erro ao finalizar');
      if (data.success) {
        const count = data.selectionCount ?? 0;
        const name = data.photographerDisplayName || 'Fotógrafo';
        const nomeCliente = (data.clientDisplayName || '').trim() || (data.projectName || '').trim() || 'você';
        const cfg = data.thankYouConfig || {};
        const replaceAll = (s) => String(s).replace(/\{\{nome_cliente\}\}/gi, nomeCliente).replace(/\{\{nome\}\}/g, name).replace(/\{\{quantidade\}\}/g, String(count));
        let msg = replaceAll(cfg.message || `Obrigado por selecionar as fotos do ${name}. Você escolheu ${count} foto(s).`);
        let titulo = replaceAll(cfg.title || 'Obrigado!');
        showThankYou({
          titulo,
          mensagem: msg,
          imageUrl: cfg.imageUrl || null
        });
        showedThankYou = true;
      } else {
        location.href = `/kingSelectionSuccess?slug=${encodeURIComponent(slug)}`;
      }
    } catch (e) {
      showError(e.message || 'Erro ao finalizar');
    } finally {
      finishBtn.textContent = 'CONFIRMAR E ENVIAR';
      if (finishBtnTop) finishBtnTop.textContent = 'CONFIRMAR E ENVIAR';
      if (!showedThankYou) {
        try { await load(); } catch (e) {}
      }
    }
  });

  load().catch(e => {
    showError(e.message || 'Erro ao carregar');
  });

  // Abrir viewer ao clicar na imagem
  gridEl?.addEventListener('click', (e) => {
    const el = e.target;
    const action = (el?.getAttribute && el.getAttribute('data-action')) || null;
    if (action !== 'open') return;
    const photoId = parseInt(el.getAttribute('data-photo-id') || '0', 10);
    if (!photoId) return;
    openViewer(photoId);
  });

  vClose?.addEventListener('click', closeViewer);
  viewer?.addEventListener('click', (e) => { if (e.target === viewer) closeViewer(); });
  vPrev?.addEventListener('click', () => { _viewerIndex = Math.max(0, _viewerIndex - 1); renderViewer().catch(() => {}); });
  vNext?.addEventListener('click', () => { _viewerIndex = _viewerIndex + 1; renderViewer().catch(() => {}); });
  document.addEventListener('keydown', (e) => {
    if (!viewer?.classList.contains('active')) return;
    if (e.key === 'Escape') closeViewer();
    if (e.key === 'ArrowLeft') { _viewerIndex = Math.max(0, _viewerIndex - 1); renderViewer().catch(() => {}); }
    if (e.key === 'ArrowRight') { _viewerIndex = _viewerIndex + 1; renderViewer().catch(() => {}); }
  });
});

