-- Mensagem WhatsApp: pagamento ok, fotos ainda aguardando aprovação do fotógrafo
ALTER TABLE king_galleries
  ADD COLUMN IF NOT EXISTS sales_whatsapp_template_awaiting TEXT;
