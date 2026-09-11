<?php

namespace App\Support;

/**
 * TOTP RFC 6238 (SHA1, 30s, 6 dígitos) sem dependência externa.
 */
class Totp
{
    public static function generateSecret(int $bytes = 20): string
    {
        return self::base32Encode(random_bytes($bytes));
    }

    public static function verify(string $secret, string $code, int $window = 1): bool
    {
        $code = preg_replace('/\s+/', '', $code) ?? '';
        if (! preg_match('/^\d{6}$/', $code)) {
            return false;
        }
        $time = (int) floor(time() / 30);
        for ($i = -$window; $i <= $window; $i++) {
            if (hash_equals(self::at($secret, $time + $i), $code)) {
                return true;
            }
        }

        return false;
    }

    public static function at(string $secret, int $counter): string
    {
        $key = self::base32Decode($secret);
        $bin = pack('N*', 0, $counter);
        $hash = hash_hmac('sha1', $bin, $key, true);
        $offset = ord($hash[19]) & 0x0F;
        $truncated = (
            ((ord($hash[$offset]) & 0x7F) << 24)
            | ((ord($hash[$offset + 1]) & 0xFF) << 16)
            | ((ord($hash[$offset + 2]) & 0xFF) << 8)
            | (ord($hash[$offset + 3]) & 0xFF)
        ) % 1000000;

        return str_pad((string) $truncated, 6, '0', STR_PAD_LEFT);
    }

    public static function otpAuthUrl(string $secret, string $email, string $issuer = 'ConectaKing'): string
    {
        $label = rawurlencode($issuer.':'.$email);
        $iss = rawurlencode($issuer);

        return "otpauth://totp/{$label}?secret={$secret}&issuer={$iss}&digits=6&period=30";
    }

    private static function base32Encode(string $data): string
    {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $bits = '';
        foreach (str_split($data) as $c) {
            $bits .= str_pad(decbin(ord($c)), 8, '0', STR_PAD_LEFT);
        }
        $out = '';
        foreach (str_split($bits, 5) as $chunk) {
            if (strlen($chunk) < 5) {
                $chunk = str_pad($chunk, 5, '0', STR_PAD_RIGHT);
            }
            $out .= $alphabet[bindec($chunk)];
        }

        return $out;
    }

    private static function base32Decode(string $b32): string
    {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $b32 = strtoupper(preg_replace('/[^A-Z2-7]/', '', $b32) ?? '');
        $bits = '';
        for ($i = 0, $n = strlen($b32); $i < $n; $i++) {
            $v = strpos($alphabet, $b32[$i]);
            if ($v === false) {
                continue;
            }
            $bits .= str_pad(decbin($v), 5, '0', STR_PAD_LEFT);
        }
        $out = '';
        foreach (str_split($bits, 8) as $chunk) {
            if (strlen($chunk) === 8) {
                $out .= chr(bindec($chunk));
            }
        }

        return $out;
    }
}
