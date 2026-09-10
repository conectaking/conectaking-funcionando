/**
 * Dashboard Assinatura / Planos — módulo isolado (Conecta King).
 * Gerado por scripts/extract-dashboard-qr-assinatura.js
 */
(function (global) {
    'use strict';

    var __ckDashLog = function () { try { if (localStorage.getItem('ck_debug') === '1') console.log.apply(console, arguments); } catch (e) {} };

    function core() { return global.DashboardCore || {}; }

    var env = {
        get API_URL() {
            var c = core();
            if (typeof c.getApiUrl === 'function') return c.getApiUrl() || '';
            return global.API_URL || global.API_BASE || '';
        },
        get HEADERS() {
            var c = core();
            if (typeof c.getHeaders === 'function') return c.getHeaders() || {};
            return { 'Content-Type': 'application/json' };
        },
        get HEADERS_AUTH() {
            var c = core();
            if (typeof c.getAuthHeaders === 'function') return c.getAuthHeaders() || {};
            if (typeof c.getHeadersAuth === 'function') return c.getHeadersAuth() || {};
            return {};
        },
        safeFetch: function (url, options) {
            var c = core();
            if (typeof c.safeFetch === 'function') return c.safeFetch(url, options);
            return fetch(url, options);
        }
    };

    var SELECTORS = new Proxy({}, {
        get: function (_t, prop) {
            var c = core();
            var s = typeof c.getSelectors === 'function' ? c.getSelectors() : null;
            return s ? s[prop] : null;
        }
    });


let subscriptionData = null;
let isAdmin = false;

// Carregar informações de assinatura
async function loadSubscriptionInfo() {
    try {
        const response = await env.safeFetch(`${env.API_URL}/api/subscription/info`, {
            method: 'GET',
            headers: env.HEADERS_AUTH
        });

        if (!response.ok) {
            throw new Error('Erro ao carregar informações de assinatura');
        }

        subscriptionData = await response.json();
        isAdmin = subscriptionData.user?.isAdmin || false;

        renderSubscriptionInfo();
        await renderSubscriptionPlans();

        // Se for admin, mostrar seção de edição
        // Mostrar link de personalizar link apenas para ADM
        const personalizarLinkLink = document.getElementById('personalizar-link-link');
        if (personalizarLinkLink && isAdmin) {
            personalizarLinkLink.style.display = 'block';
        }

        if (isAdmin) {
            var adminSec = document.getElementById('subscription-admin-section');
            if (adminSec) adminSec.style.display = 'block';
            loadPlansForEdit();
        }
    } catch (error) {
        console.error('Erro ao carregar informações de assinatura:', error);
        var infoEl = document.getElementById('subscription-info');
        if (infoEl) {
            infoEl.innerHTML = '<p style="color: #ff4444;">Erro ao carregar informações. Tente novamente.</p>';
        }
        var plansEl = document.getElementById('subscription-plans-list');
        if (plansEl) {
            plansEl.innerHTML = '<p style="color: #ff4444;">Não foi possível carregar os planos. Atualize a página.</p>';
        }
    }
}

// Renderizar informações da assinatura atual
function renderSubscriptionInfo() {
    const infoContainer = document.getElementById('subscription-info');
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
        'active': 'Ativo',
        'active_onetime': 'Ativo',
        'expired': 'Expirado',
        'expired_trial': 'Expirado',
        'pre_sale_trial': 'Ativo'
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
            <span style="font-weight: 600; color: var(--dourado-principal, #FFC700);">
                ${currentPlan ? currentPlan.plan_name : 'Nenhum plano ativo'}
            </span>
        </div>
        ${currentPlan ? `
        <div class="subscription-info-item">
            <label>Preço Mensal:</label>
            <span style="font-size: 1.1rem; font-weight: 600; color: var(--dourado-principal, #FFC700);">
                R$ ${currentPlan.monthly_price ? parseFloat(currentPlan.monthly_price).toFixed(2).replace('.', ',') : parseFloat(currentPlan.price / 12).toFixed(2).replace('.', ',')}/mês
            </span>
        </div>
        <div class="subscription-info-item">
            <label>Preço Anual:</label>
            <span style="font-size: 1.1rem; font-weight: 600; color: var(--dourado-principal, #FFC700);">
                R$ ${currentPlan.annual_price ? parseFloat(currentPlan.annual_price).toFixed(2).replace('.', ',') : parseFloat(currentPlan.price).toFixed(2).replace('.', ',')}/ano
            </span>
        </div>
        ` : ''}
        <div class="subscription-info-item">
            <label>Data de Assinatura:</label>
            <span>${createdAt}</span>
        </div>
        <div class="subscription-info-item">
            <label>Data de Expiração:</label>
            <span>${expiresAt}</span>
        </div>
    `;
}

// Mapear plan_code para account_type (para buscar módulos)
const planCodeToAccountType = {
    'basic': 'individual',
    'premium': 'individual_com_logo',
    'enterprise': 'business_owner'
};

// Buscar módulos disponíveis por plano
let planModulesCache = {};

async function loadPlanModules(planCode) {
    // Se já está no cache, retornar
    if (planModulesCache[planCode]) {
        return planModulesCache[planCode];
    }

    try {
        const accountType = planCodeToAccountType[planCode];
        if (!accountType) {
            return { available: [], unavailable: [] };
        }

        const response = await env.safeFetch(`${env.API_URL}/api/modules/available?plan_code=${accountType}`, {
            method: 'GET',
            headers: env.HEADERS_AUTH
        });

        if (!response.ok) {
            // Se não houver rota específica, buscar da tabela module_plan_availability
            return await loadPlanModulesFromAvailability(accountType);
        }

        const data = await response.json();
        const availableModules = data.available_modules || [];

        // Lista completa de módulos do sistema (baseado nos módulos disponíveis na tabela)
        const allModules = [
            'whatsapp', 'telegram', 'email', 'pix', 'pix_qrcode', 'wifi',
            'facebook', 'instagram', 'tiktok', 'twitter', 'youtube',
            'spotify', 'linkedin', 'pinterest',
            'link', 'portfolio', 'banner', 'carousel',
            'youtube_embed', 'sales_page', 'digital_form'
        ];

        const unavailableModules = allModules.filter(m => !availableModules.includes(m));

        planModulesCache[planCode] = {
            available: availableModules,
            unavailable: unavailableModules
        };

        return planModulesCache[planCode];
    } catch (error) {
        console.error('Erro ao carregar módulos do plano:', error);
        return await loadPlanModulesFromAvailability(planCodeToAccountType[planCode] || planCode);
    }
}

// Buscar módulos da tabela module_plan_availability (fallback)
async function loadPlanModulesFromAvailability(accountType) {
    try {
        // Buscar todos os módulos disponíveis para este account_type
        const response = await env.safeFetch(`${env.API_URL}/api/modules/plan-availability`, {
            method: 'GET',
            headers: env.HEADERS_AUTH
        });

        if (!response.ok) {
            return { available: [], unavailable: [] };
        }

        const data = await response.json();
        const modules = data.modules || [];

        const availableModules = [];
        const allModules = [];

        modules.forEach(module => {
            allModules.push(module.module_type);
            // Verificar se o módulo está disponível para este account_type
            if (module.plans && module.plans[accountType]?.is_available !== false) {
                availableModules.push(module.module_type);
            }
        });

        const unavailableModules = allModules.filter(m => !availableModules.includes(m));

        return {
            available: availableModules,
            unavailable: unavailableModules
        };
    } catch (error) {
        console.error('Erro ao carregar módulos da disponibilidade:', error);
        return { available: [], unavailable: [] };
    }
}

// Renderizar planos disponíveis - Usa função compartilhada
async function renderSubscriptionPlans() {
    const plans = subscriptionData.availablePlans || [];

    // Filtrar planos: excluir King Essential (king_base)
    const filteredPlans = plans.filter(plan => plan.plan_code !== 'king_base');
    __ckDashLog(`Y"< Planos filtrados na assinatura: ${filteredPlans.length} planos (excluído: King Essential)`);

    // Usar função compartilhada se disponível, senão usar lógica antiga
    if (typeof window.renderPlansShared === 'function') {
        await window.renderPlansShared(filteredPlans, 'subscription-plans-list', true);
        return;
    }

    // Fallback para lógica antiga se função compartilhada não estiver disponível
    const plansContainer = document.getElementById('subscription-plans-list');
    if (filteredPlans.length === 0) {
        plansContainer.innerHTML = '<p>Nenhum plano disponível no momento.</p>';
        return;
    }

    // Carregar módulos para todos os planos filtrados
    const plansWithModules = await Promise.all(filteredPlans.map(async (plan) => {
        const modules = await loadPlanModules(plan.plan_code);
        return { ...plan, modules };
    }));

    plansContainer.innerHTML = plansWithModules.map(plan => {
        const features = plan.features || {};
        const whatsapp = plan.whatsapp_number || '';
        const pix = plan.pix_key || '';
        const modules = plan.modules || { available: [], unavailable: [] };

        // Módulos importantes para destacar (o que o usuário mencionou)
        const importantModules = {
            'carousel': 'Carrossel',
            'sales_page': 'Loja Virtual',
            'digital_form': 'King Forms',
            'portfolio': 'Portfólio',
            'banner': 'Banner'
        };

        // Separar módulos importantes disponíveis e indisponíveis
        const importantAvailable = [];
        const importantUnavailable = [];

        Object.keys(importantModules).forEach(moduleType => {
            if (modules.available.includes(moduleType)) {
                importantAvailable.push(importantModules[moduleType]);
            } else if (modules.unavailable.includes(moduleType)) {
                importantUnavailable.push(importantModules[moduleType]);
            }
        });

        // Contar módulos totais
        const totalModules = modules.available.length + modules.unavailable.length;
        const availableCount = modules.available.length;

        // Determinar número de perfis
        const financeProfiles = features.max_finance_profiles || 0;
        const regularProfiles = features.max_profiles || 1;

        // Flags do plano (fallback quando renderPlansShared não está disponível)
        const isStart = plan.plan_code === 'basic';
        const isPrime = plan.plan_code === 'premium';
        const isBase = plan.plan_code === 'king_base';
        const isFinance = plan.plan_code === 'king_finance';
        const isFinancePlus = plan.plan_code === 'king_finance_plus';
        const isPremiumPlus = plan.plan_code === 'king_premium_plus';
        const isCorporate = plan.plan_code === 'king_corporate' || plan.plan_code === 'enterprise';

        return `
            <div class="subscription-plan-card ${isCorporate ? 'plan-highlighted' : ''}">
                <h3>${plan.plan_name}</h3>
                <div class="plan-price">
                    <span class="plan-currency">R$</span>
                    <span class="plan-amount">${parseFloat(plan.price).toFixed(2).replace('.', ',')}</span>
                    <span class="plan-period" style="font-size: 0.9rem; color: var(--text-secondary, #888888);">pagamento único</span>
                </div>
                <p class="plan-description">${plan.description || ''}</p>
                <ul class="plan-features">
                    ${isStart ? `
                    <!-- King Start: 1 perfil + Acesso a todos módulos exceto -->
                    <li><i class="fas fa-check" style="color: #4CAF50;"></i> 1 perfil</li>
                    <li><i class="fas fa-check" style="color: #4CAF50;"></i> Acesso a todos os módulos, exceto:</li>
                    <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color, #2C2C2F);">
                        <strong style="color: var(--text-secondary, #888888); font-size: 0.95rem;">Não incluído:</strong>
                    </li>
                    <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Logomarca editável</li>
                    <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Carrossel</li>
                    <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Loja Virtual</li>
                    <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> King Forms</li>
                    <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Gestão Financeira</li>
                    <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Contratos</li>
                    <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Agenda Inteligente</li>
                    ` : ''}
                    
                    ${isPrime ? `
                    <!-- King Prime: 1 perfil + Módulos incluídos (Carrossel, Portfólio, Banner, Loja Virtual) + Não incluído: Gestão Financeira, Contratos, Agenda (King Forms não faz parte deste pacote) -->
                    ${features.can_edit_logo ? '<li><i class="fas fa-check" style="color: #4CAF50;"></i> Logomarca editável</li>' : ''}
                    <li><i class="fas fa-check" style="color: #4CAF50;"></i> 1 perfil</li>
                    <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color, #2C2C2F);">
                        <strong style="color: var(--text-primary, #FFFFFF); font-size: 0.95rem;">Módulos incluídos:</strong>
                    </li>
                    <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Carrossel</li>
                    <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Portfólio</li>
                    <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Banner</li>
                    <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Loja Virtual</li>
                    <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color, #2C2C2F);">
                        <strong style="color: var(--text-secondary, #888888); font-size: 0.95rem;">Não incluído:</strong>
                    </li>
                    <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Gestão Financeira</li>
                    <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Contratos</li>
                    <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Agenda Inteligente</li>
                    ` : ''}
                    
                    ${isBase ? `
                    <!-- King Essential (antigo King Base): 1 perfil + Módulos incluídos + Não incluído -->
                    ${features.can_edit_logo ? '<li><i class="fas fa-check" style="color: #4CAF50;"></i> Logomarca editável</li>' : ''}
                    <li><i class="fas fa-check" style="color: #4CAF50;"></i> 1 perfil</li>
                    <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color, #2C2C2F);">
                        <strong style="color: var(--text-primary, #FFFFFF); font-size: 0.95rem;">Módulos incluídos:</strong>
                    </li>
                    <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Carrossel</li>
                    <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Loja Virtual</li>
                    <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Portfólio</li>
                    <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Banner</li>
                    <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color, #2C2C2F);">
                        <strong style="color: var(--text-secondary, #888888); font-size: 0.95rem;">Não incluído:</strong>
                    </li>
                    <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> King Forms</li>
                    <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Contratos</li>
                    <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Agenda Inteligente</li>
                    ` : ''}
                    
                    ${isFinance ? `
                    <!-- King Finance: 1 perfil + Módulos incluídos (SEM King Forms) + Não incluído: King Forms, Agenda -->
                    ${features.can_edit_logo ? '<li><i class="fas fa-check" style="color: #4CAF50;"></i> Logomarca editável</li>' : ''}
                    <li><i class="fas fa-check" style="color: #4CAF50;"></i> 1 perfil</li>
                    <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color, #2C2C2F);">
                        <strong style="color: var(--text-primary, #FFFFFF); font-size: 0.95rem;">Módulos incluídos:</strong>
                    </li>
                    <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Carrossel</li>
                    <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Loja Virtual</li>
                    <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Portfólio</li>
                    <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Banner</li>
                    <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Gestão Financeira</li>
                    <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color, #2C2C2F);">
                        <strong style="color: var(--text-secondary, #888888); font-size: 0.95rem;">Não incluído:</strong>
                    </li>
                    <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> King Forms</li>
                    <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Agenda Inteligente</li>
                    ` : ''}
                    
                    ${isFinancePlus ? `
                    <!-- King Finance Plus: 2 perfis gestão financeira + Módulos incluídos (SEM King Forms) + Não incluído: King Forms, Agenda -->
                    ${features.can_edit_logo ? '<li><i class="fas fa-check" style="color: #4CAF50;"></i> Logomarca editável</li>' : ''}
                    <li><i class="fas fa-check" style="color: #4CAF50;"></i> 1 perfil de cartão virtual</li>
                    <li><i class="fas fa-check" style="color: #4CAF50;"></i> 2 perfis de Gestão Financeira</li>
                    <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color, #2C2C2F);">
                        <strong style="color: var(--text-primary, #FFFFFF); font-size: 0.95rem;">Módulos incluídos:</strong>
                    </li>
                    <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Carrossel</li>
                    <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Loja Virtual</li>
                    <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Contratos</li>
                    <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Gestão Financeira</li>
                    <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color, #2C2C2F);">
                        <strong style="color: var(--text-secondary, #888888); font-size: 0.95rem;">Não incluído:</strong>
                    </li>
                    <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> King Forms</li>
                    <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Agenda Inteligente</li>
                    ` : ''}
                    
                    ${isPremiumPlus ? `
                    <!-- King Premium Plus: Tudo incluído (incluindo Agenda Inteligente e King Forms a partir de R$ 2.200) -->
                    ${features.can_edit_logo ? '<li><i class="fas fa-check" style="color: #4CAF50;"></i> Logomarca editável</li>' : ''}
                    <li><i class="fas fa-check" style="color: #4CAF50;"></i> 1 perfil</li>
                    <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color, #2C2C2F);">
                        <strong style="color: var(--text-primary, #FFFFFF); font-size: 0.95rem;">Módulos incluídos:</strong>
                    </li>
                    <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Gestão Financeira</li>
                    <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Contratos</li>
                    <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Agenda Inteligente</li>
                    <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Carrossel</li>
                    <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Loja Virtual</li>
                    <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> King Forms</li>
                    ` : ''}
                    
                    ${isCorporate ? `
                    <!-- King Corporate: Logomarca editável + Modo empresarial + 3 perfis + Não inclui -->
                    <li><i class="fas fa-check" style="color: #4CAF50;"></i> Logomarca editável</li>
                    <li><i class="fas fa-check" style="color: #4CAF50;"></i> Modo Empresarial</li>
                    <li><i class="fas fa-check" style="color: #4CAF50;"></i> 3 perfis</li>
                    <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color, #2C2C2F);">
                        <strong style="color: var(--text-secondary, #888888); font-size: 0.95rem;">Não incluído:</strong>
                    </li>
                    <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Gestão Financeira</li>
                    <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Loja Virtual</li>
                    <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Agenda Inteligente</li>
                    <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Contratos</li>
                    ` : ''}
                    
                    ${!isStart && !isPrime && !isBase && !isFinance && !isFinancePlus && !isPremiumPlus && !isCorporate ? `
                    <!-- Planos genéricos -->
                    ${features.can_edit_logo ? '<li><i class="fas fa-check" style="color: #4CAF50;"></i> Logomarca editável</li>' : ''}
                    ${regularProfiles > 0 ? `<li><i class="fas fa-check" style="color: #4CAF50;"></i> ${regularProfiles} perfil${regularProfiles > 1 ? 's' : ''}</li>` : ''}
                    ${financeProfiles > 0 ? `<li><i class="fas fa-check" style="color: #4CAF50;"></i> ${financeProfiles} perfil${financeProfiles > 1 ? 's' : ''} de Gestão Financeira</li>` : ''}
                    ${features.is_enterprise ? '<li><i class="fas fa-check" style="color: #4CAF50;"></i> Modo Empresarial</li>' : ''}
                    ` : ''}
                </ul>
                <div class="plan-actions">
                    <a href="https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(finalWhatsappMessage)}" target="_blank" class="btn btn-primary" style="width: 100%; margin-bottom: 10px;">
                        <i class="fab fa-whatsapp"></i> Assinar agora
                    </a>
                    <button class="btn btn-secondary" style="width: 100%;" onclick="copyPixKey('${pix || ''}')">
                        <i class="fas fa-copy"></i> Copiar Chave PIX
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Função para copiar chave PIX
window.copyPixKey = function (pixKey) {
    if (!pixKey || pixKey.trim() === '') {
        alert('Chave PIX não configurada para este plano. Entre em contato conosco via WhatsApp.');
        return;
    }
    navigator.clipboard.writeText(pixKey).then(() => {
        alert('Chave PIX copiada!');
    }).catch(() => {
        const textArea = document.createElement('textarea');
        textArea.value = pixKey;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('Chave PIX copiada!');
    });
};

// Carregar planos para edição (ADM)
async function loadPlansForEdit() {
    try {
        __ckDashLog(' Carregando planos para edição...');

        // Adicionar timestamp para evitar cache
        const response = await env.safeFetch(`${env.API_URL}/api/subscription/plans?t=${Date.now()}`, {
            method: 'GET',
            headers: {
                ...env.HEADERS_AUTH,
                'Cache-Control': 'no-cache'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erro ao carregar planos:', response.status, errorText);
            throw new Error(`Erro ao carregar planos para edição: ${response.status}`);
        }

        const data = await response.json();
        __ckDashLog(`${data.plans?.length || 0} planos carregados`);

        if (!data.plans || data.plans.length === 0) {
            console.warn('Nenhum plano encontrado!');
            document.getElementById('plans-edit-form').innerHTML = '<p style="color: #ff4444;">Nenhum plano encontrado.</p>';
            return;
        }

        await renderPlansEditForm(data.plans);
        __ckDashLog('Formulário de edição renderizado');
    } catch (error) {
        console.error('Erro ao carregar planos para edição:', error);
        const formContainer = document.getElementById('plans-edit-form');
        if (formContainer) {
            formContainer.innerHTML = `<p style="color: #ff4444;">Erro ao carregar planos: ${error.message}</p>`;
        }
    }
}

// Renderizar formulário de edição de planos
async function renderPlansEditForm(plans) {
    const formContainer = document.getElementById('plans-edit-form');
    if (!formContainer) {
        console.error('O Container plans-edit-form não encontrado!');
        return;
    }

    __ckDashLog(` Renderizando formulário para ${plans.length} planos...`);

    // Buscar disponibilidade de módulos (com cache busting agressivo)
    let moduleAvailability = [];
    try {
        const cacheBuster = `t=${Date.now()}&_=${Math.random()}`;
        __ckDashLog(' Buscando disponibilidade de módulos (sem cache)...');
        const moduleResponse = await env.safeFetch(`${env.API_URL}/api/modules/plan-availability?${cacheBuster}`, {
            method: 'GET',
            headers: {
                ...env.HEADERS_AUTH,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
        if (moduleResponse.ok) {
            const moduleData = await moduleResponse.json();
            moduleAvailability = moduleData.modules || [];
            __ckDashLog(`${moduleAvailability.length} módulos carregados`);

            // Log detalhado dos módulos carregados para debug
            if (moduleAvailability.length > 0) {
                __ckDashLog('Y"S Módulos carregados da API:');
                moduleAvailability.forEach(module => {
                    const planCodes = Object.keys(module.plans || {});
                    planCodes.forEach(planCode => {
                        const planData = module.plans[planCode];
                        __ckDashLog(`   ${module.module_type} para ${planCode}: is_available = ${planData.is_available} (${typeof planData.is_available})`);
                    });
                });
            } else {
                console.warn('Nenhum módulo retornado pela API!');
            }
        } else {
            const errorText = await moduleResponse.text();
            console.warn('Erro ao carregar módulos:', moduleResponse.status, errorText);
        }
    } catch (error) {
        console.error('Erro ao carregar disponibilidade de módulos:', error);
        console.error('Stack:', error.stack);
    }

    // Módulos ativos na Separação de Pacotes (Agenda/Contratos/Bolão/Briefing removidos; Recibos fica)
    const moduleLabels = {
        'carousel': 'Carrossel',
        'sales_page': 'Loja Virtual',
        'digital_form': 'King Forms',
        'portfolio': 'Portfólio',
        'banner': 'Banner',
        'finance': 'Gestão Financeira',
        'modo_empresa': 'Modo Empresa',
        'branding': 'Personalização da Marca',
        'location': 'Localização',
        'king_selection': 'King Selection',
        'king_docs': 'King Docs',
        'recibos_orcamentos': 'Recibos e Orçamentos'
    };

    formContainer.innerHTML = plans.map(plan => {
        const features = plan.features || {};
        const canEditLogo = features.can_edit_logo || false;

        // Buscar módulos incluídos e não incluídos para este plano
        const includedModules = [];
        const excludedModules = [];

        // IMPORTANTE: Garantir que TODOS os módulos sejam sempre considerados
        Object.keys(moduleLabels).forEach(moduleCode => {
            const module = moduleAvailability.find(m => m.module_type === moduleCode);
            const moduleName = moduleLabels[moduleCode];

            if (module && module.plans && module.plans[plan.plan_code]) {
                // Verificar explicitamente se is_available é true
                const isAvailable = module.plans[plan.plan_code].is_available === true;
                const isAvailableValue = module.plans[plan.plan_code].is_available;
                __ckDashLog(`  ${moduleName} (${moduleCode}) para ${plan.plan_code}: is_available = ${isAvailableValue} (${typeof isAvailableValue})`);

                if (isAvailable) {
                    includedModules.push(moduleName);
                } else {
                    // Se is_available é false, null, undefined, ou não existe, considerar como não incluído
                    excludedModules.push(moduleName);
                }
            } else {
                // Se módulo não encontrado na API, considerar como não incluído
                __ckDashLog(`  Módulo ${moduleName} (${moduleCode}) não encontrado na API para ${plan.plan_code} - adicionando aos não incluídos`);
                excludedModules.push(moduleName);
            }
        });

        // Remover duplicatas (caso algum módulo tenha sido adicionado duas vezes)
        const uniqueIncluded = [...new Set(includedModules)];
        const uniqueExcluded = [...new Set(excludedModules)];

        // Garantir que um módulo não esteja nas duas listas
        const finalIncluded = uniqueIncluded.filter(m => !uniqueExcluded.includes(m));
        const finalExcluded = uniqueExcluded.filter(m => !finalIncluded.includes(m));

        // GARANTIR que todos os módulos estejam em uma das listas (não pode faltar nenhum)
        const allModuleNames = Object.values(moduleLabels);
        const allInForm = [...finalIncluded, ...finalExcluded];
        const missingModules = allModuleNames.filter(name => !allInForm.includes(name));

        if (missingModules.length > 0) {
            console.warn(`  Módulos faltando no formulário para ${plan.plan_code}: ${missingModules.join(', ')} - adicionando aos não incluídos`);
            finalExcluded.push(...missingModules);
        }

        __ckDashLog(`Y"< Plano ${plan.plan_name} (${plan.plan_code}): ${finalIncluded.length} incluídos, ${finalExcluded.length} não incluídos`);
        __ckDashLog(`   Incluídos: ${finalIncluded.join(', ') || '(nenhum)'}`);
        __ckDashLog(`   Não incluídos: ${finalExcluded.join(', ') || '(nenhum)'}`);

        // Usar valores finais calculados
        const preservedIncluded = finalIncluded.join(', ');
        const preservedExcluded = finalExcluded.join(', ');

        // Verificar especificamente se "Contratos" está na lista correta
        if (plan.plan_code === 'king_finance') {
            const contratosInIncluded = preservedIncluded.includes('Contratos');
            const contratosInExcluded = preservedExcluded.includes('Contratos');
            __ckDashLog(`   [DEBUG King Finance] Contratos - Incluídos: ${contratosInIncluded}, Não Incluídos: ${contratosInExcluded}`);
            if (!contratosInIncluded && !contratosInExcluded) {
                console.error(`   [ERRO] Contratos não está em nenhuma lista! Adicionando aos não incluídos.`);
                finalExcluded.push('Contratos');
            }
        }

        return `
            <div class="plan-edit-card" style="border: 1px solid var(--border-color, #2C2C2F); border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h3>${plan.plan_name} (${plan.plan_code})</h3>
                <div class="form-group">
                    <label>Nome do Plano:</label>
                    <input type="text" class="form-input" id="plan-name-${plan.id}" value="${plan.plan_name || ''}">
                </div>
                <div class="form-group">
                    <label>Preço (R$):</label>
                    <input type="text" class="form-input" id="plan-price-${plan.id}" value="${plan.price ? parseFloat(plan.price).toFixed(2).replace('.', ',') : '0,00'}" placeholder="700,00">
                </div>
                <div class="form-group">
                    <label>Descrição:</label>
                    <textarea class="form-input" id="plan-description-${plan.id}" rows="3">${plan.description || ''}</textarea>
                </div>
                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: 10px;">
                        <input type="checkbox" id="plan-can-edit-logo-${plan.id}" ${canEditLogo ? 'checked' : ''}>
                        <span>Logomarca editável (em Módulos Incluídos)</span>
                    </label>
                </div>
                <div class="form-group">
                    <label>Módulos Incluídos (separados por vírgula):</label>
                    <textarea class="form-input" id="plan-included-modules-${plan.id}" rows="4" placeholder="Ex: Carrossel, Portfólio, Banner, Loja Virtual">${preservedIncluded}</textarea>
                    <small style="color: var(--text-secondary, #888888); display: block; margin-top: 5px;">
                        Módulos disponíveis: Carrossel, Loja Virtual, King Forms, Portfólio, Banner, Gestão Financeira
                    </small>
                </div>
                <div class="form-group">
                    <label>Módulos Não Incluídos (separados por vírgula):</label>
                    <textarea class="form-input" id="plan-excluded-modules-${plan.id}" rows="4" placeholder="Ex: King Forms, Gestão Financeira">${preservedExcluded}</textarea>
                    <small style="color: var(--text-secondary, #888888); display: block; margin-top: 5px;">
                        Lista os módulos que NÃO estão incluídos neste plano
                    </small>
                </div>
                <div class="form-group">
                    <label>WhatsApp (apenas números):</label>
                    <input type="text" class="form-input" id="plan-whatsapp-${plan.id}" value="${plan.whatsapp_number || ''}" placeholder="5511999999999">
                </div>
                <div class="form-group">
                    <label>Mensagem Personalizada do WhatsApp:</label>
                    <textarea class="form-input" id="plan-whatsapp-message-${plan.id}" rows="3" placeholder="Mensagem que será enviada automaticamente ao clicar em 'Assinar agora'">${plan.whatsapp_message || ''}</textarea>
                    <small style="color: var(--text-secondary, #888888); display: block; margin-top: 5px;">
                        Esta mensagem será enviada automaticamente quando o usuário clicar em "Assinar agora"
                    </small>
                </div>
                <div class="form-group">
                    <label>Chave PIX:</label>
                    <input type="text" class="form-input" id="plan-pix-${plan.id}" value="${plan.pix_key || ''}" placeholder="Chave PIX para pagamento">
                </div>
                <button class="btn btn-primary" onclick="savePlan(${plan.id})">
                    <i class="fas fa-save"></i> Salvar Alterações
                </button>
            </div>
        `;
    }).join('');
}

// Salvar plano (ADM)
window.savePlan = async function (planId) {
    try {
        __ckDashLog(` Iniciando salvamento do plano ID: ${planId}`);

        const planName = document.getElementById(`plan-name-${planId}`).value.trim();
        const priceInput = document.getElementById(`plan-price-${planId}`).value.trim();
        // Converter formato brasileiro (700,00) para formato JavaScript (700.00) apenas para parseFloat
        // Remove pontos (separadores de milhar, se houver) e substitui vírgula por ponto
        // Exemplo: "700,00" — "700.00" — 700.00 (número)
        // Exemplo: "1.700,50" — "1700.50" — 1700.50 (número)
        const priceInputNormalized = priceInput.replace(/\./g, '').replace(',', '.');
        const price = parseFloat(priceInputNormalized);
        const description = document.getElementById(`plan-description-${planId}`).value.trim();
        const canEditLogo = document.getElementById(`plan-can-edit-logo-${planId}`).checked;
        const includedModulesText = document.getElementById(`plan-included-modules-${planId}`).value.trim();
        const excludedModulesText = document.getElementById(`plan-excluded-modules-${planId}`).value.trim();
        const whatsapp = document.getElementById(`plan-whatsapp-${planId}`).value.trim();
        const whatsappMessage = document.getElementById(`plan-whatsapp-message-${planId}`).value.trim();
        const pix = document.getElementById(`plan-pix-${planId}`).value.trim();

        // Validações básicas
        if (!planName) {
            alert('Nome do plano é obrigatório!');
            return;
        }
        if (isNaN(price) || price <= 0) {
            alert('Preço inválido! Use formato brasileiro: 700,00 (vírgula para decimais)');
            return;
        }

        __ckDashLog('Y"< Dados coletados:', {
            planName,
            price,
            description: description.substring(0, 50) + '...',
            canEditLogo,
            includedModules: includedModulesText.substring(0, 50) + '...',
            excludedModules: excludedModulesText.substring(0, 50) + '...',
            whatsapp,
            whatsappMessage: whatsappMessage.substring(0, 50) + '...',
            pix: pix ? '***' : null
        });

        // Mapear nomes de módulos para códigos
        const moduleNameToCode = {
            'Carrossel': 'carousel',
            'Loja Virtual': 'sales_page',
            'King Forms': 'digital_form',
            'Portfólio': 'portfolio',
            'Banner': 'banner',
            'Gestão Financeira': 'finance',
            'King Selection': 'king_selection',
            'King Docs': 'king_docs',
            'Recibos e Orçamentos': 'recibos_orcamentos',
            'Personalização da Marca': 'branding',
            'Modo Empresa': 'modo_empresa',
            'Localização': 'location'
        };

        // Buscar plan_code do plano atual (com cache busting)
        const currentPlanResponse = await env.safeFetch(`${env.API_URL}/api/subscription/plans?t=${Date.now()}`, {
            method: 'GET',
            headers: {
                ...env.HEADERS_AUTH,
                'Cache-Control': 'no-cache'
            }
        });

        if (!currentPlanResponse.ok) {
            throw new Error('Erro ao buscar dados do plano atual');
        }

        const currentPlansData = await currentPlanResponse.json();
        const currentPlan = currentPlansData.plans.find(p => p.id === planId);

        if (!currentPlan) {
            throw new Error(`Plano com ID ${planId} não encontrado!`);
        }

        const currentFeatures = currentPlan.features || {};
        const planCode = currentPlan.plan_code;

        __ckDashLog(`Y"< Plano encontrado: ${currentPlan.plan_name} (${planCode})`);

        // Atualizar features com can_edit_logo
        const updatedFeatures = {
            ...currentFeatures,
            can_edit_logo: canEditLogo
        };

        // Preparar dados para envio (incluindo módulos)
        const planData = {
            plan_name: planName,
            price: price,
            description: description,
            features: updatedFeatures,
            whatsapp_number: whatsapp || null,
            whatsapp_message: whatsappMessage || null,
            pix_key: pix || null,
            included_modules: includedModulesText || '',  // Enviar módulos incluídos (string vazia se vazio)
            excluded_modules: excludedModulesText || ''   // Enviar módulos não incluídos (string vazia se vazio)
        };

        __ckDashLog('Enviando dados do plano (com módulos):', {
            plan_name: planData.plan_name,
            price: planData.price,
            description: planData.description?.substring(0, 50) + '...',
            included_modules: planData.included_modules || '(vazio)',
            excluded_modules: planData.excluded_modules || '(vazio)',
            included_modules_length: planData.included_modules?.length || 0,
            excluded_modules_length: planData.excluded_modules?.length || 0
        });

        // Log completo dos módulos para debug
        __ckDashLog('Y"< Módulos incluídos (completo):', includedModulesText);
        __ckDashLog('Y"< Módulos não incluídos (completo):', excludedModulesText);

        // Salvar plano (agora inclui módulos na mesma requisição)
        const response = await env.safeFetch(`${env.API_URL}/api/subscription/plans/${planId}`, {
            method: 'PUT',
            headers: {
                ...env.HEADERS_AUTH,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(planData)
        });

        __ckDashLog('Resposta recebida:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erro na resposta:', errorText);
            throw new Error(`Erro ao salvar plano: ${response.status} - ${errorText}`);
        }

        const responseData = await response.json();
        __ckDashLog('Plano salvo com sucesso:', responseData);

        // Verificar se os módulos foram atualizados
        if (responseData.modulesUpdated) {
            __ckDashLog('Módulos incluídos e não incluídos foram salvos junto com o plano!');
        } else if (includedModulesText || excludedModulesText) {
            __ckDashLog('Módulos foram enviados, mas não foram processados. Verificando se precisa de atualização separada...');
            // Se por algum motivo os módulos não foram processados, tentar atualizar separadamente (fallback)
            // Mas não bloquear o salvamento do plano
            if (planCode) {
                try {
                    const includedModules = includedModulesText.split(',').map(m => m.trim()).filter(m => m);
                    const excludedModules = excludedModulesText.split(',').map(m => m.trim()).filter(m => m);
                    const includedSet = new Set(includedModules);
                    const excludedSet = new Set(excludedModules);
                    const moduleUpdates = [];
                    const allModuleNames = Object.keys(moduleNameToCode);

                    allModuleNames.forEach(moduleName => {
                        const moduleCode = moduleNameToCode[moduleName];
                        if (moduleCode) {
                            if (includedSet.has(moduleName)) {
                                moduleUpdates.push({
                                    module_type: moduleCode,
                                    plan_code: planCode,
                                    is_available: true
                                });
                            } else if (excludedSet.has(moduleName)) {
                                moduleUpdates.push({
                                    module_type: moduleCode,
                                    plan_code: planCode,
                                    is_available: false
                                });
                            }
                        }
                    });

                    if (moduleUpdates.length > 0) {
                        __ckDashLog(' Tentando atualizar módulos via endpoint separado (fallback)...');
                        const moduleResponse = await env.safeFetch(`${env.API_URL}/api/modules/plan-availability`, {
                            method: 'PUT',
                            headers: {
                                ...env.HEADERS_AUTH,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ updates: moduleUpdates })
                        });

                        if (moduleResponse.ok) {
                            __ckDashLog('Módulos atualizados via fallback');
                        } else {
                            console.warn('Fallback de módulos falhou, mas plano foi salvo');
                        }
                    }
                } catch (fallbackError) {
                    console.warn('Erro no fallback de módulos (não crítico):', fallbackError);
                }
            }
        }

        // Aguardar mais tempo para garantir que o banco processou e commitou
        __ckDashLog('⏳ Aguardando processamento do banco (3 segundos)...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        __ckDashLog('Aguardamento concluído. Dados devem estar disponíveis no banco.');

        alert('Plano atualizado com sucesso!');

        __ckDashLog(' Recarregando formulário de edição...');
        // IMPORTANTE: Preservar valores dos campos de módulos antes de recarregar
        const includedFieldBefore = document.getElementById(`plan-included-modules-${planId}`);
        const excludedFieldBefore = document.getElementById(`plan-excluded-modules-${planId}`);
        const preservedIncludedValue = includedFieldBefore ? includedFieldBefore.value.trim() : '';
        const preservedExcludedValue = excludedFieldBefore ? excludedFieldBefore.value.trim() : '';

        __ckDashLog('Valores preservados antes de recarregar:');
        __ckDashLog(`   Incluídos: "${preservedIncludedValue}"`);
        __ckDashLog(`   Não incluídos: "${preservedExcludedValue}"`);

        // Recarregar formulário de edição PRIMEIRO para mostrar mudanças imediatamente
        try {
            // Limpar qualquer cache e forçar busca fresca
            // Adicionar timestamp único e parâmetros de cache busting
            const timestamp = Date.now();
            __ckDashLog(` Forçando recarregamento sem cache (timestamp: ${timestamp})...`);

            // Limpar cache do módulo de disponibilidade também
            if (window.moduleAvailabilityCache) {
                delete window.moduleAvailabilityCache;
            }

            // Recarregar formulário com cache busting agressivo
            await loadPlansForEdit();

            // Aguardar um pouco mais para garantir que o DOM foi atualizado
            await new Promise(resolve => setTimeout(resolve, 500));

            // Restaurar valores preservados nos campos de módulos
            const includedFieldAfter = document.getElementById(`plan-included-modules-${planId}`);
            const excludedFieldAfter = document.getElementById(`plan-excluded-modules-${planId}`);

            if (includedFieldAfter && preservedIncludedValue) {
                // Restaurar valor preservado, mas adicionar módulos mapeados que não estão no valor
                const currentValue = includedFieldAfter.value.trim();
                const preservedModules = preservedIncludedValue.split(',').map(m => m.trim()).filter(m => m);
                const currentModules = currentValue.split(',').map(m => m.trim()).filter(m => m);

                // Combinar: manter módulos preservados e adicionar módulos mapeados que não estão lá
                const combinedModules = [...new Set([...preservedModules, ...currentModules])];
                includedFieldAfter.value = combinedModules.join(', ');
                __ckDashLog(`Valor restaurado em módulos incluídos: "${includedFieldAfter.value}"`);
            }

            if (excludedFieldAfter && preservedExcludedValue) {
                // Restaurar valor preservado, mas adicionar módulos mapeados que não estão no valor
                const currentValue = excludedFieldAfter.value.trim();
                const preservedModules = preservedExcludedValue.split(',').map(m => m.trim()).filter(m => m);
                const currentModules = currentValue.split(',').map(m => m.trim()).filter(m => m);

                // Combinar: manter módulos preservados e adicionar módulos mapeados que não estão lá
                const combinedModules = [...new Set([...preservedModules, ...currentModules])];
                excludedFieldAfter.value = combinedModules.join(', ');
                __ckDashLog(`Valor restaurado em módulos não incluídos: "${excludedFieldAfter.value}"`);
            }

            // Verificar se os dados foram carregados corretamente
            __ckDashLog('Formulário recarregado. Verifique os campos acima.');

            // Log adicional para debug
            if (includedFieldAfter && excludedFieldAfter) {
                __ckDashLog('Y"< Valores finais nos campos:');
                __ckDashLog(`   Incluídos: "${includedFieldAfter.value}"`);
                __ckDashLog(`   Não incluídos: "${excludedFieldAfter.value}"`);
            } else {
                console.warn('Campos de módulos não encontrados após recarregar!');
            }
        } catch (reloadError) {
            console.error('Erro ao recarregar formulário:', reloadError);
            console.error('Stack:', reloadError.stack);
            alert('Plano salvo, mas houve erro ao recarregar. Atualize a página manualmente (F5).');
        }

        __ckDashLog(' Recarregando informações de assinatura...');
        // Depois recarregar informações de assinatura (pode falhar silenciosamente se planRenderer der erro)
        try {
            await loadSubscriptionInfo();
        } catch (subscriptionError) {
            console.warn('Erro ao recarregar informações de assinatura (não crítico):', subscriptionError);
        }

        __ckDashLog('Processo de salvamento concluído!');
    } catch (error) {
        console.error('Erro completo ao salvar plano:', error);
        console.error('Stack:', error.stack);
        alert(`Erro ao salvar plano: ${error.message}\n\nVerifique o console para mais detalhes.`);
    }
};

// Event listener para botão de editar planos
const editPlansBtn = document.getElementById('edit-plans-btn');
if (editPlansBtn) {
    editPlansBtn.addEventListener('click', () => {
        const formContainer = document.getElementById('plans-edit-form');
        if (formContainer.style.display === 'none') {
            formContainer.style.display = 'block';
            loadPlansForEdit();
        } else {
            formContainer.style.display = 'none';
        }
    });
}

// Carregar informações quando a página de assinatura for aberta
const assinaturaLink = document.getElementById('assinatura-link');
if (assinaturaLink) {
    assinaturaLink.addEventListener('click', () => {
        setTimeout(() => {
            loadSubscriptionInfo();
        }, 100);
    });
}

// ============================================
// FUNCIONALIDADE DE SEPARA—fO DE PACOTES (ADM)
// ============================================

let moduleAvailabilityData = null;
let moduleAvailabilityChanges = {};

// Verificar se é admin e mostrar link


    var DashboardAssinatura = {
        loadSubscriptionInfo: loadSubscriptionInfo,
        renderSubscriptionInfo: renderSubscriptionInfo,
        renderSubscriptionPlans: renderSubscriptionPlans,
        loadPlansForEdit: loadPlansForEdit
    };
    global.DashboardAssinatura = DashboardAssinatura;
    global.loadSubscriptionInfo = loadSubscriptionInfo;

})(typeof window !== 'undefined' ? window : this);
