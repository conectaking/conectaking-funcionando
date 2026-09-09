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

        return response()->json([
            'status' => $dbOk ? 'ok' : 'degraded',
            'engine' => 'laravel',
            'db' => $dbOk,
            'time' => gmdate('c'),
        ], $dbOk ? 200 : 503)->header('X-Conecta-Engine', 'laravel');
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
     * `api-config.js`: define `API_BASE` e faz patch ao `fetch()` para anexar o Bearer
     * e reescrever `/api/*` para esta instância.
     */
    public function apiConfigJs(Request $request)
    {
        $proto = trim(explode(',', (string) ($request->header('x-forwarded-proto') ?: $request->getScheme()))[0]);
        $host = trim(explode(',', (string) ($request->header('x-forwarded-host') ?: $request->getHttpHost()))[0]);
        $base = json_encode(rtrim($proto.'://'.$host, '/'), JSON_UNESCAPED_SLASHES);

        $js = <<<JS
        window.CONECTAKING_API_BASE = {$base};
        window.API_BASE = window.API_BASE || {$base};
        (function(){
          var apiBase = {$base};
          var nativeFetch = window.fetch;
          if (!nativeFetch) return;
          function getToken() {
            try {
              return (typeof localStorage !== 'undefined' && (localStorage.getItem('token') || localStorage.getItem('conectaKingToken'))) || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('token')) || '';
            } catch (e) { return ''; }
          }
          window.fetch = function(input, opts) {
            opts = opts || {};
            var url = typeof input === 'string' ? input : (input && input.url) || '';
            var finalUrl = url;
            if (url && (url.indexOf('/api/') === 0 || url.indexOf('api/') === 0)) {
              finalUrl = url.indexOf('http') === 0 ? url : apiBase.replace(/\/$/, '') + (url.indexOf('/') === 0 ? url : '/' + url);
            } else if (url && url.indexOf('/api/') !== -1 && /^https?:\/\//i.test(url) && url.indexOf(apiBase) !== 0) {
              try {
                var uh = new URL(url).hostname.toLowerCase();
                // Mesma-origem: hosts do produto + restos de API antiga em cache
                if (uh.indexOf('conectaking.com.br') !== -1 || uh === 'cnking.bio' || uh === 'www.cnking.bio' || /\.onrender\.com$/i.test(uh)) {
                  finalUrl = url.replace(/^https?:\/\/[^\/]+/, apiBase);
                }
              } catch (e) {}
            }
            var isApiUrl = (finalUrl && (finalUrl.indexOf(apiBase) === 0 || finalUrl.indexOf('conectaking.com.br') !== -1)) || (url && url.indexOf('/api/') === 0);
            if (isApiUrl) {
              var headers = opts.headers || (opts.headers = {});
              if (!(headers.Authorization || (headers.get && headers.get('Authorization')))) {
                var token = getToken();
                if (token) {
                  if (typeof headers.set === 'function') headers.set('Authorization', 'Bearer ' + token);
                  else if (Object.prototype.toString.call(headers) === '[object Headers]') headers.set('Authorization', 'Bearer ' + token);
                  else headers.Authorization = 'Bearer ' + token;
                }
              }
            }
            if (finalUrl === url) return nativeFetch.apply(this, arguments);
            var finalInput = typeof input === 'string' ? finalUrl : (typeof Request !== 'undefined' ? new Request(finalUrl, input) : finalUrl);
            return nativeFetch.call(this, finalInput, opts);
          };
        })();
        JS;

        return response($js)
            ->header('Content-Type', 'application/javascript; charset=utf-8')
            ->header('Cache-Control', 'public, max-age=300')
            ->header('X-Conecta-Engine', 'laravel');
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
            : 'public, max-age=3600';
    }
}
