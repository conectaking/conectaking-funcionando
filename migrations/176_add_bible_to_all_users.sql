-- ===========================================
-- Migration 176: Módulo Bíblia ativo em todos os cartões
-- Insere profile_item bible + bible_items para usuários que não têm
-- ===========================================

-- PASSO 1: Inserir profile_item tipo 'bible' para cada usuário que ainda não tem
INSERT INTO profile_items (user_id, item_type, title, is_active, display_order)
SELECT u.id, 'bible', 'Bíblia', true,
  COALESCE((SELECT MAX(display_order) FROM profile_items WHERE user_id = u.id), -1) + 1
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM profile_items p WHERE p.user_id = u.id AND p.item_type = 'bible'
);

-- PASSO 2: Inserir bible_items para profile_items bible que ainda não têm registro
INSERT INTO bible_items (profile_item_id, translation_code, is_visible)
SELECT pi.id, 'nvi', true
FROM profile_items pi
WHERE pi.item_type = 'bible'
AND NOT EXISTS (SELECT 1 FROM bible_items bi WHERE bi.profile_item_id = pi.id);

SELECT 'Migration 176: Módulo Bíblia adicionado a todos os cartões que não tinham.' AS status;
