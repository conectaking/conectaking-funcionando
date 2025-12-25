-- Script completo para verificar todas as colunas relacionadas a banners

-- 1. Verificar se a coluna title existe (deve existir, é padrão)
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profile_items' 
AND column_name = 'title';

-- 2. Verificar se a coluna whatsapp_message existe (foi criada pela migration)
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profile_items' 
AND column_name = 'whatsapp_message';

-- 3. Ver TODAS as colunas da tabela profile_items
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profile_items'
ORDER BY ordinal_position;

-- 4. Verificar dados atuais dos banners
SELECT 
    id,
    item_type,
    title,
    whatsapp_message,
    destination_url,
    image_url,
    aspect_ratio,
    display_order,
    is_active
FROM profile_items 
WHERE item_type = 'banner'
ORDER BY display_order;

-- 5. Verificar se há banners sem title (null ou vazio)
SELECT 
    id,
    item_type,
    title,
    whatsapp_message,
    destination_url
FROM profile_items 
WHERE item_type = 'banner'
AND (title IS NULL OR title = '' OR title = 'Banner')
ORDER BY display_order;
