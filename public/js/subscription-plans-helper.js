/**
 * Helper para renderização de planos de assinatura com opções de pagamento
 * Compatível com a nova API que retorna paymentOptions
 */

/**
 * Formata valor monetário para exibição
 */
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

/**
 * Formata valor simples (sem símbolo R$)
 */
function formatPrice(value) {
    return value.toFixed(2).replace('.', ',');
}

/**
 * Renderiza card de plano com opções de pagamento
 * @param {Object} plan - Plano com paymentOptions
 * @param {Object} options - Opções de renderização
 * @returns {HTMLElement} Elemento HTML do card
 */
function renderPlanCard(plan, options = {}) {
    const {
        showFeatures = true,
        showDescription = true,
        onSelectPlan = null,
        selectedPaymentMethod = 'pix' // 'pix' ou 'installment'
    } = options;

    const card = document.createElement('div');
    card.className = 'plan-card';
    card.dataset.planCode = plan.plan_code;
    card.dataset.planId = plan.id;

    const pixPrice = plan.paymentOptions?.pix?.price || plan.price;
    const installmentInfo = plan.paymentOptions?.installment;

    // Header do card
    const header = document.createElement('div');
    header.className = 'plan-header';
    header.innerHTML = `
        <h3 class="plan-name">${plan.plan_name}</h3>
        ${plan.description && showDescription ? `<p class="plan-description">${plan.description}</p>` : ''}
    `;

    // Seção de preço
    const priceSection = document.createElement('div');
    priceSection.className = 'plan-price-section';

    // Preço Pix (principal)
    const pixPriceDiv = document.createElement('div');
    pixPriceDiv.className = 'pix-price';
    pixPriceDiv.innerHTML = `
        <span class="currency">R$</span>
        <span class="amount">${formatPrice(pixPrice)}</span>
        <span class="method-badge pix-badge">Pix</span>
    `;

    // Opção de parcelamento
    let installmentDiv = '';
    if (installmentInfo) {
        installmentDiv = `
            <div class="installment-option">
                <span class="installment-text">ou até ${installmentInfo.installments}x de R$ ${formatPrice(installmentInfo.installmentValue)}</span>
                <small class="installment-note">(acréscimo de ${installmentInfo.increasePercentage || 20}%)</small>
            </div>
        `;
    }

    priceSection.innerHTML = pixPriceDiv.outerHTML + installmentDiv;

    // Seletor de método de pagamento
    const paymentSelector = document.createElement('div');
    paymentSelector.className = 'payment-method-selector';
    paymentSelector.innerHTML = `
        <div class="payment-option ${selectedPaymentMethod === 'pix' ? 'active' : ''}" data-method="pix">
            <input type="radio" name="payment-${plan.plan_code}" id="pix-${plan.plan_code}" value="pix" ${selectedPaymentMethod === 'pix' ? 'checked' : ''}>
            <label for="pix-${plan.plan_code}">
                <span class="method-icon">💳</span>
                <span class="method-name">Pix</span>
                <span class="method-price">${formatCurrency(pixPrice)}</span>
            </label>
        </div>
        ${installmentInfo ? `
        <div class="payment-option ${selectedPaymentMethod === 'installment' ? 'active' : ''}" data-method="installment">
            <input type="radio" name="payment-${plan.plan_code}" id="card-${plan.plan_code}" value="installment" ${selectedPaymentMethod === 'installment' ? 'checked' : ''}>
            <label for="card-${plan.plan_code}">
                <span class="method-icon">💳</span>
                <span class="method-name">Cartão</span>
                <span class="method-price">${formatCurrency(installmentInfo.totalPrice)}</span>
                <span class="method-installments">${installmentInfo.label}</span>
            </label>
        </div>
        ` : ''}
    `;

    // Features (se disponível)
    let featuresDiv = '';
    if (showFeatures && plan.features) {
        const features = typeof plan.features === 'string' ? JSON.parse(plan.features) : plan.features;
        const featuresList = [];
        
        if (features.can_add_all_modules) featuresList.push('✅ Todos os módulos');
        if (features.can_edit_logo) featuresList.push('✅ Logomarca editável');
        if (features.max_profiles) featuresList.push(`✅ ${features.max_profiles} perfil(is)`);
        if (features.includes_nfc) featuresList.push('✅ NFC');
        if (features.unlimited_links) featuresList.push('✅ Links ilimitados');
        if (features.includes_portfolio) featuresList.push('✅ Portfólio');
        if (features.suporte_prioritario) featuresList.push('✅ Suporte prioritário');

        if (featuresList.length > 0) {
            featuresDiv = `
                <div class="plan-features">
                    <ul>
                        ${featuresList.map(f => `<li>${f}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
    }

    // Botão de ação
    const actionButton = document.createElement('button');
    actionButton.className = 'btn-assinar';
    actionButton.textContent = 'Assinar Agora';
    actionButton.addEventListener('click', () => {
        const selectedMethod = card.querySelector('input[type="radio"]:checked')?.value || 'pix';
        if (onSelectPlan) {
            onSelectPlan(plan, selectedMethod);
        }
    });

    // Montar card
    card.appendChild(header);
    card.appendChild(priceSection);
    card.appendChild(paymentSelector);
    if (featuresDiv) {
        card.innerHTML += featuresDiv;
    }
    card.appendChild(actionButton);

    // Adicionar listeners para mudança de método de pagamento
    card.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const method = e.target.value;
            card.querySelectorAll('.payment-option').forEach(opt => {
                opt.classList.toggle('active', opt.dataset.method === method);
            });
        });
    });

    return card;
}

/**
 * Renderiza grid de planos
 * @param {Array} plans - Array de planos
 * @param {HTMLElement} container - Container onde os planos serão renderizados
 * @param {Object} options - Opções de renderização
 */
function renderPlansGrid(plans, container, options = {}) {
    if (!container) {
        console.error('Container não fornecido');
        return;
    }

    // Limpar container
    container.innerHTML = '';

    // Criar grid
    const grid = document.createElement('div');
    grid.className = 'plans-grid';

    // Renderizar cada plano
    plans.forEach(plan => {
        const card = renderPlanCard(plan, options);
        grid.appendChild(card);
    });

    container.appendChild(grid);
}

/**
 * Carrega planos da API e renderiza
 * @param {HTMLElement} container - Container onde os planos serão renderizados
 * @param {Object} options - Opções
 */
async function loadAndRenderPlans(container, options = {}) {
    const {
        apiEndpoint = '/api/subscription/plans-public',
        onSelectPlan = null,
        showFeatures = true,
        showDescription = true
    } = options;

    try {
        const response = await fetch(apiEndpoint);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const plans = data.plans || data.availablePlans || [];

        if (plans.length === 0) {
            container.innerHTML = '<p class="no-plans">Nenhum plano disponível no momento.</p>';
            return;
        }

        renderPlansGrid(plans, container, {
            onSelectPlan,
            showFeatures,
            showDescription
        });

    } catch (error) {
        console.error('Erro ao carregar planos:', error);
        container.innerHTML = `
            <div class="error-message">
                <p>Erro ao carregar planos. Por favor, tente novamente.</p>
                <button onclick="location.reload()">Recarregar</button>
            </div>
        `;
    }
}

/**
 * Obtém informações de pagamento do plano selecionado
 * @param {Object} plan - Plano
 * @param {string} method - Método de pagamento ('pix' ou 'installment')
 * @returns {Object} Informações de pagamento
 */
function getPaymentInfo(plan, method = 'pix') {
    if (!plan.paymentOptions) {
        // Fallback para planos sem paymentOptions
        return {
            method: 'PIX',
            price: plan.price,
            label: 'Pix',
            description: 'Pagamento à vista via Pix'
        };
    }

    return plan.paymentOptions[method] || plan.paymentOptions.pix;
}

// Exportar funções para uso global
if (typeof window !== 'undefined') {
    window.SubscriptionPlansHelper = {
        renderPlanCard,
        renderPlansGrid,
        loadAndRenderPlans,
        getPaymentInfo,
        formatCurrency,
        formatPrice
    };
}
