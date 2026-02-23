-- Seed 186: Estudos profundos de cada livro da Bíblia (66 livros)
-- Gerado por scripts/seed-bible-book-studies.js
-- Execute após a migration 185.

INSERT INTO bible_book_studies (book_id, title, content) VALUES ('gn', 'Estudo profundo do livro de Gênesis', 'SIGNIFICADO DO LIVRO

Gênesis significa "origem" ou "princípio". É o primeiro livro da Bíblia e narra as origens do universo, da humanidade, do pecado, das nações e do povo de Israel. O nome vem da tradução grega (Septuaginta) do primeiro verso: "No princípio".

O QUE O LIVRO DEMONSTRA

Gênesis demonstra que Deus é o Criador de tudo, que o homem foi feito à sua imagem e que a queda trouxe consequências para toda a humanidade. Mostra também que Deus escolhe uma linhagem (Abraão) para abençoar todas as famílias da terra e que a promessa e a aliança são cumpridas apesar das falhas humanas.

PERSONAGENS PRINCIPAIS

Adão e Eva (criação e queda); Noé (dilúvio e nova humanidade); Abraão (chamado, aliança, sacrifício de Isaque); Isaque (filho da promessa); Jacó (Israel, do engano à bênção); José (escravidão no Egito, governo e reconciliação com os irmãos); Faraó; os patriarcas das doze tribos.

ESTRUTURA E RESUMO

Cap. 1–11: Origens — Criação (1–2), queda (3), Caim e Abel (4), genealogias e dilúvio (5–9), torre de Babel (10–11). Cap. 12–50: Patriarcas — Abraão (12–25), Isaque (25–27), Jacó (27–36), José e migração para o Egito (37–50).

TEMAS PRINCIPAIS

Criação e soberania de Deus; imagem de Deus no homem; pecado e juízo; graça e eleição; aliança e promessa; bênção e maldição; provação e fé; perdão e reconciliação; preservação do povo de Deus.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('ex', 'Estudo profundo do livro de Êxodo', 'SIGNIFICADO DO LIVRO

Êxodo significa "saída". O livro registra a saída de Israel do Egito sob a liderança de Moisés, a instituição da Páscoa, a travessia do mar, a aliança no Sinai e a construção do tabernáculo. É o segundo livro do Pentateuco.

O QUE O LIVRO DEMONSTRA

Demonstra que Deus liberta o seu povo e o chama para ser reino de sacerdotes. A lei e o tabernáculo mostram como um povo santo deve viver e adorar. A Páscoa prefigura a redenção futura em Cristo.

PERSONAGENS PRINCIPAIS

Moisés (libertador, legislador, mediador); Arão (sumo sacerdote); Faraó (oposição e endurecimento); Miriam; Josué; Bezalel e Aoliabe (artesãos do tabernáculo); Jetro (conselho a Moisés).

ESTRUTURA E RESUMO

Opressão no Egito e chamado de Moisés (1–6); pragas e Páscoa (7–13); travessia do mar e caminhada no deserto (14–18); aliança no Sinai e Dez Mandamentos (19–24); instruções e construção do tabernáculo (25–40).

TEMAS PRINCIPAIS

Libertação e redenção; aliança e lei; santidade de Deus; culto e tabernáculo; provisão e juízo; mediação (Moisés como tipo de Cristo); Páscoa como memorial.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('lv', 'Estudo profundo do livro de Levítico', 'SIGNIFICADO DO LIVRO

Levítico deriva de Levi, a tribo dos sacerdotes. O livro trata das leis de culto, sacrifícios, pureza e santidade, e do papel dos levitas. É o manual para viver na presença de um Deus santo.

O QUE O LIVRO DEMONSTRA

Demonstra que Deus é santo e exige santidade do seu povo. Os sacrifícios apontam para o perdão pelo sangue e para o Sacrifício definitivo. As leis de pureza e as festas ordenam a vida em comunidade e o culto.

PERSONAGENS PRINCIPAIS

Moisés (receptor das leis); Arão e seus filhos (sacerdócio); Nadabe e Abiú (juízo por profanação). O foco é menos em personagens e mais em ritos e normas.

ESTRUTURA E RESUMO

Leis dos sacrifícios (1–7); consagração de Arão e sacerdotes (8–10); leis de pureza e impureza (11–15); Dia da Expiação (16); lei de santidade e moral (17–20); sacerdócio e festas (21–25); bênçãos, maldições e votos (26–27).

TEMAS PRINCIPAIS

Santidade; expiação e sacrifício; sangue e perdão; pureza e impureza; sacerdócio; festas (Páscoa, Pentecostes, Trombetas, Expiação, Tabernáculos); amor ao próximo e justiça.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('nm', 'Estudo profundo do livro de Números', 'SIGNIFICADO DO LIVRO

Números recebe o nome dos censos do povo no deserto (cap. 1 e 26). O livro cobre a jornada do Sinai até as planícies de Moabe, na fronteira de Canaã: organização, rebeldias, juízos e preparação da nova geração.

O QUE O LIVRO DEMONSTRA

Demonstra que a desobediência e a incredulidade impedem a entrada na terra prometida e que Deus disciplina o seu povo, mas mantém a promessa para uma geração que crê. A provisão (maná, água) e a direção (nuvem, arca) mostram o cuidado de Deus.

PERSONAGENS PRINCIPAIS

Moisés; Arão; Miriam; Calebe e Josué (espias fiéis); os rebeldes Coré, Datã e Abirão; Balaão e Balaque; a nova geração que entra em Canaã.

ESTRUTURA E RESUMO

Censo e organização no Sinai (1–10); marcha e murmurações (11–14); anos de peregrinação e juízos (15–19); fim da jornada, vitórias e Balaão (20–25); segundo censo e preparação para a conquista (26–36).

TEMAS PRINCIPAIS

Fé e incredulidade; disciplina divina; provisão e juízo; liderança e rebeldia; santidade no acampamento; herança e limites das tribos; profecia (Balaão) e fidelidade de Deus.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('dt', 'Estudo profundo do livro de Deuteronômio', 'SIGNIFICADO DO LIVRO

Deuteronômio significa "segunda lei". São os discursos de Moisés nas planícies de Moabe, repetindo a lei e exortando Israel a obedecer antes de entrar em Canaã. Funciona como uma "nova aliança" para a nova geração.

O QUE O LIVRO DEMONSTRA

Demonstra que a obediência traz bênção e a desobediência traz maldição. Enfatiza o amor a Deus (Shema), a memória do êxodo e a escolha entre vida e morte. Aponta para um Profeta futuro (Cristo).

PERSONAGENS PRINCIPAIS

Moisés (pregador e profeta); Josué (sucessor); o povo de Israel como destinatário. Referências a Faraó, ao êxodo e aos inimigos como pano de fundo.

ESTRUTURA E RESUMO

Primeiro discurso: revisão da jornada (1–4); segundo discurso: lei e aliança (5–28); terceiro discurso: renovação da aliança e cântico (29–32); bênção de Moisés, sua morte e sucessão de Josué (33–34).

TEMAS PRINCIPAIS

Memória e obediência; amor a Deus (Dt 6); bênção e maldição; centralidade do culto; justiça e compaixão; profeta como Moisés; eleição e fidelidade de Deus.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('js', 'Estudo profundo do livro de Josué', 'SIGNIFICADO DO LIVRO

Josué significa "o Senhor salva". O livro narra a conquista de Canaã sob Josué, sucessor de Moisés, o cumprimento da promessa da terra e a divisão entre as tribos.

O QUE O LIVRO DEMONSTRA

Demonstra que a fidelidade a Deus e a obediência à sua Palavra levam à vitória. A terra é dom e responsabilidade. Rute e Raabe mostram que a graça inclui estrangeiros que se unem ao povo.

PERSONAGENS PRINCIPAIS

Josué; Calebe; Raabe; os doze tribos e seus líderes; os reis cananeus.

ESTRUTURA E RESUMO

Preparação e travessia do Jordão (1–5); conquista do centro e do sul (6–10); conquista do norte (11–12); divisão da terra (13–22); despedida e aliança de Josué (23–24).

TEMAS PRINCIPAIS

Conquista pela fé; santidade da guerra; herança e repartição; memorial e aliança; servir ao Senhor.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('jud', 'Estudo profundo do livro de Juízes', 'SIGNIFICADO DO LIVRO

Juízes relata o período entre Josué e a monarquia, quando Israel é governado por "juízes" (libertadores). O ciclo de apostasia, opressão, clamor e libertação se repete.

O QUE O LIVRO DEMONSTRA

Demonstra que sem rei e sem fidelidade à aliança o povo cai em idolatria e sofre. A graça de Deus levanta libertadores, mas a recaída é constante. "Cada um fazia o que achava certo."

PERSONAGENS PRINCIPAIS

Otniel, Eúde, Débora e Baraque, Gideão, Jefté, Sansão, e outros juízes; reis inimigos (Eglom, Jabim, etc.); Mica e o levita (idolatria).

ESTRUTURA E RESUMO

Introdução: gerações após Josué (1–2); ciclo dos juízes (3–16); idolatria de Mica e guerra contra Benjamim (17–21).

TEMAS PRINCIPAIS

Ciclo de pecado e redenção; liderança carismática; soberania e misericórdia de Deus; consequências da infidelidade; chamado à fidelidade.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('rt', 'Estudo profundo do livro de Rute', 'SIGNIFICADO DO LIVRO

Rute é uma narrativa curta situada "nos dias dos juízes". Uma moabita une-se ao povo de Israel por laços de lealdade e é incorporada à linhagem de Davi e de Cristo.

O QUE O LIVRO DEMONSTRA

Demonstra que a graça de Deus inclui estrangeiros e que a fidelidade (hesed) humana e divina restaura vida e linhagem. Boaz como resgatador prefigura Cristo.

PERSONAGENS PRINCIPAIS

Rute (lealdade e conversão); Noemi (perda e restauração); Boaz (resgatador e esposo); o parente mais próximo.

ESTRUTURA E RESUMO

Rute e Noemi em Moabe e retorno (1); Rute nos campos de Boaz (2); propostas no eirão (3); resgate, casamento e genealogia (4).

TEMAS PRINCIPAIS

Hesed (amor leal); resgatador; inclusão do estrangeiro; providência; linhagem real e messiânica.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('1sm', 'Estudo profundo do livro de 1 Samuel', 'SIGNIFICADO DO LIVRO

1 Samuel cobre a transição dos juízes para a monarquia: o profeta Samuel, a rejeição de Saul e a ascensão de Davi. Trata da realeza humana e da realeza de Deus.

O QUE O LIVRO DEMONSTRA

Demonstra que Deus escolhe segundo o coração (Davi), não apenas pela aparência (Saul). A obediência e a humildade são essenciais; a desobediência e a inveja levam à perda do reino.

PERSONAGENS PRINCIPAIS

Samuel (profeta e juiz); Saul (primeiro rei, rejeitado); Davi (ungido, perseguido); Jônatas; Eli e os filhos; Golias; Abigail.

ESTRUTURA E RESUMO

Samuel e fim do sacerdócio de Siló (1–7); pedido de rei e Saul (8–15); unção de Davi e conflito com Saul (16–31).

TEMAS PRINCIPAIS

Realeza e teocracia; obediência e rejeição; coração segundo Deus; aliança e fidelidade; profecia e reino.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('2sm', 'Estudo profundo do livro de 2 Samuel', 'SIGNIFICADO DO LIVRO

2 Samuel narra o reinado de Davi: unificação, Jerusalém, aliança com Deus, pecado com Bate-Seba e consequências na família e no reino.

O QUE O LIVRO DEMONSTRA

Demonstra que mesmo o rei "segundo o coração de Deus" peca e sofre disciplina, mas a aliança com a casa de Davi permanece. A misericórdia e o juízo andam juntos.

PERSONAGENS PRINCIPAIS

Davi; Bate-Seba; Natã (profeta); Absalão, Amnom e outros filhos; Joabe; Mefibosete.

ESTRUTURA E RESUMO

Davi rei em Hebrom e Jerusalém (1–8); bondade a Mefibosete (9); pecado, Natã e consequências (10–12); Absalão e rebeldia (13–20); apêndices (21–24).

TEMAS PRINCIPAIS

Aliança davídica; pecado e perdão; disciplina e consequências; graça e justiça; reino e templo.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('1kgs', 'Estudo profundo do livro de 1 Reis', 'SIGNIFICADO DO LIVRO

1 Reis continua a história dos reis: fim de Davi, Salomão (templo e sabedoria), divisão do reino (Israel e Judá) e os primeiros reis de ambos até Acabe.

O QUE O LIVRO DEMONSTRA

Demonstra que a sabedoria e o templo glorificam a Deus, mas a desobediência e a idolatria dividem e enfraquecem o reino. O profeta Elias confronta o mal.

PERSONAGENS PRINCIPAIS

Salomão; a rainha de Sabá; Jeroboão e Roboão; Elias; Acabe e Jezabel; Nabote.

ESTRUTURA E RESUMO

Salomão: reinado e templo (1–11); divisão do reino (12–14); reis de Judá e Israel (15–16); Elias e Acabe (17–22).

TEMAS PRINCIPAIS

Templo e culto; sabedoria e riqueza; idolatria e divisão; profecia (Elias); juízo e esperança.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('2kgs', 'Estudo profundo do livro de 2 Reis', 'SIGNIFICADO DO LIVRO

2 Reis segue a história dos dois reinos até a queda de Israel (722 a.C.) e de Judá (586 a.C.) e o exílio. Eliseu e os reis reformadores de Judá têm destaque.

O QUE O LIVRO DEMONSTRA

Demonstra que a infidelidade leva ao exílio e que a palavra dos profetas se cumpre. Ainda assim, a misericórdia aparece em reavivamentos e na preservação da linhagem real.

PERSONAGENS PRINCIPAIS

Eliseu; Jeú; Ezequias; Josias; os últimos reis de Israel e Judá; Naamã; a sunamita.

ESTRUTURA E RESUMO

Eliseu e reis (1–13); reis de Judá e Israel até a queda de Israel (14–17); Judá até a queda e exílio (18–25).

TEMAS PRINCIPAIS

Cumprimento da profecia; fidelidade e apostasia; reforma e decadência; exílio e esperança futura.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('1ch', 'Estudo profundo do livro de 1 Crônicas', 'SIGNIFICADO DO LIVRO

1 Crônicas repassa genealogias desde Adão até Davi e as tribos, e narra o reinado de Davi com foco no culto, na arca e nos preparativos do templo.

O QUE O LIVRO DEMONSTRA

Demonstra a continuidade da aliança e a centralidade do culto e do templo. A história é contada do ponto de vista sacerdotal e davídico, pós-exílio.

PERSONAGENS PRINCIPAIS

Davi; os levitas e cantores; os guerreiros e administradores; Salomão como sucessor.

ESTRUTURA E RESUMO

Genealogias (1–9); Davi rei e captura de Jerusalém (10–21); organização do culto e preparativos do templo (22–29).

TEMAS PRINCIPAIS

Linhagem e aliança; culto e templo; reino e sacerdócio; continuidade da promessa.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('2ch', 'Estudo profundo do livro de 2 Crônicas', 'SIGNIFICADO DO LIVRO

2 Crônicas cobre de Salomão ao exílio, com ênfase em Judá, no templo e nos reis que buscaram o Senhor ou se desviaram.

O QUE O LIVRO DEMONSTRA

Demonstra que a bênção vem da obediência e do culto fiel, e que reformas (como as de Ezequias e Josias) trazem renovação. O exílio é consequência da infidelidade.

PERSONAGENS PRINCIPAIS

Salomão; Roboão; reis de Judá (Asa, Josafá, Ezequias, Josias, etc.); profetas e levitas.

ESTRUTURA E RESUMO

Salomão e construção do templo (1–9); reis de Judá (10–36); queda e édito de Ciro.

TEMAS PRINCIPAIS

Templo e reforma; fidelidade e apostasia; culto e bênção; juízo e esperança de restauração.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('ezr', 'Estudo profundo do livro de Esdras', 'SIGNIFICADO DO LIVRO

Esdras narra o retorno do exílio e a reconstrução do templo (primeira e segunda leva) e a reforma espiritual sob Esdras.

O QUE O LIVRO DEMONSTRA

Demonstra que Deus cumpre sua palavra e restaura o povo. A obediência à lei e a separação do mal são necessárias para uma comunidade santa.

PERSONAGENS PRINCIPAIS

Ciro; Zorobabel; Jesua; Esdras; Artaxerxes; opositores (Samaritanos).

ESTRUTURA E RESUMO

Retorno e altar (1–3); construção do templo e oposição (4–6); Esdras e segunda leva (7–8); problema dos casamentos mistos (9–10).

TEMAS PRINCIPAIS

Restauração e fidelidade de Deus; templo e culto; lei e pureza; comunidade pós-exílio.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('ne', 'Estudo profundo do livro de Neemias', 'SIGNIFICADO DO LIVRO

Neemias relata a reconstrução dos muros de Jerusalém sob Neemias, copeiro do rei, e a renovação da aliança e da vida comunitária.

O QUE O LIVRO DEMONSTRA

Demonstra que a oração, a liderança e o trabalho em conjunto permitem superar oposição. A leitura da Lei e o arrependimento restauram a identidade do povo.

PERSONAGENS PRINCIPAIS

Neemias; Artaxerxes; Sambalate e Tobias (opositores); Esdras; o povo de Judá.

ESTRUTURA E RESUMO

Missão de Neemias e construção dos muros (1–7); leitura da Lei e festa dos tabernáculos (8–10); reformas e dedicação (11–13).

TEMAS PRINCIPAIS

Oração e ação; oposição e perseverança; Lei e aliança; identidade e santidade.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('et', 'Estudo profundo do livro de Ester', 'SIGNIFICADO DO LIVRO

Ester ocorre no período persa: uma judia torna-se rainha e, com Mardoqueu, evita o extermínio dos judeus. O nome de Deus não aparece, mas a providência é clara.

O QUE O LIVRO DEMONSTRA

Demonstra a soberania e a providência de Deus na proteção do povo. Coragem e jejum são instrumentos; o mal (Haman) é derrotado.

PERSONAGENS PRINCIPAIS

Ester; Mardoqueu; Assuero (Xerxes); Haman; Zeres; Hatáque.

ESTRUTURA E RESUMO

Ester rainha (1–2); plano de Haman (3–4); Ester intercede (5–7); vitória e festa de Purim (8–10).

TEMAS PRINCIPAIS

Providência; coragem e risco; reversão do mal; festa e memória (Purim).') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('job', 'Estudo profundo do livro de Jó', 'SIGNIFICADO DO LIVRO

Jó é um poema dramático sobre o sofrimento de um homem íntegro. O debate com os amigos e o discurso de Deus tratam da justiça, do mal e do conhecimento de Deus.

O QUE O LIVRO DEMONSTRA

Demonstra que o sofrimento nem sempre é castigo e que a sabedoria humana é limitada. Deus é soberano e não deve ser reduzido a uma fórmula de retribuição.

PERSONAGENS PRINCIPAIS

Jó; Satanás (acusador); os três amigos (Elifaz, Bildade, Zofar); Eliú; Deus.

ESTRUTURA E RESUMO

Prológo: perda e enfermidade (1–2); diálogos dos amigos e Jó (3–31); Eliú (32–37); Deus responde (38–41); restauração (42).

TEMAS PRINCIPAIS

Sofrimento e justiça; soberania de Deus; limites do conhecimento; integridade e fé.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('ps', 'Estudo profundo do livro de Salmos', 'SIGNIFICADO DO LIVRO

Salmos é o hinário e livro de oração de Israel. Cânticos de louvor, lamentação, gratidão, sabedoria e realeza, atribuídos em grande parte a Davi.

O QUE O LIVRO DEMONSTRA

Demonstra que toda a vida pode ser trazida a Deus em oração e louvor. A confiança no Senhor, o arrependimento e a esperança messiânica estão no centro.

FIGURAS CENTRAIS

Davi (muitos salmos); Asafe; os filhos de Coré; Salomão; Moisés. O "eu" do salmista e o "tu" (Deus) são os polos.

ESTRUTURA E RESUMO

Cinco livros (1–41, 42–72, 73–89, 90–106, 107–150); salmos messiânicos e de entronização; aleluias e doxologias.

TEMAS PRINCIPAIS

Louvor e lamentação; realeza do Senhor e do rei; confiança e refúgio; lei e sabedoria; messianismo.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('prv', 'Estudo profundo do livro de Provérbios', 'SIGNIFICADO DO LIVRO

Provérbios reúne ditados de sabedoria prática sobre o temor do Senhor, o trabalho, a família, a fala e as escolhas que levam à vida ou à morte.

O QUE O LIVRO DEMONSTRA

Demonstra que a sabedoria começa no temor ao Senhor e se expressa em conduta justa. A tolice e o caminho dos ímpios levam à ruína.

FIGURAS CENTRAIS

Salomão (maioria); Lemuel; "a sabedoria" personificada; o filho a quem se instrui; a mulher virtuosa (cap. 31).

ESTRUTURA E RESUMO

Prólogo: convite à sabedoria (1–9); provérbios de Salomão (10–24); mais provérbios e de Agur e Lemuel (25–31).

TEMAS PRINCIPAIS

Temor do Senhor; sabedoria e tolice; justiça e integridade; palavras e trabalho; família e educação.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('ec', 'Estudo profundo do livro de Eclesiastes', 'SIGNIFICADO DO LIVRO

Eclesiastes ("pregador") reflete sobre a vaidade da vida "debaixo do sol" e conclui que o dever do homem é temer a Deus e guardar os seus mandamentos.

O QUE O LIVRO DEMONSTRA

Demonstra que bens, sabedoria e trabalho não preenchem o coração sem Deus. A morte e a incerteza tornam "vaidade" a busca autossuficiente.

FIGURAS CENTRAIS

O Pregador (Qohélet), identificado com o filho de Davi; a experiência humana universal.

ESTRUTURA E RESUMO

Tudo é vaidade (1–2); tempo e trabalho (3–6); sabedoria e limite (7–9); conselhos e conclusão: temer a Deus (10–12).

TEMAS PRINCIPAIS

Vaidade; limite do saber; temor a Deus; desfrute moderado; juízo e morte.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('so', 'Estudo profundo do livro de Cânticos', 'SIGNIFICADO DO LIVRO

Cânticos (Cântico dos Cânticos) é um poema de amor entre um homem e uma mulher. A tradição judaica e cristã também o lê como alegoria do amor de Deus por Israel ou de Cristo pela igreja.

O QUE O LIVRO DEMONSTRA

Demonstra a beleza do amor conjugal e do desejo fiel. Na leitura alegórica, demonstra a intensidade da relação entre Deus e o seu povo.

FIGURAS CENTRAIS

A Sulamita; o amado (rei/pastor); as filhas de Jerusalém; coro.

ESTRUTURA E RESUMO

Diálogos e encontros entre os amados; saudade, busca e união; convite ao amor; epílogo sobre o amor forte como a morte.

TEMAS PRINCIPAIS

Amor e desejo; fidelidade; beleza do corpo e da relação; alegoria divina (interpretação).') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('is', 'Estudo profundo do livro de Isaías', 'SIGNIFICADO DO LIVRO

Isaías é o maior livro profético do AT. Anuncia juízo e restauração, o Messias sofredor e o reino de paz. Abrange o século VIII e visões do futuro.

O QUE O LIVRO DEMONSTRA

Demonstra que Deus é santo e julga o pecado, mas promete um Remidor e um reino eterno. O "Servo do Senhor" sofre pelos muitos; Sião será restaurada.

PERSONAGENS PRINCIPAIS

Isaías; reis (Uzias, Acaz, Ezequias); o Servo do Senhor; Ciro (libertador); nações (Assíria, Babilônia).

ESTRUTURA E RESUMO

Juízo e chamado de Isaías (1–6); Emanuel e Assíria (7–12); oráculos contra nações e apocalipse (13–27); Sião, Ezequias e consolação (28–39); Servo e nova criação (40–66).

TEMAS PRINCIPAIS

Santidade de Deus; juízo e esperança; Servo sofredor; restauração; novo êxodo e nova criação.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('jr', 'Estudo profundo do livro de Jeremias', 'SIGNIFICADO DO LIVRO

Jeremias profetiza em Judá antes e durante a queda de Jerusalém (586 a.C.). Anuncia juízo, exílio e nova aliança. Sua vida e suas palavras se entrelaçam.

O QUE O LIVRO DEMONSTRA

Demonstra que a infidelidade leva à destruição, mas Deus promete nova aliança no coração e restauração. O profeta sofre por anunciar a verdade.

PERSONAGENS PRINCIPAIS

Jeremias; reis (Josias, Joaquim, Zedequias); Baruque; Hananias (falso profeta); Ebed-Meleque; exilados.

ESTRUTURA E RESUMO

Chamado e oráculos iniciais (1–25); conflitos e profecias (26–36); queda de Jerusalém (37–45); oráculos contra nações (46–51); apêndice histórico (52).

TEMAS PRINCIPAIS

Nova aliança; juízo e arrependimento; sofrimento do profeta; restauração futura.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('lm', 'Estudo profundo do livro de Lamentações', 'SIGNIFICADO DO LIVRO

Lamentações são cinco poemas sobre a destruição de Jerusalém (586 a.C.). Tradicionalmente atribuídos a Jeremias. Expressam dor, confissão e esperança.

O QUE O LIVRO DEMONSTRA

Demonstra que o juízo é real e doloroso, mas que a misericórdia do Senhor não acaba. O arrependimento e o clamor abrem espaço para a esperança.

FIGURAS CENTRAIS

Sião/Jerusalém personificada; o "eu" que lamenta; Deus como juiz e esperança.

ESTRUTURA E RESUMO

Cinco capítulos (poemas acrósticos em parte): devastação, ira de Deus, aflição, contraste passado/presente, clamor e confissão.

TEMAS PRINCIPAIS

Luto e sofrimento; pecado e juízo; misericórdia; esperança no meio da dor.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('ez', 'Estudo profundo do livro de Ezequiel', 'SIGNIFICADO DO LIVRO

Ezequiel profetiza no exílio (Babilônia). Visões (glória de Deus, vale de ossos, novo templo), atos simbólicos e oráculos de juízo e restauração.

O QUE O LIVRO DEMONSTRA

Demonstra que a glória do Senhor deixa o templo por causa do pecado, mas voltará. Deus restaura o coração e a nação; há responsabilidade individual.

PERSONAGENS PRINCIPAIS

Ezequiel; a glória do Senhor; Israel e Judá; reis e pastores; nações (Tiro, Egito, etc.).

ESTRUTURA E RESUMO

Chamado e visões iniciais (1–7); partida da glória (8–11); juízo e alegorias (12–24); oráculos contra nações (25–32); restauração e novo templo (33–48).

TEMAS PRINCIPAIS

Glória de Deus; responsabilidade individual; pastor e rebanho; ressurreição (ossos); novo templo e terra.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('dn', 'Estudo profundo do livro de Daniel', 'SIGNIFICADO DO LIVRO

Daniel narra a vida de jovens fiéis no exílio e as visões apocalípticas sobre reinos e o reino eterno do Filho do homem.

O QUE O LIVRO DEMONSTRA

Demonstra que Deus reina sobre os impérios e que a fidelidade em ambiente hostil é recompensada. O reino de Deus virá e vencerá.

PERSONAGENS PRINCIPAIS

Daniel; Hananias, Misael e Azarias; Nabucodonosor; Belsazar; Dario; Ciro; o Filho do homem (visão).

ESTRUTURA E RESUMO

Daniel e amigos na Babilônia (1–6); visões: quatro reinos e reino eterno (7–8); setenta semanas e visão final (9–12).

TEMAS PRINCIPAIS

Soberania de Deus; fidelidade e provação; reinos e reino de Deus; ressurreição e juízo final.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('ho', 'Estudo profundo do livro de Oseias', 'SIGNIFICADO DO LIVRO

Oseias profetiza no reino do Norte (Israel) no séc. VIII. Sua vida conjugal com Gomer ilustra a infidelidade de Israel e o amor restaurador de Deus.

O QUE O LIVRO DEMONSTRA

Demonstra que a idolatria é adultério espiritual e que Deus busca restaurar o povo por amor. Juízo e esperança se alternam.

PERSONAGENS PRINCIPAIS

Oseias; Gomer e os filhos (nomes simbólicos); Israel (Efraim) e Judá.

ESTRUTURA E RESUMO

Casamento de Oseias e mensagem (1–3); oráculos de juízo e apelo ao arrependimento (4–11); restauração futura (12–14).

TEMAS PRINCIPAIS

Amor de Deus; infidelidade; arrependimento; restauração.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('jl', 'Estudo profundo do livro de Joel', 'SIGNIFICADO DO LIVRO

Joel interpreta uma praga de gafanhotos como dia do Senhor e convida ao arrependimento. Anuncia o derramamento do Espírito e o juízo final.

O QUE O LIVRO DEMONSTRA

Demonstra que o dia do Senhor é tanto juízo quanto esperança. O arrependimento abre a porta à bênção e ao Espírito.

FIGURAS CENTRAIS

Joel; o povo de Judá; o Senhor; exércitos e nações no juízo.

ESTRUTURA E RESUMO

Praga e chamado ao arrependimento (1–2); promessa do Espírito e do dia do Senhor (2–3).

TEMAS PRINCIPAIS

Dia do Senhor; arrependimento; Espírito; juízo e salvação.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('am', 'Estudo profundo do livro de Amós', 'SIGNIFICADO DO LIVRO

Amós, pastor de Judá, profetiza contra Israel (Norte) no séc. VIII: injustiça social e culto vazio serão julgados.

O QUE O LIVRO DEMONSTRA

Demonstra que Deus exige justiça e retidão; ritual sem ética é rejeitado. Há esperança de restauração da tenda de Davi.

PERSONAGENS PRINCIPAIS

Amós; Amazias (sacerdote de Betel); Israel e nações vizinhas.

ESTRUTURA E RESUMO

Oráculos contra nações e Israel (1–2); discursos de juízo (3–6); visões (7–9); promessa de restauração (9).

TEMAS PRINCIPAIS

Justiça social; verdadeiro culto; dia do Senhor; restauração.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('ob', 'Estudo profundo do livro de Obadias', 'SIGNIFICADO DO LIVRO

Obadias é o menor livro do AT. Oráculo contra Edom por ter se alegrado na queda de Jerusalém; anuncia o dia do Senhor e a posse de Israel.

O QUE O LIVRO DEMONSTRA

Demonstra que a violência contra irmãos e a soberba serão julgadas. O reino será do Senhor.

FIGURAS CENTRAIS

Edom; Israel/Judá; o Senhor.

ESTRUTURA E RESUMO

Condenação de Edom (1–14); dia do Senhor e vitória de Israel (15–21).

TEMAS PRINCIPAIS

Juízo sobre Edom; dia do Senhor; restauração de Israel.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('jn', 'Estudo profundo do livro de Jonas', 'SIGNIFICADO DO LIVRO

Jonas é enviado a Nínive mas foge; após ser lançado ao mar e salvo, prega e Nínive se arrepende. Deus ensina a Jonas sobre misericórdia.

O QUE O LIVRO DEMONSTRA

Demonstra que a misericórdia de Deus se estende aos inimigos que se arrependem e que o profeta não pode limitar a compaixão divina.

PERSONAGENS PRINCIPAIS

Jonas; o Senhor; os marinheiros; o grande peixe; o povo e o rei de Nínive; a planta e o verme.

ESTRUTURA E RESUMO

Fuga e tempestade (1); oração no peixe (2); pregação e arrependimento em Nínive (3); descontentamento de Jonas e lição (4).

TEMAS PRINCIPAIS

Misericórdia de Deus; arrependimento; missão; soberania.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('mi', 'Estudo profundo do livro de Miqueias', 'SIGNIFICADO DO LIVRO

Miqueias profetiza em Judá no séc. VIII. Denuncia opressão e falsos profetas; anuncia Belém como origem do governante e restauração.

O QUE O LIVRO DEMONSTRA

Demonstra que Deus exige fazer justiça, amar misericórdia e andar humildemente. O rei virá de Belém.

PERSONAGENS PRINCIPAIS

Miqueias; Samaria e Jerusalém; líderes e profetas; o futuro governante.

ESTRUTURA E RESUMO

Juízo sobre Samaria e Judá (1–3); reino de paz e Belém (4–5); acusação e esperança (6–7).

TEMAS PRINCIPAIS

Justiça e misericórdia; Belém e o Messias; juízo e restauração.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('na', 'Estudo profundo do livro de Naum', 'SIGNIFICADO DO LIVRO

Naum anuncia a queda de Nínive (capital assíria), inimiga de Judá. O Senhor é juiz e refúgio.

O QUE O LIVRO DEMONSTRA

Demonstra que a crueldade e a soberba dos impérios não ficam impunes. Deus vindica o seu povo.

FIGURAS CENTRAIS

O Senhor; Nínive/Assíria; Judá.

ESTRUTURA E RESUMO

Salmo sobre o Senhor (1); queda de Nínive (2–3).

TEMAS PRINCIPAIS

Juízo; soberania de Deus; refúgio para os fiéis.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('hk', 'Estudo profundo do livro de Habacuque', 'SIGNIFICADO DO LIVRO

Habacuque questiona por que Deus tolera a injustiça; o Senhor responde que usará os caldeus e depois os julgará. O justo vive pela fé.

O QUE O LIVRO DEMONSTRA

Demonstra que a fé no Deus soberano sustenta quando a justiça tarda. O justo vive pela fé (fórmula citada em Romanos e Gálatas).

PERSONAGENS PRINCIPAIS

Habacuque; o Senhor; os caldeus.

ESTRUTURA E RESUMO

Diálogo: por que a injustiça? (1–2); oráculo e "o justo viverá pela fé" (2); oração e confiança (3).

TEMAS PRINCIPAIS

Justiça de Deus; fé; dia do Senhor; confiança.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('zp', 'Estudo profundo do livro de Sofonias', 'SIGNIFICADO DO LIVRO

Sofonias anuncia o dia do Senhor contra Judá e as nações (séc. VII). Restauração para os humildes.

O QUE O LIVRO DEMONSTRA

Demonstra que o dia do Senhor é universal; só os que buscam o Senhor em humildade serão poupados.

FIGURAS CENTRAIS

Sofonias; Judá; nações; o remanescente.

ESTRUTURA E RESUMO

Juízo universal (1); contra Judá e nações (2); Jerusalém e promessa (3).

TEMAS PRINCIPAIS

Dia do Senhor; humildade; restauração.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('hg', 'Estudo profundo do livro de Ageu', 'SIGNIFICADO DO LIVRO

Ageu exorta os que voltaram do exílio a priorizar a reconstrução do templo (520 a.C.). As bênçãos dependem da obediência.

O QUE O LIVRO DEMONSTRA

Demonstra que a negligência do culto traz escassez e que o Senhor está com o povo na obra do templo. O desejo das nações virá.

PERSONAGENS PRINCIPAIS

Ageu; Zorobabel; Josué (sumo sacerdote); o povo.

ESTRUTURA E RESUMO

Chamado a construir (1); encorajamento e glória futura (2).

TEMAS PRINCIPAIS

Templo; prioridades; bênção; esperança messiânica.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('zc', 'Estudo profundo do livro de Zacarias', 'SIGNIFICADO DO LIVRO

Zacarias encoraja a reconstrução do templo com visões e oráculos. Anuncia o rei humilde, o Pastor ferido e o dia do Senhor.

O QUE O LIVRO DEMONSTRA

Demonstra que o Senhor lembra de Jerusalém e que o reino virá pelo Rei humilde (citado nos evangelhos). Juízo e salvação se entrelaçam.

PERSONAGENS PRINCIPAIS

Zacarias; Josué; Zorobabel; o Anjo do Senhor; o rei montado em jumento; o Pastor.

ESTRUTURA E RESUMO

Chamado ao arrependimento (1); visões (1–6); prática de justiça e reis (7–8); reinado futuro e pastor (9–14).

TEMAS PRINCIPAIS

Templo; rei humilde; pastor; dia do Senhor.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('ml', 'Estudo profundo do livro de Malaquias', 'SIGNIFICADO DO LIVRO

Malaquias debate com o povo pós-exílio: culto relaxado, dízimos, divórcio. Anuncia o mensageiro e o dia do Senhor.

O QUE O LIVRO DEMONSTRA

Demonstra que honrar a Deus em culto e vida abre as janelas do céu; o dia do Senhor trará juízo e sol nascerá para os que temem o nome do Senhor.

FIGURAS CENTRAIS

Malaquias; os sacerdotes; o povo; o mensageiro (João Batista na interpretação neotestamentária).

ESTRUTURA E RESUMO

Diálogos: amor de Deus, ofertas, divórcio (1–2); dízimos e dia do Senhor (3–4).

TEMAS PRINCIPAIS

Honra a Deus; dízimo; mensageiro; dia do Senhor.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('mt', 'Estudo profundo do livro de Mateus', 'SIGNIFICADO DO LIVRO

Mateus apresenta Jesus como o Messias rei, cumpridor das Escrituras. Escrito para judeus, enfatiza o reino dos céus e a autoridade de Jesus.

O QUE O LIVRO DEMONSTRA

Demonstra que Jesus é o cumprimento da lei e dos profetas, o Filho de Davi e o Filho de Deus. O reino é oferecido a Israel e, na rejeição, estende-se a todas as nações.

PERSONAGENS PRINCIPAIS

Jesus; os doze discípulos; João Batista; Maria e José; fariseus e saduceus; Pilatos; mulheres no túmulo.

ESTRUTURA E RESUMO

Infância e início do ministério (1–4); Sermão da Montanha (5–7); milagres e missão (8–10); parábolas e conflitos (11–18); rumo a Jerusalém (19–25); paixão e ressurreição (26–28).

TEMAS PRINCIPAIS

Reino dos céus; cumprimento das Escrituras; ensino (Sermão, parábolas); igreja; grande comissão.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('mk', 'Estudo profundo do livro de Marcos', 'SIGNIFICADO DO LIVRO

Marcos é o evangelho mais curto e dinâmico. Jesus é o Filho de Deus que serve e dá a vida em resgate; o segredo messiânico e a cruz são centrais.

O QUE O LIVRO DEMONSTRA

Demonstra que o Messias veio para servir e morrer. Seguir a Jesus é tomar a cruz. A narrativa é ágil e focada em ação.

PERSONAGENS PRINCIPAIS

Jesus; os doze; João Batista; a multidão; líderes judaicos; Pilatos; mulheres; o centurião.

ESTRUTURA E RESUMO

Início e ministério na Galileia (1–8); rumo a Jerusalém e ensino (8–10); Jerusalém, templo e paixão (11–16).

TEMAS PRINCIPAIS

Servo sofredor; reino; discipulado e cruz; fé.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('lk', 'Estudo profundo do livro de Lucas', 'SIGNIFICADO DO LIVRO

Lucas escreve uma narrativa ordenada para Teófilo. Jesus é o Salvador que inclui marginalizados, pobres e gentios. O Espírito e a oração têm destaque.

O QUE O LIVRO DEMONSTRA

Demonstra que a salvação é para todos. Parábolas como o filho pródigo e o bom samaritano mostram o coração de Deus. Jesus ora e é guiado pelo Espírito.

PERSONAGENS PRINCIPAIS

Jesus; Maria; os doze; Zaqueu; Marta e Maria; o bom samaritano; Lázaro; mulheres; Pilatos e Herodes.

ESTRUTURA E RESUMO

Nascimento e infância (1–2); ministério na Galileia (3–9); rumo a Jerusalém (9–19); paixão e ressurreição (19–24).

TEMAS PRINCIPAIS

Salvação universal; Espírito e oração; pobres e marginalizados; alegria.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('jo', 'Estudo profundo do livro de João', 'SIGNIFICADO DO LIVRO

João apresenta Jesus como o Verbo encarnado, o Filho de Deus. Sinais e discursos revelam a vida eterna em Cristo. Escrito para crer e ter vida.

O QUE O LIVRO DEMONSTRA

Demonstra que Jesus é Deus conosco; fé nele traz vida eterna. Luz, vida, pão, pastor, ressurreição e verdade são temas que apontam para sua identidade.

PERSONAGENS PRINCIPAIS

Jesus; João Batista; os discípulos (especialmente Pedro e o amado); Maria; Nicodemos; a samaritana; Lázaro; Pilatos.

ESTRUTURA E RESUMO

Prólogo e primeiros sinais (1–4); conflitos e sinais (5–12); última ceia e discurso (13–17); paixão e ressurreição (18–21).

TEMAS PRINCIPAIS

Crer e vida eterna; sinais; eu sou; amor; Espírito Parácleto.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('act', 'Estudo profundo do livro de Atos', 'SIGNIFICADO DO LIVRO

Atos dos Apóstolos narra a expansão do evangelho de Jerusalém a Roma sob a ação do Espírito. Lucas continua a história de Jesus na igreja.

O QUE O LIVRO DEMONSTRA

Demonstra que o Espírito capacita a testemunha até os confins da terra. Perseguição e concílios não impedem o crescimento; Paulo leva o evangelho aos gentios.

PERSONAGENS PRINCIPAIS

Pedro; Estêvão; Filipe; Paulo (Saulo); Barnabé; Tiago; Ananias; Cornélio; reis e governadores.

ESTRUTURA E RESUMO

Pentecostes e igreja em Jerusalém (1–7); perseguição e Filipe (8); conversão de Paulo (9); Pedro e Cornélio (10–12); viagens de Paulo (13–28).

TEMAS PRINCIPAIS

Espírito Santo; testemunha; igreja; inclusão dos gentios; sofrimento e avanço.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('rm', 'Estudo profundo do livro de Romanos', 'SIGNIFICADO DO LIVRO

Romanos é a carta sistemática de Paulo sobre o evangelho: justificação pela fé, vida no Espírito, lugar de Israel e ética.

O QUE O LIVRO DEMONSTRA

Demonstra que todos pecaram e são justificados pela fé em Cristo; o Espírito santifica; Israel tem lugar no plano de Deus; o amor cumpre a lei.

FIGURAS CENTRAIS

Paulo; Abraão (exemplo de fé); Adão e Cristo (tipos); Israel e gentios.

ESTRUTURA E RESUMO

Justificação pela fé (1–5); nova vida e lei (6–8); Israel (9–11); ética e amor (12–15); saudações (16).

TEMAS PRINCIPAIS

Justificação; fé; Espírito; eleição; ética.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('1co', 'Estudo profundo do livro de 1 Coríntios', 'SIGNIFICADO DO LIVRO

Paulo corrige divisões, imoralidade, litígios e abusos na ceia e nos cultos em Corinto. Ensinos sobre ressurreição e amor.

O QUE O LIVRO DEMONSTRA

Demonstra que a igreja deve ser santa e unida; o amor é o caminho maior; a ressurreição de Cristo é base da esperança.

PERSONAGENS PRINCIPAIS

Paulo; a igreja de Corinto; Apolo; Cefas; Cristo.

ESTRUTURA E RESUMO

Divisões e sabedoria (1–4); imoralidade e litígios (5–6); casamento e liberdade (7–10); culto e ceia (11–14); ressurreição (15); oferta e despedida (16).

TEMAS PRINCIPAIS

Unidade; santidade; amor (cap. 13); ressurreição; ordem no culto.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('2co', 'Estudo profundo do livro de 2 Coríntios', 'SIGNIFICADO DO LIVRO

Paulo defende seu ministério e exorta à reconciliação e à oferta. Fala de fraqueza e do poder de Cristo, do sofrimento e da glória.

O QUE O LIVRO DEMONSTRA

Demonstra que o ministério apostólico é de fragilidade humana e glória de Deus; a generosidade é fruto da graça.

PERSONAGENS PRINCIPAIS

Paulo; a igreja; os falsos apóstolos; Tito.

ESTRUTURA E RESUMO

Consolo e perdão (1–2); glória do ministério (3–5); integridade e sofrimento (6–7); oferta (8–9); defesa apostólica (10–13).

TEMAS PRINCIPAIS

Ministério; fraqueza e poder; reconciliação; oferta.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('gl', 'Estudo profundo do livro de Gálatas', 'SIGNIFICADO DO LIVRO

Paulo combate os que exigiam circuncisão e lei para os gálatas. A justificação é só pela fé; a liberdade em Cristo não é licença.

O QUE O LIVRO DEMONSTRA

Demonstra que o evangelho não admite outro; lei e graça são antagônicas para justificação; o Espírito produz o fruto.

PERSONAGENS PRINCIPAIS

Paulo; os gálatas; os judaizantes; Pedro (Antioquia); Abraão.

ESTRUTURA E RESUMO

Defesa do evangelho (1–2); fé vs obras da lei (3–4); liberdade e fruto do Espírito (5–6).

TEMAS PRINCIPAIS

Justificação pela fé; liberdade; fruto do Espírito; cruz.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('eph', 'Estudo profundo do livro de Efésios', 'SIGNIFICADO DO LIVRO

Efésios expõe o plano de Deus de unir todas as coisas em Cristo; a igreja é corpo e noiva; a vida digna da vocação.

O QUE O LIVRO DEMONSTRA

Demonstra que os crentes foram escolhidos, redimidos e selados; a igreja é uma; a conduta deve refletir a nova identidade.

FIGURAS CENTRAIS

Paulo; a igreja; Cristo cabeça; as forças espirituais.

ESTRUTURA E RESUMO

Bênção e plano de Deus (1–3); andar em unidade e luz (4–6).

TEMAS PRINCIPAIS

Eleição; igreja; armadura de Deus; unidade.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('ph', 'Estudo profundo do livro de Filipenses', 'SIGNIFICADO DO LIVRO

Paulo agradece e exorta os filipenses à alegria e à humildade. Cristo esvaziou-se e foi exaltado; o crente deve ter o mesmo sentimento.

O QUE O LIVRO DEMONSTRA

Demonstra que a alegria vem de Cristo; o contentamento e a humildade são possíveis nele; sofrer por Cristo é graça.

PERSONAGENS PRINCIPAIS

Paulo; os filipenses; Cristo; Epafrodito; Timóteo.

ESTRUTURA E RESUMO

Agradecimento e oração (1); humildade de Cristo (2); justiça e meta (3); contentamento e gratidão (4).

TEMAS PRINCIPAIS

Alegria; kenosis; contentamento; comunhão.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('cl', 'Estudo profundo do livro de Colossenses', 'SIGNIFICADO DO LIVRO

Paulo combate filosofias e práticas que diminuem a suficiência de Cristo. Cristo é a plenitude; a vida escondida nele é a verdadeira.

O QUE O LIVRO DEMONSTRA

Demonstra a supremacia de Cristo sobre tudo; a vida nova é em Cristo; a família e o trabalho são vividos para o Senhor.

PERSONAGENS PRINCIPAIS

Paulo; a igreja em Colossos; Cristo; Tíquico; Onésimo.

ESTRUTURA E RESUMO

Cristo preeminente (1–2); vida nova e práticas (3–4).

TEMAS PRINCIPAIS

Supremacia de Cristo; plenitude; vida escondida; família.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('1ts', 'Estudo profundo do livro de 1 Tessalonicenses', 'SIGNIFICADO DO LIVRO

Paulo encoraja os tessalonicenses na fé e na esperança; esclarece a vinda do Senhor e a ressurreição dos que morreram.

O QUE O LIVRO DEMONSTRA

Demonstra que o evangelho produz fé, amor e esperança; a santificação e a vinda de Cristo são motivações.

PERSONAGENS PRINCIPAIS

Paulo; Silas; Timóteo; a igreja em Tessalônica.

ESTRUTURA E RESUMO

Agradecimento e defesa (1–3); santificação e vinda do Senhor (4–5).

TEMAS PRINCIPAIS

Vinda de Cristo; ressurreição; santificação; trabalho.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('2ts', 'Estudo profundo do livro de 2 Tessalonicenses', 'SIGNIFICADO DO LIVRO

Paulo corrige a ideia de que o dia do Senhor já chegou; o homem do pecado será revelado; exorta à firmeza e ao trabalho.

O QUE O LIVRO DEMONSTRA

Demonstra que sinais precedem o dia do Senhor; os que creem devem permanecer firmes e trabalhar.

PERSONAGENS PRINCIPAIS

Paulo; a igreja; o homem do pecado; o Senhor Jesus.

ESTRUTURA E RESUMO

Consolo na perseguição (1); o dia do Senhor e o rebelde (2); exortação e oração (3).

TEMAS PRINCIPAIS

Dia do Senhor; homem do pecado; firmeza; trabalho.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('1tm', 'Estudo profundo do livro de 1 Timóteo', 'SIGNIFICADO DO LIVRO

Paulo orienta Timóteo sobre a ordem na igreja: ensino sadio, oração, qualificação de bispos e diáconos, cuidado com falsos mestres.

O QUE O LIVRO DEMONSTRA

Demonstra que a igreja precisa de ordem, doutrina correta e líderes íntegros. A piedade tem valor para esta vida e para a futura.

PERSONAGENS PRINCIPAIS

Paulo; Timóteo; a igreja; falsos mestres.

ESTRUTURA E RESUMO

Contra falsos ensinos (1); oração e papel da mulher (2); bispos e diáconos (3); conselhos a Timóteo (4–6).

TEMAS PRINCIPAIS

Doutrina; ordem; liderança; piedade.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('2tm', 'Estudo profundo do livro de 2 Timóteo', 'SIGNIFICADO DO LIVRO

Última carta de Paulo: exorta Timóteo a guardar o depósito, sofrer como soldado de Cristo e pregar a palavra. Paulo prevê o fim próximo.

O QUE O LIVRO DEMONSTRA

Demonstra que o ministério exige fidelidade, sofrimento e transmissão da verdade a outros. A Escritura é inspirada e útil.

PERSONAGENS PRINCIPAIS

Paulo; Timóteo; desertores; o Senhor.

ESTRUTURA E RESUMO

Exortação à fidelidade (1–2); últimos dias e pregação (3–4).

TEMAS PRINCIPAIS

Fidelidade; sofrimento; Escritura; coroa.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('tt', 'Estudo profundo do livro de Tito', 'SIGNIFICADO DO LIVRO

Paulo deixa Tito em Creta para organizar igrejas e nomear presbíteros. Ensino sobre graça e boas obras.

O QUE O LIVRO DEMONSTRA

Demonstra que a graça ensina a viver de modo piedoso; líderes e grupos (idosos, jovens, servos) devem refletir a doutrina.

PERSONAGENS PRINCIPAIS

Paulo; Tito; os cretenses.

ESTRUTURA E RESUMO

Presbíteros e falsos (1); grupos e conduta (2–3).

TEMAS PRINCIPAIS

Graça; boas obras; liderança; grupos.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('phm', 'Estudo profundo do livro de Filemom', 'SIGNIFICADO DO LIVRO

Paulo intercede por Onésimo, escravo fugido que se tornou irmão em Cristo. Pede que Filemom o receba como tal.

O QUE O LIVRO DEMONSTRA

Demonstra que o evangelho transforma relações; a fraternidade em Cristo supera status social; o apelo é pelo amor.

PERSONAGENS PRINCIPAIS

Paulo; Filemom; Onésimo; Apia; Arquipo.

ESTRUTURA E RESUMO

Saudação e gratidão (1–7); apelo por Onésimo (8–22); despedida (23–25).

TEMAS PRINCIPAIS

Reconciliação; fraternidade; amor; transformação.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('hb', 'Estudo profundo do livro de Hebreus', 'SIGNIFICADO DO LIVRO

Hebreus exalta Cristo como superior aos anjos, a Moisés e ao sacerdócio levítico. Exorta a perseverar na fé e a não retroceder.

O QUE O LIVRO DEMONSTRA

Demonstra que a nova aliança em Cristo é superior; uma vez conhecida a verdade, rejeitá-la é trágico. A fé dos antigos é modelo.

FIGURAS CENTRAIS

Cristo (sumo sacerdote); Melquisedeque; Abraão; os heróis da fé (cap. 11); os destinatários.

ESTRUTURA E RESUMO

Cristo superior (1–7); nova aliança e sacrifício (8–10); fé e perseverança (11–13).

TEMAS PRINCIPAIS

Superioridade de Cristo; sacerdócio; fé; perseverança.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('jm', 'Estudo profundo do livro de Tiago', 'SIGNIFICADO DO LIVRO

Tiago exorta a viver a fé em obras: provações, sabedoria, favoritismo, língua, riqueza, paciência. Fé sem obras é morta.

O QUE O LIVRO DEMONSTRA

Demonstra que a fé genuína produz frutos; a sabedoria vem do alto; o juízo será sem misericórdia para quem não teve misericórdia.

FIGURAS CENTRAIS

Tiago; os doze tribos (destinatários); Abraão; Raabe.

ESTRUTURA E RESUMO

Provações e sabedoria (1); fé e obras (2); língua e sabedoria (3); conflitos e riqueza (4–5).

TEMAS PRINCIPAIS

Fé e obras; sabedoria; língua; juízo.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('1pe', 'Estudo profundo do livro de 1 Pedro', 'SIGNIFICADO DO LIVRO

Pedro encoraja crentes na dispersão a suportar sofrimento com esperança. São pedras vivas, povo de Deus; a conduta deve glorificar a Cristo.

O QUE O LIVRO DEMONSTRA

Demonstra que o sofrimento por Cristo é honra; a esperança viva (ressurreição) sustenta; autoridades e escravos devem ser respeitados.

PERSONAGENS PRINCIPAIS

Pedro; os eleitos da dispersão; Cristo (pedra, pastor).

ESTRUTURA E RESUMO

Salvação e santidade (1–2); conduta em sociedade (2–3); sofrimento e ministério (4–5).

TEMAS PRINCIPAIS

Esperança; sofrimento; santidade; pastor.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('2pe', 'Estudo profundo do livro de 2 Pedro', 'SIGNIFICADO DO LIVRO

Pedro exorta à firmeza na verdade, alerta contra falsos mestres e confirma a esperança da vinda do Senhor. A Escritura é inspirada.

O QUE O LIVRO DEMONSTRA

Demonstra que o conhecimento de Cristo leva à piedade; os falsos serão julgados; a demora do Senhor é paciência, não falha.

PERSONAGENS PRINCIPAIS

Pedro; os destinatários; falsos profetas; Paulo (suas cartas).

ESTRUTURA E RESUMO

Virtudes e chamado (1); falsos mestres (2); vinda do Senhor (3).

TEMAS PRINCIPAIS

Conhecimento; falsos mestres; Escritura; parousia.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('1jo', 'Estudo profundo do livro de 1 João', 'SIGNIFICADO DO LIVRO

João escreve sobre comunhão com Deus: Deus é luz e amor; quem permanece em Cristo ama e obedece. Critérios para discernir espíritos.

O QUE O LIVRO DEMONSTRA

Demonstra que o amor a Deus e ao irmão são indissociáveis; a confissão de Cristo encarnado é essencial; a vitória é dos que creem.

FIGURAS CENTRAIS

João; os filhos; o mundo; o anticristo; Deus e Cristo.

ESTRUTURA E RESUMO

Luz e comunhão (1–2); filhos de Deus e amor (3–4); fé e vida eterna (5).

TEMAS PRINCIPAIS

Amor; verdade; anticristo; confiança.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('2jo', 'Estudo profundo do livro de 2 João', 'SIGNIFICADO DO LIVRO

João exorta a "senhora eleita" a amar e a não receber quem não confessa Cristo vindo em carne (anticristos).

O QUE O LIVRO DEMONSTRA

Demonstra que a verdade e o amor andam juntos; hospedar falsos mestres é participar do mal.

FIGURAS CENTRAIS

João; a senhora eleita e seus filhos; os enganadores.

ESTRUTURA E RESUMO

Saudação; andar na verdade e no amor; não receber o anticristo; despedida.

TEMAS PRINCIPAIS

Verdade; amor; anticristo; hospitalidade.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('3jo', 'Estudo profundo do livro de 3 João', 'SIGNIFICADO DO LIVRO

João elogia Gaio pela hospitalidade aos missionários e condena Diótrefes, que rejeita a autoridade e espalha calúnias.

O QUE O LIVRO DEMONSTRA

Demonstra que acolher os que pregam a verdade é cooperar com a verdade; a ambição e a difamação são pecado.

PERSONAGENS PRINCIPAIS

João; Gaio; Diótrefes; Demétrio.

ESTRUTURA E RESUMO

Elogio a Gaio; reprovação a Diótrefes; recomendação de Demétrio; despedida.

TEMAS PRINCIPAIS

Hospitalidade; verdade; cooperação; conduta.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('jd', 'Estudo profundo do livro de Judas', 'SIGNIFICADO DO LIVRO

Judas exorta a contender pela fé contra os que pervertem a graça e negam o Senhor. Cita Enoque e exemplos do AT de juízo.

O QUE O LIVRO DEMONSTRA

Demonstra que a apostasia e a imoralidade serão julgadas; os santos devem edificar-se na fé e manter-se no amor de Deus.

FIGURAS CENTRAIS

Judas; os intrusos; exemplos (anjos, Sodoma, Caim, Balaão); Enoque; o Senhor.

ESTRUTURA E RESUMO

Motivo da carta (1–4); descrição dos ímpios (5–16); exortação e doxologia (17–25).

TEMAS PRINCIPAIS

Fé; apostasia; juízo; perseverança.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();
INSERT INTO bible_book_studies (book_id, title, content) VALUES ('re', 'Estudo profundo do livro de Apocalipse', 'SIGNIFICADO DO LIVRO

Apocalipse (revelação) anuncia o que em breve deve acontecer: vitória do Cordeiro, juízo, nova criação. Visões simbólicas e números (7, 12, 666, 1000) comunicam a mensagem.

O QUE O LIVRO DEMONSTRA

Demonstra que Cristo reina e voltará; o mal será derrotado; os que vencem herdam a nova Jerusalém. A adoração e a fidelidade são a resposta do povo de Deus.

PERSONAGENS PRINCIPAIS

João; Cristo (Cordeiro, Cavaleiro); os sete igrejas; a besta e o falso profeta; a mulher e o dragão; a noiva (Jerusalém).

ESTRUTURA E RESUMO

Cristo e as sete igrejas (1–3); selos, trombetas e taças (4–16); Babilônia e vitória (17–20); nova criação e noiva (21–22).

TEMAS PRINCIPAIS

Reino de Cristo; juízo; fidelidade; nova criação; esperança.') ON CONFLICT (book_id) DO UPDATE SET title = EXCLUDED.title, content = EXCLUDED.content, updated_at = NOW();

SELECT 'Seed 186: 66 estudos de livros inseridos/atualizados.' AS status;