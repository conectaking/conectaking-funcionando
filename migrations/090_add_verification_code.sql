-- Migration: Adicionar Autenticação por Código de Verificação
-- Data: 2025-01-31
-- Descrição: Adiciona campos para código de verificação nos signatários

-- Adicionar campos de verificação na tabela de signatários
ALTER TABLE ck_contracts_signers
ADD COLUMN IF NOT EXISTS verification_code VARCHAR(6),
ADD COLUMN IF NOT EXISTS verification_code_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS verification_code_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS verification_code_verified BOOLEAN DEFAULT false;

-- Comentários
COMMENT ON COLUMN ck_contracts_signers.verification_code IS 'Código de 6 dígitos enviado por email para verificação';
COMMENT ON COLUMN ck_contracts_signers.verification_code_expires_at IS 'Data de expiração do código (15 minutos)';
COMMENT ON COLUMN ck_contracts_signers.verification_code_attempts IS 'Número de tentativas de verificação';
COMMENT ON COLUMN ck_contracts_signers.verification_code_verified IS 'Se o código foi verificado com sucesso';

-- Índice para busca por código
CREATE INDEX IF NOT EXISTS idx_contracts_signers_verification_code ON ck_contracts_signers(verification_code) WHERE verification_code IS NOT NULL;
