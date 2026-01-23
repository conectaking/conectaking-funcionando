/**
 * Função compartilhada para renderizar planos de assinatura
 * Usada tanto na página principal quanto na seção Assinatura do dashboard
 */

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
                apiUrl = 'https://conectaking-api.onrender.com';
            } else {
                apiUrl = window.location.origin;
            }
        }
        
        // Garantir que a URL não tenha barra no final
        apiUrl = apiUrl.replace(/\/$/, '');
        
        // Sempre usar API pública para evitar problemas de autenticação
        // A API pública retorna os mesmos dados, apenas sem necessidade de autenticação
        const apiEndpoint = `${apiUrl}/api/modules/plan-availability-public`;
        
        console.log(`🔄 Carregando módulos para ${planCode} de: ${apiEndpoint}`);
        
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
            console.error('❌ Erro ao fazer fetch:', fetchError);
            // Retornar vazio em caso de erro de rede
            return { available: [], unavailable: [] };
        }
        
        if (!response.ok) {
            console.warn(`⚠️ Resposta não OK: ${response.status} ${response.statusText}`);
            return { available: [], unavailable: [] };
        }
        
        const data = await response.json();
        const modules = data.modules || [];
        
        console.log(`✅ ${modules.length} módulos carregados para ${planCode}`);
        
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
        
        console.log(`📊 Módulos para ${planCode}: ${availableModules.length} disponíveis, ${unavailableModules.length} indisponíveis`);
        
        return {
            available: availableModules,
            unavailable: unavailableModules
        };
        } catch (error) {
            console.error('❌ Erro ao carregar módulos da disponibilidade:', error);
            console.error('Stack:', error.stack);
            // Retornar vazio em caso de erro para não quebrar a renderização
            return { available: [], unavailable: [] };
        }
}

/**
 * Renderiza um card de plano (versão para dashboard - seção Assinatura)
 */
function renderPlanCardDashboard(plan, modules = null, billingType = 'monthly') {
    const features = plan.features || {};
    const whatsapp = plan.whatsapp_number || '';
    const pix = plan.pix_key || '';
    const planModules = modules || { available: [], unavailable: [] };
    
    // Módulos importantes para destacar
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
        if (planModules.available.includes(moduleType)) {
            importantAvailable.push(importantModules[moduleType]);
        } else if (planModules.unavailable.includes(moduleType)) {
            importantUnavailable.push(importantModules[moduleType]);
        }
    });
    
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
    const whatsappNumber = whatsapp || '5511999999999';
    
    // Obter informações de pagamento (paymentOptions vem da API)
    const paymentOptions = plan.paymentOptions || {};
    const planBillingType = plan.billingType || billingType || 'monthly';
    
    // Valores mensais fixos conforme especificação do usuário
    const monthlyValues = {
        'basic': 70.00,              // King Start: R$ 70,00
        'premium': 100.00,           // King Prime: R$ 100,00
        'king_base': 100.00,        // King Essential: R$ 100,00
        'king_finance': 120.00,      // King Finance: proporcional
        'king_finance_plus': 140.00, // King Finance Plus: proporcional
        'king_premium_plus': 150.00, // King Premium Plus: proporcional
        'king_corporate': 150.00     // King Corporate: proporcional
    };
    
    const basePrice = parseFloat(plan.price) || 0;
    const planCode = plan.plan_code;
    const monthlyPrice = monthlyValues[planCode] || (basePrice / 12);
    
    let displayPrice;
    if (planBillingType === 'monthly') {
        // Valor mensal fixo conforme especificação
        displayPrice = monthlyPrice;
    } else {
        // Valor anual = valor exato do banco
        displayPrice = basePrice;
    }
    
    // Usar paymentOptions da API se disponível, senão calcular
    const pixPrice = paymentOptions.pix?.price || displayPrice;
    const installmentInfo = paymentOptions.installment;
    
    // Calcular valores se paymentOptions não vier da API (fallback)
    let installmentPrice = null;
    let installmentValue = null;
    if (!installmentInfo && planCode !== 'basic') {
        // Outros planos: 12x no cartão
        installmentPrice = monthlyPrice * 12;
        installmentValue = monthlyPrice;
    } else if (installmentInfo) {
        installmentPrice = installmentInfo.totalPrice;
        installmentValue = installmentInfo.installmentValue;
    }
    
    // Títulos de pagamento
    const pixTitle = paymentOptions.pix?.title || 'À vista no Pix';
    const cardTitle = paymentOptions.installment?.title || '12x no cartão';
    
    // Label de período
    const periodLabel = planBillingType === 'annual' ? '/ano' : '/mês';
    
    return `
        <div class="subscription-plan-card ${isCorporate ? 'plan-highlighted' : ''}" data-plan-code="${plan.plan_code}">
            <h3>${plan.plan_name}</h3>
            <div class="plan-price">
                <span class="plan-currency">R$</span>
                <span class="plan-amount">${pixPrice.toFixed(2).replace('.', ',')}</span>
                <span class="plan-period" style="font-size: 0.9rem; color: var(--text-secondary, #888888);">${periodLabel}</span>
            </div>
            ${planCode === 'basic' ? `
            <!-- King Start: apenas PIX -->
            <div class="plan-payment-methods" style="margin-top: 12px; padding: 12px; background: rgba(255, 199, 0, 0.05); border-radius: 8px; border: 1px solid rgba(255, 199, 0, 0.2);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 0.9rem; color: var(--text-primary, #FFFFFF); font-weight: 600;">${pixTitle}:</span>
                    <span style="font-size: 0.9rem; color: #FFC700; font-weight: 700;">R$ ${pixPrice.toFixed(2).replace('.', ',')}${planBillingType === 'monthly' ? ' por mês' : ' à vista'}</span>
                </div>
            </div>
            ` : installmentPrice ? `
            <!-- Outros planos: PIX + Cartão 12x -->
            <div class="plan-payment-methods" style="margin-top: 12px; padding: 12px; background: rgba(255, 199, 0, 0.05); border-radius: 8px; border: 1px solid rgba(255, 199, 0, 0.2);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 0.9rem; color: var(--text-primary, #FFFFFF); font-weight: 600;">${pixTitle}:</span>
                    <span style="font-size: 0.9rem; color: #FFC700; font-weight: 700;">R$ ${pixPrice.toFixed(2).replace('.', ',')}${planBillingType === 'monthly' ? ' por mês' : ' à vista'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 0.9rem; color: var(--text-primary, #FFFFFF); font-weight: 600;">${cardTitle}:</span>
                    <span style="font-size: 0.9rem; color: var(--text-secondary, #888888);">12x de R$ ${installmentValue.toFixed(2).replace('.', ',')}</span>
                </div>
            </div>
            ` : ''}
            <p class="plan-description">${plan.description || ''}</p>
            <ul class="plan-features">
                ${isStart ? `
                <!-- King Start: 1 perfil + Acesso a todos módulos exceto -->
                <li><i class="fas fa-check" style="color: #4CAF50;"></i> 1 perfil</li>
                <li><i class="fas fa-check" style="color: #4CAF50;"></i> Acesso a todos os módulos, exceto:</li>
                <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color, #2C2C2F);">
                    <strong style="color: var(--text-secondary, #888888); font-size: 0.95rem;">✗ Não Incluído:</strong>
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
                <!-- King Prime: 1 perfil + Módulos incluídos (Carrossel, Portfólio, Banner, Loja Virtual) + Não incluído: King Forms, Gestão Financeira, Contratos, Agenda -->
                ${features.can_edit_logo ? '<li><i class="fas fa-check" style="color: #4CAF50;"></i> Logomarca editável</li>' : ''}
                <li><i class="fas fa-check" style="color: #4CAF50;"></i> 1 perfil</li>
                <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color, #2C2C2F);">
                    <strong style="color: var(--text-primary, #FFFFFF); font-size: 0.95rem;">✓ Módulos Incluídos:</strong>
                </li>
                <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Carrossel</li>
                <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Portfólio</li>
                <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Banner</li>
                <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Loja Virtual</li>
                <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color, #2C2C2F);">
                    <strong style="color: var(--text-secondary, #888888); font-size: 0.95rem;">✗ Não Incluído:</strong>
                </li>
                <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> King Forms</li>
                <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Gestão Financeira</li>
                <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Contratos</li>
                <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Agenda Inteligente</li>
                ` : ''}
                
                ${isBase ? `
                <!-- King Essential: 1 perfil + Módulos incluídos + Não incluído -->
                ${features.can_edit_logo ? '<li><i class="fas fa-check" style="color: #4CAF50;"></i> Logomarca editável</li>' : ''}
                <li><i class="fas fa-check" style="color: #4CAF50;"></i> 1 perfil</li>
                <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color, #2C2C2F);">
                    <strong style="color: var(--text-primary, #FFFFFF); font-size: 0.95rem;">✓ Módulos Incluídos:</strong>
                </li>
                <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Carrossel</li>
                <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Loja Virtual</li>
                <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Portfólio</li>
                <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Banner</li>
                <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color, #2C2C2F);">
                    <strong style="color: var(--text-secondary, #888888); font-size: 0.95rem;">✗ Não Incluído:</strong>
                </li>
                <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> King Forms</li>
                <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Contratos</li>
                <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Agenda Inteligente</li>
                ` : ''}
                
                ${isFinance ? `
                <!-- King Finance: 1 perfil + Módulos incluídos (SEM King Forms, Contratos, Agenda) + Não incluído: King Forms, Contratos, Agenda -->
                ${features.can_edit_logo ? '<li><i class="fas fa-check" style="color: #4CAF50;"></i> Logomarca editável</li>' : ''}
                <li><i class="fas fa-check" style="color: #4CAF50;"></i> 1 perfil</li>
                <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color, #2C2C2F);">
                    <strong style="color: var(--text-primary, #FFFFFF); font-size: 0.95rem;">✓ Módulos Incluídos:</strong>
                </li>
                <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Carrossel</li>
                <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Loja Virtual</li>
                <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Portfólio</li>
                <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Banner</li>
                <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Gestão Financeira</li>
                <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color, #2C2C2F);">
                    <strong style="color: var(--text-secondary, #888888); font-size: 0.95rem;">✗ Não Incluído:</strong>
                </li>
                <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> King Forms</li>
                <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Contratos</li>
                <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Agenda Inteligente</li>
                ` : ''}
                
                ${isFinancePlus ? `
                <!-- King Finance Plus: 2 perfis gestão financeira + Módulos incluídos (SEM King Forms) + Não incluído: King Forms, Agenda -->
                ${features.can_edit_logo ? '<li><i class="fas fa-check" style="color: #4CAF50;"></i> Logomarca editável</li>' : ''}
                <li><i class="fas fa-check" style="color: #4CAF50;"></i> 1 perfil de cartão virtual</li>
                <li><i class="fas fa-check" style="color: #4CAF50;"></i> 2 perfis de Gestão Financeira</li>
                <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color, #2C2C2F);">
                    <strong style="color: var(--text-primary, #FFFFFF); font-size: 0.95rem;">✓ Módulos Incluídos:</strong>
                </li>
                <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Carrossel</li>
                <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Loja Virtual</li>
                <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Contratos</li>
                <li style="padding-left: 8px;"><i class="fas fa-check" style="color: #4CAF50; margin-right: 8px;"></i> Gestão Financeira</li>
                <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color, #2C2C2F);">
                    <strong style="color: var(--text-secondary, #888888); font-size: 0.95rem;">✗ Não Incluído:</strong>
                </li>
                <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> King Forms</li>
                <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Agenda Inteligente</li>
                ` : ''}
                
                ${isPremiumPlus ? `
                <!-- King Premium Plus: Tudo incluído (incluindo Agenda Inteligente e King Forms a partir de R$ 2.200) -->
                ${features.can_edit_logo ? '<li><i class="fas fa-check" style="color: #4CAF50;"></i> Logomarca editável</li>' : ''}
                <li><i class="fas fa-check" style="color: #4CAF50;"></i> 1 perfil</li>
                <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color, #2C2C2F);">
                    <strong style="color: var(--text-primary, #FFFFFF); font-size: 0.95rem;">✓ Módulos Incluídos:</strong>
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
                    <strong style="color: var(--text-secondary, #888888); font-size: 0.95rem;">✗ Não Incluído:</strong>
                </li>
                <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Gestão Financeira</li>
                <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Loja Virtual</li>
                <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Agenda Inteligente</li>
                <li style="padding-left: 8px; opacity: 0.7;"><i class="fas fa-times" style="color: #ff4444; margin-right: 8px;"></i> Contratos</li>
                ` : ''}
            </ul>
            <div class="plan-actions">
                <a id="whatsapp-btn-${plan.plan_code}" href="https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(planCode === 'basic' 
                    ? `Olá! Gostaria de assinar o plano *${plan.plan_name}*\n\n*Forma de Pagamento:* Pix\n*Valor:* R$ ${pixPrice.toFixed(2).replace('.', ',')}${planBillingType === 'monthly' ? ' por mês' : ' à vista'}\n\nPor favor, envie a chave PIX para confirmação.`
                    : `Olá! Gostaria de assinar o plano *${plan.plan_name}*\n\n*Forma de Pagamento:*\n- Pix: R$ ${pixPrice.toFixed(2).replace('.', ',')}${planBillingType === 'monthly' ? ' por mês' : ' à vista'}\n- Cartão: 12x de R$ ${installmentValue ? installmentValue.toFixed(2).replace('.', ',') : '0,00'}\n\nPor favor, envie a chave PIX para confirmação.`)}" target="_blank" class="btn btn-primary" style="width: 100%; margin-bottom: 10px;">
                    <i class="fab fa-whatsapp"></i> ${ctaText}
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
function renderPlanCardPublic(plan, modules = null) {
    const features = plan.features || {};
    const planModules = modules || { available: [], unavailable: [] };
    
    const basePrice = parseFloat(plan.price);
    const prices = calculatePrices(basePrice);
    
    // Lógica específica por plano (mesma do dashboard)
    const isStart = plan.plan_code === 'basic';
    const isPrime = plan.plan_code === 'premium';
    const isBase = plan.plan_code === 'king_base';
    const isFinance = plan.plan_code === 'king_finance';
    const isFinancePlus = plan.plan_code === 'king_finance_plus';
    const isPremiumPlus = plan.plan_code === 'king_premium_plus';
    const isCorporate = plan.plan_code === 'enterprise' || plan.plan_code === 'king_corporate';
    const isFeatured = isPrime;
    
    // Módulos importantes para destacar
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
        if (planModules.available.includes(moduleType)) {
            importantAvailable.push(importantModules[moduleType]);
        } else if (planModules.unavailable.includes(moduleType)) {
            importantUnavailable.push(importantModules[moduleType]);
        }
    });
    
    // Textos personalizados para WhatsApp (mesma lógica do dashboard)
    let ctaText = 'Começar agora';
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
    const whatsappNumber = plan.whatsapp_number || '5511999999999';
    
    // Renderizar features usando a mesma lógica do dashboard
    let featuresHTML = '';
    
    if (isStart) {
        featuresHTML = `
            <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 199, 0, 0.2);">
                <strong style="color: var(--yellow-primary); font-size: 0.95rem;">✓ Você tem acesso a todos os módulos menos esses que estão abaixo:</strong>
            </li>
            <li style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255, 199, 0, 0.1);">
                <strong style="color: rgba(245, 245, 245, 0.6); font-size: 0.9rem;">✗ Não Incluído:</strong>
            </li>
            ${!features.can_edit_logo ? '<li style="padding-left: 8px; opacity: 0.6;"><i class="fas fa-times" style="color: rgba(245, 245, 245, 0.4); margin-right: 8px;"></i> Logomarca editável</li>' : ''}
            <li style="padding-left: 8px; opacity: 0.6;"><i class="fas fa-times" style="color: rgba(245, 245, 245, 0.4); margin-right: 8px;"></i> Carrossel</li>
            <li style="padding-left: 8px; opacity: 0.6;"><i class="fas fa-times" style="color: rgba(245, 245, 245, 0.4); margin-right: 8px;"></i> Loja Virtual</li>
            <li style="padding-left: 8px; opacity: 0.6;"><i class="fas fa-times" style="color: rgba(245, 245, 245, 0.4); margin-right: 8px;"></i> King Forms</li>
            <li style="padding-left: 8px; opacity: 0.6;"><i class="fas fa-times" style="color: rgba(245, 245, 245, 0.4); margin-right: 8px;"></i> Gestão Financeira</li>
            <li style="padding-left: 8px; opacity: 0.6;"><i class="fas fa-times" style="color: rgba(245, 245, 245, 0.4); margin-right: 8px;"></i> Contratos</li>
            <li style="padding-left: 8px; opacity: 0.6;"><i class="fas fa-times" style="color: rgba(245, 245, 245, 0.4); margin-right: 8px;"></i> Agenda Inteligente</li>
            <li style="padding-left: 8px; opacity: 0.8; margin-top: 8px; color: var(--yellow-primary);">
                <i class="fas fa-gift" style="color: var(--yellow-primary); margin-right: 8px;"></i> <strong>Bônus:</strong> Link Personalizado
            </li>
        `;
    } else if (isPrime) {
        featuresHTML = `
            ${features.can_edit_logo ? '<li><i class="fas fa-check"></i> Logomarca editável</li>' : ''}
            <li><i class="fas fa-check"></i> 1 perfil</li>
            <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 199, 0, 0.2);">
                <strong style="color: var(--yellow-primary); font-size: 0.9rem;">✓ Módulos Incluídos:</strong>
            </li>
            <li style="padding-left: 8px;"><i class="fas fa-check" style="color: var(--yellow-primary); margin-right: 8px;"></i> Carrossel</li>
            <li style="padding-left: 8px;"><i class="fas fa-check" style="color: var(--yellow-primary); margin-right: 8px;"></i> Portfólio</li>
            <li style="padding-left: 8px;"><i class="fas fa-check" style="color: var(--yellow-primary); margin-right: 8px;"></i> Banner</li>
            <li style="padding-left: 8px;"><i class="fas fa-check" style="color: var(--yellow-primary); margin-right: 8px;"></i> Loja Virtual</li>
            <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 199, 0, 0.2);">
                <strong style="color: rgba(245, 245, 245, 0.6); font-size: 0.9rem;">✗ Não Incluído:</strong>
            </li>
            <li style="padding-left: 8px; opacity: 0.6;"><i class="fas fa-times" style="color: rgba(245, 245, 245, 0.4); margin-right: 8px;"></i> King Forms</li>
            <li style="padding-left: 8px; opacity: 0.6;"><i class="fas fa-times" style="color: rgba(245, 245, 245, 0.4); margin-right: 8px;"></i> Gestão Financeira</li>
            <li style="padding-left: 8px; opacity: 0.6;"><i class="fas fa-times" style="color: rgba(245, 245, 245, 0.4); margin-right: 8px;"></i> Contratos</li>
            <li style="padding-left: 8px; opacity: 0.6;"><i class="fas fa-times" style="color: rgba(245, 245, 245, 0.4); margin-right: 8px;"></i> Agenda Inteligente</li>
        `;
    } else if (isBase) {
        featuresHTML = `
            ${features.can_edit_logo ? '<li><i class="fas fa-check"></i> Logomarca editável</li>' : ''}
            <li><i class="fas fa-check"></i> 1 perfil</li>
            <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 199, 0, 0.2);">
                <strong style="color: var(--yellow-primary); font-size: 0.9rem;">✓ Módulos Incluídos:</strong>
            </li>
            <li style="padding-left: 8px;"><i class="fas fa-check" style="color: var(--yellow-primary); margin-right: 8px;"></i> Carrossel</li>
            <li style="padding-left: 8px;"><i class="fas fa-check" style="color: var(--yellow-primary); margin-right: 8px;"></i> Loja Virtual</li>
            <li style="padding-left: 8px;"><i class="fas fa-check" style="color: var(--yellow-primary); margin-right: 8px;"></i> Portfólio</li>
            <li style="padding-left: 8px;"><i class="fas fa-check" style="color: var(--yellow-primary); margin-right: 8px;"></i> Banner</li>
            <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 199, 0, 0.2);">
                <strong style="color: rgba(245, 245, 245, 0.6); font-size: 0.9rem;">✗ Não Incluído:</strong>
            </li>
            <li style="padding-left: 8px; opacity: 0.6;"><i class="fas fa-times" style="color: rgba(245, 245, 245, 0.4); margin-right: 8px;"></i> King Forms</li>
            <li style="padding-left: 8px; opacity: 0.6;"><i class="fas fa-times" style="color: rgba(245, 245, 245, 0.4); margin-right: 8px;"></i> Contratos</li>
            <li style="padding-left: 8px; opacity: 0.6;"><i class="fas fa-times" style="color: rgba(245, 245, 245, 0.4); margin-right: 8px;"></i> Agenda Inteligente</li>
        `;
    } else if (isFinance) {
        featuresHTML = `
            ${features.can_edit_logo ? '<li><i class="fas fa-check"></i> Logomarca editável</li>' : ''}
            <li><i class="fas fa-check"></i> 1 perfil</li>
            <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 199, 0, 0.2);">
                <strong style="color: var(--yellow-primary); font-size: 0.9rem;">✓ Módulos Incluídos:</strong>
            </li>
            <li style="padding-left: 8px;"><i class="fas fa-check" style="color: var(--yellow-primary); margin-right: 8px;"></i> Carrossel</li>
            <li style="padding-left: 8px;"><i class="fas fa-check" style="color: var(--yellow-primary); margin-right: 8px;"></i> Loja Virtual</li>
            <li style="padding-left: 8px;"><i class="fas fa-check" style="color: var(--yellow-primary); margin-right: 8px;"></i> Portfólio</li>
            <li style="padding-left: 8px;"><i class="fas fa-check" style="color: var(--yellow-primary); margin-right: 8px;"></i> Banner</li>
            <li style="padding-left: 8px;"><i class="fas fa-check" style="color: var(--yellow-primary); margin-right: 8px;"></i> Gestão Financeira</li>
            <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 199, 0, 0.2);">
                <strong style="color: rgba(245, 245, 245, 0.6); font-size: 0.9rem;">✗ Não Incluído:</strong>
            </li>
            <li style="padding-left: 8px; opacity: 0.6;"><i class="fas fa-times" style="color: rgba(245, 245, 245, 0.4); margin-right: 8px;"></i> King Forms</li>
            <li style="padding-left: 8px; opacity: 0.6;"><i class="fas fa-times" style="color: rgba(245, 245, 245, 0.4); margin-right: 8px;"></i> Contratos</li>
            <li style="padding-left: 8px; opacity: 0.6;"><i class="fas fa-times" style="color: rgba(245, 245, 245, 0.4); margin-right: 8px;"></i> Agenda Inteligente</li>
        `;
    } else if (isFinancePlus) {
        featuresHTML = `
            ${features.can_edit_logo ? '<li><i class="fas fa-check"></i> Logomarca editável</li>' : ''}
            <li><i class="fas fa-check"></i> 1 perfil de cartão virtual</li>
            <li><i class="fas fa-check"></i> 2 perfis de Gestão Financeira</li>
            <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 199, 0, 0.2);">
                <strong style="color: var(--yellow-primary); font-size: 0.9rem;">✓ Módulos Incluídos:</strong>
            </li>
            <li style="padding-left: 8px;"><i class="fas fa-check" style="color: var(--yellow-primary); margin-right: 8px;"></i> Carrossel</li>
            <li style="padding-left: 8px;"><i class="fas fa-check" style="color: var(--yellow-primary); margin-right: 8px;"></i> Loja Virtual</li>
            <li style="padding-left: 8px;"><i class="fas fa-check" style="color: var(--yellow-primary); margin-right: 8px;"></i> Contratos</li>
            <li style="padding-left: 8px;"><i class="fas fa-check" style="color: var(--yellow-primary); margin-right: 8px;"></i> Gestão Financeira</li>
            <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 199, 0, 0.2);">
                <strong style="color: rgba(245, 245, 245, 0.6); font-size: 0.9rem;">✗ Não Incluído:</strong>
            </li>
            <li style="padding-left: 8px; opacity: 0.6;"><i class="fas fa-times" style="color: rgba(245, 245, 245, 0.4); margin-right: 8px;"></i> King Forms</li>
            <li style="padding-left: 8px; opacity: 0.6;"><i class="fas fa-times" style="color: rgba(245, 245, 245, 0.4); margin-right: 8px;"></i> Agenda Inteligente</li>
        `;
    } else if (isPremiumPlus) {
        featuresHTML = `
            ${features.can_edit_logo ? '<li><i class="fas fa-check"></i> Logomarca editável</li>' : ''}
            <li><i class="fas fa-check"></i> 1 perfil</li>
            <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 199, 0, 0.2);">
                <strong style="color: var(--yellow-primary); font-size: 0.9rem;">✓ Módulos Incluídos:</strong>
            </li>
            <li style="padding-left: 8px;"><i class="fas fa-check" style="color: var(--yellow-primary); margin-right: 8px;"></i> Gestão Financeira</li>
            <li style="padding-left: 8px;"><i class="fas fa-check" style="color: var(--yellow-primary); margin-right: 8px;"></i> Contratos</li>
            <li style="padding-left: 8px;"><i class="fas fa-check" style="color: var(--yellow-primary); margin-right: 8px;"></i> Agenda Inteligente</li>
            <li style="padding-left: 8px;"><i class="fas fa-check" style="color: var(--yellow-primary); margin-right: 8px;"></i> Carrossel</li>
            <li style="padding-left: 8px;"><i class="fas fa-check" style="color: var(--yellow-primary); margin-right: 8px;"></i> Loja Virtual</li>
            <li style="padding-left: 8px;"><i class="fas fa-check" style="color: var(--yellow-primary); margin-right: 8px;"></i> King Forms</li>
        `;
    } else if (isCorporate) {
        featuresHTML = `
            <li><i class="fas fa-check"></i> Logomarca editável</li>
            <li><i class="fas fa-check"></i> Modo Empresarial</li>
            <li><i class="fas fa-check"></i> 3 perfis</li>
            <li style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 199, 0, 0.2);">
                <strong style="color: rgba(245, 245, 245, 0.6); font-size: 0.9rem;">✗ Não Incluído:</strong>
            </li>
            <li style="padding-left: 8px; opacity: 0.6;"><i class="fas fa-times" style="color: rgba(245, 245, 245, 0.4); margin-right: 8px;"></i> Gestão Financeira</li>
            <li style="padding-left: 8px; opacity: 0.6;"><i class="fas fa-times" style="color: rgba(245, 245, 245, 0.4); margin-right: 8px;"></i> Loja Virtual</li>
            <li style="padding-left: 8px; opacity: 0.6;"><i class="fas fa-times" style="color: rgba(245, 245, 245, 0.4); margin-right: 8px;"></i> Agenda Inteligente</li>
            <li style="padding-left: 8px; opacity: 0.6;"><i class="fas fa-times" style="color: rgba(245, 245, 245, 0.4); margin-right: 8px;"></i> Contratos</li>
        `;
    }
    
    return `
        <div class="pricing-card ${isFeatured ? 'featured' : ''} fade-in">
            <div class="plan-name">${plan.plan_name}</div>
            <div class="plan-price-section">
                <div class="plan-price-main">
                    <span class="currency">R$</span>${basePrice.toFixed(2).replace('.', ',')}
                </div>
                <div class="payment-options">
                    <div class="payment-option">
                        <span><strong>PIX:</strong> À vista no Pix</span>
                        <span class="value">R$ ${prices.pix.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <div class="payment-option">
                        <span><strong>Cartão:</strong> Até 12x</span>
                        <span class="value">R$ ${prices.cardPerMonth.toFixed(2).replace('.', ',')}/mês</span>
                    </div>
                    <div class="payment-option">
                        <span><strong>Mensal:</strong> Recorrente</span>
                        <span class="value">R$ ${prices.monthly.toFixed(2).replace('.', ',')}/mês</span>
                    </div>
                </div>
            </div>
            <p class="plan-description">${plan.description || ''}</p>
            <ul class="plan-features">
                ${featuresHTML}
            </ul>
            <a href="https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(finalWhatsappMessage)}" target="_blank" class="btn btn-primary" style="width: 100%; margin-top: 20px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <i class="fab fa-whatsapp"></i> ${ctaText}
            </a>
            ${plan.pix_key ? `
            <button class="btn btn-secondary" style="width: 100%; margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 8px;" onclick="copyPixKey('${plan.pix_key}')">
                <i class="fas fa-copy"></i> Copiar Chave PIX
            </button>
            ` : ''}
        </div>
    `;
}

/**
 * Renderiza planos para a página principal (index.html) ou dashboard
 */
async function renderPlansShared(plans, containerId, isDashboard = false, billingType = 'monthly') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (plans.length === 0) {
        container.innerHTML = '<p style="text-align: center; grid-column: 1 / -1;">Nenhum plano disponível no momento.</p>';
        return;
    }
    
    // Carregar módulos para todos os planos
    const plansWithModules = await Promise.all(plans.map(async (plan) => {
        const modules = await loadPlanModules(plan.plan_code);
        return { ...plan, modules, billingType: billingType };
    }));
    
    // Usar a mesma renderização do dashboard para ambos os contextos
    // Isso garante que tudo seja idêntico
    container.innerHTML = plansWithModules.map(plan => renderPlanCardDashboard(plan, plan.modules, billingType)).join('');
    
    // Se não for dashboard, aplicar animações específicas da página principal se necessário
    if (!isDashboard && typeof IntersectionObserver !== 'undefined') {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });
        
        document.querySelectorAll('.subscription-plan-card').forEach(el => observer.observe(el));
    }
}

/**
 * Atualiza o método de pagamento selecionado e a mensagem do WhatsApp
 */
window.updatePaymentMethod = function(planCode, method, price, installmentValue = null, installments = null) {
    // Encontrar o card que contém o input com este name
    const radioInput = document.querySelector(`input[name="payment-method-${planCode}"]:checked`);
    if (!radioInput) return;
    
    const card = radioInput.closest('.subscription-plan-card');
    if (!card) return;
    
    // Atualizar estilo dos labels
    card.querySelectorAll(`input[name="payment-method-${planCode}"]`).forEach(input => {
        const label = input.closest('label');
        if (!label) return;
        
        if (input.value === method) {
            label.style.borderColor = '#FFC700';
            label.style.background = 'rgba(255, 199, 0, 0.15)';
        } else {
            label.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            label.style.background = 'rgba(255, 255, 255, 0.03)';
        }
    });
    
    // Atualizar mensagem do WhatsApp
    const whatsappBtn = document.getElementById(`whatsapp-btn-${planCode}`);
    if (!whatsappBtn) {
        // Tentar encontrar o botão de outra forma
        const btn = card.querySelector('a[href*="wa.me"]');
        if (!btn) return;
        
        const planName = card.querySelector('h3')?.textContent || 'Plano';
        const whatsappNumber = btn.href.match(/wa\.me\/(\d+)/)?.[1] || '5511999999999';
        
        let message = `Olá! Gostaria de assinar o plano *${planName}*\n\n`;
        message += `*Forma de Pagamento:* ${method === 'pix' ? 'Pix' : 'Cartão de Crédito'}\n`;
        
        if (method === 'pix') {
            message += `*Valor:* R$ ${price.toFixed(2).replace('.', ',')} (à vista)\n`;
        } else {
            message += `*Valor Total:* R$ ${price.toFixed(2).replace('.', ',')}\n`;
            message += `*Parcelas:* ${installments}x de R$ ${installmentValue.toFixed(2).replace('.', ',')}\n`;
            message += `*Acréscimo:* 20%\n`;
        }
        
        message += `\nPor favor, envie a chave PIX para confirmação.`;
        
        btn.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
        return;
    }
    
    const planName = card.querySelector('h3')?.textContent || 'Plano';
    const whatsappNumber = whatsappBtn.href.match(/wa\.me\/(\d+)/)?.[1] || '5511999999999';
    
    let message = `Olá! Gostaria de assinar o plano *${planName}*\n\n`;
    message += `*Forma de Pagamento:* ${method === 'pix' ? 'Pix' : 'Cartão de Crédito'}\n`;
    
    if (method === 'pix') {
        message += `*Valor:* R$ ${price.toFixed(2).replace('.', ',')} (à vista)\n`;
    } else {
        message += `*Valor Total:* R$ ${price.toFixed(2).replace('.', ',')}\n`;
        message += `*Parcelas:* ${installments}x de R$ ${installmentValue.toFixed(2).replace('.', ',')}\n`;
        message += `*Acréscimo:* 20%\n`;
    }
    
    message += `\nPor favor, envie a chave PIX para confirmação.`;
    
    // Atualizar link do WhatsApp
    whatsappBtn.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
};

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
    window.calculatePrices = calculatePrices;
    window.copyPixKey = copyPixKey;
}
