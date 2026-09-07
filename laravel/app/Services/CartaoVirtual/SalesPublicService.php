<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\DB;

class SalesPublicService
{
    /**
     * @return array{status:int, data?:array<string,mixed>, message?:string}
     */
    public function show(string $profileSlug, string $storeSlug, ?string $previewToken = null): array
    {
        $user = DB::selectOne('SELECT id, profile_slug FROM users WHERE profile_slug = ? LIMIT 1', [$profileSlug]);
        if (!$user) {
            return ['status' => 404, 'message' => 'Perfil não encontrado.'];
        }

        $page = null;
        if (ctype_digit($storeSlug)) {
            $page = DB::selectOne(
                'SELECT sp.* FROM sales_pages sp
                 INNER JOIN profile_items pi ON pi.id = sp.profile_item_id
                 WHERE pi.id = ? AND pi.user_id = ? AND pi.item_type = \'sales_page\'
                 LIMIT 1',
                [(int) $storeSlug, $user->id]
            );
        } else {
            $page = DB::selectOne(
                'SELECT sp.* FROM sales_pages sp
                 INNER JOIN profile_items pi ON pi.id = sp.profile_item_id
                 WHERE sp.slug = ? AND pi.user_id = ?
                 LIMIT 1',
                [$storeSlug, $user->id]
            );
        }
        if (!$page) {
            return ['status' => 404, 'message' => 'Loja não encontrada.'];
        }

        $status = strtoupper((string) ($page->status ?? ''));
        $isPreview = $previewToken && hash_equals((string) ($page->preview_token ?? ''), $previewToken);
        if ($status !== 'PUBLISHED' && !$isPreview) {
            return ['status' => 404, 'message' => 'Loja não publicada.'];
        }

        $products = DB::select(
            "SELECT * FROM sales_page_products
             WHERE sales_page_id = ?
               AND (status IS NULL OR status::text NOT IN ('ARCHIVED','archived'))
             ORDER BY display_order ASC NULLS LAST, id ASC",
            [$page->id]
        );

        return [
            'status' => 200,
            'data' => [
                'page' => (array) $page,
                'products' => array_map(static fn ($p) => (array) $p, $products),
                'profileSlug' => $user->profile_slug,
                'preview' => $isPreview,
            ],
        ];
    }
}
