/**
 * Correções para Interface de Planos Individuais
 * - Move modal de seleção de usuário para aparecer no espaço abaixo do botão
 * - Adiciona funcionalidade para remover planos individuais
 */

(function() {
    'use strict';

    // Aguardar DOM estar pronto
    function init() {
        // Executar imediatamente
        fixUserSelectorModal();
        addRemovePlanFunctionality();
        
        // Executar novamente após um delay para garantir
        setTimeout(() => {
            fixUserSelectorModal();
            addRemovePlanFunctionality();
        }, 500);
        
        // Executar periodicamente para pegar modais criados dinamicamente (mas não muito frequente)
        let checkInterval = setInterval(() => {
            fixUserSelectorModal();
            addRemovePlanFunctionality();
        }, 1500);
        
        // Limpar intervalo após 30 segundos (para não ficar rodando indefinidamente)
        setTimeout(() => {
            clearInterval(checkInterval);
        }, 30000);
    }

    /**
     * Corrigir posicionamento do modal de seleção de usuário
     */
    function fixUserSelectorModal() {
        // Procurar pelo modal de seleção de usuário de várias formas
        let userSelectorModal = document.querySelector('.user-selector-modal, .select-user-modal, [class*="user-select"], [class*="select-user"]');
        
        // Se não encontrou, procurar por texto "Selecionar Usuário"
        if (!userSelectorModal) {
            const allElements = document.querySelectorAll('*');
            for (let el of allElements) {
                const text = el.textContent || '';
                if (text.includes('Selecionar Usuário') || text.includes('Selecionar usuário')) {
                    // Verificar se é um modal/sidebar
                    const style = window.getComputedStyle(el);
                    if (style.position === 'fixed' || style.position === 'absolute' || 
                        el.classList.contains('modal') || el.classList.contains('sidebar') ||
                        el.closest('.modal') || el.closest('.sidebar')) {
                        userSelectorModal = el.closest('.modal, .sidebar, [class*="modal"], [class*="sidebar"]') || el;
                        break;
                    }
                }
            }
        }
        
        // Se ainda não encontrou, procurar por elementos com posição fixed/absolute no lado direito
        if (!userSelectorModal) {
            const fixedElements = document.querySelectorAll('*');
            fixedElements.forEach(el => {
                const style = window.getComputedStyle(el);
                const rect = el.getBoundingClientRect();
                
                // Verificar se está posicionado no lado direito (sidebar)
                const isRightSidebar = (style.position === 'fixed' || style.position === 'absolute') &&
                                      rect.left > window.innerWidth * 0.4 &&
                                      rect.width < window.innerWidth * 0.7 &&
                                      rect.height > 200; // Deve ter altura significativa
                
                if (isRightSidebar) {
                    const text = el.textContent || '';
                    // Verificar se contém texto relacionado a seleção de usuário
                    if (text.includes('Selecionar') || 
                        text.includes('Usuário') || 
                        text.includes('Buscar usuário') ||
                        text.includes('nome ou email') ||
                        (text.includes('ADRIANO') && text.includes('@'))) {
                        userSelectorModal = el;
                        console.log('✅ Modal encontrado por posicionamento:', el);
                    }
                }
            });
        }
        
        // Última tentativa: procurar por qualquer elemento que tenha scrollbar e esteja no lado direito
        if (!userSelectorModal) {
            const scrollableElements = document.querySelectorAll('*');
            scrollableElements.forEach(el => {
                const style = window.getComputedStyle(el);
                if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                    const rect = el.getBoundingClientRect();
                    if (rect.left > window.innerWidth * 0.5 && rect.width < 500) {
                        const text = el.textContent || '';
                        if (text.includes('Selecionar') || text.includes('Usuário') || text.includes('Cancelar')) {
                            userSelectorModal = el.closest('[style*="position"]') || el.parentElement;
                            console.log('✅ Modal encontrado por scrollbar:', userSelectorModal);
                        }
                    }
                }
            });
        }
        
        if (userSelectorModal) {
            moveModalToContentArea(userSelectorModal);
        }

        // Observar mudanças no DOM para quando o modal for criado dinamicamente
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        // Verificar se o próprio node é um modal
                        let modal = null;
                        
                        // Verificar por classes
                        if (node.classList) {
                            const classes = Array.from(node.classList);
                            if (classes.some(c => c.includes('user-select') || c.includes('select-user') || c === 'modal' || c === 'sidebar')) {
                                modal = node;
                            }
                        }
                        
                        // Verificar por texto
                        if (!modal) {
                            const text = node.textContent || '';
                            if (text.includes('Selecionar Usuário') || text.includes('Buscar usuário')) {
                                const style = window.getComputedStyle(node);
                                if (style.position === 'fixed' || style.position === 'absolute') {
                                    modal = node;
                                }
                            }
                        }
                        
                        // Verificar filhos
                        if (!modal && node.querySelector) {
                            modal = node.querySelector('.user-selector-modal, .select-user-modal, [class*="user-select"], [class*="select-user"]');
                        }
                        
                        if (modal) {
                            setTimeout(() => {
                                moveModalToContentArea(modal);
                            }, 100);
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

        // Verificar posição atual do modal
        const currentRect = modal.getBoundingClientRect();
        const isCurrentlyOnRight = currentRect.left > window.innerWidth * 0.4;
        
        // Se já foi movido mas ainda está no lado direito, forçar mover novamente
        if (modal.dataset.moved === 'true' && isCurrentlyOnRight) {
            console.log('⚠️ Modal foi marcado como movido mas ainda está no lado direito, forçando reposicionamento...');
            modal.dataset.moved = 'false'; // Resetar para permitir mover novamente
        }
        
        // Se já foi movido e está na posição correta, não fazer nada
        if (modal.dataset.moved === 'true' && !isCurrentlyOnRight) {
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
        // Remover todas as classes de sidebar/modal fixo
        modal.classList.remove('sidebar', 'modal-sidebar', 'fixed-sidebar');
        
        modal.style.cssText = `
            position: relative !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 20px 0 !important;
            padding: 24px !important;
            background: rgba(20, 20, 23, 0.98) !important;
            border-radius: 12px !important;
            border: 1px solid rgba(255, 255, 255, 0.1) !important;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4) !important;
            z-index: 100 !important;
            left: auto !important;
            right: auto !important;
            top: auto !important;
            bottom: auto !important;
            transform: none !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
        `;

        // Remover overlay se houver
        const overlay = modal.querySelector('.modal-overlay, .overlay, [class*="overlay"]');
        if (overlay) {
            overlay.style.display = 'none';
        }

        // Remover modal do parent atual se estiver em um container de sidebar
        const currentParent = modal.parentElement;
        if (currentParent) {
            const parentStyle = window.getComputedStyle(currentParent);
            const parentRect = currentParent.getBoundingClientRect();
            
            // Se o parent é uma sidebar (fixed/absolute no lado direito)
            const isSidebarParent = (parentStyle.position === 'fixed' || parentStyle.position === 'absolute') &&
                                   parentRect.left > window.innerWidth * 0.4;
            
            if (isSidebarParent || 
                currentParent.classList.contains('sidebar') || 
                currentParent.classList.contains('modal-container') ||
                currentParent.id === 'modal-root') {
                // Vamos mover o modal, então não precisa fazer nada aqui
                console.log('📦 Modal está em container de sidebar, será movido');
            }
        }

        // Marcar como movido
        modal.dataset.moved = 'true';

        // Procurar pelo botão "Adicionar Plano Individual"
        const addButton = Array.from(contentArea.querySelectorAll('button')).find(btn => 
            btn.textContent.includes('Adicionar Plano Individual') || 
            (btn.textContent.includes('Adicionar') && btn.textContent.includes('Individual')) ||
            (btn.textContent.includes('+') && btn.textContent.includes('Plano'))
        ) || contentArea.querySelector('button[class*="add"], .add-plan-btn, [class*="add-plan"]');

        // Procurar pelo texto "Nenhum plano individual configurado ainda" ou cards existentes
        const emptyState = Array.from(contentArea.querySelectorAll('*')).find(el => 
            el.textContent.includes('Nenhum plano individual configurado') ||
            el.textContent.includes('Nenhum plano') ||
            el.textContent.includes('configurado ainda')
        );

        // Procurar por cards de planos existentes
        const existingPlanCard = contentArea.querySelector('.card, [class*="card"], [class*="plan-card"], [class*="user-plan"]');

        // Inserir na área de conteúdo
        if (addButton) {
            // Inserir logo após o botão
            addButton.insertAdjacentElement('afterend', modal);
        } else if (emptyState) {
            // Inserir após o estado vazio
            emptyState.insertAdjacentElement('afterend', modal);
        } else if (existingPlanCard) {
            // Inserir antes do primeiro card existente
            existingPlanCard.insertAdjacentElement('beforebegin', modal);
        } else {
            // Inserir no final da área de conteúdo
            contentArea.appendChild(modal);
        }
        
        // Garantir que o modal seja visível
        modal.style.display = 'block';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        
        // Remover qualquer classe que possa estar escondendo o modal
        modal.classList.remove('hidden', 'invisible', 'd-none');
        
        // Forçar scroll para o modal se necessário
        setTimeout(() => {
            modal.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
        
        console.log('✅ Modal movido para área de conteúdo');

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
        // Procurar por cards/items de planos individuais configurados
        // Primeiro, procurar por containers de planos
        const planContainers = document.querySelectorAll('.individual-plans-list, .plans-list, [class*="plans-list"], [class*="configured-plans"], [class*="individual-plans"]');
        
        let allCards = [];
        
        // Se encontrou containers, procurar cards dentro deles
        if (planContainers.length > 0) {
            planContainers.forEach(container => {
                const cards = container.querySelectorAll('.card, [class*="card"], [class*="plan-card"], [class*="user-plan"], [class*="individual-plan"], div[class*="plan"]');
                allCards.push(...Array.from(cards));
            });
        }
        
        // Se não encontrou, procurar em toda a página
        if (allCards.length === 0) {
            allCards = document.querySelectorAll('.card, [class*="card"], [class*="plan-card"], [class*="user-plan"], [class*="individual-plan"]');
        }
        
        // Também procurar por divs que contenham informações de usuário
        const allDivs = document.querySelectorAll('div');
        allDivs.forEach(div => {
            const text = div.textContent || '';
            // Se tem email e informações de módulos, provavelmente é um card de plano
            if (text.includes('@') && 
                (text.includes('Módulos extras') || text.includes('módulos extras') || text.includes('Contrato'))) {
                const rect = div.getBoundingClientRect();
                // Se tem tamanho razoável (não é muito pequeno)
                if (rect.width > 200 && rect.height > 100) {
                    if (!allCards.includes(div)) {
                        allCards.push(div);
                    }
                }
            }
        });
        
        allCards.forEach(card => {
            // Verificar se já tem botão de remover
            if (card.querySelector('.remove-plan-btn, [class*="remove-plan"], button[class*="remove"]')) {
                return;
            }

            // Verificar se o card mostra informações de plano individual
            const cardText = card.textContent || '';
            const hasUserInfo = cardText.includes('@') || 
                              cardText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/) ||
                              cardText.includes('Módulos extras') ||
                              cardText.includes('módulos extras') ||
                              cardText.includes('Contrato Digital') ||
                              cardText.includes('Carrossel');
            
            if (!hasUserInfo) {
                return;
            }

            // Tentar extrair informações do item
            let userId = card.dataset.userId || 
                        card.querySelector('[data-user-id]')?.dataset.userId ||
                        card.getAttribute('data-user-id');
            
            // Se não encontrou, tentar extrair do texto (email)
            if (!userId) {
                const emailMatch = cardText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
                if (emailMatch) {
                    // Tentar buscar userId pelo email (será feito no backend)
                    userId = emailMatch[1];
                }
            }

            // Tentar extrair nome do usuário
            const userName = card.querySelector('h3, h4, h5, .user-name, [class*="user-name"], .title, [class*="title"]')?.textContent?.trim() ||
                           cardText.split('\n')[0]?.trim() ||
                           'Usuário';

            // Se não tem userId, pular (não podemos remover sem saber qual usuário)
            if (!userId) {
                console.warn('Não foi possível identificar userId do card:', card);
                return;
            }

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
                margin-top: 10px;
                width: 100%;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
            `;

            removeBtn.addEventListener('mouseenter', function() {
                this.style.background = '#b91c1c';
            });

            removeBtn.addEventListener('mouseleave', function() {
                this.style.background = '#dc2626';
            });

            removeBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (!confirm(`Tem certeza que deseja remover o plano individual de "${userName}"?\n\nEsta ação removerá o acesso a módulos extras configurados.`)) {
                    return;
                }

                removeBtn.disabled = true;
                removeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Removendo...';

                try {
                    // Remover todos os módulos individuais do usuário
                    // Se userId for um email, precisaremos buscar o ID primeiro
                    let targetUserId = userId;
                    
                    // Se userId parece ser um email, buscar o ID do usuário
                    if (userId.includes('@')) {
                        try {
                            const userResponse = await fetch(`/api/modules/users-list`, {
                                credentials: 'include'
                            });
                            if (userResponse.ok) {
                                const userData = await userResponse.json();
                                const user = userData.users?.find(u => u.email === userId);
                                if (user) {
                                    targetUserId = user.id;
                                } else {
                                    throw new Error('Usuário não encontrado');
                                }
                            }
                        } catch (err) {
                            console.error('Erro ao buscar ID do usuário:', err);
                            alert('Erro ao identificar usuário. Por favor, recarregue a página e tente novamente.');
                            removeBtn.disabled = false;
                            removeBtn.innerHTML = '<i class="fas fa-times"></i> Remover';
                            return;
                        }
                    }
                    
                    const response = await fetch(`/api/modules/individual-plans/${targetUserId}`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        credentials: 'include'
                    });

                    const result = await response.json();

                    if (response.ok) {
                        alert('Plano individual removido com sucesso!');
                        // Recarregar lista
                        if (typeof loadIndividualPlans === 'function') {
                            loadIndividualPlans();
                        } else if (typeof renderIndividualPlans === 'function') {
                            renderIndividualPlans();
                        } else {
                            // Remover o card do DOM
                            card.style.opacity = '0';
                            card.style.transition = 'opacity 0.3s';
                            setTimeout(() => {
                                card.remove();
                            }, 300);
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

            // Adicionar botão ao card
            // Procurar por área de ações ou adicionar no final do card
            let actionsArea = card.querySelector('.actions, [class*="actions"], .card-actions, [class*="card-actions"], .card-footer, [class*="footer"]');
            
            if (!actionsArea) {
                // Criar área de ações se não existir
                actionsArea = document.createElement('div');
                actionsArea.className = 'card-actions';
                actionsArea.style.cssText = 'margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1);';
                card.appendChild(actionsArea);
            }
            
            actionsArea.appendChild(removeBtn);
            
            console.log('✅ Botão de remover adicionado ao card:', userName);
        });
    }

    // Inicializar quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Também escutar quando a página for totalmente carregada
    window.addEventListener('load', () => {
        setTimeout(init, 300);
    });
    
    // Escutar cliques em botões que podem abrir o modal
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (btn && (btn.textContent.includes('Adicionar Plano') || 
                   btn.textContent.includes('Adicionar') ||
                   btn.textContent.includes('+') && btn.textContent.includes('Plano'))) {
            // Aguardar um pouco mais para o modal ser criado
            setTimeout(() => {
                fixUserSelectorModal();
            }, 800);
            
            // Tentar novamente após mais tempo
            setTimeout(() => {
                fixUserSelectorModal();
            }, 1500);
        }
    }, true);
    
    // Também escutar mudanças de visibilidade/display
    const visibilityObserver = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            if (mutation.type === 'attributes' && 
                (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
                const target = mutation.target;
                const style = window.getComputedStyle(target);
                const text = target.textContent || '';
                
                // Se um elemento apareceu e tem texto relacionado a seleção de usuário
                if (style.display !== 'none' && 
                    style.visibility !== 'hidden' &&
                    (text.includes('Selecionar Usuário') || text.includes('Buscar usuário'))) {
                    setTimeout(() => {
                        fixUserSelectorModal();
                    }, 200);
                }
            }
        });
    });
    
    // Observar mudanças de atributos em todos os elementos
    visibilityObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ['style', 'class'],
        subtree: true
    });

    // Expor função globalmente para uso externo
    window.fixIndividualPlansInterface = function() {
        fixUserSelectorModal();
        addRemovePlanFunctionality();
    };

})();
