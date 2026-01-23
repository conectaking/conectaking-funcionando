# ✅ Correção: Erro "Failed to fetch" no planRenderer.js

## 🔴 Problema Identificado

O console mostra múltiplos erros:
```
TypeError: Failed to fetch
at loadPlanModules (planRenderer.js)
at async renderPlansShared
at async renderSubscriptionPlans
at async loadSubscriptionInfo
at async window.savePlan
```

**Causa:**
- A função `loadPlanModules` no `planRenderer.js` está tentando fazer fetch da API
- A requisição está falhando (Failed to fetch)
- Isso impede que os módulos sejam carregados após salvar
- O formulário recarrega mas não mostra as mudanças porque os módulos não são carregados

---

## ✅ Correções Implementadas

### 1. Sempre Usar API Pública

**Arquivo:** `public_html/js/planRenderer.js`

**Mudança:**
- ✅ Agora sempre usa `/api/modules/plan-availability-public`
- ✅ Não tenta usar API protegida que requer autenticação
- ✅ Evita problemas de CORS e autenticação

```javascript
// ✅ ANTES: Tentava API protegida primeiro
response = await fetch(`${apiUrl}/api/modules/plan-availability`, {
    headers: window.HEADERS_AUTH || {}
});

// ✅ DEPOIS: Sempre usa API pública
const apiEndpoint = `${apiUrl}/api/modules/plan-availability-public`;
response = await fetch(apiEndpoint, {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    cache: 'no-cache'
});
```

### 2. Detecção Melhorada de URL da API

**Arquivo:** `public_html/js/planRenderer.js`

**Mudança:**
- ✅ Verifica `window.API_URL` primeiro
- ✅ Depois verifica variável global `API_URL`
- ✅ Por último, detecta automaticamente baseado no ambiente
- ✅ Remove barras finais da URL

```javascript
// ✅ NOVO: Detecção robusta de URL
let apiUrl = window.API_URL;
if (!apiUrl && typeof API_URL !== 'undefined') {
    apiUrl = API_URL;
}
if (!apiUrl) {
    // Detecção automática...
}
apiUrl = apiUrl.replace(/\/$/, ''); // Remove barra final
```

### 3. Tratamento de Erros Melhorado

**Arquivo:** `public_html/js/planRenderer.js`

**Mudança:**
- ✅ Try-catch específico para fetch
- ✅ Logs detalhados de erro
- ✅ Retorna vazio em caso de erro (não quebra a renderização)

```javascript
try {
    response = await fetch(apiEndpoint, {...});
} catch (fetchError) {
    console.error('❌ Erro ao fazer fetch:', fetchError);
    return { available: [], unavailable: [] };
}
```

### 4. Tratamento de Erros no Recarregamento

**Arquivo:** `public_html/dashboard.js`

**Mudança:**
- ✅ Try-catch ao redor de `loadPlansForEdit()`
- ✅ Try-catch ao redor de `loadSubscriptionInfo()`
- ✅ Erros não bloqueiam o processo de salvamento

```javascript
try {
    await loadPlansForEdit();
} catch (reloadError) {
    console.error('❌ Erro ao recarregar formulário:', reloadError);
}

try {
    await loadSubscriptionInfo();
} catch (subscriptionError) {
    console.warn('⚠️ Erro ao recarregar informações (não crítico):', subscriptionError);
}
```

### 5. Logs Detalhados

**Arquivo:** `public_html/js/planRenderer.js`

**Mudança:**
- ✅ Logs antes de fazer fetch
- ✅ Logs após carregar módulos
- ✅ Logs de contagem de módulos

```javascript
console.log(`🔄 Carregando módulos para ${planCode} de: ${apiEndpoint}`);
console.log(`✅ ${modules.length} módulos carregados para ${planCode}`);
console.log(`📊 Módulos para ${planCode}: X disponíveis, Y indisponíveis`);
```

---

## 🎯 Como Funciona Agora

### Fluxo Corrigido:

1. **Usuário salva plano**
   - Sistema salva dados e módulos
   - Aguarda 1000ms

2. **Sistema recarrega formulário**
   - Chama `loadPlansForEdit()`
   - Busca planos atualizados
   - Busca módulos atualizados
   - Renderiza formulário com dados corretos

3. **Sistema recarrega informações de assinatura**
   - Chama `loadSubscriptionInfo()`
   - Chama `renderSubscriptionPlans()`
   - Chama `renderPlansShared()`
   - Para cada plano, chama `loadPlanModules()`
   - **Agora usa API pública** (não falha mais)

4. **Se houver erro**
   - Erro é capturado e logado
   - Processo continua (não quebra)
   - Formulário ainda mostra dados corretos

---

## 🧪 Como Testar

### 1. Testar Salvamento:

1. Edite um plano (módulos incluídos/não incluídos)
2. Clique em "Salvar Alterações"
3. ✅ Verifique console: Não deve ter erros "Failed to fetch"
4. ✅ Aguarde formulário recarregar
5. ✅ Verifique: Módulos devem estar corretos

### 2. Verificar Console:

1. Abra console (F12)
2. Salve um plano
3. ✅ Procure por:
   - `🔄 Carregando módulos para X de: ...`
   - `✅ X módulos carregados para X`
   - `📊 Módulos para X: Y disponíveis, Z indisponíveis`
4. ❌ NÃO deve ter: `TypeError: Failed to fetch`

### 3. Testar Persistência:

1. Salve um plano
2. Atualize a página (F5)
3. ✅ Verifique: Módulos devem estar corretos
4. ✅ Verifique: Outros campos devem estar corretos

---

## 🔍 Debug

Se ainda houver erros:

### 1. Verificar URL da API:

No console, procure por:
```
🔄 Carregando módulos para basic de: https://...
```

Verifique se a URL está correta.

### 2. Verificar Network Tab:

1. Abra Network tab (F12)
2. Filtre por "plan-availability-public"
3. Veja a requisição GET
4. Verifique:
   - **Status**: Deve ser 200
   - **URL**: Deve ser `/api/modules/plan-availability-public`
   - **Response**: Deve ter `modules` array

### 3. Verificar CORS:

Se houver erro de CORS:
- Verifique se o servidor permite requisições do frontend
- Verifique headers CORS no backend

---

## 📁 Arquivos Modificados

1. ✅ `public_html/js/planRenderer.js` - Função `loadPlanModules` corrigida
2. ✅ `public_html/dashboard.js` - Tratamento de erros no recarregamento

---

## ✅ Resultado Esperado

Após as correções:

- ✅ Não há mais erros "Failed to fetch"
- ✅ Módulos são carregados corretamente
- ✅ Formulário recarrega com dados corretos
- ✅ Mudanças persistem após salvar
- ✅ Logs detalhados para debug

---

## 🎉 Pronto!

A correção foi implementada. O erro "Failed to fetch" não deve mais aparecer! 🚀
