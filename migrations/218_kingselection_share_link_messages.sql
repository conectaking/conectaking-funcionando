-- Textos da aba "Link e compartilhamento" (opcional + mensagem completa editável)
ALTER TABLE king_galleries
  ADD COLUMN IF NOT EXISTS share_link_custom_append TEXT,
  ADD COLUMN IF NOT EXISTS share_link_full_message TEXT;
