<?php

namespace App\Support;

/**
 * Equivalente ao nanoid() do Node (mesmo alfabeto URL-safe).
 */
class NanoId
{
    private const ALPHABET = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';

    public static function generate(int $size = 21): string
    {
        $max = strlen(self::ALPHABET) - 1;
        $out = '';
        for ($i = 0; $i < $size; $i++) {
            $out .= self::ALPHABET[random_int(0, $max)];
        }

        return $out;
    }
}
