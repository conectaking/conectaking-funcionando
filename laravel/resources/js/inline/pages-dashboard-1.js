(function () {
      try {
        if (window.innerWidth > 768 && localStorage.getItem('ck_sidebar_collapsed') === '1') {
          document.addEventListener('DOMContentLoaded', function () {
            document.body.classList.add('ck-sidebar-collapsed');
          });
        }
      } catch (e) {}

      document.addEventListener('click', function (e) {
        var toggleBtn = e.target && e.target.closest && e.target.closest('#mobile-menu-toggle');
        if (toggleBtn && window.innerWidth > 768) {
          e.preventDefault();
          e.stopPropagation();
          var collapsed = document.body.classList.toggle('ck-sidebar-collapsed');
          try { localStorage.setItem('ck_sidebar_collapsed', collapsed ? '1' : '0'); } catch (err) {}
          return;
        }
        var a = e.target && e.target.closest && e.target.closest('.sidebar a.nav-link, .sidebar-nav a, .sidebar-footer a');
        if (!a) return;
        if (a.getAttribute('data-target')) return; // painel interno
        var href = (a.getAttribute('href') || '').trim();
        if (!href || href === '#' || href.charAt(0) === '#') return;
        var isHtml = href.indexOf('.html') !== -1;
        var isAbs = /^https?:\/\//i.test(href);
        var isAppPath = href.charAt(0) === '/' && href.indexOf('/dashboard') !== 0;
        if (!isHtml && !isAbs && !isAppPath) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        window.location.assign(a.href);
      }, true);
    })();
