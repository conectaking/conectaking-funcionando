<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Capa / OG públicos do King Selection (sem Sharp: redimensiona com GD).
 */
class KingSelectionMediaService
{
    public function __construct(private readonly R2StorageService $r2)
    {
    }

    /**
     * @return array{status:int, binary?:string, contentType?:string, message?:string}
     */
    public function coverJpeg(string $slug, int $maxSide = 1400): array
    {
        $buf = $this->fetchCoverBuffer($slug);
        if ($buf === null) {
            return ['status' => 404, 'message' => 'Sem capa'];
        }
        $out = $this->resizeJpeg($buf, $maxSide);
        if ($out === null) {
            return ['status' => 502, 'message' => 'Falha ao processar capa'];
        }

        return ['status' => 200, 'binary' => $out, 'contentType' => 'image/jpeg'];
    }

    /**
     * @return array{status:int, binary?:string, contentType?:string, message?:string}
     */
    public function ogImageJpeg(string $slug): array
    {
        $buf = $this->fetchCoverBuffer($slug);
        if ($buf === null) {
            $buf = $this->fallbackOgBuffer($slug);
        }
        if ($buf === null) {
            return ['status' => 404, 'message' => 'Sem imagem'];
        }
        $img = @imagecreatefromstring($buf);
        if ($img === false) {
            $fb = $this->fallbackOgBuffer($slug);

            return $fb
                ? ['status' => 200, 'binary' => $fb, 'contentType' => 'image/jpeg']
                : ['status' => 502, 'message' => 'Falha ao processar og-image'];
        }
        $w = imagesx($img);
        $h = imagesy($img);
        $portrait = $h > $w;
        $outW = $portrait ? 1080 : 1200;
        $outH = $portrait ? 1350 : 630;
        $canvas = imagecreatetruecolor($outW, $outH);
        $black = imagecolorallocate($canvas, 13, 13, 15);
        imagefilledrectangle($canvas, 0, 0, $outW, $outH, $black);
        $scale = min($outW / max(1, $w), $outH / max(1, $h));
        $dw = (int) round($w * $scale);
        $dh = (int) round($h * $scale);
        $dx = (int) (($outW - $dw) / 2);
        $dy = (int) (($outH - $dh) / 2);
        imagecopyresampled($canvas, $img, $dx, $dy, 0, 0, $dw, $dh, $w, $h);
        imagedestroy($img);
        ob_start();
        imagejpeg($canvas, null, 84);
        $binary = (string) ob_get_clean();
        imagedestroy($canvas);

        return ['status' => 200, 'binary' => $binary, 'contentType' => 'image/jpeg'];
    }

    /**
     * Preview JPEG público (sem download; watermark completo fica no Node por enquanto — só resize).
     *
     * @return array{status:int, binary?:string, contentType?:string, message?:string}
     */
    public function publicPreviewJpeg(string $slug, int $photoId, bool $thumb = false): array
    {
        $slug = trim($slug);
        if ($slug === '') {
            return ['status' => 400, 'message' => 'slug é obrigatório'];
        }
        if ($photoId < 1) {
            return ['status' => 400, 'message' => 'photoId inválido'];
        }

        try {
            $g = DB::selectOne(
                'SELECT id, access_mode FROM king_galleries WHERE lower(trim(slug)) = lower(trim(?)) LIMIT 1',
                [$slug]
            );
        } catch (\Throwable) {
            $g = DB::selectOne(
                'SELECT id FROM king_galleries WHERE lower(trim(slug)) = lower(trim(?)) LIMIT 1',
                [$slug]
            );
        }
        if (!$g) {
            return ['status' => 404, 'message' => 'Não encontrado'];
        }
        $accessMode = (string) ($g->access_mode ?? 'private');
        if ($accessMode === 'password') {
            $accessMode = 'signup';
        }
        if ($accessMode !== 'public') {
            return ['status' => 403, 'message' => 'Galeria não é pública'];
        }

        $path = $this->photoPath((int) $g->id, $photoId);
        if (!$path) {
            return ['status' => 404, 'message' => 'Não encontrado'];
        }
        $buf = $this->bufferFromPath($path);
        if ($buf === null) {
            return ['status' => 502, 'message' => 'Não foi possível carregar a imagem (ficheiro em falta no armazenamento).'];
        }
        $max = $thumb ? 400 : 1200;
        $out = $this->resizeJpeg($buf, $max);
        if ($out === null) {
            return ['status' => 502, 'message' => 'Falha ao processar imagem'];
        }

        return ['status' => 200, 'binary' => $out, 'contentType' => 'image/jpeg'];
    }

    private function fetchCoverBuffer(string $slug): ?string
    {
        $slug = trim($slug);
        if ($slug === '') {
            return null;
        }
        try {
            $g = DB::selectOne(
                'SELECT id, gallery_link_cover_photo_id, gallery_link_cover_file_path
                 FROM king_galleries WHERE lower(trim(slug)) = lower(trim(?)) LIMIT 1',
                [$slug]
            );
        } catch (\Throwable) {
            try {
                $g = DB::selectOne(
                    'SELECT id FROM king_galleries WHERE lower(trim(slug)) = lower(trim(?)) LIMIT 1',
                    [$slug]
                );
            } catch (\Throwable) {
                return null;
            }
        }
        if (!$g) {
            return null;
        }
        $galleryId = (int) $g->id;
        $customPath = trim((string) ($g->gallery_link_cover_file_path ?? ''));
        if ($customPath !== '') {
            $buf = $this->bufferFromPath($customPath);
            if ($buf !== null) {
                return $buf;
            }
        }
        $coverPhotoId = (int) ($g->gallery_link_cover_photo_id ?? 0);
        if ($coverPhotoId > 0) {
            $path = $this->photoPath($galleryId, $coverPhotoId);
            if ($path) {
                $buf = $this->bufferFromPath($path);
                if ($buf !== null) {
                    return $buf;
                }
            }
        }
        $fallback = $this->firstPhotoPath($galleryId);
        if ($fallback) {
            return $this->bufferFromPath($fallback);
        }

        return null;
    }

    private function photoPath(int $galleryId, int $photoId): ?string
    {
        try {
            $p = DB::selectOne(
                'SELECT file_path, edited_file_path FROM king_photos WHERE gallery_id = ? AND id = ? LIMIT 1',
                [$galleryId, $photoId]
            );
        } catch (\Throwable) {
            $p = DB::selectOne(
                'SELECT file_path FROM king_photos WHERE gallery_id = ? AND id = ? LIMIT 1',
                [$galleryId, $photoId]
            );
        }
        if (!$p) {
            return null;
        }
        $edited = trim((string) ($p->edited_file_path ?? ''));
        if ($edited !== '') {
            return $edited;
        }
        $fp = trim((string) ($p->file_path ?? ''));

        return $fp !== '' ? $fp : null;
    }

    private function firstPhotoPath(int $galleryId): ?string
    {
        try {
            $p = DB::selectOne(
                'SELECT file_path, edited_file_path FROM king_photos
                 WHERE gallery_id = ? ORDER BY COALESCE(is_cover, false) DESC, "order" ASC, id ASC LIMIT 1',
                [$galleryId]
            );
        } catch (\Throwable) {
            try {
                $p = DB::selectOne(
                    'SELECT file_path FROM king_photos WHERE gallery_id = ? ORDER BY id ASC LIMIT 1',
                    [$galleryId]
                );
            } catch (\Throwable) {
                return null;
            }
        }
        if (!$p) {
            return null;
        }
        $edited = trim((string) ($p->edited_file_path ?? ''));
        if ($edited !== '') {
            return $edited;
        }
        $fp = trim((string) ($p->file_path ?? ''));

        return $fp !== '' ? $fp : null;
    }

    private function bufferFromPath(string $path): ?string
    {
        if (preg_match('#^https?://#i', $path)) {
            return $this->httpGetBinary($path);
        }
        $cfg = $this->r2->config();
        $base = $cfg['publicBaseUrl'] ?? null;
        if ($base) {
            $url = rtrim($base, '/').'/'.ltrim($path, '/');
            $buf = $this->httpGetBinary($url);
            if ($buf !== null) {
                return $buf;
            }
        }
        // caminho local relativo
        $local = base_path('../uploads/'.ltrim($path, '/'));
        if (is_file($local)) {
            $bin = @file_get_contents($local);

            return $bin !== false ? $bin : null;
        }

        return null;
    }

    private function httpGetBinary(string $url): ?string
    {
        try {
            $res = Http::timeout(12)->withHeaders(['User-Agent' => 'ConectaKing-Laravel/1'])->get($url);
            if (!$res->successful()) {
                return null;
            }
            $body = $res->body();

            return $body !== '' ? $body : null;
        } catch (\Throwable $e) {
            Log::warning('ks.media.fetch', ['url' => $url, 'error' => $e->getMessage()]);

            return null;
        }
    }

    private function resizeJpeg(string $buf, int $maxSide): ?string
    {
        $img = @imagecreatefromstring($buf);
        if ($img === false) {
            return null;
        }
        $w = imagesx($img);
        $h = imagesy($img);
        $scale = min($maxSide / max($w, $h, 1), 1.0);
        $nw = max(1, (int) round($w * $scale));
        $nh = max(1, (int) round($h * $scale));
        $dst = imagecreatetruecolor($nw, $nh);
        imagecopyresampled($dst, $img, 0, 0, 0, 0, $nw, $nh, $w, $h);
        imagedestroy($img);
        ob_start();
        imagejpeg($dst, null, 78);
        $out = (string) ob_get_clean();
        imagedestroy($dst);

        return $out !== '' ? $out : null;
    }

    private function fallbackOgBuffer(string $slug): ?string
    {
        $w = 1200;
        $h = 630;
        $im = imagecreatetruecolor($w, $h);
        $bg = imagecolorallocate($im, 13, 13, 15);
        $gold = imagecolorallocate($im, 255, 199, 0);
        $white = imagecolorallocate($im, 236, 236, 236);
        imagefilledrectangle($im, 0, 0, $w, $h, $bg);
        $title = 'King Selection';
        imagestring($im, 5, 40, 260, $title, $gold);
        imagestring($im, 4, 40, 300, substr($slug, 0, 40), $white);
        ob_start();
        imagejpeg($im, null, 86);
        $bin = (string) ob_get_clean();
        imagedestroy($im);

        return $bin !== '' ? $bin : null;
    }
}
