# Migrations do Banco de Dados

Este diretório contém todas as migrations SQL do projeto Conecta King, organizadas em ordem numérica sequencial.

## 📋 Lista de Migrations

### Migrations Base (001-010)
- **001** - `create_refresh_tokens_table.sql` - Tabela de tokens de refresh
- **002** - `add_indexes.sql` - Índices para otimização de queries
- **003** - `create_password_reset_tokens_table.sql` - Tabela de tokens de recuperação de senha
- **004** - `create_analytics_events_table.sql` - Tabela de eventos de analytics
- **005** - `add_analytics_indexes.sql` - Índices para analytics
- **006** - `create_user_activities_table.sql` - Tabela de atividades dos usuários
- **007** - `add_whatsapp_message_to_profile_items.sql` - Adiciona campo de mensagem WhatsApp
- **008** - `add_new_embed_types_to_enum.sql` - Adiciona novos tipos de embed
- **009** - `add_product_catalog_to_enum.sql` - Adiciona tipo de catálogo de produtos
- **010** - `create_product_catalog_items_table.sql` - Tabela de itens do catálogo de produtos

### Migrations de Funcionalidades (011-014)
- **011** - `add_button_content_align_to_user_profiles.sql` - Alinhamento do conteúdo dos botões
- **012** - `create_profile_tabs_table.sql` - Tabela de abas (tabs) do perfil público
- **013** - `add_tab_id_to_profile_items.sql` - Adiciona tab_id em profile_items (depende da 012)
- **014** - `add_is_active_to_profile_items.sql` - Adiciona coluna is_active em profile_items

## ⚠️ Ordem de Execução

**IMPORTANTE:** Algumas migrations têm dependências. Execute na ordem numérica:

1. Execute as migrations base (001-011) em ordem
2. Execute **012** antes de **013** (013 depende da tabela criada em 012)
3. A migration **014** pode ser executada independentemente

## 📝 Como Executar

### No DBeaver:
1. Abra o DBeaver e conecte-se ao banco de dados PostgreSQL
2. Abra um SQL Editor (Ctrl+])
3. Abra o arquivo da migration desejada
4. Execute o script completo (Ctrl+Enter)

### Scripts com Dependências:
- **012 → 013**: Execute primeiro `012_create_profile_tabs_table.sql`, depois `013_add_tab_id_to_profile_items.sql`

## ✅ Verificação

Após executar uma migration, você pode verificar se foi aplicada corretamente consultando:
- `information_schema.tables` - Para tabelas
- `information_schema.columns` - Para colunas
- `pg_indexes` - Para índices

## 🔄 Idempotência

Todas as migrations são **idempotentes**, ou seja, podem ser executadas múltiplas vezes sem causar erros. Elas verificam se a estrutura já existe antes de criar.

