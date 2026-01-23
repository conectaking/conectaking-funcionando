/**
 * Helpers de Atualização para Integração com Código Existente
 * Funções auxiliares para atualizar a interface após operações CRUD
 */

(function() {
    'use strict';

    /**
     * Atualizar itens do perfil após save-all
     */
    window.handleSaveAllResponse = function(items) {
        console.log('🔄 Atualizando itens após save-all...', items);
        
        // Disparar evento específico
        window.dispatchEvent(new CustomEvent('saveAllCompleted', { 
            detail: { items } 
        }));
        
        // Tentar atualizar interface se houver função específica
        if (typeof window.updateProfileItems === 'function') {
            window.updateProfileItems(items);
        } else if (typeof window.renderProfileItems === 'function') {
            window.renderProfileItems(items);
        } else {
            // Fallback: recarregar página se não houver função específica
            console.log('⚠️ Nenhuma função de atualização encontrada, recarregando página...');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    };

    /**
     * Atualizar lista de usuários após operações admin
     */
    window.handleUsersResponse = function(users) {
        console.log('🔄 Atualizando lista de usuários...', users);
        
        window.dispatchEvent(new CustomEvent('usersListUpdated', { 
            detail: { users } 
        }));
        
        if (typeof window.renderUsers === 'function') {
            window.renderUsers(users);
        } else if (typeof window.loadUsers === 'function') {
            window.loadUsers();
        }
    };

    /**
     * Atualizar lista de códigos após operações admin
     */
    window.handleCodesResponse = function(codes) {
        console.log('🔄 Atualizando lista de códigos...', codes);
        
        window.dispatchEvent(new CustomEvent('codesListUpdated', { 
            detail: { codes } 
        }));
        
        if (typeof window.renderCodes === 'function') {
            window.renderCodes(codes);
        } else if (typeof window.loadCodes === 'function') {
            window.loadCodes();
        }
    };

    /**
     * Atualizar planos individuais após operações
     */
    window.handlePlansResponse = function(plans) {
        console.log('🔄 Atualizando planos individuais...', plans);
        
        window.dispatchEvent(new CustomEvent('individualPlansUpdated', { 
            detail: { plans } 
        }));
        
        if (typeof window.renderIndividualPlans === 'function') {
            window.renderIndividualPlans(plans);
        } else if (typeof window.loadIndividualPlans === 'function') {
            window.loadIndividualPlans();
        }
    };

    /**
     * Função genérica para atualizar qualquer lista
     */
    window.updateList = function(listName, data, renderFunction) {
        console.log(`🔄 Atualizando lista: ${listName}`, data);
        
        if (renderFunction && typeof renderFunction === 'function') {
            renderFunction(data);
        } else if (typeof window[`render${listName}`] === 'function') {
            window[`render${listName}`](data);
        } else if (typeof window[`load${listName}`] === 'function') {
            window[`load${listName}`]();
        } else {
            // Último recurso: recarregar página
            console.log(`⚠️ Nenhuma função encontrada para ${listName}, recarregando...`);
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        }
    };

    console.log('✅ Helpers de atualização carregados');

})();
