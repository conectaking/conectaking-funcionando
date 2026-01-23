/**
 * Dashboard Error Handler
 * Garante que elementos do dashboard apareçam mesmo quando há erros de conexão
 * Especificamente: Modo Empresa, botões de alterar logo, etc.
 */

(function() {
    'use strict';

    console.log('🔧 Inicializando handler de erros do dashboard...');

    /**
     * Garantir que elementos do Modo Empresa apareçam
     */
    function ensureEmpresaElementsVisible() {
        console.log('🔍 Verificando elementos do Modo Empresa...');

        // Procurar por elementos relacionados a "Empresa" que podem estar escondidos
        const empresaElements = document.querySelectorAll(
            '[class*="empresa"], [class*="Empresa"], [id*="empresa"], [id*="Empresa"], ' +
            '[data-empresa], [data-account-type], .business-mode, .company-settings'
        );

        // Procurar por botões de "alterar logo"
        const logoButtons = document.querySelectorAll(
            '[class*="logo"], [id*="logo"], [data-logo], ' +
            'button:contains("logo"), button:contains("Logo"), ' +
            'a:contains("logo"), a:contains("Logo")'
        );

        // Procurar por abas/tabs relacionadas a empresa
        const empresaTabs = document.querySelectorAll(
            '.tab[data-tab*="empresa"], .tab[data-tab*="Empresa"], ' +
            '[role="tab"][aria-label*="empresa"], [role="tab"][aria-label*="Empresa"]'
        );

        // Verificar se há elementos escondidos por erro
        let foundHidden = false;

        // Verificar elementos de empresa
        empresaElements.forEach(el => {
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                // Verificar se foi escondido por erro (não por design)
                const hasErrorClass = el.classList.contains('error-hidden') || 
                                    el.classList.contains('connection-error') ||
                                    el.hasAttribute('data-hidden-by-error');
                
                if (!hasErrorClass) {
                    // Verificar se o elemento deveria estar visível baseado no accountType
                    const accountType = window.accountData?.accountType || 
                                      localStorage.getItem('accountType') ||
                                      sessionStorage.getItem('accountType');
                    
                    // Se é business_owner ou individual_com_logo, deve aparecer
                    if (accountType === 'business_owner' || 
                        accountType === 'individual_com_logo' ||
                        accountType === 'king_corporate' ||
                        accountType === 'premium') {
                        console.log('✅ Mostrando elemento de empresa que estava escondido:', el);
                        el.style.display = '';
                        el.style.visibility = 'visible';
                        el.style.opacity = '1';
                        foundHidden = true;
                    }
                }
            }
        });

        // Verificar botões de logo
        logoButtons.forEach(btn => {
            const style = window.getComputedStyle(btn);
            if (style.display === 'none' || style.visibility === 'hidden') {
                const accountType = window.accountData?.accountType || 
                                  localStorage.getItem('accountType');
                
                if (accountType === 'business_owner' || 
                    accountType === 'individual_com_logo' ||
                    accountType === 'king_corporate' ||
                    accountType === 'premium') {
                    console.log('✅ Mostrando botão de logo que estava escondido:', btn);
                    btn.style.display = '';
                    btn.style.visibility = 'visible';
                    foundHidden = true;
                }
            }
        });

        // Verificar abas de empresa
        empresaTabs.forEach(tab => {
            const style = window.getComputedStyle(tab);
            if (style.display === 'none' || style.visibility === 'hidden') {
                const accountType = window.accountData?.accountType || 
                                  localStorage.getItem('accountType');
                
                if (accountType === 'business_owner' || 
                    accountType === 'individual_com_logo' ||
                    accountType === 'king_corporate' ||
                    accountType === 'premium') {
                    console.log('✅ Mostrando aba de empresa que estava escondida:', tab);
                    tab.style.display = '';
                    tab.style.visibility = 'visible';
                    foundHidden = true;
                }
            }
        });

        if (foundHidden) {
            console.log('✅ Elementos do Modo Empresa restaurados');
        }
    }

    /**
     * Tentar carregar dados do accountType do localStorage/sessionStorage
     */
    function loadAccountTypeFromCache() {
        // Tentar de várias fontes
        const accountType = 
            window.accountData?.accountType ||
            localStorage.getItem('accountType') ||
            sessionStorage.getItem('accountType') ||
            document.body.getAttribute('data-account-type');

        if (accountType) {
            console.log('📦 AccountType encontrado no cache:', accountType);
            if (!window.accountData) {
                window.accountData = {};
            }
            window.accountData.accountType = accountType;
            return accountType;
        }

        return null;
    }

    /**
     * Interceptar fetch para armazenar accountType quando bem-sucedido
     */
    function setupFetchInterceptor() {
        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
            try {
                const response = await originalFetch.apply(this, args);
                
                // Se a requisição foi bem-sucedida e é para /api/account/status
                if (response.ok && args[0] && args[0].includes('/api/account/status')) {
                    try {
                        const data = await response.clone().json();
                        if (data.accountType) {
                            // Armazenar accountType em múltiplos lugares
                            localStorage.setItem('accountType', data.accountType);
                            sessionStorage.setItem('accountType', data.accountType);
                            if (!window.accountData) {
                                window.accountData = {};
                            }
                            window.accountData.accountType = data.accountType;
                            document.body.setAttribute('data-account-type', data.accountType);
                            console.log('✅ AccountType armazenado no cache:', data.accountType);
                            
                            // Garantir que elementos apareçam
                            setTimeout(() => {
                                ensureEmpresaElementsVisible();
                            }, 300);
                        }
                    } catch (e) {
                        // Ignorar erro de parse
                    }
                }
                
                return response;
            } catch (error) {
                // Se deu erro, tentar usar cache
                if (error.message && (
                    error.message.includes('Failed to fetch') ||
                    error.message.includes('network') ||
                    error.message.includes('fetch')
                )) {
                    console.warn('⚠️ Erro de conexão detectado, tentando usar dados em cache...');
                    const accountType = loadAccountTypeFromCache();
                    if (accountType) {
                        setTimeout(() => {
                            ensureEmpresaElementsVisible();
                        }, 500);
                    }
                }
                throw error;
            }
        };
    }

    /**
     * Interceptar erros de fetch e tentar usar dados em cache
     */
    function setupErrorHandling() {
        // Interceptar console.error para detectar erros de conexão
        const originalError = console.error;
        console.error = function(...args) {
            const message = args.join(' ');
            
            // Detectar erros de conexão
            if (message.includes('Failed to fetch') ||
                message.includes('Erro de conexão') ||
                message.includes('Erro na requisição') ||
                message.includes('network') ||
                message.includes('fetch')) {
                
                console.warn('⚠️ Erro de conexão detectado, tentando usar dados em cache...');
                
                // Tentar carregar accountType do cache
                const accountType = loadAccountTypeFromCache();
                
                if (accountType) {
                    // Aguardar um pouco e então garantir que elementos apareçam
                    setTimeout(() => {
                        ensureEmpresaElementsVisible();
                    }, 500);
                }
            }
            
            // Chamar console.error original
            originalError.apply(console, args);
        };
    }

    /**
     * Observar mudanças no DOM para detectar elementos escondidos
     */
    function setupDOMObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                // Verificar se algum elemento foi escondido
                if (mutation.type === 'attributes' && 
                    (mutation.attributeName === 'style' || 
                     mutation.attributeName === 'class')) {
                    
                    const target = mutation.target;
                    const style = window.getComputedStyle(target);
                    
                    // Se elemento foi escondido e é relacionado a empresa
                    if ((style.display === 'none' || style.visibility === 'hidden') &&
                        (target.className.includes('empresa') ||
                         target.id.includes('empresa') ||
                         target.getAttribute('data-empresa'))) {
                        
                        // Verificar se deveria estar visível
                        const accountType = window.accountData?.accountType || 
                                          localStorage.getItem('accountType');
                        
                        if (accountType === 'business_owner' || 
                            accountType === 'individual_com_logo' ||
                            accountType === 'king_corporate' ||
                            accountType === 'premium') {
                            console.log('⚠️ Elemento de empresa foi escondido, restaurando...');
                            setTimeout(() => {
                                ensureEmpresaElementsVisible();
                            }, 100);
                        }
                    }
                }
            });
        });

        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['style', 'class'],
            subtree: true
        });
    }

    /**
     * Inicializar
     */
    function init() {
        // Carregar accountType do cache
        loadAccountTypeFromCache();

        // Interceptar fetch para armazenar accountType
        setupFetchInterceptor();

        // Configurar tratamento de erros
        setupErrorHandling();

        // Garantir que elementos apareçam
        setTimeout(() => {
            ensureEmpresaElementsVisible();
        }, 1000);

        // Observar mudanças no DOM
        setupDOMObserver();

        // Executar periodicamente
        setInterval(() => {
            ensureEmpresaElementsVisible();
        }, 5000);
    }

    // Inicializar quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expor função globalmente
    window.ensureEmpresaElementsVisible = ensureEmpresaElementsVisible;
    window.loadAccountTypeFromCache = loadAccountTypeFromCache;

    console.log('✅ Handler de erros do dashboard carregado');

})();
