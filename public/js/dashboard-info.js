/**
 * Dashboard - Aba Informa��es (Editar Conecta King)
 * L�gica da aba #info-editor: nome, WhatsApp, @, bio, avatar, etc.
 * Incluir no dashboard.html ap�s dashboard.js:
 *   <script src="js/dashboard-info.js" defer></script>
 * No dashboard.js, ao exibir a aba Informa��es, chamar:
 *   if (window.DashboardInfo && typeof DashboardInfo.init === 'function') DashboardInfo.init();
 */
(function (global) {
    'use strict';

    var DashboardInfo = {
        _initialized: false,

        /**
         * Inicializa a aba Informa��es (formul�rio, handlers, valida��o).
         * Chamado quando o usu�rio abre a aba Editar Conecta King ? Informa��es.
         */
        init: function () {
            if (this._initialized) return;
            var container = document.getElementById('info-editor') || document.querySelector('[data-pane="info"]');
            if (!container) return;
            this._bindForm(container);
            this._initialized = true;
        },

        /**
         * Associa eventos ao formul�rio de informa��es (nome, WhatsApp, bio, avatar, etc.).
         * Migrar aqui a l�gica que hoje est� no dashboard.js para a aba Informa��es.
         */
        _bindForm: function (container) {
            var form = container.querySelector('form') || container.querySelector('[id*="info-form"], [class*="info-form"]');
            if (!form) return;
            // Ex.: form.addEventListener('submit', this._onSubmit.bind(this));
            // Ex.: inputs para m�scara, preview de avatar, etc.
        },

        /**
         * Reseta o estado (ex.: ao trocar de conta ou sair).
         */
        reset: function () {
            this._initialized = false;
        }
    };

    if (typeof global !== 'undefined') {
        global.DashboardInfo = DashboardInfo;
    }
})(typeof window !== 'undefined' ? window : this);
