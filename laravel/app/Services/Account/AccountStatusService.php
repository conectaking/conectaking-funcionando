<?php

namespace App\Services\Account;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AccountStatusService
{
    private const ACCOUNT_TYPE_TO_PLAN = [
        'individual' => 'basic',
        'basic' => 'basic',
        'pro' => 'pro',
        'premium' => 'premium',
        'business' => 'business',
        'empresa' => 'business',
    ];

    /**
     * @return array<string,mixed>
     */
    public function statusForUser(string $userId): array
    {
        $user = DB::selectOne(
            'SELECT u.id, u.email, u.account_type, u.subscription_id, u.is_admin,
                    u.subscription_status, u.subscription_expires_at,
                    u.company_logo_url, u.company_logo_size, u.company_logo_link,
                    p.display_name, p.profile_image_url
             FROM users u
             LEFT JOIN user_profiles p ON u.id = p.user_id
             WHERE u.id = ? LIMIT 1',
            [$userId]
        );
        if (!$user) {
            throw new \RuntimeException('Usuário não encontrado.');
        }

        $planCode = null;
        $subscriptionId = $user->subscription_id ?? null;
        if ($subscriptionId) {
            try {
                $plan = DB::selectOne(
                    'SELECT plan_code, plan_name, is_active FROM subscription_plans WHERE id = ? LIMIT 1',
                    [$subscriptionId]
                );
                if ($plan && filter_var($plan->is_active ?? true, FILTER_VALIDATE_BOOLEAN)) {
                    $planCode = $this->normalizePlanCode((string) ($plan->plan_code ?? ''));
                }
            } catch (\Throwable $e) {
                Log::warning('account.plan', ['error' => $e->getMessage()]);
            }
        }
        if (!$planCode) {
            $accountType = (string) ($user->account_type ?? '');
            $planCode = $this->normalizePlanCode(self::ACCOUNT_TYPE_TO_PLAN[$accountType] ?? $accountType ?: 'basic');
        }
        if (!$planCode) {
            $planCode = 'basic';
        }

        $baseModules = [];
        try {
            $rows = DB::select(
                'SELECT module_type FROM module_plan_availability WHERE plan_code = ? AND is_available = true',
                [$planCode]
            );
            $baseModules = array_map(static fn ($r) => (string) $r->module_type, $rows);
        } catch (\Throwable) {
            $baseModules = [];
        }

        $individualModules = [];
        $excludedModules = [];
        try {
            $individualModules = array_map(
                static fn ($r) => (string) $r->module_type,
                DB::select('SELECT module_type FROM individual_user_plans WHERE user_id = ?', [$userId])
            );
        } catch (\Throwable) {
        }
        try {
            $excludedModules = array_map(
                static fn ($r) => (string) $r->module_type,
                DB::select('SELECT module_type FROM individual_user_plan_exclusions WHERE user_id = ?', [$userId])
            );
        } catch (\Throwable) {
        }

        $baseSet = array_fill_keys($baseModules, true);
        $indSet = array_fill_keys($individualModules, true);
        $exSet = array_fill_keys($excludedModules, true);
        $has = static function (string $type) use ($baseSet, $indSet, $exSet): bool {
            return (($baseSet[$type] ?? false) && !($exSet[$type] ?? false)) || ($indSet[$type] ?? false);
        };

        return [
            'id' => (string) $user->id,
            'email' => (string) $user->email,
            'accountType' => $user->account_type ?? null,
            'subscriptionId' => $subscriptionId,
            'isAdmin' => filter_var($user->is_admin ?? false, FILTER_VALIDATE_BOOLEAN),
            'name' => $user->display_name ?? null,
            'profileImageUrl' => $user->profile_image_url ?? null,
            'subscriptionStatus' => $user->subscription_status ?? null,
            'subscriptionExpiresAt' => $user->subscription_expires_at ?? null,
            'companyLogoUrl' => $user->company_logo_url ?? null,
            'companyLogoSize' => $user->company_logo_size ?? null,
            'companyLogoLink' => $user->company_logo_link ?? null,
            'hasModoEmpresa' => $has('modo_empresa'),
            'hasFinance' => $has('finance'),
            'hasContract' => false,
            'hasAgenda' => false,
            'hasBranding' => $has('branding'),
            'hasKingBrief' => false,
            'hasKingSelection' => $has('king_selection'),
            'hasPhotographerSite' => false,
            'hasDigitalForm' => $has('digital_form'),
            'hasKingDocs' => $has('king_docs'),
            'hasKingBolao' => false,
            'plan_code' => $planCode,
            'linkLimits' => new \stdClass,
        ];
    }

    private function normalizePlanCode(string $code): string
    {
        $c = strtolower(trim($code));
        if ($c === '' || $c === 'start' || $c === 'king_start') {
            return 'basic';
        }

        return $c;
    }
}
