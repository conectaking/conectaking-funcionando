<?php

namespace App\Support;

/**
 * Resolução account_type / subscription → plan_code (paridade Node).
 */
class PlanCodeResolver
{
    public const ACCOUNT_TYPE_TO_PLAN = [
        'individual' => 'basic',
        'individual_com_logo' => 'premium',
        'basic' => 'basic',
        'king_start' => 'basic',
        'premium' => 'premium',
        'king_prime' => 'premium',
        'business_owner' => 'king_corporate',
        'enterprise' => 'king_corporate',
        'king_base' => 'king_base',
        'king_essential' => 'king_base',
        'king_finance' => 'king_finance',
        'king_finance_plus' => 'king_finance_plus',
        'king_premium_plus' => 'king_premium_plus',
        'king_corporate' => 'king_corporate',
        'free' => 'free',
        'adm_principal' => 'adm_principal',
        'abm' => 'adm_principal',
        'team_member' => 'basic',
        'pro' => 'pro',
        'business' => 'business',
        'empresa' => 'business',
    ];

    public static function normalize(string $code): string
    {
        $c = strtolower(trim($code));
        if ($c === '' || $c === 'start' || $c === 'king_start') {
            return 'basic';
        }

        return $c;
    }

    public static function fromAccountType(?string $accountType): string
    {
        $t = (string) $accountType;
        if ($t === '') {
            return 'basic';
        }
        $mapped = self::ACCOUNT_TYPE_TO_PLAN[$t] ?? $t;

        return self::normalize((string) $mapped);
    }
}
