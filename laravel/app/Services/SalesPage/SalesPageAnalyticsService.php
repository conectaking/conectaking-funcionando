<?php

namespace App\Services\SalesPage;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Eventos e relatórios das páginas de vendas (modules/salesPage/analytics).
 */
class SalesPageAnalyticsService
{
    /** Ordem do funil, igual ao CASE do repositório Node. */
    private const FUNNEL_STEPS = ['page_view', 'product_view', 'product_click', 'add_to_cart', 'checkout_click'];

    /**
     * Registro público de evento — sem autenticação, igual ao Node.
     *
     * @param  array<string,mixed>  $data
     * @return array<string,mixed>
     *
     * @throws SalesPageException
     */
    public function trackEvent(array $data): array
    {
        if (! Schema::hasTable('sales_page_events')) {
            throw new SalesPageException('Tabela sales_page_events indisponível.', 400);
        }

        $metadata = $data['metadata'] ?? null;
        $row = DB::selectOne(
            'INSERT INTO sales_page_events (sales_page_id, product_id, event_type, metadata)
             VALUES (?, ?, ?, ?)
             RETURNING *',
            [
                $data['sales_page_id'] ?? null,
                $data['product_id'] ?? null,
                $data['event_type'] ?? null,
                $metadata !== null ? json_encode($metadata) : null,
            ]
        );

        return (array) $row;
    }

    /**
     * @param  array{start_date?:string|null, end_date?:string|null, event_type?:string|null, limit?:int|null}  $filters
     * @return array<string,mixed>
     */
    public function getAnalytics(int $salesPageId, array $filters): array
    {
        $sql = 'SELECT * FROM sales_page_events WHERE sales_page_id = ?';
        $params = [$salesPageId];

        if (! empty($filters['event_type'])) {
            $sql .= ' AND event_type = ?';
            $params[] = $filters['event_type'];
        }
        if (! empty($filters['start_date'])) {
            $sql .= ' AND created_at >= ?';
            $params[] = $filters['start_date'];
        }
        if (! empty($filters['end_date'])) {
            $sql .= ' AND created_at <= ?';
            $params[] = $filters['end_date'];
        }

        $sql .= ' ORDER BY created_at DESC';

        if (! empty($filters['limit'])) {
            $sql .= ' LIMIT ?';
            $params[] = (int) $filters['limit'];
        }

        $events = array_map(static fn ($row): array => (array) $row, DB::select($sql, $params));

        $counts = [];
        $countRows = DB::select(
            'SELECT event_type, COUNT(*) AS count FROM sales_page_events WHERE sales_page_id = ? GROUP BY event_type',
            [$salesPageId]
        );
        foreach ($countRows as $row) {
            $counts[(string) $row->event_type] = (int) $row->count;
        }

        return [
            'events' => $events,
            'counts' => (object) $counts,
            'total_events' => count($events),
        ];
    }

    /**
     * @return array<string,mixed>
     */
    public function getProductAnalytics(int $productId): array
    {
        $events = array_map(
            static fn ($row): array => (array) $row,
            DB::select('SELECT * FROM sales_page_events WHERE product_id = ? ORDER BY created_at DESC', [$productId])
        );

        $counts = [];
        $countRows = DB::select(
            'SELECT event_type, COUNT(*) AS count FROM sales_page_events WHERE product_id = ? GROUP BY event_type',
            [$productId]
        );
        foreach ($countRows as $row) {
            $counts[(string) $row->event_type] = (int) $row->count;
        }

        return [
            'events' => $events,
            'counts' => (object) $counts,
            'total_events' => count($events),
        ];
    }

    /**
     * @return array<string,mixed>
     */
    public function getSalesFunnel(int $salesPageId, ?string $startDate, ?string $endDate): array
    {
        $sql = 'SELECT event_type, COUNT(*) AS count FROM sales_page_events WHERE sales_page_id = ?';
        $params = [$salesPageId];

        if ($startDate !== null && $startDate !== '') {
            $sql .= ' AND created_at >= ?';
            $params[] = $startDate;
        }
        if ($endDate !== null && $endDate !== '') {
            $sql .= ' AND created_at <= ?';
            $params[] = $endDate;
        }

        $sql .= ' GROUP BY event_type';

        $funnel = array_fill_keys(self::FUNNEL_STEPS, 0);
        foreach (DB::select($sql, $params) as $row) {
            $type = (string) $row->event_type;
            if (array_key_exists($type, $funnel)) {
                $funnel[$type] = (int) $row->count;
            }
        }

        return [
            'page_view' => [
                'count' => $funnel['page_view'],
                'percentage' => 100,
            ],
            'product_view' => $this->funnelStep($funnel['product_view'], $funnel['page_view']),
            'product_click' => $this->funnelStep($funnel['product_click'], $funnel['product_view']),
            'add_to_cart' => $this->funnelStep($funnel['add_to_cart'], $funnel['product_click']),
            'checkout_click' => $this->funnelStep($funnel['checkout_click'], $funnel['add_to_cart']),
        ];
    }

    /**
     * @return array<int,array<string,mixed>>
     */
    public function getProductRanking(int $salesPageId, string $eventType, int $limit): array
    {
        $rows = DB::select(
            "SELECT p.id, p.name, p.image_url, p.price, COUNT(e.id) AS event_count
             FROM sales_page_products p
             LEFT JOIN sales_page_events e ON p.id = e.product_id AND e.event_type = ?
             WHERE p.sales_page_id = ? AND p.status != 'ARCHIVED'
             GROUP BY p.id, p.name, p.image_url, p.price
             ORDER BY event_count DESC, p.display_order ASC
             LIMIT ?",
            [$eventType, $salesPageId, $limit]
        );

        return array_map(static fn ($row): array => (array) $row, $rows);
    }

    /**
     * @throws SalesPageException
     */
    public function assertOwnership(int $salesPageId, string $userId): void
    {
        $owns = DB::selectOne(
            'SELECT 1 AS ok FROM sales_pages sp
             INNER JOIN profile_items pi ON sp.profile_item_id = pi.id
             WHERE sp.id = ? AND pi.user_id = ? LIMIT 1',
            [$salesPageId, $userId]
        );
        if (! $owns) {
            throw new SalesPageException('Você não tem permissão para visualizar analytics desta página', 403);
        }
    }

    /**
     * O Node devolve percentage como string de 2 casas (toFixed) ou 0 quando não há base.
     *
     * @return array<string,mixed>
     */
    private function funnelStep(int $count, int $previous): array
    {
        return [
            'count' => $count,
            'percentage' => $previous > 0 ? number_format($count / $previous * 100, 2, '.', '') : 0,
            'drop_off' => $previous - $count,
        ];
    }
}
