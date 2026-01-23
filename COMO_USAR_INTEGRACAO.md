# 🚀 Como Usar a Integração - Guia Rápido

## ⚡ Método Rápido (Recomendado)

Adicione **apenas este script** em todas as páginas do seu sistema (ou no layout principal):

```html
<!-- Antes do </body> -->
<script src="/js/auto-integration.js"></script>
```

**Pronto!** O script detecta automaticamente:
- ✅ Se está no dashboard → adiciona scripts de assinatura
- ✅ Se está no admin → adiciona scripts do admin
- ✅ Funciona mesmo com conteúdo carregado dinamicamente (SPA)

---

## 📍 Onde Adicionar

### Se usar EJS (views):
Adicione no arquivo de layout principal (ex: `views/layout.ejs` ou `views/partials/footer.ejs`):

```ejs
<!-- Antes do </body> -->
<script src="/js/auto-integration.js"></script>
```

### Se usar HTML estático:
Adicione em cada página HTML (ex: `public/dashboard.html`, `public/admin/index.html`):

```html
<!-- Antes do </body> -->
<script src="/js/auto-integration.js"></script>
```

### Se usar SPA (Single Page Application):
Adicione no arquivo HTML principal (ex: `public/index.html`):

```html
<!-- Antes do </body> -->
<script src="/js/auto-integration.js"></script>
```

---

## ✅ O que o script faz automaticamente

### No Dashboard (quando detecta seção de assinatura):
1. Adiciona CSS: `subscription-plans-restore.css`
2. Carrega scripts na ordem:
   - `planRenderer.js`
   - `load-subscription-info.js`
   - `subscription-plans-restore.js`
3. Chama `loadSubscriptionInfo()` quando a seção é exibida

### No Admin Dashboard:
1. Adiciona CSS: `admin-users-fix.css` e `subscription-plans-restore.css`
2. Carrega scripts:
   - `admin-menu-empresa-restore.js`
   - `admin-users-fix.js`
3. Aplica ajustes na interface automaticamente

---

## 🔍 Verificação

Após adicionar o script, abra o console do navegador (F12) e verifique:

```
🔧 Iniciando integração automática de scripts...
📋 Integrando scripts do dashboard (assinatura)...
✅ CSS adicionado: /css/subscription-plans-restore.css
✅ JS carregado: /js/planRenderer.js
✅ JS carregado: /js/load-subscription-info.js
✅ JS carregado: /js/subscription-plans-restore.js
✅ Todos os scripts do dashboard carregados
```

---

## 🎯 Funcionalidades Ativadas

Após a integração, você terá:

1. ✅ **Toggle Mensal/Anual** na seção de assinatura
2. ✅ **Botão "Modo Empresa"** no menu admin (entre "Gerenciar Códigos" e "IA KING")
3. ✅ **Interface "Gerenciar Usuários"** ajustada (sem colunas removidas, clique na linha abre modal)
4. ✅ **Preços calculados automaticamente** baseado no billingType

---

## 🆘 Se algo não funcionar

1. **Verificar console do navegador** (F12 → Console) para erros
2. **Verificar Network tab** (F12 → Network) para ver se arquivos carregam
3. **Verificar se o script está sendo carregado:**
   ```javascript
   // No console do navegador
   console.log('Script carregado:', typeof window.loadSubscriptionInfo);
   ```

---

**Última atualização:** 2025-01-23
