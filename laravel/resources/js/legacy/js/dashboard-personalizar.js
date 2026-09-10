/**
 * Dashboard - Aba Personalizar (Editar Conecta King)
 * Lgica da aba #personalizar-editor: tema, cores, fonte, botes, fundo, logo do cart* Backend: modules/editarCartao/personalizar/
 * Incluir no dashboard.html apdashboard.js:
 *   <script src="js/dashboard-personalizar.js" defer></script>
 * No dashboard.js, ao exibir a aba Personalizar, chamar:
 *   if (window.DashboardPersonalizar && typeof DashboardPersonalizar.init === 'function') DashboardPersonalizar.init();
 */
(function (global) {
    'use strict';

    var DashboardPersonalizar = {
        _initialized: false,

        /**
         * Inicializa a aba Personalizar (tema, cores, botes, logo).
         * Chamado quando o usuário abre a aba Editar Conecta King ? Personalizar.
         */
        init: function () {
            if (this._initialized) return;
            var container = document.getElementById('personalizar-editor') || document.querySelector('[data-pane="personalizar"]');
            if (!container) return;
            this._bindThemeAndColors(container);
            this._initialized = true;
        },

        /**
         * Associa eventos a tema, cores, botes, upload de logo, etc.
         * Migrar aqui a lgica que hoje est no dashboard.js para a aba Personalizar.
         */
        _bindThemeAndColors: function (container) {
            // Ex.: selects de tema, color pickers, preview, upload de logo
            var form = container.querySelector('form') || container.querySelector('[id*="personalizar"], [class*="personalizar"]');
            if (!form) return;
        },

        /**
         * Recarrega o preview do perfil apPublicar alterações (evita ter que atualizar a página).
         * Chamar apsave-all com sucesso, ex.:
         *   fetch('/api/profile/save-all', {...}).then(r=>r.json()).then(function(data){
         *     if (data.success && data.timestamp && window.DashboardPersonalizar && DashboardPersonalizar.reloadPreview) {
         *       DashboardPersonalizar.reloadPreview(data.timestamp);
         *     }
         *   });
         * @param {number} [timestamp] - data.timestamp da resposta do save-all (evita cache)
         */
        reloadPreview: function (timestamp) {
            var ts = timestamp || Date.now();
            var iframes = document.querySelectorAll('iframe[id*="preview"], iframe[data-profile-preview="true"], iframe.preview-iframe, iframe[title*="Preview"]');
            for (var i = 0; i < iframes.length; i++) {
                var src = (iframes[i].src || '').trim();
                if (src) {
                    iframes[i].src = src.split('?')[0] + (src.indexOf('?') >= 0 ? '&' : '?') + 't=' + ts;
                }
            }
        },

        reset: function () {
            this._initialized = false;
        }
    };

    if (typeof global !== 'undefined') {
        global.DashboardPersonalizar = DashboardPersonalizar;
    }
})(typeof window !== 'undefined' ? window : this);
