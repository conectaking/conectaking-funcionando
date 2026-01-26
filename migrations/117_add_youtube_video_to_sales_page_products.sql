-- Migration: Adicionar campo de vídeo YouTube nos produtos da página de vendas
-- Permite link de vídeo incorporado por produto (ex: explicação em vídeo)

ALTER TABLE sales_page_products
ADD COLUMN IF NOT EXISTS youtube_video_url TEXT;

COMMENT ON COLUMN sales_page_products.youtube_video_url IS 'URL do vídeo do YouTube para o produto (ex: https://www.youtube.com/watch?v=xxx ou link embed)';
