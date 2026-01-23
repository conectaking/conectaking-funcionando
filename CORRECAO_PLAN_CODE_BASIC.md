# ✅ Correção: Plan Code 'basic' não encontrado

## 🔴 Problema Identificado

O sistema estava retornando:
```
⚠️ Plan code 'basic' não encontrado, usando 'basic' como fallback
Módulos no plano base: 0
```

**Causa:**
- Usuário tem `account_type = 'basic'`
- O `plan_code = 'basic'` não existe na tabela `module_plan_availability`
- Sistema não encontra módulos do plano base
- Todos os módulos aparecem como "Adicionar" ao invés de "Já no plano"

---

## ✅ Soluções Implementadas

### 1. Migration para Criar Módulos para 'basic', 'premium', 'enterprise'

**Arquivo:** `migrations/109_add_basic_premium_enterprise_to_module_availability.sql`

**O que faz:**
- Cria registros na tabela `module_plan_availability` para planos 'basic', 'premium', 'enterprise'
- Configura todos os módulos padrão como disponíveis
- Configura módulos premium (finance, agenda, contract):
  - **basic:** NÃO tem acesso (is_available = false)
  - **premium:** TEM acesso (is_available = true)
  - **enterprise:** TEM acesso (is_available = true)

### 2. Melhoramento da Lógica de Mapeamento

**Arquivo:** `routes/moduleAvailability.js`

**Mudanças:**
- ✅ Busca todos os plan_codes disponíveis na tabela
- ✅ Mapeia 'basic' para 'king_base' se 'basic' não existir
- ✅ Mapeia 'premium' para 'king_premium_plus' se 'premium' não existir
- ✅ Mapeia 'enterprise' para 'king_corporate' se 'enterprise' não existir
- ✅ Logs detalhados para debug

---

## 🎯 Como Funciona Agora

### Cenário 1: 'basic' existe na tabela
1. Sistema busca módulos com `plan_code = 'basic'`
2. Retorna módulos corretamente
3. Mostra quais estão no plano base

### Cenário 2: 'basic' NÃO existe na tabela
1. Sistema detecta que 'basic' não existe
2. Verifica se existe em `subscription_plans` (existe)
3. Mapeia para 'king_base' (equivalente)
4. Busca módulos com `plan_code = 'king_base'`
5. Retorna módulos corretamente

---

## 📋 Próximos Passos

### Opção 1: Executar Migration (Recomendado)

Execute a migration para criar os registros:

```sql
-- Executar migration
\i migrations/109_add_basic_premium_enterprise_to_module_availability.sql
```

**OU via Node.js:**
```javascript
// Executar migration
const db = require('./db');
const fs = require('fs');
const migrationSQL = fs.readFileSync('migrations/109_add_basic_premium_enterprise_to_module_availability.sql', 'utf8');
await db.query(migrationSQL);
```

### Opção 2: Usar Mapeamento Automático

A lógica já está configurada para mapear automaticamente:
- `basic` → `king_base`
- `premium` → `king_premium_plus`
- `enterprise` → `king_corporate`

---

## ✅ Resultado Esperado

Após executar a migration ou usar o mapeamento:

- ✅ Sistema encontra módulos do plano base
- ✅ Módulos do plano aparecem como "Já no plano"
- ✅ Checkboxes dos módulos do plano estão desabilitados
- ✅ Log mostra: `Módulos no plano base: X` (onde X > 0)

---

## 📁 Arquivos Criados/Modificados

### Criados:
- ✅ `migrations/109_add_basic_premium_enterprise_to_module_availability.sql`

### Modificados:
- ✅ `routes/moduleAvailability.js` - Melhoramento do mapeamento

---

## 🧪 Como Testar

1. Execute a migration (se ainda não executou)
2. Acesse "Planos Individuais por Usuário"
3. Selecione um usuário com `account_type = 'basic'`
4. Clique em "Configurar Módulos"
5. Verifique:
   - ✅ Módulos do plano basic aparecem como "Já no plano"
   - ✅ Checkboxes desabilitados
   - ✅ Log mostra módulos encontrados

---

## ⚠️ Importante

**A migration deve ser executada** para garantir que os módulos estejam configurados corretamente para os planos 'basic', 'premium' e 'enterprise'.

Se não executar a migration, o sistema usará o mapeamento automático (basic → king_base), mas é melhor ter os registros corretos na tabela.

---

## ✅ Pronto!

A correção foi implementada. Execute a migration e o problema será resolvido! 🎉
