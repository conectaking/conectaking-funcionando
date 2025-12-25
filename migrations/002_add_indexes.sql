-- Migration: Adicionar índices para otimização de queries
-- Data: 2025-01-29

-- Índices para tabela users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_profile_slug ON users(profile_slug);
CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_subscription_expires_at ON users(subscription_expires_at);
CREATE INDEX IF NOT EXISTS idx_users_parent_user_id ON users(parent_user_id);

-- Índices para tabela user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Índices para tabela profile_items
CREATE INDEX IF NOT EXISTS idx_profile_items_user_id ON profile_items(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_items_is_active ON profile_items(is_active);
CREATE INDEX IF NOT EXISTS idx_profile_items_display_order ON profile_items(display_order);
CREATE INDEX IF NOT EXISTS idx_profile_items_item_type ON profile_items(item_type);
CREATE INDEX IF NOT EXISTS idx_profile_items_user_active_order ON profile_items(user_id, is_active, display_order);

-- Índices para tabela registration_codes
CREATE INDEX IF NOT EXISTS idx_registration_codes_code ON registration_codes(code);
CREATE INDEX IF NOT EXISTS idx_registration_codes_is_claimed ON registration_codes(is_claimed);
CREATE INDEX IF NOT EXISTS idx_registration_codes_generated_by ON registration_codes(generated_by_user_id);

-- Índices para tabela analytics (se existir)
-- CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics(user_id);
-- CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type);
-- CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics(created_at);

-- Índices compostos para queries comuns
-- Buscar perfil público
CREATE INDEX IF NOT EXISTS idx_users_slug_active ON users(profile_slug, account_type) WHERE account_type != 'free';

-- Buscar itens ativos de um usuário ordenados
-- Já criado acima: idx_profile_items_user_active_order

