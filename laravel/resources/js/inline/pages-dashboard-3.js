(function () {
      function loadScript(src) {
        return new Promise(function (resolve, reject) {
          var s = document.createElement('script');
          s.src = src;
          s.async = true;
          s.onload = function () { resolve(); };
          s.onerror = function () { reject(new Error('Falha ao carregar ' + src)); };
          document.head.appendChild(s);
        });
      }
      function loadCss(href) {
        return new Promise(function (resolve) {
          if (document.querySelector('link[data-ck-lazy="' + href + '"]')) { resolve(); return; }
          var l = document.createElement('link');
          l.rel = 'stylesheet';
          l.href = href;
          l.setAttribute('data-ck-lazy', href);
          l.onload = function () { resolve(); };
          l.onerror = function () { resolve(); };
          document.head.appendChild(l);
        });
      }
      window.ckEnsureChart = function () {
        if (typeof Chart !== 'undefined') return Promise.resolve(Chart);
        if (window.__ckChartPromise) return window.__ckChartPromise;
        window.__ckChartPromise = loadScript('/vendor/chartjs/chart.umd.min.js').then(function () { return window.Chart; });
        return window.__ckChartPromise;
      };
      window.ckEnsureLeaflet = function () {
        if (window.L) return Promise.resolve(window.L);
        if (window.__ckLeafletPromise) return window.__ckLeafletPromise;
        window.__ckLeafletPromise = loadCss('/vendor/leaflet/leaflet.css')
          .then(function () { return loadScript('/vendor/leaflet/leaflet.js'); })
          .then(function () { return window.L; });
        return window.__ckLeafletPromise;
      };
    })();
