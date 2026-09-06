// Configuracao da API (auto: producao por padrao) — VPS Hetzner, sem Render
(function () {
    // Producao: mesma origem no dominio; fallback www.
    const PROD_BASE_URL = (function () {
        try {
            const host = String(location.hostname || '').toLowerCase();
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
                if (port === '5000' || port === '80' || port === '') return true;
            }
        } catch (e) {}
        return false;
    }

    function shouldForceLocal() {
        try {
            const params = new URLSearchParams(window.location.search || '');
            if ((params.get('api') || '').toLowerCase() === 'prod') return false;
            if (localStorage.getItem('useProductionApi') === 'true') return false;
            // Dominio de producao / VPS: mesma origem, NAO marcar useLocalApi (:5000)
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
        return 'http://' + host + ':5000';
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
            return (this[mode] && this[mode].baseURL) ? this[mode].baseURL : PROD_BASE_URL;
        }
    };

    if (typeof window !== 'undefined') {
        window.API_CONFIG = API_CONFIG;
        window.API_BASE = window.API_BASE || API_CONFIG.baseURL;
        window.API_URL = window.API_URL || API_CONFIG.baseURL;
        window.KS_WORKER_URL = window.KS_WORKER_URL || KS_WORKER_PROD_URL;

        if (!window.__CK_FETCH_FALLBACK_INSTALLED__) {
            window.__CK_FETCH_FALLBACK_INSTALLED__ = true;
            var nativeFetch = window.fetch ? window.fetch.bind(window) : null;
            var apiBase = String(window.API_URL || '').replace(/\/$/, '');
            var sameOriginBase = String(window.location && window.location.origin ? window.location.origin : '').replace(/\/$/, '');

            function shouldRetryWithSameOrigin(absUrl) {
                if (!apiBase || !sameOriginBase || apiBase === sameOriginBase) return false;
                if (typeof absUrl !== 'string' || !absUrl) return false;
                if (absUrl.indexOf(apiBase + '/api/') !== 0) return false;
                return true;
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
                    if (!shouldRetryWithSameOrigin(abs)) {
                        return nativeFetch(input, init);
                    }
                    return nativeFetch(input, init).catch(function (err) {
                        if (!isNetworkLikeError(err)) throw err;
                        var fallbackUrl = abs.replace(apiBase, sameOriginBase);
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
