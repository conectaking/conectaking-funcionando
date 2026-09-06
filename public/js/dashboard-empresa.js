/**
 * Dashboard - Aba Empresa (Minha equipe, c�digos de convite, personaliza��o da marca)
 * L�gica da aba Empresa (data-tab="times" / pane empresa) e Personaliza��o da Marca (#branding-pane).
 * Incluir no dashboard.html ap�s dashboard.js:
 *   <script src="js/dashboard-empresa.js" defer></script>
 * No dashboard.js, ao exibir a aba Empresa, chamar:
 *   if (window.DashboardEmpresa && typeof DashboardEmpresa.init === 'function') DashboardEmpresa.init();
 * No fluxo mobile, quando o hash for #branding-pane, loadBrandingData() � chamado automaticamente.
 */
(function (global) {
    'use strict';

    var API_BASE = typeof window !== 'undefined' && window.API_BASE != null ? window.API_BASE : (window.API_URL || '');

    function getAuthHeaders() {
        var token = null;
        try {
            if (typeof localStorage !== 'undefined') token = localStorage.getItem('token') || localStorage.getItem('conectaKingToken');
            if (!token && typeof sessionStorage !== 'undefined') token = sessionStorage.getItem('token');
        } catch (e) {}
        var headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        return headers;
    }

    var DashboardEmpresa = {
        _initialized: false,

        /**
         * Inicializa a aba Empresa (equipe, c�digos convite, branding).
         * Chamado quando o usu�rio abre a aba Empresa no sidebar.
         */
        init: function () {
            if (this._initialized) return;
            var pane = document.querySelector('[data-tab="times"], #times-pane, #empresa-pane, .empresa-pane');
            if (pane) this._bindEmpresaPane(pane);
            this._bindBrandingPane();
            this._bindHashForMobile();
            this._initialized = true;
        },

        _bindEmpresaPane: function (pane) {
            // Migrar aqui: Minha equipe, c�digos de convite, personaliza��o (branding) da empresa.
            // Ex.: bot�es, tabelas, modais que hoje est�o no dashboard.js para a aba Empresa.
        },

        _bindBrandingPane: function () {
            var brandingPane = document.getElementById('branding-pane') || document.querySelector('[data-pane="branding"]');
            if (!brandingPane) return;
            // Quando o pane de branding for exibido, carregar dados se necess�rio.
            // Ex.: new MutationObserver ou evento customizado disparado pelo dashboard.js.
        },

        /**
         * Carrega dados da Personaliza��o da Marca (branding).
         * Chamado ao abrir a aba/pane de branding ou quando hash � #branding-pane (mobile).
         */
        loadBrandingData: function () {
            var pane = document.getElementById('branding-pane') || document.querySelector('[data-pane="branding"]');
            if (!pane) return Promise.resolve();
            var url = (API_BASE || '').replace(/\/$/, '') + '/api/account/status';
            return fetch(url, { credentials: 'include', headers: getAuthHeaders() })
                .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('N�o autenticado')); })
                .then(function (data) {
                    // Ex.: preencher formul�rio de logo, cores da empresa, etc.
                    if (typeof global.DashboardEmpresaOnBrandingLoaded === 'function') {
                        global.DashboardEmpresaOnBrandingLoaded(data);
                    }
                    return data;
                })
                .catch(function (err) {
                    console.warn('[DashboardEmpresa] loadBrandingData:', err);
                    throw err;
                });
        },

        /**
         * No mobile, quando a URL tiver hash #branding-pane, carrega os dados da marca.
         */
        _bindHashForMobile: function () {
            function checkHash() {
                if (window.location.hash === '#branding-pane') {
                    if (window.DashboardEmpresa && typeof window.DashboardEmpresa.loadBrandingData === 'function') {
                        window.DashboardEmpresa.loadBrandingData();
                    }
                }
            }
            if (typeof window !== 'undefined') {
                window.addEventListener('hashchange', checkHash);
                if (window.location.hash === '#branding-pane') {
                    setTimeout(checkHash, 200);
                }
            }
        },

        reset: function () {
            this._initialized = false;
        }
    };

    if (typeof global !== 'undefined') {
        global.DashboardEmpresa = DashboardEmpresa;
    }
})(typeof window !== 'undefined' ? window : this);
