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
    public function analyzeBabySafetySnapshot(string $jpegBinary, string $candidateEvent = '', mixed $roi = null, bool $needsAnnotation = true): array
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
                return $this->analyzeWithOpenAi($jpegBinary, $candidateEvent, $roi, $needsAnnotation);
            }
            if ($this->getGeminiKey() !== '') {
                return $this->analyzeWithGemini($jpegBinary, $candidateEvent, $roi, $needsAnnotation);
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
Você é o sistema especialista supremo de visão computacional da King Câmera para segurança e monitoramento pediátrico em berço.
Analise a imagem da câmera com máxima acurácia técnica, visual e anatômica.

NESTA IMAGEM EXISTE UM CERCO VIRTUAL DESENHADO:
- Uma linha CIANO (azul-piscina/turquesa brilhante) com pontinhos numerados azuis demarca o perímetro do cerco de proteção.
- A área FORA do cerco possui um leve sombreamento avermelhado/rosado.
- A área DENTRO do cerco é a área segura do bebê.

DIRETRIZES FUNDAMENTAIS DE ANÁLISE:

1. IDENTIFICAÇÃO ANATÔMICA DO BEBÊ HUMANO (COORDENADAS):
   - Localize o ser humano real (o bebê):
     * Cabeça: o crânio da criança, com cabelo (normalmente escuro ou encaracolado) e rostinho humano.
     * Pés / Pernas: os pezinhos descalços ou perninhas da criança.
     * Tronco / Corpo: o tórax/abdômen com roupinha/macacão/body infantil.
   - Forneça a posição do centro da cabeça ("head_center"), do centro dos pés ("feet_center") e do centro do tronco ("torso_center") em porcentagem da imagem:
     x: 0 (borda esquerda) a 100 (borda direita)
     y: 0 (borda superior) a 100 (borda inferior)

2. DIFERENCIAÇÃO ENTRE O BEBÊ E ALMOFADAS/PROTETORES/COBERTORES:
   - ATENÇÃO MÁXIMA: As bordas do berço possuem almofadas brancas/rolinhos protetores acolchoados (protetor de berço), travesseiros e cobertores de tecido.
   - Almofadas, travesseiros, rolinhos protetores de grade, lençóis e cobertores são OBJETOS INANIMADOS de tecido.
   - NUNCA confunda uma almofada branca, protetor de berço ou cobertor com a cabeça, perna ou pé do bebê!
   - Se almofadas, travesseiros ou protetores estiverem fora da linha ciano na área avermelhada, mas o bebê humano estiver com a cabeça, tronco e pernas dentro da linha ciano: O BEBÊ ESTÁ TOTALMENTE SEGURO!
   - Nesse caso, responda "is_limb_outside": false, "is_baby_outside": false, "limb_outside_part": "nenhum". NÃO CRIE FALSO ALARME POR CAUSA DE ALMOFADAS!

3. INFRAÇÃO REAL DO CERCO (SOMENTE PARA CORPO HUMANO REAL):
   - Há infração "is_limb_outside": true SOMENTE SE:
     a) A cabeça humana real do bebê estiver cruzando a linha ciano e penetrando na área avermelhada externa (head_is_outside_cyan_fence: true) -> limb_outside_part: "cabeca".
     b) Os pés/perninhas reais do bebê estiverem cruzando a linha ciano e penetrando na área avermelhada externa (feet_are_outside_cyan_fence: true) -> limb_outside_part: "pe_perna".
     c) Os bracinhos/mãos reais estiverem do lado de fora -> limb_outside_part: "mao_braco".
     d) O corpinho todo estiver fora ou a linha ciano cortar o meio do bebê -> is_baby_outside: true, limb_outside_part: "corpo".
   - Se o bebê estiver inteiro contido dentro da linha ciano (área azulada interna): "is_limb_outside": false, "is_baby_outside": false, "limb_outside_part": "nenhum".

4. POSTURA E RISCOS:
   - "is_standing": true SOMENTE se o bebê estiver em pé erguido nas pernas ou apoiado em pé na grade.
   - "is_lying_down": true se estiver deitado no colchão dormindo ou descansando.
   - "is_face_covered": true se o rostinho da criança estiver abafado por pano/travesseiro (risco de sufocamento).
   - "description": diagnóstico detalhado explicando a posição exata do bebê humano, confirmando se a cabeça e os membros estão dentro ou fora da demarcação ciano e diferenciando-o das almofadas.

Responda ESTRITAMENTE em JSON:
{
  "baby_detected": boolean,
  "is_blanket_or_empty": boolean,
  "head_center": { "x": float, "y": float },
  "feet_center": { "x": float, "y": float },
  "torso_center": { "x": float, "y": float },
  "head_is_outside_cyan_fence": boolean,
  "feet_are_outside_cyan_fence": boolean,
  "body_is_outside_cyan_fence": boolean,
  "is_limb_outside": boolean,
  "is_baby_outside": boolean,
  "limb_outside_part": "pe_perna" | "mao_braco" | "cabeca" | "corpo" | "nenhum",
  "is_standing": boolean,
  "is_lying_down": boolean,
  "adult_present": boolean,
  "adult_label": string,
  "adult_action": string,
  "is_face_covered": boolean,
  "baby_posture": string,
  "confidence": float,
  "description": string
}
PROMPT;
    }

    private function analyzeWithOpenAi(string $jpegBinary, string $candidateEvent, mixed $roi = null, bool $needsAnnotation = true): array
    {
        // Garante que a imagem tenha o cerco ciano anotado se ainda não tiver
        if ($needsAnnotation && !empty($roi)) {
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

    private function analyzeWithGemini(string $jpegBinary, string $candidateEvent, mixed $roi = null, bool $needsAnnotation = true): array
    {
        if ($needsAnnotation && !empty($roi)) {
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
            if ($tolerance == 0.0) {
                return $inside;
            }
            if ($tolerance > 0) {
                if ($inside) {
                    return true;
                }
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
                return false;
            }
            if ($tolerance < 0) {
                // Margem interna estrita: deve estar dentro E afastado da borda
                if (!$inside) return false;
                $minDist = 999999.0;
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
                        $dist = hypot($px - $projX, $py - $projY);
                        if ($dist < $minDist) $minDist = $dist;
                    }
                }
                return $minDist >= abs($tolerance);
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

        $headCenter = $json['head_center'] ?? null;
        $feetCenter = $json['feet_center'] ?? null;
        $torsoCenter = $json['torso_center'] ?? null;

        // ── VERIFICAÇÃO GEOMÉTRICA DE ALTA PRECISÃO (VALIDAÇÃO DUPLA CONTRA FALSOS POSITIVOS E FALSOS NEGATIVOS) ──
        if (is_array($roi) && !empty($roi) && !empty($json['baby_detected'])) {
            // 1. Validação da Cabeça
            if (is_array($headCenter) && isset($headCenter['x'], $headCenter['y'])) {
                $hx = (float) $headCenter['x'];
                $hy = (float) $headCenter['y'];
                // Tolerância de 2.5% para o interior (evita falsos alertas quando o bebê apenas encosta no limite interno)
                $headInFence = $this->isPointInRoi($hx, $hy, $roi, 2.5);

                if ($headInFence) {
                    // Cabeça matematicamente DENTRO do cerco!
                    // Se o modelo confundiu almofada/protetor externo com a cabeça do bebê:
                    if ($normPart === 'cabeca') {
                        $isLimbOutside = false;
                        $normPart = 'nenhum';
                    }
                } else {
                    // Cabeça matematicamente FORA do cerco (ou cortada pela linha)
                    // Verifica se está estritamente fora além da borda externa
                    $isStrictlyOutside = !$this->isPointInRoi($hx, $hy, $roi, -1.0);
                    if ($isStrictlyOutside || !empty($json['head_is_outside_cyan_fence'])) {
                        $isLimbOutside = true;
                        $normPart = 'cabeca';
                        if (empty($desc) || stripos($desc, 'seguro') !== false) {
                            $desc = '🚨 Cabeça do bebê passou para fora da área segura demarcada no cerco!';
                        }
                    }
                }
            }

            // 2. Validação dos Pés
            if (is_array($feetCenter) && isset($feetCenter['x'], $feetCenter['y'])) {
                $fx = (float) $feetCenter['x'];
                $fy = (float) $feetCenter['y'];
                $feetInFence = $this->isPointInRoi($fx, $fy, $roi, 2.5);

                if ($feetInFence) {
                    if ($normPart === 'pe_perna') {
                        $isLimbOutside = false;
                        $normPart = 'nenhum';
                    }
                } else {
                    $isStrictlyOutside = !$this->isPointInRoi($fx, $fy, $roi, -1.0);
                    if ($isStrictlyOutside || !empty($json['feet_are_outside_cyan_fence'])) {
                        $isLimbOutside = true;
                        if ($normPart === 'nenhum') $normPart = 'pe_perna';
                        if (empty($desc) || stripos($desc, 'seguro') !== false) {
                            $desc = '🚨 Pé ou perna do bebê passou para fora da área segura demarcada no cerco!';
                        }
                    }
                }
            }

            // 3. Validação do Tronco / Centro do Bebê
            if (is_array($torsoCenter) && isset($torsoCenter['x'], $torsoCenter['y'])) {
                $tx = (float) $torsoCenter['x'];
                $ty = (float) $torsoCenter['y'];
                $torsoInFence = $this->isPointInRoi($tx, $ty, $roi, 1.5);
                if (!$torsoInFence) {
                    $isBabyOutside = true;
                    $isLimbOutside = true;
                    $normPart = 'corpo';
                    $desc = '🚨 Bebê com o corpo fora da área segura demarcada!';
                }
            }
        }

        // Se estiver seguro dentro do cerco
        if (!$isLimbOutside && !$isBabyOutside) {
            $normPart = 'nenhum';
            if ($desc === '' || stripos($desc, 'fora') !== false) {
                $desc = 'Bebê seguro dentro da área demarcada do berço (confirmado por geometria anatômica).';
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
