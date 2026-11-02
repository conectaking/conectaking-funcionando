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
        $m = trim((string) (env('KING_CAMERA_AI_MODEL') ?: ''));
        return $m !== '' ? $m : 'gpt-4o';
    }

    /**
     * Analisa com IA Vision o snapshot da câmera quando há um alerta candidato ou consulta do usuário.
     * Pode receber o $roi (crib_roi_json) para conferência matemática exata das coordenadas detectadas pela IA.
     *
     * @return array{
     *   evaluated: bool,
     *   is_standing: bool,
     *   is_lying_down: bool,
     *   is_limb_outside: bool,
     *   is_baby_outside: bool,
     *   limb_outside_part: string,
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
    public function analyzeBabySafetySnapshot(string $jpegBinary, string $candidateEvent = '', mixed $roi = null): array
    {
        $defaultFallback = [
            'evaluated' => false,
            'is_standing' => false,
            'is_lying_down' => true,
            'is_limb_outside' => false,
            'is_baby_outside' => false,
            'limb_outside_part' => 'nenhum',
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
                return $this->analyzeWithOpenAi($jpegBinary, $candidateEvent, $roi);
            }
            if ($this->getGeminiKey() !== '') {
                return $this->analyzeWithGemini($jpegBinary, $candidateEvent, $roi);
            }
        } catch (\Throwable $e) {
            Log::warning('kc.ai_vision.error', [
                'event' => $candidateEvent,
                'msg' => $e->getMessage()
            ]);
        }

        return $defaultFallback;
    }

    /**
     * Desenha o polígono/círculo do cerco virtual (borda ciano brilhante + máscara externa avermelhada)
     * em um JPEG bruto caso a imagem ainda não venha demarcada do navegador.
     */
    public function annotateJpegWithCribRoi(string $jpegBinary, mixed $roi): string
    {
        if (!function_exists('imagecreatefromstring') || empty($roi)) {
            return $jpegBinary;
        }
        try {
            if (is_string($roi)) {
                $roi = json_decode($roi, true);
            }
            if (!is_array($roi)) {
                return $jpegBinary;
            }

            $im = @imagecreatefromstring($jpegBinary);
            if (!$im) {
                return $jpegBinary;
            }
            $w = imagesx($im);
            $h = imagesy($im);

            $overlay = imagecreatetruecolor($w, $h);
            imagealphablending($overlay, false);
            $redOut = imagecolorallocatealpha($overlay, 220, 38, 38, 94);
            $transIn = imagecolorallocatealpha($overlay, 0, 255, 255, 115);
            imagefill($overlay, 0, 0, $redOut);

            $type = $roi['type'] ?? 'polygon';
            $flatPts = [];

            if ($type === 'circle' && !empty($roi['circle'])) {
                $cx = (float) ($roi['circle']['cx'] ?? 50);
                $cy = (float) ($roi['circle']['cy'] ?? 50);
                $rx = (float) ($roi['circle']['rx'] ?? 25);
                $ry = (float) ($roi['circle']['ry'] ?? 20);
                for ($deg = 0; $deg < 360; $deg += 10) {
                    $rad = deg2rad($deg);
                    $flatPts[] = (int) ((($cx + $rx * cos($rad)) / 100.0) * $w);
                    $flatPts[] = (int) ((($cy + $ry * sin($rad)) / 100.0) * $h);
                }
            } elseif (!empty($roi['points']) && is_array($roi['points']) && count($roi['points']) >= 3) {
                foreach ($roi['points'] as $pt) {
                    $flatPts[] = (int) (((float) ($pt['x'] ?? 50) / 100.0) * $w);
                    $flatPts[] = (int) (((float) ($pt['y'] ?? 50) / 100.0) * $h);
                }
            } else {
                $x = (float) ($roi['x'] ?? 20);
                $y = (float) ($roi['y'] ?? 25);
                $rw = (float) ($roi['w'] ?? 60);
                $rh = (float) ($roi['h'] ?? 50);
                $flatPts = [
                    (int) (($x / 100.0) * $w), (int) (($y / 100.0) * $h),
                    (int) ((($x + $rw) / 100.0) * $w), (int) (($y / 100.0) * $h),
                    (int) ((($x + $rw) / 100.0) * $w), (int) ((($y + $rh) / 100.0) * $h),
                    (int) (($x / 100.0) * $w), (int) ((($y + $rh) / 100.0) * $h),
                ];
            }

            if (count($flatPts) >= 6) {
                imagefilledpolygon($overlay, $flatPts, $transIn);
                imagealphablending($im, true);
                imagecopy($im, $overlay, 0, 0, 0, 0, $w, $h);
                $cyan = imagecolorallocate($im, 0, 255, 255);
                imagesetthickness($im, 4);
                imagepolygon($im, $flatPts, $cyan);
            }

            imagedestroy($overlay);
            ob_start();
            imagejpeg($im, null, 88);
            $out = ob_get_clean();
            imagedestroy($im);

            return $out ?: $jpegBinary;
        } catch (\Throwable $e) {
            return $jpegBinary;
        }
    }

    private function getSpecialistPrompt(string $candidateEvent): string
    {
        return <<<PROMPT
Você é o sistema especialista de visão computacional da King Câmera para segurança e monitoramento pediátrico em berço.
Analise a imagem da câmera com máxima atenção visual e técnica.

NESTA IMAGEM EXISTE UM CERCO VIRTUAL DESENHADO:
- Uma linha CIANO (azul-piscina/turquesa brilhante) com pontinhos numerados azuis demarca o perímetro do cerco de proteção.
- A área FORA do cerco possui um sombreamento avermelhado/rosado.
- A área DENTRO do cerco é a área segura do bebê.

DIRETRIZES FUNDAMENTAIS DE ANÁLISE HUMANA vs OBJETOS (ALMOFADAS, TRAVESSEIROS E PROTETORES):
1. DIFERENCIAÇÃO ENTRE O BEBÊ E ALMOFADAS/PROTETORES:
   - Almofadas, travesseiros, rolinhos protetores de berço nas bordas da grade, colchão e cobertores são OBJETOS INANIMADOS.
   - NUNCA confunda almofadas, travesseiros, bichos de pelúcia ou tecidos com o corpo do bebê.
   - O bebê é apenas o ser humano real (cabeça com cabelos/rosto, bracinhos, perninhas, tronco e pezinhos humanos).

2. VERIFICAÇÃO RIGOROSA DA CERCA (LINHA CIANO):
   - "is_limb_outside": true SOMENTE E APENAS SE alguma parte real do corpo humano do bebê (cabeça, braço, mão, perna ou pé) estiver fisicamente ultrapassando para FORA da linha ciano (penetrando na área avermelhada/externa).
   - Se uma almofada, travesseiro ou protetor de berço estiver fora ou sobre a linha ciano, mas o bebê estiver dentro da linha ciano, o bebê está TOTALMENTE SEGURO (is_limb_outside: false).
   - "is_baby_outside": true se o bebê inteiro saiu da área do cerco.
   - "limb_outside_part": "pe_perna" | "mao_braco" | "cabeca" | "corpo" | "nenhum".

3. POSTURA E RISCOS:
   - "is_standing": true SOMENTE se o bebê estiver em pé erguido nas pernas ou apoiado em pé na grade.
   - "is_lying_down": true se estiver deitado no colchão dormindo ou descansando.
   - "baby_posture": "sleeping_back" | "sleeping_stomach" | "sleeping_side" | "awake_moving" | "standing" | "empty".
   - "is_blanket_or_empty": true apenas se o berço estiver vazio de bebê humano (somente lençol/cobertor).
   - "adult_present": true se houver adulto presente.
   - "adult_label": "Pai/Mãe" se presente.
   - "adult_action": ação do adulto se presente.
   - "is_face_covered": true se o rostinho da criança estiver abafado por pano/travesseiro (risco de sufocamento).
   - "description": diagnóstico detalhado explicando a posição do bebê e confirmando se ele está ou não dentro da demarcação ciano.

Responda ESTRITAMENTE em JSON:
{
  "is_limb_outside": boolean,
  "is_baby_outside": boolean,
  "limb_outside_part": "pe_perna" | "mao_braco" | "cabeca" | "corpo" | "nenhum",
  "baby_detected": boolean,
  "is_standing": boolean,
  "is_lying_down": boolean,
  "is_blanket_or_empty": boolean,
  "adult_present": boolean,
  "adult_label": string,
  "adult_action": string,
  "is_face_covered": boolean,
  "baby_posture": string,
  "objects_near_fence": string,
  "baby_exact_location_relative_to_fence": string,
  "confidence": float,
  "description": string
}
PROMPT;
    }

    private function analyzeWithOpenAi(string $jpegBinary, string $candidateEvent, mixed $roi = null): array
    {
        // Garante que a imagem tenha o cerco ciano anotado para análise visual da IA
        if (!empty($roi)) {
            $jpegBinary = $this->annotateJpegWithCribRoi($jpegBinary, $roi);
        }

        $base64 = base64_encode($jpegBinary);
        $dataUrl = "data:image/jpeg;base64,{$base64}";
        $prompt = $this->getSpecialistPrompt($candidateEvent);

        $res = Http::timeout(14.0)
            ->withToken($this->getOpenAiKey())
            ->post(self::OPENAI_CHAT_URL, [
                'model' => $this->getOpenAiModel(),
                'messages' => [
                    [
                        'role' => 'user',
                        'content' => [
                            ['type' => 'text', 'text' => $prompt],
                            ['type' => 'image_url', 'image_url' => ['url' => $dataUrl, 'detail' => 'high']],
                        ],
                    ],
                ],
                'temperature' => 0.0,
                'max_tokens' => 350,
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

        return $this->formatNormalizedResult($json, 'openai', $roi);
    }

    private function analyzeWithGemini(string $jpegBinary, string $candidateEvent, mixed $roi = null): array
    {
        if (!empty($roi)) {
            $jpegBinary = $this->annotateJpegWithCribRoi($jpegBinary, $roi);
        }

        $apiKey = $this->getGeminiKey();
        $base64 = base64_encode($jpegBinary);
        $prompt = $this->getSpecialistPrompt($candidateEvent);

        $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={$apiKey}";

        $res = Http::timeout(9.0)
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
                    'temperature' => 0.0,
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

        return $this->formatNormalizedResult($json, 'gemini', $roi);
    }

    /**
     * Testa geometricamente se um ponto (px, py em porcentagem 0-100) está contido dentro do cerco do berço.
     * Suporta uma margem de tolerância em porcentagem.
     */
    private function isPointInRoi(float $px, float $py, array $roi, float $tolerance = 0.0): bool
    {
        $type = $roi['type'] ?? 'polygon';

        if ($type === 'circle' && !empty($roi['circle'])) {
            $cx = (float) ($roi['circle']['cx'] ?? 50);
            $cy = (float) ($roi['circle']['cy'] ?? 50);
            $rx = max(1.0, (float) ($roi['circle']['rx'] ?? 25)) + $tolerance;
            $ry = max(1.0, (float) ($roi['circle']['ry'] ?? 20)) + $tolerance;
            $norm = pow(($px - $cx) / $rx, 2) + pow(($py - $cy) / $ry, 2);
            return $norm <= 1.05;
        }

        $points = $roi['points'] ?? [];
        if (!empty($points) && is_array($points) && count($points) >= 3) {
            $inside = false;
            $n = count($points);
            for ($i = 0, $j = $n - 1; $i < $n; $j = $i++) {
                $xi = (float) ($points[$i]['x'] ?? 0);
                $yi = (float) ($points[$i]['y'] ?? 0);
                $xj = (float) ($points[$j]['x'] ?? 0);
                $yj = (float) ($points[$j]['y'] ?? 0);
                $intersect = (($yi > $py) !== ($yj > $py)) &&
                    ($px < ($xj - $xi) * ($py - $yi) / ($yj - $yi + 0.000001) + $xi);
                if ($intersect) {
                    $inside = !$inside;
                }
            }
            if ($inside) {
                return true;
            }
            if ($tolerance > 0) {
                // Se estiver dentro da distância de tolerância de qualquer segmento
                for ($i = 0; $i < $n; $i++) {
                    $next = ($i + 1) % $n;
                    $x1 = (float)$points[$i]['x']; $y1 = (float)$points[$i]['y'];
                    $x2 = (float)$points[$next]['x']; $y2 = (float)$points[$next]['y'];
                    $dx = $x2 - $x1;
                    $dy = $y2 - $y1;
                    $lenSq = $dx * $dx + $dy * $dy;
                    if ($lenSq > 0.000001) {
                        $t = max(0.0, min(1.0, (($px - $x1) * $dx + ($py - $y1) * $dy) / $lenSq));
                        $projX = $x1 + $t * $dx;
                        $projY = $y1 + $t * $dy;
                        if (hypot($px - $projX, $py - $projY) <= $tolerance) {
                            return true;
                        }
                    }
                }
            }
            return false;
        }

        $rx = ((float) ($roi['x'] ?? 20)) - $tolerance;
        $ry = ((float) ($roi['y'] ?? 25)) - $tolerance;
        $rw = ((float) ($roi['w'] ?? 60)) + ($tolerance * 2);
        $rh = ((float) ($roi['h'] ?? 50)) + ($tolerance * 2);

        return ($px >= $rx && $px <= ($rx + $rw) && $py >= $ry && $py <= ($ry + $rh));
    }

    private function formatNormalizedResult(array $json, string $source, mixed $roi = null): array
    {
        $isLimbOutside = (bool) ($json['is_limb_outside'] ?? false);
        $isBabyOutside = (bool) ($json['is_baby_outside'] ?? false);
        $normPart = trim((string) ($json['limb_outside_part'] ?? 'nenhum'));
        $desc = trim((string) ($json['description'] ?? ''));

        if (is_string($roi)) {
            $roi = json_decode($roi, true);
        }

        // Se o modelo de visão detectou o corpinho do bebê ou caixa total
        if (is_array($roi) && !empty($roi)) {
            $totalBox = $json['baby_total_bounding_box'] ?? null;
            if (is_array($totalBox) && count($totalBox) >= 4) {
                [$bx1, $by1, $bx2, $by2] = $totalBox;
                $centerBx = (float)(($bx1 + $bx2) / 2);
                $centerBy = (float)(($by1 + $by2) / 2);

                // Se o CENTRO do corpinho do bebê estiver do lado de fora do cerco
                if (!$this->isPointInRoi($centerBx, $centerBy, $roi, 1.0)) {
                    $isBabyOutside = true;
                    $isLimbOutside = true;
                    if ($normPart === 'nenhum' || empty($normPart)) {
                        $normPart = 'corpo';
                    }
                    if (empty($desc) || stripos($desc, 'seguro') !== false) {
                        $desc = 'Bebê saiu da área segura demarcada no cerco!';
                    }
                }
            }
        }

        // Se estiver seguro dentro do cerco
        if (!$isLimbOutside && !$isBabyOutside) {
            $normPart = 'nenhum';
            if ($desc === '') {
                $desc = 'Bebê seguro dentro da área demarcada do berço.';
            }
        }

        return [
            'evaluated' => true,
            'is_standing' => (bool) ($json['is_standing'] ?? false),
            'is_lying_down' => (bool) ($json['is_lying_down'] ?? true),
            'is_limb_outside' => $isLimbOutside,
            'is_baby_outside' => $isBabyOutside,
            'limb_outside_part' => $normPart,
            'is_blanket_or_empty' => (bool) ($json['is_blanket_or_empty'] ?? false),
            'adult_present' => (bool) ($json['adult_present'] ?? false),
            'adult_label' => trim((string) ($json['adult_label'] ?? 'Pai ou Mãe')),
            'adult_action' => trim((string) ($json['adult_action'] ?? 'interagindo com o bebê no berço')),
            'is_face_covered' => (bool) ($json['is_face_covered'] ?? false),
            'baby_posture' => trim((string) ($json['baby_posture'] ?? 'sleeping_back')),
            'confidence' => (float) ($json['confidence'] ?? 0.95),
            'description' => $desc,
            'source' => $source
        ];
    }
}
