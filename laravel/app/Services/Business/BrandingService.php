<?php

namespace App\Services\Business;

use App\Support\SchemaMeta;

use Illuminate\Support\Facades\DB;

class BrandingService
{
    private const PLANOS_LOGO = [
        'king_finance', 'king_finance_plus', 'king_premium_plus', 'king_corporate',
        'business_owner', 'individual_com_logo', 'enterprise',
    ];

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function save(string $userId, array $body): array
    {
        $user = DB::selectOne('SELECT id, is_admin, account_type FROM users WHERE id = ? LIMIT 1', [$userId]);
        if (! $user) {
            return ['status' => 401, 'body' => ['success' => false, 'message' => 'Não autorizado.']];
        }
        $isAdmin = filter_var($user->is_admin ?? false, FILTER_VALIDATE_BOOLEAN);
        $accountType = (string) ($user->account_type ?? '');
        if (! $isAdmin && ! in_array($accountType, self::PLANOS_LOGO, true)) {
            return ['status' => 403, 'body' => [
                'success' => false,
                'message' => 'Acesso negado. A personalização de logo está disponível apenas para os planos King Finance, King Finance Plus, King Premium Plus e King Corporate.',
            ]];
        }

        if (! SchemaMeta::hasColumn('users', 'company_logo_url')) {
            return ['status' => 503, 'body' => ['success' => false, 'message' => 'Colunas company_logo_* em falta.']];
        }

        $logoUrl = isset($body['logoUrl']) && trim((string) $body['logoUrl']) !== '' ? trim((string) $body['logoUrl']) : null;
        $logoSize = min(420, max(20, (int) ($body['logoSize'] ?? 60)));
        $logoLink = isset($body['logoLink']) && trim((string) $body['logoLink']) !== '' ? trim((string) $body['logoLink']) : null;

        $sets = ['company_logo_url = ?'];
        $vals = [$logoUrl];
        if (SchemaMeta::hasColumn('users', 'company_logo_size')) {
            $sets[] = 'company_logo_size = ?';
            $vals[] = $logoSize;
        }
        if (SchemaMeta::hasColumn('users', 'company_logo_link')) {
            $sets[] = 'company_logo_link = ?';
            $vals[] = $logoLink;
        }
        $vals[] = $userId;
        DB::update('UPDATE users SET '.implode(', ', $sets).' WHERE id = ?', $vals);

        return ['status' => 200, 'body' => [
            'success' => true,
            'data' => null,
            'error' => null,
            'message' => $logoUrl ? 'Personalização da marca salva com sucesso!' : 'Logo da empresa removido.',
        ]];
    }
}
