<?php
require '/app/vendor/autoload.php';
$app = require_once '/app/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

function testFamily(Illuminate\Contracts\Http\Kernel $kernel, string $question, string $label) {
    echo "====================================================\n";
    echo "TESTE: {$label}\n";
    echo "PERGUNTA: '{$question}'\n";

    $payload = [
        'version' => '1.0',
        'request' => [
            'type' => 'IntentRequest',
            'intent' => [
                'name' => 'ConversarIntent',
                'slots' => [
                    'mensagem' => ['name' => 'mensagem', 'value' => $question]
                ]
            ]
        ]
    ];

    $req = Illuminate\Http\Request::create('/api/alexa/charlene', 'POST', [], [], [], [], json_encode($payload));
    $req->headers->set('Content-Type', 'application/json');
    $res = $kernel->handle($req);
    $data = json_decode($res->getContent(), true);

    $ssml = $data['response']['outputSpeech']['ssml'] ?? '(sem ssml)';
    echo "RESPOSTA CHARLENE:\n{$ssml}\n";
}

// 1. Vovó Socorro
testFamily($kernel, "Charlene, quem é a vovó Socorro?", "1. Expertise sobre a Vovó Socorro");

// 2. Vovô Ciço
testFamily($kernel, "quem é o vovô Ciço?", "2. Expertise sobre o Vovô Ciço");

// 3. Tios da Sarah
testFamily($kernel, "quem são os tios da Sarah?", "3. Expertise sobre os Tios da Sarah");

// 4. Titio Pompom
testFamily($kernel, "fala do tio Pompom para mim", "4. Expertise sobre o Titio Pompom");

// 5. Papai e Mamãe
testFamily($kernel, "quem é o papai Adrian e a mamãe Samara?", "5. Expertise sobre Papai e Mamãe");

// 6. Contando novidade sobre a família
testFamily($kernel, "Charlene, o tio Marcos comprou um presente lindo para a Sarah", "6. Absorção de nova informação sobre familiar");
