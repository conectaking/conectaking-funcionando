<?php

namespace App\Services\Finance;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Envia alertas e lembretes proativos de Gestão Financeira exclusivamente via Agente King Finanças (@king_financas_bot).
 * - Lembretes de contas a vencer nos prazos: 7 dias antes, 3 dias antes, 1 dia antes e no dia do vencimento.
 * - Alerta de contas em atraso que permanecem pendentes.
 */
class FinanceNotificationService
{
    /**
     * Notifica o gestor sobre contas a vencer nos prazos definidos:
     * - 7 dias antes
     * - 3 dias antes
     * - 1 dia antes
     * - No dia (Hoje)
     * - Contas atrasadas pendentes
     *
     * @param  int|null  $customDaysAhead  Se informado, busca até N dias à frente
     * @return array{users_notified:int, total_bills:int, total_amount:float}
     */
    public function notifyUpcomingDueBills(?int $customDaysAhead = null): array
    {
        $today = now()->format('Y-m-d');
        $date1 = now()->addDays(1)->format('Y-m-d');
        $date3 = now()->addDays(3)->format('Y-m-d');
        $date7 = now()->addDays(7)->format('Y-m-d');
        $overdueLimit = now()->subDays(30)->format('Y-m-d');

        if ($customDaysAhead !== null && $customDaysAhead > 0) {
            $maxDate = now()->addDays($customDaysAhead)->format('Y-m-d');
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
            $rows = DB::select($sql, [$overdueLimit, $maxDate]);
        } else {
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
                      AND (
                          t.transaction_date IN (?, ?, ?, ?)
                          OR (t.transaction_date < ?::date AND t.transaction_date >= ?::date)
                      )
                    ORDER BY t.transaction_date ASC, t.amount DESC";
            $rows = DB::select($sql, [$today, $date1, $date3, $date7, $today, $overdueLimit]);
        }

        if (empty($rows)) {
            return ['users_notified' => 0, 'total_bills' => 0, 'total_amount' => 0.0];
        }

        // Agrupar por usuário
        $byUser = [];
        $totalBills = 0;
        $totalAmount = 0.0;

        foreach ($rows as $row) {
            $uid = (string) $row->user_id;
            if (! isset($byUser[$uid])) {
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
                $this->sendUserDueBillsAlert($userGroup, $today, $date1, $date3, $date7);
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
     * Envia mensagem formatada no Telegram pelo bot King Finanças (@king_financas_bot).
     */
    private function sendUserDueBillsAlert(array $userGroup, string $today, string $date1, string $date3, string $date7): void
    {
        $bills = $userGroup['bills'];
        $userTotal = 0.0;

        $groups = [
            'hoje'      => [],
            'amanha'    => [],
            '3dias'     => [],
            '7dias'     => [],
            'atrasadas' => [],
            'outras'    => [],
        ];

        foreach ($bills as $b) {
            $venc = (string) $b->transaction_date;
            $amt = (float) $b->amount;
            $userTotal += $amt;
            $valFmt = number_format($amt, 2, ',', '.');
            $desc = trim((string) ($b->description ?: $b->category_name ?: 'Conta'));

            if ($venc < $today) {
                $dtFmt = date('d/m', strtotime($venc));
                $groups['atrasadas'][] = "• *{$desc}* (Venceu em {$dtFmt}) — R$ {$valFmt}";
            } elseif ($venc === $today) {
                $groups['hoje'][] = "• *{$desc}* — R$ {$valFmt}";
            } elseif ($venc === $date1) {
                $groups['amanha'][] = "• *{$desc}* — R$ {$valFmt}";
            } elseif ($venc === $date3) {
                $dtFmt = date('d/m', strtotime($venc));
                $groups['3dias'][] = "• *{$desc}* ({$dtFmt}) — R$ {$valFmt}";
            } elseif ($venc === $date7) {
                $dtFmt = date('d/m', strtotime($venc));
                $groups['7dias'][] = "• *{$desc}* ({$dtFmt}) — R$ {$valFmt}";
            } else {
                $dtFmt = date('d/m', strtotime($venc));
                $groups['outras'][] = "• *{$desc}* ({$dtFmt}) — R$ {$valFmt}";
            }
        }

        $sections = [];

        if (! empty($groups['hoje'])) {
            $sections[] = "🚨 *VENCE HOJE (" . date('d/m', strtotime($today)) . "):*\n" . implode("\n", $groups['hoje']);
        }

        if (! empty($groups['amanha'])) {
            $sections[] = "⚠️ *Vence amanhã (1 dia antes):*\n" . implode("\n", $groups['amanha']);
        }

        if (! empty($groups['3dias'])) {
            $sections[] = "🗓️ *Vence em 3 dias (" . date('d/m', strtotime($date3)) . "):*\n" . implode("\n", $groups['3dias']);
        }

        if (! empty($groups['7dias'])) {
            $sections[] = "🗓️ *Vence em 7 dias (" . date('d/m', strtotime($date7)) . "):*\n" . implode("\n", $groups['7dias']);
        }

        if (! empty($groups['atrasadas'])) {
            $sections[] = "⚠️ *Contas em atraso (pendentes):*\n" . implode("\n", $groups['atrasadas']);
        }

        if (! empty($groups['outras'])) {
            $sections[] = "📋 *Outros vencimentos próximos:*\n" . implode("\n", $groups['outras']);
        }

        $totalFmt = number_format($userTotal, 2, ',', '.');
        $count = count($bills);
        $greetingName = $userGroup['user_name'] ? "Olá, *{$userGroup['user_name']}*!" : 'Olá, Gestor!';

        $message = "👑 *Agente King Finanças — Alerta de Contas a Vencer* 📊\n\n"
            . "{$greetingName} Você tem *{$count} conta(s)* com atenção programada:\n\n"
            . implode("\n\n", $sections) . "\n\n"
            . "💰 *Total a pagar:* *R$ {$totalFmt}*\n\n"
            . "👉 Acesse o seu painel financeiro para dar baixa ou programar o pagamento.";

        // 1. Envio Direto via Agente King Finanças (@king_financas_bot)
        $this->sendTelegramKingFinancas($message);

        // 2. Webhook opcional exclusivo do King Finanças (se configurado)
        $this->sendViaWebhook($message, $userGroup['notification_phone'], $userGroup['profile_slug'], [
            'type'         => 'finance_due_bills_reminder',
            'bills_count'  => $count,
            'total_amount' => $userTotal,
        ]);
    }

    /**
     * Envia mensagem direta para o Telegram usando o bot Agente King Finanças (@king_financas_bot).
     */
    private function sendTelegramKingFinancas(string $message, ?string $chatId = null): bool
    {
        $token = trim((string) env('TELEGRAM_FINANCE_BOT_TOKEN', '9161166306:AAH8e5zFO-R4XxMJrLGi2Q7Ncf-WKwLHbPA'));
        $targetChat = trim((string) ($chatId ?: env('TELEGRAM_FINANCE_ADMIN_CHAT_ID', '78792434')));

        if ($token === '' || $targetChat === '') {
            return false;
        }

        try {
            $resp = Http::timeout(8)->post("https://api.telegram.org/bot{$token}/sendMessage", [
                'chat_id'                  => $targetChat,
                'text'                     => $message,
                'parse_mode'               => 'Markdown',
                'disable_web_page_preview' => true,
            ]);

            return $resp->successful();
        } catch (\Throwable $e) {
            Log::warning('finance.telegram_king_financas.failed', ['error' => $e->getMessage()]);

            return false;
        }
    }

    /**
     * Dispara notificação via webhook exclusivo do King Finanças (se configurado).
     * NUNCA envia para CK_AGENT_ALERT_WEBHOOK para preservar a exclusividade do Agente King.
     */
    private function sendViaWebhook(string $message, string $ownerPhone, string $ownerSlug, array $extra = []): void
    {
        $url = trim((string) env('CK_FINANCE_NOTIFICATION_WEBHOOK', ''));
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
