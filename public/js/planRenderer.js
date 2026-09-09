/**
 * Função compartilhada para renderizar planos de assinatura
 * Usada tanto na página principal quanto na seção Assinatura do dashboard
 * Os cartões refletem exatamente o que está selecionado em "Separação de Pacotes".
 */

// Nomes para exibição dos módulos (igual à Separação de Pacotes)
const MODULE_LABELS = {
    agenda: 'Agenda Inteligente',
    banner: 'Banner',
    carousel: 'Carrossel',
    contract: 'Contratos',
    digital_form: 'King Forms',
    finance: 'Gestão Financeira',
    portfolio: 'Portfólio',
    sales_page: 'Loja Virtual',
    link: 'Link personalizado',
    instagram_embed: 'Instagram incorporado',
    youtube_embed: 'YouTube incorporado',
    modo_empresa: 'Modo Empresa',
    photographer_site: 'Meu site'
};

function getModuleLabel(moduleType) {
    return MODULE_LABELS[moduleType] || moduleType;
}

function normalizeWhatsAppDigits(raw) {
    if (!raw) return '';
    return String(raw).replace(/\D/g, '');
}

function getDefaultSalesWhatsAppNumber(plan = null) {
    // Prioridade:
    // 1) Número vindo do plano (API)
    // 2) Número global configurado no front
    // 3) Número hardcoded do projeto (mesmo do banner de renovação em `public_html/global.js`)
    const fromPlan = plan?.whatsapp_number ? String(plan.whatsapp_number) : '';
    const fromWindow =
        (typeof window !== 'undefined' && (window.CONTACT_WHATSAPP_NUMBER || window.CONECTAKING_WHATSAPP_NUMBER))
            ? String(window.CONTACT_WHATSAPP_NUMBER || window.CONECTAKING_WHATSAPP_NUMBER)
            : '';
    const fallback = '5511988161364';

    return normalizeWhatsAppDigits(fromPlan) || normalizeWhatsAppDigits(fromWindow) || fallback;
}

function formatBRL(value) {
    const n = Number(value);
    if (!isFinite(n)) return '0,00';
    return n.toFixed(2).replace('.', ',');
}

function getMonthlyBasePrice(plan) {
    const mp = parseFloat(plan?.monthly_price);
    if (!isNaN(mp) && mp > 0) return mp;

    const p = parseFloat(plan?.price);
    if (isNaN(p) || p <= 0) return 0;

    // Heurística: se `price` vier como anual (ex.: 840), converte para mensal.
    // Se vier como mensal (ex.: 70), mantém.
    return p >= 500 ? (p / 12) : p;
}

/** Preço total anual do plano (igual ao configurado em Assinaturas). */
function getAnnualPrice(plan) {
    const ap = parseFloat(plan?.annual_price);
    if (!isNaN(ap) && ap > 0) return ap;

    const monthly = getMonthlyBasePrice(plan);
    if (!monthly || monthly <= 0) return 0;
    // Anual com 20% de desconto
    return monthly * 12 * 0.8;
}

/**
 * Monta o HTML de "Incluído" e "Não tem nesse pacote" a partir dos dados da Separação de Pacotes.
 * Só mostra módulos que têm label (os que aparecem na tela Separação de Pacotes).
 * @param {Object} planModules - { available: string[], unavailable: string[] }
 * @param {Object} opts - { isDashboard: boolean } para estilo (dashboard vs página pública)
 */
function buildPlanModulesFeaturesHTML(planModules, opts = {}) {
    const isDashboard = opts.isDashboard === true;
    const planModulesSafe = planModules || { available: [], unavailable: [] };
    const availableAll = planModulesSafe.available || [];
    const unavailableAll = planModulesSafe.unavailable || [];
    const hasLabel = (m) => MODULE_LABELS[m];
    const available = availableAll.filter(hasLabel);
    const unavailable = unavailableAll.filter(hasLabel);
    // Na página pública, o layout de referência usa checks verdes e X vermelhos.
    const checkColor = isDashboard ? '#4CAF50' : '#4CAF50';
    const crossColor = isDashboard ? '#ff4444' : '#ff4444';
    const lineStyle = isDashboard
        ? 'border-top: 1px solid var(--border-color, #2C2C2F);'
        : 'border-top: 1px solid rgba(255, 255, 255, 0.08);';
    const strongStyle = isDashboard
        ? 'color: var(--text-secondary, #888888);'
        : 'color: rgba(245, 245, 245, 0.45);';
    let html = '';
    if (available.length > 0) {
        html += `<li style="margin-top: 12px; padding-top: 12px; ${lineStyle}"><strong style="color: var(--text-primary, #FFFFFF); font-size: 0.95rem;">Incluído neste pacote:</strong></li>`;
        available.forEach(m => {
            html += `<li style="padding-left: 8px;"><i class="fas fa-check" style="color: ${checkColor}; margin-right: 8px;"></i> ${getModuleLabel(m)}</li>`;
        });
    }
    if (unavailable.length > 0) {
        html += `<li style="margin-top: 12px; padding-top: 12px; ${lineStyle}"><strong style="${strongStyle} font-size: 0.95rem;">Não tem nesse pacote:</strong></li>`;
        unavailable.forEach(m => {
            html += `<li style="padding-left: 8px; opacity: 0.85;"><i class="fas fa-times" style="color: ${crossColor}; margin-right: 8px;"></i> ${getModuleLabel(m)}</li>`;
        });
    }
    return html;
}

// Função para carregar módulos de um plano
async function loadPlanModules(planCode) {
    try {
        // Determinar qual API usar baseado no contexto
        // Prioridade: window.API_URL > variável global > detecção automática
        let apiUrl = window.API_URL;
        
        if (!apiUrl && typeof API_URL !== 'undefined') {
            apiUrl = API_URL;
        }
        
        if (!apiUrl) {
            // Detecção automática baseada no ambiente
            if (window.location.origin.includes('127.0.0.1:5500') || window.location.origin.includes('localhost:5500')) {
                apiUrl = `${window.location.protocol}//${window.location.hostname}:5000`;
            } else if (window.location.origin.includes('onrender.com') || window.location.hostname.includes('conectaking')) {
                apiUrl = 'https://www.conectaking.com.br';
            } else {
                apiUrl = window.location.origin;
            }
        }
        
        // Garantir que a URL não tenha barra no final
        apiUrl = apiUrl.replace(/\/$/, '');
        
        // Sempre usar API pública para evitar problemas de autenticação
        // A API pública retorna os mesmos dados, apenas sem necessidade de autenticação
        const apiEndpoint = `${apiUrl}/api/modules/plan-availability-public`;
        
        let response;
        try {
            response = await fetch(apiEndpoint, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                cache: 'no-cache'
            });
        } catch (fetchError) {
            console.warn('Módulos (planRenderer): falha na rede para', planCode, fetchError.message || fetchError);
            return { available: [], unavailable: [] };
        }
        
        if (!response.ok) {
            return { available: [], unavailable: [] };
        }
        
        let data;
        try {
            data = await response.json();
        } catch (parseError) {
            console.warn('Módulos (planRenderer): resposta inválida para', planCode);
            return { available: [], unavailable: [] };
        }
        const modules = data.modules || [];
        
        const availableModules = [];
        const allModules = [];
        
        // Mapear nomes de módulos para exibição
        const moduleLabels = {
            'carousel': 'Carrossel',
            'sales_page': 'Loja Virtual',
            'digital_form': 'King Forms',
            'portfolio': 'Portfólio',
            'banner': 'Banner',
            'finance': 'Gestão Financeira',
            'contract': 'Contratos',
            'agenda': 'Agenda Inteligente'
        };
        
        // Buscar módulos usando plan_code diretamente
        modules.forEach(module => {
            allModules.push(module.module_type);
            // Verificar se o módulo está disponível para este plan_code
            if (module.plans && module.plans[planCode]?.is_available === true) {
                availableModules.push(module.module_type);
            }
        });
        
        const unavailableModules = allModules.filter(m => !availableModules.includes(m));
        
        return {
            available: availableModules,
            unavailable: unavailableModules
        };
        } catch (error) {
            console.warn('Módulos (planRenderer): erro para', planCode, error.message || error);
            return { available: [], unavailable: [] };
        }
}

/**
 * Renderiza um card de plano (versão para dashboard - seção Assinatura)
 * ADM Principal não é exibido (plano interno).
 */
function renderPlanCardDashboard(plan, modules = null, pricingMode = 'monthly') {
    if (plan.plan_code === 'adm_principal' || plan.plan_code === 'abm') return '';
    const features = plan.features || {};
    const whatsapp = plan.whatsapp_number || '';
    const pix = plan.pix_key || '';
    const planModules = modules || { available: [], unavailable: [] };
    
    // Lógica específica por plano
    const isStart = plan.plan_code === 'basic';
    const isPrime = plan.plan_code === 'premium';
    const isBase = plan.plan_code === 'king_base';
    const isFinance = plan.plan_code === 'king_finance';
    const isFinancePlus = plan.plan_code === 'king_finance_plus';
    const isPremiumPlus = plan.plan_code === 'king_premium_plus';
    const isCorporate = plan.plan_code === 'king_corporate' || plan.plan_code === 'enterprise';
    
    // Textos personalizados para WhatsApp
    let ctaText = 'Assinar agora';
    let whatsappMsg = `Olá! Gostaria de adquirir o plano ${plan.plan_name} do ConectaKing!`;
    
    if (isStart) {
        ctaText = 'Começar agora';
        whatsappMsg = 'Olá! Gostaria de adquirir o plano King Start do ConectaKing!';
    } else if (isPrime) {
        ctaText = 'Quero o Prime';
        whatsappMsg = 'Olá! Gostaria de adquirir o plano King Prime do ConectaKing!';
    } else if (isBase) {
        ctaText = 'Quero o Essential';
        whatsappMsg = 'Olá! Gostaria de adquirir o plano King Essential do ConectaKing!';
    } else if (isFinance) {
        ctaText = 'Quero o Finance';
        whatsappMsg = 'Olá! Gostaria de adquirir o plano King Finance do ConectaKing!';
    } else if (isFinancePlus) {
        ctaText = 'Quero o Finance Plus';
        whatsappMsg = 'Olá! Gostaria de adquirir o plano King Finance Plus do ConectaKing!';
    } else if (isPremiumPlus) {
        ctaText = 'Quero o Premium Plus';
        whatsappMsg = 'Olá! Gostaria de adquirir o plano King Premium Plus do ConectaKing!';
    } else if (isCorporate) {
        ctaText = 'Ativar modo empresa';
        whatsappMsg = 'Olá! Gostaria de adquirir o plano King Corporate do ConectaKing!';
    }
    
    const finalWhatsappMessage = plan.whatsapp_message || whatsappMsg;
    const whatsappNumber = normalizeWhatsAppDigits(whatsapp) || getDefaultSalesWhatsAppNumber(plan);
    
    // Usar preços mensais ou anuais da API se disponíveis
    let basePrice;
    let priceLabel;
    let pixPrice;
    
    if (pricingMode === 'annual') {
        // Modo anual: usar annual_price se disponível, senão usar price
        basePrice = parseFloat(plan.annual_price || plan.price);
        priceLabel = '/ano';
        pixPrice = basePrice;
    } else {
        // Modo mensal: usar monthly_price se disponível, senão calcular (price / 12)
        basePrice = parseFloat(plan.monthly_price || (plan.price / 12));
        priceLabel = '/mês';
        pixPrice = basePrice;
    }
    
    return `
        <div class="subscription-plan-card ${isCorporate ? 'plan-highlighted' : ''}">
            <h3>${plan.plan_name}</h3>
            <div class="plan-price">
                <span class="plan-currency">R$</span>
                <span class="plan-amount">${basePrice.toFixed(2).replace('.', ',')}</span>
                <span class="plan-period" style="font-size: 0.9rem; color: var(--text-secondary, #888888);">${priceLabel}</span>
            </div>
            ${pricingMode === 'annual' ? `
            <div style="margin-top: 8px; padding: 8px; background: rgba(76, 175, 80, 0.1); border-radius: 6px; font-size: 0.9rem; color: #4CAF50; text-align: center;">
                <strong>No Pix</strong>
            </div>
            ` : `
            <div style="margin-top: 8px; padding: 8px; background: rgba(255, 199, 0, 0.1); border-radius: 6px; font-size: 0.9rem; color: var(--dourado-principal, #FFC700); text-align: center;">
                R$ ${pixPrice.toFixed(2).replace('.', ',')} por mês<br>
                <span style="font-size: 0.8rem; opacity: 0.8; color: var(--text-secondary, #888888);">(no Pix ou no cartão de crédito)</span>
            </div>
            `}
            <p class="plan-description">${plan.description || ''}</p>
            <ul class="plan-features">
                <li><i class="fas fa-check" style="color: #4CAF50;"></i> 1 perfil</li>
                ${(features.can_edit_logo || isCorporate) ? '<li><i class="fas fa-check" style="color: #4CAF50;"></i> Logomarca editável</li>' : ''}
                ${(isPrime || isCorporate) ? '<li><i class="fas fa-check" style="color: #4CAF50;"></i> Link personalizado</li>' : ''}
                ${isCorporate ? '<li><i class="fas fa-check" style="color: #4CAF50;"></i> Modo Empresarial</li><li><i class="fas fa-check" style="color: #4CAF50;"></i> 3 perfis</li>' : ''}
                ${isFinancePlus ? '<li><i class="fas fa-check" style="color: #4CAF50;"></i> 2 perfis de Gestão Financeira</li>' : ''}
                ${buildPlanModulesFeaturesHTML(planModules, { isDashboard: true })}
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
}

/**
 * Calcula preços para diferentes formas de pagamento (usado na página principal)
 */
function calculatePrices(basePrice) {
    const pixDiscount = 0.05; // 5% desconto PIX
    const cardInterest = 0.0299; // 2.99% ao mês
    const installments = 12;
    
    return {
        pix: basePrice * (1 - pixDiscount),
        cardPerMonth: (basePrice * (1 + cardInterest * installments)) / installments,
        monthly: basePrice
    };
}

/**
 * Renderiza um card de plano para a página principal (index.html)
 * Usa a mesma lógica de dados do dashboard mas mantém o estilo da página principal
 */
function renderPlanCardPublic(plan, modules = null, pricingMode = 'monthly') {
    // Validações iniciais
    if (!plan) {
        console.error('O Plano não fornecido para renderPlanCardPublic');
        return '';
    }
    if (plan.plan_code === 'adm_principal' || plan.plan_code === 'abm') return '';
    if (!plan.plan_name) {
        console.error('O Plano sem nome:', plan);
        return '';
    }
    const features = plan.features || {};
    const planModules = modules || { available: [], unavailable: [] };
    
    const monthlyBase = getMonthlyBasePrice(plan);
    const annualTotal = getAnnualPrice(plan);
    if (!monthlyBase || monthlyBase <= 0) {
        return `<div class="pricing-card"><p style="color: rgba(245,245,245,0.7);">Erro: preço inválido para ${plan.plan_name}</p></div>`;
    }
    const isAnnual = pricingMode === 'annual';
    const displayValue = isAnnual ? annualTotal : monthlyBase;
    const priceLabel = isAnnual ? '/ano' : '/mês';
    
    // Lógica específica por plano (mesma do dashboard)
    const isStart = plan.plan_code === 'basic';
    const isPrime = plan.plan_code === 'premium';
    const isBase = plan.plan_code === 'king_base';
    const isFinance = plan.plan_code === 'king_finance';
    const isFinancePlus = plan.plan_code === 'king_finance_plus';
    const isPremiumPlus = plan.plan_code === 'king_premium_plus';
    const isCorporate = plan.plan_code === 'enterprise' || plan.plan_code === 'king_corporate';
    const isFeatured = isPrime;
    
    // Textos personalizados para WhatsApp
    let ctaText = 'Assinar agora';
    let whatsappMsg = `Olá! Gostaria de adquirir o plano ${plan.plan_name} do ConectaKing!`;
    
    if (isStart) {
        ctaText = 'Começar agora';
        whatsappMsg = 'Olá! Gostaria de adquirir o plano King Start do ConectaKing!';
    } else if (isPrime) {
        ctaText = 'Quero o Prime';
        whatsappMsg = 'Olá! Gostaria de adquirir o plano King Prime do ConectaKing!';
    } else if (isBase) {
        ctaText = 'Quero o Essential';
        whatsappMsg = 'Olá! Gostaria de adquirir o plano King Essential do ConectaKing!';
    } else if (isFinance) {
        ctaText = 'Quero o Finance';
        whatsappMsg = 'Olá! Gostaria de adquirir o plano King Finance do ConectaKing!';
    } else if (isFinancePlus) {
        ctaText = 'Quero o Finance Plus';
        whatsappMsg = 'Olá! Gostaria de adquirir o plano King Finance Plus do ConectaKing!';
    } else if (isPremiumPlus) {
        ctaText = 'Quero o Premium Plus';
        whatsappMsg = 'Olá! Gostaria de adquirir o plano King Premium Plus do ConectaKing!';
    } else if (isCorporate) {
        ctaText = 'Ativar modo empresa';
        whatsappMsg = 'Olá! Gostaria de adquirir o plano King Corporate do ConectaKing!';
    }
    
    const finalWhatsappMessage = plan.whatsapp_message || whatsappMsg;
    const whatsappNumber = getDefaultSalesWhatsAppNumber(plan);
    const finalMessageWithMode = isAnnual
        ? `${finalWhatsappMessage}\n\nForma: Anual (-20%)\nValor: R$ ${formatBRL(displayValue)}/ano`
        : `${finalWhatsappMessage}\n\nForma: Mensal\nValor: R$ ${formatBRL(displayValue)}/mês`;
    
    // Estilo da página pública (igual à seção Assinatura do dashboard)
    const lineStyle = 'border-top: 1px solid rgba(255, 255, 255, 0.08);';
    const strongIncl = 'color: #FFFFFF;';
    const strongExcl = 'color: rgba(245, 245, 245, 0.45);';
    const checkColor = '#4CAF50';
    const crossColor = '#ff4444';

    let featuresHTML = '';
    if (isStart) {
        featuresHTML = `
        <li><i class="fas fa-check" style="color:${checkColor};"></i> 1 perfil</li>
        <li><i class="fas fa-check" style="color:${checkColor};"></i> Acesso a todos os módulos, exceto:</li>
        <li style="margin-top: 12px; padding-top: 12px; ${lineStyle}"><strong style="${strongExcl} font-size: 0.95rem;">Não incluído:</strong></li>
        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: ${crossColor}; margin-right: 8px;"></i> Logomarca editável</li>
        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: ${crossColor}; margin-right: 8px;"></i> Carrossel</li>
        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: ${crossColor}; margin-right: 8px;"></i> Loja Virtual</li>
        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: ${crossColor}; margin-right: 8px;"></i> King Forms</li>
        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: ${crossColor}; margin-right: 8px;"></i> Gestão Financeira</li>
        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: ${crossColor}; margin-right: 8px;"></i> Contratos</li>
        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: ${crossColor}; margin-right: 8px;"></i> Agenda Inteligente</li>`;
    } else if (isPrime) {
        featuresHTML = `
        ${features.can_edit_logo ? '<li><i class="fas fa-check" style="color:' + checkColor + ';"></i> Logomarca editável</li>' : ''}
        <li><i class="fas fa-check" style="color:${checkColor};"></i> 1 perfil</li>
        <li><i class="fas fa-check" style="color:${checkColor};"></i> Link personalizado</li>
        <li style="margin-top: 12px; padding-top: 12px; ${lineStyle}"><strong style="${strongIncl} font-size: 0.95rem;">Módulos incluídos:</strong></li>
        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: ${checkColor}; margin-right: 8px;"></i> Carrossel</li>
        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: ${checkColor}; margin-right: 8px;"></i> Portfólio</li>
        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: ${checkColor}; margin-right: 8px;"></i> Banner</li>
        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: ${checkColor}; margin-right: 8px;"></i> Loja Virtual</li>
        <li style="margin-top: 12px; padding-top: 12px; ${lineStyle}"><strong style="${strongExcl} font-size: 0.95rem;">Não incluído:</strong></li>
        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: ${crossColor}; margin-right: 8px;"></i> Gestão Financeira</li>
        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: ${crossColor}; margin-right: 8px;"></i> Contratos</li>
        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: ${crossColor}; margin-right: 8px;"></i> Agenda Inteligente</li>`;
    } else if (isFinance) {
        featuresHTML = `
        ${features.can_edit_logo ? '<li><i class="fas fa-check" style="color:' + checkColor + ';"></i> Logomarca editável</li>' : ''}
        <li><i class="fas fa-check" style="color:${checkColor};"></i> 1 perfil</li>
        <li style="margin-top: 12px; padding-top: 12px; ${lineStyle}"><strong style="${strongIncl} font-size: 0.95rem;">Módulos incluídos:</strong></li>
        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: ${checkColor}; margin-right: 8px;"></i> Carrossel</li>
        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: ${checkColor}; margin-right: 8px;"></i> Loja Virtual</li>
        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: ${checkColor}; margin-right: 8px;"></i> Portfólio</li>
        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: ${checkColor}; margin-right: 8px;"></i> Banner</li>
        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: ${checkColor}; margin-right: 8px;"></i> Gestão Financeira</li>
        <li style="margin-top: 12px; padding-top: 12px; ${lineStyle}"><strong style="${strongExcl} font-size: 0.95rem;">Não incluído:</strong></li>
        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: ${crossColor}; margin-right: 8px;"></i> King Forms</li>
        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: ${crossColor}; margin-right: 8px;"></i> Agenda Inteligente</li>`;
    } else if (isFinancePlus) {
        featuresHTML = `
        ${features.can_edit_logo ? '<li><i class="fas fa-check" style="color:' + checkColor + ';"></i> Logomarca editável</li>' : ''}
        <li><i class="fas fa-check" style="color:${checkColor};"></i> 1 perfil de cartão virtual</li>
        <li><i class="fas fa-check" style="color:${checkColor};"></i> 2 perfis de Gestão Financeira</li>
        <li style="margin-top: 12px; padding-top: 12px; ${lineStyle}"><strong style="${strongIncl} font-size: 0.95rem;">Módulos incluídos:</strong></li>
        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: ${checkColor}; margin-right: 8px;"></i> Carrossel</li>
        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: ${checkColor}; margin-right: 8px;"></i> Loja Virtual</li>
        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: ${checkColor}; margin-right: 8px;"></i> Contratos</li>
        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: ${checkColor}; margin-right: 8px;"></i> Gestão Financeira</li>
        <li style="margin-top: 12px; padding-top: 12px; ${lineStyle}"><strong style="${strongExcl} font-size: 0.95rem;">Não incluído:</strong></li>
        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: ${crossColor}; margin-right: 8px;"></i> King Forms</li>
        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: ${crossColor}; margin-right: 8px;"></i> Agenda Inteligente</li>`;
    } else if (isPremiumPlus) {
        featuresHTML = `
        ${features.can_edit_logo ? '<li><i class="fas fa-check" style="color:' + checkColor + ';"></i> Logomarca editável</li>' : ''}
        <li><i class="fas fa-check" style="color:${checkColor};"></i> 1 perfil</li>
        <li style="margin-top: 12px; padding-top: 12px; ${lineStyle}"><strong style="${strongIncl} font-size: 0.95rem;">Módulos incluídos:</strong></li>
        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: ${checkColor}; margin-right: 8px;"></i> Gestão Financeira</li>
        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: ${checkColor}; margin-right: 8px;"></i> Contratos</li>
        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: ${checkColor}; margin-right: 8px;"></i> Agenda Inteligente</li>
        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: ${checkColor}; margin-right: 8px;"></i> Carrossel</li>
        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: ${checkColor}; margin-right: 8px;"></i> Loja Virtual</li>
        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: ${checkColor}; margin-right: 8px;"></i> King Forms</li>`;
    } else if (isCorporate) {
        featuresHTML = `
        <li><i class="fas fa-check" style="color:${checkColor};"></i> Logomarca editável</li>
        <li><i class="fas fa-check" style="color:${checkColor};"></i> Modo Empresarial</li>
        <li><i class="fas fa-check" style="color:${checkColor};"></i> 3 perfis</li>
        <li style="margin-top: 12px; padding-top: 12px; ${lineStyle}"><strong style="${strongExcl} font-size: 0.95rem;">Não incluído:</strong></li>
        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: ${crossColor}; margin-right: 8px;"></i> Gestão Financeira</li>
        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: ${crossColor}; margin-right: 8px;"></i> Loja Virtual</li>
        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: ${crossColor}; margin-right: 8px;"></i> Agenda Inteligente</li>
        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: ${crossColor}; margin-right: 8px;"></i> Contratos</li>`;
    } else if (isBase) {
        featuresHTML = `
        ${features.can_edit_logo ? '<li><i class="fas fa-check" style="color:' + checkColor + ';"></i> Logomarca editável</li>' : ''}
        <li><i class="fas fa-check" style="color:${checkColor};"></i> 1 perfil</li>
        <li style="margin-top: 12px; padding-top: 12px; ${lineStyle}"><strong style="${strongIncl} font-size: 0.95rem;">Módulos incluídos:</strong></li>
        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: ${checkColor}; margin-right: 8px;"></i> Carrossel</li>
        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: ${checkColor}; margin-right: 8px;"></i> Loja Virtual</li>
        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: ${checkColor}; margin-right: 8px;"></i> Portfólio</li>
        <li style="padding-left: 8px;"><i class="fas fa-check" style="color: ${checkColor}; margin-right: 8px;"></i> Banner</li>
        <li style="margin-top: 12px; padding-top: 12px; ${lineStyle}"><strong style="${strongExcl} font-size: 0.95rem;">Não incluído:</strong></li>
        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: ${crossColor}; margin-right: 8px;"></i> King Forms</li>
        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: ${crossColor}; margin-right: 8px;"></i> Contratos</li>
        <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: ${crossColor}; margin-right: 8px;"></i> Agenda Inteligente</li>`;
    } else {
        const introHTML = `
        <li><i class="fas fa-check" style="color:${checkColor};"></i> 1 perfil</li>
        ${features.can_edit_logo || isCorporate ? '<li><i class="fas fa-check" style="color:' + checkColor + ';"></i> Logomarca editável</li>' : ''}
        ${(isPrime || isCorporate) ? '<li><i class="fas fa-check" style="color:' + checkColor + ';"></i> Link personalizado</li>' : ''}
        ${isCorporate ? '<li><i class="fas fa-check" style="color:' + checkColor + ';"></i> Modo Empresarial</li><li><i class="fas fa-check" style="color:' + checkColor + ';"></i> 3 perfis</li>' : ''}
        ${isFinancePlus ? '<li><i class="fas fa-check" style="color:' + checkColor + ';"></i> 2 perfis de Gestão Financeira</li>' : ''}
        `;
        featuresHTML = introHTML + buildPlanModulesFeaturesHTML(planModules, { isDashboard: false });
    }

    const pixKey = (plan.pix_key || (typeof window !== 'undefined' ? window.CONECTAKING_PIX_KEY : '') || '').toString();

    return `
        <div class="pricing-card fade-in">
            <div class="plan-title">${plan.plan_name}</div>
            <div class="plan-price-row">
                <span class="plan-currency">R$</span>
                <span class="plan-price">${formatBRL(displayValue)}</span>
                <span class="plan-period">${priceLabel}</span>
            </div>
            <div class="plan-pill">
                <span class="plan-pill-amount">R$ ${formatBRL(displayValue)} ${isAnnual ? 'por ano' : 'por mês'}</span>
                <span class="plan-pill-note">(no Pix ou no cartão de crédito)</span>
            </div>
            <p class="plan-desc">${plan.description || ''}</p>
            <ul class="plan-features">
                ${featuresHTML}
            </ul>
            <div class="plan-actions">
                <a href="https://wa.me/${normalizeWhatsAppDigits(whatsappNumber)}?text=${encodeURIComponent(finalMessageWithMode)}" target="_blank" class="plan-btn plan-btn-primary">
                    <i class="fas fa-clock"></i> ${ctaText}
                </a>
                <button class="plan-btn plan-btn-secondary" type="button" onclick="copyPixKey('${pixKey.replace(/'/g, "\\'")}')">
                    <i class="fas fa-copy"></i> Copiar Chave PIX
                </button>
            </div>
        </div>
    `;
}

/**
 * Renderiza planos para a página principal (index.html) ou dashboard
 */
async function renderPlansShared(plans, containerId, isDashboard = false) {
    let container = document.getElementById(containerId);
    if (!container) {
        console.error('O Container não encontrado:', containerId);
        return;
    }
    
    if (plans.length === 0) {
        container.innerHTML = '<p style="text-align: center; grid-column: 1 / -1;">Nenhum plano disponível no momento.</p>';
        return;
    }
    // ADM Principal é interno: não exibir na assinatura nem no site
    const plansFiltered = plans
        .filter(p => p.plan_code !== 'adm_principal' && p.plan_code !== 'abm');

    // Ordenação fixa para bater com o layout de referência do site
    const ORDER = [
        'basic',               // King Start
        'premium',             // King Prime
        'king_finance',        // King Finance
        'king_finance_plus',   // King Finance Plus
        'king_premium_plus',   // King Premium Plus
        'king_corporate',      // King Corporate
        'enterprise'           // fallback antigo
    ];
    const orderIndex = (code) => {
        const idx = ORDER.indexOf(code);
        return idx === -1 ? 999 : idx;
    };
    plansFiltered.sort((a, b) => {
        const ai = orderIndex(a?.plan_code);
        const bi = orderIndex(b?.plan_code);
        if (ai !== bi) return ai - bi;
        return String(a?.plan_name || '').localeCompare(String(b?.plan_name || ''));
    });
    if (plansFiltered.length === 0) {
        container.innerHTML = '<p style="text-align: center; grid-column: 1 / -1;">Nenhum plano disponível no momento.</p>';
        return;
    }
    
    // Carregar módulos para todos os planos
    const plansWithModules = await Promise.all(plansFiltered.map(async (plan) => {
        try {
            const modules = await loadPlanModules(plan.plan_code);
            return { ...plan, modules };
        } catch (error) {
            return { ...plan, modules: { available: [], unavailable: [] } };
        }
    }));
    
    // Armazenar planos carregados globalmente para uso no toggle
    window.loadedPlansWithModules = plansWithModules.map(plan => ({
        ...plan,
        modules: plan.modules || { available: [], unavailable: [] }
    }));
    window.plansContainer = container;
    window.plansContainerId = containerId;
    
    // Se não for dashboard, adicionar toggle mensal/anual antes dos planos
    if (!isDashboard) {
        // Verificar se o toggle já existe
        let toggleContainer = document.getElementById('pricing-toggle-container');
        if (!toggleContainer) {
            // Criar container para o toggle
            toggleContainer = document.createElement('div');
            toggleContainer.id = 'pricing-toggle-container';
            toggleContainer.style.cssText = 'display: flex; justify-content: center; align-items: center; gap: 16px; margin-bottom: 40px; padding: 20px 0;';
            
            // Criar toggle
            const toggleWrapper = document.createElement('div');
            toggleWrapper.style.cssText = 'display: flex; align-items: center; gap: 12px; background: var(--graphite, #1F1F1F); padding: 8px; border-radius: 50px; border: 2px solid rgba(255, 199, 0, 0.3);';
            
            const monthlyBtn = document.createElement('button');
            monthlyBtn.id = 'toggle-monthly';
            monthlyBtn.textContent = 'Mensal';
            monthlyBtn.style.cssText = 'padding: 12px 32px; border: none; border-radius: 50px; background: var(--yellow-primary, #FFC700); color: var(--black-absolute, #0B0B0B); font-weight: 600; font-size: 1rem; cursor: pointer; transition: all 0.3s ease;';
            monthlyBtn.classList.add('active');
            
            const annualBtn = document.createElement('button');
            annualBtn.id = 'toggle-annual';
            annualBtn.innerHTML = 'Anual <span style="color: #4CAF50; font-size: 0.85rem; margin-left: 4px;">-20%</span>';
            annualBtn.style.cssText = 'padding: 12px 32px; border: none; border-radius: 50px; background: transparent; color: var(--white, #F5F5F5); font-weight: 600; font-size: 1rem; cursor: pointer; transition: all 0.3s ease;';
            
            // Adicionar event listeners
            monthlyBtn.addEventListener('click', () => {
                console.log('Toggle Mensal clicado');
                monthlyBtn.style.background = 'var(--yellow-primary, #FFC700)';
                monthlyBtn.style.color = 'var(--black-absolute, #0B0B0B)';
                annualBtn.style.background = 'transparent';
                annualBtn.style.color = 'var(--white, #F5F5F5)';
                monthlyBtn.classList.add('active');
                annualBtn.classList.remove('active');
                window.currentPricingMode = 'monthly';
                
                // Re-renderizar planos usando dados globais
                let plans = window.loadedPlansWithModules;
                let container = window.plansContainer;
                
                // Se container não estiver disponível, buscar pelo ID
                if (!container && window.plansContainerId) {
                    container = document.getElementById(window.plansContainerId);
                    window.plansContainer = container;
                }
                
                // Se ainda não encontrou, tentar ID padrão
                if (!container) {
                    container = document.getElementById('plans-container');
                    if (container) {
                        window.plansContainer = container;
                        console.log('Container encontrado pelo ID padrão');
                    }
                }
                
                // Verificar se plans ainda está válido
                if (!plans || plans.length === 0) {
                    plans = window.loadedPlansWithModules;
                }
                
                console.log('Dados disponíveis:', {
                    plans: plans?.length || 0,
                    container: container ? 'encontrado' : 'não encontrado',
                    containerId: container?.id,
                    containerExists: !!container,
                    firstPlan: plans?.[0]?.plan_name || 'N/A'
                });
                
                if (plans && plans.length > 0 && container) {
                    console.log('Renderizando planos mensais...');
                    renderPlansWithMode(plans, container, 'monthly');
                } else {
                    console.error('O Dados ou container não disponíveis!', {
                        hasPlans: !!plans,
                        plansLength: plans?.length || 0,
                        hasContainer: !!container,
                        containerId: container?.id
                    });
                    if (container) {
                        container.innerHTML = '<p style="text-align: center; grid-column: 1 / -1; color: rgba(245, 245, 245, 0.7);">Erro ao carregar planos. Recarregue a página.</p>';
                    } else {
                        console.error('O Container não encontrado! Tentando recarregar planos...');
                        // Tentar recarregar se a função estiver disponível
                        if (typeof loadPlans === 'function') {
                            console.log('Y"" Tentando recarregar planos...');
                            loadPlans();
                        }
                    }
                }
            });
            
            annualBtn.addEventListener('click', () => {
                console.log('Toggle Anual clicado');
                annualBtn.style.background = 'var(--yellow-primary, #FFC700)';
                annualBtn.style.color = 'var(--black-absolute, #0B0B0B)';
                monthlyBtn.style.background = 'transparent';
                monthlyBtn.style.color = 'var(--white, #F5F5F5)';
                annualBtn.classList.add('active');
                monthlyBtn.classList.remove('active');
                window.currentPricingMode = 'annual';
                
                // Re-renderizar planos usando dados globais
                let plans = window.loadedPlansWithModules;
                let container = window.plansContainer;
                
                // Se container não estiver disponível, buscar pelo ID
                if (!container && window.plansContainerId) {
                    container = document.getElementById(window.plansContainerId);
                    window.plansContainer = container;
                }
                
                // Se ainda não encontrou, tentar ID padrão
                if (!container) {
                    container = document.getElementById('plans-container');
                    if (container) {
                        window.plansContainer = container;
                        console.log('Container encontrado pelo ID padrão');
                    }
                }
                
                // Verificar se plans ainda está válido
                if (!plans || plans.length === 0) {
                    plans = window.loadedPlansWithModules;
                }
                
                console.log('Dados disponíveis:', {
                    plans: plans?.length || 0,
                    container: container ? 'encontrado' : 'não encontrado',
                    containerId: container?.id,
                    containerExists: !!container,
                    firstPlan: plans?.[0]?.plan_name || 'N/A'
                });
                
                if (plans && plans.length > 0 && container) {
                    console.log('Renderizando planos anuais...');
                    renderPlansWithMode(plans, container, 'annual');
                } else {
                    console.error('O Dados ou container não disponíveis!', {
                        hasPlans: !!plans,
                        plansLength: plans?.length || 0,
                        hasContainer: !!container,
                        containerId: container?.id
                    });
                    if (container) {
                        container.innerHTML = '<p style="text-align: center; grid-column: 1 / -1; color: rgba(245, 245, 245, 0.7);">Erro ao carregar planos. Recarregue a página.</p>';
                    } else {
                        console.error('O Container não encontrado! Tentando recarregar planos...');
                        // Tentar recarregar se a função estiver disponível
                        if (typeof loadPlans === 'function') {
                            console.log('Y"" Tentando recarregar planos...');
                            loadPlans();
                        }
                    }
                }
            });
            
            toggleWrapper.appendChild(monthlyBtn);
            toggleWrapper.appendChild(annualBtn);
            toggleContainer.appendChild(toggleWrapper);
            
            // Inserir antes do container de planos
            container.parentNode.insertBefore(toggleContainer, container);
        }
        
        // Definir modo inicial
        window.currentPricingMode = window.currentPricingMode || 'monthly';
        
        // Garantir que os dados estão armazenados antes de renderizar
        if (!window.loadedPlansWithModules) {
            window.loadedPlansWithModules = plansWithModules;
        }
        if (!window.plansContainer) {
            window.plansContainer = container;
        }
        if (!window.plansContainerId) {
            window.plansContainerId = containerId;
        }
        
        // Renderizar planos com o modo atual
        console.log('YZ Renderizando planos iniciais com modo:', window.currentPricingMode);
        renderPlansWithMode(plansWithModules, container, window.currentPricingMode);
    } else {
        // Dashboard: adicionar toggle também
        let toggleContainer = document.getElementById('pricing-toggle-container-dashboard');
        if (!toggleContainer) {
            toggleContainer = document.createElement('div');
            toggleContainer.id = 'pricing-toggle-container-dashboard';
            toggleContainer.style.cssText = 'display: flex; justify-content: center; align-items: center; gap: 16px; margin-bottom: 30px; padding: 15px 0;';
            
            const toggleWrapper = document.createElement('div');
            toggleWrapper.style.cssText = 'display: flex; align-items: center; gap: 12px; background: var(--card-bg, #2C2C2F); padding: 8px; border-radius: 50px; border: 2px solid rgba(255, 199, 0, 0.3);';
            
            const monthlyBtn = document.createElement('button');
            monthlyBtn.id = 'toggle-monthly-dashboard';
            monthlyBtn.textContent = 'Mensal';
            monthlyBtn.style.cssText = 'padding: 10px 28px; border: none; border-radius: 50px; background: var(--dourado-principal, #FFC700); color: var(--text-primary, #FFFFFF); font-weight: 600; font-size: 0.95rem; cursor: pointer; transition: all 0.3s ease;';
            monthlyBtn.classList.add('active');
            
            const annualBtn = document.createElement('button');
            annualBtn.id = 'toggle-annual-dashboard';
            annualBtn.innerHTML = 'Anual <span style="color: #4CAF50; font-size: 0.8rem; margin-left: 4px;">-20%</span>';
            annualBtn.style.cssText = 'padding: 10px 28px; border: none; border-radius: 50px; background: transparent; color: var(--text-secondary, #888888); font-weight: 600; font-size: 0.95rem; cursor: pointer; transition: all 0.3s ease;';
            
            monthlyBtn.addEventListener('click', () => {
                monthlyBtn.style.background = 'var(--dourado-principal, #FFC700)';
                monthlyBtn.style.color = 'var(--text-primary, #FFFFFF)';
                annualBtn.style.background = 'transparent';
                annualBtn.style.color = 'var(--text-secondary, #888888)';
                monthlyBtn.classList.add('active');
                annualBtn.classList.remove('active');
                window.currentPricingModeDashboard = 'monthly';
                if (window.loadedPlansWithModulesDashboard && window.plansContainerDashboard) {
                    renderPlansWithModeDashboard(window.loadedPlansWithModulesDashboard, window.plansContainerDashboard, 'monthly');
                }
            });
            
            annualBtn.addEventListener('click', () => {
                annualBtn.style.background = 'var(--dourado-principal, #FFC700)';
                annualBtn.style.color = 'var(--text-primary, #FFFFFF)';
                monthlyBtn.style.background = 'transparent';
                monthlyBtn.style.color = 'var(--text-secondary, #888888)';
                annualBtn.classList.add('active');
                monthlyBtn.classList.remove('active');
                window.currentPricingModeDashboard = 'annual';
                if (window.loadedPlansWithModulesDashboard && window.plansContainerDashboard) {
                    renderPlansWithModeDashboard(window.loadedPlansWithModulesDashboard, window.plansContainerDashboard, 'annual');
                }
            });
            
            toggleWrapper.appendChild(monthlyBtn);
            toggleWrapper.appendChild(annualBtn);
            toggleContainer.appendChild(toggleWrapper);
            
            container.parentNode.insertBefore(toggleContainer, container);
        }
        
        // Armazenar dados do dashboard
        window.loadedPlansWithModulesDashboard = plansWithModules;
        window.plansContainerDashboard = container;
        window.currentPricingModeDashboard = window.currentPricingModeDashboard || 'monthly';
        
        // Renderizar planos com o modo atual
        renderPlansWithModeDashboard(plansWithModules, container, window.currentPricingModeDashboard);
    }
    
    // Se não for dashboard, aplicar animações específicas da página principal se necessário
    if (!isDashboard && typeof IntersectionObserver !== 'undefined') {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });
        
        document.querySelectorAll('.pricing-card').forEach(el => observer.observe(el));
    }
}

/**
 * Renderiza planos com modo de preço específico (mensal ou anual) - Página pública
 */
function renderPlansWithMode(plansWithModules, container, mode = 'monthly') {
    try {
        console.log('Y"" Renderizando planos com modo:', mode, 'Planos:', plansWithModules?.length);
        
        if (!container) {
            console.error('O Container não encontrado!');
            return;
        }
        
        if (!plansWithModules || plansWithModules.length === 0) {
            console.warn('Nenhum plano disponível');
            container.innerHTML = '<p style="text-align: center; grid-column: 1 / -1; color: rgba(245, 245, 245, 0.7);">Nenhum plano disponível no momento.</p>';
            return;
        }
        
        console.log('YZ Iniciando renderização de', plansWithModules.length, 'planos no modo', mode);
        
        const html = plansWithModules.map((plan, index) => {
            try {
                if (!plan) {
                    console.warn(`Plano ${index} é null ou undefined`);
                    return '';
                }
                
                // Garantir que plan.modules existe
                const planModules = plan.modules || { available: [], unavailable: [] };
                
                // Validar dados essenciais do plano
                if (!plan.plan_name) {
                    console.warn(`Plano ${index} sem nome:`, plan);
                    return '';
                }
                
                if (!plan.plan_code) {
                    console.warn(`Plano ${plan.plan_name} sem código`);
                    return '';
                }
                
                const result = renderPlanCardPublic(plan, planModules, mode);
                if (!result || result.trim() === '') {
                    console.warn(`Plano ${plan.plan_name} retornou HTML vazio`);
                    return '';
                }
                
                return result;
            } catch (error) {
                console.error('O Erro ao renderizar plano:', plan?.plan_name || `Plano ${index}`, error);
                console.error('Stack:', error.stack);
                console.error('Plano completo:', plan);
                return '';
            }
        }).filter(html => html !== '' && html !== null && html !== undefined).join('');
        
        console.log('HTML gerado:', html.length, 'caracteres');
        
        if (!html || html.trim() === '') {
            console.error('O HTML vazio gerado!', {
                plansCount: plansWithModules.length,
                mode: mode,
                firstPlan: plansWithModules[0]
            });
            container.innerHTML = '<p style="text-align: center; grid-column: 1 / -1; color: rgba(245, 245, 245, 0.7); padding: 20px;">Erro ao renderizar planos. Recarregue a página.</p>';
            return;
        }
        
        // Verificar se o container ainda existe antes de atualizar
        if (!container.parentNode) {
            console.error('O Container foi removido do DOM!');
            container = document.getElementById('plans-container');
            if (!container) {
                console.error('O Container não encontrado após remoção!');
                return;
            }
            window.plansContainer = container;
        }
        
        container.innerHTML = html;
        console.log('Planos renderizados com sucesso:', plansWithModules.length, 'planos no modo', mode);
        
        // Re-aplicar observador de interseção se necessário
        if (typeof IntersectionObserver !== 'undefined') {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                    }
                });
            }, { threshold: 0.1 });
            
            container.querySelectorAll('.pricing-card').forEach(el => observer.observe(el));
        }
    } catch (error) {
        console.error('O Erro crítico em renderPlansWithMode:', error);
        if (container) {
            container.innerHTML = '<p style="text-align: center; grid-column: 1 / -1; color: #ff4444; padding: 20px;">Erro ao exibir planos. Por favor, recarregue a página.</p>';
        }
    }
}

/**
 * Renderiza planos com modo de preço específico (mensal ou anual) - Dashboard
 */
function renderPlansWithModeDashboard(plansWithModules, container, mode = 'monthly') {
    if (!plansWithModules || plansWithModules.length === 0) {
        container.innerHTML = '<p>Nenhum plano disponível no momento.</p>';
        return;
    }
    container.innerHTML = plansWithModules.map(plan => renderPlanCardDashboard(plan, plan.modules, mode)).join('');
}

/**
 * Função para copiar chave PIX (compartilhada) - idêntica ao dashboard
 */
function copyPixKey(pixKey) {
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
}

// Exportar funções para uso global
if (typeof window !== 'undefined') {
    window.loadPlanModules = loadPlanModules;
    window.renderPlanCardDashboard = renderPlanCardDashboard;
    window.renderPlanCardPublic = renderPlanCardPublic;
    window.renderPlansShared = renderPlansShared;
    window.renderPlansWithMode = renderPlansWithMode;
    window.renderPlansWithModeDashboard = renderPlansWithModeDashboard;
    window.calculatePrices = calculatePrices;
    window.copyPixKey = copyPixKey;
}
