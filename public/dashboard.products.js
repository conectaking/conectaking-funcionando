/**
 * Dashboard Products - Gerenciamento de Produtos
 * Funcionalidades: Listar, criar, editar, deletar, reordenar produtos
 */

(function() {
    'use strict';

    const DashboardProducts = {
        products: [],
        currentProduct: null,
        sortable: null,

        /**
         * Inicialização
         */
        init() {
            this.setupEventListeners();
            // Carregar produtos quando a aba de produtos for aberta
            this.setupTabListener();
            // Tentar carregar contagem de produtos (pode não estar disponível ainda)
            this.tryLoadProductsCount();
            // Tentar carregar produtos imediatamente se a aba já estiver ativa
            this.checkAndLoadProducts();
        },

        /**
         * Tentar carregar contagem de produtos, com retry se necessário
         */
        tryLoadProductsCount() {
            const salesPageId = window.SALES_PAGE_EDIT_DATA?.salesPageId;
            if (salesPageId) {
                // Se já está disponível, carregar imediatamente
                this.loadProductsCount();
            } else {
                // Se não está disponível, tentar novamente após um delay
                console.log('SalesPageId ainda não disponível, tentando novamente em 500ms...');
                setTimeout(() => {
                    const retrySalesPageId = window.SALES_PAGE_EDIT_DATA?.salesPageId;
                    if (retrySalesPageId) {
                        this.loadProductsCount();
                    } else {
                        // Tentar mais uma vez após mais tempo
                        console.log('SalesPageId ainda não disponível, tentando novamente em 1s...');
                        setTimeout(() => {
                            if (window.SALES_PAGE_EDIT_DATA?.salesPageId) {
                                this.loadProductsCount();
                            } else {
                                console.warn('SalesPageId não disponível após múltiplas tentativas');
                            }
                        }, 1000);
                    }
                }, 500);
            }
        },

        /**
         * Verificar e carregar produtos se necessário
         */
        checkAndLoadProducts() {
            // Verificar se a aba de produtos está visível
            const productsContainer = document.getElementById('products-list');
            const productsTab = document.querySelector('[data-tab="products"]');
            
            if (productsContainer && productsTab) {
                // Verificar se a aba está ativa ou se o container está visível
                const isActive = productsTab.classList.contains('active') || 
                                 productsContainer.offsetParent !== null ||
                                 productsContainer.style.display !== 'none';
                
                if (isActive) {
                    console.log('Aba de produtos está ativa, carregando produtos...');
                    setTimeout(() => {
                        this.loadProducts();
                    }, 300);
                }
            }
        },

        /**
         * Configurar listener para quando a aba de produtos for aberta
         */
        setupTabListener() {
            const productsTab = document.querySelector('[data-tab="products"]');
            if (productsTab) {
                productsTab.addEventListener('click', () => {
                    // Aguardar um pouco para garantir que a aba foi aberta
                    setTimeout(() => {
                        const productsContainer = document.getElementById('products-list');
                        if (productsContainer && productsContainer.offsetParent !== null) {
                            // Sempre recarregar quando clicar na aba para garantir dados atualizados
                            console.log('Aba de produtos clicada, carregando produtos...');
                            this.loadProducts();
                        }
                    }, 100);
                });
            }
            
            // Usar MutationObserver para detectar quando a aba é ativada
            const tabContainer = document.querySelector('.sales-page-tabs') || document.querySelector('[data-tab]')?.parentElement;
            if (tabContainer) {
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach(mutation => {
                        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                            const target = mutation.target;
                            if (target.classList.contains('active') && target.dataset.tab === 'products') {
                                console.log('Aba de produtos detectada como ativa via MutationObserver');
                                setTimeout(() => {
                                    this.loadProducts();
                                }, 200);
                            }
                        }
                    });
                });
                observer.observe(tabContainer, {
                    attributes: true,
                    attributeFilter: ['class'],
                    subtree: true
                });
            }
        },

        /**
         * Configurar event listeners
         */
        setupEventListeners() {
            // Botão adicionar produto
            const btnAddProduct = document.getElementById('btn-add-product');
            const btnAddFirstProduct = document.getElementById('btn-add-first-product');
            
            if (btnAddProduct) {
                btnAddProduct.addEventListener('click', () => this.openProductModal());
            }
            if (btnAddFirstProduct) {
                btnAddFirstProduct.addEventListener('click', () => this.openProductModal());
            }
            
            // Controles de visualização
            this.setupViewControls();
            
            // Filtros por badge
            this.setupBadgeFilters();

            // Modal de produto
            const modal = document.getElementById('product-modal');
            const modalClose = document.getElementById('product-modal-close');
            const modalCancel = document.getElementById('product-modal-cancel');
            const modalSave = document.getElementById('product-modal-save');

            if (modalClose) {
                modalClose.addEventListener('click', () => this.closeProductModal());
            }
            if (modalCancel) {
                modalCancel.addEventListener('click', () => this.closeProductModal());
            }
            if (modalSave) {
                modalSave.addEventListener('click', () => this.saveProduct());
            }

            // Fechar modal ao clicar fora
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.closeProductModal();
                    }
                });
            }
        },

        /**
         * Carregar apenas a contagem de produtos (mais rápido)
         */
        async loadProductsCount() {
            const salesPageId = window.SALES_PAGE_EDIT_DATA?.salesPageId;
            if (!salesPageId) {
                console.warn('Sales Page ID não disponível para carregar contagem');
                return;
            }

            try {
                const API_URL = String(window.API_URL || window.API_BASE || (window.API_CONFIG && window.API_CONFIG.baseURL) || window.location.origin).replace(/\/$/, '');
                                const response = await fetch(`${API_URL}/api/v1/sales-pages/${salesPageId}/products`, {
                    credentials: 'include',
                    headers: productAuthHeaders()
                });

                if (!response.ok) {
                    console.warn('Erro ao carregar contagem de produtos');
                    return;
                }

                const data = await response.json();
                
                // Determinar quantidade de produtos
                let productCount = 0;
                if (data.success && data.data && data.data.products) {
                    productCount = data.data.products.length;
                } else if (data.data && Array.isArray(data.data)) {
                    productCount = data.data.length;
                } else if (Array.isArray(data)) {
                    productCount = data.length;
                }
                
                // Atualizar badge sem carregar todos os produtos
                this.updateProductsCount(productCount);
                console.log('Contagem de produtos atualizada:', productCount);
            } catch (error) {
                console.error('Erro ao carregar contagem de produtos:', error);
            }
        },

        /**
         * Carregar produtos
         */
        async loadProducts() {
            const salesPageId = window.SALES_PAGE_EDIT_DATA?.salesPageId;
            if (!salesPageId) {
                console.warn('Sales Page ID não disponível');
                return;
            }

            try {
                const API_URL = String(window.API_URL || window.API_BASE || (window.API_CONFIG && window.API_CONFIG.baseURL) || window.location.origin).replace(/\/$/, '');
                                const response = await fetch(`${API_URL}/api/v1/sales-pages/${salesPageId}/products`, {
                    credentials: 'include',
                    headers: productAuthHeaders()
                });

                if (!response.ok) {
                    throw new Error('Erro ao carregar produtos');
                }

                const data = await response.json();
                console.log('Produtos recebidos da API:', data);
                
                // A API retorna { success: true, data: { products: [...] } }
                if (data.success && data.data && data.data.products) {
                    this.products = data.data.products;
                } else if (data.data && Array.isArray(data.data)) {
                    this.products = data.data;
                } else if (Array.isArray(data)) {
                    this.products = data;
                } else {
                    this.products = [];
                }
                
                console.log('Produtos processados:', this.products.length, 'produtos');
                this.renderProducts();
                this.updateProductsCount();

            } catch (error) {
                console.error('Erro ao carregar produtos:', error);
                alert('Erro ao carregar produtos. Tente novamente.');
            }
        },

        /**
         * Renderizar lista de produtos
         */
        renderProducts() {
            const container = document.getElementById('products-list');
            if (!container) return;

            // Obter filtro ativo
            const activeFilter = container.dataset.filter || 'all';

            // Filtrar produtos por badge
            let filteredProducts = [...this.products];
            if (activeFilter !== 'all') {
                filteredProducts = filteredProducts.filter(product => {
                    if (!product.badge) {
                        // Se não tem badge mas é featured e o filtro é destaque
                        return activeFilter === 'destaque' && product.is_featured;
                    }
                    // Verificar se o badge contém o filtro (pode ser múltiplos separados por vírgula)
                    const badges = product.badge.split(',').map(b => b.trim());
                    return badges.includes(activeFilter);
                });
            }

            if (filteredProducts.length === 0) {
                const emptyState = document.getElementById('products-empty-state');
                if (emptyState) {
                    emptyState.style.display = 'none';
                }
                if (this.products.length === 0) {
                    container.innerHTML = '<div class="empty-state" id="products-empty-state"><i class="fas fa-box-open"></i><p>Nenhum produto cadastrado ainda.</p><button class="btn-primary" id="btn-add-first-product"><i class="fas fa-plus"></i> Adicionar Primeiro Produto</button></div>';
                    const btnAddFirst = document.getElementById('btn-add-first-product');
                    if (btnAddFirst) {
                        btnAddFirst.addEventListener('click', () => this.openProductModal());
                    }
                } else {
                    container.innerHTML = '<div class="empty-state"><i class="fas fa-filter"></i><p>Nenhum produto encontrado nesta categoria.</p></div>';
                }
                return;
            }

            // Ordenar por display_order
            const sortedProducts = filteredProducts.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
            
            // Armazenar sortedProducts para uso nos botões de reordenação
            this.sortedProducts = sortedProducts;

            container.innerHTML = sortedProducts.map(product => this.renderProductCard(product, sortedProducts)).join('');

            // Configurar drag and drop (reordenação)
            this.setupSortable();

            // Adicionar event listeners aos botões
            this.attachProductEventListeners();
        },

        /**
         * Renderizar card de produto
         */
        renderProductCard(product, sortedProducts = null) {
            // Se sortedProducts não foi fornecido, usar o armazenado
            if (!sortedProducts) {
                sortedProducts = this.sortedProducts || [];
            }
            const statusClass = this.getStatusClass(product.status);
            const statusLabel = this.getStatusLabel(product.status);
            // Processar badges (pode ser string única ou múltiplos separados por vírgula)
            let badges = [];
            if (product.badge) {
                badges = product.badge.split(',').map(b => b.trim()).filter(b => b);
            }
            // Se não tem badge mas é featured, adicionar destaque
            if (badges.length === 0 && product.is_featured) {
                badges.push('destaque');
            }
            
            const badgeLabels = {
                'oferta': 'Oferta',
                'destaque': 'Destaque',
                'novo': 'Novidade'
            };
            
            const badgeHtml = badges.length > 0 
                ? `<div class="product-badges-container-edit">${badges.map(badgeValue => {
                    const badgeLabel = badgeLabels[badgeValue.toLowerCase()] || badgeValue;
                    return `<span class="product-badge-badge badge-${badgeValue.toLowerCase()}">${badgeLabel}</span>`;
                }).join('')}</div>` 
                : '';
            const featuredHtml = ''; // Removido pois agora usa badge
            // Garantir que compare_price e price sejam números
            const comparePrice = product.compare_price ? parseFloat(product.compare_price) : null;
            const price = parseFloat(product.price) || 0;
            const comparePriceHtml = comparePrice && comparePrice > price 
                ? `<span class="product-compare-price">R$ ${comparePrice.toFixed(2).replace('.', ',')}</span>` 
                : '';

            // Encontrar índice do produto na lista ordenada
            const productIndex = sortedProducts.findIndex(p => p.id === product.id);
            const isFirst = productIndex === 0;
            const isLast = productIndex === sortedProducts.length - 1;

            return `
                <div class="product-card-edit" data-product-id="${product.id}" style="position: relative; cursor: default;">
                    <div class="product-drag-handle" style="position: absolute; top: 8px; right: 8px; color: #999; cursor: move; z-index: 10; padding: 6px 8px; opacity: 0.6; transition: opacity 0.2s; background: rgba(0,0,0,0.05); border-radius: 4px; pointer-events: auto;" onmouseover="this.style.opacity='1'; this.style.background='rgba(0,0,0,0.1)'" onmouseout="this.style.opacity='0.6'; this.style.background='rgba(0,0,0,0.05)'" title="Arrastar para reordenar">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <div class="product-card-image">
                        ${product.image_url 
                            ? `<img src="${this.escapeAttrUrl(product.image_url)}" alt="${this.escapeHtml(product.name || '')}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiMxQzFDMjEiLz48dGV4dCB4PSIxMDAiIHk9IjEwNSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzk5OTk5OSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0Ij5TZW0gSW1hZ2VtPC90ZXh0Pjwvc3ZnPg=='">`
                            : '<div class="product-card-placeholder"><i class="fas fa-image"></i></div>'
                        }
                        ${featuredHtml}
                    </div>
                    <div class="product-card-info">
                        <h3 class="product-card-name">${this.escapeHtml(product.name)}</h3>
                        ${product.description ? `<p class="product-card-description">${this.escapeHtml(product.description.substring(0, 100))}${product.description.length > 100 ? '...' : ''}</p>` : ''}
                        <div class="product-card-price">
                            ${comparePriceHtml}
                            <span class="product-card-current-price">R$ ${price.toFixed(2).replace('.', ',')}</span>
                        </div>
                        <div class="product-card-status">
                            <span class="status-badge ${statusClass}">${statusLabel}</span>
                        </div>
                        ${badgeHtml}
                        <div class="product-card-actions">
                            <div class="reorder-buttons" style="display: flex; gap: 4px; margin-right: 8px;">
                                <button class="btn-icon" title="Mover para cima" data-action="move-up" data-product-id="${product.id}" style="opacity: ${sortedProducts.indexOf(product) === 0 ? '0.3' : '1'}; cursor: ${sortedProducts.indexOf(product) === 0 ? 'not-allowed' : 'pointer'};">
                                    <i class="fas fa-arrow-up"></i>
                                </button>
                                <button class="btn-icon" title="Mover para baixo" data-action="move-down" data-product-id="${product.id}" style="opacity: ${sortedProducts.indexOf(product) === sortedProducts.length - 1 ? '0.3' : '1'}; cursor: ${sortedProducts.indexOf(product) === sortedProducts.length - 1 ? 'not-allowed' : 'pointer'};">
                                    <i class="fas fa-arrow-down"></i>
                                </button>
                            </div>
                            <button class="btn-icon" title="Editar" data-action="edit" data-product-id="${product.id}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon" title="${product.status === 'PAUSED' ? 'Ativar' : 'Pausar'}" data-action="toggle-status" data-product-id="${product.id}">
                                <i class="fas fa-${product.status === 'PAUSED' ? 'play' : 'pause'}"></i>
                            </button>
                            <button class="btn-icon btn-icon-danger" title="Deletar" data-action="delete" data-product-id="${product.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        },

        /**
         * Configurar drag and drop para reordenação
         */
        setupSortable() {
            const container = document.getElementById('products-list');
            if (!container || !window.Sortable) return;

            if (this.sortable) {
                this.sortable.destroy();
                this.sortable = null;
            }

            // Verificar se é mobile
            const isMobile = window.innerWidth <= 768;
            
            // NO MOBILE: Desabilitar completamente o Sortable para evitar conflito com scroll
            if (isMobile) {
                console.log('Sortable desabilitado no mobile para evitar conflito com scroll');
                return;
            }
            
            // Configuração do Sortable apenas para desktop
            const sortableConfig = {
                animation: 150,
                delay: 50,
                delayOnTouchStart: true,
                touchStartThreshold: 10,
                forceFallback: false,
                fallbackOnBody: false,
                swapThreshold: 0.65,
                // Filtrar elementos que não devem iniciar drag (botões de ação, mas não o handle)
                filter: '.btn-icon:not(.product-drag-handle), .product-card-actions, button:not(.product-drag-handle), a, input, select, textarea',
                preventOnFilter: true,
                handle: '.product-drag-handle', // Usar apenas o handle para iniciar drag
                draggable: '.product-card-edit', // Especificar que os cards são arrastáveis
                ghostClass: 'sortable-ghost', // Classe CSS para o elemento fantasma durante drag
                chosenClass: 'sortable-chosen', // Classe CSS quando o elemento é escolhido
                dragClass: 'sortable-drag', // Classe CSS durante o arraste
                onStart: (evt) => {
                    // Adicionar classe para indicar que está sendo arrastado
                    evt.item.classList.add('dragging');
                },
                onEnd: (evt) => {
                    // Remover classe
                    evt.item.classList.remove('dragging');
                    // Só reordenar se realmente mudou de posição
                    if (evt.oldIndex !== undefined && evt.newIndex !== undefined && 
                        evt.oldIndex !== evt.newIndex && evt.oldIndex !== null && evt.newIndex !== null) {
                        this.reorderProducts(evt.oldIndex, evt.newIndex);
                    }
                }
            };

            this.sortable = new Sortable(container, sortableConfig);
            console.log('Sortable configurado com sucesso');
        },

        /**
         * Mover produto para cima ou para baixo
         */
        async moveProduct(productId, direction) {
            const salesPageId = window.SALES_PAGE_EDIT_DATA?.salesPageId;
            if (!salesPageId) {
                console.warn('SalesPageId não disponível para mover produto');
                return;
            }

            // Validar que há produtos
            if (!this.products || this.products.length === 0) {
                console.warn('Nenhum produto disponível para mover');
                return;
            }

            // Obter lista ordenada atual
            const sortedProducts = [...this.products].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
            
            // Encontrar índice do produto
            const currentIndex = sortedProducts.findIndex(p => p.id === productId);
            if (currentIndex === -1) {
                console.warn('Produto não encontrado para mover');
                return;
            }

            // Calcular novo índice
            let newIndex;
            if (direction === 'up') {
                if (currentIndex === 0) return; // Já está no topo
                newIndex = currentIndex - 1;
            } else if (direction === 'down') {
                if (currentIndex === sortedProducts.length - 1) return; // Já está no final
                newIndex = currentIndex + 1;
            } else {
                console.warn('Direção inválida:', direction);
                return;
            }

            // Mover produto
            const movedProduct = sortedProducts[currentIndex];
            sortedProducts.splice(currentIndex, 1);
            sortedProducts.splice(newIndex, 0, movedProduct);

            // Atualizar display_order
            const productOrders = sortedProducts.map((product, index) => ({
                id: product.id,
                display_order: index
            }));

            console.log('Y"" Movendo produto:', { productId, direction, productOrders });

            try {
                const API_URL = String(window.API_URL || window.API_BASE || (window.API_CONFIG && window.API_CONFIG.baseURL) || window.location.origin).replace(/\/$/, '');
                                const response = await fetch(`${API_URL}/api/v1/sales-pages/${salesPageId}/products/reorder`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: productAuthHeaders(),
                    body: JSON.stringify({ productOrders: productOrders })
                });

                if (!response.ok) {
                    let errorMessage = 'Erro ao mover produto';
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.error || errorData.message || errorMessage;
                        console.error('O Erro do servidor:', errorData);
                    } catch (e) {
                        errorMessage = `Erro ${response.status}: ${response.statusText}`;
                    }
                    throw new Error(errorMessage);
                }

                const responseData = await response.json().catch(() => ({}));
                console.log('Produto movido com sucesso:', responseData);

                // Atualizar lista local
                this.products = sortedProducts.map((product, index) => ({
                    ...product,
                    display_order: index
                }));

                // Re-renderizar produtos
                this.renderProducts();

            } catch (error) {
                console.error('Erro ao mover produto:', error);
                alert('Erro ao mover produto. Tente novamente.');
                // Recarregar produtos para garantir sincronização
                this.loadProducts();
            }
        },

        /**
         * Reordenar produtos
         */
        async reorderProducts(oldIndex, newIndex) {
            // BLOQUEAR REORDENA—fO NO MOBILE - nunca permitir no mobile
            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
                console.log('Reordenação bloqueada no mobile - scroll deve funcionar normalmente');
                return;
            }

            // Validar índices
            if (oldIndex === undefined || newIndex === undefined || 
                oldIndex === null || newIndex === null ||
                oldIndex < 0 || newIndex < 0) {
                console.warn('Índices inválidos para reordenação:', { oldIndex, newIndex });
                return;
            }

            const salesPageId = window.SALES_PAGE_EDIT_DATA?.salesPageId;
            if (!salesPageId) {
                console.warn('SalesPageId não disponível para reordenação');
                return;
            }

            // Validar que há produtos
            if (!this.products || this.products.length === 0) {
                console.warn('Nenhum produto disponível para reordenar');
                return;
            }

            // Atualizar display_order localmente
            const sortedProducts = [...this.products].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
            
            // Validar índices dentro do range
            if (oldIndex >= sortedProducts.length || newIndex >= sortedProducts.length) {
                console.warn('Índices fora do range:', { oldIndex, newIndex, length: sortedProducts.length });
                return;
            }

            const movedProduct = sortedProducts[oldIndex];
            sortedProducts.splice(oldIndex, 1);
            sortedProducts.splice(newIndex, 0, movedProduct);

            // Atualizar display_order
            const productOrders = sortedProducts.map((product, index) => ({
                id: product.id,
                display_order: index
            }));

            // Validar que há produtos para reordenar
            if (!productOrders || productOrders.length === 0) {
                console.warn('Nenhum produto para reordenar');
                return;
            }

            console.log('Y"" Reordenando produtos:', productOrders);

            try {
                const API_URL = String(window.API_URL || window.API_BASE || (window.API_CONFIG && window.API_CONFIG.baseURL) || window.location.origin).replace(/\/$/, '');
                                const response = await fetch(`${API_URL}/api/v1/sales-pages/${salesPageId}/products/reorder`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: productAuthHeaders(),
                    body: JSON.stringify({ productOrders: productOrders })
                });

                if (!response.ok) {
                    let errorMessage = 'Erro ao reordenar produtos';
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.error || errorData.message || errorMessage;
                        console.error('O Erro do servidor:', errorData);
                    } catch (e) {
                        errorMessage = `Erro ${response.status}: ${response.statusText}`;
                    }
                    throw new Error(errorMessage);
                }

                const responseData = await response.json().catch(() => ({}));
                console.log('Produtos reordenados com sucesso:', responseData);

                // Atualizar lista local
                this.products = sortedProducts.map((product, index) => ({
                    ...product,
                    display_order: index
                }));

            } catch (error) {
                console.error('Erro ao reordenar produtos:', error);
                // No mobile, nunca mostrar erro de reordenação (não deve acontecer)
                const isMobile = window.innerWidth <= 768;
                if (isMobile) {
                    console.log('Erro de reordenação ignorado no mobile');
                    return;
                }
                // Só mostrar alerta se não for erro de validação silenciosa
                if (!error.message.includes('não disponível') && !error.message.includes('inválidos')) {
                    alert('Erro ao reordenar produtos. Tente novamente.');
                }
                // Recarregar produtos para garantir sincronização
                this.loadProducts();
            }
        },

        /**
         * Adicionar event listeners aos botões dos produtos
         */
        attachProductEventListeners() {
            const container = document.getElementById('products-list');
            if (!container) return;

            // NO MOBILE: Garantir que eventos de touch nas imagens permitam scroll
            const isMobile = window.innerWidth <= 768;
            if (isMobile) {
                // Permitir scroll normal nas imagens dos produtos
                container.addEventListener('touchstart', (e) => {
                    // Se o toque for em uma imagem, permitir scroll
                    if (e.target.tagName === 'IMG' || e.target.closest('.product-card-image')) {
                        // Não fazer nada - permitir scroll normal
                        return;
                    }
                }, { passive: true });

                // Garantir que scroll funcione normalmente
                container.addEventListener('touchmove', (e) => {
                    // Se estiver fazendo scroll vertical, não interferir
                    if (e.target.tagName === 'IMG' || e.target.closest('.product-card-image')) {
                        // Permitir scroll - não prevenir default
                        return;
                    }
                }, { passive: true });
            }

            // Usar debounce para evitar múltiplos cliques rápidos
            let lastClickTime = {};
            const DEBOUNCE_TIME = 500; // 500ms entre cliques

            container.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-action]');
                if (!btn) return;

                const action = btn.dataset.action;
                const productId = parseInt(btn.dataset.productId);

                // Debounce para toggle-status
                if (action === 'toggle-status') {
                    const now = Date.now();
                    const lastClick = lastClickTime[productId] || 0;
                    
                    if (now - lastClick < DEBOUNCE_TIME) {
                        e.preventDefault();
                        e.stopPropagation();
                        return; // Ignorar clique muito rápido
                    }
                    
                    lastClickTime[productId] = now;
                }

                switch (action) {
                    case 'edit':
                        this.editProduct(productId);
                        break;
                    case 'toggle-status':
                        e.preventDefault();
                        e.stopPropagation();
                        this.toggleProductStatus(productId);
                        break;
                    case 'delete':
                        this.deleteProduct(productId);
                        break;
                    case 'move-up':
                        e.preventDefault();
                        e.stopPropagation();
                        this.moveProduct(productId, 'up');
                        break;
                    case 'move-down':
                        e.preventDefault();
                        e.stopPropagation();
                        this.moveProduct(productId, 'down');
                        break;
                }
            });
        },

        /**
         * Abrir modal de produto (novo ou editar)
         */
        async openProductModal(productId = null) {
            const modal = document.getElementById('product-modal');
            const modalTitle = document.getElementById('product-modal-title');
            const modalBody = document.getElementById('product-modal-body');
            const modalSave = document.getElementById('product-modal-save');

            if (!modal || !modalBody) return;

            this.currentProduct = productId ? this.products.find(p => p.id === productId) : null;

            // Verificar limite de 50 produtos
            // Verificar limite de 50 produtos apenas ao criar novo produto
            if (!this.currentProduct && this.products.length >= 50) {
                if (window.DashboardModals) {
                    await window.DashboardModals.alert({
                        title: 'Limite Atingido',
                        message: 'Você atingiu o limite de 50 produtos. Remova alguns produtos para adicionar novos.'
                    });
                } else {
                    alert('Limite de 50 produtos atingido. Remova produtos para adicionar novos.');
                }
                return;
            }

            if (modalTitle) {
                modalTitle.textContent = this.currentProduct ? 'Editar Produto' : 'Adicionar Produto';
            }

            // Renderizar formulário
            modalBody.innerHTML = this.renderProductForm(this.currentProduct);

            // Abrir modal
            modal.classList.add('active');

            // Configurar upload de imagem
            this.setupImageUpload();
            
            // Configurar formatação de preço
            this.setupPriceFormatting();
            
            // Configurar sugestões de descrição
            this.setupDescriptionSuggestions();
            
            // Configurar sugestões de nome
            this.setupNameSuggestions();

            // Configurar toggle de preço de comparação
            this.setupComparePriceToggle();
        },

        /**
         * Fechar modal de produto
         */
        closeProductModal() {
            const modal = document.getElementById('product-modal');
            if (modal) {
                modal.classList.remove('active');
            }
            this.currentProduct = null;
        },

        /**
         * Renderizar formulário de produto
         */
        renderProductForm(product = null) {
            return `
                <div class="product-form">
                    <div class="form-group">
                        <label for="product-name">Nome do Produto *</label>
                        <div class="suggestions-container" id="product-name-container">
                            <input type="text" id="product-name" class="form-input" value="${product ? this.escapeHtml(product.name) : ''}" required>
                            <div class="suggestions-buttons-group">
                                <button type="button" class="btn-suggestions" id="btn-product-name-suggestions">
                                    <i class="fas fa-magic"></i> Gerar Sugestão
                                </button>
                                <button type="button" class="btn-more-suggestions" id="btn-more-product-name" style="display: none;">
                                    <i class="fas fa-sync-alt"></i> Mais Sugestões
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="product-description">Descrição</label>
                        <div class="description-suggestions-container">
                            <div class="suggestions-container">
                                <textarea id="product-description" class="form-textarea" rows="3" placeholder="Digite a descrição do produto...">${product ? this.escapeHtml(product.description || '') : ''}</textarea>
                                <div class="suggestions-buttons-group">
                                    <button type="button" class="btn-suggestions" id="btn-show-suggestions">
                                        <i class="fas fa-magic"></i> Gerar Sugestão
                                    </button>
                                    <button type="button" class="btn-more-suggestions" id="btn-more-suggestions" style="display: none;">
                                        <i class="fas fa-sync-alt"></i> Mais Sugestões
                                    </button>
                                </div>
                            </div>
                            <div class="description-suggestions" id="description-suggestions" style="display: none;">
                                <div class="suggestions-header">
                                    <i class="fas fa-lightbulb"></i> Sugestões de Descrição
                                    <button type="button" class="btn-close-suggestions" id="btn-close-suggestions">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                                <div class="suggestions-list" id="suggestions-list"></div>
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem;">
                            <label for="product-price" style="margin: 0; flex-shrink: 0;">Preço *</label>
                            <label for="enable-compare-price" class="compare-price-toggle-label-inline">
                                <input type="checkbox" id="enable-compare-price" ${product && product.compare_price ? 'checked' : ''}>
                                <span>Adicionar Preço de Comparação</span>
                            </label>
                        </div>
                        <input type="text" id="product-price" class="form-input price-input" placeholder="R$ 0,00" value="${product ? this.formatPrice(product.price) : ''}" required>
                        <small class="form-help">Digite o preço (ex: 99,90 ou 99.90)</small>
                        
                        <div id="compare-price-container" style="${product && product.compare_price ? '' : 'display: none;'}" class="compare-price-field-container">
                            <label for="product-compare-price" style="margin-top: 1rem; margin-bottom: 0.5rem; display: block;">Preço de Comparação</label>
                            <input type="text" id="product-compare-price" class="form-input price-input" placeholder="R$ 0,00" value="${product && product.compare_price ? this.formatPrice(product.compare_price) : ''}">
                            <small class="form-help">Preço original (para mostrar desconto)</small>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="product-stock">Estoque</label>
                            <input type="number" id="product-stock" class="form-input" min="0" value="${product ? (product.stock !== null ? product.stock : '') : ''}">
                            <small class="form-help">Deixe vazio para sem limite</small>
                        </div>
                        <div class="form-group">
                            <label>Badges</label>
                            <div class="badges-checkboxes">
                                ${(() => {
                                    // Processar badges existentes (pode ser string única ou múltiplos separados por vírgula)
                                    let existingBadges = [];
                                    if (product && product.badge) {
                                        existingBadges = product.badge.split(',').map(b => b.trim()).filter(b => b);
                                    }
                                    return `
                                        <label class="badge-checkbox-label">
                                            <input type="checkbox" class="badge-checkbox" value="oferta" ${existingBadges.includes('oferta') ? 'checked' : ''}>
                                            <span class="badge-checkbox-text">Oferta</span>
                                        </label>
                                        <label class="badge-checkbox-label">
                                            <input type="checkbox" class="badge-checkbox" value="destaque" ${existingBadges.includes('destaque') ? 'checked' : ''}>
                                            <span class="badge-checkbox-text">Destaque</span>
                                        </label>
                                        <label class="badge-checkbox-label">
                                            <input type="checkbox" class="badge-checkbox" value="novo" ${existingBadges.includes('novo') ? 'checked' : ''}>
                                            <span class="badge-checkbox-text">Novidade</span>
                                        </label>
                                    `;
                                })()}
                            </div>
                            <small class="form-help">Selecione um ou mais badges para o produto</small>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="product-youtube-video">Link do vídeo (YouTube)</label>
                        <input type="url" id="product-youtube-video" class="form-input" placeholder="https://www.youtube.com/watch?v=..." value="${product && product.youtube_video_url ? this.escapeHtml(product.youtube_video_url) : ''}">
                        <small class="form-help">Opcional. Cole o link do vídeo do YouTube. Se preenchido, o botão "Veja o vídeo para mais explicação" aparecerá no produto.</small>
                    </div>

                    <div class="form-group">
                        <label>Imagens do Produto *</label>
                        <div class="images-upload-container">
                            <div class="images-preview-grid" id="product-images-preview">
                                ${(() => {
                                    const images = [];
                                    if (product && product.image_url) {
                                        images.push(product.image_url);
                                    }
                                    // Adicionar imagens adicionais de variations
                                    if (product && product.variations && product.variations.images) {
                                        images.push(...product.variations.images);
                                    }
                                    return images.map(imgUrl => `
                                        <div class="image-preview-item" data-image-url="${imgUrl}">
                                            <img src="${imgUrl}" alt="Preview" onerror="this.style.display='none'">
                                            <button type="button" class="btn-remove-image" data-image-url="${imgUrl}">
                                                <i class="fas fa-times"></i>
                                            </button>
                                        </div>
                                    `).join('');
                                })()}
                            </div>
                            <button type="button" class="btn-upload-multiple" id="btn-upload-product-images">
                                <i class="fas fa-plus"></i> Adicionar Imagem
                            </button>
                            <small class="form-help">Você pode adicionar múltiplas imagens. A primeira será a imagem principal.</small>
                        </div>
                    </div>
                </div>
            `;
        },

        /**
         * Obter imagens do produto (array)
         */
        getProductImages() {
            const previewGrid = document.getElementById('product-images-preview');
            if (!previewGrid) return [];
            
            const images = [];
            previewGrid.querySelectorAll('.image-preview-item').forEach(item => {
                const imgUrl = item.dataset.imageUrl;
                if (imgUrl) {
                    images.push(imgUrl);
                }
            });
            return images;
        },

        /**
         * Adicionar imagem ao preview
         */
        addImageToPreview(imageUrl) {
            const previewGrid = document.getElementById('product-images-preview');
            if (!previewGrid) return;
            
            // Verificar se a imagem já existe
            const exists = previewGrid.querySelector(`[data-image-url="${imageUrl}"]`);
            if (exists) return;
            
            const imageItem = document.createElement('div');
            imageItem.className = 'image-preview-item';
            imageItem.dataset.imageUrl = imageUrl;
            imageItem.innerHTML = `
                <img src="${imageUrl}" alt="Preview" onerror="this.style.display='none'">
                <button type="button" class="btn-remove-image" data-image-url="${imageUrl}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            previewGrid.appendChild(imageItem);
            
            // Adicionar listener ao botão de remover
            const removeBtn = imageItem.querySelector('.btn-remove-image');
            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    imageItem.remove();
                });
            }
        },

        /**
         * Configurar upload de múltiplas imagens
         */
        setupImageUpload() {
            const uploadBtn = document.getElementById('btn-upload-product-images');
            const previewGrid = document.getElementById('product-images-preview');
            
            if (!uploadBtn || !previewGrid) return;

            // Remover listeners anteriores para evitar duplicação
            const newUploadBtn = uploadBtn.cloneNode(true);
            uploadBtn.parentNode.replaceChild(newUploadBtn, uploadBtn);
            
            newUploadBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Criar input file temporário
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.multiple = true; // Permitir múltiplas seleções
                input.style.position = 'fixed';
                input.style.left = '-9999px';
                input.style.opacity = '0';
                document.body.appendChild(input);
                
                input.onchange = async (e) => {
                        const files = Array.from(e.target.files);
                        if (files.length === 0) return;

                        const UPLOAD_MAX_MB = 15;
                        const UPLOAD_MAX_BYTES = UPLOAD_MAX_MB * 1024 * 1024;
                        const tooBig = files.filter(f => f.size > UPLOAD_MAX_BYTES);
                        if (tooBig.length > 0) {
                            const names = tooBig.map(f => f.name + ' (' + (f.size / 1024 / 1024).toFixed(1) + ' MB)').join(', ');
                            alert('O tamanho máximo permitido é ' + UPLOAD_MAX_MB + ' MB por imagem. As seguintes excedem o limite: ' + names + '. Redimensione ou escolha outras.');
                            return;
                        }

                        try {
                            uploadBtn.disabled = true;
                            uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

                                                        const API_URL = String(window.API_URL || window.API_BASE || (window.API_CONFIG && window.API_CONFIG.baseURL) || window.location.origin).replace(/\/$/, '');
                            
                            // Obter URL de upload do Cloudflare
                            const authResponse = await fetch(`${API_URL}/api/upload/auth`, {
                                method: 'POST',
                                credentials: 'include',
                                headers: productAuthHeaders()
                            });

                            if (!authResponse.ok) {
                                throw new Error('Erro ao obter URL de upload');
                            }

                            const { uploadURL } = await authResponse.json();
                            const accountHash = "MBdqwyqeFtFBvKiQjgzjtQ";

                            // Fazer upload de todas as imagens
                            for (const file of files) {
                                const formData = new FormData();
                                const isPNG = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
                                const fileName = isPNG ? `product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.png` : `product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
                                formData.append('file', file, fileName);

                                const uploadResponse = await fetch(uploadURL, {
                                    method: 'POST',
                                    body: formData,
                                    headers: (() => {
                                        const t = productAuthToken();
                                        return t ? { 'Authorization': 'Bearer ' + t } : {};
                                    })()
                                });

                                if (!uploadResponse.ok) {
                                    const errBody = await uploadResponse.json().catch(() => ({}));
                                    console.error('Falha no upload de:', file.name, errBody.message || uploadResponse.status);
                                    if (uploadResponse.status === 413) {
                                        alert(errBody.message || 'O tamanho máximo permitido é 15 MB por imagem.');
                                        break;
                                    }
                                    continue;
                                }

                                const uploadData = await uploadResponse.json();
                                const finalUrl = uploadData.url || uploadData.imageUrl ||
                                    (uploadData.result && uploadData.result.id ? `https://imagedelivery.net/${accountHash}/${uploadData.result.id}/public` : null);
                                if (finalUrl) {
                                    this.addImageToPreview(finalUrl);
                                }
                            }

                            uploadBtn.disabled = false;
                            uploadBtn.innerHTML = '<i class="fas fa-plus"></i> Adicionar Imagem';

                        } catch (error) {
                            console.error('Erro no upload:', error);
                            alert(error.message || 'Erro ao fazer upload das imagens. Tente novamente.');
                            newUploadBtn.disabled = false;
                            newUploadBtn.innerHTML = '<i class="fas fa-plus"></i> Adicionar Imagem';
                        } finally {
                            // Remover input após uso
                            setTimeout(() => {
                                if (input.parentNode) {
                                    input.parentNode.removeChild(input);
                                }
                            }, 100);
                        }
                    };
                    
                    // Trigger click no mobile
                    setTimeout(() => {
                        input.click();
                    }, 100);
                });

            // Adicionar listeners aos botões de remover existentes
            if (previewGrid) {
                previewGrid.querySelectorAll('.btn-remove-image').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const item = btn.closest('.image-preview-item');
                        if (item) {
                            item.remove();
                        }
                    });
                });
            }
        },

        /**
         * Salvar produto
         */
        async saveProduct() {
            const salesPageId = window.SALES_PAGE_EDIT_DATA?.salesPageId;
            if (!salesPageId) {
                alert('Erro: ID da página não encontrado');
                return;
            }

            // Validar campos obrigatórios
            const name = document.getElementById('product-name')?.value.trim();
            const priceInput = document.getElementById('product-price')?.value.trim();
            const price = this.parsePrice(priceInput);

            if (!name || !price || price <= 0) {
                alert('Preencha nome e preço válidos');
                return;
            }

            // Coletar dados do formulário - verificar se o toggle está ativado
            const enableComparePrice = document.getElementById('enable-compare-price')?.checked || false;
            let comparePrice = null;
            
            if (enableComparePrice) {
                const comparePriceInput = document.getElementById('product-compare-price')?.value.trim();
                comparePrice = comparePriceInput ? this.parsePrice(comparePriceInput) : null;
                
                // Validar compare_price se fornecido
                if (comparePrice !== null && !isNaN(comparePrice)) {
                    if (comparePrice <= 0) {
                        alert('O preço de comparação deve ser maior que zero.');
                        return;
                    }
                    if (comparePrice <= price) {
                        alert('O preço de comparação deve ser maior que o preço atual.');
                        return;
                    }
                } else if (enableComparePrice) {
                    // Se o toggle está ativado mas não há valor válido, alertar
                    alert('Por favor, preencha um preço de comparação válido ou desative a opção.');
                    return;
                }
            }
            
            // Obter imagens (array)
            const images = this.getProductImages();
            if (images.length === 0) {
                alert('Adicione pelo menos uma imagem ao produto');
                return;
            }
            
            // A primeira imagem é a principal (image_url)
            // As demais ficam em variations.images
            const image_url = images[0];
            const additionalImages = images.slice(1);
            
            // Preparar variations com imagens adicionais
            let variations = null;
            if (additionalImages.length > 0) {
                variations = {
                    images: additionalImages
                };
            }

            // Coletar badges selecionados (checkboxes)
            const badgeCheckboxes = document.querySelectorAll('.badge-checkbox:checked');
            const selectedBadges = Array.from(badgeCheckboxes).map(cb => cb.value);
            const badge = selectedBadges.length > 0 ? selectedBadges.join(',') : null;
            // Se tiver destaque selecionado, também marcar como featured
            const is_featured = selectedBadges.includes('destaque') || false;

            const youtubeVideoEl = document.getElementById('product-youtube-video');
            const youtube_video_url = youtubeVideoEl?.value?.trim() || null;

            const productData = {
                name,
                description: document.getElementById('product-description')?.value.trim() || null,
                price,
                compare_price: comparePrice,
                stock: document.getElementById('product-stock')?.value ? parseInt(document.getElementById('product-stock').value) : null,
                badge: badge,
                is_featured: is_featured,
                image_url: image_url,
                variations: variations,
                youtube_video_url: youtube_video_url
            };

            try {
                const API_URL = String(window.API_URL || window.API_BASE || (window.API_CONFIG && window.API_CONFIG.baseURL) || window.location.origin).replace(/\/$/, '');
                                
                const url = this.currentProduct
                    ? `${API_URL}/api/v1/sales-pages/products/${this.currentProduct.id}`
                    : `${API_URL}/api/v1/sales-pages/${salesPageId}/products`;

                const method = this.currentProduct ? 'PUT' : 'POST';

                const response = await fetch(url, {
                    method,
                    credentials: 'include',
                    headers: productAuthHeaders(),
                    body: JSON.stringify(productData)
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error?.message || 'Erro ao salvar produto');
                }

                // Recarregar produtos
                await this.loadProducts();
                this.closeProductModal();

            } catch (error) {
                console.error('Erro ao salvar produto:', error);
                alert(error.message || 'Erro ao salvar produto. Tente novamente.');
            }
        },

        /**
         * Editar produto
         */
        editProduct(productId) {
            this.openProductModal(productId);
        },

        /**
         * Alternar status do produto (pausar/ativar)
         */
        async toggleProductStatus(productId) {
            // Encontrar o botão e desabilitar para evitar múltiplos cliques
            const btn = document.querySelector(`[data-action="toggle-status"][data-product-id="${productId}"]`);
            if (btn) {
                // Verificar se já está processando
                if (btn.disabled || btn.dataset.processing === 'true') {
                    console.log('Requisição já em andamento para produto', productId);
                    return;
                }
                btn.disabled = true;
                btn.dataset.processing = 'true';
            }

            // Buscar produto atualizado do backend antes de tentar alterar status
            // Isso garante que temos o status correto
            let product = this.products.find(p => p.id === productId);
            if (!product) {
                console.error('Produto não encontrado localmente:', productId);
                // Tentar recarregar produtos
                await this.loadProducts();
                product = this.products.find(p => p.id === productId);
                if (!product) {
                    console.error('Produto não encontrado após recarregar:', productId);
                    if (btn) {
                        btn.disabled = false;
                        btn.dataset.processing = 'false';
                    }
                    alert('Produto não encontrado. Recarregue a página.');
                    return;
                }
            }

            // Determinar novo status baseado no status atual
            // Transições permitidas conforme backend:
            // ACTIVE -> PAUSED, OUT_OF_STOCK, ARCHIVED
            // PAUSED -> ACTIVE, ARCHIVED
            // OUT_OF_STOCK -> ACTIVE, ARCHIVED
            // ARCHIVED -> (nenhuma transição permitida)
            let newStatus;
            const currentStatus = product.status;
            
            if (currentStatus === 'PAUSED') {
                newStatus = 'ACTIVE';
            } else if (currentStatus === 'ACTIVE') {
                newStatus = 'PAUSED';
            } else if (currentStatus === 'OUT_OF_STOCK') {
                // Se estiver sem estoque, ativar
                newStatus = 'ACTIVE';
            } else if (currentStatus === 'ARCHIVED') {
                // Se estiver arquivado, não permitir toggle
                if (btn) {
                    btn.disabled = false;
                    btn.dataset.processing = 'false';
                }
                alert('Não é possível alterar o status de um produto arquivado. Altere o status manualmente para "Rascunho" primeiro.');
                return;
            } else {
                // Status desconhecido, tentar ativar (assumindo que está pausado ou sem estoque)
                console.warn(`Status desconhecido: ${currentStatus}, tentando ativar...`);
                newStatus = 'ACTIVE';
            }

            // Verificar se a transição é válida (evitar mudança para o mesmo status)
            if (currentStatus === newStatus) {
                console.warn(`Produto já está com status ${newStatus}. Recarregando produtos...`);
                if (btn) {
                    btn.disabled = false;
                    btn.dataset.processing = 'false';
                }
                await this.loadProducts();
                return;
            }

            // Validar transição antes de fazer requisição
            const validTransitions = {
                'ACTIVE': ['PAUSED', 'OUT_OF_STOCK', 'ARCHIVED'],
                'PAUSED': ['ACTIVE', 'ARCHIVED'],
                'OUT_OF_STOCK': ['ACTIVE', 'ARCHIVED'],
                'ARCHIVED': []
            };

            const allowedTransitions = validTransitions[currentStatus] || [];
            if (!allowedTransitions.includes(newStatus)) {
                console.error(`Transição inválida: ${currentStatus} -> ${newStatus}. Permitidas: ${allowedTransitions.join(', ')}`);
                if (btn) {
                    btn.disabled = false;
                    btn.dataset.processing = 'false';
                }
                alert(`Não é possível alterar o status de ${currentStatus} para ${newStatus}. Transições permitidas: ${allowedTransitions.join(', ')}`);
                // Recarregar produtos para garantir sincronização
                await this.loadProducts();
                return;
            }

            try {
                const API_URL = String(window.API_URL || window.API_BASE || (window.API_CONFIG && window.API_CONFIG.baseURL) || window.location.origin).replace(/\/$/, '');
                                const response = await fetch(`${API_URL}/api/v1/sales-pages/products/${productId}/status`, {
                    method: 'PATCH',
                    credentials: 'include',
                    headers: productAuthHeaders(),
                    body: JSON.stringify({ status: newStatus })
                });

                if (!response.ok) {
                    let errorMessage = 'Erro ao alterar status do produto';
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.error || errorData.message || errorMessage;
                        // Se o erro contém detalhes sobre transição inválida, mostrar mensagem mais clara
                        if (errorData.error && errorData.error.includes('transicionar')) {
                            errorMessage = errorData.error;
                        }
                    } catch (e) {
                        // Se não conseguir parsear JSON, usar mensagem padrão
                        errorMessage = `Erro ${response.status}: ${response.statusText}`;
                    }
                    throw new Error(errorMessage);
                }

                const responseData = await response.json().catch(() => ({}));
                console.log('Status alterado com sucesso:', responseData);

                // Recarregar produtos para garantir sincronização
                await this.loadProducts();

            } catch (error) {
                console.error('Erro ao alterar status:', error);
                const errorMessage = error.message || 'Erro desconhecido ao alterar status do produto';
                
                // Sempre recarregar produtos para garantir sincronização
                await this.loadProducts();
                
                // Mostrar mensagem de erro apropriada
                if (errorMessage.includes('transicionar') || errorMessage.includes('Transições permitidas')) {
                    // Erro de transição - já validamos antes, mas pode ter mudado no backend
                    console.warn('Erro de transição inválida detectado:', errorMessage);
                    alert(`Não foi possível alterar o status. O produto pode ter sido alterado por outra sessão. Recarregando...`);
                } else if (errorMessage.includes('400') || errorMessage.includes('Bad Request')) {
                    // Erro 400 - geralmente é problema de validação
                    alert(`Erro ao alterar status: ${errorMessage}\n\nRecarregando produtos...`);
                } else {
                    // Outro erro
                    alert(`Erro ao alterar status do produto:\n${errorMessage}\n\nRecarregando produtos...`);
                }
            } finally {
                // Reabilitar botão após a requisição
                if (btn) {
                    btn.disabled = false;
                    btn.dataset.processing = 'false';
                }
            }
        },

        /**
         * Deletar produto
         */
        async deleteProduct(productId) {
            const product = this.products.find(p => p.id === productId);
            if (!product) return;

            if (!confirm(`Tem certeza que deseja deletar o produto "${product.name}"?`)) {
                return;
            }

            try {
                const API_URL = String(window.API_URL || window.API_BASE || (window.API_CONFIG && window.API_CONFIG.baseURL) || window.location.origin).replace(/\/$/, '');
                                const response = await fetch(`${API_URL}/api/v1/sales-pages/products/${productId}`, {
                    method: 'DELETE',
                    credentials: 'include',
                    headers: productAuthHeaders()
                });

                if (!response.ok) {
                    throw new Error('Erro ao deletar produto');
                }

                // Recarregar produtos
                await this.loadProducts();

            } catch (error) {
                console.error('Erro ao deletar produto:', error);
                alert('Erro ao deletar produto. Tente novamente.');
            }
        },

        /**
         * Atualizar contador de produtos
         */
        updateProductsCount(count = null) {
            // Se não fornecido, usar o tamanho do array de produtos
            const productCount = count !== null ? count : this.products.length;
            const countElements = document.querySelectorAll('#products-count, #products-count-badge');
            countElements.forEach(el => {
                if (el) {
                    el.textContent = productCount;
                    // Garantir que o badge seja visível se houver produtos
                    if (productCount > 0 && el.id === 'products-count-badge') {
                        el.style.display = '';
                        el.style.visibility = 'visible';
                    }
                }
            });
            console.log('Badge de produtos atualizado:', productCount);
        },

        /**
         * Configurar filtros por badge
         */
        setupBadgeFilters() {
            const filterTabs = document.querySelectorAll('.filter-tab');
            const productsList = document.getElementById('products-list');
            
            if (!filterTabs.length || !productsList) return;
            
            filterTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    const filter = tab.dataset.filter;
                    
                    // Atualizar botões ativos
                    filterTabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    
                    // Atualizar filtro
                    productsList.setAttribute('data-filter', filter);
                    
                    // Re-renderizar produtos
                    this.renderProducts();
                });
            });
        },

        /**
         * Configurar controles de visualização
         */
        setupViewControls() {
            const productsList = document.getElementById('products-list');
            const viewModeButtons = document.querySelectorAll('.view-btn-edit');
            const sizeButtons = document.querySelectorAll('.size-btn-edit');

            if (!productsList) return;

            // Carregar preferências do localStorage
            const savedViewMode = localStorage.getItem('sales_page_products_view_mode') || 'grid';
            const savedCardSize = localStorage.getItem('sales_page_products_card_size') || 'small';

            // Aplicar preferências salvas
            productsList.setAttribute('data-view-mode', savedViewMode);
            productsList.setAttribute('data-card-size', savedCardSize);

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

            // Event listeners para modo de visualização
            viewModeButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const mode = btn.dataset.mode;
                    
                    // Atualizar botões
                    viewModeButtons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    // Atualizar lista
                    productsList.setAttribute('data-view-mode', mode);
                    localStorage.setItem('sales_page_products_view_mode', mode);
                });
            });

            // Event listeners para tamanho
            sizeButtons.forEach(btn => {
                btn.addEventListener('click', () => {
                    const size = btn.dataset.size;
                    
                    // Atualizar botões
                    sizeButtons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    
                    // Atualizar lista
                    productsList.setAttribute('data-card-size', size);
                    localStorage.setItem('sales_page_products_card_size', size);
                });
            });
        },

        /**
         * Obter classe CSS para status
         */
        getStatusClass(status) {
            const classes = {
                'ACTIVE': 'status-active',
                'PAUSED': 'status-paused',
                'OUT_OF_STOCK': 'status-out-of-stock',
                'ARCHIVED': 'status-archived'
            };
            return classes[status] || 'status-default';
        },

        /**
         * Obter label para status
         */
        getStatusLabel(status) {
            const labels = {
                'ACTIVE': 'Ativo',
                'PAUSED': 'Pausado',
                'OUT_OF_STOCK': 'Sem Estoque',
                'ARCHIVED': 'Arquivado'
            };
            return labels[status] || status;
        },

        /**
         * Formatar preço para exibição (R$ 0,00)
         */
        formatPrice(value) {
            if (!value) return '';
            const num = parseFloat(value);
            if (isNaN(num)) return '';
            return num.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        },

        /**
         * Converter preço formatado para número
         */
        parsePrice(value) {
            if (!value) return null;
            // Remove R$, espaços e converte vírgula para ponto
            const cleaned = value.toString().replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.').trim();
            const num = parseFloat(cleaned);
            return isNaN(num) ? null : num;
        },

        /**
         * Configurar toggle de preço de comparação
         */
        setupComparePriceToggle() {
            const toggleCheckbox = document.getElementById('enable-compare-price');
            const comparePriceContainer = document.getElementById('compare-price-container');
            const comparePriceInput = document.getElementById('product-compare-price');

            if (toggleCheckbox && comparePriceContainer) {
                toggleCheckbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        comparePriceContainer.style.display = 'block';
                        // Focar no input após mostrar
                        setTimeout(() => {
                            if (comparePriceInput) {
                                comparePriceInput.focus();
                            }
                        }, 100);
                    } else {
                        comparePriceContainer.style.display = 'none';
                        // Limpar valor quando desativado
                        if (comparePriceInput) {
                            comparePriceInput.value = '';
                        }
                    }
                });
            }
        },

        /**
         * Configurar formatação de preço
         */
        setupPriceFormatting() {
            const priceInputs = document.querySelectorAll('.price-input');
            
            priceInputs.forEach(input => {
                // Formatar ao perder foco
                input.addEventListener('blur', (e) => {
                    const value = this.parsePrice(e.target.value);
                    if (value !== null && value > 0) {
                        e.target.value = `R$ ${this.formatPrice(value)}`;
                    }
                });
                
                // Formatar enquanto digita (ex: 1999 -> 19,99)
                input.addEventListener('input', (e) => {
                    let value = e.target.value.replace(/[^\d]/g, ''); // Remove tudo exceto dígitos
                    if (value.length === 0) {
                        e.target.value = '';
                        return;
                    }
                    // Converte para número e formata com 2 casas decimais
                    const num = parseFloat(value) / 100;
                    e.target.value = num.toFixed(2).replace('.', ',');
                });
                
                // Permitir Enter para salvar
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        const saveBtn = document.getElementById('product-modal-save');
                        if (saveBtn) {
                            saveBtn.click();
                        }
                    }
                });
            });
        },

        /**
         * Gerar sugestões de descrição baseadas no nome do produto
         */
        generateDescriptionSuggestions(productName) {
            if (!productName || productName.trim().length < 3) return [];
            
            const name = productName.toLowerCase();
            const suggestions = [];
            
            // Templates de descrição baseados em palavras-chave
            const templates = {
                'pacote': [
                    `Este ${productName} inclui tudo que você precisa para ter resultados incríveis.`,
                    `Pacote completo com os melhores recursos para você alcançar seus objetivos.`,
                    `Aproveite este ${productName} com condições especiais e benefícios exclusivos.`
                ],
                'fotografia': [
                    `Serviço profissional de ${productName} com qualidade garantida e entrega rápida.`,
                    `Capture momentos especiais com nosso ${productName} de alta qualidade.`,
                    `${productName} profissional com equipamentos modernos e equipe experiente.`
                ],
                'curso': [
                    `Aprenda tudo sobre ${productName} com conteúdo completo e suporte especializado.`,
                    `Curso completo de ${productName} com certificado e materiais exclusivos.`,
                    `Desenvolva suas habilidades com nosso ${productName} prático e objetivo.`
                ],
                'consultoria': [
                    `Consultoria especializada em ${productName} para alavancar seus resultados.`,
                    `Receba orientação profissional com nosso ${productName} personalizado.`,
                    `${productName} com estratégias comprovadas para o seu sucesso.`
                ],
                'serviço': [
                    `Serviço completo de ${productName} com qualidade e agilidade.`,
                    `Contrate nosso ${productName} e tenha a melhor experiência.`,
                    `${productName} profissional com garantia de satisfação.`
                ]
            };
            
            // Buscar templates relevantes
            for (const [keyword, templateList] of Object.entries(templates)) {
                if (name.includes(keyword)) {
                    suggestions.push(...templateList.map(t => t.replace(/\$\{productName\}/g, productName)));
                }
            }
            
            // Se não encontrou templates específicos, usar genéricos
            if (suggestions.length === 0) {
                suggestions.push(
                    `${productName} de alta qualidade com os melhores recursos disponíveis.`,
                    `Aproveite este ${productName} com condições especiais e benefícios exclusivos.`,
                    `Produto cuidadosamente selecionado para atender suas necessidades.`
                );
            }
            
            return suggestions.slice(0, 3); // Retornar até 3 sugestões
        },

        /**
         * Configurar sugestões de nome do produto
         */
        setupNameSuggestions() {
            const btnNameSuggestions = document.getElementById('btn-product-name-suggestions');
            const btnMoreNameSuggestions = document.getElementById('btn-more-product-name');
            const nameInput = document.getElementById('product-name');
            
            let productNameSuggestions = [];
            let productNameIndex = 0;
            
            if (btnNameSuggestions && nameInput) {
                btnNameSuggestions.addEventListener('click', async () => {
                    const currentName = nameInput.value.trim();
                    window.SuggestionModal.show({
                        title: 'Gerar Nome do Produto',
                        message: 'Digite algumas palavras sobre o produto para gerar um nome mais atraente:',
                        placeholder: 'Ex: câmera profissional, curso de fotografia',
                        defaultValue: currentName,
                        onConfirm: async (prompt) => {
                            try {
                                                                const API_URL = String(window.API_URL || window.API_BASE || (window.API_CONFIG && window.API_CONFIG.baseURL) || window.location.origin).replace(/\/$/, '');
                                
                                const response = await fetch(`${API_URL}/api/suggestions/generate`, {
                                    method: 'POST',
                                    credentials: 'include',
                                    headers: productAuthHeaders(),
                                    body: JSON.stringify({
                                        type: 'product_name',
                                        prompt: prompt,
                                        context: {}
                                    })
                                });
                                
                                if (response.ok) {
                                    const data = await response.json();
                                    if (data.success && data.suggestions && data.suggestions.length > 0) {
                                        productNameSuggestions = data.suggestions;
                                    } else {
                                        productNameSuggestions = [window.TextSuggestions.generateProductName(prompt)];
                                    }
                                } else if (response.status === 404) {
                                    // Endpoint não encontrado - usar sugestões locais
                                    console.log('Usando sugestões locais (servidor precisa ser reiniciado)');
                                    productNameSuggestions = [window.TextSuggestions.generateProductName(prompt)];
                                } else {
                                    productNameSuggestions = [window.TextSuggestions.generateProductName(prompt)];
                                }
                            } catch (error) {
                                // Erro de rede - usar sugestões locais silenciosamente
                                console.log('Usando sugestões locais (backend não disponível)');
                                productNameSuggestions = [window.TextSuggestions.generateProductName(prompt)];
                            }
                            
                            productNameIndex = 0;
                            if (productNameSuggestions.length > 0) {
                                nameInput.value = productNameSuggestions[0];
                                if (productNameSuggestions.length > 1 && btnMoreNameSuggestions) {
                                    btnMoreNameSuggestions.style.display = 'inline-flex';
                                }
                            }
                        }
                    });
                });
            }
            
            if (btnMoreNameSuggestions) {
                btnMoreNameSuggestions.addEventListener('click', () => {
                    if (productNameSuggestions.length > 0) {
                        productNameIndex = (productNameIndex + 1) % productNameSuggestions.length;
                        nameInput.value = productNameSuggestions[productNameIndex];
                    }
                });
            }
        },

        /**
         * Configurar sugestões de descrição
         */
        setupDescriptionSuggestions() {
            const nameInput = document.getElementById('product-name');
            const descriptionTextarea = document.getElementById('product-description');
            const suggestionsContainer = document.getElementById('description-suggestions');
            const suggestionsList = document.getElementById('suggestions-list');
            const btnShowSuggestions = document.getElementById('btn-show-suggestions');
            const btnMoreSuggestions = document.getElementById('btn-more-suggestions');
            const btnCloseSuggestions = document.getElementById('btn-close-suggestions');
            
            if (!nameInput || !descriptionTextarea || !suggestionsContainer) return;
            
            let currentSuggestions = [];
            let currentIndex = 0;
            
            // Função para buscar sugestões do backend
            const fetchSuggestions = async (name, prompt = '') => {
                try {
                                        const API_URL = String(window.API_URL || window.API_BASE || (window.API_CONFIG && window.API_CONFIG.baseURL) || window.location.origin).replace(/\/$/, '');
                    
                    const response = await fetch(`${API_URL}/api/suggestions/generate`, {
                        method: 'POST',
                        credentials: 'include',
                        headers: productAuthHeaders(),
                        body: JSON.stringify({
                            type: 'product_description',
                            prompt: prompt || name,
                            context: { productName: name }
                        })
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        if (data.success && data.suggestions) {
                            return data.suggestions;
                        }
                    }
                } catch (error) {
                    console.warn('Erro ao buscar sugestões do backend, usando sugestões locais:', error);
                }
                
                // Fallback: usar sugestões locais
                return [window.TextSuggestions.generateProductDescription(name, prompt)];
            };
            
            // Função para aplicar sugestão
            const applySuggestion = (suggestion) => {
                if (suggestion) {
                    descriptionTextarea.value = suggestion;
                    // Mostrar botão "Mais Sugestões" se houver múltiplas sugestões
                    if (currentSuggestions.length > 1) {
                        btnMoreSuggestions.style.display = 'inline-flex';
                    }
                }
            };
            
            // Gerar primeira sugestão
            btnShowSuggestions?.addEventListener('click', async () => {
                const name = nameInput.value.trim();
                
                // Se não tiver nome, pedir para digitar
                if (name.length < 2) {
                    window.SuggestionModal.show({
                        title: 'Gerar Descrição do Produto',
                        message: 'Digite o nome do produto primeiro:',
                        placeholder: 'Ex: Câmera Profissional, Curso de Fotografia',
                        onConfirm: async (productName) => {
                            nameInput.value = productName;
                            currentSuggestions = await fetchSuggestions(productName);
                            currentIndex = 0;
                            if (currentSuggestions.length > 0) {
                                applySuggestion(currentSuggestions[0]);
                            }
                        }
                    });
                    return;
                }
                
                // Se já tiver nome, pedir palavras-chave adicionais (opcional)
                window.SuggestionModal.show({
                    title: 'Gerar Descrição do Produto',
                    message: `Produto: "${name}"\n\nDigite palavras-chave adicionais para melhorar a descrição (opcional):`,
                    placeholder: 'Ex: qualidade premium, design moderno, alta performance',
                    defaultValue: name,
                    onConfirm: async (prompt) => {
                        currentSuggestions = await fetchSuggestions(name, prompt);
                        currentIndex = 0;
                        if (currentSuggestions.length > 0) {
                            applySuggestion(currentSuggestions[0]);
                        }
                    },
                    onCancel: async () => {
                        currentSuggestions = await fetchSuggestions(name);
                        currentIndex = 0;
                        if (currentSuggestions.length > 0) {
                            applySuggestion(currentSuggestions[0]);
                        }
                    }
                });
            });
            
            // Botão "Mais Sugestões" - ciclar entre sugestões
            btnMoreSuggestions?.addEventListener('click', () => {
                if (currentSuggestions.length > 0) {
                    currentIndex = (currentIndex + 1) % currentSuggestions.length;
                    applySuggestion(currentSuggestions[currentIndex]);
                }
            });
            
            // Fechar sugestões
            btnCloseSuggestions?.addEventListener('click', () => {
                suggestionsContainer.style.display = 'none';
            });
        },

        /**
         * Escape URL for use in HTML attributes (blocks javascript: etc.)
         */
        escapeAttrUrl(url) {
            const u = String(url || '').trim();
            if (!u) return '';
            if (/^(https?:\/\/|\/|data:image\/)/i.test(u)) {
                return String(u).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
            }
            return '';
        },

        /**
         * Escape HTML
         */
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    };

    // Inicializar quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => DashboardProducts.init());
    } else {
        DashboardProducts.init();
    }

    // Exportar para escopo global
    window.DashboardProducts = DashboardProducts;

})();

