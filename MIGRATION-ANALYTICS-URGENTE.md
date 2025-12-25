# 🚨 URGENTE: Executar Migration - Tabela analytics_events

## 📋 Problema Identificado

As queries de analytics estão falhando porque:
1. A tabela `analytics_events` pode não existir ou não ter todas as colunas necessárias
2. Faltam índices para otimizar as queries
3. A coluna `destination_url` em `profile_items` pode não estar indexada

---

## ✅ Solução: Executar Migrations SQL

### **⭐ OPÇÃO RECOMENDADA: Script Único Completo**

**Execute o arquivo `migrations/EXECUTAR-TUDO-ANALYTICS.sql` que contém tudo em um só script!**

1. **Conecte ao banco PostgreSQL do Render:**
   - Host: `virginia-postgres.render.com`
   - Database: `conecta_king_db`
   - User: `conecta_king_db_user`
   - Password: `LGiJv1hsYj7VujzIePXzWDKQnZDBHMJg`
   - Port: `5432`

2. **Abra o arquivo `migrations/EXECUTAR-TUDO-ANALYTICS.sql`**
   
3. **Copie TODO o conteúdo e execute no DBeaver/psql**

4. **O script fará:**
   - ✅ Criar a tabela `analytics_events`
   - ✅ Criar todos os índices necessários
   - ✅ Verificar se tudo foi criado corretamente
   - ✅ Mostrar estatísticas dos dados existentes

---

### **Opção 2: Executar Separadamente (se preferir)**

1. **Conecte ao banco PostgreSQL do Render:**
   - Host: `virginia-postgres.render.com`
   - Database: `conecta_king_db`
   - User: `conecta_king_db_user`
   - Password: `LGiJv1hsYj7VujzIePXzWDKQnZDBHMJg`
   - Port: `5432`

2. **Execute este SQL (copie e cole do arquivo `migrations/004_create_analytics_events_table.sql`):**

```sql
-- Criar tabela analytics_events
CREATE TABLE IF NOT EXISTS analytics_events (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('view', 'click', 'vcard_download')),
    item_id INTEGER NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES profile_items(id) ON DELETE SET NULL
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_item_id ON analytics_events(item_id) WHERE item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_event_type ON analytics_events(user_id, event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created ON analytics_events(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_item_event_type ON analytics_events(item_id, event_type) WHERE item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_type_created ON analytics_events(user_id, event_type, created_at);
```

3. **Verifique se a tabela foi criada:**

```sql
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'analytics_events'
);
```

Deve retornar `true`.

4. **Verifique a estrutura da tabela:**

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'analytics_events'
ORDER BY ordinal_position;
```

---

### **Opção 2: Verificar se profile_items tem destination_url**

Execute para verificar se a coluna existe:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profile_items'
AND column_name IN ('destination_url', 'url', 'link');
```

Se `destination_url` não existir, mas `url` ou `link` existirem, precisamos criar um script para renomear ou adicionar a coluna.

---

### **Opção 3: Script Completo de Verificação**

Execute este script para verificar tudo:

```sql
-- 1. Verificar se analytics_events existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'analytics_events'
) AS analytics_events_exists;

-- 2. Verificar colunas de profile_items
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profile_items'
ORDER BY ordinal_position;

-- 3. Verificar se há dados em analytics_events
SELECT COUNT(*) as total_events,
       COUNT(DISTINCT user_id) as unique_users,
       COUNT(DISTINCT item_id) as unique_items
FROM analytics_events;
```

---

## 🔍 Diagnóstico

Se a tabela `analytics_events` não existir:
- Os eventos de cliques não estão sendo salvos
- As queries de analytics vão falhar
- O dashboard mostrará zeros em todos os lugares

Se a tabela existir mas faltarem colunas:
- As queries podem falhar com erros específicos sobre colunas não encontradas

Se `profile_items` não tiver `destination_url`:
- As queries que buscam URLs dos links vão falhar
- Precisamos renomear ou adicionar a coluna correta

---

## ✅ Após Executar

1. Recarregue a aplicação
2. Teste clicar em um link no perfil público
3. Verifique se o evento foi registrado:

```sql
SELECT * FROM analytics_events 
ORDER BY created_at DESC 
LIMIT 5;
```

4. Teste o dashboard de analytics novamente

---

## 📝 Notas

- A migration usa `CREATE TABLE IF NOT EXISTS`, então é seguro executar mesmo se a tabela já existir
- Os índices usam `CREATE INDEX IF NOT EXISTS`, então não causarão erro se já existirem
- A tabela tem foreign keys, então precisa que `users` e `profile_items` existam primeiro
