-- Prosperidade antes de dormir — Do Fracasso ao Legado (31 Ativações / Provérbios 1–31)

CREATE TABLE IF NOT EXISTS bible_prosperidade_ativacoes (
    id SERIAL PRIMARY KEY,
    activation_number SMALLINT NOT NULL UNIQUE CHECK (activation_number >= 1 AND activation_number <= 31),
    titulo VARCHAR(255) DEFAULT '',
    decreto_entrada TEXT DEFAULT '',
    fundamento_sagrado TEXT DEFAULT '',
    diagnostico_escassez TEXT DEFAULT '',
    estrada_com_king TEXT DEFAULT '',
    diretriz_ilustracao TEXT DEFAULT '',
    mentalidade_travada TEXT DEFAULT '',
    nova_mentalidade TEXT DEFAULT '',
    exercicio_fixacao TEXT DEFAULT '',
    ie_chave TEXT DEFAULT '',
    treino_negocios TEXT DEFAULT '',
    treino_altar TEXT DEFAULT '',
    sentenca_ativacao TEXT DEFAULT '',
    proximo_episodio TEXT DEFAULT '',
    proverbs_ref VARCHAR(100) DEFAULT '',
    storytelling_fase SMALLINT CHECK (storytelling_fase IS NULL OR (storytelling_fase >= 1 AND storytelling_fase <= 31)),
    content_source VARCHAR(20) DEFAULT 'manual' CHECK (content_source IN ('manual', 'ai', 'mixed')),
    published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prosperidade_activation ON bible_prosperidade_ativacoes(activation_number);
CREATE INDEX IF NOT EXISTS idx_prosperidade_published ON bible_prosperidade_ativacoes(published);

INSERT INTO bible_prosperidade_ativacoes (activation_number, proverbs_ref, storytelling_fase)
SELECT n, 'Provérbios ' || n, n
FROM generate_series(1, 31) AS n
ON CONFLICT (activation_number) DO NOTHING;

CREATE TABLE IF NOT EXISTS bible_prosperidade_reads (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    visitor_id VARCHAR(64),
    activation_number SMALLINT NOT NULL CHECK (activation_number >= 1 AND activation_number <= 31),
    read_at TIMESTAMP DEFAULT NOW(),
    slug VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_prosperidade_reads_user_act
    ON bible_prosperidade_reads(user_id, activation_number)
    WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_prosperidade_reads_visitor_act
    ON bible_prosperidade_reads(visitor_id, activation_number)
    WHERE visitor_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prosperidade_reads_activation ON bible_prosperidade_reads(activation_number);
