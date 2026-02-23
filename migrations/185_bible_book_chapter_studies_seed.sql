-- Seed 185: Estudo por livro/capítulo (exemplo: Gênesis)
-- Execute após a migration 185.

INSERT INTO bible_book_studies (book_id, title, content) VALUES
('gn', 'Introdução ao livro de Gênesis',
'Este é o primeiro livro da Bíblia. Gênesis significa "origem" ou "princípio". O livro narra a criação do mundo, a queda do homem, o dilúvio, a torre de Babel e a história dos patriarcas Abraão, Isaque, Jacó e José.\n\nEstrutura geral:\n• Cap. 1–11: Origens (criação, queda, dilúvio, nações)\n• Cap. 12–50: Patriarcas (Abraão, Isaque, Jacó, José)\n\nO livro estabelece temas fundamentais: Deus como Criador, a aliança com o homem, a promessa de redenção e o papel do povo escolhido.')
ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();

INSERT INTO bible_chapter_studies (book_id, chapter_number, title, content) VALUES
('gn', 1, 'A Criação',
'No princípio Deus criou os céus e a terra (v. 1). O capítulo descreve a criação em seis dias:\n\n• Dia 1: Luz e trevas\n• Dia 2: Céu (firmamento)\n• Dia 3: Terra, mares e vegetação\n• Dia 4: Sol, lua e estrelas\n• Dia 5: Peixes e aves\n• Dia 6: Animais terrestres e o homem (à imagem de Deus)\n\nO homem e a mulher recebem o mandato de dominar e encher a terra. Tudo é declarado "muito bom". O sétimo dia é santificado como descanso.\n\nReflexão: A criação revela o poder e a bondade de Deus. O ser humano tem valor único por ser feito à imagem de Deus.')
ON CONFLICT (book_id, chapter_number) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();

SELECT 'Seed 185: Estudo de Gênesis (livro + cap. 1) inserido.' AS status;
