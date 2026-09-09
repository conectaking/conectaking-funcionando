<?php

namespace App\Support;

/**
 * URLs seguras para o cartão público (bloqueia javascript:/data:/vbscript:).
 */
final class SafeUrl
{
    public static function publicHref(?string $raw): string
    {
        $url = trim((string) $raw);
        if ($url === '' || $url === '#') {
            return '#';
        }

        $lower = strtolower($url);
        if (str_starts_with($lower, 'javascript:')
            || str_starts_with($lower, 'data:')
            || str_starts_with($lower, 'vbscript:')
            || str_starts_with($lower, 'file:')) {
            return '#';
        }

        if (preg_match('#^(https?:|mailto:|tel:|whatsapp:|sms:|/|#)#i', $url) === 1) {
            return $url;
        }

        // Domínio sem esquema → https
        if (preg_match('#^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}([/:?#].*)?$#i', $url) === 1) {
            return 'https://'.$url;
        }

        return '#';
    }
}
