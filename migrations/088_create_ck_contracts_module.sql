-- Migration: Criar módulo de Contratos Digitais
-- Data: 2025-01-31
-- Descrição: Cria tabelas para gestão de contratos digitais com assinatura eletrônica
-- Prefixo: ck_contracts_* (isolado do sistema principal)

-- ============================================
-- 1. TABELA: Templates de Contratos
-- ============================================
CREATE TABLE IF NOT EXISTS ck_contracts_templates (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para templates
CREATE INDEX IF NOT EXISTS idx_contracts_templates_category ON ck_contracts_templates(category);
CREATE INDEX IF NOT EXISTS idx_contracts_templates_title ON ck_contracts_templates(title);

-- Comentários
COMMENT ON TABLE ck_contracts_templates IS 'Templates de contratos disponíveis para uso';
COMMENT ON COLUMN ck_contracts_templates.category IS 'Categoria do template (Marketing, Fotografia, Eventos, etc.)';
COMMENT ON COLUMN ck_contracts_templates.content IS 'Conteúdo do template com variáveis {{VARIAVEL}}';
COMMENT ON COLUMN ck_contracts_templates.variables IS 'Array JSON com variáveis esperadas: [{"name": "NOME_CLIENTE", "label": "Nome do Cliente", "type": "text", "required": true}]';

-- ============================================
-- 2. TABELA: Contratos
-- ============================================
CREATE TABLE IF NOT EXISTS ck_contracts (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id INTEGER REFERENCES ck_contracts_templates(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    -- draft, sent, signed, completed, cancelled
    contract_type VARCHAR(50) NOT NULL DEFAULT 'template',
    -- template, imported
    pdf_url TEXT,
    -- URL do PDF original (se importado)
    pdf_content TEXT,
    -- Conteúdo do contrato com variáveis substituídas
    variables JSONB DEFAULT '{}'::jsonb,
    -- Variáveis preenchidas: {"NOME_CLIENTE": "João Silva", "VALOR": "1000.00"}
    original_pdf_hash VARCHAR(64),
    -- SHA-256 do PDF original (se importado)
    final_pdf_url TEXT,
    -- URL do PDF final com assinaturas
    final_pdf_hash VARCHAR(64),
    -- SHA-256 do PDF final assinado
    expires_at TIMESTAMP,
    -- Data de expiração do link de assinatura
    completed_at TIMESTAMP,
    -- Data quando todos assinaram
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para contratos
CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON ck_contracts(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON ck_contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_template_id ON ck_contracts(template_id);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON ck_contracts(created_at DESC);

-- Comentários
COMMENT ON TABLE ck_contracts IS 'Contratos criados pelos usuários';
COMMENT ON COLUMN ck_contracts.status IS 'Status: draft, sent, signed, completed, cancelled';
COMMENT ON COLUMN ck_contracts.contract_type IS 'Tipo: template (gerado de template) ou imported (PDF importado)';
COMMENT ON COLUMN ck_contracts.pdf_content IS 'Conteúdo do contrato com variáveis já substituídas';
COMMENT ON COLUMN ck_contracts.variables IS 'Objeto JSON com variáveis preenchidas: {"NOME_CLIENTE": "João", "VALOR": "1000"}';
COMMENT ON COLUMN ck_contracts.original_pdf_hash IS 'Hash SHA-256 do PDF original para integridade';
COMMENT ON COLUMN ck_contracts.final_pdf_hash IS 'Hash SHA-256 do PDF final assinado para integridade';

-- ============================================
-- 3. TABELA: Signatários
-- ============================================
CREATE TABLE IF NOT EXISTS ck_contracts_signers (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL REFERENCES ck_contracts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL DEFAULT 'signer',
    -- signer, witness, owner
    sign_order INTEGER NOT NULL DEFAULT 0,
    -- Ordem de assinatura (0 = simultânea, >0 = sequencial)
    sign_token VARCHAR(255) NOT NULL UNIQUE,
    -- Token único para link de assinatura (UUID + HMAC)
    token_expires_at TIMESTAMP NOT NULL,
    -- Data de expiração do token (7 dias padrão)
    signed_at TIMESTAMP,
    -- Data quando assinou
    ip_address VARCHAR(45),
    -- IP quando acessou o link
    user_agent TEXT,
    -- User-Agent do navegador
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para signatários
CREATE INDEX IF NOT EXISTS idx_contracts_signers_contract_id ON ck_contracts_signers(contract_id);
CREATE INDEX IF NOT EXISTS idx_contracts_signers_email ON ck_contracts_signers(email);
CREATE INDEX IF NOT EXISTS idx_contracts_signers_sign_token ON ck_contracts_signers(sign_token);
CREATE INDEX IF NOT EXISTS idx_contracts_signers_signed_at ON ck_contracts_signers(signed_at);

-- Comentários
COMMENT ON TABLE ck_contracts_signers IS 'Signatários do contrato';
COMMENT ON COLUMN ck_contracts_signers.role IS 'Papel: signer (signatário), witness (testemunha), owner (proprietário)';
COMMENT ON COLUMN ck_contracts_signers.sign_order IS 'Ordem: 0 = todos assinam ao mesmo tempo, >0 = sequencial (1 primeiro, 2 segundo, etc.)';
COMMENT ON COLUMN ck_contracts_signers.sign_token IS 'Token único, não reutilizável, para link de assinatura';

-- ============================================
-- 4. TABELA: Assinaturas
-- ============================================
CREATE TABLE IF NOT EXISTS ck_contracts_signatures (
    id SERIAL PRIMARY KEY,
    signer_id INTEGER NOT NULL REFERENCES ck_contracts_signers(id) ON DELETE CASCADE,
    contract_id INTEGER NOT NULL REFERENCES ck_contracts(id) ON DELETE CASCADE,
    signature_type VARCHAR(50) NOT NULL,
    -- canvas, upload, typed
    signature_data TEXT NOT NULL,
    -- Base64 do canvas, URL da imagem, ou texto digitado
    signature_image_url TEXT,
    -- URL da imagem de assinatura (se canvas ou upload)
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT NOT NULL,
    signed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para assinaturas
CREATE INDEX IF NOT EXISTS idx_contracts_signatures_signer_id ON ck_contracts_signatures(signer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_signatures_contract_id ON ck_contracts_signatures(contract_id);
CREATE INDEX IF NOT EXISTS idx_contracts_signatures_signed_at ON ck_contracts_signatures(signed_at);

-- Comentários
COMMENT ON TABLE ck_contracts_signatures IS 'Assinaturas eletrônicas dos signatários';
COMMENT ON COLUMN ck_contracts_signatures.signature_type IS 'Tipo: canvas (desenho), upload (imagem), typed (texto)';
COMMENT ON COLUMN ck_contracts_signatures.signature_data IS 'Dados da assinatura (base64, URL, ou texto)';
COMMENT ON COLUMN ck_contracts_signatures.signature_image_url IS 'URL da imagem final da assinatura';

-- ============================================
-- 5. TABELA: Logs de Auditoria
-- ============================================
CREATE TABLE IF NOT EXISTS ck_contracts_audit_logs (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL REFERENCES ck_contracts(id) ON DELETE CASCADE,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    -- created, edited, sent, viewed, signed, finalized, downloaded, deleted
    details JSONB DEFAULT '{}'::jsonb,
    -- Detalhes da ação: {"field": "title", "old_value": "A", "new_value": "B"}
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices para auditoria
CREATE INDEX IF NOT EXISTS idx_contracts_audit_contract_id ON ck_contracts_audit_logs(contract_id);
CREATE INDEX IF NOT EXISTS idx_contracts_audit_user_id ON ck_contracts_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_audit_action ON ck_contracts_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_contracts_audit_created_at ON ck_contracts_audit_logs(created_at DESC);

-- Comentários
COMMENT ON TABLE ck_contracts_audit_logs IS 'Logs de auditoria de todas as ações nos contratos';
COMMENT ON COLUMN ck_contracts_audit_logs.action IS 'Ação: created, edited, sent, viewed, signed, finalized, downloaded, deleted';
COMMENT ON COLUMN ck_contracts_audit_logs.details IS 'JSON com detalhes da ação (campos alterados, valores antigos/novos, etc.)';

-- ============================================
-- 6. SEED: Templates Iniciais (12 templates)
-- ============================================
-- Inserir templates apenas se a tabela estiver vazia
INSERT INTO ck_contracts_templates (title, category, description, content, variables)
SELECT 
    'Prestação de Serviços (Genérico)',
    'Prestação de Serviços',
    'Contrato genérico para prestação de serviços diversos',
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS

CONTRATANTE: {{NOME_CLIENTE}}
CPF/CNPJ: {{CPF_CNPJ}}
Endereço: {{ENDERECO}}

CONTRATADO: {{NOME_CONTRATADO}}
CPF/CNPJ: {{CPF_CNPJ_CONTRATADO}}

OBJETO
O presente contrato tem por objeto a prestação dos seguintes serviços: {{DESCRICAO_SERVICOS}}.

VALOR
O valor total dos serviços é de R$ {{VALOR_TOTAL}}, a ser pago conforme: {{FORMA_PAGAMENTO}}.

PRAZO
O prazo para execução dos serviços é de {{PRAZO_EXECUCAO}}.

FORO
Fica eleito o foro da comarca de {{CIDADE_CONTRATANTE}} para dirimir qualquer controvérsia oriunda do presente contrato.

{{CIDADE_CONTRATANTE}}, {{DATA_CONTRATO}}.

_________________________          _________________________
{{NOME_CLIENTE}}                     {{NOME_CONTRATADO}}',
    '[
        {"name": "NOME_CLIENTE", "label": "Nome do Cliente", "type": "text", "required": true},
        {"name": "CPF_CNPJ", "label": "CPF/CNPJ do Cliente", "type": "text", "required": true},
        {"name": "ENDERECO", "label": "Endereço do Cliente", "type": "text", "required": false},
        {"name": "NOME_CONTRATADO", "label": "Nome do Prestador", "type": "text", "required": true},
        {"name": "CPF_CNPJ_CONTRATADO", "label": "CPF/CNPJ do Prestador", "type": "text", "required": true},
        {"name": "DESCRICAO_SERVICOS", "label": "Descrição dos Serviços", "type": "textarea", "required": true},
        {"name": "VALOR_TOTAL", "label": "Valor Total (R$)", "type": "text", "required": true},
        {"name": "FORMA_PAGAMENTO", "label": "Forma de Pagamento", "type": "text", "required": true},
        {"name": "PRAZO_EXECUCAO", "label": "Prazo para Execução", "type": "text", "required": true},
        {"name": "CIDADE_CONTRATANTE", "label": "Cidade", "type": "text", "required": true},
        {"name": "DATA_CONTRATO", "label": "Data do Contrato", "type": "date", "required": true}
    ]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM ck_contracts_templates WHERE title = 'Prestação de Serviços (Genérico)');

-- Adicionar mais 11 templates seguindo o mesmo padrão
-- (Vou criar um arquivo separado para os seeds completos se necessário)

-- ============================================
-- 7. TRIGGERS: Atualizar updated_at automaticamente
-- ============================================
CREATE OR REPLACE FUNCTION update_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_contracts_updated_at
    BEFORE UPDATE ON ck_contracts
    FOR EACH ROW
    EXECUTE FUNCTION update_contracts_updated_at();

CREATE TRIGGER trigger_contracts_templates_updated_at
    BEFORE UPDATE ON ck_contracts_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_contracts_updated_at();

-- ============================================
-- VERIFICAÇÃO
-- ============================================
-- Verificar se as tabelas foram criadas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ck_contracts_templates') THEN
        RAISE EXCEPTION 'Tabela ck_contracts_templates não foi criada';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ck_contracts') THEN
        RAISE EXCEPTION 'Tabela ck_contracts não foi criada';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ck_contracts_signers') THEN
        RAISE EXCEPTION 'Tabela ck_contracts_signers não foi criada';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ck_contracts_signatures') THEN
        RAISE EXCEPTION 'Tabela ck_contracts_signatures não foi criada';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ck_contracts_audit_logs') THEN
        RAISE EXCEPTION 'Tabela ck_contracts_audit_logs não foi criada';
    END IF;
END $$;
