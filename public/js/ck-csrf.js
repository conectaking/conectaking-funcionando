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

  // Uma vez por página: injeta CSRF em mutações (páginas autenticadas).
  if (!global.__ckCsrfFetchWrapped && typeof global.fetch === 'function') {
    global.__ckCsrfFetchWrapped = true;
    global.fetch = wrapFetch(global.fetch.bind(global));
  }
})(typeof window !== 'undefined' ? window : this);
