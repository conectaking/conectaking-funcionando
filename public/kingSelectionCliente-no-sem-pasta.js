/**
 * Remove pastas virtuais «Sem pasta» e «Todas» se o browser ainda tiver kingSelectionCliente.js antigo em cache.
 * Carregar depois do script principal.
 */
(function () {
  function shouldRemoveCard(btn) {
    if (!btn || !btn.classList.contains('ks-folder-card')) return false;
    if (btn.classList.contains('ks-folder-card--all')) return true;
    const rawId = btn.getAttribute('data-open-folder');
    if (rawId === '-1') return true;
    const nameEl = btn.querySelector('.ks-folder-name');
    const name = String(nameEl?.textContent || '').trim().toLowerCase();
    if (name === 'todas' || /sem\s*pasta/i.test(name)) return true;
    return false;
  }

  function stripVirtualFolderCards() {
    document.querySelectorAll('.ks-folder-card').forEach((btn) => {
      if (shouldRemoveCard(btn)) btn.remove();
    });
  }

  function start() {
    stripVirtualFolderCards();
    const grid = document.getElementById('ks-folder-grid');
    if (grid) {
      new MutationObserver(stripVirtualFolderCards).observe(grid, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
  window.addEventListener('load', stripVirtualFolderCards);
})();
