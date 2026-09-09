<?php

namespace App\Services\SalesPage;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Produtos das páginas de vendas (modules/salesPage/products).
 */
class SalesPageProductService
{
    private const MAX_PRODUCTS_PER_PAGE = 50;

    private const STATUS_ARCHIVED = 'ARCHIVED';

    /** @var array<string,array<int,string>> */
    private const STATUS_TRANSITIONS = [
        'ACTIVE' => ['PAUSED', 'OUT_OF_STOCK', 'ARCHIVED'],
        'PAUSED' => ['ACTIVE', 'ARCHIVED'],
        'OUT_OF_STOCK' => ['ACTIVE', 'ARCHIVED'],
        'ARCHIVED' => [],
    ];

    /** @var array<int,string> */
    private const STATUSES = ['ACTIVE', 'PAUSED', 'OUT_OF_STOCK', 'ARCHIVED'];

    /** @var array<int,string> */
    private const BADGES = ['oferta', 'destaque', 'novo'];

    /** Colunas gravadas no INSERT (mesma lista do repositório Node). */
    private const INSERT_COLUMNS = [
        'sales_page_id', 'name', 'description', 'price', 'compare_price',
        'stock', 'variations', 'image_url', 'display_order', 'status',
        'badge', 'youtube_video_url',
    ];

    /** Colunas que sanitize() pode devolver — barreira contra SQL dinâmico. */
    private const UPDATABLE_COLUMNS = [
        'name', 'description', 'price', 'compare_price', 'stock', 'variations',
        'display_order', 'youtube_video_url', 'sales_page_id', 'image_url',
        'status', 'badge', 'is_featured',
    ];

    /**
     * @param  array<string,mixed>  $data
     * @return array<string,mixed>
     *
     * @throws SalesPageException
     */
    public function create(int $salesPageId, string $userId, array $data): array
    {
        $this->assertTables();

        $data['sales_page_id'] = $salesPageId;

        $errors = $this->validate($data, false);
        if ($errors !== []) {
            throw new SalesPageException('Validação falhou: '.implode(', ', $errors), 400);
        }

        $page = DB::selectOne('SELECT id FROM sales_pages WHERE id = ?', [$salesPageId]);
        if (! $page) {
            throw new SalesPageException('Página de vendas não encontrada', 400);
        }

        if (! $this->ownsPage($salesPageId, $userId)) {
            throw new SalesPageException('Você não tem permissão para adicionar produtos nesta página', 403);
        }

        $this->assertProductLimit($salesPageId);

        $sanitized = $this->sanitize($data);

        $values = [];
        foreach (self::INSERT_COLUMNS as $column) {
            $value = $sanitized[$column] ?? null;
            if ($column === 'status' && ($value === null || $value === '')) {
                $value = 'ACTIVE';
            }
            if ($column === 'display_order' && $value === null) {
                $value = 0;
            }
            $values[] = $value;
        }

        $placeholders = implode(', ', array_fill(0, count(self::INSERT_COLUMNS), '?'));
        $row = DB::selectOne(
            'INSERT INTO sales_page_products ('.implode(', ', self::INSERT_COLUMNS).')
             VALUES ('.$placeholders.')
             RETURNING *',
            $values
        );

        return (array) $row;
    }

    /**
     * Lista sem checagem de dono — paridade com o Node (rota só exige login).
     *
     * @return array<int,array<string,mixed>>
     */
    public function listBySalesPage(int $salesPageId, bool $includeArchived): array
    {
        if (! Schema::hasTable('sales_page_products')) {
            return [];
        }

        $sql = 'SELECT * FROM sales_page_products WHERE sales_page_id = ?';
        $sql .= $includeArchived ? ' AND status != ?' : ' AND status = ?';
        $sql .= ' ORDER BY display_order ASC, created_at ASC';

        $rows = DB::select($sql, [$salesPageId, $includeArchived ? self::STATUS_ARCHIVED : 'ACTIVE']);

        return array_map(static fn ($row): array => (array) $row, $rows);
    }

    /**
     * @return array<string,mixed>
     *
     * @throws SalesPageException
     */
    public function findById(int $productId): array
    {
        $row = $this->fetchById($productId);
        if ($row === null) {
            throw new SalesPageException('Produto não encontrado', 404);
        }

        return $row;
    }

    /**
     * @param  array<string,mixed>  $data
     * @return array<string,mixed>
     *
     * @throws SalesPageException
     */
    public function update(int $productId, string $userId, array $data): array
    {
        $this->assertTables();

        if (! $this->ownsProduct($productId, $userId)) {
            throw new SalesPageException('Você não tem permissão para editar este produto', 403);
        }

        $current = $this->fetchById($productId);
        if ($current === null) {
            throw new SalesPageException('Produto não encontrado', 404);
        }

        if (($current['status'] ?? null) === self::STATUS_ARCHIVED) {
            throw new SalesPageException('Não é possível editar um produto arquivado', 400);
        }

        $errors = $this->validate($data, true);
        if ($errors !== []) {
            throw new SalesPageException('Validação falhou: '.implode(', ', $errors), 400);
        }

        return $this->applyUpdate($productId, $this->sanitize($data)) ?? $current;
    }

    /**
     * @return array<string,mixed>
     *
     * @throws SalesPageException
     */
    public function updateStatus(int $productId, string $userId, mixed $status): array
    {
        $this->assertTables();

        if (! $this->ownsProduct($productId, $userId)) {
            throw new SalesPageException('Você não tem permissão para alterar o status deste produto', 403);
        }

        $product = $this->fetchById($productId);
        if ($product === null) {
            throw new SalesPageException('Produto não encontrado', 404);
        }

        $current = (string) ($product['status'] ?? '');
        $next = is_scalar($status) ? (string) $status : '';
        $allowed = self::STATUS_TRANSITIONS[$current] ?? [];
        if (! in_array($next, $allowed, true)) {
            throw new SalesPageException(
                "Não é possível transicionar de {$current} para {$next}. Transições permitidas: ".implode(', ', $allowed),
                400
            );
        }

        $row = DB::selectOne(
            'UPDATE sales_page_products SET status = ?, updated_at = NOW() WHERE id = ? RETURNING *',
            [$next, $productId]
        );

        return $row ? (array) $row : $product;
    }

    /**
     * @throws SalesPageException
     */
    public function delete(int $productId, string $userId): void
    {
        $this->assertTables();

        if (! $this->ownsProduct($productId, $userId)) {
            throw new SalesPageException('Você não tem permissão para deletar este produto', 403);
        }

        DB::delete('DELETE FROM sales_page_products WHERE id = ?', [$productId]);
    }

    /**
     * @throws SalesPageException
     */
    public function reorder(int $salesPageId, string $userId, mixed $productOrders): void
    {
        $this->assertTables();

        if (! $this->ownsPage($salesPageId, $userId)) {
            throw new SalesPageException('Você não tem permissão para reordenar produtos desta página', 403);
        }

        if (! is_array($productOrders) || $productOrders === []) {
            throw new SalesPageException('productOrders deve ser um array não vazio', 400);
        }

        DB::transaction(function () use ($salesPageId, $productOrders): void {
            foreach ($productOrders as $entry) {
                $entry = is_array($entry) ? $entry : (array) $entry;
                DB::update(
                    'UPDATE sales_page_products SET display_order = ? WHERE id = ? AND sales_page_id = ?',
                    [$entry['display_order'] ?? null, $entry['id'] ?? null, $salesPageId]
                );
            }
        });
    }

    /**
     * @return array<string,mixed>|null
     */
    private function fetchById(int $productId): ?array
    {
        if (! Schema::hasTable('sales_page_products')) {
            return null;
        }
        $row = DB::selectOne('SELECT * FROM sales_page_products WHERE id = ?', [$productId]);

        return $row ? (array) $row : null;
    }

    /**
     * @param  array<string,mixed>  $data
     * @return array<string,mixed>|null
     */
    private function applyUpdate(int $productId, array $data): ?array
    {
        $sets = [];
        $values = [];
        foreach ($data as $key => $value) {
            if (! in_array($key, self::UPDATABLE_COLUMNS, true)) {
                continue;
            }
            $sets[] = "{$key} = ?";
            $values[] = $value;
        }

        if ($sets === []) {
            return $this->fetchById($productId);
        }

        $values[] = $productId;
        $row = DB::selectOne(
            'UPDATE sales_page_products SET '.implode(', ', $sets).', updated_at = NOW() WHERE id = ? RETURNING *',
            $values
        );

        return $row ? (array) $row : null;
    }

    private function ownsPage(int $salesPageId, string $userId): bool
    {
        return (bool) DB::selectOne(
            'SELECT 1 AS ok FROM sales_pages sp
             INNER JOIN profile_items pi ON sp.profile_item_id = pi.id
             WHERE sp.id = ? AND pi.user_id = ? LIMIT 1',
            [$salesPageId, $userId]
        );
    }

    private function ownsProduct(int $productId, string $userId): bool
    {
        return (bool) DB::selectOne(
            'SELECT 1 AS ok FROM sales_page_products p
             INNER JOIN sales_pages sp ON p.sales_page_id = sp.id
             INNER JOIN profile_items pi ON sp.profile_item_id = pi.id
             WHERE p.id = ? AND pi.user_id = ? LIMIT 1',
            [$productId, $userId]
        );
    }

    /**
     * @throws SalesPageException
     */
    private function assertProductLimit(int $salesPageId): void
    {
        $row = DB::selectOne(
            'SELECT COUNT(*) AS count FROM sales_page_products WHERE sales_page_id = ? AND status = ?',
            [$salesPageId, 'ACTIVE']
        );
        if ((int) ($row->count ?? 0) >= self::MAX_PRODUCTS_PER_PAGE) {
            throw new SalesPageException('Limite de '.self::MAX_PRODUCTS_PER_PAGE.' produtos por página atingido', 400);
        }
    }

    /**
     * @throws SalesPageException
     */
    private function assertTables(): void
    {
        if (! Schema::hasTable('sales_page_products') || ! Schema::hasTable('sales_pages')) {
            throw new SalesPageException('Tabelas de produtos indisponíveis.', 500);
        }
    }

    /**
     * @param  array<string,mixed>  $data
     * @return array<int,string>
     */
    private function validate(array $data, bool $isUpdate): array
    {
        $errors = [];

        if (! $isUpdate && empty($data['sales_page_id'])) {
            $errors[] = 'sales_page_id é obrigatório';
        }

        if (array_key_exists('name', $data)) {
            $name = $data['name'];
            if (! is_string($name) || mb_strlen(trim($name)) < 2) {
                $errors[] = 'name deve ter pelo menos 2 caracteres';
            }
            if (is_string($name) && mb_strlen($name) > 255) {
                $errors[] = 'name não pode ter mais de 255 caracteres';
            }
        }

        if (array_key_exists('price', $data)) {
            $price = $this->toFloat($data['price']);
            if ($price === null || $price <= 0) {
                $errors[] = 'price deve ser um número maior que zero';
            }
        }

        if (array_key_exists('compare_price', $data) && $data['compare_price'] !== null) {
            $comparePrice = $this->toFloat($data['compare_price']);
            if ($comparePrice === null || $comparePrice <= 0) {
                $errors[] = 'compare_price deve ser um número maior que zero';
            }
            $price = array_key_exists('price', $data) ? $this->toFloat($data['price']) : null;
            if ($price !== null && $comparePrice !== null && $comparePrice <= $price) {
                $errors[] = 'compare_price deve ser maior que price';
            }
        }

        if (array_key_exists('stock', $data) && $data['stock'] !== null) {
            $stock = $this->toInt($data['stock']);
            if ($stock === null || $stock < 0) {
                $errors[] = 'stock deve ser um número inteiro maior ou igual a zero';
            }
        }

        if (array_key_exists('status', $data) && ! in_array($data['status'], self::STATUSES, true)) {
            $errors[] = 'status deve ser um dos valores: '.implode(', ', self::STATUSES);
        }

        if (array_key_exists('badge', $data) && $data['badge']) {
            $badges = array_filter(array_map('trim', explode(',', (string) $data['badge'])));
            $invalid = array_values(array_diff($badges, self::BADGES));
            if ($invalid !== []) {
                $errors[] = 'badge deve ser um dos valores: '.implode(', ', self::BADGES)
                    .'. Valores inválidos encontrados: '.implode(', ', $invalid);
            }
        }

        return $errors;
    }

    /**
     * @param  array<string,mixed>  $data
     * @return array<string,mixed>
     */
    private function sanitize(array $data): array
    {
        $sanitized = [];

        foreach (['name', 'description'] as $field) {
            if (array_key_exists($field, $data)) {
                $sanitized[$field] = $this->trimOrNull($data[$field]);
            }
        }

        if (array_key_exists('price', $data)) {
            $sanitized['price'] = $this->toFloat($data['price']);
        }
        if (array_key_exists('compare_price', $data)) {
            $sanitized['compare_price'] = $data['compare_price'] ? $this->toFloat($data['compare_price']) : null;
        }
        if (array_key_exists('stock', $data)) {
            $sanitized['stock'] = $data['stock'] !== null ? $this->toInt($data['stock']) : null;
        }
        if (array_key_exists('variations', $data)) {
            $sanitized['variations'] = $this->toJsonOrNull($data['variations']);
        }
        if (array_key_exists('display_order', $data)) {
            $sanitized['display_order'] = $this->toInt($data['display_order']) ?? 0;
        }
        if (array_key_exists('youtube_video_url', $data)) {
            $sanitized['youtube_video_url'] = is_string($data['youtube_video_url'])
                ? $this->trimOrNull($data['youtube_video_url'])
                : null;
        }

        foreach (['sales_page_id', 'image_url', 'status', 'badge'] as $field) {
            if (array_key_exists($field, $data)) {
                $sanitized[$field] = $data[$field];
            }
        }

        if (array_key_exists('is_featured', $data)) {
            $sanitized['is_featured'] = filter_var($data['is_featured'], FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false';
        }

        return $sanitized;
    }

    private function toJsonOrNull(mixed $value): ?string
    {
        if ($value === null || $value === '' || $value === []) {
            return null;
        }
        if (is_string($value)) {
            json_decode($value);

            return json_last_error() === JSON_ERROR_NONE ? $value : json_encode($value);
        }

        return json_encode($value) ?: null;
    }

    private function trimOrNull(mixed $value): ?string
    {
        if ($value === null || ! is_scalar($value)) {
            return null;
        }
        $trimmed = trim((string) $value);

        return $trimmed !== '' ? $trimmed : null;
    }

    private function toFloat(mixed $value): ?float
    {
        if (is_bool($value) || $value === null || $value === '') {
            return null;
        }
        if (! is_numeric($value)) {
            return null;
        }

        return (float) $value;
    }

    private function toInt(mixed $value): ?int
    {
        if (is_bool($value) || $value === null || $value === '') {
            return null;
        }
        if (! is_numeric($value)) {
            return null;
        }

        return (int) $value;
    }
}
