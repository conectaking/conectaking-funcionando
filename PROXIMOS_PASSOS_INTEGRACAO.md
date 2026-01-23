# 🚀 Próximos Passos - Integração das Funcionalidades Recuperadas

## ✅ O que já foi feito

1. ✅ Arquivos JavaScript criados:
   - `public/js/admin-menu-empresa-restore.js`
   - `public/js/admin-users-fix.js`
   - `public/js/subscription-plans-restore.js`
   - `public/js/load-subscription-info.js` - Função `loadSubscriptionInfo()` recuperada
   - `public/js/planRenderer.js` (copiado do front-end antigo)

2. ✅ Arquivos CSS criados:
   - `public/css/subscription-plans-restore.css`
   - `public/css/admin-users-fix.css` (já existia)

3. ✅ Documentação criada:
   - `RESUMO_RECUPERACAO_FRONTEND_ANTIGO.md`

---

## 📋 Próximos Passos

### 1. Identificar onde estão as views do Dashboard e Admin

**Ação:** Verificar se o sistema usa:
- Views EJS (em `views/`)
- HTML estático (em `public/`)
- SPA (Single Page Application)

**Como verificar:**
```bash
# Verificar rotas do dashboard
grep -r "dashboard" routes/
grep -r "admin" routes/
```

---

### 2. Integrar Scripts no Dashboard (Assinatura)

**Localização provável:** 
- Se for EJS: `views/dashboard.ejs` ou similar
- Se for HTML: `public/dashboard.html` ou similar
- Se for SPA: arquivo JavaScript principal

**O que adicionar:**

```html
<!-- No <head> -->
<link rel="stylesheet" href="/css/subscription-plans-restore.css">

<!-- Antes do </body> ou no final do arquivo -->
<script src="/js/planRenderer.js"></script>
<script src="/js/load-subscription-info.js"></script>
<script src="/js/subscription-plans-restore.js"></script>
```

**⚠️ IMPORTANTE:** A ordem de carregamento é:
1. `planRenderer.js` - Funções base de renderização
2. `load-subscription-info.js` - Função `loadSubscriptionInfo()` recuperada
3. `subscription-plans-restore.js` - Toggle e integração

**Verificar se existe:**
- Container `#subscription-plans-list` na seção de assinatura
- Seção com `id="assinatura-pane"` ou similar

**⚠️ IMPORTANTE: Integrar função `loadSubscriptionInfo`**

A função `loadSubscriptionInfo()` do front-end antigo precisa ser integrada. Ela é responsável por:
- Carregar informações da assinatura do usuário
- Buscar planos disponíveis da API
- Renderizar informações e planos

**Código do front-end antigo (`dashboard.js` linha 12597-12634):**

```javascript
async function loadSubscriptionInfo() {
    try {
        // Obter billingType do toggle ou usar 'monthly' como padrão
        const billingType = window.currentBillingType || 'monthly';
        
        const response = await safeFetch(`${API_URL}/api/subscription/info?billingType=${billingType}`, {
            method: 'GET',
            headers: HEADERS_AUTH
        });
        
        if (!response.ok) {
            throw new Error('Erro ao carregar informações de assinatura');
        }
        
        subscriptionData = await response.json();
        isAdmin = subscriptionData.user?.isAdmin || false;
        
        renderSubscriptionInfo();
        await renderSubscriptionPlans(billingType);
        
        // Se for admin, mostrar seção de edição
        if (isAdmin) {
            document.getElementById('subscription-admin-section').style.display = 'block';
            loadPlansForEdit();
        }
    } catch (error) {
        console.error('Erro ao carregar informações de assinatura:', error);
        document.getElementById('subscription-info').innerHTML = `
            <p style="color: #ff4444;">Erro ao carregar informações. Tente novamente.</p>
        `;
    }
}
```

**Onde adicionar:**
- Se o dashboard usa JavaScript separado, adicionar no arquivo principal do dashboard
- Se usa SPA, adicionar no arquivo JavaScript que gerencia a seção de assinatura
- Chamar `loadSubscriptionInfo()` quando a seção de assinatura for aberta/exibida

**Chamadas necessárias:**
- Chamar `loadSubscriptionInfo()` quando o usuário acessa a seção "Assinatura"
- Chamar `loadSubscriptionInfo()` quando o toggle mensal/anual é alterado (já está no `switchBillingTypeDashboard`)

---

### 3. Integrar Scripts no Admin Dashboard

**Localização provável:**
- Se for EJS: `views/admin.ejs` ou similar
- Se for HTML: `public/admin/index.html` ou similar
- Se for SPA: arquivo JavaScript do admin

**O que adicionar:**

```html
<!-- No <head> -->
<link rel="stylesheet" href="/css/admin-users-fix.css">
<link rel="stylesheet" href="/css/subscription-plans-restore.css">

<!-- Antes do </body> ou no final do arquivo -->
<script src="/js/admin-menu-empresa-restore.js"></script>
<script src="/js/admin-users-fix.js"></script>
```

**Verificar se existe:**
- Tabela `#users-table` na seção "Gerenciar Usuários"
- Menu de navegação com links "Gerenciar Códigos" e "IA KING"

---

### 4. Verificar Rotas da API

**Verificar se existem:**

1. **API de Planos:**
   - `GET /api/subscription/plans-public` ou similar
   - `GET /api/subscription/info?billingType=monthly` ou similar

2. **API de Módulos:**
   - `GET /api/modules/plan-availability-public` ou similar

3. **API Admin:**
   - `PUT /api/admin/users/:id/manage` (para atualizar usuário)
   - `DELETE /api/admin/users/:id` (para deletar usuário)

**Como verificar:**
```bash
# Verificar rotas de subscription
grep -r "subscription" routes/

# Verificar rotas de admin
grep -r "admin" routes/
```

---

### 5. Testar Funcionalidades

#### 5.1 Testar Botão "Modo Empresa" no Admin
1. Acessar dashboard do admin
2. Verificar se o botão aparece entre "Gerenciar Códigos" e "IA KING"
3. Clicar no botão e verificar se abre o painel

#### 5.2 Testar "Gerenciar Usuários"
1. Acessar "Gerenciar Usuários" no admin
2. Verificar se:
   - ❌ Coluna "Status Assinatura" foi removida
   - ❌ Coluna "Ações" foi removida
   - ✅ Clique na linha abre modal
   - ✅ Modal não tem campo "Status da Assinatura"
   - ✅ Modal tem botão "Deletar Usuário"

#### 5.3 Testar Toggle Mensal/Anual
1. Acessar seção "Assinatura" no dashboard
2. Verificar se:
   - ✅ Toggle mensal/anual aparece
   - ✅ Ao clicar, muda os preços
   - ✅ Planos são renderizados corretamente
   - ✅ Preços mensais = (anual * 1.2) / 12
   - ✅ Preços anuais = valor do banco

---

### 6. Ajustes Necessários (se houver)

#### 6.1 Se os scripts não funcionarem
- Verificar console do navegador (F12) para erros
- Verificar se os arquivos estão sendo carregados (Network tab)
- Verificar se os seletores CSS/JS estão corretos

#### 6.2 Se as APIs não existirem
- Criar rotas necessárias em `routes/subscription.js`
- Criar rotas necessárias em `routes/admin.js`
- Verificar se o backend retorna os dados no formato esperado

#### 6.4 Se `loadSubscriptionInfo` não funcionar
- Verificar se a função está definida e acessível globalmente
- Verificar se `API_URL` e `HEADERS_AUTH` estão definidos
- Verificar se `safeFetch` está disponível (ou usar `fetch` padrão)
- Verificar se `renderSubscriptionInfo()` e `renderSubscriptionPlans()` estão definidas
- Adicionar chamada `loadSubscriptionInfo()` quando a seção de assinatura for exibida

#### 6.3 Se os estilos não estiverem corretos
- Ajustar CSS em `public/css/subscription-plans-restore.css`
- Ajustar CSS em `public/css/admin-users-fix.css`
- Verificar conflitos com estilos existentes

---

### 7. Documentação Final

Após testar e confirmar que tudo funciona:

1. ✅ Atualizar `RESUMO_RECUPERACAO_FRONTEND_ANTIGO.md` com status final
2. ✅ Documentar quais arquivos foram modificados
3. ✅ Documentar quais rotas da API foram criadas/modificadas

---

## 🔍 Comandos Úteis para Verificação

```bash
# Verificar se os arquivos existem
ls -la public/js/admin-*.js
ls -la public/js/subscription-*.js
ls -la public/css/subscription-*.css

# Verificar rotas do servidor
grep -r "router.get\|router.post" routes/

# Verificar views
ls -la views/
```

---

## 📝 Checklist de Integração

- [ ] Identificar localização das views (EJS/HTML/SPA)
- [ ] Adicionar scripts no dashboard (assinatura)
- [ ] Adicionar scripts no admin dashboard
- [ ] Verificar rotas da API
- [ ] Testar botão "Modo Empresa" no admin
- [ ] Testar "Gerenciar Usuários"
- [ ] Testar toggle mensal/anual
- [ ] Ajustar estilos se necessário
- [ ] Ajustar APIs se necessário
- [ ] Documentar mudanças finais

---

## ⚠️ Observações Importantes

1. **Ordem de carregamento:** Os scripts devem ser carregados na ordem correta:
   - Primeiro: `planRenderer.js` (funções base)
   - Segundo: `load-subscription-info.js` (função `loadSubscriptionInfo()`)
   - Terceiro: `subscription-plans-restore.js` (usa funções do planRenderer e loadSubscriptionInfo)
   - Por último: scripts específicos (admin-menu, admin-users)

2. **Compatibilidade:** Os scripts foram criados para funcionar com:
   - Conteúdo dinâmico (SPA)
   - Conteúdo estático (HTML)
   - Conteúdo carregado via AJAX

3. **MutationObserver:** Os scripts usam `MutationObserver` para detectar mudanças no DOM, então funcionam mesmo se o conteúdo for carregado depois.

---

## 🆘 Se algo não funcionar

1. **Verificar console do navegador** (F12 → Console)
2. **Verificar Network tab** (F12 → Network) para ver se arquivos estão sendo carregados
3. **Verificar se os seletores estão corretos** (usar DevTools para inspecionar elementos)
4. **Verificar se as APIs retornam dados** (usar Network tab para ver requisições)

---

**Última atualização:** 2025-01-23
