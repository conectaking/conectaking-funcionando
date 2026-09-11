/**
 * Gate de autenticação cookie-first (Conecta King).
 * Auth: cookie HttpOnly `token` via credentials:include.
 */
(function (global) {
  'use strict';

  function lsToken() {
    // Cookie-only — não ler JWT do localStorage.
    return '';
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
      localStorage.removeItem('refreshToken');
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
    if (await probeCookieAuth()) {
      return true;
    }
    clearSession();
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
