-- Migration: Adicionar todas as categorias
-- Data: 2025-01-31
-- Descrição: Adiciona todas as categorias necessárias para o sistema IA KING

-- ============================================
-- ADICIONAR TODAS AS CATEGORIAS
-- ============================================
INSERT INTO ia_categories (name, description, priority, is_active) VALUES
-- Categorias principais mencionadas pelo usuário
('Religioso', 'Conteúdo relacionado a religião, espiritualidade e textos sagrados', 85, true),
('Estética', 'Conteúdo sobre estética, beleza e cuidados pessoais', 85, true),
('Ciência', 'Conteúdo científico, pesquisas e descobertas', 85, true),

-- Categorias educacionais e profissionais
('Educação', 'Conteúdo educacional, ensino e aprendizado', 80, true),
('Negócios', 'Conteúdo sobre negócios, empreendedorismo e gestão', 80, true),
('Vendas', 'Estratégias de vendas, técnicas comerciais e marketing', 80, true),
('Tecnologia', 'Conteúdo sobre tecnologia, programação e inovação', 80, true),
('Saúde', 'Conteúdo sobre saúde, medicina e bem-estar', 80, true),
('Psicologia', 'Conteúdo sobre psicologia, comportamento e desenvolvimento pessoal', 75, true),
('Filosofia', 'Conteúdo filosófico, reflexões e pensamento crítico', 75, true),
('História', 'Conteúdo histórico, eventos e personalidades', 75, true),
('Literatura', 'Obras literárias, poesia e textos artísticos', 75, true),
('Arte', 'Conteúdo sobre arte, cultura e expressão artística', 70, true),
('Música', 'Conteúdo sobre música, composição e teoria musical', 70, true),
('Esportes', 'Conteúdo sobre esportes, fitness e atividades físicas', 70, true),
('Culinária', 'Receitas, técnicas culinárias e gastronomia', 70, true),
('Viagem', 'Conteúdo sobre viagens, turismo e destinos', 65, true),
('Política', 'Conteúdo político, governança e políticas públicas', 65, true),
('Economia', 'Conteúdo sobre economia, finanças e investimentos', 65, true),
('Direito', 'Conteúdo jurídico, leis e legislação', 65, true),
('Medicina', 'Conteúdo médico, tratamentos e diagnósticos', 60, true),
('Engenharia', 'Conteúdo sobre engenharia, projetos e construções', 60, true),
('Arquitetura', 'Conteúdo sobre arquitetura e design de interiores', 60, true),
('Moda', 'Conteúdo sobre moda, estilo e tendências', 60, true),
('Entretenimento', 'Conteúdo de entretenimento, filmes e séries', 55, true),
('Jogos', 'Conteúdo sobre jogos, videogames e entretenimento digital', 55, true),
('Animais', 'Conteúdo sobre animais, pets e veterinária', 55, true),
('Natureza', 'Conteúdo sobre natureza, meio ambiente e sustentabilidade', 55, true),
('Autoajuda', 'Conteúdo de desenvolvimento pessoal e autoajuda', 50, true),
('Motivação', 'Conteúdo motivacional e inspiracional', 50, true),
('Biografia', 'Biografias e histórias de vida', 50, true),
('Ficção', 'Obras de ficção, romances e narrativas', 50, true),
('Não Ficção', 'Obras de não ficção, documentários e relatos reais', 50, true)

ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    priority = EXCLUDED.priority,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- VERIFICAÇÃO
-- ============================================
SELECT 
    '✅ Categorias adicionadas com sucesso!' as status,
    COUNT(*) as total_categorias,
    COUNT(*) FILTER (WHERE is_active = true) as categorias_ativas
FROM ia_categories;

-- Listar todas as categorias
SELECT id, name, description, priority, is_active 
FROM ia_categories 
WHERE is_active = true
ORDER BY priority DESC, name ASC;

