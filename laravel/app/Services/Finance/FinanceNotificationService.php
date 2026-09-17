<?php

namespace App\Services\Finance;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Envia alertas e lembretes proativos de Gestão Financeira via Telegram (CK Agent / n8n).
 * - Lembretes de contas a vencer (hoje e próximos dias)
 * - Alerta de resumo diário financeiro
 */
class FinanceNotificationService
{
    /**
     * Notifica usuários sobre contas a vencer nos próximos dias (padrão: hoje até 3 dias à frente).
     * Retorna resumo com quantidade de usuários notificados e total de contas.
     *
     * @param  int  $daysAhead  Quantidade de dias à frente para verificar vencimento
     * @return array{users_notified:int, total_bills:int, total_amount:float}
     */
    public function notifyUpcomingDueBills(int $daysAhead = 3): array
    {
        $today = now()->format('Y-m-d');
        $maxDate = now()->addDays($daysAhead)->format('Y-m-d');

        // Busca despesas pendentes vencendo entre hoje e maxDate, agrupadas por usuário
        $sql = "SELECT
                    t.id,
                    t.user_id,
                    t.description,
                    t.amount,
                    t.transaction_date,
                    t.cost_center,
                    c.name AS category_name,
                    u.notification_phone,
                    u.profile_slug,
                    u.name AS user_name
                FROM finance_transactions t
                INNER JOIN users u ON u.id = t.user_id
                LEFT JOIN finance_categories c ON c.id = t.category_id
                WHERE t.type = 'EXPENSE'
                  AND t.status = 'PENDING'
                  AND t.transaction_date >= ?::date
                  AND t.transaction_date <= ?::date
                ORDER BY t.transaction_date ASC, t.amount DESC";

        $rows = DB::select($sql, [$today, $maxDate]);

        if (empty($rows)) {
            return ['users_notified' => 0, 'total_bills' => 0, 'total_amount' => 0.0];
        }

        // Agrupar por usuário
        $byUser = [];
        $totalBills = 0;
        $totalAmount = 0.0;

        foreach ($rows as $row) {
            $uid = (string) $row->user_id;
            if (!isset($byUser[$uid])) {
                $byUser[$uid] = [
                    'user_id'            => $uid,
                    'user_name'          => (string) ($row->user_name ?: 'Gestor'),
                    'notification_phone' => (string) ($row->notification_phone ?: ''),
                    'profile_slug'       => (string) ($row->profile_slug ?: ''),
                    'bills'              => [],
                ];
            }
            $byUser[$uid]['bills'][] = $row;
            $totalBills++;
            $totalAmount += (float) $row->amount;
        }

        $usersNotified = 0;

        foreach ($byUser as $userGroup) {
            try {
                $this->sendUserDueBillsAlert($userGroup, $today);
                $usersNotified++;
            } catch (\Throwable $e) {
                Log::warning('finance.notifyDueBills.user_failed', [
                    'user_id' => $userGroup['user_id'],
                    'error'   => $e->getMessage(),
                ]);
            }
        }

        return [
            'users_notified' => $usersNotified,
            'total_bills'    => $totalBills,
            'total_amount'   => $totalAmount,
        ];
    }

    /**
     * Envia mensagem formatada no Telegram para um usuário com sua lista de contas a vencer.
     */
    private function sendUserDueBillsAlert(array $userGroup, string $today): void
    {
        $bills = $userGroup['bills'];
        $userTotal = 0.0;
        $lines = [];

        foreach ($bills as $b) {
            $venc = $b->transaction_date;
            $valFmt = number_format((float) $b->amount, 2, ',', '.');
            $desc = trim((string) ($b->description ?: $b->category_name ?: 'Conta'));
            
            // Destaque se vence hoje ou nos próximos dias
            $badge = ($venc === $today) ? '⚠️ *HOJE*' : '🗓️ ' . date('d/m', strtotime($venc));

            $lines[] = "• {$badge}: *{$desc}* — R$ {$valFmt}";
            $userTotal += (float) $b->amount;
        }

        $totalFmt = number_format($userTotal, 2, ',', '.');
        $count = count($bills);
        $greetingName = $userGroup['user_name'] ? "Olá, *{$userGroup['user_name']}*!" : 'Atenção!';

        $message = "💳 *Lembrete Conecta King — Contas a Vencer*\n\n"
            . "{$greetingName} Você tem *{$count} conta(s)* a vencer nos próximos dias:\n\n"
            . implode("\n", $lines) . "\n\n"
            . "💰 *Total a pagar:* R$ {$totalFmt}\n\n"
            . "👉 Acesse o seu painel financeiro para dar baixa ou programar o pagamento.";

        $this->sendViaWebhook($message, $userGroup['notification_phone'], $userGroup['profile_slug'], [
            'type'         => 'finance_due_bills_reminder',
            'bills_count'  => $count,
            'total_amount' => $userTotal,
        ]);
    }

    /**
     * Dispara notificação via webhook do CK Agent (n8n) ou fallback geral.
     */
    private function sendViaWebhook(string $message, string $ownerPhone, string $ownerSlug, array $extra = []): void
    {
        $url = trim((string) env('CK_FINANCE_NOTIFICATION_WEBHOOK', env('CK_AGENT_ALERT_WEBHOOK', '')));
        if ($url === '') {
            return;
        }

        $secret = trim((string) env('CK_SENTRY_WEBHOOK_SECRET', ''));
        $payload = json_encode(array_merge([
            'type'        => 'finance_due_bills_reminder',
            'message'     => $message,
            'owner_phone' => $ownerPhone,
            'owner_slug'  => $ownerSlug,
            'secret'      => $secret,
        ], $extra), JSON_UNESCAPED_UNICODE);

        $headers = "Content-Type: application/json\r\n";
        if ($secret !== '') {
            $headers .= 'X-Ck-Secret: ' . $secret . "\r\n";
        }

        $ctx = stream_context_create([
            'http' => [
                'method'           => 'POST',
                'header'           => $headers,
                'content'          => $payload,
                'timeout'          => 4,
                'ignore_errors'    => true,
            ],
        ]);

        @file_get_contents($url, false, $ctx);
    }
}
