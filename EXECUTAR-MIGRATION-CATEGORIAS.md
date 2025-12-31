# 🚀 Executar Migration de Categorias

## 📋 O que este script faz?

Este script adiciona todas as categorias necessárias ao sistema IA KING, incluindo:
- **Religioso** (conteúdo religioso e espiritual)
- **Estética** (beleza e cuidados pessoais)
- **Ciência** (conteúdo científico)
- E mais 30+ categorias adicionais

## ✅ Como Executar

### Opção 1: Via Script Node.js (Recomendado)

```bash
node scripts/run-migrations.js
```

Este comando executará todas as migrations, incluindo a nova `032_add_all_categories.sql`.

### Opção 2: Executar Apenas Esta Migration

Se você quiser executar apenas esta migration específica:

```bash
# No terminal, na pasta raiz do projeto
node -e "
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const pool = new Pool({
    user: config.db.user,
    host: config.db.host,
    database: config.db.database,
    password: config.db.password,
    port: config.db.port,
    ssl: config.db.host !== 'localhost' && config.db.host !== '127.0.0.1' ? config.db.ssl : false
});

(async () => {
    const client = await pool.connect();
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'migrations/032_add_all_categories.sql'), 'utf8');
        await client.query(sql);
        console.log('✅ Migration de categorias executada com sucesso!');
    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
})();
"
```

### Opção 3: Via DBeaver ou pgAdmin

1. Abra o DBeaver ou pgAdmin
2. Conecte-se ao banco de dados
3. Abra o arquivo `migrations/032_add_all_categories.sql`
4. Execute todo o conteúdo do arquivo

### Opção 4: Via Render Shell (se estiver usando Render)

1. Acesse o dashboard do Render
2. Vá para o serviço PostgreSQL (não o Web Service)
3. Abra o Shell
4. Execute:
```bash
psql $DATABASE_URL -f migrations/032_add_all_categories.sql
```

## 🔍 Verificar se Funcionou

Após executar a migration, verifique se as categorias foram adicionadas:

```sql
SELECT id, name, description, priority, is_active 
FROM ia_categories 
WHERE is_active = true
ORDER BY priority DESC, name ASC;
```

Você deve ver todas as categorias, incluindo:
- Religioso
- Estética
- Ciência
- E todas as outras categorias

## 📝 Categorias Adicionadas

- Religioso
- Estética
- Ciência
- Educação
- Negócios
- Vendas
- Tecnologia
- Saúde
- Psicologia
- Filosofia
- História
- Literatura
- Arte
- Música
- Esportes
- Culinária
- Viagem
- Política
- Economia
- Direito
- Medicina
- Engenharia
- Arquitetura
- Moda
- Entretenimento
- Jogos
- Animais
- Natureza
- Autoajuda
- Motivação
- Biografia
- Ficção
- Não Ficção

E as categorias do sistema que já existiam:
- Sistema
- Módulos
- Assinatura
- Suporte
- Geral

## ✅ Próximos Passos

Após executar a migration:
1. Recarregue a página do painel IA KING no navegador
2. Clique no dropdown de categoria
3. Você deve ver todas as categorias disponíveis!

