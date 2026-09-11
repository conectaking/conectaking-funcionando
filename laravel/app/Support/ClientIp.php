<?php

namespace App\Support;

use Illuminate\Http\Request;

/**
 * IP real do cliente atrás de Cloudflare / Caddy / Docker.
 */
final class ClientIp
{
    public static function from(Request $request): string
    {
        $candidates = [
            $request->header('CF-Connecting-IP'),
            $request->header('True-Client-IP'),
            $request->header('X-Real-IP'),
        ];
        foreach ($candidates as $raw) {
            $ip = self::firstValidIp((string) $raw);
            if ($ip !== null) {
                return $ip;
            }
        }

        $xff = (string) $request->header('X-Forwarded-For', '');
        if ($xff !== '') {
            foreach (explode(',', $xff) as $part) {
                $ip = self::firstValidIp(trim($part));
                if ($ip !== null) {
                    return $ip;
                }
            }
        }

        $fallback = (string) $request->ip();

        return $fallback !== '' ? $fallback : '0.0.0.0';
    }

    private static function firstValidIp(string $raw): ?string
    {
        $raw = trim($raw);
        if ($raw === '') {
            return null;
        }
        if (filter_var($raw, FILTER_VALIDATE_IP)) {
            return $raw;
        }

        return null;
    }
}
