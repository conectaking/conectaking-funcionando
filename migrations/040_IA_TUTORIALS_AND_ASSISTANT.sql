-- Migration: Sistema de Tutoriais e Assistente Virtual
-- Data: 2025-01-01
-- Descrição: Adiciona tabelas para tutoriais interativos e sistema de ajuda contextual

-- ============================================
-- TABELA: TUTORIAIS
-- ============================================
CREATE TABLE IF NOT EXISTS ia_tutorials (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL, -- 'dashboard', 'cartao', 'vendas', 'modulos', 'configuracao', etc.
    steps JSONB NOT NULL, -- Array de passos do tutorial
    estimated_time INTEGER DEFAULT 5, -- Tempo estimado em minutos
    difficulty VARCHAR(20) DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    is_active BOOLEAN DEFAULT true,
    order_index INTEGER DEFAULT 0,
    icon VARCHAR(50), -- Ícone para exibição
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ia_tutorials_category ON ia_tutorials(category);
CREATE INDEX IF NOT EXISTS idx_ia_tutorials_active ON ia_tutorials(is_active);
CREATE INDEX IF NOT EXISTS idx_ia_tutorials_order ON ia_tutorials(order_index);

-- ============================================
-- TABELA: PROGRESSO DE TUTORIAIS DO USUÁRIO
-- ============================================
CREATE TABLE IF NOT EXISTS ia_user_tutorial_progress (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    tutorial_id INTEGER NOT NULL,
    current_step INTEGER DEFAULT 0,
    completed_steps INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    is_completed BOOLEAN DEFAULT false,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tutorial_id) REFERENCES ia_tutorials(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ia_user_tutorial_user ON ia_user_tutorial_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_ia_user_tutorial_tutorial ON ia_user_tutorial_progress(tutorial_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ia_user_tutorial_unique ON ia_user_tutorial_progress(user_id, tutorial_id);

-- ============================================
-- TABELA: AJUDA CONTEXTUAL
-- ============================================
CREATE TABLE IF NOT EXISTS ia_contextual_help (
    id SERIAL PRIMARY KEY,
    page_path VARCHAR(255) NOT NULL, -- Caminho da página (ex: '/dashboard', '/cartao')
    element_selector VARCHAR(255), -- Seletor do elemento (ex: '#btn-criar-cartao')
    help_text TEXT NOT NULL,
    help_type VARCHAR(50) DEFAULT 'tip' CHECK (help_type IN ('tip', 'warning', 'info', 'tutorial', 'video')),
    priority INTEGER DEFAULT 50,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ia_contextual_help_page ON ia_contextual_help(page_path);
CREATE INDEX IF NOT EXISTS idx_ia_contextual_help_active ON ia_contextual_help(is_active);

-- ============================================
-- TABELA: ASSISTENTE VIRTUAL - AÇÕES
-- ============================================
CREATE TABLE IF NOT EXISTS ia_assistant_actions (
    id SERIAL PRIMARY KEY,
    action_type VARCHAR(100) NOT NULL, -- 'create_card', 'add_module', 'configure_sales', etc.
    action_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    required_permissions VARCHAR(255)[], -- Permissões necessárias
    api_endpoint VARCHAR(255), -- Endpoint da API para executar ação
    parameters JSONB, -- Parâmetros da ação
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ia_assistant_actions_type ON ia_assistant_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_ia_assistant_actions_category ON ia_assistant_actions(category);

-- ============================================
-- TABELA: HISTÓRICO DE AJUDA DO ASSISTENTE
-- ============================================
CREATE TABLE IF NOT EXISTS ia_assistant_help_history (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    help_type VARCHAR(50) NOT NULL, -- 'tutorial', 'contextual', 'action', 'question'
    help_content TEXT,
    page_path VARCHAR(255),
    was_helpful BOOLEAN,
    feedback_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ia_assistant_help_user ON ia_assistant_help_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ia_assistant_help_type ON ia_assistant_help_history(help_type);
CREATE INDEX IF NOT EXISTS idx_ia_assistant_help_created ON ia_assistant_help_history(created_at DESC);

-- ============================================
-- INSERIR TUTORIAIS INICIAIS
-- ============================================
INSERT INTO ia_tutorials (title, description, category, steps, estimated_time, difficulty, order_index, icon) VALUES
('Bem-vindo ao Conecta King', 'Aprenda os primeiros passos para começar a usar o Conecta King', 'dashboard', 
'[
    {"step": 1, "title": "Bem-vindo!", "content": "Olá! Eu sou a IA King, sua assistente virtual. Vou te ajudar a configurar seu cartão digital passo a passo.", "action": null},
    {"step": 2, "title": "Criar seu Cartão", "content": "Primeiro, vamos criar seu cartão digital. Clique no botão \"Criar Cartão\" no menu.", "action": "highlight", "selector": "#btn-criar-cartao"},
    {"step": 3, "title": "Preencher Informações", "content": "Preencha suas informações básicas: nome, profissão, foto de perfil e descrição.", "action": "info"},
    {"step": 4, "title": "Adicionar Módulos", "content": "Agora você pode adicionar módulos ao seu cartão: links, contatos, produtos, serviços e muito mais!", "action": "info"},
    {"step": 5, "title": "Personalizar", "content": "Personalize seu cartão escolhendo cores, fontes e layout que representem sua marca.", "action": "info"},
    {"step": 6, "title": "Compartilhar", "content": "Pronto! Agora você pode compartilhar seu cartão com o mundo através do link único.", "action": "info"}
]'::jsonb, 5, 'beginner', 1, '🎯'),

('Criar seu Primeiro Cartão', 'Tutorial completo para criar e configurar seu cartão digital', 'cartao',
'[
    {"step": 1, "title": "Acesse o Dashboard", "content": "No dashboard, clique em \"Meu Cartão\" ou \"Criar Cartão\".", "action": "navigate", "path": "/dashboard"},
    {"step": 2, "title": "Preencha Dados Básicos", "content": "Informe seu nome completo, profissão e uma descrição sobre você ou seu negócio.", "action": "highlight", "selector": "#profile-name"},
    {"step": 3, "title": "Adicione Foto de Perfil", "content": "Faça upload de uma foto profissional. Recomendamos imagem quadrada de pelo menos 400x400px.", "action": "highlight", "selector": "#profile-photo"},
    {"step": 4, "title": "Adicione Banner", "content": "Adicione um banner para destacar seu cartão. Tamanho recomendado: 1200x400px.", "action": "highlight", "selector": "#profile-banner"},
    {"step": 5, "title": "Salve e Visualize", "content": "Clique em \"Salvar\" e depois em \"Visualizar\" para ver como ficou seu cartão!", "action": "highlight", "selector": "#btn-save-profile"}
]'::jsonb, 10, 'beginner', 2, '📱'),

('Adicionar Módulos ao Cartão', 'Aprenda a adicionar e configurar módulos no seu cartão', 'modulos',
'[
    {"step": 1, "title": "Acesse Módulos", "content": "No seu cartão, clique em \"Adicionar Módulo\" ou \"Gerenciar Módulos\".", "action": "navigate", "path": "/dashboard"},
    {"step": 2, "title": "Escolha o Tipo", "content": "Escolha o tipo de módulo: Link, Contato, Produto, Serviço, Depoimento, etc.", "action": "info"},
    {"step": 3, "title": "Preencha Informações", "content": "Preencha as informações do módulo. Cada tipo tem campos específicos.", "action": "info"},
    {"step": 4, "title": "Organize", "content": "Arraste os módulos para organizá-los na ordem desejada.", "action": "info"},
    {"step": 5, "title": "Personalize", "content": "Adicione ícones, cores e descrições para tornar seus módulos mais atraentes.", "action": "info"}
]'::jsonb, 8, 'beginner', 3, '🧩'),

('Criar Página de Vendas', 'Tutorial para criar sua primeira página de vendas', 'vendas',
'[
    {"step": 1, "title": "Acesse Vendas", "content": "No menu, clique em \"Páginas de Vendas\" e depois em \"Criar Nova\".", "action": "navigate", "path": "/dashboard"},
    {"step": 2, "title": "Configure Título", "content": "Dê um título atrativo para sua página de vendas.", "action": "highlight", "selector": "#sales-title"},
    {"step": 3, "title": "Adicione Descrição", "content": "Escreva uma descrição convincente sobre seu produto ou serviço.", "action": "highlight", "selector": "#sales-description"},
    {"step": 4, "title": "Adicione Produtos", "content": "Adicione os produtos que deseja vender nesta página.", "action": "info"},
    {"step": 5, "title": "Configure Preços", "content": "Defina os preços e condições de pagamento.", "action": "info"},
    {"step": 6, "title": "Publique", "content": "Revise tudo e publique sua página de vendas!", "action": "highlight", "selector": "#btn-publish-sales"}
]'::jsonb, 12, 'intermediate', 4, '💼'),

('Personalizar Aparência', 'Aprenda a personalizar cores, fontes e layout do seu cartão', 'configuracao',
'[
    {"step": 1, "title": "Acesse Configurações", "content": "No seu cartão, clique em \"Configurações\" ou \"Personalizar\".", "action": "navigate", "path": "/dashboard"},
    {"step": 2, "title": "Escolha Cores", "content": "Selecione as cores principais do seu cartão. Use cores que representem sua marca.", "action": "highlight", "selector": "#color-picker"},
    {"step": 3, "title": "Escolha Fonte", "content": "Selecione uma fonte que combine com seu estilo. Você pode escolher entre várias opções.", "action": "highlight", "selector": "#font-selector"},
    {"step": 4, "title": "Ajuste Layout", "content": "Escolha o layout que melhor se adapta ao seu conteúdo.", "action": "info"},
    {"step": 5, "title": "Visualize", "content": "Use a visualização em tempo real para ver as mudanças antes de salvar.", "action": "info"}
]'::jsonb, 7, 'beginner', 5, '🎨');

-- ============================================
-- INSERIR AJUDA CONTEXTUAL INICIAL
-- ============================================
INSERT INTO ia_contextual_help (page_path, element_selector, help_text, help_type, priority) VALUES
('/dashboard', '#btn-criar-cartao', 'Clique aqui para criar seu primeiro cartão digital! Eu posso te guiar passo a passo.', 'tip', 100),
('/dashboard', '#btn-adicionar-modulo', 'Adicione módulos ao seu cartão para torná-lo mais completo e funcional.', 'tip', 90),
('/dashboard', '#btn-configuracoes', 'Personalize seu cartão: cores, fontes, layout e muito mais!', 'tip', 80),
('/dashboard', '#btn-compartilhar', 'Compartilhe seu cartão com o mundo! Copie o link e envie para seus contatos.', 'tip', 70),
('/dashboard', '#btn-vendas', 'Crie páginas de vendas profissionais para vender seus produtos e serviços.', 'tip', 85);

-- ============================================
-- INSERIR AÇÕES DO ASSISTENTE
-- ============================================
INSERT INTO ia_assistant_actions (action_type, action_name, description, category, api_endpoint, parameters) VALUES
('create_card', 'Criar Cartão', 'Criar um novo cartão digital para o usuário', 'cartao', '/api/profile/create', '{"name": "string", "profession": "string"}'::jsonb),
('add_module', 'Adicionar Módulo', 'Adicionar um novo módulo ao cartão', 'modulos', '/api/profile/items', '{"item_type": "string", "title": "string"}'::jsonb),
('configure_sales', 'Configurar Vendas', 'Criar ou editar página de vendas', 'vendas', '/api/sales-pages', '{"title": "string", "description": "string"}'::jsonb),
('update_profile', 'Atualizar Perfil', 'Atualizar informações do perfil', 'configuracao', '/api/profile/update', '{"name": "string", "profession": "string"}'::jsonb),
('share_card', 'Compartilhar Cartão', 'Obter link de compartilhamento do cartão', 'cartao', '/api/profile/share-link', '{}'::jsonb);

-- Comentários
COMMENT ON TABLE ia_tutorials IS 'Tutoriais interativos passo a passo para ajudar usuários';
COMMENT ON TABLE ia_user_tutorial_progress IS 'Progresso de cada usuário nos tutoriais';
COMMENT ON TABLE ia_contextual_help IS 'Ajuda contextual exibida em elementos específicos das páginas';
COMMENT ON TABLE ia_assistant_actions IS 'Ações que o assistente virtual pode executar para ajudar usuários';
COMMENT ON TABLE ia_assistant_help_history IS 'Histórico de ajuda fornecida pelo assistente';

