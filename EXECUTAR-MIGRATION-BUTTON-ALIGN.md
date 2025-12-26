# Migration: Adicionar button_content_align à user_profiles

## Problema
O campo `button_content_align` não estava sendo aplicado no cartão público porque a coluna pode não existir no banco de dados.

## Solução
Execute a migration `011_add_button_content_align_to_user_profiles.sql` para adicionar a coluna ao banco de dados.

## Instruções

1. **Conecte-se ao banco de dados PostgreSQL no DBeaver (ou outra ferramenta)**

2. **Execute a migration:**
   ```sql
   -- Migration: Adicionar coluna button_content_align à tabela user_profiles
   -- Data: 2025-12-25
   -- Descrição: Adiciona campo para controlar o alinhamento do conteúdo dos botões (left, center, right)

   -- Verificar se a coluna já existe antes de adicionar
   DO $$ 
   BEGIN
       IF NOT EXISTS (
           SELECT 1 
           FROM information_schema.columns 
           WHERE table_name = 'user_profiles' 
           AND column_name = 'button_content_align'
       ) THEN
           ALTER TABLE user_profiles 
           ADD COLUMN button_content_align VARCHAR(10) DEFAULT 'center' 
           CHECK (button_content_align IN ('left', 'center', 'right'));
           
           -- Atualizar registros existentes para usar 'center' como padrão
           UPDATE user_profiles 
           SET button_content_align = 'center' 
           WHERE button_content_align IS NULL;
           
           RAISE NOTICE 'Coluna button_content_align adicionada com sucesso à tabela user_profiles';
       ELSE
           RAISE NOTICE 'Coluna button_content_align já existe na tabela user_profiles';
       END IF;
   END $$;
   ```

3. **Verifique se a coluna foi criada:**
   ```sql
   SELECT 
       column_name, 
       data_type, 
       column_default,
       is_nullable
   FROM information_schema.columns 
   WHERE table_name = 'user_profiles' 
   AND column_name = 'button_content_align';
   ```

4. **Após executar a migration:**
   - Salve novamente as configurações no dashboard
   - Recarregue a página do cartão público (Ctrl+F5 para limpar cache)
   - O alinhamento deve funcionar corretamente

## Arquivo da Migration
`migrations/011_add_button_content_align_to_user_profiles.sql`

