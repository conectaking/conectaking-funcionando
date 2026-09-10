/**
 * CSRF double-submit helper (ck_csrf / X-CK-CSRF).
 * Usado por wrappers que fazem bind de fetch e não passam pelo api-config.
 */
(function (global) {
  'use strict';

  function readCsrf() {
    try {
      var m = document.cookie.match(/(?:^|; )ck_csrf=([^;]*)/);
      return m ? decodeURIComponent(m[1]) : '';
    } catch (e) {
      return '';
    }
  }

  function isMutating(method) {
    var m = String(method || 'GET').toUpperCase();
    return m === 'POST' || m === 'PUT' || m === 'PATCH' || m === 'DELETE';
  }

  function attachToHeaders(headers, method) {
    if (!isMutating(method)) return headers || {};
    var h = headers || {};
    var csrf = readCsrf();
    if (!csrf) return h;
    if (typeof h.set === 'function') {
      if (!h.get('X-CK-CSRF') && !h.get('X-XSRF-TOKEN')) h.set('X-CK-CSRF', csrf);
      return h;
    }
    if (!h['X-CK-CSRF'] && !h['X-XSRF-TOKEN'] && !h['x-ck-csrf']) {
      h = Object.assign({}, h);
      h['X-CK-CSRF'] = csrf;
    }
    return h;
  }

  function wrapFetch(rawFetch) {
    return function (input, init) {
      init = init || {};
      var method = init.method || (typeof input !== 'string' && input && input.method) || 'GET';
      init.headers = attachToHeaders(init.headers, method);
      if (!init.credentials) init = Object.assign({}, init, { credentials: 'include' });
      return rawFetch.call(global, input, init);
    };
  }

  global.CkCsrf = {
    read: readCsrf,
    attachToHeaders: attachToHeaders,
    wrapFetch: wrapFetch,
  };

  // Uma vez por página: injeta X-CK-CSRF em mutações (páginas autenticadas).
  if (!global.__ckCsrfFetchWrapped && typeof global.fetch === 'function') {
    global.__ckCsrfFetchWrapped = true;
    global.fetch = wrapFetch(global.fetch.bind(global));
  }
})(typeof window !== 'undefined' ? window : this);
