-- Migration: Adicionar Posicionamento de Assinaturas no PDF
-- Data: 2025-01-31
-- Descrição: Adiciona campos para posicionar assinaturas em locais específicos do PDF

-- Adicionar campos de posicionamento na tabela de assinaturas
ALTER TABLE ck_contracts_signatures
ADD COLUMN IF NOT EXISTS signature_page INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS signature_x DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS signature_y DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS signature_width DECIMAL(10, 2) DEFAULT 200,
ADD COLUMN IF NOT EXISTS signature_height DECIMAL(10, 2) DEFAULT 80;

-- Comentários
COMMENT ON COLUMN ck_contracts_signatures.signature_page IS 'Número da página onde a assinatura deve ser posicionada (1-indexed)';
COMMENT ON COLUMN ck_contracts_signatures.signature_x IS 'Posição X (em pontos) da assinatura no PDF';
COMMENT ON COLUMN ck_contracts_signatures.signature_y IS 'Posição Y (em pontos) da assinatura no PDF';
COMMENT ON COLUMN ck_contracts_signatures.signature_width IS 'Largura da assinatura em pontos';
COMMENT ON COLUMN ck_contracts_signatures.signature_height IS 'Altura da assinatura em pontos';
