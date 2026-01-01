-- ============================================
-- MIGRATION 037: ADICIONAR MAIS CATEGORIAS NECESSÁRIAS
-- ============================================
-- Adiciona categorias adicionais para tornar a IA mais completa
-- Data: Dezembro 2024

-- Categorias adicionais importantes
INSERT INTO ia_categories (name, description, priority, is_active) VALUES
-- Tecnologia e IA
('Inteligência Artificial', 'Conteúdo sobre IA, machine learning, deep learning e algoritmos', 90, true),
('Programação', 'Conteúdo sobre programação, linguagens e desenvolvimento de software', 85, true),
('Ciência de Dados', 'Conteúdo sobre análise de dados, estatística e big data', 80, true),
('Blockchain', 'Conteúdo sobre blockchain, criptomoedas e tecnologia descentralizada', 75, true),
('Cibersegurança', 'Conteúdo sobre segurança digital, hacking ético e proteção de dados', 75, true),

-- Negócios e Empreendedorismo
('Empreendedorismo', 'Conteúdo sobre criar e gerenciar negócios', 85, true),
('Marketing Digital', 'Conteúdo sobre marketing online, SEO, redes sociais e publicidade', 85, true),
('Gestão', 'Conteúdo sobre gestão de equipes, liderança e administração', 80, true),
('Finanças Pessoais', 'Conteúdo sobre investimentos, economia pessoal e planejamento financeiro', 80, true),
('E-commerce', 'Conteúdo sobre vendas online, marketplaces e lojas virtuais', 75, true),

-- Desenvolvimento Pessoal
('Produtividade', 'Conteúdo sobre organização, eficiência e gestão de tempo', 80, true),
('Liderança', 'Conteúdo sobre liderança, influência e gestão de pessoas', 80, true),
('Comunicação', 'Conteúdo sobre oratória, escrita e comunicação interpessoal', 75, true),
('Criatividade', 'Conteúdo sobre inovação, criatividade e pensamento criativo', 75, true),
('Resiliência', 'Conteúdo sobre superação, persistência e força mental', 70, true),

-- Ciências
('Matemática', 'Conteúdo sobre matemática, álgebra, geometria e cálculos', 75, true),
('Física', 'Conteúdo sobre física, mecânica e fenômenos naturais', 75, true),
('Química', 'Conteúdo sobre química, reações e compostos', 70, true),
('Biologia', 'Conteúdo sobre biologia, vida e organismos', 70, true),
('Astronomia', 'Conteúdo sobre espaço, planetas e universo', 65, true),

-- Artes e Cultura
('Design', 'Conteúdo sobre design gráfico, UX/UI e visual', 75, true),
('Fotografia', 'Conteúdo sobre fotografia, técnicas e equipamentos', 70, true),
('Cinema', 'Conteúdo sobre filmes, direção e produção cinematográfica', 70, true),
('Teatro', 'Conteúdo sobre teatro, atuação e dramaturgia', 65, true),
('Literatura Brasileira', 'Obras e autores da literatura brasileira', 70, true),
('Literatura Mundial', 'Obras e autores da literatura mundial', 70, true),

-- Saúde e Bem-estar
('Nutrição', 'Conteúdo sobre alimentação saudável e nutrição', 80, true),
('Fitness', 'Conteúdo sobre exercícios físicos e condicionamento', 75, true),
('Meditação', 'Conteúdo sobre meditação, mindfulness e bem-estar mental', 75, true),
('Yoga', 'Conteúdo sobre yoga, alongamento e equilíbrio', 70, true),
('Terapias Alternativas', 'Conteúdo sobre terapias holísticas e alternativas', 65, true),

-- Relacionamentos e Social
('Relacionamentos', 'Conteúdo sobre relacionamentos interpessoais e amor', 75, true),
('Família', 'Conteúdo sobre família, educação de filhos e valores', 75, true),
('Amizade', 'Conteúdo sobre amizade e relacionamentos sociais', 70, true),
('Networking', 'Conteúdo sobre networking profissional e conexões', 70, true),

-- Especializadas
('Direito Trabalhista', 'Conteúdo sobre leis trabalhistas e direitos do trabalhador', 70, true),
('Direito Civil', 'Conteúdo sobre direito civil e contratos', 70, true),
('Direito Penal', 'Conteúdo sobre direito penal e processos criminais', 65, true),
('Arquitetura de Software', 'Conteúdo sobre arquitetura, padrões e design de sistemas', 75, true),
('DevOps', 'Conteúdo sobre DevOps, CI/CD e infraestrutura', 75, true),
('Cloud Computing', 'Conteúdo sobre computação em nuvem e serviços cloud', 75, true),
('Mobile', 'Conteúdo sobre desenvolvimento mobile e apps', 75, true),
('Web Development', 'Conteúdo sobre desenvolvimento web e frontend/backend', 80, true),

-- Especialidades Profissionais
('Medicina Veterinária', 'Conteúdo sobre veterinária e cuidados com animais', 70, true),
('Engenharia Civil', 'Conteúdo sobre construção civil e engenharia estrutural', 70, true),
('Engenharia de Software', 'Conteúdo sobre engenharia de software e metodologias', 80, true),
('Contabilidade', 'Conteúdo sobre contabilidade, impostos e finanças corporativas', 75, true),
('Recursos Humanos', 'Conteúdo sobre RH, recrutamento e gestão de pessoas', 75, true),
('Logística', 'Conteúdo sobre logística, supply chain e distribuição', 70, true),
('Vendas B2B', 'Conteúdo sobre vendas para empresas e negócios', 75, true),
('Vendas B2C', 'Conteúdo sobre vendas para consumidores finais', 75, true),

-- Hobbies e Interesses
('Jardinagem', 'Conteúdo sobre jardinagem, plantas e cultivo', 65, true),
('Culinária Internacional', 'Receitas e técnicas de culinária mundial', 70, true),
('Culinária Brasileira', 'Receitas e técnicas da culinária brasileira', 70, true),
('Artesanato', 'Conteúdo sobre artesanato e trabalhos manuais', 65, true),
('Colecionismo', 'Conteúdo sobre coleções e itens colecionáveis', 60, true),

-- Educação e Ensino
('Pedagogia', 'Conteúdo sobre educação, ensino e métodos pedagógicos', 75, true),
('EAD', 'Conteúdo sobre educação a distância e ensino online', 75, true),
('Treinamento Corporativo', 'Conteúdo sobre treinamento e desenvolvimento corporativo', 75, true),
('Idiomas', 'Conteúdo sobre aprendizado de idiomas e linguística', 75, true),

-- Meio Ambiente
('Sustentabilidade', 'Conteúdo sobre sustentabilidade e meio ambiente', 75, true),
('Energia Renovável', 'Conteúdo sobre energias limpas e renováveis', 70, true),
('Reciclagem', 'Conteúdo sobre reciclagem e gestão de resíduos', 70, true),

-- Outros
('Filosofia Oriental', 'Conteúdo sobre filosofias orientais e espiritualidade', 70, true),
('Mitologia', 'Conteúdo sobre mitologias e histórias antigas', 65, true),
('Ufologia', 'Conteúdo sobre OVNIs e vida extraterrestre', 60, true),
('Paranormal', 'Conteúdo sobre fenômenos paranormais e sobrenaturais', 60, true),
('Conspiração', 'Conteúdo sobre teorias da conspiração', 50, true)

ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    priority = EXCLUDED.priority,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- Verificação
SELECT 
    '✅ Categorias adicionadas com sucesso!' as status,
    COUNT(*) as total_categorias,
    COUNT(*) FILTER (WHERE is_active = true) as categorias_ativas
FROM ia_categories;

