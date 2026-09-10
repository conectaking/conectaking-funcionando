<?php

namespace App\Support;

/**
 * Validação de URLs remotas para proxies (anti-SSRF).
 */
final class SafeRemoteUrl
{
    /** @var list<string> */
    private const ALLOWED_HOST_SUFFIXES = [
        'conectaking.com.br',
        'cnking.bio',
        'imagedelivery.net',
        'cloudflare.com',
        'r2.dev',
        'r2.cloudflarestorage.com',
        'ibb.co',
        'i.ibb.co',
        'amazonaws.com',
        'cloudfront.net',
    ];

    public static function isAllowed(string $url, bool $requireHttps = true): bool
    {
        $url = trim($url);
        if ($url === '' || strlen($url) > 2048) {
            return false;
        }

        $parts = parse_url($url);
        if (! is_array($parts)) {
            return false;
        }

        $scheme = strtolower((string) ($parts['scheme'] ?? ''));
        if ($requireHttps) {
            if ($scheme !== 'https') {
                return false;
            }
        } elseif (! in_array($scheme, ['http', 'https'], true)) {
            return false;
        }

        $host = strtolower((string) ($parts['host'] ?? ''));
        if ($host === '' || str_contains($host, ':')) {
            // IPv6 literal — bloquear
            return false;
        }

        if (filter_var($host, FILTER_VALIDATE_IP)) {
            return self::isPublicIp($host);
        }

        foreach (self::ALLOWED_HOST_SUFFIXES as $suffix) {
            if ($host === $suffix || str_ends_with($host, '.'.$suffix)) {
                // Resolver e garantir que não aponta para IP privado
                $ips = @gethostbynamel($host) ?: [];
                if ($ips === []) {
                    return false;
                }
                foreach ($ips as $ip) {
                    if (! self::isPublicIp($ip)) {
                        return false;
                    }
                }

                return true;
            }
        }

        return false;
    }

    private static function isPublicIp(string $ip): bool
    {
        if (! filter_var($ip, FILTER_VALIDATE_IP)) {
            return false;
        }

        return (bool) filter_var(
            $ip,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
        );
    }
}
