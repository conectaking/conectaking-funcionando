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

    public const HISTORIAS_CATALOGO = [
        [
            'slug' => 'criacao_mundo',
            'titulo' => 'A Criação do Mundo e o Jardim do Éden',
            'personagem' => 'Deus Criador, Adão e Eva',
            'tema' => 'A Soberania e a Perfeição do Criador',
            'licoes' => 'Deus planejou cada detalhe com perfeição e soprou vida para sermos Sua imagem e semelhança.',
            'historia_base' => 'No princípio de tudo, antes que existisse o tempo, o céu azul ou o chão firme sob nossos pés, não havia nada além do silêncio e de uma escuridão sem fim sobre a profundeza das águas. Mas o Espírito de Deus pairava sobre as águas com amor eterno. Então, com o poder infinito de Sua voz majestosa, Deus disse: \'Haja luz!\'. E imediatamente, um clarão radiante cortou as trevas, trazendo as cores mais deslumbrantes que já existiram! Deus separou o dia da noite e chamou a luz de \'Dia\' e as trevas de \'Noite\'. 

No segundo dia, Deus estendeu a abóboda celeste, criando o firmamento que chamou de Céu. No terceiro dia, ordenou que as águas debaixo dos céus se juntassem num só lugar, surgindo os oceanos majestosos e a porção seca, a Terra! Apenas pela palavra do Senhor, brotaram do solo campos verdes, flores perfumadas de todas as cores e árvores frondosas carregadas de frutos doces e deliciosos. No quarto dia, o Senhor acendeu as lâmpadas celestes: o sol dourado e resplandecente para governar o dia, a lua prateada e bilhões de estrelas cintilantes para iluminar a noite.

No quinto dia, as águas se encheram de cardumes nadando velozes, desde os peixinhos dourados até as grandes baleias, e o céu se povoou com pássaros de penas coloridas voando e cantando melodias de louvor. No sexto dia, Deus criou os animais da terra: leões fortes, cavalos velozes, cordeiros mansinhos e coelhinhos saltitantes. Mas faltava a obra-prima de todo o universo! Deus então moldou o homem do pó da terra com Suas próprias mãos e soprou em suas narinas o fôlego da vida, criando também a mulher para andarem juntos em amor, amizade e comunhão no Jardim do Éden! Deus contemplou tudo o que havia feito e viu que era muito bom!',
            'ministracao_sarah' => 'Princesa Sarah, feche os seus olhinhos e sinta essa verdade sobrenatural no seu espírito: o mesmo Deus Todo-Poderoso que acendeu as estrelas com a ponta dos dedos e pintou as asas das borboletas desenhou você com carinho no ventre da sua mamãe Samara! Você não é fruto do acaso; você é a obra-prima mais preciosa do Criador nesta terra!

Eu ministro sobre você uma inteligência brilhante, mente de Cristo e um coração cheio da paz de Deus. Honre, ame e obedeça todos os dias ao seu papai Adrian King, a quem Deus deu autoridade para cuidar e guardar a sua vida, e à sua amada mamãe Samara, que é fonte de graça e carinho sobre você. E lembre-se: a sua preciosa vovó Socorro, uma mulher de Deus que ama o Senhor, dobra os joelhos no chão e ora todos os dias derramando lágrimas de intercessão para que a bênção de Deus nunca se aparte de você! Guarde nossa rima de ouro no coração: \'Deus fez as estrelas e o lindo luar, e me fez para o papai, a mamãe e a vovó amar!\'',
        ],
        [
            'slug' => 'noe_arca',
            'titulo' => 'Noé, a Arca de Madeira e o Arco-Íris da Aliança',
            'personagem' => 'Noé e sua Família',
            'tema' => 'Fidelidade, Obediência e Aliança Eterna',
            'licoes' => 'A obediência completa a Deus protege a nossa família das tempestades do mundo.',
            'historia_base' => 'Num tempo em que o mundo havia se esquecido de Deus e as pessoas praticavam apenas maldades e injustiças, havia um homem reto, justo e temente ao Senhor chamado Noé. Ele andava diariamente com Deus, ouvindo Sua voz e guardando Seus mandamentos. Certo dia, o Senhor falou a Noé: \'O fim de toda carne é chegado perante mim. Faze para ti uma arca de madeira de gofer; farás compartimentos na arca e a betumarás por dentro e por fora\'. Deus deu a Noé as medidas exatas: trezentos côvados de comprimento, cinquenta de largura e trinta de altura, com três andares espaçosos e uma janela no topo.

Durante anos, sob o sol quente, Noé, sua esposa e seus filhos Sem, Cam e Jafé cortaram troncos gigantescos, aplainaram tábuas e martelaram dia após dia: toc-toc-toc! As pessoas da época riam e zombavam de Noé, dizendo que ele era tolo por construir um barco gigante no meio da terra seca onde nunca havia chovido. Mas Noé não se importou com a zombaria; sua fé estava firmada na Palavra do Deus Altíssimo. Quando a arca ficou pronta, Deus fez vir aos pares todos os tipos de animais: leões mansos, elefantes imponentes, girafas de pescoço longo, passarinhos cantores e cordeirinhos saltitantes.

Quando todos entraram com provisões suficientes para a viagem, o próprio Deus fechou a porta por fora com Sua mão poderosa! Então as fontes do grande abismo se romperam e as comportas dos céus se abriram, caindo chuva torrencial por quarenta dias e quarenta noites. As águas cobriram até as montanhas mais altas, mas a arca flutuava segura, guardada pelo Senhor. Depois de muitos meses, Noé soltou uma pomba que voltou trazendo no bico uma folha verde de oliveira: a terra havia secado! Ao saírem em terra firme, Noé ergueu um altar de adoração a Deus, e o Senhor colocou no céu um arco-íris radiante com sete cores vivas, selando Sua aliança de que nunca mais destruiria a terra por águas!',
            'ministracao_sarah' => 'Sarahzinha, assim como Noé protegeu sua casa inteira pela fé e pela obediência, o seu lar é uma arca de proteção e bênção guardada pelo Sangue do Cordeiro! O papai Adrian King foi levantado por Deus como o sacerdote sábio e protetor da sua vida; obedeça sempre às suas instruções com alegria no coração. A mamãe Samara é a mulher graciosa que enche sua vida de amor, afeto e oração. 

E você tem um escudo espiritual poderosíssimo: a sua vovó Socorro, que é uma verdadeira mulher de Deus, intercessora fervorosa, que não se cansa de dobrar os joelhos perante o altar celestial para clamar pela sua saúde, pela sua inteligência e pelo seu futuro grandioso! Quando as tempestades da vida soprarem, você estará firme e segura na Rocha que é Jesus! Nossa rima de ouro: \'Como a arca de Noé sobre as águas a flutuar, a bênção de Deus na minha casa vai sempre reinar!\'',
        ],
        [
            'slug' => 'abraao_chamado',
            'titulo' => 'Abraão: O Chamado de Ur e a Promessa das Estrelas',
            'personagem' => 'Abraão e Sara',
            'tema' => 'A Fé Que Sai do Conforto e a Aliança das Promessas',
            'licoes' => 'Quando confiamos na voz de Deus, Ele nos conduz a um destino maior do que tudo o que conhecemos.',
            'historia_base' => 'Na próspera e antiga cidade de Ur dos Caldeus, cercada por grandes templos e torres imponentes, vivia um homem chamado Abrão e sua esposa Sarai. Naquela terra, as pessoas adoravam a lua, o sol e ídolos feitos de pedra e ouro que não podiam falar, ouvir nem socorrer. Porém, o Deus Vivo e Verdadeiro apareceu a Abrão e lhe fez um chamado surpreendente: \'Sai da tua terra, da tua parentela e da casa de teu pai, para a terra que eu te mostrarei. Farei de ti uma grande nação, e te abençoarei, e engrandecerei o teu nome; e tu serás uma bênção!\'.

Abrão tinha setenta e cinco anos de idade, possuía terras e riquezas em Ur, mas não hesitou nem duvidou. Ele dobrou suas tendas, reuniu seus rebanhos, colocou sua esposa Sarai e seu sobrinho Ló a caminho e partiu em direção ao desconhecido, confiando unicamente na promessa invisível de Deus! A caminhada pelo deserto durou muitos meses, enfrentando o calor do dia e o frio da noite. Mas onde quer que Abrão armasse sua tenda, ele erguia um altar de pedras e invocava o nome do Senhor.

Anos se passaram e Abrão e Sarai continuavam sem filhos, já avançados em idade. Certa noite de céu limpo e escuro, Deus chamou Abrão para fora da tenda e disse: \'Olha agora para os céus e conta as estrelas, se as podes contar. Assim será a tua descendência!\'. Abrão olhou para aquele oceano de luzes cintilantes na noite do deserto e creu no Senhor no mais íntimo do seu coração; e Deus imputou-lhe isso como justiça! O Senhor mudou seu nome para Abraão, que significa \'pai de muitas nações\', selando uma aliança eterna que atravessaria todas as gerações da terra!',
            'ministracao_sarah' => 'Querida Sarah, filha amada do Adrian King e da Samara: a aliança e a fé de Abraão estão sobre você hoje! Você carrega no seu espírito o DNA da promessa de Deus! Nunca tenha medo de sonhar alto, porque o Deus que contou as estrelas para Abraão tem planos muito maiores para você do que você possa imaginar!

Seja uma menina de honra e respeito absoluto ao seu papai Adrian King, pois a honra aos pais é o primeiro mandamento com promessa de longevidade e prosperidade. Ame e seja o consolo doce da sua mamãe Samara em todos os momentos. E celebre no seu coração o privilégio de ter a vovó Socorro, uma serva fiel de Deus, coluna de oração que batalha espiritualmente em jejum e clamor pela sua vitória, pelo seu crescimento saudável e pelo seu brilho! Nossa rima de ouro: \'Como as estrelas no céu a brilhar, as promessas de Deus na minha vida vão se cumprir e jamais falhar!\'',
        ],
        [
            'slug' => 'abraao_moria',
            'titulo' => 'Abraão, Isaque e o Monte Moriá: O Deus Que Provê',
            'personagem' => 'Abraão, Isaque e o Anjo do Senhor',
            'tema' => 'A Prova Suprema da Fé e o Cordeiro da Provisão (Yahweh Jireh)',
            'licoes' => 'Deus nunca nos tira nada sem nos dar algo infinitamente maior; Ele é o nosso provedor perfeito.',
            'historia_base' => 'Após anos de espera e oração, a promessa de Deus se cumpriu de forma milagrosa: Sarai, aos noventa anos, e Abraão, aos cem anos de idade, deram à luz um lindo bebê chamado Isaque, cujo nome significa \'riso e alegria\'! O menino cresceu saudável, forte, inteligente e temente a Deus, sendo a menina dos olhos e a maior alegria daquele lar. Mas Deus quis provar a fidelidade de Abraão para demonstrar a todas as gerações a força do verdadeiro amor que confia cegamente no Altíssimo.

Deus chamou: \'Abraão!\'. E ele respondeu com prontidão: \'Eis-me aqui!\'. O Senhor lhe disse: \'Toma agora teu filho, o teu único filho, Isaque, a quem amas, e vai-te à terra de Moriá, e oferece-o ali em holocausto sobre um dos montes que eu te indicarei\'. O coração de Abraão deve ter estremecido, mas sua fé em Deus era inabalável: ele sabia que Deus tinha poder até para ressuscitar os mortos! Bem cedo pela manhã, Abraão albardou seu jumento, rachou a lenha para o fogo, chamou dois moços e o jovem Isaque, e iniciou a caminhada de três dias rumo à montanha.

No terceiro dia, ao avistar o monte de longe, Abraão disse aos servos: \'Ficai-vos aqui; eu e o moço iremos até ali e, havendo adorado, voltaremos a vós\'. Enquanto subiam a montanha, Isaque carregava a lenha nos ombros e Abraão levava o fogo e o cutelo. Então Isaque olhou para seu pai com olhos doces e perguntou: \'Meu pai, eis aqui o fogo e a lenha, mas onde está o cordeiro para o holocausto?\'. Com lágrimas de fé nos olhos, Abraão respondeu profeticamente: \'Deus proverá para si o cordeiro para o holocausto, meu filho!\'. 

Chegando ao topo, Abraão ergueu o altar de pedras, arrumou a lenha e amarrou seu filho com reverência. Mas no exato momento em que levantava a mão com a faca, a voz do Anjo do Senhor bradou dos céus: \'Abraão, Abraão! Não estendas a tua mão sobre o moço, e não lhe faças nada; porquanto agora sei que temes a Deus, e não me negaste o teu filho, o teu único filho!\'. Abraão levantou os olhos e viu, preso pelos chifres num arbusto, um carneiro que Deus havia providenciado! Abraão ofereceu o carneiro e chamou àquele lugar \'Yahweh Jireh\' — O Senhor Proverá!',
            'ministracao_sarah' => 'Sarahzinha, receba no seu coração a revelação de Yahweh Jireh: o Senhor que tudo provê! Nunca faltará paz, alegria, saúde, sabedoria e vitória na sua jornada, pois o Deus de Abraão supre todas as suas necessidades em glória!

Olhe para o seu papai Adrian King como um sacerdote de fé e coragem, que zela pelo seu futuro e ama você com amor incondicional; honre o papai em cada palavra e gesto. Ame a mamãe Samara com doces beijinhos e obediência fiel. E guarde com gratidão no seu coração as orações de fogo da sua vovó Socorro, mulher valorosa de joelhos calejados diante de Deus que ora pela sua proteção dia e noite! Nossa rima de ouro: \'No monte do Senhor a provisão vai chegar, e a bênção de Deus nunca vai me faltar!\'',
        ],
        [
            'slug' => 'isaque_pocos',
            'titulo' => 'Isaque e os Poços da Paz no Vale de Gerar',
            'personagem' => 'Isaque e Rebeca',
            'tema' => 'A Mansidão, a Paciência e a Prosperidade que Vem do Alto',
            'licoes' => 'Quem não briga e busca a paz colhe a cem por um e herda a bênção de Reobote.',
            'historia_base' => 'Houve uma grande fome naquela terra, como nos dias de Abraão, e Isaque pensou em descer para o Egito em busca de comida e água. Mas o Senhor apareceu a Isaque e lhe disse: \'Não desças ao Egito; habita na terra que eu te disser. Peregrina nesta terra, e serei contigo e te abençoarei; porque a ti e à tua descendência darei todas estas terras\'. Isaque confiou plenamente na palavra de Deus e permaneceu no vale de Gerar.

Naquele mesmo ano de seca intensa, enquanto a terra dos outros estava árida e sem fruto, Isaque semeou nos campos e o Senhor o abençoou de tal maneira que ele colheu naquele mesmo ano a cem por um! Seus rebanhos de ovelhas e bois se multiplicaram extraordinariamente, e ele tinha uma multidão de servos, de modo que os filisteus daquela região começaram a ter inveja dele. Para prejudicá-lo, os pastores locais entupiram com terra e pedras todos os poços de água que os servos de seu pai Abraão haviam cavado.

Isaque não revidou nem brigou. Ele desentulhou os poços com paciência. Quando seus servos cavaram no vale e acharam um manancial de água pura e cristalina, os pastores de Gerar disputaram e disseram: \'Esta água é nossa!\'. Isaque chamou o poço de Eseque (que significa contenda) e foi-se dali. Cavaram outro poço, e também sobre este brigaram; por isso chamou seu nome Sitna (inimizade). Mais uma vez, sem gritar nem contender, Isaque mudou-se dali e cavou outro poço. Desta vez, ninguém disputou por ele! Então Isaque se alegrou e disse: \'Porque agora o Senhor nos deu espaço largo e prosperaremos nesta terra!\'. E chamou o poço de Reobote! Naquela mesma noite, Deus lhe apareceu e confirmou Sua aliança perpétua de paz!',
            'ministracao_sarah' => 'Princesa Sarah, a virtude mais linda de uma filha do Rei é a mansidão e a paz! O Espírito Santo coloca no seu coração uma sabedoria celestial para nunca entrar em brigas ou murmurações, mas sempre ser uma pacificadora que espalha luz por onde passa!

Deus já preparou poços de água viva e lugares largos de prosperidade para a sua vida! Ouça sempre com doçura os conselhos do seu papai Adrian King e da sua mamãe Samara; a obediência aos pais abre caminhos de vitória que ninguém pode fechar. E receba o aroma suave das orações da sua vovó Socorro, que é uma sentinela de Deus clamando para que os rios do Espírito Santo reguem o seu coração com sabedoria e saúde! Nossa rima de ouro: \'Com paz e paciência eu aprendo a vencer, e nos poços de Deus água viva vou ter!\'',
        ],
        [
            'slug' => 'jaco_betel_peniel',
            'titulo' => 'Jacó: A Escada dos Anjos em Betel e o Encontro de Peniel',
            'personagem' => 'Jacó (Israel) e o Anjo de Deus',
            'tema' => 'A Transformação de Caráter e a Aliança do Nome Israel',
            'licoes' => 'Deus não desiste de nós; Ele transforma nossas fragilidades em autoridade de príncipe.',
            'historia_base' => 'Jacó teve que partir de Berseba rumo a Harã, numa longa e solitária caminhada pelo deserto. Ao pôr do sol, exausto da jornada, parou para passar a noite num lugar descampado. Tomou uma das pedras daquele chão áspero, colocou-a como travesseiro debaixo da cabeça e adormeceu sob o manto escuro da noite. E sonhou: eis que uma escada monumental estava apoiada na terra, e o seu topo tocava as alturas do céu! Por ela, os anjos de Deus subiam e desciam em feixes de luz celestial, e o próprio Senhor estava acima dela, dizendo: \'Eu sou o Senhor, o Deus de Abraão teu pai, e o Deus de Isaque; esta terra em que estás deitado, te darei a ti e à tua semente. Eis que estou contigo, e te guardarei por onde quer que fores!\'.

Ao acordar de manhã, com o coração cheio de santa reverência, Jacó exclamou: \'Na verdade o Senhor está neste lugar, e eu não o sabia! Quão terrível é este lugar! Este não é outro lugar senão a casa de Deus, e esta é a porta dos céus!\'. Ele pegou a pedra do travesseiro, erigiu-a como coluna comemorativa, derramou azeite perfumado sobre ela e chamou àquele lugar \'Betel\' — que significa \'Casa de Deus\'!

Vinte anos depois, Jacó retornava para sua terra com esposas, filhos e grandes mananciais de gado, mas enfrentava o medo de encontrar seu irmão Esaú. Ao passar o ribeiro de Jaboque na calada da noite, Jacó ficou sozinho. Ali, um Homem celestial lutou com ele até o romper da alva! Vendo o Homem que não prevalecia contra Jacó, tocou-lhe a juntura da coxa, que se deslocou. O Anjo disse: \'Deixa-me ir, porque já rompe o dia\'. Mas Jacó, segurando-O com todas as suas forças e lágrimas de súplica, declarou: \'Não te deixarei ir, se não me abençoares!\'. O Anjo então lhe perguntou: \'Qual é o teu nome?\'. Ele respondeu: \'Jacó\' (o suplantador). O Anjo declarou com poder: \'Não te chamarás mais Jacó, mas Israel; pois como príncipe lutaste com Deus e com os homens, e prevaleceste!\'. Jacó chamou àquele lugar Peniel, porque viu a Deus face a face e sua vida foi salva! O sol nasceu sobre ele enquanto caminhava com novo caráter e nova unção!',
            'ministracao_sarah' => 'Princesa Sarah, você não é comum; você é uma princesa que prevalece em Deus! Anjos sobem e descem sobre o seu quarto todas as noites para guardar o seu soninho e afastar todo medo da sua mente!

Deus colocou sobre você um espírito excelente e mente de vencedora! Honre e ame o papai Adrian King, homem que trabalha e luta pelo seu bem-estar, e abrace com todo amor a sua mamãe Samara, que é bênção diária nos seus dias. E louve a Deus pela vida da sua vovó Socorro, que é como Jacó em Peniel: perseverante na oração, lutando espiritualmente de madrugada diante do trono de Deus até que a bênção desça sobre a sua cabecinha! Nossa rima de ouro: \'Com anjos do céu a me guardar e guiar, na Casa de Deus eu vou sempre morar!\'',
        ],
        [
            'slug' => 'jose_egito_completo',
            'titulo' => 'José do Egito: A Túnica de Cores, a Prisão e o Trono',
            'personagem' => 'José, Faraó e seus Irmãos',
            'tema' => 'A Soberania da Providência Divina e o Perdão Supremo',
            'licoes' => 'O que o inimigo intentou para o mal, Deus transforma em bem para salvar muitas vidas.',
            'historia_base' => 'Israel amava a José mais do que a todos os seus filhos, porque era o filho da sua velhice, e mandou fazer para ele uma túnica especial, de mangas compridas e rica em muitas cores vivas: azul, escarlate, dourado e púrpura. Mas seus irmãos mais velhos tinham ciúmes e não conseguiam falar-lhe pacificamente. Certa noite, José teve um sonho profético de Deus e contou aos irmãos: \'Estávamos atando feixes no meio do campo, e eis que o meu feixe se levantou e ficou em pé, e os vossos feixes o rodeavam e se inclinavam perante o meu feixe!\'. Depois sonhou que o sol, a lua e onze estrelas se prostravam diante dele. A inveja dos irmãos aumentou tanto que, quando José foi procurá-los nos pastos de Dotã, eles o agarraram, rasgaram sua linda túnica, jogaram-no numa cisterna seca e profunda e depois o venderam por vinte moedas de prata para mercadores ismaelitas a caminho do Egito!

No Egito, José foi comprado por Potifar, capitão da guarda do Faraó. Mesmo longe de sua casa e de seu pai, José não murmurou nem pecou; o Senhor era com ele, e tudo o que José fazia prosperava em suas mãos! Acusado injustamente pela esposa de Potifar, José foi parar na masmorra do rei. Mas até na prisão o Senhor estendeu sobre ele Sua misericórdia e lhe deu graça perante o carcereiro, que colocou todos os prisioneiros sob seus cuidados. Na prisão, José interpretou os sonhos misteriosos do copeiro-chefe e do padeiro com exatidão revelada pelo Espírito de Deus.

Dois anos inteiros se passaram até que o próprio Faraó teve dois sonhos perturbadores: sete vacas gordas e formosas saindo do rio Nilo sendo devoradas por sete vacas magras e feias; e sete espigas cheias devoradas por sete espigas mirradas pelo vento oriental. Nenhum dos sábios do Egito pôde interpretar. O copeiro lembrou-se de José, que foi tirado da masmorra às pressas, barbeou-se, mudou de roupa e compareceu perante o Faraó. Com profunda humildade, José disse: \'Isso não está em mim; Deus dará resposta de paz ao Faraó!\'. José revelou que haveria sete anos de fartura sem igual seguidos de sete anos de fome severa sobre a terra, e aconselhou o rei a nomear um homem prudente para armazenar mantimentos. O Faraó ficou maravilhado e disse: \'Poderíamos achar outro homem como este, em quem haja o Espírito de Deus?\'. O rei tirou o anel de selar de sua mão, colocou-o no dedo de José, vestiu-o com roupas de linho fino, pôs-lhe um colar de ouro no pescoço e o declarou governador de todo o Egito, abaixo apenas do próprio Faraó!

Quando a grande fome assolou o mundo, os irmãos de José vieram do deserto comprar comida no Egito e prostraram-se com o rosto em terra diante de José, sem reconhecê-lo! José não buscou vingança nem guardou rancor; pelo contrário, seu coração se derreteu em compaixão, chorou em alta voz nos braços de seus irmãos e lhes disse: \'Eu sou José, vosso irmão! Não vos entristeçais por me haverdes vendido para cá; porque para conservação da vida, Deus me enviou adiante de vós! Vós intentastes o mal contra mim, porém Deus o transformou em bem!\' E sustentou toda a sua família na melhor terra do Egito!',
            'ministracao_sarah' => 'Princesa Sarah, guarde este segredo profundo no seu coraçãozinho: não importa o que aconteça ao seu redor, ninguém pode roubar os sonhos que Deus plantou no seu espírito! O Senhor é com você em todo tempo e transforma qualquer desafio em degrau de promoção e vitória!

Aprenda desde pequenina a ter um coração puro e cheio de perdão, como José. Honre sempre com palavras doces e carinho imenso o seu papai Adrian King, que cuida de você com amor de pai fiel, e a sua mamãe Samara, que é o seu porto seguro e ternura diária. E bendiga a Deus pela sua vovó Socorro, mulher de joelhos dobrados no chão e orações fervorosas que cobrem a sua vida, para que você cresça sábia, próspera e cheia do Espírito Santo como José foi no palácio! Nossa rima de ouro: \'Os sonhos de Deus ninguém pode apagar, do poço ao palácio o Senhor vai me honrar!\'',
        ],
        [
            'slug' => 'moises_nilo_mar',
            'titulo' => 'Moisés: Do Cestinho no Rio Nilo à Glória do Mar Vermelho',
            'personagem' => 'Moisés, Joquebede, Miriã e o Povo de Israel',
            'tema' => 'Libertação, Proteção dos Pequeninos e o Poder Soberano',
            'licoes' => 'Deus cuida dos Seus filhos desde o berço e abre caminhos onde não há caminho.',
            'historia_base' => 'No Egito, o povo hebreu havia crescido muito, e um novo Faraó cruel, com medo de perder seu poder, decretou uma lei horrível: todo menino hebreu recém-nascido deveria ser jogado nas águas do rio Nilo. Naquele tempo perigoso, uma mãe de fé inabalável chamada Joquebede e seu esposo Anrão tiveram um lindo bebê. Vendo que ele era formoso aos olhos de Deus, esconderam-no secretamente em casa durante três meses. Quando já não podia mais escondê-lo, Joquebede tomou um cestinho de junco, calafetou-o com betume e pez para que a água não entrasse, colocou o bebezinho dentro com muito amor e oração, e o pôs cuidadosamente entre os juncos à margem do rio Nilo. Sua irmãzinha Miriã ficou de longe, atenta, para ver o que aconteceria.

A filha do Faraó desceu ao rio para se banhar com suas donzelas. Ao avistar o cestinho no meio dos juncos, mandou sua criada buscá-lo. Ao abrir a cestinha, a princesa viu o bebezinho chorando, e seu coração se encheu de profunda compaixão: \'Este é um dos meninos dos hebreus!\', disse ela. Miriã aproximou-se com coragem e perguntou: \'Queres que eu vá chamar uma ama das hebreias para criar o menino para ti?\'. A princesa respondeu: \'Vai!\'. Miriã correu e chamou a própria mãe do bebê, Joquebede! A princesa do Egito pagou a própria mãe para amamentar e cuidar do seu filhinho com toda a segurança sob a proteção do palácio! E deu-lhe o nome de Moisés, que significa \'Tirado das águas\'.

Moisés cresceu, foi instruído em toda a ciência do Egito, mas seu coração pertencia ao Deus de seus pais. Aos oitenta anos, após o encontro glorioso com o fogo da Sarça Ardente no deserto de Midiã, onde Deus revelou Seu nome eterno \'EU SOU O QUE SOU\', Moisés voltou ao Egito com o cajado de Deus na mão. Após dez pragas poderosas demonstrarem que os ídolos do Egito eram pó diante do Criador, o Faraó finalmente deixou o povo de Israel sair!

Mas quando o povo chegou às margens do bravio Mar Vermelho, o Faraó endureceu o coração e marchou furioso com centenas de carros de guerra e guerreiros armados para destruí-los. O povo estava encurralado: à frente, águas profundas; atrás, o exército inimigo; dos lados, montanhas intransponíveis! O povo gritou de pavor, mas Moisés bradou com autoridade dos céus: \'Não temais! Aquietai-vos e vede o livramento do Senhor que hoje vos fará; porque aos egípcios que hoje vistes, nunca mais os tornareis a ver! O Senhor pelejará por vós, e vós vos calareis!\'. O Senhor disse a Moisés: \'Por que clamas a mim? Dize aos filhos de Israel que marchem! E tu, levanta o teu cajado, estende a mão sobre o mar e fende-o!\'. Moisés estendeu a mão sobre o mar, e o Senhor fez soprar um vento oriental fortíssimo a noite inteira, dividindo as águas em duas muralhas gigantescas à direita e à esquerda! E os filhos de Israel passaram a pé enxuto pelo meio do mar! Do outro lado, Miriã tomou o tamboril e todo o povo cantou dançando em triunfo ao Deus de Israel!',
            'ministracao_sarah' => 'Princesa Sarah, declare com o seu coraçãozinho: o Deus que cuidou de Moisés no cestinho é o mesmo Deus que cerca você com anjos protetores todos os dias da sua vida! Nenhuma seta maligna, nenhuma enfermidade e nenhum perigo pode tocar na sua vida, pois você é guardada no esconderijo do Altíssimo!

Aprenda a ouvir com reverência as palavras do seu papai Adrian King, homem que Deus colocou como sentinela de fé e liderança na sua família, e aconchegue-se no carinho da sua mamãe Samara, que zela pelo seu sono e pelos seus passinhos. E sinta o abraço das orações da sua vovó Socorro, serva santa de Deus que ora como Joquebede orou por Moisés: colocando você nas mãos do Senhor para que você seja uma mulher de grande autoridade e salvação nesta geração! Nossa rima de ouro: \'Como o mar se abriu para o povo passar, Deus abre o caminho pra eu triunfar!\'',
        ],
        [
            'slug' => 'davi_golias_completo',
            'titulo' => 'Davi e o Gigante Golias: A Pedra da Fé e o Nome do Senhor',
            'personagem' => 'Davi, Golias e o Rei Saul',
            'tema' => 'A Coragem que Nasce da Fé e a Vitória Sobrenatural',
            'licoes' => 'A batalha não é pela força humana, mas pelo Espírito do Deus dos Exércitos.',
            'historia_base' => 'Nos campos verdes e montanhosos de Belém de Judá, o jovem Davi, o filho mais novo de Jessé, cuidava com carinho e dedicação das ovelhas de seu pai. Enquanto pastoreava o rebanho sob o sol e as estrelas, Davi afinava sua harpa, entoava cânticos de adoração ao Deus de Israel e exercitava sua pontaria com a funda. Quando um leão feroz e um urso faminto atacaram as ovelhas, o jovem Davi não fugiu: correu atrás das feras no poder do Senhor, livrou o cordeirinho de suas garras e derrotou os predadores com suas próprias mãos! Ele aprendeu na solidão do pasto que o Senhor é um refúgio e fortaleza presente na hora da angústia.

Enquanto isso, no Vale de Elá, o exército dos filisteus e o exército de Israel liderado pelo rei Saul estavam acampados em montanhas opostas, separados pelo vale. Todos os dias, pela manhã e ao entardecer, saía do acampamento inimigo um gigante guerreiro de Gate chamado Golias! Ele media quase três metros de altura, vestia uma couraça de bronze que pesava cinquenta quilos, caneleiras de bronze nas pernas e carregava uma lança cuja ponta de ferro pesava seis quilos! Com voz de trovão arrogante, Golias zombava dos soldados de Israel durante quarenta dias seguidos: \'Escolhei dentre vós um homem, e desça a mim! Se ele puder pelejar comigo e me matar, seremos vossos servos; porém, se eu prevalecer e o matar, sereis nossos servos!\'. Todo o exército de Israel, inclusive o rei Saul, tremia de medo e ninguém ousava dar um passo à frente.

Jessé enviou o jovem Davi ao campo de batalha para levar pães e queijos aos seus irmãos mais velhos e saber como estavam. Ao chegar e ouvir os insultos de Golias afrontando o Deus Vivo, o espírito de Davi se acendeu de santa indignação: \'Quem é este filisteu incircunciso, para afrontar os exércitos do Deus vivo?\'. Seus irmãos o repreenderam com ciúmes, mas suas palavras chegaram aos ouvidos de Saul. Davi foi levado à tenda real e declarou com convicção: \'Não desfaleça o coração de ninguém por causa dele; teu servo irá e pelejará contra este filisteu!\'. Saul tentou vesti-lo com sua própria armadura de bronze e sua espada pesada, mas Davi não conseguia nem andar e disse: \'Não posso andar com isto, pois nunca o experimentei\'.

Davi despiu a armadura pesada, pegou seu cajado de pastor na mão, escolheu no ribeiro cinco pedras lisas e redondas, colocou-as no alforje e, segurando sua funda de couro, marchou confiante em direção ao gigante! Quando Golias olhou para Davi e viu apenas um jovem ruivo, formoso e sem armadura, desprezou-o e amaldiçoou-o pelos seus deuses: \'Sou eu algum cão, para tu vires a mim com paus? Vem a mim, e darei a tua carne às aves do céu e às feras do campo!\'. Mas Davi não se intimidou nem deu um passo para trás; pelo contrário, correu em direção a Golias e bradou aos quatro ventos: \'Tu vens a mim com espada, e com lança, e com escudo; porém eu vou a ti em nome do Senhor dos Exércitos, o Deus dos exércitos de Israel, a quem tens afrontado! Hoje mesmo o Senhor te entregará na minha mão! E saberá toda esta congregação que o Senhor salva, não com espada, nem com lança; porque do Senhor é a guerra!\'.

Davi enfiou a mão no alforje, tirou uma única pedra, colocou-a na funda, girou-a veloz pelo ar e atirou! A pedra voou com precisão milimétrica guiada pela mão invisível de Deus e encravou-se na testa de Golias! O gigante cambaleou e caiu com estrondo com o rosto no chão! Davi correu, tomou a espada do próprio gigante e selou a grande vitória! O exército de Israel deu um grande brado de júbilo e perseguiu os inimigos até as portas de Ecrom! Naquele dia, toda a terra soube que há Deus em Israel!',
            'ministracao_sarah' => 'Princesa Sarah, você tem a ousadia, a coragem e a unção de Davi no seu coração! Nenhum gigante de medo, nenhuma tristeza e nenhum obstáculo poderá prevalecer contra a sua vida, porque você não anda pelas suas forças, mas em Nome do Senhor dos Exércitos!

Olhe com honra para o seu papai Adrian King, homem valente que Deus colocou como escudo sobre o seu lar, e para a sua mamãe Samara, que cuida da sua vida com carinho e sabedoria. E celebre a fortaleza espiritual da sua vovó Socorro, mulher de Deus perseverante na oração que atira as pedras da fé através dos seus clamores no chão do quarto, derrubando todo mal diante de você! Nossa rima de ouro: \'Com a pedra da fé e em nome do Senhor, eu venço o gigante e sou mais que vencedor!\'',
        ],
        [
            'slug' => 'daniel_cova_leoes',
            'titulo' => 'Daniel na Cova dos Leões e a Fornalha Ardente',
            'personagem' => 'Daniel, Sadraque, Mesaque, Abede-Nego e o Rei Dario',
            'tema' => 'A Integridade Inegociável e o Livramento dos Anjos',
            'licoes' => 'Quem é fiel a Deus no secreto é honrado publicamente com o livramento dos céus.',
            'historia_base' => 'Na grandiosa Babilônia, durante o reinado do rei Dario dos medos e persas, Daniel destacava-se entre todos os presidentes e príncipes do império, porque nele havia um espírito excelente de sabedoria, justiça e temor a Deus. O rei planejava colocá-lo sobre todo o reino. Com profunda inveja, os outros líderes conspiraram para derrubá-lo, mas não conseguiam achar nele nenhum motivo de culpa ou erro, pois Daniel era totalmente honesto e leal. Disseram então entre si: \'Nunca acharemos ocasião alguma contra este Daniel, a não ser no que diz respeito à lei do seu Deus\'.

Eles bajularam o rei Dario e o convenceram a assinar um decreto real irrevogável: durante trinta dias, qualquer pessoa que fizesse uma petição ou oração a qualquer deus ou homem, a não ser ao próprio rei, seria imediatamente atirada na cova dos leões famintos! O rei, lisonjeado, assinou o decreto. Daniel soube que o documento havia sido assinado, mas não teve medo nem escondeu sua fé. Entrou em sua casa, subiu ao seu quarto no andar superior onde as janelas estavam abertas em direção a Jerusalém, pôs-se de joelhos três vezes ao dia, orou e deu graças diante do seu Deus, exatamente como costumava fazer todos os dias!

Os conspiradores espiaram, viram Daniel orando com fervor e correram para denunciá-lo ao rei. O rei Dario ficou profundamente triste, pois amava Daniel, e trabalhou até o pôr do sol para salvá-lo, mas as leis dos medos e persas não podiam ser alteradas. Com o coração pesaroso, o rei ordenou que trouxessem Daniel e o lançassem na cova escura e profunda cheia de leões ferozes. O rei disse a Daniel: \'O teu Deus, a quem tu continuamente serves, Ele te livrará!\'. Trouxeram uma grande pedra, colocaram-na sobre a boca da cova e selaram-na com o anel real. O rei foi para o palácio, passou a noite inteira em jejum, recusou qualquer entretenimento e não conseguiu pregar os olhos.

Pela manhã, ao primeiro romper da alva, o rei levantou-se apressado e foi correndo à cova dos leões. Chegando perto da boca da cova, chamou por Daniel com voz triste e aflita: \'Daniel, servo do Deus vivo! Dar-se-ia o caso que o teu Deus, a quem tu continuamente serves, tenha podido livrar-te dos leões?\'. Do fundo da cova escura, ecoou a voz calma, firme e serena de Daniel: \'Ó rei, vive para sempre! O meu Deus enviou o Seu anjo, e fechou a boca dos leões, para que não me fizessem dano algum, porque foi achada em mim inocência diante Dele; e também contra ti, ó rei, não tenho cometido delito algum!\'. O rei se alegrou sobremaneira, mandou tirar Daniel da cova imediatamente, e não se achou nele ferimento algum, porque crera no seu Deus! O rei Dario publicou um novo decreto a todas as nações da terra ordenando que todos temessem e reverenciassem o Deus de Daniel, pois Ele é o Deus Vivo que permanece para sempre e opera milagres nos céus e na terra!',
            'ministracao_sarah' => 'Princesa Sarah, assim como o anjo do Senhor desceu na cova escura e fechou a boca dos leões famintos para guardar Daniel, o Senhor envia Seus anjos celestiais para blindar a sua vida contra todo mal! Você terá uma mente brilhante, integridade inabalável e nunca terá medo de nada nem de ninguém!

Honre sempre o seu papai Adrian King e ouça seus conselhos sábios, pois ele zela pela sua proteção como um rei justo; abrace com carinho a sua mamãe Samara e receba a doçura do amor dela todos os dias. E sinta o poder das orações da sua vovó Socorro, mulher de Deus de clamor incansável que ora como Daniel três vezes ao dia no secreto, cobrindo o seu sono, a sua saúde e o seu crescimento com a glória de Deus! Nossa rima de ouro: \'O anjo do Senhor a boca do leão fechou, e a minha vida inteira com Sua paz guardou!\'',
        ],
        [
            'slug' => 'ressurreicao_jesus_vida',
            'titulo' => 'A Ressurreição Triunfal de Jesus: O Sepulcro Vazio e a Vitória Eterna',
            'personagem' => 'Jesus Cristo, Maria Madalena e os Apóstolos',
            'tema' => 'A Vitória Sobre a Morte, a Vida Eterna e o Amor Infinito',
            'licoes' => 'Jesus vive para sempre e nos deu a vitória eterna sobre todo medo e tristeza.',
            'historia_base' => 'Após dar Sua vida na cruz do Calvário por amor infinito à humanidade, o corpo bendito do Senhor Jesus foi envolvido em lençóis de linho fino e aromas suaves por José de Arimateia e Nicodemos, e sepultado num túmulo novo cavado na rocha, no meio de um belo jardim. Os líderes religiosos contrários a Jesus colocaram guardas romanos armados de vigília e rolaram uma pedra gigantesca na entrada do túmulo, selando-a com o selo imperial para que ninguém pudesse entrar nem sair. Aquele sábado foi um dia de silêncio, choro e aparente tristeza para os discípulos.

Mas a morte não podia deter o Autor da Vida! No domingo bem cedinho, ao despontar dos primeiros raios dourados da manhã, a terra tremeu violentamente com um grande terremoto! Um anjo do Senhor desceu do céu em glória resplandecente, com vestes brancas como a neve e rosto brilhante como o relâmpago! O anjo desceu, rolou a enorme pedra da entrada do sepulcro e assentou-se sobre ela! Os soldados romanos de vigília tremeram de pavor e ficaram como mortos!

Maria Madalena e outras mulheres fiéis chegaram ao túmulo trazendo perfumes e perguntavam entre si: \'Quem nos revolverá a pedra da porta do sepulcro?\'. Ao levantarem os olhos, viram que a pedra já havia sido removida! Entrando no túmulo, não acharam o corpo do Senhor Jesus. De repente, dois homens celestiais com roupas resplandecentes apareceram e lhes disseram com alegria triunfal: \'Por que buscais o Vivente entre os mortos? Ele não está aqui, mas ressuscitou! Lembrai-vos de como vos falou, estando ainda na Galileia!\'. As mulheres saíram correndo com grande temor e indizível alegria para anunciar aos apóstolos. 

Pedro e João correram ao túmulo, entraram e viram os lençóis de linho caídos no chão e o lenço que estivera sobre Sua cabeça dobrado à parte num lugar só: o sepulcro estava completamente vazio! Jesus apareceu vivo e glorificado a Maria Madalena, aos discípulos no caminho de Emaús e depois a todos os apóstolos reunidos no cenáculo, dizendo: \'Paz seja convosco! Vede as minhas mãos e os meus pés, que sou eu mesmo; apalpai-me e vede!\'. Jesus venceu a morte, o inferno e a escuridão, subiu aos céus em glória e prometeu estar conosco todos os dias, até a consumação dos séculos!',
            'ministracao_sarah' => 'Sarahzinha, receba a maior e mais doce verdade de todo o universo: O SEU JESUS ESTÁ VIVO! Ele não está numa cruz nem num túmulo frio; Ele vive para sempre, reina no trono da glória e mora dentro do seu coraçãozinho!

Por causa da ressurreição de Jesus, você tem vida abundante, saúde transbordante, mente genial e um futuro cheio de alegria e paz! Ame e honre de todo o coração o seu papai Adrian King e a sua mamãe Samara, sendo uma luz radiante dentro de casa. E abençoe a vida preciosa da sua vovó Socorro, serva de Deus que adora a Jesus ressurreto e que derrama orações fervorosas todos os dias para que você caminhe sempre na vitória e na presença de Cristo! Nossa rima de ouro: \'O túmulo está vazio, Jesus ressuscitou, e com amor eterno a minha vida abençoou!\'',
        ],
        [
            'slug' => 'jose_perdao_irmaos',
            'titulo' => 'José do Egito e o Perdão aos Irmãos: O Triunfo da Graça',
            'personagem' => 'José do Egito e seus Irmãos',
            'tema' => 'O Perdão Supremo e a Reconciliação Familiar',
            'licoes' => 'O amor e o perdão curam qualquer ferida e transformam o mal em bênção de salvação.',
            'historia_base' => 'Quando a fome extrema castigava todo o mundo antigo, os irmãos de José desceram de Canaã ao Egito para comprar trigo. Eles não imaginavam que o governador poderoso a quem se curvavam era o irmão que haviam vendido como escravo vinte anos antes! José testou o coração de seus irmãos para ver se haviam mudado e se amavam a Benjamim, o filho mais novo de seu pai Jacó. Ao ver que Judá se ofereceu para ficar preso como escravo no lugar de Benjamim por amor ao velho pai, José não conseguiu mais conter a emoção.

Com lágrimas nos olhos, José ordenou: \'Fazei sair a todos da minha presença!\'. Quando ficou sozinho com seus irmãos, José começou a chorar tão alto que os egípcios e a casa de Faraó ouviram. Ele disse: \'Eu sou José! Meu pai ainda vive?\'. Os irmãos ficaram mudos, paralisados de espanto e terror! Mas José lhes disse com imensa doçura: \'Chegai-vos a mim, peço-vos. Eu sou José, vosso irmão, a quem vendestes para o Egito. Agora, pois, não vos entristeçais nem vos pese o me haverdes vendido para cá; porque para conservação da vida, Deus me enviou adiante de vós! Deus me enviou adiante de vós, para conservar vossa sucessão na terra e para guardar-vos em vida por um grande livramento!\'.

José abraçou o pescoço de Benjamim e chorou; e Benjamim chorou no pescoço dele. Beijou a todos os seus irmãos e chorou sobre eles; e depois seus irmãos falaram com ele em profunda paz. Faraó mandou carruagens reais carregadas de mantimentos e vestes finas para buscar o patriarca Jacó. Quando o velho Jacó soube que seu filho José estava vivo e reinava no Egito, seu espírito reviveu e exclamou: \'Basta! Meu filho José ainda vive; irei e o verei antes que morra!\'. Toda a família foi salva e habitou na fértil terra de Gósen sob a proteção de Deus!',
            'ministracao_sarah' => 'Princesa Sarah, receba a unção do perdão e da graça de Deus! O coração que perdoa é um coração livre, sábio e poderoso como o de José! Nunca guarde mágoas nem birras no seu coraçãozinho; seja sempre uma fonte de abraço, carinho e alegria dentro da sua casa!

Ame, respeite e honre o seu papai Adrian King e a sua mamãe Samara com todo o afeto da sua alma, pois Deus uniu a família King para ser um farol de bênção nesta terra! E bendiga ao Senhor pela vida da sua vovó Socorro, mulher de Deus que derrama orações fervorosas e intercessão contínua por você, profetizando que a graça e a paz de Deus reinarão sempre na sua vida! Nossa rima de ouro: \'Com amor e perdão no meu coração, na graça de Deus eu vivo em união!\'',
        ],
        [
            'slug' => 'gideao_trezentos',
            'titulo' => 'Gideão e os 300 Homens de Fé: Tochas, Cântaros e o Shofar',
            'personagem' => 'Gideão e os 300 Homens',
            'tema' => 'A Vitória Pela Fé e Não Pela Força Numérica',
            'licoes' => 'Quando Deus está conosco, a minoria com Ele se torna maioria invencível.',
            'historia_base' => 'Israel sofria sob a opressão impiedosa dos midianitas, que invadiam as plantações como gafanhotos, destruindo as colheitas e os rebanhos. O jovem Gideão estava malhando trigo no lagar de uvas, escondido para que os midianitas não o vissem, quando o Anjo do Senhor lhe apareceu sob um carvalho e declarou: \'O Senhor é contigo, homem valente!\'. Gideão respondeu com humildade: \'Ai, Senhor meu, com que livrarei a Israel? Eis que a minha família é a mais pobre em Manassés, e eu o menor na casa de meu pai\'. Mas o Senhor lhe garantiu: \'Porquanto eu hei de ser contigo, tu ferirás os midianitas como a um só homem!\'.

Gideão reuniu trinta e dois mil soldados para lutar contra cento e trinta e cinco mil midianitas. Mas o Senhor disse a Gideão: \'Muito é o povo que está contigo, para eu entregar os midianitas em sua mão; para que Israel não se glorie contra mim, dizendo: A minha mão me livrou!\'. Deus mandou proclamar: \'Quem for tímido e medroso, volte!\'. Vinte e dois mil homens voltaram para casa com medo, restando apenas dez mil. Mas Deus disse: \'Ainda há povo demais! Leva-os às águas e ali os provarei\'. 

Na beira do rio, a maioria ajoelhou-se e enfiou a boca na água para beber sem vigiar. Mas trezentos homens pegaram a água com as mãos em concha e lamberam como cão, mantendo os olhos erguidos e atentos ao redor! O Senhor disse: \'Com estes trezentos homens que lamberam a água vos livrarei!\'. Naquela noite, Gideão dividiu os trezentos homens em três companhias, colocou na mão de cada um uma buzina de chifre de carneiro (shofar) e um cântaro de barro vazio com uma tocha de fogo acesa dentro.

À meia-noite, no início da vigília, os trezentos homens cercaram o acampamento inimigo em silêncio. De repente, ao sinal de Gideão, todos tocaram as trombetas em uníssono, quebraram os cântaros de barro estalando alto e levantaram as tochas ardentes com a mão esquerda e as buzinas com a mão direita, bradando em alta voz: \'Espada pelo Senhor e por Gideão!\'. O barulho das trombetas e a luz repentina das tochas causaram tamanho pânico nos midianitas que o Senhor pôs a espada de um contra o outro em todo o acampamento, e os inimigos fugiram em debandada! Deus deu uma vitória monumental sem que Israel precisasse disparar uma única flecha!',
            'ministracao_sarah' => 'Sarahzinha, declare com autoridade: você é uma valente do Senhor! Não importa o tamanho dos desafios; quando Deus está do seu lado, você é mais que vencedora! Tenha sempre coragem e vigilância, mantendo os seus olhinhos atentos às coisas de Deus.

Honre de todo o coração o seu papai Adrian King, homem que lidera sua casa com sabedoria, e ame a sua mamãe Samara com doces sorrisos e carinho. E receba o manto de oração da sua amada vovó Socorro, serva santa de Deus que toca o shofar da intercessão no altar divino todos os dias pela sua vitória e saúde! Nossa rima de ouro: \'Com a tocha da fé e o poder do Senhor, a vitória é certa com Cristo Salvador!\'',
        ],
        [
            'slug' => 'elias_carmelo',
            'titulo' => 'Elias e os Profetas de Baal no Monte Carmelo: O Fogo do Céu',
            'personagem' => 'Profeta Elias e o Deus Vivo de Israel',
            'tema' => 'A Soberania do Deus Verdadeiro Sobre Todos os Ídolos',
            'licoes' => 'Só o Senhor é Deus; Ele responde ao clamor da fé com fogo e poder.',
            'historia_base' => 'Israel havia se desviado dos mandamentos de Deus sob a influência do rei Acabe e da rainha Jezabel, adorando a estátuas de Baal e postes de Aserá. Durante três anos e seis meses não choveu na terra, cumprindo a profecia de Elias. Então o profeta Elias desafiou todo o povo e quatrocentos e cinquenta profetas de Baal para subirem ao topo do Monte Carmelo. Perante uma multidão de milhares de pessoas, Elias clamou: \'Até quando coxeareis entre dois pensamentos? Se o Senhor é Deus, segui-o; e se Baal, segui-o!\'. O povo permaneceu em silêncio.

Elias propôs a prova definitiva: \'Eu fiquei só dos profetas do Senhor, e os profetas de Baal são quatrocentos e cinquenta homens. Dêem-se-nos dois bezerros; escolham para si um, cortem-no em pedaços e ponham-no sobre a lenha, porém não lhe metam fogo; e eu prepararei o outro bezerro, e o porei sobre a lenha, e não lhe meterei fogo. Então invocai o nome do vosso deus, e eu invocarei o nome do Senhor; e o Deus que responder por meio de fogo, esse será Deus!\'. Todo o povo respondeu: \'É boa esta palavra!\'.

Os profetas de Baal clamaram desde a manhã até o meio-dia: \'Ah, Baal, responde-nos!\'. Saltavam ao redor do altar e retalhavam-se com facas, mas não houve voz nem resposta. Ao meio-dia, Elias zombava deles dizendo: \'Clamai em altas vozes, porque ele é um deus; pode ser que esteja meditando, ou em viagem, ou talvez esteja dormindo e despertará!\'. Até a hora do sacrifício da tarde, nenhum sinal de fogo apareceu.

Então Elias disse a todo o povo: \'Chegai-vos a mim!\'. Ele restaurou o altar do Senhor que estava quebrado, tomou doze pedras segundo o número das tribos de Israel e edificou o altar em nome do Senhor. Fez ao redor uma vala profunda, arrumou a lenha e o bezerro, e ordenou: \'Enchei quatro cântaros de água e derramai sobre o holocausto e sobre a lenha!\'. Fizeram isso uma, duas e três vezes! A água corria ao redor do altar e encheu a vala até transbordar!

À hora da oferta da tarde, o profeta Elias deu um passo à frente e orou com calma e santa autoridade: \'Ó Senhor, Deus de Abraão, de Isaque e de Israel, manifeste-se hoje que Tu és Deus em Israel, e que eu sou Teu servo, e que conforme a Tua palavra fiz todas estas coisas. Responde-me, Senhor, responde-me, para que este povo conheça que Tu, Senhor, és Deus!\'. No mesmo instante, caiu fogo do céu dos céus e consumiu o holocausto, a lenha, as pedras e o pó, e ainda lambeu toda a água que estava na vala! Vendo isso, todo o povo caiu com o rosto em terra e bradou em adoração: \'O Senhor é Deus! O Senhor é Deus!\'. Logo depois, o céu se cobriu de nuvens escuras e caiu uma chuva abundante sobre a terra ressecada!',
            'ministracao_sarah' => 'Princesa Sarah, receba a chama do fogo santo do Espírito Santo no seu coraçãozinho! O Deus de Elias é o seu Deus; Ele responde às suas orações e manifesta a Sua presença de glória em toda a sua vida!

Honre sempre o seu papai Adrian King como o sacerdote do seu lar, que busca a Deus para abençoar a sua família; ame e abrace a sua mamãe Samara, que enche o seu dia a dia de oração e ternura. E lembre-se das orações cheias do poder de Deus da sua vovó Socorro, mulher de joelhos no altar que clama para que o fogo do Espírito Santo queime todas as enfermidades e acenda uma sabedoria celestial na sua mente! Nossa rima de ouro: \'O Deus que responde com fogo dos céus, cuida de mim pois eu sou dos Seus!\'',
        ],
        [
            'slug' => 'ester_rainha_coragem',
            'titulo' => 'A Rainha Ester: \'Se Perecer, Pereci\' e o Livramento de Israel',
            'personagem' => 'Rainha Ester e Mordecai',
            'tema' => 'A Coragem Feminina, o Jejum e a Intercessão que Salva Vidas',
            'licoes' => 'Deus nos coloca em lugares de honra para sermos instrumentos de salvação e proteção.',
            'historia_base' => 'Na gloriosa cidadela de Susã, capital do vasto império persa que se estendia da Índia até a Etiópia, vivia uma jovem judia órfã chamada Hadassa, cujo nome persa era Ester. Criada com profundo amor e temor a Deus por seu primo mais velho Mordecai, Ester era de porte formoso e semblante gracioso. Quando o rei Assuero procurou uma nova rainha para o império, Ester foi levada ao palácio real. Ela alcançou graça e favor aos olhos do rei acima de todas as outras donzelas, e o rei colocou sobre a cabeça dela a coroa real de ouro, fazendo-a rainha de todo o império!

Porém, um homem arrogante chamado Hamã tornou-se primeiro-ministro e odiava o povo judeu porque Mordecai não se prostrava nem se inclinava diante dele, mas adorava unicamente ao Deus de Israel. Com astúcia e mentira, Hamã convenceu o rei a emitir um decreto irrevogável com o selo real ordenando a destruição de todos os judeus em um único dia. Houve grande pranto, clamor e cinzas em todas as províncias. Mordecai enviou uma cópia do decreto à rainha Ester e lhe disse: \'Não imagines em teu ânimo que escaparás na casa do rei mais do que todos os judeus. Porque, se de todo te calares neste tempo, socorro e livramento de outra parte virá para os judeus, mas tu e a casa de teu pai perecereis. E quem sabe se para tal tempo como este chegaste a este reino?\'.

Ester sentiu o peso da responsabilidade sagrada. A lei do império determinava pena de morte para qualquer pessoa que entrasse na presença do rei no pátio interior sem ser chamada, a menos que o rei estendesse para ela o seu cetro de ouro. Ester respondeu a Mordecai: \'Vai, ajunta a todos os judeus que se acham em Susã, e jejuai por mim, e não comais nem bebais por três dias, nem de dia nem de noite; eu e as minhas donzelas também assim jejuaremos. E depois irei ter com o rei, ainda que não seja segundo a lei; e se perecer, pereci!\'.

No terceiro dia de jejum e fervorosa oração, Ester vestiu seus trajes reais mais belos, radiante de unção e graça de Deus, e colocou-se no pátio interior diante da sala do trono. Quando o rei Assuero a viu de pé, seu coração se derreteu em favor e ele estendeu o cetro de ouro que tinha na mão! Ester aproximou-se e tocou a ponta do cetro. O rei disse: \'Que tens, rainha Ester, e qual é a tua petição? Até metade do reino se te dará!\'. Com extrema sabedoria, Ester preparou dois banquetes e desmascarou os planos cruéis de Hamã diante do rei! O povo judeu foi salvo, Mordecai foi promovido a governador e a coragem da rainha Ester entrou para a história eterna como prova do poder do jejum e da oração!',
            'ministracao_sarah' => 'Princesa Sarah, assim como a Rainha Ester, você nasceu para um tempo de glória e realeza espiritual! Deus colocou uma coroa de sabedoria, beleza interior, autoridade e inteligência sobre a sua cabecinha desde o berço!

Ame e honre o seu papai Adrian King, homem sábio que Deus colocou como um mentor e protetor da sua vida como Mordecai foi para Ester; e honre a sua doce mamãe Samara com abraços e obediência fiel. E celebre a cobertura de intercessão da sua vovó Socorro, que é uma mulher de jejum e joelhos dobrados no altar de Deus, clamando para que a graça e o cetro de ouro do Rei dos Reis estejam sempre estendidos sobre você! Nossa rima de ouro: \'Como a rainha Ester com graça e oração, eu sou princesa de Deus e venço na unção!\'',
        ],
        [
            'slug' => 'samuel_templo_chamado',
            'titulo' => 'Samuel: A Oração de Ana e o Menino Que Ouviu a Voz de Deus',
            'personagem' => 'Samuel, Ana e o Sacerdote Eli',
            'tema' => 'A Resposta da Oração Fervorosa e a Voz do Senhor',
            'licoes' => 'Quem ouve a voz de Deus desde pequenino cresce com sabedoria e autoridade profética.',
            'historia_base' => 'Em Siló, onde ficava o Tabernáculo do Senhor, uma mulher de coração humilde e temente a Deus chamada Ana chorava de dor porque não conseguia ter filhos e sofria provocações constantes. Em profunda aflição de alma, Ana ajoelhou-se no santuário e orou ao Senhor com lágrimas abundantes. Seus lábios se moviam, mas sua voz não se ouvia; falava no íntimo do seu coração e fez um voto solene: \'Senhor dos Exércitos! Se benignamente atentares para a aflição da tua serva, e de mim te lembrares, e me deres um filho homem, ao Senhor o darei por todos os dias da sua vida!\'. O sacerdote Eli a abençoou dizendo: \'Vai em paz; e o Deus de Israel te conceda a petição que lhe pediste\'. Ana creu, seu semblante já não era triste, e no tempo certo Deus se lembrou dela e deu à luz um menino a quem chamou Samuel, que significa: \'Do Senhor o pedi!\'.

Quando o menino foi desmamado, Ana levou-o ao templo em Siló e o entregou aos cuidados do sacerdote Eli para servir a Deus com alegria e pureza. Todos os anos, Ana costurava com carinho uma pequena túnica de linho azul e a levava para o pequeno Samuel quando subia para adorar ao Senhor. O menino Samuel crescia em estatura, graça e sabedoria perante Deus e os homens.

Certa noite, quando a lâmpada de Deus ainda não se havia apagado no templo e Samuel estava deitado para dormir no lugar santo perto da Arca da Aliança, o Senhor chamou pelo seu nome: \'Samuel!\'. O menino levantou-se correndo, foi até o velho sacerdote Eli e disse: \'Eis-me aqui, pois tu me chamaste\'. Eli respondeu: \'Não te chamei eu, meu filho; torna a deitar-te\'. Samuel deitou-se. E o Senhor chamou pela segunda vez: \'Samuel!\'. Ele correu a Eli novamente: \'Eis-me aqui, porque me chamaste\'. Eli disse: \'Não te chamei, torna a deitar-te\'. Quando o Senhor chamou pela terceira vez: \'Samuel!\', Eli entendeu que era o Senhor que chamava o menino e o instruiu: \'Vai deitar-te; e se te chamar, dirás: Fala, Senhor, porque o teu servo ouve!\'.

Samuel foi e deitou-se. Então veio o Senhor, pôs-se ali e chamou como das outras vezes: \'Samuel, Samuel!\'. E o pequeno Samuel respondeu com o coraçãozinho em reverência: \'Fala, Senhor, porque o teu servo ouve!\'. Naquela noite, Deus revelou a Samuel Seus segredos proféticos para toda a nação. Samuel cresceu, o Senhor era com ele, e nenhuma das Suas palavras caiu em terra!',
            'ministracao_sarah' => 'Sarahzinha, o Deus que chamou Samuel no templo chama você pelo seu próprio nome desde agora! O seu coraçãozinho é sensível para ouvir a doce voz do Espírito Santo sussurrando paz, amor e sabedoria ao seu ouvido todas as noites!

Ouça sempre com respeito e carinho a voz do seu papai Adrian King e da sua mamãe Samara, pois a obediência aos pais é a escola onde se aprende a ouvir a voz de Deus. E agradeça a Deus pela sua preciosa vovó Socorro, uma mulher que ora como Ana orou no templo: derramando o coração perante o Senhor para que a sua vida seja um altar vivo de santidade e sabedoria celestial! Nossa rima de ouro: \'Fala, meu Senhor, Tua filha vai ouvir, Tua voz de amor eu quero sempre seguir!\'',
        ]
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
        $memorias = CharleneMemory::where('category', '!=', 'historia_ouvida')->where('category', '!=', 'historia_biblica_ia')->orderBy('updated_at', 'desc')->get();
        $historiasOuvidas = CharleneMemory::where('category', 'historia_ouvida')->orderBy('updated_at', 'desc')->get();

        // Carrega histórias bíblicas geradas pela IA Charlene Teóloga Suprema salvas no banco
        $historiasIaMem = CharleneMemory::where('category', 'historia_biblica_ia')->orderBy('created_at', 'asc')->get();
        $historiasIa = [];
        foreach ($historiasIaMem as $mem) {
            $parsed = json_decode($mem->content, true);
            if (is_array($parsed)) {
                $parsed['id_banco'] = $mem->id;
                $parsed['gerada_por_ia'] = true;
                $parsed['created_at_fmt'] = $mem->created_at ? $mem->created_at->format('d/m/Y H:i') : '';
                $historiasIa[] = $parsed;
            }
        }

        $historiasCatalogoTotal = array_merge(self::HISTORIAS_CATALOGO, $historiasIa);
        $totalCatalogo = count($historiasCatalogoTotal);

        return response()
            ->view('pages.charleneMusicas', [
                'musicas' => $musicas,
                'memorias' => $memorias,
                'historiasOuvidas' => $historiasOuvidas,
                'totalCatalogo' => $totalCatalogo,
                'historiasCatalogo' => $historiasCatalogoTotal,
                'historiasIaCount' => count($historiasIa),
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

    /**
     * API: Gera uma nova história bíblica completa na íntegra usando IA (Charlene Teóloga Suprema)
     * e salva permanentemente no banco de dados para a Sarah ouvir e a família ler.
     */
    public function gerarNovaHistoriaBiblica(Request $request): JsonResponse
    {
        $pedidoTema = trim((string) $request->input('tema', ''));
        $pedidoPersonagem = trim((string) $request->input('personagem', ''));
        $pedidoLivro = trim((string) $request->input('livro', ''));

        // Carrega todas as histórias existentes (catálogo mestre + IA) para saber o que já foi contado
        $existentesSlugs = array_column(self::HISTORIAS_CATALOGO, 'slug');
        $existentesTitulos = array_column(self::HISTORIAS_CATALOGO, 'titulo');

        $iaMem = CharleneMemory::where('category', 'historia_biblica_ia')->get();
        foreach ($iaMem as $m) {
            $parsed = json_decode($m->content, true);
            if (is_array($parsed) && !empty($parsed['slug'])) {
                $existentesSlugs[] = $parsed['slug'];
                $existentesTitulos[] = $parsed['titulo'] ?? $parsed['slug'];
            }
        }

        $titulosExistentesStr = implode(', ', array_slice($existentesTitulos, 0, 50));

        $contextoInstrucao = "";
        if (!empty($pedidoTema) || !empty($pedidoPersonagem) || !empty($pedidoLivro)) {
            $contextoInstrucao = "O Adrian King (papai da Sarah) pediu expressamente para você gerar a história bíblica profunda sobre: "
                . implode(' - ', array_filter([$pedidoTema, $pedidoPersonagem, $pedidoLivro])) . ".";
        } else {
            $contextoInstrucao = "Escolha a próxima história bíblica essencial da sequência canônica da Bíblia Sagrada (de Gênesis a Apocalipse) que AINDA NÃO FOI CONTADA nesta lista: [{$titulosExistentesStr}]. Pode ser sobre um patriarca, profeta, rei piedoso, milagre grandioso de Jesus, heroína da fé ou apóstolo.";
        }

        $systemPrompt = "Você é Charlene, uma Teóloga Suprema, Doutora em Sagradas Escrituras e Mestra de Análise Bíblica para a princesinha Sarah (filha de Adrian King e Samara).\n"
            . "Seu objetivo é contar as histórias da Bíblia Sagrada NA ÍNTEGRA, com profundidade teológica real, rica em detalhes históricos, geográficos, culturais e milagres soberanos de Deus.\n"
            . "NUNCA faça resumos superficiais ou infantis demais. Conte a história com respeito ao texto sagrado, mostrando como Deus agiu, os cenários, os diálogos reais da Bíblia e a renovação da fé.\n"
            . "Em seguida, traga uma MINISTRAÇÃO PROFÉTICA E SACERDOTAL PROFUNDA E PODEROSA para a vida da Sarah:\n"
            . "- Ministre unção do Espírito Santo, sabedoria de Cristo, inteligência brilhante e coração obediente;\n"
            . "- Ensine honra inabalável e amor ao papai Adrian King (sacerdote da casa) e à mamãe Samara (coluna de graça e afeto);\n"
            . "- Destaque com fervor a poderosa cobertura de intercessão e oração da vovó Socorro, mulher de Deus fervorosa que ora e clama de joelhos dobrados no altar pela vida e pelo futuro da Sarah!\n"
            . "- Termine com a rima de ouro mnemônica de sabedoria e vitória espiritual.\n"
            . "Retorne OBRIGATORIAMENTE um JSON com as chaves: titulo, personagem, tema, livro, licoes, historia_base, ministracao_sarah.";

        $userPrompt = "{$contextoInstrucao}\n"
            . "Escreva a história completa, na íntegra (de 4 a 6 parágrafos ricos, detalhados e substanciais para a 'historia_base'), e a ministração profética profunda (de 2 a 3 parágrafos ungidos e abençoados para 'ministracao_sarah').";

        $apiKey = trim((string) (env('OPENAI_API_KEY') ?: ''));
        if (!$apiKey) {
            return response()->json(['success' => false, 'message' => 'OPENAI_API_KEY não configurada no servidor.'], 500);
        }

        try {
            $res = Http::withHeaders([
                'Authorization' => 'Bearer ' . $apiKey,
                'Content-Type' => 'application/json',
            ])->timeout(45)->post('https://api.openai.com/v1/chat/completions', [
                'model' => 'gpt-4o-mini',
                'temperature' => 0.72,
                'max_tokens' => 2500,
                'response_format' => ['type' => 'json_object'],
                'messages' => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    ['role' => 'user', 'content' => $userPrompt],
                ],
            ]);

            $jsonStr = $res->json('choices.0.message.content');
            $data = json_decode($jsonStr, true);

            if (!$data || empty($data['titulo']) || empty($data['historia_base'])) {
                return response()->json(['success' => false, 'message' => 'A IA não retornou o formato esperado.', 'raw' => $jsonStr], 500);
            }

            // Normaliza slug único
            $baseSlug = Str::slug($data['titulo'], '_');
            $slug = 'ia_' . $baseSlug;
            $counter = 1;
            while (in_array($slug, $existentesSlugs)) {
                $slug = 'ia_' . $baseSlug . '_' . $counter++;
            }

            $data['slug'] = $slug;
            $data['licoes'] = is_array($data['licoes']) ? implode('; ', $data['licoes']) : (string) ($data['licoes'] ?? 'Fé, amor e obediência a Deus');
            $data['gerada_por_ia'] = true;

            // Salva no banco de dados como CharleneMemory
            $mem = new CharleneMemory();
            $mem->category = 'historia_biblica_ia';
            $mem->subject = $slug;
            $mem->content = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
            $mem->learned_from = 'Charlene Teóloga Suprema (IA)';
            $mem->last_mentioned_at = now();
            $mem->save();

            $data['id_banco'] = $mem->id;
            $data['created_at_fmt'] = $mem->created_at->format('d/m/Y H:i');

            $totalTotal = count(self::HISTORIAS_CATALOGO) + CharleneMemory::where('category', 'historia_biblica_ia')->count();

            return response()->json([
                'success' => true,
                'message' => "História bíblica '{$data['titulo']}' gerada com sucesso pela Charlene Teóloga Suprema e adicionada ao catálogo!",
                'historia' => $data,
                'totalCatalogo' => $totalTotal,
            ]);

        } catch (\Throwable $e) {
            Log::error('Erro ao gerar história bíblica com IA: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => 'Erro ao contatar IA: ' . $e->getMessage()], 500);
        }
    }

    /**
     * API: Exclui uma história bíblica gerada pela IA
     */
    public function deleteHistoriaIa(Request $request): JsonResponse
    {
        $id = $request->input('id');
        $slug = $request->input('slug');

        $query = CharleneMemory::where('category', 'historia_biblica_ia');
        if ($id) {
            $query->where('id', $id);
        } elseif ($slug) {
            $query->where('subject', $slug);
        } else {
            return response()->json(['success' => false, 'message' => 'Identificador não fornecido.'], 400);
        }

        $query->delete();
        $totalTotal = count(self::HISTORIAS_CATALOGO) + CharleneMemory::where('category', 'historia_biblica_ia')->count();

        return response()->json([
            'success' => true,
            'message' => 'História excluída com sucesso do catálogo.',
            'totalCatalogo' => $totalTotal,
        ]);
    }

}
