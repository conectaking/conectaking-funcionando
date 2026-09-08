<?php

namespace App\Services\CartaoVirtual;

/**
 * AES-256-GCM compatível com encryptPassword/decryptPassword do Node KS.
 * Formato: base64(iv).base64(tag).base64(ciphertext)
 */
class KingSelectionPasswordCrypto
{
    public function encrypt(string $plain): string
    {
        $key = $this->key();
        $iv = random_bytes(12);
        $tag = '';
        $enc = openssl_encrypt($plain, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag);
        if ($enc === false) {
            throw new \RuntimeException('Falha ao criptografar senha KS.');
        }

        return base64_encode($iv).'.'.base64_encode($tag).'.'.base64_encode($enc);
    }

    public function decrypt(?string $payload): ?string
    {
        try {
            $parts = explode('.', (string) $payload);
            if (count($parts) !== 3) {
                return null;
            }
            [$ivB64, $tagB64, $dataB64] = $parts;
            $iv = base64_decode($ivB64, true);
            $tag = base64_decode($tagB64, true);
            $data = base64_decode($dataB64, true);
            if ($iv === false || $tag === false || $data === false) {
                return null;
            }
            $out = openssl_decrypt($data, 'aes-256-gcm', $this->key(), OPENSSL_RAW_DATA, $iv, $tag);

            return $out === false ? null : $out;
        } catch (\Throwable) {
            return null;
        }
    }

    private function key(): string
    {
        $raw = (string) (env('KINGSELECTION_PW_KEY') ?: env('JWT_SECRET', ''));

        return hash('sha256', $raw, true);
    }
}
