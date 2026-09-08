<?php

namespace App\Support;

/**
 * Dispara artisan em background (Linux/Docker) — evita bloquear HTTP no artisan serve.
 */
final class BackgroundArtisan
{
    public static function run(string $signature, string ...$args): void
    {
        $php = PHP_BINARY ?: 'php';
        $artisan = base_path('artisan');
        $parts = array_merge([$php, $artisan, $signature], $args);
        $escaped = array_map('escapeshellarg', $parts);
        $cmd = implode(' ', $escaped).' > /dev/null 2>&1 &';
        if (DIRECTORY_SEPARATOR === '\\') {
            // Windows local: start /B
            $cmd = 'start /B '.implode(' ', $escaped).' > NUL 2>&1';
            pclose(popen($cmd, 'r'));

            return;
        }
        exec($cmd);
    }
}
