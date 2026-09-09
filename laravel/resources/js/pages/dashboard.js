/**
 * Dashboard — Vite entry.
 * Carrega os scripts clássicos do painel (public/) em ordem, como side-effects.
 * CDN (Chart/Cropper/Sortable/Leaflet/QR) e config.js continuam no Blade.
 */
import '@legacy/style.css';
import '@legacy/dashboard.css';
import '@legacy/css/profile-wifi.css';

import '@legacy/js/dashboard-ocultar-modulos-por-plano.js';
import '@legacy/global.js';
import '@legacy/android-fix.js';
import '@legacy/js/planRenderer.js';
import '@legacy/js/dashboard-cropper-enhance.js';
import '@legacy/js/profile-wifi.js';
import '@legacy/dashboard.js';
import '@legacy/js/dashboard-finance.js';
import '@legacy/js/dashboard-empresa.js';
import '@legacy/js/dashboard-relatorios.js';
import '@legacy/js/dashboard-cartao.js';
import '@legacy/js/dashboard-editor.js';
import '@legacy/js/dashboard-sortable.js';
import '@legacy/js/dashboard-save.js';
import '@legacy/js/dashboard-upload.js';
import '@legacy/js/dashboard-edit-modal.js';
import '@legacy/js/dashboard-qr.js';
import '@legacy/js/dashboard-assinatura.js';
import '@legacy/js/dashboard-listeners.js';
import '@legacy/js/dashboard-separacao.js';
import '@legacy/js/dashboard-forms-editor.js';
import '@legacy/js/dashboard-info.js';
import '@legacy/js/dashboard-kingDocs-nav.js';
import '@legacy/js/dashboard-personalizar.js';
import '@legacy/js/dashboard-vitrine.js';
import '@legacy/js/module-link-limits.js';
