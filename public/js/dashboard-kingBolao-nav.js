/**
 * Insere «King Bolão» no sidebar logo abaixo de «King Selection».
 * Visibilidade controlada pela Separação de Pacotes (hasKingBolao / king_bolao).
 */
(function (global) {
  'use strict';

  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function isKingSelectionEl(el) {
    const t = norm(el?.textContent || '');
    return t.includes('king selection') || el?.id === 'king-selection-sidebar-link';
  }

  function findKingSelectionAnchor() {
    const byId = document.getElementById('king-selection-sidebar-link');
    if (byId) return byId;
    const links = document.querySelectorAll('.sidebar-nav a, nav.sidebar-nav a, aside .sidebar-nav a');
    for (const el of links) {
      if (isKingSelectionEl(el)) return el;
    }
    return null;
  }

  function rowElement(el) {
    return el.closest('li') || el;
  }

  function createLink(ref) {
    let link = document.getElementById('king-bolao-sidebar-link');
    if (link) return link;
    link = document.createElement('a');
    link.href = '/kingBolao';
    link.id = 'king-bolao-sidebar-link';
    link.className = (ref && ref.className) ? ref.className : 'nav-link nav-link-by-plan';
    link.setAttribute('data-module', 'king_bolao');
    link.title = 'King Bolão';
    link.innerHTML = '<i class="fas fa-futbol"></i> <span>King Bolão</span>';
    link.style.display = 'none';
    return link;
  }

  function insertAfter(ref, link) {
    const row = rowElement(ref);
    const wrap = document.createElement(row.tagName === 'LI' ? 'li' : 'div');
    if (row.className && row.tagName !== 'A') wrap.className = row.className;
    wrap.appendChild(link);
    if (row.parentNode) {
      row.parentNode.insertBefore(wrap, row.nextSibling);
      return true;
    }
    return false;
  }

  function readUser() {
    try {
      return JSON.parse(localStorage.getItem('conectaKingUser') || '{}');
    } catch (_) {
      return {};
    }
  }

  function moduleEnabled(user) {
    if (!user) return false;
    const raw = user.hasKingBolao;
    return raw === true || raw === 1 || raw === 'true';
  }

  function apiBase() {
    const list = [global.API_URL, global.API_BASE, global.location?.origin];
    for (const v of list) {
      const raw = String(v || '').trim().replace(/\/$/, '');
      if (raw && /^https?:\/\//i.test(raw)) return raw;
    }
    return '';
  }

  async function checkAccessApi() {
    const token = localStorage.getItem('conectaKingToken') || localStorage.getItem('token') || '';
    if (!token) return false;
    const base = apiBase();
    if (!base) return false;
    try {
      const res = await fetch(`${base}/api/king-bolao/access-check`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      return !!(res.ok && data.allowed);
    } catch (_) {
      return false;
    }
  }

  async function applyVisibility(link) {
    const user = readUser();
    if (moduleEnabled(user)) {
      link.style.display = 'flex';
      return;
    }
    if (await checkAccessApi()) {
      link.style.display = 'flex';
    } else {
      link.style.display = 'none';
    }
  }

  function init() {
    let link = document.getElementById('king-bolao-sidebar-link');
    if (!link) {
      const ref = findKingSelectionAnchor();
      if (!ref) return;
      link = createLink(ref);
      insertAfter(ref, link);
    }
    if (typeof global.applyModulesVisibility === 'function') {
      const user = readUser();
      if (user && Object.prototype.hasOwnProperty.call(user, 'hasKingBolao')) {
        global.applyModulesVisibility(user);
        return;
      }
    }
    applyVisibility(link);
  }

  function onReady() {
    init();
    setTimeout(init, 400);
    setTimeout(init, 1500);
    try {
      const obs = new MutationObserver(() => {
        if (!document.getElementById('king-bolao-sidebar-link')) init();
      });
      obs.observe(document.body, { childList: true, subtree: true });
    } catch (_) { /* ignore */ }
  }

  global.DashboardKingBolaoNav = { init, applyVisibility };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }
})(typeof window !== 'undefined' ? window : this);
