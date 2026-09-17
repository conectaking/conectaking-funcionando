<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Envia notificações instantâneas no Telegram quando um cliente finaliza
 * a seleção de fotos em uma galeria do King Selection.
 *
 * Utiliza o webhook do CK Agent (n8n) no mesmo padrão do OpsAlertService.
 */
class KingSelectionNotificationService
{
    /**
     * Dispara notificação de seleção concluída para o fotógrafo dono da galeria.
     */
    public function notifySelectionFinalized(
        int $galleryId,
        ?string $clientName,
        ?string $clientPhone,
        ?string $clientEmail,
        int $selectedCount,
        ?string $feedback = null
    ): void {
        try {
            $info = DB::selectOne(
                "SELECT
                    g.id AS gallery_id,
                    g.nome_projeto,
                    g.slug AS gallery_slug,
                    u.id AS owner_id,
                    u.name AS owner_name,
                    u.profile_slug,
                    u.notification_phone,
                    u.notification_email
                 FROM king_galleries g
                 INNER JOIN profile_items pi ON pi.id = g.profile_item_id
                 INNER JOIN users u ON u.id = pi.user_id
                 WHERE g.id = ?
                 LIMIT 1",
                [$galleryId]
            );

            if (!$info) {
                return;
            }

            $projectName = trim((string) ($info->nome_projeto ?? 'Galeria'));
            $ownerPhone  = trim((string) ($info->notification_phone ?? ''));
            $ownerSlug   = trim((string) ($info->profile_slug ?? ''));

            $nameStr  = $clientName  ? "👤 *Cliente:* " . $clientName  . "\n" : '';
            $phoneStr = $clientPhone ? "📱 *WhatsApp:* " . $clientPhone . "\n" : '';
            $emailStr = $clientEmail ? "📧 *Email:* " . $clientEmail . "\n"    : '';
            $fbStr    = ($feedback && trim($feedback) !== '')
                ? "💬 *Mensagem do cliente:*\n\"" . trim($feedback) . "\"\n"
                : '';

            $message = "📸 *Seleção Concluída no King Selection!*\n\n"
                . "📁 *Projeto:* {$projectName}\n"
                . $nameStr
                . $phoneStr
                . $emailStr
                . "🖼️ *Fotos Selecionadas:* {$selectedCount} foto(s)\n"
                . ($fbStr ? "\n" . $fbStr : '')
                . "\n✅ Acesse o painel do Conecta King para revisar a seleção!";

            $this->sendViaWebhook($message, $ownerPhone, $ownerSlug, [
                'gallery_id'      => $galleryId,
                'project_name'    => $projectName,
                'client_name'     => $clientName,
                'selection_count' => $selectedCount,
            ]);
        } catch (\Throwable $e) {
            // Notificação é "best-effort" — nunca bloqueia a conclusão da seleção pelo cliente
            Log::warning('kingselection.notification.failed', [
                'gallery_id' => $galleryId,
                'error'      => $e->getMessage(),
            ]);
        }
    }

    /**
     * Envia via webhook CK Agent (n8n) → Telegram.
     */
    private function sendViaWebhook(string $message, string $ownerPhone, string $ownerSlug, array $extra = []): void
    {
        $url = trim((string) env('CK_SELECTION_NOTIFICATION_WEBHOOK', env('CK_AGENT_ALERT_WEBHOOK', '')));
        if ($url === '') {
            return;
        }

        $secret = trim((string) env('CK_SENTRY_WEBHOOK_SECRET', ''));
        $payload = json_encode(array_merge([
            'type'        => 'king_selection_finalized',
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
