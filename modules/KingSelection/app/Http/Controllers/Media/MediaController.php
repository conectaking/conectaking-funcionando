<?php

namespace KingSelection\Http\Controllers\Media;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use KingSelection\Models\KingPhoto;

class MediaController extends Controller
{
    /**
     * Serve preview com watermark (X) e resize para 1200px.
     * Originais ficam privados (storage/app/...).
     */
    public function preview(Request $request, KingPhoto $photo)
    {
        $path = $photo->file_path;
        if (!is_string($path) || $path === '' || !file_exists($path)) {
            return response('Arquivo não encontrado.', 404);
        }

        $imgInfo = @getimagesize($path);
        if (!$imgInfo) {
            return response('Imagem inválida.', 415);
        }

        [$w, $h] = $imgInfo;
        $mime = $imgInfo['mime'] ?? 'image/jpeg';

        // Carregar com GD
        switch ($mime) {
            case 'image/png':
                $src = @imagecreatefrompng($path);
                break;
            case 'image/webp':
                $src = function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($path) : null;
                break;
            case 'image/jpeg':
            default:
                $src = @imagecreatefromjpeg($path);
                break;
        }

        if (!$src) return response('Não foi possível processar a imagem.', 500);

        // Resize: maior lado = 1200
        $max = 1200;
        $scale = min($max / max($w, $h), 1);
        $nw = (int) round($w * $scale);
        $nh = (int) round($h * $scale);

        $dst = imagecreatetruecolor($nw, $nh);
        imagealphablending($dst, true);
        imagesavealpha($dst, true);
        $transparent = imagecolorallocatealpha($dst, 0, 0, 0, 127);
        imagefill($dst, 0, 0, $transparent);

        imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $w, $h);
        imagedestroy($src);

        // Watermark em X (30% opacidade → alpha ~ 89/127)
        $alpha = 89;
        $color = imagecolorallocatealpha($dst, 255, 255, 255, $alpha);
        imagesetthickness($dst, max(2, (int) round(min($nw, $nh) * 0.008)));
        imageline($dst, 0, 0, $nw, $nh, $color);
        imageline($dst, $nw, 0, 0, $nh, $color);

        // Headers anti-cache forte (preview protegido)
        $resp = response()->stream(function () use ($dst, $mime) {
            if ($mime === 'image/png') {
                imagepng($dst, null, 7);
            } elseif ($mime === 'image/webp' && function_exists('imagewebp')) {
                imagewebp($dst, null, 80);
            } else {
                imagejpeg($dst, null, 82);
            }
            imagedestroy($dst);
        }, 200);

        $resp->header('Content-Type', $mime === 'image/png' ? 'image/png' : ($mime === 'image/webp' ? 'image/webp' : 'image/jpeg'));
        $resp->header('Cache-Control', 'private, no-store, no-cache, must-revalidate, max-age=0');
        $resp->header('Pragma', 'no-cache');
        $resp->header('Expires', '0');

        return $resp;
    }
}

