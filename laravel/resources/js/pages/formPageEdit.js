/**
 * King Forms editor — Vite entry (legacy public/ + boot Blade).
 */
import '@css/dashboard.css';
import '@mod/js/ck-auth-gate.js';
import '@mod/js/ck-csrf.js';
import '@mod/js/image-crop-modal.js';
import '@mod/js/upload-auth-helper.js';

(async function () {
  if (window.CkAuth && typeof window.CkAuth.requireAuth === 'function') {
    if (!(await window.CkAuth.requireAuth('/login'))) return;
  }
  await import('@mod/formPageEdit.js');
  await import('./formPageEdit-boot.js');
})();
