-- ===========================================
-- Migration: Criar tabela de respostas do Formulário King
-- Data: 2026-01-05
-- Descrição: Armazena respostas dos formulários digitais
-- ===========================================

-- Criar tabela para armazenar respostas dos formulários
CREATE TABLE IF NOT EXISTS digital_form_responses (
    id SERIAL PRIMARY KEY,
    profile_item_id INTEGER NOT NULL,
    response_data JSONB NOT NULL, -- Todas as respostas em formato JSON
    responder_name VARCHAR(255), -- Nome do respondente (se fornecido)
    responder_email VARCHAR(255), -- Email do respondente (se fornecido)
    responder_phone VARCHAR(50), -- Telefone do respondente (se fornecido)
    submitted_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (profile_item_id) REFERENCES profile_items(id) ON DELETE CASCADE
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_digital_form_responses_profile_item ON digital_form_responses(profile_item_id);
CREATE INDEX IF NOT EXISTS idx_digital_form_responses_submitted_at ON digital_form_responses(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_digital_form_responses_created_at ON digital_form_responses(created_at DESC);

-- Índice GIN para busca em JSONB
CREATE INDEX IF NOT EXISTS idx_digital_form_responses_data ON digital_form_responses USING GIN(response_data);

COMMENT ON TABLE digital_form_responses IS 'Armazena respostas dos formulários digitais';
COMMENT ON COLUMN digital_form_responses.profile_item_id IS 'ID do item do tipo digital_form em profile_items';
COMMENT ON COLUMN digital_form_responses.response_data IS 'Respostas em formato JSONB com todas as perguntas e respostas';
COMMENT ON COLUMN digital_form_responses.responder_name IS 'Nome do respondente (opcional)';
COMMENT ON COLUMN digital_form_responses.responder_phone IS 'Telefone do respondente (opcional)';

