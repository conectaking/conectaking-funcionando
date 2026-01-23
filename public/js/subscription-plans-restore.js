/**
 * Restaurar módulo de assinatura com toggle mensal/anual
 * Baseado no front-end antigo: dashboard.html e dashboard.js
 */

(function() {
    'use strict';

    console.log('🔧 Restaurando módulo de assinatura com toggle mensal/anual...');

    // Variável global para billingType
    window.currentBillingType = window.currentBillingType || 'monthly';

    /**
     * Função para alternar entre Mensal e Anual
     * Baseado em: dashboard.js linha 13132
     */
    window.switchBillingTypeDashboard = function(type) {
        window.currentBillingType = type;
        
        // Atualizar visual dos botões
        const monthlyBtn = document.getElementById('billing-monthly-dashboard');
        const annualBtn = document.getElementById('billing-annual-dashboard');
        
        if (monthlyBtn && annualBtn) {
            if (type === 'monthly') {
                monthlyBtn.classList.add('active');
                monthlyBtn.style.background = 'var(--yellow-primary, #FFC700)';
                monthlyBtn.style.color = 'var(--black-absolute, #000)';
                annualBtn.classList.remove('active');
                annualBtn.style.background = 'transparent';
                annualBtn.style.color = 'var(--white, #FFFFFF)';
            } else {
                monthlyBtn.classList.remove('active');
                monthlyBtn.style.background = 'transparent';
                monthlyBtn.style.color = 'var(--white, #FFFFFF)';
                annualBtn.classList.add('active');
                annualBtn.style.background = 'var(--yellow-primary, #FFC700)';
                annualBtn.style.color = 'var(--black-absolute, #000)';
            }
        }
        
        // Recarregar planos com novo billingType
        if (typeof loadSubscriptionInfo === 'function') {
            loadSubscriptionInfo();
        } else if (typeof window.loadSubscriptionInfo === 'function') {
            window.loadSubscriptionInfo();
        } else if (typeof renderSubscriptionPlans === 'function') {
            renderSubscriptionPlans(type);
        } else if (typeof window.renderSubscriptionPlans === 'function') {
            window.renderSubscriptionPlans(type);
        }
    };

    /**
     * Criar toggle mensal/anual se não existir
     * Baseado em: dashboard.html linha 758-766
     */
    function createBillingToggle() {
        // Verificar se já existe
        const existingToggle = document.querySelector('.billing-toggle-container, [id*="billing-toggle"]');
        if (existingToggle) {
            console.log('✅ Toggle mensal/anual já existe');
            return;
        }

        // Procurar container de planos
        const plansContainer = document.getElementById('subscription-plans-list');
        if (!plansContainer) {
            console.warn('⚠️ Container de planos não encontrado');
            return;
        }

        // Criar toggle
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'billing-toggle-container';
        toggleContainer.style.cssText = 'display: flex; justify-content: center; margin-bottom: 30px;';
        
        const toggle = document.createElement('div');
        toggle.className = 'billing-toggle';
        toggle.style.cssText = 'display: inline-flex; background: rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 4px; border: 1px solid rgba(255, 199, 0, 0.3);';
        
        const monthlyBtn = document.createElement('button');
        monthlyBtn.id = 'billing-monthly-dashboard';
        monthlyBtn.className = 'billing-toggle-btn active';
        monthlyBtn.textContent = 'Mês';
        monthlyBtn.onclick = () => window.switchBillingTypeDashboard('monthly');
        monthlyBtn.style.cssText = 'padding: 12px 24px; border: none; border-radius: 8px; background: var(--yellow-primary, #FFC700); color: var(--black-absolute, #000); font-weight: 600; cursor: pointer; transition: all 0.3s;';
        
        const annualBtn = document.createElement('button');
        annualBtn.id = 'billing-annual-dashboard';
        annualBtn.className = 'billing-toggle-btn';
        annualBtn.textContent = 'Ano';
        annualBtn.onclick = () => window.switchBillingTypeDashboard('annual');
        annualBtn.style.cssText = 'padding: 12px 24px; border: none; border-radius: 8px; background: transparent; color: var(--white, #FFFFFF); font-weight: 600; cursor: pointer; transition: all 0.3s;';
        
        toggle.appendChild(monthlyBtn);
        toggle.appendChild(annualBtn);
        toggleContainer.appendChild(toggle);
        
        // Inserir antes do container de planos
        plansContainer.parentNode.insertBefore(toggleContainer, plansContainer);
        
        console.log('✅ Toggle mensal/anual criado');
    }

    /**
     * Função para renderizar planos com billingType
     * Baseado em: dashboard.js linha 12798-12848
     */
    window.renderSubscriptionPlansWithBilling = async function(billingType = 'monthly') {
        try {
            // Buscar planos da API
            const response = await fetch('/api/subscription/plans-public', {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Erro ao buscar planos');
            }

            const data = await response.json();
            const plans = data.plans || [];

            // Enriquecer planos com informações de pagamento
            // Valores mensais fixos conforme especificação do usuário
            const monthlyValues = {
                'basic': 70.00,              // King Start: R$ 70,00/mês
                'premium': 100.00,           // King Prime: R$ 100,00/mês
                'king_base': 150.00,        // King Essential/Alta: R$ 150,00/mês
                'king_finance': 120.00,      // King Finance: proporcional
                'king_finance_plus': 140.00, // King Finance Plus: proporcional
                'king_premium_plus': 150.00, // King Premium Plus: R$ 150,00/mês
                'king_corporate': 150.00     // King Corporate: R$ 150,00/mês
            };
            
            // Valores anuais (com 20% de desconto aplicado)
            // Fórmula: (valor_mensal * 12) * 0.8 = valor_anual_com_desconto
            const annualValues = {
                'basic': (70 * 12) * 0.8,              // King Start: R$ 672,00/ano (R$ 70 * 12 * 0.8)
                'premium': (100 * 12) * 0.8,           // King Prime: R$ 960,00/ano (R$ 100 * 12 * 0.8)
                'king_base': (150 * 12) * 0.8,        // King Essential: R$ 1.440,00/ano (R$ 150 * 12 * 0.8)
                'king_finance': (120 * 12) * 0.8,      // King Finance: R$ 1.152,00/ano
                'king_finance_plus': (140 * 12) * 0.8, // King Finance Plus: R$ 1.344,00/ano
                'king_premium_plus': (150 * 12) * 0.8, // King Premium Plus: R$ 1.440,00/ano
                'king_corporate': (150 * 12) * 0.8     // King Corporate: R$ 1.440,00/ano
            };

            const enrichedPlans = plans.map(plan => {
                const planCode = plan.plan_code;
                const monthlyPrice = monthlyValues[planCode] || 0;
                const annualPrice = annualValues[planCode] || 0;
                
                let displayPrice;
                if (billingType === 'monthly') {
                    // Valor mensal fixo conforme especificação
                    displayPrice = monthlyPrice;
                } else {
                    // Valor anual com 20% de desconto
                    displayPrice = annualPrice;
                }
                
                // Valor total para parcelamento em 12x (apenas no modo mensal)
                const totalForInstallments = monthlyPrice * 12;
                const installmentValue = monthlyPrice;
                
                // King Start: apenas PIX (sem cartão)
                if (planCode === 'basic') {
                    return {
                        ...plan,
                        billingType: billingType,
                        displayPrice: displayPrice,
                        monthlyPrice: monthlyPrice,
                        annualPrice: annualPrice,
                        paymentOptions: {
                            pix: {
                                method: 'PIX',
                                price: displayPrice,
                                label: billingType === 'annual' ? 'no Pix' : 'Pix',
                                title: billingType === 'annual' ? 'no Pix' : 'À vista no Pix',
                                description: billingType === 'monthly'
                                    ? `R$ ${displayPrice.toFixed(2).replace('.', ',')} por mês`
                                    : `R$ ${displayPrice.toFixed(2).replace('.', ',')} no Pix`
                            }
                        }
                    };
                } else {
                    // Outros planos: PIX + Cartão 12x (apenas no modo mensal)
                    const paymentOptions = {
                        pix: {
                            method: 'PIX',
                            price: displayPrice,
                            label: billingType === 'annual' ? 'no Pix' : 'Pix',
                            title: billingType === 'annual' ? 'no Pix' : 'À vista no Pix',
                            description: billingType === 'monthly'
                                ? `R$ ${displayPrice.toFixed(2).replace('.', ',')} por mês`
                                : `R$ ${displayPrice.toFixed(2).replace('.', ',')} no Pix`
                        }
                    };
                    
                    // Adicionar opção de cartão apenas no modo mensal
                    if (billingType === 'monthly') {
                        paymentOptions.installment = {
                            method: 'CARTÃO',
                            totalPrice: totalForInstallments,
                            installmentValue: installmentValue,
                            installments: 12,
                            label: '12x',
                            title: '12x no cartão',
                            description: `12x de R$ ${installmentValue.toFixed(2).replace('.', ',')}`
                        };
                    }
                    
                    return {
                        ...plan,
                        billingType: billingType,
                        displayPrice: displayPrice,
                        monthlyPrice: monthlyPrice,
                        annualPrice: annualPrice,
                        paymentOptions: paymentOptions
                    };
                }
            });

            // Usar função compartilhada se disponível
            if (typeof window.renderPlansShared === 'function') {
                await window.renderPlansShared(enrichedPlans, 'subscription-plans-list', true, billingType);
            } else if (typeof window.renderPlanCardDashboard === 'function') {
                // Fallback: renderizar manualmente
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
        } catch (error) {
            console.error('❌ Erro ao renderizar planos:', error);
        }
    };

    /**
     * Inicializar
     */
    function init() {
        // Aguardar DOM estar pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => {
                    createBillingToggle();
                    // Se já houver planos carregados, renderizar com billingType atual
                    if (document.getElementById('subscription-plans-list')?.children.length > 0) {
                        window.renderSubscriptionPlansWithBilling(window.currentBillingType);
                    }
                }, 500);
            });
        } else {
            setTimeout(() => {
                createBillingToggle();
                if (document.getElementById('subscription-plans-list')?.children.length > 0) {
                    window.renderSubscriptionPlansWithBilling(window.currentBillingType);
                }
            }, 500);
        }

        // Observar mudanças no DOM
        const observer = new MutationObserver(() => {
            setTimeout(() => {
                createBillingToggle();
            }, 300);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    init();

    console.log('✅ Script de assinatura com toggle mensal/anual carregado');

})();
