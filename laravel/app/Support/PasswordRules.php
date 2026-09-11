<?php

namespace App\Support;

/**
 * Política unificada de senha forte (registro + reset).
 */
class PasswordRules
{
    /**
     * @return array{valid:bool, errors:list<string>}
     */
    public static function validate(string $password): array
    {
        $hint = 'Senha inválida. Use no mínimo 8 caracteres, com maiúscula, minúscula e número.';
        $errors = [];
        if (strlen($password) < 8) {
            $errors[] = $hint;
        }
        if (! preg_match('/[A-Z]/', $password) || ! preg_match('/[a-z]/', $password) || ! preg_match('/[0-9]/', $password)) {
            $errors[] = $hint;
        }

        return ['valid' => $errors === [], 'errors' => array_values(array_unique($errors))];
    }
}
