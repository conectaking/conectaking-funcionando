-- ===========================================
-- Migration 000: Schema inicial (tabelas base)
-- Para base local vazia; no Render estas tabelas já existiam.
-- ===========================================

-- ENUM account_type (valores mínimos; outras migrations adicionam mais)
DO $$ BEGIN
  CREATE TYPE account_type_enum AS ENUM (
    'free', 'individual', 'individual_com_logo', 'business_owner',
    'basic', 'premium', 'king_start', 'king_prime', 'king_base', 'king_essential',
    'king_finance', 'king_finance_plus', 'king_premium_plus', 'king_corporate',
    'team_member', 'enterprise', 'adm_principal', 'abm'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Tabela users (base da aplicação)
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT,
  name VARCHAR(255),
  profile_slug VARCHAR(255),
  account_type account_type_enum DEFAULT 'free',
  subscription_status VARCHAR(50) DEFAULT 'inactive',
  subscription_expires_at TIMESTAMP,
  subscription_id VARCHAR(255),
  parent_user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  max_team_invites INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela user_profiles (perfil público)
CREATE TABLE IF NOT EXISTS user_profiles (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  display_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela profile_items (módulos do perfil: whatsapp, instagram, etc.)
CREATE TABLE IF NOT EXISTS profile_items (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type VARCHAR(100) NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  destination_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela registration_codes (códigos de convite)
CREATE TABLE IF NOT EXISTS registration_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(255) NOT NULL UNIQUE,
  is_claimed BOOLEAN DEFAULT FALSE,
  generated_by_user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  claimed_by_user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices básicos
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_profile_slug ON users(profile_slug);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_items_user_id ON profile_items(user_id);
CREATE INDEX IF NOT EXISTS idx_registration_codes_code ON registration_codes(code);

SELECT 'Migration 000: Schema inicial (users, user_profiles, profile_items, registration_codes) criado.' AS status;
