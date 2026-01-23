-- ===========================================
-- Migration: Adicionar campos QR Code para confirmação de presença
-- Data: 2026-01-10
-- Descrição: Adiciona campos qr_token e qr_code_generated_at na tabela guests
--            para permitir confirmação de presença via QR Code
-- ===========================================

-- Adicionar coluna qr_token (token único para o QR Code)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guests' 
        AND column_name = 'qr_token'
    ) THEN
        ALTER TABLE guests 
        ADD COLUMN qr_token VARCHAR(255) UNIQUE;
        
        COMMENT ON COLUMN guests.qr_token IS 'Token único para QR Code de confirmação de presença';
    END IF;
END $$;

-- Adicionar coluna qr_code_generated_at (data/hora de geração do QR Code)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'guests' 
        AND column_name = 'qr_code_generated_at'
    ) THEN
        ALTER TABLE guests 
        ADD COLUMN qr_code_generated_at TIMESTAMP;
        
        COMMENT ON COLUMN guests.qr_code_generated_at IS 'Data/hora em que o QR Code foi gerado';
    END IF;
END $$;

-- Criar índice para busca rápida por qr_token
CREATE INDEX IF NOT EXISTS idx_guests_qr_token 
ON guests(qr_token) 
WHERE qr_token IS NOT NULL;

-- Criar índice para busca rápida por document (CPF)
CREATE INDEX IF NOT EXISTS idx_guests_document 
ON guests(document) 
WHERE document IS NOT NULL;

-- Log de sucesso
DO $$
BEGIN
    RAISE NOTICE 'Migration 071: Campos QR Code (qr_token, qr_code_generated_at) adicionados com sucesso à tabela guests';
END $$;
