<?php

namespace App\Support;

use RuntimeException;

/**
 * Mesmo formato do utils/encryption.js: base64(iv[16] || salt[64] || tag[16] || ciphertext),
 * chave derivada por SHA-256 crua. Precisa ser byte a byte compatível — os tokens já
 * gravados pelo Node continuam sendo lidos aqui.
 */
class AesGcmCrypto
{
    private const IV_LENGTH = 16;

    private const SALT_LENGTH = 64;

    private const TAG_LENGTH = 16;

    private const CIPHER = 'aes-256-gcm';

    public static function encrypt(string $text, string $keyString): string
    {
        if ($text === '' || $keyString === '') {
            throw new RuntimeException('Texto ou chave inválidos para criptografia');
        }

        $iv = random_bytes(self::IV_LENGTH);
        $salt = random_bytes(self::SALT_LENGTH);
        $tag = '';

        $encrypted = openssl_encrypt(
            $text,
            self::CIPHER,
            self::deriveKey($keyString),
            OPENSSL_RAW_DATA,
            $iv,
            $tag,
            '',
            self::TAG_LENGTH
        );

        if ($encrypted === false) {
            throw new RuntimeException('Falha ao criptografar');
        }

        return base64_encode($iv.$salt.$tag.$encrypted);
    }

    public static function decrypt(string $encryptedData, string $keyString): string
    {
        if ($encryptedData === '' || $keyString === '') {
            throw new RuntimeException('Dados criptografados ou chave inválidos');
        }

        $buffer = base64_decode($encryptedData, true);
        if ($buffer === false || strlen($buffer) <= self::IV_LENGTH + self::SALT_LENGTH + self::TAG_LENGTH) {
            throw new RuntimeException('Falha ao descriptografar: payload inválido');
        }

        $iv = substr($buffer, 0, self::IV_LENGTH);
        $tag = substr($buffer, self::IV_LENGTH + self::SALT_LENGTH, self::TAG_LENGTH);
        $ciphertext = substr($buffer, self::IV_LENGTH + self::SALT_LENGTH + self::TAG_LENGTH);

        $plain = openssl_decrypt(
            $ciphertext,
            self::CIPHER,
            self::deriveKey($keyString),
            OPENSSL_RAW_DATA,
            $iv,
            $tag
        );

        if ($plain === false) {
            throw new RuntimeException('Falha ao descriptografar');
        }

        return $plain;
    }

    private static function deriveKey(string $keyString): string
    {
        return hash('sha256', $keyString, true);
    }
}
