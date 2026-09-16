<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Envia notificações instantâneas no Telegram quando um novo lead/cliente
 * preenche um formulário King Forms.
 *
 * Usa o mesmo padrão do OpsAlertService: chama o webhook do CK Agent (n8n)
 * via HTTP rápido e não-bloqueante.
 */
class KingFormsNotificationService
{
    /**
     * Dispara notificação de novo formulário preenchido para o dono do item.
     *
     * @param  int  $profileItemId  ID do item (formulário)
     * @param  string|null  $responderName  Nome do cliente
     * @param  string|null  $responderPhone  Telefone/WhatsApp do cliente
     * @param  string|null  $responderEmail  E-mail do cliente
     */
    public function notifyNewFormResponse(
        int $profileItemId,
        ?string $responderName,
        ?string $responderPhone,
        ?string $responderEmail,
    ): void {
        try {
            // Busca informações do formulário e do dono
            $info = DB::selectOne(
                "SELECT
                    pi.title AS form_title,
                    u.id AS owner_id,
                    u.profile_slug,
                    u.notification_phone,
                    u.notification_email,
                    COALESCE(dfi.form_title, pi.title) AS form_display_title
                 FROM profile_items pi
                 INNER JOIN users u ON u.id = pi.user_id
                 LEFT JOIN digital_form_items dfi ON dfi.profile_item_id = pi.id
                 WHERE pi.id = ?
                 ORDER BY dfi.id DESC LIMIT 1",
                [$profileItemId]
            );

            if (!$info) {
                return;
            }

            $formTitle    = trim((string) ($info->form_display_title ?? $info->form_title ?? 'Formulário'));
            $ownerPhone   = trim((string) ($info->notification_phone ?? ''));
            $ownerSlug    = trim((string) ($info->profile_slug ?? ''));

            $clientName  = $responderName  ? "👤 *Cliente:* " . $responderName  . "\n" : '';
            $clientPhone = $responderPhone ? "📱 *WhatsApp:* " . $responderPhone . "\n" : '';
            $clientEmail = $responderEmail ? "📧 *Email:* " . $responderEmail . "\n"    : '';

            $message = "🔔 *Novo preenchimento no King Forms!*\n\n"
                . "📋 *Formulário:* {$formTitle}\n"
                . $clientName
                . $clientPhone
                . $clientEmail
                . "\n✅ Acesse o painel para ver todos os detalhes.";

            $this->sendViaWebhook($message, $ownerPhone, $ownerSlug);
        } catch (\Throwable $e) {
            // Notificação é "best-effort" — nunca deve quebrar o fluxo do formulário
            Log::warning('kingforms.notification.failed', [
                'item_id' => $profileItemId,
                'error'   => $e->getMessage(),
            ]);
        }
    }

    /**
     * Envia via webhook CK Agent (n8n) → Telegram.
     * Mesmo padrão do OpsAlertService::toAgentWebhook.
     */
    private function sendViaWebhook(string $message, string $ownerPhone, string $ownerSlug): void
    {
        $url = trim((string) env('CK_FORMS_NOTIFICATION_WEBHOOK', env('CK_AGENT_ALERT_WEBHOOK', '')));
        if ($url === '') {
            return;
        }

        $secret = trim((string) env('CK_SENTRY_WEBHOOK_SECRET', ''));
        $payload = json_encode([
            'type'        => 'king_forms_new_lead',
            'message'     => $message,
            'owner_phone' => $ownerPhone,
            'owner_slug'  => $ownerSlug,
            'secret'      => $secret,
        ], JSON_UNESCAPED_UNICODE);

        $headers = "Content-Type: application/json\r\n";
        if ($secret !== '') {
            $headers .= 'X-Ck-Secret: ' . $secret . "\r\n";
        }

        $ctx = stream_context_create([
            'http' => [
                'method'        => 'POST',
                'header'        => $headers,
                'content'       => $payload,
                'timeout'       => 3,
                'ignore_errors' => true,
            ],
        ]);

        @file_get_contents($url, false, $ctx);
    }
}
