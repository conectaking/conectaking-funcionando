/** Pasta base para login/dashboard quando o site corre em subpath (ex.: Live Server em —/public_html/). */
function ksStaticPageBaseDir() {
  const path = window.location.pathname || '';
  if (/\/kingSelectionEdit\.html$/i.test(path)) {
    const i = path.lastIndexOf('/');
    return i > 0 ? path.slice(0, i + 1) : '/';
  }
  const p = path.replace(/\/+$/, '') || '/';
  if (p === '/kingSelection' || p.toLowerCase() === '/kingselection') return '/';
  const i = path.lastIndexOf('/');
  return i > 0 ? path.slice(0, i + 1) : '/';
}

document.addEventListener('DOMContentLoaded', () => {
  if (/kingSelectionEdit\.html/i.test(window.location.pathname)) {
    const sp = new URLSearchParams(window.location.search || '');
    const q = (sp.get('api') || '').toLowerCase() === 'local' ? '?api=local' : '';
    const h = (window.location.hostname || '').toLowerCase();
    // Em produção (Apache) a URL limpa /kingSelection serve este app; no Live Server isso dá "Cannot GET"
    if (h !== '127.0.0.1' && h !== 'localhost') {
      window.location.replace(`${window.location.origin}/kingSelection${q}`);
      return;
    }
  }

  let API_URL = (window.API_URL || window.API_BASE || (window.API_CONFIG && window.API_CONFIG.baseURL) || 'https://www.conectaking.com.br').replace(/\/$/, '');
  try {
    const h = String(window.location.hostname || '').toLowerCase();
    if (h === 'conectaking.com.br' || h === 'www.conectaking.com.br' || h.endsWith('.conectaking.com.br')) {
      API_URL = String(window.location.origin).replace(/\/$/, '');
    } else if (/onrender\.com/i.test(API_URL)) {
      API_URL = 'https://www.conectaking.com.br';
    }
    window.API_URL = API_URL;
    window.API_BASE = API_URL;
  } catch (_) {}

  const qs = new URLSearchParams(window.location.search || '');
  let itemId = qs.get('itemId') || qs.get('itemid') || qs.get('profileItemId');

  const token = localStorage.getItem('conectaKingToken')
    || localStorage.getItem('conectaking_token')
    || localStorage.getItem('token')
    || localStorage.getItem('jwt')
    || '';
  if (!token) {
    window.location.href = `${ksStaticPageBaseDir()}login.html?returnUrl=${encodeURIComponent(window.location.href)}`;
    return;
  }
  const HEADERS = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
  const IMG_HEADERS = { 'Authorization': `Bearer ${token}` };

  async function ensureProfileItemId() {
    if (itemId) return String(itemId);
    const res = await fetch(`${API_URL}/api/profile`, { headers: HEADERS });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Erro ao carregar perfil');
    const ks = (data.items || []).find((it) => it.item_type === 'king_selection');
    if (ks && ks.id) {
      itemId = String(ks.id);
      return itemId;
    }
    const createRes = await fetch(`${API_URL}/api/profile/items`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ item_type: 'king_selection', title: 'KingSelection', is_active: false, display_order: 999 })
    });
    const createData = await createRes.json().catch(() => ({}));
    if (!createRes.ok) throw new Error(createData.message || 'Erro ao criar King Selection');
    itemId = String(createData.id);
    return itemId;
  }

  const kanbanEl = document.getElementById('ks-kanban');
  const drawer = document.getElementById('ks-drawer');
  const drawerOverlay = document.getElementById('ks-drawer-overlay');
  const drawerTitle = document.getElementById('ks-drawer-title');
  const drawerClose = document.getElementById('ks-drawer-close');
  const clientLinkEl = document.getElementById('ks-client-link');
  const clientEmailEl = document.getElementById('ks-client-email');
  const clientPassEl = document.getElementById('ks-client-pass');
  const copyWhatsBtn = document.getElementById('ks-copy-whats');
  const openWhatsBtn = document.getElementById('ks-open-whats');
  const exportBtn = document.getElementById('ks-export-btn');
  const resetPassBtn = document.getElementById('ks-reset-pass');
  const selectedCountEl = document.getElementById('ks-selected-count');
  const photosCountEl = document.getElementById('ks-photos-count');
  const feedbackBox = document.getElementById('ks-feedback-box');
  const statusSelect = document.getElementById('ks-status');
  const saveStatusBtn = document.getElementById('ks-save-status');
  const photoFile = document.getElementById('ks-photo-file');
  const photosGrid = document.getElementById('ks-photos');

  // Modal Nova Galeria
  const newModal = document.getElementById('ks-new-modal');
  const newClose = document.getElementById('ks-new-close');
  const newCancel = document.getElementById('ks-new-cancel');
  const newSave = document.getElementById('ks-new-save');
  const newName = document.getElementById('ks-new-name');
  const newCategorySelect = document.getElementById('ks-new-category-select');
  const newCategoryCustom = document.getElementById('ks-new-category-custom');
  const newClientName = document.getElementById('ks-new-client-name');
  const newWorkDate = document.getElementById('ks-new-work-date');
  const newAccess = document.getElementById('ks-new-access');
  const newAccessHint = document.getElementById('ks-new-access-hint');
  const newCredRow = document.getElementById('ks-new-cred-row');
  const newEmail = document.getElementById('ks-new-email');
  const newPass = document.getElementById('ks-new-pass');
  const newMax = document.getElementById('ks-new-max');
  const newMin = document.getElementById('ks-new-min');
  const newWatermark = document.getElementById('ks-new-watermark');

  // Modal Exportar
  const exportModal = document.getElementById('ks-export-modal');
  const exportClose = document.getElementById('ks-export-close');
  const exportText = document.getElementById('ks-export-text');
  const exportCopy = document.getElementById('ks-export-copy');
  const exportMeta = document.getElementById('ks-export-meta');
  const exportTabs = exportModal ? Array.from(exportModal.querySelectorAll('[data-tab]')) : [];

  // UI: busca + FAB
  const searchInput = document.getElementById('ks-search');
  const fabNew = document.getElementById('ks-fab-new');

  let galleries = [];
  let activeGallery = null;
  let activeExport = { lightroom: '', windows: '', finder: '', count: 0, feedback: null };
  let searchTerm = '';

  function normalizeShareBase(rawBase) {
    const base = String(rawBase || '').trim().replace(/\/$/, '');
    // Evita links duplicados como ".../kingSelection/kingselection/<slug>"
    return base.replace(/\/(?:mr\/)?(?:kingselection|ringselection|ringsselection)$/i, '');
  }

  function buildClientGalleryLink(slug) {
    const base = normalizeShareBase(window.KING_SELECTION_SHARE_BASE_URL || window.location.origin);
    return `${base}/kingselection/${encodeURIComponent(String(slug || '').trim())}`;
  }

  const COLS = [
    { key: 'preparacao', label: 'Preparação' },
    { key: 'andamento', label: 'Cliente selecionando' },
    { key: 'revisao', label: 'Edição' },
    { key: 'finalizado', label: 'Finalizado' }
  ];

  function openDrawer(g) {
    activeGallery = g;
    drawerTitle.textContent = g.nome_projeto || 'Galeria';
    statusSelect.value = g.status || 'preparacao';
    clientLinkEl.textContent = buildClientGalleryLink(g.slug);
    if (clientEmailEl) clientEmailEl.value = g.cliente_email || '';
    if (clientPassEl) clientPassEl.value = g._client_password || (g.senha ? g.senha : '');
    if (selectedCountEl) selectedCountEl.textContent = String(g.selected_count || 0);
    if (photosCountEl) photosCountEl.textContent = String(g.photos_count || (g.photos ? g.photos.length : 0));
    if (feedbackBox) {
      const fb = g.feedback_cliente || null;
      if (fb) {
        feedbackBox.style.display = 'block';
        feedbackBox.innerHTML = `<b>Comentário do cliente</b><div style="margin-top:6px;white-space:pre-wrap;color:#ECECEC">${escapeHtml(fb)}</div>`;
      } else {
        feedbackBox.style.display = 'none';
        feedbackBox.innerHTML = '';
      }
    }
    drawer.classList.add('active');
    if (drawerOverlay) {
      drawerOverlay.classList.add('active');
      drawerOverlay.setAttribute('aria-hidden', 'false');
    }
    renderPhotos(g);
  }

  function closeDrawer() {
    drawer.classList.remove('active');
    if (drawerOverlay) {
      drawerOverlay.classList.remove('active');
      drawerOverlay.setAttribute('aria-hidden', 'true');
    }
    activeGallery = null;
    photosGrid.innerHTML = '';
    photoFile.value = '';
  }

  function formatTodayBR() {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy} (gravada no servidor ao criar)`;
  }

  function updateCategoryCustomUi() {
    if (!newCategorySelect || !newCategoryCustom) return;
    const show = newCategorySelect.value === '__outra__';
    newCategoryCustom.style.display = show ? 'block' : 'none';
    if (!show) newCategoryCustom.value = '';
  }

  function getNewCategoryValue() {
    if (!newCategorySelect) return '';
    const v = newCategorySelect.value;
    if (v === '__outra__') return (newCategoryCustom?.value || '').trim().slice(0, 255);
    return (v || '').trim().slice(0, 255);
  }

  function updateNewAccessUi() {
    const v = (newAccess && newAccess.value) || 'private';
    if (newCredRow) newCredRow.style.display = v === 'private' ? '' : 'none';
    if (newEmail) newEmail.required = v === 'private';
    if (newPass) newPass.required = v === 'private';
    if (v !== 'private') {
      if (newEmail) newEmail.value = '';
      if (newPass) newPass.value = '';
    }
    if (newAccessHint) {
      newAccessHint.textContent = v === 'private'
        ? 'Somente quem tiver e-mail e senha acessa a seleção.'
        : v === 'public'
          ? 'Link público: não é obrigatório e-mail/senha de cliente para este modo.'
          : v === 'paid_event_photos'
            ? 'Visitantes cadastram-se na galeria; pacotes, PIX e aprovações ficam na aba «Fotos e vendas» do projeto.'
            : 'Visitantes criam o próprio acesso na tela de login da galeria.';
    }
  }

  function openNewModal() {
    if (!newModal) return;
    if (newName) newName.value = '';
    if (newCategorySelect) newCategorySelect.value = '';
    if (newCategoryCustom) newCategoryCustom.value = '';
    updateCategoryCustomUi();
    if (newClientName) newClientName.value = '';
    if (newEmail) newEmail.value = '';
    if (newPass) newPass.value = '';
    if (newMax) newMax.value = '0';
    if (newMin) newMin.value = '0';
    if (newAccess) newAccess.value = 'private';
    if (newWatermark) newWatermark.checked = true;
    if (newWorkDate) newWorkDate.textContent = formatTodayBR();
    updateNewAccessUi();
    newModal.classList.add('active');
    newModal.setAttribute('aria-hidden', 'false');
    setTimeout(() => newName?.focus(), 30);
  }
  function closeNewModal() {
    if (!newModal) return;
    newModal.classList.remove('active');
    newModal.setAttribute('aria-hidden', 'true');
  }

  function openExportModal() {
    if (!exportModal) return;
    exportModal.classList.add('active');
    exportModal.setAttribute('aria-hidden', 'false');
  }
  function closeExportModal() {
    if (!exportModal) return;
    exportModal.classList.remove('active');
    exportModal.setAttribute('aria-hidden', 'true');
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text || '');
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text || '';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
  }

  function buildWhatsMessage(g) {
    const link = buildClientGalleryLink(g.slug);
    const email = g.cliente_email || (clientEmailEl ? clientEmailEl.value : '');
    const senha = g._client_password || (clientPassEl ? clientPassEl.value : '');
    const nome = g.nome_projeto || 'sua galeria';
    return [
      `Olá!`,
      ``,
      `As fotos de ${nome} estão disponíveis para seleção.`,
      ``,
      `Para realizar a seleção, utilize os seguintes dados:`,
      ``,
      `Link:`,
      link,
      ``,
      `E-mail: ${email || '-'}`,
      `Senha: ${senha || '-'}`
    ].join('\n');
  }

  function normalizeStr(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function accessLabel(g) {
    let m = String(g.access_mode || 'private').toLowerCase();
    if (m === 'password') m = 'signup';
    const self = g.allow_self_signup;
    if (m === 'public') return 'Público';
    if (m === 'paid_event_photos') return 'Fotos e vendas';
    if (self || m === 'signup') return 'Cadastro visitante';
    return 'Privado';
  }

  function filteredGalleries() {
    const q = normalizeStr(searchTerm).trim();
    if (!q) return galleries;
    return galleries.filter(g => {
      const hay = [
        g.nome_projeto,
        g.slug,
        g.cliente_email,
        g.cliente_nome,
        g.categoria
      ].map(normalizeStr).join(' — ');
      return hay.includes(q);
    });
  }

  function renderKanban() {
    const list = filteredGalleries();
    kanbanEl.innerHTML = COLS.map(c => {
      const inCol = list.filter(g => g.status === c.key);
      const count = inCol.length;
      return `
        <div class="ks-col" data-col="${c.key}">
          <h3>
            <div class="ks-colhead">
              <div class="ks-colleft">
                <span class="ks-dot"></span>
                <span>${c.label}</span>
              </div>
              <span class="ks-badge">${count}</span>
            </div>
          </h3>
          <div class="ks-list">
            ${inCol.map(g => `
              <div class="ks-card" data-id="${g.id}">
                <button type="button" class="ks-card-del" data-gallery-id="${g.id}" data-name="${escapeHtml(g.nome_projeto || 'Galeria')}" title="Excluir projeto"><i class="fas fa-trash"></i></button>
                <div class="ks-thumb">
                  ${(() => {
                    const photos = (g && Array.isArray(g.photos)) ? g.photos : [];
                    const p0 = photos.find(p => p && p.is_cover) || photos[0] || null;
                    if (!p0 || !p0.id) {
                      return `<div class="ks-thumb-ph"><i class="fas fa-image"></i></div>`;
                    }
                    return `<img loading="lazy" src="" data-photo-id="${p0.id}" data-role="cover" alt="capa" />`;
                  })()}
                </div>
                <div class="ks-card-main">
                  <div class="name">${escapeHtml(g.nome_projeto || 'Galeria')}</div>
                  <div class="meta">slug: <span class="ks-link">${escapeHtml(g.slug)}</span></div>
                  ${g.categoria ? `<div class="meta">categoria: ${escapeHtml(g.categoria)}</div>` : ''}
                  ${g.data_trabalho ? `<div class="meta">trabalho: ${escapeHtml(String(g.data_trabalho))}</div>` : ''}
                  <div class="meta">acesso: ${escapeHtml(accessLabel(g))}</div>
                  ${g.cliente_nome ? `<div class="meta">nome: ${escapeHtml(g.cliente_nome)}</div>` : ''}
                  <div class="meta">e-mail: ${escapeHtml(g.cliente_email || '-')}</div>
                  <div class="meta">selecionadas: <b>${escapeHtml(String(g.selected_count || 0))}</b> — fotos: <b>${escapeHtml(String(g.photos_count || 0))}</b></div>
                </div>
              </div>
            `).join('')}
            ${count === 0 ? `<div class="ks-small">Sem itens</div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    kanbanEl.querySelectorAll('.ks-card').forEach(card => {
      const delBtn = card.querySelector('.ks-card-del');
      if (delBtn) {
        delBtn.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const id = parseInt(delBtn.getAttribute('data-gallery-id') || '0', 10);
          const name = delBtn.getAttribute('data-name') || 'projeto';
          if (!id) return;
          if (!confirm(`Excluir o projeto "${name}" e todas as fotos?\n\nEsta ação não pode ser desfeita.`)) return;
          try {
            delBtn.disabled = true;
            const res = await fetch(`${API_URL}/api/king-selection/galleries/${id}`, { method: 'DELETE', headers: HEADERS });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.message || 'Erro ao excluir');
            if (activeGallery && activeGallery.id === id) closeDrawer();
            await loadGalleries();
          } catch (err) {
            alert(err?.message || 'Erro ao excluir projeto');
          } finally {
            delBtn.disabled = false;
          }
        });
      }
      card.addEventListener('click', (e) => {
        if (e.target.closest('.ks-card-del')) return;
        const id = parseInt(card.getAttribute('data-id'), 10);
        const g = galleries.find(x => x.id === id);
        if (g) {
          const params = new URLSearchParams(window.location.search || '');
          const apiLocal = (params.get('api') || '').toLowerCase() === 'local';
          const q = new URLSearchParams();
          if (itemId) q.set('itemId', String(itemId));
          q.set('galleryId', String(g.id));
          if (apiLocal) q.set('api', 'local');
          const h = (window.location.hostname || '').toLowerCase();
          // Live Server: ficheiro .html; produção: /kingSelection?galleryId=
          if (h === '127.0.0.1' || h === 'localhost') {
            window.location.href = `kingSelectionProject.html?${q.toString()}`;
          } else {
            window.location.href = `/kingSelection?${q.toString()}`;
          }
        }
      });
    });

    // Hidratar miniaturas com Authorization (evita "capa" quebrado)
    const imgs = Array.from(kanbanEl.querySelectorAll('img[data-photo-id]'))
      .map(img => ({ img, id: parseInt(img.getAttribute('data-photo-id') || '0', 10) }))
      .filter(x => x.id);
    runPool(imgs, 6, async ({ img, id }) => setImgPreview(img, `${API_URL}/api/king-selection/photos/${id}/preview?wm_mode=none`)).catch(() => {});
  }

  function renderPhotos(g) {
    const photos = Array.isArray(g.photos) ? g.photos : [];
    photosGrid.innerHTML = photos.map(p => {
      return `
        <div class="ks-photo">
          <div style="position:relative">
            ${p.is_cover ? `<div style="position:absolute;left:8px;top:8px;z-index:2" class="ks-badge">CAPA</div>` : ``}
            <button type="button" class="ks-btn secondary" data-action="set-cover" data-photo-id="${p.id}" style="position:absolute;right:8px;top:8px;z-index:2;padding:8px 10px;border-radius:12px;font-size:10px">
              Definir capa
            </button>
            <img loading="lazy" src="" data-photo-id="${p.id}" alt="${escapeHtml(p.original_name || 'foto')}" />
          </div>
          <div class="cap">${escapeHtml(p.original_name || '')}</div>
        </div>
      `;
    }).join('');

    // carregar thumbs com Authorization
    const imgs = Array.from(photosGrid.querySelectorAll('img[data-photo-id]'))
      .map(img => ({ img, id: parseInt(img.getAttribute('data-photo-id') || '0', 10) }))
      .filter(x => x.id);
    runPool(imgs, 6, async ({ img, id }) => setImgPreview(img, `${API_URL}/api/king-selection/photos/${id}/preview?wm_mode=none`)).catch(() => {});

    // ação: definir capa (serve para publicação e para o painel)
    Array.from(photosGrid.querySelectorAll('button[data-action="set-cover"]')).forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const photoId = parseInt(btn.getAttribute('data-photo-id') || '0', 10);
        if (!photoId) return;
        try {
          btn.disabled = true;
          const res = await fetch(`${API_URL}/api/king-selection/photos/${photoId}`, {
            method: 'PATCH',
            headers: HEADERS,
            body: JSON.stringify({ is_cover: true })
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.message || 'Erro ao definir capa');
          await loadGalleries();
          if (activeGallery && activeGallery.id) {
            const updated = galleries.find(x => x.id === activeGallery.id);
            if (updated) openDrawer(updated);
          }
        } catch (err) {
          alert(err?.message || 'Erro');
        } finally {
          btn.disabled = false;
        }
      });
    });
  }

  // ===== Imagens com Authorization (igual project) =====
  const _imgCache = new Map(); // key(url) -> objectURL
  function revokeImg(url) {
    const prev = _imgCache.get(url);
    if (prev) {
      try { URL.revokeObjectURL(prev); } catch (_) {}
      _imgCache.delete(url);
    }
  }
  async function setImgPreview(imgEl, url) {
    if (!imgEl || !url) return;
    const prevUrl = imgEl.getAttribute('data-cache-url');
    if (prevUrl && prevUrl !== url) revokeImg(prevUrl);
    imgEl.setAttribute('data-cache-url', url);
    if (_imgCache.has(url)) {
      imgEl.src = _imgCache.get(url);
      return;
    }
    const res = await fetch(url, { headers: IMG_HEADERS });
    if (!res.ok) throw new Error('Falha ao carregar imagem');
    const blob = await res.blob();
    const obj = URL.createObjectURL(blob);
    _imgCache.set(url, obj);
    imgEl.src = obj;
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

  async function loadGalleries() {
    if (!itemId) {
      alert('itemId não encontrado na URL.');
      return;
    }
    const res = await fetch(`${API_URL}/api/king-selection/galleries?profileItemId=${encodeURIComponent(itemId)}`, { headers: HEADERS });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      localStorage.removeItem('conectaKingToken');
      localStorage.removeItem('conectaKingRefreshToken');
      localStorage.removeItem('conectaKingUser');
      alert('Sessão expirada. Faça login novamente.');
      window.location.href = `${ksStaticPageBaseDir()}login.html?returnUrl=${encodeURIComponent(window.location.href)}`;
      return;
    }
    if (!res.ok) throw new Error(data.message || 'Erro ao carregar galerias');
    if (data.share_base_url) window.KING_SELECTION_SHARE_BASE_URL = data.share_base_url;
    galleries = Array.isArray(data.galleries) ? data.galleries : [];
    renderKanban();
  }

  async function createGalleryFromModal() {
    if (!itemId) return;
    const nome_projeto = (newName?.value || '').trim();
    const cliente_email = (newEmail?.value || '').trim();
    const senha = (newPass?.value || '').trim();
    const total = parseInt(newMax?.value || '0', 10) || 0;
    const minSel = parseInt(newMin?.value || '0', 10) || 0;
    const access_type = (newAccess?.value || 'private');
    if (!nome_projeto) throw new Error('Preencha o nome do projeto.');
    if (newCategorySelect && newCategorySelect.value === '__outra__' && !getNewCategoryValue()) {
      throw new Error('Em ?oOutra—, digite o nome da categoria ou escolha uma opção da lista.');
    }
    if (access_type === 'private') {
      if (!cliente_email || !senha || senha.length < 6) {
        throw new Error('Acesso privado: informe e-mail do cliente e senha (mínimo 6 caracteres).');
      }
    }

    const payload = {
      profileItemId: parseInt(itemId, 10),
      nome_projeto,
      access_type,
      total_fotos_contratadas: total,
      min_selections: minSel,
      use_watermark: newWatermark ? !!newWatermark.checked : true
    };
    const cat = getNewCategoryValue();
    if (cat) payload.categoria = cat;
    const cn = (newClientName?.value || '').trim();
    if (cn) payload.cliente_nome = cn;
    if (access_type === 'private') {
      payload.cliente_email = cliente_email;
      payload.senha = senha;
    }

    const res = await fetch(`${API_URL}/api/king-selection/galleries`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Erro ao criar galeria');

    // guardar senha retornada para uso imediato no drawer/WhatsApp (mesmo sem migration senha_enc)
    const created = data.gallery || data;
    const plain = data.client_password || (access_type === 'private' ? senha : '');
    if (created && created.id) created._client_password = plain;

    closeNewModal();
    let msg = 'Galeria criada.';
    if (data.client_password) msg += ` Senha do cliente: ${data.client_password}`;
    if (data.access_type === 'public') msg += ' Modo público.';
    if (data.access_type === 'signup') msg += ' Cadastro de visitante ativo.';
    if (data.access_type === 'paid_event_photos') msg += ' Modo fotos e vendas: configure preços e mensagens no projeto.';
    alert(msg);
    await loadGalleries();
    /* Não abrir o drawer: a galeria já foi criada na API; o painel lateral + ?oSalvar— só ao editar abrindo o card. */
  }

  async function saveStatus() {
    if (!activeGallery) return;
    const res = await fetch(`${API_URL}/api/king-selection/galleries/${activeGallery.id}/status`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ status: statusSelect.value })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data.message || 'Erro ao salvar status';
      if (res.status === 400 && /vários clientes/i.test(msg)) {
        throw new Error('Esta galeria tem vários visitantes: use a página do projeto (Atividades do cliente) para alterar o status de cada um.');
      }
      throw new Error(msg);
    }
    await loadGalleries();
    // reabrir com dados atualizados
    const g = galleries.find(x => x.id === activeGallery.id);
    if (g) openDrawer(g);
  }

  async function uploadPhoto(file) {
    if (!activeGallery || !file) return;

    // 1) obter URL de upload do Cloudflare (endpoint já existe no backend)
    const authRes = await fetch(`${API_URL}/api/upload/auth`, { method: 'POST', headers: HEADERS });
    const auth = await authRes.json().catch(() => ({}));
    if (!authRes.ok || !auth.uploadURL || !auth.imageId) {
      throw new Error(auth.message || 'Falha ao obter autorização de upload');
    }

    // 2) upload para Cloudflare (direct upload)
    const form = new FormData();
    form.append('file', file, file.name || 'photo.jpg');
    const upRes = await fetch(auth.uploadURL, { method: 'POST', body: form });
    if (!upRes.ok) throw new Error('Falha no upload para Cloudflare');

    // 3) registrar no banco
    const res = await fetch(`${API_URL}/api/king-selection/galleries/${activeGallery.id}/photos`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ imageId: auth.imageId, original_name: file.name || 'foto', order: 0 })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Falha ao salvar foto');

    await loadGalleries();
    const g = galleries.find(x => x.id === activeGallery.id);
    if (g) openDrawer(g);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  document.getElementById('ks-back-btn').addEventListener('click', () => {
    window.location.href = `${ksStaticPageBaseDir()}dashboard.html`;
  });
  document.getElementById('ks-new-btn').addEventListener('click', async () => {
    openNewModal();
  });
  fabNew?.addEventListener('click', () => openNewModal());
  searchInput?.addEventListener('input', () => {
    searchTerm = searchInput.value || '';
    renderKanban();
  });
  drawerClose.addEventListener('click', closeDrawer);
  drawerOverlay?.addEventListener('click', closeDrawer);
  saveStatusBtn.addEventListener('click', async () => {
    try { await saveStatus(); } catch (e) { alert(e.message || 'Erro'); }
  });
  photoFile.addEventListener('change', async () => {
    const f = photoFile.files && photoFile.files[0];
    if (!f) return;
    try { await uploadPhoto(f); } catch (e) { alert(e.message || 'Erro'); }
    photoFile.value = '';
  });

  // Modal Nova Galeria handlers
  newClose?.addEventListener('click', closeNewModal);
  newCancel?.addEventListener('click', closeNewModal);
  newModal?.addEventListener('click', (e) => { if (e.target === newModal) closeNewModal(); });
  newAccess?.addEventListener('change', updateNewAccessUi);
  newCategorySelect?.addEventListener('change', updateCategoryCustomUi);
  newSave?.addEventListener('click', async () => {
    try {
      newSave.disabled = true;
      await createGalleryFromModal();
    } catch (e) {
      alert(e.message || 'Erro');
    } finally {
      newSave.disabled = false;
    }
  });

  // WhatsApp
  copyWhatsBtn?.addEventListener('click', async () => {
    if (!activeGallery) return;
    const msg = buildWhatsMessage(activeGallery);
    await copyToClipboard(msg);
    alert('Mensagem copiada! Agora é só colar no WhatsApp.');
  });
  openWhatsBtn?.addEventListener('click', async () => {
    if (!activeGallery) return;
    const msg = buildWhatsMessage(activeGallery);
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  });

  // Export modal
  exportClose?.addEventListener('click', closeExportModal);
  exportModal?.addEventListener('click', (e) => { if (e.target === exportModal) closeExportModal(); });
  exportCopy?.addEventListener('click', async () => {
    await copyToClipboard(exportText?.value || '');
    alert('Copiado!');
  });

  function setActiveTab(key) {
    exportTabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === key));
    if (!exportText) return;
    if (key === 'win') exportText.value = activeExport.windows || '';
    else if (key === 'finder') exportText.value = activeExport.finder || '';
    else exportText.value = activeExport.lightroom || '';
  }
  exportTabs.forEach(t => t.addEventListener('click', () => setActiveTab(t.getAttribute('data-tab'))));

  exportBtn?.addEventListener('click', async () => {
    if (!activeGallery) return;
    try {
      exportBtn.disabled = true;
      const res = await fetch(`${API_URL}/api/king-selection/galleries/${activeGallery.id}/export`, { headers: HEADERS });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Erro ao carregar exportação');
      activeExport = {
        lightroom: data.lightroom || '',
        windows: data.windows || '',
        finder: data.finder || '',
        count: data.count || 0,
        feedback: data.feedback || null
      };
      if (exportMeta) {
        exportMeta.textContent = `${activeGallery.nome_projeto || 'Galeria'} — ${activeExport.count} foto(s)`;
      }
      setActiveTab('lr');
      openExportModal();
    } catch (e) {
      alert(e.message || 'Erro');
    } finally {
      exportBtn.disabled = false;
    }
  });

  // Reset senha
  resetPassBtn?.addEventListener('click', async () => {
    if (!activeGallery) return;
    const senha = prompt('Nova senha do cliente:');
    if (!senha) return;
    try {
      resetPassBtn.disabled = true;
      const res = await fetch(`${API_URL}/api/king-selection/galleries/${activeGallery.id}/reset-password`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ senha })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Erro ao redefinir senha');
      activeGallery._client_password = data.client_password || senha;
      if (clientPassEl) clientPassEl.value = activeGallery._client_password;
      alert('Senha atualizada!');
    } catch (e) {
      alert(e.message || 'Erro');
    } finally {
      resetPassBtn.disabled = false;
    }
  });

  // fechar modais com ESC
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (newModal?.classList.contains('active')) closeNewModal();
    if (exportModal?.classList.contains('active')) closeExportModal();
  });

  (async () => {
    try {
      await ensureProfileItemId();
      const el = document.getElementById('ks-itemid');
      if (el) el.textContent = itemId ? `(itemId: ${itemId})` : '';
      await loadGalleries();
    } catch (e) {
      alert(e.message || 'Erro ao carregar');
    }
  })();
});

