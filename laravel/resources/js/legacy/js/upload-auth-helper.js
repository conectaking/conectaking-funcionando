/**
 * Injeta o token de autenticação em requisições fetch para a API (incluindo /api/upload/receive-one).
 * Preferência: cookie HttpOnly `token` via credentials:include; Bearer do LS só como fallback.
 * Inclua este script como PRIMEIRO script na página.
 */
(function () {
    'use strict';
    var nativeFetch = typeof window !== 'undefined' && window.fetch;
    if (!nativeFetch) return;

    function getToken() {
        try {
            return (typeof localStorage !== 'undefined' && (localStorage.getItem('conectaKingToken') || localStorage.getItem('accessToken') || localStorage.getItem('token'))) ||
                (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('token')) || '';
        } catch (e) { return ''; }
    }

    function getApiBase() {
        try {
            return (typeof window !== 'undefined' && (window.API_BASE || window.API_URL)) ||
                (typeof localStorage !== 'undefined' && (localStorage.getItem('apiBase') || localStorage.getItem('API_BASE'))) ||
                'https://www.conectaking.com.br';
        } catch (e) { return 'https://www.conectaking.com.br'; }
    }

    function isSameOriginApi(url) {
        try {
            if (url.indexOf('/api/') === 0) return true;
            var u = new URL(url, window.location.href);
            return u.origin === window.location.origin && u.pathname.indexOf('/api/') === 0;
        } catch (e) {
            return false;
        }
    }

    window.fetch = function (input, opts) {
        opts = opts || {};
        var url = (typeof input === 'string' ? input : (input && input.url) || '').toString();
        var apiBase = getApiBase().toString().replace(/\/$/, '');
        var isApiRequest = (url.indexOf(apiBase) === 0) ||
            (url.indexOf('conectaking.com.br') !== -1 && url.indexOf('/api/') !== -1) ||
            (url.indexOf('/api/') === 0 && url.length > 4);

        if (isApiRequest) {
            // Cookie HttpOnly `token` (login/refresh) precisa de credentials
            if (opts.credentials == null && isSameOriginApi(url)) {
                opts.credentials = 'include';
            }
            var headers = opts.headers;
            if (!headers) opts.headers = headers = {};
            var hasAuth = false;
            try {
                if (typeof headers.get === 'function') hasAuth = !!headers.get('Authorization');
                else if (headers.Authorization) hasAuth = true;
            } catch (e) {}
            if (!hasAuth) {
                var token = getToken();
                if (token) {
                    try {
                        if (typeof headers.set === 'function') headers.set('Authorization', 'Bearer ' + token);
                        else headers.Authorization = 'Bearer ' + token;
                    } catch (e) {
                        opts.headers = { Authorization: 'Bearer ' + token };
                    }
                }
            }
        }
        return nativeFetch.call(this, input, opts);
    };
})();
