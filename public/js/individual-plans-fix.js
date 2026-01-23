/**
 * Correções para Interface de Planos Individuais
 * - Move modal de seleção de usuário para aparecer no espaço abaixo do botão
 * - Adiciona funcionalidade para remover planos individuais
 */

(function() {
    'use strict';

    // Aguardar DOM estar pronto
    function init() {
        // Aguardar um pouco para garantir que a página carregou
        setTimeout(() => {
            fixUserSelectorModal();
            addRemovePlanFunctionality();
        }, 500);
    }

    /**
     * Corrigir posicionamento do modal de seleção de usuário
     */
    function fixUserSelectorModal() {
        // Procurar pelo modal de seleção de usuário
        const userSelectorModal = document.querySelector('.user-selector-modal, .select-user-modal, [class*="user-select"], [class*="select-user"]');
        
        if (!userSelectorModal) {
            // Tentar encontrar por texto
            const modals = document.querySelectorAll('.modal, [class*="modal"], [class*="sidebar"], [class*="panel"]');
            modals.forEach(modal => {
                const title = modal.querySelector('h2, h3, .title, [class*="title"]');
                if (title && (title.textContent.includes('Selecionar Usuário') || title.textContent.includes('Selecionar'))) {
                    moveModalToContentArea(modal);
                }
            });
        } else {
            moveModalToContentArea(userSelectorModal);
        }

        // Observar mudanças no DOM para quando o modal for criado dinamicamente
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        const modal = node.querySelector && (
                            node.querySelector('.user-selector-modal') ||
                            node.querySelector('.select-user-modal') ||
                            node.querySelector('[class*="user-select"]') ||
                            node.querySelector('[class*="select-user"]')
                        ) || (node.classList && (
                            node.classList.contains('user-selector-modal') ||
                            node.classList.contains('select-user-modal') ||
                            Array.from(node.classList).some(c => c.includes('user-select') || c.includes('select-user'))
                        ) ? node : null);

                        if (modal) {
                            moveModalToContentArea(modal);
                        }
                    }
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Mover modal para área de conteúdo
     */
    function moveModalToContentArea(modal) {
        // Procurar pela área de conteúdo (onde está o botão "Adicionar Plano Individual")
        const contentArea = document.querySelector('.individual-plans-content, .plans-content, [class*="individual-plans"], [class*="plans-container"]) || 
                           document.querySelector('[class*="tab-content"]:not([style*="display: none"])') ||
                           document.querySelector('main, .main-content, .content-area');

        if (!contentArea || !modal) {
            return;
        }

        // Verificar se já foi movido
        if (modal.dataset.moved === 'true') {
            return;
        }

        // Remover estilos de sidebar/posicionamento fixo
        modal.style.cssText = `
            position: relative !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 20px 0 !important;
            padding: 20px !important;
            background: rgba(20, 20, 23, 0.95) !important;
            border-radius: 12px !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
            z-index: 100 !important;
        `;

        // Remover overlay se houver
        const overlay = modal.querySelector('.modal-overlay, .overlay, [class*="overlay"]');
        if (overlay) {
            overlay.style.display = 'none';
        }

        // Marcar como movido
        modal.dataset.moved = 'true';

        // Inserir na área de conteúdo (após o botão ou no espaço vazio)
        const addButton = contentArea.querySelector('button[class*="add"], button:has-text("Adicionar"), .add-plan-btn, [class*="add-plan"]');
        
        if (addButton && addButton.nextSibling) {
            // Inserir após o botão
            addButton.parentNode.insertBefore(modal, addButton.nextSibling);
        } else if (addButton) {
            // Inserir após o botão (se não tiver nextSibling)
            addButton.insertAdjacentElement('afterend', modal);
        } else {
            // Inserir no final da área de conteúdo
            contentArea.appendChild(modal);
        }

        // Ajustar largura do conteúdo interno
        const modalContent = modal.querySelector('.modal-content, .content, [class*="content"]') || modal;
        modalContent.style.cssText += 'width: 100% !important; max-width: 100% !important;';
    }

    /**
     * Adicionar funcionalidade para remover planos individuais
     */
    function addRemovePlanFunctionality() {
        // Observar mudanças para adicionar botões de remover
        const observer = new MutationObserver(() => {
            addRemoveButtons();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Adicionar botões imediatamente
        addRemoveButtons();
    }

    /**
     * Adicionar botões de remover em planos configurados
     */
    function addRemoveButtons() {
        // Procurar por listas de planos individuais configurados
        const planLists = document.querySelectorAll('.individual-plans-list, .plans-list, [class*="plans-list"], [class*="configured-plans"]');
        
        planLists.forEach(list => {
            // Procurar por itens de plano (cards, linhas, etc)
            const planItems = list.querySelectorAll('.plan-item, .user-plan-item, [class*="plan-item"], [class*="user-plan"]');
            
            planItems.forEach(item => {
                // Verificar se já tem botão de remover
                if (item.querySelector('.remove-plan-btn, [class*="remove"]')) {
                    return;
                }

                // Tentar extrair informações do item
                const userId = item.dataset.userId || 
                              item.querySelector('[data-user-id]')?.dataset.userId ||
                              item.getAttribute('data-user-id');
                
                const moduleType = item.dataset.moduleType ||
                                 item.querySelector('[data-module-type]')?.dataset.moduleType ||
                                 item.getAttribute('data-module-type');

                const userName = item.querySelector('.user-name, [class*="user-name"]')?.textContent ||
                               item.querySelector('h3, h4, .title')?.textContent ||
                               'Usuário';

                // Criar botão de remover
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-plan-btn';
                removeBtn.innerHTML = '<i class="fas fa-times"></i> Remover';
                removeBtn.style.cssText = `
                    background: #dc2626;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.875rem;
                    font-weight: 600;
                    margin-left: 10px;
                    transition: all 0.2s ease;
                `;

                removeBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    if (!confirm(`Tem certeza que deseja remover o plano individual de "${userName}"?\n\nEsta ação removerá o acesso a módulos extras configurados.`)) {
                        return;
                    }

                    removeBtn.disabled = true;
                    removeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Removendo...';

                    try {
                        let response;
                        
                        // Se tiver moduleType específico, remover apenas esse módulo
                        if (moduleType) {
                            response = await fetch(`/api/modules/individual-plans/${userId}/${moduleType}`, {
                                method: 'DELETE',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                credentials: 'include'
                            });
                        } else {
                            // Remover todos os módulos individuais do usuário
                            response = await fetch(`/api/modules/individual-plans/${userId}`, {
                                method: 'DELETE',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                credentials: 'include'
                            });
                        }

                        const result = await response.json();

                        if (response.ok) {
                            alert('Plano individual removido com sucesso!');
                            // Recarregar lista
                            if (typeof loadIndividualPlans === 'function') {
                                loadIndividualPlans();
                            } else if (typeof renderIndividualPlans === 'function') {
                                renderIndividualPlans();
                            } else {
                                location.reload();
                            }
                        } else {
                            alert(`Erro ao remover plano: ${result.message || 'Erro desconhecido'}`);
                            removeBtn.disabled = false;
                            removeBtn.innerHTML = '<i class="fas fa-times"></i> Remover';
                        }
                    } catch (error) {
                        console.error('Erro ao remover plano individual:', error);
                        alert('Erro ao remover plano. Por favor, tente novamente.');
                        removeBtn.disabled = false;
                        removeBtn.innerHTML = '<i class="fas fa-times"></i> Remover';
                    }
                });

                // Adicionar botão ao item
                const actionsArea = item.querySelector('.actions, [class*="actions"], .plan-actions') || item;
                actionsArea.appendChild(removeBtn);
            });
        });
    }

    // Inicializar quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expor função globalmente para uso externo
    window.fixIndividualPlansInterface = function() {
        fixUserSelectorModal();
        addRemovePlanFunctionality();
    };

})();
