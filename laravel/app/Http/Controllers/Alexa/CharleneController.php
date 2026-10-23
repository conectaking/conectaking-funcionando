<?php

namespace App\Http\Controllers\Alexa;

use App\Http\Controllers\Controller;
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

    public function __construct()
    {
        $this->storageDir = storage_path('app/public/sara/musicas');
        $this->baseUrl = rtrim(config('app.url') ?: 'https://www.conectaking.com.br', '/');
        if (!File::isDirectory($this->storageDir)) {
            File::makeDirectory($this->storageDir, 0777, true, true);
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
                'service' => 'Charlene Alexa Skill',
                'version' => '1.0'
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
                    // Notificações de reprodução de áudio
                    return response()->json(['version' => '1.0', 'response' => new \stdClass()]);
                }
                return $this->respondSpeech('Oi Sarah! Eu sou a Charlene. Como posso te ajudar hoje?', false);
        }
    }

    private function handleLaunch(): JsonResponse
    {
        $speech = '<speak>Oi, princesinha Sarah! A paz do Senhor! '
            . 'Eu sou a Charlene, sua amiguinha. '
            . 'O que nós vamos fazer hoje? Você quer ouvir suas musiquinhas, '
            . 'ouvir uma linda história da Bíblia, fazer uma oração ou ouvir o devocional do papai?</speak>';

        $reprompt = '<speak>Sarahzinha, você quer ouvir suas músicas ou uma historinha da Bíblia?</speak>';

        return $this->respondSsml($speech, false, $reprompt);
    }

    private function handleIntent(array $payload): JsonResponse
    {
        $intentName = $payload['request']['intent']['name'] ?? '';
        $slots = $payload['request']['intent']['slots'] ?? [];

        switch ($intentName) {
            case 'TocarMusicaIntent':
            case 'TocarPlaylistIntent':
                return $this->handlePlayMusic();

            case 'ContarHistoriaBiblicaIntent':
            case 'ContarHistoriaIntent':
                $tema = $slots['tema']['value'] ?? $slots['personagem']['value'] ?? null;
                return $this->handleBibleStory($tema);

            case 'OracaoDormirIntent':
            case 'FazerOracaoIntent':
                return $this->handlePrayer();

            case 'TocarDevocionalIntent':
                return $this->handleDevocional();

            case 'AMAZON.StopIntent':
            case 'AMAZON.CancelIntent':
            case 'AMAZON.PauseIntent':
                return $this->handleStop();

            case 'AMAZON.ResumeIntent':
                return $this->handlePlayMusic();

            case 'AMAZON.HelpIntent':
                return $this->respondSpeech(
                    'Você pode dizer: Charlene, toque minhas músicas. Ou: Charlene, conte uma história da Bíblia. Ou: Charlene, vamos orar. O que você gostaria de fazer, Sarahzinha?',
                    false
                );

            default:
                // Conversa livre da Sarah com a Charlene
                $query = $slots['pergunta']['value'] ?? $slots['frase']['value'] ?? null;
                return $this->handleChatWithSara($query);
        }
    }

    /**
     * Toca as músicas da pasta da Sarah
     */
    private function handlePlayMusic(): JsonResponse
    {
        $files = $this->getMusicFiles();

        if (empty($files)) {
            $speech = '<speak>Sarahzinha, a sua pastinha de músicas ainda está vazia! '
                . 'Pede para o papai Adriano colocar suas músicas no sistema, que eu toco na mesma hora para você!</speak>';
            return $this->respondSsml($speech, false);
        }

        // Escolhe uma música aleatória ou a primeira
        $picked = $files[array_rand($files)];
        $audioUrl = $this->baseUrl . '/storage/sara/musicas/' . rawurlencode($picked);
        $title = pathinfo($picked, PATHINFO_FILENAME);

        return response()->json([
            'version' => '1.0',
            'response' => [
                'outputSpeech' => [
                    'type' => 'SSML',
                    'ssml' => '<speak>Tocando agora a música da Sarah: ' . htmlspecialchars($title) . '!</speak>',
                ],
                'directives' => [
                    [
                        'type' => 'AudioPlayer.Play',
                        'playBehavior' => 'REPLACE_ALL',
                        'audioItem' => [
                            'stream' => [
                                'url' => $audioUrl,
                                'token' => 'sara_' . md5($picked),
                                'expectedPreviousToken' => null,
                                'offsetInMilliseconds' => 0,
                            ],
                            'metadata' => [
                                'title' => $title,
                                'subtitle' => 'Charlene para Sarah',
                            ],
                        ],
                    ],
                ],
                'shouldEndSession' => true,
            ],
        ]);
    }

    /**
     * Conta histórias da Bíblia para a Sarah
     */
    private function handleBibleStory(?string $tema): JsonResponse
    {
        $prompt = "Você é a Charlene, uma amiga e contadora de histórias cristã doce, alegre, amorosa e calorosa para a princesinha Sarah (filha do Adriano King). "
            . "Conte uma linda história bíblica para crianças (com 180 a 230 palavras). "
            . ($tema ? "Tema solicitado: {$tema}. " : "Escolha uma história maravilhosa como Davi e Golias, A Arca de Noé, Daniel na Cova dos Leões, O Nascimento de Jesus, Jesus Acalma a Tempestade, etc. ")
            . "Fale com muita doçura, entusiasmo e encanto. Termine com uma lição de fé, coragem e o amor de Jesus para a Sarahzinha, e pergunte se ela quer ouvir outra história ou uma musiquinha.";

        $story = $this->callAi($prompt);

        if (!$story) {
            $story = "Era uma vez um jovem pastorzinho chamado Davi. Ele cuidava das ovelhinhas do seu pai com muito amor e fé em Deus! "
                . "Um dia, um gigante muito grande e bravo chamado Golias apareceu e queria assustar todo mundo. "
                . "Mas Davi não teve medo, porque ele sabia que o Senhor Deus estava com ele! Com apenas uma pedrinha e a sua funda, Davi venceu o gigante e mostrou que quem confia no Papai do Céu nunca precisa ter medo de nada! "
                . "Você também é muito corajosa e amada por Deus, Sarahzinha! Gostou da historinha?";
        }

        $speech = '<speak>' . htmlspecialchars($story) . '</speak>';
        return $this->respondSsml($speech, false, '<speak>Sarahzinha, você quer ouvir outra história da Bíblia ou suas músicas?</speak>');
    }

    /**
     * Oração para dormir
     */
    private function handlePrayer(): JsonResponse
    {
        $speech = '<speak>Vamos orar juntas, princesinha Sarah! Feche os olhinhos: '
            . 'Querido Papai do Céu, muito obrigada por esse dia tão lindo e abençoado! '
            . 'Abençoe a princesinha Sarah, o papai Adriano e toda a nossa família. '
            . 'Envia Teus anjos de luz para guardarem o quartinho da Sarah, trazendo muita paz, proteção e sonhos lindos. '
            . 'Que a Sarah durma em paz e acorde cheia de alegria. Em nome de Jesus, amém! '
            . 'Durma com os anjinhos, Sarahzinha! A Charlene te ama muito!</speak>';

        return $this->respondSsml($speech, true);
    }

    /**
     * Toca ou lê o devocional do dia
     */
    private function handleDevocional(): JsonResponse
    {
        try {
            $devService = app(BibleDevotionalService::class);
            $dev = $devService->getForDate();

            if ($dev && !empty($dev['reflexao'])) {
                $titulo = $dev['titulo'] ?? 'Devocional de Hoje';
                $versiculo = $dev['versiculo_texto'] ?? $dev['versiculo_ref'] ?? '';
                $reflexao = mb_substr(strip_tags($dev['reflexao']), 0, 350);

                $speech = '<speak>Aqui está o devocional de hoje, Sarahzinha! '
                    . htmlspecialchars($titulo) . '. '
                    . ($versiculo ? 'A palavra diz: ' . htmlspecialchars($versiculo) . '. ' : '')
                    . htmlspecialchars($reflexao) . ' '
                    . 'Que linda palavra de Deus para abençoar o nosso dia!</speak>';

                return $this->respondSsml($speech, false, '<speak>Quer ouvir uma música da Sarah agora?</speak>');
            }
        } catch (\Throwable $e) {
            Log::warning('alexa.devocional.err', ['msg' => $e->getMessage()]);
        }

        return $this->respondSpeech('Hoje o dia está abençoado! O papai Adriano preparou devocionais lindos no Conecta King para você ouvir e crescer na fé!', false);
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
     * Conversa livre carinhosa com a Sarah
     */
    private function handleChatWithSara(?string $query): JsonResponse
    {
        if (!$query) {
            return $this->respondSpeech('Oi Sarahzinha! Pode falar comigo, eu estou aqui te ouvindo!', false);
        }

        $prompt = "Você é a Charlene, a assistente e amiga cristã doce da princesinha Sarah (filha do Adriano King). "
            . "A Sarah acabou de dizer: '{$query}'. "
            . "Responda de forma curta, carinhosa, alegre e edificante para uma criança em 2 a 3 frases. Termine perguntando algo fofo ou se ela quer ouvir música ou história da Bíblia.";

        $reply = $this->callAi($prompt) ?: 'Que legal, Sarahzinha! Eu adoro conversar com você. Quer que eu te conte uma história da Bíblia ou toque suas musiquinhas?';

        return $this->respondSpeech($reply, false);
    }

    /**
     * Lista arquivos de música na pasta pública
     */
    public function listPlaylist(): JsonResponse
    {
        $files = $this->getMusicFiles();
        $list = [];

        foreach ($files as $f) {
            $path = $this->storageDir . '/' . $f;
            $list[] = [
                'title' => pathinfo($f, PATHINFO_FILENAME),
                'filename' => $f,
                'url' => $this->baseUrl . '/storage/sara/musicas/' . rawurlencode($f),
                'size_mb' => round(filesize($path) / (1024 * 1024), 2),
            ];
        }

        return response()->json([
            'success' => true,
            'total' => count($list),
            'playlist' => $list,
        ]);
    }

    /**
     * Upload de nova música para a Sarah via formulário web
     */
    public function uploadMusic(Request $request): JsonResponse
    {
        if (!$request->hasFile('audio')) {
            return response()->json(['success' => false, 'message' => 'Nenhum arquivo enviado.'], 400);
        }

        $file = $request->file('audio');
        $ext = strtolower($file->getClientOriginalExtension());
        if (!in_array($ext, ['mp3', 'm4a', 'aac', 'wav', 'ogg'])) {
            return response()->json(['success' => false, 'message' => 'Formato de áudio não suportado (use MP3).'], 422);
        }

        $filename = $file->getClientOriginalName();
        $file->move($this->storageDir, $filename);

        return response()->json([
            'success' => true,
            'message' => 'Música adicionada com sucesso à playlist da Sarah!',
            'url' => $this->baseUrl . '/storage/sara/musicas/' . rawurlencode($filename),
        ]);
    }

    /**
     * Upload de música enviado pelo Telegram do Papai Adriano
     */
    public function uploadFromTelegram(Request $request): JsonResponse
    {
        $fileId = $request->input('file_id');
        $fileName = $request->input('file_name');
        $token = env('TELEGRAM_BOT_TOKEN') ?: '8871691156:AAGir9vNUOeukdbtFctvLbi8u2BCe95FgJw';

        if (!$fileId) {
            return response()->json(['success' => false, 'message' => 'file_id ausente.'], 400);
        }

        try {
            $infoRes = Http::timeout(10)->get("https://api.telegram.org/bot{$token}/getFile?file_id={$fileId}");
            $filePath = $infoRes->json('result.file_path');

            if (!$filePath) {
                return response()->json(['success' => false, 'message' => 'Arquivo não localizado nos servidores do Telegram.'], 404);
            }

            $fileContent = Http::timeout(60)->get("https://api.telegram.org/file/bot{$token}/{$filePath}")->body();

            if (empty($fileContent)) {
                return response()->json(['success' => false, 'message' => 'Não foi possível baixar o áudio do Telegram.'], 500);
            }

            $name = $fileName ?: basename($filePath);
            $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
            if (!in_array($ext, ['mp3', 'm4a', 'aac', 'wav', 'ogg'])) {
                $name .= '.mp3';
            }

            File::put($this->storageDir . '/' . $name, $fileContent);

            return response()->json([
                'success' => true,
                'filename' => $name,
                'message' => "Música '{$name}' adicionada com sucesso à playlist da Sarah na Alexa!",
                'url' => $this->baseUrl . '/storage/sara/musicas/' . rawurlencode($name),
            ]);
        } catch (\Throwable $e) {
            Log::error('alexa.telegram_upload.err', ['msg' => $e->getMessage()]);
            return response()->json(['success' => false, 'message' => 'Erro interno ao processar áudio: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Página visual de gerenciamento de músicas
     */
    public function managerPage()
    {
        $files = $this->getMusicFiles();
        return view('pages.charleneMusicas', [
            'musicas' => $files,
            'baseUrl' => $this->baseUrl . '/storage/sara/musicas/'
        ]);
    }

    /**
     * Remover música
     */
    public function deleteMusic(Request $request): JsonResponse
    {
        $file = basename($request->input('filename', ''));
        $target = $this->storageDir . '/' . $file;
        if ($file && File::exists($target)) {
            File::delete($target);
            return response()->json(['success' => true, 'message' => 'Música removida!']);
        }
        return response()->json(['success' => false, 'message' => 'Arquivo não encontrado.'], 404);
    }

    private function getMusicFiles(): array
    {
        if (!File::isDirectory($this->storageDir)) {
            return [];
        }

        $all = File::files($this->storageDir);
        $res = [];
        foreach ($all as $file) {
            $ext = strtolower($file->getExtension());
            if (in_array($ext, ['mp3', 'm4a', 'aac', 'wav'])) {
                $res[] = $file->getFilename();
            }
        }
        return $res;
    }

    private function callAi(string $prompt): ?string
    {
        $apiKey = trim((string) (env('OPENAI_API_KEY') ?: ''));
        if (!$apiKey) {
            return null;
        }

        try {
            $res = Http::withHeaders([
                'Authorization' => 'Bearer ' . $apiKey,
                'Content-Type' => 'application/json',
            ])->timeout(8)->post('https://api.openai.com/v1/chat/completions', [
                'model' => 'gpt-4o-mini',
                'temperature' => 0.7,
                'max_tokens' => 400,
                'messages' => [
                    ['role' => 'system', 'content' => 'Você é a Charlene, uma amiguinha cristã doce e amorosa para crianças.'],
                    ['role' => 'user', 'content' => $prompt],
                ],
            ]);

            return $res->json('choices.0.message.content');
        } catch (\Throwable $e) {
            Log::warning('alexa.ai.err', ['msg' => $e->getMessage()]);
            return null;
        }
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

    private function cleanSsmlText(string $text): string
    {
        // Remove emojis and special symbols that cause Alexa SSML parsing failures
        $clean = preg_replace('/[\x{1F600}-\x{1F64F}\x{1F300}-\x{1F5FF}\x{1F680}-\x{1F6FF}\x{1F700}-\x{1F77F}\x{1F780}-\x{1F7FF}\x{1F800}-\x{1F8FF}\x{1F900}-\x{1F9FF}\x{1FA00}-\x{1FA6F}\x{1FA70}-\x{1FAFF}\x{2600}-\x{26FF}\x{2700}-\x{27BF}]/u', '', $text);
        // Remove markdown formatting like ** or __ or *
        $clean = str_replace(['**', '__', '*', '#'], '', (string) $clean);
        return htmlspecialchars(trim((string) $clean), ENT_QUOTES | ENT_XML1, 'UTF-8');
    }

    private function respondSsml(string $ssml, bool $endSession = false, ?string $repromptSsml = null): JsonResponse
    {
        // Se já vier com tags <speak>, limpa o miolo
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
}
