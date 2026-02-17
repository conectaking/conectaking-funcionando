-- ===========================================
-- Migration 177: Estudos Bíblicos + Devocionais 16-45
-- ===========================================

-- ===========================================
-- ESTUDOS BÍBLICOS (1 por tema)
-- ===========================================

INSERT INTO bible_studies (theme_id, slug, titulo, subtitulo, introducao, conteudo, referencias, display_order)
SELECT id, 'retorno-de-cristo', 'O Retorno de Cristo: Esperança e Preparação', 'Escatologia bíblica aplicada',
'O Novo Testamento está repleto de referências à segunda vinda de Jesus. Este estudo aborda os principais textos escatológicos e suas implicações para a vida do crente hoje.',
'O retorno de Cristo é uma doutrina central do cristianismo. Jesus prometeu voltar (João 14:3), e os anjos confirmaram que Ele voltará da mesma forma que subiu (Atos 1:11).

1. A certeza do retorno: Paulo ensina que o Senhor descerá do céu com alarido, com voz de arcanjo e trombeta de Deus (1 Tessalonicenses 4:16). A promessa não é condicional; é uma garantia que norteia a esperança cristã.

2. Sinais dos tempos: Jesus falou sobre sinais que precederiam Sua volta: guerras, rumores de guerras, fomes, terremotos (Mateus 24:6-8). Esses sinais não são para calcular datas, mas para manter os crentes vigilantes e preparados.

3. A parábola das dez virgens: Mateus 25 ensina a importância de estarmos prontos. Cinco virgens prudentes levaram óleo; cinco insensatas não. O noivo demorou, e as insensatas foram excluídas. A lição: vigiar e preparar-se, pois não sabemos o dia nem a hora.

4. Vida prática na expectativa: Tito 2:12-13 diz que a graça nos ensina a viver de forma piedosa, aguardando a bendita esperança. A escatologia não deve nos levar ao escapismo, mas a uma vida santa e produtiva.',
'Mt 24-25; 1 Ts 4:13-18; 2 Pe 3:10-13; Ap 22:20',
1
FROM bible_study_themes WHERE slug = 'escatologia' LIMIT 1;

INSERT INTO bible_studies (theme_id, slug, titulo, subtitulo, introducao, conteudo, referencias, display_order)
SELECT id, 'papel-dos-pais', 'O Papel dos Pais na Educação Espiritual', 'Deuteronômio 6 como fundamento',
'A família é a primeira escola de fé. Deus delegou aos pais a responsabilidade primária de transmitir os valores e a fé às próximas gerações.',
'Deuteronômio 6:6-7 é o texto áureo da educação espiritual em família: "Estas palavras estarão no teu coração; e as ensinarás a teus filhos."

1. Primeiro no coração: A transmissão começa em nós. Não podemos dar o que não temos. Os pais precisam cultivar a Palavra no próprio coração antes de ensinar aos filhos.

2. Em todos os momentos: "Sentado em tua casa, andando pelo caminho, ao deitar-te e ao levantar-te" — a instrução não é apenas no culto doméstico formal, mas no cotidiano. Conversas, situações do dia a dia, momentos de crise e de alegria são oportunidades de ensino.

3. Efésios 6:4: "Pais, não provoqueis vossos filhos à ira, mas criai-os na disciplina e na admoestação do Senhor." A disciplina sem provocação; a instrução com amor.

4. O exemplo de Timóteo: Paulo lembra a Timóteo da fé de sua avó Loide e de sua mãe Eunice (2 Timóteo 1:5). A fé genuína passa de geração em geração através do exemplo e do ensino.',
'Dt 6:6-7; Ef 6:4; 2 Tm 1:5; Pv 22:6',
1
FROM bible_study_themes WHERE slug = 'familia' LIMIT 1;

INSERT INTO bible_studies (theme_id, slug, titulo, subtitulo, introducao, conteudo, referencias, display_order)
SELECT id, 'dizimo-e-mordomia', 'O Dízimo e a Mordomia Cristã', 'Perspectiva bíblica sobre recursos',
'O dízimo e as ofertas não são mecanismos para manipular Deus, mas expressões de adoração e reconhecimento de que tudo pertence ao Senhor.',
'O Salmo 24:1 declara: "Do Senhor é a terra e a sua plenitude." Nada do que temos é realmente nosso; somos mordomos.

1. Origens do dízimo: Antes da Lei, Abraão entregou o dízimo a Melquisedeque (Gênesis 14:20). Jacó fez voto de dizimar (Gênesis 28:22). O dízimo é princípio de adoração, não apenas mandamento legal.

2. Malaquias 3:10: "Trazei todos os dízimos à casa do tesouro." Deus convida a prová-Lo. A obediência abre portas para bênçãos. Isso não é barganha; é confiança na provisão divina.

3. O princípio da mordomia: Jesus ensinou: "Onde está o teu tesouro, aí estará também o teu coração" (Mateus 6:21). O uso do dinheiro revela prioridades. A generosidade é fruto de um coração transformado.

4. 2 Coríntios 9:7: "Cada um contribua conforme propôs no seu coração; não com tristeza ou por necessidade, pois Deus ama ao que dá com alegria." A oferta voluntária e alegre é aceita por Deus.',
'Gn 14:20; Ml 3:8-10; Mt 6:21; 2 Co 9:6-7',
1
FROM bible_study_themes WHERE slug = 'financas' LIMIT 1;

INSERT INTO bible_studies (theme_id, slug, titulo, subtitulo, introducao, conteudo, referencias, display_order)
SELECT id, 'visao-e-oracao', 'Neemias: Visão, Oração e Ação', 'Princípios de liderança do reconstruidor',
'O livro de Neemias oferece um modelo de liderança baseado em visão clara, oração constante e ação decidida.',
'Neemias era copeiro do rei Artaxerxes quando soube que os muros de Jerusalém estavam em ruínas. Sua resposta ilustra princípios atemporais de liderança.

1. Sensibilidade e choro: Neemias chorou ao ouvir a notícia (1:4). O líder eficaz não é insensível; é movido pelas necessidades. O choro leva à oração.

2. Oração antes da ação: O capítulo 1 registra uma oração extensa. Neemias não age impulsivamente; ele busca a face de Deus, confessa pecados e pede favor. A oração fundamenta a liderança.

3. Planejamento e pedido específico: Neemias orou por meses antes de agir. Quando pediu ao rei, já tinha um plano claro (2:5-8). O líder ora e planeja.

4. Superando oposição: Sambalate e Tobias tentaram desanimá-lo (4:1-3; 6:1-14). Neemias persistiu, distribuiu o trabalho, colocou guardas e continuou edificando. Liderança exige perseverança.

5. Liderança servidora: Neemias não exigiu tributo; trabalhou ao lado do povo (5:14-19). O líder que serve inspira compromisso.',
'Ne 1-2; 4-6; Fp 2:5-8',
1
FROM bible_study_themes WHERE slug = 'lideranca-neemias' LIMIT 1;

INSERT INTO bible_studies (theme_id, slug, titulo, subtitulo, introducao, conteudo, referencias, display_order)
SELECT id, 'contexto-e-cultura', 'Contexto Histórico e Cultural na Interpretação', 'Introdução à hermenêutica',
'A Bíblia foi escrita em contextos específicos. Conhecer o contexto histórico e cultural enriquece nossa interpretação e evita erros.',
'A hermenêutica é a arte e a ciência da interpretação bíblica. Alguns princípios fundamentais:

1. Contexto imediato: Um versículo deve ser lido no contexto do capítulo, do livro e do autor. "Texto sem contexto é pretexto." O que o autor queria comunicar aos ouvintes originais?

2. Contexto histórico: A Bíblia foi escrita ao longo de mais de 1500 anos, em culturas diferentes (hebraica, aramaica, greco-romana). Conhecer costumes, estruturas sociais e eventos históricos esclarece o significado.

3. Contexto literário: Cada livro tem um gênero: narrativa, poesia, profecia, epístola, apocalipse. A poesia usa metáforas; as epístolas são cartas com propósito específico; o Apocalipse usa linguagem simbólica.

4. Analogia da fé: A Escritura interpreta a Escritura. Passagens mais claras esclarecem as mais difíceis. A revelação é progressiva e coerente.

5. Aplicação: Após entender o significado original, perguntamos: "O que isso significa para nós hoje?" A aplicação deve ser fiel ao texto.',
'2 Tm 2:15; 2 Pe 1:20-21; At 17:11',
1
FROM bible_study_themes WHERE slug = 'hermeneutica' LIMIT 1;
