/**
 * Dashboard — Vite entry.
 * Core do editor carrega já; módulos pesados (finanças/relatórios/assinatura/empresa/QR)
 * entram sob demanda no primeiro acesso ao painel correspondente.
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
import '@legacy/js/dashboard-empresa.js';
import '@legacy/js/dashboard-cartao.js';
import '@legacy/js/dashboard-editor.js';
import '@legacy/js/dashboard-sortable.js';
import '@legacy/js/dashboard-save.js';
import '@legacy/js/dashboard-upload.js';
import '@legacy/js/dashboard-edit-modal.js';
import '@legacy/js/dashboard-listeners.js';
import '@legacy/js/dashboard-separacao.js';
import '@legacy/js/dashboard-forms-editor.js';
import '@legacy/js/dashboard-info.js';
import '@legacy/js/dashboard-kingDocs-nav.js';
import '@legacy/js/dashboard-personalizar.js';
import '@legacy/js/dashboard-vitrine.js';
import '@legacy/js/module-link-limits.js';

const lazyChunks = {
  finance: () => import('@legacy/js/dashboard-finance.js'),
  relatorios: () => import('@legacy/js/dashboard-relatorios.js'),
  assinatura: () => import('@legacy/js/dashboard-assinatura.js'),
  qr: () => import('@legacy/js/dashboard-qr.js'),
};

const lazyReady = {};

async function ensureLazy(key) {
  if (lazyReady[key]) return lazyReady[key];
  lazyReady[key] = lazyChunks[key]().catch((err) => {
    delete lazyReady[key];
    console.error('[dashboard] falha ao carregar módulo', key, err);
    throw err;
  });
  return lazyReady[key];
}

function paneKeyFromTarget(targetId) {
  if (!targetId) return null;
  if (targetId === 'finance-pane' || String(targetId).startsWith('finance-pane-tab-')) return 'finance';
  if (targetId === 'relatorios-pane') return 'relatorios';
  if (targetId === 'assinatura-pane') return 'assinatura';
  if (targetId === 'compartilhar-pane' || targetId === 'qr-pane') return 'qr';
  return null;
}

function installLazyGuards() {
  // Capture: garante chunk antes dos listeners do painel
  document.addEventListener(
    'click',
    (e) => {
      const el = e.target && e.target.closest
        ? e.target.closest('[data-target], #assinatura-link, a[href*="#finance"], a[href*="#relatorios"], a[href*="#assinatura"]')
        : null;
      if (!el) return;
      const target =
        el.getAttribute('data-target') ||
        (el.id === 'assinatura-link' ? 'assinatura-pane' : '') ||
        (String(el.getAttribute('href') || '').includes('#finance') ? 'finance-pane' : '') ||
        (String(el.getAttribute('href') || '').includes('#relatorios') ? 'relatorios-pane' : '') ||
        (String(el.getAttribute('href') || '').includes('#assinatura') ? 'assinatura-pane' : '');
      const key = paneKeyFromTarget(target);
      if (key) ensureLazy(key);
    },
    true
  );

  window.addEventListener('hashchange', () => {
    const h = (window.location.hash || '').replace(/^#/, '');
    const mapped = {
      finance: 'finance-pane',
      relatorios: 'relatorios-pane',
      assinatura: 'assinatura-pane',
      compartilhar: 'compartilhar-pane',
    };
    const target = mapped[h] || h;
    const key = paneKeyFromTarget(target);
    if (key) ensureLazy(key);
  });

  // Hash inicial
  const initial = (window.location.hash || '').replace(/^#/, '');
  if (initial) {
    const mapped = {
      finance: 'finance-pane',
      relatorios: 'relatorios-pane',
      assinatura: 'assinatura-pane',
      compartilhar: 'compartilhar-pane',
    };
    const key = paneKeyFromTarget(mapped[initial] || initial);
    if (key) ensureLazy(key);
  }

  // Stubs: se alguém chamar antes do chunk, carrega e reencaminha
  function installStub(name, key) {
    const stub = async function (...args) {
      await ensureLazy(key);
      const fn = window[name];
      if (typeof fn !== 'function' || fn === stub) {
        console.warn('[dashboard] módulo carregou sem definir', name);
        return;
      }
      return fn.apply(this, args);
    };
    window[name] = stub;
  }

  if (typeof window.initFinancePane !== 'function') installStub('initFinancePane', 'finance');
  if (typeof window.loadReportsData !== 'function') installStub('loadReportsData', 'relatorios');
}

installLazyGuards();
