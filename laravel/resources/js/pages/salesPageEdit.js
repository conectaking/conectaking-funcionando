import '../vendor-globals.js';
/**
 * Página de vendas (editor) — Vite entry.
 * config.js permanece no Blade (API_BASE / CSRF).
 */
import '@css/style.css';
import '@css/dashboard.css';
import '@css/salesPageEdit.css';
import '@css/pages/salesPageEdit-extra.css';
import '../inline/pages-salesPageEdit-1.js';
import '../inline/pages-salesPageEdit-2.js';
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
