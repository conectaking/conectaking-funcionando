-- ===========================================
-- Migration: Tabela de leads de orçamento (qualificação Low/Medium/High ticket)
-- O cliente preenche "Solicitar orçamento"; os dados servem para qualificar o lead.
-- ===========================================

CREATE TABLE IF NOT EXISTS orcamento_leads (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    nome VARCHAR(255),
    email VARCHAR(255),
    whatsapp VARCHAR(50),
    profissao VARCHAR(255),
    respostas JSONB NOT NULL DEFAULT '{}',
    ticket VARCHAR(20) NOT NULL DEFAULT 'medium',
    ticket_reason TEXT,
    recommendation TEXT,
    status VARCHAR(50) DEFAULT 'novo',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_orcamento_leads_user_id ON orcamento_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_orcamento_leads_created_at ON orcamento_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orcamento_leads_ticket ON orcamento_leads(ticket);
CREATE INDEX IF NOT EXISTS idx_orcamento_leads_status ON orcamento_leads(status);

COMMENT ON TABLE orcamento_leads IS 'Leads do formulário Solicitar orçamento (qualificação Low/Medium/High ticket)';
COMMENT ON COLUMN orcamento_leads.respostas IS 'Respostas do formulário (BANT + contexto retrato) em JSON';
COMMENT ON COLUMN orcamento_leads.ticket IS 'low, medium ou high';
COMMENT ON COLUMN orcamento_leads.status IS 'novo, em_contato, orcamento_enviado, convertido, perdido';

CREATE OR REPLACE FUNCTION update_orcamento_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_orcamento_leads_updated_at ON orcamento_leads;
CREATE TRIGGER trigger_orcamento_leads_updated_at
    BEFORE UPDATE ON orcamento_leads
    FOR EACH ROW
    EXECUTE FUNCTION update_orcamento_leads_updated_at();

SELECT 'Migration 167: Tabela orcamento_leads criada.' AS status;
