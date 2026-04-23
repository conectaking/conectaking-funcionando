/**
 * King Selection — painel do fotógrafo (kingSelectionProject.html, /kingSelection, etc.).
 * Remove scroll “preso” na lista de abas: um único scroll da página (como a zona da marca d’água).
 *
 * Incluir antes de </body> em kingSelectionProject.html:
 *   <script src="/king-selection-project-scroll.js" defer></script>
 */
(function () {
  'use strict';

  /** Evita centenas de varreduras pesadas por segundo (Vue/React atualizam o DOM em rajada). */
  var MO_DEBOUNCE_MS = 280;
  var moTimer = null;
  var lastUnstickAt = 0;
  var MIN_UNSTICK_INTERVAL_MS = 120;

  function isKingSelectionPhotographerUi() {
    var path = (location.pathname || '/').toLowerCase();
    // Hostinger: /kingSelectionProject.html?itemId=… (URL real do utilizador)
    if (path.indexOf('kingselectionproject') !== -1) return true;
    if (path.indexOf('kingselectionedit') !== -1) return true;
    var clean = path.replace(/\/+$/, '') || '/';
    var segs = clean.split('/').filter(Boolean);
    if (segs.length === 1 && /^kingselection$/i.test(segs[0])) return true;
    if (segs.length === 2 && /^mr$/i.test(segs[0]) && /^kingselection$/i.test(segs[1])) return true;
    return false;
  }

  function shouldRun() {
    if (!isKingSelectionPhotographerUi()) return false;
    return window.matchMedia('(max-width: 900px)').matches;
  }

  function forceVisibleScroll(el) {
    el.style.setProperty('max-height', 'none', 'important');
    el.style.setProperty('overflow-y', 'visible', 'important');
    el.style.setProperty('overflow-x', 'visible', 'important');
    el.style.setProperty('-webkit-overflow-scrolling', 'auto', 'important');
    el.style.setProperty('overscroll-behavior', 'auto', 'important');
  }

  function unstick() {
    if (!shouldRun()) {
      document.documentElement.classList.remove('ks-project-mobile-unstick');
      return;
    }

    var now = Date.now();
    if (now - lastUnstickAt < MIN_UNSTICK_INTERVAL_MS) {
      return;
    }
    lastUnstickAt = now;

    document.documentElement.classList.add('ks-project-mobile-unstick');

    /* Raiz da app: muitas vezes é aqui que fica overflow:hidden + height:100% */
    var roots = ['app', 'root', '__next'];
    for (var r = 0; r < roots.length; r++) {
      var root = document.getElementById(roots[r]);
      if (root) {
        forceVisibleScroll(root);
        root.style.setProperty('height', 'auto', 'important');
        root.style.setProperty('min-height', '0', 'important');
      }
    }

    var all = document.querySelectorAll('aside, nav, section, article, main, div, ul, ol');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el === document.body || el === document.documentElement) continue;
      var st = window.getComputedStyle(el);
      var oy = st.overflowY;
      var taller = el.scrollHeight > el.clientHeight + 5;

      /* Scroll interno explícito */
      if ((oy === 'auto' || oy === 'scroll') && taller) {
        forceVisibleScroll(el);
        continue;
      }

      /* overflow:hidden mas conteúdo maior que a caixa = scroll “preso” noutro filho */
      if (oy === 'hidden' && taller && el.clientHeight > 80) {
        forceVisibleScroll(el);
      }
    }
  }

  function scheduleUnstickDebounced() {
    if (moTimer) clearTimeout(moTimer);
    moTimer = setTimeout(function () {
      moTimer = null;
      unstick();
    }, MO_DEBOUNCE_MS);
  }

  var resizeTimer = null;
  function onResize() {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      resizeTimer = null;
      unstick();
    }, 160);
  }

  function init() {
    lastUnstickAt = 0;
    unstick();
    try {
      window.addEventListener('resize', onResize, { passive: true });
    } catch (e) {
      window.addEventListener('resize', onResize);
    }
    /* Menos repetições: o MutationObserver já cobre mudanças tardias do SPA. */
    var t = [400, 1200, 2800];
    for (var j = 0; j < t.length; j++) {
      setTimeout(unstick, t[j]);
    }
    if (typeof MutationObserver !== 'undefined') {
      var mo = new MutationObserver(function () {
        scheduleUnstickDebounced();
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(function () {
        try {
          mo.disconnect();
        } catch (e) {}
      }, 20000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
