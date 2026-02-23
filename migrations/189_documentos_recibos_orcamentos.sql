-- ===========================================
-- Migration 189: Tabela documentos (recibos e orçamentos)
-- Suporta: tipo (orcamento|recibo), emitente/cliente/itens/anexos em JSON,
-- link_token para revisão pelo cliente, numero_sequencial.
-- ===========================================

CREATE TABLE IF NOT EXISTS documentos (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('orcamento', 'recibo')),
    titulo VARCHAR(255),
    emitente_json JSONB NOT NULL DEFAULT '{}',
    cliente_json JSONB NOT NULL DEFAULT '{}',
    itens_json JSONB NOT NULL DEFAULT '[]',
    anexos_json JSONB NOT NULL DEFAULT '[]',
    observacoes TEXT,
    data_documento DATE,
    validade_ate DATE,
    link_token VARCHAR(64) NOT NULL UNIQUE,
    numero_sequencial INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documentos_user_id ON documentos(user_id);
CREATE INDEX IF NOT EXISTS idx_documentos_tipo ON documentos(tipo);
CREATE INDEX IF NOT EXISTS idx_documentos_link_token ON documentos(link_token);
CREATE INDEX IF NOT EXISTS idx_documentos_created_at ON documentos(created_at DESC);

COMMENT ON TABLE documentos IS 'Recibos e orçamentos gerados pelo usuário; link_token permite ao cliente revisar/alterar via link público';
COMMENT ON COLUMN documentos.emitente_json IS 'Dados do emitente: nome, cpf_cnpj, endereco, contato, logo_url';
COMMENT ON COLUMN documentos.cliente_json IS 'Dados do cliente: nome, cpf_cnpj, endereco';
COMMENT ON COLUMN documentos.itens_json IS 'Array de { descricao, quantidade, valor_unitario, valor }';
COMMENT ON COLUMN documentos.anexos_json IS 'Array de { url, tipo_categoria, valor, descricao } para imagens de comprovantes';

CREATE OR REPLACE FUNCTION update_documentos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_documentos_updated_at ON documentos;
CREATE TRIGGER trigger_documentos_updated_at
    BEFORE UPDATE ON documentos
    FOR EACH ROW
    EXECUTE FUNCTION update_documentos_updated_at();

SELECT 'Migration 189: Tabela documentos (recibos e orçamentos) criada.' AS status;
