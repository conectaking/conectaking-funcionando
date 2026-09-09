/**
 * Dashboard Analytics - Visualização de Analytics e Funil de Vendas
 * Funcionalidades: Métricas, funil de vendas, ranking de produtos
 */

(function() {
    'use strict';

    const DashboardAnalytics = {
        currentPeriod: '30',
        analyticsData: null,

        /**
         * Inicialização
         */
        init() {
            this.setupEventListeners();
        },

        /**
         * Configurar event listeners
         */
        setupEventListeners() {
            const periodSelect = document.getElementById('analytics-period');
            if (periodSelect) {
                periodSelect.addEventListener('change', (e) => {
                    this.currentPeriod = e.target.value;
                    this.loadAnalytics();
                });
            }

            const btnRefresh = document.getElementById('btn-refresh-preview');
            if (btnRefresh) {
                btnRefresh.addEventListener('click', () => {
                    if (window.DashboardSalesPage) {
                        window.DashboardSalesPage.updatePreview();
                    }
                });
            }
        },

        /**
         * Carregar analytics
         */
        async loadAnalytics() {
            const salesPageId = window.SALES_PAGE_EDIT_DATA?.salesPageId;
            if (!salesPageId) {
                console.warn('Sales Page ID não disponível');
                return;
            }

            try {
                // Carregar analytics geral
                await Promise.all([
                    this.loadGeneralAnalytics(salesPageId),
                    this.loadSalesFunnel(salesPageId),
                    this.loadProductRanking(salesPageId)
                ]);

            } catch (error) {
                console.error('Erro ao carregar analytics:', error);
            }
        },

        /**
         * Carregar analytics geral
         */
        async loadGeneralAnalytics(salesPageId) {
            try {
                const API_URL = 'https://www.conectaking.com.br';
                const token = localStorage.getItem('conectaKingToken') || localStorage.getItem('token');
                const response = await fetch(`${API_URL}/api/v1/sales-pages/analytics/${salesPageId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Erro ao carregar analytics');
                }

                const data = await response.json();
                this.analyticsData = data.data;

                // Atualizar métricas
                this.updateMetrics(this.analyticsData);

            } catch (error) {
                console.error('Erro ao carregar analytics geral:', error);
            }
        },

        /**
         * Carregar funil de vendas
         */
        async loadSalesFunnel(salesPageId) {
            try {
                const API_URL = 'https://www.conectaking.com.br';
                const token = localStorage.getItem('conectaKingToken') || localStorage.getItem('token');
                const response = await fetch(`${API_URL}/api/v1/sales-pages/analytics/${salesPageId}/funnel`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Erro ao carregar funil de vendas');
                }

                const data = await response.json();
                this.updateFunnel(data.data);

            } catch (error) {
                console.error('Erro ao carregar funil:', error);
            }
        },

        /**
         * Carregar ranking de produtos
         */
        async loadProductRanking(salesPageId) {
            try {
                const API_URL = 'https://www.conectaking.com.br';
                const token = localStorage.getItem('conectaKingToken') || localStorage.getItem('token');
                const response = await fetch(`${API_URL}/api/v1/sales-pages/analytics/${salesPageId}/ranking`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    throw new Error('Erro ao carregar ranking de produtos');
                }

                const data = await response.json();
                this.updateProductRanking(data.data?.ranking || data.data);

            } catch (error) {
                console.error('Erro ao carregar ranking:', error);
            }
        },

        /**
         * Atualizar métricas gerais
         */
        updateMetrics(data) {
            if (!data) return;

            // A API retorna { counts: { page_view: 10, product_click: 5, ... }, events, total_events }
            const counts = data.counts || {};

            // Page views
            this.updateMetric('metric-page-views', counts.page_view || 0);

            // Product clicks
            this.updateMetric('metric-product-clicks', counts.product_click || 0);

            // Add to cart
            this.updateMetric('metric-add-to-cart', counts.add_to_cart || 0);

            // Checkout clicks
            this.updateMetric('metric-checkout-clicks', counts.checkout_click || 0);
        },

        /**
         * Atualizar métrica individual
         */
        updateMetric(elementId, value) {
            const element = document.getElementById(elementId);
            if (element) {
                // Animação de contagem
                this.animateValue(element, 0, value, 500);
            }
        },

        /**
         * Animação de contagem
         */
        animateValue(element, start, end, duration) {
            const startTime = performance.now();
            const range = end - start;

            const updateValue = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                const current = Math.floor(start + range * progress);
                element.textContent = this.formatNumber(current);

                if (progress < 1) {
                    requestAnimationFrame(updateValue);
                } else {
                    element.textContent = this.formatNumber(end);
                }
            };

            requestAnimationFrame(updateValue);
        },

        /**
         * Formatar número
         */
        formatNumber(num) {
            if (num >= 1000000) {
                return (num / 1000000).toFixed(1) + 'M';
            }
            if (num >= 1000) {
                return (num / 1000).toFixed(1) + 'k';
            }
            return num.toString();
        },

        /**
         * Atualizar funil de vendas
         */
        updateFunnel(funnelData) {
            if (!funnelData) return;

            // A API retorna { page_view: { count, percentage }, product_view: { count, percentage }, ... }
            const pageViews = funnelData.page_view?.count || 0;
            const productViews = funnelData.product_view?.count || 0;
            const productClicks = funnelData.product_click?.count || 0;
            const addToCart = funnelData.add_to_cart?.count || 0;
            const checkout = funnelData.checkout_click?.count || 0;

            const pageViewsPercent = 100;
            const productViewsPercent = parseFloat(funnelData.product_view?.percentage || 0);
            const productClicksPercent = parseFloat(funnelData.product_click?.percentage || 0);
            const addToCartPercent = parseFloat(funnelData.add_to_cart?.percentage || 0);
            const checkoutPercent = parseFloat(funnelData.checkout_click?.percentage || 0);

            // Atualizar valores
            this.updateFunnelStep('funnel-page-views', 'funnel-page-views-value', pageViews, pageViewsPercent);
            this.updateFunnelStep('funnel-product-views', 'funnel-product-views-value', productViews, productViewsPercent);
            this.updateFunnelStep('funnel-product-clicks', 'funnel-product-clicks-value', productClicks, productClicksPercent);
            this.updateFunnelStep('funnel-add-to-cart', 'funnel-add-to-cart-value', addToCart, addToCartPercent);
            this.updateFunnelStep('funnel-checkout', 'funnel-checkout-value', checkout, checkoutPercent);
        },

        /**
         * Atualizar passo do funil
         */
        updateFunnelStep(fillId, valueId, value, percentage) {
            const fillElement = document.getElementById(fillId);
            const valueElement = document.getElementById(valueId);

            if (fillElement) {
                fillElement.style.width = `${percentage}%`;
            }

            if (valueElement) {
                const percentText = percentage > 0 ? `<span class="funnel-percent">(${percentage.toFixed(1)}%)</span>` : '';
                valueElement.innerHTML = `${this.formatNumber(value)} ${percentText}`;
            }
        },

        /**
         * Atualizar ranking de produtos
         */
        updateProductRanking(rankingData) {
            const container = document.getElementById('products-ranking');
            if (!container) return;

            // A API retorna { ranking: [...] } ou array direto
            const rankingArray = rankingData?.ranking || rankingData || [];

            if (!rankingArray || rankingArray.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-chart-bar"></i>
                        <p>Nenhum dado de analytics disponível ainda.</p>
                    </div>
                `;
                return;
            }

            const ranking = rankingArray.map((product, index) => {
                const position = index + 1;
                const medalIcon = position === 1 ? '1º' : position === 2 ? '2º' : position === 3 ? '3º' : `${position}º`;
                
                // O backend retorna: { id, name, image_url, price, event_count }
                const eventCount = product.event_count || 0;
                
                return `
                    <div class="ranking-item">
                        <div class="ranking-position">${medalIcon}</div>
                        <div class="ranking-product-info">
                            <div class="ranking-product-name">${this.escapeHtml(product.name || 'Produto sem nome')}</div>
                            <div class="ranking-product-stats">
                                <span><i class="fas fa-chart-line"></i> ${eventCount} eventos</span>
                            </div>
                        </div>
                        <div class="ranking-conversion">
                            <div class="ranking-conversion-value">${eventCount}</div>
                            <div class="ranking-conversion-label">Eventos</div>
                        </div>
                    </div>
                `;
            }).join('');

            container.innerHTML = ranking;
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
        document.addEventListener('DOMContentLoaded', () => DashboardAnalytics.init());
    } else {
        DashboardAnalytics.init();
    }

    // Exportar para escopo global
    window.DashboardAnalytics = DashboardAnalytics;

})();

