/**
 * Remove pasta virtual «Sem pasta» se o browser ainda tiver kingSelectionCliente.js antigo em cache.
 * Carregar depois do script principal.
 */
(function () {
  function isSemPastaCard(btn) {
    if (!btn || !btn.classList.contains('ks-folder-card')) return false;
    if (btn.classList.contains('ks-folder-card--all')) return false;
    const rawId = btn.getAttribute('data-open-folder');
    if (rawId === '-1' || rawId === 'all') return rawId === '-1';
    const nameEl = btn.querySelector('.ks-folder-name');
    return !!(nameEl && /sem\s*pasta/i.test(String(nameEl.textContent || '')));
  }

  function stripSemPastaCards() {
    document.querySelectorAll('.ks-folder-card').forEach((btn) => {
      if (isSemPastaCard(btn)) btn.remove();
    });
  }

  function start() {
    stripSemPastaCards();
    const grid = document.getElementById('ks-folder-grid');
    if (grid) {
      new MutationObserver(stripSemPastaCards).observe(grid, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
  window.addEventListener('load', stripSemPastaCards);
})();
