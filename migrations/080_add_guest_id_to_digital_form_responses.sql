-- Migration: Adicionar coluna guest_id à tabela digital_form_responses
-- Descrição: Permite vincular uma resposta de formulário diretamente a um convidado (guest)
-- Data: 2026-01-14

-- Verificar se a coluna já existe antes de adicionar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'digital_form_responses' 
        AND column_name = 'guest_id'
    ) THEN
        -- Adicionar coluna guest_id
        ALTER TABLE digital_form_responses
        ADD COLUMN guest_id INTEGER;

        -- Adicionar comentário na coluna
        COMMENT ON COLUMN digital_form_responses.guest_id IS 'ID do convidado (guest) associado a esta resposta do formulário';

        -- Criar índice para melhorar performance de buscas
        CREATE INDEX IF NOT EXISTS idx_digital_form_responses_guest_id 
        ON digital_form_responses(guest_id);

        -- Adicionar foreign key constraint (opcional, pode ser removido se causar problemas)
        -- ALTER TABLE digital_form_responses
        -- ADD CONSTRAINT fk_digital_form_responses_guest_id 
        -- FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE SET NULL;

        RAISE NOTICE 'Coluna guest_id adicionada com sucesso à tabela digital_form_responses';
    ELSE
        RAISE NOTICE 'Coluna guest_id já existe na tabela digital_form_responses';
    END IF;
END $$;
