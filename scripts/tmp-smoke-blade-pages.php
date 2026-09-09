<?php

/**
 * Smoke HTTP das páginas Blade: dispara pedidos pelo kernel real e mostra
 * status/tamanho de cada rota (inclui `checkoutConfig`, que continua em HTML).
 *
 * Uso: php scripts/tmp-smoke-blade-pages.php [/rota ...]
 */

use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;

$repo = dirname(__DIR__);

require $repo.'/laravel/vendor/autoload.php';

$app = require $repo.'/laravel/bootstrap/app.php';
$kernel = $app->make(Kernel::class);

$uris = array_slice($argv, 1);
if ($uris === []) {
    $uris = [
        '/kingSelectionProject', '/kingSelection', '/documentos-preview', '/recibos-orcamentos',
        '/l/responsesList', '/index.html', '/termos', '/admin-planos', '/checkoutConfig',
    ];
}

$fail = 0;
foreach ($uris as $uri) {
    try {
        $res = $kernel->handle(Request::create($uri, 'GET'));
        $body = $res->getContent();
        if ($body === false && method_exists($res, 'getFile')) {
            $body = (string) file_get_contents($res->getFile()->getPathname());
        }
        $status = $res->getStatusCode();
        printf("%-24s %d  %7d bytes  engine=%s\n", $uri, $status, strlen((string) $body), $res->headers->get('X-Conecta-Engine') ?: '-');
        if ($status !== 200) {
            $fail++;
        }
    } catch (\Throwable $e) {
        $fail++;
        printf("%-24s ERRO %s\n", $uri, $e->getMessage());
    }
}

printf("\nfalhas=%d\n", $fail);

exit($fail === 0 ? 0 : 1);
