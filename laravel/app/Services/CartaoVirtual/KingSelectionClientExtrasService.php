<?php

namespace App\Services\CartaoVirtual;

use App\Support\KingSelection\KsAccess;
use Illuminate\Support\Facades\DB;
use App\Support\SchemaMeta;

/**
 * KS cliente — export + pedidos de edição (modo público).
 */
class KingSelectionClientExtrasService
{
    /**
     * @param  array<string,mixed>  $payload
     * @return array{status:int, body:array<string,mixed>}
     */
    public function export(array $payload, string $slug): array
    {
        $slug = trim($slug);
        if ($slug === '') {
            return ['status' => 400, 'body' => ['message' => 'slug é obrigatório.']];
        }
        if ($slug !== (string) ($payload['slug'] ?? '')) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão.']];
        }
        $galleryId = (int) ($payload['galleryId'] ?? 0);
        $g = DB::selectOne('SELECT id, nome_projeto, slug FROM king_galleries WHERE id = ? LIMIT 1', [$galleryId]);
        if (! $g) {
            return ['status' => 404, 'body' => ['message' => 'Galeria não encontrada.']];
        }

        $ctx = KsAccess::parseClientContext($payload);
        $hasSk = SchemaMeta::hasColumn('king_selections', 'session_key');

        if ($ctx['cid']) {
            $rows = DB::select(
                'SELECT p.original_name FROM king_selections s JOIN king_photos p ON p.id = s.photo_id
                 WHERE s.gallery_id = ? AND s.client_id = ? ORDER BY p."order" ASC, p.id ASC',
                [$galleryId, $ctx['cid']]
            );
        } elseif ($ctx['sk'] && $hasSk) {
            $rows = DB::select(
                'SELECT p.original_name FROM king_selections s JOIN king_photos p ON p.id = s.photo_id
                 WHERE s.gallery_id = ? AND s.client_id IS NULL AND s.session_key = ? ORDER BY p."order" ASC, p.id ASC',
                [$galleryId, $ctx['sk']]
            );
        } else {
            $rows = DB::select(
                'SELECT p.original_name FROM king_selections s JOIN king_photos p ON p.id = s.photo_id
                 WHERE s.gallery_id = ? AND s.client_id IS NULL AND (s.session_key IS NULL OR s.session_key = \'\')
                 ORDER BY p."order" ASC, p.id ASC',
                [$galleryId]
            );
        }

        $names = [];
        foreach ($rows as $r) {
            $s = trim((string) ($r->original_name ?? ''));
            $s = preg_replace('/^.*[\\\\\\/]/', '', $s) ?? $s;
            $dot = strrpos($s, '.');
            if ($dot !== false && $dot > 0) {
                $s = substr($s, 0, $dot);
            }
            $s = trim($s);
            if ($s !== '') {
                $names[] = $s;
            }
        }

        $lightroom = implode(', ', $names);
        $windows = implode(' OR ', array_map(static fn ($n) => '"'.str_replace('"', '', $n).'"', $names));

        return [
            'status' => 200,
            'body' => [
                'success' => true,
                'gallery' => [
                    'id' => (int) $g->id,
                    'nome_projeto' => (string) ($g->nome_projeto ?? ''),
                    'slug' => (string) $g->slug,
                ],
                'lightroom' => $lightroom,
                'windows' => $windows,
            ],
        ];
    }

    /**
     * @param  array<string,mixed>  $payload
     * @param  list<mixed>  $photoIds
     * @return array{status:int, body:array<string,mixed>}
     */
    public function createEditRequest(array $payload, string $slug, array $photoIds, ?string $note): array
    {
        $slug = trim($slug);
        if ($slug === '') {
            return ['status' => 400, 'body' => ['message' => 'slug é obrigatório.']];
        }
        if ($slug !== (string) ($payload['slug'] ?? '')) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão.']];
        }

        $ids = [];
        foreach ($photoIds as $x) {
            $n = (int) $x;
            if ($n > 0) {
                $ids[$n] = $n;
            }
        }
        $ids = array_values($ids);
        if ($ids === []) {
            return ['status' => 400, 'body' => ['message' => 'Selecione pelo menos uma foto.']];
        }

        if (! SchemaMeta::hasColumn('king_galleries', 'allow_client_edit_request')
            || ! SchemaMeta::hasTable('king_client_edit_requests')) {
            return ['status' => 503, 'body' => ['message' => 'Pedidos de edição indisponíveis no servidor.']];
        }

        $galleryId = (int) ($payload['galleryId'] ?? 0);
        $g = DB::selectOne(
            'SELECT id, access_mode, allow_client_edit_request FROM king_galleries WHERE id = ? LIMIT 1',
            [$galleryId]
        );
        if (! $g) {
            return ['status' => 404, 'body' => ['message' => 'Galeria não encontrada.']];
        }
        if (KsAccess::normAccessMode($g->access_mode ?? 'private') !== 'public') {
            return ['status' => 403, 'body' => ['message' => 'Pedidos de edição só estão disponíveis no modo público.']];
        }
        if (! filter_var($g->allow_client_edit_request ?? false, FILTER_VALIDATE_BOOLEAN)) {
            return ['status' => 403, 'body' => ['message' => 'O fotógrafo não ativou pedidos de edição nesta galeria.']];
        }

        $ctx = KsAccess::parseClientContext($payload);
        $clientId = $ctx['cid'] ?: 0;
        if ($clientId < 1) {
            return ['status' => 403, 'body' => ['message' => 'Cadastre-se na galeria antes de enviar fotos para edição.']];
        }

        $valid = DB::select(
            'SELECT id FROM king_photos WHERE gallery_id = ? AND id IN ('.implode(',', array_fill(0, count($ids), '?')).')',
            array_merge([$galleryId], $ids)
        );
        $validIds = array_map(static fn ($r) => (int) $r->id, $valid);
        if ($validIds === []) {
            return ['status' => 400, 'body' => ['message' => 'Nenhuma foto válida selecionada.']];
        }

        $noteClient = $note !== null && trim($note) !== '' ? mb_substr(trim($note), 0, 2000) : null;
        $hasBatchCol = SchemaMeta::hasColumn('king_client_edit_requests', 'selection_batch');
        $selectionBatch = $this->currentRound($galleryId, $clientId);

        $requestId = DB::transaction(function () use ($galleryId, $clientId, $noteClient, $hasBatchCol, $selectionBatch, $validIds) {
            $row = [
                'gallery_id' => $galleryId,
                'client_id' => $clientId,
                'status' => 'pending',
                'note_client' => $noteClient,
                'created_at' => now(),
                'updated_at' => now(),
            ];
            if ($hasBatchCol) {
                $row['selection_batch'] = $selectionBatch;
            }
            $requestId = (int) DB::table('king_client_edit_requests')->insertGetId($row);
            foreach ($validIds as $pid) {
                DB::insert(
                    'INSERT INTO king_client_edit_request_photos (edit_request_id, photo_id) VALUES (?, ?) ON CONFLICT DO NOTHING',
                    [$requestId, $pid]
                );
            }
            $this->ensurePhotosInBatch($galleryId, $clientId, $validIds, $selectionBatch);
            $this->advanceRound($galleryId, $clientId, $selectionBatch);

            return $requestId;
        });

        $nextRound = $selectionBatch + 1;
        $n = (int) (DB::selectOne(
            "SELECT COUNT(*)::int AS n FROM king_client_edit_requests WHERE gallery_id = ? AND client_id = ? AND status <> 'cancelled'",
            [$galleryId, $clientId]
        )->n ?? 1);

        return ['status' => 200, 'body' => [
            'success' => true,
            'request_id' => $requestId,
            'request_number' => $n,
            'selection_batch' => $selectionBatch,
            'next_selection_round' => $nextRound,
            'photo_count' => count($validIds),
            'message' => "Seleção {$selectionBatch} enviada (".count($validIds)." foto(s)). Marque outras fotos para a Seleção {$nextRound}.",
        ]];
    }

    /**
     * @param  array<string,mixed>  $payload
     * @return array{status:int, body:array<string,mixed>}
     */
    public function listEditRequests(array $payload, string $slug): array
    {
        $slug = trim($slug);
        if ($slug === '') {
            return ['status' => 400, 'body' => ['message' => 'slug é obrigatório.']];
        }
        if ($slug !== (string) ($payload['slug'] ?? '')) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão.']];
        }

        if (! SchemaMeta::hasColumn('king_galleries', 'allow_client_edit_request')
            || ! SchemaMeta::hasTable('king_client_edit_requests')) {
            return ['status' => 200, 'body' => ['success' => true, 'requests' => []]];
        }

        $galleryId = (int) ($payload['galleryId'] ?? 0);
        $g = DB::selectOne(
            'SELECT id, access_mode, allow_client_edit_request FROM king_galleries WHERE id = ? LIMIT 1',
            [$galleryId]
        );
        if (! $g) {
            return ['status' => 404, 'body' => ['message' => 'Galeria não encontrada.']];
        }
        if (KsAccess::normAccessMode($g->access_mode ?? 'private') !== 'public'
            || ! filter_var($g->allow_client_edit_request ?? false, FILTER_VALIDATE_BOOLEAN)) {
            return ['status' => 200, 'body' => ['success' => true, 'requests' => []]];
        }

        $ctx = KsAccess::parseClientContext($payload);
        if (! $ctx['cid']) {
            return ['status' => 200, 'body' => ['success' => true, 'requests' => []]];
        }

        $hasBatch = SchemaMeta::hasColumn('king_client_edit_requests', 'selection_batch');
        $rows = DB::select(
            'SELECT r.id,'.($hasBatch ? ' r.selection_batch,' : '').' r.status, r.note_client, r.created_at, r.updated_at,
                    (SELECT COUNT(*)::int FROM king_client_edit_request_photos p WHERE p.edit_request_id = r.id) AS photo_count
             FROM king_client_edit_requests r
             WHERE r.gallery_id = ? AND r.client_id = ?
             ORDER BY r.created_at DESC, r.id DESC
             LIMIT 50',
            [$galleryId, $ctx['cid']]
        );

        return ['status' => 200, 'body' => ['success' => true, 'requests' => $rows]];
    }

    /**
     * @param  array<string,mixed>  $payload
     * @return array{status:int, body:array<string,mixed>}
     */
    public function cancelEditRequest(array $payload, string $slug, int $requestId): array
    {
        $slug = trim($slug);
        if ($slug === '') {
            return ['status' => 400, 'body' => ['message' => 'slug é obrigatório.']];
        }
        if ($requestId < 1) {
            return ['status' => 400, 'body' => ['message' => 'requestId inválido.']];
        }
        if ($slug !== (string) ($payload['slug'] ?? '')) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão.']];
        }

        if (! SchemaMeta::hasColumn('king_galleries', 'allow_client_edit_request')
            || ! SchemaMeta::hasTable('king_client_edit_requests')) {
            return ['status' => 503, 'body' => ['message' => 'Pedidos de edição indisponíveis.']];
        }

        $galleryId = (int) ($payload['galleryId'] ?? 0);
        $g = DB::selectOne(
            'SELECT id, access_mode, allow_client_edit_request FROM king_galleries WHERE id = ? LIMIT 1',
            [$galleryId]
        );
        if (! $g) {
            return ['status' => 404, 'body' => ['message' => 'Galeria não encontrada.']];
        }
        if (KsAccess::normAccessMode($g->access_mode ?? 'private') !== 'public'
            || ! filter_var($g->allow_client_edit_request ?? false, FILTER_VALIDATE_BOOLEAN)) {
            return ['status' => 403, 'body' => ['message' => 'Pedidos de edição só estão disponíveis no modo público.']];
        }

        $ctx = KsAccess::parseClientContext($payload);
        if (! $ctx['cid']) {
            return ['status' => 403, 'body' => ['message' => 'Cadastre-se na galeria antes de cancelar pedidos.']];
        }

        $n = DB::update(
            "UPDATE king_client_edit_requests SET status = 'cancelled', updated_at = NOW()
             WHERE id = ? AND gallery_id = ? AND client_id = ? AND LOWER(status) = 'pending'",
            [$requestId, $galleryId, $ctx['cid']]
        );
        if ($n < 1) {
            return ['status' => 409, 'body' => ['message' => 'Só é possível cancelar pedidos ainda pendentes.']];
        }

        return ['status' => 200, 'body' => ['success' => true, 'id' => $requestId, 'status' => 'cancelled']];
    }

    private function currentRound(int $galleryId, int $clientId): int
    {
        if (SchemaMeta::hasColumn('king_gallery_clients', 'selection_round')) {
            $r = DB::selectOne(
                'SELECT selection_round FROM king_gallery_clients WHERE id = ? AND gallery_id = ? LIMIT 1',
                [$clientId, $galleryId]
            );
            $v = (int) ($r->selection_round ?? 0);
            if ($v > 0) {
                return $v;
            }
        }

        return 1;
    }

    /**
     * @param  list<int>  $photoIds
     */
    private function ensurePhotosInBatch(int $galleryId, int $clientId, array $photoIds, int $batch): void
    {
        if (! SchemaMeta::hasColumn('king_selections', 'selection_batch')) {
            return;
        }
        $b = max(1, $batch);
        foreach ($photoIds as $pid) {
            $ex = DB::selectOne(
                'SELECT id, selection_batch FROM king_selections WHERE gallery_id = ? AND client_id = ? AND photo_id = ? LIMIT 1',
                [$galleryId, $clientId, $pid]
            );
            if ($ex) {
                $prev = (int) ($ex->selection_batch ?? 1);
                if ($prev < $b) {
                    continue;
                }
                if ($prev !== $b) {
                    DB::update(
                        'UPDATE king_selections SET selection_batch = ? WHERE gallery_id = ? AND client_id = ? AND photo_id = ?',
                        [$b, $galleryId, $clientId, $pid]
                    );
                }
            } else {
                DB::insert(
                    'INSERT INTO king_selections (gallery_id, photo_id, client_id, feedback_cliente, selection_batch) VALUES (?,?,?,NULL,?)',
                    [$galleryId, $pid, $clientId, $b]
                );
            }
        }
    }

    private function advanceRound(int $galleryId, int $clientId, int $completedBatch): int
    {
        $batch = max(1, $completedBatch);
        $next = $batch + 1;
        if (! SchemaMeta::hasColumn('king_gallery_clients', 'selection_round')) {
            return $next;
        }
        DB::update(
            "UPDATE king_gallery_clients
             SET selection_round = ?,
                 status = CASE WHEN lower(COALESCE(status, '')) = 'finalizado' THEN 'andamento' ELSE status END,
                 updated_at = NOW()
             WHERE gallery_id = ? AND id = ?",
            [$next, $galleryId, $clientId]
        );

        return $next;
    }

    /**
     * @param  array<string,mixed>  $payload
     * @return array{status:int, body:array<string,mixed>}
     */
    public function promoVerify(array $payload, string $slug, bool $socialConfirmed, string $couponCode): array
    {
        $slug = trim($slug);
        if ($slug === '') {
            return ['status' => 400, 'body' => ['message' => 'slug é obrigatório.']];
        }
        if ($slug !== (string) ($payload['slug'] ?? '')) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão.']];
        }
        if (! $socialConfirmed) {
            return ['status' => 400, 'body' => ['message' => 'Marque que seguiu os perfis indicados.']];
        }
        $couponCode = trim($couponCode);
        if ($couponCode === '') {
            return ['status' => 400, 'body' => ['message' => 'Informe o código do cupom.']];
        }
        $ctx = KsAccess::parseClientContext($payload);
        $cid = (int) ($ctx['cid'] ?? 0);
        $galleryId = (int) ($payload['galleryId'] ?? 0);
        if ($cid < 1) {
            return ['status' => 403, 'body' => [
                'message' => 'Entre com sua conta para validar o cupom (e-mail/senha ou nome/e-mail/WhatsApp), ou abra o link da galeria numa sessão válida.',
            ]];
        }
        if (! SchemaMeta::hasColumn('king_galleries', 'promo_enabled')) {
            return ['status' => 503, 'body' => ['message' => 'Cupom indisponível neste servidor. Execute a migration 213 no Postgres.']];
        }
        $g = DB::selectOne(
            'SELECT id, promo_enabled, promo_coupon_code, promo_valid_until FROM king_galleries WHERE id = ? LIMIT 1',
            [$galleryId]
        );
        if (! $g || empty($g->promo_enabled)) {
            return ['status' => 400, 'body' => ['message' => 'Cupom não está ativo nesta galeria.']];
        }
        if ($g->promo_valid_until !== null) {
            $t = strtotime((string) $g->promo_valid_until);
            if ($t !== false && time() > $t) {
                return ['status' => 400, 'body' => ['message' => 'Este cupom expirou. Fale com o fotógrafo.']];
            }
        }
        $want = $this->normPromo($g->promo_coupon_code ?? null);
        $got = $this->normPromo($couponCode);
        if ($want === '' || $want !== $got) {
            return ['status' => 400, 'body' => ['message' => 'Código do cupom inválido.']];
        }
        if (! SchemaMeta::hasColumn('king_gallery_clients', 'promo_coupon_validated_at')) {
            return ['status' => 503, 'body' => ['message' => 'Cadastro de cliente sem campos de cupom. Execute a migration 213.']];
        }
        DB::update(
            'UPDATE king_gallery_clients
             SET promo_social_confirmed_at = NOW(),
                 promo_coupon_validated_at = NOW(),
                 promo_coupon_entered = ?,
                 updated_at = NOW()
             WHERE id = ? AND gallery_id = ?',
            [substr($couponCode, 0, 120), $cid, $galleryId]
        );

        return ['status' => 200, 'body' => ['success' => true, 'message' => 'Cupom aplicado com sucesso.']];
    }

    private function normPromo(mixed $s): string
    {
        $t = strtolower(trim((string) ($s ?? '')));
        if (class_exists(\Normalizer::class)) {
            $n = \Normalizer::normalize($t, \Normalizer::FORM_D);
            if (is_string($n) && $n !== '') {
                $t = $n;
            }
        }

        return preg_replace('/[\x{0300}-\x{036f}]/u', '', $t) ?? $t;
    }
}
