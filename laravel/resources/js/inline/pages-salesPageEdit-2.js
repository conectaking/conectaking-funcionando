// Forçar limpeza de cache
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
                for(let registration of registrations) {
                    registration.unregister();
                }
            });
        }

        // Garantir que Sortable nunca seja usado no mobile
        (function() {
            const isMobile = window.innerWidth <= 768;
            if (isMobile && window.Sortable) {
                // Sobrescrever Sortable no mobile para garantir que não seja usado
                const originalSortable = window.Sortable;
                window.Sortable = function() {
                    console.log('?? Sortable bloqueado no mobile - scroll deve funcionar normalmente');
                    return {
                        destroy: function() {},
                        option: function() {},
                        el: null
                    };
                };
                // Copiar métodos estéticos se existirem
                Object.keys(originalSortable).forEach(key => {
                    if (typeof originalSortable[key] === 'function') {
                        window.Sortable[key] = function() {
                            console.log('?? Sortable.' + key + ' bloqueado no mobile');
                        };
                    }
                });
            }
        })();

        // Garantir scroll nas imagens dos produtos no mobile - FORÇAR COMPORTAMENTO
        function forceMobileScrollBehavior() {
            const isMobile = window.innerWidth <= 768;
            if (!isMobile) return;

            // Função para aplicar regras em elementos
            function applyScrollRules(element) {
                if (!element) return;
                
                // Remover qualquer evento de drag
                element.ondragstart = function() { return false; };
                element.ondrag = function() { return false; };
                element.ondragend = function() { return false; };
                element.ondragenter = function() { return false; };
                element.ondragleave = function() { return false; };
                element.ondragover = function() { return false; };
                element.ondrop = function() { return false; };
                
                // Garantir touch-action via style inline (mais forte que CSS)
                element.style.setProperty('touch-action', 'pan-y', 'important');
                element.style.setProperty('-webkit-touch-callout', 'none', 'important');
                element.style.setProperty('-webkit-user-select', 'none', 'important');
                element.style.setProperty('user-select', 'none', 'important');
                element.style.setProperty('-webkit-user-drag', 'none', 'important');
                element.style.setProperty('user-drag', 'none', 'important');
                element.style.setProperty('cursor', 'default', 'important');
                
                // Adicionar listeners passivos para scroll (remover anteriores primeiro)
                element.removeEventListener('touchstart', function() {}, { passive: true });
                element.removeEventListener('touchmove', function() {}, { passive: true });
                
                element.addEventListener('touchstart', function(e) {
                    // Permitir scroll - não fazer nada
                }, { passive: true });
                
                element.addEventListener('touchmove', function(e) {
                    // Permitir scroll - não prevenir default
                }, { passive: true });
            }

            // Aplicar imediatamente
            const productCards = document.querySelectorAll('.product-card-edit, .product-card-image, .product-card-image img, .products-list');
            productCards.forEach(applyScrollRules);

            // Observar mudanças no DOM (quando produtos são carregados)
            const observer = new MutationObserver(function(mutations) {
                const newCards = document.querySelectorAll('.product-card-edit, .product-card-image, .product-card-image img');
                newCards.forEach(applyScrollRules);
            });

            const productsList = document.getElementById('products-list');
            if (productsList) {
                observer.observe(productsList, {
                    childList: true,
                    subtree: true
                });
            }

            // Aplicar novamente após delay para garantir
            setTimeout(function() {
                const allCards = document.querySelectorAll('.product-card-edit, .product-card-image, .product-card-image img, .products-list');
                allCards.forEach(applyScrollRules);
            }, 500);

            setTimeout(function() {
                const allCards = document.querySelectorAll('.product-card-edit, .product-card-image, .product-card-image img, .products-list');
                allCards.forEach(applyScrollRules);
            }, 1500);
        }

        // Executar imediatamente e após DOM carregar
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', forceMobileScrollBehavior);
        } else {
            forceMobileScrollBehavior();
        }

        // Executar também após um delay para garantir
        setTimeout(forceMobileScrollBehavior, 100);
        setTimeout(forceMobileScrollBehavior, 500);
        setTimeout(forceMobileScrollBehavior, 2000);
