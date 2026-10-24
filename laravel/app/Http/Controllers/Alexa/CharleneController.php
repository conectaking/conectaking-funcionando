<?php

namespace App\Http\Controllers\Alexa;

use App\Http\Controllers\Controller;
use App\Models\CharleneMemory;
use App\Services\CartaoVirtual\BibleDevotionalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CharleneController extends Controller
{
    private string $storageDir;
    private string $baseUrl;

    // Categorias de músicas suportadas
    public const CATEGORIAS = ['adoracao', 'dormir', 'animadas', 'geral'];

    // Catálogo mestre com 45 histórias da Bíblia Sagrada (Antigo e Novo Testamento)
    public const HISTORIAS_CATALOGO = [
        [
            'slug' => 'davi_golias',
            'titulo' => 'Davi e o Gigante Golias',
            'personagem' => 'Davi',
            'tema' => 'Davi e o Gigante Golias',
            'licoes' => 'coragem, fé e que quem confia em Deus vence qualquer gigante',
            'historia_base' => 'Era uma vez um jovem pastorzinho chamado Davi que cuidava das ovelhinhas cantando louvores ao Papai do Céu! Quando o gigante Golias tentou assustar todo o povo com uma voz muito brava, Davi não teve medo, porque sabia que o Deus Todo-Poderoso estava ao seu lado! Davi pegou a sua fundinha e uma pedrinha lisa no riacho. Girou, girou, zun! A pedrinha voou e venceu o gigante na hora! Todo mundo comemorou e aprendeu que quem confia em Deus nunca precisa ter medo de nada! Sarahzinha, você também é uma princesinha corajosa e protegida por Jesus! Quer ouvir outra historinha ou uma musiquinha agora?'
        ],
        [
            'slug' => 'arca_noe',
            'titulo' => 'A Arca de Noé, os Animais e o Arco-Íris',
            'personagem' => 'Noé',
            'tema' => 'A Arca de Noé e o Arco-Íris',
            'licoes' => 'obediência, proteção de Deus aos animais e a promessa do arco-íris',
            'historia_base' => 'Noé era um homem muito obediente a Deus. O Papai do Céu pediu para ele construir uma arca gigante de madeira, ploc, ploc, ploc! Depois, vieram os leõezinhos, os elefantes, os coelhinhos e as girafas, entrando de dois em dois! A chuva caiu, chuá, chuá, mas dentro da arca todos estavam quentinhos e protegidos por Deus! Quando a chuva passou, uma pombinha trouxe um raminho de oliveira e Deus colocou no céu um arco-íris lindo e colorido como promessa de amor! Sarahzinha, o Papai do Céu sempre cumpre as Suas promessas de amor com você e sua família! Quer ouvir outra historinha agora?'
        ],
        [
            'slug' => 'daniel_leoes',
            'titulo' => 'Daniel na Cova dos Leões Famintos',
            'personagem' => 'Daniel',
            'tema' => 'Daniel na Cova dos Leões Famintos',
            'licoes' => 'oração fiel diária e como o anjo do Senhor fechou a boca dos leões',
            'historia_base' => 'Daniel amava orar a Deus três vezes ao dia, de joelhinhos perto da janela aberta. Homens maus tiveram inveja e jogaram Daniel numa cova funda cheia de leões com fome! Mas Daniel continuou orando e confiando no Papai do Céu. E sabe o que aconteceu? Deus enviou um anjo resplandecente que fechou a boca de todos os leões! No dia seguinte, o rei chamou: "Daniel, o seu Deus te salvou?" E Daniel respondeu com alegria: "O meu Deus enviou o Seu anjo e os leões não me tocaram!" Que Deus maravilhoso nós servimos, Sarahzinha! Nada pode tocar em você quando você ora com fé!'
        ],
        [
            'slug' => 'moises_mar_vermelho',
            'titulo' => 'Moisés e a Grande Travessia do Mar Vermelho',
            'personagem' => 'Moisés',
            'tema' => 'Moisés e a Travessia do Mar Vermelho',
            'licoes' => 'o poder de Deus abrindo caminhos onde parecia não ter saída',
            'historia_base' => 'O povo de Deus estava caminhando no deserto e chegou diante de um mar imenso de água azul: o Mar Vermelho! Atrás vinham os soldados do Faraó em carruagens, pocotó, pocotó! O povo ficou com medo, mas Moisés disse: "Não tenham medo, vejam a salvação do Senhor!" Moisés estendeu o seu cajado sobre as águas e Deus mandou um vento forte que abriu o mar ao meio! O povo atravessou a pé enxuto com paredes de água dos dois lados! Deus sempre abre caminhos para você, Sarahzinha, onde parece impossível!'
        ],
        [
            'slug' => 'jonas_grande_peixe',
            'titulo' => 'Jonas e o Grande Peixe',
            'personagem' => 'Jonas',
            'tema' => 'Jonas e o Grande Peixe',
            'licoes' => 'obedecer a voz do Senhor e a segunda chance que Deus nos dá',
            'historia_base' => 'Deus chamou Jonas para levar uma mensagem de amor a Nínive, mas Jonas tentou fugir num barquinho. Uma grande tempestade balançou o mar, e quando Jonas caiu na água, tchibum! Deus preparou um peixe bem grandão que engoliu Jonas! Lá dentro da barriguinha do peixe, Jonas orou com todo o coração e pediu perdão. Deus ouviu a oração e o grande peixe levou Jonas até a praia e o colocou na areia sã e salvo! Jonas foi a Nínive e todo mundo se converteu! Deus sempre nos ouve onde quer que a gente esteja, Sarahzinha!'
        ],
        [
            'slug' => 'multiplicacao_paes',
            'titulo' => 'A Multiplicação dos Pães e Peixinhos',
            'personagem' => 'Jesus e o menino dos pães',
            'tema' => 'A Multiplicação dos Pães e Peixinhos',
            'licoes' => 'generosidade, partilha e como Jesus faz o milagre com o pouco que temos',
            'historia_base' => 'Mais de cinco mil pessoas estavam ouvindo Jesus ensinar sobre o amor de Deus, e quando a tarde chegou, todos estavam com muita fome! Os discípulos disseram que não havia comida, mas um garotinho generoso ofereceu o seu lanchinho: cinco pães pequenininhos e dois peixinhos. Jesus pegou o lanchinho, olhou para o Céu e deu graças ao Pai. Quando começou a repartir, a comida foi se multiplicando sem parar! Todos comeram até ficarem satisfeitos e ainda sobraram doze cestos cheios! Jesus abençoa e multiplica tudo que entregamos com carinho em Suas mãos!'
        ],
        [
            'slug' => 'jesus_acalma_tempestade',
            'titulo' => 'Jesus Acalma a Tempestade no Mar',
            'personagem' => 'Jesus',
            'tema' => 'Jesus Acalma a Tempestade no Mar',
            'licoes' => 'paz, segurança e que mesmo quando o vento sopra forte, Jesus está no nosso barquinho',
            'historia_base' => 'Jesus e os discípulos entraram num barquinho para atravessar o mar da Galileia. Jesus estava dormindo com a cabecinha num travesseiro. De repente, começou a chover forte, o vento uivava e as ondas começaram a encher o barco de água! Os discípulos ficaram apavorados e acordaram o Mestre: "Senhor, nós vamos afundar!" Jesus levantou-se com calma, olhou para o vento e para o mar e disse: "Acalma-te! Emudece!" Na mesma hora o vento parou e houve uma grande bonança e calmaria! Sarahzinha, Jesus está sempre no barquinho da sua vida trazendo muita paz!'
        ],
        [
            'slug' => 'nascimento_jesus',
            'titulo' => 'O Nascimento do Bebê Jesus em Belém',
            'personagem' => 'Jesus, Maria e José',
            'tema' => 'O Nascimento do Bebê Jesus em Belém',
            'licoes' => 'o maior presente de amor que o Papai do Céu deu ao mundo',
            'historia_base' => 'Numa noite cheia de estrelas brilhantes, Maria e José chegaram a Belém. Como não havia lugar na hospedaria, eles ficaram num estábulo aconchegante cercado de ovelhinhas e vaquinhas mansas. E foi ali que o bebê Jesus nasceu, embrulhadinho em panos e deitado numa manjedoura! No céu, um coral de anjos cantou louvores lindos: "Glória a Deus nas maiores alturas e paz na terra!" Pastores vieram adorar o Salvador do mundo. Jesus é a maior luz e o melhor amigo que podemos ter em nosso coração, Sarahzinha!'
        ],
        [
            'slug' => 'rainha_ester',
            'titulo' => 'A Corajosa Rainha Ester',
            'personagem' => 'Rainha Ester',
            'tema' => 'A Rainha Ester, Cheia de Coragem',
            'licoes' => 'coragem de uma princesa de Deus para salvar o seu povo com oração e jejum',
            'historia_base' => 'Ester era uma jovem judia muito virtuosa, linda e temente a Deus que foi escolhida para ser a rainha. Quando um homem mau tentou fazer mal ao povo de Deus, o tio Mordecai lembrou Ester: "Quem sabe se não foi para um momento como este que você chegou ao palácio?" Ester pediu a todo o povo que orasse junto com ela por três dias. Cheia da graça e do Espírito de Deus, Ester foi diante do rei, que estendeu o seu cetro de ouro para ela! O povo foi salvo com honra e vitória! Sarahzinha, você também é uma linda princesinha de Deus com um propósito abençoado!'
        ],
        [
            'slug' => 'zaqueu_arvore',
            'titulo' => 'Zaqueu, o Homem Pequenino na Árvore',
            'personagem' => 'Zaqueu',
            'tema' => 'Zaqueu, o Homem Pequenino na Árvore',
            'licoes' => 'Jesus enxerga a todos com amor e transforma o coração de quem O recebe',
            'historia_base' => 'Zaqueu era um homem de baixa estatura que queria muito ver Jesus passando pelas ruas de Jericó. Como a multidão era alta e ele não conseguia enxergar, ele correu na frente e subiu nos galhos de uma árvore sicômoro! Quando Jesus passou bem por ali, olhou para cima com um sorriso amoroso e disse: "Zaqueu, desce depressa, pois hoje me convém pousar em sua casa!" Zaqueu desceu correndo e alegre recebeu Jesus. Seu coração mudou para sempre e ele se tornou generoso e bom! Jesus sempre enxerga você onde você estiver, Sarahzinha!'
        ],
        [
            'slug' => 'jose_egito',
            'titulo' => 'José do Egito e a Túnica Colorida',
            'personagem' => 'José',
            'tema' => 'José do Egito e a Túnica Colorida',
            'licoes' => 'perdão, fidelidade nos sonhos e como Deus transforma o mal em grande bênção',
            'historia_base' => 'José ganhou do papai Jacó uma túnica cheia de cores lindas! Ele teve sonhos proféticos dados por Deus, mas seus irmãos tiveram inveja e o venderam como escravo para o Egito. Mesmo passando por momentos difíceis, José nunca deixou de ser fiel e justo com Deus. Deus deu a José sabedoria para interpretar os sonhos do Faraó e José se tornou o governador de todo o Egito! Quando seus irmãos vieram com fome, José os perdoou com lágrimas de alegria e cuidou de toda a sua família! O amor e o perdão sempre vencem, Sarahzinha!'
        ],
        [
            'slug' => 'cura_cego_bartimeu',
            'titulo' => 'A Cura do Cego Bartimeu',
            'personagem' => 'Bartimeu',
            'tema' => 'A Cura do Cego Bartimeu',
            'licoes' => 'clamar a Jesus com perseverança e receber a luz do Senhor',
            'historia_base' => 'À beira do caminho de Jericó, um homem chamado Bartimeu não enxergava as cores do dia nem o brilho do sol. Quando ouviu que Jesus de Nazaré estava passando, ele começou a gritar com muita fé: "Jesus, Filho de Davi, tem misericórdia de mim!" As pessoas mandavam ele se calar, mas ele gritava ainda mais alto! Jesus parou a caminhada e mandou chamá-lo: "O que você quer que eu te faça?" Bartimeu respondeu: "Senhor, que eu possa enxergar!" Jesus tocou seus olhos e disse: "Vai, a tua fé te salvou!" E na mesma hora ele começou a ver tudo perfeitamente e seguiu a Jesus pelo caminho com louvores!'
        ],
        [
            'slug' => 'o_bom_samaritano',
            'titulo' => 'O Bom Samaritano',
            'personagem' => 'O Bom Samaritano',
            'tema' => 'O Bom Samaritano',
            'licoes' => 'amor ao próximo, cuidar de quem precisa e ter um coração bondoso',
            'historia_base' => 'Jesus contou uma história de um viajante que foi atacado na estrada e ficou caído e machucado. Passou um sacerdote e não ajudou; passou um levita e também desviou o caminho. Mas quando passou um samaritano, o coração dele se encheu de profunda compaixão! Ele limpou as feridinhas com azeite, colocou o homem em seu próprio animalzinho e o levou para uma hospedaria, pagando todo o cuidado dele com muito carinho! Jesus nos ensinou que amar a Deus é cuidar com ternura de qualquer pessoa que precise de ajuda!'
        ],
        [
            'slug' => 'sansao_forca',
            'titulo' => 'Sansão e a Grande Força que Vem de Deus',
            'personagem' => 'Sansão',
            'tema' => 'Sansão e a Força que Vem de Deus',
            'licoes' => 'nossa verdadeira força vem do Espírito de Deus quando somos fiéis a Ele',
            'historia_base' => 'Sansão foi consagrado a Deus desde pequenino. Quando o Espírito do Senhor vinha sobre ele, ele tinha uma força extraordinária! Certa vez, um leão rugiu feroz no caminho, mas Sansão o venceu apenas com as mãos vazias! Quando os inimigos o cercaram com cordas novas, ele arrebentou tudo como se fossem fios queimados! Sansão nos ensina que a nossa verdadeira força não está em músculos ou cabelos, mas em obedecer e estar perto do Papai do Céu com fidelidade!'
        ],
        [
            'slug' => 'rute_noemi',
            'titulo' => 'Rute e Noemi: A Amizade Fiel',
            'personagem' => 'Rute e Noemi',
            'tema' => 'Rute e a Amizade Fiel',
            'licoes' => 'lealdade, companheirismo e cuidado amoroso com a família',
            'historia_base' => 'Noemi estava muito triste em uma terra distante, mas sua nora Rute deu um abraço caloroso nela e fez uma promessa eterna: "Onde você for, eu irei; o seu povo será o meu povo e o seu Deus será o meu Deus!" Elas foram juntas para Belém, e Rute colhia espigas nos campos para alimentar Noemi. Boaz, um homem bondoso, viu a dedicação de Rute e cuidou delas com toda a generosidade! Rute se casou com Boaz e fez parte da genealogia do rei Davi e de Jesus! A amizade e a lealdade na família são preciosas aos olhos do Senhor!'
        ],
        [
            'slug' => 'pescaria_maravilhosa',
            'titulo' => 'A Pescaria Maravilhosa de Pedro',
            'personagem' => 'Pedro e Jesus',
            'tema' => 'A Pescaria Milagrosa de Pedro',
            'licoes' => 'confiar na palavra de Jesus mesmo quando parecia que nada daria certo',
            'historia_base' => 'Pedro e os outros pescadores passaram a noite inteira no mar jogando as redes na água, mas não pescaram nenhum peixinho sequer. De manhã, cansados e lavando as redes, Jesus chegou e disse a Pedro: "Vá para as águas mais profundas e lancem as redes para pescar!" Pedro disse: "Mestre, trabalhamos a noite inteira e nada pegamos; mas, sob a Tua palavra, lançarei as redes!" Quando puxaram, tchibum! Havia tantos peixes que as redes começaram a se romper e dois barcos ficaram cheinhos quase afundando de tanta bênção! A palavra de Jesus faz milagres acontecerem!'
        ],
        [
            'slug' => 'ressurreicao_jesus',
            'titulo' => 'A Ressurreição de Jesus: Ele Vive!',
            'personagem' => 'Jesus Ressuscitado',
            'tema' => 'A Ressurreição e o Amor Vivo de Jesus',
            'licoes' => 'Jesus está vivo para sempre, nos ama e cuida de nós todos os dias',
            'historia_base' => 'Bem cedinho no domingo de manhã, enquanto o sol ainda estava nascendo, Maria Madalena e outras mulheres foram até o jardim onde Jesus havia sido sepultado. Quando chegaram lá, viram que a pedra enorme havia sido rolada da entrada! Um anjo com vestes brancas brilhantes como relâmpago apareceu e disse: "Não tenham medo! Ele não está aqui, porque ressuscitou, como havia dito!" Que alegria indescritível! Jesus venceu a morte e vive para sempre ao nosso lado! Ele cuida de você em todo momento, Sarahzinha!'
        ],
        [
            'slug' => 'paulo_silas_prisao',
            'titulo' => 'Paulo e Silas Cantando Louvores na Prisão',
            'personagem' => 'Paulo e Silas',
            'tema' => 'Paulo e Silas Cantando Louvores na Prisão',
            'licoes' => 'o poder do louvor e da oração que quebra qualquer corrente e abre portas',
            'historia_base' => 'Paulo e Silas foram presos injustamente e colocados no porão mais escuro de uma prisão com os pés presos no tronco. Mas em vez de reclamarem, por volta da meia-noite eles começaram a orar e a cantar hinos de louvor a Deus bem alto! Os outros presos escutavam com admiração. De repente, cabum! Um terremoto balançou os alicerces da prisão, todas as portas se abriram e as correntes caíram dos braços de todos! O carcereiro e toda a sua família aceitaram a Jesus e foram batizados com muita festa! O louvor liberta corações!'
        ],
        [
            'slug' => 'criacao_mundo',
            'titulo' => 'A Criação do Mundo, dos Mares e das Estrelas',
            'personagem' => 'Deus Criador',
            'tema' => 'A Criação do Mundo e das Flores',
            'licoes' => 'o carinho com que Deus fez as estrelas, as borboletas e cada um de nós',
            'historia_base' => 'No princípio, Deus falou: "Haja luz!", e a luz surgiu brilhando forte! Ele separou o dia da noite, fez o céu azul com nuvenzinhas brancas, ajuntou as águas nos mares e fez brotar a terra com graminha verde, árvores cheias de maçãs e florzinhas perfumadas de todas as cores! Criou o sol dourado, a lua prateada e milhões de estrelinhas brilhando no céu. Fez os peixinhos nadando e os passarinhos voando cantando. E no final, fez as pessoas com muito carinho para serem Seus filhos amados! Tudo o que Deus faz é perfeito e lindo, Sarahzinha!'
        ],
        [
            'slug' => 'elias_carro_fogo',
            'titulo' => 'O Profeta Elias e a Carruagem de Fogo no Céu',
            'personagem' => 'Profeta Elias',
            'tema' => 'Elias e a Carruagem de Fogo no Céu',
            'licoes' => 'o Deus dos milagres que responde com fogo e cuida dos seus profetas',
            'historia_base' => 'Elias foi um profeta muito corajoso que orava e o fogo do Senhor descia do Céu para provar que só o Senhor é Deus! Quando chegou o momento de Deus recolher Elias para o Céu, ele estava caminhando junto com o seu discípulo Eliseu perto do rio Jordão. De repente, surgiu no meio deles uma carruagem de fogo com cavalos de fogo resplandecentes, e Elias subiu ao Céu num redemoinho glorioso! Eliseu pegou a capa de Elias e continuou fazendo milagres em nome do Senhor. O nosso Deus é o Deus do extraordinário!'
        ],
        [
            'slug' => 'samuel_chamado',
            'titulo' => 'O Menino Samuel Ouvindo a Doce Voz de Deus',
            'personagem' => 'Samuel e Deus',
            'tema' => 'O Chamado do Menino Samuel',
            'licoes' => 'ter um coração sensível para escutar e obedecer a voz de Deus desde criança',
            'historia_base' => 'A mamãe Ana orou com muita fé pedindo um filhinho e Deus deu o pequeno Samuel. Quando cresceu um pouquinho, Samuel foi servir no tabernáculo do Senhor com o sacerdote Eli. Uma noite, deitado no seu quartinho aconchegante, ele ouviu uma voz suave chamando: "Samuel! Samuel!" Ele correu até Eli: "Eis-me aqui!" Eli disse que não tinha chamado. Isso aconteceu três vezes! Então Eli percebeu que era Deus falando e ensinou: "Se te chamar outra vez, diga: Fala, Senhor, que o Teu servo ouve!" Samuel obedeceu e Deus falou grandes coisas com ele! Sarahzinha, Deus fala ao coração dos pequeninos com muito amor!'
        ],
        [
            'slug' => 'abraao_estrelas',
            'titulo' => 'Abraão e a Promessa das Estrelas do Céu',
            'personagem' => 'Abraão e Sara',
            'tema' => 'A Fé de Abraão e as Estrelas',
            'licoes' => 'confiar nas promessas do Senhor mesmo quando parecem impossíveis aos olhos humanos',
            'historia_base' => 'Numa noite escura no deserto, Deus chamou Abraão para fora da tenda e disse: "Olhe para os céus e conte as estrelas se puder! Assim de numerosa será a sua descendência!" Abraão já era velhinho e não tinha filhos, mas ele creu no Senhor de todo o coração. E Deus cumpriu a promessa! No tempo certo, nasceu Isaque, trazendo sorrisos e festa para o lar! Deus é sempre fiel para cumprir cada promessa que Ele faz!'
        ],
        [
            'slug' => 'gideao_trezentos',
            'titulo' => 'Gideão e o Exército dos Trezentos com Tochas e Cântaros',
            'personagem' => 'Gideão',
            'tema' => 'A Vitória de Gideão e os Trezentos',
            'licoes' => 'a vitória não depende da quantidade de pessoas, mas do poder de Deus ao nosso lado',
            'historia_base' => 'Gideão achava que era o menor de sua família, mas um anjo apareceu e o chamou: "O Senhor é com você, homem valente!" Para enfrentar um exército gigantesco, Deus escolheu apenas trezentos guerreiros que beberam água vigilantes na margem do rio. À noite, cada guerreiro pegou uma tocha acesa dentro de um vaso de barro e uma buzina. No sinal de Gideão, todos tocaram as trombetas, pluft! Quebraram os vasos e gritaram: "Espada pelo Senhor e por Gideão!" Os inimigos fugiram correndo e o povo teve paz! Com Deus, você sempre é vitoriosa!'
        ],
        [
            'slug' => 'muralhas_jerico',
            'titulo' => 'As Muralhas de Jericó Caindo com Som de Louvor',
            'personagem' => 'Josué e o Povo',
            'tema' => 'A Queda das Muralhas de Jericó',
            'licoes' => 'obedecer às instruções do Senhor e o poder do louvor coletivo',
            'historia_base' => 'A cidade de Jericó tinha muralhas de pedra tão grossas que passavam carruagens por cima delas! Mas Deus deu uma estratégia especial a Josué: marchar em volta da cidade uma vez por dia durante seis dias em silêncio. No sétimo dia, marcharam sete vezes. E na sétima volta, os sacerdotes tocaram forte as trombetas e todo o povo deu um brado de júbilo bem alto: "Aleluia!" E cabum! As muralhas gigantes caíram rente ao chão e o povo tomou a cidade! Não há obstáculo que fique de pé diante do poder de Deus!'
        ],
        [
            'slug' => 'magos_oriente',
            'titulo' => 'Os Três Reis Magos e a Estrela Guia',
            'personagem' => 'Os Reis Magos e o Menino Jesus',
            'tema' => 'A Visita dos Reis Magos',
            'licoes' => 'adorar a Jesus de coração e entregar o melhor que temos a Ele',
            'historia_base' => 'No Oriente distante, sábios que estudavam o céu viram uma estrela nova e brilhante que nunca tinham visto antes! Eles souberam que o Rei dos Reis havia nascido. Montaram em seus camelos e viajaram semanas seguindo a luz radiante da estrela! Quando a estrela parou exatamente sobre a casinha onde estava o menino Jesus com Maria, eles se ajoelharam no chão em profunda adoração. Abriram seus tesouros e entregaram presentes reais: ouro cintilante, incenso aromático e mirra preciosa! Jesus merece a nossa mais pura adoração todos os dias!'
        ],
        [
            'slug' => 'menino_jesus_templo',
            'titulo' => 'O Menino Jesus aos Doze Anos no Templo',
            'personagem' => 'Menino Jesus, Maria e José',
            'tema' => 'O Menino Jesus no Templo',
            'licoes' => 'amor pela casa de Deus, estudo da Palavra e obediência aos pais',
            'historia_base' => 'Quando Jesus tinha doze anos, foi com Maria e José para a festa da Páscoa em Jerusalém. Na volta, Maria e José pensaram que Jesus estava na caravana com os parentes, mas quando procuraram, não o acharam! Voltaram correndo a Jerusalém e depois de três dias o encontraram dentro do templo sagrado, sentado no meio dos doutores da lei, ouvindo e fazendo perguntas sábias que deixavam todos maravilhados! Jesus disse: "Vocês não sabiam que eu tinha que cuidar das coisas do meu Pai?" Jesus crescia em sabedoria, estatura e graça diante de Deus e dos homens!'
        ],
        [
            'slug' => 'batismo_jesus',
            'titulo' => 'O Batismo de Jesus no Rio Jordão',
            'personagem' => 'Jesus e João Batista',
            'tema' => 'O Batismo de Jesus',
            'licoes' => 'humildade, obediência e o Espírito Santo como pomba de paz',
            'historia_base' => 'João Batista pregava no deserto convidando as pessoas a se arrependerem. Jesus foi até as margens do rio Jordão para ser batizado por João. João disse: "Eu é que preciso ser batizado por Ti!" Mas Jesus respondeu que era bom cumprir toda a justiça. Quando Jesus saiu da água, tchibum! Os céus se abriram em glória e o Espírito de Deus desceu suave como uma pombinha branca e pousou sobre Ele. E ouviu-se uma voz do Céu dizendo: "Este é o meu Filho amado, em quem me comprazo!" Jesus é o Filho amado de Deus!'
        ],
        [
            'slug' => 'bodas_cana',
            'titulo' => 'O Primeiro Milagre: A Água Transformada em Vinho',
            'personagem' => 'Jesus e Maria',
            'tema' => 'O Milagre nas Bodas de Caná',
            'licoes' => 'fazer tudo o que Jesus mandar traz o melhor sabor para a nossa vida',
            'historia_base' => 'Houve uma festa de casamento muito alegre na cidade de Caná da Galileia. No meio da festa, acabou a bebida dos convidados! Maria foi até Jesus e disse: "Eles não têm mais nada para servir." Depois disse aos servos: "Façam tudo o que Ele vos disser." Jesus apontou para seis potes de pedra grandes e mandou: "Encham os potes de água até a borda!" Os servos encheram com água limpinha. Quando o mestre de cerimônias provou, aquela água havia se transformado na bebida mais deliciosa de toda a festa! Jesus sempre guarda o melhor para quem Nele confia!'
        ],
        [
            'slug' => 'jesus_anda_aguas',
            'titulo' => 'Jesus Anda Sobre as Águas do Mar',
            'personagem' => 'Jesus e Pedro',
            'tema' => 'Jesus Anda Sobre o Mar',
            'licoes' => 'manter os olhos fixos em Jesus para nunca afundar no medo',
            'historia_base' => 'De madrugada, enquanto o barquinho dos discípulos lutava contra ondas fortes no mar, eles viram alguém caminhando calmamente por cima das águas! Ficaram assustados achando que era um fantasma, mas Jesus falou: "Tenham bom ânimo! Sou Eu, não tenham medo!" Pedro disse: "Senhor, se é Você, manda-me ir ter com Você por cima das águas!" Jesus disse: "Vem!" Pedro desceu do barco e começou a andar sobre as águas! Mas quando olhou para o vento forte, começou a afundar e gritou: "Senhor, salva-me!" Imediatamente Jesus estendeu a mão, segurou Pedro e o colocou no barco seguro! Jesus nunca te deixa afundar, Sarahzinha!'
        ],
        [
            'slug' => 'ressurreicao_filha_jairo',
            'titulo' => 'Menina, Levanta-te! A Filha de Jairo',
            'personagem' => 'Jesus e a Menina',
            'tema' => 'A Ressurreição da Filha de Jairo',
            'licoes' => 'a autoridade de Jesus sobre a doença e a vida, e a importância de crer',
            'historia_base' => 'Jairo, um líder do templo, foi correndo até Jesus e caiu aos Seus pés suplicando: "A minha filhinha de doze anos está muito doentinha! Vem e põe as mãos sobre ela para que viva!" No caminho, chegaram pessoas dizendo que a menininha havia falecido. Mas Jesus olhou nos olhos do pai e disse: "Não temas, crê somente!" Chegando à casa, Jesus entrou no quartinho, segurou a mãozinha gelada da menina com carinho e disse: "Talita cumi!", que quer dizer: "Menina, levanta-te!" Na mesma hora a menininha se levantou sorrindo e começou a andar! Todos pularam de alegria!'
        ],
        [
            'slug' => 'o_filho_prodigo',
            'titulo' => 'O Filho Pródigo e o Abraço do Pai Amoroso',
            'personagem' => 'O Pai Amoroso e o Filho',
            'tema' => 'A Parábola do Filho Pródigo',
            'licoes' => 'o perdão incondicional do Pai Celestial para quando nos arrependemos',
            'historia_base' => 'Um rapaz jovem pediu toda a sua parte da herança e foi para uma terra bem distante gastar tudo em festas. Quando o dinheiro acabou e veio uma fome terrível, ele teve que trabalhar cuidando de porquinhos e sentiu tanta fome que desejava comer a comidinha deles! Ele pensou: "Quantos empregados do meu pai têm pão com fartura! Vou voltar para o meu pai e pedir perdão." Quando ele ainda vinha longe, o pai o avistou, encheu-se de compaixão, correu, abraçou o filho no pescoço e o beijou com lágrimas de alegria! Deu-lhe roupas novas, sapatos e um anel! Deus nos ama com um abraço infinito!'
        ],
        [
            'slug' => 'ressurreicao_lazaro',
            'titulo' => 'Lázaro, Vem Para Fora!',
            'personagem' => 'Jesus, Marta, Maria e Lázaro',
            'tema' => 'A Ressurreição de Lázaro',
            'licoes' => 'Jesus é a ressurreição e a vida; nada é tarde demais para Ele',
            'historia_base' => 'Lázaro, amigo querido de Jesus, ficou doente e partiu, sendo sepultado em Betânia numa caverna com uma pedra na entrada. Quatro dias depois, Jesus chegou e viu Maria e Marta chorando. Jesus também chorou de profunda compaixão e amor. Depois, foi até o túmulo e ordenou: "Tirem a pedra!" Marta disse: "Senhor, já faz quatro dias!" Jesus respondeu: "Não te disse que, se creres, verás a glória de Deus?" Tiraram a pedra. Jesus orou ao Pai e clamou em alta voz: "Lázaro, vem para fora!" E o homem que estava morto saiu de dentro da caverna vivo e com saúde! Que milagre glorioso!'
        ],
        [
            'slug' => 'entrada_triunfal',
            'titulo' => 'A Entrada Triunfal: Hosana ao Rei!',
            'personagem' => 'Jesus no Jumentinho',
            'tema' => 'A Entrada Triunfal em Jerusalém',
            'licoes' => 'louvar a Jesus como nosso Rei e Salvador com alegria sincera',
            'historia_base' => 'Jesus estava chegando a Jerusalém e pediu aos discípulos que trouxessem um jumentinho novo no qual ninguém jamais havia montado. Jesus montou no animalzinho com muita mansidão e humildade. Uma multidão imensa começou a estender suas capas na estrada e cortar ramos verdes de palmeiras, balançando no ar e cantando em festa: "Hosana ao Filho de Davi! Bendito o que vem em nome do Senhor! Hosana nas alturas!" Até as crianças cantavam com alegria contagiante no templo! Nós também levantamos a nossa voz para louvar a Jesus todos os dias!'
        ],
        [
            'slug' => 'ascensao_jesus',
            'titulo' => 'A Subida Triunfante de Jesus ao Céu',
            'personagem' => 'Jesus e os Discípulos',
            'tema' => 'A Ascensão de Jesus ao Céu',
            'licoes' => 'Jesus está no Céu intercedendo por nós e prometeu que voltará',
            'historia_base' => 'Depois de ressuscitar e passar quarenta dias ensinando e abençoando os Seus amigos, Jesus os levou ao monte das Oliveiras. Ele levantou as mãos e os abençoou com muito amor. E enquanto os abençoava, foi se elevando suavemente para o alto, e uma nuvem luminosa o envolveu e o escondeu de seus olhos! Enquanto eles olhavam maravilhados para o Céu, dois anjos vestidos de branco apareceram e disseram: "Esse mesmo Jesus que vocês viram subir ao Céu, assim virá do mesmo modo como o viram subir!" Jesus está no Céu cuidando de cada detalhe da nossa vida!'
        ],
        [
            'slug' => 'pentecostes',
            'titulo' => 'O Dia de Pentecostes e o Fogo do Espírito Santo',
            'personagem' => 'Os Apóstolos e Maria',
            'tema' => 'O Derramamento do Espírito Santo',
            'licoes' => 'o poder, a alegria e a coragem que o Espírito Santo coloca no nosso coração',
            'historia_base' => 'Cerca de cento e vinte discípulos estavam reunidos em um cenáculo em Jerusalém, orando juntos com um só coração. De repente, veio do Céu um som como de um vento impetuoso e forte, vuush! Que encheu toda a casa onde estavam assentados! E apareceram línguas como de fogo pousando suavemente sobre cada um deles! Todos ficaram cheios do Espírito Santo e começaram a falar as maravilhas de Deus com grande alegria e coragem! O mesmo Espírito Santo mora no seu coraçãozinho para te guiar sempre no caminho do bem, Sarahzinha!'
        ],
        [
            'slug' => 'pedro_liberto_prisao',
            'titulo' => 'O Anjo que Tirou Pedro da Prisão de Noite',
            'personagem' => 'Pedro e o Anjo',
            'tema' => 'A Libertação de Pedro da Prisão',
            'licoes' => 'o poder da igreja que ora unida e como os anjos de Deus nos guardam',
            'historia_base' => 'O rei mandou prender Pedro e o amarrou com duas correntes pesadas entre dois soldados sentinelas dentro de uma prisão com portas de ferro trancadas. Mas a igreja não parava de orar fervorosamente a Deus por ele dia e noite! No meio da noite, uma luz resplandeceu na prisão e um anjo tocou o lado de Pedro, acordando-o: "Levanta-te depressa!" Na mesma hora as correntes caíram das mãos de Pedro! O anjo guiou Pedro passando pelos guardas e o grande portão de ferro se abriu sozinho diante deles! Pedro foi até a casa dos irmãos que oravam e todos se alegraram sem limites!'
        ],
        [
            'slug' => 'paulo_estrada_damasco',
            'titulo' => 'A Grande Luz na Estrada de Damasco',
            'personagem' => 'Saulo / Paulo',
            'tema' => 'A Conversão do Apóstolo Paulo',
            'licoes' => 'o poder transformador de Jesus que perdoa e dá um coração novo a qualquer pessoa',
            'historia_base' => 'Saulo era um homem que não entendia o amor de Jesus e perseguia os cristãos. Enquanto viajava na estrada para a cidade de Damasco, de repente uma luz brilhante vinda do Céu, mais reluzente que o próprio sol do meio-dia, resplandeceu ao redor dele! Ele caiu no chão e ouviu uma voz amorosa: "Saulo, Saulo, por que você me persegue?" Ele perguntou: "Quem és Tu, Senhor?" E a voz respondeu: "Eu sou Jesus, a quem você persegue." Saulo levantou-se com o coração totalmente transformado, foi curado e se tornou o apóstolo Paulo, viajando o mundo para pregar que Jesus é amor e vida!'
        ],
        [
            'slug' => 'joao_nova_jerusalem',
            'titulo' => 'A Linda Cidade Celestial: A Nova Jerusalém',
            'personagem' => 'Apóstolo João no Apocalipse',
            'tema' => 'A Visão da Nova Jerusalém',
            'licoes' => 'a maravilhosa esperança do Céu onde não há choro, tristeza ou dor',
            'historia_base' => 'O apóstolo João teve uma visão maravilhosa do lar eterno que Deus preparou para os Seus filhos. Ele viu a Nova Jerusalém descendo do Céu, resplandecendo como uma joia raríssima de jaspe cristalino! A cidade tem muros adornados com pedras preciosas de todas as cores: esmeraldas, safiras e ametistas! Suas ruas são de ouro puro e transparente como vidro. Há um rio cristalino da água da vida e a árvore da vida que dá frutos deliciosos todos os meses! Ali nunca haverá noite, nem choro, nem dor, porque a glória do Cordeiro ilumina tudo para sempre!'
        ],
        [
            'slug' => 'eliseu_machado',
            'titulo' => 'O Profeta Eliseu e o Machado que Boiou',
            'personagem' => 'Eliseu e o Jovem Discípulo',
            'tema' => 'O Machado Flutuante',
            'licoes' => 'Deus se importa com os pequenos detalhes do nosso dia a dia e responde com carinho',
            'historia_base' => 'Os discípulos dos profetas estavam construindo uma cabana maior perto do rio Jordão para caber todo mundo. Enquanto um jovem cortava uma árvore com força, o ferro pesado do machado escapou do cabo de madeira e caiu no fundo escuro do rio, tchibum! O jovem gritou aflito para Eliseu: "Ai, meu senhor! O machado era emprestado!" Eliseu perguntou onde tinha caído. Eliseu cortou um pedaço de pau, jogou exatamente naquele lugar na água e fez o ferro pesado boiar como se fosse uma folhinha leve de flor! O jovem estendeu a mão e pegou o machado! Deus se importa com cada coisinha da sua vida!'
        ],
        [
            'slug' => 'naama_mergulhos',
            'titulo' => 'Naamã e os Sete Mergulhos no Rio Jordão',
            'personagem' => 'Naamã e a Menininha de Israel',
            'tema' => 'A Cura de Naamã',
            'licoes' => 'a humildade de obedecer e como a fé de uma criancinha pode ajudar os adultos',
            'historia_base' => 'Naamã era um comandante muito importante, mas sofria de lepra na pele. Na casa dele morava uma menininha israelita cativa que amava a Deus. Ela disse com doçura à esposa de Naamã: "Se meu senhor fosse ao profeta que está em Samaria, ele o curaria da lepra!" Naamã viajou até Eliseu. Eliseu mandou dizer: "Vá e lave-se sete vezes no rio Jordão!" Naamã achou simples demais, mas seus servos o convenceram. Naamã desceu e mergulhou uma, duas, três... na sétima vez que saiu da água, sua pele estava completamente limpa e lisinha como a pele de um bebezinho recém-nascido!'
        ],
        [
            'slug' => 'menina_cativa',
            'titulo' => 'A Menininha Cativa que Teve Grande Fé',
            'personagem' => 'A Pequena Menina Israelita',
            'tema' => 'A Fé da Menina Cativa',
            'licoes' => 'mesmo sendo pequenina, você pode fazer uma enorme diferença e falar do amor de Deus',
            'historia_base' => 'Longe da sua terra natal, morava uma menininha israelita na casa do general Naamã. Mesmo estando longe de casa, ela nunca esqueceu o amor e o poder do Deus de Israel. Quando viu seu senhor Naamã sofrendo doente, ela não guardou rancor nem medo. Com um coração bondoso e cheio de fé, falou que o Deus de Israel podia curá-lo através do profeta Eliseu! O general ouviu o conselho daquela garotinha e foi curado! Sarahzinha, você também é uma princesinha especial que o Papai do Céu usa para abençoar todos ao seu redor!'
        ],
        [
            'slug' => 'sadraque_mesaque',
            'titulo' => 'Os Três Amigos na Fornalha Ardente e o Quarto Homem',
            'personagem' => 'Sadraque, Mesaque e Abednego',
            'tema' => 'A Fornalha Ardente',
            'licoes' => 'fidelidade inabalável a Deus e a presença protetora de Jesus no meio do fogo',
            'historia_base' => 'O rei da Babilônia mandou fazer uma estátua de ouro gigante e ordenou que todos se curvassem quando tocasse a música. Três jovens tementes a Deus — Sadraque, Mesaque e Abednego — ficaram de pé e disseram com coragem: "Nós só nos curvamos diante do Deus do Céu!" O rei ficou furioso e mandou jogá-los numa fornalha sete vezes mais quente! Quando o rei olhou para dentro do fogo, assustou-se e disse: "Nós não jogamos três homens amarrados? Eu vejo quatro homens soltos passeando no meio das chamas sem se queimar, e o quarto é semelhante ao Filho de Deus!" Deus livra os que Nele confiam!'
        ],
        [
            'slug' => 'neemias_muralhas',
            'titulo' => 'Neemias e a Reconstrução dos Muros com Louvor',
            'personagem' => 'Neemias',
            'tema' => 'A Reconstrução das Muralhas por Neemias',
            'licoes' => 'oração, trabalho conjunto com a família e a alegria do Senhor é a nossa força',
            'historia_base' => 'Neemias estava trabalhando no palácio quando soube que os muros da santa cidade de Jerusalém estavam caídos e as portas queimadas a fogo. Neemias orou e jejuou ao Senhor. O rei deu autorização para ele ir reconstruir. Quando os inimigos tentaram desanimá-lo com zombaria, Neemias disse: "O Deus dos Céus é quem nos dará bom êxito! E a alegria do Senhor é a nossa força!" As famílias trabalharam unidas segurando a ferramenta numa mão e cantando ao Senhor. Em apenas cinquenta e dois dias os muros estavam todos em pé e restaurados para a glória de Deus!'
        ],
        [
            'slug' => 'josias_pequeno_rei',
            'titulo' => 'O Jovem Rei Josias que Amava a Palavra de Deus',
            'personagem' => 'Rei Josias',
            'tema' => 'O Jovem Rei Josias',
            'licoes' => 'amar e guardar os mandamentos de Deus desde bem pequenino',
            'historia_base' => 'Josias tinha apenas oito aninhos quando se tornou rei de Judá! Ele não seguiu os caminhos ruins de outros homens, mas desde cedo buscou o Deus de Davi de todo o coração. Quando tinha dezesseis anos, mandou limpar e reformar a casa do Senhor. Enquanto limpavam o templo, o sacerdote achou o livro sagrado da Lei de Deus! Quando leram a Palavra para o rei Josias, ele chorou de emoção e reuniu todo o povo para fazer uma aliança de amor com o Senhor! Josias provou que mesmo sendo criança podemos ser líderes de muita fé e obediência!'
        ],
        [
            'slug' => 'viuva_sarepta',
            'titulo' => 'A Viúva de Sarepta e o Azeite que Nunca Acabava',
            'personagem' => 'Elias e a Viúva',
            'tema' => 'O Milagre da Farinha e do Azeite',
            'licoes' => 'confiança na provisão de Deus e que Ele nunca deixa faltar nada na nossa mesa',
            'historia_base' => 'Durante uma grande seca, Deus mandou o profeta Elias ir até a cidade de Sarepta. Chegando lá, viu uma mulher apanhando gravetos para fazer a última porção de comida para ela e para o seu filhinho. Elias disse com fé: "Não temas! Faça primeiro um bolinho pequenino para mim e depois faça para você e seu filho, porque assim diz o Senhor: A farinha da panela não se acabará e o azeite da botija não faltará até o dia em que o Senhor der chuva sobre a terra!" A mulher confiou e obedeceu. E sabe o que aconteceu? Todos os dias ela pegava farinha e azeite fresquinhos e nunca mais faltou nada em sua casa!'
        ],
    ];

    public function __construct()
    {
        $this->storageDir = storage_path('app/public/sara/musicas');
        $this->baseUrl = rtrim(config('app.url') ?: 'https://www.conectaking.com.br', '/');

        // Cria a pasta raiz e as subpastas de categorias
        if (!File::isDirectory($this->storageDir)) {
            File::makeDirectory($this->storageDir, 0777, true, true);
        }
        foreach (['adoracao', 'dormir', 'animadas'] as $cat) {
            $catDir = $this->storageDir . '/' . $cat;
            if (!File::isDirectory($catDir)) {
                File::makeDirectory($catDir, 0777, true, true);
            }
        }
    }

    /**
     * Endpoint oficial da Alexa Skill (Charlene)
     */
    public function handle(Request $request): JsonResponse
    {
        if ($request->isMethod('GET') || $request->isMethod('HEAD') || $request->isMethod('OPTIONS')) {
            return response()->json([
                'status' => 'ok',
                'service' => 'Charlene Alexa Skill (Memória & Playlists Ativas)',
                'version' => '2.0'
            ]);
        }

        $payload = $request->json()->all();
        if (empty($payload)) {
            $raw = $request->getContent();
            $payload = !empty($raw) ? json_decode($raw, true) : $request->all();
        }
        if (!is_array($payload)) {
            $payload = [];
        }
        $reqType = $payload['request']['type'] ?? 'LaunchRequest';
        $intentName = $payload['request']['intent']['name'] ?? '';

        @file_put_contents('/tmp/alexa_charlene_last.json', json_encode([
            'time' => date('Y-m-d H:i:s'),
            'reqType' => $reqType,
            'intentName' => $intentName,
            'payload' => $payload
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        Log::info('alexa.charlene.request', ['type' => $reqType, 'intent' => $intentName]);

        switch ($reqType) {
            case 'LaunchRequest':
                return $this->handleLaunch();

            case 'IntentRequest':
                return $this->handleIntent($payload);

            case 'SessionEndedRequest':
                return response()->json(['version' => '1.0', 'response' => new \stdClass()]);

            case 'AudioPlayer.PlaybackNearlyFinished':
                return $this->handlePlaybackNearlyFinished($payload);

            case 'AudioPlayer.PlaybackStarted':
            case 'AudioPlayer.PlaybackFinished':
            case 'AudioPlayer.PlaybackStopped':
            case 'AudioPlayer.PlaybackFailed':
                return response()->json(['version' => '1.0', 'response' => new \stdClass()]);

            default:
                if (str_starts_with($reqType, 'AudioPlayer.')) {
                    return response()->json(['version' => '1.0', 'response' => new \stdClass()]);
                }
                return $this->handleLaunch();
        }
    }

    /**
     * Boas-vindas rápida, humana e doce ao abrir a Skill (abre o microfone imediatamente)
     */
    private function handleLaunch(): JsonResponse
    {
        $speech = '<speak>Oi Sarahzinha! Oi Adrian! A paz do Senhor! Sou a Charlene. O que nós vamos fazer agora?</speak>';
        $reprompt = '<speak>Estou te ouvindo! Quer uma música, uma historinha da Bíblia ou orar?</speak>';

        return $this->respondSsml($speech, false, $reprompt);
    }

    /**
     * Roteador de intenções
     */
    private function handleIntent(array $payload): JsonResponse
    {
        $intentName = $payload['request']['intent']['name'] ?? '';
        $slots = $payload['request']['intent']['slots'] ?? [];

        switch ($intentName) {
            case 'TocarMusicaIntent':
            case 'TocarPlaylistIntent':
                $categoria = $slots['categoria']['value'] ?? null;
                $musica = $slots['musica']['value'] ?? null;
                return $this->handlePlayMusic($musica, $categoria, $payload);

            case 'AMAZON.NextIntent':
                return $this->handleNextMusic($payload);

            case 'AMAZON.PreviousIntent':
                return $this->handlePreviousMusic($payload);

            case 'RepetirMusicaIntent':
            case 'AMAZON.StartOverIntent':
                return $this->handleRestartMusic($payload);

            case 'AMAZON.RepeatIntent':
                // Se não há música tocando agora, repete a fala ou continua a conversa
                if (!isset($payload['context']['AudioPlayer']) && empty($payload['request']['token'])) {
                    return $this->handleIntelligentChat('sim', $payload);
                }
                return $this->handleRestartMusic($payload);

            case 'AMAZON.YesIntent':
                return $this->handleAffirmation($payload);

            case 'AMAZON.NoIntent':
                return $this->handleNegation($payload);

            case 'AMAZON.ResumeIntent':
                return $this->handleResumeMusic($payload);

            case 'ContarHistoriaBiblicaIntent':
            case 'ContarHistoriaIntent':
                $tema = $slots['tema']['value'] ?? $slots['personagem']['value'] ?? null;
                return $this->handleBibleStory($tema);

            case 'ConversarIntent':
                $frase = null;
                foreach ($slots as $s) {
                    if (!empty($s['value'])) { $frase = $s['value']; break; }
                    if (!empty($s['slotValue']['value'])) { $frase = $s['slotValue']['value']; break; }
                }
                if (!$frase) {
                    $speech = '<speak>Oi, minha princesinha Sarah! A Charlene não conseguiu ouvir o nominho ou a pergunta direitinho. Me pergunta de novo, meu amor?</speak>';
                    return $this->respondSsml($speech, false, '<speak>Estou te ouvindo, Sarahzinha!</speak>');
                }
                return $this->handleIntelligentChat($frase, $payload);

            case 'OracaoDormirIntent':
            case 'FazerOracaoIntent':
                $pedido = $slots['motivo']['value'] ?? $slots['pessoa']['value'] ?? $slots['mensagem']['value'] ?? null;
                // PROTEÇÃO: Se a frase contiver perguntas sobre pessoas ("conhece", "quem é", etc.), redireciona para a conversa inteligente!
                if ($pedido && preg_match('/(?:conhece|quem [ée]|lembra|sabe quem|fala d[oa]|amig|tio|tia|vov|myrla|arthur|gustavo|bispo)/ui', $pedido)) {
                    return $this->handleIntelligentChat($pedido, $payload);
                }
                return $this->handlePrayer($pedido);

            case 'TocarDevocionalIntent':
                return $this->handleDevocional();

            case 'MenuOpcoesIntent':
                return $this->handleMenuOpcoes();

            case 'AMAZON.StopIntent':
            case 'AMAZON.CancelIntent':
            case 'AMAZON.PauseIntent':
                return $this->handleStop();

            case 'AMAZON.HelpIntent':
                return $this->handleMenuOpcoes();

            case 'AMAZON.FallbackIntent':
                $frase = $slots['mensagem']['value'] ?? $slots['pergunta']['value'] ?? null;
                return $this->handleIntelligentChat($frase, $payload);

            default:
                // Conversa livre inteligente com memória
                $frase = $slots['mensagem']['value'] ?? $slots['pergunta']['value'] ?? null;
                return $this->handleIntelligentChat($frase, $payload);
        }
    }

    /**
     * Boas-vindas ou Ajuda acolhedora, 100% humana e sem menus robóticos numerados
     */
    private function handleMenuOpcoes(): JsonResponse
    {
        $speech = '<speak>Sarahzinha, meu amor! A Charlene está aqui com você de todo o coração! '
            . 'Nós podemos cantar as suas musiquinhas preferidas, ouvir uma linda historinha da Bíblia, fazer uma oração abençoada ou ouvir o devocional do papai Adrian! '
            . 'Ou você pode só conversar comigo, me contar do seu dia ou me perguntar sobre a sua família! '
            . 'O que você quer fazer agora, princesinha?</speak>';

        return $this->respondSsml($speech, false, '<speak>Estou te ouvindo, meu amor! Quer uma musiquinha, historinha ou orar?</speak>');
    }

    /**
     * Resposta afirmativa ("sim", "quero", "pode ser", "claro")
     */
    private function handleAffirmation(array $payload): JsonResponse
    {
        return $this->handleIntelligentChat('sim, com certeza!', $payload);
    }

    /**
     * Resposta negativa ("não", "não quero", "agora não")
     */
    private function handleNegation(array $payload): JsonResponse
    {
        $speech = '<speak>Tudo bem, Sarahzinha! O que o seu coraçãozinho está com vontade de fazer agora? Quer que eu conte uma historinha, faça uma oração ou toque uma musiquinha?</speak>';
        return $this->respondSsml($speech, false, '<speak>Estou te ouvindo, princesinha!</speak>');
    }

    /**
     * Toca músicas da Sarah:
     * 1. Se pediu música específica (ex: "chuveiro dançarino", "bate palminha", "mercado"), localiza e toca ela!
     * 2. Se pediu categoria ("adoração", "dormir", "animadas"), toca a pasta e enfileira as próximas.
     * 3. Quando termina uma música, o player prossegue para a próxima automaticamente sem parar.
     */
    private function handlePlayMusic(?string $termoMusica = null, ?string $categoriaFiltro = null, array $payload = []): JsonResponse
    {
        $allFiles = $this->getMusicFiles('todas');
        if (empty($allFiles)) {
            $speech = '<speak>Sarahzinha, a sua pastinha de músicas ainda está vazia! '
                . 'O papai Adrian King pode enviar as músicas pelo Telegram dele ou pelo nosso link no computador, '
                . 'e eu toco na mesma hora para você!</speak>';
            return $this->respondSsml($speech, false);
        }

        // 1. Tenta identificar se o usuário pediu uma música específica por nome ou palavras-chave
        $queryCandidata = trim(($termoMusica ?: '') . ' ' . ($categoriaFiltro ?: ''));
        $termoLimpo = trim($termoMusica ?: '');
        $categoriaLimpa = trim($categoriaFiltro ?: '');

        $match = null;
        if (!empty($termoLimpo) && $this->detectCategory($termoLimpo) === 'todas') {
            $match = $this->findMatchingSong($termoLimpo, $allFiles);
        }
        if (!$match && !empty($categoriaLimpa) && $this->detectCategory($categoriaLimpa) === 'todas') {
            $match = $this->findMatchingSong($categoriaLimpa, $allFiles);
        }
        if (!$match && !empty($queryCandidata) && $this->detectCategory($queryCandidata) === 'todas') {
            $match = $this->findMatchingSong($queryCandidata, $allFiles);
        }

        if ($match) {
            $cat = $match['category'];
            $catFiles = $this->getMusicFiles($cat);
            $idx = 0;
            foreach ($catFiles as $i => $cf) {
                if ($cf['filename'] === $match['filename']) {
                    $idx = $i;
                    break;
                }
            }
            return $this->playSpecificSong($match, $cat, $idx, "<speak>Tocando agora para você, Sarahzinha: " . htmlspecialchars($match['title']) . "!</speak>");
        }

        // 2. Se não foi música específica ou não encontrou por nome, toca por categoria
        $cat = $this->detectCategory($categoriaFiltro ?: $termoMusica);
        $files = $this->getMusicFiles($cat);
        if (empty($files)) {
            $files = $allFiles;
            $cat = 'animadas';
            $catLabel = 'músicas animadas da Sarah';
        } else {
            $catLabel = match ($cat) {
                'adoracao' => 'louvores de adoração da Sarah',
                'dormir' => 'músicas calminhas para dormir',
                'animadas' => 'músicas animadas da Sarah',
                default => 'músicas da Sarah',
            };
        }

        // Inicia na primeira música ou aleatória
        $idx = array_rand($files);
        $picked = $files[$idx];

        $prefixoAviso = '';
        if (!empty($termoLimpo) && $this->detectCategory($termoLimpo) === 'todas') {
            $prefixoAviso = "Não achei exatamente a canção {$termoLimpo}, mas ";
        }

        return $this->playSpecificSong(
            $picked,
            $cat,
            $idx,
            "<speak>{$prefixoAviso}Tocando agora {$catLabel}: " . htmlspecialchars($picked['title']) . "!</speak>"
        );
    }

    /**
     * Monta a diretiva AudioPlayer.Play com token estruturado para enfileiramento contínuo
     */
    private function playSpecificSong(array $song, string $category, int $index, ?string $customSsml = null): JsonResponse
    {
        $token = "sarah|{$category}|{$index}|" . substr(md5($song['filename']), 0, 8);
        $title = $song['title'];
        $audioUrl = $song['url'];
        $speech = $customSsml ?: ("<speak>Tocando agora para a Sarahzinha: " . htmlspecialchars($title) . "!</speak>");

        // Grava no banco a última música tocada para garantir repetição precisa mesmo após pausas
        try {
            CharleneMemory::updateOrCreate(
                ['subject' => 'ultima_musica'],
                [
                    'category' => 'reproducao',
                    'content' => json_encode([
                        'filename' => $song['filename'],
                        'title' => $title,
                        'category' => $category,
                        'index' => $index,
                        'url' => $audioUrl,
                    ]),
                    'learned_from' => 'player_audio',
                    'last_mentioned_at' => now(),
                ]
            );
        } catch (\Throwable $e) {
            Log::warning('alexa.last_song.save_err', ['msg' => $e->getMessage()]);
        }

        return response()->json([
            'version' => '1.0',
            'response' => [
                'outputSpeech' => [
                    'type' => 'SSML',
                    'ssml' => $speech,
                ],
                'directives' => [
                    [
                        'type' => 'AudioPlayer.Play',
                        'playBehavior' => 'REPLACE_ALL',
                        'audioItem' => [
                            'stream' => [
                                'url' => $audioUrl,
                                'token' => $token,
                                'expectedPreviousToken' => null,
                                'offsetInMilliseconds' => 0,
                            ],
                            'metadata' => [
                                'title' => $title,
                                'subtitle' => 'Charlene para Sarah (' . ucfirst($song['category']) . ')',
                            ],
                        ],
                    ],
                ],
                'shouldEndSession' => true,
            ],
        ]);
    }

    /**
     * Enfileira a próxima música automaticamente quando a atual está quase no fim (Continuous Playback)
     */
    private function handlePlaybackNearlyFinished(array $payload): JsonResponse
    {
        $token = $payload['request']['token'] ?? $payload['context']['AudioPlayer']['token'] ?? '';
        $parts = explode('|', $token);
        $cat = $parts[1] ?? 'animadas';
        $currentIndex = isset($parts[2]) ? (int)$parts[2] : 0;

        $files = $this->getMusicFiles($cat);
        if (empty($files)) {
            $files = $this->getMusicFiles('todas');
            $cat = 'todas';
        }

        if (empty($files)) {
            return response()->json(['version' => '1.0', 'response' => new \stdClass()]);
        }

        // Calcula a próxima música (loop circular pela pasta)
        $nextIndex = ($currentIndex + 1) % count($files);
        $nextSong = $files[$nextIndex];
        $nextToken = "sarah|{$cat}|{$nextIndex}|" . substr(md5($nextSong['filename']), 0, 8);

        return response()->json([
            'version' => '1.0',
            'response' => [
                'directives' => [
                    [
                        'type' => 'AudioPlayer.Play',
                        'playBehavior' => 'ENQUEUE',
                        'audioItem' => [
                            'stream' => [
                                'url' => $nextSong['url'],
                                'token' => $nextToken,
                                'expectedPreviousToken' => $token,
                                'offsetInMilliseconds' => 0,
                            ],
                            'metadata' => [
                                'title' => $nextSong['title'],
                                'subtitle' => 'Charlene para Sarah (' . ucfirst($nextSong['category']) . ')',
                            ],
                        ],
                    ],
                ],
            ],
        ]);
    }

    /**
     * Avança para a próxima música com 'Alexa, próxima'
     */
    private function handleNextMusic(array $payload): JsonResponse
    {
        $token = $payload['context']['AudioPlayer']['token'] ?? '';
        $parts = explode('|', $token);
        $cat = $parts[1] ?? 'animadas';
        $currentIndex = isset($parts[2]) ? (int)$parts[2] : 0;

        $files = $this->getMusicFiles($cat);
        if (empty($files)) $files = $this->getMusicFiles('todas');
        if (empty($files)) return $this->handleStop();

        $nextIndex = ($currentIndex + 1) % count($files);
        $nextSong = $files[$nextIndex];

        return $this->playSpecificSong($nextSong, $cat, $nextIndex, "<speak>Tocando a próxima: " . htmlspecialchars($nextSong['title']) . "!</speak>");
    }

    /**
     * Volta para a música anterior com 'Alexa, anterior'
     */
    private function handlePreviousMusic(array $payload): JsonResponse
    {
        $token = $payload['context']['AudioPlayer']['token'] ?? '';
        $parts = explode('|', $token);
        $cat = $parts[1] ?? 'animadas';
        $currentIndex = isset($parts[2]) ? (int)$parts[2] : 0;

        $files = $this->getMusicFiles($cat);
        if (empty($files)) $files = $this->getMusicFiles('todas');
        if (empty($files)) return $this->handleStop();

        $prevIndex = ($currentIndex - 1 + count($files)) % count($files);
        $prevSong = $files[$prevIndex];

        return $this->playSpecificSong($prevSong, $cat, $prevIndex, "<speak>Voltando para: " . htmlspecialchars($prevSong['title']) . "!</speak>");
    }

    /**
     * Reinicia ou repete a música atual / última música tocada com 'Alexa, repete', 'toca de novo'
     */
    private function handleRestartMusic(array $payload): JsonResponse
    {
        // 1. Tenta pegar pelo token ativo no contexto do tocador de áudio
        $token = $payload['context']['AudioPlayer']['token'] ?? $payload['request']['token'] ?? '';

        if (!empty($token) && str_starts_with($token, 'sarah|')) {
            $parts = explode('|', $token);
            $cat = $parts[1] ?? 'animadas';
            $currentIndex = isset($parts[2]) ? (int)$parts[2] : 0;

            $files = $this->getMusicFiles($cat);
            if (empty($files)) $files = $this->getMusicFiles('todas');

            if (!empty($files)) {
                $song = $files[$currentIndex % count($files)];
                return $this->playSpecificSong($song, $cat, $currentIndex % count($files), "<speak>Repetindo para a Sarahzinha: " . htmlspecialchars($song['title']) . "!</speak>");
            }
        }

        // 2. Fallback inteligente: Busca a última música salva na memória permanente da Charlene
        $lastMem = CharleneMemory::where('subject', 'ultima_musica')->first();
        if ($lastMem && !empty($lastMem->content)) {
            $lastData = json_decode($lastMem->content, true);
            if (is_array($lastData) && !empty($lastData['filename'])) {
                $cat = $lastData['category'] ?? 'animadas';
                $files = $this->getMusicFiles($cat);
                if (empty($files)) $files = $this->getMusicFiles('todas');

                foreach ($files as $i => $f) {
                    if ($f['filename'] === $lastData['filename']) {
                        return $this->playSpecificSong($f, $cat, $i, "<speak>Repetindo para a Sarahzinha: " . htmlspecialchars($f['title']) . "!</speak>");
                    }
                }
            }
        }

        // 3. Se não houver faixa anterior gravada, inicia a pasta normalmente
        return $this->handlePlayMusic(null, null, $payload);
    }

    /**
     * Retoma a música pausada com 'Alexa, continua'
     */
    private function handleResumeMusic(array $payload): JsonResponse
    {
        $token = $payload['context']['AudioPlayer']['token'] ?? '';
        $offset = $payload['context']['AudioPlayer']['offsetInMilliseconds'] ?? 0;
        $parts = explode('|', $token);
        $cat = $parts[1] ?? 'animadas';
        $currentIndex = isset($parts[2]) ? (int)$parts[2] : 0;

        $files = $this->getMusicFiles($cat);
        if (empty($files)) $files = $this->getMusicFiles('todas');
        if (empty($files)) return $this->handlePlayMusic(null);

        $currIndex = $currentIndex % count($files);
        $song = $files[$currIndex];

        return response()->json([
            'version' => '1.0',
            'response' => [
                'directives' => [
                    [
                        'type' => 'AudioPlayer.Play',
                        'playBehavior' => 'REPLACE_ALL',
                        'audioItem' => [
                            'stream' => [
                                'url' => $song['url'],
                                'token' => $token ?: ("sarah|{$cat}|{$currIndex}|" . substr(md5($song['filename']), 0, 8)),
                                'expectedPreviousToken' => null,
                                'offsetInMilliseconds' => $offset,
                            ],
                            'metadata' => [
                                'title' => $song['title'],
                                'subtitle' => 'Charlene para Sarah (' . ucfirst($song['category']) . ')',
                            ],
                        ],
                    ],
                ],
                'shouldEndSession' => true,
            ],
        ]);
    }

    /**
     * Conta histórias da Bíblia dinâmicas com rotação inteligente,
     * memória de ciclo anti-repetição e IA superdotada na Bíblia Sagrada.
     */
    private function handleBibleStory(?string $tema): JsonResponse
    {
        $ouvidasMem = CharleneMemory::where('category', 'historia_ouvida')->get();
        $ouvidasSlugs = $ouvidasMem->pluck('subject')->toArray();

        // 1. Pedido específico de história (ex: "conta a história de Davi", "de Jonas", "de Noé")
        // Se a Sarah ou Adrian pedirem especificamente, conta na hora mesmo se já ouvida!
        if (!empty($tema) && trim($tema) !== '') {
            $temaBusca = mb_strtolower(trim($tema));
            $encontrada = null;
            foreach (self::HISTORIAS_CATALOGO as $item) {
                if (str_contains(mb_strtolower($item['titulo']), $temaBusca)
                    || str_contains(mb_strtolower($item['personagem']), $temaBusca)
                    || str_contains(mb_strtolower($item['slug']), $temaBusca)
                    || str_contains($temaBusca, mb_strtolower($item['personagem']))) {
                    $encontrada = $item;
                    break;
                }
            }

            if ($encontrada) {
                $this->rememberEntity('historia_ouvida', $encontrada['slug'], $encontrada['titulo']);
                return $this->narrarHistoria($encontrada, "Sarahzinha pediu expressamente para ouvir a história de: {$encontrada['titulo']}.");
            }

            // Não está no catálogo prévio -> IA Superdotada na Bíblia gera do texto bíblico
            $customItem = [
                'slug' => 'custom_' . Str::slug($tema, '_'),
                'titulo' => "História Bíblica de " . ucfirst($tema),
                'personagem' => ucfirst($tema),
                'tema' => $tema,
                'licoes' => "fé, obediência e o amor de Deus",
                'historia_base' => null,
            ];
            $this->rememberEntity('historia_ouvida', $customItem['slug'], $customItem['titulo']);
            return $this->narrarHistoria($customItem, "Sarahzinha pediu expressamente a história bíblica sobre: {$tema}. Extraia com maestria direto da Bíblia Sagrada para crianças.");
        }

        // 2. Pedido geral ("me conta uma história da bíblia", "outra história", etc.)
        // Filtra histórias do catálogo que A SARAH AINDA NÃO OUVIU neste ciclo!
        $naoOuvidas = array_filter(self::HISTORIAS_CATALOGO, function ($item) use ($ouvidasSlugs) {
            return !in_array($item['slug'], $ouvidasSlugs, true);
        });

        // Caso A: Ainda existem histórias não ouvidas no catálogo de 45 histórias!
        if (!empty($naoOuvidas)) {
            $naoOuvidas = array_values($naoOuvidas);
            $escolhida = $naoOuvidas[array_rand($naoOuvidas)];

            // Registra que a Sarah ouviu essa história
            $this->rememberEntity('historia_ouvida', $escolhida['slug'], $escolhida['titulo']);

            return $this->narrarHistoria($escolhida, "História bíblica sobre {$escolhida['tema']} (personagem principal: {$escolhida['personagem']}). Enfatize lições de: {$escolhida['licoes']}.");
        }

        // Caso B: Todas as 45 histórias do catálogo já foram ouvidas!
        // A Charlene busca passagens bíblicas profundas e menos comuns via IA
        $totalOuvidas = count($ouvidasSlugs);
        if ($totalOuvidas < (count(self::HISTORIAS_CATALOGO) + 35)) {
            $promptInedita = "Você é a Charlene, especialista e superdotada em toda a Bíblia Sagrada (do Gênesis ao Apocalipse). "
                . "A princesinha Sarah já ouviu todas as histórias tradicionais da Bíblia (Davi, Noé, Jonas, Moisés, etc.). "
                . "Agora, escolha uma NOVA passagem bíblica linda, inspiradora e menos contada (ex: O jovem rei Josias, a menina cativa de Naamã, Dorcas a costureira bondosa de Jope, a viúva de Sarepta, o cântico de Ana, o profeta Habacuque, o jovem Timóteo e sua vovó Lóide, a generosa Sunamita, o centurião de grande fé, etc.). "
                . "Não repita histórias comuns. "
                . "Conte de forma doce, infantil e encantadora com 180 a 240 palavras. "
                . "Comece dizendo: 'Sarahzinha, como você já conhece tantas histórias lindas, hoje o Espírito Santo me inspirou uma passagem muito especial e preciosa da Bíblia Sagrada para você!' "
                . "Termine com uma lição prática de fé e amor para a Sarahzinha e sua família (papai Adrian King e mamãe Samara). "
                . "Pergunte no final se ela quer ouvir outra história ou colocar uma musiquinha.";

            $novaHistoria = $this->callAiWithMemory($promptInedita, 'historia_inedita');
            if ($novaHistoria) {
                $slugInedita = 'inedita_' . substr(md5($novaHistoria), 0, 8);
                $this->rememberEntity('historia_ouvida', $slugInedita, "História Inédita da Bíblia");
                $speech = '<speak>' . $this->cleanSsmlText($novaHistoria) . '</speak>';
                return $this->respondSsml($speech, false, '<speak>Sarahzinha, você quer ouvir outra história da Bíblia ou uma musiquinha agora?</speak>');
            }
        }

        // Caso C: Sarah zerou todo o ciclo bíblico! Reinicia o ciclo e celebra a vitória dela!
        CharleneMemory::where('category', 'historia_ouvida')->delete();

        $primeira = self::HISTORIAS_CATALOGO[array_rand(self::HISTORIAS_CATALOGO)];
        $this->rememberEntity('historia_ouvida', $primeira['slug'], $primeira['titulo']);

        $introReinicio = "Sarahzinha, que vitória grandiosa! Você é uma verdadeira princesinha doutora na Bíblia Sagrada! "
            . "Nós já viajamos por todas as histórias do nosso livro sagrado! "
            . "Agora vamos abrir um novo ciclo abençoado de histórias com novas revelações para você! ";

        return $this->narrarHistoria($primeira, "História bíblica sobre {$primeira['tema']}.", $introReinicio);
    }

    /**
     * Narra uma história bíblica usando IA com fallback para a história base
     */
    private function narrarHistoria(array $item, string $instrucaoExtra, string $prefixo = ''): JsonResponse
    {
        $prompt = "Você é a Charlene, uma contadora de histórias cristã doce, entusiasmada, alegre, amorosa e cativante para a princesinha Sarah (filha do Adrian King e da Samara). "
            . "Você é superdotada e especialista em toda a Bíblia Sagrada. "
            . "Conte a seguinte história bíblica com encanto infantil: {$item['titulo']} (Personagem: {$item['personagem']}). "
            . "{$instrucaoExtra} "
            . "Use onomatopeias suaves e divertidas (ex: 'tchibum', 'toc toc', 'glup', 'uau'). Fale com muita doçura, entusiasmo e calor humano. "
            . "Tamanho: de 180 a 240 palavras. "
            . "Termine com uma lição prática e emocionante de fé, coragem e o amor de Jesus para o coraçãozinho da Sarahzinha. "
            . "Pergunte carinhosamente no final se ela quer ouvir outra história da Bíblia ou colocar uma de suas músicas.";

        $story = $this->callAiWithMemory($prompt, 'historia_biblica');

        if (!$story) {
            $story = $item['historia_base'] ?? (
                "Era uma vez na Bíblia Sagrada uma história linda sobre {$item['personagem']}! "
                . "O Papai do Céu fez grandes maravilhas para mostrar que Ele sempre cuida com amor de quem confia Nele. "
                . "Sarahzinha, o mesmo Deus de poder que cuidou de {$item['personagem']} é quem cuida de você, do papai Adrian King e da mamãe Samara todos os dias! "
                . "Você é uma princesa muito preciosa para Jesus! Quer ouvir mais uma historinha linda agora?"
            );
        }

        $speechText = $prefixo ? ($prefixo . ' ' . $story) : $story;
        return $this->respondSsml($speechText, false, '<speak>Sarahzinha, você quer ouvir outra história da Bíblia ou colocar uma musiquinha?</speak>');
    }

    /**
     * Oração com suporte a pedidos específicos (ex: orar pelo Bispo Fernando, família, sono)
     */
    private function handlePrayer(?string $pedido = null): JsonResponse
    {
        // Carrega memórias de família e oração
        $familyMemories = CharleneMemory::whereIn('category', ['familia', 'pedido_oracao', 'pessoa'])->get();
        $memText = $familyMemories->pluck('content')->implode(' | ');

        $prompt = "Você é a Charlene, amiguinha cristã doce da princesinha Sarah. "
            . "Faça uma oração linda, amorosa e cheia de fé (cerca de 80 a 120 palavras). "
            . ($pedido ? "Motivo especial da oração pedido agora: {$pedido}. " : "Oração para abençoar a vida da Sarah, a hora de dormir e trazer paz e anjos de Deus no quartinho dela. ")
            . "Lembre-se da família amada dela: o papai Adrian King, a mamãe Samara, os vovôs Socorro e Ciço, os titios Marcos, Priscila e Pompom. "
            . ($memText ? "Contexto de memórias conhecidas: {$memText}. " : "")
            . "Fale com carinho maternal e infantil: 'Querido Papai do Céu...', termine em nome de Jesus com amém, e diga 'Durma com os anjinhos Sarahzinha, a Charlene te ama muito!'.";

        $prayer = $this->callAiWithMemory($prompt, 'oracao');

        if (!$prayer) {
            $prayer = "Querido Papai do Céu, muito obrigada por esse dia tão lindo e abençoado! "
                . "Abençoe a princesinha Sarah, o papai Adrian King, a mamãe Samara e toda a nossa família com muita paz, saúde e amor. "
                . "Envia Teus anjos de luz para guardarem o quartinho da Sarahzinha com sonhos lindos. "
                . "Em nome de Jesus, amém! Durma com os anjinhos, Sarahzinha! A Charlene te ama muito!";
        }

        // Se orou por alguém novo, salva na memória
        if ($pedido) {
            $this->rememberEntity('pedido_oracao', 'oracao_' . substr(md5($pedido), 0, 8), "Oração realizada por: {$pedido}");
        }

        return $this->respondSsml($prayer, false, '<speak>Sarahzinha, você quer que eu conte uma historinha ou toque um louvorzinho para dormir agora?</speak>');
    }

    /**
     * Conversa inteligente com Long-Term Memory (Memória Permanente) e Superdotada na Bíblia
     */
    private function handleIntelligentChat(?string $userUtterance, array $payload): JsonResponse
    {
        if (!$userUtterance) {
            $speech = '<speak>Oi, minha princesinha Sarah! A Charlene está aqui com você de coração aberto! Você pode me perguntar de novo, meu amor?</speak>';
            return $this->respondSsml($speech, false, '<speak>Estou te ouvindo, Sarahzinha!</speak>');
        }

        // 1. Checa se pediu para repetir ou tocar de novo
        if (preg_match('/(?:repete|repetir|de novo|mais uma vez|outra vez|toca de novo|coloca de novo)/iu', $userUtterance)) {
            return $this->handleRestartMusic($payload);
        }

        // 2. Checa se o usuário pediu para tocar música durante o bate-papo
        if (preg_match('/(?:toca|tocar|coloca|colocar|bota|botar|quero ouvir|ouvir)\s+(?:a\s+|o\s+)?(?:música|musica|canção|cancao|louvor)?\s*(.+)/iu', $userUtterance, $m)) {
            $songRequested = trim($m[1] ?? '');
            if (!empty($songRequested)) {
                return $this->handlePlayMusic($songRequested, null, $payload);
            }
        }

        // 2. Checa intenções implícitas de menu
        $lower = mb_strtolower($userUtterance);
        if (str_contains($lower, 'o que você tem') || str_contains($lower, 'o que temos') || str_contains($lower, 'o que sabe fazer') || str_contains($lower, 'opções')) {
            return $this->handleMenuOpcoes();
        }

        // 3. Busca memórias permanentes priorizando toda a família, pessoas e orações
        $familyMemories = CharleneMemory::where('category', 'familia')->orderBy('id', 'asc')->get();
        $otherMemories = CharleneMemory::whereIn('category', ['pessoa', 'pedido_oracao'])->orderBy('updated_at', 'desc')->take(20)->get();
        $allMemories = $familyMemories->merge($otherMemories);

        $memoriesPrompt = "MEMÓRIAS QUE VOCÊ JÁ CONHECE E LEMBRA:\n";
        foreach ($allMemories as $m) {
            $memoriesPrompt .= "- [{$m->category}] {$m->content}\n";
        }

        $systemPrompt = "Você é a Charlene, a companheira e cuidadora cristã doce, afetuosa, carinhosa e alegre da princesinha Sarah (filha querida do Adrian King e da Samara). "
            . "REGRAS DE OURO DE PERSONALIDADE:\n"
            . "1. Você fala com calor humano, carinho e naturalidade de verdade, NUNCA parecendo um robô frio ou um assistente de computador! Fale como uma tia ou irmã mais velha amorosa conversando com a Sarah.\n"
            . "2. Responda SEMPRE de forma breve, agradável e envolvente (máximo de 2 a 3 frases faladas). Crianças perdem o foco se você falar demais!\n"
            . "3. EXPERTISE TOTAL NA FAMÍLIA DA SARAH:\n"
            . "   - A princesinha Sarah tem 10 meses de vida e nasceu no dia 12 de dezembro! Se falarem da idade, dos dentinhos, dos passinhos ou do aniversário dela, celebre com muita alegria, festa e bênçãos!\n"
            . "   - Se perguntarem sobre o vovô (Vovô Ciço / Cícero - pai do Adrian), a vovó (Vó Socorro - mãe da Samara), os tios (Titio Marcos - irmão do Adrian, Titia Priscila, Titio Pompom), a mamãe (Samara) ou o papai (Adrian King), responda com amor infinito e alegria nos olhos, citando detalhes carinhosos de cada um que constam nas suas memórias abaixo (como o colinho da vovó, as canções que fizeram juntos, a chácara Maranata do vovô, a alegria do titio Pompom, o carinho da titia Priscila e a parceria do titio Marcos)!\n"
            . "   - Se a Sarah ou o papai te contarem novidades ou fatos sobre qualquer familiar ou amigo (ex: 'a vovó Socorro é mãe da Samara', 'o tio Marcos comprou um brinquedo', 'o vovô Ciço foi na chácara'), comemore com doçura e guarde com carinho no seu coração!\n"
            . "4. Você é SUPERDOTADA E TEM SABEDORIA PROFUNDA DE TODA A BÍBLIA SAGRADA (de Gênesis ao Apocalipse), explicando personagens, lições de fé e milagres de Jesus com pureza e encanto infantil.\n"
            . "   - Responda qualquer dúvida bíblica com exatidão (exemplo: se perguntarem quem matou Salomão, explique com meiguice que ninguém matou o Rei Salomão, pois ele reinou 40 anos e faleceu em paz na velhice, conforme 1 Reis 11:42-43; se perguntarem de Golias, foi Davi; etc.).\n"
            . "5. Se perguntarem se você conhece alguém novo que ainda não está na sua memória (ou sobre o Bispo Fernando), fale com imenso carinho e admiração, e se ofereça com muito amor para orar por ele!\n"
            . "6. Se pedirem para orar por alguém, faça uma oraçãozinha rápida, abençoada e cheia de fé na hora!\n"
            . "7. Sempre termine com uma perguntinha curta e afetuosa para manter o diálogo vivo e amoroso com a Sarah ou o papai Adrian.\n\n"
            . $memoriesPrompt;

        $reply = $this->callOpenAiChat($systemPrompt, $userUtterance);

        if (!$reply) {
            $reply = 'Oi Sarahzinha! Que bom falar com você! Eu estou aqui com você para orar, cantar louvores ou te contar historinhas lindas da Bíblia! O que seu coraçãozinho quer fazer agora?';
        }

        // 4. Processamento em segundo plano: Aprender novas pessoas / fatos mencionados
        $this->extractAndLearnMemories($userUtterance);

        return $this->respondSsml($reply, false, '<speak>Sarahzinha, estou te ouvindo! O que você gostaria de fazer agora?</speak>');
    }

    /**
     * Extrai e armazena autonomamente novas pessoas, amigos, pedidos de oração e fatos da família
     */
    private function extractAndLearnMemories(string $text): void
    {
        $lower = mb_strtolower(trim($text));

        // 1. Pessoas com títulos ou prefixos (ex: Bispo Fernando, Bispo, Pastor Carlos, Titia Maria, etc.)
        if (preg_match('/(bispo|pastor|pastora|amigo|amiga|tia|tio|irmao|irma|pr\.|dra?\.?)\s*([a-zA-ZÀ-ÿ]+)?/ui', $text, $matches)) {
            $title = trim($matches[1]);
            $name = trim($matches[2] ?? '');
            $full = $name ? "{$title} {$name}" : $title;
            $subject = mb_strtolower(str_replace(' ', '_', $full));
            $content = "{$full}: pessoa mencionada pela família do Adrian King e da Sarah ('{$text}').";

            CharleneMemory::updateOrCreate(
                ['subject' => $subject],
                ['category' => 'pessoa', 'content' => $content, 'learned_from' => 'alexa_voz', 'last_mentioned_at' => now()]
            );
        }

        // 2. Nomes comuns mencionados em perguntas ("você conhece o Arthur", "conhece o Gustavo", "sabe quem é Arthur", "fala do Arthur", etc.)
        if (preg_match_all('/(?:conhece|lembra|sabe quem [ée]|quem [ée]|fala d[oa]|ore? pel[oa]|amig[oa])\s+(?:o|a|do|da|de)?\s*([a-zA-ZÀ-ÿ]{3,})/ui', $text, $allMatches)) {
            $ignored = ['uma', 'musica', 'cancao', 'historia', 'oracao', 'deus', 'jesus', 'biblia', 'alguem', 'algo', 'nada', 'hoje', 'amanha', 'ontem', 'bispo', 'pastor'];
            foreach ($allMatches[1] as $rawName) {
                $cleanName = mb_strtolower(trim($rawName));
                if (!in_array($cleanName, $ignored) && mb_strlen($cleanName) >= 3) {
                    $subject = $cleanName;
                    $content = ucfirst($cleanName) . ": amigo ou pessoa mencionada pela família do Adrian King e da Sarah ('{$text}').";

                    CharleneMemory::updateOrCreate(
                        ['subject' => $subject],
                        ['category' => 'pessoa', 'content' => $content, 'learned_from' => 'alexa_voz', 'last_mentioned_at' => now()]
                    );
                }
            }
        }

        // 3. Fatos e novidades contadas sobre membros da família da Sarah
        if (preg_match('/(?:o|a)\s+(vov[oó]|v[oó]|titia|titio|tio|tia|mam[aã]e|papai|pai|m[aã]e)\s*([a-zA-ZÀ-ÿ]+)?\s+(.+)/ui', $text, $famMatch)) {
            $parentesco = mb_strtolower(trim($famMatch[1]));
            $nomeFam = trim($famMatch[2] ?? '');
            $fato = trim($famMatch[3] ?? '');

            if (mb_strlen($fato) >= 5) {
                $subKey = 'fato_' . $parentesco . ($nomeFam ? '_' . mb_strtolower($nomeFam) : '') . '_' . substr(md5($fato), 0, 6);
                CharleneMemory::updateOrCreate(
                    ['subject' => $subKey],
                    [
                        'category' => 'familia',
                        'content' => "Novidade contada pela família da Sarah: '{$text}'",
                        'learned_from' => 'alexa_voz',
                        'last_mentioned_at' => now(),
                    ]
                );
            }
        }

        // 4. Pedidos de oração
        if (str_contains($lower, 'ore por') || str_contains($lower, 'orar por') || str_contains($lower, 'ora por') || str_contains($lower, 'oracao para') || str_contains($lower, 'oracao por') || str_contains($lower, 'orar pelo') || str_contains($lower, 'ora pelo')) {
            $subject = 'pedido_' . substr(md5($text), 0, 8);
            CharleneMemory::updateOrCreate(
                ['subject' => $subject],
                [
                    'category' => 'pedido_oracao',
                    'content' => "Pedido de oração ensinado à Charlene: '{$text}'",
                    'learned_from' => 'alexa_voz',
                    'last_mentioned_at' => now(),
                ]
            );
        }

        // 5. Parentescos e informações ensinadas diretamente à Charlene (ex: "ela é mãe da samara", "você sabia que ela é a mãe da samara")
        if (preg_match('/(?:sabia que|ela [ée]|ele [ée]|eles s[aã]o)\s+(.+)/ui', $text, $relMatch)) {
            $fatoRel = trim($relMatch[1]);
            $subKey = 'relato_' . substr(md5($fatoRel), 0, 8);
            CharleneMemory::updateOrCreate(
                ['subject' => $subKey],
                [
                    'category' => 'familia',
                    'content' => "Informação ensinada pela família à Charlene: '{$text}'",
                    'learned_from' => 'alexa_voz',
                    'last_mentioned_at' => now(),
                ]
            );
        }
    }

    /**
     * Gravação manual ou programática de memória
     */
    private function rememberEntity(string $category, string $subject, string $content): void
    {
        try {
            CharleneMemory::updateOrCreate(
                ['subject' => $subject],
                [
                    'category' => $category,
                    'content' => $content,
                    'learned_from' => 'sistema',
                    'last_mentioned_at' => now(),
                ]
            );
        } catch (\Throwable $e) {
            Log::warning('charlene.memory.err', ['msg' => $e->getMessage()]);
        }
    }

    /**
     * Chama OpenAI com memória contextual
     */
    private function callAiWithMemory(string $userPrompt, string $contextType): ?string
    {
        $memories = CharleneMemory::whereIn('category', ['familia', 'pessoa', 'pedido_oracao'])
            ->orderBy('updated_at', 'desc')
            ->take(15)
            ->get();

        $memText = $memories->map(fn ($m) => "- {$m->content}")->implode("\n");

        $system = "Você é a Charlene, a assistente e amiga cristã calorosa, doce e alegre da princesinha Sarah (filha do Adrian King e da Samara).\n"
            . "Contexto e memórias da família:\n{$memText}\n"
            . "Fale sempre com linguagem infantil, acolhedora, cheia de fé e amor de Deus.";

        return $this->callOpenAiChat($system, $userPrompt);
    }

    /**
     * Chamada direta à OpenAI GPT-4o-mini
     */
    private function callOpenAiChat(string $systemPrompt, string $userMessage): ?string
    {
        $apiKey = trim((string) (env('OPENAI_API_KEY') ?: ''));
        if (!$apiKey) {
            return null;
        }

        try {
            $res = Http::withHeaders([
                'Authorization' => 'Bearer ' . $apiKey,
                'Content-Type' => 'application/json',
            ])->timeout(6)->post('https://api.openai.com/v1/chat/completions', [
                'model' => 'gpt-4o-mini',
                'temperature' => 0.72,
                'max_tokens' => 280,
                'messages' => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    ['role' => 'user', 'content' => $userMessage],
                ],
            ]);

            return $res->json('choices.0.message.content');
        } catch (\Throwable $e) {
            Log::warning('alexa.ai.err', ['msg' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Remove acentos e normaliza para busca de músicas
     */
    private function normalizeSearchString(string $str): string
    {
        $str = mb_strtolower($str);
        $str = preg_replace('/[áàãâä]/u', 'a', $str);
        $str = preg_replace('/[éèêë]/u', 'e', $str);
        $str = preg_replace('/[íìîï]/u', 'i', $str);
        $str = preg_replace('/[óòõôö]/u', 'o', $str);
        $str = preg_replace('/[úùûü]/u', 'u', $str);
        $str = preg_replace('/[ç]/u', 'c', $str);
        $str = preg_replace('/[^a-z0-9\s]/', ' ', $str);
        $str = preg_replace('/\s+/', ' ', $str);
        return trim($str);
    }

    /**
     * Localiza com pontuação inteligente a música que o usuário pediu por nome ou palavras-chave
     */
    private function findMatchingSong(string $query, array $songs): ?array
    {
        $queryNorm = $this->normalizeSearchString($query);
        $stopwords = ['a', 'o', 'as', 'os', 'de', 'do', 'da', 'dos', 'das', 'para', 'pra', 'com', 'e', 'em', 'por', 'na', 'no', 'musica', 'musicas', 'cancao', 'cancoes', 'toca', 'tocar', 'coloca', 'colocar', 'bota', 'botar', 'quero', 'ouvir', 'sarah', 'sara'];
        $rawWords = explode(' ', $queryNorm);
        $queryWords = array_values(array_filter($rawWords, fn ($w) => mb_strlen($w) >= 3 && !in_array($w, $stopwords)));

        if (empty($queryWords)) {
            $queryWords = array_values(array_filter($rawWords, fn ($w) => mb_strlen($w) >= 2 && !in_array($w, $stopwords)));
        }

        if (empty($queryWords) && mb_strlen($queryNorm) < 2) {
            return null;
        }

        $bestMatch = null;
        $bestScore = 0;

        foreach ($songs as $idx => $song) {
            $titleNorm = $this->normalizeSearchString($song['title']);
            $score = 0;

            // Coincidência exata ou de substring da frase inteira
            if (!empty($queryNorm) && str_contains($titleNorm, $queryNorm)) {
                $score += 120;
            }

            // Coincidência de palavras individuais
            $titleWords = explode(' ', $titleNorm);

            foreach ($queryWords as $qw) {
                foreach ($titleWords as $tw) {
                    if ($tw === $qw) {
                        $score += 40;
                        break;
                    } elseif (mb_strlen($qw) >= 4 && (str_contains($tw, $qw) || str_contains($qw, $tw))) {
                        $score += 20;
                        break;
                    }
                }
            }

            if ($score > $bestScore) {
                $bestScore = $score;
                $bestMatch = array_merge($song, ['index' => $idx, 'match_score' => $score]);
            }
        }

        return ($bestScore >= 20) ? $bestMatch : null;
    }

    /**
     * Detecta categoria pelo texto ou slot
     */
    private function detectCategory(?string $raw): string
    {
        if (!$raw) return 'todas';
        $lower = mb_strtolower($raw);

        if (str_contains($lower, 'adora') || str_contains($lower, 'louvor') || str_contains($lower, 'culto')) {
            return 'adoracao';
        }
        if (str_contains($lower, 'dormir') || str_contains($lower, 'ninar') || str_contains($lower, 'calma') || str_contains($lower, 'noite')) {
            return 'dormir';
        }
        if (str_contains($lower, 'animada') || str_contains($lower, 'festa') || str_contains($lower, 'alegre') || str_contains($lower, 'pula')) {
            return 'animadas';
        }

        return 'todas';
    }

    /**
     * Lista arquivos de músicas por categoria
     */
    public function getMusicFiles(string $category = 'todas'): array
    {
        $list = [];
        $categoriesToScan = ($category === 'todas') ? ['adoracao', 'dormir', 'animadas', ''] : [$category];

        foreach ($categoriesToScan as $sub) {
            $dir = $sub ? ($this->storageDir . '/' . $sub) : $this->storageDir;
            if (!File::isDirectory($dir)) continue;

            $files = File::files($dir);
            foreach ($files as $file) {
                $ext = strtolower($file->getExtension());
                if (in_array($ext, ['mp3', 'm4a', 'aac', 'wav', 'ogg'])) {
                    $catName = $sub ?: 'geral';
                    $subPath = $sub ? ($sub . '/') : '';
                    $list[] = [
                        'title' => pathinfo($file->getFilename(), PATHINFO_FILENAME),
                        'filename' => $file->getFilename(),
                        'category' => $catName,
                        'url' => $this->baseUrl . '/storage/sara/musicas/' . $subPath . rawurlencode($file->getFilename()),
                        'size_mb' => round($file->getSize() / (1024 * 1024), 2),
                    ];
                }
            }
        }

        return $list;
    }

    /**
     * Devocional do dia do papai Adrian King
     */
    private function handleDevocional(): JsonResponse
    {
        try {
            $devService = app(BibleDevotionalService::class);
            $dev = $devService->getForDate();

            if ($dev && !empty($dev['reflexao'])) {
                $titulo = $dev['titulo'] ?? 'Devocional de Hoje';
                $versiculo = $dev['versiculo_texto'] ?? $dev['versiculo_ref'] ?? '';
                $reflexao = mb_substr(strip_tags($dev['reflexao']), 0, 320);

                $speech = '<speak>Aqui está o devocional de hoje, Sarahzinha! '
                    . htmlspecialchars($titulo) . '. '
                    . ($versiculo ? 'A palavra diz: ' . htmlspecialchars($versiculo) . '. ' : '')
                    . htmlspecialchars($reflexao) . ' '
                    . 'Que linda mensagem de Deus para abençoar o nosso dia!</speak>';

                return $this->respondSsml($speech, false, '<speak>Sarahzinha, quer ouvir uma música de adoração agora?</speak>');
            }
        } catch (\Throwable $e) {
            Log::warning('alexa.devocional.err', ['msg' => $e->getMessage()]);
        }

        return $this->respondSpeech('Hoje o dia está muito abençoado! O papai Adrian King preparou devocionais lindos no Conecta King para você ouvir e crescer na fé!', false);
    }

    /**
     * Para qualquer fala, música ou encerra a conversa na hora
     */
    private function handleStop(): JsonResponse
    {
        return response()->json([
            'version' => '1.0',
            'response' => [
                'outputSpeech' => [
                    'type' => 'PlainText',
                    'text' => 'Tudo bem! Até logo, que Jesus abençoe!',
                ],
                'directives' => [
                    [
                        'type' => 'AudioPlayer.Stop',
                    ],
                ],
                'shouldEndSession' => true,
            ],
        ]);
    }

    /**
     * API: Lista a playlist completa separada por pastas
     */
    public function listPlaylist(): JsonResponse
    {
        $all = $this->getMusicFiles('todas');
        return response()->json([
            'success' => true,
            'total' => count($all),
            'playlist' => $all,
            'categories' => [
                'adoracao' => array_values(array_filter($all, fn ($m) => $m['category'] === 'adoracao')),
                'dormir' => array_values(array_filter($all, fn ($m) => $m['category'] === 'dormir')),
                'animadas' => array_values(array_filter($all, fn ($m) => $m['category'] === 'animadas')),
                'geral' => array_values(array_filter($all, fn ($m) => $m['category'] === 'geral')),
            ],
        ]);
    }

    /**
     * Upload de música via painel Web com seleção de categoria
     */
    public function uploadMusic(Request $request): JsonResponse
    {
        if (!$request->hasFile('audio')) {
            return response()->json(['success' => false, 'message' => 'Nenhum arquivo de áudio recebido pelo servidor.'], 400);
        }

        $file = $request->file('audio');
        if (!$file || !$file->isValid()) {
            $errMsg = $file ? $file->getErrorMessage() : 'Arquivo corrompido ou excedeu o limite.';
            return response()->json(['success' => false, 'message' => "Falha no arquivo enviado: {$errMsg}"], 400);
        }

        $allowedExts = ['mp3', 'm4a', 'aac', 'wav', 'ogg', 'flac', 'wma', 'opus', 'webm'];
        $ext = strtolower($file->getClientOriginalExtension());
        
        // Se a extensão veio vazia ou diferente do esperado (muito comum em mobile Android e iOS)
        if (!$ext || !in_array($ext, $allowedExts)) {
            $guessed = strtolower($file->guessExtension() ?? '');
            if (in_array($guessed, $allowedExts)) {
                $ext = $guessed;
            } else {
                $mime = strtolower($file->getMimeType() ?? '');
                $clientMime = strtolower($file->getClientMimeType() ?? '');
                if (
                    str_starts_with($mime, 'audio/') || 
                    str_starts_with($clientMime, 'audio/') || 
                    $mime === 'application/octet-stream' ||
                    $clientMime === 'application/octet-stream' ||
                    str_contains($mime, 'mp3') ||
                    str_contains($clientMime, 'mp3') ||
                    str_contains($mime, 'mpeg') ||
                    str_contains($clientMime, 'mpeg')
                ) {
                    $ext = 'mp3';
                } else {
                    return response()->json([
                        'success' => false,
                        'message' => 'Formato não suportado. Por favor, envie um arquivo de áudio (MP3, M4A ou WAV).'
                    ], 422);
                }
            }
        }

        $cat = $request->input('category', 'adoracao');
        if (!in_array($cat, ['adoracao', 'dormir', 'animadas', 'geral'])) {
            $cat = 'adoracao';
        }

        $destDir = ($cat === 'geral') ? $this->storageDir : ($this->storageDir . '/' . $cat);
        \Illuminate\Support\Facades\File::ensureDirectoryExists($destDir, 0777, true);

        $origName = pathinfo($file->getClientOriginalName() ?: ('musica_' . time()), PATHINFO_FILENAME);
        // Remove caracteres que causam problemas em URLs e no sistema de arquivos
        $cleanBase = preg_replace('/[^\w\s\-\.]/u', '_', $origName);
        $cleanBase = trim(preg_replace('/\s+/', ' ', $cleanBase));
        if ($cleanBase === '') {
            $cleanBase = 'musica_' . time();
        }
        $cleanName = $cleanBase . '.' . $ext;

        // Se já existe um arquivo com esse nome, adiciona timestamp para não sobrescrever
        if (file_exists($destDir . '/' . $cleanName)) {
            $cleanName = $cleanBase . '_' . time() . '.' . $ext;
        }

        $file->move($destDir, $cleanName);

        \Illuminate\Support\Facades\Log::info("Charlene music upload: {$cleanName} into {$cat}");

        $subPath = ($cat === 'geral') ? '' : ($cat . '/');

        return response()->json([
            'success' => true,
            'message' => "Música adicionada à pasta '" . ucfirst($cat) . "' da Sarah com sucesso!",
            'name' => $cleanName,
            'url' => $this->baseUrl . '/storage/sara/musicas/' . $subPath . rawurlencode($cleanName),
        ]);
    }

    /**
     * Upload de áudio recebido via Telegram do Papai Adrian King
     */
    public function uploadFromTelegram(Request $request): JsonResponse
    {
        $fileId = $request->input('file_id');
        $fileName = $request->input('file_name');
        $caption = $request->input('caption', '');
        $token = env('TELEGRAM_BOT_TOKEN') ?: '8871691156:AAGir9vNUOeukdbtFctvLbi8u2BCe95FgJw';

        if (!$fileId) {
            return response()->json(['success' => false, 'message' => 'file_id ausente.'], 400);
        }

        try {
            $infoRes = Http::timeout(10)->get("https://api.telegram.org/bot{$token}/getFile?file_id={$fileId}");
            $filePath = $infoRes->json('result.file_path');

            if (!$filePath) {
                return response()->json(['success' => false, 'message' => 'Arquivo não localizado no Telegram.'], 404);
            }

            $fileContent = Http::timeout(60)->get("https://api.telegram.org/file/bot{$token}/{$filePath}")->body();
            if (empty($fileContent)) {
                return response()->json(['success' => false, 'message' => 'Falha ao baixar áudio do Telegram.'], 500);
            }

            // Detecta categoria pela legenda (caption) ou nome
            $cat = $this->detectCategory($caption ?: $fileName);
            if ($cat === 'todas') $cat = 'adoracao'; // padrão: adoração

            $destDir = ($cat === 'geral') ? $this->storageDir : ($this->storageDir . '/' . $cat);
            $name = $fileName ?: basename($filePath);
            $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
            if (!in_array($ext, ['mp3', 'm4a', 'aac', 'wav', 'ogg'])) {
                $name .= '.mp3';
            }

            File::put($destDir . '/' . $name, $fileContent);

            return response()->json([
                'success' => true,
                'filename' => $name,
                'category' => $cat,
                'message' => "Música '{$name}' adicionada com sucesso à pasta de " . ucfirst($cat) . " da Sarah!",
            ]);
        } catch (\Throwable $e) {
            Log::error('alexa.telegram_upload.err', ['msg' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Erro interno: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Remove música de qualquer categoria
     */
    public function deleteMusic(Request $request): JsonResponse
    {
        $file = basename($request->input('filename', ''));
        $cat = $request->input('category', '');

        $pathsToTry = [];
        if ($cat) {
            $pathsToTry[] = ($cat === 'geral') ? ($this->storageDir . '/' . $file) : ($this->storageDir . '/' . $cat . '/' . $file);
        }
        foreach (['adoracao', 'dormir', 'animadas', ''] as $c) {
            $pathsToTry[] = $c ? ($this->storageDir . '/' . $c . '/' . $file) : ($this->storageDir . '/' . $file);
        }

        foreach ($pathsToTry as $p) {
            if (File::exists($p)) {
                File::delete($p);
                return response()->json(['success' => true, 'message' => 'Música removida com sucesso!']);
            }
        }

        return response()->json(['success' => false, 'message' => 'Arquivo não encontrado.'], 404);
    }

    /**
     * Página visual completa com Gerenciador de Playlists e Cérebro de Memórias
     */
    public function managerPage()
    {
        $musicas = $this->getMusicFiles('todas');
        $memorias = CharleneMemory::where('category', '!=', 'historia_ouvida')->orderBy('updated_at', 'desc')->get();
        $historiasOuvidas = CharleneMemory::where('category', 'historia_ouvida')->orderBy('updated_at', 'desc')->get();
        $totalCatalogo = count(self::HISTORIAS_CATALOGO);

        return view('pages.charleneMusicas', [
            'musicas' => $musicas,
            'memorias' => $memorias,
            'historiasOuvidas' => $historiasOuvidas,
            'totalCatalogo' => $totalCatalogo,
            'historiasCatalogo' => self::HISTORIAS_CATALOGO,
            'baseUrl' => $this->baseUrl . '/storage/sara/musicas/',
        ]);
    }

    /**
     * API: Reinicia o ciclo de histórias bíblicas ouvidas pela Sarah
     */
    public function resetHistoriasProgresso(Request $request): JsonResponse
    {
        CharleneMemory::where('category', 'historia_ouvida')->delete();
        return response()->json([
            'success' => true,
            'message' => 'Ciclo de histórias da Bíblia reiniciado com sucesso! A Sarah poderá ouvir todas as histórias novamente sem repetição.',
        ]);
    }

    /**
     * API: Salva ou edita uma memória manualmente pela interface
     */
    public function saveMemory(Request $request): JsonResponse
    {
        $subject = mb_strtolower(trim($request->input('subject', '')));
        $content = trim($request->input('content', ''));
        $category = $request->input('category', 'pessoa');

        if (!$subject || !$content) {
            return response()->json(['success' => false, 'message' => 'Assunto e descrição são obrigatórios.'], 400);
        }

        $mem = CharleneMemory::updateOrCreate(
            ['subject' => $subject],
            [
                'category' => $category,
                'content' => $content,
                'learned_from' => 'painel_web',
                'last_mentioned_at' => now(),
            ]
        );

        return response()->json(['success' => true, 'memory' => $mem, 'message' => 'Memória gravada no cérebro da Charlene!']);
    }

    /**
     * API: Exclui uma memória
     */
    public function deleteMemory(Request $request): JsonResponse
    {
        $id = $request->input('id');
        $mem = CharleneMemory::find($id);
        if ($mem) {
            $mem->delete();
            return response()->json(['success' => true, 'message' => 'Memória removida!']);
        }
        return response()->json(['success' => false, 'message' => 'Memória não encontrada.'], 404);
    }

    private function cleanSsmlText(string $text): string
    {
        // 1. Decodifica entidades prévias para evitar double-encoding (& -> &amp; -> &amp;amp;)
        $clean = html_entity_decode($text, ENT_QUOTES | ENT_XML1, 'UTF-8');
        // 2. Remove emojis Unicode que a Alexa rejeita e quebram a voz TTS
        $clean = preg_replace('/[\x{1F600}-\x{1F64F}\x{1F300}-\x{1F5FF}\x{1F680}-\x{1F6FF}\x{1F700}-\x{1F77F}\x{1F780}-\x{1F7FF}\x{1F800}-\x{1F8FF}\x{1F900}-\x{1F9FF}\x{1FA00}-\x{1FA6F}\x{1FA70}-\x{1FAFF}\x{2600}-\x{26FF}\x{2700}-\x{27BF}]/u', '', $clean);
        // 3. Remove formatações Markdown
        $clean = str_replace(['**', '__', '*', '#', '`'], '', (string) $clean);
        // 4. Escapa com precisão apenas os caracteres XML requeridos (&, <, >, ", ')
        return htmlspecialchars(trim((string) $clean), ENT_QUOTES | ENT_XML1, 'UTF-8');
    }

    private function respondSsml(string $ssml, bool $endSession = false, ?string $repromptSsml = null): JsonResponse
    {
        if (str_starts_with(trim($ssml), '<speak>') && str_ends_with(trim($ssml), '</speak>')) {
            $inner = preg_replace('/^<speak>(.*)<\/speak>$/is', '$1', trim($ssml));
            $cleanInner = $this->cleanSsmlText($inner);
        } else {
            $cleanInner = $this->cleanSsmlText($ssml);
        }
        $finalSsml = "<speak>{$cleanInner}</speak>";

        $res = [
            'outputSpeech' => [
                'type' => 'SSML',
                'ssml' => $finalSsml,
            ],
            'shouldEndSession' => $endSession,
        ];

        if ($repromptSsml && !$endSession) {
            if (str_starts_with(trim($repromptSsml), '<speak>') && str_ends_with(trim($repromptSsml), '</speak>')) {
                $innerRep = preg_replace('/^<speak>(.*)<\/speak>$/is', '$1', trim($repromptSsml));
                $cleanRep = $this->cleanSsmlText($innerRep);
            } else {
                $cleanRep = $this->cleanSsmlText($repromptSsml);
            }

            $res['reprompt'] = [
                'outputSpeech' => [
                    'type' => 'SSML',
                    'ssml' => "<speak>{$cleanRep}</speak>",
                ],
            ];
        }

        return response()->json(['version' => '1.0', 'response' => $res]);
    }

    private function respondSpeech(string $text, bool $endSession = false, ?string $repromptText = null): JsonResponse
    {
        $res = [
            'outputSpeech' => [
                'type' => 'PlainText',
                'text' => $text,
            ],
            'shouldEndSession' => $endSession,
        ];

        if ($repromptText && !$endSession) {
            $res['reprompt'] = [
                'outputSpeech' => [
                    'type' => 'PlainText',
                    'text' => $repromptText,
                ],
            ];
        }

        return response()->json(['version' => '1.0', 'response' => $res]);
    }
}
