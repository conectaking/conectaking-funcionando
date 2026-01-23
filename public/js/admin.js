/**
 * Admin Interface - JavaScript para páginas de administração
 * Gerencia usuários, códigos e outras funcionalidades admin
 */

(function() {
    'use strict';

    /**
     * ============================================
     * GERENCIAR USUÁRIOS
     * ============================================
     */
    
    // Adicionar barras de rolagem horizontal em cima e embaixo
    function setupUsersTableScroll() {
        // Procurar por tabela de várias formas
        let usersTable = document.querySelector('table');
        
        // Se não encontrar, procurar por containers comuns
        if (!usersTable) {
            usersTable = document.querySelector('.users-table-container table, .admin-users-table, .table-container table, [class*="table"] table');
        }
        
        if (!usersTable) {
            return;
        }

        // Encontrar o container da tabela (pode ser um div wrapper)
        let tableContainer = usersTable.parentElement;
        
        // Se o parent não tem overflow, procurar por um container com scroll
        while (tableContainer && tableContainer !== document.body) {
            const style = window.getComputedStyle(tableContainer);
            if (style.overflowX === 'auto' || style.overflowX === 'scroll' || 
                tableContainer.classList.contains('table-container') ||
                tableContainer.classList.contains('users-table-container')) {
                break;
            }
            tableContainer = tableContainer.parentElement;
        }
        
        // Se não encontrou container adequado, criar um wrapper
        if (!tableContainer || tableContainer === document.body) {
            tableContainer = usersTable.parentElement;
            if (!tableContainer.classList.contains('scrollable-table-wrapper')) {
                const wrapper = document.createElement('div');
                wrapper.className = 'scrollable-table-wrapper';
                wrapper.style.cssText = 'position: relative; width: 100%; overflow-x: auto; overflow-y: visible;';
                tableContainer.insertBefore(wrapper, usersTable);
                wrapper.appendChild(usersTable);
                tableContainer = wrapper;
            }
        }

        // Adicionar classe para identificar
        if (!tableContainer.classList.contains('scrollable-table-wrapper')) {
            tableContainer.classList.add('scrollable-table-wrapper');
            tableContainer.style.cssText += 'position: relative; width: 100%; overflow-x: auto; overflow-y: visible;';
        }

        // Remover barra existente se houver (para recriar)
        const existingScrollbar = tableContainer.querySelector('.scrollbar-top');
        if (existingScrollbar) {
            existingScrollbar.remove();
        }

        // Criar barra de rolagem superior logo abaixo do thead
        const thead = usersTable.querySelector('thead');
        if (thead) {
            const scrollbarTop = document.createElement('div');
            scrollbarTop.className = 'scrollbar-top';
            scrollbarTop.style.cssText = `
                width: 100%;
                height: 17px;
                overflow-x: auto;
                overflow-y: hidden;
                margin-bottom: 0;
                margin-top: 0;
                scrollbar-width: thin;
                scrollbar-color: rgba(255,255,255,0.3) transparent;
                position: relative;
                z-index: 10;
            `;
            
            // Criar elemento interno com mesma largura da tabela
            const scrollbarContent = document.createElement('div');
            const tableWidth = usersTable.scrollWidth || usersTable.offsetWidth;
            scrollbarContent.style.cssText = `
                height: 1px;
                min-width: ${tableWidth}px;
                width: ${tableWidth}px;
            `;
            scrollbarTop.appendChild(scrollbarContent);
            
            // Sincronizar scroll bidirecional
            let isScrolling = false;
            
            scrollbarTop.addEventListener('scroll', () => {
                if (!isScrolling) {
                    isScrolling = true;
                    tableContainer.scrollLeft = scrollbarTop.scrollLeft;
                    setTimeout(() => { isScrolling = false; }, 10);
                }
            });
            
            tableContainer.addEventListener('scroll', () => {
                if (!isScrolling) {
                    isScrolling = true;
                    scrollbarTop.scrollLeft = tableContainer.scrollLeft;
                    setTimeout(() => { isScrolling = false; }, 10);
                }
            });
            
            // Inserir logo após o thead
            thead.insertAdjacentElement('afterend', scrollbarTop);
        }
    }

    // Função para excluir usuário
    async function deleteUser(userId, userName, event) {
        if (!userId) {
            console.error('ID do usuário não fornecido');
            return;
        }
        
        if (!confirm(`Tem certeza que deseja excluir o usuário "${userName}"?\n\nEsta ação não pode ser desfeita e todos os dados do usuário serão permanentemente removidos.`)) {
            return;
        }

        const deleteBtn = event?.target || event?.currentTarget || document.querySelector(`[data-delete-user-id="${userId}"], [data-user-id="${userId}"]`);
        
        if (deleteBtn) {
            deleteBtn.disabled = true;
            const originalText = deleteBtn.innerHTML;
            deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Excluindo...';
            
            try {
                const response = await fetch(`/api/admin/users/${userId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include' // Incluir cookies de autenticação
                });

                const result = await response.json();

                if (response.ok) {
                    alert('Usuário excluído com sucesso!');
                    // Recarregar lista de usuários
                    if (typeof loadUsers === 'function') {
                        loadUsers();
                    } else if (typeof renderUsers === 'function') {
                        renderUsers();
                    } else {
                        location.reload();
                    }
                } else {
                    alert(`Erro ao excluir usuário: ${result.message || 'Erro desconhecido'}`);
                    deleteBtn.disabled = false;
                    deleteBtn.innerHTML = originalText;
                }
            } catch (error) {
                console.error('Erro ao excluir usuário:', error);
                alert('Erro ao excluir usuário. Por favor, tente novamente.');
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = originalText;
            }
        } else {
            console.error('Botão de deletar não encontrado');
            alert('Erro: Botão de deletar não encontrado. Por favor, recarregue a página.');
        }
    }

    // Adicionar event listeners para botões de excluir usuário
    function setupDeleteUserButtons() {
        // Procurar botões de várias formas
        const selectors = [
            '[data-delete-user-id]',
            '.delete-user-btn',
            'button[onclick*="deleteUser"]',
            'button[onclick*="delete"]'
        ];
        
        let buttons = [];
        selectors.forEach(selector => {
            try {
                const found = document.querySelectorAll(selector);
                buttons.push(...Array.from(found));
            } catch (e) {
                // Seletor pode não ser suportado
            }
        });
        
        // Procurar por botões com texto "Deletar" ou "Excluir"
        const allButtons = document.querySelectorAll('button');
        allButtons.forEach(btn => {
            const text = btn.textContent.trim().toLowerCase();
            if (text.includes('deletar') || text.includes('excluir') || text.includes('delete')) {
                buttons.push(btn);
            }
        });
        
        // Também procurar por botões na coluna de ações (última coluna)
        const tables = document.querySelectorAll('table');
        tables.forEach(table => {
            const rows = table.querySelectorAll('tbody tr');
            rows.forEach(row => {
                const lastCell = row.querySelector('td:last-child');
                if (lastCell) {
                    const btn = lastCell.querySelector('button');
                    if (btn && !buttons.includes(btn)) {
                        buttons.push(btn);
                    }
                }
            });
        });
        
        // Remover duplicatas
        buttons = [...new Set(buttons)];
        
        buttons.forEach(btn => {
            // Verificar se já tem listener nosso
            if (btn.dataset.adminListener === 'true') {
                return;
            }
            
            // Marcar como processado
            btn.dataset.adminListener = 'true';
            
            // Tentar encontrar o ID do usuário de várias formas
            let userId = btn.dataset.deleteUserId || 
                       btn.dataset.userId ||
                       btn.dataset.id ||
                       btn.getAttribute('data-delete-user-id') ||
                       btn.getAttribute('data-user-id') ||
                       btn.getAttribute('data-id');
            
            // Se não encontrou, tentar extrair do onclick ou do texto do botão
            if (!userId) {
                const onclick = btn.getAttribute('onclick') || '';
                const match = onclick.match(/(?:deleteUser|delete)\(['"]?(\d+)['"]?/i) || 
                             onclick.match(/['"]?(\d+)['"]?/);
                if (match) {
                    userId = match[1];
                }
            }
            
            // Se ainda não encontrou, tentar pegar da linha da tabela
            if (!userId) {
                const row = btn.closest('tr');
                if (row) {
                    // Tentar pegar do primeiro td (geralmente é o ID)
                    const firstCell = row.querySelector('td:first-child');
                    if (firstCell) {
                        const cellText = firstCell.textContent.trim();
                        const idMatch = cellText.match(/^(\d+)$/);
                        if (idMatch) {
                            userId = idMatch[1];
                        }
                    }
                    
                    // Ou tentar pegar de um atributo data da linha
                    if (!userId) {
                        userId = row.dataset.userId || row.dataset.id || row.getAttribute('data-user-id') || row.getAttribute('data-id');
                    }
                }
            }
            
            if (userId) {
                const userName = btn.dataset.userName || 
                               btn.getAttribute('data-name') ||
                               btn.closest('tr')?.querySelector('td:nth-child(2)')?.textContent?.trim() ||
                               btn.closest('tr')?.querySelector('td:first-child')?.textContent?.trim() ||
                               'este usuário';
                
                // Remover onclick antigo se houver
                btn.removeAttribute('onclick');
                
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    deleteUser(userId, userName, e);
                });
            }
        });
    }

    /**
     * ============================================
     * GERENCIAR CÓDIGOS
     * ============================================
     */

    // Função para excluir código
    async function deleteCode(code) {
        if (!confirm(`Tem certeza que deseja excluir o código "${code}"?\n\nEsta ação não pode ser desfeita.`)) {
            return;
        }

        const deleteBtn = event?.target || document.querySelector(`[data-delete-code="${code}"]`);
        if (deleteBtn) {
            deleteBtn.disabled = true;
            const originalText = deleteBtn.innerHTML;
            deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Excluindo...';
            
            try {
                const response = await fetch(`/api/admin/codes/${encodeURIComponent(code)}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();

                if (response.ok) {
                    alert('Código excluído com sucesso!');
                    // Recarregar lista de códigos
                    if (typeof loadCodes === 'function') {
                        loadCodes();
                    } else {
                        location.reload();
                    }
                } else {
                    alert(`Erro ao excluir código: ${result.message || 'Erro desconhecido'}`);
                    deleteBtn.disabled = false;
                    deleteBtn.innerHTML = originalText;
                }
            } catch (error) {
                console.error('Erro ao excluir código:', error);
                alert('Erro ao excluir código. Por favor, tente novamente.');
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = originalText;
            }
        }
    }

    // Função para copiar código
    function copyCode(code) {
        navigator.clipboard.writeText(code).then(() => {
            // Feedback visual
            const copyBtn = event?.target || document.querySelector(`[data-copy-code="${code}"]`);
            if (copyBtn) {
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-check"></i> Copiado!';
                copyBtn.style.color = '#4CAF50';
                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                    copyBtn.style.color = '';
                }, 2000);
            }
        }).catch(err => {
            console.error('Erro ao copiar código:', err);
            alert('Erro ao copiar código. Por favor, tente novamente.');
        });
    }

    // Função para gerar novo código
    async function generateCode() {
        if (!confirm('Deseja gerar um novo código de registro?')) {
            return;
        }

        const generateBtn = document.querySelector('.generate-code-btn, [data-generate-code]');
        if (generateBtn) {
            generateBtn.disabled = true;
            const originalText = generateBtn.innerHTML;
            generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gerando...';
            
            try {
                const response = await fetch('/api/admin/codes/generate-manual', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();

                if (response.ok) {
                    alert(`Código gerado com sucesso: ${result.code || 'Código gerado'}`);
                    // Recarregar lista de códigos
                    if (typeof loadCodes === 'function') {
                        loadCodes();
                    } else {
                        location.reload();
                    }
                } else {
                    alert(`Erro ao gerar código: ${result.message || 'Erro desconhecido'}`);
                }
            } catch (error) {
                console.error('Erro ao gerar código:', error);
                alert('Erro ao gerar código. Por favor, tente novamente.');
            } finally {
                generateBtn.disabled = false;
                generateBtn.innerHTML = originalText;
            }
        }
    }

    // Adicionar event listeners para botões de códigos
    function setupCodeButtons() {
        // Botões de excluir
        document.querySelectorAll('[data-delete-code], .delete-code-btn, button[onclick*="deleteCode"]').forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            const code = newBtn.dataset.deleteCode || 
                        newBtn.getAttribute('data-code') ||
                        newBtn.closest('tr')?.querySelector('td:first-child')?.textContent?.trim();
            
            if (code) {
                newBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    deleteCode(code);
                });
            }
        });

        // Botões de copiar
        document.querySelectorAll('[data-copy-code], .copy-code-btn').forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            const code = newBtn.dataset.copyCode || 
                        newBtn.getAttribute('data-code') ||
                        newBtn.closest('tr')?.querySelector('td:first-child')?.textContent?.trim();
            
            if (code) {
                newBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    copyCode(code);
                });
            }
        });

        // Botão de gerar código
        document.querySelectorAll('.generate-code-btn, [data-generate-code]').forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                generateCode();
            });
        });
    }

    /**
     * ============================================
     * INICIALIZAÇÃO
     * ============================================
     */

    function init() {
        // Aguardar um pouco para garantir que o DOM está totalmente carregado
        setTimeout(() => {
            // Configurar tabela de usuários
            setupUsersTableScroll();
            setupDeleteUserButtons();

            // Configurar página de códigos
            setupCodeButtons();
        }, 100);

        // Re-executar após mudanças no DOM (para conteúdo carregado dinamicamente)
        const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            
            mutations.forEach(mutation => {
                if (mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) { // Element node
                            if (node.tagName === 'TABLE' || 
                                node.querySelector && node.querySelector('table') ||
                                node.querySelector && node.querySelector('button')) {
                                shouldUpdate = true;
                            }
                        }
                    });
                }
            });
            
            if (shouldUpdate) {
                setTimeout(() => {
                    setupUsersTableScroll();
                    setupDeleteUserButtons();
                    setupCodeButtons();
                }, 50);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Também escutar eventos de carregamento de conteúdo dinâmico
        window.addEventListener('load', () => {
            setTimeout(() => {
                setupUsersTableScroll();
                setupDeleteUserButtons();
                setupCodeButtons();
            }, 200);
        });
    }

    // Inicializar quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expor funções globalmente para uso em onclick inline (se necessário)
    window.deleteUser = deleteUser;
    window.deleteCode = deleteCode;
    window.copyCode = copyCode;
    window.generateCode = generateCode;
    
    // Função para forçar atualização (pode ser chamada externamente)
    window.refreshAdminInterface = function() {
        setupUsersTableScroll();
        setupDeleteUserButtons();
        setupCodeButtons();
    };
    
    // Escutar eventos de mudança de aba/página (se usar sistema de abas)
    document.addEventListener('click', (e) => {
        // Se clicar em uma aba ou link de navegação
        if (e.target.closest('a[href*="admin"], button[onclick*="admin"], .tab-button, .nav-link')) {
            setTimeout(() => {
                setupUsersTableScroll();
                setupDeleteUserButtons();
                setupCodeButtons();
            }, 300);
        }
    });
    
    // Escutar mudanças de hash (se usar hash routing)
    window.addEventListener('hashchange', () => {
        setTimeout(() => {
            setupUsersTableScroll();
            setupDeleteUserButtons();
            setupCodeButtons();
        }, 200);
    });

})();
