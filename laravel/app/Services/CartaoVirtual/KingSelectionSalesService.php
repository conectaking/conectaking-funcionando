<?php

namespace App\Services\CartaoVirtual;

use App\Support\KingSelection\KsAccess;
use Illuminate\Support\Facades\DB;
use App\Support\SchemaMeta;

/**
 * KS vendas — sales-config + listagem de clientes/rodadas (núcleo).
 */
class KingSelectionSalesService
{
    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function getSalesConfig(string $userId, int $galleryId): array
    {
        $g = $this->ownedGallery($userId, $galleryId);
        if (! $g) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }

        return ['status' => 200, 'body' => [
            'success' => true,
            'access_mode' => KsAccess::normAccessMode($g->access_mode ?? 'private'),
            'salesConfig' => $this->loadSalesConfig($galleryId),
            'packages' => $this->listPackages($galleryId),
        ]];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function saveSalesConfig(string $userId, int $galleryId, array $body): array
    {
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }

        $map = [
            'pix_enabled' => fn ($v) => (bool) $v,
            'pix_key' => fn ($v) => $v === null ? null : (substr(trim((string) $v), 0, 255) ?: null),
            'pix_holder_name' => fn ($v) => $v === null ? null : (substr(trim((string) $v), 0, 255) ?: null),
            'pix_instructions' => fn ($v) => $v === null ? null : (substr(trim((string) $v), 0, 2000) ?: null),
            'sales_over_limit_policy' => fn ($v) => $this->normOverLimit($v),
            'sales_price_mode' => fn ($v) => $this->normPriceMode($v),
            'sales_unit_price_cents' => fn ($v) => max(0, (int) $v),
        ];

        $sets = [];
        $params = [];
        foreach ($map as $col => $cast) {
            if (! array_key_exists($col, $body) || ! SchemaMeta::hasColumn('king_galleries', $col)) {
                continue;
            }
            $sets[] = "{$col} = ?";
            $params[] = $cast($body[$col]);
        }
        if ($sets !== []) {
            $params[] = $galleryId;
            DB::update('UPDATE king_galleries SET '.implode(', ', $sets).', updated_at = NOW() WHERE id = ?', $params);
        }

        if (isset($body['packages']) && is_array($body['packages']) && SchemaMeta::hasTable('king_gallery_sale_packages')) {
            $this->syncPackages($galleryId, $body['packages']);
        }

        return ['status' => 200, 'body' => [
            'success' => true,
            'salesConfig' => $this->loadSalesConfig($galleryId),
            'packages' => $this->listPackages($galleryId),
        ]];
    }

    /**
     * Listagem de vendas por cliente/rodada (versão núcleo).
     *
     * @return array{status:int, body:array<string,mixed>}
     */
    public function listSalesClients(string $userId, int $galleryId): array
    {
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        if (! SchemaMeta::hasTable('king_gallery_clients')) {
            return ['status' => 200, 'body' => ['success' => true, 'clients' => []]];
        }

        $cRows = DB::select(
            'SELECT id, nome, email, telefone, status, enabled
             FROM king_gallery_clients
             WHERE gallery_id = ? AND (enabled IS DISTINCT FROM false)
             ORDER BY created_at ASC, id ASC',
            [$galleryId]
        );
        $clients = array_values(array_filter(
            $cRows,
            static fn ($r) => ! KsAccess::isTechnicalFaceEmail($r->email ?? null)
        ));

        $hasBatch = SchemaMeta::hasColumn('king_selections', 'selection_batch');
        $batchExpr = $hasBatch ? 'selection_batch' : '1';
        $sRows = DB::select(
            "SELECT client_id, {$batchExpr} AS selection_batch, COUNT(*)::int AS selected_count
             FROM king_selections
             WHERE gallery_id = ? AND client_id IS NOT NULL
             GROUP BY client_id, {$batchExpr}
             ORDER BY client_id ASC, {$batchExpr} ASC",
            [$galleryId]
        );

        $payMap = [];
        if (SchemaMeta::hasTable('king_client_payment_requests')) {
            $pays = DB::select(
                'SELECT client_id, selection_batch, status, amount_cents, note_admin, proof_file_path
                 FROM king_client_payment_requests WHERE gallery_id = ?',
                [$galleryId]
            );
            foreach ($pays as $p) {
                $key = ((int) $p->client_id).':'.((int) ($p->selection_batch ?? 1));
                $payMap[$key] = [
                    'status' => $this->normPaymentStatus($p->status ?? ''),
                    'amount_cents' => $p->amount_cents !== null ? max(0, (int) $p->amount_cents) : null,
                    'note_admin' => $p->note_admin ?? null,
                    'has_proof' => trim((string) ($p->proof_file_path ?? '')) !== '',
                ];
            }
        }

        $roundsByClient = [];
        foreach ($sRows as $s) {
            $cid = (int) $s->client_id;
            $batch = max(1, (int) ($s->selection_batch ?? 1));
            $key = $cid.':'.$batch;
            $roundsByClient[$cid][] = [
                'selection_batch' => $batch,
                'selected_count' => (int) ($s->selected_count ?? 0),
                'payment' => $payMap[$key] ?? null,
            ];
        }

        $out = [];
        foreach ($clients as $c) {
            $cid = (int) $c->id;
            $out[] = [
                'id' => $cid,
                'nome' => $c->nome,
                'email' => $c->email,
                'telefone' => $c->telefone,
                'status' => $c->status ?? null,
                'enabled' => $c->enabled ?? true,
                'rounds' => $roundsByClient[$cid] ?? [],
            ];
        }

        return ['status' => 200, 'body' => [
            'success' => true,
            'salesConfig' => $this->loadSalesConfig($galleryId),
            'packages' => $this->listPackages($galleryId),
            'clients' => $out,
        ]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function getSalesRound(string $userId, int $galleryId, int $clientId, int $selectionBatch): array
    {
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        if ($clientId < 1) {
            return ['status' => 400, 'body' => ['message' => 'IDs inválidos']];
        }
        $batch = max(1, $selectionBatch);
        $hasSelBatch = SchemaMeta::hasColumn('king_selections', 'selection_batch');
        $sql = 'SELECT s.photo_id, p.original_name, p."order", p.edited_file_path
             FROM king_selections s
             JOIN king_photos p ON p.id=s.photo_id AND p.gallery_id=s.gallery_id
             WHERE s.gallery_id = ? AND s.client_id = ?'
            .($hasSelBatch ? ' AND s.selection_batch = ?' : '')
            .' ORDER BY p."order" ASC, p.id ASC';
        $params = $hasSelBatch ? [$galleryId, $clientId, $batch] : [$galleryId, $clientId];
        $selectedRows = SchemaMeta::hasTable('king_selections') ? DB::select($sql, $params) : [];
        $selected = [];
        foreach ($selectedRows as $r) {
            $selected[] = [
                'photo_id' => (int) ($r->photo_id ?? 0),
                'original_name' => (string) ($r->original_name ?? ''),
                'order' => (int) ($r->order ?? 0),
                'edited_file_path' => $r->edited_file_path ?? null,
            ];
        }

        return ['status' => 200, 'body' => [
            'success' => true,
            'selected' => $selected,
            'payment' => $this->getPaymentByClientRound($galleryId, $clientId, $batch),
            'approvals' => $this->listApprovalsByClientRound($galleryId, $clientId, $batch),
        ]];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function savePaymentTerms(string $userId, int $galleryId, int $clientId, int $selectionBatch, array $body): array
    {
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        if ($clientId < 1) {
            return ['status' => 400, 'body' => ['message' => 'IDs inválidos']];
        }
        if (! SchemaMeta::hasTable('king_client_payment_requests')) {
            return ['status' => 503, 'body' => ['message' => 'Tabela de pagamentos indisponível.']];
        }
        $batch = max(1, $selectionBatch);
        $hasNeg = SchemaMeta::hasColumn('king_client_payment_requests', 'negotiated_total_cents');
        $hasDown = SchemaMeta::hasColumn('king_client_payment_requests', 'down_payment_cents');
        $hasInst = SchemaMeta::hasColumn('king_client_payment_requests', 'installment_count');
        $hasRemBal = SchemaMeta::hasColumn('king_client_payment_requests', 'remaining_balance_cents');
        $hasIntDays = SchemaMeta::hasColumn('king_client_payment_requests', 'installment_interval_days');
        if (! $hasNeg) {
            return ['status' => 503, 'body' => [
                'message' => 'Execute a migration 215 (215_kingselection_payment_negotiated_terms.sql) no Postgres.',
            ]];
        }

        $selParts = ['negotiated_total_cents'];
        if ($hasDown) {
            $selParts[] = 'down_payment_cents';
        }
        if ($hasInst) {
            $selParts[] = 'installment_count';
        }
        if ($hasRemBal) {
            $selParts[] = 'remaining_balance_cents';
        }
        if ($hasIntDays) {
            $selParts[] = 'installment_interval_days';
        }
        $cur = DB::selectOne(
            'SELECT '.implode(', ', $selParts).'
             FROM king_client_payment_requests
             WHERE gallery_id = ? AND client_id = ? AND selection_batch = ?',
            [$galleryId, $clientId, $batch]
        );

        $neg = $cur && $cur->negotiated_total_cents !== null ? (int) $cur->negotiated_total_cents : null;
        $down = $cur && $hasDown && $cur->down_payment_cents !== null ? (int) $cur->down_payment_cents : null;
        $inst = $cur && $hasInst && $cur->installment_count !== null ? (int) $cur->installment_count : null;
        $remBal = $cur && $hasRemBal && $cur->remaining_balance_cents !== null ? (int) $cur->remaining_balance_cents : null;
        $intDays = $cur && $hasIntDays && $cur->installment_interval_days !== null ? (int) $cur->installment_interval_days : null;

        if (array_key_exists('negotiated_total_cents', $body)) {
            $raw = $body['negotiated_total_cents'];
            if ($raw === null || $raw === '') {
                $neg = null;
            } else {
                $n = (int) $raw;
                if ($n < 0) {
                    return ['status' => 400, 'body' => ['message' => 'Total acordado inválido.']];
                }
                $neg = $n;
            }
        }
        if ($hasDown && array_key_exists('down_payment_cents', $body)) {
            $raw = $body['down_payment_cents'];
            if ($raw === null || $raw === '') {
                $down = null;
            } else {
                $n = (int) $raw;
                if ($n < 0) {
                    return ['status' => 400, 'body' => ['message' => 'Entrada declarada inválida.']];
                }
                $down = $n;
            }
        }
        if ($hasInst && array_key_exists('installment_count', $body)) {
            $raw = $body['installment_count'];
            if ($raw === null || $raw === '') {
                $inst = null;
            } else {
                $n = (int) $raw;
                if ($n < 1 || $n > 240) {
                    return ['status' => 400, 'body' => ['message' => 'Número de parcelas inválido (1–240).']];
                }
                $inst = $n;
            }
        }
        if ($hasRemBal && array_key_exists('remaining_balance_cents', $body)) {
            $raw = $body['remaining_balance_cents'];
            if ($raw === null || $raw === '') {
                $remBal = null;
            } else {
                $n = (int) $raw;
                if ($n < 0) {
                    return ['status' => 400, 'body' => ['message' => 'Valor restante inválido.']];
                }
                $remBal = $n;
            }
        }
        if ($hasIntDays && array_key_exists('installment_interval_days', $body)) {
            $raw = $body['installment_interval_days'];
            if ($raw === null || $raw === '') {
                $intDays = null;
            } else {
                $n = (int) $raw;
                if ($n < 1 || $n > 730) {
                    return ['status' => 400, 'body' => ['message' => 'Intervalo em dias inválido (1–730).']];
                }
                $intDays = $n;
            }
        }

        if (
            ! array_key_exists('negotiated_total_cents', $body)
            && ! ($hasDown && array_key_exists('down_payment_cents', $body))
            && ! ($hasInst && array_key_exists('installment_count', $body))
            && ! ($hasRemBal && array_key_exists('remaining_balance_cents', $body))
            && ! ($hasIntDays && array_key_exists('installment_interval_days', $body))
        ) {
            return ['status' => 400, 'body' => [
                'message' => 'Envie negotiated_total_cents, down_payment_cents, installment_count, remaining_balance_cents ou installment_interval_days.',
            ]];
        }

        $hasCum = SchemaMeta::hasColumn('king_client_payment_requests', 'amount_received_cumulative_cents');
        $hasCourtesy = SchemaMeta::hasColumn('king_client_payment_requests', 'courtesy_cents');

        $insCols = ['gallery_id', 'client_id', 'selection_batch', 'payment_method', 'status', 'negotiated_total_cents'];
        $insVals = [$galleryId, $clientId, $batch, 'pix', 'pending', $neg];
        $updParts = ['negotiated_total_cents = EXCLUDED.negotiated_total_cents'];
        if ($hasDown) {
            $insCols[] = 'down_payment_cents';
            $insVals[] = $down;
            $updParts[] = 'down_payment_cents = EXCLUDED.down_payment_cents';
        }
        if ($hasInst) {
            $insCols[] = 'installment_count';
            $insVals[] = $inst;
            $updParts[] = 'installment_count = EXCLUDED.installment_count';
        }
        if ($hasRemBal) {
            $insCols[] = 'remaining_balance_cents';
            $insVals[] = $remBal;
            $updParts[] = 'remaining_balance_cents = EXCLUDED.remaining_balance_cents';
        }
        if ($hasIntDays) {
            $insCols[] = 'installment_interval_days';
            $insVals[] = $intDays;
            $updParts[] = 'installment_interval_days = EXCLUDED.installment_interval_days';
        }
        if ($hasCum) {
            $insCols[] = 'amount_received_cumulative_cents';
            $insVals[] = 0;
        }
        if ($hasCourtesy) {
            $insCols[] = 'courtesy_cents';
            $insVals[] = 0;
        }
        $placeholders = implode(', ', array_fill(0, count($insVals), '?'));
        DB::statement(
            'INSERT INTO king_client_payment_requests ('.implode(', ', $insCols).', created_at, updated_at)
             VALUES ('.$placeholders.', NOW(), NOW())
             ON CONFLICT (gallery_id, client_id, selection_batch)
             DO UPDATE SET '.implode(', ', $updParts).', updated_at = NOW()',
            $insVals
        );

        return ['status' => 200, 'body' => [
            'success' => true,
            'payment' => $this->getPaymentByClientRound($galleryId, $clientId, $batch),
        ]];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function paymentReview(string $userId, int $galleryId, int $clientId, int $selectionBatch, array $body): array
    {
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        if ($clientId < 1) {
            return ['status' => 400, 'body' => ['message' => 'IDs inválidos']];
        }
        if (! SchemaMeta::hasTable('king_client_payment_requests')) {
            return ['status' => 503, 'body' => ['message' => 'Tabela de pagamentos indisponível. Execute a migration 208.']];
        }
        $batch = max(1, $selectionBatch);
        $nextStatusRaw = strtolower(trim((string) ($body['status'] ?? '')));
        $nextStatus = match ($nextStatusRaw) {
            'confirmed' => 'confirmed',
            'rejected' => 'rejected',
            'pending' => 'pending',
            default => null,
        };
        if ($nextStatus === null) {
            return ['status' => 400, 'body' => ['message' => 'Status inválido. Use pending/confirmed/rejected.']];
        }
        $noteAdmin = array_key_exists('note_admin', $body)
            ? substr(trim((string) $body['note_admin']), 0, 1000)
            : null;
        if ($noteAdmin === '') {
            $noteAdmin = null;
        }
        $amountCentsBody = array_key_exists('amount_cents', $body) ? max(0, (int) $body['amount_cents']) : null;
        $photographerConfirmed = array_key_exists('photographer_confirmed_cents', $body)
            ? max(0, (int) $body['photographer_confirmed_cents'])
            : null;
        $incrementMode = ! empty($body['increment_mode']);
        $remainderAsCourtesy = ! empty($body['remainder_as_courtesy']);
        $hasCum = SchemaMeta::hasColumn('king_client_payment_requests', 'amount_received_cumulative_cents');
        $hasCourtesy = SchemaMeta::hasColumn('king_client_payment_requests', 'courtesy_cents');

        if ($nextStatus === 'pending' || $nextStatus === 'rejected') {
            $clearFinancial = $nextStatus === 'pending' && ! empty($body['clear_payment_amounts']);
            if ($clearFinancial && $hasCum && $hasCourtesy) {
                DB::statement(
                    "INSERT INTO king_client_payment_requests
                       (gallery_id, client_id, selection_batch, payment_method, status, amount_cents,
                        amount_received_cumulative_cents, courtesy_cents, note_admin, reviewed_by_user_id, reviewed_at, created_at, updated_at)
                     VALUES (?, ?, ?, 'pix', 'pending', NULL, 0, 0, ?, ?, NOW(), NOW(), NOW())
                     ON CONFLICT (gallery_id, client_id, selection_batch)
                     DO UPDATE SET status='pending', amount_cents=NULL,
                       amount_received_cumulative_cents=0, courtesy_cents=0,
                       note_admin=EXCLUDED.note_admin, reviewed_by_user_id=EXCLUDED.reviewed_by_user_id, reviewed_at=NOW(), updated_at=NOW()",
                    [$galleryId, $clientId, $batch, $noteAdmin, $userId]
                );
            } elseif ($clearFinancial && $hasCum && ! $hasCourtesy) {
                DB::statement(
                    "INSERT INTO king_client_payment_requests
                       (gallery_id, client_id, selection_batch, payment_method, status, amount_cents,
                        amount_received_cumulative_cents, note_admin, reviewed_by_user_id, reviewed_at, created_at, updated_at)
                     VALUES (?, ?, ?, 'pix', 'pending', NULL, 0, ?, ?, NOW(), NOW(), NOW())
                     ON CONFLICT (gallery_id, client_id, selection_batch)
                     DO UPDATE SET status='pending', amount_cents=NULL,
                       amount_received_cumulative_cents=0,
                       note_admin=EXCLUDED.note_admin, reviewed_by_user_id=EXCLUDED.reviewed_by_user_id, reviewed_at=NOW(), updated_at=NOW()",
                    [$galleryId, $clientId, $batch, $noteAdmin, $userId]
                );
            } elseif ($clearFinancial && ! $hasCum) {
                DB::statement(
                    "INSERT INTO king_client_payment_requests
                       (gallery_id, client_id, selection_batch, payment_method, status, amount_cents, note_admin, reviewed_by_user_id, reviewed_at, created_at, updated_at)
                     VALUES (?, ?, ?, 'pix', 'pending', NULL, ?, ?, NOW(), NOW(), NOW())
                     ON CONFLICT (gallery_id, client_id, selection_batch)
                     DO UPDATE SET status='pending', amount_cents=NULL,
                       note_admin=EXCLUDED.note_admin, reviewed_by_user_id=EXCLUDED.reviewed_by_user_id, reviewed_at=NOW(), updated_at=NOW()",
                    [$galleryId, $clientId, $batch, $noteAdmin, $userId]
                );
            } else {
                DB::statement(
                    "INSERT INTO king_client_payment_requests
                       (gallery_id, client_id, selection_batch, payment_method, status, amount_cents, note_admin, reviewed_by_user_id, reviewed_at, created_at, updated_at)
                     VALUES (?, ?, ?, 'pix', ?, ?, ?, ?, NOW(), NOW(), NOW())
                     ON CONFLICT (gallery_id, client_id, selection_batch)
                     DO UPDATE SET status=EXCLUDED.status, note_admin=EXCLUDED.note_admin,
                                   reviewed_by_user_id=EXCLUDED.reviewed_by_user_id, reviewed_at=NOW(), updated_at=NOW()",
                    [$galleryId, $clientId, $batch, $nextStatus, $amountCentsBody, $noteAdmin, $userId]
                );
            }

            return ['status' => 200, 'body' => [
                'success' => true,
                'payment' => $this->getPaymentByClientRound($galleryId, $clientId, $batch),
            ]];
        }

        if (! $hasCum || ! $hasCourtesy) {
            if ($incrementMode || $remainderAsCourtesy) {
                return ['status' => 503, 'body' => [
                    'message' => 'Parcelas e cortesia do restante exigem a migration 214 no Postgres (214_kingselection_payment_partial_courtesy.sql).',
                ]];
            }
            $curRowLegacy = DB::selectOne(
                'SELECT status, amount_cents, note_admin FROM king_client_payment_requests
                 WHERE gallery_id = ? AND client_id = ? AND selection_batch = ?',
                [$galleryId, $clientId, $batch]
            );
            $noteLowL = strtolower((string) ($noteAdmin ?? $curRowLegacy->note_admin ?? ''));
            $blessLikeL =
                ($photographerConfirmed === null || $photographerConfirmed === 0)
                && ($amountCentsBody === 0 || $amountCentsBody === null)
                && (str_contains($noteLowL, 'aben') || str_contains($noteLowL, 'cortesia'));
            $amtL = $photographerConfirmed !== null ? $photographerConfirmed : $amountCentsBody;
            if ($blessLikeL) {
                $amtL = 0;
            }
            if (($amtL === null || $amtL === 0) && ! $blessLikeL) {
                return ['status' => 400, 'body' => [
                    'message' => 'Informe photographer_confirmed_cents ou amount_cents (valor confirmado).',
                ]];
            }
            DB::statement(
                "INSERT INTO king_client_payment_requests
                   (gallery_id, client_id, selection_batch, payment_method, status, amount_cents, note_admin, reviewed_by_user_id, reviewed_at, created_at, updated_at)
                 VALUES (?, ?, ?, 'pix', 'confirmed', ?, ?, ?, NOW(), NOW(), NOW())
                 ON CONFLICT (gallery_id, client_id, selection_batch)
                 DO UPDATE SET status=EXCLUDED.status, amount_cents=COALESCE(EXCLUDED.amount_cents, king_client_payment_requests.amount_cents),
                   note_admin=EXCLUDED.note_admin, reviewed_by_user_id=EXCLUDED.reviewed_by_user_id, reviewed_at=NOW(), updated_at=NOW()",
                [$galleryId, $clientId, $batch, $amtL !== null ? $amtL : 0, $noteAdmin, $userId]
            );
            $this->maybeAutoApproveAfterPaymentReview($galleryId, $clientId, $batch, $userId);

            return ['status' => 200, 'body' => [
                'success' => true,
                'payment' => $this->getPaymentByClientRound($galleryId, $clientId, $batch),
            ]];
        }

        $pricing = $this->computeSalesPricingForClientRound($galleryId, $clientId, $batch);
        $computedPkgGross = max(0, (int) ($pricing['computed_total_gross_cents'] ?? 0));
        $hasNegCol = SchemaMeta::hasColumn('king_client_payment_requests', 'negotiated_total_cents');
        $extra = [];
        if ($hasCum) {
            $extra[] = 'amount_received_cumulative_cents';
        }
        if ($hasCourtesy) {
            $extra[] = 'courtesy_cents';
        }
        if ($hasNegCol) {
            $extra[] = 'negotiated_total_cents';
        }
        $curRow = DB::selectOne(
            'SELECT status, amount_cents, note_admin'.($extra !== [] ? ', '.implode(', ', $extra) : '').'
             FROM king_client_payment_requests
             WHERE gallery_id = ? AND client_id = ? AND selection_batch = ?',
            [$galleryId, $clientId, $batch]
        );
        $expected = $this->effectiveExpectedTotalCents($computedPkgGross, $curRow, $hasNegCol);
        $cumulative = $hasCum ? max(0, (int) ($curRow->amount_received_cumulative_cents ?? 0)) : 0;
        $courtesy = $hasCourtesy ? max(0, (int) ($curRow->courtesy_cents ?? 0)) : 0;
        $prevSt = $this->normPaymentStatus($curRow->status ?? null);
        if ($hasCum && $cumulative === 0 && $prevSt === 'confirmed' && $curRow) {
            $legacy = $curRow->amount_cents !== null ? max(0, (int) $curRow->amount_cents) : 0;
            if ($legacy > 0 && $courtesy === 0) {
                $cumulative = $legacy;
            }
        }

        $noteLow = strtolower((string) ($noteAdmin ?? $curRow->note_admin ?? ''));
        $blessLike =
            ($photographerConfirmed === null || $photographerConfirmed === 0)
            && ($amountCentsBody === 0 || $amountCentsBody === null)
            && (str_contains($noteLow, 'aben') || str_contains($noteLow, 'cortesia'));

        $outCumulative = $cumulative;
        $outCourtesy = $courtesy;
        $outAmountCents = $amountCentsBody !== null ? $amountCentsBody : $outCumulative;
        $finalStatus = 'confirmed';

        if ($blessLike) {
            $outCumulative = 0;
            $outCourtesy = $expected;
            $outAmountCents = 0;
            $finalStatus = 'confirmed';
        } else {
            $confirmedVal = $photographerConfirmed !== null ? $photographerConfirmed : $amountCentsBody;
            if ($remainderAsCourtesy && ($confirmedVal === null || $confirmedVal === 0) && $expected > 0) {
                $outCourtesy = max(0, $expected - $outCumulative);
            } else {
                if (($confirmedVal === null || $confirmedVal === 0) && ! $remainderAsCourtesy) {
                    return ['status' => 400, 'body' => [
                        'message' => 'Informe photographer_confirmed_cents ou amount_cents (valor confirmado), ou marque o restante como cortesia.',
                    ]];
                }
                if ($confirmedVal !== null && $confirmedVal > 0) {
                    $outCumulative = $incrementMode ? $cumulative + $confirmedVal : $confirmedVal;
                }
                if ($remainderAsCourtesy && $expected > 0) {
                    $outCourtesy = max(0, $expected - $outCumulative);
                }
            }
            if ($outCourtesy > 0) {
                $outCourtesy = min($outCourtesy, max(0, $expected - $outCumulative));
            }
            $outAmountCents = $outCumulative;
            $finalStatus = ($outCumulative + $outCourtesy >= $expected) ? 'confirmed' : 'partial';
        }

        DB::statement(
            "INSERT INTO king_client_payment_requests
               (gallery_id, client_id, selection_batch, payment_method, status, amount_cents,
                amount_received_cumulative_cents, courtesy_cents, note_admin, reviewed_by_user_id, reviewed_at, created_at, updated_at)
             VALUES (?, ?, ?, 'pix', ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
             ON CONFLICT (gallery_id, client_id, selection_batch)
             DO UPDATE SET status=EXCLUDED.status, amount_cents=EXCLUDED.amount_cents,
               amount_received_cumulative_cents=EXCLUDED.amount_received_cumulative_cents,
               courtesy_cents=EXCLUDED.courtesy_cents, note_admin=EXCLUDED.note_admin,
               reviewed_by_user_id=EXCLUDED.reviewed_by_user_id, reviewed_at=NOW(), updated_at=NOW()",
            [$galleryId, $clientId, $batch, $finalStatus, $outAmountCents, $outCumulative, $outCourtesy, $noteAdmin, $userId]
        );
        $this->maybeAutoApproveAfterPaymentReview($galleryId, $clientId, $batch, $userId);

        return ['status' => 200, 'body' => [
            'success' => true,
            'payment' => $this->getPaymentByClientRound($galleryId, $clientId, $batch),
        ]];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function approvePhoto(string $userId, int $galleryId, int $clientId, int $selectionBatch, array $body): array
    {
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        $photoId = (int) ($body['photo_id'] ?? 0);
        if ($clientId < 1 || $photoId < 1) {
            return ['status' => 400, 'body' => ['message' => 'IDs inválidos']];
        }
        $status = strtolower(trim((string) ($body['status'] ?? '')));
        if (! in_array($status, ['pending', 'approved', 'rejected'], true)) {
            return ['status' => 400, 'body' => ['message' => 'status inválido (pending/approved/rejected).']];
        }
        if (! SchemaMeta::hasTable('king_selection_photo_approvals')) {
            return ['status' => 503, 'body' => ['message' => 'Tabela de aprovações indisponível. Execute a migration 208.']];
        }
        $batch = max(1, $selectionBatch);
        $deliveryMode = $this->normDeliveryMode($body['delivery_mode'] ?? null);
        $hasSelBatch = SchemaMeta::hasColumn('king_selections', 'selection_batch');
        $effBatch = $batch;
        $checkSql = 'SELECT 1 FROM king_selections WHERE gallery_id = ? AND client_id = ? AND photo_id = ?'
            .($hasSelBatch ? ' AND selection_batch = ?' : '').' LIMIT 1';
        $checkParams = $hasSelBatch ? [$galleryId, $clientId, $photoId, $batch] : [$galleryId, $clientId, $photoId];
        $hasSelection = DB::selectOne($checkSql, $checkParams);
        if (! $hasSelection) {
            if ($hasSelBatch) {
                $any = DB::selectOne(
                    'SELECT selection_batch FROM king_selections
                     WHERE gallery_id = ? AND client_id = ? AND photo_id = ?
                     ORDER BY selection_batch DESC LIMIT 1',
                    [$galleryId, $clientId, $photoId]
                );
                if (! $any) {
                    return ['status' => 404, 'body' => ['message' => 'Foto não está selecionada para este cliente/rodada.']];
                }
                $effBatch = max(1, (int) ($any->selection_batch ?? 1));
            } else {
                return ['status' => 404, 'body' => ['message' => 'Foto não está selecionada para este cliente/rodada.']];
            }
        }
        DB::statement(
            'INSERT INTO king_selection_photo_approvals
               (gallery_id, client_id, selection_batch, photo_id, status, delivery_mode, decided_by_user_id, decided_at, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
             ON CONFLICT (gallery_id, client_id, selection_batch, photo_id)
             DO UPDATE SET status=EXCLUDED.status, delivery_mode=EXCLUDED.delivery_mode,
                           decided_by_user_id=EXCLUDED.decided_by_user_id, decided_at=NOW(), updated_at=NOW()',
            [$galleryId, $clientId, $effBatch, $photoId, $status, $deliveryMode, $userId]
        );

        return ['status' => 200, 'body' => [
            'success' => true,
            'approvals' => $this->listApprovalsByClientRound($galleryId, $clientId, $effBatch),
        ]];
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function approveAll(string $userId, int $galleryId, int $clientId, int $selectionBatch, array $body): array
    {
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão']];
        }
        if ($clientId < 1) {
            return ['status' => 400, 'body' => ['message' => 'IDs inválidos']];
        }
        $status = strtolower(trim((string) ($body['status'] ?? 'approved')));
        if (! in_array($status, ['pending', 'approved', 'rejected'], true)) {
            return ['status' => 400, 'body' => ['message' => 'status inválido (pending/approved/rejected).']];
        }
        if (! SchemaMeta::hasTable('king_selection_photo_approvals')) {
            return ['status' => 503, 'body' => ['message' => 'Tabela de aprovações indisponível. Execute a migration 208.']];
        }
        $batch = max(1, $selectionBatch);
        $deliveryMode = $this->normDeliveryMode($body['delivery_mode'] ?? null);
        $photoIds = $this->selectedPhotoIds($galleryId, $clientId, $batch);
        if ($photoIds === []) {
            return ['status' => 404, 'body' => ['message' => 'Nenhuma foto selecionada para este cliente/rodada.']];
        }
        foreach ($photoIds as $photoId) {
            DB::statement(
                'INSERT INTO king_selection_photo_approvals
                   (gallery_id, client_id, selection_batch, photo_id, status, delivery_mode, decided_by_user_id, decided_at, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
                 ON CONFLICT (gallery_id, client_id, selection_batch, photo_id)
                 DO UPDATE SET status=EXCLUDED.status, delivery_mode=EXCLUDED.delivery_mode,
                               decided_by_user_id=EXCLUDED.decided_by_user_id, decided_at=NOW(), updated_at=NOW()',
                [$galleryId, $clientId, $batch, $photoId, $status, $deliveryMode, $userId]
            );
        }

        return ['status' => 200, 'body' => [
            'success' => true,
            'updated' => count($photoIds),
            'approvals' => $this->listApprovalsByClientRound($galleryId, $clientId, $batch),
        ]];
    }

    /**
     * @return array{status:int, binary?:string, contentType?:string, message?:string}
     */
    public function paymentProofBinary(string $userId, int $galleryId, int $paymentId): array
    {
        if ($galleryId < 1 || $paymentId < 1) {
            return ['status' => 400, 'message' => 'IDs inválidos'];
        }
        if (! $this->ownedGallery($userId, $galleryId)) {
            return ['status' => 403, 'message' => 'Sem permissão'];
        }
        if (! SchemaMeta::hasTable('king_client_payment_requests')) {
            return ['status' => 404, 'message' => 'Comprovante não encontrado.'];
        }
        $row = DB::selectOne(
            'SELECT proof_file_path FROM king_client_payment_requests WHERE id = ? AND gallery_id = ? LIMIT 1',
            [$paymentId, $galleryId]
        );
        $stored = trim((string) ($row->proof_file_path ?? ''));
        $abs = $this->resolvePaymentProofPath($stored);
        if ($abs === null) {
            return ['status' => 404, 'message' => 'Comprovante não encontrado.'];
        }
        $bin = @file_get_contents($abs);
        if ($bin === false || $bin === '') {
            return ['status' => 404, 'message' => 'Comprovante não encontrado.'];
        }
        $ext = strtolower(pathinfo($abs, PATHINFO_EXTENSION));
        $ct = match ($ext) {
            'png' => 'image/png',
            'webp' => 'image/webp',
            default => 'image/jpeg',
        };

        return ['status' => 200, 'binary' => $bin, 'contentType' => $ct];
    }

    /**
     * Cliente envia comprovante PIX (multipart).
     *
     * @param  array<string,mixed>  $payload
     * @return array{status:int, body:array<string,mixed>}
     */
    public function submitClientPaymentProof(
        array $payload,
        string $slug,
        string $binary,
        string $mime,
        ?string $note,
        mixed $amountCentsRaw
    ): array {
        $slug = trim($slug);
        if ($slug === '') {
            return ['status' => 400, 'body' => ['message' => 'slug é obrigatório.']];
        }
        if ($slug !== (string) ($payload['slug'] ?? '')) {
            return ['status' => 403, 'body' => ['message' => 'Sem permissão.']];
        }
        if ($binary === '') {
            return ['status' => 400, 'body' => ['message' => 'Envie o comprovante.']];
        }
        if (! SchemaMeta::hasTable('king_client_payment_requests')) {
            return ['status' => 503, 'body' => ['message' => 'Sistema de pagamento indisponível. Execute a migration 208.']];
        }
        $galleryId = (int) ($payload['galleryId'] ?? 0);
        $g = DB::selectOne('SELECT id, access_mode FROM king_galleries WHERE id = ? LIMIT 1', [$galleryId]);
        if (! $g) {
            return ['status' => 404, 'body' => ['message' => 'Galeria não encontrada.']];
        }
        if (KsAccess::normAccessMode($g->access_mode ?? null) !== 'paid_event_photos') {
            return ['status' => 403, 'body' => ['message' => 'Comprovante disponível apenas na modalidade Fotos vendidas por evento.']];
        }
        $ctx = KsAccess::parseClientContext($payload);
        $clientId = (int) ($ctx['cid'] ?? 0);
        if ($clientId < 1) {
            return ['status' => 403, 'body' => ['message' => 'Entre com sua conta antes de enviar comprovante.']];
        }
        $round = $this->getSalesSelectionRound($galleryId, $clientId);
        $pricingPre = $this->computeSalesPricingForClientRound($galleryId, $clientId, $round);
        $expectedPre = max(0, (int) ($pricingPre['computed_total_cents'] ?? 0));
        $payPre = $this->getPaymentByClientRound($galleryId, $clientId, $round);
        $balanceDue = $expectedPre;
        if ($payPre && isset($payPre['balance_due_cents'])) {
            $balanceDue = max(0, (int) $payPre['balance_due_cents']);
        }
        $amountCents = $amountCentsRaw !== null && $amountCentsRaw !== ''
            ? max(0, (int) $amountCentsRaw)
            : null;
        if ($amountCents !== null && $amountCents > $balanceDue) {
            $brl = number_format($balanceDue / 100, 2, ',', '.');

            return ['status' => 400, 'body' => [
                'message' => "O valor informado ultrapassa o saldo em aberto (R$ {$brl}). Informe um valor menor ou deixe o campo em branco.",
            ]];
        }

        try {
            $filePath = $this->storePaymentProofImage($binary, $mime, $galleryId, $clientId, $round);
        } catch (\Throwable $e) {
            return ['status' => 500, 'body' => ['message' => 'Falha ao salvar comprovante.']];
        }
        $noteClean = $note !== null ? substr(trim($note), 0, 1000) : null;
        if ($noteClean === '') {
            $noteClean = null;
        }

        DB::statement(
            "INSERT INTO king_client_payment_requests
               (gallery_id, client_id, selection_batch, payment_method, status, amount_cents, proof_file_path, note_client, created_at, updated_at)
             VALUES (?, ?, ?, 'pix', 'pending', ?, ?, ?, NOW(), NOW())
             ON CONFLICT (gallery_id, client_id, selection_batch)
             DO UPDATE SET status='pending', amount_cents=COALESCE(EXCLUDED.amount_cents, king_client_payment_requests.amount_cents),
                           proof_file_path=EXCLUDED.proof_file_path, note_client=EXCLUDED.note_client,
                           note_admin=NULL, reviewed_by_user_id=NULL, reviewed_at=NULL, updated_at=NOW()",
            [$galleryId, $clientId, $round, $amountCents, $filePath, $noteClean]
        );

        return ['status' => 200, 'body' => [
            'success' => true,
            'payment' => $this->getPaymentByClientRound($galleryId, $clientId, $round),
            'message' => 'Comprovante enviado. Aguarde a validação do fotógrafo.',
        ]];
    }

    /**
     * @return array<string,mixed>
     */
    private function loadSalesConfig(int $galleryId): array
    {
        $cols = ['id'];
        foreach ([
            'pix_enabled', 'pix_key', 'pix_holder_name', 'pix_instructions',
            'sales_over_limit_policy', 'sales_price_mode', 'sales_unit_price_cents',
        ] as $c) {
            if (SchemaMeta::hasColumn('king_galleries', $c)) {
                $cols[] = $c;
            }
        }
        $row = DB::selectOne('SELECT '.implode(', ', $cols).' FROM king_galleries WHERE id = ? LIMIT 1', [$galleryId]);

        return [
            'pix_enabled' => SchemaMeta::hasColumn('king_galleries', 'pix_enabled') ? ! empty($row->pix_enabled) : false,
            'pix_key' => SchemaMeta::hasColumn('king_galleries', 'pix_key') ? ($row->pix_key ?? null) : null,
            'pix_holder_name' => SchemaMeta::hasColumn('king_galleries', 'pix_holder_name') ? ($row->pix_holder_name ?? null) : null,
            'pix_instructions' => SchemaMeta::hasColumn('king_galleries', 'pix_instructions') ? ($row->pix_instructions ?? null) : null,
            'sales_over_limit_policy' => SchemaMeta::hasColumn('king_galleries', 'sales_over_limit_policy')
                ? $this->normOverLimit($row->sales_over_limit_policy ?? null)
                : 'allow_and_warn',
            'sales_price_mode' => SchemaMeta::hasColumn('king_galleries', 'sales_price_mode')
                ? $this->normPriceMode($row->sales_price_mode ?? null)
                : 'best_price_auto',
            'sales_unit_price_cents' => SchemaMeta::hasColumn('king_galleries', 'sales_unit_price_cents')
                ? max(0, (int) ($row->sales_unit_price_cents ?? 0))
                : 0,
        ];
    }

    /**
     * @return list<array<string,mixed>>
     */
    private function listPackages(int $galleryId): array
    {
        if (! SchemaMeta::hasTable('king_gallery_sale_packages')) {
            return [];
        }
        $rows = DB::select(
            'SELECT id, name, photo_qty, price_cents, sort_order, active
             FROM king_gallery_sale_packages WHERE gallery_id = ?
             ORDER BY sort_order ASC, photo_qty ASC, id ASC',
            [$galleryId]
        );
        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                'id' => (int) $r->id,
                'name' => trim((string) ($r->name ?? '')) ?: 'Pacote',
                'photo_qty' => max(1, (int) ($r->photo_qty ?? 1)),
                'price_cents' => max(0, (int) ($r->price_cents ?? 0)),
                'sort_order' => (int) ($r->sort_order ?? 0),
                'active' => ($r->active ?? true) !== false,
            ];
        }

        return $out;
    }

    /**
     * @param  list<array<string,mixed>>  $packages
     */
    private function syncPackages(int $galleryId, array $packages): void
    {
        DB::delete('DELETE FROM king_gallery_sale_packages WHERE gallery_id = ?', [$galleryId]);
        $order = 0;
        foreach ($packages as $p) {
            if (! is_array($p)) {
                continue;
            }
            $qty = max(1, (int) ($p['photo_qty'] ?? 1));
            $price = max(0, (int) ($p['price_cents'] ?? 0));
            $name = substr(trim((string) ($p['name'] ?? 'Pacote')), 0, 120) ?: 'Pacote';
            $active = array_key_exists('active', $p) ? (bool) $p['active'] : true;
            DB::insert(
                'INSERT INTO king_gallery_sale_packages (gallery_id, name, photo_qty, price_cents, sort_order, active)
                 VALUES (?, ?, ?, ?, ?, ?)',
                [$galleryId, $name, $qty, $price, (int) ($p['sort_order'] ?? $order), $active]
            );
            $order++;
        }
    }

    private function ownedGallery(string $userId, int $galleryId): ?object
    {
        if ($galleryId < 1) {
            return null;
        }

        return DB::selectOne(
            'SELECT g.* FROM king_galleries g
             JOIN profile_items pi ON pi.id = g.profile_item_id
             WHERE g.id = ? AND pi.user_id = ? LIMIT 1',
            [$galleryId, $userId]
        );
    }

    private function normOverLimit(mixed $raw): string
    {
        $s = strtolower(trim((string) ($raw ?: 'allow_and_warn')));
        // Aceita aliases legados + nomes Node.
        if (in_array($s, ['block', 'block_selection'], true)) {
            return 'block_selection';
        }
        if (in_array($s, ['allow', 'allow_extra_per_photo'], true)) {
            return 'allow_extra_per_photo';
        }

        return in_array($s, ['allow_and_warn', 'block_selection', 'allow_extra_per_photo'], true)
            ? $s
            : 'allow_and_warn';
    }

    private function normPriceMode(mixed $raw): string
    {
        $s = strtolower(trim((string) ($raw ?: 'best_price_auto')));
        if ($s === 'unit') {
            $s = 'packages_plus_unit';
        }

        return in_array($s, ['packages_only', 'packages_plus_unit', 'best_price_auto'], true)
            ? $s
            : 'best_price_auto';
    }

    private function normPaymentStatus(mixed $raw): string
    {
        $s = strtolower(trim((string) ($raw ?: '')));
        if ($s === 'confirmed' || $s === 'paid') {
            return 'confirmed';
        }
        if ($s === 'partial') {
            return 'partial';
        }
        if ($s === 'rejected') {
            return 'rejected';
        }

        return 'pending';
    }

    private function normDeliveryMode(mixed $raw): string
    {
        return strtolower(trim((string) ($raw ?: ''))) === 'edited' ? 'edited' : 'original';
    }

    /**
     * @return list<int>
     */
    private function selectedPhotoIds(int $galleryId, int $clientId, int $selectionBatch): array
    {
        if (! SchemaMeta::hasTable('king_selections')) {
            return [];
        }
        $hasSelBatch = SchemaMeta::hasColumn('king_selections', 'selection_batch');
        $rows = DB::select(
            'SELECT photo_id FROM king_selections
             WHERE gallery_id = ? AND client_id = ?'.($hasSelBatch ? ' AND selection_batch = ?' : '').'
             ORDER BY photo_id ASC',
            $hasSelBatch ? [$galleryId, $clientId, $selectionBatch] : [$galleryId, $clientId]
        );
        $out = [];
        foreach ($rows as $r) {
            $id = (int) ($r->photo_id ?? 0);
            if ($id > 0) {
                $out[] = $id;
            }
        }

        return $out;
    }

    /**
     * @return list<array<string,mixed>>
     */
    private function listApprovalsByClientRound(int $galleryId, int $clientId, int $selectionBatch): array
    {
        if (! SchemaMeta::hasTable('king_selection_photo_approvals')) {
            return [];
        }
        $rows = DB::select(
            'SELECT a.id, a.photo_id, a.status, a.delivery_mode, a.decided_at, p.original_name, p."order"
             FROM king_selection_photo_approvals a
             JOIN king_photos p ON p.id = a.photo_id AND p.gallery_id = a.gallery_id
             WHERE a.gallery_id = ? AND a.client_id = ? AND a.selection_batch = ?
             ORDER BY p."order" ASC, p.id ASC',
            [$galleryId, $clientId, $selectionBatch]
        );
        $out = [];
        foreach ($rows as $r) {
            $out[] = [
                'id' => (int) ($r->id ?? 0),
                'photo_id' => (int) ($r->photo_id ?? 0),
                'status' => strtolower((string) ($r->status ?? 'pending')),
                'delivery_mode' => $this->normDeliveryMode($r->delivery_mode ?? null),
                'decided_at' => $r->decided_at ?? null,
                'original_name' => $r->original_name ?? null,
                'order' => (int) ($r->order ?? 0),
            ];
        }

        return $out;
    }

    private function effectiveExpectedTotalCents(int $computedPackageBaselineCents, ?object $row, bool $hasNegotiatedCol): int
    {
        $pkg = max(0, $computedPackageBaselineCents);
        if (! $hasNegotiatedCol || ! $row || $row->negotiated_total_cents === null) {
            return $pkg;
        }
        $n = (int) $row->negotiated_total_cents;

        return $n < 0 ? $pkg : $n;
    }

    /**
     * @return array<string,mixed>
     */
    private function computeSalesPricingForClientRound(int $galleryId, int $clientId, int $selectionBatch): array
    {
        $batch = max(1, $selectionBatch);
        $hasSelBatch = SchemaMeta::hasColumn('king_selections', 'selection_batch');
        $countRow = SchemaMeta::hasTable('king_selections')
            ? DB::selectOne(
                'SELECT COUNT(*)::int AS c FROM king_selections
                 WHERE gallery_id = ? AND client_id = ?'.($hasSelBatch ? ' AND selection_batch = ?' : ''),
                $hasSelBatch ? [$galleryId, $clientId, $batch] : [$galleryId, $clientId]
            )
            : null;
        $selectedCount = (int) ($countRow->c ?? 0);

        $gCols = ['id', 'access_mode'];
        foreach (['promo_enabled', 'promo_coupon_code', 'promo_valid_until', 'promo_free_photo_count'] as $c) {
            if (SchemaMeta::hasColumn('king_galleries', $c)) {
                $gCols[] = $c;
            }
        }
        $galleryRow = DB::selectOne('SELECT '.implode(', ', $gCols).' FROM king_galleries WHERE id = ? LIMIT 1', [$galleryId]);
        if (! $galleryRow) {
            return [
                'computed_total_cents' => 0,
                'computed_total_gross_cents' => 0,
                'selected_count' => $selectedCount,
                'billable_photo_count' => 0,
                'promo_applied' => false,
            ];
        }
        if (KsAccess::normAccessMode($galleryRow->access_mode ?? null) !== 'paid_event_photos') {
            return [
                'computed_total_cents' => 0,
                'computed_total_gross_cents' => 0,
                'selected_count' => $selectedCount,
                'billable_photo_count' => $selectedCount,
                'promo_applied' => false,
            ];
        }

        $salesConfig = $this->loadSalesConfig($galleryId);
        $salePackages = array_values(array_filter(
            $this->listPackages($galleryId),
            static fn ($p) => ($p['active'] ?? true) !== false
        ));

        $promoEligible = false;
        $freePromoN = 0;
        $hasPromoEnabled = SchemaMeta::hasColumn('king_galleries', 'promo_enabled');
        if ($hasPromoEnabled && ! empty($galleryRow->promo_enabled)) {
            $freePromoN = max(1, min(50, (int) ($galleryRow->promo_free_photo_count ?? 1)));
            $promoClientRow = null;
            if (SchemaMeta::hasColumn('king_gallery_clients', 'promo_coupon_validated_at')) {
                $promoClientRow = DB::selectOne(
                    'SELECT promo_social_confirmed_at, promo_coupon_validated_at, promo_coupon_entered
                     FROM king_gallery_clients WHERE id = ? AND gallery_id = ? LIMIT 1',
                    [$clientId, $galleryId]
                );
            }
            $promoEligible = $this->clientPromoEligibleForPricing($galleryRow, $promoClientRow);
        }
        $billable = $promoEligible
            ? max(0, $selectedCount - min($freePromoN, $selectedCount))
            : $selectedCount;
        $unit = (int) ($salesConfig['sales_unit_price_cents'] ?? 0);
        $mode = (string) ($salesConfig['sales_price_mode'] ?? 'best_price_auto');

        return [
            'computed_total_cents' => $this->computeBestPriceCents($billable, $salePackages, $unit, $mode),
            'computed_total_gross_cents' => $this->computeBestPriceCents($selectedCount, $salePackages, $unit, $mode),
            'selected_count' => $selectedCount,
            'billable_photo_count' => $billable,
            'promo_applied' => $promoEligible,
        ];
    }

    /**
     * Download permitido se houver linha approved OU a rodada da seleção estiver quitada.
     *
     * @return array{ok:bool, selection_batch:int, delivery_mode:string}
     */
    public function clientDownloadApprovedOrPaid(int $galleryId, int $clientId, int $photoId): array
    {
        $fail = ['ok' => false, 'selection_batch' => 1, 'delivery_mode' => 'original'];
        if (! SchemaMeta::hasTable('king_selection_photo_approvals') || $galleryId < 1 || $clientId < 1 || $photoId < 1) {
            return $fail;
        }
        $appr = DB::selectOne(
            "SELECT selection_batch, delivery_mode
             FROM king_selection_photo_approvals
             WHERE gallery_id = ? AND client_id = ? AND photo_id = ? AND lower(status) = 'approved'
             ORDER BY selection_batch DESC
             LIMIT 1",
            [$galleryId, $clientId, $photoId]
        );
        if ($appr) {
            return [
                'ok' => true,
                'selection_batch' => max(1, (int) ($appr->selection_batch ?? 1)),
                'delivery_mode' => $this->normDeliveryMode($appr->delivery_mode ?? null),
            ];
        }
        $hasSelBatch = SchemaMeta::hasColumn('king_selections', 'selection_batch');
        $sel = $hasSelBatch
            ? DB::selectOne(
                'SELECT selection_batch FROM king_selections WHERE gallery_id = ? AND client_id = ? AND photo_id = ? LIMIT 1',
                [$galleryId, $clientId, $photoId]
            )
            : DB::selectOne(
                'SELECT 1 AS selection_batch FROM king_selections WHERE gallery_id = ? AND client_id = ? AND photo_id = ? LIMIT 1',
                [$galleryId, $clientId, $photoId]
            );
        if (! $sel) {
            return $fail;
        }
        $batch = $hasSelBatch ? max(1, (int) ($sel->selection_batch ?? 1)) : 1;
        $pay = $this->getPaymentByClientRound($galleryId, $clientId, $batch);
        if (! $pay) {
            return ['ok' => false, 'selection_batch' => $batch, 'delivery_mode' => 'original'];
        }
        $bal = isset($pay['balance_due_cents']) ? max(0, (int) $pay['balance_due_cents']) : 0;
        if ($bal > 0) {
            return ['ok' => false, 'selection_batch' => $batch, 'delivery_mode' => 'original'];
        }

        return ['ok' => true, 'selection_batch' => $batch, 'delivery_mode' => 'original'];
    }

    public function isClientPromoEligible(object $galleryRow, ?object $clientRow): bool
    {
        return $this->clientPromoEligibleForPricing($galleryRow, $clientRow);
    }

    public function normalizeDeliveryMode(mixed $raw): string
    {
        return $this->normDeliveryMode($raw);
    }

    private function clientPromoEligibleForPricing(object $galleryRow, ?object $clientRow): bool
    {
        if (empty($galleryRow->promo_enabled)) {
            return false;
        }
        if (isset($galleryRow->promo_valid_until) && $galleryRow->promo_valid_until !== null) {
            $t = strtotime((string) $galleryRow->promo_valid_until);
            if ($t !== false && time() > $t) {
                return false;
            }
        }
        if (! $clientRow || empty($clientRow->promo_coupon_validated_at) || empty($clientRow->promo_social_confirmed_at)) {
            return false;
        }
        $want = $this->normPromoCouponCode($galleryRow->promo_coupon_code ?? null);
        $got = $this->normPromoCouponCode($clientRow->promo_coupon_entered ?? null);

        return $want !== '' && $want === $got;
    }

    private function normPromoCouponCode(mixed $s): string
    {
        $t = strtolower(trim((string) ($s ?? '')));
        if (class_exists(\Normalizer::class)) {
            $n = \Normalizer::normalize($t, \Normalizer::FORM_D);
            if (is_string($n) && $n !== '') {
                $t = $n;
            }
        }
        $t = preg_replace('/[\x{0300}-\x{036f}]/u', '', $t) ?? $t;

        return $t;
    }

    /**
     * @param  list<array<string,mixed>>  $packages
     */
    private function computeBestPriceCents(int $selectedCount, array $packages, int $unitPriceCents, string $priceMode): int
    {
        $n = max(0, $selectedCount);
        $mode = $this->normPriceMode($priceMode);
        $unit = max(0, $unitPriceCents);
        $packs = [];
        foreach ($packages as $p) {
            $qty = max(1, (int) ($p['photo_qty'] ?? 0));
            $price = max(0, (int) ($p['price_cents'] ?? 0));
            if ($qty > 0 && $price >= 0) {
                $packs[] = ['qty' => $qty, 'price' => $price];
            }
        }
        if ($n <= 0) {
            return 0;
        }
        if ($packs === []) {
            return $mode === 'packages_only' ? 0 : $n * $unit;
        }
        if ($mode === 'packages_only') {
            foreach ($packs as $p) {
                if ($p['qty'] === $n) {
                    return $p['price'];
                }
            }

            return 0;
        }
        if ($mode === 'packages_plus_unit') {
            if ($unit === 0) {
                return $this->estimatePriceByPackageInterpolationCents($n, $packs);
            }
            $best = $n * $unit;
            foreach ($packs as $p) {
                if ($p['qty'] === $n) {
                    $best = min($best, $p['price']);
                }
                if ($p['qty'] < $n) {
                    $best = min($best, $p['price'] + (($n - $p['qty']) * $unit));
                }
            }

            return $best;
        }
        $maxQty = 0;
        foreach ($packs as $p) {
            $maxQty = max($maxQty, $p['qty']);
        }
        $cap = max($n, $n + $maxQty);
        $INF = PHP_INT_MAX / 4;
        $dp = array_fill(0, $cap + 1, $INF);
        $dp[0] = 0;
        for ($i = 0; $i <= $cap; $i++) {
            if ($dp[$i] === $INF) {
                continue;
            }
            if ($unit > 0 && $i + 1 <= $cap) {
                $dp[$i + 1] = min($dp[$i + 1], $dp[$i] + $unit);
            }
            foreach ($packs as $p) {
                if ($i + $p['qty'] <= $cap) {
                    $dp[$i + $p['qty']] = min($dp[$i + $p['qty']], $dp[$i] + $p['price']);
                }
            }
        }
        $out = $dp[$n];
        for ($i = $n + 1; $i <= $cap; $i++) {
            $out = min($out, $dp[$i]);
        }
        if ($out >= $INF) {
            $out = $n * $unit;
        }

        return (int) $out;
    }

    /**
     * @param  list<array{qty:int,price:int}>  $packs
     */
    private function estimatePriceByPackageInterpolationCents(int $selectedCount, array $packs): int
    {
        $qty = max(0, $selectedCount);
        if ($qty <= 0) {
            return 0;
        }
        $sorted = array_values(array_filter($packs, static fn ($p) => $p['price'] > 0));
        usort($sorted, static fn ($a, $b) => $a['qty'] <=> $b['qty']);
        if ($sorted === []) {
            return 0;
        }
        foreach ($sorted as $p) {
            if ($p['qty'] === $qty) {
                return $p['price'];
            }
        }
        if ($qty < $sorted[0]['qty']) {
            $first = $sorted[0];

            return (int) round(($first['price'] / $first['qty']) * $qty);
        }
        for ($i = 0; $i < count($sorted) - 1; $i++) {
            $a = $sorted[$i];
            $b = $sorted[$i + 1];
            if ($qty > $a['qty'] && $qty < $b['qty']) {
                $t = ($qty - $a['qty']) / max(1, ($b['qty'] - $a['qty']));

                return (int) round($a['price'] + $t * ($b['price'] - $a['price']));
            }
        }
        $last = $sorted[count($sorted) - 1];
        $lastPer = $last['price'] / $last['qty'];

        return (int) round($last['price'] + ($qty - $last['qty']) * $lastPer);
    }

    /**
     * @return array<string,mixed>|null
     */
    private function getPaymentByClientRound(int $galleryId, int $clientId, int $selectionBatch): ?array
    {
        if (! SchemaMeta::hasTable('king_client_payment_requests')) {
            return null;
        }
        $hasCum = SchemaMeta::hasColumn('king_client_payment_requests', 'amount_received_cumulative_cents');
        $hasCourtesy = SchemaMeta::hasColumn('king_client_payment_requests', 'courtesy_cents');
        $hasNeg = SchemaMeta::hasColumn('king_client_payment_requests', 'negotiated_total_cents');
        $hasDown = SchemaMeta::hasColumn('king_client_payment_requests', 'down_payment_cents');
        $hasInst = SchemaMeta::hasColumn('king_client_payment_requests', 'installment_count');
        $hasRemBal = SchemaMeta::hasColumn('king_client_payment_requests', 'remaining_balance_cents');
        $hasIntDays = SchemaMeta::hasColumn('king_client_payment_requests', 'installment_interval_days');
        $extraCols = array_values(array_filter([
            $hasCum ? 'amount_received_cumulative_cents' : null,
            $hasCourtesy ? 'courtesy_cents' : null,
            $hasNeg ? 'negotiated_total_cents' : null,
            $hasDown ? 'down_payment_cents' : null,
            $hasInst ? 'installment_count' : null,
            $hasRemBal ? 'remaining_balance_cents' : null,
            $hasIntDays ? 'installment_interval_days' : null,
        ]));
        $row = DB::selectOne(
            'SELECT id, status, payment_method, amount_cents, proof_file_path, note_client, note_admin, reviewed_at, created_at'
            .($extraCols !== [] ? ', '.implode(', ', $extraCols) : '').'
             FROM king_client_payment_requests
             WHERE gallery_id = ? AND client_id = ? AND selection_batch = ?
             LIMIT 1',
            [$galleryId, $clientId, $selectionBatch]
        );
        if (! $row) {
            return null;
        }
        $pricing = $this->computeSalesPricingForClientRound($galleryId, $clientId, $selectionBatch);
        $computedPackage = max(0, (int) ($pricing['computed_total_cents'] ?? 0));
        $computedPackageGross = max(0, (int) ($pricing['computed_total_gross_cents'] ?? 0));
        $expected = $this->effectiveExpectedTotalCents($computedPackageGross, $row, $hasNeg);
        $cumulative = $hasCum ? max(0, (int) ($row->amount_received_cumulative_cents ?? 0)) : 0;
        $courtesy = $hasCourtesy ? max(0, (int) ($row->courtesy_cents ?? 0)) : 0;
        $st = $this->normPaymentStatus($row->status ?? null);
        if ($hasCum && $cumulative === 0 && $st === 'confirmed') {
            $legacy = $row->amount_cents !== null ? max(0, (int) $row->amount_cents) : 0;
            if ($legacy > 0 && $courtesy === 0) {
                $cumulative = $legacy;
            }
        }
        $balanceDue = max(0, $expected - $cumulative - $courtesy);
        $noteLow = strtolower((string) ($row->note_admin ?? ''));
        $blessedGuess =
            $st === 'confirmed'
            && $cumulative === 0
            && $courtesy === 0
            && ($row->amount_cents === null || (int) $row->amount_cents === 0)
            && (str_contains($noteLow, 'aben') || str_contains($noteLow, 'cortesia'));
        if ($blessedGuess) {
            $balanceDue = 0;
        }
        $remainderPerInstallmentCents = null;
        if ($hasRemBal && $row->remaining_balance_cents !== null && $hasInst && $row->installment_count !== null) {
            $rem = max(0, (int) $row->remaining_balance_cents);
            $ni = max(1, (int) $row->installment_count);
            $remainderPerInstallmentCents = $ni > 0 ? (int) round($rem / $ni) : $rem;
        }

        return [
            'id' => (int) ($row->id ?? 0),
            'status' => $st,
            'payment_method' => (string) ($row->payment_method ?: 'pix'),
            'amount_cents' => $row->amount_cents !== null ? max(0, (int) $row->amount_cents) : null,
            'proof_file_path' => $row->proof_file_path ?? null,
            'note_client' => $row->note_client ?? null,
            'note_admin' => $row->note_admin ?? null,
            'reviewed_at' => $row->reviewed_at ?? null,
            'created_at' => $row->created_at ?? null,
            'computed_package_total_cents' => $computedPackage,
            'computed_package_gross_cents' => $computedPackageGross,
            'pricing_promo_applied' => ! empty($pricing['promo_applied']),
            'pricing_selected_count' => (int) ($pricing['selected_count'] ?? 0),
            'negotiated_total_cents' => $hasNeg && $row->negotiated_total_cents !== null
                ? max(0, (int) $row->negotiated_total_cents) : null,
            'down_payment_cents' => $hasDown && $row->down_payment_cents !== null
                ? max(0, (int) $row->down_payment_cents) : null,
            'installment_count' => $hasInst && $row->installment_count !== null
                ? max(1, (int) $row->installment_count) : null,
            'remaining_balance_cents' => $hasRemBal && $row->remaining_balance_cents !== null
                ? max(0, (int) $row->remaining_balance_cents) : null,
            'installment_interval_days' => $hasIntDays && $row->installment_interval_days !== null
                ? max(1, (int) $row->installment_interval_days) : null,
            'remainder_per_installment_cents' => $remainderPerInstallmentCents,
            'expected_total_cents' => $expected,
            'amount_received_cumulative_cents' => $cumulative,
            'courtesy_cents' => $courtesy,
            'balance_due_cents' => $balanceDue,
        ];
    }

    private function maybeAutoApproveAfterPaymentReview(int $galleryId, int $clientId, int $selectionBatch, string $userId): void
    {
        try {
            if (! SchemaMeta::hasTable('king_selection_photo_approvals')) {
                return;
            }
            $pay = $this->getPaymentByClientRound($galleryId, $clientId, $selectionBatch);
            if (! $pay) {
                return;
            }
            $bal = max(0, (int) ($pay['balance_due_cents'] ?? 0));
            if ($bal > 0) {
                return;
            }
            $deliveryMode = $this->normDeliveryMode('original');
            foreach ($this->selectedPhotoIds($galleryId, $clientId, $selectionBatch) as $photoId) {
                DB::statement(
                    'INSERT INTO king_selection_photo_approvals
                       (gallery_id, client_id, selection_batch, photo_id, status, delivery_mode, decided_by_user_id, decided_at, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
                     ON CONFLICT (gallery_id, client_id, selection_batch, photo_id)
                     DO UPDATE SET status=EXCLUDED.status, delivery_mode=EXCLUDED.delivery_mode,
                                   decided_by_user_id=EXCLUDED.decided_by_user_id, decided_at=NOW(), updated_at=NOW()',
                    [$galleryId, $clientId, $selectionBatch, $photoId, 'approved', $deliveryMode, $userId]
                );
            }
        } catch (\Throwable $e) {
            report($e);
        }
    }

    private function getSalesSelectionRound(int $galleryId, int $clientId): int
    {
        if ($clientId < 1 || ! SchemaMeta::hasTable('king_selections')) {
            return 1;
        }
        if (SchemaMeta::hasColumn('king_selections', 'selection_batch')) {
            $r = DB::selectOne(
                'SELECT COALESCE(MAX(selection_batch), 0)::int AS m FROM king_selections WHERE gallery_id = ? AND client_id = ?',
                [$galleryId, $clientId]
            );
            $max = (int) ($r->m ?? 0);
            if ($max > 0) {
                return $max;
            }
        } else {
            $r = DB::selectOne(
                'SELECT COUNT(*)::int AS c FROM king_selections WHERE gallery_id = ? AND client_id = ?',
                [$galleryId, $clientId]
            );
            if ((int) ($r->c ?? 0) > 0) {
                return 1;
            }
        }

        return 1;
    }

    private function uploadsBasePath(): string
    {
        $base = trim((string) (env('KS_UPLOADS_PATH') ?: ''));
        if ($base !== '') {
            return rtrim($base, '/\\');
        }
        // fallback: volume da API montado no host / pasta local do monorepo
        foreach (['/shared/uploads', '/app/uploads', base_path('../uploads')] as $c) {
            if (is_dir($c) || is_dir(dirname($c))) {
                return rtrim($c, '/\\');
            }
        }

        return rtrim(base_path('../uploads'), '/\\');
    }

    private function resolvePaymentProofPath(string $stored): ?string
    {
        $stored = trim($stored);
        if ($stored === '') {
            return null;
        }
        if (is_file($stored)) {
            return $stored;
        }
        $base = $this->uploadsBasePath();
        if (str_starts_with($stored, '/app/uploads/')) {
            $mapped = $base.substr($stored, strlen('/app/uploads'));
            if (is_file($mapped)) {
                return $mapped;
            }
        }
        $name = basename($stored);
        $alt = $base.'/kingselection-payment-proofs/'.$name;
        if (is_file($alt)) {
            return $alt;
        }

        return null;
    }

    private function storePaymentProofImage(string $binary, string $mime, int $galleryId, int $clientId, int $round): string
    {
        $base = $this->uploadsBasePath();
        $dir = $base.'/kingselection-payment-proofs';
        if (! is_dir($dir) && ! @mkdir($dir, 0775, true) && ! is_dir($dir)) {
            throw new \RuntimeException('Não foi possível criar pasta de comprovantes.');
        }
        $img = @imagecreatefromstring($binary);
        if ($img === false) {
            throw new \RuntimeException('Imagem de comprovante inválida.');
        }
        $outName = sprintf('g%d_c%d_r%d_%d.jpg', $galleryId, $clientId, $round, (int) (microtime(true) * 1000));
        $abs = $dir.'/'.$outName;
        ob_start();
        imagejpeg($img, null, 88);
        $jpeg = (string) ob_get_clean();
        imagedestroy($img);
        if ($jpeg === '' || @file_put_contents($abs, $jpeg) === false) {
            throw new \RuntimeException('Falha ao gravar comprovante.');
        }
        // Caminho compatível com o container Node (/app/uploads/...)
        return '/app/uploads/kingselection-payment-proofs/'.$outName;
    }
}
