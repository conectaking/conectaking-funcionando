/**
 * Função loadSubscriptionInfo recuperada do front-end antigo
 * Baseado em: dashboard.js linha 12597-12634
 * 
 * Esta função carrega informações da assinatura do usuário e renderiza os planos
 */

(function() {
    'use strict';

    console.log('🔧 Carregando função loadSubscriptionInfo...');

    // Variáveis globais necessárias
    let subscriptionData = null;
    let isAdmin = false;

    /**
     * Função para carregar informações de assinatura
     * Baseada no front-end antigo: dashboard.js linha 12597-12634
     */
    window.loadSubscriptionInfo = async function() {
        try {
            // Obter billingType do toggle ou usar 'monthly' como padrão
            const billingType = window.currentBillingType || 'monthly';
            
            // Detectar API_URL
            const API_URL = window.API_URL || 
                          (typeof API_URL !== 'undefined' ? API_URL : window.location.origin);
            
            // Obter token de autenticação
            const token = localStorage.getItem('conectaKingToken');
            const HEADERS_AUTH = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };
            
            // Usar safeFetch se disponível, senão usar fetch padrão
            const fetchFunction = window.safeFetch || fetch;
            
            // Usar billingType atual
            const response = await fetchFunction(`${API_URL}/api/subscription/info?billingType=${billingType}`, {
                method: 'GET',
                headers: HEADERS_AUTH,
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Erro ao carregar informações de assinatura');
            }
            
            subscriptionData = await response.json();
            isAdmin = subscriptionData.user?.isAdmin || false;
            
            // Renderizar informações da assinatura
            if (typeof window.renderSubscriptionInfo === 'function') {
                window.renderSubscriptionInfo();
            } else {
                renderSubscriptionInfo();
            }
            
            // Renderizar planos
            if (typeof window.renderSubscriptionPlans === 'function') {
                await window.renderSubscriptionPlans(billingType);
            } else if (typeof window.renderSubscriptionPlansWithBilling === 'function') {
                await window.renderSubscriptionPlansWithBilling(billingType);
            } else {
                await renderSubscriptionPlans(billingType);
            }
            
            // Se for admin, mostrar seção de edição
            const personalizarLinkLink = document.getElementById('personalizar-link-link');
            if (personalizarLinkLink && isAdmin) {
                personalizarLinkLink.style.display = 'block';
            }
            
            if (isAdmin) {
                const adminSection = document.getElementById('subscription-admin-section');
                if (adminSection) {
                    adminSection.style.display = 'block';
                }
                
                if (typeof window.loadPlansForEdit === 'function') {
                    window.loadPlansForEdit();
                }
            }
        } catch (error) {
            console.error('❌ Erro ao carregar informações de assinatura:', error);
            const infoContainer = document.getElementById('subscription-info');
            if (infoContainer) {
                infoContainer.innerHTML = `
                    <p style="color: #ff4444;">Erro ao carregar informações. Tente novamente.</p>
                `;
            }
        }
    };

    /**
     * Função para renderizar informações da assinatura atual
     * Baseada no front-end antigo: dashboard.js linha 12637-12698
     */
    function renderSubscriptionInfo() {
        const infoContainer = document.getElementById('subscription-info');
        if (!infoContainer || !subscriptionData) return;
        
        const user = subscriptionData.user;
        const currentPlan = subscriptionData.currentPlan;
        
        if (!user) {
            infoContainer.innerHTML = '<p>Nenhuma informação disponível.</p>';
            return;
        }
        
        const statusColors = {
            'active': '#4CAF50',
            'expired': '#ff4444',
            'expired_trial': '#ff9800',
            'pre_sale_trial': '#2196F3'
        };
        
        const statusText = {
            'active': 'Ativa',
            'expired': 'Expirada',
            'expired_trial': 'Trial Expirado',
            'pre_sale_trial': 'Trial Ativo'
        };
        
        const statusColor = statusColors[user.subscriptionStatus] || '#999';
        const statusLabel = statusText[user.subscriptionStatus] || user.subscriptionStatus;
        
        const expiresAt = user.subscriptionExpiresAt 
            ? new Date(user.subscriptionExpiresAt).toLocaleDateString('pt-BR')
            : 'Não definido';
        
        const createdAt = user.createdAt 
            ? new Date(user.createdAt).toLocaleDateString('pt-BR')
            : 'Não definido';
        
        infoContainer.innerHTML = `
            <div class="subscription-info-item">
                <label>Status:</label>
                <span style="color: ${statusColor}; font-weight: 600;">${statusLabel}</span>
            </div>
            <div class="subscription-info-item">
                <label>Plano Atual:</label>
                <span>${currentPlan ? currentPlan.plan_name : 'Nenhum plano ativo'}</span>
            </div>
            <div class="subscription-info-item">
                <label>Data de Assinatura:</label>
                <span>${createdAt}</span>
            </div>
            <div class="subscription-info-item">
                <label>Data de Expiração:</label>
                <span>${expiresAt}</span>
            </div>
            ${currentPlan ? `
            <div class="subscription-info-item">
                <label>Valor Mensal:</label>
                <span style="font-size: 1.2rem; font-weight: 600; color: var(--dourado-principal, #FFC700);">
                    R$ ${parseFloat(currentPlan.price).toFixed(2).replace('.', ',')}
                </span>
            </div>
            ` : ''}
        `;
    }

    /**
     * Função para renderizar planos disponíveis
     * Baseada no front-end antigo: dashboard.js linha 12798-12848
     */
    async function renderSubscriptionPlans(billingType = 'monthly') {
        if (!subscriptionData || !subscriptionData.availablePlans) {
            console.warn('⚠️ subscriptionData não disponível');
            return;
        }
        
        const plans = subscriptionData.availablePlans || [];
        
        // Enriquecer planos com informações de pagamento
        const enrichedPlans = plans.map(plan => {
            const basePrice = parseFloat(plan.price) || 0;
            let displayPrice = basePrice;
            
            if (billingType === 'monthly') {
                const annualWithIncrease = basePrice * 1.2;
                displayPrice = annualWithIncrease / 12;
            } else if (billingType === 'annual') {
                displayPrice = basePrice;
            }
            
            const installmentPrice = displayPrice * 1.2;
            const installmentValue = installmentPrice / 12;
            
            return {
                ...plan,
                billingType: billingType,
                displayPrice: displayPrice,
                paymentOptions: {
                    pix: {
                        method: 'PIX',
                        price: displayPrice,
                        label: 'Pix',
                        title: 'À vista no Pix',
                        description: 'Pagamento à vista via Pix'
                    },
                    installment: {
                        method: 'CARTÃO',
                        totalPrice: installmentPrice,
                        installmentValue: installmentValue,
                        installments: 12,
                        label: 'Até 12x',
                        title: 'Até 12 meses',
                        description: `Até 12x de R$ ${installmentValue.toFixed(2).replace('.', ',')}`
                    }
                }
            };
        });
        
        // Usar função compartilhada se disponível
        if (typeof window.renderPlansShared === 'function') {
            await window.renderPlansShared(enrichedPlans, 'subscription-plans-list', true, billingType);
        } else if (typeof window.renderPlanCardDashboard === 'function') {
            const container = document.getElementById('subscription-plans-list');
            if (container) {
                const plansWithModules = await Promise.all(enrichedPlans.map(async (plan) => {
                    const modules = typeof window.loadPlanModules === 'function' 
                        ? await window.loadPlanModules(plan.plan_code)
                        : { available: [], unavailable: [] };
                    return { ...plan, modules };
                }));
                
                container.innerHTML = plansWithModules.map(plan => 
                    window.renderPlanCardDashboard(plan, plan.modules, billingType)
                ).join('');
            }
        }
    }

    // Tornar subscriptionData acessível globalmente se necessário
    Object.defineProperty(window, 'subscriptionData', {
        get: () => subscriptionData,
        set: (value) => { subscriptionData = value; },
        configurable: true
    });

    console.log('✅ Função loadSubscriptionInfo carregada');

})();
