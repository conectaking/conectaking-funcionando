# 🔧 Integração Direta - Instruções

## 📍 Caminhos Fornecidos

- **Backend/Frontend:** `D:\CONECTA 2026\conectaking-funcionando`

---

## ✅ O que já foi implementado automaticamente

### Backend
1. ✅ **`routes/subscription.js`** - Atualizado para aceitar `billingType`
2. ✅ **`routes/moduleAvailability.js`** - Já tinha `plan-availability-public`
3. ✅ **`routes/admin.js`** - Já tinha `PUT /users/:id/manage` e `DELETE /users/:id`

### Frontend - Arquivos em `public/`
1. ✅ **`public/js/planRenderer.js`** - Funções de renderização
2. ✅ **`public/js/load-subscription-info.js`** - Função `loadSubscriptionInfo()`
3. ✅ **`public/js/subscription-plans-restore.js`** - Toggle mensal/anual
4. ✅ **`public/js/admin-menu-empresa-restore.js`** - Botão Modo Empresa
5. ✅ **`public/js/admin-users-fix.js`** - Ajustes Gerenciar Usuários
6. ✅ **`public/js/auto-integration.js`** - Integração automática
7. ✅ **`public/css/subscription-plans-restore.css`** - Estilos
8. ✅ **`public/css/admin-users-fix.css`** - Estilos admin

---

## 🚀 Como Integrar nos Arquivos HTML

### Opção 1: Usar Integração Automática (Mais Fácil)

Adicione **apenas esta linha** antes do `</body>` em todos os arquivos HTML:

```html
<script src="/js/auto-integration.js"></script>
```

O script detecta automaticamente:
- Dashboard → adiciona scripts de assinatura
- Admin → adiciona scripts do admin
- Funciona com conteúdo dinâmico

### Opção 2: Integração Manual Completa

Adicione este código antes do `</body>`:

```html
<!-- CSS -->
<link rel="stylesheet" href="/css/subscription-plans-restore.css">
<link rel="stylesheet" href="/css/admin-users-fix.css">

<!-- JavaScript - Ordem importante! -->
<script src="/js/planRenderer.js"></script>
<script src="/js/load-subscription-info.js"></script>
<script src="/js/subscription-plans-restore.js"></script>
<script src="/js/admin-menu-empresa-restore.js"></script>
<script src="/js/admin-users-fix.js"></script>
```

---

## 📂 Onde Adicionar

### Se o frontend está em outro lugar (ex: `C:\Users\adriano king\Desktop\public_html`):

1. **Copiar arquivos criados:**
   ```bash
   # Copiar todos os arquivos de public/js e public/css
   # Para o diretório do frontend
   ```

2. **Adicionar scripts nos arquivos HTML:**
   - `dashboard.html` → Adicionar scripts antes de `</body>`
   - `admin/index.html` → Adicionar scripts antes de `</body>`

### Se o frontend está no mesmo projeto:

Os arquivos já estão em `public/`, então basta adicionar os scripts nos HTMLs.

---

## 🔍 Localizar Arquivos HTML

Se você tiver o frontend em outro local, me informe o caminho completo e eu integro diretamente nos arquivos.

Exemplo:
- Frontend: `C:\Users\adriano king\Desktop\public_html\dashboard.html`
- Frontend: `C:\Users\adriano king\Desktop\public_html\admin\index.html`

---

## ✅ Checklist de Integração

- [x] Backend atualizado (`routes/subscription.js`)
- [x] Scripts criados em `public/js/`
- [x] CSS criado em `public/css/`
- [ ] Adicionar `<script src="/js/auto-integration.js"></script>` nos HTMLs
- [ ] Testar funcionalidades

---

**Próximo passo:** Me informe onde estão os arquivos HTML do dashboard e admin para eu integrar diretamente!
