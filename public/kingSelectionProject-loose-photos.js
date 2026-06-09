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
