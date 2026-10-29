<?php

namespace App\Services\Camera;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Serviço de Inteligência Artificial com Visão Computacional (OpenAI Vision / Gemini)
 * Especializado em Monitoramento e Segurança Infantil King Câmera.
 *
 * Responsável por:
 * 1. Diferenciar com precisão cirúrgica bebê deitado/dormindo vs bebê em pé na grade.
 * 2. Reconhecer membros ou partes do bebê (pés, pernas, braços, tronco) para fora do berço/cerco.
 * 3. Filtrar lençóis, cobertores dobrados, roupas e travesseiros inanimados (zero falsos alarmes).
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
     * Analisa com IA Vision o snapshot da câmera quando há um alerta candidato.
     *
     * @return array{
     *   evaluated: bool,
     *   is_standing: bool,
     *   is_lying_down: bool,
     *   is_limb_outside: bool,
     *   is_baby_outside: bool,
     *   is_blanket_or_empty: bool,
     *   confidence: float,
     *   description: string,
     *   source: string
     * }
     */
    public function analyzeBabySafetySnapshot(string $jpegBinary, string $candidateEvent = ''): array
    {
        $defaultFallback = [
            'evaluated' => false,
            'is_standing' => ($candidateEvent === 'baby_stand'),
            'is_lying_down' => false,
            'is_limb_outside' => in_array($candidateEvent, ['crib_fence', 'fence_breach']),
            'is_baby_outside' => in_array($candidateEvent, ['crib_fence', 'fence_breach']),
            'is_blanket_or_empty' => false,
            'confidence' => 0.5,
            'description' => '',
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

    private function analyzeWithOpenAi(string $jpegBinary, string $candidateEvent): array
    {
        $base64 = base64_encode($jpegBinary);
        $dataUrl = "data:image/jpeg;base64,{$base64}";

        $systemPrompt = <<<PROMPT
Você é um sistema especialista de visão computacional da King Câmera para segurança de bebês e crianças em berços.
Analise a imagem da câmera (visão do quarto/berço, pode estar em visão noturna infravermelha em tons de cinza ou colorida).
O sistema local pré-detectou um possível evento: "{$candidateEvent}".

Sua missão é classificar a cena com rigor e verdade anatômica:
1) BEBÊ EM PÉ vs DEITADO:
   - Se o bebê está DEITADO no colchão (de costas, de bruços, de lado, dormindo ou acordado no colchão), 'is_standing' DEVE ser FALSE e 'is_lying_down' DEVE ser TRUE! Mesmo que a cabeça esteja na cabeceira ou o berço esteja visto na vertical, um bebê deitado NUNCA está em pé.
   - Para 'is_standing' ser TRUE, a criança DEVE estar fisicamente levantada sobre as pernas/pés OU erguida apoiando o tronco e as mãos na grade superior do berço.
2) MEMBRO OU CORPO FORA DO BERÇO (CERCO):
   - 'is_limb_outside': TRUE se uma perna, pé, braço, mão ou tronco da criança passou para fora das grades/limite do berço.
   - 'is_baby_outside': TRUE se a criança saiu do berço e está no chão ou cama ao lado.
3) LENÇÓIS / ROUPAS / COBERTORES / BERÇO VAZIO:
   - Se for apenas um cobertor amassado, lençol ou travesseiro sem criança em situação de risco, marque 'is_blanket_or_empty': TRUE.

Responda APENAS em JSON válido com as seguintes chaves:
{
  "is_standing": boolean,
  "is_lying_down": boolean,
  "is_limb_outside": boolean,
  "is_baby_outside": boolean,
  "is_blanket_or_empty": boolean,
  "confidence": float (0.0 a 1.0),
  "description": string (ex: "Bebê está deitado dormindo tranquilamente sob o cobertor" ou "Bebê está em pé se apoiando na grade" ou "Perna do bebê está passando para fora da grade do berço")
}
PROMPT;

        $res = Http::timeout(4.5)
            ->withToken($this->getOpenAiKey())
            ->post(self::OPENAI_CHAT_URL, [
                'model' => $this->getOpenAiModel(),
                'messages' => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    [
                        'role' => 'user',
                        'content' => [
                            ['type' => 'text', 'text' => "Classifique o estado da criança nesta imagem do berço. Responda apenas JSON."],
                            ['type' => 'image_url', 'image_url' => ['url' => $dataUrl, 'detail' => 'low']],
                        ],
                    ],
                ],
                'temperature' => 0.05,
                'max_tokens' => 200,
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

        return [
            'evaluated' => true,
            'is_standing' => (bool) ($json['is_standing'] ?? false),
            'is_lying_down' => (bool) ($json['is_lying_down'] ?? false),
            'is_limb_outside' => (bool) ($json['is_limb_outside'] ?? false),
            'is_baby_outside' => (bool) ($json['is_baby_outside'] ?? false),
            'is_blanket_or_empty' => (bool) ($json['is_blanket_or_empty'] ?? false),
            'confidence' => (float) ($json['confidence'] ?? 0.9),
            'description' => trim((string) ($json['description'] ?? '')),
            'source' => 'openai'
        ];
    }

    private function analyzeWithGemini(string $jpegBinary, string $candidateEvent): array
    {
        $apiKey = $this->getGeminiKey();
        $base64 = base64_encode($jpegBinary);

        $prompt = "Você é o sistema de visão inteligente da King Câmera para segurança de berço. Analise esta foto do berço/quarto da criança. O evento candidato é '{$candidateEvent}'.\n"
            . "Determine: se o bebê está deitado dormindo (is_lying_down: true, is_standing: false); se está em pé na grade (is_standing: true); se há membro/perna/braço para fora das grades (is_limb_outside: true); se é apenas cobertor/lençol vazio (is_blanket_or_empty: true).\n"
            . "Responda SOMENTE JSON no formato: {\"is_standing\": bool, \"is_lying_down\": bool, \"is_limb_outside\": bool, \"is_baby_outside\": bool, \"is_blanket_or_empty\": bool, \"confidence\": float, \"description\": string}";

        $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$apiKey}";

        $res = Http::timeout(4.5)
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

        return [
            'evaluated' => true,
            'is_standing' => (bool) ($json['is_standing'] ?? false),
            'is_lying_down' => (bool) ($json['is_lying_down'] ?? false),
            'is_limb_outside' => (bool) ($json['is_limb_outside'] ?? false),
            'is_baby_outside' => (bool) ($json['is_baby_outside'] ?? false),
            'is_blanket_or_empty' => (bool) ($json['is_blanket_or_empty'] ?? false),
            'confidence' => (float) ($json['confidence'] ?? 0.9),
            'description' => trim((string) ($json['description'] ?? '')),
            'source' => 'gemini'
        ];
    }
}
