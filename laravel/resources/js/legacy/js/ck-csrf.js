/**
 * CSRF double-submit helper (ck_csrf / X-CK-CSRF) + X-XSRF-TOKEN Laravel.
 * Usado por wrappers que fazem bind de fetch e não passam pelo api-config.
 */
(function (global) {
  'use strict';

  function readCookie(name) {
    try {
      var m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
      return m ? decodeURIComponent(m[1]) : '';
    } catch (e) {
      return '';
    }
  }

  function readCsrf() {
    return readCookie('ck_csrf');
  }

  function isMutating(method) {
    var m = String(method || 'GET').toUpperCase();
    return m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE';
  }

  function attachToHeaders(headers, method) {
    if (!isMutating(method)) return headers || {};
    var csrf = readCsrf();
    var xsrf = readCookie('XSRF-TOKEN');
    if (!csrf && !xsrf) return headers || {};

    if (typeof headers !== 'undefined' && headers && typeof headers.set === 'function') {
      if (csrf && !headers.get('X-CK-CSRF')) headers.set('X-CK-CSRF', csrf);
      if (xsrf && !headers.get('X-XSRF-TOKEN') && !headers.get('X-CSRF-TOKEN')) {
        headers.set('X-XSRF-TOKEN', xsrf);
      }
      return headers;
    }

    var h = Object.assign({}, headers || {});
    if (csrf && !h['X-CK-CSRF'] && !h['x-ck-csrf']) h['X-CK-CSRF'] = csrf;
    if (xsrf && !h['X-XSRF-TOKEN'] && !h['X-CSRF-TOKEN'] && !h['x-xsrf-token']) {
      h['X-XSRF-TOKEN'] = xsrf;
    }
    return h;
  }

  /** Injeta CSRF em XMLHttpRequest (uploads proxy não passam pelo fetch). */
  function attachToXhr(xhr, method) {
    if (!xhr || typeof xhr.setRequestHeader !== 'function') return;
    if (!isMutating(method || 'POST')) return;
    try {
      var csrf = readCsrf();
      var xsrf = readCookie('XSRF-TOKEN');
      if (csrf) xhr.setRequestHeader('X-CK-CSRF', csrf);
      if (xsrf) xhr.setRequestHeader('X-XSRF-TOKEN', xsrf);
    } catch (e) {}
  }

  var _probePromise = null;
  function ensureCsrfCookie() {
    if (readCsrf()) return Promise.resolve(readCsrf());
    if (_probePromise) return _probePromise;
    var rawFetch = global.__ckCsrfNativeFetch || global.fetch.bind(global);
    _probePromise = rawFetch('/api/account/status', {
      credentials: 'include',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    })
      .catch(function () { return null; })
      .then(function () {
        _probePromise = null;
        return readCsrf();
      });
    return _probePromise;
  }

  function wrapFetch(rawFetch) {
    return function (input, init) {
      init = init || {};
      var method = init.method || (typeof input !== 'string' && input && input.method) || 'GET';
      var mutating = isMutating(method);

      function runOnce() {
        var opts = Object.assign({}, init);
        opts.headers = attachToHeaders(opts.headers, method);
        if (!opts.credentials) opts.credentials = 'include';
        return rawFetch.call(global, input, opts);
      }

      if (!mutating) return runOnce();

      var start = readCsrf()
        ? Promise.resolve()
        : ensureCsrfCookie().then(function () {});

      return start.then(function () {
        return runOnce().then(function (res) {
          if (!res || res.status !== 419) return res;
          // Mint/refresh ck_csrf e tenta 1×
          return ensureCsrfCookie().then(function () {
            return runOnce();
          });
        });
      });
    };
  }

  global.CkCsrf = {
    read: readCsrf,
    attachToHeaders: attachToHeaders,
    attachToXhr: attachToXhr,
    ensureCsrfCookie: ensureCsrfCookie,
    wrapFetch: wrapFetch,
  };

  // Uma vez por página: injeta CSRF em mutações (páginas autenticadas).
  if (!global.__ckCsrfFetchWrapped && typeof global.fetch === 'function') {
    global.__ckCsrfFetchWrapped = true;
    global.__ckCsrfNativeFetch = global.fetch.bind(global);
    global.fetch = wrapFetch(global.__ckCsrfNativeFetch);
  }
})(typeof window !== 'undefined' ? window : this);
