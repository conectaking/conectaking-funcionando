-- Índices recomendados para otimização do banco de dados
-- Execute estes comandos no seu banco de dados PostgreSQL

-- Índices para tabela users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_profile_slug ON users(profile_slug);
CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_subscription_expires_at ON users(subscription_expires_at) WHERE subscription_expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_parent_user_id ON users(parent_user_id) WHERE parent_user_id IS NOT NULL;

-- Índices para tabela user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Índices para tabela profile_items
CREATE INDEX IF NOT EXISTS idx_profile_items_user_id ON profile_items(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_items_user_id_active ON profile_items(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_profile_items_display_order ON profile_items(user_id, display_order);

-- Índices para tabela registration_codes
CREATE INDEX IF NOT EXISTS idx_registration_codes_code ON registration_codes(code);
CREATE INDEX IF NOT EXISTS idx_registration_codes_is_claimed ON registration_codes(is_claimed, code) WHERE is_claimed = FALSE;
CREATE INDEX IF NOT EXISTS idx_registration_codes_generated_by ON registration_codes(generated_by_user_id) WHERE generated_by_user_id IS NOT NULL;

-- Índices para analytics (se existir tabela de analytics)
-- CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics(user_id);
-- CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics(created_at);
-- CREATE INDEX IF NOT EXISTS idx_analytics_user_created ON analytics(user_id, created_at);

-- Índice composto para busca de perfis ativos por slug
CREATE INDEX IF NOT EXISTS idx_users_profile_slug_active ON users(profile_slug, account_type) WHERE account_type != 'free';

-- Comentários sobre os índices:
-- - idx_users_email: Essencial para login (busca por email é frequente)
-- - idx_users_profile_slug: Essencial para perfis públicos (busca por slug é muito frequente)
-- - idx_users_subscription_expires_at: Otimiza as queries dos cron jobs de verificação de expiração
-- - idx_profile_items_user_id_active: Otimiza busca de itens ativos de um perfil (muito usado)
-- - idx_registration_codes_code: Essencial para validação de códigos de registro
-- - idx_registration_codes_is_claimed: Otimiza busca de códigos disponíveis

