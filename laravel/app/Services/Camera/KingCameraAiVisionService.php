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
Você é o sistema especialista de visão computacional da King Câmera para monitoramento pediátrico em berço.
Analise este quadro de vídeo de câmera de segurança (16:9).
As coordenadas x e y vão de 0% a 100%:
- x vai de 0% (extremo esquerdo) a 100% (extremo direito).
- y vai de 0% (topo) a 100% (base inferior).

Tarefas de Detecção com Máxima Precisão:
1. Localize o bebê humano:
   - "head_box": [x_min, y_min, x_max, y_max] onde a cabeça/cabelo do bebê está localizada.
   - "legs_feet_box": [x_min, y_min, x_max, y_max] onde as pernas, joelhos, tornozelos e pezinhos do bebê estão localizados.
   - "baby_total_bounding_box": [x_min, y_min, x_max, y_max] englobando todo o corpinho do bebê.
2. Identifique a postura:
   - "is_standing": true SOMENTE se o bebê estiver em pé erguido nas pernas ou apoiado em pé na grade.
   - "is_lying_down": true se o bebê estiver deitado dormindo ou repousando no colchão.
   - "baby_posture": "sleeping_back" | "sleeping_stomach" | "sleeping_side" | "awake_moving" | "standing" | "empty".
3. Outros fatores de risco:
   - "is_blanket_or_empty": true se não houver bebê humano no berço (apenas lençol/cobertor).
   - "adult_present": true se houver pai/mãe ou cuidador adulto presente.
   - "adult_label": "Pai/Mãe".
   - "adult_action": ação do adulto.
   - "is_face_covered": true se o rostinho da criança estiver obstruído por pano/travesseiro (risco de sufocamento).
   - "description": breve diagnóstico da cena em português.

Responda ESTRITAMENTE em JSON:
{
  "head_box": [number, number, number, number],
  "legs_feet_box": [number, number, number, number],
  "baby_total_bounding_box": [number, number, number, number],
  "is_standing": boolean,
  "is_lying_down": boolean,
  "is_blanket_or_empty": boolean,
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

    private function analyzeWithOpenAi(string $jpegBinary, string $candidateEvent, mixed $roi = null): array
    {
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
                'max_tokens' => 300,
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

        // Se o ROI do cerco foi fornecido, efetua verificação geométrica rigorosa dos pontos anatômicos
        if (is_array($roi) && !empty($roi)) {
            $headBox = $json['head_box'] ?? null;
            $legsBox = $json['legs_feet_box'] ?? null;
            $totalBox = $json['baby_total_bounding_box'] ?? null;

            // 1. Testa as extremidades das pernas e pés (cantos e centro dos pés com margem zero/estrita)
            if (is_array($legsBox) && count($legsBox) >= 4) {
                [$lx1, $ly1, $lx2, $ly2] = $legsBox;
                $feetPoints = [
                    [(float)$lx1, (float)$ly1],
                    [(float)$lx2, (float)$ly1],
                    [(float)$lx1, (float)$ly2],
                    [(float)$lx2, (float)$ly2],
                    [(float)(($lx1 + $lx2) / 2), (float)(($ly1 + $ly2) / 2)],
                    [(float)$lx2, (float)(($ly1 + $ly2) / 2)],
                ];
                $feetOutside = 0;
                foreach ($feetPoints as [$fpx, $fpy]) {
                    if (!$this->isPointInRoi($fpx, $fpy, $roi, 0.5)) {
                        $feetOutside++;
                    }
                }
                if ($feetOutside >= 1) {
                    $isLimbOutside = true;
                    if ($normPart === 'nenhum' || empty($normPart)) {
                        $normPart = 'pe_perna';
                    }
                    if (empty($desc) || stripos($desc, 'seguro') !== false) {
                        $desc = 'Pé ou perna do bebê passou para fora da linha demarcada do berço!';
                    }
                }
            }

            // 2. Testa a cabeça (usando o centro e bordas)
            if (is_array($headBox) && count($headBox) >= 4) {
                [$hx1, $hy1, $hx2, $hy2] = $headBox;
                $headPoints = [
                    [(float)(($hx1 + $hx2) / 2), (float)(($hy1 + $hy2) / 2)],
                    [(float)$hx1, (float)(($hy1 + $hy2) / 2)],
                    [(float)$hx2, (float)(($hy1 + $hy2) / 2)],
                ];
                $headOutside = 0;
                foreach ($headPoints as [$hpx, $hpy]) {
                    if (!$this->isPointInRoi($hpx, $hpy, $roi, 0.5)) {
                        $headOutside++;
                    }
                }
                if ($headOutside >= 1) {
                    $isLimbOutside = true;
                    if ($normPart === 'nenhum' || empty($normPart)) {
                        $normPart = 'cabeca';
                    }
                    if (empty($desc) || stripos($desc, 'seguro') !== false) {
                        $desc = 'Cabeça do bebê passou para fora da demarcação do berço!';
                    }
                }
            }

            // 3. Testa se alguma extremidade do corpo ou o bebê por inteiro saiu do cerco
            if (is_array($totalBox) && count($totalBox) >= 4) {
                [$bx1, $by1, $bx2, $by2] = $totalBox;
                $centerBx = (float)(($bx1 + $bx2) / 2);
                $centerBy = (float)(($by1 + $by2) / 2);

                if (!$this->isPointInRoi($centerBx, $centerBy, $roi, 0.5)) {
                    $isBabyOutside = true;
                    $isLimbOutside = true;
                    $normPart = 'corpo';
                    $desc = 'Bebê saiu da área segura demarcada no cerco!';
                } else {
                    // Centro dentro, mas testa se alguma extremidade (pés, mãos, tronco) está fora
                    $bodyExtremities = [
                        [(float)$bx1, (float)$centerBy],
                        [(float)$bx2, (float)$centerBy],
                        [(float)$centerBx, (float)$by1],
                        [(float)$centerBx, (float)$by2],
                        [(float)$bx2, (float)$by2],
                        [(float)$bx1, (float)$by2],
                    ];
                    $extremitiesOutside = 0;
                    foreach ($bodyExtremities as [$epx, $epy]) {
                        if (!$this->isPointInRoi($epx, $epy, $roi, 0.5)) {
                            $extremitiesOutside++;
                        }
                    }
                    if ($extremitiesOutside >= 1) {
                        $isLimbOutside = true;
                        if ($normPart === 'nenhum' || empty($normPart)) {
                            $normPart = 'membro';
                        }
                        if (empty($desc) || stripos($desc, 'seguro') !== false) {
                            $desc = 'Extremidade ou membro do bebê passou para fora da cerca!';
                        }
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
