-- ===========================================
-- Migration 175: Seed do Ecossistema Bíblico
-- 15 devocionais + 5 esboços + categorias/temas
-- ===========================================

-- Categorias de Esboços
INSERT INTO sermon_outline_categories (slug, nome, descricao, display_order) VALUES
('avivamento', 'Avivamento', 'Esboços sobre avivamento espiritual e renovação', 1),
('casamento', 'Casamento', 'Esboços para cerimônias e cultos de casamento', 2),
('prosperidade', 'Prosperidade Bíblica', 'Finanças e bênçãos à luz da Palavra', 3),
('batalha-espiritual', 'Batalha Espiritual', 'Guerra espiritual e vitória em Cristo', 4),
('familia', 'Família', 'Valores familiares e relacionamentos', 5)
ON CONFLICT (slug) DO NOTHING;

-- Temas de Estudos Bíblicos
INSERT INTO bible_study_themes (slug, nome, descricao, display_order) VALUES
('escatologia', 'Escatologia', 'Estudos sobre as últimas coisas e o retorno de Cristo', 1),
('familia', 'Família à Luz da Bíblia', 'Valores, papéis e relacionamentos familiares', 2),
('financas', 'Finanças Bíblicas', 'Mordomia, dízimos, ofertas e prosperidade', 3),
('lideranca-neemias', 'Liderança de Neemias', 'Princípios de liderança do livro de Neemias', 4),
('hermeneutica', 'Hermenêutica', 'Interpretação e exegese bíblica', 5)
ON CONFLICT (slug) DO NOTHING;

-- ===========================================
-- 15 DEVOCIONAIS (Dias 1 a 15)
-- ===========================================

INSERT INTO bible_devotionals_365 (day_of_year, titulo, versiculo_ref, versiculo_texto, reflexao, aplicacao, oracao) VALUES
(1, 'O Amor que Transforma', 'João 3:16', 'Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.',
'João 3:16 é talvez o versículo mais conhecido da Bíblia, mas sua profundidade vai além da memorização. O amor de Deus não é sentimental ou abstrato — é um amor que age. O termo grego "agapao" usado aqui descreve um amor de decisão, de entrega total, que não depende do merecimento do amado.

Deus não amou o mundo "um pouco" ou "de longe". Ele amou "de tal maneira" — uma expressão que indica intensidade incomparável. E a prova desse amor não foi uma declaração, mas uma entrega: deu o seu Filho unigênito. O Pai ofereceu o que tinha de mais precioso para resgatar o que estava perdido.

A condição para receber essa vida eterna é a fé: "todo aquele que nele crê". A salvação não é conquista, é recebimento. Não é mérito, é graça. Quando compreendemos essa verdade em profundidade, nossa identidade é transformada. Não somos mais definidos por nossos erros ou conquistas, mas pelo amor que nos alcançou.

Esse amor deve fluir em nós. Jesus disse que o mundo conheceria seus discípulos pelo amor uns pelos outros (João 13:35). O amor que recebemos é para ser compartilhado — na família, no trabalho, na comunidade. Cada gesto de perdão, cada ato de serviço, cada palavra de encorajamento é um reflexo do amor que nos transformou.',
'Hoje, pratique o amor transformador: (1) Reconheça um momento em que você recebeu graça imerecida e agradeça a Deus. (2) Identifique alguém que precisa de um gesto de amor — um colega, familiar ou vizinho — e tome uma ação concreta. (3) No ambiente profissional, escolha responder com graça a uma situação que poderia gerar conflito. O amor de Deus em nós se expressa em decisões diárias.',
'Senhor, obrigado por me amar de tal maneira. Ajuda-me a refletir esse amor em cada gesto e palavra de hoje. Que eu seja canal da Tua graça. Amém.')
ON CONFLICT (day_of_year) DO UPDATE SET titulo = EXCLUDED.titulo, versiculo_ref = EXCLUDED.versiculo_ref, versiculo_texto = EXCLUDED.versiculo_texto, reflexao = EXCLUDED.reflexao, aplicacao = EXCLUDED.aplicacao, oracao = EXCLUDED.oracao, updated_at = NOW();

INSERT INTO bible_devotionals_365 (day_of_year, titulo, versiculo_ref, versiculo_texto, reflexao, aplicacao, oracao) VALUES
(2, 'Descanso para a Alma', 'Mateus 11:28', 'Vinde a mim, todos os que estais cansados e sobrecarregados, e eu vos aliviarei.',
'Jesus faz um convite universal: "Vinde a mim". Não é um convite para os religiosos ou para os que têm tudo resolvido. É para os cansados e sobrecarregados. O cansaço pode ser físico, emocional ou espiritual. As cargas podem ser trabalho excessivo, expectativas não atendidas, culpa, dor, ansiedade ou solidão.

No contexto do capítulo, Jesus acabara de falar sobre a sabedoria rejeitada e as cidades impenitentes. Mesmo assim, Ele abre os braços. O convite é gracioso e incondicional. "Eu vos aliviarei" — a promessa é de alívio real, não apenas simbólico.

O descanso que Jesus oferece é diferente do descanso do mundo. O mundo oferece distração; Jesus oferece paz. O mundo oferece fuga temporária; Jesus oferece renovação profunda. É um descanso que alcança a alma — o centro do nosso ser, onde residem as angústias mais profundas.

Tomar o jugo de Jesus (v. 29) parece paradoxal: trocar uma carga por outra. Mas o jugo de Cristo é suave e o fardo é leve. Por quê? Porque Ele caminha ao nosso lado. O peso que carregamos sozinhos esmaga; o peso compartilhado com Cristo nos fortalece.',
'Identifique hoje qual carga você está carregando sozinho. Pode ser uma preocupação financeira, um relacionamento difícil ou uma decisão pendente. Em oração, entregue essa carga a Jesus. Literalmente, visualize colocando-a aos pés dEle. Depois, escolha um momento de silêncio — mesmo 5 minutos — para descansar na presença de Deus, sem pedir nada, apenas estando.',
'Jesus, estou cansado. Recebe-me e dá-me o descanso que só Tu podes dar. Alivia o peso que carrego. Amém.')
ON CONFLICT (day_of_year) DO UPDATE SET titulo = EXCLUDED.titulo, versiculo_ref = EXCLUDED.versiculo_ref, versiculo_texto = EXCLUDED.versiculo_texto, reflexao = EXCLUDED.reflexao, aplicacao = EXCLUDED.aplicacao, oracao = EXCLUDED.oracao, updated_at = NOW();

INSERT INTO bible_devotionals_365 (day_of_year, titulo, versiculo_ref, versiculo_texto, reflexao, aplicacao, oracao) VALUES
(3, 'Planos de Esperança', 'Jeremias 29:11', 'Porque eu bem sei os pensamentos que tenho a respeito de vós, diz o Senhor; pensamentos de paz e não de mal, para vos dar o fim que desejais.',
'Jeremias 29 foi escrito no exílio babilônico. O povo de Judá estava longe de casa, em terra estranha, sob domínio estrangeiro. A promessa de Deus não veio em tempos de prosperidade, mas no meio da crise. "Eu bem sei os pensamentos que tenho a respeito de vós" — Deus não esqueceu Seu povo.

Os planos de Deus são de paz (shalom) e não de mal. Shalom no hebraico significa muito mais que ausência de guerra; significa plenitude, bem-estar integral, harmonia. Os planos de Deus para nós incluem um futuro e uma esperança.

É importante notar: a promessa não elimina o exílio imediato. Deus diz aos exilados para construir casas, plantar jardins, casar-se e ter filhos (v. 5-6). Ou seja, viver plenamente mesmo no meio da dificuldade. A esperança não é escapista; é encarnada no presente.

Quando não entendemos o que está acontecendo, podemos confiar que o Senhor está no controle. O que parece fim pode ser apenas o começo. A história de José no Egito ilustra isso: o que seus irmãos intentaram para mal, Deus transformou em bem (Gênesis 50:20).',
'Reflita: qual situação atual parece um "exílio" na sua vida? Em vez de esperar que termine para viver plenamente, pergunte a Deus: "O que posso construir, plantar ou investir aqui e agora?" Faça uma ação concreta hoje que expresse esperança — mesmo pequena — no futuro que Deus tem para você.',
'Pai, confio nos Teus planos mesmo quando não entendo. Ajuda-me a viver com esperança no presente. Amém.')
ON CONFLICT (day_of_year) DO UPDATE SET titulo = EXCLUDED.titulo, versiculo_ref = EXCLUDED.versiculo_ref, versiculo_texto = EXCLUDED.versiculo_texto, reflexao = EXCLUDED.reflexao, aplicacao = EXCLUDED.aplicacao, oracao = EXCLUDED.oracao, updated_at = NOW();

INSERT INTO bible_devotionals_365 (day_of_year, titulo, versiculo_ref, versiculo_texto, reflexao, aplicacao, oracao) VALUES
(4, 'Força para o Caminho', 'Isaías 40:31', 'Mas os que esperam no Senhor renovam as suas forças; sobem com asas como águias; correm e não se cansam; caminham e não se fatigam.',
'Isaías 40 é um capítulo de consolo. O profeta anuncia que a guerra terminou e que o pecado do povo foi perdoado. No final do capítulo, ele contrasta a fragilidade humana com a grandeza de Deus. "Os jovens se cansarão e se fatigarão" (v. 30), mas "os que esperam no Senhor renovam as suas forças".

Esperar no Senhor não é passividade. É confiança ativa. O verbo hebraico "qavah" significa esperar com expectativa, como quem fica na torre vigiando o horizonte. É escolher descansar em Deus enquanto Ele age, em vez de depender apenas das próprias forças.

A renovação se expressa em três níveis: asas como águias (elevação, perspectiva), correr sem cansar (capacidade para momentos de intensidade), caminhar sem fatigar (resistência para a jornada longa). Deus não promete apenas picos de energia; promete sustentação para o dia a dia.

As águias são conhecidas por usar correntes de ar para planar. Elas não batem as asas constantemente; aprendem a se posicionar para que o vento as sustente. Assim, quando esperamos no Senhor, nos posicionamos para que o Espírito nos sustente.',
'Quando você se sentir fraco hoje, pause. Em vez de insistir na sua própria força, ore: "Senhor, renova minhas forças. Ensina-me a esperar em Ti." Escolha uma tarefa que você estava evitando por cansaço e faça-a confiando que Deus sustenta. Lembre-se: esperar é atitude, não inação.',
'Senhor, renova minhas forças hoje. Ensina-me a esperar em Ti. Que eu suba com asas como águia. Amém.')
ON CONFLICT (day_of_year) DO UPDATE SET titulo = EXCLUDED.titulo, versiculo_ref = EXCLUDED.versiculo_ref, versiculo_texto = EXCLUDED.versiculo_texto, reflexao = EXCLUDED.reflexao, aplicacao = EXCLUDED.aplicacao, oracao = EXCLUDED.oracao, updated_at = NOW();

INSERT INTO bible_devotionals_365 (day_of_year, titulo, versiculo_ref, versiculo_texto, reflexao, aplicacao, oracao) VALUES
(5, 'Tudo Coopera para o Bem', 'Romanos 8:28', 'E sabemos que todas as coisas cooperam para o bem daqueles que amam a Deus, daqueles que são chamados segundo o seu propósito.',
'Romanos 8:28 é uma das promessas mais citadas, mas também uma das mais mal compreendidas. Paulo não diz que todas as coisas são boas. Diz que todas as coisas cooperam para o bem. Há uma diferença crucial: o mal existe, mas Deus pode redirecioná-lo para um fim bom.

A promessa tem um escopo: "aqueles que amam a Deus" e "são chamados segundo o seu propósito". Não é uma garantia universal; é uma realidade para quem está em relacionamento com Deus e alinhado ao Seu chamado. O "bem" aqui não é necessariamente conforto ou sucesso imediato; é o bem maior do propósito de Deus (conformidade à imagem de Cristo, v. 29).

O contexto de Romanos 8 é de sofrimento. Paulo fala de gemidos da criação, de espera, de tribulação. A promessa não remove o sofrimento; ela o coloca em perspectiva. Deus está trabalhando em todas as coisas — inclusive nas dolorosas — para um fim glorioso.

A história de José ilustra: a traição dos irmãos, a escravidão, a prisão — nenhuma daquelas coisas era boa em si. Mas José pôde dizer: "Vós intentastes o mal contra mim; porém Deus o tornou em bem" (Gênesis 50:20).',
'Pense em uma dificuldade recente. Sem minimizar a dor, pergunte: "O que Deus pode estar ensinando ou desenvolvendo em mim através disso?" Escreva uma lição ou crescimento que você já percebeu ou que deseja que Deus produza. Ore entregando essa situação a Ele, confiando na Sua soberania.',
'Deus, ajuda-me a confiar que Tu trabalhas em todas as coisas para o meu bem e para o Teu propósito. Amém.')
ON CONFLICT (day_of_year) DO UPDATE SET titulo = EXCLUDED.titulo, versiculo_ref = EXCLUDED.versiculo_ref, versiculo_texto = EXCLUDED.versiculo_texto, reflexao = EXCLUDED.reflexao, aplicacao = EXCLUDED.aplicacao, oracao = EXCLUDED.oracao, updated_at = NOW();

INSERT INTO bible_devotionals_365 (day_of_year, titulo, versiculo_ref, versiculo_texto, reflexao, aplicacao, oracao) VALUES
(6, 'Nada me Faltará', 'Salmos 23:1', 'O Senhor é o meu pastor; nada me faltará.',
'O Salmo 23 é um dos textos mais amados da Bíblia. A imagem do pastor era familiar no mundo antigo: alguém que guia, protege, alimenta e cuida das ovelhas. Davi, que foi pastor antes de rei, conhecia bem esse papel.

"O Senhor é o meu pastor" — a relação é pessoal. Não é "um pastor" ou "o pastor de muitos", mas "meu pastor". Deus não cuida de nós de forma genérica; Ele nos conhece pelo nome (João 10:3).

"Nada me faltará" não significa que teremos tudo que desejamos. Significa que teremos tudo que precisamos para cumprir o propósito de Deus. O pastor não dá às ovelhas o que elas acham que querem; dá o que é necessário para a jornada. Pastos verdejantes, águas tranquilas, direção — tudo na medida e no tempo certos.

O restante do salmo desdobra essa provisão: descanso, restauração, guia, proteção no vale da sombra da morte, mesa na presença dos inimigos, unção, bondade e misericórdia todos os dias.',
'Faça um exercício de gratidão: liste três coisas que você tem hoje (relacionamentos, saúde, trabalho, alimento, abrigo) e reconheça-as como provisão do Pastor. Depois, identifique uma necessidade real — não um desejo — e apresente-a a Deus em oração, confiando que Ele provê.',
'Pastor meu, obrigado por Teu cuidado. Confio que nada me faltará. Guia-me hoje. Amém.')
ON CONFLICT (day_of_year) DO UPDATE SET titulo = EXCLUDED.titulo, versiculo_ref = EXCLUDED.versiculo_ref, versiculo_texto = EXCLUDED.versiculo_texto, reflexao = EXCLUDED.reflexao, aplicacao = EXCLUDED.aplicacao, oracao = EXCLUDED.oracao, updated_at = NOW();

INSERT INTO bible_devotionals_365 (day_of_year, titulo, versiculo_ref, versiculo_texto, reflexao, aplicacao, oracao) VALUES
(7, 'Confiar no Senhor', 'Provérbios 3:5-6', 'Confia no Senhor de todo o teu coração e não te estribes no teu próprio entendimento. Reconhece-o em todos os teus caminhos, e ele endireitará as tuas veredas.',
'Provérbios 3 é uma exortação do pai ao filho sobre a sabedoria que vem de Deus. O coração, na mentalidade hebraica, representa o centro da vontade, das emoções e do intelecto. "Confiar de todo o coração" é uma entrega total, não parcial.

"Não te estribes no teu próprio entendimento" — nossa sabedoria é limitada. Podemos analisar, planejar e calcular, mas há variáveis que não controlamos. A confiança em Deus não elimina o uso da razão; mas coloca a razão sob a orientação divina.

"Reconhece-o em todos os teus caminhos" — o verbo "reconhecer" (yada) implica conhecimento íntimo e prático. Não é apenas mencionar Deus ocasionalmente; é consultá-Lo, honrá-Lo e incluí-Lo em cada área da vida. Nos caminhos profissionais, familiares, financeiros, ministeriais.

"A ele endireitará as tuas veredas" — a promessa é de direção. Quando confiamos e reconhecemos, Deus endireita. Isso não significa ausência de obstáculos, mas clareza de rumo e propósito.',
'Hoje, antes de uma decisão importante — por menor que seja — pause e ore: "Senhor, não quero me estribar no meu entendimento. Reconheço-Te neste caminho. Guia-me." Anote a decisão e a oração. Ao final do dia, reflita se houve alguma mudança de perspectiva.',
'Senhor, entrego meus planos a Ti. Guia-me pelos Teus caminhos. Não quero confiar no meu próprio entendimento. Amém.')
ON CONFLICT (day_of_year) DO UPDATE SET titulo = EXCLUDED.titulo, versiculo_ref = EXCLUDED.versiculo_ref, versiculo_texto = EXCLUDED.versiculo_texto, reflexao = EXCLUDED.reflexao, aplicacao = EXCLUDED.aplicacao, oracao = EXCLUDED.oracao, updated_at = NOW();

INSERT INTO bible_devotionals_365 (day_of_year, titulo, versiculo_ref, versiculo_texto, reflexao, aplicacao, oracao) VALUES
(8, 'Nova Criatura', '2 Coríntios 5:17', 'Assim que, se alguém está em Cristo, nova criatura é; as coisas velhas já passaram; eis que tudo se fez novo.',
'Paulo está falando sobre a transformação que ocorre quando alguém está "em Cristo". A expressão "em Cristo" aparece centenas de vezes nas cartas paulinas — indica união vital com Jesus, como um ramo na videira (João 15).

"Nova criatura" — no grego, "nova criação" (kaine ktisis). Não é uma reforma ou um upgrade; é uma nova realidade. Como a criação em Gênesis, algo que não existia passa a existir. A identidade em Cristo é radicalmente diferente da identidade anterior.

"As coisas velhas já passaram" — o passado não nos define. Culpa, vergonha, padrões destrutivos, identidades falsas — tudo isso pertence ao "velho homem" que foi crucificado com Cristo (Romanos 6:6). "Eis que tudo se fez novo" — o presente e o futuro são marcados pela novidade de vida.

Isso não significa perfeição instantânea. A santificação é um processo. Mas a identidade fundamental mudou. Somos novas criaturas em processo de manifestar cada vez mais essa realidade.',
'Declare em voz alta: "Em Cristo, sou nova criatura. O passado não me define." Identifique uma "coisa velha" — um pensamento, hábito ou padrão — que você ainda carrega. Em oração, entregue-a a Deus e peça que Ele manifeste a novidade de Cristo nessa área.',
'Obrigado, Jesus, por me fazer nova criatura. Ajuda-me a viver essa nova vida e a deixar as coisas velhas para trás. Amém.')
ON CONFLICT (day_of_year) DO UPDATE SET titulo = EXCLUDED.titulo, versiculo_ref = EXCLUDED.versiculo_ref, versiculo_texto = EXCLUDED.versiculo_texto, reflexao = EXCLUDED.reflexao, aplicacao = EXCLUDED.aplicacao, oracao = EXCLUDED.oracao, updated_at = NOW();

INSERT INTO bible_devotionals_365 (day_of_year, titulo, versiculo_ref, versiculo_texto, reflexao, aplicacao, oracao) VALUES
(9, 'Tudo Posso', 'Filipenses 4:13', 'Posso todas as coisas naquele que me fortalece.',
'Paulo escreve Filipenses da prisão. Ele não está em um momento de sucesso externo; está preso, aguardando julgamento. Mesmo assim, declara: "Posso todas as coisas". O contexto imediato (v. 11-12) revela o que ele quer dizer: aprendeu a viver na abundância e na escassez, na fartura e na fome.

"Todas as coisas" não significa que Paulo poderia fazer qualquer coisa por capricho. Significa que, na vontade de Deus, ele tinha capacidade para enfrentar qualquer circunstância. A força não vinha dele; vinha de Cristo: "naquele que me fortalece".

O verbo "fortalece" (endunamoo) indica poder que é injetado, infundido. Não é força que já temos; é força que recebemos. Quando nos sentimos incapazes, Cristo é nossa capacidade. Quando estamos fracos, Ele é nossa força (2 Coríntios 12:9).

A aplicação é tanto para desafios grandes quanto para o dia a dia. Cada tarefa, cada conversa difícil, cada momento de tentação — podemos pedir a força de Cristo.',
'Identifique uma tarefa ou situação hoje em que você se sente incapaz ou desanimado. Antes de enfrentá-la, ore: "Cristo, fortalece-me. Posso todas as coisas em Ti." Lembre-se: a promessa não é de facilidade, mas de capacidade sustentada por Ele.',
'Cristo, fortalece-me hoje para cumprir a Tua vontade. Em Ti, posso todas as coisas. Amém.')
ON CONFLICT (day_of_year) DO UPDATE SET titulo = EXCLUDED.titulo, versiculo_ref = EXCLUDED.versiculo_ref, versiculo_texto = EXCLUDED.versiculo_texto, reflexao = EXCLUDED.reflexao, aplicacao = EXCLUDED.aplicacao, oracao = EXCLUDED.oracao, updated_at = NOW();

INSERT INTO bible_devotionals_365 (day_of_year, titulo, versiculo_ref, versiculo_texto, reflexao, aplicacao, oracao) VALUES
(10, 'Não Temas', 'Isaías 41:10', 'Não temas, porque eu sou contigo; não te assombres, porque eu sou teu Deus; eu te fortaleço, e te ajudo, e te sustento com a destra da minha justiça.',
'Isaías 41 é dirigido a Israel no exílio. O povo enfrentava incerteza, opressão e a sensação de abandono. Deus intervém com palavras de encorajamento: "Não temas". O imperativo é repetido diversas vezes nas Escrituras — é um dos mandamentos mais frequentes na Bíblia.

"Porque eu sou contigo" — a razão para não temer não é a ausência de ameaças, mas a presença de Deus. O medo é natural; não precisamos nos envergonhar dele. Mas não precisa nos dominar. A presença de Deus dissipa o temor.

"Eu sou teu Deus" — a relação é de aliança. Deus não é um espectador distante; Ele se comprometeu com Seu povo. "Eu te fortaleço, e te ajudo, e te sustento" — três verbos que cobrem necessidade total: força para agir, ajuda no processo, sustento para perseverar.

"A destra da minha justiça" — a mão direita era símbolo de poder e autoridade. A justiça de Deus não é apenas retributiva; é salvadora, protetora.',
'Qual é o seu maior temor hoje? Pode ser relacionado a saúde, finanças, relacionamentos ou futuro. Escreva-o ou diga-o em voz alta. Depois, ore: "Senhor, Tu és comigo. Fortalece-me, ajuda-me, sustenta-me." Repita o versículo como declaração de fé.',
'Senhor, estou contigo. Ajuda-me a não temer. Fortalece-me, ajuda-me e sustenta-me. Amém.')
ON CONFLICT (day_of_year) DO UPDATE SET titulo = EXCLUDED.titulo, versiculo_ref = EXCLUDED.versiculo_ref, versiculo_texto = EXCLUDED.versiculo_texto, reflexao = EXCLUDED.reflexao, aplicacao = EXCLUDED.aplicacao, oracao = EXCLUDED.oracao, updated_at = NOW();

INSERT INTO bible_devotionals_365 (day_of_year, titulo, versiculo_ref, versiculo_texto, reflexao, aplicacao, oracao) VALUES
(11, 'Sê Forte e Corajoso', 'Josué 1:9', 'Não to mandei eu? Esforça-te e tem bom ânimo; não pasmes nem te espantes, porque o Senhor teu Deus é contigo por onde quer que andares.',
'Josué estava prestes a assumir a liderança após a morte de Moisés. A tarefa era imensa: conduzir o povo na conquista de Canaã. O medo era compreensível. Deus repete a ordem três vezes no capítulo: "Esforça-te e tem bom ânimo" (v. 6, 7, 9).

"Não to mandei eu?" — a coragem não é opcional; é resposta a um chamado. Deus não pede que Josué ignore o medo; pede que avance apesar dele. A coragem não é ausência de medo; é obediência na presença do medo.

"O Senhor teu Deus é contigo por onde quer que andares" — a promessa é de presença constante. Não apenas no tabernáculo ou no acampamento, mas em cada passo da jornada. Onde Josué for, Deus estará.

A coragem de Josué não vinha de si mesmo, mas da Palavra. Deus ordena: "Não se aparte da tua boca o livro desta lei" (v. 8). A meditação na Palavra alimenta a coragem.',
'Qual desafio você está evitando por medo? Pode ser uma conversa difícil, um passo profissional ou um compromisso ministerial. Hoje, dê um passo — mesmo pequeno — em direção a esse desafio. Ore antes: "Senhor, Tu estás comigo. Esforço-me e tenho bom ânimo."',
'Deus, dá-me coragem para o que hoje me espera. Tu estás comigo. Esforço-me e tenho bom ânimo. Amém.')
ON CONFLICT (day_of_year) DO UPDATE SET titulo = EXCLUDED.titulo, versiculo_ref = EXCLUDED.versiculo_ref, versiculo_texto = EXCLUDED.versiculo_texto, reflexao = EXCLUDED.reflexao, aplicacao = EXCLUDED.aplicacao, oracao = EXCLUDED.oracao, updated_at = NOW();

INSERT INTO bible_devotionals_365 (day_of_year, titulo, versiculo_ref, versiculo_texto, reflexao, aplicacao, oracao) VALUES
(12, 'Graça e Salvação', 'Efésios 2:8-9', 'Porque pela graça sois salvos, por meio da fé; e isto não vem de vós, é dom de Deus; não vem das obras, para que ninguém se glorie.',
'Paulo deixa claro: a salvação é pela graça, por meio da fé. Graça (charis) é favor imerecido. Não podemos conquistar a salvação; só podemos recebê-la. "Isto não vem de vós" — nem a fé é mérito nosso; é dom de Deus.

"Não vem das obras, para que ninguém se glorie" — se a salvação dependesse de nossas obras, teríamos motivo para orgulho. Mas como é dom, toda glória pertence a Deus. Isso não significa que as obras não importam; Efésios 2:10 mostra que fomos criados para boas obras. Mas as obras são consequência da salvação, não causa.

A fé é o instrumento pelo qual recebemos a graça. Não é a fé em si que salva; é Cristo, a quem a fé se dirige. A fé é a mão vazia que recebe o presente.

Essa verdade deve produzir humildade e gratidão. Nada do que temos em Cristo é por mérito. Tudo é graça.',
'Passe um momento em gratidão silenciosa. Reconheça que sua salvação, sua fé, sua vida em Cristo — tudo é dom. Não há nada que você possa fazer para merecer. Apenas receba e agradeça. Se houver tendência a se comparar com outros ou a julgar, lembre-se: todos somos igualmente dependentes da graça.',
'Obrigado pelo dom da salvação. Recebo Tua graça com gratidão. Que eu nunca me glorie, mas Te glorifique. Amém.')
ON CONFLICT (day_of_year) DO UPDATE SET titulo = EXCLUDED.titulo, versiculo_ref = EXCLUDED.versiculo_ref, versiculo_texto = EXCLUDED.versiculo_texto, reflexao = EXCLUDED.reflexao, aplicacao = EXCLUDED.aplicacao, oracao = EXCLUDED.oracao, updated_at = NOW();

INSERT INTO bible_devotionals_365 (day_of_year, titulo, versiculo_ref, versiculo_texto, reflexao, aplicacao, oracao) VALUES
(13, 'O Caminho, a Verdade e a Vida', 'João 14:6', 'Disse-lhe Jesus: Eu sou o caminho, e a verdade e a vida; ninguém vem ao Pai senão por mim.',
'Jesus responde a Tomé, que perguntou: "Não sabemos para onde vais; e como podemos saber o caminho?" (v. 5). Jesus não dá apenas informações; Ele se apresenta como a resposta. "Eu sou o caminho" — não um caminho entre outros, mas o caminho. Acesso ao Pai é exclusivamente por Cristo.

"E a verdade" — em um mundo de opiniões relativas, Jesus é a verdade absoluta. Ele não apenas ensina a verdade; Ele é a verdade. Sua pessoa, Sua vida, Suas palavras — tudo é revelação definitiva de Deus.

"E a vida" — não apenas vida espiritual futura, mas vida abundante agora (João 10:10). Em Cristo está a fonte da vida. "Ninguém vem ao Pai senão por mim" — a declaração é exclusiva. Não por orgulho, mas por realidade: é através da obra de Cristo na cruz que o acesso ao Pai foi aberto.',
'Em um mundo com muitas vozes sobre "verdade" e "caminho", como você pode afirmar a exclusividade de Cristo com humildade e amor? Pense em alguém que busca sentido espiritual. Ore por essa pessoa e, se oportuno, compartilhe como Jesus é o caminho para você — sem arrogância, com testemunho pessoal.',
'Jesus, Tu és meu caminho, minha verdade e minha vida. Guia-me à presença do Pai. Amém.')
ON CONFLICT (day_of_year) DO UPDATE SET titulo = EXCLUDED.titulo, versiculo_ref = EXCLUDED.versiculo_ref, versiculo_texto = EXCLUDED.versiculo_texto, reflexao = EXCLUDED.reflexao, aplicacao = EXCLUDED.aplicacao, oracao = EXCLUDED.oracao, updated_at = NOW();

INSERT INTO bible_devotionals_365 (day_of_year, titulo, versiculo_ref, versiculo_texto, reflexao, aplicacao, oracao) VALUES
(14, 'Lança sobre Ele tua Ansiedade', '1 Pedro 5:7', 'Lançando sobre ele toda a vossa ansiedade, porque ele tem cuidado de vós.',
'Pedro escreve a igrejas que enfrentam perseguição e sofrimento. No contexto, ele fala sobre humildade (v. 5-6) e sobre resistir ao diabo (v. 8-9). No meio disso, a ordem: "Lançando sobre ele toda a vossa ansiedade".

O verbo "lançar" (epirrhipto) é o mesmo usado quando os discípulos lançaram suas vestes sobre o jumentinho (Lucas 19:35) — uma ação decisiva, de transferência. Não é "pensar em entregar"; é efetivamente lançar, colocar sobre Cristo.

"Toda a vossa ansiedade" — não apenas algumas. Cada preocupação, cada peso, cada "e se" que nos assombra. Deus não quer que carreguemos sozinhos. "Porque ele tem cuidado de vós" — a razão para lançar é que Ele cuida. O cuidado de Deus não é genérico; é pessoal.',
'Faça um exercício prático: escreva em um papel (ou no celular) as três principais ansiedades que você carrega hoje. Depois, em oração, "lance" cada uma sobre Cristo — verbalize que você as entrega a Ele. No final, rasgue o papel ou delete a nota como ato simbólico de entrega.',
'Pai, entrego minhas preocupações a Ti. Tu tens cuidado de mim. Recebe o que carrego. Amém.')
ON CONFLICT (day_of_year) DO UPDATE SET titulo = EXCLUDED.titulo, versiculo_ref = EXCLUDED.versiculo_ref, versiculo_texto = EXCLUDED.versiculo_texto, reflexao = EXCLUDED.reflexao, aplicacao = EXCLUDED.aplicacao, oracao = EXCLUDED.oracao, updated_at = NOW();

INSERT INTO bible_devotionals_365 (day_of_year, titulo, versiculo_ref, versiculo_texto, reflexao, aplicacao, oracao) VALUES
(15, 'O Amor é Paciente', '1 Coríntios 13:4', 'O amor é paciente, o amor é bondoso. Não inveja, não se vangloria, não se ensoberbece.',
'1 Coríntios 13 é o "hino do amor". Paulo descreve o amor (ágape) não como sentimento, mas como conjunto de atitudes e ações. O amor "é" — é uma realidade que se expressa em características.

"O amor é paciente" (makrothumeo) — longanimidade, capacidade de suportar provocações sem retaliar. É a paciência com pessoas, não apenas com circunstâncias. "O amor é bondoso" (chresteuomai) — ativo no bem, útil, gentil. Paciência e bondade são as duas primeiras características, como alicerce.

"Não inveja" — o amor não se ressente do sucesso alheio. "Não se vangloria" — não busca ostentação. "Não se ensoberbece" — não é arrogante. O amor é humilde. Reflete o caráter de Cristo, que esvaziou-se a si mesmo (Filipenses 2:7).',
'Escolha uma pessoa com quem você tem dificuldade em ser paciente — um familiar, colega ou amigo. Hoje, pratique uma ação de bondade específica em relação a ela, mesmo que pequena. Pode ser um elogio sincero, um gesto de ajuda ou simplesmente ouvir sem interromper. Ore pedindo que o amor de Cristo flua através de você.',
'Senhor, ensina-me a amar com paciência e bondade. Que eu não inveje, não me vanglorie, não me ensoberbeça. Amém.')
ON CONFLICT (day_of_year) DO UPDATE SET titulo = EXCLUDED.titulo, versiculo_ref = EXCLUDED.versiculo_ref, versiculo_texto = EXCLUDED.versiculo_texto, reflexao = EXCLUDED.reflexao, aplicacao = EXCLUDED.aplicacao, oracao = EXCLUDED.oracao, updated_at = NOW();

-- ===========================================
-- 5 ESBOÇOS DE PREGAÇÃO
-- ===========================================

INSERT INTO sermon_outlines (category_id, slug, titulo, versiculo_base, introducao, topicos, conclusao, apelo, display_order)
SELECT id, 'avivamento-fogo-santo', 'O Fogo do Avivamento', 'Atos 2:1-4',
'No dia de Pentecostes, o Espírito Santo desceu sobre os discípulos como línguas de fogo. Esse evento marcou o nascimento da Igreja e o início de um avivamento que transformou o mundo. O mesmo fogo que queimou no Cenáculo pode incendiar nossos corações hoje.',
'[{"titulo":"O Fogo Purifica","conteudo":"O fogo do Espírito queima a impureza, o pecado e a indiferença. Antes do avivamento, há convicção. O profeta Isaías, ao ver o Senhor, clamou: \"Ai de mim! Estou perdido!\" (Is 6:5). O fogo santo nos confronta com nossa condição e nos purifica."},{"titulo":"O Fogo Unge","conteudo":"O Espírito desceu sobre cada um (At 2:3). O avivamento não é para uma elite espiritual; é para todo aquele que crê. A unção capacita para o serviço: pregar, curar, testemunhar. Sem o fogo, somos apenas religiosos; com o fogo, somos testemunhas."},{"titulo":"O Fogo Consome","conteudo":"O avivamento não é para ser contido. O fogo se espalha. Os discípulos saíram do Cenáculo e pregaram. Três mil se converteram. O fogo que recebemos é para ser compartilhado — em nossa família, trabalho, comunidade."},{"titulo":"O Fogo Sustenta","conteudo":"O fogo do avivamento não é um momento isolado; é uma chama que deve ser mantida. Os primeiros cristãos perseveravam na doutrina, na comunhão, no partir do pão e nas orações (At 2:42). O avivamento contínuo exige disciplina e busca constante."}]',
'O avivamento começa no coração. Não precisamos esperar um grande evento; precisamos buscar o Fogo. Ele purifica, unge, consome e sustenta. Que o mesmo Espírito que encheu o Cenáculo encha nossa vida hoje.',
'Você está pronto para o fogo? Abra seu coração ao Espírito Santo. Peça que Ele purifique, unja e consuma sua vida. Não saia daqui sem uma decisão: buscar o avivamento diariamente.',
1
FROM sermon_outline_categories WHERE slug = 'avivamento' LIMIT 1
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO sermon_outlines (category_id, slug, titulo, versiculo_base, introducao, topicos, conclusao, apelo, display_order)
SELECT id, 'casamento-alianca-sagrada', 'A Aliança Sagrada do Casamento', 'Gênesis 2:24',
'O casamento não é uma invenção humana; é uma instituição divina. Em Gênesis 2, Deus apresenta a primeira mulher ao primeiro homem e estabelece o padrão: "Deixará o homem seu pai e sua mãe e unir-se-á à sua mulher, e serão uma só carne." O casamento é aliança, não contrato.',
'[{"titulo":"Deixar — A Decisão de Priorizar","conteudo":"O casamento exige que deixemos a dependência dos pais e criemos uma nova unidade. Isso envolve prioridades: o cônjuge vem em primeiro lugar (após Deus). Relacionamentos, hábitos e lealdades antigas devem ser reavaliados à luz do novo compromisso."},{"titulo":"Unir-se — A Decisão de Permanecer","conteudo":"Unir-se é mais que uma cerimônia; é uma fusão de vidas. Duas pessoas com histórias, personalidades e sonhos diferentes escolhem caminhar juntos. A união exige esforço diário: comunicação, perdão, adaptação e renúncia mútua."},{"titulo":"Uma Só Carne — A Decisão de Intimidade","conteudo":"Uma só carne indica unidade integral: emocional, espiritual, física. A intimidade no casamento é sagrada. Não é apenas sexualidade; é conhecimento profundo, vulnerabilidade, cumplicidade. É o lugar onde duas pessoas se tornam uma."},{"titulo":"Honrar a Aliança","conteudo":"Malaquias 2:14 diz que a esposa é \"sua companheira e a mulher da sua aliança\". A aliança é sagrada porque Deus é testemunha. Honrar o casamento é honrar a Deus. Fidelidade, respeito e amor são expressões dessa honra."}]',
'O casamento é um dos maiores presentes de Deus. Exige deixar, unir-se e tornar-se uma só carne. Que os casais aqui presentes renovem seu compromisso e que os solteiros se preparem para esse chamado sagrado.',
'Se você é casado, peça a Deus graça para honrar sua aliança. Se está em crise, não desista — busque ajuda e restauração. Se é solteiro, prepare-se para o casamento com integridade e sabedoria.',
2
FROM sermon_outline_categories WHERE slug = 'casamento' LIMIT 1
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO sermon_outlines (category_id, slug, titulo, versiculo_base, introducao, topicos, conclusao, apelo, display_order)
SELECT id, 'prosperidade-mordomia', 'Prosperidade à Luz da Bíblia', 'Malaquias 3:10',
'A prosperidade bíblica não é a teologia da ganância; é a mordomia fiel dos recursos que Deus nos confia. Malaquias 3:10 convida a trazer os dízimos ao celeiro e experimentar a abertura das janelas do céu. A prosperidade começa com obediência e generosidade.',
'[{"titulo":"Deus é o Dono de Tudo","conteudo":"O Salmo 24:1 declara: \"Do Senhor é a terra e a sua plenitude.\" Nada do que temos é realmente nosso; somos mordomos. Essa perspectiva muda nossa relação com o dinheiro: não acumulamos por orgulho, mas administramos por fidelidade."},{"titulo":"O Dízimo — Reconhecimento e Obediência","conteudo":"O dízimo (10%) não é invenção da igreja; está na Lei (Lv 27:30) e foi praticado antes da Lei (Gn 14:20, 28:22). É reconhecimento de que Deus é a fonte. Trazer o dízimo é ato de adoração e obediência."},{"titulo":"Ofertas — Generosidade Além do Dever","conteudo":"Além do dízimo, a Bíblia fala de ofertas voluntárias. 2 Coríntios 9:7 diz: \"Cada um contribua conforme propôs no seu coração.\" A generosidade é fruto do Espírito. Dar com alegria abre portas para bênçãos."},{"titulo":"Trabalho e Sabedoria","conteudo":"Provérbios ensina que a preguiça leva à pobreza e o trabalho diligente à prosperidade (Pv 10:4, 12:24). A prosperidade bíblica não é mágica; envolve trabalho honesto, planejamento e sabedoria no uso dos recursos."}]',
'A prosperidade que Deus deseja para nós é integral: espiritual, emocional, relacional e material. Ela começa quando reconhecemos que Ele é o dono, obedecemos com o dízimo, somos generosos nas ofertas e trabalhamos com sabedoria.',
'Decida hoje ser um mordomo fiel. Se você não é dizimista, comece. Se já é, avalie suas ofertas e sua generosidade. Peça a Deus sabedoria para administrar o que Ele te confiou.',
3
FROM sermon_outline_categories WHERE slug = 'prosperidade' LIMIT 1
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO sermon_outlines (category_id, slug, titulo, versiculo_base, introducao, topicos, conclusao, apelo, display_order)
SELECT id, 'batalha-armadura-deus', 'A Armadura de Deus', 'Efésios 6:10-18',
'Paulo encerra a carta aos Efésios falando da guerra espiritual. Não lutamos contra carne e sangue, mas contra principados e potestades (Ef 6:12). Por isso, precisamos da armadura de Deus. A batalha é real, mas a vitória já foi conquistada em Cristo.',
'[{"titulo":"Cingir os Lombos com a Verdade","conteudo":"O cinto era a peça que segurava a armadura. A verdade de Deus é nosso fundamento. O inimigo mente; Jesus é a verdade (Jo 14:6). Conhecer e viver a Palavra nos protege da decepção."},{"titulo":"Couraça da Justiça","conteudo":"A couraça protegia o coração. A justiça de Cristo nos cobre — não nossa justiça própria, mas a que recebemos pela fé. Viver em retidão protege nosso coração dos ataques de culpa e condenação."},{"titulo":"Calçar os Pés com o Evangelho","conteudo":"Os pés calçados permitiam firmeza e mobilidade. O evangelho da paz nos dá estabilidade e nos move a proclamar. Estamos prontos para ir e anunciar a boa notícia."},{"titulo":"Escudo da Fé","conteudo":"O escudo apagava os dardos inflamados. A fé em Deus e em Suas promessas extingue os ataques do inimigo — dúvidas, medos, acusações. \"Esta é a vitória que vence o mundo: a nossa fé\" (1 Jo 5:4)."},{"titulo":"Espada do Espírito e Oração","conteudo":"A única arma ofensiva é a Palavra de Deus. Jesus usou a Escritura contra Satanás (Mt 4). A oração em todo tempo completa a armadura. Vigiar e orar nos mantém alertas e conectados ao Comandante."}]',
'A batalha espiritual é real, mas não estamos desprotegidos. A armadura de Deus está disponível. Vista-a diariamente. A vitória já é nossa em Cristo; caminhamos na certeza de que Aquele que está em nós é maior que o que está no mundo.',
'Examine sua vida: há alguma peça da armadura que você não está usando? A verdade, a justiça, o evangelho, a fé, a Palavra, a oração — todas são necessárias. Comprometa-se a vestir a armadura cada dia.',
4
FROM sermon_outline_categories WHERE slug = 'batalha-espiritual' LIMIT 1
ON CONFLICT (category_id, slug) DO NOTHING;

INSERT INTO sermon_outlines (category_id, slug, titulo, versiculo_base, introducao, topicos, conclusao, apelo, display_order)
SELECT id, 'familia-alicerce', 'A Família: Alicerce da Sociedade', 'Josué 24:15',
'Josué proclama: "Eu e a minha casa serviremos ao Senhor." A família é o primeiro lugar onde a fé é transmitida, os valores são formados e o caráter é moldado. Uma sociedade forte começa com famílias fortes.',
'[{"titulo":"A Família como Projeto de Deus","conteudo":"Desde Gênesis, a família é instituição divina. Deus criou homem e mulher, abençoou e disse: \"Frutificai e multiplicai-vos.\" A família não é convenção social; é projeto do Criador para cuidado, companheirismo e formação."},{"titulo":"O Papel dos Pais","conteudo":"Deuteronômio 6:6-7 ordena aos pais: \"Estas palavras estarão no teu coração; e as ensinarás a teus filhos.\" A transmissão da fé é responsabilidade dos pais. Não apenas na igreja, mas em casa, no caminho, ao deitar e ao levantar."},{"titulo":"Honra Entre Gerações","conteudo":"Efésios 6:1-3: filhos, obedecei a vossos pais; pais, não provoqueis vossos filhos. O mandamento com promessa é honrar pai e mãe. A honra entre gerações constrói legado e quebra maldições."},{"titulo":"Casa de Paz e Perdão","conteudo":"A família é lugar de conflito — pessoas imperfeitas sob o mesmo teto. Mas deve ser também lugar de perdão e reconciliação. Colossenses 3:13: \"Suportai-vos uns aos outros e perdoai-vos.\" Um lar de paz é um testemunho poderoso."}]',
'A família é o alicerce. Que nossas casas sejam lugares onde Deus é servido, a fé é transmitida, a honra é praticada e o perdão flui. Como Josué, declare: "Eu e a minha casa serviremos ao Senhor."',
'Se sua família está ferida, busque restauração. Se você é pai ou mãe, assuma o compromisso de ensinar os filhos. Se você é filho, honre seus pais. Que cada casa aqui representada seja um lugar de serviço ao Senhor.',
5
FROM sermon_outline_categories WHERE slug = 'familia' LIMIT 1
ON CONFLICT (category_id, slug) DO NOTHING;

SELECT 'Migration 175: Seed do Ecossistema Bíblico - 15 devocionais e 5 esboços inseridos.' AS status;
