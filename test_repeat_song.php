<?php
require '/app/vendor/autoload.php';
$app = require_once '/app/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

function testRepeat(Illuminate\Contracts\Http\Kernel $kernel, array $payload, string $testLabel) {
    echo "====================================================\n";
    echo "TESTE: {$testLabel}\n";
    $req = Illuminate\Http\Request::create('/api/alexa/charlene', 'POST', [], [], [], [], json_encode($payload));
    $req->headers->set('Content-Type', 'application/json');
    $res = $kernel->handle($req);
    $data = json_decode($res->getContent(), true);

    $speech = $data['response']['outputSpeech']['ssml'] ?? '(sem ssml)';
    echo "FALA: {$speech}\n";

    if (!empty($data['response']['directives'])) {
        foreach ($data['response']['directives'] as $d) {
            $type = $d['type'] ?? '';
            $behavior = $d['playBehavior'] ?? '';
            $stream = $d['audioItem']['stream'] ?? [];
            $token = $stream['token'] ?? '';
            $title = $d['audioItem']['metadata']['title'] ?? '';
            $offset = $stream['offsetInMilliseconds'] ?? 0;
            echo "DIRETIVA: {$type} [{$behavior}] | Música: '{$title}' | Offset: {$offset}ms | Token: {$token}\n";
        }
    }
}

// 1. Toca "O Chuveiro Dançarino"
testRepeat($kernel, [
    'version' => '1.0',
    'request' => [
        'type' => 'IntentRequest',
        'intent' => [
            'name' => 'TocarMusicaIntent',
            'slots' => [
                'musica' => ['name' => 'musica', 'value' => 'chuveiro dançarino']
            ]
        ]
    ]
], "1. Tocar música inicial (O Chuveiro Dançarino)");

// 2. Comando de voz RepetirMusicaIntent (sem token no contexto - simula reabrir a skill pedindo para repetir)
testRepeat($kernel, [
    'version' => '1.0',
    'request' => [
        'type' => 'IntentRequest',
        'intent' => [
            'name' => 'RepetirMusicaIntent'
        ]
    ],
    'context' => []
], "2. Pedido de repetição após reabrir a skill (Fallback de Banco de Dados)");

// 3. AMAZON.RepeatIntent com token de tocador ativo
testRepeat($kernel, [
    'version' => '1.0',
    'request' => [
        'type' => 'IntentRequest',
        'intent' => [
            'name' => 'AMAZON.RepeatIntent'
        ]
    ],
    'context' => [
        'AudioPlayer' => [
            'token' => 'sarah|animadas|6|f175b304',
            'offsetInMilliseconds' => 54000
        ]
    ]
], "3. Comando 'Alexa, repete' durante a música (AMAZON.RepeatIntent)");

// 4. Pedido na conversa livre: "Charlene, toca essa de novo"
testRepeat($kernel, [
    'version' => '1.0',
    'request' => [
        'type' => 'IntentRequest',
        'intent' => [
            'name' => 'ConversarIntent',
            'slots' => [
                'mensagem' => ['name' => 'mensagem', 'value' => 'Charlene, toca de novo por favor']
            ]
        ]
    ]
], "4. Pedido na conversa livre: 'Charlene, toca de novo por favor'");
