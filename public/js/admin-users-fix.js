/**
 * Ajustar interface "Gerenciar Usuários" no ADM
 * 
 * Mudanças:
 * 1. Remover botões "Gerenciar" e "Deletar" da lista
 * 2. Ao clicar no usuário, mostrar aba de gerenciamento diretamente
 * 3. Remover campos "Status Assinatura" e "Teste Pré-venda"
 */

(function() {
    'use strict';

    console.log('🔧 Inicializando ajustes na interface Gerenciar Usuários...');

    /**
     * Remover botões "Gerenciar" e "Deletar" da lista de usuários
     * E remover coluna "Ações" completa
     */
    function removeActionButtons() {
        // Remover coluna "Ações" do thead
        const thead = document.querySelector('#users-table thead');
        if (thead) {
            const actionsHeader = Array.from(thead.querySelectorAll('th')).find(th => {
                const text = (th.textContent || '').trim();
                return text === 'Ações' || text.includes('Ações');
            });
            if (actionsHeader) {
                actionsHeader.style.display = 'none';
                actionsHeader.remove();
                console.log('✅ Coluna "Ações" removida do thead');
            }
        }

        // Remover todas as células de ações das linhas
        const actionCells = document.querySelectorAll('#users-table tbody td[data-label="Ações"]');
        actionCells.forEach(cell => {
            cell.style.display = 'none';
            cell.remove();
            console.log('✅ Célula de ações removida');
        });

        // Procurar por botões de ação nas linhas
        const allButtons = document.querySelectorAll('#users-table tbody button, #users-table tbody .btn');
        allButtons.forEach(btn => {
            const text = (btn.textContent || '').trim();
            const onclick = btn.getAttribute('onclick') || '';
            const dataAction = btn.getAttribute('data-action') || '';

            if (
                (text.includes('Gerenciar') && !text.includes('Gerenciar Usuários')) ||
                text.includes('Deletar') ||
                text.includes('Excluir') ||
                onclick.includes('gerenciar') ||
                onclick.includes('deletar') ||
                onclick.includes('delete') ||
                dataAction === 'manage' ||
                dataAction === 'delete' ||
                btn.classList.contains('delete-user-btn')
            ) {
                // Verificar se está na seção de usuários
                const userRow = btn.closest('tr, [class*="user"], [class*="row"]');
                if (userRow) {
                    btn.style.display = 'none';
                    btn.remove();
                    console.log('✅ Botão de ação removido:', text);
                }
            }
        });
    }

    /**
     * Fazer linha de usuário clicável para abrir gerenciamento
     */
    function makeUserRowsClickable() {
        // Procurar por linhas de usuários
        const userRows = document.querySelectorAll(
            'tr[data-user-id], ' +
            '[class*="user-row"], ' +
            '[class*="user-item"], ' +
            'tbody tr'
        );

        userRows.forEach(row => {
            // Verificar se já tem listener
            if (row.hasAttribute('data-clickable')) {
                return;
            }

            row.setAttribute('data-clickable', 'true');
            row.style.cursor = 'pointer';

            row.addEventListener('click', function(e) {
                // Não executar se clicou em um link ou botão
                if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') {
                    return;
                }

                // Obter ID do usuário
                const userId = row.getAttribute('data-user-id') ||
                              row.querySelector('[data-user-id]')?.getAttribute('data-user-id') ||
                              row.id?.replace('user-', '');

                if (userId) {
                    console.log('👤 Abrindo gerenciamento do usuário:', userId);
                    openUserManagement(userId);
                }
            });
        });
    }

    /**
     * Abrir painel de gerenciamento do usuário
     */
    function openUserManagement(userId) {
        // Procurar por função existente ou criar modal
        if (typeof window.showUserManagement === 'function') {
            window.showUserManagement(userId);
        } else if (typeof window.loadUserDetails === 'function') {
            window.loadUserDetails(userId);
        } else {
            // Criar modal/painel dinamicamente
            showUserManagementModal(userId);
        }
    }

    /**
     * Mostrar modal de gerenciamento
     */
    function showUserManagementModal(userId) {
        // Buscar dados do usuário
        fetch(`/api/admin/users/${userId}`, {
            credentials: 'include'
        })
        .then(res => res.json())
        .then(user => {
            // Criar ou mostrar modal
            let modal = document.getElementById('user-management-modal');
            if (!modal) {
                modal = createUserManagementModal();
                document.body.appendChild(modal);
            }

            // Preencher dados
            fillUserManagementModal(modal, user);
            
            // Mostrar modal
            modal.style.display = 'block';
        })
        .catch(err => {
            console.error('❌ Erro ao buscar dados do usuário:', err);
        });
    }

    /**
     * Criar modal de gerenciamento
     */
    function createUserManagementModal() {
        const modal = document.createElement('div');
        modal.id = 'user-management-modal';
        modal.className = 'user-management-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <h2>Gerenciar Usuário</h2>
                <div id="user-management-form"></div>
            </div>
        `;

        // Fechar ao clicar no X
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.style.display = 'none';
        });

        // Fechar ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        return modal;
    }

    /**
     * Preencher modal com dados do usuário (sem Status Assinatura e Teste Pré-venda)
     */
    function fillUserManagementModal(modal, user) {
        const form = modal.querySelector('#user-management-form');
        form.innerHTML = `
            <form id="edit-user-form">
                <div class="form-group">
                    <label>Email:</label>
                    <input type="email" name="email" value="${user.email || ''}" required>
                </div>
                <div class="form-group">
                    <label>Tipo de Conta:</label>
                    <select name="accountType" required>
                        <option value="basic" ${user.account_type === 'basic' ? 'selected' : ''}>King Start</option>
                        <option value="premium" ${user.account_type === 'premium' ? 'selected' : ''}>King Prime</option>
                        <option value="king_base" ${user.account_type === 'king_base' ? 'selected' : ''}>King Essential</option>
                        <option value="king_finance" ${user.account_type === 'king_finance' ? 'selected' : ''}>King Finance</option>
                        <option value="king_finance_plus" ${user.account_type === 'king_finance_plus' ? 'selected' : ''}>King Finance Plus</option>
                        <option value="king_premium_plus" ${user.account_type === 'king_premium_plus' ? 'selected' : ''}>King Premium Plus</option>
                        <option value="king_corporate" ${user.account_type === 'king_corporate' ? 'selected' : ''}>King Corporate</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>É Admin:</label>
                    <input type="checkbox" name="isAdmin" ${user.is_admin ? 'checked' : ''}>
                </div>
                <div class="form-group">
                    <label>Data de Expiração:</label>
                    <input type="datetime-local" name="expiresAt" value="${user.subscription_expires_at ? new Date(user.subscription_expires_at).toISOString().slice(0, 16) : ''}">
                </div>
                <div class="form-group">
                    <button type="button" class="btn btn-danger" onclick="deleteUserFromModal('${user.id}', '${user.email || ''}')" style="margin-right: 10px;">
                        <i class="fas fa-trash"></i> Deletar Usuário
                    </button>
                    <button type="submit" class="btn btn-primary">Salvar</button>
                </div>
            </form>
        `;

        // Adicionar listener de submit
        form.querySelector('form').addEventListener('submit', (e) => {
            e.preventDefault();
            saveUserChanges(user.id, new FormData(e.target));
        });
    }

    /**
     * Salvar alterações do usuário
     */
    function saveUserChanges(userId, formData) {
        const data = {
            email: formData.get('email'),
            accountType: formData.get('accountType'),
            isAdmin: formData.get('isAdmin') === 'on',
            expiresAt: formData.get('expiresAt') || null
        };

        fetch(`/api/admin/users/${userId}/manage`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(data)
        })
        .then(res => res.json())
        .then(result => {
            alert('✅ Usuário atualizado com sucesso!');
            document.getElementById('user-management-modal').style.display = 'none';
            // Recarregar lista de usuários
            if (typeof window.loadUsers === 'function') {
                window.loadUsers();
            } else {
                location.reload();
            }
        })
        .catch(err => {
            console.error('❌ Erro ao salvar:', err);
            alert('❌ Erro ao salvar alterações');
        });
    }

    /**
     * Remover campos "Status Assinatura" e "Teste Pré-venda"
     */
    function removeUnwantedFields() {
        // Remover coluna "Status Assinatura" do thead
        const thead = document.querySelector('#users-table thead');
        if (thead) {
            const statusHeader = Array.from(thead.querySelectorAll('th')).find(th => {
                const text = (th.textContent || '').trim();
                return text.includes('Status Assinatura') || text.includes('status assinatura');
            });
            if (statusHeader) {
                statusHeader.style.display = 'none';
                statusHeader.remove();
                console.log('✅ Coluna "Status Assinatura" removida do thead');
            }
        }

        // Remover coluna "Ações" do thead (já que não há mais botões)
        const theadActions = document.querySelector('#users-table thead');
        if (theadActions) {
            const actionsHeader = Array.from(theadActions.querySelectorAll('th')).find(th => {
                const text = (th.textContent || '').trim();
                return text === 'Ações' || text.includes('Ações');
            });
            if (actionsHeader) {
                actionsHeader.style.display = 'none';
                actionsHeader.remove();
                console.log('✅ Coluna "Ações" removida do thead');
            }
        }

        // Remover campo "Status da Assinatura" do modal
        const modalStatusField = document.querySelector('#modal-subscription-status');
        if (modalStatusField) {
            const container = modalStatusField.closest('.input-group, div, [class*="form-group"]');
            if (container) {
                container.style.display = 'none';
                container.remove();
                console.log('✅ Campo "Status da Assinatura" removido do modal');
            }
        }

        // Procurar por campos/labels relacionados a "Teste Pré-venda"
        const fields = document.querySelectorAll('label, th, [class*="label"], [class*="header"]');
        fields.forEach(field => {
            const text = (field.textContent || '').trim();
            if (
                text.includes('Teste Pré-venda') ||
                text.includes('teste pré-venda') ||
                text.includes('Pré-venda') ||
                text.includes('pre_sale')
            ) {
                // Remover campo e seu container
                const container = field.closest('tr, div, [class*="field"], [class*="form-group"]');
                if (container) {
                    container.style.display = 'none';
                    container.remove();
                    console.log('✅ Campo removido:', text);
                }
            }
        });
    }

    /**
     * Função para deletar usuário do modal
     */
    window.deleteUserFromModal = function(userId, userEmail) {
        if (!confirm(`Tem certeza que deseja deletar o usuário ${userEmail || userId}? Esta ação é irreversível.`)) {
            return;
        }

        fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(res => res.json())
        .then(result => {
            alert('✅ Usuário deletado com sucesso!');
            document.getElementById('user-management-modal').style.display = 'none';
            // Recarregar lista de usuários
            if (typeof window.loadUsers === 'function') {
                window.loadUsers();
            } else if (typeof window.loadDashboard === 'function') {
                window.loadDashboard();
            } else {
                location.reload();
            }
        })
        .catch(err => {
            console.error('❌ Erro ao deletar:', err);
            alert('❌ Erro ao deletar usuário');
        });
    };

    /**
     * Inicializar
     */
    function init() {
        // Aguardar DOM estar pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    removeActionButtons();
                    makeUserRowsClickable();
                    removeUnwantedFields();
                }, 500);
            });
        } else {
            setTimeout(() => {
                removeActionButtons();
                makeUserRowsClickable();
                removeUnwantedFields();
            }, 500);
        }

        // Observar mudanças no DOM
        const observer = new MutationObserver(() => {
            setTimeout(() => {
                removeActionButtons();
                makeUserRowsClickable();
                removeUnwantedFields();
            }, 300);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    init();

    console.log('✅ Script de ajustes Gerenciar Usuários carregado');

})();
