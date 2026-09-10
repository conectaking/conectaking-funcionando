/**
 * Página de vendas (editor) — Vite entry.
 * CDN Chart/Sortable/Cropper e config.js ficam no Blade.
 */
import '@legacy/style.css';
import '@legacy/dashboard.css';
import '@legacy/salesPageEdit.css';
import '@legacy/js/ck-auth-gate.js';
import '@legacy/js/upload-auth-helper.js';

(async function () {
  if (window.CkAuth && typeof window.CkAuth.requireAuth === 'function') {
    if (!(await window.CkAuth.requireAuth('/login'))) return;
  }
  await import('@legacy/suggestionModal.js');
  await import('@legacy/textSuggestions.js');
  await import('@legacy/dashboard.modals.js');
  await import('@legacy/dashboard.salesPage.js');
  await import('@legacy/dashboard.products.js');
  await import('@legacy/dashboard.analytics.js');
  await import('@legacy/salesPageEdit.js');
})();
