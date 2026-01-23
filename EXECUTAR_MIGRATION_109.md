# 🚀 Executar Migration 109 - Adicionar Módulos para basic, premium, enterprise

## 📋 O Que Esta Migration Faz

Cria registros na tabela `module_plan_availability` para os planos:
- **basic** - Todos os módulos padrão (finance, agenda, contract = false)
- **premium** - Todos os módulos incluindo premium (finance, agenda, contract = true)
- **enterprise** - Todos os módulos incluindo premium (finance, agenda, contract = true)

---

## 🎯 Por Que Executar?

Sem esta migration:
- ❌ Usuários com `account_type = 'basic'` não terão módulos do plano base
- ❌ Todos os módulos aparecerão como "Adicionar" ao invés de "Já no plano"
- ❌ Sistema retornará "Módulos no plano base: 0"

Com esta migration:
- ✅ Usuários com `account_type = 'basic'` terão módulos do plano base
- ✅ Módulos do plano aparecerão como "Já no plano"
- ✅ Sistema retornará "Módulos no plano base: X" (onde X > 0)

---

## 🚀 Como Executar

### Opção 1: Script Node.js (Recomendado)

```bash
node scripts/run-migration-109.js
```

### Opção 2: Via psql

```bash
psql -h [HOST] -U [USER] -d [DATABASE] -f migrations/109_add_basic_premium_enterprise_to_module_availability.sql
```

### Opção 3: Via pgAdmin

1. Abra o pgAdmin
2. Conecte ao banco de dados
3. Abra Query Tool
4. Cole o conteúdo do arquivo `migrations/109_add_basic_premium_enterprise_to_module_availability.sql`
5. Execute (F5)

---

## ✅ Verificação

Após executar, você deve ver:

```
✅ Migration 109 executada com sucesso!
✅ Módulos configurados para os planos:
   📋 basic: X disponíveis, Y indisponíveis (total: Z)
   📋 premium: X disponíveis, Y indisponíveis (total: Z)
   📋 enterprise: X disponíveis, Y indisponíveis (total: Z)

📊 Módulos Premium (finance, agenda, contract):
   basic.finance: ❌ Indisponível
   basic.agenda: ❌ Indisponível
   basic.contract: ❌ Indisponível
   premium.finance: ✅ Disponível
   premium.agenda: ✅ Disponível
   premium.contract: ✅ Disponível
   enterprise.finance: ✅ Disponível
   enterprise.agenda: ✅ Disponível
   enterprise.contract: ✅ Disponível
```

---

## 🧪 Testar Após Executar

1. Acesse o dashboard como admin
2. Vá em "Planos Individuais por Usuário"
3. Selecione um usuário com `account_type = 'basic'`
4. Clique em "Configurar Módulos"
5. Verifique:
   - ✅ Módulos do plano basic aparecem como "Já no plano"
   - ✅ Checkboxes desabilitados
   - ✅ Log mostra: `Módulos no plano base: X` (onde X > 0)

---

## ⚠️ Importante

Esta migration é **segura** e pode ser executada múltiplas vezes:
- Usa `IF NOT EXISTS` para evitar duplicatas
- Atualiza registros existentes se necessário
- Não remove dados existentes

---

## ✅ Pronto!

Execute a migration e o problema será resolvido! 🎉
