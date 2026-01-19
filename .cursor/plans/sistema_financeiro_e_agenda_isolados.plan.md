# Plano de Implementação - Sistema Financeiro e Agenda ConnectKing (ISOLADOS)

## PRINCÍPIO FUNDAMENTAL: ISOLAMENTO TOTAL

**Regras de isolamento:**
- Cada sistema tem suas próprias rotas (namespaces separados)
- Cada sistema tem seu próprio middleware
- Nenhuma dependência cruzada entre módulos
- Estrutura de arquivos completamente separada
- Banco de dados com prefixos próprios (finance_*, agenda_*)
- Nenhuma modificação em arquivos compartilhados além do mínimo necessário

---

## 1. SISTEMA FINANCEIRO (Aba no Dashboard)

### 1.1 Estrutura de Arquivos (100% Isolada)

```
modules/finance/
├── finance.controller.js      # Controller isolado
├── finance.service.js          # Service isolado
├── finance.repository.js        # Repository isolado
├── finance.routes.js          # Rotas isoladas /api/finance/*
├── finance.validators.js      # Validadores isolados
└── finance.types.js            # Types isolados

routes/
└── finance.routes.js           # Apenas registra rotas do módulo

public_html/
├── finance.html               # Página isolada (se necessário)
└── finance.js                  # JavaScript isolado

middleware/
└── protectFinance.js           # Middleware próprio (usa protectUser internamente)

migrations/
└── 093_create_finance_module.sql  # Migration isolada
```

### 1.2 Rotas Completamente Separadas

**Namespace: `/api/finance/*`**

```javascript
// routes/finance.routes.js
const express = require('express');
const router = express.Router();
const financeRoutes = require('../modules/finance/finance.routes');

// Todas as rotas do financeiro sob /api/finance
router.use('/', financeRoutes);

module.exports = router;
```

**No server.js:**
```javascript
const financeRoutes = require('./routes/finance.routes');
app.use('/api/finance', apiLimiter, financeRoutes);
```

**Rotas internas (`modules/finance/finance.routes.js`):**
```javascript
// Todas as rotas já vêm com /api/finance do prefixo externo
router.get('/dashboard', protectFinance, controller.getDashboard);
router.get('/transactions', protectFinance, controller.getTransactions);
router.post('/transactions', protectFinance, controller.createTransaction);
// ... etc
```

### 1.3 Integração no Dashboard (Mínima)

**Modificar apenas `public_html/dashboard.html`:**
- Adicionar UM link na sidebar entre "Contratos" e "Relatórios":
```html
<a href="#" class="nav-link" data-target="finance-pane" id="finance-link" title="Finanças">
    <i class="fas fa-wallet"></i> <span>Finanças</span>
</a>
```

**Modificar apenas `public_html/dashboard.js`:**
- Adicionar função isolada para carregar painel financeiro
- Nenhuma modificação em outras funções existentes
- Usar namespace próprio: `window.financeModule = { ... }`

### 1.4 Middleware Próprio

**`middleware/protectFinance.js`:**
```javascript
const { protectUser } = require('./protectUser');

const protectFinance = (req, res, next) => {
    // Usa protectUser internamente, mas é isolado
    return protectUser(req, res, next);
};

module.exports = { protectFinance };
```

### 1.5 Banco de Dados (Prefixos Próprios)

**Todas as tabelas com prefixo `finance_`:**
- `finance_categories`
- `finance_accounts`
- `finance_cards`
- `finance_transactions`
- `finance_budgets`
- `finance_installment_groups`

**Isolamento por `user_id` em todas as queries**

---

## 2. SISTEMA DE AGENDA (Módulo do Cartão)

### 2.1 Estrutura de Arquivos (100% Isolada)

```
modules/agenda/
├── agenda.controller.js        # Controller isolado
├── agenda.service.js           # Service isolado
├── agenda.repository.js        # Repository isolado
├── agenda.routes.js            # Rotas admin /api/agenda/*
├── agenda.validators.js        # Validadores isolados
├── agenda.types.js             # Types isolados
└── google/
    ├── googleCalendar.service.js    # Serviço Google isolado
    ├── googleOAuth.service.js      # OAuth isolado
    └── googleMeet.service.js       # Meet isolado

routes/
├── agenda.routes.js            # Registra rotas admin
├── publicAgenda.routes.js      # Rotas públicas /agenda/* e /:slug/agenda
└── oauthAgenda.routes.js      # Rotas OAuth específicas da agenda

views/
└── agendaPublic.ejs            # View isolada

middleware/
└── protectAgenda.js            # Middleware próprio

migrations/
└── 094_create_agenda_module.sql    # Migration isolada
```

### 2.2 Rotas Completamente Separadas

**Namespace Admin: `/api/agenda/*`**
**Namespace Público: `/agenda/*` e `/:slug/agenda`**

```javascript
// routes/agenda.routes.js (Admin)
const express = require('express');
const router = express.Router();
const agendaRoutes = require('../modules/agenda/agenda.routes');

router.use('/', agendaRoutes);
module.exports = router;
```

```javascript
// routes/publicAgenda.routes.js (Público)
const express = require('express');
const router = express.Router();
// Rotas públicas isoladas
router.get('/:slug/agenda', ...);
router.get('/api/agenda/:slug/availability', ...);
// ... etc
module.exports = router;
```

**No server.js (ordem importa para rotas públicas):**
```javascript
const agendaRoutes = require('./routes/agenda.routes');
const publicAgendaRoutes = require('./routes/publicAgenda.routes');
const oauthAgendaRoutes = require('./routes/oauthAgenda.routes');

// Rotas públicas ANTES das genéricas
app.use('/agenda', publicAgendaRoutes);
app.use('/api/oauth/agenda', oauthAgendaRoutes);

// Rotas admin
app.use('/api/agenda', apiLimiter, agendaRoutes);
```

### 2.3 Integração como Módulo (Mínima)

**Modificar apenas `routes/moduleAvailability.js`:**
- Adicionar tipo 'agenda' ao enum de tipos disponíveis
- Nenhuma outra modificação

**Modificar apenas migration para adicionar 'agenda' ao enum:**
- Criar migration específica: `095_add_agenda_to_module_types.sql`

**No dashboard, aparecerá automaticamente em "Adicionar Módulo"**

### 2.4 Middleware Próprio

**`middleware/protectAgenda.js`:**
```javascript
const { protectUser } = require('./protectUser');

const protectAgenda = (req, res, next) => {
    // Usa protectUser internamente, mas é isolado
    return protectUser(req, res, next);
};

module.exports = { protectAgenda };
```

### 2.5 Banco de Dados (Prefixos Próprios)

**Todas as tabelas com prefixo `agenda_`:**
- `agenda_settings`
- `agenda_slots`
- `agenda_blocked_dates`
- `agenda_leads`
- `agenda_appointments`

**Tabela OAuth isolada:**
- `oauth_accounts` (pode ser compartilhada, mas com namespace próprio nos campos)

---

## 3. ISOLAMENTO DE DEPENDÊNCIAS

### 3.1 Utilitários Compartilhados (Usar com Cuidado)

**Apenas usar utilitários que NÃO modificam estado:**
- `utils/responseFormatter.js` ✅ (apenas formata resposta)
- `utils/logger.js` ✅ (apenas logging)
- `db.js` ✅ (apenas conexão)

**NÃO usar:**
- Qualquer service de outro módulo
- Qualquer repository de outro módulo
- Qualquer controller de outro módulo

### 3.2 Criptografia (Novo Utilitário Isolado)

**`utils/encryption.js`:**
```javascript
// Utilitário isolado para criptografia
// Pode ser usado por ambos módulos, mas é apenas função pura
module.exports = {
    encrypt: (text, key) => { ... },
    decrypt: (encrypted, key) => { ... }
};
```

---

## 4. MODELAGEM DE BANCO DE DADOS (ISOLADA)

### 4.1 Sistema Financeiro

**Migration `093_create_finance_module.sql`:**
- Todas as tabelas com prefixo `finance_`
- Índices próprios
- Constraints próprios
- Nenhuma referência a tabelas de outros módulos (exceto `users`)

### 4.2 Sistema de Agenda

**Migration `094_create_agenda_module.sql`:**
- Todas as tabelas com prefixo `agenda_`
- Índices próprios
- Constraints próprios
- Nenhuma referência a tabelas de outros módulos (exceto `users` e `profile_items`)

**Migration `095_add_agenda_to_module_types.sql`:**
- Apenas adiciona 'agenda' ao enum existente
- Não modifica outras estruturas

---

## 5. ORDEM DE REGISTRO DE ROTAS NO SERVER.JS

**Ordem crítica para evitar conflitos:**

```javascript
// 1. Rotas públicas de agenda (ANTES de rotas genéricas)
app.use('/agenda', publicAgendaRoutes);
app.use('/api/oauth/agenda', oauthAgendaRoutes);

// 2. Rotas admin de agenda
app.use('/api/agenda', apiLimiter, agendaRoutes);

// 3. Rotas admin de financeiro
app.use('/api/finance', apiLimiter, financeRoutes);

// 4. Rotas genéricas (sempre por último)
app.use('/', publicProfileRoutes);
```

---

## 6. CHECKLIST DE ISOLAMENTO

### Financeiro
- [ ] Rotas próprias `/api/finance/*`
- [ ] Middleware próprio `protectFinance`
- [ ] Tabelas com prefixo `finance_`
- [ ] Nenhuma dependência de outros módulos
- [ ] JavaScript isolado em `finance.js`
- [ ] Apenas 1 modificação em `dashboard.html`
- [ ] Apenas funções isoladas em `dashboard.js`

### Agenda
- [ ] Rotas próprias `/api/agenda/*` e `/agenda/*`
- [ ] Middleware próprio `protectAgenda`
- [ ] Tabelas com prefixo `agenda_`
- [ ] Nenhuma dependência de outros módulos
- [ ] View isolada `agendaPublic.ejs`
- [ ] Apenas adicionar tipo ao enum de módulos
- [ ] OAuth isolado em `oauthAgenda.routes.js`

---

## 7. ARQUIVOS A CRIAR (NOVOS)

### Sistema Financeiro
- `modules/finance/finance.controller.js`
- `modules/finance/finance.service.js`
- `modules/finance/finance.repository.js`
- `modules/finance/finance.routes.js`
- `modules/finance/finance.validators.js`
- `modules/finance/finance.types.js`
- `routes/finance.routes.js`
- `middleware/protectFinance.js`
- `public_html/finance.js`
- `migrations/093_create_finance_module.sql`

### Sistema de Agenda
- `modules/agenda/agenda.controller.js`
- `modules/agenda/agenda.service.js`
- `modules/agenda/agenda.repository.js`
- `modules/agenda/agenda.routes.js`
- `modules/agenda/agenda.validators.js`
- `modules/agenda/agenda.types.js`
- `modules/agenda/google/googleCalendar.service.js`
- `modules/agenda/google/googleOAuth.service.js`
- `modules/agenda/google/googleMeet.service.js`
- `routes/agenda.routes.js`
- `routes/publicAgenda.routes.js`
- `routes/oauthAgenda.routes.js`
- `middleware/protectAgenda.js`
- `views/agendaPublic.ejs`
- `migrations/094_create_agenda_module.sql`
- `migrations/095_add_agenda_to_module_types.sql`

### Utilitários Compartilhados (Novos)
- `utils/encryption.js`

---

## 8. ARQUIVOS A MODIFICAR (MÍNIMO)

### Sistema Financeiro
- `server.js` - Apenas adicionar 2 linhas (require + app.use)
- `public_html/dashboard.html` - Apenas adicionar 1 link na sidebar
- `public_html/dashboard.js` - Apenas adicionar função isolada para painel financeiro

### Sistema de Agenda
- `server.js` - Apenas adicionar 3 linhas (requires + app.use)
- `routes/moduleAvailability.js` - Apenas adicionar 'agenda' ao enum (se necessário)
- Migration para adicionar 'agenda' ao enum de tipos de módulos

---

## 9. TESTES DE ISOLAMENTO

### Antes de cada commit:
1. Verificar que nenhuma rota de outro módulo foi afetada
2. Verificar que nenhuma tabela de outro módulo foi modificada
3. Verificar que nenhuma função de outro módulo foi alterada
4. Testar que módulos existentes continuam funcionando

### Testes específicos:
- [ ] Criar transação financeira não afeta contratos
- [ ] Criar agendamento não afeta formulários
- [ ] Rotas `/api/finance/*` não interferem com `/api/contracts/*`
- [ ] Rotas `/agenda/*` não interferem com `/form/*`
- [ ] Dashboard financeiro não quebra dashboard de contratos

---

## 10. PRINCÍPIOS DE IMPLEMENTAÇÃO

1. **Zero Dependências Cruzadas**: Cada módulo é uma ilha
2. **Namespaces Separados**: Rotas nunca se sobrepõem
3. **Modificações Mínimas**: Apenas o estritamente necessário em arquivos compartilhados
4. **Prefixos Únicos**: Todas as tabelas/rotas com prefixos próprios
5. **Middleware Próprio**: Cada módulo tem seu próprio middleware (mesmo que use protectUser internamente)
6. **Testes Isolados**: Cada módulo pode ser testado independentemente

---

## 11. ORDEM DE IMPLEMENTAÇÃO

### Fase 1: Sistema Financeiro (Totalmente Isolado)
1. Criar estrutura de arquivos
2. Criar migration isolada
3. Implementar backend (controller, service, repository)
4. Criar rotas isoladas
5. Criar middleware próprio
6. Implementar frontend isolado
7. Integrar mínimo necessário no dashboard
8. Testar isolamento

### Fase 2: Sistema de Agenda (Totalmente Isolado)
1. Criar estrutura de arquivos
2. Criar migrations isoladas
3. Implementar serviços Google (isolados)
4. Implementar backend (controller, service, repository)
5. Criar rotas isoladas (admin + público)
6. Criar middleware próprio
7. Implementar frontend público isolado
8. Adicionar ao enum de tipos de módulos
9. Testar isolamento

---

## 12. VALIDAÇÃO FINAL

Antes de considerar completo:
- [ ] Nenhum arquivo de outro módulo foi modificado (exceto os listados acima)
- [ ] Todas as rotas têm namespaces únicos
- [ ] Todas as tabelas têm prefixos únicos
- [ ] Nenhuma função compartilhada foi modificada
- [ ] Testes de isolamento passaram
- [ ] Módulos existentes continuam funcionando
