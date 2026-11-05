<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Envia notificações instantâneas no Telegram através do Agente King (@conectaking_bot)
 * quando um cliente finaliza a seleção de fotos ou envia comprovante PIX no King Selection.
 */
class KingSelectionNotificationService
{
    /**
     * Dispara notificação de seleção concluída para o fotógrafo / gestor no Telegram via Agente King.
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
                    g.profile_item_id,
                    g.cliente_nome,
                    g.cliente_email,
                    g.cliente_telefone,
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

            if (! $info) {
                return;
            }

            $projectName = trim((string) ($info->nome_projeto ?? 'Galeria'));
            $ownerPhone  = trim((string) ($info->notification_phone ?? ''));
            $ownerSlug   = trim((string) ($info->profile_slug ?? ''));
            $profileItemId = (int) ($info->profile_item_id ?? 3);

            $resolvedName = trim((string) ($clientName ?: $info->cliente_nome ?: 'Cliente'));
            $resolvedEmail = trim((string) ($clientEmail ?: $info->cliente_email ?: 'Não informado'));
            $resolvedPhone = trim((string) ($clientPhone ?: $info->cliente_telefone ?: ''));

            $nameStr  = "👤 *Cliente:* {$resolvedName}\n";
            $emailStr = "📧 *E-mail:* {$resolvedEmail}\n";
            $phoneStr = $resolvedPhone !== '' ? "📱 *WhatsApp:* {$resolvedPhone}\n" : '';
            $fbStr    = ($feedback && trim($feedback) !== '')
                ? "💬 *Mensagem do cliente:*\n\"" . trim($feedback) . "\"\n"
                : '';

            $panelUrl = "https://www.conectaking.com.br/kingSelection?itemId={$profileItemId}&galleryId={$galleryId}";

            $message = "👑 *Agente King — Seleção Concluída no King Selection!* 📸\n\n"
                . "O cliente *{$resolvedName}* ({$resolvedEmail}) confirmou a seleção de fotos!\n\n"
                . "📁 *Projeto:* {$projectName}\n"
                . "🖼️ *Fotos Selecionadas:* *{$selectedCount} foto(s)*\n"
                . $nameStr
                . $emailStr
                . $phoneStr
                . ($fbStr ? "\n" . $fbStr : '')
                . "\n✅ *Já está ok!* Acesse o painel para conferir as fotos:\n"
                . "👉 {$panelUrl}";

            // 1. Envio Direto via Agente King (@conectaking_bot)
            $this->sendTelegramAgenteKing($message);

            // 2. Webhook opcional para n8n (caso configurado)
            $this->sendViaWebhook($message, $ownerPhone, $ownerSlug, [
                'type'            => 'king_selection_finalized',
                'event'           => 'king_selection_finalized',
                'level'           => 'INFO',
                'title'           => '📸 Seleção Concluída no King Selection!',
                'gallery_id'      => $galleryId,
                'project_name'    => $projectName,
                'client_name'     => $resolvedName,
                'client_email'    => $resolvedEmail,
                'selection_count' => $selectedCount,
                'panel_url'       => $panelUrl,
            ]);
        } catch (\Throwable $e) {
            Log::warning('kingselection.notification.failed', [
                'gallery_id' => $galleryId,
                'error'      => $e->getMessage(),
            ]);
        }
    }

    /**
     * Dispara notificação de comprovante PIX enviado para o fotógrafo via Agente King.
     */
    public function notifyPaymentProofUploaded(
        int $galleryId,
        ?string $clientName,
        ?string $clientPhone,
        ?string $clientEmail,
        int $amountCents,
        ?string $note = null
    ): void {
        try {
            $info = DB::selectOne(
                "SELECT
                    g.id AS gallery_id,
                    g.nome_projeto,
                    g.slug AS gallery_slug,
                    g.profile_item_id,
                    g.cliente_nome,
                    g.cliente_email,
                    g.cliente_telefone,
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

            if (! $info) {
                return;
            }

            $projectName = trim((string) ($info->nome_projeto ?? 'Galeria'));
            $ownerPhone  = trim((string) ($info->notification_phone ?? ''));
            $ownerSlug   = trim((string) ($info->profile_slug ?? ''));
            $profileItemId = (int) ($info->profile_item_id ?? 3);

            $resolvedName = trim((string) ($clientName ?: $info->cliente_nome ?: 'Cliente'));
            $resolvedEmail = trim((string) ($clientEmail ?: $info->cliente_email ?: 'Não informado'));
            $resolvedPhone = trim((string) ($clientPhone ?: $info->cliente_telefone ?: ''));
            $valStr = $amountCents > 0
                ? "💵 *Valor:* R$ " . number_format($amountCents / 100, 2, ',', '.') . "\n"
                : '';
            $noteStr = ($note && trim($note) !== '')
                ? "📝 *Nota do cliente:*\n\"" . trim($note) . "\"\n"
                : '';

            $panelUrl = "https://www.conectaking.com.br/kingSelection?itemId={$profileItemId}&galleryId={$galleryId}";

            $message = "👑 *Agente King — Novo Comprovante PIX no King Selection!* 💰\n\n"
                . "O cliente *{$resolvedName}* ({$resolvedEmail}) enviou um comprovante de pagamento!\n\n"
                . "📁 *Projeto:* {$projectName}\n"
                . $valStr
                . "👤 *Cliente:* {$resolvedName}\n"
                . "📧 *E-mail:* {$resolvedEmail}\n"
                . ($resolvedPhone !== '' ? "📱 *WhatsApp:* {$resolvedPhone}\n" : '')
                . ($noteStr ? "\n" . $noteStr : '')
                . "\n🔍 Acesse a aba *Fotos vendidas* no painel para conferir o comprovante e liberar o download:\n"
                . "👉 {$panelUrl}";

            // 1. Envio Direto via Agente King (@conectaking_bot)
            $this->sendTelegramAgenteKing($message);

            // 2. Webhook opcional
            $this->sendViaWebhook($message, $ownerPhone, $ownerSlug, [
                'type'         => 'king_selection_payment_proof',
                'event'        => 'king_selection_payment_proof',
                'level'        => 'INFO',
                'title'        => '💰 Comprovante PIX no King Selection!',
                'gallery_id'   => $galleryId,
                'project_name' => $projectName,
                'client_name'  => $resolvedName,
                'amount_cents' => $amountCents,
                'panel_url'    => $panelUrl,
            ]);
        } catch (\Throwable $e) {
            Log::warning('kingselection.notification.payment_proof_failed', [
                'gallery_id' => $galleryId,
                'error'      => $e->getMessage(),
            ]);
        }
    }

    /**
     * Envia mensagem direta para o Telegram usando o bot Agente King (@conectaking_bot).
     */
    private function sendTelegramAgenteKing(string $message, ?string $chatId = null): bool
    {
        $token = trim((string) env('TELEGRAM_BOT_TOKEN', '8871691156:AAGir9vNUOeukdbtFctvLbi8u2BCe95FgJw'));
        $targetChat = trim((string) ($chatId ?: env('TELEGRAM_ADMIN_CHAT_ID', '78792434')));

        if ($token === '' || $targetChat === '') {
            return false;
        }

        try {
            $resp = Http::timeout(8)->post("https://api.telegram.org/bot{$token}/sendMessage", [
                'chat_id'                  => $targetChat,
                'text'                     => $message,
                'parse_mode'               => 'Markdown',
                'disable_web_page_preview' => false,
            ]);

            return $resp->successful();
        } catch (\Throwable $e) {
            Log::warning('kingselection.telegram_agente_king.failed', ['error' => $e->getMessage()]);

            return false;
        }
    }

    /**
     * Envia via webhook se configurado explicitamente.
     */
    private function sendViaWebhook(string $message, string $ownerPhone, string $ownerSlug, array $extra = []): void
    {
        $url = trim((string) env('CK_SELECTION_NOTIFICATION_WEBHOOK', ''));
        if ($url === '') {
            return;
        }

        $secret = trim((string) env('CK_SENTRY_WEBHOOK_SECRET', ''));
        $payload = json_encode(array_merge([
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
