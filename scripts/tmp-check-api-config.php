<?php
/* Temporário: confere se o api-config.js do Laravel bate com o do Express. */

$nl = static fn (string $s): string => str_replace(["\r\n", "\r"], "\n", $s);

$php = $nl(file_get_contents(__DIR__.'/../laravel/app/Http/Controllers/FrontLegacyController.php'));
if (! preg_match('/\$js = <<<JS\n(.*?)\n\s*JS;/s', $php, $m)) {
    fwrite(STDERR, "heredoc nao encontrado\n");
    exit(1);
}
$base = json_encode('https://example.test', JSON_UNESCAPED_SLASHES);
$body = preg_replace('/^ {8}/m', '', $m[1]);
$fromLaravel = str_replace('{$base}', $base, $body);

$server = $nl(file_get_contents(__DIR__.'/../server.js'));
if (! preg_match('/res\.send\(\n`(.*?)`\n\s*\);/s', $server, $m2)) {
    fwrite(STDERR, "template do server.js nao encontrado\n");
    exit(1);
}
$fromNode = str_replace('${base}', $base, $m2[1]);
$fromNode = str_replace(['\\\\/', '\\\\$'], ['\\/', '\\$'], $fromNode);

$norm = static fn (string $s): string => trim(preg_replace('/\s+/', ' ', $s));

if ($norm($fromLaravel) === $norm($fromNode)) {
    echo "IGUAL (normalizado)\n";
    exit(0);
}
echo "DIFERENTE\n--- laravel ---\n".$fromLaravel."\n--- node ---\n".$fromNode."\n";
exit(1);
