<?php

namespace App\Support;

/**
 * Whitelist de classes Font Awesome (evita XSS via icon_class em HTML/atributos).
 */
final class SafeIconClass
{
    public static function sanitize(?string $raw, string $fallback = 'fas fa-link'): string
    {
        $raw = trim((string) $raw);
        if ($raw === '') {
            return $fallback;
        }

        $tokens = preg_split('/\s+/', $raw) ?: [];
        $out = [];
        foreach ($tokens as $t) {
            if (preg_match('/^(fa[srlb]?|fa-(solid|regular|brands)|fa-[a-z0-9-]+)$/i', $t) === 1) {
                $out[] = strtolower($t);
            }
        }

        return $out !== [] ? implode(' ', array_unique($out)) : $fallback;
    }
}
