/**
 * Página de vendas (editor) — Vite entry.
 * CDN Chart/Sortable/Cropper e config.js ficam no Blade.
 */
import '@legacy/style.css';
import '@legacy/dashboard.css';
import '@legacy/salesPageEdit.css';

import '@legacy/js/ck-auth-gate.js';
import '@legacy/js/upload-auth-helper.js';
import '@legacy/suggestionModal.js';
import '@legacy/textSuggestions.js';
import '@legacy/dashboard.modals.js';
import '@legacy/dashboard.salesPage.js';
import '@legacy/dashboard.products.js';
import '@legacy/dashboard.analytics.js';
import '@legacy/salesPageEdit.js';

if (window.CkAuth && typeof window.CkAuth.requireAuth === 'function') {
  window.CkAuth.requireAuth('/login');
}
