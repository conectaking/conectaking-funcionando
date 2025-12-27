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
        
        if (productId && name && price) {
            products[productId] = { id: productId, name, price, image };
        }
    });

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
                            <button class="quantity-btn" onclick="Cart.decreaseQuantity('${item.id}')">-</button>
                            <span>${item.quantity}</span>
                            <button class="quantity-btn" onclick="Cart.increaseQuantity('${item.id}')">+</button>
                            <button class="cart-item-remove" onclick="Cart.remove('${item.id}')">Remover</button>
                        </div>
                    </div>
                </div>
            `).join('');
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
        let message = 'Olá! Gostaria de comprar os seguintes produtos:\n\n';

        cart.items.forEach(item => {
            const total = item.price * item.quantity;
            message += `📦 ${item.name}`;
            if (item.quantity > 1) {
                message += ` (Qtd: ${item.quantity})`;
            }
            message += ` - ${Cart.formatCurrency(item.price)}`;
            if (item.quantity > 1) {
                message += ` = ${Cart.formatCurrency(total)}`;
            }
            message += '\n';
        });

        message += `\n💰 Total: ${Cart.formatCurrency(cart.total)}\n`;

        if (customerName && customerName.trim()) {
            message += `\n👤 Nome: ${customerName.trim()}\n`;
        }

        if (observation && observation.trim()) {
            message += `\n📝 Observação: ${observation.trim()}\n`;
        }

        return message;
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
        const whatsappNumber = document.querySelector('.sales-page')?.dataset.whatsappNumber || '';
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
     * Event Listeners
     */
    cartToggle?.addEventListener('click', () => {
        cartSidebar.classList.add('open');
        cartOverlay.classList.add('show');
    });

    cartClose?.addEventListener('click', () => {
        cartSidebar.classList.remove('open');
        cartOverlay.classList.remove('show');
    });

    cartOverlay?.addEventListener('click', () => {
        cartSidebar.classList.remove('open');
        cartOverlay.classList.remove('show');
    });

    checkoutBtn?.addEventListener('click', checkout);

    // Botões "Adicionar ao Carrinho"
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = btn.dataset.productId;
            Cart.add(productId, 1);
            trackProductClick(productId);
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

    // Inicialização
    Cart.updateUI();
    trackPageView();

    // Expor Cart globalmente para uso nos event handlers inline
    window.Cart = Cart;
})();

