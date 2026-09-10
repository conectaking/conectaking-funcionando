/**
 * Dashboard Modals - Modais Reutilizveis
 * Funcionalidades: Modais de confirmao, alertas, etc.
 */

(function() {
    'use strict';

    const DashboardModals = {
        /**
         * Mostrar modal de confirmao
         */
        confirm(options) {
            return new Promise((resolve) => {
                const {
                    title = 'Confirmar',
                    message = 'Tem certeza?',
                    confirmText = 'Confirmar',
                    cancelText = 'Cancelar',
                    confirmClass = 'btn-primary',
                    cancelClass = 'btn-secondary'
                } = options;

                // Criar modal
                const modal = document.createElement('div');
                modal.className = 'modal active';
                modal.innerHTML = `
                    <div class="modal-content modal-small">
                        <div class="modal-header">
                            <h3>${this.escapeHtml(title)}</h3>
                            <button class="modal-close" data-action="cancel">&times;</button>
                        </div>
                        <div class="modal-body">
                            <p>${this.escapeHtml(message)}</p>
                        </div>
                        <div class="modal-footer">
                            <button class="${cancelClass}" data-action="cancel">${cancelText}</button>
                            <button class="${confirmClass}" data-action="confirm">${confirmText}</button>
                        </div>
                    </div>
                `;

                // Adicionar ao DOM
                document.body.appendChild(modal);

                // Event listeners
                const handleAction = (e) => {
                    const action = e.target.closest('[data-action]')?.dataset.action;
                    if (action === 'confirm') {
                        resolve(true);
                        this.closeModal(modal);
                    } else if (action === 'cancel') {
                        resolve(false);
                        this.closeModal(modal);
                    }
                };

                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        resolve(false);
                        this.closeModal(modal);
                    } else {
                        handleAction(e);
                    }
                });
            });
        },

        /**
         * Mostrar modal de alerta
         */
        alert(options) {
            return new Promise((resolve) => {
                const {
                    title = 'Aviso',
                    message = '',
                    buttonText = 'OK',
                    buttonClass = 'btn-primary'
                } = options;

                // Criar modal
                const modal = document.createElement('div');
                modal.className = 'modal active';
                modal.innerHTML = `
                    <div class="modal-content modal-small">
                        <div class="modal-header">
                            <h3>${this.escapeHtml(title)}</h3>
                            <button class="modal-close" data-action="close">&times;</button>
                        </div>
                        <div class="modal-body">
                            <p>${this.escapeHtml(message)}</p>
                        </div>
                        <div class="modal-footer">
                            <button class="${buttonClass}" data-action="close">${buttonText}</button>
                        </div>
                    </div>
                `;

                // Adicionar ao DOM
                document.body.appendChild(modal);

                // Event listeners
                const handleClose = () => {
                    resolve();
                    this.closeModal(modal);
                };

                modal.addEventListener('click', (e) => {
                    const action = e.target.closest('[data-action]')?.dataset.action;
                    if (action === 'close' || e.target === modal) {
                        handleClose();
                    }
                });
            });
        },

        /**
         * Fechar modal
         */
        closeModal(modal) {
            if (modal && modal.parentNode) {
                modal.classList.remove('active');
                setTimeout(() => {
                    if (modal.parentNode) {
                        modal.parentNode.removeChild(modal);
                    }
                }, 300);
            }
        },

        /**
         * Escape HTML
         */
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    };

    // Exportar para escopo global
    window.DashboardModals = DashboardModals;

})();

