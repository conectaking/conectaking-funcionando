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

    // Catálogo rico com mais de 20 histórias bíblicas infantis
    private const HISTORIAS_CATALOGO = [
        ['tema' => 'Davi e o Gigante Golias', 'personagem' => 'Davi', 'licoes' => 'coragem, fé e que quem confia em Deus vence qualquer gigante'],
        ['tema' => 'A Arca de Noé e o Arco-Íris', 'personagem' => 'Noé', 'licoes' => 'obediência, proteção de Deus aos animais e a promessa do arco-íris'],
        ['tema' => 'Daniel na Cova dos Leões Famintos', 'personagem' => 'Daniel', 'licoes' => 'oração fiel diária e como o anjo do Senhor fechou a boca dos leões'],
        ['tema' => 'Moisés e a Grande Travessia do Mar Vermelho', 'personagem' => 'Moisés', 'licoes' => 'o poder de Deus abrindo caminhos onde parecia não ter saída'],
        ['tema' => 'Jonas e o Grande Peixe', 'personagem' => 'Jonas', 'licoes' => 'obedecer a voz do Senhor e a segunda chance que Deus nos dá'],
        ['tema' => 'A Multiplicação dos Pães e Peixinhos', 'personagem' => 'Jesus e o menino dos pães', 'licoes' => 'generosidade, partilha e como Jesus faz o milagre com o pouco que temos'],
        ['tema' => 'Jesus Acalma a Tempestade no Barco', 'personagem' => 'Jesus', 'licoes' => 'paz, segurança e que mesmo quando o vento sopra forte, Jesus está no nosso barquinho'],
        ['tema' => 'O Nascimento do Bebê Jesus em Belém', 'personagem' => 'Jesus, Maria e José', 'licoes' => 'o maior presente de amor que o Papai do Céu deu ao mundo'],
        ['tema' => 'A Rainha Ester, Cheia de Coragem', 'personagem' => 'Rainha Ester', 'licoes' => 'coragem de uma princesa de Deus para salvar o seu povo com oração e jejum'],
        ['tema' => 'Zaqueu, o Homem Pequenino na Árvore', 'personagem' => 'Zaqueu', 'licoes' => 'Jesus enxerga a todos com amor e transforma o coração de quem O recebe'],
        ['tema' => 'José do Egito e a Túnica Colorida', 'personagem' => 'José', 'licoes' => 'perdão, fidelidade nos sonhos e como Deus transforma o mal em grande bênção'],
        ['tema' => 'A Cura do Cego Bartimeu', 'personagem' => 'Bartimeu', 'licoes' => 'clamar a Jesus com perseverança e receber a luz do Senhor'],
        ['tema' => 'O Bom Samaritano', 'personagem' => 'O Bom Samaritano', 'licoes' => 'amor ao próximo, cuidar de quem precisa e ter um coração bom'],
        ['tema' => 'Sansão e a Força que Vem do Espírito de Deus', 'personagem' => 'Sansão', 'licoes' => 'nossa verdadeira força vem de Deus quando somos fiéis a Ele'],
        ['tema' => 'Rute e a Amizade Fiel', 'personagem' => 'Rute e Noemi', 'licoes' => 'lealdade, companheirismo e cuidado com a família'],
        ['tema' => 'A Pescaria Milagrosa de Pedro', 'personagem' => 'Pedro e Jesus', 'licoes' => 'confiar na palavra de Jesus mesmo quando parecia que nada daria certo'],
        ['tema' => 'A Ressurreição e o Amor Vivo de Jesus', 'personagem' => 'Jesus Ressuscitado', 'licoes' => 'Jesus está vivo para sempre, nos ama e cuida de nós todos os dias'],
        ['tema' => 'Paulo e Silas Cantando Louvores na Prisão', 'personagem' => 'Paulo e Silas', 'licoes' => 'o poder do louvor e da oração que quebra qualquer corrente e abre portas'],
        ['tema' => 'A Criação do Mundo e das Flores', 'personagem' => 'Deus Criador', 'licoes' => 'o carinho com que Deus fez as estrelas, as borboletas e cada um de nós'],
        ['tema' => 'Elias e a Carruagem de Fogo no Céu', 'personagem' => 'Profeta Elias', 'licoes' => 'o Deus dos milagres que responde com fogo e cuida dos seus profetas'],
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

        $payload = $request->all();
        $reqType = $payload['request']['type'] ?? 'LaunchRequest';
        $intentName = $payload['request']['intent']['name'] ?? '';

        Log::info('alexa.charlene.request', ['type' => $reqType, 'intent' => $intentName]);

        switch ($reqType) {
            case 'LaunchRequest':
                return $this->handleLaunch();

            case 'IntentRequest':
                return $this->handleIntent($payload);

            case 'SessionEndedRequest':
                return response()->json(['version' => '1.0', 'response' => new \stdClass()]);

            default:
                if (str_starts_with($reqType, 'AudioPlayer.')) {
                    // Notificações nativas do tocador de áudio da Alexa
                    return response()->json(['version' => '1.0', 'response' => new \stdClass()]);
                }
                return $this->handleLaunch();
        }
    }

    /**
     * Boas-vindas acolhedora ao abrir a Skill
     */
    private function handleLaunch(): JsonResponse
    {
        $speech = '<speak>Oi, princesinha Sarah! A paz do Senhor! '
            . 'Eu sou a Charlene, sua amiguinha. '
            . 'Como é bom estar aqui com você e com a sua família! '
            . 'Hoje nós podemos: ouvir suas músicas na pasta de Adoração, Animadas ou Hora de Dormir; '
            . 'ouvir uma linda história da Bíblia; orar juntas; ou ouvir o devocional do papai Adrian King! '
            . 'O que você quer fazer agora, Sarahzinha?</speak>';

        $reprompt = '<speak>Sarahzinha, você quer ouvir suas músicas, uma historinha da Bíblia ou fazer uma oração?</speak>';

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
                return $this->handlePlayMusic($categoria);

            case 'ContarHistoriaBiblicaIntent':
            case 'ContarHistoriaIntent':
                $tema = $slots['tema']['value'] ?? $slots['personagem']['value'] ?? null;
                return $this->handleBibleStory($tema);

            case 'OracaoDormirIntent':
            case 'FazerOracaoIntent':
                $pedido = $slots['motivo']['value'] ?? $slots['pessoa']['value'] ?? null;
                return $this->handlePrayer($pedido);

            case 'TocarDevocionalIntent':
                return $this->handleDevocional();

            case 'MenuOpcoesIntent':
                return $this->handleMenuOpcoes();

            case 'AMAZON.StopIntent':
            case 'AMAZON.CancelIntent':
            case 'AMAZON.PauseIntent':
                return $this->handleStop();

            case 'AMAZON.ResumeIntent':
                return $this->handlePlayMusic(null);

            case 'AMAZON.HelpIntent':
                return $this->handleMenuOpcoes();

            default:
                // Conversa livre inteligente com memória
                $frase = $slots['mensagem']['value'] ?? $slots['pergunta']['value'] ?? null;
                return $this->handleIntelligentChat($frase, $payload);
        }
    }

    /**
     * Menu interativo "O que você tem para me oferecer?"
     */
    private function handleMenuOpcoes(): JsonResponse
    {
        $speech = '<speak>Sarahzinha, olha só tudo que eu tenho preparado com muito carinho para você: '
            . '1. As suas músicas: temos a pasta de Adoração, as canções Animadas e as músicas para a Hora de Dormir! '
            . '2. Mais de vinte histórias incríveis da Bíblia, como Davi e Golias, Daniel na cova dos leões, a Arca de Noé, a Rainha Ester e os milagres de Jesus! '
            . '3. Orações abençoadas para o seu dia, para a sua família e para a hora de dormir! '
            . '4. O devocional diário da Bíblia com as mensagens do papai Adrian King! '
            . '5. E você também pode me contar do seu dia e me perguntar sobre qualquer pessoa que eu guardo tudo na minha memória! '
            . 'O que você gostaria de escolher agora?</speak>';

        return $this->respondSsml($speech, false, '<speak>Sarahzinha, quer uma música, uma historinha ou uma oração?</speak>');
    }

    /**
     * Toca músicas da Sarah por categoria (adoracao, dormir, animadas ou geral)
     */
    private function handlePlayMusic(?string $categoriaFiltro = null): JsonResponse
    {
        $cat = $this->detectCategory($categoriaFiltro);
        $files = $this->getMusicFiles($cat);

        if (empty($files)) {
            // Se a pasta específica estiver vazia, tenta qualquer música geral
            $allFiles = $this->getMusicFiles('todas');
            if (empty($allFiles)) {
                $speech = '<speak>Sarahzinha, a sua pastinha de músicas ainda está vazia! '
                    . 'O papai Adrian King pode enviar as músicas pelo Telegram dele ou pelo nosso link no computador, '
                    . 'e eu toco na mesma hora para você!</speak>';
                return $this->respondSsml($speech, false);
            }
            $files = $allFiles;
            $catLabel = 'músicas da Sarah';
        } else {
            $catLabel = match ($cat) {
                'adoracao' => 'louvores de adoração da Sarah',
                'dormir' => 'músicas calminhas para dormir',
                'animadas' => 'músicas animadas da Sarah',
                default => 'músicas da Sarah',
            };
        }

        // Escolhe uma música aleatória
        $picked = $files[array_rand($files)];
        $audioUrl = $picked['url'];
        $title = $picked['title'];

        return response()->json([
            'version' => '1.0',
            'response' => [
                'outputSpeech' => [
                    'type' => 'SSML',
                    'ssml' => "<speak>Tocando agora {$catLabel}: " . htmlspecialchars($title) . '!</speak>',
                ],
                'directives' => [
                    [
                        'type' => 'AudioPlayer.Play',
                        'playBehavior' => 'REPLACE_ALL',
                        'audioItem' => [
                            'stream' => [
                                'url' => $audioUrl,
                                'token' => 'sarah_' . md5($picked['filename']),
                                'expectedPreviousToken' => null,
                                'offsetInMilliseconds' => 0,
                            ],
                            'metadata' => [
                                'title' => $title,
                                'subtitle' => 'Charlene para Sarah (' . ucfirst($picked['category']) . ')',
                            ],
                        ],
                    ],
                ],
                'shouldEndSession' => true,
            ],
        ]);
    }

    /**
     * Conta histórias da Bíblia dinâmicas com rotação e IA de verdade
     */
    private function handleBibleStory(?string $tema): JsonResponse
    {
        // Se não pediu um tema específico, sorteia uma do catálogo rico
        if (!$tema) {
            $item = self::HISTORIAS_CATALOGO[array_rand(self::HISTORIAS_CATALOGO)];
            $temaPrompt = "História bíblica sobre {$item['tema']} (personagem principal: {$item['personagem']}). Enfatize lições de: {$item['licoes']}.";
        } else {
            $temaPrompt = "História bíblica sobre: {$tema}.";
        }

        $prompt = "Você é a Charlene, uma amiga e contadora de histórias cristã doce, entusiasmada, alegre, amorosa e cativante para a princesinha Sarah (filha do Adrian King e da Samara). "
            . "Conte uma linda história bíblica para crianças (com 180 a 240 palavras). "
            . "{$temaPrompt} "
            . "Use onomatopeias suaves e divertidas (ex: 'tchibum', 'toc toc', 'uau'). Fale com muito encanto e doçura. "
            . "Termine com uma lição prática e emocionante de fé, coragem e o amor de Jesus para a vida da Sarahzinha. "
            . "Pergunte carinhosamente no final se ela quer ouvir outra história ou colocar uma musiquinha.";

        $story = $this->callAiWithMemory($prompt, 'historia_biblica');

        if (!$story) {
            $story = "Era uma vez um jovem pastorzinho chamado Davi que cuidava das ovelhinhas com muita fé no Papai do Céu! "
                . "Quando o gigante Golias tentou assustar a todos, Davi não teve medo porque sabia que o Senhor dos Exércitos estava com ele. "
                . "Com apenas uma pedrinha e a sua funda, Davi venceu o gigante e provou que quem confia em Deus nunca precisa ter medo de nada! "
                . "Você também é muito corajosa e amada por Jesus, Sarahzinha! Quer ouvir outra historinha agora?";
        }

        $speech = '<speak>' . $this->cleanSsmlText($story) . '</speak>';
        return $this->respondSsml($speech, false, '<speak>Sarahzinha, você quer ouvir outra história da Bíblia ou uma musiquinha?</speak>');
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
            . "Faça uma oração linda, amorosa e cheia de fé (cerca de 100 a 140 palavras). "
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

        $speech = '<speak>' . $this->cleanSsmlText($prayer) . '</speak>';
        return $this->respondSsml($speech, true);
    }

    /**
     * Conversa inteligente com Long-Term Memory (Memória Permanente)
     */
    private function handleIntelligentChat(?string $userUtterance, array $payload): JsonResponse
    {
        if (!$userUtterance) {
            return $this->handleMenuOpcoes();
        }

        // 1. Checa intenções implícitas de menu
        $lower = mb_strtolower($userUtterance);
        if (str_contains($lower, 'o que você tem') || str_contains($lower, 'o que temos') || str_contains($lower, 'o que sabe fazer') || str_contains($lower, 'opções')) {
            return $this->handleMenuOpcoes();
        }

        // 2. Busca na memória permanente fatos relevantes
        $memories = CharleneMemory::orderBy('updated_at', 'desc')->take(25)->get();
        $memoriesPrompt = "MEMÓRIAS QUE VOCÊ JÁ CONHECE E LEMBRA:\n";
        foreach ($memories as $m) {
            $memoriesPrompt .= "- [{$m->category}] {$m->content} (lembrado em: {$m->created_at->format('d/m/Y')})\n";
        }

        $systemPrompt = "Você é a Charlene, uma inteligência artificial doce, afetuosa, amiga e cristã da princesinha Sarah (filha do Adrian King e da Samara). "
            . "Você NÃO é um robô travado! Você conversa com fluidez, entusiasmo, calor e carinho humano para uma criança e para o papai Adrian King. "
            . "Você TEM MEMÓRIA PERMANENTE de tudo o que te ensinaram. "
            . "Se perguntarem se você conhece alguém (ex: Bispo Fernando, tios, amigos), consulte a lista de memórias abaixo. "
            . "Se a pessoa estiver na memória, responda com entusiasmo confirmando que conhece sim, citando os detalhes com carinho! "
            . "Se NÃO estiver na memória, diga com doçura que ainda não conhece pessoalmente, mas pergunte quem é e se ofereça com muito amor para orar por ele ou conhecê-lo. "
            . "Se te pedirem para orar por alguém, faça uma oração curta e amorosa na hora! "
            . "Responda de forma natural em 2 a 4 frases amorosas e envolventes.\n\n"
            . $memoriesPrompt;

        $reply = $this->callOpenAiChat($systemPrompt, $userUtterance);

        if (!$reply) {
            $reply = 'Oi Sarahzinha! Que bom falar com você! Eu estou aqui com você para orar, cantar louvores ou te contar historinhas lindas da Bíblia! O que seu coraçãozinho quer fazer agora?';
        }

        // 3. Processamento em segundo plano: Aprender novas pessoas / fatos mencionados
        $this->extractAndLearnMemories($userUtterance);

        $speech = '<speak>' . $this->cleanSsmlText($reply) . '</speak>';
        return $this->respondSsml($speech, false, '<speak>Sarahzinha, estou te ouvindo! O que você gostaria de fazer agora?</speak>');
    }

    /**
     * Extrai e armazena autonomamente novas pessoas, amigos e pedidos de oração
     */
    private function extractAndLearnMemories(string $text): void
    {
        $lower = mb_strtolower($text);

        // Se mencionou alguém para orar ou conhecer (ex: Bispo Fernando, pastor, amigo, etc.)
        if (preg_match('/(bispo|pastor|pastora|amigo|amiga|tia|tio|irmao|irma|pr\.|dra?\.)\s+([a-zA-ZÀ-ÿ]+)/ui', $text, $matches)) {
            $title = $matches[1];
            $name = $matches[2];
            $subject = mb_strtolower("{$title}_{$name}");
            $content = "{$title} {$name}: pessoa mencionada pela família do Adrian King e da Sarah ('{$text}').";

            CharleneMemory::updateOrCreate(
                ['subject' => $subject],
                ['category' => 'pessoa', 'content' => $content, 'learned_from' => 'alexa_voz', 'last_mentioned_at' => now()]
            );
        } elseif (str_contains($lower, 'ore por') || str_contains($lower, 'orar por') || str_contains($lower, 'ora por')) {
            $subject = 'pedido_' . substr(md5($text), 0, 8);
            CharleneMemory::create([
                'category' => 'pedido_oracao',
                'subject' => $subject,
                'content' => "Pedido de oração ensinado à Charlene: '{$text}'",
                'learned_from' => 'alexa_voz',
                'last_mentioned_at' => now(),
            ]);
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
            ])->timeout(9)->post('https://api.openai.com/v1/chat/completions', [
                'model' => 'gpt-4o-mini',
                'temperature' => 0.75,
                'max_tokens' => 450,
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
     * Para a reprodução de música
     */
    private function handleStop(): JsonResponse
    {
        return response()->json([
            'version' => '1.0',
            'response' => [
                'outputSpeech' => [
                    'type' => 'PlainText',
                    'text' => 'Tudo bem, Sarahzinha! Parando a música. Até logo!',
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
            return response()->json(['success' => false, 'message' => 'Nenhum arquivo enviado.'], 400);
        }

        $file = $request->file('audio');
        $ext = strtolower($file->getClientOriginalExtension());
        if (!in_array($ext, ['mp3', 'm4a', 'aac', 'wav', 'ogg'])) {
            return response()->json(['success' => false, 'message' => 'Formato não suportado (use MP3).'], 422);
        }

        $cat = $request->input('category', 'adoracao');
        if (!in_array($cat, ['adoracao', 'dormir', 'animadas', 'geral'])) {
            $cat = 'adoracao';
        }

        $destDir = ($cat === 'geral') ? $this->storageDir : ($this->storageDir . '/' . $cat);
        $filename = $file->getClientOriginalName();
        $file->move($destDir, $filename);

        $subPath = ($cat === 'geral') ? '' : ($cat . '/');

        return response()->json([
            'success' => true,
            'message' => "Música adicionada à pasta '" . ucfirst($cat) . "' da Sarah!",
            'url' => $this->baseUrl . '/storage/sara/musicas/' . $subPath . rawurlencode($filename),
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
        $memorias = CharleneMemory::orderBy('updated_at', 'desc')->get();

        return view('pages.charleneMusicas', [
            'musicas' => $musicas,
            'memorias' => $memorias,
            'baseUrl' => $this->baseUrl . '/storage/sara/musicas/',
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
        // Remove emojis Unicode que a Alexa rejeita
        $clean = preg_replace('/[\x{1F600}-\x{1F64F}\x{1F300}-\x{1F5FF}\x{1F680}-\x{1F6FF}\x{1F700}-\x{1F77F}\x{1F780}-\x{1F7FF}\x{1F800}-\x{1F8FF}\x{1F900}-\x{1F9FF}\x{1FA00}-\x{1FA6F}\x{1FA70}-\x{1FAFF}\x{2600}-\x{26FF}\x{2700}-\x{27BF}]/u', '', $text);
        // Remove formatações Markdown
        $clean = str_replace(['**', '__', '*', '#', '`'], '', (string) $clean);
        return htmlspecialchars(trim((string) $clean), ENT_QUOTES | ENT_XML1, 'UTF-8');
    }

    private function respondSsml(string $ssml, bool $endSession = false, ?string $repromptSsml = null): JsonResponse
    {
        if (str_starts_with($ssml, '<speak>') && str_ends_with($ssml, '</speak>')) {
            $inner = substr($ssml, 7, -8);
            $ssml = '<speak>' . $this->cleanSsmlText($inner) . '</speak>';
        } else {
            $ssml = '<speak>' . $this->cleanSsmlText($ssml) . '</speak>';
        }

        $res = [
            'outputSpeech' => [
                'type' => 'SSML',
                'ssml' => $ssml,
            ],
            'shouldEndSession' => $endSession,
        ];

        if ($repromptSsml && !$endSession) {
            if (str_starts_with($repromptSsml, '<speak>') && str_ends_with($repromptSsml, '</speak>')) {
                $innerRep = substr($repromptSsml, 7, -8);
                $repromptSsml = '<speak>' . $this->cleanSsmlText($innerRep) . '</speak>';
            } else {
                $repromptSsml = '<speak>' . $this->cleanSsmlText($repromptSsml) . '</speak>';
            }

            $res['reprompt'] = [
                'outputSpeech' => [
                    'type' => 'SSML',
                    'ssml' => $repromptSsml,
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
