/**
 * Dashboard — Vite entry.
 * Core do editor carrega já; módulos pesados (finanças/relatórios/assinatura/QR
 * + forms/edit-modal) entram sob demanda. Vitrine fica eager (save síncrono).
 * CDN (Chart/Cropper/Sortable/Leaflet/QR) e config.js continuam no Blade.
 */
import '@legacy/style.css';
import '@legacy/dashboard.css';
import '@legacy/css/profile-wifi.css';

import '@legacy/js/ck-auth-gate.js';
import '@legacy/js/ck-csrf.js';
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
import '@legacy/js/dashboard-listeners.js';
import '@legacy/js/dashboard-separacao.js';
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
  formsEditor: () => import('@legacy/js/dashboard-forms-editor.js'),
  editModal: () => import('@legacy/js/dashboard-edit-modal.js'),
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
  if (typeof window.renderFormQuestions !== 'function') installStub('renderFormQuestions', 'formsEditor');
  if (typeof window.loadFormResponses !== 'function') installStub('loadFormResponses', 'formsEditor');
  if (typeof window.generateQRCode !== 'function') installStub('generateQRCode', 'qr');

  // Assinatura: sempre garantir chunk (DOMContentLoaded do core NÃO deve sobrescrever isto)
  window.loadSubscriptionInfo = async function (...args) {
    try {
      await ensureLazy('assinatura');
    } catch (err) {
      const infoEl = document.getElementById('subscription-info');
      if (infoEl) {
        infoEl.innerHTML = '<p style="color:#ff4444;">Erro ao carregar módulo de assinatura. Atualize a página.</p>';
      }
      throw err;
    }
    const fn = window.DashboardAssinatura && window.DashboardAssinatura.loadSubscriptionInfo;
    if (typeof fn !== 'function') {
      console.warn('[dashboard] assinatura carregou sem loadSubscriptionInfo');
      const infoEl = document.getElementById('subscription-info');
      if (infoEl) {
        infoEl.innerHTML = '<p style="color:#ff4444;">Assinatura indisponível. Atualize a página.</p>';
      }
      return;
    }
    return fn.apply(window.DashboardAssinatura, args);
  };
  // openEditModal: forçar await do chunk antes de delegar
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
// para o legado não deixar Assinatura/QR/Edit em no-op eterno.
document.addEventListener('DOMContentLoaded', () => {
  window.loadSubscriptionInfo = async function (...args) {
    try {
      await ensureLazy('assinatura');
    } catch (err) {
      const infoEl = document.getElementById('subscription-info');
      if (infoEl) {
        infoEl.innerHTML =
          '<p style="color:#ff4444;">Erro ao carregar módulo de assinatura. Atualize a página.</p>';
      }
      throw err;
    }
    const fn = window.DashboardAssinatura && window.DashboardAssinatura.loadSubscriptionInfo;
    if (typeof fn !== 'function') {
      const infoEl = document.getElementById('subscription-info');
      if (infoEl) {
        infoEl.innerHTML =
          '<p style="color:#ff4444;">Assinatura indisponível. Atualize a página.</p>';
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
    installStub('generateQRCode', 'qr');
  }
});
