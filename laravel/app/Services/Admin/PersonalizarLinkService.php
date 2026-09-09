<?php

namespace App\Services\Admin;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Preview de link do site (WhatsApp OG) — tabela site_link_preview_config.
 */
class PersonalizarLinkService
{
    public const WIDTH = 1200;

    public const HEIGHT = 630;

    /** @var array{title:string,subtitle:string,bg_color_1:string,bg_color_2:string,text_color:string,subtitle_color:string} */
    public const DEFAULTS = [
        'title' => 'CONECTAKING',
        'subtitle' => 'Sua Presença Digital. Um Toque. Poder Absoluto.',
        'bg_color_1' => '#991B1B',
        'bg_color_2' => '#000000',
        'text_color' => '#F5F5F5',
        'subtitle_color' => '#FFC700',
    ];

    /**
     * @return array{success:bool,config:array<string,mixed>}
     */
    public function getConfig(): array
    {
        $row = $this->getActiveConfig();
        if ($row) {
            return ['success' => true, 'config' => $row];
        }

        return ['success' => true, 'config' => self::DEFAULTS];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{success:bool,config:array<string,mixed>}
     */
    public function saveConfig(array $body): array
    {
        if (! Schema::hasTable('site_link_preview_config')) {
            throw new \RuntimeException('Tabela site_link_preview_config indisponível.');
        }

        $payload = [
            'title' => (string) ($body['title'] ?? self::DEFAULTS['title']),
            'subtitle' => (string) ($body['subtitle'] ?? self::DEFAULTS['subtitle']),
            'bg_color_1' => $this->normalizeHex($body['bg_color_1'] ?? self::DEFAULTS['bg_color_1'], self::DEFAULTS['bg_color_1']),
            'bg_color_2' => $this->normalizeHex($body['bg_color_2'] ?? self::DEFAULTS['bg_color_2'], self::DEFAULTS['bg_color_2']),
            'text_color' => $this->normalizeHex($body['text_color'] ?? self::DEFAULTS['text_color'], self::DEFAULTS['text_color']),
            'subtitle_color' => $this->normalizeHex($body['subtitle_color'] ?? self::DEFAULTS['subtitle_color'], self::DEFAULTS['subtitle_color']),
        ];

        $config = DB::transaction(function () use ($payload) {
            DB::table('site_link_preview_config')->where('is_active', true)->update(['is_active' => false]);

            $row = DB::selectOne(
                'INSERT INTO site_link_preview_config
                    (title, subtitle, bg_color_1, bg_color_2, text_color, subtitle_color, is_active, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, true, NOW(), NOW())
                 RETURNING *',
                [
                    mb_substr($payload['title'], 0, 200),
                    $payload['subtitle'],
                    $payload['bg_color_1'],
                    $payload['bg_color_2'],
                    $payload['text_color'],
                    $payload['subtitle_color'],
                ]
            );

            if (! $row) {
                throw new \RuntimeException('Falha ao inserir configuração.');
            }

            return $this->rowToArray($row);
        });

        return ['success' => true, 'config' => $config];
    }

    /**
     * Gera JPEG 1200x630 (gradiente + texto; logo opcional).
     */
    public function generateOgJpeg(): string
    {
        try {
            return $this->renderJpeg($this->resolvedConfig());
        } catch (\Throwable $e) {
            Log::warning('PersonalizarLink OG falhou, usando fallback', ['error' => $e->getMessage()]);

            return $this->fallbackJpeg();
        }
    }

    /**
     * @return array<string,mixed>|null
     */
    private function getActiveConfig(): ?array
    {
        if (! Schema::hasTable('site_link_preview_config')) {
            return null;
        }

        $row = DB::table('site_link_preview_config')
            ->where('is_active', true)
            ->orderByDesc('updated_at')
            ->first();

        return $row ? $this->rowToArray($row) : null;
    }

    /**
     * @return array{title:string,subtitle:string,bg_color_1:string,bg_color_2:string,text_color:string,subtitle_color:string}
     */
    private function resolvedConfig(): array
    {
        $active = $this->getActiveConfig();

        return [
            'title' => (string) ($active['title'] ?? self::DEFAULTS['title']),
            'subtitle' => (string) ($active['subtitle'] ?? self::DEFAULTS['subtitle']),
            'bg_color_1' => (string) ($active['bg_color_1'] ?? self::DEFAULTS['bg_color_1']),
            'bg_color_2' => (string) ($active['bg_color_2'] ?? self::DEFAULTS['bg_color_2']),
            'text_color' => (string) ($active['text_color'] ?? self::DEFAULTS['text_color']),
            'subtitle_color' => (string) ($active['subtitle_color'] ?? self::DEFAULTS['subtitle_color']),
        ];
    }

    /**
     * @param  array{title:string,subtitle:string,bg_color_1:string,bg_color_2:string,text_color:string,subtitle_color:string}  $cfg
     */
    private function renderJpeg(array $cfg): string
    {
        if (! function_exists('imagecreatetruecolor')) {
            throw new \RuntimeException('GD indisponível');
        }

        $w = self::WIDTH;
        $h = self::HEIGHT;
        $im = imagecreatetruecolor($w, $h);
        if ($im === false) {
            throw new \RuntimeException('Falha ao criar canvas');
        }

        $c1 = $this->hexToRgb($cfg['bg_color_1']);
        $c2 = $this->hexToRgb($cfg['bg_color_2']);

        // Gradiente horizontal: c1 → c2 → c1 (espelha o SVG do Node)
        for ($x = 0; $x < $w; $x++) {
            $t = $x / max(1, $w - 1);
            if ($t <= 0.5) {
                $f = $t * 2;
                $r = (int) round($c1[0] + ($c2[0] - $c1[0]) * $f);
                $g = (int) round($c1[1] + ($c2[1] - $c1[1]) * $f);
                $b = (int) round($c1[2] + ($c2[2] - $c1[2]) * $f);
            } else {
                $f = ($t - 0.5) * 2;
                $r = (int) round($c2[0] + ($c1[0] - $c2[0]) * $f);
                $g = (int) round($c2[1] + ($c1[1] - $c2[1]) * $f);
                $b = (int) round($c2[2] + ($c1[2] - $c2[2]) * $f);
            }
            $col = imagecolorallocate($im, $r, $g, $b);
            imageline($im, $x, 0, $x, $h - 1, $col);
        }

        $hasLogo = $this->compositeLogo($im, 120, 200, 180);

        $titleRgb = $this->hexToRgb($cfg['text_color']);
        $subRgb = $this->hexToRgb($cfg['subtitle_color']);
        $titleColor = imagecolorallocate($im, $titleRgb[0], $titleRgb[1], $titleRgb[2]);
        $subColor = imagecolorallocate($im, $subRgb[0], $subRgb[1], $subRgb[2]);

        $title = $this->sanitizeText($cfg['title']);
        $subtitle = $this->sanitizeText($cfg['subtitle']);

        $textX = $hasLogo ? 350 : (int) ($w / 2);
        $center = ! $hasLogo;
        $midY = (int) ($h / 2);

        $this->drawText($im, $title, $textX, $midY + 20, 48, $titleColor, $center, true);
        $this->drawText($im, $subtitle, $textX, $midY + 90, 22, $subColor, $center, false);

        ob_start();
        imagejpeg($im, null, 92);
        $bin = (string) ob_get_clean();
        imagedestroy($im);

        if ($bin === '') {
            throw new \RuntimeException('JPEG vazio');
        }

        return $bin;
    }

    private function fallbackJpeg(): string
    {
        if (! function_exists('imagecreatetruecolor')) {
            // JPEG mínimo 1x1 (não ideal, mas evita 500 sem GD)
            return base64_decode('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//Z');
        }

        $im = imagecreatetruecolor(self::WIDTH, self::HEIGHT);
        $bg = imagecolorallocate($im, 153, 27, 27);
        $fg = imagecolorallocate($im, 245, 245, 245);
        imagefilledrectangle($im, 0, 0, self::WIDTH - 1, self::HEIGHT - 1, $bg);
        $this->drawText($im, 'CONECTAKING', (int) (self::WIDTH / 2), (int) (self::HEIGHT / 2), 48, $fg, true, true);
        ob_start();
        imagejpeg($im, null, 90);
        $bin = (string) ob_get_clean();
        imagedestroy($im);

        return $bin;
    }

    /**
     * @param  \GdImage|resource  $im
     */
    private function compositeLogo($im, int $left, int $top, int $size): bool
    {
        $path = $this->resolveLogoPath();
        if ($path === null || ! function_exists('imagecreatefromstring')) {
            return false;
        }

        $raw = @file_get_contents($path);
        if ($raw === false || $raw === '') {
            return false;
        }

        $logo = @imagecreatefromstring($raw);
        if ($logo === false) {
            return false;
        }

        $lw = imagesx($logo);
        $lh = imagesy($logo);
        if ($lw < 1 || $lh < 1) {
            imagedestroy($logo);

            return false;
        }

        $scale = min($size / $lw, $size / $lh);
        $nw = max(1, (int) round($lw * $scale));
        $nh = max(1, (int) round($lh * $scale));
        $dst = imagecreatetruecolor($nw, $nh);
        imagealphablending($dst, false);
        imagesavealpha($dst, true);
        $transparent = imagecolorallocatealpha($dst, 0, 0, 0, 127);
        imagefilledrectangle($dst, 0, 0, $nw, $nh, $transparent);
        imagealphablending($dst, true);
        imagecopyresampled($dst, $logo, 0, 0, 0, 0, $nw, $nh, $lw, $lh);
        imagedestroy($logo);

        imagecopy($im, $dst, $left, $top + (int) (($size - $nh) / 2), 0, 0, $nw, $nh);
        imagedestroy($dst);

        return true;
    }

    private function resolveLogoPath(): ?string
    {
        $candidates = [
            base_path('../public/logo.png'),
            public_path('logo.png'),
            base_path('../logo.png'),
        ];
        foreach ($candidates as $p) {
            if (is_string($p) && is_file($p)) {
                return $p;
            }
        }

        return null;
    }

    /**
     * @param  \GdImage|resource  $im
     */
    private function drawText($im, string $text, int $x, int $y, int $px, int $color, bool $center, bool $bold): void
    {
        $font = $this->resolveTtfFont($bold);
        if ($font !== null && function_exists('imagettftext')) {
            $box = imagettfbbox($px, 0, $font, $text);
            $tw = 0;
            if (is_array($box)) {
                $tw = (int) abs($box[2] - $box[0]);
            }
            $drawX = $center ? (int) ($x - $tw / 2) : $x;
            // imagettftext usa baseline; ajustar ~ascender
            imagettftext($im, $px, 0, $drawX, $y, $color, $font, $text);

            return;
        }

        // Fallback built-in font (escala aproximada via imagestring)
        $fontId = 5;
        $charW = imagefontwidth($fontId);
        $charH = imagefontheight($fontId);
        $maxChars = max(8, (int) floor((self::WIDTH - 80) / max(1, $charW)));
        $line = mb_substr($text, 0, $maxChars);
        $tw = $charW * strlen($line);
        $drawX = $center ? (int) ($x - $tw / 2) : $x;
        $drawY = (int) ($y - $charH / 2);
        imagestring($im, $fontId, max(10, $drawX), max(10, $drawY), $line, $color);
    }

    private function resolveTtfFont(bool $bold): ?string
    {
        $names = $bold
            ? ['arialbd.ttf', 'Arial Bold.ttf', 'DejaVuSans-Bold.ttf', 'LiberationSans-Bold.ttf']
            : ['arial.ttf', 'Arial.ttf', 'DejaVuSans.ttf', 'LiberationSans-Regular.ttf'];

        $dirs = [
            'C:/Windows/Fonts',
            '/usr/share/fonts/truetype/dejavu',
            '/usr/share/fonts/truetype/liberation',
            '/usr/share/fonts/truetype/msttcorefonts',
            '/usr/share/fonts/TTF',
            base_path('resources/fonts'),
        ];

        foreach ($dirs as $dir) {
            if (! is_dir($dir)) {
                continue;
            }
            foreach ($names as $name) {
                $p = $dir.DIRECTORY_SEPARATOR.$name;
                if (is_file($p)) {
                    return $p;
                }
            }
        }

        return null;
    }

    /**
     * @param  object|array<string,mixed>  $row
     * @return array<string,mixed>
     */
    private function rowToArray(object|array $row): array
    {
        $a = is_array($row) ? $row : (array) $row;

        return [
            'id' => isset($a['id']) ? (int) $a['id'] : null,
            'title' => (string) ($a['title'] ?? self::DEFAULTS['title']),
            'subtitle' => (string) ($a['subtitle'] ?? ''),
            'bg_color_1' => (string) ($a['bg_color_1'] ?? self::DEFAULTS['bg_color_1']),
            'bg_color_2' => (string) ($a['bg_color_2'] ?? self::DEFAULTS['bg_color_2']),
            'text_color' => (string) ($a['text_color'] ?? self::DEFAULTS['text_color']),
            'subtitle_color' => (string) ($a['subtitle_color'] ?? self::DEFAULTS['subtitle_color']),
            'is_active' => filter_var($a['is_active'] ?? true, FILTER_VALIDATE_BOOLEAN),
            'created_at' => $a['created_at'] ?? null,
            'updated_at' => $a['updated_at'] ?? null,
        ];
    }

    private function normalizeHex(mixed $value, string $fallback): string
    {
        $v = strtoupper(trim((string) $value));
        if (preg_match('/^#[0-9A-F]{6}$/', $v)) {
            return $v;
        }
        if (preg_match('/^[0-9A-F]{6}$/', $v)) {
            return '#'.$v;
        }

        return $fallback;
    }

    /**
     * @return array{0:int,1:int,2:int}
     */
    private function hexToRgb(string $hex): array
    {
        $hex = ltrim($this->normalizeHex($hex, '#000000'), '#');

        return [
            (int) hexdec(substr($hex, 0, 2)),
            (int) hexdec(substr($hex, 2, 2)),
            (int) hexdec(substr($hex, 4, 2)),
        ];
    }

    private function sanitizeText(string $text): string
    {
        // Evita quebrar SVG/TTF com caracteres de controle
        $t = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/', '', $text) ?? '';

        return mb_substr($t, 0, 200);
    }
}
