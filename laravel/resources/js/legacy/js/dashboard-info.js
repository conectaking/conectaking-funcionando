/**
 * Dashboard - Aba Informações (Editar Conecta King)
 * Lgica da aba #info-editor: nome, WhatsApp, @, bio, avatar, etc.
 * Incluir no dashboard.html apdashboard.js:
 *   <script src="js/dashboard-info.js" defer></script>
 * No dashboard.js, ao exibir a aba Informações, chamar:
 *   if (window.DashboardInfo && typeof DashboardInfo.init === 'function') DashboardInfo.init();
 */
(function (global) {
    'use strict';

    var DashboardInfo = {
        _initialized: false,

        /**
         * Inicializa a aba Informações (formulrio, handlers, validação).
         * Chamado quando o usuário abre a aba Editar Conecta King ? Informações.
         */
        init: function () {
            if (this._initialized) return;
            var container = document.getElementById('info-editor') || document.querySelector('[data-pane="info"]');
            if (!container) return;
            this._bindForm(container);
            this._initialized = true;
        },

        /**
         * Associa eventos ao formulrio de informaes (nome, WhatsApp, bio, avatar, etc.).
         * Migrar aqui a lgica que hoje est no dashboard.js para a aba Informações.
         */
        _bindForm: function (container) {
            var form = container.querySelector('form') || container.querySelector('[id*="info-form"], [class*="info-form"]');
            if (!form) return;
            // Ex.: form.addEventListener('submit', this._onSubmit.bind(this));
            // Ex.: inputs para mcara, preview de avatar, etc.
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
