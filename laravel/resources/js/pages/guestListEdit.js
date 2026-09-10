/**
 * Lista de convidados — Vite entry.
 * formPageEdit + integração; guestListEdit.js só em modo manage / sem itemId.
 */
import '@legacy/dashboard.css';
import '@legacy/js/ck-auth-gate.js';
import '@legacy/js/upload-auth-helper.js';

import '@legacy/formPageEdit.js';
import '@legacy/guestListEditKingFormsIntegration.js';

const urlParams = new URLSearchParams(window.location.search);
const itemId = urlParams.get('itemId') || urlParams.get('id');
const mode = urlParams.get('mode');

(async function bootGuestList() {
  if (window.CkAuth && typeof window.CkAuth.requireAuth === 'function') {
    const ok = await window.CkAuth.requireAuth('/login');
    if (!ok) return;
  }
  if (!itemId || mode === 'manage') {
    await import('@legacy/guestListEdit.js');
  }
})();
