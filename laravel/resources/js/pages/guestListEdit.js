import '../vendor-globals.js';
/**
 * Lista de convidados — Vite entry.
 * formPageEdit + integração; guestListEdit.js só em modo manage / sem itemId.
 */
import '@css/dashboard.css';
import '../inline/pages-guestListEdit-1.js';
import '../inline/pages-guestListEdit-2.js';
import '@mod/js/ck-auth-gate.js';
import '@mod/js/ck-csrf.js';
import '@mod/js/upload-auth-helper.js';

import '@mod/formPageEdit.js';
import '@mod/guestListEditKingFormsIntegration.js';

const urlParams = new URLSearchParams(window.location.search);
const itemId = urlParams.get('itemId') || urlParams.get('id');
const mode = urlParams.get('mode');

(async function bootGuestList() {
  if (window.CkAuth && typeof window.CkAuth.requireAuth === 'function') {
    const ok = await window.CkAuth.requireAuth('/login');
    if (!ok) return;
  }
  if (!itemId || mode === 'manage') {
    await import('@mod/guestListEdit.js');
  }
})();
