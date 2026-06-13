-- King Bolão — módulo isolado (tabelas king_bolao_*)

CREATE TABLE IF NOT EXISTS king_bolao_events (
    id SERIAL PRIMARY KEY,
    organizer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    slug VARCHAR(120) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    cover_image_path TEXT,
    team_home_name VARCHAR(120) NOT NULL DEFAULT '',
    team_home_logo_url TEXT,
    team_away_name VARCHAR(120) NOT NULL DEFAULT '',
    team_away_logo_url TEXT,
    kickoff_at TIMESTAMPTZ,
    deadline_minutes_before INTEGER NOT NULL DEFAULT 30,
    status VARCHAR(32) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'open', 'closed', 'finished', 'cancelled')),
    result_home INTEGER,
    result_away INTEGER,
    result_published_at TIMESTAMPTZ,
    live_home INTEGER,
    live_away INTEGER,
    no_winner_policy VARCHAR(32) NOT NULL DEFAULT 'rollover'
        CHECK (no_winner_policy IN ('rollover', 'organizer')),
    pix_key VARCHAR(255),
    pix_holder_name VARCHAR(255),
    pix_instructions TEXT,
    owner_share_pct INTEGER NOT NULL DEFAULT 30,
    winner_share_pct INTEGER NOT NULL DEFAULT 70,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_king_bolao_events_organizer ON king_bolao_events(organizer_user_id);
CREATE INDEX IF NOT EXISTS idx_king_bolao_events_slug ON king_bolao_events(lower(trim(slug)));

CREATE TABLE IF NOT EXISTS king_bolao_groups (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES king_bolao_events(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    entry_cents INTEGER NOT NULL CHECK (entry_cents > 0),
    sort_order INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    rollover_cents INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_king_bolao_groups_event ON king_bolao_groups(event_id);

CREATE TABLE IF NOT EXISTS king_bolao_participants (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES king_bolao_events(id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL REFERENCES king_bolao_groups(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    whatsapp VARCHAR(32) NOT NULL,
    prediction_home INTEGER NOT NULL CHECK (prediction_home >= 0 AND prediction_home <= 20),
    prediction_away INTEGER NOT NULL CHECK (prediction_away >= 0 AND prediction_away <= 20),
    access_token VARCHAR(64) UNIQUE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending_payment'
        CHECK (status IN ('pending_payment', 'pending_approval', 'approved', 'rejected', 'winner', 'loser')),
    proof_file_path TEXT,
    proof_hash VARCHAR(64),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, group_id, whatsapp)
);

CREATE INDEX IF NOT EXISTS idx_king_bolao_participants_event ON king_bolao_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_king_bolao_participants_group ON king_bolao_participants(group_id);
CREATE INDEX IF NOT EXISTS idx_king_bolao_participants_token ON king_bolao_participants(access_token);
