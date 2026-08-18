-- Separa cadastros de Captação vs Check-in (King Forms)
ALTER TABLE digital_form_responses
  ADD COLUMN IF NOT EXISTS entry_mode VARCHAR(20);

COMMENT ON COLUMN digital_form_responses.entry_mode IS 'lead = Captação de Clientes; checkin = Check-in';

UPDATE digital_form_responses
SET entry_mode = CASE
    WHEN guest_id IS NOT NULL THEN 'checkin'
    ELSE 'lead'
END
WHERE entry_mode IS NULL;

CREATE INDEX IF NOT EXISTS idx_digital_form_responses_entry_mode
  ON digital_form_responses(profile_item_id, entry_mode);

ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS entry_mode VARCHAR(20);

COMMENT ON COLUMN guests.entry_mode IS 'lead = Captação; checkin = Check-in. Convidados da portaria são checkin.';

UPDATE guests
SET entry_mode = 'checkin'
WHERE entry_mode IS NULL;

CREATE INDEX IF NOT EXISTS idx_guests_entry_mode
  ON guests(guest_list_id, entry_mode);
