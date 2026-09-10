/**
 * Gate de autenticação cookie-first (Conecta King).
 * Preferência: cookie HttpOnly `token` via credentials:include.
 * Fallback: localStorage conectaKingToken (sessões antigas).
 */
(function (global) {
  'use strict';

  function lsToken() {
    try {
      return localStorage.getItem('conectaKingToken') || localStorage.getItem('token') || '';
    } catch (e) {
      return '';
    }
  }

  function markSession() {
    try {
      localStorage.setItem('conectaKingSession', '1');
    } catch (e) {}
  }

  function clearSession() {
    try {
      localStorage.removeItem('conectaKingToken');
      localStorage.removeItem('conectaKingRefreshToken');
      localStorage.removeItem('conectaKingSession');
      localStorage.removeItem('token');
    } catch (e) {}
  }

  async function probeCookieAuth() {
    try {
      var r = await fetch('/api/account/status', {
        credentials: 'include',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      if (r.ok) {
        markSession();
        return true;
      }
    } catch (e) {}
    return false;
  }

  /**
   * @param {string} [loginPath]
   * @returns {Promise<boolean>}
   */
  async function requireAuth(loginPath) {
    if (lsToken()) {
      markSession();
      return true;
    }
    try {
      if (localStorage.getItem('conectaKingSession') === '1') {
        if (await probeCookieAuth()) return true;
      }
    } catch (e) {}
    if (await probeCookieAuth()) return true;
    var dest = loginPath || '/login';
    var ru = encodeURIComponent(global.location.href);
    global.location.href = dest + (dest.indexOf('?') >= 0 ? '&' : '?') + 'returnUrl=' + ru;
    return false;
  }

  global.CkAuth = {
    lsToken: lsToken,
    markSession: markSession,
    clearSession: clearSession,
    probeCookieAuth: probeCookieAuth,
    requireAuth: requireAuth,
  };
})(typeof window !== 'undefined' ? window : this);
