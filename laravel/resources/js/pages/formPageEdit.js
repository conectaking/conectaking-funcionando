/**
 * King Forms editor — Vite entry (legacy public/ + boot Blade).
 */
import '@legacy/dashboard.css';
import '@legacy/js/ck-auth-gate.js';
import '@legacy/js/ck-csrf.js';
import '@legacy/js/image-crop-modal.js';
import '@legacy/js/upload-auth-helper.js';

(async function () {
  if (window.CkAuth && typeof window.CkAuth.requireAuth === 'function') {
    if (!(await window.CkAuth.requireAuth('/login'))) return;
  }
  await import('@legacy/formPageEdit.js');
  await import('./formPageEdit-boot.js');
})();
