<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Códigos opacos para links pessoais KS (evita JWT na URL / Referer / histórico).
 */
final class KsAccessCode
{
    private const PREFIX = 'ks_access_code:';

    private const TTL_SECONDS = 90 * 24 * 3600;

    /**
     * @param  array{galleryId:int, slug:string, clientId:int, jwt:string}  $payload
     */
    public static function store(array $payload): string
    {
        $code = rtrim(strtr(base64_encode(random_bytes(24)), '+/', '-_'), '=');
        Cache::put(self::PREFIX.$code, [
            'galleryId' => (int) ($payload['galleryId'] ?? 0),
            'slug' => (string) ($payload['slug'] ?? ''),
            'clientId' => (int) ($payload['clientId'] ?? 0),
            'jwt' => (string) ($payload['jwt'] ?? ''),
        ], self::TTL_SECONDS);

        return $code;
    }

    /**
     * @return array{galleryId:int, slug:string, clientId:int, jwt:string}|null
     */
    public static function take(string $code): ?array
    {
        $code = trim($code);
        if ($code === '' || strlen($code) > 128) {
            return null;
        }
        $key = self::PREFIX.$code;
        $raw = Cache::get($key);
        if (! is_array($raw) || empty($raw['jwt'])) {
            return null;
        }

        return [
            'galleryId' => (int) ($raw['galleryId'] ?? 0),
            'slug' => (string) ($raw['slug'] ?? ''),
            'clientId' => (int) ($raw['clientId'] ?? 0),
            'jwt' => (string) $raw['jwt'],
        ];
    }

    public static function buildUrl(string $slug, string $code): string
    {
        $base = rtrim((string) (env('SHARE_BASE_URL') ?: env('APP_URL') ?: ''), '/');
        $path = '/kingSelection/'.rawurlencode(trim($slug));
        $q = 'k='.rawurlencode($code);

        return $base !== '' ? $base.$path.'?'.$q : $path.'?'.$q;
    }

    public static function isLikelyCode(string $value): bool
    {
        $value = trim($value);

        return $value !== '' && ! str_contains($value, '.') && strlen($value) >= 16 && strlen($value) <= 128;
    }

    public static function randomHint(): string
    {
        return Str::lower(Str::random(8));
    }
}
