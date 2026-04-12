/**
 * King Selection — painel do projeto (/kingSelection ou /mr/kingSelection, sem slug de galeria).
 * Desativa regiões com max-height + overflow que prendem o scroll no telemóvel.
 *
 * Incluir antes de </body> em kingSelectionProject.html:
 *   <script src="/king-selection-project-scroll.js" defer></script>
 */
(function () {
  'use strict';

  function isProjectPath() {
    var p = (location.pathname || '/').replace(/\/+$/, '') || '/';
    var segs = p.split('/').filter(Boolean);
    if (segs.length === 1 && /^kingselection$/i.test(segs[0])) return true;
    if (segs.length === 2 && /^mr$/i.test(segs[0]) && /^kingselection$/i.test(segs[1])) return true;
    return false;
  }

  function shouldRun() {
    if (!isProjectPath()) return false;
    return window.matchMedia('(max-width: 900px)').matches;
  }

  function unstick() {
    if (!shouldRun()) {
      document.documentElement.classList.remove('ks-project-mobile-unstick');
      return;
    }
    document.documentElement.classList.add('ks-project-mobile-unstick');

    var all = document.querySelectorAll('aside, nav, section, div, ul, ol');
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      if (el === document.body || el === document.documentElement) continue;
      var st = window.getComputedStyle(el);
      var oy = st.overflowY;
      if (oy !== 'auto' && oy !== 'scroll') continue;
      if (el.scrollHeight <= el.clientHeight + 8) continue;
      var mh = st.maxHeight;
      if (mh === 'none' || mh === '0px') continue;
      el.style.setProperty('max-height', 'none', 'important');
      el.style.setProperty('overflow-y', 'visible', 'important');
      el.style.setProperty('overflow-x', 'visible', 'important');
    }
  }

  function init() {
    unstick();
    window.addEventListener('resize', function () {
      unstick();
    });
    var t = [0, 400, 1200];
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
      }, 8000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
