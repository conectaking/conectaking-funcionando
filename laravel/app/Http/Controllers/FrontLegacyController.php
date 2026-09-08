<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Serve HTML/JS legado (public + public_html) até virarem Blade — necessário para matar o Node.
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

        return response()->json([
            'status' => $dbOk ? 'ok' : 'degraded',
            'engine' => 'laravel',
            'db' => $dbOk,
            'time' => gmdate('c'),
        ], $dbOk ? 200 : 503)->header('X-Conecta-Engine', 'laravel');
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
            env('LEGACY_PUBLIC_HTML_PATH'),
            public_path(),
            public_path('shell'),
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
            default => 'application/octet-stream',
        };

        return response()->file($file, [
            'Content-Type' => $mime,
            'X-Conecta-Engine' => 'laravel',
            'Cache-Control' => str_ends_with($mime, 'html; charset=UTF-8')
                ? 'no-cache, no-store, must-revalidate'
                : 'public, max-age=3600',
        ]);
    }
}
