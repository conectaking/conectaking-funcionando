<?php

/**
 * Converte HTML legado em `laravel/resources/views/pages/*.blade.php`.
 *
 * O ficheiro só é escrito quando o compilador Blade real devolve, a partir do
 * candidato gerado, exatamente os mesmos bytes do HTML de origem — logo a página
 * servida pelo Laravel não muda nem um caractere.
 *
 * Estratégia, por ordem de preferência:
 *   1. cópia crua (o HTML já é Blade válido);
 *   2. escape de `@` -> `@@` e de `{{` / `{!!`;
 *   3. embrulho em `@verbatim`.
 *
 * Uso: php scripts/tmp-html-to-blade.php [nome ...]
 */

use Illuminate\Filesystem\Filesystem;
use Illuminate\View\Compilers\BladeCompiler;

require __DIR__.'/../laravel/vendor/autoload.php';

$repo = dirname(__DIR__);
$outDir = $repo.'/laravel/resources/views/pages';

/**
 * Mesma ordem de resolução do FrontLegacyController em produção
 * (LEGACY_PUBLIC_PATH=./public, LEGACY_PUBLIC_HTML_PATH=./public_html, depois
 * laravel/public e laravel/public/shell), mas com `shell/` à frente porque é o
 * override usado pelo dashboard/login já convertidos.
 */
$roots = [
    'shell' => $repo.'/laravel/public/shell',
    'public' => $repo.'/public',
    'public_html' => $repo.'/public_html',
    'laravel-public' => $repo.'/laravel/public',
];

$pages = array_slice($argv, 1);
if ($pages === []) {
    fwrite(STDERR, "Nada a converter.\n");
    exit(1);
}

$compiler = new BladeCompiler(new Filesystem(), sys_get_temp_dir().'/blade-check');

/** Escapa o que o Blade interpretaria: diretivas `@x` e ecos `{{` / `{!!`. */
$escape = static function (string $html): string {
    $out = preg_replace('/@(?=[A-Za-z_(@])/', '@@', $html) ?? $html;
    $out = str_replace('{!!', '@{!!', $out);

    return str_replace('{{', '@{{', $out);
};

$strategies = [
    'raw' => static fn (string $html): string => $html,
    'escaped' => $escape,
    'verbatim' => static fn (string $html): string => '@verbatim'.$html.'@endverbatim',
];

$ok = [];
$failed = [];
$missing = [];

foreach ($pages as $page) {
    $source = null;
    $sourceRoot = null;
    foreach ($roots as $label => $root) {
        $candidate = $root.'/'.$page.'.html';
        if (is_file($candidate)) {
            $source = $candidate;
            $sourceRoot = $label;
            break;
        }
    }

    if ($source === null) {
        $missing[] = $page;
        printf("%-24s SEM FONTE\n", $page);

        continue;
    }

    $html = (string) file_get_contents($source);

    $written = false;
    foreach ($strategies as $name => $build) {
        $blade = $build($html);
        try {
            $compiled = $compiler->compileString($blade);
        } catch (\Throwable $e) {
            continue;
        }
        if ($compiled !== $html) {
            continue;
        }

        file_put_contents($outDir.'/'.$page.'.blade.php', $blade);
        $ok[$page] = [$name, $sourceRoot, strlen($html)];
        printf("%-24s OK   %-9s fonte=%-12s %d bytes\n", $page, $name, $sourceRoot, strlen($html));
        $written = true;
        break;
    }

    if (! $written) {
        $failed[] = $page;
        printf("%-24s FALHOU (nenhuma estratégia reproduz o HTML)\n", $page);
    }
}

printf("\nconvertidas=%d falhadas=%d sem-fonte=%d\n", count($ok), count($failed), count($missing));
if ($failed !== []) {
    fwrite(STDERR, 'Falharam: '.implode(', ', $failed)."\n");
}
if ($missing !== []) {
    fwrite(STDERR, 'Sem fonte: '.implode(', ', $missing)."\n");
}

exit($failed === [] ? 0 : 1);
