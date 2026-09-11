<?php

namespace App\Services\Auth;

use UnexpectedValueException;

/**
 * Verificação JWT HS256 (mesmo contrato do painel: JWT_SECRET).
 */
class JwtService
{
    /**
     * @return array<string, mixed>
     */
    public function decode(string $token): array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            throw new UnexpectedValueException('Token JWT malformado.');
        }

        [$h64, $p64, $s64] = $parts;
        $secret = (string) env('JWT_SECRET', '');
        if ($secret === '') {
            throw new UnexpectedValueException('JWT_SECRET não configurado.');
        }

        $expected = $this->base64UrlEncode(hash_hmac('sha256', $h64.'.'.$p64, $secret, true));
        if (!hash_equals($expected, $s64)) {
            throw new UnexpectedValueException('Assinatura JWT inválida.');
        }

        $payloadJson = $this->base64UrlDecode($p64);
        $payload = json_decode($payloadJson, true);
        if (!is_array($payload)) {
            throw new UnexpectedValueException('Payload JWT inválido.');
        }

        if (isset($payload['exp']) && is_numeric($payload['exp']) && time() >= (int) $payload['exp']) {
            throw new UnexpectedValueException('Token expirado.');
        }

        return $payload;
    }

    /**
     * @param  array<string,mixed>  $payload
     */
    public function encode(array $payload, string $expiresIn = '14d'): string
    {
        $secret = (string) env('JWT_SECRET', '');
        if ($secret === '') {
            throw new UnexpectedValueException('JWT_SECRET não configurado.');
        }
        if (!isset($payload['iat'])) {
            $payload['iat'] = time();
        }
        if (!isset($payload['exp'])) {
            $payload['exp'] = time() + $this->parseExpiresIn($expiresIn);
        }
        if (!isset($payload['jti'])) {
            $payload['jti'] = bin2hex(random_bytes(16));
        }
        $header = $this->base64UrlEncode(json_encode(['alg' => 'HS256', 'typ' => 'JWT'], JSON_UNESCAPED_UNICODE) ?: '{}');
        $body = $this->base64UrlEncode(json_encode($payload, JSON_UNESCAPED_UNICODE) ?: '{}');
        $sig = $this->base64UrlEncode(hash_hmac('sha256', $header.'.'.$body, $secret, true));

        return $header.'.'.$body.'.'.$sig;
    }

    public function parseExpiresInSeconds(string $expiresIn): int
    {
        return $this->parseExpiresIn($expiresIn);
    }

    private function parseExpiresIn(string $expiresIn): int
    {
        if (preg_match('/^(\d+)([smhd])$/i', trim($expiresIn), $m)) {
            $n = (int) $m[1];

            return match (strtolower($m[2])) {
                's' => $n,
                'm' => $n * 60,
                'h' => $n * 3600,
                'd' => $n * 86400,
                default => 14 * 86400,
            };
        }

        return 14 * 86400;
    }

    private function base64UrlDecode(string $data): string
    {
        $remainder = strlen($data) % 4;
        if ($remainder) {
            $data .= str_repeat('=', 4 - $remainder);
        }

        return (string) base64_decode(strtr($data, '-_', '+/'), true);
    }

    private function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
