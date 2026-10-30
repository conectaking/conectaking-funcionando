<?php

namespace App\Services\Camera;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Serviço de Inteligência Artificial com Visão Computacional (OpenAI Vision / Gemini)
 * Especializado em Monitoramento e Segurança Infantil Pediátrica King Câmera.
 *
 * Responsável por:
 * 1. Diferenciação biológica: bebê humano (pele, rosto, cabelinho, membros) vs travesseiro, lençol e almofadas.
 * 2. Detecção de Cuidador/Adulto (Pai ou Mãe): identifica quando um adulto se aproxima para ajeitar a coberta, ninar ou pegar o bebê.
 * 3. Compreensão 3D de postura: bebê deitado dormindo (costas, bruços, lado) vs em pé na grade.
 * 4. Validação anatômica de cerca: confirma se um membro ou corpo do bebê realmente ultrapassou as grades do berço.
 * 5. Detecção de risco de sufocamento: alerta se o rostinho da criança foi coberto por pano ou travesseiro.
 */
class KingCameraAiVisionService
{
    private const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';

    public function getOpenAiKey(): string
    {
        return trim((string) (env('OPENAI_API_KEY') ?: env('BIBLE_OPENAI_API_KEY') ?: ''));
    }

    public function getGeminiKey(): string
    {
        return trim((string) (env('GEMINI_API_KEY') ?: env('GOOGLE_AI_KEY') ?: ''));
    }

    public function isAvailable(): bool
    {
        return $this->getOpenAiKey() !== '' || $this->getGeminiKey() !== '';
    }

    public function getOpenAiModel(): string
    {
        $m = trim((string) (env('KING_CAMERA_AI_MODEL') ?: env('RECIBO_OCR_AI_MODEL') ?: ''));
        return $m !== '' ? $m : 'gpt-4o-mini';
    }

    /**
     * Analisa com IA Vision o snapshot da câmera quando há um alerta candidato ou consulta do usuário.
     *
     * @return array{
     *   evaluated: bool,
     *   is_standing: bool,
     *   is_lying_down: bool,
     *   is_limb_outside: bool,
     *   is_baby_outside: bool,
     *   is_blanket_or_empty: bool,
     *   adult_present: bool,
     *   adult_label: string,
     *   adult_action: string,
     *   is_face_covered: bool,
     *   baby_posture: string,
     *   confidence: float,
     *   description: string,
     *   source: string
     * }
     */
    public function analyzeBabySafetySnapshot(string $jpegBinary, string $candidateEvent = ''): array
    {
        $defaultFallback = [
            'evaluated' => false,
            'is_standing' => false,
            'is_lying_down' => true,
            'is_limb_outside' => false,
            'is_baby_outside' => false,
            'is_blanket_or_empty' => false,
            'adult_present' => false,
            'adult_label' => '',
            'adult_action' => '',
            'is_face_covered' => false,
            'baby_posture' => 'sleeping_back',
            'confidence' => 0.5,
            'description' => 'Bebê no berço (análise preliminar)',
            'source' => 'fallback'
        ];

        if (!$this->isAvailable() || strlen($jpegBinary) < 300) {
            return $defaultFallback;
        }

        try {
            if ($this->getOpenAiKey() !== '') {
                return $this->analyzeWithOpenAi($jpegBinary, $candidateEvent);
            }
            if ($this->getGeminiKey() !== '') {
                return $this->analyzeWithGemini($jpegBinary, $candidateEvent);
            }
        } catch (\Throwable $e) {
            Log::warning('kc.ai_vision.error', [
                'event' => $candidateEvent,
                'msg' => $e->getMessage()
            ]);
        }

        return $defaultFallback;
    }

    private function getSpecialistPrompt(string $candidateEvent): string
    {
        return <<<PROMPT
Você é o sistema especialista de visão computacional pediátrica da King Câmera.
Sua missão é supervisionar a segurança do bebê no berço através da imagem da câmera (pode estar em visão noturna infravermelha em tons de cinza ou colorida).
O sistema local de sensores pré-sinalizou o seguinte evento candidato: "{$candidateEvent}".

Analise a cena com rigor e máxima atenção biológica e espacial:

1) SER HUMANO REAL vs TRAVESSEIRO / COBERTOR / BICHOS:
- Diferencie com precisão tecido/lençol dobrado, almofada ou travesseiro de partes do corpo humano (cabeça com cabelinho, rostinho, perninhas, braços, pezinhos e mãos).
- Uma dobra de lençol branca no infravermelho NÃO é um pé nem um ombro!
- Se a cama estiver vazia ou com apenas panos e travesseiros: 'is_blanket_or_empty': true.

2) PRESENÇA DE ADULTO / CUIDADOR (PAI OU MÃE):
- Verifique se há uma pessoa adulta (pai, mãe ou cuidador) no berço ou debruçada sobre o berço.
- Se houver um braço grande de adulto ajeitando a coberta, colocando a chupeta, acalmando o bebê ou pegando a criança no colo:
  * 'adult_present': true
  * 'adult_label': "Pai" (se homem adulto), "Mãe" (se mulher adulta) ou "Pai/Mãe (Cuidador)"
  * 'adult_action': ex: "ajeitando o cobertor do bebê", "colocando a chupeta e acalmando", "segurando a criança no colo"
  * IMPORTANTE: Se o braço visto for de um ADULTO cuidando do bebê, NUNCA considere que o bebê 'saiu do cerco'!

3) POSTURA REAL DO BEBÊ (DEITADO vs EM PÉ):
- Visão zenital/inclinada comprime a altura. O bebê deitado no colchão (de costas, de lado ou de bruços) tem a cabeça no topo e pés embaixo na foto, mas ele está 100% DEITADO!
- Para 'is_standing' ser TRUE, a criança DEVE estar fisicamente levantada sobre os dois pés OU em pé erguida segurando na grade superior do berço. Se o corpinho estiver sobre o colchão, 'is_standing' DEVE ser FALSE e 'is_lying_down' DEVE ser TRUE.

4) MEMBRO OU CORPO PARA FORA DO CERCO (CERCA VIRTUAL / BERÇO):
- Na imagem pode haver uma linha tracejada CIANO/AZUL delimitando a área segura traçada pelos pais no berço ("CERCO VIRTUAL").
- 'is_limb_outside': TRUE SOMENTE SE uma perna, pé, braço ou mão biológica real do bebê ultrapassou claramente para fora dessa linha demarcada (ou para fora das grades do berço).
- Se o corpinho e os membros do bebê estiverem dentro da área demarcada: 'is_limb_outside': FALSE!
- Uma pontinha de cobertor ou lençol encostando na linha NÃO é um membro fora!
- 'is_baby_outside': TRUE SOMENTE se a criança saiu do berço/área segura (ex: caiu no chão ou cama ao lado).

5) RISCO DE SUFOCAMENTO:
- 'is_face_covered': TRUE se o rostinho da criança estiver coberto por cobertor grosso, pano ou travesseiro impedindo a respiração livre.

Responda ESTRITAMENTE em formato JSON com estas chaves:
{
  "is_standing": boolean,
  "is_lying_down": boolean,
  "is_limb_outside": boolean,
  "is_baby_outside": boolean,
  "is_blanket_or_empty": boolean,
  "adult_present": boolean,
  "adult_label": string,
  "adult_action": string,
  "is_face_covered": boolean,
  "baby_posture": string ("sleeping_back"|"sleeping_stomach"|"sleeping_side"|"awake_moving"|"standing"|"empty"),
  "confidence": float (0.0 a 1.0),
  "description": string (descrição humanizada e detalhada, ex: "Bebê está deitado dormindo tranquilamente de barriga para cima, totalmente seguro dentro do berço" ou "Pai/Mãe está no berço ajeitando o cobertor da neném" ou "Pé do bebê passou para fora da grade lateral do berço")
}
PROMPT;
    }

    private function analyzeWithOpenAi(string $jpegBinary, string $candidateEvent): array
    {
        $base64 = base64_encode($jpegBinary);
        $dataUrl = "data:image/jpeg;base64,{$base64}";
        $systemPrompt = $this->getSpecialistPrompt($candidateEvent);

        $res = Http::timeout(5.5)
            ->withToken($this->getOpenAiKey())
            ->post(self::OPENAI_CHAT_URL, [
                'model' => $this->getOpenAiModel(),
                'messages' => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    [
                        'role' => 'user',
                        'content' => [
                            ['type' => 'text', 'text' => "Classifique com rigor especialista o estado do bebê e a presença de cuidadores nesta cena do berço. Responda apenas JSON."],
                            ['type' => 'image_url', 'image_url' => ['url' => $dataUrl, 'detail' => 'high']],
                        ],
                    ],
                ],
                'temperature' => 0.05,
                'max_tokens' => 280,
                'response_format' => ['type' => 'json_object'],
            ]);

        if (!$res->successful()) {
            throw new \RuntimeException("OpenAI Vision HTTP " . $res->status() . ": " . $res->body());
        }

        $content = data_get($res->json(), 'choices.0.message.content');
        $json = json_decode((string) $content, true);

        if (!is_array($json)) {
            throw new \RuntimeException("Resposta OpenAI não é JSON válido: " . $content);
        }

        return $this->formatNormalizedResult($json, 'openai');
    }

    private function analyzeWithGemini(string $jpegBinary, string $candidateEvent): array
    {
        $apiKey = $this->getGeminiKey();
        $base64 = base64_encode($jpegBinary);
        $prompt = $this->getSpecialistPrompt($candidateEvent);

        $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$apiKey}";

        $res = Http::timeout(5.5)
            ->post($url, [
                'contents' => [
                    [
                        'parts' => [
                            ['text' => $prompt],
                            [
                                'inline_data' => [
                                    'mime_type' => 'image/jpeg',
                                    'data' => $base64
                                ]
                            ]
                        ]
                    ]
                ],
                'generationConfig' => [
                    'temperature' => 0.05,
                    'response_mime_type' => 'application/json'
                ]
            ]);

        if (!$res->successful()) {
            throw new \RuntimeException("Gemini HTTP " . $res->status() . ": " . $res->body());
        }

        $rawText = data_get($res->json(), 'candidates.0.content.parts.0.text', '');
        $json = json_decode((string) $rawText, true);

        if (!is_array($json)) {
            throw new \RuntimeException("Gemini Vision não retornou JSON: " . $rawText);
        }

        return $this->formatNormalizedResult($json, 'gemini');
    }

    private function formatNormalizedResult(array $json, string $source): array
    {
        return [
            'evaluated' => true,
            'is_standing' => (bool) ($json['is_standing'] ?? false),
            'is_lying_down' => (bool) ($json['is_lying_down'] ?? true),
            'is_limb_outside' => (bool) ($json['is_limb_outside'] ?? false),
            'is_baby_outside' => (bool) ($json['is_baby_outside'] ?? false),
            'is_blanket_or_empty' => (bool) ($json['is_blanket_or_empty'] ?? false),
            'adult_present' => (bool) ($json['adult_present'] ?? false),
            'adult_label' => trim((string) ($json['adult_label'] ?? 'Pai ou Mãe')),
            'adult_action' => trim((string) ($json['adult_action'] ?? 'interagindo com o bebê no berço')),
            'is_face_covered' => (bool) ($json['is_face_covered'] ?? false),
            'baby_posture' => trim((string) ($json['baby_posture'] ?? 'sleeping_back')),
            'confidence' => (float) ($json['confidence'] ?? 0.92),
            'description' => trim((string) ($json['description'] ?? '')),
            'source' => $source
        ];
    }
}
