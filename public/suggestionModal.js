/**
 * Modal de Sugestes - Substitui prompt() nativo
 * Cria um modal customizado para coletar input do usuário
 */

(function() {
    'use strict';

    window.SuggestionModal = {
        /**
         * Mostrar modal para coletar prompt do usuário
         * @param {Object} options - Opes do modal
         * @param {string} options.title - Título do modal
         * @param {string} options.message - Mensagem/instruo
         * @param {string} options.placeholder - Placeholder do input
         * @param {string} options.defaultValue - Valor padrão
         * @param {Function} options.onConfirm - Callback quando confirmar (recebe o valor)
         * @param {Function} options.onCancel - Callback quando cancelar
         */
        show(options = {}) {
            const {
                title = 'Gerar Sugestão',
                message = 'Digite algumas palavras para gerar a sugesto:',
                placeholder = 'Ex: minha loja de roupas',
                defaultValue = '',
                onConfirm = null,
                onCancel = null
            } = options;

            // Remover modal existente se houver
            const existingModal = document.getElementById('suggestion-modal');
            if (existingModal) {
                existingModal.remove();
            }

            // Criar modal
            const modal = document.createElement('div');
            modal.id = 'suggestion-modal';
            modal.className = 'suggestion-modal-overlay';
            modal.innerHTML = `
                <div class="suggestion-modal-content">
                    <div class="suggestion-modal-header">
                        <h3>${title}</h3>
                        <button type="button" class="suggestion-modal-close" id="suggestion-modal-close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="suggestion-modal-body">
                        <p class="suggestion-modal-message">${message}</p>
                        <input 
                            type="text" 
                            id="suggestion-modal-input" 
                            class="suggestion-modal-input" 
                            placeholder="${placeholder}"
                            value="${defaultValue}"
                            autofocus
                        >
                    </div>
                    <div class="suggestion-modal-footer">
                        <button type="button" class="suggestion-modal-btn-cancel" id="suggestion-modal-cancel">
                            Cancelar
                        </button>
                        <button type="button" class="suggestion-modal-btn-confirm" id="suggestion-modal-confirm">
                            <i class="fas fa-magic"></i> Gerar
                        </button>
                    </div>
                </div>
            `;

            // Adicionar ao body
            document.body.appendChild(modal);

            // Elementos
            const input = document.getElementById('suggestion-modal-input');
            const btnConfirm = document.getElementById('suggestion-modal-confirm');
            const btnCancel = document.getElementById('suggestion-modal-cancel');
            const btnClose = document.getElementById('suggestion-modal-close');

            // Função para fechar
            const close = () => {
                modal.remove();
            };

            // Função para confirmar
            const confirm = () => {
                const value = input.value.trim();
                if (value.length >= 2) {
                    if (onConfirm && typeof onConfirm === 'function') {
                        onConfirm(value);
                    }
                    close();
                } else {
                    input.focus();
                    input.style.borderColor = '#ff4444';
                    setTimeout(() => {
                        input.style.borderColor = '';
                    }, 2000);
                }
            };

            // Event listeners
            btnConfirm.addEventListener('click', confirm);
            btnCancel.addEventListener('click', () => {
                if (onCancel && typeof onCancel === 'function') {
                    onCancel();
                }
                close();
            });
            btnClose.addEventListener('click', () => {
                if (onCancel && typeof onCancel === 'function') {
                    onCancel();
                }
                close();
            });

            // Fechar ao clicar fora
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    if (onCancel && typeof onCancel === 'function') {
                        onCancel();
                    }
                    close();
                }
            });

            // Enter para confirmar
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    confirm();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    close();
                }
            });

            // Focar no input
            setTimeout(() => {
                input.focus();
                input.select();
            }, 100);
        }
    };

})();

