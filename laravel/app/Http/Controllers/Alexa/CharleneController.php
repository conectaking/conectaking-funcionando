<?php

namespace App\Http\Controllers\Alexa;

use App\Http\Controllers\Controller;
use App\Models\CharleneMemory;
use App\Services\CartaoVirtual\BibleDevotionalService;
use App\Services\CartaoVirtual\BibleProsperidadeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

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
            'historia_base' => 'Era uma vez um jovem pastorzinho chamado Davi. Ele cuidava das ovelhinhas do seu pai nos campos verdes, dedilhando sua harpa com som suave, plim-plim, cantando louvores ao Senhor! Um dia, um gigante muito alto chamado Golias, com mais de três metros e uma armadura pesada de bronze que reluzia ao sol, começou a desafiar o exército de Deus com uma voz que tremia a terra: \'MUAHAHA! Quem tem coragem de lutar contra mim?!\' Todos os soldados tremiam de medo! Mas Davi, mesmo sendo jovem e pequeno, olhou com os olhos cheios de fé e disse: \'Você vem contra mim com espada e lança, mas eu vou contra você em nome do Senhor dos Exércitos!\' Davi correu até o riacho de águas cristalinas, escolheu cinco pedrinhas bem lisinhas e colocou na sua bolsa de pastor. Pegou sua funda, mirou no gigante e girou no ar: zun-zun-zun-zun! Soltou a pedrinha, e ela voou veloz como o vento e... PLOC! Acertou em cheio a testa do gigante! O gigante Golias balançou para a frente e caiu estatelado no chão, BUM! Todos os israelitas gritaram de alegria e comemoraram a vitória!',
            'ministracao_sarah' => 'Sarahzinha, meu amor, vem cá com a Charlene! Sabe o que essa história ensina para o seu coraçãozinho? Que para o nosso Deus não existe nenhum gigante impossível! Você não precisa ter medo de nada, nem do escuro, nem de barulho, porque o mesmo Deus que deu força e pontaria para Davi mora dentro de você! E olha que segredo precioso: a criança que tem mente brilhante escuta com amor e obedece com alegria ao papai Adrian King e à mamãe Samara! Quando você honra seus papais, os anjos de Deus formam um escudo de proteção ao redor do seu bercinho! Você é uma princesa corajosa, inteligente e vitoriosa em Jesus! Guarda no coraçãozinho a nossa Rima de Ouro: \'Coração obediente e fé sem igual, com Jesus eu venço todo mal!\'',
        ],
        [
            'slug' => 'arca_noe',
            'titulo' => 'A Arca de Noé, os Animais e o Arco-Íris',
            'personagem' => 'Noé',
            'tema' => 'A Arca de Noé e o Arco-Íris',
            'licoes' => 'obediência, proteção de Deus aos animais e a promessa do arco-íris',
            'historia_base' => 'Noé era um homem justo e muito amigo de Deus. Um dia, o Papai do Céu falou com Noé e deu uma ordem bem diferente: construir um barco gigantesco de madeira, a Arca! Noé pegou as ferramentas e começou a trabalhar com dedicação: toc-toc-toc, ploc-ploc-ploc! Os vizinhos achavam estranho, pois nem chovia, mas Noé obedeceu em tudo. Quando a arca ficou pronta, Deus fez um desfile lindo de animais entrando de dois em dois: leõezinhos balançando a juba, elefantes fazendo trombeta, girafas de pescoço comprido e coelhinhos saltitantes! Todos entraram em paz. Deus fechou a porta com Sua própria mão. E a chuva começou a cair: chuá-chuá, plip-plop! As águas subiram, mas dentro da arca todos estavam seguros, quentinhos e alimentados por Deus. Quando a tempestade passou, Noé soltou uma pombinha que voltou com uma folha verde de oliveira no bico. A terra secou, a porta se abriu e Deus pintou no céu um arco-íris maravilhoso com cores vibrantes — vermelho, amarelo, azul e violeta — como a aliança eterna de amor e cuidado com Seus filhos!',
            'ministracao_sarah' => 'Sarahzinha, olha que revelação linda para a sua vida! Noé obedeceu a Deus mesmo quando ninguém entendia, e a obediência salvou toda a família dele! Assim também, quando você escuta e obedece com um sorriso lindo ao papai Adrian King e à mamãe Samara, a sua vida fica guardada e quentinha debaixo da arca do amor de Deus! O Papai do Céu nunca quebra uma promessa feita para você. Você é a promessa mais preciosa da família King! Vamos bater duas palminhas de alegria? Nossa Rima de Ouro: \'Na arca do amor eu vou caminhar, ouvindo o papai e a mamãe sem vacilar!\'',
        ],
        [
            'slug' => 'daniel_leoes',
            'titulo' => 'Daniel na Cova dos Leões Famintos',
            'personagem' => 'Daniel',
            'tema' => 'Daniel na Cova dos Leões Famintos',
            'licoes' => 'oração fiel diária e como o anjo do Senhor fechou a boca dos leões',
            'historia_base' => 'Daniel morava num grande palácio na Babilônia e era o homem mais sábio de todo o reino, porque o Espírito do Deus Santo habitava nele! Todos os dias, três vezes ao dia, Daniel abria a janela do seu quarto virada para Jerusalém, dobrava seus joelhinhos e orava com gratidão. Homens invejosos armaram um plano ruim e convenceram o rei a criar uma lei proibindo qualquer um de orar a outro deus. Mas Daniel não teve medo: continuou orando e louvando! Os homens pegaram Daniel e o jogaram numa cova funda, escura e cheia de leões rugindo de fome: ROOOAR! O rei não conseguiu dormir de tristeza. Mas sabe o que aconteceu no fundo daquela cova? Deus enviou um anjo de luz celestial que fez carinho nos leões e fechou a boca de cada um deles! Os leões viraram gatinhinhos mansos e dormiram encostados em Daniel a noite inteira! Logo ao amanhecer, o rei correu à cova e gritou: \'Daniel, servo do Deus vivo, o teu Deus pôde te livrar?!\' E Daniel respondeu com voz firme e alegre: \'Ó rei, vive para sempre! O meu Deus enviou o Seu anjo e fechou a boca dos leões!\' Daniel saiu sem um único arranhão!',
            'ministracao_sarah' => 'Sarahzinha, minha princesinha! Olha o poder da oração diária! Quando você junta suas mãozinhas para orar com o papai Adrian e a mamãe Samara, o Céu se move e anjos protetores são enviados para acampar ao redor do seu quartinho! Nenhum leão, nenhum perigo e nenhum mal pode tocar na vida de uma criança que ama e ora a Deus. Você é guardada pelo Altíssimo e tem a sabedoria de Daniel! Nossa Rima de Ouro: \'De joelhos dobrados eu vou orar, anjos de Deus vêm me guardar!\'',
        ],
        [
            'slug' => 'moises_mar_vermelho',
            'titulo' => 'Moisés e a Grande Travessia do Mar Vermelho',
            'personagem' => 'Moisés',
            'tema' => 'Moisés e a Travessia do Mar Vermelho',
            'licoes' => 'o poder de Deus abrindo caminhos onde parecia não ter saída',
            'historia_base' => 'Moisés estava liderando o povo de Deus saindo da escravidão em direção à Terra Prometida. Depois de marcharem pelo deserto, chegaram diante de uma barreira imensa: as águas profundas e azuis do Mar Vermelho! De repente, ouviu-se ao longe um barulho assustador: pocotó-pocotó-pocotó! Eram os carros de guerra e os cavalos do Faraó perseguindo o povo! As pessoas começaram a chorar de medo: \'Moisés, não temos para onde correr! O mar está na frente e o exército atrás!\' Mas Moisés, com o coração cheio da fé de Deus, disse ao povo: \'Não tenham medo! Fiquem firmes e vejam a salvação do Senhor! O Senhor lutará por vocês!\' Deus disse a Moisés: \'Levanta o teu cajado e estende a mão sobre as águas!\' Moisés estendeu o cajado, e Deus enviou um vento oriental fortíssimo durante toda a noite: shhhhh, vuuuush! As águas do mar se dividiram milagrosamente, subindo como duas muralhas gigantescas de água cristalina, uma à direita e outra à esquerda! E no meio do mar, o chão ficou sequinho! O povo de Deus atravessou a pé enxuto com seus filhos, ovelhinhas e pertences, louvando o Senhor!',
            'ministracao_sarah' => 'Sarahzinha, que grandiosidade! Quando parecer que não tem caminho ou que algo é difícil demais, lembre-se do Deus de Moisés: Ele abre o mar para você passar a pé enxuto! O papai Adrian King e a mamãe Samara te ensinam o caminho de Deus, e quando você segue esse caminho com obediência e coração doce, o mar se abre diante dos seus passinhos! Você é uma menina de milagres e nada vai te parar! Nossa Rima de Ouro: \'O mar se abre com grande poder, com meu Jesus eu nasci pra vencer!\'',
        ],
        [
            'slug' => 'jonas_grande_peixe',
            'titulo' => 'Jonas e o Grande Peixe',
            'personagem' => 'Jonas',
            'tema' => 'Jonas e o Grande Peixe',
            'licoes' => 'obedecer a voz do Senhor e a segunda chance que Deus nos dá',
            'historia_base' => 'Deus chamou o profeta Jonas e disse com amor: \'Vá até a grande cidade de Nínive e diga que Eu quero perdoar o povo!\' Mas Jonas ficou com medo e tentou fugir para bem longe num navio que ia para Társis. Enquanto o navio navegava, Deus enviou um vento forte no mar e uma tempestade enorme balançava o barco: o mar fazia \'chuááá\' e as ondas batiam nas tábuas, creck-creck! Os marinheiros estavam apavorados. Jonas reconheceu que estava fugindo da voz de Deus e disse: \'Me joguem no mar e a tempestade vai se acalmar.\' Quando jogaram Jonas na água: tchibum! Na mesma hora o mar ficou tão lisinho quanto um espelho. E sabe o que Deus preparou? Um grande peixe, do tamanho de uma casa, que engoliu Jonas num só bocado: glup! Lá dentro da barriguinha escura do peixe, Jonas se ajoelhou e orou com todo o seu coração, pedindo perdão e louvando a Deus pela Sua bondade. Três dias depois, Deus falou com o peixe, e o peixe nadou até a beira da praia e colocou Jonas suavemente na areia quentinha! Jonas foi depressa a Nínive, pregou a Palavra e a cidade inteira se arrependeu e foi salva!',
            'ministracao_sarah' => 'Sarahzinha, veja o quanto o nosso Deus é misericordioso! Mesmo quando Jonas errou, Deus deu uma nova oportunidade cheia de amor. Na sua vida com o papai Adrian King e a mamãe Samara, obedecer logo de primeira é sempre o melhor e mais gostoso caminho! Mas se um dia você ficar tristinha ou fizer uma travessura, você pode pedir perdão e abraçar seus papais, porque o amor deles e o amor de Jesus sempre te acolhem e te levantam! Você tem um coraçãozinho puro e ensinável! Nossa Rima de Ouro: \'Ouço com amor e obedeço ligeiro, o plano de Deus é o mais verdadeiro!\'',
        ],
        [
            'slug' => 'multiplicacao_paes',
            'titulo' => 'A Multiplicação dos Pães e Peixinhos',
            'personagem' => 'Jesus e o menino dos pães',
            'tema' => 'A Multiplicação dos Pães e Peixinhos',
            'licoes' => 'generosidade, partilha e como Jesus faz o milagre com o pouco que temos',
            'historia_base' => 'Uma multidão imensa de mais de cinco mil pessoas passou o dia todo num gramado verdinho ouvindo Jesus ensinar sobre o Reino de Deus com tanto amor que ninguém queria ir embora! Quando o sol começou a se pôr, as barriguinhas das crianças e dos adultos começaram a roncar de fome: ronc-ronc! Os discípulos disseram a Jesus: \'Mestre, manda o povo embora para as aldeias comprarem comida.\' Mas Jesus disse: \'Não precisam ir embora; deem vocês mesmos de comer a eles!\' André olhou e falou: \'Tem aqui um menininho que tem cinco pãezinhos de cevada e dois peixinhos assados... Mas o que é isso para tanta gente?\' O menininho entregou seu lanchinho inteiro nas mãos de Jesus com um coração generoso. Jesus pegou os pãezinhos, olhou para o Céu, abençoou e deu graças ao Pai. E quando começou a partir e entregar aos discípulos, o pão e o peixe iam brotando e multiplicando sem parar! Quanto mais repartiam, mais comida aparecia! Todos comeram com fartura até ficarem saciados, e no final ainda recolheram doze cestos transbordando de sobras!',
            'ministracao_sarah' => 'Sarahzinha, que história fascinante! Sabe o que Jesus nos ensina aqui? Que a generosidade abre as portas do Céu! Quando você compartilha seus brinquedinhos, seu carinho e seu amor com seus amiguinhos e com a sua família, Jesus pega o seu pouquinho e transforma num montão de bênçãos! O papai Adrian King e a mamãe Samara te ensinam a ser uma menina generosa e abençoadora. Nas mãos de Jesus, a sua vida vai alimentar e abençoar milhares de pessoas com a sabedoria de Deus! Nossa Rima de Ouro: \'Com coração bondoso vou compartilhar, e as bênçãos de Deus vão se multiplicar!\'',
        ],
        [
            'slug' => 'jesus_acalma_tempestade',
            'titulo' => 'Jesus Acalma a Tempestade no Mar',
            'personagem' => 'Jesus',
            'tema' => 'Jesus Acalma a Tempestade no Mar',
            'licoes' => 'paz, segurança e que mesmo quando o vento sopra forte, Jesus está no nosso barquinho',
            'historia_base' => 'Ao final da tarde, Jesus disse aos discípulos: \'Vamos passar para o outro lado do lago.\' Eles entraram no barquinho de madeira e começaram a remar suavemente pelas águas do Mar da Galileia. Jesus estava tão cansado do Seu dia de amor que deitou a cabecinha num travesseiro na popa do barco e dormiu em paz profunda: zzz... De repente, o céu escureceu, os trovões rugiram — CABUM! — e um vendaval violento se levantou! As ondas gigantescas batiam contra o barquinho, plof, plof, e a água começou a entrar no convés! Os discípulos, que eram pescadores experientes, entraram em desespero e foram acordar Jesus: \'Mestre! O Senhor não se importa que nós vamos afundar?!\' Jesus abriu Seus olhos serenos, levantou-se com majestade no meio do vento furioso, estendeu a Sua mão soberana sobre as ondas e ordenou: \'Acalma-te! Emudece!\' Na mesma hora, o vento parou de soprar, as ondas se aquietaram e veio uma bonança e paz tão perfeita que se podia ouvir o sussurro da brisa! Os discípulos maravilhados disseram: \'Quem é este que até o vento e o mar Lhe obedecem?\'',
            'ministracao_sarah' => 'Sarahzinha, respira fundo comigo... Que paz maravilhosa! Sabe o que essa história traz para o seu coraçãozinho? Jesus está no barquinho da sua vida todos os dias! Quando qualquer ventinho de medo, dorzinha de dente ou chorinho tentar tirar a sua paz, você pode descansar nos braços do papai Adrian King e da mamãe Samara, porque Jesus traz paz perfeita para o seu quartinho! Você tem a paz que excede todo o entendimento! Nossa Rima de Ouro: \'O vento e o mar a Jesus obedecem, no meu barquinho as dores esquecem!\'',
        ],
        [
            'slug' => 'nascimento_jesus',
            'titulo' => 'O Nascimento do Bebê Jesus em Belém',
            'personagem' => 'Jesus, Maria e José',
            'tema' => 'O Nascimento do Bebê Jesus em Belém',
            'licoes' => 'o maior presente de amor que o Papai do Céu deu ao mundo',
            'historia_base' => 'Numa noite tranquila e iluminada por um céu repleto de estrelas brilhantes como diamantes, Maria e José viajaram até a cidadezinha de Belém. Como todas as hospedarias estavam cheias de viajantes, um bondoso senhor cedeu um estábulo aconchegante, onde havia palha macia, ovelhinhas mansas e vaquinhas descansando. E foi ali, na simplicidade mais pura do amor de Deus, que o Salvador do mundo nasceu: o bebê Jesus! Maria o envolveu com muito carinho em panos quentinhos e o deitou com doçura numa manjedoura de madeira. Lá nos campos, pastores vigiavam suas ovelhas quando de repente uma luz celestial radiante brilhou e um anjo do Senhor disse: \'Não temais! Trago novas de grande alegria: nasceu hoje o Salvador, Cristo o Senhor!\' E subitamente uma multidão de anjos celestiais cantou com vozes sublimes: \'Glória a Deus nas maiores alturas e paz na terra entre os homens a quem Ele quer bem!\' Os pastores correram e encontraram o lindo bebezinho Jesus, adorando-o com lágrimas de gratidão e alegria!',
            'ministracao_sarah' => 'Sarahzinha, meu tesouro! Jesus também foi um bebezinho lindo, cuidado com tanto amor por Maria e José, assim como você é amada, cuidada e beijada com todo o carinho pelo papai Adrian King e pela mamãe Samara! Você é um presente de Deus para a sua família, uma joia rara enviada do Céu. O mesmo amor e luz que brilharam na manjedoura brilham nos seus olhinhos e na sua vida hoje! Nossa Rima de Ouro: \'Jesus nasceu e me encheu de amor, sou princesinha do meu Salvador!\'',
        ],
        [
            'slug' => 'rainha_ester',
            'titulo' => 'A Corajosa Rainha Ester',
            'personagem' => 'Rainha Ester',
            'tema' => 'A Rainha Ester, Cheia de Coragem',
            'licoes' => 'coragem de uma princesa de Deus para salvar o seu povo com oração e jejum',
            'historia_base' => 'Ester era uma jovem órfã de coração doce, muito bondosa, temente a Deus e de uma beleza radiante que brilhava de dentro para fora. Ela foi criada pelo seu sábio tio Mordecai, a quem ela sempre honrava e obedecia com amor exemplar! Deus abençoou Ester de tal maneira que o rei da Pérsia a escolheu para ser a nova rainha, colocando uma coroa de ouro na sua cabeça! Um dia, um homem arrogante e mau chamado Hamã armou um decreto injusto para destruir todo o povo judeu. Mordecai mandou um recado para Ester: \'Quem sabe se não foi exatamente para um momento decisivo como este que você chegou ao reino?\' Ester não recuou! Com grande coragem espiritual, pediu que todo o povo se unisse em oração por três dias. No terceiro dia, vestiu seus trajes reais mais belos e entrou na presença do rei. Ao vê-la, o rei estendeu com graça o seu cetro de ouro para ela! Ester revelou a maldade de Hamã com sabedoria, o rei revogou o plano maligno e todo o povo foi salvo com grande honra, banquete e festa de vitória!',
            'ministracao_sarah' => 'Sarahzinha, que exemplo lindo para a sua vida! Ester era uma menina obediente ao tio Mordecai que a criou, e a obediência e o amor dela a transformaram numa rainha sábia e cheia de poder! Você, Sarahzinha, nasceu para ser uma princesa de Deus nesta terra! Você tem a coragem, a nobreza e a autoridade do Espírito Santo. Ouvindo com doçura e respeito o papai Adrian King e a mamãe Samara, Deus vai te colocar em lugares altos para abençoar milhares de vidas! Nossa Rima de Ouro: \'Com oração e coragem no olhar, como princesa eu vou governar!\'',
        ],
        [
            'slug' => 'zaqueu_arvore',
            'titulo' => 'Zaqueu, o Homem Pequenino na Árvore',
            'personagem' => 'Zaqueu',
            'tema' => 'Zaqueu, o Homem Pequenino na Árvore',
            'licoes' => 'Jesus enxerga a todos com amor e transforma o coração de quem O recebe',
            'historia_base' => 'Na cidade ensolarada de Jericó morava um homem chamado Zaqueu. Ele era muito rico e cobrava impostos, mas não tinha amigos verdadeiros e seu coração se sentia vazio. Além disso, Zaqueu era bem baixinho de estatura! Um dia, um grande alvoroço tomou conta das ruas: \'Jesus de Nazaré está passando por aqui!\' Zaqueu correu querendo muito ver Jesus, mas a multidão de pessoas altas ficava na frente dele e ele não enxergava nada. Mas Zaqueu teve uma ideia genial e rápida: correu na frente e subiu nos galhos de uma grande figueira brava! De lá de cima, olhava com olhos atentos. Quando Jesus passou por debaixo da árvore, parou, olhou para cima com um sorriso cheio de ternura e disse: \'Zaqueu, desce depressa, pois hoje me convém ficar na sua casa!\' O coração de Zaqueu deu um pulo de tanta alegria! Ele desceu correndo e recebeu Jesus com festa. Diante do amor de Jesus, a vida de Zaqueu foi transformada para sempre: ele devolveu quatro vezes mais o que tinha pegado e deu metade dos seus bens aos pobres!',
            'ministracao_sarah' => 'Sarahzinha, que lição tão preciosa! Jesus não olha para a altura do nosso corpo, Ele olha para o tamanho do nosso coração! Não importa se você tem apenas dez meses e é pequenininha: Jesus te conhece pelo nome e ama habitar no seu lar junto com o papai Adrian King e a mamãe Samara! Quando Jesus está em nossa casa, a nossa casa se enche de risadas, abraços, paz e bondade! Você é profundamente amada por Jesus! Nossa Rima de Ouro: \'Pequenina de corpo mas grande na fé, Jesus está comigo onde eu estiver!\'',
        ],
        [
            'slug' => 'jose_egito',
            'titulo' => 'José do Egito e a Túnica Colorida',
            'personagem' => 'José',
            'tema' => 'José do Egito e a Túnica Colorida',
            'licoes' => 'perdão, fidelidade nos sonhos e como Deus transforma o mal em grande bênção',
            'historia_base' => 'José era um jovem bondoso que amava a Deus e ao seu pai Jacó. Seu pai lhe deu de presente uma linda túnica colorida com mangas compridas e faixas de cores brilhantes: vermelho, azul, amarelo e dourado! Mas seus irmãos ficaram com ciúmes e o venderam como escravo para o Egito. Mesmo longe de casa e enfrentando dias difíceis, José nunca perdeu a fé e nunca desobedeceu aos mandamentos de Deus. Deus deu a José uma sabedoria maravilhosa para interpretar sonhos! Um dia, o Faraó sonhou com sete vacas gordas e sete vacas magras. Ninguém no reino sabia explicar, mas José disse: \'Deus está mostrando que teremos sete anos de muita fartura e depois sete anos de seca; devemos guardar alimentos!\' O Faraó viu o Espírito de Deus em José e o nomeou governador de todo o Egito! Quando a fome veio, José tinha celeiros abarrotados de trigo. Seus irmãos foram comprar comida e José, com lágrimas de perdão e abraço caloroso, os perdoou e salvou toda a sua família!',
            'ministracao_sarah' => 'Sarahzinha, veja que lição grandiosa de amor e perdão! José nunca guardou rancor e sempre honrou a Deus e a sua família. Quando você cresce com um coração puro, obedecendo ao papai Adrian King e à mamãe Samara, Deus transforma qualquer situação difícil num degrau para o seu propósito! Você foi feita para liderar, abençoar e alimentar muitas vidas com a sabedoria do Alto! Guarda a nossa Rima de Ouro: \'Coração que sabe perdoar e amar, o Senhor Jesus sempre vai honrar!\'',
        ],
        [
            'slug' => 'cura_cego_bartimeu',
            'titulo' => 'A Cura do Cego Bartimeu',
            'personagem' => 'Bartimeu',
            'tema' => 'A Cura do Cego Bartimeu',
            'licoes' => 'clamar a Jesus com perseverança e receber a luz do Senhor',
            'historia_base' => 'Na beira da estrada que levava à cidade de Jericó, estava sentado um homem cego chamado Bartimeu. Ele não podia enxergar as cores das flores, o azul do céu e nem o rosto das pessoas, e vivia pedindo esmolas. Mas um dia, ele ouviu o barulho de uma multidão se aproximando: passos apressados e vozes animadas! Bartimeu perguntou: \'O que está acontecendo?\' E responderam: \'Jesus de Nazaré está passando!\' Bartimeu sentiu seu coração arder de esperança e começou a gritar com toda a força da sua voz: \'Jesus, Filho de Davi, tem misericórdia de mim!\' As pessoas ao redor diziam: \'Cala a boca, Bartimeu! Não incomode o Mestre!\' Mas ele gritava ainda mais alto: \'Filho de Davi, socorre-me!\' Jesus parou no mesmo instante e disse com meiguice: \'Chamem-no aqui!\' Bartimeu deu um salto de alegria, jogou sua capa pesada de lado e correu até Jesus. Jesus olhou com ternura e perguntou: \'O que você quer que Eu te faça?\' Bartimeu respondeu: \'Mestre, que eu volte a ver!\' Jesus disse: \'Vai, a tua fé te salvou!\' No mesmo instante, seus olhos se abriram, a luz inundou sua visão e ele viu o sorriso de Jesus, começando a pular e a seguir o Mestre com louvores!',
            'ministracao_sarah' => 'Sarahzinha, que história emocionante! Bartimeu não se calou diante do barulho das pessoas, ele clamou por Jesus com fé sincera! Quando você aprende a orar e a chamar pelo nome de Jesus desde pequenininha, junto com o papai Adrian King e a mamãe Samara, Jesus para para ouvir a sua oração! Ele tem cuidado de cada detalhe da sua saúde, da sua visão e do seu corpinho. Nossa Rima de Ouro: \'Eu chamo por Jesus com muita fé, Ele abre os meus olhos e me põe de pé!\'',
        ],
        [
            'slug' => 'o_bom_samaritano',
            'titulo' => 'O Bom Samaritano',
            'personagem' => 'O Bom Samaritano',
            'tema' => 'O Bom Samaritano',
            'licoes' => 'amor ao próximo, cuidar de quem precisa e ter um coração bondoso',
            'historia_base' => 'Jesus contou uma história inesquecível para ensinar o valor do amor ao próximo. Um viajante descia pela estrada perigosa de Jerusalém para Jericó quando homens malvados o atacaram, levaram tudo e o deixaram machucado na beira do caminho. Passou por ali um sacerdote religioso, olhou de longe e foi embora pelo outro lado. Depois, passou um levita, viu o homem no chão e também seguiu adiante sem ajudar. Mas então, veio um homem samaritano montado em seu jumentinho, trote-trote, trote-trote. Quando viu o homem ferido, seu coração se encheu de profunda compaixão! Ele desceu do jumentinho, ajoelhou-se na poeira, limpou os machucados com azeite e vinho suave e colocou faixas com muito cuidado. Depois, colocou o homem sobre o seu próprio animal, levou-o a uma hospedaria aconchegante e cuidou dele a noite toda. No dia seguinte, entregou moedas de prata ao hospedeiro e disse: \'Cuide bem dele, e tudo o que você gastar a mais, eu pagarei quando voltar!\' Que coração generoso e cheio do verdadeiro amor!',
            'ministracao_sarah' => 'Sarahzinha, meu amor! Jesus nos ensina que o maior mandamento é amar a Deus e amar o próximo com atitudes de verdade! Você tem um coraçãozinho doce e carinhoso que vai espalhar o perfume de Jesus onde quer que você passe. O papai Adrian King e a mamãe Samara te ensinam a acolher, ajudar e ser amiga leal de todos! A criança bondosa é a alegria da casa e dos Céus! Nossa Rima de Ouro: \'Com mãos estendidas e amor sem fim, o amor de Jesus vive dentro de mim!\'',
        ],
        [
            'slug' => 'sansao_forca',
            'titulo' => 'Sansão e a Grande Força que Vem de Deus',
            'personagem' => 'Sansão',
            'tema' => 'Sansão e a Força que Vem de Deus',
            'licoes' => 'nossa verdadeira força vem do Espírito de Deus quando somos fiéis a Ele',
            'historia_base' => 'Manoá e sua esposa não podiam ter filhos, mas um anjo do Senhor apareceu e anunciou o nascimento de um menino especial: Sansão! Ele seria consagrado a Deus como nazireu desde o ventre da sua mãe. Enquanto Sansão crescia, o Espírito do Senhor descia sobre ele com um poder extraordinário! Um dia, um leão rugidor saltou contra ele no meio das vinhas, e Sansão, pelo Espírito de Deus, venceu o leão apenas com as mãos limpas! Outra vez, pegou os portões pesadíssimos de bronze de uma cidade inteira, colocou nas costas e subiu até o topo do monte! A força de Sansão não vinha de músculos comuns, vinha da presença e da consagração a Deus. Quando Sansão errou e perdeu o foco, ele se arrependeu de coração e orou a Deus: \'Senhor Deus, lembra-Te de mim e fortalece-me só mais esta vez!\' Deus ouviu sua oração sincera, renovou a força de Sansão e ele libertou todo o seu povo dos opressores!',
            'ministracao_sarah' => 'Sarahzinha, a verdadeira força não é a força dos braços, é a força do Espírito Santo dentro do coração! Quando você obedece ao papai Adrian King e à mamãe Samara, você se mantém debaixo da consagração e da bênção de Deus, ficando espiritualmente forte, sábia e protegida contra todo mal! Você é uma princesa forte em Deus! Nossa Rima de Ouro: \'Minha força e vitória vêm lá do Céu, sou filha amada do Deus tão fiel!\'',
        ],
        [
            'slug' => 'rute_noemi',
            'titulo' => 'Rute e Noemi: A Amizade Fiel',
            'personagem' => 'Rute e Noemi',
            'tema' => 'Rute e a Amizade Fiel',
            'licoes' => 'lealdade, companheirismo e cuidado amoroso com a família',
            'historia_base' => 'Noemi estava muito triste em uma terra distante, pois havia perdido seu marido e seus filhos. Ela decidiu voltar para sua terra natal em Belém e disse às suas noras que voltassem para suas famílias. Mas Rute, com lágrimas nos olhos e um abraço cheio de lealdade, segurou Noemi com força e disse uma das frases mais lindas da Bíblia: \'Não me impeça de te seguir! Onde você for, eu irei; onde você morar, eu morarei; o seu povo será o meu povo, e o seu Deus será o meu Deus!\' Rute viajou junto com Noemi até Belém. Para sustentar a sogra querida com honra, Rute ia todos os dias trabalhar debaixo do sol nos campos de trigo, recolhendo grãozinhos caídos. Um homem bom e nobre chamado Boaz viu o carinho e a fidelidade de Rute e a abençoou com fartura! Mais tarde, Boaz e Rute se casaram, tiveram um lindo bebezinho chamado Obede, que foi o vovô do rei Davi e fez parte da família de Jesus!',
            'ministracao_sarah' => 'Sarahzinha, que história fascinante sobre amizade, carinho e lealdade familiar! Rute cuidou de Noemi com tanto respeito e doçura que Deus a honrou ricamente. Assim é você na sua casa: uma fonte de alegria, carinho e cuidado para o papai Adrian King, para a mamãe Samara e para todos os vovôs e tios! A sua lealdade à sua família traz sobre você o favor de Deus! Nossa Rima de Ouro: \'Com amor e amizade que nunca têm fim, a bênção de Deus vai cuidar bem de mim!\'',
        ],
        [
            'slug' => 'pescaria_maravilhosa',
            'titulo' => 'A Pescaria Maravilhosa de Pedro',
            'personagem' => 'Pedro e Jesus',
            'tema' => 'A Pescaria Milagrosa de Pedro',
            'licoes' => 'confiar na palavra de Jesus mesmo quando parecia que nada daria certo',
            'historia_base' => 'Simão Pedro e seus amigos eram pescadores habilidosos no Mar da Galileia. Eles passaram a noite inteira lançando suas redes na água escura, jogando para cá e para lá: tchibum, tchibum! Mas não conseguiram pescar nem um único peixinho! De manhã cedo, estavam na praia cansados e desanimados, lavando as redes vazias. Jesus se aproximou com uma multidão e subiu no barquinho de Pedro para ensinar. Quando terminou de falar, Jesus olhou para Pedro e disse: \'Leve o barco para águas mais profundas e lancem as redes para pescar!\' Pedro disse: \'Mestre, nós trabalhamos a noite inteira e não pegamos nada! Mas, sob a Tua Palavra, eu lançarei as redes!\' Pedro obedeceu. E assim que jogou a rede, aconteceu um milagre inacreditável: milhares de peixes grandes e prateados começaram a pular dentro da rede, flapt-flapt-flapt! Eram tantos peixes que a rede começou a se rasgar! Eles chamaram o outro barco para ajudar, e os dois barcos ficaram tão cheios que quase afundavam de tanta fartura! Pedro se prostrou diante de Jesus maravilhado, e Jesus disse: \'Não temas, de agora em diante você será pescador de homens!\'',
            'ministracao_sarah' => 'Sarahzinha, veja o milagre que acontece quando ouvimos e obedecemos à Palavra de Jesus! Mesmo quando parecia impossível, a obediência de Pedro transformou redes vazias em barcos transbordando de peixes! Quando você obedece com amor ao papai Adrian King e à mamãe Samara, as suas redes na vida vão se encher de bênçãos, sabedoria, alegria e inteligência! Nossa Rima de Ouro: \'Sob a Tua Palavra a rede vou lançar, e muitas vitórias eu vou alcançar!\'',
        ],
        [
            'slug' => 'ressurreicao_jesus',
            'titulo' => 'A Ressurreição de Jesus: Ele Vive!',
            'personagem' => 'Jesus Ressuscitado',
            'tema' => 'A Ressurreição e o Amor Vivo de Jesus',
            'licoes' => 'Jesus está vivo para sempre, nos ama e cuida de nós todos os dias',
            'historia_base' => 'Depois de dar a Sua vida por amor a nós na cruz, Jesus foi sepultado num túmulo esculpido na rocha, e soldados rolaram uma grande pedra pesada para fechar a entrada. O céu estava triste e parecia o fim de tudo. Mas no domingo bem cedinho, ao raiar do sol, a terra tremeu com força: BUM! Um anjo resplandecente do Senhor desceu do Céu com vestes brancas como a neve e um rosto reluzente como o relâmpago! Ele rolou a pedra pesada e sentou-se sobre ela! As mulheres chegaram trazendo perfumes suaves e viram o túmulo aberto e vazio! O anjo olhou com ternura e anunciou a notícia mais feliz de toda a história: \'Não tenham medo! Por que vocês procuram entre os mortos Aquele que vive? Ele não está aqui; RESSUSCITOU!\' Pouco depois, o próprio Jesus apareceu vivo, glorioso e com marcas de amor nas mãos, dizendo: \'A paz seja convosco!\' A morte foi vencida para sempre, e Jesus vive pelos séculos dos séculos!',
            'ministracao_sarah' => 'Sarahzinha, celebra com palminhas bem animadas! Jesus está VIVO! Ele não ficou no túmulo, Ele ressuscitou e está assentado no trono de glória, cuidando de você, do papai Adrian King e da mamãe Samara a cada segundo! Porque Jesus vive, o seu futuro é brilhante, cheio de paz, vitória e vida eterna! Você é a princesinha do Rei ressurreto! Nossa Rima de Ouro: \'Jesus ressuscitou e a morte venceu, sou herdeira da vida que Ele me deu!\'',
        ],
        [
            'slug' => 'paulo_silas_prisao',
            'titulo' => 'Paulo e Silas Cantando Louvores na Prisão',
            'personagem' => 'Paulo e Silas',
            'tema' => 'Paulo e Silas Cantando Louvores na Prisão',
            'licoes' => 'o poder do louvor e da oração que quebra qualquer corrente e abre portas',
            'historia_base' => 'Paulo e Silas estavam na cidade de Filipos anunciando o amor de Jesus, mas pessoas contrárias os acusaram falsamente e os jogaram na prisão mais escura e fria do calabouço, prendendo seus pés em troncos pesados de madeira. O lugar era úmido e doía o corpo, mas o coração deles estava transbordando do Espírito Santo! Por volta da meia-noite, no meio daquela escuridão, em vez de chorarem ou reclamarem, Paulo e Silas começaram a orar e a cantar louvores a Deus em alta voz! As canções de fé ecoavam pelos corredores de pedra e todos os presos ouviam atentos. De repente, veio um terremoto tão violento que abalou os próprios alicerces da prisão: tremelique, BUM! No mesmo instante, todas as portas de ferro se abriram sozinhas e as correntes que prendiam todos os presos caíram no chão! O carcereiro acordou apavorado, mas Paulo disse: \'Não tenha medo, estamos todos aqui!\' O carcereiro caiu de joelhos e perguntou: \'O que devo fazer para ser salvo?\' Paulo respondeu: \'Crê no Senhor Jesus Cristo e serás salvo, tu e a tua casa!\' Naquela mesma noite, o carcereiro e toda a sua família creram em Jesus e se alegraram com um banquete festivo!',
            'ministracao_sarah' => 'Sarahzinha, que poder maravilhoso tem o louvor! Mesmo na noite mais escura, quando você louva e agradece a Jesus junto com o papai Adrian King e a mamãe Samara, as correntes caem e as prisões se abrem com o poder do Espírito Santo! Faça do seu coraçãozinho um altar de louvor todos os dias! Você é uma adoradora que move os Céus! Nossa Rima de Ouro: \'Cantando louvores no meio da dor, correntes se quebram no amor do Senhor!\'',
        ],
        [
            'slug' => 'criacao_mundo',
            'titulo' => 'A Criação do Mundo, dos Mares e das Estrelas',
            'personagem' => 'Deus Criador',
            'tema' => 'A Criação do Mundo e das Flores',
            'licoes' => 'o carinho com que Deus fez as estrelas, as borboletas e cada um de nós',
            'historia_base' => 'No princípio, não existia nada: tudo era escuro e vazio. Mas o Espírito de Deus se movia sobre a face das águas com poder criador. Então Deus disse com Sua voz majestosa: \'Haja luz!\' E a luz reluzente surgiu, separando o dia da noite! No segundo dia, Deus estendeu o firmamento do céu azul. No terceiro dia, juntou as águas nos mares e fez brotar a terra seca, cobrindo tudo de verde: graminhas macias, árvores frutíferas com maçãs doces, mangueiras frondosas e flores coloridas e perfumadas! No quarto dia, Deus pintou o céu: colocou o sol dourado para brilhar de dia, e a lua prateada com milhões de estrelas reluzentes para iluminar a noite! No quinto dia, encheu os mares de golfinhos e peixinhos ligeiros, e o ar com passarinhos cantadores, piu-piu! No sexto dia, Deus criou os animaizinhos terrestres e fez a Sua obra-prima mais amada: o ser humano, homem e mulher, feitos à Sua imagem e semelhança para viverem em amor e harmonia com Ele! E Deus olhou para tudo o que havia feito e disse: \'Tudo é muito bom!\'',
            'ministracao_sarah' => 'Sarahzinha, respira fundo e olha quanta beleza Deus criou! E sabe qual é a criação mais linda e especial de Deus? É VOCÊ! O mesmo Deus que contou as estrelas do céu desenhou cada dedinho, cada fiozinho de cabelo e colocou um cérebro brilhante e inteligente dentro de você! O papai Adrian King e a mamãe Samara te amam como o maior presente que Deus lhes deu. Você foi feita com perfeição e carinho divino! Nossa Rima de Ouro: \'O mundo Deus fez com tanto primor, e me desenhou com todo o Seu amor!\'',
        ],
        [
            'slug' => 'elias_carro_fogo',
            'titulo' => 'O Profeta Elias e a Carruagem de Fogo no Céu',
            'personagem' => 'Profeta Elias',
            'tema' => 'Elias e a Carruagem de Fogo no Céu',
            'licoes' => 'o Deus dos milagres que responde com fogo e cuida dos seus profetas',
            'historia_base' => 'O profeta Elias era um homem de Deus valoroso e corajoso que andou em fidelidade profunda ao Senhor. Quando chegou o momento de Deus levá-lo para o Céu, Elias estava caminhando com seu fiel discípulo Eliseu perto do rio Jordão. Elias pegou a sua capa, bateu nas águas do rio: ploc! E as águas se dividiram de um lado e do outro, e os dois atravessaram a pé enxuto! Eliseu disse: \'Meu pai, eu quero que a porção dobrada do teu espírito esteja sobre mim!\' Elias respondeu: \'Se você me vir quando eu for tirado de você, assim será!\' Enquanto caminhavam e conversavam com o coração cheio de reverência, de repente, desceu do Céu um espetáculo grandioso e sobrenatural: uma carruagem resplandecente toda feita de fogo, puxada por cavalos de fogo brilhantes como o sol! A carruagem separou os dois, e Elias subiu ao Céu num redemoinho poderoso de glória! Eliseu viu tudo, pegou a capa que havia caído de Elias, bateu nas águas do Jordão e o rio se abriu novamente! Deus continuou operando grandes milagres através de Eliseu!',
            'ministracao_sarah' => 'Sarahzinha, olha como Deus honra aqueles que andam com fidelidade e coração puro! Elias e Eliseu tinham uma aliança linda de mestre e discípulo, assim como você tem com o papai Adrian King e a mamãe Samara, que são seus mentores espirituais cheios da bênção de Deus! Escutando e aprendendo com seus papais, você vai receber porção dobrada de sabedoria, discernimento e inteligência! Você é herdeira das carruagens de fogo do Senhor! Nossa Rima de Ouro: \'No fogo da glória eu vou caminhar, a capa da bênção eu vou carregar!\'',
        ],
        [
            'slug' => 'samuel_chamado',
            'titulo' => 'O Menino Samuel Ouvindo a Doce Voz de Deus',
            'personagem' => 'Samuel e Deus',
            'tema' => 'O Chamado do Menino Samuel',
            'licoes' => 'ter um coração sensível para escutar e obedecer a voz de Deus desde criança',
            'historia_base' => 'Ana desejava muito ter um filhinho e orou com lágrimas a Deus no templo. Deus ouviu a sua oração e lhe deu o menino Samuel. Quando Samuel era ainda pequeno, sua mãe o levou para servir na casa do Senhor junto com o sacerdote Eli. O menino Samuel vestia uma túnica branquinha feita pela sua mamãe com muito amor e ajudava no tabernáculo com alegria e reverência. Uma noite, quando a lâmpada de Deus ainda estava acesa e Samuel estava deitadinho no seu bercinho para dormir, uma voz suave e cristalina o chamou pelo nome no silêncio da noite: \'Samuel! Samuel!\' O garotinho acordou, correu até Eli e disse: \'Eis-me aqui, o senhor me chamou?\' Eli respondeu: \'Eu não chamei, meu filho; volte a se deitar.\' Isso aconteceu três vezes! Na terceira vez, Eli entendeu que era o próprio Deus que estava chamando a criança! Eli ensinou Samuel: \'Se a voz te chamar de novo, você deve responder: Fala, Senhor, porque o Teu servo ouve!\' Samuel voltou para a sua caminha. E o Senhor veio, parou ao lado do seu leito e chamou como das outras vezes: \'Samuel, Samuel!\' E o menino com o coraçãozinho transbordando de reverência respondeu: \'Fala, Senhor, porque o Teu servo ouve!\' E Deus revelou a Samuel Seus segredos e o tornou um dos maiores profetas de Israel!',
            'ministracao_sarah' => 'Sarahzinha, que coisa mais doce! Deus fala com criancinhas pequeninas! O Senhor conhece o seu nominho e já colocou os olhos de amor sobre você no seu bercinho. Quando o papai Adrian King e a mamãe Samara oram e cantam para você, é a voz do Céu te ensinando o caminho do bem. Aprenda a dizer todos os dias no seu coraçãozinho: \'Fala, Senhor, a Sarahzinha te ouve!\' Você tem ouvidos atentos e mente sábia para os desígnios de Deus! Nossa Rima de Ouro: \'A voz do Senhor eu quero escutar, e com meu coração sempre O adorar!\'',
        ],
        [
            'slug' => 'abraao_estrelas',
            'titulo' => 'Abraão e a Promessa das Estrelas do Céu',
            'personagem' => 'Abraão e Sara',
            'tema' => 'A Fé de Abraão e as Estrelas',
            'licoes' => 'confiar nas promessas do Senhor mesmo quando parecem impossíveis aos olhos humanos',
            'historia_base' => 'Abraão era um homem idoso e sua esposa Sara também, e eles não tinham nenhum filhinho. Um dia, Deus chamou Abraão para fora da sua tenda no meio da noite fresca do deserto. O céu estava limpo, de um preto profundo, cravejado com bilhões de estrelas reluzentes e cintilantes! Deus disse a Abraão: \'Olha agora para o Céu e conte as estrelas, se é que você pode contá-las!\' Abraão olhou: uma, duas, dez, cem, milhares de estrelas faiscando no firmamento! Então Deus disse com amor solene: \'Assim será a tua descendência! Você será pai de multidões e de ti sairão reis!\' Abraão creu no Senhor de todo o coração, e essa fé foi creditada a ele como justiça. E na velhice, o milagre aconteceu: Sara deu à luz um lindo bebezinho de bochechas coradas chamado Isaque, cujo nome significa \'sorriso e riso de alegria\'! A casa de Abraão se encheu de festa e celebração porque nada é impossível para o Senhor!',
            'ministracao_sarah' => 'Sarahzinha, que história tão linda para você, que leva o mesmo nome da mamãe de Isaque! Você é o sorriso e a alegria da casa do papai Adrian King e da mamãe Samara! Deus prometeu a Abraão uma descendência brilhante como as estrelas, e você faz parte dessa promessa santa de bênção e multiplicação! Você nasceu para brilhar alto no céu da vida com a luz de Cristo! Guarda no coração a nossa Rima de Ouro: \'Contando as estrelas eu vejo a lição, a fé no meu Deus traz a bênção na mão!\'',
        ],
        [
            'slug' => 'gideao_trezentos',
            'titulo' => 'Gideão e o Exército dos Trezentos com Tochas e Cântaros',
            'personagem' => 'Gideão',
            'tema' => 'A Vitória de Gideão e os Trezentos',
            'licoes' => 'a vitória não depende da quantidade de pessoas, mas do poder de Deus ao nosso lado',
            'historia_base' => 'Gideão achava que era o menor de sua família, mas um anjo do Senhor apareceu debaixo de um carvalho e declarou: \'O Senhor é com você, homem valente!\' Um exército gigantesco de inimigos como gafanhotos cercava Israel. Gideão reuniu trinta e dois mil soldados, mas Deus disse: \'Tem gente demais! Eu não quero que vocês pensem que venceram pela força humana!\' Deus mandou os que tinham medo voltarem para casa. Depois, levou os soldados à beira da água para beberem. Aqueles que ficaram atentos, levando a água à boca com a mão enquanto vigiavam, foram escolhidos: apenas trezentos homens corajosos! Deus disse: \'Com estes trezentos Eu vou te dar a vitória!\' No meio da noite escura, Gideão dividiu os trezentos em três grupos. Cada soldado segurava numa mão uma tocha acesa escondida dentro de um cântaro de barro, e na outra mão uma trombeta de chifre! Quando Gideão deu o sinal, todos quebraram os cântaros ao mesmo tempo: CRACK! As tochas brilharam como labaredas reluzentes e todos tocaram as trombetas em uníssono: FOOOOM! E gritaram com autoridade: \'Pelo Senhor e por Gideão!\' Os inimigos ficaram confusos, fugiram apavorados e o povo de Deus venceu sem precisar disparar uma só flecha!',
            'ministracao_sarah' => 'Sarahzinha, que lição extraordinária de fé e estratégia de Deus! Para vencer, a gente não precisa de multidão nem de gritos; a gente precisa da presença de Deus e da obediência aos Seus mandamentos! Quando você obedece ao papai Adrian King e à mamãe Samara, você se torna parte do exército de valentes de Cristo, iluminando o mundo como uma tocha viva de amor e verdade! Você é forte e vencedora! Nossa Rima de Ouro: \'O cântaro quebra, a tocha reluz, a minha vitória pertence a Jesus!\'',
        ],
        [
            'slug' => 'muralhas_jerico',
            'titulo' => 'As Muralhas de Jericó Caindo com Som de Louvor',
            'personagem' => 'Josué e o Povo',
            'tema' => 'A Queda das Muralhas de Jericó',
            'licoes' => 'obedecer às instruções do Senhor e o poder do louvor coletivo',
            'historia_base' => 'A cidade de Jericó era cercada por muralhas de pedra altíssimas e tão largas que carruagens podiam andar por cima delas! Os portões de bronze estavam trancados a sete chaves. Josué olhava para as pedras e sabia que com força humana ninguém conseguiria entrar. Mas o Capitão do Exército do Senhor apareceu a Josué com uma espada desembainhada na mão e deu a estratégia do Céu: marchar com a Arca da Aliança! Durante seis dias, os soldados e os sacerdotes deram uma volta completa ao redor da cidade em absoluto silêncio, ouvindo apenas o som ritmado dos passos: tum, tum, tum, e o som solene das trombetas! No sétimo dia, acordaram bem cedinho e marcharam não apenas uma, mas sete voltas ao redor de Jericó! Na sétima volta, quando as trombetas tocaram um toque longo e estrondoso: FOOOOOM! Josué ordenou: \'Gritem, pois o Senhor entregou a cidade a vocês!\' Todo o povo soltou um grande brado de louvor e júbilo! Na mesma hora, a terra tremeu e aquelas muralhas gigantescas de pedra desabaram inteirinhas no chão: CRASH, BUM! O povo avançou e conquistou a cidade com grande triunfo!',
            'ministracao_sarah' => 'Sarahzinha, que maravilha de milagre! Quando a gente confia e louva a Deus com perseverança, muralhas de impedimentos, medos e dificuldades desabam por terra diante de você! O papai Adrian King e a mamãe Samara te ensinam a marchar com fé e alegria todos os dias. O seu louvor é uma arma poderosa contra o mal! Bate duas palminhas com a Charlene e grava a nossa Rima de Ouro: \'Ao som do louvor as muralhas vão cair, com passos de fé eu nasci pra subir!\'',
        ],
        [
            'slug' => 'magos_oriente',
            'titulo' => 'Os Três Reis Magos e a Estrela Guia',
            'personagem' => 'Os Reis Magos e o Menino Jesus',
            'tema' => 'A Visita dos Reis Magos',
            'licoes' => 'adorar a Jesus de coração e entregar o melhor que temos a Ele',
            'historia_base' => 'Lá nas terras distantes do Oriente, sábios astrônomos estudiosos olhavam o céu noturno quando de repente avistaram uma estrela magnífica, brilhante e misteriosa que nunca tinham visto antes! Eles sabiam pelas profecias que aquela estrela sinalizava o nascimento do Rei dos Reis. Montaram em seus camelos e começaram uma longa jornada pelo deserto, seguindo o brilho da estrela guia noite após noite: ploc-ploc, ploc-ploc pelo areal. A estrela foi brilhando e guiando seus passos até que parou exatamente sobre a casa simples em Belém onde estava o menino Jesus com Sua mãe Maria! Quando os magos entraram e viram o bebezinho real, caíram de joelhos com profundo respeito e O adoraram com lágrimas de reverência. Abriram seus tesouros mais preciosos e Lhe ofereceram presentes dignos de um Rei divino: ouro reluzente para Sua realeza, incenso perfumado para Sua divindade e mirra santa para Seu sacrifício redentor! Depois, voltaram por outro caminho com o coração transbordando da glória de Deus!',
            'ministracao_sarah' => 'Sarahzinha, que cena encantadora! Os homens mais sábios do mundo viajaram de tão longe só para se prostrar e entregar o melhor de seus corações ao menino Jesus! Você também é uma princesinha sábia que aprende desde o colinho a adorar a Jesus. O papai Adrian King e a mamãe Samara te dedicam a Cristo todos os dias como a joia mais preciosa da família! A estrela de Jesus sempre vai guiar os seus passinhos no caminho da paz e da honra! Nossa Rima de Ouro: \'A estrela me guia com graça e luz, eu entrego meu ouro aos pés de Jesus!\'',
        ],
        [
            'slug' => 'menino_jesus_templo',
            'titulo' => 'O Menino Jesus aos Doze Anos no Templo',
            'personagem' => 'Menino Jesus, Maria e José',
            'tema' => 'O Menino Jesus no Templo',
            'licoes' => 'amor pela casa de Deus, estudo da Palavra e obediência aos pais',
            'historia_base' => 'Quando Jesus tinha doze anos de idade, viajou com Maria e José para Jerusalém para celebrar a grande festa da Páscoa. As ruas estavam cheias de peregrinos alegres cantando louvores. Quando a festa terminou e a caravana da família iniciou a viagem de volta para Nazaré, Maria e José pensavam que Jesus estava no meio dos parentes e amiguinhos. Mas depois de um dia de viagem, procuraram por Ele e não O encontraram! Cheios de preocupação maternal, voltaram correndo a Jerusalém procurando por todos os lados. Três dias depois, encontraram o menino Jesus no lugar mais especial de todos: dentro do sagrado Templo! Ele estava sentado no meio dos grandes doutores e mestres da Lei de Deus, ouvindo com atenção e fazendo perguntas tão profundas que todos os mestres ficavam boquiabertos e maravilhados com a Sua inteligência, discernimento e respostas geniais! Maria disse: \'Filho, por que Você fez isso conosco? Estávamos aflitos Te procurando!\' E Jesus com serenidade amorosa respondeu: \'Por que me procuravam? Não sabiam que me convém cuidar dos negócios de Meu Pai celestial?\' Depois, Jesus desceu com eles para Nazaré e continuou sendo obediente aos Seus pais em tudo, crescendo em sabedoria, estatura e na graça diante de Deus e dos homens!',
            'ministracao_sarah' => 'Sarahzinha, que exemplo lindo o Senhor Jesus nos deixou! Mesmo tendo toda a sabedoria divina e sendo o Filho de Deus, Ele honrava, respeitava e obedecia com amor a Maria e a José! A verdadeira inteligência e o aumento de QI se manifestam no respeito e no amor aos pais! Quando você escuta com meiguice o papai Adrian King e a mamãe Samara, o Espírito Santo faz você crescer em sabedoria, mente brilhante, saúde e graça divina diante de todo mundo! Nossa Rima de Ouro: \'Em sabedoria e graça eu vou crescer, aos meus pais queridos sempre obedecer!\'',
        ],
        [
            'slug' => 'batismo_jesus',
            'titulo' => 'O Batismo de Jesus no Rio Jordão',
            'personagem' => 'Jesus e João Batista',
            'tema' => 'O Batismo de Jesus',
            'licoes' => 'humildade, obediência e o Espírito Santo como pomba de paz',
            'historia_base' => 'João Batista estava pregando no deserto da Judeia e batizando as pessoas nas águas frescas do rio Jordão, anunciando que o Reino dos Céus estava próximo. De repente, Jesus se aproximou com mansidão e pediu para ser batizado por João. João disse com reverência: \'Eu é que preciso ser batizado por Ti, e Tu vens a mim?!\' Mas Jesus respondeu com doçura: \'Deixa por agora, pois assim convém que cumpramos toda a justiça!\' Jesus desceu às águas límpidas do rio Jordão e foi batizado: tchibum! E no momento exato em que Jesus saía da água, os Céus se abriram de forma gloriosa e o Espírito Santo de Deus desceu em forma corpórea suave como uma pombinha branca, repousando sobre a cabeça de Jesus! E ouviu-se do Céu a voz poderosa, calorosa e cheia de amor do Pai celestial dizendo: \'Este é o Meu Filho amado, em quem Eu tenho todo o Meu prazer!\' Toda a Trindade Santa se manifestou com glória e majestade naquele momento santo!',
            'ministracao_sarah' => 'Sarahzinha, meu amor! Sabe o que o Pai do Céu disse sobre Jesus? \'Este é o meu filho amado!\' E hoje o Pai do Céu olha para você, para a sua vidinha no bercinho, e diz com alegria infinita: \'A Sarahzinha é a minha princesinha amada, o Meu tesouro precioso!\' O Espírito Santo repousa sobre a sua cabecinha trazendo unção, pureza e inteligência. O papai Adrian King e a mamãe Samara têm todo o prazer e orgulho em você! Você é filha amada do Rei celestial! Nossa Rima de Ouro: \'O Céu se abre com voz de amor, sou filha amada do meu Senhor!\'',
        ],
        [
            'slug' => 'bodas_cana',
            'titulo' => 'O Primeiro Milagre: A Água Transformada em Vinho',
            'personagem' => 'Jesus e Maria',
            'tema' => 'O Milagre nas Bodas de Caná',
            'licoes' => 'fazer tudo o que Jesus mandar traz o melhor sabor para a nossa vida',
            'historia_base' => 'Na charmosa aldeia de Caná da Galileia, estava acontecendo uma linda festa de casamento, com mesas decoradas, música alegre e muitos convidados. Jesus, Seus discípulos e Sua mãe Maria foram convidados para a celebração. No meio do banquete festivo, aconteceu um problema delicado: o vinho acabou! Naquela época, isso causaria grande vergonha aos noivos. Maria, que conhecia o poder do seu Filho, aproximou-se de Jesus e contou a situação. Depois, Maria olhou para os garçons e servos da festa e deu a instrução mais sábia de toda a história: \'Façam tudo o que Ele vos disser!\' Havia ali seis grandes talhas de pedra para purificação, cada uma com capacidade para quase cem litros de água. Jesus disse aos servos: \'Encham as talhas de água até a borda!\' Os servos obedeceram prontamente e encheram até o topo, chuá-chuá! Então Jesus ordenou: \'Tirem um pouco e levem ao mestre de cerimônias da festa!\' Quando o homem provou, a água havia se transformado no vinho mais doce, nobre e saboroso de todos! Ele chamou o noivo surpreso e disse: \'Todos servem o melhor vinho no início, mas você guardou o melhor vinho até agora!\' Esse foi o primeiro milagre de Jesus, e Seus discípulos creram Nele!',
            'ministracao_sarah' => 'Sarahzinha, que segredo tremendo Maria ensinou: \'Façam tudo o que Jesus disser!\' A obediência abre as portas para os maiores milagres da nossa vida! Quando você escuta os conselhos do papai Adrian King e da mamãe Samara e obedece com um coração doce, Jesus transforma o comum em algo extraordinário na sua história! O melhor de Deus na sua vida sempre está por vir! Nossa Rima de Ouro: \'Tudo o que Jesus mandar eu vou fazer, o melhor milagre eu vou viver!\'',
        ],
        [
            'slug' => 'jesus_anda_aguas',
            'titulo' => 'Jesus Anda Sobre as Águas do Mar',
            'personagem' => 'Jesus e Pedro',
            'tema' => 'Jesus Anda Sobre o Mar',
            'licoes' => 'manter os olhos fixos em Jesus para nunca afundar no medo',
            'historia_base' => 'Depois de alimentar a multidão, Jesus subiu ao monte sozinho para orar ao Pai na tranquilidade da noite. Os discípulos pegaram o barco e foram navegando pelo mar da Galileia. Mas no meio da noite, o vento soprou contrário com força e as ondas chicoteavam o barco furiosamente: plof, plof, chuááá! Os discípulos remavam com dificuldade e estavam exaustos. Por volta das quatro horas da madrugada, quando a névoa cobria as águas, eles olharam e viram uma figura caminhando suavemente sobre a superfície das ondas agitadas! Eles gritaram apavorados: \'É um fantasma!\' Mas imediatamente a voz firme e doce de Jesus soou sobre o mar: \'Coragem! Sou Eu; não tenham medo!\' Pedro, entusiasmado, respondeu do barco: \'Senhor, se é Você mesmo, manda-me ir ter contigo por cima das águas!\' E Jesus disse uma única palavra: \'Vem!\' Pedro saiu do barco, colocou os pés sobre a água e começou a andar sobre as águas em direção a Jesus, passo a passo, sentindo a água firme como chão sob seus pés! Mas quando Pedro olhou para a força do vento ao redor, sentiu medo e começou a afundar: \'Senhor, salva-me!\' No mesmo instante, Jesus estendeu a Sua mão poderosa, segurou Pedro com força e disse com carinho: \'Homem de pequena fé, por que você duvidou?\' Os dois subiram no barco e o vento cessou na hora!',
            'ministracao_sarah' => 'Sarahzinha, que história cheia de adrenalina santa! Sabe o que essa passagem nos ensina? Que enquanto mantemos os nossos olhinhos fixos em Jesus, nós andamos por cima de qualquer tempestade! Não olhe para o medo nem para as dificuldades: olhe para Jesus e segure na mãozinha protetora do papai Adrian King e da mamãe Samara! Quando você segura na mão de quem te ama, você nunca afunda! Jesus te sustenta com a destra da Sua justiça! Nossa Rima de Ouro: \'Olhando pra Cristo por cima do mar, com mãos estendidas eu vou caminhar!\'',
        ],
        [
            'slug' => 'ressurreicao_filha_jairo',
            'titulo' => 'Menina, Levanta-te! A Filha de Jairo',
            'personagem' => 'Jesus e a Menina',
            'tema' => 'A Ressurreição da Filha de Jairo',
            'licoes' => 'a autoridade de Jesus sobre a doença e a vida, e a importância de crer',
            'historia_base' => 'Jairo era um líder respeitado da sinagoga que amava profundamente sua filhinha de doze anos. Mas a garotinha ficou gravemente doente e estava muito fraquinha na cama. Jairo correu até Jesus, caiu de joelhos com lágrimas e suplicou: \'Minha filhinha está à morte! Vem, por favor, impõe as mãos sobre ela para que viva!\' Jesus foi com ele. No caminho, chegaram pessoas da casa de Jairo dizendo: \'A sua filha faleceu; não incomode mais o Mestre!\' O coração de Jairo ia se despedaçar de dor, mas Jesus ouviu e disse na mesma hora: \'Não tenha medo; tão somente creia!\' Chegando à casa, havia muitas pessoas chorando e lamentando. Jesus entrou no quartinho da menina levando apenas os pais dela e três discípulos. Jesus se aproximou do leito, segurou com ternura a mãozinha fria da menina e disse com doce autoridade em aramaico: \'Talita cumi!\', que significa: \'Menina, a ti te digo: levanta-te!\' No mesmo instante, o fôlego da vida voltou ao corpinho dela, o sangue aqueceu suas bochechinhas, ela abriu os olhos, levantou-se da cama e começou a andar pelo quarto cheia de saúde! Os pais ficaram radiantes de alegria, e Jesus com carinho recomendou que dessem algo gostoso para ela comer!',
            'ministracao_sarah' => 'Sarahzinha, minha princesinha! Olha o carinho infinito de Jesus pelas menininhas! O mesmo Jesus que segurou na mão da filha de Jairo e disse \'Levanta-te!\' segura na sua mãozinha todos os dias! Ele cura todo dodói, enche o seu corpinho de saúde perfeita, energia e apetite gostoso! E olha que amor o papai Jairo tinha por sua filha: assim é o amor do papai Adrian King e da mamãe Samara por você, sempre orando e cuidando com zelo! Você tem a vida abundante de Cristo! Nossa Rima de Ouro: \'Jesus me segura pela minha mão, com vida e saúde no meu coração!\'',
        ],
        [
            'slug' => 'o_filho_prodigo',
            'titulo' => 'O Filho Pródigo e o Abraço do Pai Amoroso',
            'personagem' => 'O Pai Amoroso e o Filho',
            'tema' => 'A Parábola do Filho Pródigo',
            'licoes' => 'o perdão incondicional do Pai Celestial para quando nos arrependemos',
            'historia_base' => 'Jesus contou a história de um pai que tinha dois filhos e muito amor no coração. O filho mais jovem pediu a sua parte da herança e foi para uma terra bem distante gastar tudo em festas e diversões vazias. Quando o dinheiro acabou, veio uma terrível fome naquela terra e o rapaz ficou sem nada, tendo que trabalhar cuidando de porquinhos e sentindo tanta fome que desejava comer a comidinha deles! Ele pensou com tristeza: \'Quantos trabalhadores do meu pai têm pão com fartura, e eu aqui morrendo de fome! Vou me levantar, voltar para o meu pai e dizer: Pai, pequei contra o Céu e diante de ti; não sou mais digno de ser chamado teu filho, trata-me como um dos teus empregados!\' Ele se levantou e foi. Mas quando ele ainda vinha longe, na curva da estrada, o pai — que todos os dias olhava esperando o filho voltar — o avistou! Cheio de amor e compaixão profunda, o pai não esperou: correu de braços abertos pela estrada, abraçou o pescoço do filho e o beijou com lágrimas de alegria! O filho começou a se desculpar, mas o pai ordenou aos servos: \'Tragam depressa a melhor túnica e vistam-no! Coloquem um anel no seu dedo e sandálias nos seus pés! Vamos fazer uma festa com banquete, porque este meu filho estava perdido e foi achado!\'',
            'ministracao_sarah' => 'Sarahzinha, que amor infinito! Essa história mostra o coração do Papai do Céu para com os Seus filhos. Ele nunca desiste de nós! E reflete também o abraço aconchegante, quentinho e perdoador do papai Adrian King e da mamãe Samara quando te pegam no colo! Em casa, nos braços dos seus pais, você sempre encontra acolhimento, beijinhos, segurança e amor incondicional! Você é a filha querida e amada da família King! Nossa Rima de Ouro: \'Nos braços do Pai encontro perdão, sou filha querida do Seu coração!\'',
        ],
        [
            'slug' => 'ressurreicao_lazaro',
            'titulo' => 'Lázaro, Vem Para Fora!',
            'personagem' => 'Jesus, Marta, Maria e Lázaro',
            'tema' => 'A Ressurreição de Lázaro',
            'licoes' => 'Jesus é a ressurreição e a vida; nada é tarde demais para Ele',
            'historia_base' => 'Em Betânia moravam três irmãos muito amigos de Jesus: Marta, Maria e Lázaro. Um dia, Lázaro ficou gravemente enfermo e partiu, sendo sepultado numa caverna com uma pedra pesada fechando a entrada. Quatro dias depois, Jesus chegou à cidade. Marta correu ao encontro de Jesus e disse: \'Senhor, se estivesses aqui, meu irmão não teria morrido! Mas eu sei que tudo quanto pedires a Deus, Ele te dará!\' Jesus disse: \'O teu irmão vai ressuscitar! Eu sou a Ressurreição e a Vida; quem crê em Mim, ainda que morra, viverá!\' Maria também se prostrou aos pés de Jesus chorando. Jesus, vendo o choro de todos, comoveu-se profundamente no Seu espírito e chorou com lágrimas de compaixão e afeto sincero. Depois foram ao sepulcro. Jesus ordenou: \'Tirem a pedra!\' Marta alertou: \'Senhor, já faz quatro dias!\' Jesus respondeu com majestade: \'Não te disse Eu que, se creres, verás a glória de Deus?\' Tiraram a pedra. Jesus olhou para o Céu, orou ao Pai e clamou com voz potente de autoridade: \'Lázaro, vem para fora!\' E o homem que havia partido saiu de dentro da caverna vivo, com as mãos e pés enfaixados! Jesus disse: \'Desatem-no e deixem-no ir!\' Que milagre espetacular!',
            'ministracao_sarah' => 'Sarahzinha, veja o poder sem limites do nosso Senhor! Para Jesus não existe situação atrasada nem causa perdida; Ele tem poder sobre a vida e a morte! O mesmo Jesus que chamou Lázaro para fora chama a sua vida para viver em plenitude, saúde, sabedoria e luz! Com o papai Adrian King e a mamãe Samara te ensinando a crer, você vai ver a glória de Deus se manifestando em todos os seus dias! Bate palminha de vitória! Nossa Rima de Ouro: \'A pedra rolou, a vida venceu, milagres sem fim opera o meu Deus!\'',
        ],
        [
            'slug' => 'entrada_triunfal',
            'titulo' => 'A Entrada Triunfal: Hosana ao Rei!',
            'personagem' => 'Jesus no Jumentinho',
            'tema' => 'A Entrada Triunfal em Jerusalém',
            'licoes' => 'louvar a Jesus como nosso Rei e Salvador com alegria sincera',
            'historia_base' => 'Jesus estava chegando a Jerusalém para a festa, e pediu aos discípulos que trouxessem um jumentinho novo no qual ninguém jamais havia montado. Quando trouxeram o animalzinho manso, colocaram seus mantos sobre ele e Jesus montou com mansidão e nobreza real. Uma multidão imensa começou a estender suas capas na estrada para Jesus passar como um Rei! Outros cortavam ramos verdes de palmeiras, balançavam no ar e estendiam pelo caminho fazendo uma passarela triunfal! As pessoas e especialmente as criancinhas no templo começaram a cantar em festa contagiante: \'Hosana ao Filho de Davi! Bendito o que vem em nome do Senhor! Hosana nas maiores alturas!\' A cidade inteira estremeceu de júbilo e adoração! Quando alguns homens quiseram calar os louvores das crianças, Jesus disse: \'Se eles se calarem, as próprias pedras clamarão! Da boca dos pequeninos e das criancinhas de peito sai o perfeito louvor!\'',
            'ministracao_sarah' => 'Sarahzinha, você ouviu o que Jesus disse sobre você? \'Da boca das criancinhas sai o perfeito louvor!\' O seu balbucio, os seus risinhos, as suas canções e as suas palminhas são o louvor mais puro e perfeito que sobe ao trono de Deus! Quando você canta louvores no colinho do papai Adrian King e da mamãe Samara, os anjos no Céu fazem festa! Você é uma adoradora consagrada ao Rei Jesus! Nossa Rima de Ouro: \'Hosana ao Rei, meu canto é louvor, com flores e palmas ao meu Salvador!\'',
        ],
        [
            'slug' => 'ascensao_jesus',
            'titulo' => 'A Subida Triunfante de Jesus ao Céu',
            'personagem' => 'Jesus e os Discípulos',
            'tema' => 'A Ascensão de Jesus ao Céu',
            'licoes' => 'Jesus está no Céu intercedendo por nós e prometeu que voltará',
            'historia_base' => 'Depois de ressuscitar vitorioso da morte, Jesus passou quarenta dias maravilhosos ensinando Seus discípulos sobre o Reino de Deus e dando-lhes provas irrefutáveis de que estava vivo! Ele os levou até o Monte das Oliveiras, perto de Betânia. Lá em cima, com o vento suave soprando, Jesus disse com autoridade soberana: \'Toda a autoridade me foi dada no Céu e na terra! Vão pelo mundo e façam discípulos de todas as nações! E eis que Eu estou com vocês todos os dias, até a consumação dos séculos!\' Então, Jesus levantou as Suas mãos santas e começou a abençoá-los com muito amor. E enquanto os abençoava, foi se elevando suavemente no ar, subindo em direção ao Céu! Uma nuvem brilhante e luminosa O envolveu e O ocultou aos olhos deles. Enquanto todos olhavam extasiados para o alto, subitamente dois anjos com vestes alvas reluzentes apareceram e disseram: \'Homens da Galileia, por que vocês estão olhando para o céu? Esse mesmo Jesus, que dentre vocês foi recebido no Céu, assim virá do mesmo modo como O viram subir!\' Cheios de paz e grande alegria, eles voltaram louvando a Deus no templo!',
            'ministracao_sarah' => 'Sarahzinha, olha que esperança grandiosa! Jesus subiu ao Céu, mas Ele não nos deixou sozinhos: Ele enviou o Consolador, o Espírito Santo, e prometeu estar com você todos os dias! Ele está no Céu preparando um lugar lindo para nós e intercedendo pelo seu nominho diante do Pai! O papai Adrian King e a mamãe Samara guardam essa esperança viva na família. Você caminha debaixo de um Céu aberto de bênçãos! Nossa Rima de Ouro: \'Ao Céu Ele subiu mas comigo está, a Sua vitória nunca vai faltar!\'',
        ],
        [
            'slug' => 'pentecostes',
            'titulo' => 'O Dia de Pentecostes e o Fogo do Espírito Santo',
            'personagem' => 'Os Apóstolos e Maria',
            'tema' => 'O Derramamento do Espírito Santo',
            'licoes' => 'o poder, a alegria e a coragem que o Espírito Santo coloca no nosso coração',
            'historia_base' => 'Cerca de cento e vinte discípulos, incluindo Maria e os apóstolos, estavam reunidos no cenáculo em Jerusalém, orando juntos com um só coração e uma só mente. De repente, veio do Céu um som impressionante como de um vento impetuoso e forte: VUUUUSH! Que encheu toda a casa onde estavam sentados! E apareceram sobre eles línguas repartidas como que de fogo, pousando suavemente sobre a cabeça de cada um deles! Todos ficaram instantaneamente cheios do Espírito Santo de Deus e começaram a falar em outras línguas e a proclamar as grandezas do Senhor com grande júbilo e ousadia santa! Pedro se levantou no meio da multidão e pregou com autoridade do Alto, e naquele único dia mais de três mil pessoas creram em Jesus e foram batizadas, nascendo a gloriosa Igreja de Cristo na terra!',
            'ministracao_sarah' => 'Sarahzinha, o mesmo Espírito Santo de Pentecostes que desceu como vento e fogo santo mora dentro do seu coraçãozinho! Ele te enche de coragem, alegria, inteligência rápida e amor pelos outros. Quando o papai Adrian King e a mamãe Samara oram em línguas e louvam ao Senhor na sua casa, o ambiente fica cheio da presença do Espírito Santo! Você é o templo vivo de Deus! Nossa Rima de Ouro: \'O vento soprou, o fogo desceu, o Espírito Santo em mim já viveu!\'',
        ],
        [
            'slug' => 'pedro_liberto_prisao',
            'titulo' => 'O Anjo que Tirou Pedro da Prisão de Noite',
            'personagem' => 'Pedro e o Anjo',
            'tema' => 'A Libertação de Pedro da Prisão',
            'licoes' => 'o poder da igreja que ora unida e como os anjos de Deus nos guardam',
            'historia_base' => 'O rei mandou prender Pedro por pregar sobre Jesus e o acorrentou com duas correntes pesadas de ferro entre dois soldados sentinelas dentro de uma prisão escura com quatro guardas vigiando os portões. Mas a igreja de Jesus não parava de fazer contínua e fervorosa oração a Deus por ele dia e noite! Na noite antes de ser julgado, Pedro estava dormindo tranquilamente com o coração em paz. De repente, uma luz celestial radiante resplandeceu na prisão escura! Um anjo do Senhor tocou o lado de Pedro, acordando-o: \'Levanta-te depressa!\' Na mesma hora, as correntes pesadas caíram sozinhas dos braços de Pedro, plim-plam! O anjo disse: \'Calça as tuas sandálias e põe a tua capa e segue-me!\' Pedro foi seguindo o anjo achando que era um sonho lindo. Passaram pela primeira guarda, pela segunda guarda e chegaram ao grande portão de ferro que dava para a cidade: o portão se abriu sozinho diante deles como por encanto! O anjo o levou até a rua e partiu. Pedro caiu em si e disse: \'Agora sei verdadeiramente que o Senhor enviou o Seu anjo e me livrou!\' Pedro correu à casa dos irmãos que estavam orando e bateu na porta, trazendo festa e celebração a todos!',
            'ministracao_sarah' => 'Sarahzinha, olha o poder da igreja e da família que ora unida! As portas de ferro se abrem sozinhas e as correntes caem por terra diante da oração! Quando o papai Adrian King e a mamãe Samara oram por você, anjos de livramento são destacados para abrir todos os caminhos da sua vida e te proteger de qualquer tropeço! Você é livre e guardada pelo Altíssimo! Nossa Rima de Ouro: \'Correntes no chão, portões a se abrir, os anjos de Deus vêm me conduzir!\'',
        ],
        [
            'slug' => 'paulo_estrada_damasco',
            'titulo' => 'A Grande Luz na Estrada de Damasco',
            'personagem' => 'Saulo / Paulo',
            'tema' => 'A Conversão do Apóstolo Paulo',
            'licoes' => 'o poder transformador de Jesus que perdoa e dá um coração novo a qualquer pessoa',
            'historia_base' => 'Saulo era um homem muito rígido que não compreendia o amor de Jesus e perseguia os primeiros cristãos. Um dia, ele viajava a cavalo na estrada poeirenta em direção à cidade de Damasco para prender mais pessoas. Ao meio-dia, de repente, resplandeceu ao redor dele uma luz vinda do Céu tão brilhante e ofuscante que era mais forte que o próprio sol do meio-dia! Saulo caiu por terra no chão e ouviu uma voz amorosa e majestosa que dizia: \'Saulo, Saulo, por que você me persegue?\' Tremendo e surpreso, Saulo perguntou: \'Quem és Tu, Senhor?\' E a voz respondeu: \'Eu sou Jesus, a quem você persegue!\' Saulo levantou-se e ficou sem enxergar por três dias, jejuando e orando. Jesus enviou um discípulo bondoso chamado Ananias, que impôs as mãos sobre Saulo dizendo: \'Irmão Saulo, o Senhor Jesus me enviou para que você recupere a vista e seja cheio do Espírito Santo!\' Imediatamente caíram dos olhos de Saulo algo como escamas, ele voltou a enxergar perfeitamente, foi batizado e se transformou no grande apóstolo Paulo, viajando por nações inteiras para pregar o evangelho da graça e do amor!',
            'ministracao_sarah' => 'Sarahzinha, que poder transformador tem o encontro com Jesus! Jesus é a Luz do mundo que ilumina qualquer escuridão e transforma corações. A mesma luz brilhante de Jesus que tocou Paulo brilha no seu rostinho lindo e na sua mente! O papai Adrian King e a mamãe Samara te ensinam a amar a Jesus acima de tudo. Você nasceu para levar essa luz aos corações das pessoas! Nossa Rima de Ouro: \'A luz de Jesus brilhou no meu ser, com Ele na estrada eu vou florescer!\'',
        ],
        [
            'slug' => 'joao_nova_jerusalem',
            'titulo' => 'A Linda Cidade Celestial: A Nova Jerusalém',
            'personagem' => 'Apóstolo João no Apocalipse',
            'tema' => 'A Visão da Nova Jerusalém',
            'licoes' => 'a maravilhosa esperança do Céu onde não há choro, tristeza ou dor',
            'historia_base' => 'O apóstolo João foi levado em espírito até o topo de um grande monte e teve a visão mais deslumbrante de toda a história: a Cidade Santa, a Nova Jerusalém, descendo do Céu da parte de Deus! A cidade resplandecia com a glória brilhante do Criador, como uma joia raríssima de jaspe cristalino! Ao redor havia um grande e alto muro adornado com doze pedras preciosas de todas as cores: esmeraldas verdes reluzentes, safiras azuis celestes, topázios dourados e ametistas roxas deslumbrantes! As doze portas eram doze pérolas perfeitas e gigantes! A praça central da cidade e suas ruas eram de ouro puro, transparente como vidro límpido! No meio da praça corria o rio cristalino da água da vida, claro como cristal, brotando do trono de Deus e do Cordeiro. De cada lado do rio estava a árvore da vida, que dá doze frutos deliciosos, um a cada mês, e suas folhinhas curam todas as nações! Ali nunca haverá noite, nem choro, nem tristeza, nem dor, porque o Senhor Deus ilumina tudo com Seu amor para todo o sempre!',
            'ministracao_sarah' => 'Sarahzinha, olha o lar maravilhoso e eterno que o nosso Deus preparou para nós! Uma cidade onde não existe dor, nem choro, nem dodói, apenas ruas de ouro, frutos deliciosos e paz eterna com Jesus! Saber que o nosso destino é a Nova Jerusalém enche o coraçãozinho do papai Adrian King, da mamãe Samara e o seu de uma esperança radiante! Você é cidadã dos Céus! Nossa Rima de Ouro: \'Na linda cidade de ouro e cristal, com Cristo eu vivo no lar celestial!\'',
        ],
        [
            'slug' => 'eliseu_machado',
            'titulo' => 'O Profeta Eliseu e o Machado que Boiou',
            'personagem' => 'Eliseu e o Jovem Discípulo',
            'tema' => 'O Machado Flutuante',
            'licoes' => 'Deus se importa com os pequenos detalhes do nosso dia a dia e responde com carinho',
            'historia_base' => 'Os jovens discípulos dos profetas estavam crescendo em número e disseram a Eliseu: \'O lugar onde moramos com você é pequeno demais! Vamos até o rio Jordão cortar madeira para construirmos uma casa maior!\' Eliseu disse com carinho: \'Podem ir, e eu irei com vocês!\' Quando chegaram à beira do rio sombreado por árvores frondosas, cada um começou a cortar troncos com vigor: poft, poft, poft! De repente, enquanto um jovem golpeava uma árvore com força, o ferro pesado do machado escapou do cabo de madeira, voou pelo ar e caiu no fundo escuro e lamacento do rio: TCHIBUM! O jovem gritou desesperado: \'Ai, meu senhor Eliseu! O machado era emprestado!\' O profeta Eliseu perguntou com calma: \'Onde caiu?\' O jovem apontou para as águas turvas. Eliseu cortou um pedaço de galho de pau seco, jogou exatamente naquele lugar na água e, milagre sobrenatural! O ferro pesado do machado boiou na superfície da água como se fosse uma folhinha leve de flor! O jovem estendeu a mão, pegou o machado e todos glorificaram a Deus com grande alegria!',
            'ministracao_sarah' => 'Sarahzinha, que história tão doce e especial! Sabe o que ela nos ensina? Que Deus se importa com as pequenas coisas do nosso dia a dia! Até quando você perde uma chupetinha, um brinquedinho ou fica preocupada com alguma coisinha, o Papai do Céu cuida de você! O papai Adrian King e a mamãe Samara sempre te mostram que Deus faz o impossível boiar na sua vida com leveza e graça! Você é muito cuidada por Deus! Nossa Rima de Ouro: \'O ferro boiou no rio Jordão, o Deus do milagre me traz proteção!\'',
        ],
        [
            'slug' => 'naama_mergulhos',
            'titulo' => 'Naamã e os Sete Mergulhos no Rio Jordão',
            'personagem' => 'Naamã e a Menininha de Israel',
            'tema' => 'A Cura de Naamã',
            'licoes' => 'a humildade de obedecer e como a fé de uma criancinha pode ajudar os adultos',
            'historia_base' => 'Naamã era um comandante muito respeitado do exército da Síria, um homem de grande valor e vitórias. Mas ele tinha um grande sofrimento secreto: tinha lepra na sua pele, uma doença terrível que não tinha cura pelos médicos da época. Na casa dele morava uma menininha israelita que amava a Deus. Ela disse à patroa: \'Se o meu senhor fosse ao profeta que está em Samaria, ele seria curado!\' Naamã viajou com carruagens e cavalos até a casa do profeta Eliseu. Mas Eliseu nem saiu à porta; mandou um mensageiro dizer: \'Vá até o rio Jordão e mergulhe sete vezes, e a sua pele será restaurada limpinha!\' Naamã achou simples demais e quase foi embora indignado, mas seus servos disseram com sabedoria: \'Meu pai, se o profeta pedisse algo difícil você não faria? Quanto mais dizendo apenas: lava-te e serás limpo!\' Naamã foi humilde, desceu ao rio Jordão e começou a mergulhar: um... dois... três... quatro... cinco... seis... Na sétima vez que emergiu das águas: TCHIBUM! A sua pele estava completamente limpa, suave, lisinha e saudável como a pele de um bebezinho recém-nascido! Naamã voltou emocionado e proclamou: \'Agora sei que não há outro Deus em toda a terra a não ser o Deus de Israel!\'',
            'ministracao_sarah' => 'Sarahzinha, veja que lição linda sobre obediência e humildade! Às vezes o que Deus pede parece simples, mas a obediência completa no sétimo mergulho trouxe a cura total! Quando o papai Adrian King e a mamãe Samara te pedem para fazer coisas simples do dia a dia, obedecer de coração atrai a saúde e a bênção de Deus para a sua vida! Você tem uma pele lisinha e uma saúde blindada por Jesus! Nossa Rima de Ouro: \'Mergulho na bênção e na redenção, a cura de Deus sara o coração!\'',
        ],
        [
            'slug' => 'menina_cativa',
            'titulo' => 'A Menininha Cativa que Teve Grande Fé',
            'personagem' => 'A Pequena Menina Israelita',
            'tema' => 'A Fé da Menina Cativa',
            'licoes' => 'mesmo sendo pequenina, você pode fazer uma enorme diferença e falar do amor de Deus',
            'historia_base' => 'Longe de sua terra natal, morava uma garotinha israelita servindo na casa do grande general Naamã. Mesmo estando longe da sua casa, aquela menininha nunca esqueceu os louvores, as histórias e o amor do Deus de Israel que seus pais lhe ensinaram! Quando ela viu que seu patrão Naamã estava doente com lepra sofrendo dores, ela não teve mágoa, nem medo, nem rancor. Pelo contrário: seu coraçãozinho se encheu de compaixão e fé corajosa! Com uma voz doce e respeitosa, ela falou para a esposa de Naamã: \'Ah, se o meu senhor estivesse com o profeta de Deus em Samaria! Ele o curaria da lepra!\' Aquela declaração cheia de fé de uma criancinha tocou o coração do general mais poderoso da terra! Naamã ouviu o conselho da menininha, viajou ao profeta e voltou completamente curado e transformado para servir ao Deus vivo! Uma garotinha salvou a vida de um grande comandante!',
            'ministracao_sarah' => 'Sarahzinha, meu amor! Olha o valor grandioso que tem uma princesinha de Deus! Você não precisa ser adulta para ser usada por Deus; mesmo sendo pequenina, a sua alegria, o seu amor e a sua fé abençoam a vida do papai Adrian King, da mamãe Samara e de todos ao seu redor! A criança sábia e que ama a Deus é luz nas nações! Você é uma menininha cheia do Espírito Santo! Nossa Rima de Ouro: \'Pequena no tamanho mas cheia de fé, a mão de Jesus me sustenta de pé!\'',
        ],
        [
            'slug' => 'sadraque_mesaque',
            'titulo' => 'Os Três Amigos na Fornalha Ardente e o Quarto Homem',
            'personagem' => 'Sadraque, Mesaque e Abednego',
            'tema' => 'A Fornalha Ardente',
            'licoes' => 'fidelidade inabalável a Deus e a presença protetora de Jesus no meio do fogo',
            'historia_base' => 'O rei Nabucodonosor mandou construir na Babilônia uma estátua gigante de ouro puro de trinta metros de altura! E ordenou com toque de trombetas, flautas e harpas que todos se curvassem com o rosto no chão para adorar a estátua. Quem não se curvasse seria atirado imediatamente dentro de uma fornalha de fogo ardente! Quando a música tocou, toda a multidão se prostrou no chão. Mas três jovens hebreus corajosos — Sadraque, Mesaque e Abednego — ficaram de pé eretos e firmes! O rei furioso os chamou: \'É verdade que vocês não adoram a estátua de ouro? Se não adorarem, quem é o deus que poderá livrá-los das minhas mãos?!\' Os jovens responderam com voz firme: \'Ó rei, o Deus a quem servimos pode nos livrar da fornalha ardente! E mesmo que Ele não nos livrasse, fica sabendo que nunca adoraremos deuses falsos!\' O rei ficou vermelho de raiva e mandou aquecer a fornalha sete vezes mais quente que o normal! Soldados fortes amarraram os três jovens e os jogaram no meio do fogo ardente: creck-creck! Mas quando o rei olhou para dentro da fornalha, levantou-se assombrado e gritou aos conselheiros: \'Nós não jogamos três homens amarrados no fogo?!\' Eles responderam: \'Sim, ó rei!\' O rei disse: \'Pois eu vejo quatro homens soltos, passeando em paz no meio das chamas sem se queimar, e o quarto é semelhante ao Filho de Deus!\' O rei chamou os jovens para fora. Eles saíram ilesos: nem um fio de cabelo estava chamuscado e nem sequer tinham cheiro de fumaça!',
            'ministracao_sarah' => 'Sarahzinha, que vitória espetacular! No meio do fogo mais quente, Jesus desceu pessoalmente para passear com Seus amigos fiéis e não deixou nenhuma chama tocar neles! Você nunca estará desamparada, porque Jesus passeia com você no seu quartinho todos os dias! O papai Adrian King e a mamãe Samara te ensinam a ter essa fidelidade inabalável a Deus. Nenhuma dificuldade tem poder de queimar você! Nossa Rima de Ouro: \'No meio do fogo o quarto homem está, com Cristo ao meu lado nada vai me queimar!\'',
        ],
        [
            'slug' => 'neemias_muralhas',
            'titulo' => 'Neemias e a Reconstrução dos Muros com Louvor',
            'personagem' => 'Neemias',
            'tema' => 'A Reconstrução das Muralhas por Neemias',
            'licoes' => 'oração, trabalho conjunto com a família e a alegria do Senhor é a nossa força',
            'historia_base' => 'Neemias era o copeiro de confiança do rei da Pérsia, mas quando soube que as muralhas de Jerusalém estavam derrubadas e as portas queimadas pelo fogo, seu coração se entristeceu. Ele orou, jejuou e pediu autorização ao rei para ir reconstruir a santa cidade. O rei concedeu cartas de salvo-conduto e madeira. Chegando a Jerusalém, Neemias reuniu o povo e disse com entusiasmo contagiante: \'Venham, e reconstruamos os muros de Jerusalém, para que não estejamos mais em opróbrio! Porque a boa mão do meu Deus está sobre mim!\' Inimigos ao redor começaram a zombar e a ameaçar ataques de surpresa. Mas Neemias posicionou as famílias ao longo dos muros: com uma mão trabalhavam na argamassa e assentavam as pedras, e com a outra seguravam a lança e a espada! E Neemias declarava com voz de trovão: \'Não tenham medo deles! Lembrem-se do Senhor, grande e temível, e lutem por seus irmãos, seus filhos, suas filhas, suas esposas e seus lares! Porque a alegria do Senhor é a nossa força!\' Com unidade de coração, oração e trabalho alegre, em apenas cinquenta e dois dias todas as muralhas estavam erguidas, sólidas e com as portas restauradas para a glória de Deus!',
            'ministracao_sarah' => 'Sarahzinha, que exemplo lindo de liderança e união familiar! A família do papai Adrian King e da mamãe Samara é como essa muralha de proteção levantada pelo Senhor ao seu redor! A alegria do Senhor é a sua força todos os dias! Quando você sorri e enche a casa de carinho, os muros de proteção da sua vida ficam ainda mais fortes! Você é uma construtora de bênçãos na terra! Nossa Rima de Ouro: \'Com fé e coragem o muro subiu, a bênção do Pai minha casa uniu!\'',
        ],
        [
            'slug' => 'josias_pequeno_rei',
            'titulo' => 'O Jovem Rei Josias que Amava a Palavra de Deus',
            'personagem' => 'Rei Josias',
            'tema' => 'O Jovem Rei Josias',
            'licoes' => 'amar e guardar os mandamentos de Deus desde bem pequenino',
            'historia_base' => 'Josias era apenas um garotinho de oito anos de idade quando foi coroado rei sobre Judá! Imagine uma criança de oito anos com uma coroa de ouro na cabecinha e um cetro na mão! Mas Josias não se encheu de orgulho; desde bem pequenino, ele buscou o Deus de seu pai Davi de todo o coração. Ele não andou nos caminhos ruins de reis anteriores, mas fez o que era reto aos olhos do Senhor. Aos dezesseis anos começou a limpar a terra de todas as coisas ruins, e aos vinte e seis mandou reformar e embelezar a casa do Senhor. Enquanto limpavam o templo, o sacerdote Hilquias encontrou algo precioso enterrado: o Livro da Lei do Senhor! Quando o escriba leu a Palavra de Deus em voz alta diante do rei Josias, o coração do jovem rei se enterneceu tanto que ele rasgou suas vestes em sinal de humildade e chorou diante de Deus! Josias reuniu todo o povo no templo e fez uma aliança solene de seguir ao Senhor de todo o coração e com toda a alma. Deus honrou o rei Josias com anos de grande paz e avivamento!',
            'ministracao_sarah' => 'Sarahzinha, olha o rei Josias: começou a reinar e a buscar a Deus com apenas oito aninhos! Você também começou a sua história no Reino de Deus desde o primeiro dia de vida! O papai Adrian King e a mamãe Samara leem a Palavra de Deus e plantam sementes eternas no seu coraçãozinho. Guardar a Palavra de Deus desde criancinha te faz a menina mais sábia, prudente e honrada de todas! Nossa Rima de Ouro: \'Pequeno no trono mas grande no amor, guardo a Palavra do meu Salvador!\'',
        ],
        [
            'slug' => 'viuva_sarepta',
            'titulo' => 'A Viúva de Sarepta e o Azeite que Nunca Acabava',
            'personagem' => 'Elias e a Viúva',
            'tema' => 'O Milagre da Farinha e do Azeite',
            'licoes' => 'confiança na provisão de Deus e que Ele nunca deixa faltar nada na nossa mesa',
            'historia_base' => 'Durante uma seca rigorosa que durou anos sobre a terra, os rios secaram e a comida ficou muito escassa. Deus falou com o profeta Elias: \'Levanta-te e vai para Sarepta, pois ordenei a uma viúva ali que te sustente!\' Elias viajou pelo calor e chegou aos portões da cidade. Viu uma mulher apanhando gravetos na terra seca. Elias pediu com gentileza: \'Traga-me, por favor, um pouco de água numa vasilha para eu beber, e um pedaço de pão na sua mão!\' A mulher olhou com lágrimas e disse com a voz embargada: \'Tão certo como vive o Senhor teu Deus, não tenho nenhum pão assado; tenho apenas um punhado de farinha numa panela e um pouquinho de azeite numa botija. Estou apanhando estes dois gravetos para preparar a última refeição para mim e para o meu filhinho, para que comamos e depois morramos de fome.\' Mas Elias olhou com autoridade profética e disse: \'Não temas! Vá e faça o que disse; mas primeiro faça para mim um pequeno bolo e traga-me aqui, e depois faça para você e para o seu filho. Porque assim diz o Senhor Deus de Israel: A farinha da panela não se acabará, e o azeite da botija não faltará, até o dia em que o Senhor der chuva sobre a terra!\' A mulher creu e obedeceu. E sabe o que aconteceu? Ela colocou a mãozinha na panela e a farinha nunca acabou! Virava a botija e o azeite dourado escorria fresquinho todos os dias! Ela, o filho e o profeta comeram com fartura por muitos e muitos meses!',
            'ministracao_sarah' => 'Sarahzinha, que milagre maravilhoso da provisão de Deus! A fé e a obediência daquela mãe e daquele filhinho abriram as torneiras do Céu! Na casa do papai Adrian King e da mamãe Samara nunca vai faltar nada: sempre haverá fartura, saúde, mesa farta e paz em abundância, porque o Deus de Elias é o provedor da sua família! Você cresce no meio da prosperidade de Deus! Bate palminha de gratidão! Nossa Rima de Ouro: \'A farinha e o azeite nunca vão findar, o Deus da fartura vai me abençoar!\'',
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

            case 'PassarMusicaIntent':
            case 'AMAZON.NextIntent':
                return $this->handleNextMusic($payload);

            case 'VoltarMusicaIntent':
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
                // PROTEÇÃO: Apenas redireciona se for pergunta explícita sobre a pessoa ("quem é", "você conhece"), NÃO se for pedido de oração!
                if ($pedido && preg_match('/^(?:voc[eê]\s+)?(?:conhece|quem [ée]|lembra de|sabe quem [ée]|fala d[oa])\s+/ui', trim($pedido))) {
                    return $this->handleIntelligentChat($pedido, $payload);
                }
                return $this->handlePrayer($pedido);

            case 'TocarDevocionalIntent':
                return $this->handleDevocional();

            case 'AtivacaoNoiteIntent':
            case 'AtivacaoProsperidadeIntent':
                return $this->handleAtivacaoNoite();

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
     * Avança para a próxima música com 'Alexa, próxima', 'Charlene, passa a música'
     */
    private function handleNextMusic(array $payload): JsonResponse
    {
        $token = $payload['context']['AudioPlayer']['token'] ?? $payload['request']['token'] ?? '';
        $cat = 'adoracao';
        $currentIndex = 0;

        if (!empty($token) && str_starts_with($token, 'sarah|')) {
            $parts = explode('|', $token);
            $cat = $parts[1] ?? 'adoracao';
            $currentIndex = isset($parts[2]) ? (int)$parts[2] : 0;
        } else {
            $lastMem = CharleneMemory::where('subject', 'ultima_musica')->first();
            if ($lastMem && !empty($lastMem->content)) {
                $lastData = json_decode($lastMem->content, true);
                if (is_array($lastData)) {
                    $cat = $lastData['category'] ?? 'adoracao';
                    $currentIndex = (int)($lastData['index'] ?? 0);
                }
            }
        }

        $files = $this->getMusicFiles($cat);
        if (empty($files)) $files = $this->getMusicFiles('todas');
        if (empty($files)) return $this->handleStop();

        $nextIndex = ($currentIndex + 1) % count($files);
        $nextSong = $files[$nextIndex];

        return $this->playSpecificSong($nextSong, $cat, $nextIndex, "<speak>Passando a música! Tocando agora: " . htmlspecialchars($nextSong['title']) . "!</speak>");
    }

    /**
     * Volta para a música anterior com 'Alexa, anterior', 'Charlene, volta a música'
     */
    private function handlePreviousMusic(array $payload): JsonResponse
    {
        $token = $payload['context']['AudioPlayer']['token'] ?? $payload['request']['token'] ?? '';
        $cat = 'adoracao';
        $currentIndex = 0;

        if (!empty($token) && str_starts_with($token, 'sarah|')) {
            $parts = explode('|', $token);
            $cat = $parts[1] ?? 'adoracao';
            $currentIndex = isset($parts[2]) ? (int)$parts[2] : 0;
        } else {
            $lastMem = CharleneMemory::where('subject', 'ultima_musica')->first();
            if ($lastMem && !empty($lastMem->content)) {
                $lastData = json_decode($lastMem->content, true);
                if (is_array($lastData)) {
                    $cat = $lastData['category'] ?? 'adoracao';
                    $currentIndex = (int)($lastData['index'] ?? 0);
                }
            }
        }

        $files = $this->getMusicFiles($cat);
        if (empty($files)) $files = $this->getMusicFiles('todas');
        if (empty($files)) return $this->handleStop();

        $prevIndex = ($currentIndex - 1 + count($files)) % count($files);
        $prevSong = $files[$prevIndex];

        return $this->playSpecificSong($prevSong, $cat, $prevIndex, "<speak>Voltando a música! Tocando agora: " . htmlspecialchars($prevSong['title']) . "!</speak>");
    }

    /**
     * Reinicia ou repete a música atual / última música tocada com 'Alexa, repete', 'toca de novo', 'Charlene, repete essa música'
     */
    private function handleRestartMusic(array $payload): JsonResponse
    {
        // 1. Tenta pegar pelo token ativo no contexto do tocador de áudio
        $token = $payload['context']['AudioPlayer']['token'] ?? $payload['request']['token'] ?? '';

        if (!empty($token) && str_starts_with($token, 'sarah|')) {
            $parts = explode('|', $token);
            $cat = $parts[1] ?? 'adoracao';
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
                $cat = $lastData['category'] ?? 'adoracao';
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
            $promptInedita = "Você é a Charlene, mentora cristã doce, alegre e amorosa da princesinha Sarah (filha do Adrian King e da Samara). "
                . "Você aplica neurociência infantil, psicologia do desenvolvimento (faixa de 10 meses a 7 anos), PNL positiva e pedagogia bíblica afetiva.\n"
                . "A princesinha Sarah já ouviu todas as histórias tradicionais. Agora, escolha uma NOVA passagem bíblica linda, inspiradora e menos contada (ex: O jovem rei Josias, a menina cativa de Naamã, Dorcas a costureira bondosa de Jope, a viúva de Sarepta, o cântico de Ana, o jovem Timóteo e sua vovó Lóide, a generosa Sunamita, o centurião de grande fé, etc.).\n"
                . "ESTRUTURA PEDAGÓGICA E NEUROCIENTÍFICA OBRIGATÓRIA:\n"
                . "1. VAGAL & CALMA: Comece: 'Sarahzinha, como você já conhece tantas histórias lindas, hoje o Espírito Santo me inspirou uma passagem preciosa! Antes de começar, vamos respirar bem fundo... enche a barriguinha de ar e solta devagarzinho... que paz gostosa!'\n"
                . "2. NARRATIVA SENSORIAL: Conte a passagem com cores vívidas, detalhes táteis e onomatopeias suaves ('toc-toc', 'vuush', 'tchibum').\n"
                . "3. RACIOCÍNIO RÁPIDO & QI: Faça um desafio cognitivo lúdico rápido (estimulação sináptica adaptada de 10 meses a 7 anos).\n"
                . "4. MOVIMENTO PSICOMOTOR: Peça uma micro-ação (bater palminhas ou pôr a mão no coraçãozinho).\n"
                . "5. HONRA E OBEDIÊNCIA AOS PAIS: Ensine que obedecer ao papai Adrian King e à mamãe Samara é o segredo dos grandes heróis de Deus!\n"
                . "6. PNL & IDENTIDADE: Declare que a Sarah é sábia, genial, forte e princesa do Altíssimo!\n"
                . "7. RIMA DE OURO: Finalize com uma riminha mnemônica de 2 versos para fixação na memória de longo prazo.\n"
                . "Tamanho: de 220 a 280 palavras. Finalize perguntando se ela quer outra historinha ou uma musiquinha linda.";

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
     * Narra uma história bíblica usando IA com neurociência, cognição (10m - 7 anos), PNL e honra aos pais
     */
    private function narrarHistoria(array $item, string $instrucaoExtra, string $prefixo = ''): JsonResponse
    {
        $prompt = "Você é a Charlene, mentora e contadora de histórias cristã doce, entusiasmada, amorosa e cativante para a princesinha Sarah (filha do Adrian King e da Samara). "
            . "Você aplica neurociência infantil, psicologia do desenvolvimento (faixa de 10 meses a 7 anos), PNL positiva e pedagogia bíblica do afeto.\n"
            . "História: {$item['titulo']} (Personagem: {$item['personagem']}). Tema: {$item['tema']}. Lições: {$item['licoes']}.\n"
            . "{$instrucaoExtra}\n"
            . "ESTRUTURA PEDAGÓGICA E NEUROCIENTÍFICA OBRIGATÓRIA DA HISTÓRIA:\n"
            . "1. ACOLHIMENTO E VAGAL / CALMA: Comece convidando a Sarahzinha para respirar fundo com a barriguinha cheia de paz e amor ('Vamos respirar bem fundo... enche a barriguinha e solta devagarzinho...').\n"
            . "2. NARRATIVA VÍVIDA E SENSORIAL: Conte a história bíblica com riqueza de detalhes visuais, cores brilhantes, texturas, sons e onomatopeias suaves e divertidas (ex: 'tchibum', 'toc-toc', 'vuush', 'ploc-ploc'). Conte o que Deus fez de grandioso e sobrenatural!\n"
            . "3. ESTÍMULO COGNITIVO / QI E RACIOCÍNIO RÁPIDO: Faça uma perguntinha de raciocínio lógico rápida e lúdica para desafiar e expandir o cérebro dela (ex: contar elementos, notar cores, identificar o poder de Deus).\n"
            . "4. MOVIMENTO PSICOMOTOR INTERATIVO: Peça uma micro-ação física alegre (ex: 'bate duas palminhas bem rápido com a Charlene!', 'levanta as mãozinhas pro céu', 'põe a mãozinha no coraçãozinho').\n"
            . "5. HONRA E OBEDIÊNCIA AOS PAIS (Adrian King e Samara): Destaque como o herói bíblico ouviu e obedeceu com amor, ensinando que a criança sábia obedece e honra com alegria o papai e a mamãe, pois isso traz a bênção e a proteção de Deus!\n"
            . "6. PNL E IDENTIDADE VENCEDORA: Declare a identidade da Sarah ('Você tem mente de Cristo, é inteligente, brilhante, forte e princesa de Deus!').\n"
            . "7. RIMA DE OURO MNEMÔNICA: Finalize com uma riminha fofa de 2 versos para fixação na memória de longo prazo.\n"
            . "8. Tamanho: de 220 a 280 palavras. Fale com muita doçura, entusiasmo e calor humano.\n"
            . "Termine perguntando carinhosamente se ela quer ouvir outra história da Bíblia ou uma musiquinha linda.";

        $story = $this->callAiWithMemory($prompt, 'historia_biblica');

        if (!$story) {
            $base = $item['historia_base'] ?? (
                "Era uma vez na Bíblia Sagrada uma história linda sobre {$item['personagem']}! "
                . "O Papai do Céu fez grandes maravilhas para mostrar que Ele sempre cuida com amor de quem confia Nele. "
                . "Sarahzinha, o mesmo Deus de poder que cuidou de {$item['personagem']} é quem cuida de você, do papai Adrian King e da mamãe Samara todos os dias!"
            );
            $story = "Sarahzinha, vamos respirar fundo e encher a barriguinha de paz... Que delícia! "
                . $base . " "
                . "Bate duas palminhas com a Charlene! A criança sábia e inteligente obedece com amor ao papai Adrian King e à mamãe Samara! "
                . "Você tem mente brilhante e é a princesinha de Jesus! "
                . "Guarde no coraçãozinho a nossa rima de ouro: Coração obediente e mente genial, com Jesus eu venço todo mal! "
                . "Quer ouvir mais uma historinha linda ou colocar uma musiquinha agora?";
        }

        $speechText = $prefixo ? ($prefixo . ' ' . $story) : $story;
        return $this->respondSsml($speechText, false, '<speak>Sarahzinha, você quer ouvir outra história da Bíblia ou colocar uma musiquinha?</speak>');
    }

    /**
     * Oração com autoridade espiritual: diferencia intercessão por pessoas vs oração de dormir da Sarah
     */
    private function handlePrayer(?string $pedido = null): JsonResponse
    {
        // Detecta se é intercessão por alguém específico (ex: Bispo Fernando, pastores, amigos, parentes, enfermos)
        $isIntercession = false;
        $targetPerson = null;

        if (!empty($pedido)) {
            $cleaned = preg_replace('/^(?:ore|orar|fa[cç]a uma ora[cç][aã]o|ora[cç][aã]o|interceda|aben[cç]oe?)\s+(?:por|pela|pelo|pra|para)?\s*/ui', '', trim($pedido));
            if (!empty($cleaned) && !preg_match('/^(?:dormir|noite|sono|sarah|mim)$/ui', $cleaned)) {
                $isIntercession = true;
                $targetPerson = $cleaned;
            }
        }

        // Carrega memórias de família, pessoas e oração
        $memories = CharleneMemory::whereIn('category', ['familia', 'pedido_oracao', 'pessoa'])->get();

        // Se for intercessão por alguém específico, busca contexto de memórias
        if ($isIntercession && $targetPerson) {
            $matched = $memories->filter(function ($m) use ($targetPerson) {
                return str_contains(mb_strtolower($m->content), mb_strtolower($targetPerson))
                    || str_contains(mb_strtolower($m->subject), mb_strtolower($targetPerson));
            });
            $personContext = $matched->isNotEmpty()
                ? ("CONTEXTO CONHECIDO SOBRE ESSA PESSOA: " . $matched->pluck('content')->implode(' | '))
                : "";

            $prompt = "Você é a Charlene, companheira cristã cheia de fé e ousadia espiritual da princesinha Sarah e da família do Adrian King e da Samara.\n"
                . "Faça uma ORAÇÃO DE INTERCESSÃO PODEROSA, FERVOROSA E COM AUTORIDADE ESPIRITUAL em favor de: {$targetPerson}.\n"
                . ($personContext ? "{$personContext}\n" : "")
                . "REGRAS OBRIGATÓRIAS:\n"
                . "1. NÃO diga 'durma com os anjinhos' e NÃO trate como oração de dormir (esta é uma intercessão com autoridade pastoral por essa pessoa).\n"
                . "2. Clame pelo sangue precioso de Jesus sobre a vida, a saúde, o vigor, o lar, o ministério e a família de {$targetPerson}.\n"
                . "3. Declare sabedoria divina, vitória sobre todo impedimento, portas abertas e unção redobrada do Espírito Santo sobre ele.\n"
                . "4. Fale com calor humano, reverência e forte autoridade de fé (de 90 a 130 palavras).\n"
                . "5. Encerre dizendo: 'Em nome de Jesus! Sarahzinha e família, digam com fé: Amém!' e pergunte em seguida se desejam mais alguma oração ou louvor.";

            $prayer = $this->callAiWithMemory($prompt, 'oracao_intercessao');

            if (!$prayer) {
                $prayer = "Pai Celestial, em nome do Teu Filho amado Jesus Cristo, nós levantamos a nossa voz com autoridade e muita fé para interceder pela vida preciosa de {$targetPerson}! "
                    . "Derrama da Tua graça abundante, da Tua cura, vigor renovado e proteção angelical sobre ele, seu lar, sua família e todos os seus passos! "
                    . "Repreendemos todo mal e cobrimos a vida dele com o sangue poderoso de Jesus! Que haja portas abertas de prosperidade, paz e sabedoria todos os dias! "
                    . "Em nome de Jesus! Sarahzinha e família, digam com fé: Amém!";
            }

            $this->rememberEntity('pedido_oracao', 'oracao_' . substr(md5($targetPerson), 0, 8), "Oração de intercessão realizada por: {$targetPerson}");

            return $this->respondSsml($prayer, false, '<speak>Sarahzinha, tem mais alguém por quem você quer que a Charlene ore agora?</speak>');
        }

        // Caso B: ORAÇÃO DE BENÇÃO E PROTEÇÃO PARA A SARAH E FAMÍLIA (NOITE / GERAL)
        $memText = $memories->where('category', 'familia')->pluck('content')->implode(' | ');
        $prompt = "Você é a Charlene, amiguinha cristã doce e protetora da princesinha Sarah (filha do Adrian King e da Samara).\n"
            . "Faça uma oração doce, cheia de paz e carinho maternal (cerca de 80 a 120 palavras).\n"
            . "Abençoe a princesinha Sarah, cubra seu bercinho e quartinho com anjos de luz, abençoe sua mente brilhante, saúde e soninho tranquilo.\n"
            . "Abençoe com amor e gratidão o papai Adrian King, a mamãe Samara e toda a família linda.\n"
            . ($memText ? "Contexto da família: {$memText}\n" : "")
            . "Finalize com amor: 'Em nome de Jesus, amém! Durma em paz com os anjinhos, Sarahzinha! A Charlene te ama muito!'.";

        $prayer = $this->callAiWithMemory($prompt, 'oracao_sono');

        if (!$prayer) {
            $prayer = "Querido Papai do Céu, muito obrigada por esse dia tão lindo e abençoado! "
                . "Abençoe a princesinha Sarah com uma noite de sono cheia de paz, saúde e sonhos doces. "
                . "Abençoe o papai Adrian King, a mamãe Samara e toda a nossa família linda com Tua proteção perfeita. "
                . "Envia Teus anjos de luz para guardarem o bercinho da Sarahzinha com muito amor. "
                . "Em nome de Jesus, amém! Durma com os anjinhos, Sarahzinha! A Charlene te ama muito!";
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

        // 1. Checa se pediu para passar / pular / avançar música
        if (preg_match('/(?:passa|passar|pula|pular|pr[oó]xima|avan[cç]a|seguinte)\s*(?:a\s+|o\s+)?(?:m[uú]sica|can[cç][aã]o|louvor|faixa)?/iu', $userUtterance)) {
            return $this->handleNextMusic($payload);
        }

        // 2. Checa se pediu para voltar para música anterior
        if (preg_match('/(?:volta|voltar|anterior)\s*(?:a\s+|o\s+)?(?:m[uú]sica|can[cç][aã]o|louvor|faixa)?/iu', $userUtterance)) {
            return $this->handlePreviousMusic($payload);
        }

        // 3. Checa se pediu para repetir ou tocar de novo
        if (preg_match('/(?:repete|repetir|de novo|mais uma vez|outra vez|toca de novo|coloca de novo|repita|tocar de novo)/iu', $userUtterance)) {
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

        // 3. Checa se pediu a Ativação da Noite / Sabedoria / Prosperidade antes de dormir
        if (preg_match('/(?:ativação|ativacao|prosperidade|decreto)\s*(?:da noite|de hoje|noturna|antes de dormir)?/iu', $userUtterance)) {
            return $this->handleAtivacaoNoite();
        }

        // 4. Checa se pediu o Devocional do dia
        if (preg_match('/(?:devocional|palavra do dia)\s*(?:de hoje|do papai)?/iu', $userUtterance)) {
            return $this->handleDevocional();
        }

        // 5. Checa se pediu oração ou intercessão por alguém
        if (preg_match('/(?:ora|orar|ore|oração|oracao|interceda|interceder|abençoa|abencoa|abençoe|abencoe)\s+(?:por|pela|pelo|pra|para)?\s*(.+)/iu', $userUtterance, $mPray)) {
            return $this->handlePrayer(trim($mPray[1]));
        }

        // 6. Checa se pediu para contar uma história bíblica
        if (preg_match('/(?:conta|conte|ouvir|quero)\s*(?:uma\s+)?(?:hist[oó]ria|historinha)\s*(?:b[ií]blica)?\s*(?:sobre|de|do|da)?\s*(.*)/iu', $userUtterance, $mStory)) {
            $storyTopic = trim($mStory[1] ?? '');
            return $this->handleBibleStory($storyTopic ?: null);
        }

        // 7. Busca memórias permanentes priorizando toda a família, pessoas e orações
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
    private function callAiWithMemory(string $userPrompt, string $contextType, int $maxTokens = 420): ?string
    {
        $memories = CharleneMemory::whereIn('category', ['familia', 'pessoa', 'pedido_oracao'])
            ->orderBy('updated_at', 'desc')
            ->take(15)
            ->get();

        $memText = $memories->map(fn ($m) => "- {$m->content}")->implode("\n");

        $system = "Você é a Charlene, a assistente e amiga cristã calorosa, doce e alegre da princesinha Sarah (filha do Adrian King e da Samara).\n"
            . "Contexto e memórias da família:\n{$memText}\n"
            . "Fale sempre com linguagem infantil, acolhedora, cheia de fé e amor de Deus.";

        return $this->callOpenAiChat($system, $userPrompt, $maxTokens);
    }

    /**
     * Chamada direta à OpenAI GPT-4o-mini
     */
    private function callOpenAiChat(string $systemPrompt, string $userMessage, int $maxTokens = 350): ?string
    {
        $apiKey = trim((string) (env('OPENAI_API_KEY') ?: ''));
        if (!$apiKey) {
            return null;
        }

        try {
            $res = Http::withHeaders([
                'Authorization' => 'Bearer ' . $apiKey,
                'Content-Type' => 'application/json',
            ])->timeout(7)->post('https://api.openai.com/v1/chat/completions', [
                'model' => 'gpt-4o-mini',
                'temperature' => 0.72,
                'max_tokens' => $maxTokens,
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
     * Devocional do dia do papai Adrian King (Conecta King)
     */
    private function handleDevocional(): JsonResponse
    {
        try {
            $devService = app(BibleDevotionalService::class);
            $dev = $devService->getForDate();

            if ($dev && !empty($dev['reflexao'])) {
                $titulo = $dev['titulo'] ?? 'Devocional de Hoje';
                $versiculo = $dev['versiculo_texto'] ?? $dev['versiculo_ref'] ?? '';
                $reflexaoPura = trim(strip_tags((string) $dev['reflexao']));
                if (mb_strlen($reflexaoPura) > 360) {
                    $posPonto = mb_strrpos(mb_substr($reflexaoPura, 0, 360), '.');
                    $reflexaoPura = ($posPonto !== false && $posPonto > 140)
                        ? mb_substr($reflexaoPura, 0, $posPonto + 1)
                        : (mb_substr($reflexaoPura, 0, 360) . '...');
                }

                $speech = '<speak>Aqui está o devocional de hoje do Conecta King, Sarahzinha e família! '
                    . htmlspecialchars($titulo) . '. '
                    . ($versiculo ? 'A palavra diz: ' . htmlspecialchars($versiculo) . '. ' : '')
                    . htmlspecialchars($reflexaoPura) . ' '
                    . 'Que mensagem abençoada para encher o coração de fé e paz!</speak>';

                return $this->respondSsml($speech, false, '<speak>Sarahzinha, quer ouvir uma música de adoração ou uma história da Bíblia agora?</speak>');
            }
        } catch (\Throwable $e) {
            Log::warning('alexa.devocional.err', ['msg' => $e->getMessage()]);
        }

        return $this->respondSpeech('Hoje o dia está muito abençoado! O papai Adrian King preparou devocionais lindos no Conecta King para você ouvir e crescer na fé!', false);
    }

    /**
     * Ativação Diária de Sabedoria e Prosperidade antes de dormir (Provérbios 1 a 31 - Do Fracasso ao Legado)
     */
    private function handleAtivacaoNoite(): JsonResponse
    {
        try {
            $ativService = app(BibleProsperidadeService::class);
            $hoje = $ativService->getHoje();

            if (!empty($hoje['ok']) && !empty($hoje['data'])) {
                $d = $hoje['data'];
                $titulo = $d['titulo'] ?? 'Sabedoria Diária';
                $proverbsRef = $d['proverbs_ref'] ?? 'Provérbios';
                $sentenca = !empty($d['sentenca_ativacao']) ? trim($d['sentenca_ativacao']) : '';
                $novaMente = !empty($d['nova_mentalidade']) ? trim($d['nova_mentalidade']) : '';

                $blocoSentenca = $sentenca ?: $novaMente ?: 'Eu tenho a mente de Cristo e caminho em sabedoria, paz e prosperidade!';
                if (mb_strlen($blocoSentenca) > 280) {
                    $pos = mb_strrpos(mb_substr($blocoSentenca, 0, 280), '.');
                    if ($pos !== false && $pos > 120) {
                        $blocoSentenca = mb_substr($blocoSentenca, 0, $pos + 1);
                    }
                }

                $speech = '<speak>Sarahzinha e papai Adrian! Chegou a hora da nossa Ativação Diária de Sabedoria e Prosperidade de hoje, fundamentada em '
                    . htmlspecialchars($proverbsRef) . '! '
                    . 'Tema: ' . htmlspecialchars($titulo) . '. '
                    . 'Vamos respirar bem fundo, acalmar o coração e declarar com autoridade e fé para reprogramar a nossa mente esta noite: '
                    . htmlspecialchars($blocoSentenca) . ' '
                    . 'Amém! Sarahzinha, você foi criada para reinar em vida com a sabedoria e inteligência de Deus! Durmam na mais perfeita paz do Senhor Jesus!</speak>';

                return $this->respondSsml($speech, false, '<speak>Sarahzinha, quer que eu toque um louvorzinho suave para você dormir agora?</speak>');
            }
        } catch (\Throwable $e) {
            Log::warning('alexa.ativacao_noite.err', ['msg' => $e->getMessage()]);
        }

        $fallback = '<speak>Sarahzinha e papai Adrian, vamos declarar nossa ativação de sabedoria desta noite: '
            . 'O Senhor é o meu pastor e nada me faltará! Eu tenho a mente de Cristo, sou próspera, sábia e guardada pelo amor do Pai! '
            . 'Durmam em perfeita paz debaixo das asas do Altíssimo! Amém!</speak>';
        return $this->respondSsml($fallback, false, '<speak>Quer uma musiquinha bem suave para dormir agora, Sarahzinha?</speak>');
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

        $allowedExts = ['mp3', 'm4a', 'aac', 'wav', 'ogg', 'flac', 'wma', 'opus', 'webm', 'mp4', '3gp', '3gpp'];
        $ext = strtolower($file->getClientOriginalExtension() ?? '');
        $mime = strtolower($file->getMimeType() ?? '');
        $clientMime = strtolower($file->getClientMimeType() ?? '');
        $guessed = strtolower($file->guessExtension() ?? '');

        // Se a extensão veio vazia ou diferente do esperado (muito comum em mobile Android e iOS)
        if (!$ext || !in_array($ext, $allowedExts, true)) {
            if (in_array($guessed, $allowedExts, true)) {
                $ext = $guessed;
            } elseif (
                str_starts_with($mime, 'audio/') || 
                str_starts_with($clientMime, 'audio/') || 
                $mime === 'application/octet-stream' ||
                $clientMime === 'application/octet-stream' ||
                str_contains($mime, 'mp4') ||
                str_contains($clientMime, 'mp4') ||
                str_contains($mime, 'quicktime') ||
                str_contains($clientMime, 'quicktime') ||
                str_contains($mime, 'mp3') ||
                str_contains($clientMime, 'mp3') ||
                str_contains($mime, 'mpeg') ||
                str_contains($clientMime, 'mpeg') ||
                $guessed === 'mp4' ||
                $guessed === 'm4a'
            ) {
                $ext = ($guessed === 'mp4' || $guessed === 'm4a' || str_contains($mime, 'mp4') || str_contains($clientMime, 'mp4')) ? 'm4a' : 'mp3';
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Formato não suportado. Por favor, envie um arquivo de áudio (.mp3, .m4a, .wav ou .aac).'
                ], 422);
            }
        }

        // Se o arquivo veio com extensão mp4 (container de áudio comum de iPhone/Android), salva como m4a para compatibilidade com Alexa
        if ($ext === 'mp4' || $ext === '3gp' || $ext === '3gpp') {
            $ext = 'm4a';
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
     * Upload de músicas pesadas em chunks (fatias) para contornar limites de proxy / Cloudflare
     */
    public function uploadMusicChunk(Request $request): JsonResponse
    {
        $fileId = preg_replace('/[^a-zA-Z0-9_\-]/', '', (string)$request->input('file_id', ''));
        $chunkIndex = (int)$request->input('chunk_index', 0);
        $totalChunks = (int)$request->input('total_chunks', 1);
        $filename = (string)$request->input('filename', 'musica.mp3');
        $cat = (string)$request->input('category', 'adoracao');

        if (!$request->hasFile('chunk') || empty($fileId)) {
            return response()->json(['success' => false, 'message' => 'Nenhum pedaço (chunk) de áudio recebido.'], 400);
        }

        $chunkFile = $request->file('chunk');
        if (!$chunkFile || !$chunkFile->isValid()) {
            return response()->json(['success' => false, 'message' => 'Falha no recebimento do pedaço.'], 400);
        }

        $tempDir = storage_path('app/charlene_temp/' . $fileId);
        File::ensureDirectoryExists($tempDir, 0777, true);

        $partName = 'part_' . str_pad((string)$chunkIndex, 5, '0', STR_PAD_LEFT);
        $chunkFile->move($tempDir, $partName);

        // Se todos os pedaços foram recebidos
        if ($chunkIndex + 1 >= $totalChunks) {
            if (!in_array($cat, self::CATEGORIAS, true)) {
                $cat = 'adoracao';
            }
            $destDir = ($cat === 'geral') ? $this->storageDir : ($this->storageDir . '/' . $cat);
            File::ensureDirectoryExists($destDir, 0777, true);

            $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION) ?: 'mp3');
            $allowedExts = ['mp3', 'm4a', 'aac', 'wav', 'ogg', 'flac', 'wma', 'opus', 'webm', 'mp4', '3gp', '3gpp'];
            if (!in_array($ext, $allowedExts, true)) {
                $ext = 'mp3';
            }
            if ($ext === 'mp4' || $ext === '3gp' || $ext === '3gpp') {
                $ext = 'm4a';
            }

            $origName = pathinfo($filename, PATHINFO_FILENAME);
            $cleanBase = preg_replace('/[^\w\s\-\.]/u', '_', $origName);
            $cleanBase = trim(preg_replace('/\s+/', ' ', $cleanBase));
            if ($cleanBase === '') {
                $cleanBase = 'musica_' . time();
            }
            $cleanName = $cleanBase . '.' . $ext;
            if (file_exists($destDir . '/' . $cleanName)) {
                $cleanName = $cleanBase . '_' . time() . '.' . $ext;
            }

            $finalPath = $destDir . '/' . $cleanName;
            $out = fopen($finalPath, 'wb');
            if (!$out) {
                return response()->json(['success' => false, 'message' => 'Falha ao gravar arquivo final no disco.'], 500);
            }

            for ($i = 0; $i < $totalChunks; $i++) {
                $partPath = $tempDir . '/part_' . str_pad((string)$i, 5, '0', STR_PAD_LEFT);
                if (file_exists($partPath)) {
                    $in = fopen($partPath, 'rb');
                    if ($in) {
                        while (!feof($in)) {
                            $buffer = fread($in, 1048576);
                            if ($buffer !== false) {
                                fwrite($out, $buffer);
                            }
                        }
                        fclose($in);
                    }
                    @unlink($partPath);
                }
            }
            fclose($out);
            @rmdir($tempDir);

            Log::info("Charlene chunked upload complete: {$cleanName} into {$cat} (total chunks: {$totalChunks})");

            $subPath = ($cat === 'geral') ? '' : ($cat . '/');

            return response()->json([
                'success' => true,
                'completed' => true,
                'name' => $cleanName,
                'message' => "Música '" . htmlspecialchars($cleanName) . "' adicionada à pasta '" . ucfirst($cat) . "' da Sarah com sucesso!",
                'url' => $this->baseUrl . '/storage/sara/musicas/' . $subPath . rawurlencode($cleanName)
            ]);
        }

        return response()->json([
            'success' => true,
            'completed' => false,
            'chunk_index' => $chunkIndex,
            'message' => "Parte " . ($chunkIndex + 1) . " de {$totalChunks} recebida com sucesso."
        ]);
    }

    /**
     * Remove múltiplas músicas selecionadas de uma vez
     */
    public function deleteMultipleMusic(Request $request): JsonResponse
    {
        $files = $request->input('files', []);
        if (is_string($files)) {
            $files = json_decode($files, true) ?: [$files];
        }
        if (!is_array($files) || empty($files)) {
            return response()->json(['success' => false, 'message' => 'Nenhum arquivo informado para exclusão.'], 400);
        }

        $deletedCount = 0;
        foreach ($files as $item) {
            $filename = is_array($item) ? ($item['filename'] ?? '') : (string)$item;
            $cat = is_array($item) ? ($item['category'] ?? '') : (string)$request->input('category', '');

            $filename = basename($filename);
            if (empty($filename)) continue;

            $pathsToTry = [];
            if ($cat) {
                $pathsToTry[] = ($cat === 'geral') ? ($this->storageDir . '/' . $filename) : ($this->storageDir . '/' . $cat . '/' . $filename);
            }
            foreach (['adoracao', 'dormir', 'animadas', ''] as $c) {
                $pathsToTry[] = $c ? ($this->storageDir . '/' . $c . '/' . $filename) : ($this->storageDir . '/' . $filename);
            }

            foreach ($pathsToTry as $p) {
                if (File::exists($p)) {
                    File::delete($p);
                    $deletedCount++;
                    break;
                }
            }
        }

        return response()->json([
            'success' => true,
            'count' => $deletedCount,
            'message' => "{$deletedCount} música(s) removida(s) com sucesso!"
        ]);
    }

    /**
     * Apaga todas as músicas da pasta especificada
     */
    public function deleteFolderMusic(Request $request): JsonResponse
    {
        $cat = (string)$request->input('category', '');
        if (!in_array($cat, ['adoracao', 'dormir', 'animadas', 'geral', 'todas'], true)) {
            return response()->json(['success' => false, 'message' => 'Pasta/categoria inválida.'], 400);
        }

        $deletedCount = 0;
        $targets = ($cat === 'todas') ? ['adoracao', 'dormir', 'animadas', 'geral'] : [$cat];

        foreach ($targets as $c) {
            $folder = ($c === 'geral') ? $this->storageDir : ($this->storageDir . '/' . $c);
            if (File::isDirectory($folder)) {
                $allFiles = File::files($folder);
                foreach ($allFiles as $f) {
                    File::delete($f->getPathname());
                    $deletedCount++;
                }
            }
        }

        $label = ($cat === 'todas') ? 'Todas as pastas' : "A pasta '" . ucfirst($cat) . "'";
        return response()->json([
            'success' => true,
            'count' => $deletedCount,
            'message' => "{$label} foi limpa! {$deletedCount} música(s) removida(s)."
        ]);
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

        return response()
            ->view('pages.charleneMusicas', [
                'musicas' => $musicas,
                'memorias' => $memorias,
                'historiasOuvidas' => $historiasOuvidas,
                'totalCatalogo' => $totalCatalogo,
                'historiasCatalogo' => self::HISTORIAS_CATALOGO,
                'baseUrl' => $this->baseUrl . '/storage/sara/musicas/',
            ])
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0')
            ->header('Pragma', 'no-cache')
            ->header('Expires', '0');
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
