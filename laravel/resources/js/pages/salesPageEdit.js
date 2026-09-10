/**
 * Página de vendas (editor) — Vite entry.
 * CDN Chart/Sortable/Cropper e config.js ficam no Blade.
 */
import '@legacy/style.css';
import '@legacy/dashboard.css';
import '@legacy/salesPageEdit.css';
import '@mod/js/ck-auth-gate.js';
import '@mod/js/ck-csrf.js';
import '@mod/js/upload-auth-helper.js';

(async function () {
  if (window.CkAuth && typeof window.CkAuth.requireAuth === 'function') {
    if (!(await window.CkAuth.requireAuth('/login'))) return;
  }
  await import('@mod/suggestionModal.js');
  await import('@mod/textSuggestions.js');
  await import('@mod/dashboard.modals.js');
  await import('@mod/dashboard.salesPage.js');
  await import('@mod/dashboard.products.js');
  await import('@mod/dashboard.analytics.js');
  await import('@mod/salesPageEdit.js');
})();
