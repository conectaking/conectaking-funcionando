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

        return self::applyOrientation($img, $orientation);
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

    private static function readJpegOrientation(string $binary): int
    {
        if (! function_exists('exif_read_data')) {
            return 1;
        }
        $tmp = tempnam(sys_get_temp_dir(), 'ckexif');
        if ($tmp === false) {
            return 1;
        }
        try {
            if (file_put_contents($tmp, $binary) === false) {
                return 1;
            }
            $exif = @exif_read_data($tmp);
            $o = (int) ($exif['Orientation'] ?? 1);

            return ($o >= 1 && $o <= 8) ? $o : 1;
        } finally {
            @unlink($tmp);
        }
    }

    /**
     * @param  \GdImage|resource  $img
     * @return \GdImage|resource
     */
    private static function applyOrientation($img, int $orientation)
    {
        switch ($orientation) {
            case 2: // mirror horizontal
                imageflip($img, IMG_FLIP_HORIZONTAL);
                break;
            case 3:
                $img = imagerotate($img, 180, 0);
                break;
            case 4:
                imageflip($img, IMG_FLIP_VERTICAL);
                break;
            case 5:
                imageflip($img, IMG_FLIP_HORIZONTAL);
                $img = imagerotate($img, -90, 0);
                break;
            case 6: // 90 CW — foto vertical “deitada” no ficheiro
                $img = imagerotate($img, -90, 0);
                break;
            case 7:
                imageflip($img, IMG_FLIP_HORIZONTAL);
                $img = imagerotate($img, 90, 0);
                break;
            case 8:
                $img = imagerotate($img, 90, 0);
                break;
        }

        return $img;
    }
}
