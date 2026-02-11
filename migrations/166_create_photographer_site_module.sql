-- ===========================================
-- Migration: Criar módulo Meu site (photographer_site)
-- Inclui: site_items (hero, sobre, portfólio, depoimentos, FAQ, teste arquétipo, contato), arquetipo_leads
-- ===========================================

-- PASSO 1: Adicionar photographer_site ao item_type_enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'item_type_enum' AND e.enumlabel = 'photographer_site'
    ) THEN
        ALTER TYPE item_type_enum ADD VALUE 'photographer_site';
        RAISE NOTICE 'photographer_site adicionado ao item_type_enum.';
    END IF;
END $$;

-- PASSO 2: Tabela site_items (um por profile_item)
CREATE TABLE IF NOT EXISTS site_items (
    id SERIAL PRIMARY KEY,
    profile_item_id INTEGER NOT NULL UNIQUE,

    -- Hero / Posicionamento (página inicial)
    hero_pergunta VARCHAR(500) DEFAULT 'Sabe qual é a diferença do fotógrafo pro retratista?',
    hero_slogan VARCHAR(500) DEFAULT 'O fotógrafo registra momentos. O retratista extrai a essência.',
    hero_subtitulo TEXT,
    hero_cta_arquetipo_texto VARCHAR(200) DEFAULT 'Descubra seu arquétipo',
    hero_cta_orcamento_texto VARCHAR(200) DEFAULT 'Solicitar orçamento',
    hero_cta_contato_texto VARCHAR(200) DEFAULT 'Agendar / Falar comigo',
    hero_imagem_url TEXT,

    -- Sobre
    sobre_texto TEXT,
    sobre_imagem_url TEXT,

    -- Serviços (JSON array de { titulo, descricao, ordem })
    servicos JSONB DEFAULT '[]',

    -- Portfólio (JSON array de categorias: { nome, fotos: [{ url, caption }] })
    portfolio JSONB DEFAULT '[]',

    -- Depoimentos (JSON array de { nome, texto, foto_url? })
    depoimentos JSONB DEFAULT '[]',

    -- FAQ (JSON array de { pergunta, resposta })
    faq JSONB DEFAULT '[]',

    -- Teste de Arquétipo
    arquetipo_ativo BOOLEAN DEFAULT false,
    arquetipo_landing_titulo VARCHAR(300) DEFAULT 'Descubra seu arquétipo e transforme sua imagem profissional.',
    arquetipo_landing_texto TEXT,
    arquetipo_landing_cta VARCHAR(200) DEFAULT 'Faça o teste de arquétipo agora mesmo',
    arquetipo_landing_imagem_url TEXT,
    arquetipo_por_que_fazer JSONB DEFAULT '[{"titulo":"Teste exclusivo para identificar seu arquétipo","texto":""},{"titulo":"Direcionamento estratégico para sua marca pessoal","texto":""},{"titulo":"Retratos que comunicam sua essência","texto":""}]',
    arquetipo_intro_texto TEXT,
    arquetipo_campos_form JSONB DEFAULT '["nome","email","whatsapp","instagram"]',

    -- Contato
    contato_email VARCHAR(255),
    contato_telefone VARCHAR(50),
    contato_whatsapp VARCHAR(50),
    contato_whatsapp_mensagem TEXT,
    contato_form_ativo BOOLEAN DEFAULT true,
    contato_horario TEXT,

    -- Redes sociais
    rede_instagram VARCHAR(255),
    rede_facebook VARCHAR(255),
    rede_linkedin VARCHAR(255),

    -- SEO
    meta_titulo VARCHAR(255),
    meta_description TEXT,

    -- Aparência
    tema_primaria VARCHAR(20) DEFAULT '#1a1a1a',
    tema_secundaria VARCHAR(20) DEFAULT '#c9a227',
    tema_fonte VARCHAR(100),
    favicon_url TEXT,
    site_em_manutencao BOOLEAN DEFAULT false,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    FOREIGN KEY (profile_item_id) REFERENCES profile_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_site_items_profile_item ON site_items(profile_item_id);

COMMENT ON TABLE site_items IS 'Configuração do site do fotógrafo (Meu site)';

CREATE OR REPLACE FUNCTION update_site_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_site_items_updated_at ON site_items;
CREATE TRIGGER trigger_site_items_updated_at
    BEFORE UPDATE ON site_items
    FOR EACH ROW
    EXECUTE FUNCTION update_site_items_updated_at();

-- PASSO 3: Tabela arquetipo_leads (leads do teste de arquétipo)
CREATE TABLE IF NOT EXISTS arquetipo_leads (
    id SERIAL PRIMARY KEY,
    site_item_id INTEGER NOT NULL,
    nome VARCHAR(255),
    email VARCHAR(255),
    whatsapp VARCHAR(50),
    instagram VARCHAR(100),
    arquetipo_resultado VARCHAR(50),
    arquetipo_scores JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (site_item_id) REFERENCES site_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_arquetipo_leads_site_item ON arquetipo_leads(site_item_id);
CREATE INDEX IF NOT EXISTS idx_arquetipo_leads_created_at ON arquetipo_leads(created_at DESC);

COMMENT ON TABLE arquetipo_leads IS 'Leads capturados pelo Teste de Arquétipo no site';

SELECT 'Migration 166: Módulo Meu site (photographer_site) criado.' AS status;
