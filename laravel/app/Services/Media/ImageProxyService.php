<?php

namespace App\Services\Media;

use Illuminate\Support\Facades\Http;

/**
 * Preview do WhatsApp corta 16:9 — geramos JPEG 1:1 com a foto inteira
 * (contain + fundo escuro), equivalente ao pipeline sharp do Node.
 */
class ImageProxyService
{
    private const OG_SIZE = 1200;

    private const PAD = 48;

    private const INNER = self::OG_SIZE - self::PAD * 2;

    private const QUALITY = 84;

    private const MAX_BYTES = 450000;

    public const FALLBACK_URL = 'https://i.ibb.co/60sW9k75/logo.png';

    /** @var array{0:int,1:int,2:int} */
    private const BG = [13, 13, 15];

    public function buildOgJpegFromUrl(string $imageUrl): string
    {
        if (! function_exists('imagecreatetruecolor')) {
            throw new \RuntimeException('GD indisponível');
        }

        if (! \App\Support\SafeRemoteUrl::isAllowed($imageUrl)) {
            throw new \RuntimeException('URL de imagem não permitida');
        }

        $response = Http::timeout(12)
            ->withOptions(['allow_redirects' => ['max' => 2]])
            ->withHeaders(['User-Agent' => 'ConectaKing-OG/1.0'])
            ->get($imageUrl);

        if (! $response->successful()) {
            throw new \RuntimeException("Erro ao baixar imagem: {$response->status()}");
        }

        $raw = $response->body();
        if ($raw === '') {
            throw new \RuntimeException('Imagem vazia');
        }

        $src = @imagecreatefromstring($raw);
        if ($src === false) {
            throw new \RuntimeException('Formato de imagem não suportado');
        }
        $src = $this->autoOrient($src, $raw);

        $sw = imagesx($src);
        $sh = imagesy($src);
        if ($sw < 1 || $sh < 1) {
            imagedestroy($src);
            throw new \RuntimeException('Dimensões inválidas');
        }

        $scale = min(self::INNER / $sw, self::INNER / $sh);
        $nw = max(1, (int) round($sw * $scale));
        $nh = max(1, (int) round($sh * $scale));

        $canvas = imagecreatetruecolor(self::OG_SIZE, self::OG_SIZE);
        $bg = imagecolorallocate($canvas, self::BG[0], self::BG[1], self::BG[2]);
        imagefilledrectangle($canvas, 0, 0, self::OG_SIZE - 1, self::OG_SIZE - 1, $bg);

        $dstX = (int) round((self::OG_SIZE - $nw) / 2);
        $dstY = (int) round((self::OG_SIZE - $nh) / 2);
        imagecopyresampled($canvas, $src, $dstX, $dstY, 0, 0, $nw, $nh, $sw, $sh);
        imagedestroy($src);

        $bin = $this->encode($canvas, self::QUALITY);
        if (strlen($bin) > self::MAX_BYTES) {
            $bin = $this->encode($canvas, 72);
        }
        imagedestroy($canvas);

        return $bin;
    }

    /**
     * @param  \GdImage  $im
     */
    private function encode($im, int $quality): string
    {
        ob_start();
        imagejpeg($im, null, $quality);

        return (string) ob_get_clean();
    }

    /**
     * sharp().rotate() respeita o EXIF; replicamos para JPEGs com orientação.
     *
     * @param  \GdImage  $im
     * @return \GdImage
     */
    private function autoOrient($im, string $raw)
    {
        if (! function_exists('exif_read_data')) {
            return $im;
        }

        try {
            $exif = @exif_read_data('data://image/jpeg;base64,'.base64_encode($raw));
        } catch (\Throwable) {
            return $im;
        }
        $orientation = is_array($exif) ? (int) ($exif['Orientation'] ?? 0) : 0;

        $rotated = match ($orientation) {
            3 => imagerotate($im, 180, 0),
            6 => imagerotate($im, -90, 0),
            8 => imagerotate($im, 90, 0),
            default => null,
        };
        if ($rotated === null || $rotated === false) {
            return $im;
        }
        imagedestroy($im);

        return $rotated;
    }
}
