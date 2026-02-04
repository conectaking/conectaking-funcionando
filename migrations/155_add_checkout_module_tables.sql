-- ===========================================
-- Migration: Módulo Checkout KingForms (PagBank)
-- Data: 2026-02-03
-- Descrição: Tabelas e campos para checkout isolado sem impactar core do King Forms
-- ===========================================

-- 1) Enum para status de pagamento (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_enum') THEN
    CREATE TYPE payment_status_enum AS ENUM (
      'PENDING_PAYMENT',
      'PAID',
      'FAILED',
      'CANCELED'
    );
    RAISE NOTICE 'Tipo payment_status_enum criado.';
  ELSE
    RAISE NOTICE 'Tipo payment_status_enum já existe.';
  END IF;
END $$;

-- 2) Campos de checkout no formulário (digital_form_items)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'digital_form_items' AND column_name = 'checkout_enabled') THEN
    ALTER TABLE digital_form_items ADD COLUMN checkout_enabled BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'digital_form_items.checkout_enabled adicionado.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'digital_form_items' AND column_name = 'price_cents') THEN
    ALTER TABLE digital_form_items ADD COLUMN price_cents INTEGER;
    RAISE NOTICE 'digital_form_items.price_cents adicionado.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'digital_form_items' AND column_name = 'pay_button_label') THEN
    ALTER TABLE digital_form_items ADD COLUMN pay_button_label VARCHAR(100) DEFAULT 'Pagamento';
    RAISE NOTICE 'digital_form_items.pay_button_label adicionado.';
  END IF;
END $$;

-- 3) Tabela de configuração PagBank por formulário (credenciais isoladas)
CREATE TABLE IF NOT EXISTS form_checkout_configs (
  id SERIAL PRIMARY KEY,
  profile_item_id INTEGER NOT NULL UNIQUE,
  pagbank_seller_id VARCHAR(255),
  pagbank_access_token_encrypted TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (profile_item_id) REFERENCES profile_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_form_checkout_configs_profile_item ON form_checkout_configs(profile_item_id);
COMMENT ON TABLE form_checkout_configs IS 'Configuração PagBank por formulário (módulo checkout KingForms)';

-- 4) Campos de pagamento nas respostas (digital_form_responses)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'digital_form_responses' AND column_name = 'payment_status') THEN
    ALTER TABLE digital_form_responses ADD COLUMN payment_status payment_status_enum;
    RAISE NOTICE 'digital_form_responses.payment_status adicionado.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'digital_form_responses' AND column_name = 'checked_in') THEN
    ALTER TABLE digital_form_responses ADD COLUMN checked_in BOOLEAN DEFAULT FALSE;
    RAISE NOTICE 'digital_form_responses.checked_in adicionado.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'digital_form_responses' AND column_name = 'payment_provider') THEN
    ALTER TABLE digital_form_responses ADD COLUMN payment_provider VARCHAR(50) DEFAULT 'pagbank';
    RAISE NOTICE 'digital_form_responses.payment_provider adicionado.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'digital_form_responses' AND column_name = 'payment_reference_id') THEN
    ALTER TABLE digital_form_responses ADD COLUMN payment_reference_id VARCHAR(255);
    RAISE NOTICE 'digital_form_responses.payment_reference_id adicionado.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'digital_form_responses' AND column_name = 'payment_order_id') THEN
    ALTER TABLE digital_form_responses ADD COLUMN payment_order_id VARCHAR(255);
    RAISE NOTICE 'digital_form_responses.payment_order_id adicionado.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'digital_form_responses' AND column_name = 'payment_charge_id') THEN
    ALTER TABLE digital_form_responses ADD COLUMN payment_charge_id VARCHAR(255);
    RAISE NOTICE 'digital_form_responses.payment_charge_id adicionado.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'digital_form_responses' AND column_name = 'paid_at') THEN
    ALTER TABLE digital_form_responses ADD COLUMN paid_at TIMESTAMP;
    RAISE NOTICE 'digital_form_responses.paid_at adicionado.';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_digital_form_responses_payment_status ON digital_form_responses(payment_status);
CREATE INDEX IF NOT EXISTS idx_digital_form_responses_paid_at ON digital_form_responses(paid_at) WHERE paid_at IS NOT NULL;

-- 5) Opcional: log de webhooks para troubleshooting
CREATE TABLE IF NOT EXISTS checkout_webhook_logs (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(50) NOT NULL DEFAULT 'pagbank',
  payload_json JSONB,
  received_at TIMESTAMP DEFAULT NOW(),
  processed_ok BOOLEAN,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_checkout_webhook_logs_received_at ON checkout_webhook_logs(received_at DESC);
COMMENT ON TABLE checkout_webhook_logs IS 'Log de webhooks do módulo checkout (debug/troubleshooting)';
