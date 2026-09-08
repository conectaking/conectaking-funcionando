<?php

namespace App\Services\Finance;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Finance boot APIs (profiles, dashboard, cards, transactions list, king-data).
 */
class FinanceService
{
    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function profiles(string $userId): array
    {
        $rows = DB::select(
            'SELECT * FROM finance_profiles WHERE user_id = ? AND is_active = TRUE ORDER BY is_primary DESC, name ASC',
            [$userId]
        );

        return ['status' => 200, 'body' => ['success' => true, 'data' => $rows, 'error' => null, 'message' => null]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function primaryProfile(string $userId): array
    {
        $row = DB::selectOne(
            'SELECT * FROM finance_profiles WHERE user_id = ? AND is_primary = TRUE AND is_active = TRUE LIMIT 1',
            [$userId]
        );

        return ['status' => 200, 'body' => ['success' => true, 'data' => $row, 'error' => null, 'message' => null]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function cards(string $userId): array
    {
        $rows = DB::select(
            'SELECT * FROM finance_cards WHERE user_id = ? AND is_active = true ORDER BY name ASC',
            [$userId]
        );

        return ['status' => 200, 'body' => ['success' => true, 'data' => $rows, 'error' => null, 'message' => null]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function transactions(string $userId, array $query): array
    {
        $limit = min(500, max(1, (int) ($query['limit'] ?? 200)));
        $sql = 'SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon, a.name as account_name
                FROM finance_transactions t
                LEFT JOIN finance_categories c ON t.category_id = c.id
                LEFT JOIN finance_accounts a ON t.account_id = a.id
                WHERE t.user_id = ?';
        $params = [$userId];
        if (! empty($query['profile_id'])) {
            $sql .= ' AND t.profile_id = ?';
            $params[] = (int) $query['profile_id'];
        }
        if (! empty($query['dateFrom'])) {
            $sql .= ' AND t.transaction_date >= ?::date';
            $params[] = $query['dateFrom'];
        }
        if (! empty($query['dateTo'])) {
            $sql .= ' AND t.transaction_date <= ?::date';
            $params[] = $query['dateTo'];
        }
        $orderBy = in_array($query['orderBy'] ?? '', ['transaction_date', 'amount', 'created_at'], true)
            ? $query['orderBy']
            : 'transaction_date';
        $orderDir = strtoupper((string) ($query['orderDir'] ?? 'DESC')) === 'ASC' ? 'ASC' : 'DESC';
        $sql .= " ORDER BY t.{$orderBy} {$orderDir}, t.id DESC LIMIT ?";
        $params[] = $limit;
        $rows = DB::select($sql, $params);

        return ['status' => 200, 'body' => [
            'success' => true,
            'data' => ['data' => $rows, 'total' => count($rows)],
            'error' => null,
            'message' => null,
        ]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function kingData(string $userId, ?int $profileId): array
    {
        if (! Schema::hasTable('finance_king_sync')) {
            return ['status' => 200, 'body' => [
                'success' => true,
                'data' => ['dividas' => [], 'terceiros' => [], 'trabalhos' => [], 'bens' => []],
                'error' => null,
                'message' => null,
            ]];
        }
        $pid = $profileId !== null ? (string) $profileId : '';
        $row = DB::selectOne(
            'SELECT data FROM finance_king_sync WHERE user_id = ? AND profile_id = ? LIMIT 1',
            [$userId, $pid]
        );
        $data = ['dividas' => [], 'terceiros' => [], 'trabalhos' => [], 'bens' => []];
        if ($row && ! empty($row->data)) {
            $decoded = is_string($row->data) ? json_decode($row->data, true) : (array) $row->data;
            if (is_array($decoded)) {
                $data = array_merge($data, $decoded);
            }
        }

        return ['status' => 200, 'body' => ['success' => true, 'data' => $data, 'error' => null, 'message' => null]];
    }

    /**
     * @param  array<string,mixed>  $payload
     * @return array{status:int, body:array<string,mixed>}
     */
    public function saveKingData(string $userId, array $payload): array
    {
        if (! Schema::hasTable('finance_king_sync')) {
            return ['status' => 503, 'body' => ['success' => false, 'message' => 'Tabela finance_king_sync indisponível.']];
        }
        $profileId = isset($payload['profile_id']) && $payload['profile_id'] !== '' && $payload['profile_id'] !== null
            ? (string) (int) $payload['profile_id']
            : '';
        $data = $payload['data'] ?? $payload;
        if (! is_array($data)) {
            $data = [];
        }
        $json = json_encode($data, JSON_UNESCAPED_UNICODE);
        try {
            DB::statement(
                'INSERT INTO finance_king_sync (user_id, profile_id, data, updated_at)
                 VALUES (?, ?, ?::jsonb, NOW())
                 ON CONFLICT (user_id, profile_id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()',
                [$userId, $profileId, $json]
            );
        } catch (\Throwable $e) {
            Log::warning('finance.kingData.save', ['error' => $e->getMessage()]);
            $n = DB::update(
                'UPDATE finance_king_sync SET data = ?::jsonb, updated_at = NOW() WHERE user_id = ? AND profile_id = ?',
                [$json, $userId, $profileId]
            );
            if ($n < 1) {
                DB::table('finance_king_sync')->insert([
                    'user_id' => $userId,
                    'profile_id' => $profileId,
                    'data' => $json,
                    'updated_at' => now(),
                ]);
            }
        }

        return ['status' => 200, 'body' => ['success' => true, 'data' => $data, 'error' => null, 'message' => 'OK']];
    }

    /**
     * Dashboard stats (núcleo; sem recibos/documentos extras).
     *
     * @return array{status:int, body:array<string,mixed>}
     */
    public function dashboard(string $userId, ?string $dateFrom, ?string $dateTo, ?int $profileId): array
    {
        $now = now();
        $dateFrom = $dateFrom ?: $now->format('Y-m-01');
        $dateTo = $dateTo ?: $now->format('Y-m-t');

        if ($profileId !== null) {
            $ok = DB::selectOne(
                'SELECT id FROM finance_profiles WHERE id = ? AND user_id = ? AND is_active = TRUE',
                [$profileId, $userId]
            );
            if (! $ok) {
                $profileId = -1;
            }
        }

        $profileFilter = $profileId !== null
            ? 'AND t.profile_id = ?'
            : 'AND (t.profile_id IS NULL OR t.profile_id IN (SELECT id FROM finance_profiles WHERE user_id = ? AND is_primary = TRUE))';

        $sum = function (string $type, string $status) use ($userId, $dateFrom, $dateTo, $profileId, $profileFilter): float {
            $params = $profileId !== null
                ? [$userId, $dateFrom, $dateTo, $profileId]
                : [$userId, $dateFrom, $dateTo, $userId];
            $row = DB::selectOne(
                "SELECT COALESCE(SUM(t.amount), 0) as total FROM finance_transactions t
                 WHERE t.user_id = ? AND t.type = '{$type}' AND t.status = '{$status}'
                 AND t.transaction_date BETWEEN ?::date AND ?::date {$profileFilter}",
                $params
            );

            return (float) ($row->total ?? 0);
        };

        $incomePaid = $sum('INCOME', 'PAID');
        $incomePending = $sum('INCOME', 'PENDING');
        $expensePaid = $sum('EXPENSE', 'PAID');
        $expensePending = $sum('EXPENSE', 'PENDING');

        $accParams = $profileId !== null ? [$userId, $profileId] : [$userId, $userId];
        $accFilter = $profileId !== null
            ? 'AND t.profile_id = ?'
            : 'AND (t.profile_id IS NULL OR t.profile_id IN (SELECT id FROM finance_profiles WHERE user_id = ? AND is_primary = TRUE))';
        $acc = DB::selectOne(
            "SELECT
                COALESCE(SUM(CASE WHEN t.type = 'INCOME' AND t.status = 'PAID' THEN t.amount ELSE 0 END), 0) as total_income,
                COALESCE(SUM(CASE WHEN t.type = 'EXPENSE' AND t.status = 'PAID' THEN t.amount ELSE 0 END), 0) as total_expense
             FROM finance_transactions t
             WHERE t.user_id = ? AND t.status = 'PAID' {$accFilter}",
            $accParams
        );
        $accIncome = (float) ($acc->total_income ?? 0);
        $accExpense = (float) ($acc->total_expense ?? 0);
        $saldo = $accIncome - $accExpense;

        $topParams = $profileId !== null
            ? [$userId, $dateFrom, $dateTo, $profileId]
            : [$userId, $dateFrom, $dateTo, $userId];
        $top = DB::select(
            "SELECT c.name, c.color, SUM(t.amount) as total
             FROM finance_transactions t
             JOIN finance_categories c ON t.category_id = c.id
             WHERE t.user_id = ? AND t.type = 'EXPENSE' AND t.status = 'PAID'
             AND t.transaction_date BETWEEN ?::date AND ?::date {$profileFilter}
             GROUP BY c.id, c.name, c.color ORDER BY total DESC LIMIT 5",
            $topParams
        );

        $totalIncome = $incomePaid + $incomePending;
        $totalExpense = $expensePaid + $expensePending;

        $stats = [
            'totalIncome' => $totalIncome,
            'totalExpense' => $totalExpense,
            'totalIncomePaid' => $incomePaid,
            'totalExpensePaid' => $expensePaid,
            'totalRecebido' => $incomePaid,
            'totalPago' => $expensePaid,
            'pendingExpense' => $expensePending,
            'pendingExpensePreviousMonths' => 0,
            'pendingIncome' => $incomePending,
            'pendenciasReceber' => $incomePending,
            'pendenciasPagar' => $expensePending,
            'accountBalance' => $saldo,
            'saldoDisponivel' => $saldo,
            'monthlyBalance' => $totalIncome - $totalExpense,
            'netProfit' => $incomePaid - $expensePaid,
            'balanceVariation' => 0,
            'topCategories' => $top,
            'totalTransactions' => 0,
            'receitasCount' => 0,
            'despesasCount' => 0,
            'evolucaoMensal' => [],
            'mediaMensal12' => ['mediaReceitas' => 0, 'mediaDespesas' => 0],
            'budgets' => [],
            'receitasDetalhadas' => [],
            'saldoDetalhado' => [],
        ];

        return ['status' => 200, 'body' => ['success' => true, 'data' => $stats, 'error' => null, 'message' => null]];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function transactionById(string $userId, int $id): array
    {
        if ($id < 1) {
            return $this->fail('ID inválido.', 400);
        }
        $row = DB::selectOne('SELECT * FROM finance_transactions WHERE id = ? AND user_id = ? LIMIT 1', [$id, $userId]);
        if (! $row) {
            return $this->fail('Transação não encontrada', 404);
        }

        return $this->ok($row);
    }

    /**
     * @param  array<string,mixed>  $data
     * @return array{status:int, body:array<string,mixed>}
     */
    public function createTransaction(string $userId, array $data): array
    {
        $err = $this->validateTransaction($data, false);
        if ($err !== null) {
            return $this->fail($err, 400);
        }
        try {
            $tx = null;
            DB::transaction(function () use ($userId, $data, &$tx) {
                $tx = $this->insertTransaction($userId, $data);
                $times = (int) ($data['recurring_times'] ?? 0);
                if (! empty($data['is_recurring']) && $times > 1) {
                    $base = new \DateTimeImmutable((string) $data['transaction_date']);
                    for ($i = 1; $i < $times; $i++) {
                        $next = $this->addMonthsKeepDay($base, $i);
                        $copy = $data;
                        $copy['transaction_date'] = $next->format('Y-m-d');
                        $copy['is_recurring'] = false;
                        $copy['recurring_times'] = null;
                        $this->insertTransaction($userId, $copy);
                    }
                }
            });
        } catch (\Throwable $e) {
            Log::error('finance.tx.create', ['error' => $e->getMessage()]);

            return $this->fail($e->getMessage() ?: 'Erro ao criar transação', 400);
        }
        if ($tx && ! empty($tx->account_id)) {
            $this->recalcAccountBalance((int) $tx->account_id, $userId);
        }

        return $this->ok($tx, 'Transação criada com sucesso', 201);
    }

    /**
     * @param  array<string,mixed>  $data
     * @return array{status:int, body:array<string,mixed>}
     */
    public function updateTransaction(string $userId, int $id, array $data): array
    {
        $existing = DB::selectOne('SELECT * FROM finance_transactions WHERE id = ? AND user_id = ? LIMIT 1', [$id, $userId]);
        if (! $existing) {
            return $this->fail('Transação não encontrada', 404);
        }
        $err = $this->validateTransaction($data, true);
        if ($err !== null) {
            return $this->fail($err, 400);
        }
        $allowed = [
            'type', 'amount', 'description', 'transaction_date', 'category_id', 'account_id', 'card_id',
            'status', 'installment_group_id', 'installment_number', 'recurrence_type', 'recurrence_end_date',
            'attachment_url', 'project_name', 'cost_center', 'client_name', 'notes',
            'is_recurring', 'recurring_times', 'profile_id',
        ];
        $sets = [];
        $params = [];
        foreach ($allowed as $key) {
            if (! array_key_exists($key, $data)) {
                continue;
            }
            $val = $data[$key];
            if ($key === 'amount' && $val !== null) {
                $val = (float) $val;
            }
            if ($key === 'is_recurring') {
                $val = filter_var($val, FILTER_VALIDATE_BOOLEAN);
            }
            $sets[] = "{$key} = ?";
            $params[] = $val;
        }
        if ($sets === []) {
            return $this->ok($existing);
        }
        $sets[] = 'updated_at = NOW()';
        $params[] = $id;
        $params[] = $userId;
        try {
            DB::transaction(function () use ($sets, $params, $data, $existing, $userId) {
                DB::update(
                    'UPDATE finance_transactions SET '.implode(', ', $sets).' WHERE id = ? AND user_id = ?',
                    $params
                );
                $times = (int) ($data['recurring_times'] ?? 0);
                if (! empty($data['is_recurring']) && $times > 1) {
                    $baseDate = (string) ($data['transaction_date'] ?? $existing->transaction_date);
                    $base = new \DateTimeImmutable($baseDate);
                    $desc = (string) ($data['description'] ?? $existing->description ?? '');
                    $type = (string) ($data['type'] ?? $existing->type);
                    for ($i = 1; $i < $times; $i++) {
                        $next = $this->addMonthsKeepDay($base, $i);
                        $day = $next->format('Y-m-d');
                        $dup = DB::selectOne(
                            'SELECT id FROM finance_transactions
                             WHERE user_id = ? AND description = ? AND type = ? AND transaction_date = ?::date LIMIT 1',
                            [$userId, $desc, $type, $day]
                        );
                        if ($dup) {
                            continue;
                        }
                        $copy = array_merge((array) $existing, $data);
                        $copy['transaction_date'] = $day;
                        $copy['is_recurring'] = false;
                        $copy['recurring_times'] = null;
                        $this->insertTransaction($userId, $copy);
                    }
                }
            });
        } catch (\Throwable $e) {
            Log::error('finance.tx.update', ['error' => $e->getMessage()]);

            return $this->fail($e->getMessage() ?: 'Erro ao atualizar', 400);
        }
        $updated = DB::selectOne('SELECT * FROM finance_transactions WHERE id = ? AND user_id = ? LIMIT 1', [$id, $userId]);
        if ($updated && ! empty($updated->account_id)) {
            $this->recalcAccountBalance((int) $updated->account_id, $userId);
        }

        return $this->ok($updated, 'Transação atualizada com sucesso');
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function deleteTransaction(string $userId, int $id): array
    {
        $existing = DB::selectOne('SELECT * FROM finance_transactions WHERE id = ? AND user_id = ? LIMIT 1', [$id, $userId]);
        if (! $existing) {
            return $this->fail('Transação não encontrada', 404);
        }
        DB::delete('DELETE FROM finance_transactions WHERE id = ? AND user_id = ?', [$id, $userId]);
        $accounts = DB::select('SELECT id FROM finance_accounts WHERE user_id = ? AND is_active = true', [$userId]);
        foreach ($accounts as $a) {
            $this->recalcAccountBalance((int) $a->id, $userId);
        }

        return $this->ok(null, 'Transação deletada com sucesso');
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function categories(string $userId, ?string $type = null): array
    {
        $sql = 'SELECT * FROM finance_categories WHERE user_id = ? AND is_active = true';
        $params = [$userId];
        if ($type) {
            $sql .= ' AND type = ?';
            $params[] = $type;
        }
        $sql .= ' ORDER BY name ASC';

        return $this->ok(DB::select($sql, $params));
    }

    /**
     * @param  array<string,mixed>  $data
     * @return array{status:int, body:array<string,mixed>}
     */
    public function createCategory(string $userId, array $data): array
    {
        $name = trim((string) ($data['name'] ?? ''));
        $type = strtoupper(trim((string) ($data['type'] ?? '')));
        if ($name === '' || ! in_array($type, ['INCOME', 'EXPENSE'], true)) {
            return $this->fail('name e type (INCOME|EXPENSE) são obrigatórios', 400);
        }
        $row = DB::selectOne(
            'INSERT INTO finance_categories (user_id, name, type, icon, color)
             VALUES (?, ?, ?, ?, ?) RETURNING *',
            [$userId, $name, $type, $data['icon'] ?? null, $data['color'] ?? null]
        );

        return $this->ok($row, 'Categoria criada', 201);
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function accounts(string $userId): array
    {
        return $this->ok(DB::select(
            'SELECT * FROM finance_accounts WHERE user_id = ? AND is_active = true ORDER BY name ASC',
            [$userId]
        ));
    }

    /**
     * @param  array<string,mixed>  $data
     * @return array{status:int, body:array<string,mixed>}
     */
    public function createAccount(string $userId, array $data): array
    {
        $name = trim((string) ($data['name'] ?? ''));
        $type = strtoupper(trim((string) ($data['type'] ?? 'BANK')));
        if ($name === '') {
            return $this->fail('name é obrigatório', 400);
        }
        if (! in_array($type, ['BANK', 'CASH', 'PIX', 'WALLET'], true)) {
            $type = 'BANK';
        }
        $initial = (float) ($data['initial_balance'] ?? 0);
        $row = DB::selectOne(
            'INSERT INTO finance_accounts (user_id, name, type, initial_balance, current_balance)
             VALUES (?, ?, ?, ?, ?) RETURNING *',
            [$userId, $name, $type, $initial, (float) ($data['current_balance'] ?? $initial)]
        );

        return $this->ok($row, 'Conta criada', 201);
    }

    /**
     * @param  array<string,mixed>  $data
     * @return array{status:int, body:array<string,mixed>}
     */
    public function createCard(string $userId, array $data): array
    {
        $name = trim((string) ($data['name'] ?? ''));
        if ($name === '') {
            return $this->fail('name é obrigatório', 400);
        }
        $limit = isset($data['limit_amount']) ? (float) $data['limit_amount'] : null;
        $row = DB::selectOne(
            'INSERT INTO finance_cards (user_id, name, brand, limit_amount, closing_day, due_day)
             VALUES (?, ?, ?, ?, ?, ?) RETURNING *',
            [
                $userId,
                $name,
                $data['brand'] ?? null,
                $limit,
                isset($data['closing_day']) ? (int) $data['closing_day'] : null,
                isset($data['due_day']) ? (int) $data['due_day'] : null,
            ]
        );

        return $this->ok($row, 'Cartão criado', 201);
    }

    /**
     * @param  array<string,mixed>  $data
     * @return array{status:int, body:array<string,mixed>}
     */
    public function updateCard(string $userId, int $id, array $data): array
    {
        $existing = DB::selectOne(
            'SELECT * FROM finance_cards WHERE id = ? AND user_id = ? AND is_active = true LIMIT 1',
            [$id, $userId]
        );
        if (! $existing) {
            return $this->fail('Cartão não encontrado', 404);
        }
        $map = [
            'name' => $data['name'] ?? null,
            'brand' => array_key_exists('brand', $data) ? $data['brand'] : null,
            'limit_amount' => array_key_exists('limit_amount', $data) ? (float) $data['limit_amount'] : null,
            'closing_day' => array_key_exists('closing_day', $data) ? (int) $data['closing_day'] : null,
            'due_day' => array_key_exists('due_day', $data) ? (int) $data['due_day'] : null,
        ];
        $sets = [];
        $params = [];
        foreach ($map as $k => $v) {
            if (! array_key_exists($k, $data)) {
                continue;
            }
            $sets[] = "{$k} = ?";
            $params[] = $v;
        }
        if ($sets === []) {
            return $this->ok($existing);
        }
        $sets[] = 'updated_at = NOW()';
        $params[] = $id;
        $params[] = $userId;
        DB::update('UPDATE finance_cards SET '.implode(', ', $sets).' WHERE id = ? AND user_id = ?', $params);
        $row = DB::selectOne('SELECT * FROM finance_cards WHERE id = ? AND user_id = ? LIMIT 1', [$id, $userId]);

        return $this->ok($row, 'Cartão atualizado');
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function deleteCard(string $userId, int $id): array
    {
        $row = DB::selectOne(
            'UPDATE finance_cards SET is_active = false, updated_at = NOW()
             WHERE id = ? AND user_id = ? RETURNING *',
            [$id, $userId]
        );
        if (! $row) {
            return $this->fail('Cartão não encontrado ou já excluído.', 404);
        }

        return $this->ok($row, 'Cartão excluído');
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function goals(string $userId, ?int $profileId = null): array
    {
        if (! Schema::hasTable('finance_goals')) {
            return $this->ok([]);
        }
        $sql = 'SELECT * FROM finance_goals WHERE user_id = ?';
        $params = [$userId];
        if ($profileId !== null) {
            $sql .= ' AND (profile_id = ? OR profile_id IS NULL)';
            $params[] = $profileId;
        }
        $sql .= ' ORDER BY target_date ASC NULLS LAST, created_at ASC';

        return $this->ok(DB::select($sql, $params));
    }

    /**
     * @param  array<string,mixed>  $data
     * @return array{status:int, body:array<string,mixed>}
     */
    public function createGoal(string $userId, array $data): array
    {
        if (! Schema::hasTable('finance_goals')) {
            return $this->fail('Tabela finance_goals indisponível', 503);
        }
        $name = trim((string) ($data['name'] ?? ''));
        $target = (float) ($data['target_value'] ?? 0);
        if ($name === '' || $target <= 0) {
            return $this->fail('name e target_value positivos são obrigatórios', 400);
        }
        $row = DB::selectOne(
            'INSERT INTO finance_goals (user_id, profile_id, name, target_value, target_date)
             VALUES (?, ?, ?, ?, ?) RETURNING *',
            [
                $userId,
                isset($data['profile_id']) && $data['profile_id'] !== '' ? (int) $data['profile_id'] : null,
                $name,
                $target,
                $data['target_date'] ?? null,
            ]
        );

        return $this->ok($row, 'Meta criada', 201);
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function deleteGoal(string $userId, int $id): array
    {
        if (! Schema::hasTable('finance_goals')) {
            return $this->fail('Tabela finance_goals indisponível', 503);
        }
        $row = DB::selectOne(
            'DELETE FROM finance_goals WHERE id = ? AND user_id = ? RETURNING *',
            [$id, $userId]
        );
        if (! $row) {
            return $this->fail('Meta não encontrada', 404);
        }

        return $this->ok($row, 'Meta excluída');
    }

    /**
     * @param  array<string,mixed>  $data
     * @return array{status:int, body:array<string,mixed>}
     */
    public function createProfile(string $userId, array $data): array
    {
        $name = trim((string) ($data['name'] ?? ''));
        if ($name === '') {
            return $this->fail('name é obrigatório', 400);
        }
        $limitInfo = $this->profilesLimitInfo($userId);
        if (! ($limitInfo['canCreate'] ?? false)) {
            return [
                'status' => 403,
                'body' => [
                    'success' => false,
                    'data' => null,
                    'error' => [
                        'code' => 'FINANCE_PROFILE_LIMIT_REACHED',
                        'message' => 'Limite de perfis financeiros atingido',
                        'currentCount' => $limitInfo['currentCount'],
                        'limit' => $limitInfo['limit'],
                        'upgradeRequired' => true,
                    ],
                    'message' => 'Limite de perfis financeiros atingido',
                ],
            ];
        }
        $isPrimary = filter_var($data['is_primary'] ?? false, FILTER_VALIDATE_BOOLEAN);
        try {
            $row = null;
            DB::transaction(function () use ($userId, $data, $name, $isPrimary, &$row) {
                if ($isPrimary) {
                    DB::update('UPDATE finance_profiles SET is_primary = FALSE WHERE user_id = ?', [$userId]);
                }
                $row = DB::selectOne(
                    'INSERT INTO finance_profiles (user_id, name, description, color, icon, is_primary, is_active)
                     VALUES (?, ?, ?, ?, ?, ?, TRUE) RETURNING *',
                    [
                        $userId,
                        $name,
                        $data['description'] ?? null,
                        $data['color'] ?? '#3b82f6',
                        $data['icon'] ?? 'fa-wallet',
                        $isPrimary,
                    ]
                );
            });
        } catch (\Throwable $e) {
            return $this->fail($e->getMessage(), 400);
        }

        return $this->ok($row, 'Perfil criado com sucesso', 201);
    }

    /**
     * @param  array<string,mixed>  $data
     * @return array{status:int, body:array<string,mixed>}
     */
    public function updateProfile(string $userId, int $id, array $data): array
    {
        $existing = DB::selectOne(
            'SELECT * FROM finance_profiles WHERE id = ? AND user_id = ? LIMIT 1',
            [$id, $userId]
        );
        if (! $existing) {
            return $this->fail('Perfil não encontrado', 404);
        }
        try {
            DB::transaction(function () use ($userId, $id, $data) {
                if (array_key_exists('is_primary', $data) && filter_var($data['is_primary'], FILTER_VALIDATE_BOOLEAN)) {
                    DB::update(
                        'UPDATE finance_profiles SET is_primary = FALSE WHERE user_id = ? AND id != ?',
                        [$userId, $id]
                    );
                }
                $map = ['name', 'description', 'color', 'icon', 'is_primary', 'is_active'];
                $sets = [];
                $params = [];
                foreach ($map as $k) {
                    if (! array_key_exists($k, $data)) {
                        continue;
                    }
                    $val = $data[$k];
                    if ($k === 'is_primary' || $k === 'is_active') {
                        $val = filter_var($val, FILTER_VALIDATE_BOOLEAN);
                    }
                    $sets[] = "{$k} = ?";
                    $params[] = $val;
                }
                if ($sets === []) {
                    return;
                }
                $sets[] = 'updated_at = NOW()';
                $params[] = $id;
                $params[] = $userId;
                DB::update(
                    'UPDATE finance_profiles SET '.implode(', ', $sets).' WHERE id = ? AND user_id = ?',
                    $params
                );
            });
        } catch (\Throwable $e) {
            return $this->fail($e->getMessage(), 400);
        }
        $row = DB::selectOne('SELECT * FROM finance_profiles WHERE id = ? AND user_id = ? LIMIT 1', [$id, $userId]);

        return $this->ok($row, 'Perfil atualizado com sucesso');
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function deleteProfile(string $userId, int $id): array
    {
        $count = (int) (DB::selectOne(
            'SELECT COUNT(*)::int AS c FROM finance_profiles WHERE user_id = ? AND is_active = TRUE',
            [$userId]
        )->c ?? 0);
        if ($count <= 1) {
            return $this->fail('Não é possível deletar o único perfil financeiro', 400);
        }
        $profile = DB::selectOne(
            'SELECT * FROM finance_profiles WHERE id = ? AND user_id = ? LIMIT 1',
            [$id, $userId]
        );
        if (! $profile) {
            return $this->fail('Perfil não encontrado', 404);
        }
        try {
            DB::transaction(function () use ($userId, $id, $profile) {
                if (! empty($profile->is_primary)) {
                    $other = DB::selectOne(
                        'SELECT id FROM finance_profiles WHERE user_id = ? AND id != ? AND is_active = TRUE ORDER BY id ASC LIMIT 1',
                        [$userId, $id]
                    );
                    if ($other) {
                        DB::update(
                            'UPDATE finance_profiles SET is_primary = TRUE, updated_at = NOW() WHERE id = ?',
                            [$other->id]
                        );
                    }
                }
                DB::update(
                    'UPDATE finance_profiles SET is_active = FALSE, is_primary = FALSE, updated_at = NOW() WHERE id = ? AND user_id = ?',
                    [$id, $userId]
                );
            });
        } catch (\Throwable $e) {
            return $this->fail($e->getMessage(), 400);
        }

        return $this->ok(null, 'Perfil deletado com sucesso');
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function profilesLimit(string $userId): array
    {
        $info = $this->profilesLimitInfo($userId);

        return $this->ok([
            'limit' => $info['limit'] === PHP_INT_MAX ? null : $info['limit'],
            'currentCount' => $info['currentCount'],
            'remaining' => $info['remaining'] === PHP_INT_MAX ? null : $info['remaining'],
            'canCreate' => $info['canCreate'],
            'plan' => $info['plan'],
        ]);
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function incomeBreakdown(string $userId, ?string $dateFrom, ?string $dateTo, ?int $profileId, string $scope = 'monthly'): array
    {
        $scope = $scope === 'accumulated' ? 'accumulated' : 'monthly';
        $now = now();
        $dateFrom = $dateFrom ?: $now->format('Y-m-01');
        $dateTo = $dateTo ?: $now->format('Y-m-t');

        if ($profileId !== null) {
            $params = [$userId, $dateFrom, $dateTo, $profileId];
            $profileSql = 't.profile_id = ?';
            if ($scope === 'accumulated') {
                $params = [$userId, $profileId];
                $rows = DB::select(
                    "SELECT t.id, t.description, t.client_name, t.amount, t.transaction_date, c.name as category_name
                     FROM finance_transactions t
                     LEFT JOIN finance_categories c ON t.category_id = c.id
                     WHERE t.user_id = ? AND t.type = 'INCOME' AND t.status = 'PAID'
                     AND t.transaction_date <= CURRENT_DATE AND {$profileSql}
                     ORDER BY t.transaction_date DESC",
                    $params
                );
            } else {
                $rows = DB::select(
                    "SELECT t.id, t.description, t.client_name, t.amount, t.transaction_date, c.name as category_name
                     FROM finance_transactions t
                     LEFT JOIN finance_categories c ON t.category_id = c.id
                     WHERE t.user_id = ? AND t.type = 'INCOME' AND t.status = 'PAID'
                     AND t.transaction_date BETWEEN ?::date AND ?::date AND {$profileSql}
                     ORDER BY t.transaction_date DESC",
                    $params
                );
            }
        } else {
            $primaryFilter = '(t.profile_id IS NULL OR t.profile_id IN (SELECT id FROM finance_profiles WHERE user_id = ? AND is_primary = TRUE))';
            if ($scope === 'accumulated') {
                $rows = DB::select(
                    "SELECT t.id, t.description, t.client_name, t.amount, t.transaction_date, c.name as category_name
                     FROM finance_transactions t
                     LEFT JOIN finance_categories c ON t.category_id = c.id
                     WHERE t.user_id = ? AND t.type = 'INCOME' AND t.status = 'PAID'
                     AND t.transaction_date <= CURRENT_DATE AND {$primaryFilter}
                     ORDER BY t.transaction_date DESC",
                    [$userId, $userId]
                );
            } else {
                $rows = DB::select(
                    "SELECT t.id, t.description, t.client_name, t.amount, t.transaction_date, c.name as category_name
                     FROM finance_transactions t
                     LEFT JOIN finance_categories c ON t.category_id = c.id
                     WHERE t.user_id = ? AND t.type = 'INCOME' AND t.status = 'PAID'
                     AND t.transaction_date BETWEEN ?::date AND ?::date AND {$primaryFilter}
                     ORDER BY t.transaction_date DESC",
                    [$userId, $dateFrom, $dateTo, $userId]
                );
            }
        }

        $transacoes = array_map(static fn ($r) => [
            'origem' => 'transacao',
            'id' => (int) $r->id,
            'descricao' => $r->description ?: ($r->category_name ?: 'Receita'),
            'cliente' => $r->client_name,
            'valor' => (float) $r->amount,
            'data' => $r->transaction_date,
        ], $rows);

        $trabajos = [];
        $recibos = [];
        if (Schema::hasTable('finance_king_sync')) {
            $profileKey = $profileId !== null ? (string) $profileId : '';
            $sync = DB::selectOne(
                'SELECT data FROM finance_king_sync WHERE user_id = ? AND profile_id = ? LIMIT 1',
                [$userId, $profileKey]
            );
            if (! $sync && $profileKey !== '') {
                $sync = DB::selectOne(
                    'SELECT data FROM finance_king_sync WHERE user_id = ? AND profile_id = ? LIMIT 1',
                    [$userId, '']
                );
            }
            $data = [];
            if ($sync && ! empty($sync->data)) {
                $decoded = is_string($sync->data) ? json_decode($sync->data, true) : (array) $sync->data;
                $data = is_array($decoded) ? $decoded : [];
            }
            $arr = is_array($data['trabalhos'] ?? null) ? $data['trabalhos'] : [];
            $isMonthly = $scope === 'monthly';
            foreach ($arr as $t) {
                if (! is_array($t)) {
                    continue;
                }
                if ($isMonthly && ! empty($t['pagamentos']) && is_array($t['pagamentos'])) {
                    $totalT = 0.0;
                    $ultima = null;
                    foreach ($t['pagamentos'] as $p) {
                        if (! is_array($p)) {
                            continue;
                        }
                        $totalT += (float) ($p['valor'] ?? 0);
                        $dt = substr((string) ($p['data'] ?? $p['dataPagamento'] ?? $t['data'] ?? ''), 0, 10);
                        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $dt) && ($ultima === null || $dt > $ultima)) {
                            $ultima = $dt;
                        }
                    }
                    if ($totalT > 0 && $ultima && $ultima >= $dateFrom && $ultima <= $dateTo) {
                        $trabajos[] = [
                            'origem' => 'trabalho',
                            'descricao' => $t['descricao'] ?? $t['servico'] ?? 'Trabalho',
                            'cliente' => $t['cliente'] ?? $t['nome'] ?? null,
                            'valor' => $totalT,
                            'data' => $ultima,
                        ];
                    }
                } elseif (! $isMonthly) {
                    $v = (float) ($t['valor_recebido'] ?? 0);
                    if ($v <= 0 && ! empty($t['pagamentos']) && is_array($t['pagamentos'])) {
                        foreach ($t['pagamentos'] as $p) {
                            $v += (float) (($p['valor'] ?? 0));
                        }
                    }
                    if ($v > 0) {
                        $trabajos[] = [
                            'origem' => 'trabalho',
                            'descricao' => $t['descricao'] ?? $t['servico'] ?? 'Trabalho',
                            'cliente' => $t['cliente'] ?? $t['nome'] ?? null,
                            'valor' => $v,
                            'data' => $t['data'] ?? $t['data_trabalho'] ?? null,
                        ];
                    }
                }
            }
        }

        if (Schema::hasTable('documentos')) {
            try {
                if ($scope === 'monthly') {
                    $docs = DB::select(
                        "SELECT id, cliente_json, data_documento, itens_json FROM documentos
                         WHERE user_id = ? AND tipo = 'recibo' AND data_documento BETWEEN ?::date AND ?::date",
                        [$userId, $dateFrom, $dateTo]
                    );
                } else {
                    $docs = DB::select(
                        "SELECT id, cliente_json, data_documento, itens_json FROM documentos
                         WHERE user_id = ? AND tipo = 'recibo' AND data_documento <= CURRENT_DATE",
                        [$userId]
                    );
                }
                foreach ($docs as $row) {
                    $clienteJson = is_string($row->cliente_json ?? null)
                        ? json_decode($row->cliente_json, true)
                        : (array) ($row->cliente_json ?? []);
                    $itens = is_string($row->itens_json ?? null)
                        ? json_decode($row->itens_json, true)
                        : (array) ($row->itens_json ?? []);
                    $clienteNome = is_array($clienteJson) ? ($clienteJson['nome'] ?? $clienteJson['name'] ?? null) : null;
                    if (! is_array($itens)) {
                        continue;
                    }
                    foreach ($itens as $item) {
                        if (! is_array($item)) {
                            continue;
                        }
                        $v = (float) ($item['valor_recebido'] ?? 0);
                        if ($v > 0) {
                            $recibos[] = [
                                'origem' => 'recibo',
                                'documento_id' => (int) $row->id,
                                'descricao' => $item['descricao'] ?? 'Item',
                                'cliente' => $clienteNome,
                                'valor' => $v,
                                'data' => $row->data_documento,
                            ];
                        }
                    }
                }
            } catch (\Throwable) {
                // tabela/colunas opcionais
            }
        }

        $itens = array_merge($transacoes, $trabajos, $recibos);
        usort($itens, static function ($a, $b) {
            return strcmp((string) ($b['data'] ?? ''), (string) ($a['data'] ?? ''));
        });
        $total = array_sum(array_map(static fn ($x) => (float) ($x['valor'] ?? 0), $itens));

        return $this->ok([
            'transacoes' => $transacoes,
            'trabalhos' => $trabajos,
            'recibos' => $recibos,
            'itens' => $itens,
            'total' => $total,
            'scope' => $scope,
            'dateFrom' => $dateFrom,
            'dateTo' => $dateTo,
        ]);
    }

    /**
     * @return array{canCreate:bool, currentCount:int, limit:int, remaining:int, plan:?array}
     */
    private function profilesLimitInfo(string $userId): array
    {
        $user = DB::selectOne('SELECT is_admin FROM users WHERE id = ? LIMIT 1', [$userId]);
        $current = (int) (DB::selectOne(
            'SELECT COUNT(*)::int AS c FROM finance_profiles WHERE user_id = ? AND is_active = TRUE',
            [$userId]
        )->c ?? 0);
        if (! empty($user->is_admin)) {
            return [
                'canCreate' => true,
                'currentCount' => $current,
                'limit' => PHP_INT_MAX,
                'remaining' => PHP_INT_MAX,
                'plan' => null,
            ];
        }
        $limit = 1;
        $planPayload = null;
        if (Schema::hasTable('individual_user_finance_profiles')) {
            $ov = DB::selectOne(
                'SELECT max_finance_profiles FROM individual_user_finance_profiles WHERE user_id = ? LIMIT 1',
                [$userId]
            );
            if ($ov) {
                $n = (int) $ov->max_finance_profiles;
                if ($n >= 1 && $n <= 20) {
                    $limit = $n;
                }
            }
        }
        if ($limit === 1 && Schema::hasTable('users') && Schema::hasTable('subscription_plans')) {
            try {
                $u = DB::selectOne('SELECT subscription_id FROM users WHERE id = ? LIMIT 1', [$userId]);
                if ($u && ! empty($u->subscription_id)) {
                    $plan = DB::selectOne(
                        'SELECT plan_code, plan_name, price, features FROM subscription_plans WHERE id = ? LIMIT 1',
                        [$u->subscription_id]
                    );
                    if ($plan) {
                        $features = is_string($plan->features ?? null)
                            ? json_decode($plan->features, true)
                            : (array) ($plan->features ?? []);
                        if (is_array($features) && ! empty($features['max_finance_profiles'])) {
                            $limit = max(1, (int) $features['max_finance_profiles']);
                        }
                        $planPayload = [
                            'code' => $plan->plan_code ?? null,
                            'name' => $plan->plan_name ?? null,
                            'price' => $plan->price ?? null,
                        ];
                    }
                }
            } catch (\Throwable) {
                // ignore
            }
        }

        return [
            'canCreate' => $current < $limit,
            'currentCount' => $current,
            'limit' => $limit,
            'remaining' => max(0, $limit - $current),
            'plan' => $planPayload,
        ];
    }

    /**
     * @param  array<string,mixed>  $data
     */
    private function insertTransaction(string $userId, array $data): object
    {
        $tags = $data['tags'] ?? [];
        if (! is_array($tags)) {
            $tags = [];
        }
        $tags = array_values(array_map(static fn ($t) => (string) $t, $tags));

        $row = DB::selectOne(
            'INSERT INTO finance_transactions (
                user_id, type, amount, description, transaction_date,
                category_id, account_id, card_id, status,
                installment_group_id, installment_number,
                recurrence_type, recurrence_end_date,
                attachment_url, project_name, cost_center,
                client_name, notes, is_recurring, recurring_times, profile_id
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             RETURNING *',
            [
                $userId,
                strtoupper((string) $data['type']),
                (float) $data['amount'],
                $data['description'] ?? null,
                $data['transaction_date'],
                $data['category_id'] ?? null,
                $data['account_id'] ?? null,
                $data['card_id'] ?? null,
                strtoupper((string) ($data['status'] ?? 'PENDING')),
                $data['installment_group_id'] ?? null,
                $data['installment_number'] ?? null,
                $data['recurrence_type'] ?? null,
                $data['recurrence_end_date'] ?? null,
                $data['attachment_url'] ?? null,
                $data['project_name'] ?? null,
                $data['cost_center'] ?? null,
                $data['client_name'] ?? null,
                $data['notes'] ?? null,
                filter_var($data['is_recurring'] ?? false, FILTER_VALIDATE_BOOLEAN),
                $data['recurring_times'] ?? null,
                $data['profile_id'] ?? null,
            ]
        );
        if ($tags !== [] && $row) {
            try {
                $literal = '{'.implode(',', array_map(static function ($t) {
                    return '"'.str_replace(['\\', '"'], ['\\\\', '\\"'], $t).'"';
                }, $tags)).'}';
                DB::update('UPDATE finance_transactions SET tags = ?::text[] WHERE id = ?', [$literal, $row->id]);
                $row = DB::selectOne('SELECT * FROM finance_transactions WHERE id = ? LIMIT 1', [$row->id]) ?: $row;
            } catch (\Throwable) {
                // tags opcional — não falha o create
            }
        }

        return $row;
    }

    private function recalcAccountBalance(int $accountId, string $userId): void
    {
        $account = DB::selectOne(
            'SELECT id, initial_balance FROM finance_accounts WHERE id = ? AND user_id = ? LIMIT 1',
            [$accountId, $userId]
        );
        if (! $account) {
            return;
        }
        $balance = (float) ($account->initial_balance ?? 0);
        $rows = DB::select(
            "SELECT type, amount, status FROM finance_transactions
             WHERE user_id = ? AND account_id = ? AND status = 'PAID'",
            [$userId, $accountId]
        );
        foreach ($rows as $t) {
            $amt = (float) $t->amount;
            if ($t->type === 'INCOME') {
                $balance += $amt;
            } elseif ($t->type === 'EXPENSE') {
                $balance -= $amt;
            }
        }
        DB::update(
            'UPDATE finance_accounts SET current_balance = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
            [$balance, $accountId, $userId]
        );
    }

    /**
     * @param  array<string,mixed>  $data
     */
    private function validateTransaction(array $data, bool $isUpdate): ?string
    {
        if (! $isUpdate) {
            $type = strtoupper((string) ($data['type'] ?? ''));
            if (! in_array($type, ['INCOME', 'EXPENSE'], true)) {
                return 'type deve ser INCOME ou EXPENSE';
            }
            $amount = isset($data['amount']) ? (float) $data['amount'] : 0;
            if ($amount <= 0) {
                return 'amount deve ser um número positivo';
            }
            if (empty($data['transaction_date'])) {
                return 'transaction_date é obrigatório';
            }
        }
        if (isset($data['type']) && ! in_array(strtoupper((string) $data['type']), ['INCOME', 'EXPENSE'], true)) {
            return 'type deve ser INCOME ou EXPENSE';
        }
        if (isset($data['amount']) && (float) $data['amount'] <= 0) {
            return 'amount deve ser um número positivo';
        }
        if (isset($data['status']) && ! in_array(strtoupper((string) $data['status']), ['PENDING', 'PAID'], true)) {
            return 'status deve ser PENDING ou PAID';
        }

        return null;
    }

    private function addMonthsKeepDay(\DateTimeImmutable $base, int $months): \DateTimeImmutable
    {
        $day = (int) $base->format('d');
        $target = $base->modify('first day of this month')->modify("+{$months} months");
        $lastDay = (int) $target->format('t');

        return $target->setDate((int) $target->format('Y'), (int) $target->format('m'), min($day, $lastDay));
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function upgradePlans(string $userId): array
    {
        try {
            $rows = DB::select(
                "SELECT
                    sp.id,
                    sp.plan_code,
                    sp.plan_name,
                    sp.price,
                    sp.description,
                    sp.features,
                    COALESCE(fwc.whatsapp_number, sp.whatsapp_number) as whatsapp_number,
                    COALESCE(fwc.whatsapp_message, sp.whatsapp_message) as whatsapp_message,
                    sp.pix_key
                 FROM subscription_plans sp
                 LEFT JOIN finance_whatsapp_config fwc ON sp.plan_code = fwc.plan_code
                 WHERE sp.is_active = TRUE
                   AND (sp.features->>'has_finance_module' = 'true' OR sp.features->>'max_finance_profiles' > '1')
                 ORDER BY sp.price ASC"
            );
            $data = array_map(static function ($r) {
                $arr = (array) $r;
                if (isset($arr['features']) && is_string($arr['features'])) {
                    $decoded = json_decode($arr['features'], true);
                    if (is_array($decoded)) {
                        $arr['features'] = $decoded;
                    }
                }

                return $arr;
            }, $rows);

            return $this->ok($data);
        } catch (\Throwable $e) {
            Log::warning('finance.upgradePlans', ['error' => $e->getMessage()]);

            return $this->ok([]);
        }
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function whatsappConfig(string $userId): array
    {
        if (! $this->isAdmin($userId)) {
            return $this->fail('Acesso negado. Apenas administradores podem acessar.', 403);
        }
        $rows = DB::select(
            "SELECT fwc.id, fwc.plan_code, sp.plan_name, fwc.whatsapp_number, fwc.whatsapp_message,
                    fwc.created_at, fwc.updated_at
             FROM finance_whatsapp_config fwc
             JOIN subscription_plans sp ON fwc.plan_code = sp.plan_code
             WHERE sp.plan_code IN ('king_finance', 'king_finance_plus')
             ORDER BY sp.plan_code"
        );

        return $this->ok(array_map(static fn ($r) => (array) $r, $rows));
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function updateWhatsappConfig(string $userId, array $body): array
    {
        if (! $this->isAdmin($userId)) {
            return $this->fail('Acesso negado. Apenas administradores podem acessar.', 403);
        }
        $planCode = (string) ($body['plan_code'] ?? '');
        $number = (string) ($body['whatsapp_number'] ?? '');
        $message = (string) ($body['whatsapp_message'] ?? '');
        if ($planCode === '' || $number === '' || $message === '') {
            return $this->fail('plan_code, whatsapp_number e whatsapp_message são obrigatórios.', 400);
        }
        $plan = DB::selectOne('SELECT id FROM subscription_plans WHERE plan_code = ? LIMIT 1', [$planCode]);
        if (! $plan) {
            return $this->fail('Plano não encontrado.', 404);
        }
        $row = DB::selectOne(
            'INSERT INTO finance_whatsapp_config (plan_code, whatsapp_number, whatsapp_message, updated_at)
             VALUES (?, ?, ?, NOW())
             ON CONFLICT (plan_code) DO UPDATE SET
                whatsapp_number = EXCLUDED.whatsapp_number,
                whatsapp_message = EXCLUDED.whatsapp_message,
                updated_at = NOW()
             RETURNING *',
            [$planCode, $number, $message]
        );
        try {
            DB::update(
                'UPDATE subscription_plans SET whatsapp_number = ?, whatsapp_message = ?, updated_at = NOW() WHERE plan_code = ?',
                [$number, $message, $planCode]
            );
        } catch (\Throwable $e) {
            Log::warning('finance.updateWhatsappConfig.plans', ['error' => $e->getMessage()]);
        }

        return $this->ok((array) $row);
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function zerarSenhaStatus(string $userId): array
    {
        $senha = $this->zerarSenhaEffective($userId);

        return $this->ok(['hasCustomPassword' => $senha !== '1212']);
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function zerarSenhaVerify(string $userId, array $body): array
    {
        $password = $body['password'] ?? null;
        if ($password === null || $password === '') {
            return $this->fail('Informe a senha.', 400);
        }
        if (! $this->verifyZerarSenha($userId, (string) $password)) {
            return $this->fail('Senha incorreta.', 403);
        }

        return $this->ok(['verified' => true]);
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function putZerarSenha(string $userId, array $body): array
    {
        $current = $body['currentPassword'] ?? null;
        $new = $body['newPassword'] ?? null;
        if ($current === null || $current === '' || $new === null || $new === '') {
            return $this->fail('Informe a senha atual e a nova senha.', 400);
        }
        if (! $this->verifyZerarSenha($userId, (string) $current)) {
            return $this->fail('Senha atual incorreta.', 403);
        }
        if (strlen((string) $new) < 4) {
            return $this->fail('Senha deve ter no mínimo 4 caracteres.', 400);
        }
        DB::selectOne(
            'INSERT INTO finance_zerar_senha (user_id, senha, updated_at)
             VALUES (?, ?, NOW())
             ON CONFLICT (user_id) DO UPDATE SET senha = EXCLUDED.senha, updated_at = NOW()
             RETURNING *',
            [$userId, (string) $new]
        );

        return $this->ok(null, 'Senha de zerar mês alterada com sucesso.');
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function zerarMes(string $userId, array $body): array
    {
        $password = $body['password'] ?? null;
        if ($password === null || $password === '') {
            return $this->fail('Informe a senha para confirmar.', 400);
        }
        $month = isset($body['month']) ? (int) $body['month'] : (int) date('n');
        $year = isset($body['year']) ? (int) $body['year'] : (int) date('Y');
        if ($month < 1 || $month > 12) {
            return $this->fail('Mês inválido.', 400);
        }
        if (! $this->verifyZerarSenha($userId, (string) $password)) {
            return $this->fail('Senha incorreta. Não foi possível zerar o mês.', 403);
        }
        $dateFrom = sprintf('%04d-%02d-01', $year, $month);
        $lastDay = (int) date('t', strtotime($dateFrom));
        $dateTo = sprintf('%04d-%02d-%02d', $year, $month, $lastDay);
        $params = [$userId, $dateFrom, $dateTo];
        $sql = 'DELETE FROM finance_transactions
                WHERE user_id = ? AND transaction_date >= ?::date AND transaction_date <= ?::date';
        $pid = $body['profile_id'] ?? null;
        if ($pid !== null && $pid !== '' && $pid !== 'undefined') {
            $sql .= ' AND profile_id = ?';
            $params[] = (int) $pid;
        }
        $deleted = DB::delete($sql, $params);
        $accounts = DB::select('SELECT id FROM finance_accounts WHERE user_id = ?', [$userId]);
        foreach ($accounts as $a) {
            $this->recalcAccountBalance((int) $a->id, $userId);
        }

        return $this->ok(
            ['deleted' => $deleted],
            "Mês zerado. {$deleted} transação(ões) removida(s)."
        );
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function adminClientesSenhas(string $userId): array
    {
        if (! $this->isAdmin($userId)) {
            return $this->fail('Acesso negado. Apenas administradores.', 403);
        }
        $rows = DB::select(
            "SELECT u.id AS user_id, u.email, u.name AS full_name,
                    COALESCE(fz.senha, '1212') AS senha
             FROM users u
             INNER JOIN (
                SELECT user_id FROM finance_transactions
                UNION
                SELECT user_id FROM finance_profiles WHERE is_active = true
             ) f ON f.user_id = u.id
             LEFT JOIN finance_zerar_senha fz ON fz.user_id = u.id
             GROUP BY u.id, u.email, u.name, fz.senha
             ORDER BY u.name, u.email"
        );

        return $this->ok(array_map(static fn ($r) => (array) $r, $rows));
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function profileById(string $userId, int $id): array
    {
        $row = DB::selectOne(
            'SELECT * FROM finance_profiles WHERE id = ? AND user_id = ? AND is_active = TRUE LIMIT 1',
            [$id, $userId]
        );
        if (! $row) {
            return $this->fail('Perfil não encontrado', 404);
        }

        return $this->ok($row);
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function budgets(string $userId, ?int $month, ?int $year): array
    {
        if (! Schema::hasTable('finance_budgets')) {
            return $this->ok([]);
        }
        $sql = 'SELECT * FROM finance_budgets WHERE user_id = ?';
        $params = [$userId];
        if ($month && $year) {
            $sql .= ' AND month = ? AND year = ?';
            $params[] = $month;
            $params[] = $year;
        }
        $sql .= ' ORDER BY year DESC, month DESC';

        return $this->ok(array_map(static fn ($r) => (array) $r, DB::select($sql, $params)));
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function createBudget(string $userId, array $body): array
    {
        if (! Schema::hasTable('finance_budgets')) {
            return $this->fail('Tabela de orçamentos indisponível', 503);
        }
        $categoryId = isset($body['category_id']) ? (int) $body['category_id'] : 0;
        $month = isset($body['month']) ? (int) $body['month'] : 0;
        $year = isset($body['year']) ? (int) $body['year'] : 0;
        $limit = isset($body['limit_amount']) ? (float) $body['limit_amount'] : 0;
        if ($categoryId < 1) {
            return $this->fail('category_id é obrigatório', 400);
        }
        if ($month < 1 || $month > 12) {
            return $this->fail('month deve ser um número entre 1 e 12', 400);
        }
        if ($year < 2020 || $year > 2100) {
            return $this->fail('year deve ser um ano válido', 400);
        }
        if ($limit <= 0) {
            return $this->fail('limit_amount deve ser um número positivo', 400);
        }
        $consider = ! empty($body['consider_pending']);
        $row = DB::selectOne(
            'INSERT INTO finance_budgets (user_id, category_id, month, year, limit_amount, consider_pending)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT (user_id, category_id, month, year)
             DO UPDATE SET limit_amount = EXCLUDED.limit_amount, consider_pending = EXCLUDED.consider_pending, updated_at = NOW()
             RETURNING *',
            [$userId, $categoryId, $month, $year, $limit, $consider]
        );

        return $this->ok($row, 'Orçamento criado com sucesso', 201);
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function reportSummary(string $userId, ?string $dateFrom, ?string $dateTo, ?int $profileId): array
    {
        $y = (int) date('Y');
        $from = $dateFrom ?: "{$y}-01-01";
        $to = $dateTo ?: "{$y}-12-31";

        return $this->dashboard($userId, $from, $to, $profileId);
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function reportCategories(string $userId, ?string $dateFrom, ?string $dateTo, ?string $type): array
    {
        $y = (int) date('Y');
        $from = $dateFrom ?: "{$y}-01-01";
        $to = $dateTo ?: "{$y}-12-31";
        $sql = "SELECT category_id, amount FROM finance_transactions
                WHERE user_id = ? AND status = 'PAID'
                  AND transaction_date >= ?::date AND transaction_date <= ?::date";
        $params = [$userId, $from, $to];
        if ($type) {
            $sql .= ' AND type = ?';
            $params[] = strtoupper($type);
        }
        $sql .= ' LIMIT 10000';
        $rows = DB::select($sql, $params);
        $map = [];
        foreach ($rows as $t) {
            $catId = $t->category_id ?? 'sem_categoria';
            $key = (string) $catId;
            if (! isset($map[$key])) {
                $map[$key] = [
                    'category_id' => $t->category_id,
                    'category_name' => $t->category_id ? 'Categoria' : 'Sem categoria',
                    'total' => 0.0,
                    'count' => 0,
                ];
            }
            $map[$key]['total'] += (float) $t->amount;
            $map[$key]['count'] += 1;
        }

        return $this->ok(array_values($map));
    }

    /**
     * @param  array<string,mixed>  $body
     * @return array{status:int, body:array<string,mixed>}
     */
    public function transfer(string $userId, array $body): array
    {
        $from = isset($body['from_account_id']) ? (int) $body['from_account_id'] : 0;
        $to = isset($body['to_account_id']) ? (int) $body['to_account_id'] : 0;
        $amount = isset($body['amount']) ? (float) $body['amount'] : 0;
        $date = (string) ($body['transaction_date'] ?? '');
        if ($from < 1 || $to < 1) {
            return $this->fail('from_account_id e to_account_id são obrigatórios', 400);
        }
        if ($from === $to) {
            return $this->fail('from_account_id e to_account_id devem ser diferentes', 400);
        }
        if ($amount <= 0) {
            return $this->fail('amount deve ser um número positivo', 400);
        }
        if ($date === '') {
            return $this->fail('transaction_date é obrigatório', 400);
        }
        $fromAcc = DB::selectOne('SELECT id FROM finance_accounts WHERE id = ? AND user_id = ? LIMIT 1', [$from, $userId]);
        $toAcc = DB::selectOne('SELECT id FROM finance_accounts WHERE id = ? AND user_id = ? LIMIT 1', [$to, $userId]);
        if (! $fromAcc || ! $toAcc) {
            return $this->fail('Conta não encontrada', 400);
        }
        try {
            $fromTx = null;
            $toTx = null;
            DB::transaction(function () use ($userId, $from, $to, $amount, $date, &$fromTx, &$toTx) {
                $fromTx = $this->insertTransaction($userId, [
                    'type' => 'EXPENSE',
                    'amount' => $amount,
                    'description' => "Transferência para {$to}",
                    'transaction_date' => $date,
                    'account_id' => $from,
                    'status' => 'PAID',
                ]);
                $toTx = $this->insertTransaction($userId, [
                    'type' => 'INCOME',
                    'amount' => $amount,
                    'description' => "Transferência de {$from}",
                    'transaction_date' => $date,
                    'account_id' => $to,
                    'status' => 'PAID',
                ]);
            });
            $this->recalcAccountBalance($from, $userId);
            $this->recalcAccountBalance($to, $userId);

            return $this->ok([
                'fromTransaction' => $fromTx,
                'toTransaction' => $toTx,
            ], 'Transferência realizada com sucesso', 201);
        } catch (\Throwable $e) {
            Log::error('finance.transfer', ['error' => $e->getMessage()]);

            return $this->fail($e->getMessage() ?: 'Erro ao transferir', 400);
        }
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function uploadAttachment(?string $storedRelativeUrl): array
    {
        return $this->ok(['url' => $storedRelativeUrl], 'Anexo enviado com sucesso', 201);
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function serasaImportPreview(string $pdfPath): array
    {
        try {
            $text = $this->extractPdfText($pdfPath);
            $offers = SerasaPdfParser::parseSerasaOfertas($text);

            return $this->ok(['offers' => $offers]);
        } catch (\Throwable $e) {
            Log::error('finance.serasa.pdf', ['error' => $e->getMessage()]);

            return $this->fail($e->getMessage() ?: 'Não foi possível ler o PDF. Verifique se o arquivo é um relatório do Serasa.', 500);
        }
    }

    /**
     * @param  list<string>  $imagePaths
     * @return array{status:int, body:array<string,mixed>}
     */
    public function serasaImportImagePreview(array $imagePaths): array
    {
        try {
            $ocrTexts = [];
            foreach ($imagePaths as $path) {
                $t = $this->ocrImage($path);
                if ($t !== '') {
                    $ocrTexts[] = $t;
                }
            }
            $offers = SerasaImageParser::parseDetalhesDividaFromMultipleTexts($ocrTexts);

            return $this->ok(['offers' => $offers, 'source' => 'image']);
        } catch (\Throwable $e) {
            Log::error('finance.serasa.ocr', ['error' => $e->getMessage()]);

            return $this->fail($e->getMessage() ?: 'Não foi possível ler as imagens. Envie prints da tela "Detalhes da dívida".', 500);
        }
    }

    private function extractPdfText(string $path): string
    {
        if (! is_file($path)) {
            throw new \RuntimeException('Arquivo PDF inválido.');
        }
        $bin = trim((string) shell_exec('command -v pdftotext 2>/dev/null'));
        if ($bin === '') {
            throw new \RuntimeException('pdftotext não disponível no servidor.');
        }
        $cmd = escapeshellarg($bin).' -layout '.escapeshellarg($path).' -';
        $out = shell_exec($cmd);
        if ($out === null || trim($out) === '') {
            // alguns PDFs sem camada de texto
            return '';
        }

        return (string) $out;
    }

    private function ocrImage(string $path): string
    {
        if (! is_file($path)) {
            return '';
        }
        $bin = trim((string) shell_exec('command -v tesseract 2>/dev/null'));
        if ($bin === '') {
            throw new \RuntimeException('tesseract não disponível no servidor.');
        }
        $cmd = escapeshellarg($bin).' '.escapeshellarg($path).' stdout -l por 2>/dev/null';
        $out = shell_exec($cmd);

        return trim((string) ($out ?? ''));
    }

    private function isAdmin(string $userId): bool
    {
        $user = DB::selectOne('SELECT is_admin FROM users WHERE id = ? LIMIT 1', [$userId]);

        return $user ? filter_var($user->is_admin ?? false, FILTER_VALIDATE_BOOLEAN) : false;
    }

    private function zerarSenhaEffective(string $userId): string
    {
        if (! Schema::hasTable('finance_zerar_senha')) {
            return '1212';
        }
        $row = DB::selectOne('SELECT senha FROM finance_zerar_senha WHERE user_id = ? LIMIT 1', [$userId]);

        return ($row && $row->senha !== null && $row->senha !== '') ? (string) $row->senha : '1212';
    }

    private function verifyZerarSenha(string $userId, string $senha): bool
    {
        return $this->zerarSenhaEffective($userId) === (string) $senha;
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    private function ok(mixed $data, ?string $message = null, int $status = 200): array
    {
        return [
            'status' => $status,
            'body' => [
                'success' => true,
                'data' => $data,
                'error' => null,
                'message' => $message,
            ],
        ];
    }

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    private function fail(string $message, int $status): array
    {
        return [
            'status' => $status,
            'body' => [
                'success' => false,
                'data' => null,
                'error' => $message,
                'message' => $message,
            ],
        ];
    }
}
