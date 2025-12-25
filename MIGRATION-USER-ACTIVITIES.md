# 🚀 MIGRATION: Tabela de Atividades dos Usuários

## 📋 O que foi criado

Foi criada uma tabela `user_activities` para rastrear **todas as atividades dos usuários** no sistema, permitindo analytics avançado no painel admin.

## ✅ Funcionalidades Implementadas

### 1. **Tabela `user_activities`**
- Registra logins
- Registra criação/edição/deleção de links
- Registra atualizações de perfil
- Registra mudanças de configurações
- Armazena IP, User-Agent e metadados

### 2. **Analytics Avançado no Admin**
O painel admin agora exibe:
- ✅ **Usuários ativos hoje** (qualquer atividade)
- ✅ **Logins hoje**
- ✅ **Usuários que alteraram algo hoje** (profile, links, etc)
- ✅ **Usuários com perfil ativo**
- ✅ **Total de links criados**
- ✅ **Assinaturas vencidas**
- ✅ **Assinaturas vencendo em 7 dias**
- ✅ **Usuários inativos hoje**
- ✅ **Dias desde última atividade** (para cada usuário)
- ✅ **Se o usuário usou hoje** (sim/não)

## 📝 Como Executar a Migration

### Opção 1: SQL Direto (Recomendado)

1. Acesse o PostgreSQL no Render.com
2. Vá em "Connect" → "External connection"
3. Copie e execute o conteúdo do arquivo:
   ```
   migrations/EXECUTAR-USER-ACTIVITIES.sql
   ```

### Opção 2: Via Script Node.js

```bash
cd conecta-king-backend
node scripts/run-migrations.js
```

### Opção 3: Via psql (Linha de comando)

```bash
psql -h [HOST] -U [USER] -d [DATABASE] -f migrations/EXECUTAR-USER-ACTIVITIES.sql
```

## 🔍 Verificar se funcionou

Após executar a migration, execute:

```sql
-- Verificar se a tabela foi criada
SELECT COUNT(*) FROM user_activities;

-- Verificar estrutura
\d user_activities;

-- Verificar índices
SELECT indexname FROM pg_indexes WHERE tablename = 'user_activities';
```

## 📊 Endpoint do Admin

O endpoint `/api/admin/advanced-stats` agora retorna:

```json
{
  "activeUsersToday": 15,
  "loginsToday": 12,
  "modifiedToday": 8,
  "expiredSubscriptions": 3,
  "expiringSoon": 2,
  "usersWithProfile": 25,
  "totalLinks": 120,
  "notUsedToday": 10,
  "usersActivity": [
    {
      "id": "USER-123",
      "email": "user@example.com",
      "displayName": "João Silva",
      "subscriptionStatus": "active",
      "subscriptionExpiresAt": "2026-01-21",
      "lastActivityDate": "2025-12-21T14:30:00Z",
      "daysSinceLastActivity": 0,
      "usedToday": true,
      "isExpired": false
    }
  ]
}
```

## 🔄 Próximos Passos

1. ✅ Execute a migration no banco de dados
2. ✅ Faça upload do `admin/index.html` e `admin/admin.js` atualizados
3. ✅ Os dados começarão a ser registrados automaticamente

## ⚠️ Nota Importante

- A tabela começará a registrar atividades **após** a migration ser executada
- Dados históricos anteriores à migration não estarão disponíveis
- O sistema continuará funcionando normalmente mesmo se a tabela não existir (registros são opcionais)
