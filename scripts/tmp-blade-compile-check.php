<?php
/* Temporário: compila as views Blade e roda php -l no PHP gerado. */

require __DIR__.'/../laravel/vendor/autoload.php';

use Illuminate\Filesystem\Filesystem;
use Illuminate\View\Compilers\BladeCompiler;

$files = new Filesystem;
$cache = sys_get_temp_dir().'/blade-check-'.getmypid();
$files->ensureDirectoryExists($cache);
$compiler = new BladeCompiler($files, $cache);

$views = [];
$it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(__DIR__.'/../laravel/resources/views'));
foreach ($it as $file) {
    if ($file->isFile() && str_ends_with($file->getFilename(), '.blade.php')) {
        $views[] = $file->getPathname();
    }
}

$failed = 0;
foreach ($views as $view) {
    $compiler->compile($view);
    $compiled = $compiler->getCompiledPath($view);
    $out = [];
    $code = 0;
    exec('php -l '.escapeshellarg($compiled).' 2>&1', $out, $code);
    if ($code !== 0) {
        $failed++;
        echo "FALHA: {$view}\n".implode("\n", $out)."\n";
    }
}
$files->deleteDirectory($cache);
echo 'Views compiladas: '.count($views).' | falhas: '.$failed."\n";
exit($failed > 0 ? 1 : 0);
