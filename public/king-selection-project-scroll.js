/**
 * King Selection — painel do fotógrafo (kingSelectionProject.html, /kingSelection, etc.).
 * Remove scroll “preso” na lista de abas: um único scroll da página (como a zona da marca d’água).
 *
 * Incluir antes de </body> em kingSelectionProject.html:
 *   <script src="/king-selection-project-scroll.js" defer></script>
 */
(function () {
  'use strict';

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

  function unstick() {
    if (!shouldRun()) {
      document.documentElement.classList.remove('ks-project-mobile-unstick');
      return;
    }
    document.documentElement.classList.add('ks-project-mobile-unstick');

    var all = document.querySelectorAll('aside, nav, section, article, main, div, ul, ol');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el === document.body || el === document.documentElement) continue;
      var st = window.getComputedStyle(el);
      var oy = st.overflowY;
      if (oy !== 'auto' && oy !== 'scroll') continue;
      if (el.scrollHeight <= el.clientHeight + 5) continue;
      // Antes só corrigíamos se max-height estivesse definido — muitos layouts usam
      // flex + height 100% + overflow-y:auto sem max-height, e o scroll ficava preso.
      el.style.setProperty('max-height', 'none', 'important');
      el.style.setProperty('overflow-y', 'visible', 'important');
      el.style.setProperty('overflow-x', 'visible', 'important');
      el.style.setProperty('-webkit-overflow-scrolling', 'auto', 'important');
      el.style.setProperty('overscroll-behavior', 'auto', 'important');
    }
  }

  function init() {
    unstick();
    window.addEventListener('resize', function () {
      unstick();
    });
    var t = [0, 200, 500, 1000, 2000, 3500];
    for (var j = 0; j < t.length; j++) {
      setTimeout(unstick, t[j]);
    }
    if (typeof MutationObserver !== 'undefined') {
      var mo = new MutationObserver(function () {
        unstick();
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
