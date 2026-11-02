<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$camService = app(\App\Services\Camera\KingCameraService::class);
$aiVision = app(\App\Services\Camera\KingCameraAiVisionService::class);
$cam = \App\Models\KingCamera::find(1);

$rawJpeg = $camService->getSnapshot($cam);
$roi = [
    'type' => 'polygon',
    'points' => [
        ['x' => 26, 'y' => 23],
        ['x' => 52, 'y' => 21],
        ['x' => 57, 'y' => 70],
        ['x' => 41, 'y' => 69],
        ['x' => 28, 'y' => 69],
    ]
];

$annotatedJpeg = $aiVision->annotateJpegWithCribRoi($rawJpeg, $roi);
$openAiKey = env('OPENAI_API_KEY');

$prompt = <<<PROMPT
Você é o sistema especialista de visão computacional da King Câmera para monitoramento pediátrico em berço.
Analise a imagem da câmera com máxima atenção visual e técnica.

NESTA IMAGEM EXISTE UM CERCO VIRTUAL DESENHADO:
- Uma linha CIANO (azul-piscina brilhante) demarca o perímetro do cerco de proteção.
- A área FORA do cerco possui um leve sombreamento avermelhado/rosado.
- A área DENTRO do cerco é a área segura do bebê.

REGRA DE OURO - ANÁLISE GLOBAL DA CENA:
1. NUNCA OLHE APENAS PARA DENTRO DO CERCO CIANO!
   - Procure o bebê no QUADRO INTEIRO da imagem (no colchão, na área interna OU na área externa).
   - "is_blanket_or_empty": só pode ser true se NÃO EXISTIR NENHUM BEBÊ HUMANO em nenhum lugar do berço/imagem (berço totalmente vazio).
   - Se o bebê estiver visível no berço, "is_blanket_or_empty" é OBRIGATORIAMENTE FALSE, mesmo que ele esteja fora ou cortado pelo cerco!

2. VERIFICAÇÃO RIGOROSA DA CERCA CIANO:
   - Se o bebê estiver com a cabeça na área avermelhada/externa (fora da linha ciano à esquerda ou no topo) -> "is_limb_outside": true, "limb_outside_part": "cabeca".
   - Se o bebê estiver com os pés ou pernas na área avermelhada/externa (fora da linha ciano à direita ou na base) -> "is_limb_outside": true, "limb_outside_part": "pe_perna".
   - Se tanto a cabeça quanto os pés/corpo estiverem fora da linha ciano -> "is_limb_outside": true, "limb_outside_part": "corpo", "is_baby_outside": true.
   - SOMENTE considere "is_limb_outside": false se TODAS as partes do corpo do bebê (cabeça, tronco, braços, mãos, pernas e pés) estiverem 100% CONTIDAS DENTRO do polígono ciano.
   - Almofadas, travesseiros e protetores de grade NÃO são o bebê. Mas o corpo humano real do bebê cortado ou fora da linha ciano É UMA INFRAÇÃO GRAVE IMEDIATA!

Responda ESTRITAMENTE em JSON:
{
  "baby_detected": boolean,
  "is_blanket_or_empty": boolean,
  "is_limb_outside": boolean,
  "is_baby_outside": boolean,
  "limb_outside_part": "pe_perna" | "mao_braco" | "cabeca" | "corpo" | "nenhum",
  "is_standing": boolean,
  "is_lying_down": boolean,
  "is_face_covered": boolean,
  "head_location": string,
  "feet_location": string,
  "description": string
}
PROMPT;

$res = \Illuminate\Support\Facades\Http::timeout(18.0)
    ->withToken($openAiKey)
    ->post('https://api.openai.com/v1/chat/completions', [
        'model' => env('OPENAI_VISION_MODEL', 'gpt-4o'),
        'messages' => [
            [
                'role' => 'user',
                'content' => [
                    ['type' => 'text', 'text' => $prompt],
                    ['type' => 'image_url', 'image_url' => ['url' => 'data:image/jpeg;base64,' . base64_encode($annotatedJpeg), 'detail' => 'high']],
                ],
            ],
        ],
        'temperature' => 0.0,
        'max_tokens' => 350,
        'response_format' => ['type' => 'json_object'],
    ]);

echo "\n=== RESULTADO DO NOVO TESTE DE INFRAÇÃO COM CORTE DE CABEÇA E PÉ ===\n";
echo $res->json('choices.0.message.content') . "\n";
