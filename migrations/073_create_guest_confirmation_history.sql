-- Migration: Histórico de Confirmações (Melhoria 7)
-- Data: 2025-01-31
-- Descrição: Tabela para rastrear histórico de confirmações de presença

CREATE TABLE IF NOT EXISTS guest_confirmation_history (
    id SERIAL PRIMARY KEY,
    guest_id INTEGER NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    guest_list_id INTEGER NOT NULL REFERENCES guest_list_items(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN ('registered', 'confirmed', 'checked_in', 'cancelled')),
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    confirmed_by VARCHAR(255), -- ID ou nome de quem confirmou (se aplicável)
    confirmation_method VARCHAR(50) CHECK (confirmation_method IN ('qr_code', 'cpf', 'manual', 'whatsapp', 'api', 'webhook')),
    ip_address INET,
    user_agent TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_guest_confirmation_history_guest ON guest_confirmation_history(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_confirmation_history_list ON guest_confirmation_history(guest_list_id);
CREATE INDEX IF NOT EXISTS idx_guest_confirmation_history_action ON guest_confirmation_history(action);
CREATE INDEX IF NOT EXISTS idx_guest_confirmation_history_created ON guest_confirmation_history(created_at);

COMMENT ON TABLE guest_confirmation_history IS 'Histórico de confirmações e mudanças de status de convidados (Melhoria 7)';
COMMENT ON COLUMN guest_confirmation_history.confirmation_method IS 'Método usado para confirmar: QR Code, CPF, Manual, WhatsApp, API, Webhook';
