(function () {
      document.addEventListener('click', function (e) {
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
