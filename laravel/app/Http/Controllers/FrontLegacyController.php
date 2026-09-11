<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Serve assets estáticos do painel a partir de public/ (LEGACY_PUBLIC_PATH).
 */
class FrontLegacyController extends Controller
{
    public function health()
    {
        $dbOk = false;
        try {
            DB::selectOne('SELECT 1 AS ok');
            $dbOk = true;
        } catch (\Throwable) {
            $dbOk = false;
        }

        $redisOk = true;
        $queueConn = strtolower((string) (env('QUEUE_CONNECTION') ?: 'sync'));
        if ($queueConn === 'redis') {
            try {
                \Illuminate\Support\Facades\Redis::connection()->ping();
            } catch (\Throwable) {
                $redisOk = false;
            }
        }

        $ok = $dbOk && $redisOk;

        return response()->json(
            ['status' => $ok ? 'ok' : 'degraded'],
            $ok ? 200 : 503
        )->header('X-Conecta-Engine', 'laravel');
    }

    /** Base pública da API (mesmo host / FrankenPHP). */
    public function publicApiUrl()
    {
        $base = rtrim(trim((string) (env('API_URL') ?: 'https://www.conectaking.com.br')), '/');

        return response()->json(['apiBaseUrl' => $base])
            ->header('Cache-Control', 'public, max-age=300')
            ->header('X-Conecta-Engine', 'laravel');
    }

    /**
     * `api-config.js`: alias compatível — mesmo conteúdo unificado de `/config.js`
     * (API_BASE + CSRF/Bearer + rewrite). Fonte: public/config.js.
     */
    public function apiConfigJs(Request $request)
    {
        return $this->page($request, 'config.js');
    }

    public function page(Request $request, string $path = '')
    {
        $path = ltrim(str_replace('\\', '/', $path), '/');
        if ($path === '' || str_ends_with($path, '/')) {
            $path .= 'index.html';
        }
        // Segurança: sem path traversal
        if ($path === '' || str_contains($path, '..') || str_starts_with($path, '/')) {
            return response('Not found', 404);
        }

        $file = $this->resolveFile($path);
        if ($file === null) {
            // aliases sem .html
            if (! str_contains($path, '.')) {
                $file = $this->resolveFile($path.'.html');
            }
        }
        if ($file === null) {
            return response('Not found', 404)->header('X-Conecta-Engine', 'laravel');
        }

        return $this->fileResponse($file);
    }

    private function resolveFile(string $relative): ?string
    {
        foreach ($this->roots() as $root) {
            $full = $root.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $relative);
            $realRoot = realpath($root);
            $realFile = realpath($full);
            if ($realRoot && $realFile && str_starts_with($realFile, $realRoot) && is_file($realFile)) {
                return $realFile;
            }
        }

        return null;
    }

    /**
     * @return list<string>
     */
    private function roots(): array
    {
        $out = [];
        foreach ([
            env('LEGACY_PUBLIC_PATH'),
            public_path(),
        ] as $p) {
            $p = $p ? rtrim(str_replace('\\', '/', (string) $p), '/') : '';
            if ($p !== '' && is_dir($p)) {
                $out[] = $p;
            }
        }

        return array_values(array_unique($out));
    }

    private function fileResponse(string $file): BinaryFileResponse
    {
        $mime = match (strtolower(pathinfo($file, PATHINFO_EXTENSION))) {
            'html', 'htm' => 'text/html; charset=UTF-8',
            'js' => 'application/javascript; charset=UTF-8',
            'css' => 'text/css; charset=UTF-8',
            'json' => 'application/json',
            'svg' => 'image/svg+xml',
            'png' => 'image/png',
            'jpg', 'jpeg' => 'image/jpeg',
            'webp' => 'image/webp',
            'woff2' => 'font/woff2',
            'woff' => 'font/woff',
            'ttf' => 'font/ttf',
            default => 'application/octet-stream',
        };

        return response()->file($file, [
            'Content-Type' => $mime,
            'X-Conecta-Engine' => 'laravel',
            'Cache-Control' => $this->cacheControlFor($file, $mime),
        ]);
    }

    private function cacheControlFor(string $file, string $mime): string
    {
        $base = strtolower(basename($file));
        // config.js / api-config não podem ficar presos no CDN com base de API antiga.
        if ($base === 'config.js' || $base === 'api-config.js' || str_ends_with($base, 'kingselectionedit.js')) {
            return 'no-cache, no-store, must-revalidate, max-age=0';
        }

        return str_ends_with($mime, 'html; charset=UTF-8')
            ? 'no-cache, no-store, must-revalidate'
            : (preg_match('/-[A-Za-z0-9_-]{6,}\.(js|css)$/', $base)
                ? 'public, max-age=31536000, immutable'
                : 'public, max-age=86400');
    }
}
