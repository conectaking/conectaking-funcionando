-- Migration: Melhorias Premium da Agenda Inteligente
-- Data: 2025-01-31
-- Descrição: Adiciona campos para tipos de evento, localização, ativação no cartão virtual

-- Adicionar campos na tabela agenda_settings para ativação no cartão virtual
ALTER TABLE agenda_settings 
ADD COLUMN IF NOT EXISTS is_active_in_card BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS card_button_text VARCHAR(100) DEFAULT 'Agendar Reunião',
ADD COLUMN IF NOT EXISTS card_button_icon VARCHAR(50) DEFAULT 'fa-calendar',
ADD COLUMN IF NOT EXISTS default_location_address TEXT,
ADD COLUMN IF NOT EXISTS default_location_maps_url VARCHAR(500);

-- Adicionar campos na tabela agenda_appointments para tipos de evento e localização
ALTER TABLE agenda_appointments
ADD COLUMN IF NOT EXISTS event_type VARCHAR(20) DEFAULT 'REUNIAO' CHECK (event_type IN ('REUNIAO', 'TRABALHO')),
ADD COLUMN IF NOT EXISTS location_address TEXT,
ADD COLUMN IF NOT EXISTS location_maps_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS auto_confirm BOOLEAN DEFAULT false;

-- Adicionar campo na tabela agenda_slots para tipo de evento padrão
ALTER TABLE agenda_slots
ADD COLUMN IF NOT EXISTS default_event_type VARCHAR(20) DEFAULT 'REUNIAO' CHECK (default_event_type IN ('REUNIAO', 'TRABALHO'));

-- Criar índice para event_type
CREATE INDEX IF NOT EXISTS idx_agenda_appointments_event_type ON agenda_appointments(owner_user_id, event_type);

-- Comentários
COMMENT ON COLUMN agenda_settings.is_active_in_card IS 'Se a agenda está ativa no cartão virtual';
COMMENT ON COLUMN agenda_settings.card_button_text IS 'Texto do botão no cartão virtual';
COMMENT ON COLUMN agenda_settings.card_button_icon IS 'Ícone do botão no cartão virtual';
COMMENT ON COLUMN agenda_settings.default_location_address IS 'Endereço padrão para reuniões presenciais';
COMMENT ON COLUMN agenda_settings.default_location_maps_url IS 'URL do Google Maps padrão';
COMMENT ON COLUMN agenda_appointments.event_type IS 'Tipo de evento: REUNIAO ou TRABALHO';
COMMENT ON COLUMN agenda_appointments.location_address IS 'Endereço físico da reunião (se presencial)';
COMMENT ON COLUMN agenda_appointments.location_maps_url IS 'Link do Google Maps para o local';
COMMENT ON COLUMN agenda_appointments.auto_confirm IS 'Se o agendamento foi confirmado automaticamente';
COMMENT ON COLUMN agenda_slots.default_event_type IS 'Tipo de evento padrão para este slot';
