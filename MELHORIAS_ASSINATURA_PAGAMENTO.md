# ✅ Melhorias na Aba de Assinaturas - Formas de Pagamento

## 🎯 Objetivo

Atualizar a aba de assinaturas para:
1. Substituir "pagamento único" por "Pix"
2. Adicionar opção de parcelamento em até 12x com acréscimo de 20%
3. Melhorar layout e edição da aba de assinaturas
4. Garantir sincronização entre assinatura e planos

---

## ✅ Alterações Implementadas

### 1. Backend - API de Subscription

**Arquivo:** `routes/subscription.js`

#### Funções Adicionadas:

1. **`calculateInstallmentPrice(basePrice, installments)`**
   - Calcula valores de parcelamento com acréscimo de 20%
   - Retorna: valor total, valor por parcela, número de parcelas
   - Máximo de 12 parcelas

2. **`enrichPlansWithPaymentInfo(plans)`**
   - Adiciona informações de pagamento aos planos
   - Retorna planos com `paymentOptions` contendo:
     - `pix`: Preço à vista (sem acréscimo)
     - `installment`: Preço parcelado (com acréscimo de 20%)

#### Rotas Atualizadas:

- ✅ `GET /api/subscription/info` - Retorna planos com informações de pagamento
- ✅ `GET /api/subscription/plans` - Retorna planos com informações de pagamento
- ✅ `GET /api/subscription/plans-public` - Retorna planos públicos com informações de pagamento

**Estrutura de Resposta:**

```json
{
  "plans": [
    {
      "id": 1,
      "plan_code": "basic",
      "plan_name": "King Start",
      "price": 700.00,
      "paymentOptions": {
        "pix": {
          "method": "PIX",
          "price": 700.00,
          "label": "Pix",
          "description": "Pagamento à vista via Pix"
        },
        "installment": {
          "method": "CARTÃO",
          "totalPrice": 840.00,
          "installmentValue": 70.00,
          "installments": 12,
          "label": "Até 12x",
          "description": "Até 12x de R$ 70,00"
        }
      }
    }
  ]
}
```

---

### 2. Atualização de Referências

#### Arquivos Modificados:

1. **`routes/iaKing.js`**
   - ✅ Substituído "pagamento único" por "Pix"
   - ✅ Adicionada informação sobre parcelamento em até 12x
   - ✅ Atualizadas respostas da IA sobre formas de pagamento

2. **`routes/iaKingAdvancedUnderstanding.js`**
   - ✅ Atualizado campo `duration` de "pagamento único" para "Pix"

3. **`routes/iaKingTraining.js`**
   - ✅ Atualizada seção "FORMA DE PAGAMENTO" para incluir Pix e Cartão

4. **`utils/iaSystemTrainer.js`**
   - ✅ Atualizadas referências de "pagamento único" para "Pix"

5. **`PROPOSTA_COMERCIAL_CONECTAKING.md`**
   - ✅ Atualizado título dos planos de "Pagamento Único" para "Pix"
   - ✅ Adicionada seção sobre formas de pagamento (Pix e Cartão)

---

## 📊 Cálculo de Parcelamento

### Fórmula:
```
Valor Total Parcelado = Valor Base × 1.20 (acréscimo de 20%)
Valor por Parcela = Valor Total Parcelado ÷ Número de Parcelas
Máximo de Parcelas = 12
```

### Exemplo (King Start - R$ 700,00):

**Pix (à vista):**
- Valor: R$ 700,00
- Acréscimo: R$ 0,00

**Cartão (12x):**
- Valor Total: R$ 840,00 (700 × 1.20)
- Valor por Parcela: R$ 70,00 (840 ÷ 12)
- Acréscimo: R$ 140,00 (20%)

---

## 🔄 Sincronização Assinatura ↔ Planos

### Como Funciona:

1. **Backend:**
   - Todas as rotas de planos retornam informações de pagamento
   - As informações são calculadas dinamicamente baseadas no preço do plano
   - Não há necessidade de armazenar valores parcelados no banco

2. **Frontend (a ser implementado):**
   - Deve usar `paymentOptions` retornado pela API
   - Exibir opções de Pix e Cartão para cada plano
   - Permitir seleção da forma de pagamento

3. **Consistência:**
   - Qualquer alteração no preço do plano automaticamente recalcula valores parcelados
   - Não há risco de dessincronização entre assinatura e planos

---

## 🎨 Melhorias de Layout Sugeridas (Frontend)

### Para a Aba de Assinaturas:

1. **Cards de Planos:**
   - Exibir preço principal (Pix) em destaque
   - Mostrar opção de parcelamento abaixo
   - Botão toggle ou seleção entre Pix/Cartão

2. **Informações de Pagamento:**
   - Badge "Pix" ou "Cartão" no card do plano
   - Exibir valor parcelado quando Cartão selecionado
   - Mostrar economia ao escolher Pix

3. **Layout Responsivo:**
   - Cards organizados em grid
   - Informações claras e visíveis
   - Botões de ação bem posicionados

### Exemplo de Estrutura HTML Sugerida:

```html
<div class="plan-card">
  <h3>King Start</h3>
  <div class="price-section">
    <div class="pix-price">
      <span class="currency">R$</span>
      <span class="amount">700,00</span>
      <span class="method">Pix</span>
    </div>
    <div class="installment-option">
      <span>ou até 12x de R$ 70,00</span>
      <small>(acréscimo de 20%)</small>
    </div>
  </div>
  <button class="btn-assinar">Assinar Agora</button>
</div>
```

---

## 📝 Próximos Passos

### Frontend (a ser implementado):

1. ✅ Atualizar componente de renderização de planos
2. ✅ Adicionar seleção de forma de pagamento (Pix/Cartão)
3. ✅ Exibir valores parcelados quando Cartão selecionado
4. ✅ Melhorar layout dos cards de planos
5. ✅ Adicionar validação de seleção de pagamento

### Testes:

1. ✅ Testar cálculo de parcelamento para todos os planos
2. ✅ Verificar sincronização entre assinatura e planos
3. ✅ Validar exibição de informações de pagamento
4. ✅ Testar responsividade do layout

---

## 🔍 Como Usar no Frontend

### Exemplo de Código JavaScript:

```javascript
// Carregar planos
async function loadPlans() {
    const response = await fetch('/api/subscription/plans-public');
    const data = await response.json();
    
    data.plans.forEach(plan => {
        const pixPrice = plan.paymentOptions.pix.price;
        const installmentInfo = plan.paymentOptions.installment;
        
        console.log(`${plan.plan_name}:`);
        console.log(`  Pix: R$ ${pixPrice.toFixed(2)}`);
        console.log(`  Cartão: ${installmentInfo.description}`);
    });
}
```

---

## ✅ Checklist de Implementação

- [x] Função de cálculo de parcelamento
- [x] Função de enriquecimento de planos
- [x] Atualização de rotas da API
- [x] Atualização de referências "pagamento único" → "Pix"
- [x] Documentação das alterações
- [ ] Implementação no frontend (renderização)
- [ ] Testes de integração
- [ ] Validação de layout

---

## 🎉 Resultado

Agora todas as APIs de planos retornam informações completas sobre formas de pagamento:

- ✅ **Pix**: Valor à vista (sem acréscimo)
- ✅ **Cartão**: Até 12x com acréscimo de 20%

As informações são calculadas dinamicamente e sempre sincronizadas com os preços dos planos no banco de dados.
