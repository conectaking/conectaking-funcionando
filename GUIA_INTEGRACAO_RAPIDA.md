# 🚀 Guia de Integração Rápida

## ✅ O que já está pronto

1. **Backend:**
   - ✅ API `/api/subscription/plans-public` retorna `paymentOptions`
   - ✅ Cálculo automático de parcelamento (20% de acréscimo)
   - ✅ Todas as rotas atualizadas

2. **Frontend:**
   - ✅ `public/js/subscription-plans-helper.js` - Helper JavaScript
   - ✅ `public/css/subscription-plans.css` - Estilos CSS
   - ✅ `public/subscription-example.html` - Exemplo completo

---

## 🎯 Integração em 3 Passos

### Passo 1: Testar a API (2 minutos)

Abra no navegador ou Postman:
```
GET http://localhost:3000/api/subscription/plans-public
```

Deve retornar planos com `paymentOptions`:
```json
{
  "success": true,
  "plans": [
    {
      "plan_name": "King Start",
      "price": 700.00,
      "paymentOptions": {
        "pix": { "price": 700.00 },
        "installment": { "totalPrice": 840.00, "installmentValue": 70.00 }
      }
    }
  ]
}
```

### Passo 2: Usar o Exemplo (5 minutos)

1. Acesse: `http://localhost:3000/subscription-example.html`
2. Verifique se os planos aparecem com opções de Pix e Cartão
3. Teste a seleção de método de pagamento

### Passo 3: Integrar no Seu Código (10-30 minutos)

#### Se você tem um arquivo HTML:

```html
<!-- 1. Incluir CSS e JS -->
<link rel="stylesheet" href="/css/subscription-plans.css">
<script src="/js/subscription-plans-helper.js"></script>

<!-- 2. Criar container -->
<div id="plans-container"></div>

<!-- 3. Carregar planos -->
<script>
document.addEventListener('DOMContentLoaded', () => {
    window.SubscriptionPlansHelper.loadAndRenderPlans(
        document.getElementById('plans-container'),
        {
            onSelectPlan: (plan, method) => {
                // Sua lógica aqui
                console.log('Plano:', plan.plan_name, 'Método:', method);
            }
        }
    );
});
</script>
```

#### Se você tem JavaScript que já carrega planos:

**ANTES:**
```javascript
async function loadPlans() {
    const response = await fetch('/api/subscription/plans-public');
    const data = await response.json();
    // Renderização manual...
}
```

**DEPOIS:**
```javascript
// Incluir helper no HTML primeiro:
// <script src="/js/subscription-plans-helper.js"></script>
// <link rel="stylesheet" href="/css/subscription-plans.css">

async function loadPlans() {
    const container = document.getElementById('plans-container');
    await window.SubscriptionPlansHelper.loadAndRenderPlans(container, {
        onSelectPlan: handlePlanSelection
    });
}
```

---

## 📝 Exemplo de Checkout com WhatsApp

```javascript
function handlePlanSelection(plan, paymentMethod) {
    const paymentInfo = window.SubscriptionPlansHelper.getPaymentInfo(plan, paymentMethod);
    
    const pixKey = plan.pix_key || 'SUA_CHAVE_PIX';
    const whatsappNumber = plan.whatsapp_number || '5511999999999';
    
    let message = `Olá! Gostaria de assinar o plano *${plan.plan_name}*\n\n`;
    message += `*Forma de Pagamento:* ${paymentInfo.method}\n`;
    message += `*Valor:* ${window.SubscriptionPlansHelper.formatCurrency(paymentInfo.price)}\n`;
    
    if (paymentMethod === 'installment') {
        message += `*Parcelas:* ${plan.paymentOptions.installment.installments}x\n`;
        message += `*Valor por parcela:* ${window.SubscriptionPlansHelper.formatCurrency(plan.paymentOptions.installment.installmentValue)}\n`;
    }
    
    message += `\nChave PIX: *${pixKey}*`;
    
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}
```

---

## ✅ Checklist

- [ ] API retorna `paymentOptions` corretamente
- [ ] Arquivos CSS e JS estão acessíveis em `/css/` e `/js/`
- [ ] Exemplo HTML funciona (`/subscription-example.html`)
- [ ] Integrado no seu código
- [ ] Testado no navegador
- [ ] Checkout implementado

---

## 🆘 Problemas Comuns

### Helper não carrega
- Verifique se o arquivo está em `public/js/subscription-plans-helper.js`
- Verifique o caminho no HTML: `/js/subscription-plans-helper.js`
- Abra o console (F12) e veja se há erros

### Planos não aparecem
- Verifique se a API está funcionando
- Verifique o console do navegador
- Verifique se o container existe: `document.getElementById('plans-container')`

### Estilos não aplicam
- Verifique se o CSS está incluído: `<link rel="stylesheet" href="/css/subscription-plans.css">`
- Verifique se não há conflitos com outros CSS

---

## 📞 Próximos Passos

1. Teste o exemplo: `/subscription-example.html`
2. Integre no seu código
3. Personalize se necessário
4. Implemente checkout

**Tudo está pronto! Basta integrar! 🚀**
