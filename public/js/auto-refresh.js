/**
 * Sistema de Atualização Automática da Interface
 * Atualiza a interface automaticamente após operações CRUD (Create, Read, Update, Delete)
 * sem necessidade de recarregar a página manualmente
 */

(function() {
    'use strict';

    // Cache de funções de atualização conhecidas
    const refreshFunctions = {
        // Perfil/Itens
        'profile': ['loadItems', 'renderItems', 'updateItems', 'refreshItems', 'reloadItems'],
        'items': ['loadItems', 'renderItems', 'updateItems', 'refreshItems'],
        'profile-items': ['loadItems', 'renderItems', 'updateItems'],
        
        // Usuários Admin
        'users': ['loadUsers', 'renderUsers', 'updateUsers', 'refreshUsers'],
        'admin-users': ['loadUsers', 'renderUsers'],
        
        // Códigos Admin
        'codes': ['loadCodes', 'renderCodes', 'updateCodes', 'refreshCodes'],
        'admin-codes': ['loadCodes', 'renderCodes'],
        
        // Planos Individuais
        'individual-plans': ['loadIndividualPlans', 'renderIndividualPlans', 'refreshIndividualPlans'],
        'plans': ['loadPlans', 'renderPlans', 'refreshPlans'],
        
        // Produtos
        'products': ['loadProducts', 'renderProducts', 'updateProducts', 'refreshProducts'],
        'product-catalog': ['loadProducts', 'renderProducts'],
        
        // Lista de Convidados
        'guest-list': ['loadGuests', 'renderGuests', 'updateGuests', 'refreshGuests'],
        'guests': ['loadGuests', 'renderGuests'],
        
        // Contratos
        'contracts': ['loadContracts', 'renderContracts', 'updateContracts'],
        
        // Formulários
        'forms': ['loadForms', 'renderForms', 'updateForms'],
        
        // Geral
        'default': ['refresh', 'reload', 'update', 'load']
    };

    /**
     * Tentar atualizar a interface automaticamente
     */
    function tryAutoRefresh(url, method, responseData) {
        console.log('🔄 Tentando atualizar interface automaticamente...', { url, method });
        
        // Extrair contexto da URL
        const urlParts = url.split('/');
        let context = 'default';
        
        // Detectar contexto baseado na URL
        if (url.includes('/profile/save-all')) {
            context = 'profile-items';
            // save-all retorna items na resposta
            if (responseData && responseData.items) {
                console.log('📦 save-all detectado, atualizando itens...', responseData.items.length);
                if (typeof window.handleSaveAllResponse === 'function') {
                    window.handleSaveAllResponse(responseData.items);
                } else {
                    // Disparar evento
                    window.dispatchEvent(new CustomEvent('saveAllCompleted', { 
                        detail: { items: responseData.items } 
                    }));
                }
                return true; // Já atualizou, não precisa continuar
            }
        } else if (url.includes('/profile/items')) {
            context = 'profile-items';
        } else if (url.includes('/admin/users')) {
            context = 'admin-users';
        } else if (url.includes('/admin/codes')) {
            context = 'admin-codes';
        } else if (url.includes('/modules/individual-plans')) {
            context = 'individual-plans';
        } else if (url.includes('/products') || url.includes('/product-catalog')) {
            context = 'products';
        } else if (url.includes('/guest-list') || url.includes('/guests')) {
            context = 'guest-list';
        } else if (url.includes('/contracts')) {
            context = 'contracts';
        } else if (url.includes('/forms') || url.includes('/digital-form')) {
            context = 'forms';
        }
        
        // Tentar chamar funções de atualização específicas
        const functionsToTry = refreshFunctions[context] || refreshFunctions['default'];
        let refreshed = false;
        
        functionsToTry.forEach(funcName => {
            if (typeof window[funcName] === 'function') {
                try {
                    console.log(`✅ Chamando função de atualização: ${funcName}`);
                    window[funcName]();
                    refreshed = true;
                } catch (error) {
                    console.warn(`⚠️ Erro ao chamar ${funcName}:`, error);
                }
            }
        });
        
        // Se não encontrou funções específicas, tentar métodos genéricos
        if (!refreshed) {
            // Método 1: Disparar evento customizado
            const refreshEvent = new CustomEvent('dataUpdated', {
                detail: { url, method, data: responseData }
            });
            document.dispatchEvent(refreshEvent);
            console.log('📢 Evento dataUpdated disparado');
            
            // Método 2: Tentar atualizar elementos específicos baseado no contexto
            refreshByContext(context, responseData);
            
            // Método 3: Se tiver dados na resposta, tentar atualizar DOM diretamente
            if (responseData) {
                if (responseData.items && Array.isArray(responseData.items)) {
                    updateItemsInDOM(responseData.items);
                }
                if (responseData.plans && Array.isArray(responseData.plans)) {
                    updatePlansInDOM(responseData.plans);
                }
                if (responseData.users && Array.isArray(responseData.users)) {
                    updateUsersInDOM(responseData.users);
                }
                // Item único criado/atualizado (POST retorna objeto único)
                if (responseData.id && !responseData.items && !responseData.plans && !responseData.users) {
                    updateSingleItemInDOM(responseData);
                }
            }
        }
        
        return refreshed;
    }

    /**
     * Atualizar baseado no contexto
     */
    function refreshByContext(context, data) {
        switch (context) {
            case 'profile-items':
                // Tentar atualizar lista de itens do perfil
                const itemsContainer = document.querySelector('.profile-items-container, .items-list, [class*="items-container"]');
                if (itemsContainer && data && data.items) {
                    console.log('🔄 Atualizando container de itens...');
                    // Disparar evento para que o código existente atualize
                    window.dispatchEvent(new CustomEvent('itemsUpdated', { detail: data.items }));
                }
                break;
                
            case 'admin-users':
                // Tentar atualizar tabela de usuários
                const usersTable = document.querySelector('.users-table, .admin-table, table');
                if (usersTable) {
                    console.log('🔄 Atualizando tabela de usuários...');
                    window.dispatchEvent(new CustomEvent('usersUpdated'));
                }
                break;
                
            case 'individual-plans':
                // Tentar atualizar lista de planos individuais
                const plansList = document.querySelector('.individual-plans-list, .plans-list');
                if (plansList) {
                    console.log('🔄 Atualizando lista de planos...');
                    window.dispatchEvent(new CustomEvent('plansUpdated'));
                }
                break;
        }
    }

    /**
     * Atualizar itens no DOM diretamente (fallback)
     */
    function updateItemsInDOM(items) {
        console.log('🔄 Tentando atualizar itens no DOM...', items.length);
        // Disparar evento para que código existente escute
        window.dispatchEvent(new CustomEvent('itemsDataUpdated', { detail: items }));
        
        // Tentar atualizar se houver função save-all ou similar
        if (typeof window.handleSaveAllResponse === 'function') {
            window.handleSaveAllResponse(items);
        } else {
            // Disparar evento para que helpers possam escutar
            window.dispatchEvent(new CustomEvent('saveAllCompleted', { 
                detail: { items } 
            }));
        }
    }

    /**
     * Atualizar planos no DOM
     */
    function updatePlansInDOM(plans) {
        console.log('🔄 Tentando atualizar planos no DOM...', plans.length);
        window.dispatchEvent(new CustomEvent('plansDataUpdated', { detail: plans }));
    }

    /**
     * Atualizar usuários no DOM
     */
    function updateUsersInDOM(users) {
        console.log('🔄 Tentando atualizar usuários no DOM...', users.length);
        window.dispatchEvent(new CustomEvent('usersDataUpdated', { detail: users }));
    }

    /**
     * Atualizar item único no DOM
     */
    function updateSingleItemInDOM(item) {
        console.log('🔄 Tentando atualizar item único no DOM...', item);
        window.dispatchEvent(new CustomEvent('itemDataUpdated', { detail: item }));
    }

    /**
     * Interceptar fetch para detectar operações CRUD
     */
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        const [url, options = {}] = args;
        const method = (options.method || 'GET').toUpperCase();
        
        // Interceptar apenas POST, PUT, DELETE, PATCH
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
            try {
                const response = await originalFetch.apply(this, args);
                
                // Se a resposta foi bem-sucedida, tentar atualizar interface
                if (response.ok) {
                    // Clonar resposta para poder ler o JSON sem consumir o stream
                    const clonedResponse = response.clone();
                    
                    try {
                        const data = await clonedResponse.json();
                        
                        // Aguardar um pouco para garantir que a operação foi concluída
                        // Usar delay menor para operações simples, maior para operações complexas
                        const delay = url.includes('save-all') ? 800 : 
                                     url.includes('delete') ? 200 : 
                                     300;
                        
                        setTimeout(() => {
                            tryAutoRefresh(url, method, data);
                        }, delay);
                    } catch (e) {
                        // Se não for JSON, ainda tentar atualizar
                        setTimeout(() => {
                            tryAutoRefresh(url, method, null);
                        }, 300);
                    }
                }
                
                return response;
            } catch (error) {
                console.error('Erro na interceptação de fetch:', error);
                return originalFetch.apply(this, args);
            }
        }
        
        // Para GET, apenas passar adiante
        return originalFetch.apply(this, args);
    };

    /**
     * Função auxiliar para forçar atualização manual
     */
    window.forceRefresh = function(context = 'default') {
        console.log('🔄 Forçando atualização manual...', context);
        tryAutoRefresh('manual', 'REFRESH', null);
    };

    /**
     * Escutar eventos de atualização customizados
     */
    document.addEventListener('dataUpdated', (event) => {
        console.log('📢 Evento dataUpdated recebido:', event.detail);
        // Código existente pode escutar este evento e atualizar
    });

    document.addEventListener('itemsUpdated', (event) => {
        console.log('📢 Evento itemsUpdated recebido:', event.detail);
    });

    document.addEventListener('usersUpdated', () => {
        console.log('📢 Evento usersUpdated recebido');
    });

    document.addEventListener('plansUpdated', () => {
        console.log('📢 Evento plansUpdated recebido');
    });

    /**
     * Observar mudanças em elementos específicos que podem indicar necessidade de atualização
     */
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            // Se elementos foram adicionados/removidos, pode ser necessário atualizar
            if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
                // Não fazer nada aqui, apenas observar
                // O sistema de interceptação de fetch já cuida da atualização
            }
        });
    });

    // Observar mudanças no body
    if (document.body) {
        observer.observe(document.body, {
            childList: true,
            subtree: false // Apenas mudanças diretas no body
        });
    }

    console.log('✅ Sistema de atualização automática inicializado');

})();
