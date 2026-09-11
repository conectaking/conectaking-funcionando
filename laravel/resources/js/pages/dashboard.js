/**
 * Dashboard — Vite entry.
 * Core do editor carrega já; módulos pesados (finanças/relatórios/assinatura/QR
 * + forms/edit-modal) entram sob demanda. Vitrine fica eager (save síncrono).
 * CDN (Chart/Cropper/Sortable/Leaflet/QR) e config.js continuam no Blade.
 */
import '@css/style.css';
import '@css/dashboard.css';
import '@css/css/profile-wifi.css';
import '@css/pages/dashboard-extra.css';
import '../vendor-globals-core.js';
import '../inline/pages-dashboard-1.js';
import '../inline/pages-dashboard-2.js';
import '../inline/pages-dashboard-3.js';
import '../inline/pages-dashboard-4.js';
import '../inline/pages-dashboard-5.js';
import '../inline/pages-dashboard-6.js';
import '../inline/pages-dashboard-7.js';
import '../inline/pages-dashboard-8.js';

import '@mod/js/ck-auth-gate.js';
import '@mod/js/ck-csrf.js';
import '@mod/js/dashboard-ocultar-modulos-por-plano.js';
import '@mod/global.js';
import '@mod/android-fix.js';
import '@mod/js/planRenderer.js';
import '@mod/js/dashboard-cropper-enhance.js';
import '@mod/js/profile-wifi.js';
import '@mod/dashboard.js';
import '@mod/js/dashboard-empresa.js';
import '@mod/js/dashboard-cartao.js';
import '@mod/js/dashboard-editor.js';
import '@mod/js/dashboard-sortable.js';
import '@mod/js/dashboard-save.js';
import '@mod/js/dashboard-upload.js';
import '@mod/js/dashboard-listeners.js';
import '@mod/js/dashboard-separacao.js';
import '@mod/js/dashboard-info.js';
import '@mod/js/dashboard-kingDocs-nav.js';
import '@mod/js/dashboard-personalizar.js';
import '@mod/js/dashboard-vitrine.js';
import '@mod/js/module-link-limits.js';

const lazyChunks = {
  finance: () => import('@mod/js/dashboard-finance.js'),
  relatorios: () => import('@mod/js/dashboard-relatorios.js'),
  assinatura: () => import('@mod/js/dashboard-assinatura.js'),
  qr: () => import('@mod/js/dashboard-qr.js'),
  formsEditor: () => import('@mod/js/dashboard-forms-editor.js'),
  editModal: () => import('@mod/js/dashboard-edit-modal.js'),
};

const lazyReady = {};

async function ensureLazy(key) {
  if (lazyReady[key]) return lazyReady[key];
  lazyReady[key] = lazyChunks[key]().catch((err) => {
    delete lazyReady[key];
    console.error('[dashboard] falha ao carregar mÃ³dulo', key, err);
    throw err;
  });
  return lazyReady[key];
}
window.__ckEnsureLazy = ensureLazy;

function paneKeyFromTarget(targetId) {
  if (!targetId) return null;
  if (targetId === 'finance-pane' || String(targetId).startsWith('finance-pane-tab-')) return 'finance';
  if (targetId === 'relatorios-pane') return 'relatorios';
  if (targetId === 'assinatura-pane') return 'assinatura';
  if (targetId === 'compartilhar-pane' || targetId === 'qr-pane') return 'qr';
  if (targetId === 'king-forms-pane') return 'formsEditor';
  return null;
}

function installLazyGuards() {
  // Capture: garante chunk antes dos listeners do painel
  document.addEventListener(
    'click',
    (e) => {
      const el = e.target && e.target.closest
        ? e.target.closest(
            '[data-target], #assinatura-link, a[href*="#finance"], a[href*="#relatorios"], a[href*="#assinatura"], a[href*="#king-forms"], .edit-item-btn, .module-action-btn.edit'
          )
        : null;
      if (!el) return;

      if (el.matches('.edit-item-btn, .module-action-btn.edit')) {
        // Modal + forms (perguntas/respostas no modal) antes do handler
        ensureLazy('editModal');
        ensureLazy('formsEditor');
        return;
      }

      const target =
        el.getAttribute('data-target') ||
        (el.id === 'assinatura-link' ? 'assinatura-pane' : '') ||
        (String(el.getAttribute('href') || '').includes('#finance') ? 'finance-pane' : '') ||
        (String(el.getAttribute('href') || '').includes('#relatorios') ? 'relatorios-pane' : '') ||
        (String(el.getAttribute('href') || '').includes('#assinatura') ? 'assinatura-pane' : '') ||
        (String(el.getAttribute('href') || '').includes('#king-forms') ? 'king-forms-pane' : '');
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
      'king-forms': 'king-forms-pane',
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
      'king-forms': 'king-forms-pane',
    };
    const key = paneKeyFromTarget(mapped[initial] || initial);
    if (key) ensureLazy(key);
  }

  // Stubs: se alguÃ©m chamar antes do chunk, carrega e reencaminha
  function installStub(name, key) {
    const stub = async function (...args) {
      await ensureLazy(key);
      const fn = window[name];
      if (typeof fn !== 'function' || fn === stub) {
        console.warn('[dashboard] mÃ³dulo carregou sem definir', name);
        return;
      }
      return fn.apply(this, args);
    };
    window[name] = stub;
  }

  if (typeof window.initFinancePane !== 'function') installStub('initFinancePane', 'finance');
  if (typeof window.loadReportsData !== 'function') installStub('loadReportsData', 'relatorios');
  if (typeof window.renderFormQuestions !== 'function') installStub('renderFormQuestions', 'formsEditor');
  if (typeof window.loadFormResponses !== 'function') installStub('loadFormResponses', 'formsEditor');
  if (typeof window.generateQRCode !== 'function') installStub('generateQRCode', 'qr');

  // Assinatura: sempre garantir chunk (DOMContentLoaded do core NÃƒO deve sobrescrever isto)
  window.loadSubscriptionInfo = async function (...args) {
    try {
      await ensureLazy('assinatura');
    } catch (err) {
      const infoEl = document.getElementById('subscription-info');
      if (infoEl) {
        infoEl.innerHTML = '<p style="color:#ff4444;">Erro ao carregar mÃ³dulo de assinatura. Atualize a pÃ¡gina.</p>';
      }
      throw err;
    }
    const fn = window.DashboardAssinatura && window.DashboardAssinatura.loadSubscriptionInfo;
    if (typeof fn !== 'function') {
      console.warn('[dashboard] assinatura carregou sem loadSubscriptionInfo');
      const infoEl = document.getElementById('subscription-info');
      if (infoEl) {
        infoEl.innerHTML = '<p style="color:#ff4444;">Assinatura indisponÃ­vel. Atualize a pÃ¡gina.</p>';
      }
      return;
    }
    return fn.apply(window.DashboardAssinatura, args);
  };
  // openEditModal: forÃ§ar await do chunk antes de delegar
  window.openEditModal = async function (itemEl) {
    await ensureLazy('editModal');
    const fn = window.DashboardEditModal && window.DashboardEditModal.openEditModal;
    if (typeof fn !== 'function') {
      console.warn('[dashboard] editModal carregou sem openEditModal');
      return;
    }
    return fn.call(window.DashboardEditModal, itemEl);
  };
  window.openEditModalForNewItem = async function (tempItem) {
    await ensureLazy('editModal');
    const fn = window.DashboardEditModal && window.DashboardEditModal.openEditModalForNewItem;
    if (typeof fn !== 'function') {
      console.warn('[dashboard] editModal carregou sem openEditModalForNewItem');
      return;
    }
    return fn.call(window.DashboardEditModal, tempItem);
  };
}

installLazyGuards();

// Reafirma wrappers lazy DEPOIS do boot do core (DOMContentLoaded),
// para o legado nÃ£o deixar Assinatura/QR/Edit em no-op eterno.
document.addEventListener('DOMContentLoaded', () => {
  window.loadSubscriptionInfo = async function (...args) {
    try {
      await ensureLazy('assinatura');
    } catch (err) {
      const infoEl = document.getElementById('subscription-info');
      if (infoEl) {
        infoEl.innerHTML =
          '<p style="color:#ff4444;">Erro ao carregar mÃ³dulo de assinatura. Atualize a pÃ¡gina.</p>';
      }
      throw err;
    }
    const fn = window.DashboardAssinatura && window.DashboardAssinatura.loadSubscriptionInfo;
    if (typeof fn !== 'function') {
      const infoEl = document.getElementById('subscription-info');
      if (infoEl) {
        infoEl.innerHTML =
          '<p style="color:#ff4444;">Assinatura indisponÃ­vel. Atualize a pÃ¡gina.</p>';
      }
      return;
    }
    return fn.apply(window.DashboardAssinatura, args);
  };
  window.openEditModal = async function (itemEl) {
    await ensureLazy('editModal');
    const fn = window.DashboardEditModal && window.DashboardEditModal.openEditModal;
    if (typeof fn !== 'function') return;
    return fn.call(window.DashboardEditModal, itemEl);
  };
  window.openEditModalForNewItem = async function (tempItem) {
    await ensureLazy('editModal');
    const fn = window.DashboardEditModal && window.DashboardEditModal.openEditModalForNewItem;
    if (typeof fn !== 'function') return;
    return fn.call(window.DashboardEditModal, tempItem);
  };
  if (typeof window.generateQRCode !== 'function' || !window.DashboardQR) {
    const stub = async function (...args) {
      await ensureLazy('qr');
      const fn = window.generateQRCode;
      if (typeof fn !== 'function' || fn === stub) {
        console.warn('[dashboard] mÃ³dulo carregou sem definir generateQRCode');
        return;
      }
      return fn.apply(this, args);
    };
    window.generateQRCode = stub;
  }
});
