-- ===========================================
-- Valores que AINDA FALTAM adicionar ao ENUM
-- Baseado na verificação feita no DBeaver
-- ===========================================

-- ✅ JÁ EXISTEM:
-- - instagram_embed ✓
-- - youtube_embed ✓
-- - pdf_embed ✓
-- - pinterest_embed ✓

-- ❌ FALTAM ADICIONAR:

-- Adicionar tiktok_embed
ALTER TYPE item_type_enum ADD VALUE IF NOT EXISTS 'tiktok_embed';

-- Adicionar spotify_embed
ALTER TYPE item_type_enum ADD VALUE IF NOT EXISTS 'spotify_embed';

-- Adicionar linkedin_embed
ALTER TYPE item_type_enum ADD VALUE IF NOT EXISTS 'linkedin_embed';

-- ===========================================
-- Após executar, verifique novamente:
-- ===========================================

SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'item_type_enum'
)
ORDER BY enumsortorder;

-- Você deve ver agora:
-- ... (valores anteriores) ...
-- tiktok_embed
-- spotify_embed
-- linkedin_embed
-- (pinterest_embed já existe)

