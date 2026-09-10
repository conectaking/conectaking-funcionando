(function () {
        try {
          var host = String(window.location.hostname || '').toLowerCase();
          var port = String(window.location.port || '');
          var params = new URLSearchParams(window.location.search || '');
          var isLocalHost = host === 'localhost' || host === '127.0.0.1';
          var isProdHost = host === 'conectaking.com.br' || host === 'www.conectaking.com.br' || host.endsWith('.conectaking.com.br') || host === 'cnking.bio' || host === 'www.cnking.bio';
          var sameOrigin = String(window.location.origin || '').replace(/\/$/, '');
          var wantLocal =
            (params.get('api') || '').toLowerCase() === 'local' ||
            (isLocalHost && localStorage.getItem('useLocalApi') === 'true');
          if (isProdHost || (params.get('api') || '').toLowerCase() === 'prod') {
            try { localStorage.removeItem('useLocalApi'); localStorage.setItem('useProductionApi', 'true'); } catch (e) {}
            wantLocal = false;
          }
          // Local: preferir mesma origem (FrankenPHP :8080); portas estáticas → :8080
          var localApiBase = sameOrigin;
          if (isLocalHost && (port === '5500' || port === '3000' || port === '5173')) {
            localApiBase = 'http://' + (host || 'localhost') + ':8080';
          }
          var prodApiBase = isProdHost ? sameOrigin : 'https://www.conectaking.com.br';
          window.API_BASE = (wantLocal || isLocalHost) ? localApiBase : prodApiBase;
          if (isProdHost) window.API_BASE = sameOrigin || prodApiBase;
          window.API_URL = window.API_BASE;
        } catch (e) {
          window.API_BASE = window.API_BASE || window.API_URL || (window.location && window.location.origin) || 'https://www.conectaking.com.br';
          window.API_URL = window.API_URL || window.API_BASE;
        }
      })();
