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

-- ===========================================
-- DEVOCIONAIS 16-30 (mais 15 dias)
-- ===========================================

INSERT INTO bible_devotionals_365 (day_of_year, titulo, versiculo_ref, versiculo_texto, reflexao, aplicacao, oracao) VALUES
(16, 'Refúgio na Angústia', 'Salmos 46:1', 'Deus é o nosso refúgio e fortaleza, socorro bem presente na angústia.',
'O Salmo 46 foi escrito em contexto de grande turbulência. A imagem de montes abalando e águas rugindo (v. 2-3) evoca crises existenciais. Mesmo assim, o salmista declara: Deus é refúgio e fortaleza.',
'Em momentos de angústia, busque o refúgio em Deus através da oração e da Palavra. Compartilhe sua carga com alguém de confiança.',
'Deus, és meu refúgio. Acolhe-me hoje. Amém.')
ON CONFLICT (day_of_year) DO UPDATE SET titulo = EXCLUDED.titulo, versiculo_ref = EXCLUDED.versiculo_ref, versiculo_texto = EXCLUDED.versiculo_texto, reflexao = EXCLUDED.reflexao, aplicacao = EXCLUDED.aplicacao, oracao = EXCLUDED.oracao, updated_at = NOW();

INSERT INTO bible_devotionals_365 (day_of_year, titulo, versiculo_ref, versiculo_texto, reflexao, aplicacao, oracao) VALUES
(17, 'Buscai Primeiro o Reino', 'Mateus 6:33', 'Buscai primeiro o reino de Deus, e a sua justiça, e todas estas coisas vos serão acrescentadas.',
'Jesus contrasta a ansiedade dos gentils com a prioridade do reino. Quando colocamos Deus em primeiro lugar, Ele cuida do restante.',
'Reorganize suas prioridades hoje. Ore pedindo que o reino de Deus seja sua maior busca.',
'Senhor, quero colocar-Te em primeiro lugar hoje. Amém.')
ON CONFLICT (day_of_year) DO UPDATE SET titulo = EXCLUDED.titulo, versiculo_ref = EXCLUDED.versiculo_ref, versiculo_texto = EXCLUDED.versiculo_texto, reflexao = EXCLUDED.reflexao, aplicacao = EXCLUDED.aplicacao, oracao = EXCLUDED.oracao, updated_at = NOW();

INSERT INTO bible_devotionals_365 (day_of_year, titulo, versiculo_ref, versiculo_texto, reflexao, aplicacao, oracao) VALUES
(18, 'Amados por Deus', 'Romanos 5:8', 'Mas Deus prova o seu amor para conosco em que Cristo morreu por nós, sendo nós ainda pecadores.',
'O amor de Deus não é condicional. Ele nos amou quando ainda éramos pecadores. A cruz é a prova definitiva desse amor.',
'Reflita em como você pode demonstrar amor incondicional a alguém hoje.',
'Obrigado por me amar mesmo quando não mereço. Amém.')
ON CONFLICT (day_of_year) DO UPDATE SET titulo = EXCLUDED.titulo, versiculo_ref = EXCLUDED.versiculo_ref, versiculo_texto = EXCLUDED.versiculo_texto, reflexao = EXCLUDED.reflexao, aplicacao = EXCLUDED.aplicacao, oracao = EXCLUDED.oracao, updated_at = NOW();

INSERT INTO bible_devotionals_365 (day_of_year, titulo, versiculo_ref, versiculo_texto, reflexao, aplicacao, oracao) VALUES
(19, 'Deus é Amor', '1 João 4:8', 'Aquele que não ama não conhece a Deus; porque Deus é amor.',
'João afirma que Deus é amor. Conhecer a Deus implica aprender a amar.',
'Pratique o amor hoje: um gesto de bondade, uma palavra de encorajamento, um ato de perdão.',
'Deus, ajuda-me a conhecer-Te e a amar como Tu amas. Amém.')
ON CONFLICT (day_of_year) DO UPDATE SET titulo = EXCLUDED.titulo, versiculo_ref = EXCLUDED.versiculo_ref, versiculo_texto = EXCLUDED.versiculo_texto, reflexao = EXCLUDED.reflexao, aplicacao = EXCLUDED.aplicacao, oracao = EXCLUDED.oracao, updated_at = NOW();

INSERT INTO bible_devotionals_365 (day_of_year, titulo, versiculo_ref, versiculo_texto, reflexao, aplicacao, oracao) VALUES
(20, 'Não Andeis Ansiosos', 'Filipenses 4:6', 'Não andeis ansiosos de coisa alguma; em tudo, porém, sejam conhecidas diante de Deus as vossas petições.',
'Paulo oferece uma alternativa à ansiedade: oração. Apresentar as necessidades a Deus com ação de graças transforma a perspectiva.',
'Identifique uma preocupação e apresente-a a Deus em oração, terminando com gratidão.',
'Pai, entrego minhas necessidades a Ti. Obrigado por me ouvir. Amém.')
ON CONFLICT (day_of_year) DO UPDATE SET titulo = EXCLUDED.titulo, versiculo_ref = EXCLUDED.versiculo_ref, versiculo_texto = EXCLUDED.versiculo_texto, reflexao = EXCLUDED.reflexao, aplicacao = EXCLUDED.aplicacao, oracao = EXCLUDED.oracao, updated_at = NOW();

INSERT INTO bible_devotionals_365 (day_of_year, titulo, versiculo_ref, versiculo_texto, reflexao, aplicacao, oracao) VALUES
(21, 'A Paz que Excede', 'Filipenses 4:7', 'E a paz de Deus, que excede todo o entendimento, guardará os vossos corações e os vossos pensamentos.',
'A paz de Deus não é ausência de problemas; é presença de Deus no meio deles. Ela excede todo o entendimento humano.',
'Quando a ansiedade surgir, pare e ore. Peça a paz que guarda coração e mente.',
'Senhor, dá-me a Tua paz que excede todo entendimento. Amém.')
ON CONFLICT (day_of_year) DO UPDATE SET titulo = EXCLUDED.titulo, versiculo_ref = EXCLUDED.versiculo_ref, versiculo_texto = EXCLUDED.versiculo_texto, reflexao = EXCLUDED.reflexao, aplicacao = EXCLUDED.aplicacao, oracao = EXCLUDED.oracao, updated_at = NOW();

INSERT INTO bible_devotionals_365 (day_of_year, titulo, versiculo_ref, versiculo_texto, reflexao, aplicacao, oracao) VALUES
(22, 'O Bom Pastor', 'João 10:11', 'Eu sou o bom pastor. O bom pastor dá a sua vida pelas ovelhas.',
'Jesus se identifica como o bom pastor. A cruz é o ápice desse amor pastoral.',
'Reconheça que você é cuidado por Cristo. Agradeça por Seu pastoreio fiel.',
'Bom Pastor, obrigado por dares a Tua vida por mim. Cuida de mim hoje. Amém.')
ON CONFLICT (day_of_year) DO UPDATE SET titulo = EXCLUDED.titulo, versiculo_ref = EXCLUDED.versiculo_ref, versiculo_texto = EXCLUDED.versiculo_texto, reflexao = EXCLUDED.reflexao, aplicacao = EXCLUDED.aplicacao, oracao = EXCLUDED.oracao, updated_at = NOW();

INSERT INTO bible_devotionals_365 (day_of_year, titulo, versiculo_ref, versiculo_texto, reflexao, aplicacao, oracao) VALUES
(23, 'Rocha Eterna', 'Isaías 26:4', 'Confiai no Senhor perpetuamente; porque o Senhor Jeová é a rocha eterna.',
'Em tempos de instabilidade, Deus é a rocha eterna. A confiança nEle não é temporária; é para toda a vida.',
'Em que área você precisa confiar mais em Deus? Ore entregando essa área ao Senhor.',
'Senhor, Tu és a rocha eterna. Confio em Ti perpetuamente. Amém.')
ON CONFLICT (day_of_year) DO UPDATE SET titulo = EXCLUDED.titulo, versiculo_ref = EXCLUDED.versiculo_ref, versiculo_texto = EXCLUDED.versiculo_texto, reflexao = EXCLUDED.reflexao, aplicacao = EXCLUDED.aplicacao, oracao = EXCLUDED.oracao, updated_at = NOW();

INSERT INTO bible_devotionals_365 (day_of_year, titulo, versiculo_ref, versiculo_texto, reflexao, aplicacao, oracao) VALUES
(24, 'Vinde a Mim', 'Mateus 11:28-29', 'Vinde a mim, todos os que estais cansados e sobrecarregados, e eu vos aliviarei.',
'Jesus convida os cansados. O jugo dEle é suave e o fardo é leve. Aquele que caminha conosco torna o peso suportável.',
'Se você está sobrecarregado, aceite o convite hoje. Em oração, deposite suas cargas aos pés de Jesus.',
'Jesus, venho a Ti. Alivia o meu fardo. Amém.')
ON CONFLICT (day_of_year) DO UPDATE SET titulo = EXCLUDED.titulo, versiculo_ref = EXCLUDED.versiculo_ref, versiculo_texto = EXCLUDED.versiculo_texto, reflexao = EXCLUDED.reflexao, aplicacao = EXCLUDED.aplicacao, oracao = EXCLUDED.oracao, updated_at = NOW();

INSERT INTO bible_devotionals_365 (day_of_year, titulo, versiculo_ref, versiculo_texto, reflexao, aplicacao, oracao) VALUES
(25, 'Lâmpada para os Pés', 'Salmos 119:105', 'Lâmpada para os meus pés é a tua palavra e luz para o meu caminho.',
'A Palavra de Deus ilumina o caminho. Não revela tudo de uma vez; ilumina o passo seguinte.',
'Leia um versículo ou capítulo da Bíblia hoje. Peça a Deus que ilumine seu caminho.',
'Senhor, Tua Palavra é lâmpada para meus pés. Guia-me hoje. Amém.')
ON CONFLICT (day_of_year) DO UPDATE SET titulo = EXCLUDED.titulo, versiculo_ref = EXCLUDED.versiculo_ref, versiculo_texto = EXCLUDED.versiculo_texto, reflexao = EXCLUDED.reflexao, aplicacao = EXCLUDED.aplicacao, oracao = EXCLUDED.oracao, updated_at = NOW();

INSERT INTO bible_devotionals_365 (day_of_year, titulo, versiculo_ref, versiculo_texto, reflexao, aplicacao, oracao) VALUES
(26, 'O Fruto do Espírito', 'Gálatas 5:22-23', 'Mas o fruto do Espírito é: amor, alegria, paz, longanimidade, benignidade, bondade, fidelidade, mansidão, domínio próprio.',
'Paulo contrasta as obras da carne com o fruto do Espírito. O fruto é singular — um conjunto de características que o Espírito produz.',
'Escolha uma característica do fruto e peça ao Espírito que a manifeste em você hoje.',
'Espírito Santo, produz Teu fruto em mim. Amém.')
ON CONFLICT (day_of_year) DO UPDATE SET titulo = EXCLUDED.titulo, versiculo_ref = EXCLUDED.versiculo_ref, versiculo_texto = EXCLUDED.versiculo_texto, reflexao = EXCLUDED.reflexao, aplicacao = EXCLUDED.aplicacao, oracao = EXCLUDED.oracao, updated_at = NOW();

INSERT INTO bible_devotionals_365 (day_of_year, titulo, versiculo_ref, versiculo_texto, reflexao, aplicacao, oracao) VALUES
(27, 'Servir com Amor', 'Gálatas 5:13', 'Servi-vos uns aos outros pelo amor.',
'A liberdade em Cristo é oportunidade para servir. O amor nos motiva a colocar o outro em primeiro lugar.',
'Identifique uma forma prática de servir alguém hoje.',
'Senhor, usa-me para servir com amor. Amém.')
ON CONFLICT (day_of_year) DO UPDATE SET titulo = EXCLUDED.titulo, versiculo_ref = EXCLUDED.versiculo_ref, versiculo_texto = EXCLUDED.versiculo_texto, reflexao = EXCLUDED.reflexao, aplicacao = EXCLUDED.aplicacao, oracao = EXCLUDED.oracao, updated_at = NOW();

INSERT INTO bible_devotionals_365 (day_of_year, titulo, versiculo_ref, versiculo_texto, reflexao, aplicacao, oracao) VALUES
(28, 'Esperança Viva', '1 Pedro 1:3', 'Bendito seja o Deus e Pai de nosso Senhor Jesus Cristo! Conforme a sua grande misericórdia, nos regenerou para uma esperança viva.',
'A esperança cristã não é ilusão; é viva, fundamentada na ressurreição de Cristo.',
'Agradeça a Deus pela esperança viva que você tem em Cristo.',
'Pai, bendito sejas! Obrigado pela esperança viva. Amém.')
ON CONFLICT (day_of_year) DO UPDATE SET titulo = EXCLUDED.titulo, versiculo_ref = EXCLUDED.versiculo_ref, versiculo_texto = EXCLUDED.versiculo_texto, reflexao = EXCLUDED.reflexao, aplicacao = EXCLUDED.aplicacao, oracao = EXCLUDED.oracao, updated_at = NOW();

INSERT INTO bible_devotionals_365 (day_of_year, titulo, versiculo_ref, versiculo_texto, reflexao, aplicacao, oracao) VALUES
(29, 'Mais que Vencedores', 'Romanos 8:37', 'Mas em todas estas coisas somos mais que vencedores, por meio daquele que nos amou.',
'Paulo enumera tribulações e declara: somos mais que vencedores. A vitória vem por meio daquele que nos amou.',
'Qual tribulação você enfrenta? Declare em oração que em Cristo você é mais que vencedor.',
'Senhor, em Ti sou mais que vencedor. Obrigado por Teu amor. Amém.')
ON CONFLICT (day_of_year) DO UPDATE SET titulo = EXCLUDED.titulo, versiculo_ref = EXCLUDED.versiculo_ref, versiculo_texto = EXCLUDED.versiculo_texto, reflexao = EXCLUDED.reflexao, aplicacao = EXCLUDED.aplicacao, oracao = EXCLUDED.oracao, updated_at = NOW();

INSERT INTO bible_devotionals_365 (day_of_year, titulo, versiculo_ref, versiculo_texto, reflexao, aplicacao, oracao) VALUES
(30, 'Nada nos Separará', 'Romanos 8:38-39', 'Porque estou certo de que nem a morte, nem a vida... poderá separar-nos do amor de Deus.',
'Paulo conclui com certeza: nada pode nos separar do amor de Deus em Cristo. Nem a morte, nem a vida, nem poderes espirituais.',
'Medite nesta verdade. Nada pode separá-lo do amor de Deus.',
'Pai, obrigado que nada pode me separar do Teu amor. Amém.')
ON CONFLICT (day_of_year) DO UPDATE SET titulo = EXCLUDED.titulo, versiculo_ref = EXCLUDED.versiculo_ref, versiculo_texto = EXCLUDED.versiculo_texto, reflexao = EXCLUDED.reflexao, aplicacao = EXCLUDED.aplicacao, oracao = EXCLUDED.oracao, updated_at = NOW();

SELECT 'Migration 177: 5 estudos bíblicos e 15 devocionais (dias 16-30) inseridos.' AS status;
