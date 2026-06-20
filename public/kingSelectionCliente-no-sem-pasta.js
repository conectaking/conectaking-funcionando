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
