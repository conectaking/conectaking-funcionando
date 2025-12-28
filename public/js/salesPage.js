/**
 * Sales Page - JavaScript da Página Pública
 * Gerencia carrinho, checkout WhatsApp e tracking de eventos
 */

(function() {
    'use strict';

    const salesPageId = document.querySelector('.sales-page')?.dataset.salesPageId;
    if (!salesPageId) return;

    // Carrinho (localStorage)
    const CART_KEY = `sales_page_cart_${salesPageId}`;

    // Elementos DOM
    const cartToggle = document.getElementById('cart-toggle');
    const cartClose = document.getElementById('cart-close');
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartOverlay = document.getElementById('cart-overlay');
    const cartItems = document.getElementById('cart-items');
    const cartCount = document.getElementById('cart-count');
    const cartTotal = document.getElementById('cart-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    const customerNameInput = document.getElementById('customer-name');
    const customerObservationInput = document.getElementById('customer-observation');

    // Produtos disponíveis (carregados da página)
    const products = {};
    document.querySelectorAll('.product-card').forEach(card => {
        const productId = card.dataset.productId;
        const name = card.querySelector('.product-name')?.textContent.trim();
        const price = parseFloat(card.querySelector('.current-price')?.textContent.replace(/[^\d,]/g, '').replace(',', '.'));
        const image = card.querySelector('.product-image img')?.src;
        const badge = card.dataset.productBadge || card.querySelector('.product-badge')?.textContent.trim() || null;
        
        if (productId && name && price) {
            products[productId] = { id: productId, name, price, image, badge };
        }
    });

    /**
     * Aplicar filtro de produtos
     */
    function applyProductFilter(filter) {
        const productsGridEl = document.getElementById('products-grid');
        const productCards = document.querySelectorAll('.product-card');
        
        console.log('Aplicando filtro:', filter);
        console.log('Total de produtos encontrados:', productCards.length);
        
        let visibleCount = 0;
        productCards.forEach(card => {
            const badgeAttr = card.dataset.productBadge || '';
            // Badge pode ser múltiplos separados por vírgula
            const badges = badgeAttr ? badgeAttr.split(',').map(b => b.trim()).filter(b => b) : [];
            
            if (filter === 'all') {
                card.style.display = '';
                visibleCount++;
            } else {
                // Verificar se algum dos badges do produto corresponde ao filtro
                const matches = badges.includes(filter);
                card.style.display = matches ? '' : 'none';
                if (matches) visibleCount++;
            }
        });
        
        console.log('Produtos visíveis após filtro:', visibleCount);
        
        // Atualizar atributo do grid
        if (productsGridEl) {
            productsGridEl.setAttribute('data-filter', filter);
        }
    }

    // Configurar filtros por badge
    const filterTabs = document.querySelectorAll('.filter-tab-public');
    
    if (filterTabs.length) {
        filterTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const filter = tab.dataset.filter;
                
                // Atualizar botões ativos
                filterTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Aplicar filtro
                applyProductFilter(filter);
            });
        });
        
        // Aplicar filtro inicial "all" quando a página carregar
        const initialFilter = 'all';
        applyProductFilter(initialFilter);
    } else {
        // Se não houver filtros, garantir que todos os produtos sejam visíveis
        document.querySelectorAll('.product-card').forEach(card => {
            card.style.display = '';
        });
    }

    /**
     * Gerenciamento do Carrinho
     */
    const Cart = {
        get() {
            const cart = localStorage.getItem(CART_KEY);
            return cart ? JSON.parse(cart) : { items: [], total: 0 };
        },

        save(cart) {
            localStorage.setItem(CART_KEY, JSON.stringify(cart));
            this.updateUI();
        },

        add(productId, quantity = 1) {
            const cart = this.get();
            const product = products[productId];
            
            if (!product) {
                console.error('Produto não encontrado:', productId);
                return;
            }

            const existingItem = cart.items.find(item => item.id === productId);
            
            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                cart.items.push({
                    id: productId,
                    name: product.name,
                    price: product.price,
                    image: product.image,
                    quantity: quantity
                });
            }

            this.calculateTotal(cart);
            this.save(cart);
            
            // Tracking
            trackAddToCart(productId, quantity);
            
            // Feedback visual
            this.showAddFeedback(productId);
        },

        remove(productId) {
            const cart = this.get();
            cart.items = cart.items.filter(item => item.id !== productId);
            this.calculateTotal(cart);
            this.save(cart);
        },

        updateQuantity(productId, quantity) {
            const cart = this.get();
            const item = cart.items.find(item => item.id === productId);
            
            if (item) {
                if (quantity <= 0) {
                    this.remove(productId);
                } else {
                    item.quantity = quantity;
                    this.calculateTotal(cart);
                    this.save(cart);
                }
            }
        },

        calculateTotal(cart) {
            cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        },

        clear() {
            localStorage.removeItem(CART_KEY);
            this.updateUI();
        },

        updateUI() {
            const cart = this.get();
            
            // Atualizar contador
            const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
            cartCount.textContent = itemCount;
            
            // Atualizar total
            cartTotal.textContent = this.formatCurrency(cart.total);
            
            // Renderizar itens
            this.renderItems(cart);
        },

        renderItems(cart) {
            if (cart.items.length === 0) {
                cartItems.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">Carrinho vazio</p>';
                return;
            }

            cartItems.innerHTML = cart.items.map(item => `
                <div class="cart-item" data-product-id="${item.id}">
                    ${item.image ? `<img src="${item.image}" alt="${item.name}" class="cart-item-image">` : ''}
                    <div class="cart-item-info">
                        <div class="cart-item-name">${this.escapeHtml(item.name)}</div>
                        <div class="cart-item-price">${this.formatCurrency(item.price)}</div>
                        <div class="cart-item-quantity">
                            <button class="quantity-btn quantity-decrease" data-product-id="${item.id}">-</button>
                            <span>${item.quantity}</span>
                            <button class="quantity-btn quantity-increase" data-product-id="${item.id}">+</button>
                            <button class="cart-item-remove" data-product-id="${item.id}">Remover</button>
                        </div>
                    </div>
                </div>
            `).join('');

            // Adicionar event listeners após renderizar (CSP safe)
            this.attachCartItemListeners();
        },

        attachCartItemListeners() {
            // Remover listeners anteriores (limpar)
            const removeButtons = cartItems.querySelectorAll('.cart-item-remove');
            const decreaseButtons = cartItems.querySelectorAll('.quantity-decrease');
            const increaseButtons = cartItems.querySelectorAll('.quantity-increase');

            removeButtons.forEach(btn => {
                // Remover listeners antigos
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                
                // Adicionar novo listener
                newBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const productId = newBtn.dataset.productId;
                    if (productId) {
                        this.remove(productId);
                    }
                });
            });

            decreaseButtons.forEach(btn => {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                
                newBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const productId = newBtn.dataset.productId;
                    if (productId) {
                        this.decreaseQuantity(productId);
                    }
                });
            });

            increaseButtons.forEach(btn => {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                
                newBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const productId = newBtn.dataset.productId;
                    if (productId) {
                        this.increaseQuantity(productId);
                    }
                });
            });
        },

        increaseQuantity(productId) {
            const cart = this.get();
            const item = cart.items.find(item => item.id === productId);
            if (item) {
                this.updateQuantity(productId, item.quantity + 1);
            }
        },

        decreaseQuantity(productId) {
            const cart = this.get();
            const item = cart.items.find(item => item.id === productId);
            if (item) {
                this.updateQuantity(productId, item.quantity - 1);
            }
        },

        formatCurrency(value) {
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            }).format(value);
        },

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        },

        showAddFeedback(productId) {
            const btn = document.querySelector(`[data-product-id="${productId}"].add-to-cart-btn`);
            if (btn) {
                const originalText = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check"></i> Adicionado!';
                btn.style.background = '#00ff00';
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.background = '';
                }, 1500);
            }
        }
    };

    /**
     * Tracking de Eventos
     */
    function trackPageView() {
        fetch('/api/v1/sales-pages/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sales_page_id: parseInt(salesPageId),
                event_type: 'page_view',
                metadata: {
                    timestamp: new Date().toISOString(),
                    url: window.location.href
                }
            })
        }).catch(err => console.error('Erro ao registrar page_view:', err));
    }

    function trackProductView(productId) {
        fetch('/api/v1/sales-pages/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sales_page_id: parseInt(salesPageId),
                product_id: parseInt(productId),
                event_type: 'product_view',
                metadata: {
                    timestamp: new Date().toISOString()
                }
            })
        }).catch(err => console.error('Erro ao registrar product_view:', err));
    }

    function trackProductClick(productId) {
        fetch('/api/v1/sales-pages/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sales_page_id: parseInt(salesPageId),
                product_id: parseInt(productId),
                event_type: 'product_click',
                metadata: {
                    timestamp: new Date().toISOString()
                }
            })
        }).catch(err => console.error('Erro ao registrar product_click:', err));
    }

    function trackAddToCart(productId, quantity) {
        const product = products[productId];
        fetch('/api/v1/sales-pages/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sales_page_id: parseInt(salesPageId),
                product_id: parseInt(productId),
                event_type: 'add_to_cart',
                metadata: {
                    product_id: parseInt(productId),
                    quantity: quantity,
                    price: product.price,
                    timestamp: new Date().toISOString()
                }
            })
        }).catch(err => console.error('Erro ao registrar add_to_cart:', err));
    }

    function trackCheckout() {
        const cart = Cart.get();
        fetch('/api/v1/sales-pages/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sales_page_id: parseInt(salesPageId),
                event_type: 'checkout_click',
                metadata: {
                    cart_total: cart.total,
                    item_count: cart.items.length,
                    timestamp: new Date().toISOString()
                }
            })
        }).catch(err => console.error('Erro ao registrar checkout_click:', err));
    }

    /**
     * Checkout WhatsApp
     */
    function formatWhatsAppMessage(cart, storeInfo, customerName, observation) {
        // Obter profile_slug e base URL
        const baseUrl = window.location.origin;
        const profileSlug = getProfileSlug(); // Função auxiliar para obter profile_slug
        
        let message = 'Olá! Gostaria de comprar:\n\n';

        cart.items.forEach((item, index) => {
            // Nome do produto (em maiúsculas)
            message += `${item.name.toUpperCase()}\n`;
            
            // Preço unitário
            message += `${Cart.formatCurrency(item.price)}\n`;
            
            // Quantidade
            message += `Quantidade: ${item.quantity}\n`;
            
            // Link personalizável do produto
            const productUrl = `${baseUrl}/${profileSlug}/produto/${item.id}`;
            message += `🔗 ${productUrl}`;
            
            // Adicionar linha em branco entre produtos (exceto no último)
            if (index < cart.items.length - 1) {
                message += '\n\n';
            } else {
                message += '\n';
            }
        });

        message += `\nTotal: ${Cart.formatCurrency(cart.total)}\n`;

        if (customerName && customerName.trim()) {
            message += `\nNome: ${customerName.trim()}\n`;
        }

        if (observation && observation.trim()) {
            message += `\nObservação: ${observation.trim()}\n`;
        }

        return message;
    }

    /**
     * Obter profile_slug da URL atual ou de dados da página
     */
    function getProfileSlug() {
        // Primeiro: tentar obter de data attribute do body
        const salesPageEl = document.querySelector('.sales-page');
        if (salesPageEl?.dataset?.profileSlug) {
            return salesPageEl.dataset.profileSlug;
        }
        
        // Segundo: tentar obter de meta tag
        const metaSlug = document.querySelector('meta[name="profile-slug"]')?.content;
        if (metaSlug) {
            return metaSlug;
        }
        
        // Terceiro: tentar extrair da URL atual (ex: /ADRIANO-KING/loja/2060)
        const pathParts = window.location.pathname.split('/').filter(p => p);
        if (pathParts.length > 0) {
            return pathParts[0];
        }
        
        // Último fallback: usar valor padrão (não ideal, mas evita erro)
        console.warn('Profile slug não encontrado, usando fallback');
        return 'perfil';
    }

    function formatWhatsAppNumber(number) {
        let cleaned = number.replace(/[^\d+]/g, '');
        if (!cleaned.startsWith('+')) {
            cleaned = cleaned.replace(/^0+/, '');
            if (!cleaned.startsWith('55')) {
                cleaned = '55' + cleaned;
            }
            cleaned = '+' + cleaned;
        }
        return cleaned;
    }

    function checkout() {
        const cart = Cart.get();
        
        if (cart.items.length === 0) {
            alert('Seu carrinho está vazio!');
            return;
        }

        // Buscar informações da loja
        const salesPageEl = document.querySelector('.sales-page');
        const whatsappNumber = salesPageEl?.dataset?.whatsappNumber || '';
        if (!whatsappNumber) {
            alert('Número do WhatsApp não configurado!');
            return;
        }

        const customerName = customerNameInput.value.trim();
        const observation = customerObservationInput.value.trim();

        // Formatar mensagem
        const message = formatWhatsAppMessage(cart, {}, customerName, observation);
        const formattedNumber = formatWhatsAppNumber(whatsappNumber);
        const whatsappURL = `https://wa.me/${formattedNumber.replace('+', '')}?text=${encodeURIComponent(message)}`;

        // Tracking
        trackCheckout();

        // Redirecionar
        window.open(whatsappURL, '_blank');
    }

    /**
     * Configurar event listeners do carrinho
     */
    function setupCartListeners() {
        if (cartToggle) {
            // Remover listener antigo
            const newToggle = cartToggle.cloneNode(true);
            cartToggle.parentNode.replaceChild(newToggle, cartToggle);
            
            newToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Carrinho clicado');
                const sidebar = document.getElementById('cart-sidebar');
                const overlay = document.getElementById('cart-overlay');
                if (sidebar) sidebar.classList.add('open');
                if (overlay) overlay.classList.add('show');
            });
        }
    }

    /**
     * Event Listeners
     */
    // Configurar listeners do carrinho após o DOM estar pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupCartListeners);
    } else {
        setupCartListeners();
    }

    cartClose?.addEventListener('click', () => {
        cartSidebar.classList.remove('open');
        cartOverlay.classList.remove('show');
    });

    cartOverlay?.addEventListener('click', () => {
        cartSidebar.classList.remove('open');
        cartOverlay.classList.remove('show');
    });

    checkoutBtn?.addEventListener('click', checkout);

    // Função para adicionar event listeners aos botões de adicionar ao carrinho
    function attachAddToCartListeners() {
        document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            // Verificar se já tem listener
            if (btn.dataset.listenerAttached === 'true') {
                return;
            }
            
            btn.dataset.listenerAttached = 'true';
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const productId = btn.dataset.productId;
                console.log('Adicionar ao carrinho clicado, productId:', productId);
                if (productId && products[productId]) {
                    Cart.add(productId, 1);
                    trackProductClick(productId);
                } else {
                    console.error('Produto não encontrado:', productId, products);
                }
            });
        });
    }

    // Adicionar listeners iniciais
    setTimeout(() => {
        attachAddToCartListeners();
    }, 100);
    
    // Re-adicionar listeners quando produtos forem filtrados (usando MutationObserver)
    if (productsGridEl) {
        const observer = new MutationObserver(() => {
            setTimeout(() => {
                attachAddToCartListeners();
            }, 50);
        });
        observer.observe(productsGridEl, { childList: true, subtree: true });
    }

    // Prevenir que o link do produto dispare quando clicar no botão de adicionar ao carrinho
    document.querySelectorAll('.product-link').forEach(link => {
        link.addEventListener('click', (e) => {
            // Se o clique foi em um botão ou elemento interativo, não seguir o link
            if (e.target.closest('.add-to-cart-btn') || e.target.closest('.view-details-btn')) {
                e.preventDefault();
            }
        });
    });

    // Tracking de visualização de produtos (Intersection Observer)
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.5
    };

    const productObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const productId = entry.target.dataset.productId;
                if (productId) {
                    trackProductView(productId);
                    productObserver.unobserve(entry.target);
                }
            }
        });
    }, observerOptions);

    document.querySelectorAll('.product-card').forEach(card => {
        productObserver.observe(card);
    });

    /**
     * Controles de Visualização
     */
    const productsGridEl = document.getElementById('products-grid');
    const viewModeButtons = document.querySelectorAll('.view-btn');
    const sizeButtons = document.querySelectorAll('.size-btn');

    // Carregar preferências do localStorage
    const savedViewMode = localStorage.getItem(`sales_page_view_mode_${salesPageId}`) || 'grid';
    const savedCardSize = localStorage.getItem(`sales_page_card_size_${salesPageId}`) || 'small';

    // Aplicar preferências salvas
    if (productsGridEl) {
        productsGridEl.setAttribute('data-view-mode', savedViewMode);
        productsGridEl.setAttribute('data-card-size', savedCardSize);
        
        // Atualizar botões ativos
        viewModeButtons.forEach(btn => {
            if (btn.dataset.mode === savedViewMode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        sizeButtons.forEach(btn => {
            if (btn.dataset.size === savedCardSize) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // Event listeners para modo de visualização
    viewModeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const mode = btn.dataset.mode;
            
            // Atualizar botões
            viewModeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Atualizar grid
            if (productsGridEl) {
                productsGridEl.setAttribute('data-view-mode', mode);
                localStorage.setItem(`sales_page_view_mode_${salesPageId}`, mode);
            }
        });
    });

    // Event listeners para tamanho
    sizeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const size = btn.dataset.size;
            
            // Atualizar botões
            sizeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Atualizar grid
            if (productsGridEl) {
                productsGridEl.setAttribute('data-card-size', size);
                localStorage.setItem(`sales_page_card_size_${salesPageId}`, size);
            }
        });
    });

    // Inicialização
    Cart.updateUI();
    trackPageView();

    // Expor Cart globalmente para uso nos event handlers inline
    window.Cart = Cart;
})();

