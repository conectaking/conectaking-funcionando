/**
 * Script de Integração Automática
 * Adiciona automaticamente os scripts e CSS necessários nas páginas
 * Funciona mesmo se o conteúdo for carregado dinamicamente
 */

(function() {
    'use strict';

    console.log('🔧 Iniciando integração automática de scripts...');

    /**
     * Adicionar CSS se não existir
     */
    function addCSS(href) {
        const existing = document.querySelector(`link[href="${href}"]`);
        if (existing) {
            console.log(`✅ CSS já existe: ${href}`);
            return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
        console.log(`✅ CSS adicionado: ${href}`);
    }

    /**
     * Adicionar JavaScript se não existir
     */
    function addJS(src, onLoad) {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
            console.log(`✅ JS já existe: ${src}`);
            if (onLoad) onLoad();
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.onload = () => {
            console.log(`✅ JS carregado: ${src}`);
            if (onLoad) onLoad();
        };
        script.onerror = () => {
            console.error(`❌ Erro ao carregar: ${src}`);
        };
        document.body.appendChild(script);
    }

    /**
     * Detectar se estamos no dashboard (assinatura)
     */
    function isDashboardSubscription() {
        return !!(
            document.getElementById('assinatura-pane') ||
            document.getElementById('subscription-plans-list') ||
            window.location.pathname.includes('dashboard') ||
            document.querySelector('[data-target="assinatura-pane"]')
        );
    }

    /**
     * Detectar se estamos no admin
     */
    function isAdminDashboard() {
        return !!(
            document.getElementById('users-table') ||
            document.querySelector('.admin-layout') ||
            window.location.pathname.includes('admin') ||
            document.querySelector('[data-target="users-pane"]')
        );
    }

    /**
     * Integrar scripts do dashboard (assinatura)
     */
    function integrateDashboardScripts() {
        console.log('📋 Integrando scripts do dashboard (assinatura)...');

        // CSS
        addCSS('/css/subscription-plans-restore.css');

        // JavaScript (na ordem correta)
        addJS('/js/planRenderer.js', () => {
            addJS('/js/load-subscription-info.js', () => {
                addJS('/js/subscription-plans-restore.js', () => {
                    console.log('✅ Todos os scripts do dashboard carregados');
                    
                    // Chamar loadSubscriptionInfo se a seção estiver visível
                    setTimeout(() => {
                        const assinaturaPane = document.getElementById('assinatura-pane');
                        if (assinaturaPane && (assinaturaPane.style.display !== 'none' || assinaturaPane.classList.contains('active'))) {
                            if (typeof window.loadSubscriptionInfo === 'function') {
                                console.log('🔄 Chamando loadSubscriptionInfo()...');
                                window.loadSubscriptionInfo();
                            }
                        }
                    }, 1000);
                });
            });
        });
    }

    /**
     * Integrar scripts do admin
     */
    function integrateAdminScripts() {
        console.log('📋 Integrando scripts do admin...');

        // CSS
        addCSS('/css/admin-users-fix.css');
        addCSS('/css/subscription-plans-restore.css');

        // JavaScript
        addJS('/js/admin-menu-empresa-restore.js', () => {
            addJS('/js/admin-users-fix.js', () => {
                console.log('✅ Todos os scripts do admin carregados');
            });
        });
    }

    /**
     * Inicializar integração
     */
    function init() {
        // Verificar imediatamente
        if (isDashboardSubscription()) {
            integrateDashboardScripts();
        }

        if (isAdminDashboard()) {
            integrateAdminScripts();
        }

        // Observar mudanças no DOM para detectar quando as seções são carregadas
        const observer = new MutationObserver(() => {
            if (isDashboardSubscription()) {
                integrateDashboardScripts();
            }
            if (isAdminDashboard()) {
                integrateAdminScripts();
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Observar mudanças de URL (para SPAs)
        let lastUrl = location.href;
        new MutationObserver(() => {
            const url = location.href;
            if (url !== lastUrl) {
                lastUrl = url;
                setTimeout(() => {
                    if (isDashboardSubscription()) {
                        integrateDashboardScripts();
                    }
                    if (isAdminDashboard()) {
                        integrateAdminScripts();
                    }
                }, 500);
            }
        }).observe(document, { subtree: true, childList: true });

        // Observar eventos de navegação (para SPAs)
        window.addEventListener('popstate', () => {
            setTimeout(() => {
                if (isDashboardSubscription()) {
                    integrateDashboardScripts();
                }
                if (isAdminDashboard()) {
                    integrateAdminScripts();
                }
            }, 500);
        });

        // Escutar eventos customizados de mudança de página
        window.addEventListener('hashchange', () => {
            setTimeout(() => {
                if (isDashboardSubscription()) {
                    integrateDashboardScripts();
                }
                if (isAdminDashboard()) {
                    integrateAdminScripts();
                }
            }, 500);
        });
    }

    // Aguardar DOM estar pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('✅ Script de integração automática carregado');

})();
