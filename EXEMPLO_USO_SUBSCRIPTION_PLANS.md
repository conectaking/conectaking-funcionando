# 📖 Exemplo de Uso - Subscription Plans Helper

## 🎯 Como Integrar no Frontend

### 1. Incluir Arquivos

Adicione os arquivos CSS e JS no seu HTML:

```html
<!-- CSS -->
<link rel="stylesheet" href="/css/subscription-plans.css">

<!-- JavaScript -->
<script src="/js/subscription-plans-helper.js"></script>
```

---

## 📝 Exemplos de Uso

### Exemplo 1: Carregar e Renderizar Planos Automaticamente

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Planos de Assinatura</title>
    <link rel="stylesheet" href="/css/subscription-plans.css">
</head>
<body>
    <div id="plans-container"></div>

    <script src="/js/subscription-plans-helper.js"></script>
    <script>
        // Quando a página carregar, renderizar planos
        document.addEventListener('DOMContentLoaded', () => {
            const container = document.getElementById('plans-container');
            
            window.SubscriptionPlansHelper.loadAndRenderPlans(container, {
                onSelectPlan: (plan, paymentMethod) => {
                    console.log('Plano selecionado:', plan.plan_name);
                    console.log('Método de pagamento:', paymentMethod);
                    
                    // Obter informações de pagamento
                    const paymentInfo = window.SubscriptionPlansHelper.getPaymentInfo(plan, paymentMethod);
                    console.log('Informações de pagamento:', paymentInfo);
                    
                    // Redirecionar ou abrir modal de pagamento
                    // window.location.href = `/checkout?plan=${plan.id}&method=${paymentMethod}`;
                },
                showFeatures: true,
                showDescription: true
            });
        });
    </script>
</body>
</html>
```

---

### Exemplo 2: Renderizar Planos Manualmente

```javascript
// Buscar planos da API
async function loadPlans() {
    try {
        const response = await fetch('/api/subscription/plans-public');
        const data = await response.json();
        const plans = data.plans;

        // Renderizar no container
        const container = document.getElementById('plans-container');
        window.SubscriptionPlansHelper.renderPlansGrid(plans, container, {
            onSelectPlan: handlePlanSelection,
            showFeatures: true
        });
    } catch (error) {
        console.error('Erro ao carregar planos:', error);
    }
}

function handlePlanSelection(plan, paymentMethod) {
    alert(`Você selecionou ${plan.plan_name} com pagamento via ${paymentMethod}`);
    // Implementar lógica de checkout
}

// Chamar quando necessário
loadPlans();
```

---

### Exemplo 3: Renderizar Card Individual

```javascript
// Criar um card de plano individual
const plan = {
    id: 1,
    plan_code: 'basic',
    plan_name: 'King Start',
    price: 700.00,
    description: 'Ideal para iniciar sua presença digital',
    paymentOptions: {
        pix: {
            method: 'PIX',
            price: 700.00,
            label: 'Pix',
            description: 'Pagamento à vista via Pix'
        },
        installment: {
            method: 'CARTÃO',
            totalPrice: 840.00,
            installmentValue: 70.00,
            installments: 12,
            label: 'Até 12x',
            description: 'Até 12x de R$ 70,00'
        }
    }
};

// Renderizar card
const card = window.SubscriptionPlansHelper.renderPlanCard(plan, {
    onSelectPlan: (plan, method) => {
        console.log('Plano selecionado:', plan, method);
    },
    selectedPaymentMethod: 'pix'
});

// Adicionar ao DOM
document.getElementById('plans-container').appendChild(card);
```

---

### Exemplo 4: Integração com Dashboard Existente

```javascript
// Função para carregar informações de assinatura
async function loadSubscriptionInfo() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/subscription/info', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        // Renderizar planos disponíveis
        if (data.availablePlans && data.availablePlans.length > 0) {
            const container = document.getElementById('available-plans');
            window.SubscriptionPlansHelper.renderPlansGrid(data.availablePlans, container, {
                onSelectPlan: handlePlanSelection,
                showFeatures: true,
                showDescription: true
            });
        }

        // Exibir plano atual
        if (data.currentPlan) {
            displayCurrentPlan(data.currentPlan);
        }
    } catch (error) {
        console.error('Erro ao carregar informações de assinatura:', error);
    }
}

function handlePlanSelection(plan, paymentMethod) {
    const paymentInfo = window.SubscriptionPlansHelper.getPaymentInfo(plan, paymentMethod);
    
    // Abrir modal de confirmação
    showCheckoutModal({
        plan: plan.plan_name,
        price: paymentInfo.price,
        method: paymentInfo.method,
        installments: paymentMethod === 'installment' ? plan.paymentOptions.installment.installments : null
    });
}

function displayCurrentPlan(plan) {
    const currentPlanDiv = document.getElementById('current-plan');
    currentPlanDiv.innerHTML = `
        <h3>Seu Plano Atual</h3>
        <p><strong>${plan.plan_name}</strong></p>
        <p>Valor: ${window.SubscriptionPlansHelper.formatCurrency(plan.price)}</p>
    `;
}
```

---

### Exemplo 5: Customização de Estilos

```css
/* Personalizar cores dos cards */
.plan-card {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border-color: #FFC700;
}

.plan-name {
    color: #FFC700;
    text-shadow: 0 2px 4px rgba(255, 199, 0, 0.3);
}

.btn-assinar {
    background: linear-gradient(135deg, #FFC700 0%, #FF8C00 100%);
    box-shadow: 0 4px 15px rgba(255, 199, 0, 0.3);
}

.btn-assinar:hover {
    box-shadow: 0 6px 20px rgba(255, 199, 0, 0.5);
}
```

---

## 🔧 Funções Disponíveis

### `renderPlanCard(plan, options)`
Renderiza um card individual de plano.

**Parâmetros:**
- `plan` (Object): Objeto do plano com `paymentOptions`
- `options` (Object): Opções de renderização
  - `showFeatures` (boolean): Mostrar features do plano
  - `showDescription` (boolean): Mostrar descrição
  - `onSelectPlan` (function): Callback quando plano é selecionado
  - `selectedPaymentMethod` (string): Método padrão ('pix' ou 'installment')

**Retorna:** HTMLElement

---

### `renderPlansGrid(plans, container, options)`
Renderiza um grid de planos.

**Parâmetros:**
- `plans` (Array): Array de planos
- `container` (HTMLElement): Container onde renderizar
- `options` (Object): Mesmas opções de `renderPlanCard`

---

### `loadAndRenderPlans(container, options)`
Carrega planos da API e renderiza automaticamente.

**Parâmetros:**
- `container` (HTMLElement): Container onde renderizar
- `options` (Object):
  - `apiEndpoint` (string): URL da API (padrão: '/api/subscription/plans-public')
  - `onSelectPlan` (function): Callback
  - `showFeatures` (boolean)
  - `showDescription` (boolean)

---

### `getPaymentInfo(plan, method)`
Obtém informações de pagamento do plano.

**Parâmetros:**
- `plan` (Object): Plano
- `method` (string): 'pix' ou 'installment'

**Retorna:** Object com informações de pagamento

---

### `formatCurrency(value)`
Formata valor como moeda brasileira.

**Parâmetros:**
- `value` (number): Valor a formatar

**Retorna:** String formatada (ex: "R$ 700,00")

---

### `formatPrice(value)`
Formata valor simples (sem símbolo).

**Parâmetros:**
- `value` (number): Valor a formatar

**Retorna:** String formatada (ex: "700,00")

---

## 🎨 Estrutura HTML Gerada

O helper gera a seguinte estrutura:

```html
<div class="plan-card" data-plan-code="basic" data-plan-id="1">
    <div class="plan-header">
        <h3 class="plan-name">King Start</h3>
        <p class="plan-description">Descrição do plano</p>
    </div>
    
    <div class="plan-price-section">
        <div class="pix-price">
            <span class="currency">R$</span>
            <span class="amount">700,00</span>
            <span class="method-badge pix-badge">Pix</span>
        </div>
        <div class="installment-option">
            <span class="installment-text">ou até 12x de R$ 70,00</span>
            <small class="installment-note">(acréscimo de 20%)</small>
        </div>
    </div>
    
    <div class="payment-method-selector">
        <div class="payment-option active" data-method="pix">
            <input type="radio" name="payment-basic" id="pix-basic" value="pix" checked>
            <label for="pix-basic">...</label>
        </div>
        <div class="payment-option" data-method="installment">
            <input type="radio" name="payment-basic" id="card-basic" value="installment">
            <label for="card-basic">...</label>
        </div>
    </div>
    
    <div class="plan-features">
        <ul>...</ul>
    </div>
    
    <button class="btn-assinar">Assinar Agora</button>
</div>
```

---

## ✅ Checklist de Integração

- [ ] Incluir arquivo CSS (`subscription-plans.css`)
- [ ] Incluir arquivo JS (`subscription-plans-helper.js`)
- [ ] Criar container HTML para os planos
- [ ] Chamar `loadAndRenderPlans()` ou `renderPlansGrid()`
- [ ] Implementar callback `onSelectPlan` para checkout
- [ ] Testar em diferentes dispositivos (responsivo)
- [ ] Personalizar estilos se necessário

---

## 🚀 Pronto!

Agora você pode usar o helper para renderizar planos com opções de Pix e Cartão de forma fácil e consistente! 🎉
