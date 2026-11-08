<?php

namespace App\Services\CartaoVirtual;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class KingSelectionQuotaService
{
    public const PLAN_LIMITS = [
        'plan_20gb' => 21474836480,   // 20 * 1024 * 1024 * 1024
        'plan_30gb' => 32212254720,   // 30 * 1024 * 1024 * 1024
        'plan_60gb' => 64424509440,   // 60 * 1024 * 1024 * 1024 (R$ 99,90)
        'plan_70gb' => 64424509440,   // compatibilidade legada -> 60 GB
        'plan_100gb' => 107374182400, // 100 * 1024 * 1024 * 1024 (R$ 149,90)
        'custom'    => 21474836480,
        'unlimited' => 1099511627776, // 1 TB (praticamente ilimitado para testes)
    ];

    public const PLAN_PRICES = [
        'plan_20gb' => 39.90,
        'plan_30gb' => 59.90,
        'plan_60gb' => 99.90,
        'plan_70gb' => 99.90,
        'plan_100gb' => 149.90,
        'custom'    => 49.90,
        'unlimited' => 199.90,
    ];

    public const PLAN_LABELS = [
        'plan_20gb' => 'Starter 20 GB',
        'plan_30gb' => 'Pro 30 GB',
        'plan_60gb' => 'Studio King 60 GB',
        'plan_70gb' => 'Studio King 60 GB',
        'plan_100gb' => 'Studio Max 100 GB',
        'custom'    => 'Personalizado',
        'unlimited' => 'Ilimitado Master',
    ];

    public const CLOUDFLARE_FREE_TIER_GB = 10.0;
    public const CLOUDFLARE_PRICE_PER_GB_USD = 0.015;
    public const DEFAULT_USD_RATE = 5.70;

    /**
     * Retorna os dados completos de armazenamento, cota e consumo de um fotógrafo.
     */
    public function getUserStorageStats(string $userId): array
    {
        $user = DB::selectOne(
            'SELECT id, name, email, is_admin, account_type, king_selection_enabled, king_selection_plan, king_selection_storage_limit_bytes, king_selection_plan_price 
             FROM users WHERE id = ? LIMIT 1',
            [$userId]
        );

        if (!$user) {
            return [
                'enabled' => false,
                'plan' => 'plan_20gb',
                'plan_label' => 'Starter 20 GB',
                'plan_price' => 39.90,
                'storage_limit_bytes' => self::PLAN_LIMITS['plan_20gb'],
                'storage_limit_gb' => 20.0,
                'storage_used_bytes' => 0,
                'storage_used_mb' => 0.0,
                'storage_used_gb' => 0.0,
                'storage_used_pct' => 0.0,
                'storage_remaining_bytes' => self::PLAN_LIMITS['plan_20gb'],
                'storage_remaining_gb' => 20.0,
                'is_quota_exceeded' => false,
                'total_photos' => 0,
                'total_galleries' => 0,
            ];
        }

        // Se for admin, sempre tem acesso liberado
        $isAdmin = (bool) ($user->is_admin ?? false) || in_array($user->account_type ?? '', ['admin', 'adm_principal'], true);
        $enabled = $isAdmin || (bool) ($user->king_selection_enabled ?? false);

        $plan = $user->king_selection_plan ?: 'plan_20gb';
        $limitBytes = (int) ($user->king_selection_storage_limit_bytes ?? 0);
        if ($limitBytes <= 0) {
            $limitBytes = self::PLAN_LIMITS[$plan] ?? self::PLAN_LIMITS['plan_20gb'];
        }
        $planPrice = (float) ($user->king_selection_plan_price ?? (self::PLAN_PRICES[$plan] ?? 39.90));

        // Total de fotos e tamanho em bytes das fotos deste fotógrafo
        $storageRow = DB::selectOne(
            'SELECT 
                COUNT(p.id)::int AS total_photos,
                COUNT(DISTINCT g.id)::int AS total_galleries,
                COALESCE(SUM(CASE WHEN p.file_size_bytes > 0 THEN p.file_size_bytes ELSE 2621440 END), 0)::bigint AS used_bytes
             FROM king_photos p
             JOIN king_galleries g ON g.id = p.gallery_id
             JOIN profile_items pi ON pi.id = g.profile_item_id
             WHERE pi.user_id = ?',
            [$userId]
        );

        $totalPhotos = (int) ($storageRow->total_photos ?? 0);
        $totalGalleries = (int) ($storageRow->total_galleries ?? 0);
        $usedBytes = (int) ($storageRow->used_bytes ?? 0);

        $usedMb = round($usedBytes / (1024 * 1024), 2);
        $usedGb = round($usedBytes / (1024 * 1024 * 1024), 2);
        $limitGb = round($limitBytes / (1024 * 1024 * 1024), 2);

        $usedPct = $limitBytes > 0 ? min(100.0, round(($usedBytes / $limitBytes) * 100, 1)) : 0.0;
        $remainingBytes = max(0, $limitBytes - $usedBytes);
        $remainingGb = round($remainingBytes / (1024 * 1024 * 1024), 2);

        $isQuotaExceeded = $limitBytes > 0 && ($usedBytes >= $limitBytes) && !$isAdmin;

        // Custo no Cloudflare R2
        $costUsd = round($usedGb * self::CLOUDFLARE_PRICE_PER_GB_USD, 4);
        $costBrl = round($costUsd * self::DEFAULT_USD_RATE, 2);
        $profitBrl = round($planPrice - $costBrl, 2);

        return [
            'enabled' => $enabled,
            'is_admin' => $isAdmin,
            'plan' => $plan,
            'plan_label' => self::PLAN_LABELS[$plan] ?? 'Starter 20 GB',
            'plan_price' => $planPrice,
            'storage_limit_bytes' => $limitBytes,
            'storage_limit_gb' => $limitGb,
            'storage_used_bytes' => $usedBytes,
            'storage_used_mb' => $usedMb,
            'storage_used_gb' => $usedGb,
            'storage_used_pct' => $usedPct,
            'storage_remaining_bytes' => $remainingBytes,
            'storage_remaining_gb' => $remainingGb,
            'is_quota_exceeded' => $isQuotaExceeded,
            'total_photos' => $totalPhotos,
            'total_galleries' => $totalGalleries,
            'cost_usd' => $costUsd,
            'cost_brl' => $costBrl,
            'profit_brl' => $profitBrl,
        ];
    }

    /**
     * Valida se o fotógrafo pode enviar novos bytes sem estourar o limite contratado.
     */
    public function canUploadBytes(string $userId, int $incomingBytes): bool
    {
        $stats = $this->getUserStorageStats($userId);
        if ($stats['is_admin']) {
            return true;
        }
        if (!$stats['enabled']) {
            return false;
        }
        if ($stats['storage_limit_bytes'] <= 0) {
            return true;
        }

        return ($stats['storage_used_bytes'] + $incomingBytes) <= $stats['storage_limit_bytes'];
    }

    /**
     * Registra o tamanho exato de um arquivo enviado na tabela king_photos.
     */
    public function recordPhotoSize(int $photoId, int $bytes, ?int $width = null, ?int $height = null): void
    {
        if ($photoId < 1 || $bytes < 1) return;

        DB::update(
            'UPDATE king_photos SET file_size_bytes = ?, width = COALESCE(?, width), height = COALESCE(?, height) WHERE id = ?',
            [$bytes, $width, $height, $photoId]
        );
    }

    /**
     * Retorna a visão geral administrativa para o Painel Master, incluindo cálculo da fatura Cloudflare R2.
     */
    public function getMasterOverview(float $usdRate = self::DEFAULT_USD_RATE): array
    {
        // 1. Fotógrafos
        $photographers = DB::select(
            "SELECT 
                u.id, u.name, u.email, u.is_admin, u.account_type,
                u.king_selection_enabled,
                COALESCE(u.king_selection_plan, 'plan_20gb') AS plan,
                COALESCE(u.king_selection_storage_limit_bytes, 21474836480) AS limit_bytes,
                COALESCE(u.king_selection_plan_price, 39.90) AS plan_price,
                u.created_at,
                COUNT(DISTINCT g.id)::int AS total_galleries,
                COUNT(p.id)::int AS total_photos,
                COALESCE(SUM(CASE WHEN p.file_size_bytes > 0 THEN p.file_size_bytes ELSE 2621440 END), 0)::bigint AS used_bytes
             FROM users u
             LEFT JOIN profile_items pi ON pi.user_id = u.id
             LEFT JOIN king_galleries g ON g.profile_item_id = pi.id
             LEFT JOIN king_photos p ON p.gallery_id = g.id
             WHERE u.king_selection_enabled = TRUE 
                OR u.is_admin = TRUE 
                OR g.id IS NOT NULL
             GROUP BY u.id, u.name, u.email, u.is_admin, u.account_type, u.king_selection_enabled, u.king_selection_plan, u.king_selection_storage_limit_bytes, u.king_selection_plan_price, u.created_at
             ORDER BY used_bytes DESC, total_photos DESC"
        );

        $totalUsedBytesAll = 0;
        $totalPhotosAll = 0;
        $totalGalleriesAll = 0;
        $totalRevenueBrl = 0.0;
        $formattedList = [];

        $adminStats = [
            'id' => null,
            'name' => null,
            'email' => null,
            'plan' => 'unlimited',
            'plan_label' => 'Ilimitado Master',
            'used_bytes' => 0,
            'used_gb' => 0.0,
            'limit_gb' => 1000.0,
            'used_pct' => 0.0,
            'total_photos' => 0,
            'total_galleries' => 0,
            'cost_usd' => 0.0,
            'cost_brl' => 0.0,
        ];

        foreach ($photographers as $ph) {
            $usedBytes = (int) $ph->used_bytes;
            $limitBytes = (int) $ph->limit_bytes;
            $totalUsedBytesAll += $usedBytes;
            $totalPhotosAll += (int) $ph->total_photos;
            $totalGalleriesAll += (int) $ph->total_galleries;

            $isAdminUser = (bool) ($ph->is_admin || in_array($ph->account_type, ['admin', 'adm_principal'], true));
            $plan = $ph->plan ?: ($isAdminUser ? 'unlimited' : 'plan_20gb');
            $price = $isAdminUser ? 0.0 : (float) $ph->plan_price;
            if (!$isAdminUser) {
                $totalRevenueBrl += $price;
            }

            $usedGb = round($usedBytes / (1024 * 1024 * 1024), 2);
            $limitGb = round($limitBytes / (1024 * 1024 * 1024), 2);
            $usedPct = $limitBytes > 0 ? min(100.0, round(($usedBytes / $limitBytes) * 100, 1)) : 0.0;

            // Custo Cloudflare R2 individual (sem franquia, custo bruto de armazenamento)
            $phCostUsd = round($usedGb * self::CLOUDFLARE_PRICE_PER_GB_USD, 4);
            $phCostBrl = round($phCostUsd * $usdRate, 2);
            $phProfitBrl = $isAdminUser ? 0.0 : round($price - $phCostBrl, 2);

            if ($isAdminUser) {
                $adminStats['id'] = (string) $ph->id;
                $adminStats['name'] = $ph->name ?: 'Administrador';
                $adminStats['email'] = $ph->email;
                $adminStats['plan'] = $plan;
                $adminStats['plan_label'] = self::PLAN_LABELS[$plan] ?? 'Ilimitado Master';
                $adminStats['used_bytes'] = $usedBytes;
                $adminStats['used_gb'] = $usedGb;
                $adminStats['limit_gb'] = $limitGb;
                $adminStats['used_pct'] = $usedPct;
                $adminStats['total_photos'] = (int) $ph->total_photos;
                $adminStats['total_galleries'] = (int) $ph->total_galleries;
                $adminStats['cost_usd'] = $phCostUsd;
                $adminStats['cost_brl'] = $phCostBrl;
            }

            $formattedList[] = [
                'id' => (string) $ph->id,
                'name' => $ph->name ?: ($isAdminUser ? 'Administrador Master' : 'Fotógrafo'),
                'email' => $ph->email,
                'is_admin' => $isAdminUser,
                'enabled' => (bool) $ph->king_selection_enabled,
                'plan' => $plan,
                'plan_label' => self::PLAN_LABELS[$plan] ?? 'Starter 20 GB',
                'plan_price' => $price,
                'used_bytes' => $usedBytes,
                'used_gb' => $usedGb,
                'limit_bytes' => $limitBytes,
                'limit_gb' => $limitGb,
                'used_pct' => $usedPct,
                'total_photos' => (int) $ph->total_photos,
                'total_galleries' => (int) $ph->total_galleries,
                'cost_usd' => $phCostUsd,
                'cost_brl' => $phCostBrl,
                'profit_brl' => $phProfitBrl,
                'created_at' => $ph->created_at,
            ];
        }

        // Cálculos Globais de Fatura Cloudflare R2
        $totalUsedGb = round($totalUsedBytesAll / (1024 * 1024 * 1024), 2);
        $freeTierGb = min(self::CLOUDFLARE_FREE_TIER_GB, $totalUsedGb);
        $billableGb = max(0.0, round($totalUsedGb - self::CLOUDFLARE_FREE_TIER_GB, 2));

        $totalBillUsd = round($billableGb * self::CLOUDFLARE_PRICE_PER_GB_USD, 2);
        $totalBillBrl = round($totalBillUsd * $usdRate, 2);

        $netProfitBrl = round($totalRevenueBrl - $totalBillBrl, 2);
        $netMarginPct = $totalRevenueBrl > 0 ? round(($netProfitBrl / $totalRevenueBrl) * 100, 1) : 0.0;

        return [
            'summary' => [
                'total_photographers' => count($photographers),
                'total_galleries' => $totalGalleriesAll,
                'total_photos' => $totalPhotosAll,
                'total_used_bytes' => $totalUsedBytesAll,
                'total_used_gb' => $totalUsedGb,
                'free_tier_gb' => $freeTierGb,
                'billable_gb' => $billableGb,
                'r2_price_per_gb_usd' => self::CLOUDFLARE_PRICE_PER_GB_USD,
                'usd_rate' => $usdRate,
                'estimated_bill_usd' => $totalBillUsd,
                'estimated_bill_brl' => $totalBillBrl,
                'admin_cost_brl' => $adminStats['cost_brl'],
                'clients_cost_brl' => max(0, round($totalBillBrl - $adminStats['cost_brl'], 2)),
                'total_revenue_brl' => round($totalRevenueBrl, 2),
                'net_profit_brl' => $netProfitBrl,
                'net_margin_pct' => $netMarginPct,
            ],
            'admin_stats' => $adminStats,
            'photographers' => $formattedList,
        ];
    }
}

