-- Sessão anónima por visitante (cadastro ao enviar): separa seleções por session_key antes de criar king_gallery_clients.
ALTER TABLE king_selections ADD COLUMN IF NOT EXISTS session_key VARCHAR(40);

DROP INDEX IF EXISTS uniq_king_selections_legacy;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_king_selections_legacy_anon
  ON king_selections (gallery_id, photo_id)
  WHERE client_id IS NULL AND (session_key IS NULL OR session_key = '');

CREATE UNIQUE INDEX IF NOT EXISTS uniq_king_selections_session_photo
  ON king_selections (gallery_id, session_key, photo_id)
  WHERE client_id IS NULL AND session_key IS NOT NULL AND session_key <> '';
