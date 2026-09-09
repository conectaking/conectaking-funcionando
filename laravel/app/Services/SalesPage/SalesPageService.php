<?php

namespace App\Services\SalesPage;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * CRUD das páginas de vendas (porte Laravel de modules/salesPage).
 * Produtos e analytics: controllers/services Laravel (`SalesPageProduct*`, `SalesPageAnalytics*`).
 */
class SalesPageService
{
    private const STATUS_DRAFT = 'DRAFT';

    private const STATUS_PUBLISHED = 'PUBLISHED';

    private const STATUS_PAUSED = 'PAUSED';

    private const STATUS_ARCHIVED = 'ARCHIVED';

    /** @var array<string,array<int,string>> */
    private const STATUS_TRANSITIONS = [
        self::STATUS_DRAFT => [self::STATUS_PUBLISHED, self::STATUS_ARCHIVED],
        self::STATUS_PUBLISHED => [self::STATUS_PAUSED, self::STATUS_DRAFT, self::STATUS_ARCHIVED],
        self::STATUS_PAUSED => [self::STATUS_PUBLISHED, self::STATUS_DRAFT, self::STATUS_ARCHIVED],
        self::STATUS_ARCHIVED => [self::STATUS_DRAFT],
    ];

    /** Colunas gravadas no INSERT (mesma lista do repositório Node). */
    private const INSERT_COLUMNS = [
        'profile_item_id', 'slug', 'store_title', 'store_description',
        'button_text', 'button_logo_url', 'theme', 'background_color',
        'text_color', 'button_color', 'button_text_color',
        'background_image_url', 'whatsapp_number', 'meta_title',
        'meta_description', 'meta_image_url', 'preview_token', 'status', 'published_at',
    ];

    /** Colunas que sanitize() pode devolver — barreira contra SQL dinâmico. */
    private const UPDATABLE_COLUMNS = [
        'store_title', 'store_description', 'button_text', 'whatsapp_number',
        'meta_title', 'meta_description', 'slug', 'display_format', 'card_banner_image_url',
        'profile_item_id', 'button_logo_url', 'theme', 'background_color',
        'text_color', 'button_color', 'button_text_color', 'background_image_url',
        'meta_image_url', 'preview_token', 'status',
    ];

    /**
     * @param  array<string,mixed>  $data
     * @return array<string,mixed>
     *
     * @throws SalesPageException
     */
    public function create(array $data): array
    {
        $this->assertTable();

        if (! array_key_exists('whatsapp_number', $data) || $data['whatsapp_number'] === null) {
            $data['whatsapp_number'] = '';
        }

        $errors = $this->validate($data, false);
        if ($errors !== []) {
            throw new SalesPageException('Validação falhou: '.implode(', ', $errors), 400);
        }

        $sanitized = $this->sanitize($data);
        if (($sanitized['whatsapp_number'] ?? null) === null) {
            $sanitized['whatsapp_number'] = '';
        }

        if (empty($sanitized['slug'])) {
            $base = ! empty($sanitized['store_title']) ? (string) $sanitized['store_title'] : 'loja';
            $sanitized['slug'] = $this->generateUniqueSlug($base, null);
        }
        if (empty($sanitized['preview_token'])) {
            $sanitized['preview_token'] = bin2hex(random_bytes(32));
        }

        $sanitized['status'] = self::STATUS_PUBLISHED;
        $sanitized['published_at'] = now();

        $values = [];
        foreach (self::INSERT_COLUMNS as $column) {
            $value = $sanitized[$column] ?? null;
            if ($column === 'theme' && ($value === null || $value === '')) {
                $value = 'dark';
            }
            $values[] = $value;
        }

        $placeholders = implode(', ', array_fill(0, count(self::INSERT_COLUMNS), '?'));
        $row = DB::selectOne(
            'INSERT INTO sales_pages ('.implode(', ', self::INSERT_COLUMNS).')
             VALUES ('.$placeholders.')
             ON CONFLICT (profile_item_id) DO UPDATE SET updated_at = NOW()
             RETURNING *',
            $values
        );

        return (array) $row;
    }

    /**
     * @return array<string,mixed>
     *
     * @throws SalesPageException
     */
    public function findById(int $id): array
    {
        $row = $this->fetchById($id);
        if ($row === null) {
            throw new SalesPageException('Página de vendas não encontrada', 404);
        }

        return $row;
    }

    /**
     * @return array<string,mixed>|null
     */
    public function findByProfileItemId(int $profileItemId, string $userId): ?array
    {
        if (! Schema::hasTable('sales_pages') || ! Schema::hasTable('profile_items')) {
            return null;
        }

        $owns = DB::selectOne(
            'SELECT 1 AS ok FROM profile_items WHERE id = ? AND user_id = ? LIMIT 1',
            [$profileItemId, $userId]
        );
        if (! $owns) {
            return null;
        }

        $row = DB::selectOne('SELECT * FROM sales_pages WHERE profile_item_id = ?', [$profileItemId]);

        return $row ? (array) $row : null;
    }

    /**
     * @param  array<string,mixed>  $data
     * @return array<string,mixed>
     *
     * @throws SalesPageException
     */
    public function update(int $id, string $userId, array $data): array
    {
        $this->assertTable();
        $this->assertOwnership($id, $userId, 'Você não tem permissão para editar esta página');

        $current = $this->fetchById($id);
        if ($current === null) {
            throw new SalesPageException('Página de vendas não encontrada', 404);
        }

        $currentStatus = (string) ($current['status'] ?? self::STATUS_DRAFT);
        $isStatusOnly = count($data) === 1 && array_key_exists('status', $data) && $data['status'];

        if ($isStatusOnly) {
            $this->assertTransition($currentStatus, (string) $data['status']);
        } else {
            if ($currentStatus === self::STATUS_ARCHIVED) {
                throw new SalesPageException(
                    'Não é possível editar uma página arquivada. Altere o status para "Rascunho" primeiro para desarquivar.',
                    400
                );
            }
            $errors = $this->validate($data, true);
            if ($errors !== []) {
                throw new SalesPageException('Validação falhou: '.implode(', ', $errors), 400);
            }
        }

        $sanitized = $this->sanitize($data);

        $currentSlug = $current['slug'] ?? null;
        $titleChanged = ! empty($sanitized['store_title'])
            && $sanitized['store_title'] !== ($current['store_title'] ?? null);

        if (empty($currentSlug) || $titleChanged) {
            if (empty($sanitized['slug'])) {
                $base = $sanitized['store_title'] ?? $current['store_title'] ?? 'loja';
                $sanitized['slug'] = $this->generateUniqueSlug((string) $base, $id);
            }
        } elseif (empty($sanitized['slug'])) {
            $sanitized['slug'] = $currentSlug;
        }

        return $this->applyUpdate($id, $sanitized) ?? $current;
    }

    /**
     * @return array<string,mixed>
     *
     * @throws SalesPageException
     */
    public function publish(int $id, string $userId): array
    {
        $page = $this->prepareStatusChange($id, $userId, self::STATUS_PUBLISHED, 'publicar');

        $slug = $page['slug'] ?? null;
        if (empty($slug)) {
            $base = $page['store_title'] ?? "loja-{$id}";
            $slug = $this->generateUniqueSlug((string) $base, $id);
            $this->applyUpdate($id, ['slug' => $slug]);
        }

        return $this->updateStatus($id, self::STATUS_PUBLISHED, now());
    }

    /**
     * @return array<string,mixed>
     *
     * @throws SalesPageException
     */
    public function pause(int $id, string $userId): array
    {
        $this->prepareStatusChange($id, $userId, self::STATUS_PAUSED, 'pausar');

        return $this->updateStatus($id, self::STATUS_PAUSED, null);
    }

    /**
     * @return array<string,mixed>
     *
     * @throws SalesPageException
     */
    public function archive(int $id, string $userId): array
    {
        $this->prepareStatusChange($id, $userId, self::STATUS_ARCHIVED, 'arquivar');

        return $this->updateStatus($id, self::STATUS_ARCHIVED, null);
    }

    /**
     * @throws SalesPageException
     */
    public function delete(int $id, string $userId): void
    {
        $this->assertTable();
        $this->assertOwnership($id, $userId, 'Você não tem permissão para deletar esta página');

        DB::delete('DELETE FROM sales_pages WHERE id = ?', [$id]);
    }

    /**
     * @return array<string,mixed>
     *
     * @throws SalesPageException
     */
    private function prepareStatusChange(int $id, string $userId, string $newStatus, string $verb): array
    {
        $this->assertTable();
        $this->assertOwnership($id, $userId, "Você não tem permissão para {$verb} esta página");

        $page = $this->fetchById($id);
        if ($page === null) {
            throw new SalesPageException('Página de vendas não encontrada', 404);
        }
        $this->assertTransition((string) ($page['status'] ?? self::STATUS_DRAFT), $newStatus);

        return $page;
    }

    /**
     * @return array<string,mixed>
     *
     * @throws SalesPageException
     */
    private function updateStatus(int $id, string $status, mixed $publishedAt): array
    {
        if ($publishedAt !== null) {
            $row = DB::selectOne(
                'UPDATE sales_pages SET status = ?, published_at = ?, updated_at = NOW() WHERE id = ? RETURNING *',
                [$status, $publishedAt, $id]
            );
        } else {
            $row = DB::selectOne(
                'UPDATE sales_pages SET status = ?, updated_at = NOW() WHERE id = ? RETURNING *',
                [$status, $id]
            );
        }

        if (! $row) {
            throw new SalesPageException('Página de vendas não encontrada', 404);
        }

        return (array) $row;
    }

    /**
     * @param  array<string,mixed>  $data
     * @return array<string,mixed>|null
     */
    private function applyUpdate(int $id, array $data): ?array
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
            return $this->fetchById($id);
        }

        $values[] = $id;
        $row = DB::selectOne(
            'UPDATE sales_pages SET '.implode(', ', $sets).', updated_at = NOW() WHERE id = ? RETURNING *',
            $values
        );

        return $row ? (array) $row : null;
    }

    /**
     * @return array<string,mixed>|null
     */
    private function fetchById(int $id): ?array
    {
        if (! Schema::hasTable('sales_pages')) {
            return null;
        }
        $row = DB::selectOne('SELECT * FROM sales_pages WHERE id = ?', [$id]);

        return $row ? (array) $row : null;
    }

    /**
     * @throws SalesPageException
     */
    private function assertOwnership(int $id, string $userId, string $message): void
    {
        $owns = DB::selectOne(
            'SELECT 1 AS ok FROM sales_pages sp
             INNER JOIN profile_items pi ON sp.profile_item_id = pi.id
             WHERE sp.id = ? AND pi.user_id = ? LIMIT 1',
            [$id, $userId]
        );
        if (! $owns) {
            throw new SalesPageException($message, 403);
        }
    }

    /**
     * @throws SalesPageException
     */
    private function assertTransition(string $current, string $next): void
    {
        $allowed = self::STATUS_TRANSITIONS[$current] ?? [];
        if (! in_array($next, $allowed, true)) {
            throw new SalesPageException(
                "Não é possível transicionar de {$current} para {$next}. Transições permitidas: ".implode(', ', $allowed),
                400
            );
        }
    }

    /**
     * @throws SalesPageException
     */
    private function assertTable(): void
    {
        if (! Schema::hasTable('sales_pages')) {
            throw new SalesPageException('Tabela sales_pages indisponível.', 500);
        }
    }

    private function generateUniqueSlug(string $text, ?int $excludeId): string
    {
        $base = $this->slugify($text);
        if ($base === '') {
            $base = 'item';
        }

        $slug = $base;
        $counter = 1;
        while ($this->slugExists($slug, $excludeId) && $counter < 1000) {
            $slug = "{$base}-{$counter}";
            $counter++;
        }
        if ($counter >= 1000) {
            $slug = $base.'-'.(int) (microtime(true) * 1000);
        }

        return $slug;
    }

    private function slugExists(string $slug, ?int $excludeId): bool
    {
        if ($excludeId !== null) {
            return (bool) DB::selectOne(
                'SELECT 1 AS ok FROM sales_pages WHERE slug = ? AND id != ? LIMIT 1',
                [$slug, $excludeId]
            );
        }

        return (bool) DB::selectOne('SELECT 1 AS ok FROM sales_pages WHERE slug = ? LIMIT 1', [$slug]);
    }

    private function slugify(string $text): string
    {
        $slug = mb_strtolower(trim($text));
        $slug = Str::ascii($slug);
        $slug = preg_replace('/[^a-z0-9]+/', '-', $slug) ?? '';
        $slug = trim($slug, '-');

        return mb_substr($slug, 0, 255);
    }

    /**
     * @param  array<string,mixed>  $data
     * @return array<int,string>
     */
    private function validate(array $data, bool $isUpdate): array
    {
        $errors = [];

        if (! $isUpdate && empty($data['profile_item_id'])) {
            $errors[] = 'profile_item_id é obrigatório';
        }

        if (array_key_exists('store_title', $data)) {
            $title = $data['store_title'];
            if (! is_string($title) || mb_strlen(trim($title)) < 2) {
                $errors[] = 'store_title deve ter pelo menos 2 caracteres';
            }
            if (is_string($title) && mb_strlen($title) > 255) {
                $errors[] = 'store_title não pode ter mais de 255 caracteres';
            }
        }

        if (array_key_exists('button_text', $data) && is_string($data['button_text']) && mb_strlen($data['button_text']) > 100) {
            $errors[] = 'button_text não pode ter mais de 100 caracteres';
        }

        if (array_key_exists('theme', $data) && ! in_array($data['theme'], ['light', 'dark'], true)) {
            $errors[] = 'theme deve ser "light" ou "dark"';
        }

        if (array_key_exists('whatsapp_number', $data)) {
            $whatsapp = $data['whatsapp_number'];
            if ($whatsapp && ! is_string($whatsapp)) {
                $errors[] = 'whatsapp_number deve ser uma string';
            } elseif (is_string($whatsapp) && trim($whatsapp) !== '' && ! preg_match('/^[\d\s\+\-\(\)]+$/', $whatsapp)) {
                $errors[] = 'whatsapp_number deve conter apenas números e caracteres de formatação (+ - ( ) espaços)';
            }
        }

        foreach (['background_color', 'text_color', 'button_color', 'button_text_color'] as $field) {
            if (array_key_exists($field, $data) && $data[$field]) {
                if (! is_string($data[$field]) || ! preg_match('/^#[0-9A-Fa-f]{6}$/', $data[$field])) {
                    $errors[] = $field === 'background_color'
                        ? 'background_color deve ser um código hexadecimal válido (ex: #FF0000)'
                        : "{$field} deve ser um código hexadecimal válido";
                }
            }
        }

        if (array_key_exists('slug', $data) && $data['slug']) {
            if (! is_string($data['slug']) || ! preg_match('/^[a-z0-9-]+$/', $data['slug'])) {
                $errors[] = 'slug deve conter apenas letras minúsculas, números e hífens';
            }
            if (is_string($data['slug']) && mb_strlen($data['slug']) > 255) {
                $errors[] = 'slug não pode ter mais de 255 caracteres';
            }
        }

        if (array_key_exists('display_format', $data) && $data['display_format']
            && ! in_array($data['display_format'], ['button', 'banner'], true)) {
            $errors[] = 'display_format deve ser "button" ou "banner"';
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

        foreach (['store_title', 'store_description', 'button_text', 'meta_title', 'meta_description'] as $field) {
            if (array_key_exists($field, $data)) {
                $sanitized[$field] = $this->trimOrNull($data[$field]);
            }
        }

        // Paridade com o Node: whatsapp_number é NOT NULL e sai sempre no payload.
        if (array_key_exists('whatsapp_number', $data) && $data['whatsapp_number'] !== null) {
            $sanitized['whatsapp_number'] = trim((string) $data['whatsapp_number']);
        } else {
            $sanitized['whatsapp_number'] = '';
        }

        if (array_key_exists('slug', $data)) {
            $sanitized['slug'] = $data['slug'] ? mb_strtolower(trim((string) $data['slug'])) : null;
        }

        if (array_key_exists('display_format', $data)) {
            $sanitized['display_format'] = $data['display_format'] === 'banner' ? 'banner' : 'button';
        }

        if (array_key_exists('card_banner_image_url', $data)) {
            $sanitized['card_banner_image_url'] = $this->trimOrNull($data['card_banner_image_url']);
        }

        $copy = [
            'profile_item_id', 'button_logo_url', 'theme', 'background_color',
            'text_color', 'button_color', 'button_text_color', 'background_image_url',
            'meta_image_url', 'preview_token', 'status',
        ];
        foreach ($copy as $field) {
            if (array_key_exists($field, $data)) {
                $sanitized[$field] = $data[$field];
            }
        }

        return $sanitized;
    }

    private function trimOrNull(mixed $value): ?string
    {
        if ($value === null || $value === '' || ! is_scalar($value)) {
            return null;
        }
        $trimmed = trim((string) $value);

        return $trimmed !== '' ? $trimmed : null;
    }
}
