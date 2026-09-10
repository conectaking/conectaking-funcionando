<?php

namespace App\Services\CartaoVirtual;

use App\Support\ImageExif;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Capa / OG públicos do King Selection (sem Sharp: redimensiona com GD).
 */
class KingSelectionMediaService
{
    public function __construct(private readonly R2StorageService $r2)
    {
    }

    /**
     * Lê bytes de caminho KS (r2:/http/local) — usado por face enroll e previews.
     */
    public function bufferFromStoragePath(string $path): ?string
    {
        return $this->bufferFromPath($path);
    }

    /**
     * @return array{status:int, binary?:string, contentType?:string, message?:string}
     */
    public function coverJpeg(string $slug, int $maxSide = 1400): array
    {
        $this->bumpImageMemory();
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
        $this->bumpImageMemory();
        $buf = $this->fetchCoverBuffer($slug);
        if ($buf === null) {
            $buf = $this->fallbackOgBuffer($slug);
        }
        if ($buf === null) {
            return ['status' => 404, 'message' => 'Sem imagem'];
        }
        $img = @imagecreatefromstring($buf);
        unset($buf);
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
     * Preview JPEG a partir de um file_path (cliente autenticado).
     *
     * @param  array{enabled?:bool, mode?:string, opacity?:float}|null  $watermark
     * @return array{status:int, binary?:string, contentType?:string, message?:string}
     */
    public function previewFromStoragePath(string $path, bool $thumb = false, ?array $watermark = null): array
    {
        $this->bumpImageMemory();
        $buf = $this->bufferFromPath($path);
        if ($buf === null) {
            return ['status' => 502, 'message' => 'Não foi possível carregar a imagem (ficheiro em falta no armazenamento).'];
        }
        $out = $this->resizeJpeg($buf, $thumb ? 400 : 1200);
        unset($buf);
        if ($out === null) {
            return ['status' => 502, 'message' => 'Falha ao processar imagem'];
        }
        if ($watermark && ! empty($watermark['enabled']) && ! $thumb) {
            $wm = $this->applyDiagonalWatermark($out, (float) ($watermark['opacity'] ?? 0.22));
            if ($wm !== null) {
                $out = $wm;
            }
        }

        return ['status' => 200, 'binary' => $out, 'contentType' => 'image/jpeg'];
    }

    /**
     * Marca d'água diagonal simples (paridade mínima com modo "x" do Node).
     */
    private function applyDiagonalWatermark(string $jpegBinary, float $opacity): ?string
    {
        $img = @imagecreatefromstring($jpegBinary);
        if ($img === false) {
            return null;
        }
        imagesavealpha($img, true);
        $w = imagesx($img);
        $h = imagesy($img);
        $alpha = (int) round((1 - min(1, max(0, $opacity))) * 127);
        $color = imagecolorallocatealpha($img, 255, 255, 255, $alpha);
        $step = max(80, (int) round(min($w, $h) / 6));
        imagesetthickness($img, max(2, (int) round(min($w, $h) / 250)));
        for ($x = -$h; $x < $w + $h; $x += $step) {
            imageline($img, $x, 0, $x + $h, $h, $color);
            imageline($img, $x + (int) ($step / 2), 0, $x + (int) ($step / 2) + $h, $h, $color);
        }
        ob_start();
        imagejpeg($img, null, 88);
        $out = (string) ob_get_clean();
        imagedestroy($img);

        return $out !== '' ? $out : null;
    }

    /**
     * Preview PNG da logo de marca d'água do painel (GET watermark-file).
     *
     * @return array{status:int, binary?:string, contentType?:string, message?:string}
     */
    public function watermarkFileForGallery(string $userId, int $galleryId, string $which = ''): array
    {
        if ($galleryId < 1) {
            return ['status' => 400, 'message' => 'galleryId inválido'];
        }
        $cols = ['g.watermark_path'];
        if (Schema::hasColumn('king_galleries', 'watermark_path_portrait')) {
            $cols[] = 'g.watermark_path_portrait';
        }
        if (Schema::hasColumn('king_galleries', 'watermark_path_landscape')) {
            $cols[] = 'g.watermark_path_landscape';
        }
        $row = DB::selectOne(
            'SELECT '.implode(', ', $cols).'
             FROM king_galleries g
             JOIN profile_items pi ON pi.id = g.profile_item_id
             WHERE g.id = ? AND pi.user_id = ? LIMIT 1',
            [$galleryId, $userId]
        );
        if (! $row) {
            return ['status' => 404, 'message' => 'Galeria não encontrada'];
        }
        $which = strtolower(trim($which));
        $legacy = trim((string) ($row->watermark_path ?? ''));
        $pathP = isset($row->watermark_path_portrait) ? trim((string) $row->watermark_path_portrait) : '';
        $pathL = isset($row->watermark_path_landscape) ? trim((string) $row->watermark_path_landscape) : '';
        $fp = $legacy;
        if ($which === 'portrait') {
            $fp = $pathP !== '' ? $pathP : $legacy;
        } elseif ($which === 'landscape') {
            $fp = $pathL !== '' ? $pathL : $legacy;
        }
        $buf = $fp !== '' ? $this->bufferFromPath($fp) : null;
        if ($buf === null) {
            $buf = $this->defaultWatermarkAssetBuffer($which === 'landscape');
        }
        if ($buf === null) {
            return ['status' => 500, 'message' => 'Não foi possível carregar a marca d’água (Cloudflare/token ou arquivo padrão).'];
        }
        $out = $this->resizePng($buf, 560);
        if ($out === null) {
            return ['status' => 500, 'message' => 'Falha ao processar marca d’água'];
        }

        return ['status' => 200, 'binary' => $out, 'contentType' => 'image/png'];
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

    public function readFileBuffer(string $path): ?string
    {
        return $this->bufferFromPath($path);
    }

    private function bufferFromPath(string $path): ?string
    {
        $path = trim($path);
        if ($path === '') {
            return null;
        }
        if (str_starts_with(strtolower($path), 'r2:')) {
            $path = substr($path, 3);
        }
        if (preg_match('#^https?://#i', $path)) {
            return $this->httpGetBinary($path);
        }
        if (str_starts_with(strtolower($path), 'cfimage:')) {
            // Cloudflare Images delivery — se houver URL pública base de delivery
            $id = trim(substr($path, strlen('cfimage:')));
            $cfBase = rtrim((string) (env('CF_IMAGES_DELIVERY_URL') ?: ''), '/');
            if ($cfBase !== '' && $id !== '') {
                return $this->httpGetBinary($cfBase.'/'.$id);
            }

            return null;
        }
        $cfg = $this->r2->config();
        $base = $cfg['publicBaseUrl'] ?? null;
        if ($base) {
            $segments = array_map('rawurlencode', array_values(array_filter(explode('/', ltrim($path, '/')))));
            $url = rtrim($base, '/').'/'.implode('/', $segments);
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

    /** JPGs de câmara (24–45MP) estouram 128M no GD; sobe só durante o decode. */
    private function bumpImageMemory(): void
    {
        $cur = (string) ini_get('memory_limit');
        $bytes = $this->memoryLimitToBytes($cur);
        if ($bytes > 0 && $bytes < 512 * 1024 * 1024) {
            @ini_set('memory_limit', '512M');
        }
    }

    private function memoryLimitToBytes(string $limit): int
    {
        $limit = trim($limit);
        if ($limit === '' || $limit === '-1') {
            return -1;
        }
        $unit = strtolower(substr($limit, -1));
        $num = (float) $limit;
        return (int) match ($unit) {
            'g' => $num * 1024 * 1024 * 1024,
            'm' => $num * 1024 * 1024,
            'k' => $num * 1024,
            default => (float) $limit,
        };
    }

    private function resizeJpeg(string $buf, int $maxSide): ?string
    {
        $this->bumpImageMemory();
        $img = ImageExif::createOrientedImage($buf);
        // Libertar JPEG comprimido antes do resample (economiza dezenas de MB).
        unset($buf);
        if ($img === null) {
            return null;
        }
        $w = imagesx($img);
        $h = imagesy($img);
        $scale = min($maxSide / max($w, $h, 1), 1.0);
        $nw = max(1, (int) round($w * $scale));
        $nh = max(1, (int) round($h * $scale));
        $dst = imagecreatetruecolor($nw, $nh);
        if ($dst === false) {
            imagedestroy($img);

            return null;
        }
        imagecopyresampled($dst, $img, 0, 0, 0, 0, $nw, $nh, $w, $h);
        imagedestroy($img);
        ob_start();
        imagejpeg($dst, null, 78);
        $out = (string) ob_get_clean();
        imagedestroy($dst);

        return $out !== '' ? $out : null;
    }

    private function resizePng(string $buf, int $maxSide): ?string
    {
        $this->bumpImageMemory();
        $img = @imagecreatefromstring($buf);
        unset($buf);
        if ($img === false) {
            return null;
        }
        imagesavealpha($img, true);
        $w = imagesx($img);
        $h = imagesy($img);
        $scale = min($maxSide / max($w, $h, 1), 1.0);
        $nw = max(1, (int) round($w * $scale));
        $nh = max(1, (int) round($h * $scale));
        $dst = imagecreatetruecolor($nw, $nh);
        if ($dst === false) {
            imagedestroy($img);

            return null;
        }
        imagealphablending($dst, false);
        imagesavealpha($dst, true);
        $transparent = imagecolorallocatealpha($dst, 0, 0, 0, 127);
        imagefilledrectangle($dst, 0, 0, $nw, $nh, $transparent);
        imagealphablending($dst, true);
        imagecopyresampled($dst, $img, 0, 0, 0, 0, $nw, $nh, $w, $h);
        imagedestroy($img);
        ob_start();
        imagepng($dst);
        $out = (string) ob_get_clean();
        imagedestroy($dst);

        return $out !== '' ? $out : null;
    }

    private function defaultWatermarkAssetBuffer(bool $landscape): ?string
    {
        $envKey = $landscape
            ? (env('KINGSELECTION_DEFAULT_WATERMARK_LANDSCAPE_FILE') ?: env('KINGSELECTION_DEFAULT_WATERMARK_HORIZONTAL_FILE'))
            : (env('KINGSELECTION_DEFAULT_WATERMARK_PORTRAIT_FILE') ?: env('KINGSELECTION_DEFAULT_WATERMARK_VERTICAL_FILE'));
        $envKey = trim((string) ($envKey ?: ''));
        if ($envKey !== '') {
            $b = $this->bufferFromPath($envKey);
            if ($b !== null) {
                return $b;
            }
            if (is_file($envKey)) {
                $bin = @file_get_contents($envKey);
                if ($bin !== false && $bin !== '') {
                    return $bin;
                }
            }
        }
        $fileName = $landscape
            ? 'marca dagua KingSelection horizontal.png'
            : 'marca dagua KingSelection vertical.png';
        $alt = $landscape
            ? 'marca_dagua_kingselection_horizontal.png'
            : 'marca_dagua_kingselection_vertical.png';
        foreach ([
            base_path('../public/'.$fileName),
            base_path('../public/'.$alt),
            public_path($fileName),
            public_path($alt),
            '/opt/conectaking/public/'.$fileName,
            '/opt/conectaking/public/'.$alt,
            base_path('../'.$fileName),
            base_path('../'.$alt),
            '/opt/conectaking/'.$fileName,
            '/opt/conectaking/'.$alt,
        ] as $abs) {
            if (is_file($abs)) {
                $bin = @file_get_contents($abs);
                if ($bin !== false && $bin !== '') {
                    return $bin;
                }
            }
        }

        return $this->generateFallbackWatermarkPng($landscape);
    }

    private function generateFallbackWatermarkPng(bool $landscape): ?string
    {
        $w = $landscape ? 560 : 400;
        $h = $landscape ? 280 : 560;
        $im = imagecreatetruecolor($w, $h);
        imagealphablending($im, false);
        imagesavealpha($im, true);
        $transparent = imagecolorallocatealpha($im, 0, 0, 0, 127);
        imagefilledrectangle($im, 0, 0, $w, $h, $transparent);
        imagealphablending($im, true);
        $gold = imagecolorallocatealpha($im, 255, 199, 0, 40);
        imagestring($im, 5, (int) ($w / 2 - 50), (int) ($h / 2 - 8), 'Conecta King', $gold);
        ob_start();
        imagepng($im);
        $bin = (string) ob_get_clean();
        imagedestroy($im);

        return $bin !== '' ? $bin : null;
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
