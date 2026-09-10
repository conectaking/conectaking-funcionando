/**
 * King Forms editor — Vite entry (legacy public/ + boot Blade).
 */
import '@legacy/dashboard.css';
import '@legacy/js/ck-auth-gate.js';
import '@legacy/js/image-crop-modal.js';
import '@legacy/js/upload-auth-helper.js';
import '@legacy/formPageEdit.js';
import './formPageEdit-boot.js';

if (window.CkAuth && typeof window.CkAuth.requireAuth === 'function') {
  window.CkAuth.requireAuth('/login');
}
