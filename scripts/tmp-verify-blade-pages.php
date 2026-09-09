<?php

/**
 * Boota o Laravel a sério e confirma que cada `pages/*.blade.php` renderiza
 * exatamente os bytes do HTML legado que lhe deu origem.
 *
 * Uso: php scripts/tmp-verify-blade-pages.php
 */

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\View;

$repo = dirname(__DIR__);

require $repo.'/laravel/vendor/autoload.php';

$app = require $repo.'/laravel/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$roots = [
    $repo.'/laravel/public/shell',
    $repo.'/public',
    $repo.'/public_html',
    $repo.'/laravel/public',
];

$bad = [];
$noSource = [];
$checked = 0;

foreach (glob($repo.'/laravel/resources/views/pages/*.blade.php') ?: [] as $bladeFile) {
    $name = basename($bladeFile, '.blade.php');

    $html = null;
    foreach ($roots as $root) {
        if (is_file($root.'/'.$name.'.html')) {
            $html = (string) file_get_contents($root.'/'.$name.'.html');
            break;
        }
    }

    $rendered = View::make('pages.'.$name)->render();
    $checked++;

    if ($html === null) {
        $noSource[] = $name;
        printf("%-24s SEM HTML DE ORIGEM (render ok, %d bytes)\n", $name, strlen($rendered));

        continue;
    }

    if ($rendered === $html) {
        printf("%-24s IGUAL (%d bytes)\n", $name, strlen($rendered));
    } else {
        $bad[] = $name;
        printf("%-24s DIFERENTE (blade=%d html=%d)\n", $name, strlen($rendered), strlen($html));
    }
}

printf("\nverificadas=%d diferentes=%d sem-html=%d\n", $checked, count($bad), count($noSource));

exit($bad === [] ? 0 : 1);
