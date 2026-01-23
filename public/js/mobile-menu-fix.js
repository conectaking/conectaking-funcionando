/**
 * Correção do Menu Mobile - Dashboard
 * Corrige problema onde o menu mobile não fecha no modo mobile
 * - Remove overlay preto que fica atrás do menu
 * - Garante que o menu fecha ao clicar no X, fora, ou no hamburger
 */

(function() {
    'use strict';

    console.log('🔧 Inicializando correção do menu mobile...');

    /**
     * Fechar menu mobile
     */
    function closeMobileMenu() {
        console.log('🔄 Fechando menu mobile...');
        
        // Procurar pelo sidebar/menu mobile
        const sidebar = document.querySelector('.sidebar, .mobile-sidebar, .nav-sidebar, [class*="sidebar"], [class*="mobile-menu"]');
        const overlay = document.querySelector('.overlay, .sidebar-overlay, .menu-overlay, .backdrop, [class*="overlay"], [class*="backdrop"]');
        const body = document.body;
        
        // Remover classes de abertura
        if (sidebar) {
            sidebar.classList.remove('open', 'active', 'show', 'visible');
            sidebar.style.transform = 'translateX(-100%)';
            sidebar.style.left = '-100%';
            console.log('✅ Sidebar fechado');
        }
        
        // Remover overlay
        if (overlay) {
            overlay.classList.remove('active', 'show', 'visible');
            overlay.style.display = 'none';
            overlay.style.opacity = '0';
            overlay.style.visibility = 'hidden';
            console.log('✅ Overlay removido');
        }
        
        // Remover classe do body que pode estar bloqueando
        body.classList.remove('menu-open', 'sidebar-open', 'mobile-menu-open', 'no-scroll');
        body.style.overflow = '';
        body.style.position = '';
        
        // Remover overlay preto problemático
        removeBlackOverlay();
        
        console.log('✅ Menu mobile fechado completamente');
    }

    /**
     * Abrir menu mobile
     */
    function openMobileMenu() {
        console.log('🔄 Abrindo menu mobile...');
        
        const sidebar = document.querySelector('.sidebar, .mobile-sidebar, .nav-sidebar, [class*="sidebar"], [class*="mobile-menu"]');
        const overlay = document.querySelector('.overlay, .sidebar-overlay, .menu-overlay, .backdrop, [class*="overlay"], [class*="backdrop"]');
        
        if (sidebar) {
            sidebar.classList.add('open', 'active', 'show');
            sidebar.style.transform = 'translateX(0)';
            sidebar.style.left = '0';
        }
        
        // Criar overlay se não existir
        if (!overlay) {
            const newOverlay = document.createElement('div');
            newOverlay.className = 'sidebar-overlay mobile-menu-overlay';
            newOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 999;
                display: block;
            `;
            newOverlay.addEventListener('click', closeMobileMenu);
            document.body.appendChild(newOverlay);
        } else {
            overlay.classList.add('active', 'show');
            overlay.style.display = 'block';
            overlay.style.opacity = '1';
            overlay.style.visibility = 'visible';
        }
        
        document.body.classList.add('menu-open');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Toggle menu mobile
     */
    function toggleMobileMenu() {
        const sidebar = document.querySelector('.sidebar, .mobile-sidebar, .nav-sidebar, [class*="sidebar"], [class*="mobile-menu"]');
        if (!sidebar) return;
        
        const isOpen = sidebar.classList.contains('open') || 
                      sidebar.classList.contains('active') ||
                      sidebar.style.transform === 'translateX(0)' ||
                      sidebar.style.left === '0px';
        
        if (isOpen) {
            closeMobileMenu();
        } else {
            openMobileMenu();
        }
    }

    /**
     * Configurar event listeners
     */
    function setupMobileMenuListeners() {
        // Procurar pelo botão hamburger (três tracinhos)
        const hamburgerButtons = document.querySelectorAll(
            '.hamburger, .menu-toggle, .mobile-menu-toggle, [class*="hamburger"], [class*="menu-toggle"], button[aria-label*="menu"], button[aria-label*="Menu"]'
        );
        
        // Também procurar por ícones de três linhas
        const allButtons = document.querySelectorAll('button, a, [role="button"]');
        allButtons.forEach(btn => {
            const html = btn.innerHTML || '';
            const text = btn.textContent || '';
            // Se tem ícone de três linhas ou texto relacionado
            if (html.includes('fa-bars') || 
                html.includes('menu') || 
                text.includes('☰') ||
                (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes('menu'))) {
                hamburgerButtons.push(btn);
            }
        });
        
        console.log('🔍 Botões hamburger encontrados:', hamburgerButtons.length);
        
        // Adicionar listeners aos botões hamburger
        hamburgerButtons.forEach(btn => {
            // Remover listeners antigos
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🍔 Hamburger clicado');
                toggleMobileMenu();
            });
        });
        
        // Procurar pelo botão de fechar (X)
        const closeButtons = document.querySelectorAll(
            '.close-menu, .menu-close, .sidebar-close, [class*="close"], [class*="menu-close"], button[aria-label*="close"], button[aria-label*="Close"]'
        );
        
        // Também procurar por ícones de X
        allButtons.forEach(btn => {
            const html = btn.innerHTML || '';
            if (html.includes('fa-times') || 
                html.includes('fa-close') || 
                html.includes('fa-x') ||
                html.includes('×') ||
                html.includes('✕')) {
                closeButtons.push(btn);
            }
        });
        
        console.log('❌ Botões de fechar encontrados:', closeButtons.length);
        
        // Adicionar listeners aos botões de fechar
        closeButtons.forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('❌ Botão fechar clicado');
                closeMobileMenu();
            });
        });
        
        // Fechar ao clicar no overlay (usar event delegation)
        document.body.addEventListener('click', (e) => {
            const target = e.target;
            
            // Verificar se clicou em um overlay
            if (target.classList.contains('overlay') ||
                target.classList.contains('sidebar-overlay') ||
                target.classList.contains('menu-overlay') ||
                target.classList.contains('backdrop') ||
                Array.from(target.classList).some(c => c.includes('overlay') || c.includes('backdrop'))) {
                
                const sidebar = document.querySelector('.sidebar, .mobile-sidebar, [class*="sidebar"]');
                if (sidebar && (sidebar.classList.contains('open') || sidebar.classList.contains('active'))) {
                    console.log('🖱️ Overlay clicado, fechando menu...');
                    e.preventDefault();
                    e.stopPropagation();
                    closeMobileMenu();
                }
            }
        }, true); // Usar capture phase para pegar antes de outros handlers
        
        // Fechar com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const sidebar = document.querySelector('.sidebar, .mobile-sidebar, [class*="sidebar"]');
                if (sidebar && (sidebar.classList.contains('open') || sidebar.classList.contains('active'))) {
                    console.log('⌨️ ESC pressionado, fechando menu...');
                    closeMobileMenu();
                }
            }
        });
        
        // Fechar ao clicar fora do sidebar (em mobile) - usar event delegation
        document.body.addEventListener('click', (e) => {
            // Só funciona em mobile
            if (window.innerWidth > 768) return;
            
            const sidebar = document.querySelector('.sidebar, .mobile-sidebar, [class*="sidebar"]');
            if (!sidebar) return;
            
            const isOpen = sidebar.classList.contains('open') || 
                          sidebar.classList.contains('active') ||
                          sidebar.classList.contains('show');
            
            if (isOpen) {
                // Verificar se clicou fora do sidebar
                const clickedInsideSidebar = sidebar.contains(e.target);
                const clickedOnHamburger = e.target.closest('.hamburger, .menu-toggle, [class*="hamburger"], [class*="menu-toggle"]');
                
                if (!clickedInsideSidebar && !clickedOnHamburger) {
                    console.log('🖱️ Clicou fora do sidebar, fechando...');
                    e.preventDefault();
                    e.stopPropagation();
                    closeMobileMenu();
                }
            }
        }, true); // Capture phase
    }

    /**
     * Remover overlay preto problemático
     */
    function removeBlackOverlay() {
        // Procurar por elementos que podem estar causando o "erro preto"
        const allElements = document.querySelectorAll('*');
        let removedCount = 0;
        
        allElements.forEach(el => {
            // Pular elementos que não devem ser removidos
            if (el.classList.contains('sidebar') ||
                el.classList.contains('mobile-sidebar') ||
                el.classList.contains('sidebar-overlay') ||
                el.classList.contains('menu-overlay') ||
                el.id === 'app' ||
                el.tagName === 'BODY' ||
                el.tagName === 'HTML') {
                return;
            }
            
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            
            // Se é um elemento fixo que cobre toda a tela e está escuro
            const isFullScreen = rect.width >= window.innerWidth * 0.9 &&
                                rect.height >= window.innerHeight * 0.9;
            
            if ((style.position === 'fixed' || style.position === 'absolute') && isFullScreen) {
                const bgColor = style.backgroundColor.toLowerCase();
                const isDark = bgColor.includes('rgba(0,0,0') || 
                             bgColor.includes('rgb(0,0,0') ||
                             bgColor === '#000000' ||
                             bgColor === 'black' ||
                             bgColor.includes('rgba(0, 0, 0');
                
                if (isDark) {
                    // Verificar se não é um modal legítimo (modais geralmente têm conteúdo)
                    const hasContent = el.querySelector('h1, h2, h3, p, button, form, input, .modal-content, .dialog-content') && 
                                      el.textContent.trim().length > 20;
                    
                    // Verificar se não é um overlay legítimo do sidebar
                    const isLegitimateOverlay = el.classList.contains('sidebar-overlay') ||
                                               el.classList.contains('menu-overlay') ||
                                               el.classList.contains('mobile-menu-overlay') ||
                                               el.getAttribute('data-overlay') === 'sidebar';
                    
                    if (!hasContent && !isLegitimateOverlay && parseInt(style.zIndex) > 100) {
                        console.log('⚠️ Removendo overlay preto problemático:', el, {
                            zIndex: style.zIndex,
                            backgroundColor: style.backgroundColor,
                            position: style.position
                        });
                        el.style.display = 'none';
                        el.style.opacity = '0';
                        el.style.visibility = 'hidden';
                        el.style.pointerEvents = 'none';
                        removedCount++;
                    }
                }
            }
        });
        
        if (removedCount > 0) {
            console.log(`✅ Removidos ${removedCount} overlay(s) preto(s) problemático(s)`);
        }
        
        // Também remover pseudo-elementos via CSS inline
        if (!document.getElementById('mobile-menu-fix-styles')) {
            const fixStyle = document.createElement('style');
            fixStyle.id = 'mobile-menu-fix-styles';
            fixStyle.textContent = `
                @media (max-width: 768px) {
                    body.menu-open::before,
                    body.sidebar-open::before,
                    body.mobile-menu-open::before,
                    html::before {
                        display: none !important;
                        content: none !important;
                        background: none !important;
                    }
                    
                    /* Garantir que body não fique preto */
                    body.menu-open,
                    body.sidebar-open {
                        background: #0D0D0F !important;
                    }
                }
            `;
            document.head.appendChild(fixStyle);
        }
    }

    /**
     * Garantir que menu está fechado na inicialização
     */
    function ensureMenuClosedOnInit() {
        console.log('🔒 Garantindo que menu está fechado na inicialização...');
        
        // Fechar menu imediatamente se estiver aberto
        const sidebar = document.querySelector('.sidebar, .mobile-sidebar, .nav-sidebar, [class*="sidebar"], [class*="mobile-menu"]');
        if (sidebar) {
            // Verificar se está visível
            const style = window.getComputedStyle(sidebar);
            const rect = sidebar.getBoundingClientRect();
            const isVisible = rect.left >= 0 || 
                            style.left === '0px' || 
                            style.transform === 'translateX(0px)' ||
                            style.transform === 'translateX(0)';
            
            // Se está visível mas não tem classe open, ou se tem classe open mas não deveria ter
            const hasOpenClass = sidebar.classList.contains('open') || 
                               sidebar.classList.contains('active') ||
                               sidebar.classList.contains('show');
            
            // Em mobile, sempre fechar por padrão
            if (window.innerWidth <= 768) {
                if (isVisible || hasOpenClass) {
                    console.log('⚠️ Menu estava aberto na inicialização, fechando...');
                    closeMobileMenu();
                }
                
                // Forçar fechamento via CSS inline também
                sidebar.style.left = '-100%';
                sidebar.style.transform = 'translateX(-100%)';
                sidebar.style.visibility = 'hidden';
                sidebar.style.opacity = '0';
                sidebar.classList.remove('open', 'active', 'show', 'visible');
            }
        }
        
        // Remover classes do body
        document.body.classList.remove('menu-open', 'sidebar-open', 'mobile-menu-open', 'no-scroll');
        document.body.style.overflow = '';
        
        // Remover qualquer overlay
        const overlay = document.querySelector('.overlay, .sidebar-overlay, .menu-overlay, .backdrop, [class*="overlay"], [class*="backdrop"]');
        if (overlay) {
            overlay.classList.remove('active', 'show', 'visible');
            overlay.style.display = 'none';
            overlay.style.opacity = '0';
            overlay.style.visibility = 'hidden';
        }
        
        console.log('✅ Menu garantido como fechado na inicialização');
    }

    /**
     * Inicializar
     */
    function init() {
        console.log('🚀 Inicializando correções do menu mobile...');
        
        // PRIMEIRO: Garantir que menu está fechado
        ensureMenuClosedOnInit();
        
        // Aguardar DOM estar pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    ensureMenuClosedOnInit(); // Garantir novamente após DOM carregar
                    setupMobileMenuListeners();
                    removeBlackOverlay();
                }, 100);
            });
        } else {
            setTimeout(() => {
                ensureMenuClosedOnInit(); // Garantir novamente
                setupMobileMenuListeners();
                removeBlackOverlay();
            }, 100);
        }
        
        // Observar mudanças no DOM (para quando o menu é criado dinamicamente)
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        // Se adicionou um sidebar ou overlay
                        if (node.classList && (
                            node.classList.contains('sidebar') ||
                            node.classList.contains('overlay') ||
                            Array.from(node.classList).some(c => c.includes('sidebar') || c.includes('overlay'))
                        )) {
                            setTimeout(() => {
                                setupMobileMenuListeners();
                                removeBlackOverlay();
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
        
        // Executar periodicamente para garantir (com timeout)
        let checkInterval = setInterval(() => {
            setupMobileMenuListeners();
            removeBlackOverlay();
            
            // Verificar se menu está aberto mas não deveria estar
            const sidebar = document.querySelector('.sidebar, .mobile-sidebar, [class*="sidebar"]');
            if (sidebar) {
                const style = window.getComputedStyle(sidebar);
                const rect = sidebar.getBoundingClientRect();
                const isVisible = rect.left >= 0 || style.left === '0px' || style.transform === 'translateX(0px)';
                const hasOpenClass = sidebar.classList.contains('open') || sidebar.classList.contains('active');
                
                // Se não tem classe open mas está visível, pode ser um bug - forçar fechar
                if (isVisible && !hasOpenClass && window.innerWidth <= 768) {
                    console.log('⚠️ Menu está visível mas não tem classe open, forçando fechar...');
                    closeMobileMenu();
                }
            }
        }, 1500);
        
        // Limpar após 60 segundos (aumentado para garantir que funcione)
        setTimeout(() => {
            clearInterval(checkInterval);
        }, 60000);
    }

    // Inicializar imediatamente
    init();
    
    // Garantir que menu está fechado imediatamente (antes de qualquer outro script)
    ensureMenuClosedOnInit();
    
    // Também inicializar quando window carregar completamente
    window.addEventListener('load', () => {
        setTimeout(() => {
            ensureMenuClosedOnInit(); // Garantir novamente após tudo carregar
            setupMobileMenuListeners();
            removeBlackOverlay();
        }, 500);
    });
    
    // Executar imediatamente também (para pegar antes de outros scripts)
    if (document.readyState === 'complete') {
        ensureMenuClosedOnInit();
    } else {
        window.addEventListener('DOMContentLoaded', ensureMenuClosedOnInit, { once: true });
    }
    
    // Expor funções globalmente
    window.closeMobileMenu = closeMobileMenu;
    window.openMobileMenu = openMobileMenu;
    window.toggleMobileMenu = toggleMobileMenu;
    window.fixMobileMenu = function() {
        setupMobileMenuListeners();
        removeBlackOverlay();
    };
    
    console.log('✅ Correção do menu mobile carregada');
    
    // Forçar execução após um delay para garantir
    setTimeout(() => {
        console.log('🔄 Executando verificação final do menu mobile...');
        ensureMenuClosedOnInit(); // Garantir que está fechado
        setupMobileMenuListeners();
        removeBlackOverlay();
    }, 1000);
    
    // Executar também quando a página fica visível (se estava em background)
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && window.innerWidth <= 768) {
            setTimeout(() => {
                ensureMenuClosedOnInit();
            }, 100);
        }
    });

})();
