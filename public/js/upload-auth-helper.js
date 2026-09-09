/**
 * Injeta o token de autenticação em todas as requisições fetch para a API (incluindo /api/upload/receive-one).
 * Inclua este script como PRIMEIRO script na página (ex.: formPageEdit.html, King Forms) para corrigir 401 no upload.
 * Ex.: <script src="js/upload-auth-helper.js"></script>
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

    window.fetch = function (input, opts) {
        opts = opts || {};
        var url = (typeof input === 'string' ? input : (input && input.url) || '').toString();
        var apiBase = getApiBase().toString().replace(/\/$/, '');
        var isApiRequest = (url.indexOf(apiBase) === 0) || (url.indexOf('conectaking-api.onrender.com') !== -1) ||
            (url.indexOf('/api/') === 0 && url.length > 4);

        if (isApiRequest) {
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
        return nativeFetch.apply(this, arguments);
    };
})();
