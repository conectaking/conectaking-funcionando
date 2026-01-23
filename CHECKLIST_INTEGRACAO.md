# ✅ Checklist de Integração - Funcionalidades Recuperadas

## Status Atual

### ✅ Arquivos Criados
- [x] `public/js/admin-menu-empresa-restore.js`
- [x] `public/js/admin-users-fix.js`
- [x] `public/js/subscription-plans-restore.js`
- [x] `public/js/load-subscription-info.js` - Função `loadSubscriptionInfo()` recuperada
- [x] `public/css/subscription-plans-restore.css`
- [x] `public/js/planRenderer.js` (copiado do front-end antigo)

### ✅ APIs Verificadas e Atualizadas
- [x] `GET /api/subscription/plans-public` - ✅ Existe
- [x] `GET /api/subscription/info?billingType=monthly` - ✅ Atualizado (agora aceita `billingType`)
- [x] `GET /api/modules/plan-availability-public` - ✅ Existe
- [x] `PUT /api/admin/users/:id/manage` - ✅ Existe
- [x] `DELETE /api/admin/users/:id` - ✅ Existe

---

## 📋 Próximos Passos (Ordem de Execução)

### 1️⃣ Verificar Estrutura do Projeto
- [ ] Identificar onde está o dashboard principal
- [ ] Identificar onde está o admin dashboard
- [ ] Verificar se usa EJS, HTML estático ou SPA

**Como fazer:**
```bash
# Verificar views
ls views/

# Verificar rotas
grep -r "dashboard" routes/
grep -r "admin" routes/
```

---

### 2️⃣ Verificar Rotas da API Necessárias

#### 2.1 API de Módulos
- [ ] Verificar se existe `GET /api/modules/plan-availability-public`
- [ ] Se não existir, criar em `routes/moduleAvailability.js`

**Como verificar:**
```bash
grep -r "plan-availability-public" routes/
```

#### 2.2 API Admin - Gerenciar Usuários
- [ ] Verificar se existe `PUT /api/admin/users/:id/manage`
- [ ] Verificar se existe `DELETE /api/admin/users/:id`
- [ ] Se não existirem, criar em `routes/admin.js`

**Como verificar:**
```bash
grep -r "users.*manage\|users.*:id" routes/admin.js
```

#### 2.3 API Subscription - BillingType
- [x] ✅ `GET /api/subscription/info` agora aceita parâmetro `billingType` - IMPLEMENTADO
- [x] ✅ Retorna planos enriquecidos com `paymentOptions` baseado no `billingType`
- [x] ✅ Calcula preços automaticamente (mensal = (anual * 1.2) / 12)

---

### 3️⃣ Integrar Scripts (Método Automático - RECOMENDADO)

**Opção mais fácil:**
- [ ] Adicionar em todas as páginas: `<script src="/js/auto-integration.js"></script>`
- [ ] O script detecta automaticamente dashboard/admin e adiciona scripts necessários

**OU Método Manual:**

**Arquivo a modificar:** (identificar primeiro)
- [ ] Adicionar CSS: `<link rel="stylesheet" href="/css/subscription-plans-restore.css">`
- [ ] Adicionar JS: `<script src="/js/planRenderer.js"></script>`
- [ ] Adicionar JS: `<script src="/js/load-subscription-info.js"></script>`
- [ ] Adicionar JS: `<script src="/js/subscription-plans-restore.js"></script>`

**Verificar se existe:**
- [ ] Container `#subscription-plans-list` na seção de assinatura
- [ ] Seção com `id="assinatura-pane"` ou similar

---

### 4️⃣ Integrar Scripts no Admin Dashboard

**Arquivo a modificar:** (identificar primeiro)
- [ ] Adicionar CSS: `<link rel="stylesheet" href="/css/admin-users-fix.css">`
- [ ] Adicionar CSS: `<link rel="stylesheet" href="/css/subscription-plans-restore.css">`
- [ ] Adicionar JS: `<script src="/js/admin-menu-empresa-restore.js"></script>`
- [ ] Adicionar JS: `<script src="/js/admin-users-fix.js"></script>`

**Verificar se existe:**
- [ ] Tabela `#users-table` na seção "Gerenciar Usuários"
- [ ] Menu de navegação com links "Gerenciar Códigos" e "IA KING"

---

### 5️⃣ Testar Funcionalidades

#### 5.1 Botão "Modo Empresa" no Admin
- [ ] Acessar dashboard do admin
- [ ] Verificar se botão aparece entre "Gerenciar Códigos" e "IA KING"
- [ ] Clicar no botão e verificar se abre painel

#### 5.2 Gerenciar Usuários
- [ ] Acessar "Gerenciar Usuários"
- [ ] Verificar se coluna "Status Assinatura" foi removida
- [ ] Verificar se coluna "Ações" foi removida
- [ ] Clicar em uma linha e verificar se abre modal
- [ ] Verificar se modal não tem campo "Status da Assinatura"
- [ ] Verificar se modal tem botão "Deletar Usuário"
- [ ] Testar atualização de usuário
- [ ] Testar deleção de usuário

#### 5.3 Toggle Mensal/Anual
- [ ] Acessar seção "Assinatura" no dashboard
- [ ] Verificar se toggle mensal/anual aparece
- [ ] Clicar em "Mensal" e verificar preços
- [ ] Clicar em "Anual" e verificar preços
- [ ] Verificar se preços mensais = (anual * 1.2) / 12
- [ ] Verificar se preços anuais = valor do banco
- [ ] Verificar se planos são renderizados corretamente

---

### 6️⃣ Ajustes e Correções

#### 6.1 Se scripts não funcionarem
- [ ] Verificar console do navegador (F12)
- [ ] Verificar Network tab (F12) para ver se arquivos carregam
- [ ] Verificar se seletores CSS/JS estão corretos
- [ ] Ajustar scripts se necessário

#### 6.2 Se APIs não existirem
- [ ] Criar rota `GET /api/modules/plan-availability-public`
- [ ] Criar rota `PUT /api/admin/users/:id/manage`
- [ ] Criar rota `DELETE /api/admin/users/:id`
- [ ] Adicionar suporte a `billingType` em `/api/subscription/info`

#### 6.3 Se estilos não estiverem corretos
- [ ] Ajustar CSS em `public/css/subscription-plans-restore.css`
- [ ] Ajustar CSS em `public/css/admin-users-fix.css`
- [ ] Verificar conflitos com estilos existentes

---

### 7️⃣ Documentação Final

- [ ] Atualizar `RESUMO_RECUPERACAO_FRONTEND_ANTIGO.md` com status final
- [ ] Documentar arquivos modificados
- [ ] Documentar rotas da API criadas/modificadas
- [ ] Criar guia de uso para desenvolvedores

---

## 🔍 Comandos Úteis

```bash
# Verificar arquivos criados
ls -la public/js/admin-*.js
ls -la public/js/subscription-*.js
ls -la public/css/subscription-*.css

# Verificar rotas
grep -r "router.get\|router.post" routes/subscription.js
grep -r "router.get\|router.post" routes/admin.js
grep -r "router.get\|router.post" routes/moduleAvailability.js

# Verificar views
ls -la views/
find . -name "*dashboard*" -o -name "*admin*"
```

---

## ⚠️ Observações

1. **Ordem de carregamento dos scripts:**
   ```
   1. planRenderer.js (funções base)
   2. load-subscription-info.js (função loadSubscriptionInfo)
   3. subscription-plans-restore.js (usa planRenderer e loadSubscriptionInfo)
   4. admin-menu-empresa-restore.js
   5. admin-users-fix.js
   ```

2. **Compatibilidade:**
   - Scripts funcionam com conteúdo dinâmico (SPA)
   - Scripts funcionam com conteúdo estático (HTML)
   - Scripts funcionam com conteúdo carregado via AJAX
   - Usam `MutationObserver` para detectar mudanças no DOM

3. **Debug:**
   - Abrir console do navegador (F12)
   - Verificar erros JavaScript
   - Verificar requisições de rede (Network tab)
   - Usar DevTools para inspecionar elementos

---

**Criado em:** 2025-01-23
**Última atualização:** 2025-01-23
