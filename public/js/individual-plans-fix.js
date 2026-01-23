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
        if (!modal) {
            return;
        }

        // Verificar se já foi movido
        if (modal.dataset.moved === 'true') {
            return;
        }

        // Procurar pela área de conteúdo (onde está o botão "Adicionar Plano Individual")
        // Primeiro, procurar pela aba ativa de "Planos Individuais por Usuário"
        let contentArea = null;
        
        // Procurar por abas/tabs
        const tabs = document.querySelectorAll('.tab-content, [class*="tab-content"], [class*="tab-panel"]');
        tabs.forEach(tab => {
            const style = window.getComputedStyle(tab);
            if (style.display !== 'none' && (tab.textContent.includes('Planos Individuais') || tab.textContent.includes('Individual'))) {
                contentArea = tab;
            }
        });

        // Se não encontrou, procurar por outras áreas
        if (!contentArea) {
            contentArea = document.querySelector('.individual-plans-content, .plans-content, [class*="individual-plans"], [class*="plans-container"]);
        }

        if (!contentArea) {
            // Procurar pela área onde está o botão "Adicionar Plano Individual"
            const addButton = Array.from(document.querySelectorAll('button')).find(btn => 
                btn.textContent.includes('Adicionar Plano Individual') || 
                btn.textContent.includes('Adicionar') && btn.textContent.includes('Individual')
            );
            
            if (addButton) {
                contentArea = addButton.closest('.tab-content, [class*="tab-content"], [class*="content"], main, .main-content') || addButton.parentElement;
            }
        }

        if (!contentArea) {
            contentArea = document.querySelector('main, .main-content, .content-area, [class*="content"]');
        }

        if (!contentArea) {
            console.warn('Área de conteúdo não encontrada para mover o modal');
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
            left: auto !important;
            right: auto !important;
            top: auto !important;
            bottom: auto !important;
            transform: none !important;
        `;

        // Remover overlay se houver
        const overlay = modal.querySelector('.modal-overlay, .overlay, [class*="overlay"]');
        if (overlay) {
            overlay.style.display = 'none';
        }

        // Remover modal do parent atual se estiver em um container de sidebar
        if (modal.parentElement) {
            const parentStyle = window.getComputedStyle(modal.parentElement);
            if (parentStyle.position === 'fixed' || parentStyle.position === 'absolute' || 
                modal.parentElement.classList.contains('sidebar') || 
                modal.parentElement.classList.contains('modal-container')) {
                // Não remover ainda, vamos mover depois
            }
        }

        // Marcar como movido
        modal.dataset.moved = 'true';

        // Procurar pelo botão "Adicionar Plano Individual"
        const addButton = Array.from(contentArea.querySelectorAll('button')).find(btn => 
            btn.textContent.includes('Adicionar Plano Individual') || 
            (btn.textContent.includes('Adicionar') && btn.textContent.includes('Individual'))
        ) || contentArea.querySelector('button[class*="add"], .add-plan-btn, [class*="add-plan"]');

        // Procurar pelo texto "Nenhum plano individual configurado ainda"
        const emptyState = Array.from(contentArea.querySelectorAll('*')).find(el => 
            el.textContent.includes('Nenhum plano individual configurado') ||
            el.textContent.includes('Nenhum plano')
        );

        // Inserir na área de conteúdo
        if (addButton) {
            // Inserir após o botão
            addButton.insertAdjacentElement('afterend', modal);
        } else if (emptyState) {
            // Inserir após o estado vazio
            emptyState.insertAdjacentElement('afterend', modal);
        } else {
            // Inserir no final da área de conteúdo
            contentArea.appendChild(modal);
        }

        // Ajustar largura do conteúdo interno
        const modalContent = modal.querySelector('.modal-content, .content, [class*="content"]') || modal;
        if (modalContent !== modal) {
            modalContent.style.cssText += 'width: 100% !important; max-width: 100% !important; padding: 0 !important;';
        }
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
