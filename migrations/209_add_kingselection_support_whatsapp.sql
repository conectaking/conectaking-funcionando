-- KingSelection: botão de suporte via WhatsApp no cliente (configuração por galeria)
ALTER TABLE king_galleries
  ADD COLUMN IF NOT EXISTS support_whatsapp_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS support_whatsapp_label VARCHAR(120),
  ADD COLUMN IF NOT EXISTS support_whatsapp_message TEXT;

