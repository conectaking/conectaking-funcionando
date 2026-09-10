<?php

namespace App\Support;

/**
 * Aplica Orientation EXIF (JPEG) antes de redimensionar com GD.
 */
final class ImageExif
{
    /**
     * @return \GdImage|resource|null
     */
    public static function createOrientedImage(string $binary)
    {
        if ($binary === '' || ! function_exists('imagecreatefromstring')) {
            return null;
        }

        $img = @imagecreatefromstring($binary);
        if ($img === false) {
            return null;
        }

        $orientation = self::readJpegOrientation($binary);
        if ($orientation <= 1) {
            return $img;
        }

        $oriented = self::applyOrientation($img, $orientation);
        if ($oriented === false || $oriented === null) {
            return $img;
        }

        return $oriented;
    }

    /**
     * Re-encoda JPEG já com orientação corrigida (para gravar no storage).
     */
    public static function normalizeJpegBinary(string $binary, int $quality = 90): ?string
    {
        $img = self::createOrientedImage($binary);
        if ($img === null) {
            return null;
        }
        ob_start();
        imagejpeg($img, null, $quality);
        $out = ob_get_clean();
        imagedestroy($img);

        return is_string($out) && $out !== '' ? $out : null;
    }

    public static function readJpegOrientation(string $binary): int
    {
        $fromExt = self::readOrientationViaExifExt($binary);
        if ($fromExt >= 1 && $fromExt <= 8) {
            return $fromExt;
        }

        return self::readOrientationFromApp1($binary);
    }

    private static function readOrientationViaExifExt(string $binary): int
    {
        if (! function_exists('exif_read_data')) {
            return 0;
        }
        $tmp = tempnam(sys_get_temp_dir(), 'ckexif');
        if ($tmp === false) {
            return 0;
        }
        try {
            if (@file_put_contents($tmp, $binary) === false) {
                return 0;
            }
            $exif = @exif_read_data($tmp, 'IFD0', false);
            if (! is_array($exif)) {
                return 0;
            }
            $o = (int) ($exif['Orientation'] ?? 0);

            return ($o >= 1 && $o <= 8) ? $o : 0;
        } finally {
            @unlink($tmp);
        }
    }

    /**
     * Fallback sem extensão exif: lê tag Orientation (0x0112) no APP1/TIFF.
     */
    private static function readOrientationFromApp1(string $binary): int
    {
        $len = strlen($binary);
        if ($len < 4 || $binary[0] !== "\xFF" || $binary[1] !== "\xD8") {
            return 1;
        }
        $offset = 2;
        while ($offset + 4 <= $len) {
            if ($binary[$offset] !== "\xFF") {
                break;
            }
            $marker = ord($binary[$offset + 1]);
            $segLen = (ord($binary[$offset + 2]) << 8) | ord($binary[$offset + 3]);
            if ($segLen < 2 || $offset + 2 + $segLen > $len) {
                break;
            }
            // APP1
            if ($marker === 0xE1) {
                $start = $offset + 4;
                $end = $offset + 2 + $segLen;
                if ($end - $start >= 14 && substr($binary, $start, 6) === "Exif\0\0") {
                    $o = self::readOrientationFromTiff(substr($binary, $start + 6, $end - ($start + 6)));
                    if ($o >= 1 && $o <= 8) {
                        return $o;
                    }
                }
            }
            // SOS — fim dos segmentos de cabeçalho
            if ($marker === 0xDA) {
                break;
            }
            $offset += 2 + $segLen;
        }

        return 1;
    }

    private static function readOrientationFromTiff(string $tiff): int
    {
        if (strlen($tiff) < 8) {
            return 1;
        }
        $endian = substr($tiff, 0, 2);
        $le = $endian === 'II';
        if (! $le && $endian !== 'MM') {
            return 1;
        }
        $read16 = static function (string $buf, int $off) use ($le): int {
            if ($off + 2 > strlen($buf)) {
                return 0;
            }
            $chunk = substr($buf, $off, 2);
            $u = unpack($le ? 'v' : 'n', $chunk);

            return (int) ($u[1] ?? 0);
        };
        $read32 = static function (string $buf, int $off) use ($le): int {
            if ($off + 4 > strlen($buf)) {
                return 0;
            }
            $chunk = substr($buf, $off, 4);
            $u = unpack($le ? 'V' : 'N', $chunk);

            return (int) ($u[1] ?? 0);
        };
        if ($read16($tiff, 2) !== 42) {
            return 1;
        }
        $ifd = $read32($tiff, 4);
        if ($ifd < 8 || $ifd + 2 > strlen($tiff)) {
            return 1;
        }
        $count = $read16($tiff, $ifd);
        for ($i = 0; $i < $count; $i++) {
            $entry = $ifd + 2 + ($i * 12);
            if ($entry + 12 > strlen($tiff)) {
                break;
            }
            $tag = $read16($tiff, $entry);
            if ($tag !== 0x0112) {
                continue;
            }
            $type = $read16($tiff, $entry + 2);
            $valOff = $entry + 8;
            // SHORT
            if ($type === 3) {
                $o = $read16($tiff, $valOff);

                return ($o >= 1 && $o <= 8) ? $o : 1;
            }
            // LONG
            if ($type === 4) {
                $o = $read32($tiff, $valOff);

                return ($o >= 1 && $o <= 8) ? $o : 1;
            }
        }

        return 1;
    }

    /**
     * @param  \GdImage|resource  $img
     * @return \GdImage|resource|false
     */
    private static function applyOrientation($img, int $orientation)
    {
        $rotate = static function ($src, float $angle) {
            $out = @imagerotate($src, $angle, 0);
            if ($out === false) {
                return $src;
            }
            if ($out !== $src) {
                imagedestroy($src);
            }

            return $out;
        };

        switch ($orientation) {
            case 2:
                imageflip($img, IMG_FLIP_HORIZONTAL);

                return $img;
            case 3:
                return $rotate($img, 180);
            case 4:
                imageflip($img, IMG_FLIP_VERTICAL);

                return $img;
            case 5:
                imageflip($img, IMG_FLIP_HORIZONTAL);

                return $rotate($img, -90);
            case 6: // 90° CW — foto vertical “deitada” no ficheiro
                return $rotate($img, -90);
            case 7:
                imageflip($img, IMG_FLIP_HORIZONTAL);

                return $rotate($img, 90);
            case 8:
                return $rotate($img, 90);
            default:
                return $img;
        }
    }
}
