// Configuracao da API (auto: producao por padrao) — VPS / mesma origem
(function () {
    // Apex sem www parte CSRF (CF 301 em POST/PUT). Canonicaliza já.
    try {
        var __h = String(location.hostname || '').toLowerCase();
        if (__h === 'conectaking.com.br') {
            location.replace('https://www.conectaking.com.br' + location.pathname + location.search + location.hash);
            return;
        }
    } catch (e) {}

    function isStaleRemoteApiHost(hostname) {
        return /\.onrender\.com$/i.test(String(hostname || '')) || String(hostname || '').toLowerCase() === 'onrender.com';
    }

    function sanitizeApiBase(url) {
        try {
            const raw = String(url || '').trim().replace(/\/$/, '');
            if (!raw || !/^https?:\/\//i.test(raw)) return '';
            const h = new URL(raw).hostname.toLowerCase();
            if (isStaleRemoteApiHost(h)) return '';
            return raw;
        } catch (e) {
            return '';
        }
    }

    // Limpa bases de API antigas guardadas no browser (causam CORS no KS).
    try {
        ['apiBase', 'API_BASE', 'API_URL', 'conecta_api_origin'].forEach(function (k) {
            var v = localStorage.getItem(k);
            if (v && /onrender\.com/i.test(v)) localStorage.removeItem(k);
        });
    } catch (e) {}

    // Producao: mesma origem no dominio; fallback www.
    const PROD_BASE_URL = (function () {
        try {
            const host = String(location.hostname || '').toLowerCase();
            if (isStaleRemoteApiHost(host)) return 'https://www.conectaking.com.br';
            if (host === 'conectaking.com.br' || host === 'www.conectaking.com.br' || host.endsWith('.conectaking.com.br') || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) {
                return String(location.origin).replace(/\/$/, '');
            }
        } catch (e) {}
        return 'https://www.conectaking.com.br';
    })();
    const KS_WORKER_PROD_URL = 'https://r2.conectaking.com.br';

    function isLocalHost(hostname) {
        return hostname === 'localhost' || hostname === '127.0.0.1';
    }

    function isSelfHostedApi() {
        try {
            if (typeof location === 'undefined') return false;
            const host = String(location.hostname || '').toLowerCase();
            if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) return true;
            if (host === 'conectaking.com.br' || host === 'www.conectaking.com.br' || host.endsWith('.conectaking.com.br')) {
                return true;
            }
            if (isLocalHost(host)) {
                const port = String(location.port || '');
                if (port === '8080' || port === '80' || port === '') return true;
            }
        } catch (e) {}
        return false;
    }

    function shouldForceLocal() {
        try {
            const params = new URLSearchParams(window.location.search || '');
            if ((params.get('api') || '').toLowerCase() === 'prod') return false;
            if (localStorage.getItem('useProductionApi') === 'true') return false;
            // Dominio de producao / VPS: mesma origem, NAO marcar useLocalApi (usar mesma origem / :8080)
            if (isSelfHostedApi() && !isLocalHost(String(location.hostname || ''))) {
                try {
                    localStorage.removeItem('useLocalApi');
                    localStorage.setItem('useProductionApi', 'true');
                } catch (e) {}
                return false;
            }
            if ((params.get('api') || '').toLowerCase() === 'local') return true;
            if (localStorage.getItem('useLocalApi') === 'true') return true;
            if (typeof location !== 'undefined') {
                const port = String(location.port || '');
                // Servidor estático local (ex. :5500) → forçar API local
                if (port === '5500' || port === '5501') return true;
            }
            if (isSelfHostedApi()) {
                try { localStorage.setItem('useLocalApi', 'true'); } catch (e) {}
                return true;
            }
        } catch (e) {}
        return false;
    }

    function getLocalBaseUrl() {
        try {
            if (typeof location !== 'undefined' && location.origin && isSelfHostedApi()) {
                return String(location.origin).replace(/\/$/, '');
            }
        } catch (e) {}
        const host = (typeof window !== 'undefined' && window.location && window.location.hostname) ? window.location.hostname : 'localhost';
        return 'http://' + host + ':8080';
    }

    const API_CONFIG = {
        local: { baseURL: getLocalBaseUrl() },
        production: { baseURL: PROD_BASE_URL },
        _mode: null,
        get mode() {
            if (this._mode) return this._mode;
            if (shouldForceLocal()) return 'local';
            return 'production';
        },
        set mode(value) {
            if (value === 'local' || value === 'production') this._mode = value;
        },
        get baseURL() {
            const mode = this.mode;
            const raw = (this[mode] && this[mode].baseURL) ? this[mode].baseURL : PROD_BASE_URL;
            return sanitizeApiBase(raw) || PROD_BASE_URL;
        }
    };

    if (typeof window !== 'undefined') {
        window.API_CONFIG = API_CONFIG;
        var resolvedBase = sanitizeApiBase(window.API_BASE) || sanitizeApiBase(window.API_URL) || API_CONFIG.baseURL;
        // Em dominio ConectaKing, forçar mesma origem (ignora localStorage/API antiga).
        if (isSelfHostedApi() && !isLocalHost(String(location.hostname || ''))) {
            resolvedBase = String(location.origin).replace(/\/$/, '');
        }
        window.API_BASE = resolvedBase;
        window.API_URL = resolvedBase;
        try { localStorage.setItem('apiBase', resolvedBase); } catch (e) {}
        window.KS_WORKER_URL = window.KS_WORKER_URL || KS_WORKER_PROD_URL;

        if (!window.__CK_FETCH_FALLBACK_INSTALLED__) {
            window.__CK_FETCH_FALLBACK_INSTALLED__ = true;
            var nativeFetch = window.fetch ? window.fetch.bind(window) : null;
            var apiBase = String(window.API_URL || '').replace(/\/$/, '');
            var sameOriginBase = String(window.location && window.location.origin ? window.location.origin : '').replace(/\/$/, '');

            function shouldRewriteToSameOrigin(absUrl) {
                if (!sameOriginBase) return false;
                if (typeof absUrl !== 'string' || !absUrl) return false;
                // Restos de API remota antiga → mesma origem
                if (/conectaking-api\.onrender\.com/i.test(absUrl) && absUrl.indexOf('/api/') !== -1) return true;
                if (!apiBase || apiBase === sameOriginBase) return false;
                if (absUrl.indexOf(apiBase + '/api/') !== 0) return false;
                return true;
            }

            function rewriteToSameOrigin(absUrl) {
                try {
                    var u = new URL(absUrl);
                    if (/conectaking-api\.onrender\.com/i.test(u.hostname) || (apiBase && absUrl.indexOf(apiBase) === 0)) {
                        return sameOriginBase + u.pathname + u.search + u.hash;
                    }
                } catch (e) {}
                return absUrl.replace(apiBase, sameOriginBase);
            }

            function toAbsoluteUrl(input) {
                try {
                    if (typeof input === 'string') return new URL(input, window.location.origin).toString();
                    if (input && typeof input.url === 'string') return new URL(input.url, window.location.origin).toString();
                } catch (e) {}
                return '';
            }

            function isNetworkLikeError(err) {
                var msg = String(err && err.message ? err.message : '').toLowerCase();
                return !msg || msg.indexOf('failed to fetch') !== -1 || msg.indexOf('networkerror') !== -1;
            }

            if (nativeFetch) {
                window.fetch = function (input, init) {
                    var abs = toAbsoluteUrl(input);
                    if (shouldRewriteToSameOrigin(abs)) {
                        var rewritten = rewriteToSameOrigin(abs);
                        if (rewritten && rewritten !== abs) {
                            if (typeof input === 'string') {
                                return nativeFetch(rewritten, init);
                            }
                            if (typeof Request !== 'undefined' && input instanceof Request) {
                                return nativeFetch(new Request(rewritten, input), init);
                            }
                            return nativeFetch(rewritten, init);
                        }
                    }
                    return nativeFetch(input, init).catch(function (err) {
                        if (!isNetworkLikeError(err)) throw err;
                        if (!shouldRewriteToSameOrigin(abs)) throw err;
                        var fallbackUrl = rewriteToSameOrigin(abs);
                        if (typeof input === 'string') {
                            return nativeFetch(fallbackUrl, init);
                        }
                        if (typeof Request !== 'undefined' && input instanceof Request) {
                            return nativeFetch(new Request(fallbackUrl, input), init);
                        }
                        return nativeFetch(fallbackUrl, init);
                    });
                };
            }
        }
    }
})();
