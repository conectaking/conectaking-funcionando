-- Mensagens editáveis do botão "WhatsApp do cliente" (modo vendas / fotos pagas)
ALTER TABLE king_galleries
  ADD COLUMN IF NOT EXISTS sales_whatsapp_template_approved TEXT,
  ADD COLUMN IF NOT EXISTS sales_whatsapp_template_pending TEXT,
  ADD COLUMN IF NOT EXISTS sales_whatsapp_template_rejected TEXT;
