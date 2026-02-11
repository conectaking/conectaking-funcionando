-- Domínio personalizado para o site do fotógrafo (ex.: adrianoking.com)
-- Quando o visitante acessa esse domínio, o sistema exibe o "Meu site" desse usuário.

ALTER TABLE site_items
ADD COLUMN IF NOT EXISTS custom_domain VARCHAR(255) NULL;

COMMENT ON COLUMN site_items.custom_domain IS 'Domínio personalizado (ex: adrianoking.com). O DNS deve apontar para o mesmo servidor da aplicação.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_site_items_custom_domain_lower
ON site_items (LOWER(TRIM(custom_domain)))
WHERE custom_domain IS NOT NULL AND TRIM(custom_domain) <> '';

SELECT 'Migration 169: custom_domain em site_items.' AS status;
