-- Migration: Criar módulo Agenda
-- Data: 2025-01-31
-- Descrição: Cria todas as tabelas do sistema de agenda com prefixo agenda_

-- Configurações do módulo agenda
CREATE TABLE IF NOT EXISTS agenda_settings (
    id SERIAL PRIMARY KEY,
    owner_user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    meeting_duration_minutes INTEGER DEFAULT 30,
    buffer_minutes INTEGER DEFAULT 0,
    scheduling_window_days INTEGER DEFAULT 30,
    meeting_type_default VARCHAR(20) DEFAULT 'ONLINE' CHECK (meeting_type_default IN ('ONLINE', 'PRESENCIAL', 'HIBRIDO')),
    google_calendar_id VARCHAR(255) DEFAULT 'primary',
    form_fields JSONB DEFAULT '{"cpf": false, "company": false, "reason": false, "notes": false}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(owner_user_id)
);

-- Slots liberados (horários disponíveis)
CREATE TABLE IF NOT EXISTS agenda_slots (
    id SERIAL PRIMARY KEY,
    owner_user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('RECURRING', 'ONE_OFF')),
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=domingo, 6=sábado
    start_time TIME NOT NULL,
    end_time TIME, -- opcional, ou calcular por duração
    date DATE, -- quando type = ONE_OFF
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Datas bloqueadas
CREATE TABLE IF NOT EXISTS agenda_blocked_dates (
    id SERIAL PRIMARY KEY,
    owner_user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(owner_user_id, date)
);

-- Leads/Clientes
CREATE TABLE IF NOT EXISTS agenda_leads (
    id SERIAL PRIMARY KEY,
    owner_user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    whatsapp VARCHAR(20),
    cpf_encrypted TEXT, -- criptografado
    google_email VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Agendamentos
CREATE TABLE IF NOT EXISTS agenda_appointments (
    id SERIAL PRIMARY KEY,
    owner_user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lead_id INTEGER NOT NULL REFERENCES agenda_leads(id) ON DELETE CASCADE,
    start_at TIMESTAMP NOT NULL,
    end_at TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'NEEDS_REPAIR')),
    meet_link VARCHAR(500),
    owner_google_event_id VARCHAR(255),
    client_google_event_id VARCHAR(255),
    client_timezone VARCHAR(50),
    notes TEXT,
    form_data JSONB, -- dados do formulário customizado
    lgpd_consent_at TIMESTAMP,
    lgpd_consent_ip INET,
    lgpd_consent_user_agent TEXT,
    lgpd_consent_version VARCHAR(10),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Contas OAuth (Google) - pode ser compartilhada, mas com namespace próprio
CREATE TABLE IF NOT EXISTS oauth_accounts (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE, -- dono
    lead_id INTEGER REFERENCES agenda_leads(id) ON DELETE CASCADE, -- cliente (opcional)
    provider VARCHAR(50) NOT NULL DEFAULT 'google',
    provider_account_id VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    access_token_encrypted TEXT NOT NULL, -- criptografado
    refresh_token_encrypted TEXT, -- criptografado (nullable para clientes)
    token_expiry TIMESTAMP,
    scopes TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(provider, provider_account_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_agenda_slots_owner_active ON agenda_slots(owner_user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_agenda_appointments_owner_status ON agenda_appointments(owner_user_id, status);
CREATE INDEX IF NOT EXISTS idx_agenda_appointments_start_at ON agenda_appointments(start_at);
CREATE INDEX IF NOT EXISTS idx_agenda_blocked_dates_owner_date ON agenda_blocked_dates(owner_user_id, date);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user ON oauth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_lead ON oauth_accounts(lead_id);
CREATE INDEX IF NOT EXISTS idx_agenda_leads_owner ON agenda_leads(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_agenda_leads_email ON agenda_leads(email);

-- Comentários
COMMENT ON TABLE agenda_settings IS 'Configurações do módulo de agenda por usuário';
COMMENT ON TABLE agenda_slots IS 'Slots de horários disponíveis (recorrentes ou avulsos)';
COMMENT ON TABLE agenda_blocked_dates IS 'Datas bloqueadas (feriados, viagens, etc)';
COMMENT ON TABLE agenda_leads IS 'Leads/clientes que agendam';
COMMENT ON TABLE agenda_appointments IS 'Agendamentos confirmados ou pendentes';
COMMENT ON TABLE oauth_accounts IS 'Contas OAuth do Google (dono e clientes)';
