/**
 * Gera migration 179: expande devocionais 31-365 com reflexão completa,
 * aplicação específica e oração completa (estilo bibliaonline.com.br).
 * Execute: node scripts/expand-devotionals-31-365.js > migrations/179_bible_devotionals_expanded.sql
 */
const fs = require('fs');
const path = require('path');

const TEMPLATES = {
  'O amor que transforma': {
    reflexao: `João 3:16 é talvez o versículo mais conhecido da Bíblia, mas sua profundidade vai além da memorização. O amor de Deus não é sentimental ou abstrato — é um amor que age. O termo grego "agapao" descreve um amor de decisão, de entrega total, que não depende do merecimento do amado.

Deus não amou o mundo "um pouco" ou "de longe". Ele amou "de tal maneira" — intensidade incomparável. A prova desse amor foi uma entrega: deu o seu Filho unigênito. O Pai ofereceu o que tinha de mais precioso para resgatar o que estava perdido.

A condição para receber essa vida eterna é a fé: "todo aquele que nele crê". A salvação não é conquista, é recebimento. Não é mérito, é graça. Quando compreendemos essa verdade, nossa identidade é transformada.

Esse amor deve fluir em nós. Jesus disse que o mundo conheceria seus discípulos pelo amor uns pelos outros (João 13:35). O amor que recebemos é para ser compartilhado — na família, no trabalho, na comunidade.`,
    aplicacao: 'Hoje, pratique o amor transformador: (1) Reconheça um momento em que você recebeu graça imerecida e agradeça. (2) Identifique alguém que precisa de um gesto de amor — um colega, familiar ou vizinho — e tome uma ação concreta. (3) No ambiente profissional, escolha responder com graça a uma situação que poderia gerar conflito.',
    oracao: 'Senhor, obrigado por me amar de tal maneira. Ajuda-me a refletir esse amor em cada gesto e palavra de hoje. Que eu seja canal da Tua graça. Amém.'
  },
  'Descanso para a alma': {
    reflexao: `Jesus faz um convite universal: "Vinde a mim". Não é para os religiosos ou para os que têm tudo resolvido. É para os cansados e sobrecarregados. O cansaço pode ser físico, emocional ou espiritual. As cargas podem ser trabalho excessivo, expectativas não atendidas, culpa, dor, ansiedade ou solidão.

No contexto do capítulo, Jesus acabara de falar sobre a sabedoria rejeitada e as cidades impenitentes. Mesmo assim, Ele abre os braços. O convite é gracioso e incondicional. "Eu vos aliviarei" — a promessa é de alívio real, não apenas simbólico.

O descanso que Jesus oferece é diferente do descanso do mundo. O mundo oferece distração; Jesus oferece paz. O mundo oferece fuga temporária; Jesus oferece renovação profunda. É um descanso que alcança a alma — o centro do nosso ser.

Tomar o jugo de Jesus (v. 29) parece paradoxal: trocar uma carga por outra. Mas o jugo de Cristo é suave e o fardo é leve. Por quê? Porque Ele caminha ao nosso lado.`,
    aplicacao: 'Identifique hoje qual carga você está carregando sozinho. Pode ser uma preocupação financeira, um relacionamento difícil ou uma decisão pendente. Em oração, entregue essa carga a Jesus. Literalmente, visualize colocando-a aos pés dEle. Depois, escolha um momento de silêncio — mesmo 5 minutos — para descansar na presença de Deus.',
    oracao: 'Jesus, estou cansado. Recebe-me e dá-me o descanso que só Tu podes dar. Alivia o peso que carrego. Amém.'
  },
  'Planos de esperança': {
    reflexao: `Jeremias 29 foi escrito no exílio babilônico. O povo de Judá estava longe de casa, em terra estranha, sob domínio estrangeiro. A promessa de Deus não veio em tempos de prosperidade, mas no meio da crise. "Eu bem sei os pensamentos que tenho a respeito de vós" — Deus não esqueceu Seu povo.

Os planos de Deus são de paz (shalom) e não de mal. Shalom no hebraico significa muito mais que ausência de guerra; significa plenitude, bem-estar integral, harmonia. Os planos de Deus para nós incluem um futuro e uma esperança.

É importante notar: a promessa não elimina o exílio imediato. Deus diz aos exilados para construir casas, plantar jardins, casar-se e ter filhos (v. 5-6). Ou seja, viver plenamente mesmo no meio da dificuldade. A esperança não é escapista; é encarnada no presente.

Quando não entendemos o que está acontecendo, podemos confiar que o Senhor está no controle. O que parece fim pode ser apenas o começo. A história de José no Egito ilustra isso.`,
    aplicacao: 'Reflita: qual situação atual parece um "exílio" na sua vida? Em vez de esperar que termine para viver plenamente, pergunte a Deus: "O que posso construir, plantar ou investir aqui e agora?" Faça uma ação concreta hoje que expresse esperança — mesmo pequena — no futuro que Deus tem para você.',
    oracao: 'Pai, confio nos Teus planos mesmo quando não entendo. Ajuda-me a viver com esperança no presente. Amém.'
  },
  'Força para o caminho': {
    reflexao: `Isaías 40 é um capítulo de consolo. O profeta contrasta a fragilidade humana com a grandeza de Deus. "Os jovens se cansarão e se fatigarão" (v. 30), mas "os que esperam no Senhor renovam as suas forças".

Esperar no Senhor não é passividade. É confiança ativa. O verbo hebraico "qavah" significa esperar com expectativa, como quem fica na torre vigiando o horizonte. É escolher descansar em Deus enquanto Ele age.

A renovação se expressa em três níveis: asas como águias (elevação, perspectiva), correr sem cansar (capacidade para momentos de intensidade), caminhar sem fatigar (resistência para a jornada longa). Deus não promete apenas picos de energia; promete sustentação para o dia a dia.

As águias são conhecidas por usar correntes de ar para planar. Elas aprendem a se posicionar para que o vento as sustente. Assim, quando esperamos no Senhor, nos posicionamos para que o Espírito nos sustente.`,
    aplicacao: 'Quando você se sentir fraco hoje, pause. Em vez de insistir na sua própria força, ore: "Senhor, renova minhas forças. Ensina-me a esperar em Ti." Escolha uma tarefa que você estava evitando por cansaço e faça-a confiando que Deus sustenta.',
    oracao: 'Senhor, renova minhas forças hoje. Ensina-me a esperar em Ti. Que eu suba com asas como águia. Amém.'
  },
  'Tudo coopera para o bem': {
    reflexao: `Romanos 8:28 é uma das promessas mais citadas, mas também uma das mais mal compreendidas. Paulo não diz que todas as coisas são boas. Diz que todas as coisas cooperam para o bem. Há uma diferença crucial: o mal existe, mas Deus pode redirecioná-lo para um fim bom.

A promessa tem um escopo: "aqueles que amam a Deus" e "são chamados segundo o seu propósito". Não é uma garantia universal; é uma realidade para quem está em relacionamento com Deus. O "bem" aqui não é necessariamente conforto imediato; é o bem maior do propósito de Deus.

O contexto de Romanos 8 é de sofrimento. Paulo fala de gemidos da criação, de espera, de tribulação. A promessa não remove o sofrimento; ela o coloca em perspectiva. Deus está trabalhando em todas as coisas — inclusive nas dolorosas — para um fim glorioso.

A história de José ilustra: a traição dos irmãos, a escravidão, a prisão — nenhuma daquelas coisas era boa em si. Mas José pôde dizer: "Vós intentastes o mal contra mim; porém Deus o tornou em bem" (Gênesis 50:20).`,
    aplicacao: 'Pense em uma dificuldade recente. Sem minimizar a dor, pergunte: "O que Deus pode estar ensinando ou desenvolvendo em mim através disso?" Escreva uma lição ou crescimento que você já percebeu ou que deseja que Deus produza. Ore entregando essa situação a Ele.',
    oracao: 'Deus, ajuda-me a confiar que Tu trabalhas em todas as coisas para o meu bem e para o Teu propósito. Amém.'
  },
  'Nada me faltará': {
    reflexao: `O Salmo 23 é um dos textos mais amados da Bíblia. A imagem do pastor era familiar no mundo antigo: alguém que guia, protege, alimenta e cuida das ovelhas. Davi, que foi pastor antes de rei, conhecia bem esse papel.

"O Senhor é o meu pastor" — a relação é pessoal. Não é "um pastor" ou "o pastor de muitos", mas "meu pastor". Deus não cuida de nós de forma genérica; Ele nos conhece pelo nome (João 10:3).

"Nada me faltará" não significa que teremos tudo que desejamos. Significa que teremos tudo que precisamos para cumprir o propósito de Deus. O pastor não dá às ovelhas o que elas acham que querem; dá o que é necessário para a jornada.

O restante do salmo desdobra essa provisão: descanso, restauração, guia, proteção no vale da sombra da morte, mesa na presença dos inimigos, unção, bondade e misericórdia todos os dias.`,
    aplicacao: 'Faça um exercício de gratidão: liste três coisas que você tem hoje (relacionamentos, saúde, trabalho, alimento, abrigo) e reconheça-as como provisão do Pastor. Depois, identifique uma necessidade real — não um desejo — e apresente-a a Deus em oração.',
    oracao: 'Pastor meu, obrigado por Teu cuidado. Confio que nada me faltará. Guia-me hoje. Amém.'
  },
  'Confiar no Senhor': {
    reflexao: `Provérbios 3 é uma exortação do pai ao filho sobre a sabedoria que vem de Deus. O coração, na mentalidade hebraica, representa o centro da vontade, das emoções e do intelecto. "Confiar de todo o coração" é uma entrega total, não parcial.

"Não te estribes no teu próprio entendimento" — nossa sabedoria é limitada. Podemos analisar, planejar e calcular, mas há variáveis que não controlamos. A confiança em Deus não elimina o uso da razão; mas coloca a razão sob a orientação divina.

"Reconhece-o em todos os teus caminhos" — o verbo "reconhecer" (yada) implica conhecimento íntimo e prático. Não é apenas mencionar Deus ocasionalmente; é consultá-Lo, honrá-Lo e incluí-Lo em cada área da vida.

"A ele endireitará as tuas veredas" — a promessa é de direção. Quando confiamos e reconhecemos, Deus endireita. Isso não significa ausência de obstáculos, mas clareza de rumo e propósito.`,
    aplicacao: 'Hoje, antes de uma decisão importante — por menor que seja — pause e ore: "Senhor, não quero me estribar no meu entendimento. Reconheço-Te neste caminho. Guia-me." Anote a decisão e a oração. Ao final do dia, reflita se houve alguma mudança de perspectiva.',
    oracao: 'Senhor, entrego meus planos a Ti. Guia-me pelos Teus caminhos. Não quero confiar no meu próprio entendimento. Amém.'
  },
  'Nova criatura': {
    reflexao: `Paulo está falando sobre a transformação que ocorre quando alguém está "em Cristo". A expressão "em Cristo" aparece centenas de vezes nas cartas paulinas — indica união vital com Jesus, como um ramo na videira (João 15).

"Nova criatura" — no grego, "nova criação" (kaine ktisis). Não é uma reforma ou um upgrade; é uma nova realidade. Como a criação em Gênesis, algo que não existia passa a existir. A identidade em Cristo é radicalmente diferente da identidade anterior.

"As coisas velhas já passaram" — o passado não nos define. Culpa, vergonha, padrões destrutivos, identidades falsas — tudo isso pertence ao "velho homem" que foi crucificado com Cristo (Romanos 6:6). "Eis que tudo se fez novo" — o presente e o futuro são marcados pela novidade de vida.

Isso não significa perfeição instantânea. A santificação é um processo. Mas a identidade fundamental mudou. Somos novas criaturas em processo de manifestar cada vez mais essa realidade.`,
    aplicacao: 'Declare em voz alta: "Em Cristo, sou nova criatura. O passado não me define." Identifique uma "coisa velha" — um pensamento, hábito ou padrão — que você ainda carrega. Em oração, entregue-a a Deus e peça que Ele manifeste a novidade de Cristo nessa área.',
    oracao: 'Obrigado, Jesus, por me fazer nova criatura. Ajuda-me a viver essa nova vida e a deixar as coisas velhas para trás. Amém.'
  },
  'Tudo posso': {
    reflexao: `Paulo escreve Filipenses da prisão. Ele não está em um momento de sucesso externo; está preso, aguardando julgamento. Mesmo assim, declara: "Posso todas as coisas". O contexto imediato (v. 11-12) revela o que ele quer dizer: aprendeu a viver na abundância e na escassez, na fartura e na fome.

"Todas as coisas" não significa que Paulo poderia fazer qualquer coisa por capricho. Significa que, na vontade de Deus, ele tinha capacidade para enfrentar qualquer circunstância. A força não vinha dele; vinha de Cristo: "naquele que me fortalece".

O verbo "fortalece" (endunamoo) indica poder que é injetado, infundido. Não é força que já temos; é força que recebemos. Quando nos sentimos incapazes, Cristo é nossa capacidade. Quando estamos fracos, Ele é nossa força (2 Coríntios 12:9).

A aplicação é tanto para desafios grandes quanto para o dia a dia. Cada tarefa, cada conversa difícil, cada momento de tentação — podemos pedir a força de Cristo.`,
    aplicacao: 'Identifique uma tarefa ou situação hoje em que você se sente incapaz ou desanimado. Antes de enfrentá-la, ore: "Cristo, fortalece-me. Posso todas as coisas em Ti." Lembre-se: a promessa não é de facilidade, mas de capacidade sustentada por Ele.',
    oracao: 'Cristo, fortalece-me hoje para cumprir a Tua vontade. Em Ti, posso todas as coisas. Amém.'
  },
  'Não temas': {
    reflexao: `Isaías 41 é dirigido a Israel no exílio. O povo enfrentava incerteza, opressão e a sensação de abandono. Deus intervém com palavras de encorajamento: "Não temas". O imperativo é repetido diversas vezes nas Escrituras — é um dos mandamentos mais frequentes na Bíblia.

"Porque eu sou contigo" — a razão para não temer não é a ausência de ameaças, mas a presença de Deus. O medo é natural; não precisamos nos envergonhar dele. Mas não precisa nos dominar. A presença de Deus dissipa o temor.

"Eu sou teu Deus" — a relação é de aliança. Deus não é um espectador distante; Ele se comprometeu com Seu povo. "Eu te fortaleço, e te ajudo, e te sustento" — três verbos que cobrem necessidade total: força para agir, ajuda no processo, sustento para perseverar.

"A destra da minha justiça" — a mão direita era símbolo de poder e autoridade. A justiça de Deus não é apenas retributiva; é salvadora, protetora.`,
    aplicacao: 'Qual é o seu maior temor hoje? Pode ser relacionado a saúde, finanças, relacionamentos ou futuro. Escreva-o ou diga-o em voz alta. Depois, ore: "Senhor, Tu és comigo. Fortalece-me, ajuda-me, sustenta-me." Repita o versículo como declaração de fé.',
    oracao: 'Senhor, estou contigo. Ajuda-me a não temer. Fortalece-me, ajuda-me e sustenta-me. Amém.'
  },
  'Sê forte e corajoso': {
    reflexao: `Josué estava prestes a assumir a liderança após a morte de Moisés. A tarefa era imensa: conduzir o povo na conquista de Canaã. O medo era compreensível. Deus repete a ordem três vezes no capítulo: "Esforça-te e tem bom ânimo" (v. 6, 7, 9).

"Não to mandei eu?" — a coragem não é opcional; é resposta a um chamado. Deus não pede que Josué ignore o medo; pede que avance apesar dele. A coragem não é ausência de medo; é obediência na presença do medo.

"O Senhor teu Deus é contigo por onde quer que andares" — a promessa é de presença constante. Não apenas no tabernáculo ou no acampamento, mas em cada passo da jornada. Onde Josué for, Deus estará.

A coragem de Josué não vinha de si mesmo, mas da Palavra. Deus ordena: "Não se aparte da tua boca o livro desta lei" (v. 8). A meditação na Palavra alimenta a coragem.`,
    aplicacao: 'Qual desafio você está evitando por medo? Pode ser uma conversa difícil, um passo profissional ou um compromisso ministerial. Hoje, dê um passo — mesmo pequeno — em direção a esse desafio. Ore antes: "Senhor, Tu estás comigo. Esforço-me e tenho bom ânimo."',
    oracao: 'Deus, dá-me coragem para o que hoje me espera. Tu estás comigo. Esforço-me e tenho bom ânimo. Amém.'
  },
  'Graça e salvação': {
    reflexao: `Paulo deixa claro: a salvação é pela graça, por meio da fé. Graça (charis) é favor imerecido. Não podemos conquistar a salvação; só podemos recebê-la. "Isto não vem de vós" — nem a fé é mérito nosso; é dom de Deus.

"Não vem das obras, para que ninguém se glorie" — se a salvação dependesse de nossas obras, teríamos motivo para orgulho. Mas como é dom, toda glória pertence a Deus. Isso não significa que as obras não importam; Efésios 2:10 mostra que fomos criados para boas obras. Mas as obras são consequência da salvação, não causa.

A fé é o instrumento pelo qual recebemos a graça. Não é a fé em si que salva; é Cristo, a quem a fé se dirige. A fé é a mão vazia que recebe o presente.

Essa verdade deve produzir humildade e gratidão. Nada do que temos em Cristo é por mérito. Tudo é graça.`,
    aplicacao: 'Passe um momento em gratidão silenciosa. Reconheça que sua salvação, sua fé, sua vida em Cristo — tudo é dom. Não há nada que você possa fazer para merecer. Apenas receba e agradeça. Se houver tendência a se comparar com outros, lembre-se: todos somos igualmente dependentes da graça.',
    oracao: 'Obrigado pelo dom da salvação. Recebo Tua graça com gratidão. Que eu nunca me glorie, mas Te glorifique. Amém.'
  },
  'O caminho, a verdade e a vida': {
    reflexao: `Jesus responde a Tomé, que perguntou: "Não sabemos para onde vais; e como podemos saber o caminho?" (v. 5). Jesus não dá apenas informações; Ele se apresenta como a resposta. "Eu sou o caminho" — não um caminho entre outros, mas o caminho. Acesso ao Pai é exclusivamente por Cristo.

"E a verdade" — em um mundo de opiniões relativas, Jesus é a verdade absoluta. Ele não apenas ensina a verdade; Ele é a verdade. Sua pessoa, Sua vida, Suas palavras — tudo é revelação definitiva de Deus.

"E a vida" — não apenas vida espiritual futura, mas vida abundante agora (João 10:10). Em Cristo está a fonte da vida. "Ninguém vem ao Pai senão por mim" — a declaração é exclusiva. É através da obra de Cristo na cruz que o acesso ao Pai foi aberto.`,
    aplicacao: 'Em um mundo com muitas vozes sobre "verdade" e "caminho", como você pode afirmar a exclusividade de Cristo com humildade e amor? Pense em alguém que busca sentido espiritual. Ore por essa pessoa e, se oportuno, compartilhe como Jesus é o caminho para você.',
    oracao: 'Jesus, Tu és meu caminho, minha verdade e minha vida. Guia-me à presença do Pai. Amém.'
  },
  'Lança sobre Ele tua ansiedade': {
    reflexao: `Pedro escreve a igrejas que enfrentam perseguição e sofrimento. No contexto, ele fala sobre humildade (v. 5-6) e sobre resistir ao diabo (v. 8-9). No meio disso, a ordem: "Lançando sobre ele toda a vossa ansiedade".

O verbo "lançar" (epirrhipto) é o mesmo usado quando os discípulos lançaram suas vestes sobre o jumentinho (Lucas 19:35) — uma ação decisiva, de transferência. Não é "pensar em entregar"; é efetivamente lançar, colocar sobre Cristo.

"Toda a vossa ansiedade" — não apenas algumas. Cada preocupação, cada peso, cada "e se" que nos assombra. Deus não quer que carreguemos sozinhos. "Porque ele tem cuidado de vós" — a razão para lançar é que Ele cuida. O cuidado de Deus não é genérico; é pessoal.`,
    aplicacao: 'Faça um exercício prático: escreva em um papel (ou no celular) as três principais ansiedades que você carrega hoje. Depois, em oração, "lance" cada uma sobre Cristo — verbalize que você as entrega a Ele. No final, rasgue o papel ou delete a nota como ato simbólico de entrega.',
    oracao: 'Pai, entrego minhas preocupações a Ti. Tu tens cuidado de mim. Recebe o que carrego. Amém.'
  },
  'O amor é paciente': {
    reflexao: `1 Coríntios 13 é o "hino do amor". Paulo descreve o amor (ágape) não como sentimento, mas como conjunto de atitudes e ações. O amor "é" — é uma realidade que se expressa em características.

"O amor é paciente" (makrothumeo) — longanimidade, capacidade de suportar provocações sem retaliar. É a paciência com pessoas, não apenas com circunstâncias. "O amor é bondoso" (chresteuomai) — ativo no bem, útil, gentil. Paciência e bondade são as duas primeiras características, como alicerce.

"Não inveja" — o amor não se ressente do sucesso alheio. "Não se vangloria" — não busca ostentação. "Não se ensoberbece" — não é arrogante. O amor é humilde. Reflete o caráter de Cristo, que esvaziou-se a si mesmo (Filipenses 2:7).`,
    aplicacao: 'Escolha uma pessoa com quem você tem dificuldade em ser paciente — um familiar, colega ou amigo. Hoje, pratique uma ação de bondade específica em relação a ela, mesmo que pequena. Pode ser um elogio sincero, um gesto de ajuda ou simplesmente ouvir sem interromper.',
    oracao: 'Senhor, ensina-me a amar com paciência e bondade. Que eu não inveje, não me vanglorie, não me ensoberbeça. Amém.'
  },
  'Refúgio na angústia': {
    reflexao: `O Salmo 46 foi escrito em tempos de grande crise. O título sugere contexto de guerra ou catástrofe nacional. Ainda assim, a abertura é de confiança absoluta: "Deus é o nosso refúgio e fortaleza".

"Refúgio" (machaseh) indica lugar de abrigo, proteção contra perigo. "Fortaleza" (oz) é força, poder. "Socorro bem presente na angústia" — não um socorro distante ou tardio, mas presente, imediato, na hora da necessidade.

O salmo continua: "Ainda que a terra se mude, e ainda que os montes se transportem para o meio do mar" (v. 2). Mesmo no caos total, há estabilidade em Deus. "Não temeremos" (v. 2) — a presença de Deus dissipa o medo.

"Deus está no meio dela; não será abalada" (v. 5). A cidade de Deus — Sua presença entre o povo — não será destruída. Em tempos de angústia pessoal ou coletiva, Ele é nosso refúgio seguro.`,
    aplicacao: 'Identifique a principal angústia que você enfrenta hoje. Pode ser saúde, relacionamento, trabalho ou incerteza sobre o futuro. Em oração, declare: "Deus é meu refúgio e fortaleza." Visualize-se entrando em um lugar seguro na presença dEle. Peça que Ele seja seu socorro presente.',
    oracao: 'Deus, és meu refúgio e fortaleza. Sê meu socorro bem presente na angústia. Acolhe-me hoje. Amém.'
  },
  'Buscai primeiro o reino': {
    reflexao: `Jesus está no Sermão da Montanha, falando sobre preocupações com comida, bebida e vestuário. O contexto é de ansiedade com necessidades básicas. "Os gentios é que procuram todas essas coisas" (v. 32) — os que não conhecem a Deus se preocupam obsessivamente com o material.

"Buscai primeiro o reino de Deus e a sua justiça" — a prioridade é clara. O reino não é um lugar geográfico, mas o governo de Deus na vida. Buscar o reino é buscar que a vontade de Deus seja feita, que Seus valores reinem, que Sua presença seja central.

"E todas essas coisas vos serão acrescentadas" — a promessa não é de riqueza, mas de provisão. Quando colocamos Deus em primeiro lugar, Ele cuida do restante. Não significa ausência de esforço; significa que a ansiedade perde o poder quando a prioridade está certa.

"Basta a cada dia o seu próprio mal" (v. 34) — Jesus não nega as dificuldades; sugere que vivamos um dia de cada vez, confiando no cuidado do Pai.`,
    aplicacao: 'Avalie suas prioridades de hoje. O que está em primeiro lugar na sua agenda? Antes de começar o dia, ore: "Senhor, quero buscar primeiro o Teu reino. Guia-me." Escolha uma decisão prática — tempo de oração, leitura bíblica ou gesto de amor — que coloque Deus em primeiro lugar.',
    oracao: 'Senhor, quero colocar-Te em primeiro lugar hoje. Ajuda-me a buscar o Teu reino e a Tua justiça. Amém.'
  },
  'Amados por Deus': {
    reflexao: `Romanos 5:8 é uma das declarações mais poderosas sobre o amor de Deus. "Deus prova o seu amor" — a prova não é verbal, é histórica: Cristo morreu por nós. O amor de Deus foi demonstrado na cruz.

"Estando nós ainda pecadores" — não é "depois que nos arrependemos" ou "quando nos tornamos bons". É no nosso estado de rebeldia, de distância, de pecado. Deus não esperou que merecêssemos; Ele agiu primeiro.

Esse amor é "ágape" — amor de decisão, não de sentimentos passageiros. É amor que escolhe, que se entrega, que não depende do amado. "Nós amamos porque Ele nos amou primeiro" (1 João 4:19).

A aplicação é dupla: gratidão (não merecemos) e segurança (não precisamos merecer). Nada pode nos separar do amor de Deus que está em Cristo Jesus (Romanos 8:39).`,
    aplicacao: 'Passe um momento reconhecendo que você foi amado quando ainda era pecador. Não por mérito, mas por graça. Se houver culpa ou sensação de "não ser bom o suficiente", lembre-se: o amor de Deus não depende de você. Receba esse amor hoje e agradeça.',
    oracao: 'Obrigado por me amar mesmo quando não mereço. Tu provaste Teu amor na cruz. Recebo esse amor hoje. Amém.'
  },
  'Deus é amor': {
    reflexao: `1 João 4:8 é uma das declarações mais fundamentais da Bíblia sobre a natureza de Deus. "Deus é amor" — não apenas "Deus ama", mas "Deus é amor". O amor não é um atributo entre outros; é a própria essência de Deus.

"Aquele que não ama não conhece a Deus" — conhecer a Deus não é informação intelectual; é relacionamento que transforma. Se Deus é amor, quem O conhece deve amar. O amor é a evidência do conhecimento de Deus.

O capítulo 4 de 1 João enfatiza que o amor vem de Deus (v. 7), que Deus nos amou primeiro (v. 10) e que devemos amar uns aos outros (v. 11). O amor que recebemos é para fluir através de nós.

O amor de Deus em nós não é para ser estocado; é para ser compartilhado. Cada gesto de amor ao próximo é reflexo do amor que recebemos do Pai.`,
    aplicacao: 'Identifique alguém que precisa de amor hoje — pode ser um familiar, um colega ou um desconhecido. Pratique um ato de amor concreto: uma palavra de encorajamento, um gesto de ajuda, um tempo de escuta. Ore pedindo que o amor de Deus flua através de você.',
    oracao: 'Deus, ajuda-me a conhecer-Te e a amar como Tu amas. Que Teu amor flua através de mim hoje. Amém.'
  },
  'Não andeis ansiosos': {
    reflexao: `Filipenses 4:6 é uma ordem direta: "Não andeis ansiosos de coisa alguma". A ansiedade (merimna) no grego indica preocupação que divide a mente, que fragmenta a atenção. Paulo não está dizendo que as preocupações não existem; está dizendo que não precisamos carregá-las sozinhos.

"Em tudo, porém, sejam conhecidas diante de Deus as vossas petições" — a alternativa à ansiedade é a oração. Em vez de ruminar, apresentar. Em vez de carregar, entregar. "Por oração e súplica, com ação de graças" — a gratidão acompanha o pedido.

A promessa que segue (v. 7) é a paz de Deus que guarda o coração e a mente. Essa paz não é ausência de problemas; é presença de Cristo no meio deles. "A paz de Deus, que excede todo o entendimento" — não é lógica humana; é sobrenatural.

Pedro repete a mesma ordem: "Lançando sobre ele toda a vossa ansiedade, porque ele tem cuidado de vós" (1 Pedro 5:7).`,
    aplicacao: 'Quando a ansiedade surgir hoje, pare. Em vez de continuar ruminando, ore: "Pai, entrego esta preocupação a Ti. Obrigado por me ouvir." Escreva a preocupação e a oração. Ao final do dia, verifique se houve paz ao entregar.',
    oracao: 'Pai, entrego minhas necessidades a Ti. Não quero andar ansioso. Obrigado por me ouvir. Amém.'
  }
};

const THEMES_ORDER = [
  'Sê forte e corajoso', 'Graça e salvação', 'O caminho, a verdade e a vida', 'Lança sobre Ele tua ansiedade',
  'O amor é paciente', 'Refúgio na angústia', 'Buscai primeiro o reino', 'Amados por Deus', 'Deus é amor', 'Não andeis ansiosos',
  'O amor que transforma', 'Descanso para a alma', 'Planos de esperança', 'Força para o caminho', 'Tudo coopera para o bem',
  'Nada me faltará', 'Confiar no Senhor', 'Nova criatura', 'Tudo posso', 'Não temas'
];

function escapeSql(str) {
  if (!str) return '';
  return str.replace(/'/g, "''");
}

function main() {
  const out = [];
  out.push('-- Migration 179: Devocionais 31-365 expandidos (estilo bibliaonline.com.br)');
  out.push('-- Reflexao completa, aplicacao especifica, oracao completa');
  out.push('');

  for (let day = 31; day <= 365; day++) {
    const titulo = THEMES_ORDER[(day - 31) % THEMES_ORDER.length];
    const t = TEMPLATES[titulo];
    if (!t) continue;
    const reflexao = escapeSql(t.reflexao);
    const aplicacao = escapeSql(t.aplicacao);
    const oracao = escapeSql(t.oracao);
    out.push(`UPDATE bible_devotionals_365 SET reflexao = '${reflexao}', aplicacao = '${aplicacao}', oracao = '${oracao}', updated_at = NOW() WHERE day_of_year = ${day};`);
  }

  const dest = path.join(__dirname, '..', 'migrations', '179_bible_devotionals_expanded.sql');
  fs.writeFileSync(dest, out.join('\n'), 'utf8');
  console.log('Migration 179 gerada em', dest);
}

main();
