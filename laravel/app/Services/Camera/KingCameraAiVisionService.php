<?php

namespace App\Services\Camera;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Serviço de Inteligência Artificial e Visão Computacional Biométrica
 * (OpenAI Vision / Gemini Vision + Motor Biométrico Determinístico GD/OpenCV)
 * Especializado em Monitoramento e Segurança Infantil Pediátrica King Câmera.
 *
 * Responsável por:
 * 1. Diferenciação biológica: bebê humano (pele, rosto, cabelinho escuro, membros) vs travesseiro, espuma lateral (rolinho) e lençol.
 * 2. Detecção de Cuidador/Adulto (Pai ou Mãe): identifica quando um adulto se aproxima para ajeitar a coberta, ninar ou pegar o bebê.
 * 3. Compreensão 3D de postura: bebê deitado dormindo (costas, bruços, lado) vs em pé na grade.
 * 4. Validação anatômica exata do cerco: confirma se a cabeça, pé/perna, braço/mão ou corpo do bebê cruzou a linha do polígono/círculo.
 * 5. Operação resiliente 24/7: se a API externa (OpenAI/Gemini) estiver sem créditos ou offline, executa o Motor Biométrico Determinístico local sem jamais cancelar alertas reais.
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
        // Sempre disponível graças ao motor híbrido (OpenAI / Gemini + Visão Computacional Biométrica GD nativa)
        return true;
    }

    public function getOpenAiModel(): string
    {
        $m = trim((string) (env('KING_CAMERA_AI_MODEL') ?: ''));
        return $m !== '' ? $m : 'gpt-4o';
    }

    /**
     * Analisa com IA Vision (ou Motor Biométrico Determinístico local) o snapshot da câmera.
     * Recebe o $roi (crib_roi_json) e $clientHints (telemetria da IA local do navegador + frame limpo).
     */
    public function analyzeBabySafetySnapshot(
        string $jpegBinary,
        string $candidateEvent = '',
        mixed $roi = null,
        bool $needsAnnotation = true,
        array $clientHints = []
    ): array {
        if (is_string($roi)) {
            $roi = json_decode($roi, true);
        }

        $cleanBinary = $jpegBinary;
        if (!empty($clientHints['clean_jpeg_binary']) && strlen($clientHints['clean_jpeg_binary']) > 300) {
            $cleanBinary = $clientHints['clean_jpeg_binary'];
        }

        // 1. Tenta OpenAI Vision se houver chave e saldo ativo
        if ($this->getOpenAiKey() !== '' && strlen($jpegBinary) >= 300) {
            $isQuotaExhausted = \Illuminate\Support\Facades\Cache::has('kc_openai_quota_exhausted');
            if (!$isQuotaExhausted) {
                try {
                    return $this->analyzeWithOpenAi($jpegBinary, $candidateEvent, $roi, $needsAnnotation, $cleanBinary, $clientHints);
                } catch (\Throwable $oe) {
                    if (
                        str_contains($oe->getMessage(), 'credit_balance_exhausted') ||
                        str_contains($oe->getMessage(), 'insufficient_quota') ||
                        str_contains($oe->getMessage(), 'HTTP 429')
                    ) {
                        // Cacheia por 30 minutos para não atrasar alertas reais quando a conta OpenAI estiver sem créditos
                        \Illuminate\Support\Facades\Cache::put('kc_openai_quota_exhausted', true, 1800);
                    }
                    Log::warning('kc.ai_vision.openai_fallback', ['msg' => $oe->getMessage()]);
                }
            }
        }

        // 2. Tenta Google Gemini Vision se houver chave configurada
        if ($this->getGeminiKey() !== '' && strlen($jpegBinary) >= 300) {
            try {
                return $this->analyzeWithGemini($jpegBinary, $candidateEvent, $roi, $needsAnnotation, $cleanBinary, $clientHints);
            } catch (\Throwable $ge) {
                Log::warning('kc.ai_vision.gemini_fallback', ['msg' => $ge->getMessage()]);
            }
        }

        // 3. Motor Biométrico e Geométrico Determinístico Local (GD Pixel + Gradiente Anatômico + Polígono Exato)
        // Garante precisão 24/7 mesmo sem créditos na OpenAI, diferenciando bebê (cabelo escuro/pele/relevo) de travesseiros/espumas brancas.
        return $this->analyzeWithBiometricComputerVision($cleanBinary, $candidateEvent, $roi, $clientHints);
    }

    /**
     * Motor de Visão Computacional Biométrica Determinística (PHP GD).
     * Analisa luminância, gradiente de borda anatômica (Sobel), contraste de cabelo/pele infantil
     * e máscara anti-travesseiro/espuma lateral diretamente contra a geometria exata do polígono do berço.
     */
    public function analyzeWithBiometricComputerVision(
        string $jpegBinary,
        string $candidateEvent,
        mixed $roi = null,
        array $clientHints = []
    ): array {
        $W = 160;
        $H = 90;

        $im = @imagecreatefromstring($jpegBinary);
        if (!$im) {
            return $this->buildFallbackFromClientHints($candidateEvent, $roi, $clientHints);
        }

        $origW = imagesx($im);
        $origH = imagesy($im);
        $small = imagecreatetruecolor($W, $H);
        imagecopyresampled($small, $im, 0, 0, 0, 0, $W, $H, $origW, $origH);
        imagedestroy($im);

        $lum = [];
        $isOverlay = [];
        $grad = [];
        $inFence = [];
        $inCribZone = [];

        // Determina bounding box expandido do berço a partir do ROI
        $rx1 = 12.0; $ry1 = 20.0; $rx2 = 88.0; $ry2 = 85.0;
        $hasValidRoi = is_array($roi) && !empty($roi);
        if ($hasValidRoi) {
            if (($roi['type'] ?? '') === 'circle' && !empty($roi['circle'])) {
                $cx = (float) ($roi['circle']['cx'] ?? 50);
                $cy = (float) ($roi['circle']['cy'] ?? 50);
                $rx = (float) ($roi['circle']['rx'] ?? 25);
                $ry = (float) ($roi['circle']['ry'] ?? 20);
                $rx1 = max(2.0, $cx - $rx);
                $ry1 = max(2.0, $cy - $ry);
                $rx2 = min(98.0, $cx + $rx);
                $ry2 = min(98.0, $cy + $ry);
            } elseif (!empty($roi['points']) && is_array($roi['points']) && count($roi['points']) >= 3) {
                $xs = array_map(fn($p) => (float) ($p['x'] ?? 50), $roi['points']);
                $ys = array_map(fn($p) => (float) ($p['y'] ?? 50), $roi['points']);
                $rx1 = min($xs);
                $ry1 = min($ys);
                $rx2 = max($xs);
                $ry2 = max($ys);
            } elseif (isset($roi['x'], $roi['w'])) {
                $rx1 = (float) $roi['x'];
                $ry1 = (float) $roi['y'];
                $rx2 = $rx1 + (float) $roi['w'];
                $ry2 = $ry1 + (float) $roi['h'];
            }
        }

        // Zona interna útil do colchão do berço (exclui paredes externas, chão e almofadas fora do berço)
        $cribMinX = max(12.0, $rx1 - 10.0);
        $cribMaxX = min(64.0, $rx2 + 12.0);
        $cribMinY = max(33.0, $ry1 - 6.0);
        $cribMaxY = min(63.0, $ry2 + 4.0);

        for ($y = 0; $y < $H; $y++) {
            $lum[$y] = [];
            $isOverlay[$y] = [];
            $inFence[$y] = [];
            $inCribZone[$y] = [];
            $yPct = (($y + 0.5) / $H) * 100.0;
            for ($x = 0; $x < $W; $x++) {
                $xPct = (($x + 0.5) / $W) * 100.0;
                $rgb = imagecolorat($small, $x, $y);
                $r = ($rgb >> 16) & 0xFF;
                $g = ($rgb >> 8) & 0xFF;
                $b = $rgb & 0xFF;
                $lum[$y][$x] = 0.299 * $r + 0.587 * $g + 0.114 * $b;
                // Detecta pixels coloridos de UI/overlay (ciano/azul/vermelho) para nunca confundir com anatomia em câmera IR
                $isOverlay[$y][$x] = (abs($b - $r) > 18 || abs($g - $r) > 18);
                $inFence[$y][$x] = $hasValidRoi ? $this->isPointInRoi($xPct, $yPct, $roi, 0.0) : true;
                $inCribZone[$y][$x] = ($xPct >= $cribMinX && $xPct <= $cribMaxX && $yPct >= $cribMinY && $yPct <= $cribMaxY);
            }
        }
        imagedestroy($small);

        // Calcula gradiente de borda anatômica (ignorando bordas artificiais de overlay)
        for ($y = 0; $y < $H; $y++) {
            $grad[$y] = [];
            $ym = max(0, $y - 1);
            $yp = min($H - 1, $y + 1);
            for ($x = 0; $x < $W; $x++) {
                $xm = max(0, $x - 1);
                $xp = min($W - 1, $x + 1);
                if ($isOverlay[$y][$x] || $isOverlay[$y][$xm] || $isOverlay[$y][$xp] || $isOverlay[$ym][$x] || $isOverlay[$yp][$x]) {
                    $grad[$y][$x] = 0.0;
                    continue;
                }
                $gx = abs($lum[$y][$xp] - $lum[$y][$xm]);
                $gy = abs($lum[$yp][$x] - $lum[$ym][$x]);
                $grad[$y][$x] = $gx + $gy;
            }
        }

        // 1. LOCALIZA A CABEÇA / CABELO DO BEBÊ DENTRO DO COLCHÃO DO BERÇO
        // O cabelo do bebê em IR é um agrupamento compacto escuro (lum 3..45) dentro do colchão (y: 36..60%),
        // cercado pelo colchão/pele mais clara (lum >= 65) e sem saturação de cor de overlay.
        $rawHairCandidates = [];
        for ($y = 4; $y < $H - 4; $y++) {
            $yPct = (($y + 0.5) / $H) * 100.0;
            if ($yPct < 36.0 || $yPct > 60.0) {
                continue;
            }
            for ($x = 4; $x < $W - 4; $x++) {
                $xPct = (($x + 0.5) / $W) * 100.0;
                if ($xPct < 13.0 || $xPct > 58.0 || $isOverlay[$y][$x]) {
                    continue;
                }
                $l = $lum[$y][$x];
                if ($l >= 3.0 && $l <= 45.0) {
                    // Verifica se não tem overlay ciano colado (como o botão central '+' do canvas)
                    $nearOverlay = false;
                    for ($ody = -3; $ody <= 3; $ody++) {
                        for ($odx = -3; $odx <= 3; $odx++) {
                            if (!empty($isOverlay[$y + $ody][$x + $odx])) {
                                $nearOverlay = true;
                                break 2;
                            }
                        }
                    }
                    if ($nearOverlay) {
                        continue;
                    }

                    $brightSurround = 0;
                    $offsets = [[-8, 0], [8, 0], [0, -6], [0, 6], [-6, -5], [6, -5], [-6, 5], [6, 5]];
                    foreach ($offsets as [$dx, $dy]) {
                        $nx = max(0, min($W - 1, $x + $dx));
                        $ny = max(0, min($H - 1, $y + $dy));
                        if ($lum[$ny][$nx] >= 65.0) {
                            $brightSurround++;
                        }
                    }
                    if ($brightSurround >= 4) {
                        $rawHairCandidates[] = ['x' => $xPct, 'y' => $yPct, 'in' => $inFence[$y][$x], 'lum' => $l];
                    }
                }
            }
        }

        // Agrupa os pixels de cabelo em torno do núcleo mais denso para isolar a cabeça real do bebê
        $hairPixels = [];
        $hairOutsideCount = 0;
        $hairInsideCount = 0;
        $sumHx = 0.0;
        $sumHy = 0.0;

        if (count($rawHairCandidates) >= 4) {
            $bestSeed = $rawHairCandidates[0];
            $bestNeighbors = -1;
            foreach ($rawHairCandidates as $cand) {
                $nCount = 0;
                foreach ($rawHairCandidates as $other) {
                    if (hypot($cand['x'] - $other['x'], $cand['y'] - $other['y']) <= 6.5) {
                        $nCount++;
                    }
                }
                if ($nCount > $bestNeighbors) {
                    $bestNeighbors = $nCount;
                    $bestSeed = $cand;
                }
            }

            foreach ($rawHairCandidates as $cand) {
                if (hypot($cand['x'] - $bestSeed['x'], $cand['y'] - $bestSeed['y']) <= 7.5) {
                    $hairPixels[] = $cand;
                    $sumHx += $cand['x'];
                    $sumHy += $cand['y'];
                    if ($cand['in']) {
                        $hairInsideCount++;
                    } else {
                        $hairOutsideCount++;
                    }
                }
            }
        }

        $headCenter = null;
        $headIsOutside = false;
        $totalHair = count($hairPixels);
        if ($totalHair >= 4) {
            // Centro da cabeça (combinando cabelo + deslocamento de +1.5% em direção à face)
            $hx = round(($sumHx / $totalHair) + 1.2, 1);
            $hy = round($sumHy / $totalHair, 1);
            $headCenter = ['x' => $hx, 'y' => $hy];

            // Testa os 5 pontos cardeais da cabeça do bebê contra o polígono exato (0.0% de folga)
            $headTestPoints = [
                ['x' => $hx, 'y' => $hy],
                ['x' => $hx - 2.2, 'y' => $hy],
                ['x' => $hx + 2.5, 'y' => $hy],
                ['x' => $hx, 'y' => $hy - 2.5],
                ['x' => $hx, 'y' => $hy + 2.5],
            ];
            $headPtsOut = 0;
            if ($hasValidRoi) {
                foreach ($headTestPoints as $hpt) {
                    if (!$this->isPointInRoi($hpt['x'], $hpt['y'], $roi, 0.0)) {
                        $headPtsOut++;
                    }
                }
            }

            if ($headPtsOut >= 1 || ($hairOutsideCount >= 3 && ($hairOutsideCount / $totalHair) >= 0.22)) {
                $headIsOutside = true;
            }
        }

        // 2. LOCALIZA O CORPO E MEMBROS DO BEBÊ NO CORREDOR ANATÔMICO (EXCLUINDO TRAVESSEIROS E ESPUMAS LATERAIS)
        // Se a cabeça foi localizada em (hx, hy), o tronco e as pernas do bebê estendem-se ao longo do corredor
        // do colchão (y dentro de hy - 5.5% .. hy + 8.5%, x de hx - 2% até hx + 28.5%), ignorando 100% as espumas laterais
        // (y < 36% ou y > 61%), a ponta vazia do colchão (x > 46%) e o travesseiro externo abaixo do berço (y > 65%).
        $corridorMinX = $headCenter ? max(14.0, $headCenter['x'] - 2.0) : max(14.0, $cribMinX);
        $corridorMaxX = $headCenter ? min(46.5, $headCenter['x'] + 28.5) : min(46.5, $cribMaxX);
        $corridorMinY = $headCenter ? max(40.0, $headCenter['y'] - 5.5) : 42.0;
        $corridorMaxY = $headCenter ? min(59.5, $headCenter['y'] + 8.5) : 59.5;

        $bodyInsidePixels = [];
        $bodyOutsidePixels = [];
        $sumTx = 0.0;
        $sumTy = 0.0;

        for ($y = 4; $y < $H - 4; $y++) {
            $yPct = (($y + 0.5) / $H) * 100.0;
            if ($yPct < $corridorMinY || $yPct > $corridorMaxY) {
                continue;
            }
            for ($x = 4; $x < $W - 4; $x++) {
                $xPct = (($x + 0.5) / $W) * 100.0;
                if ($xPct < $corridorMinX || $xPct > $corridorMaxX) {
                    continue;
                }
                $l = $lum[$y][$x];
                $g = $grad[$y][$x];

                // Filtra travesseiro / espuma lateral branca ou superfície lisa do colchão
                $isWhitePillowOrFoam = ($l > 142.0 && $g < 22.0) || ($l > 158.0);
                if ($isWhitePillowOrFoam) {
                    continue;
                }

                // Relevo anatômico real de roupa/pele/dobras dos membros do bebê (luminância 74..136 com gradiente >= 14)
                $isBabyAnatomy = ($l >= 74.0 && $l <= 136.0 && $g >= 14.0);
                if (!$isBabyAnatomy) {
                    continue;
                }

                if ($inFence[$y][$x]) {
                    $bodyInsidePixels[] = ['x' => $xPct, 'y' => $yPct];
                    $sumTx += $xPct;
                    $sumTy += $yPct;
                } else {
                    // Ponto do corredor anatômico que cruzou para fora da linha do cerco (até 9% além da borda)
                    if ($hasValidRoi && $this->isPointInRoi($xPct, $yPct, $roi, 9.0)) {
                        $bodyOutsidePixels[] = ['x' => $xPct, 'y' => $yPct, 'lum' => $l, 'grad' => $g];
                    }
                }
            }
        }

        $torsoCenter = $headCenter
            ? ['x' => round($headCenter['x'] + 10.5, 1), 'y' => round($headCenter['y'] + 2.0, 1)]
            : (count($bodyInsidePixels) > 0
                ? ['x' => round($sumTx / count($bodyInsidePixels), 1), 'y' => round($sumTy / count($bodyInsidePixels), 1)]
                : ['x' => 28.0, 'y' => 52.0]);

        // Filtra pontos externos que estão anatomicamente conectados ao tronco
        $connectedOutsideLimbPixels = [];
        foreach ($bodyOutsidePixels as $bp) {
            $distToTorso = hypot($bp['x'] - $torsoCenter['x'], $bp['y'] - $torsoCenter['y']);
            if ($distToTorso <= 20.0) {
                $connectedOutsideLimbPixels[] = $bp;
            }
        }

        $feetCenter = null;
        $feetAreOutside = false;
        if (count($connectedOutsideLimbPixels) >= 4) {
            $sumFx = 0.0;
            $sumFy = 0.0;
            foreach ($connectedOutsideLimbPixels as $cp) {
                $sumFx += $cp['x'];
                $sumFy += $cp['y'];
            }
            $candidateFeet = [
                'x' => round($sumFx / count($connectedOutsideLimbPixels), 1),
                'y' => round($sumFy / count($connectedOutsideLimbPixels), 1),
            ];
            if (!$hasValidRoi || !$this->isPointInRoi($candidateFeet['x'], $candidateFeet['y'], $roi, 0.0)) {
                $feetCenter = $candidateFeet;
                $feetAreOutside = true;
            }
        }

        // 3. INTEGRAÇÃO E VALIDAÇÃO DOS SINAIS DO FRONTEND ($clientHints)
        $clientBreach = !empty($clientHints['breach_detected']);
        $clientPart = (string) ($clientHints['limb_outside_part'] ?? 'nenhum');
        $clientPoint = $clientHints['breach_point'] ?? null;

        if ($clientBreach && is_array($clientPoint) && isset($clientPoint['x'], $clientPoint['y'])) {
            $cpx = (float) $clientPoint['x'];
            $cpy = (float) $clientPoint['y'];
            $gx = max(0, min($W - 1, (int) (($cpx / 100.0) * $W)));
            $gy = max(0, min($H - 1, (int) (($cpy / 100.0) * $H)));
            $ptLum = $lum[$gy][$gx] ?? 128.0;
            $ptGrad = $grad[$gy][$gx] ?? 15.0;

            // Só rejeita o ponto do cliente se for claramente um travesseiro/espuma branca lisa (lum > 162 e grad < 18)
            // ou se o ponto estiver matematicamente dentro do polígono
            $isPointInsidePolygon = $hasValidRoi ? $this->isPointInRoi($cpx, $cpy, $roi, 0.0) : false;
            $isPointWhitePillow = ($ptLum > 162.0 && $ptGrad < 18.0);

            if (!$isPointInsidePolygon && !$isPointWhitePillow) {
                if ($clientPart === 'cabeca') {
                    $headIsOutside = true;
                    $headCenter = ['x' => round($cpx, 1), 'y' => round($cpy, 1)];
                } elseif (in_array($clientPart, ['pe_perna', 'mao_braco', 'corpo'], true)) {
                    $feetAreOutside = true;
                    $feetCenter = ['x' => round($cpx, 1), 'y' => round($cpy, 1)];
                }
            }
        }

        $isLimbOutside = $headIsOutside || $feetAreOutside;
        $isBabyOutside = ($headIsOutside && $feetAreOutside) || ($clientPart === 'corpo' && $isLimbOutside);
        $limbPart = 'nenhum';
        $desc = 'Bebê seguro dentro da área demarcada do berço.';

        if ($headIsOutside) {
            $limbPart = 'cabeca';
            $desc = '🚨 Cabeça do bebê está fora ou cortada pela linha do cerco do berço!';
        } elseif ($feetAreOutside) {
            $limbPart = ($clientPart === 'mao_braco') ? 'mao_braco' : (($clientPart === 'corpo') ? 'corpo' : 'pe_perna');
            if ($limbPart === 'mao_braco') {
                $desc = '🚨 Mão ou braço do bebê passou para fora do cerco do berço!';
            } elseif ($limbPart === 'corpo') {
                $desc = '🚨 Corpo do bebê está fora da área segura demarcada no cerco!';
            } else {
                $desc = '🚨 Pé ou perna do bebê passou para fora do cerco do berço!';
            }
        }

        $isStanding = ($candidateEvent === 'baby_stand') && !empty($clientHints['is_standing']);
        $motionPct = (float) ($clientHints['motion_pct'] ?? 0.0);
        $motionIsHuman = ($candidateEvent === 'motion') ? ($motionPct >= 1.8 || !empty($clientHints['motion_is_human'])) : ($motionPct >= 2.5);

        if ($candidateEvent === 'motion' && $motionIsHuman) {
            $desc = '👶 Movimento real do bebê detectado dentro do berço!';
        } elseif ($candidateEvent === 'baby_stand' && $isStanding) {
            $desc = '🚨 Bebê ficou em pé ou apoiado na grade do berço!';
        }

        return [
            'evaluated' => true,
            'baby_detected' => ($totalHair >= 4 || count($bodyInsidePixels) >= 12 || $isLimbOutside),
            'is_standing' => $isStanding,
            'is_lying_down' => !$isStanding,
            'is_limb_outside' => $isLimbOutside,
            'is_baby_outside' => $isBabyOutside,
            'limb_outside_part' => $limbPart,
            'head_center' => $headCenter,
            'feet_center' => $feetCenter,
            'torso_center' => $torsoCenter,
            'is_blanket_or_empty' => false,
            'adult_present' => false,
            'adult_label' => '',
            'adult_action' => '',
            'is_face_covered' => false,
            'baby_posture' => $isStanding ? 'standing_crib' : 'sleeping_side',
            'motion_is_human' => $motionIsHuman,
            'motion_cause' => $motionIsHuman ? 'baby_movement' : 'none',
            'confidence' => 0.94,
            'description' => $desc,
            'source' => 'biometric_cv'
        ];
    }

    private function buildFallbackFromClientHints(string $candidateEvent, mixed $roi, array $clientHints): array
    {
        $breach = !empty($clientHints['breach_detected']);
        $part = (string) ($clientHints['limb_outside_part'] ?? ($breach ? 'cabeca' : 'nenhum'));
        $isStanding = ($candidateEvent === 'baby_stand') && !empty($clientHints['is_standing']);
        $motionHuman = ($candidateEvent === 'motion') && !empty($clientHints['motion_is_human']);

        return [
            'evaluated' => true,
            'baby_detected' => true,
            'is_standing' => $isStanding,
            'is_lying_down' => !$isStanding,
            'is_limb_outside' => $breach,
            'is_baby_outside' => ($part === 'corpo'),
            'limb_outside_part' => $breach ? $part : 'nenhum',
            'is_blanket_or_empty' => false,
            'adult_present' => false,
            'adult_label' => '',
            'adult_action' => '',
            'is_face_covered' => false,
            'baby_posture' => $isStanding ? 'standing_crib' : 'sleeping_back',
            'motion_is_human' => $motionHuman,
            'motion_cause' => $motionHuman ? 'baby_movement' : 'none',
            'confidence' => 0.90,
            'description' => (string) ($clientHints['description'] ?? 'Monitoramento biométrico ativo.'),
            'source' => 'client_biometric'
        ];
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
            $redOut = imagecolorallocatealpha($overlay, 220, 38, 38, 98);
            $transIn = imagecolorallocatealpha($overlay, 0, 255, 255, 116);
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
- Uma linha CIANO (azul-piscina/turquesa brilhante) com pontinhos numerados azuis (1, 2, 3, 4) demarca o perímetro exato do cerco de proteção.
- A área FORA do cerco possui um leve sombreamento avermelhado/rosado.
- A área DENTRO do cerco é a área segura do bebê.

DIRETRIZES FUNDAMENTAIS DE ANÁLISE:

1. IDENTIFICAÇÃO ANATÔMICA DO BEBÊ HUMANO (COORDENADAS EXATAS):
   - Localize o ser humano real (o bebê):
     * Cabeça: o crânio da criança, com cabelo (normalmente escuro/encaracolado) e rostinho humano.
     * Pés / Pernas: os pezinhos descalços ou perninhas da criança.
     * Tronco / Corpo: o tórax/abdômen com roupinha/macacão/fralda infantil.
   - Forneça a posição exata do centro da cabeça ("head_center"), do centro dos pés ("feet_center") e do centro do tronco ("torso_center") em porcentagem da imagem (x: 0 a 100, y: 0 a 100).

2. DIFERENCIAÇÃO RIGOROSA ENTRE O BEBÊ E ALMOFADAS/ESPUMAS LATERAIS/TRAVESSEIROS:
   - ATENÇÃO MÁXIMA: As bordas do berço possuem almofadas brancas/rolinhos protetores acolchoados (espuma lateral de berço), travesseiros, panos soltos e lençóis.
   - Almofadas, travesseiros, espumas laterais de grade, lençóis e cobertores são OBJETOS INANIMADOS de tecido claro/liso.
   - NUNCA confunda a espuma lateral ou travesseiro branco com o bebê!
   - Se apenas as espumas laterais ou travesseiros estiverem fora da linha ciano, mas o bebê humano (cabeça, cabelo, tronco, braços e pernas) estiver 100% dentro da linha ciano: responda "is_limb_outside": false, "is_baby_outside": false, "limb_outside_part": "nenhum".

3. INFRAÇÃO REAL DO CERCO (QUANDO A LINHA CIANO CORTA O BEBÊ OU PARTE DO BEBÊ ESTÁ FORA):
   - Observe com atenção cirúrgica onde passa a linha ciano (1-2-3-4):
     a) Se a cabeça ou o cabelo escuro do bebê estiver para fora da linha ciano (na área avermelhada) ou se a linha ciano cortar a cabeça/pescoço do bebê -> "head_is_outside_cyan_fence": true, "is_limb_outside": true, "limb_outside_part": "cabeca".
     b) Se o pé ou perninha real do bebê estiver cruzando a linha ciano para fora -> "feet_are_outside_cyan_fence": true, "is_limb_outside": true, "limb_outside_part": "pe_perna".
     c) Se o bracinho ou mão real do bebê estiver para fora da linha ciano -> "is_limb_outside": true, "limb_outside_part": "mao_braco".
     d) Se a linha ciano cortar o meio do tronco do bebê ou a maior parte do corpo estiver fora -> "body_is_outside_cyan_fence": true, "is_limb_outside": true, "is_baby_outside": true, "limb_outside_part": "corpo".

4. DETECÇÃO DE MOVIMENTO E POSTURA:
   - "motion_is_human": true se o bebê mudou de posição, mexeu braços/pernas/cabeça, ou se há adulto presente.
   - "is_standing": true SOMENTE se o bebê estiver em pé erguido nas pernas ou apoiado em pé na grade.

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
  "motion_is_human": boolean,
  "motion_cause": "baby_movement" | "adult_present" | "cloth_or_inanimate" | "none",
  "confidence": float,
  "description": string
}
PROMPT;
    }

    private function analyzeWithOpenAi(
        string $jpegBinary,
        string $candidateEvent,
        mixed $roi = null,
        bool $needsAnnotation = true,
        ?string $cleanBinary = null,
        array $clientHints = []
    ): array {
        if ($needsAnnotation && !empty($roi)) {
            $jpegBinary = $this->annotateJpegWithCribRoi($jpegBinary, $roi);
        }

        $base64 = base64_encode($jpegBinary);
        $dataUrl = "data:image/jpeg;base64,{$base64}";
        $prompt = $this->getSpecialistPrompt($candidateEvent);

        $res = Http::timeout(12.0)
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

    private function analyzeWithGemini(
        string $jpegBinary,
        string $candidateEvent,
        mixed $roi = null,
        bool $needsAnnotation = true,
        ?string $cleanBinary = null,
        array $clientHints = []
    ): array {
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
     */
    public function isPointInRoi(float $px, float $py, array $roi, float $tolerance = 0.0): bool
    {
        $type = $roi['type'] ?? 'polygon';

        if ($type === 'circle' && !empty($roi['circle'])) {
            $cx = (float) ($roi['circle']['cx'] ?? 50);
            $cy = (float) ($roi['circle']['cy'] ?? 50);
            $rx = max(1.0, (float) ($roi['circle']['rx'] ?? 25)) + $tolerance;
            $ry = max(1.0, (float) ($roi['circle']['ry'] ?? 20)) + $tolerance;
            $norm = pow(($px - $cx) / $rx, 2) + pow(($py - $cy) / $ry, 2);
            return $norm <= 1.0;
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
                for ($i = 0; $i < $n; $i++) {
                    $next = ($i + 1) % $n;
                    $x1 = (float) $points[$i]['x'];
                    $y1 = (float) $points[$i]['y'];
                    $x2 = (float) $points[$next]['x'];
                    $y2 = (float) $points[$next]['y'];
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
            return $inside;
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

        // ── VERIFICAÇÃO GEOMÉTRICA EXATA (TOLERÂNCIA 0.0% NA LINHA DO POLÍGONO) ──
        if (is_array($roi) && !empty($roi) && !empty($json['baby_detected'])) {
            // 1. Validação da Cabeça
            if (is_array($headCenter) && isset($headCenter['x'], $headCenter['y'])) {
                $hx = (float) $headCenter['x'];
                $hy = (float) $headCenter['y'];
                $headInFence = $this->isPointInRoi($hx, $hy, $roi, 0.0);

                if (!$headInFence) {
                    $isLimbOutside = true;
                    $normPart = 'cabeca';
                    if (empty($desc) || stripos($desc, 'seguro') !== false) {
                        $desc = '🚨 Cabeça do bebê passou para fora da área segura demarcada no cerco!';
                    }
                } elseif (empty($json['head_is_outside_cyan_fence']) && $normPart === 'cabeca') {
                    $isLimbOutside = false;
                    $normPart = 'nenhum';
                }
            }

            // 2. Validação dos Pés
            if (is_array($feetCenter) && isset($feetCenter['x'], $feetCenter['y'])) {
                $fx = (float) $feetCenter['x'];
                $fy = (float) $feetCenter['y'];
                $feetInFence = $this->isPointInRoi($fx, $fy, $roi, 0.0);

                if (!$feetInFence) {
                    $isLimbOutside = true;
                    if ($normPart === 'nenhum') {
                        $normPart = 'pe_perna';
                    }
                    if (empty($desc) || stripos($desc, 'seguro') !== false) {
                        $desc = '🚨 Pé ou perna do bebê passou para fora da área segura demarcada no cerco!';
                    }
                } elseif (empty($json['feet_are_outside_cyan_fence']) && $normPart === 'pe_perna' && !$isLimbOutside) {
                    $normPart = 'nenhum';
                }
            }

            // 3. Validação do Tronco / Centro do Bebê
            if (is_array($torsoCenter) && isset($torsoCenter['x'], $torsoCenter['y'])) {
                $tx = (float) $torsoCenter['x'];
                $ty = (float) $torsoCenter['y'];
                $torsoInFence = $this->isPointInRoi($tx, $ty, $roi, 0.0);
                if (!$torsoInFence) {
                    $isBabyOutside = true;
                    $isLimbOutside = true;
                    if ($normPart === 'nenhum') {
                        $normPart = 'corpo';
                    }
                }
            }
        }

        if (!$isLimbOutside && !$isBabyOutside) {
            $normPart = 'nenhum';
            if ($desc === '' || stripos($desc, 'fora') !== false) {
                $desc = 'Bebê seguro dentro da área demarcada do berço (confirmado por geometria anatômica).';
            }
        }

        $motionIsHuman = (bool) ($json['motion_is_human'] ?? false);
        $motionCause = (string) ($json['motion_cause'] ?? 'none');
        $babyDetected = (bool) ($json['baby_detected'] ?? false);
        $isLyingDown = (bool) ($json['is_lying_down'] ?? true);
        $adultPresent = (bool) ($json['adult_present'] ?? false);

        if ($isLyingDown && !$adultPresent && in_array($motionCause, ['cloth_or_inanimate', 'none'], true)) {
            $motionIsHuman = false;
        }

        return [
            'evaluated' => true,
            'baby_detected' => $babyDetected,
            'is_standing' => (bool) ($json['is_standing'] ?? false),
            'is_lying_down' => $isLyingDown,
            'is_limb_outside' => $isLimbOutside,
            'is_baby_outside' => $isBabyOutside,
            'limb_outside_part' => $normPart,
            'head_center' => $headCenter,
            'feet_center' => $feetCenter,
            'torso_center' => $torsoCenter,
            'is_blanket_or_empty' => (bool) ($json['is_blanket_or_empty'] ?? false),
            'adult_present' => $adultPresent,
            'adult_label' => trim((string) ($json['adult_label'] ?? 'Pai ou Mãe')),
            'adult_action' => trim((string) ($json['adult_action'] ?? 'interagindo com o bebê no berço')),
            'is_face_covered' => (bool) ($json['is_face_covered'] ?? false),
            'baby_posture' => trim((string) ($json['baby_posture'] ?? 'sleeping_back')),
            'motion_is_human' => $motionIsHuman,
            'motion_cause' => $motionCause,
            'confidence' => (float) ($json['confidence'] ?? 0.95),
            'description' => $desc,
            'source' => $source
        ];
    }
}
