<?php

namespace App\Support\KingSelection;

/**
 * Helpers de acesso KS — paridade com routes/kingSelection.routes.js.
 */
final class KsAccess
{
    public static function normAccessMode(mixed $raw): string
    {
        $am = strtolower(trim((string) ($raw ?: 'private')));
        if ($am === 'password') {
            $am = 'signup';
        }
        if (! in_array($am, ['private', 'signup', 'public', 'paid_event_photos'], true)) {
            $am = 'private';
        }

        return $am;
    }

    public static function allowsSelfSignup(mixed $accessMode): bool
    {
        $am = self::normAccessMode($accessMode);

        return $am === 'signup' || $am === 'paid_event_photos';
    }

    public static function isLockedStatus(mixed $raw): bool
    {
        $st = self::normStatus($raw);

        return $st === 'revisao' || $st === 'finalizado';
    }

    /**
     * @param  array<string,mixed>  $payload
     * @return array{cid:?int, sk:?string}
     */
    public static function parseClientContext(array $payload): array
    {
        $rawId = $payload['clientId'] ?? null;
        $cid = ($rawId !== null && $rawId !== '') ? (int) $rawId : 0;
        $sk = isset($payload['sk']) && trim((string) $payload['sk']) !== ''
            ? substr(trim((string) $payload['sk']), 0, 40)
            : null;

        return [
            'cid' => $cid > 0 ? $cid : null,
            'sk' => $sk,
        ];
    }

    public static function phoneMatchesStored(mixed $storedTel, mixed $inputTel): bool
    {
        $stored = self::normClientPhoneDigits($storedTel);
        if ($stored === '' || strlen($stored) < 8) {
            return true;
        }

        return $stored === self::normClientPhoneDigits($inputTel);
    }

    public static function shouldBackfillPhone(mixed $storedTel, mixed $inputTel): bool
    {
        $stored = self::normClientPhoneDigits($storedTel);
        $input = self::normClientPhoneDigits($inputTel);

        return strlen($stored) < 8 && strlen($input) >= 8;
    }

    public static function isTechnicalFaceEmail(mixed $email): bool
    {
        $e = strtolower((string) ($email ?: ''));
        if (str_starts_with($e, '__ks_face_default_') || str_starts_with($e, '__ks_face_sess_')) {
            return true;
        }

        return str_ends_with($e, '@cadastro.kingselection.invalid')
            || str_ends_with($e, '@publico.kingselection.invalid');
    }

    public static function normStatus(mixed $raw): string
    {
        return self::stripAccents(strtolower(trim((string) ($raw ?: ''))));
    }

    public static function normClientNameMatch(mixed $s): string
    {
        $out = self::stripAccents(strtolower(trim((string) ($s ?: ''))));
        $out = preg_replace('/\s+/u', ' ', $out) ?? $out;

        return $out;
    }

    public static function normClientPhoneDigits(mixed $s): string
    {
        return preg_replace('/\D+/', '', (string) ($s ?: '')) ?? '';
    }

    private static function stripAccents(string $s): string
    {
        if (class_exists(\Normalizer::class)) {
            $n = \Normalizer::normalize($s, \Normalizer::FORM_D);
            if (is_string($n) && $n !== '') {
                $s = $n;
            }
            $s = preg_replace('/[\x{0300}-\x{036f}]/u', '', $s) ?? $s;
        } elseif (function_exists('iconv')) {
            $t = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s);
            if (is_string($t) && $t !== '') {
                $s = $t;
            }
        }

        return trim($s);
    }
}
