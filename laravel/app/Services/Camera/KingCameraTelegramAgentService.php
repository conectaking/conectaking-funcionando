<?php

namespace App\Services\Camera;

use App\Models\KingCamera;
use App\Models\KingCameraEvent;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class KingCameraTelegramAgentService
{
    public function __construct(
        private readonly KingCameraService $cameraService,
    ) {
    }

    public function getBotToken(): string
    {
        return trim((string) (env('TELEGRAM_CAMERA_BOT_TOKEN') ?: env('TELEGRAM_BOT_TOKEN') ?: ''));
    }

    public function getBotUsername(): string
    {
        return trim((string) (env('TELEGRAM_CAMERA_BOT_USERNAME') ?: 'ConectaKingCameraBot'));
    }

    /**
     * Envia um alerta com snapshot (foto) e botões interativos no Telegram.
     */
    public function sendAlert(KingCamera $camera, string $eventType, string $description, ?string $jpegBinary = null): bool
    {
        $token = $this->getBotToken();
        $chatId = $camera->telegram_chat_id;

        if ($token === '' || ! $chatId || ! $camera->telegram_alerts_enabled) {
            return false;
        }

        // Se não tiver foto fornecida, tenta capturar um snapshot instantâneo do go2rtc
        if ($jpegBinary === null || $jpegBinary === '') {
            $jpegBinary = $this->cameraService->getSnapshot($camera);
        }

        $nowStr = now()->setTimezone('America/Sao_Paulo')->format('d/m/Y H:i:s');
        $caption = "⚠️ <b>ALERTA KING CÂMERA</b>\n"
                 . "📹 <b>Câmera:</b> {$camera->name}\n"
                 . "📍 <b>Cômodo:</b> " . ($camera->room ?: 'Geral') . "\n"
                 . "🕒 <b>Horário:</b> {$nowStr}\n"
                 . "🔍 <b>Evento:</b> {$description}\n";

        $webUrl = "https://www.conectaking.com.br/kingCamera";
        $keyboard = [
            'inline_keyboard' => [
                [
                    ['text' => '🎥 Abrir Câmera ao Vivo', 'url' => $webUrl],
                    ['text' => '📸 Tirar Nova Foto', 'callback_data' => "snap_{$camera->id}"],
                ],
                [
                    ['text' => '🔕 Silenciar 30 min', 'callback_data' => "mute_{$camera->id}_30"],
                ],
            ],
        ];

        try {
            if ($jpegBinary) {
                $res = Http::timeout(10)->attach(
                    'photo',
                    $jpegBinary,
                    'snapshot.jpg',
                    ['Content-Type' => 'image/jpeg']
                )->post("https://api.telegram.org/bot{$token}/sendPhoto", [
                    'chat_id' => $chatId,
                    'caption' => $caption,
                    'parse_mode' => 'HTML',
                    'reply_markup' => json_encode($keyboard),
                ]);
            } else {
                $res = Http::timeout(5)->post("https://api.telegram.org/bot{$token}/sendMessage", [
                    'chat_id' => $chatId,
                    'text' => $caption,
                    'parse_mode' => 'HTML',
                    'reply_markup' => json_encode($keyboard),
                ]);
            }

            if ($res->successful()) {
                KingCameraEvent::create([
                    'camera_id' => $camera->id,
                    'user_id' => (string) $camera->user_id,
                    'event_type' => $eventType,
                    'description' => $description,
                    'notified_telegram' => true,
                ]);
                $camera->update(['last_event_at' => now()]);
                return true;
            }

            Log::warning('ks.camera.telegramAlert.failed', ['response' => $res->body()]);
        } catch (\Throwable $e) {
            Log::error('ks.camera.telegramAlert.error', ['error' => $e->getMessage()]);
        }

        return false;
    }

    /**
     * Processa comandos e botões enviados pelo usuário no Telegram.
     */
    public function handleWebhook(array $update): array
    {
        $token = $this->getBotToken();
        if ($token === '') {
            return ['status' => 'no_token'];
        }

        // 1. Tratamento de clique em botão (Callback Query)
        if (isset($update['callback_query'])) {
            $cq = $update['callback_query'];
            $cqId = $cq['id'];
            $fromId = (string) $cq['from']['id'];
            $data = $cq['data'] ?? '';

            if (str_starts_with($data, 'snap_')) {
                $camId = (int) substr($data, 5);
                $camera = KingCamera::find($camId);
                if ($camera) {
                    $snap = $this->cameraService->getSnapshot($camera);
                    if ($snap) {
                        Http::timeout(10)->attach('photo', $snap, 'snap.jpg')->post("https://api.telegram.org/bot{$token}/sendPhoto", [
                            'chat_id' => $fromId,
                            'caption' => "📸 <b>Foto Atualizada:</b> {$camera->name} (" . now()->format('H:i:s') . ")",
                            'parse_mode' => 'HTML',
                        ]);
                    }
                }
            } elseif (str_starts_with($data, 'mute_')) {
                // Silenciar alertas
                $parts = explode('_', $data);
                $camId = (int) ($parts[1] ?? 0);
                $minutes = (int) ($parts[2] ?? 30);
                $camera = KingCamera::find($camId);
                if ($camera) {
                    $camera->update(['telegram_alerts_enabled' => false]);
                    // Reativa após X minutos via cache/queue
                    cache()->put("camera_mute_{$camera->id}", true, now()->addMinutes($minutes));
                    Http::timeout(5)->post("https://api.telegram.org/bot{$token}/sendMessage", [
                        'chat_id' => $fromId,
                        'text' => "🔕 Alertas da câmera <b>{$camera->name}</b> pausados por {$minutes} minutos.",
                        'parse_mode' => 'HTML',
                    ]);
                }
            }

            Http::timeout(3)->post("https://api.telegram.org/bot{$token}/answerCallbackQuery", [
                'callback_query_id' => $cqId,
            ]);
            return ['status' => 'callback_handled'];
        }

        // 2. Tratamento de Mensagens de Texto / Comandos
        $msg = $update['message'] ?? null;
        if (! $msg) {
            return ['status' => 'ignored'];
        }

        $chatId = (string) ($msg['chat']['id'] ?? '');
        $text = trim((string) ($msg['text'] ?? ''));

        // Comando /start vinculando usuário
        if (str_starts_with($text, '/start')) {
            $parts = explode(' ', $text);
            $tokenParam = $parts[1] ?? '';
            
            if (str_starts_with($tokenParam, 'user_')) {
                $userId = substr($tokenParam, 5);
                // Vincula este Telegram a todas as câmeras do usuário
                KingCamera::where('user_id', $userId)->update(['telegram_chat_id' => $chatId]);
                
                $reply = "👋 <b>Olá! Agente King Câmera Conectado com Sucesso!</b>\n\n"
                       . "A partir de agora você receberá alertas em tempo real aqui com fotos instantâneas sempre que houver movimento ou choro no quarto do bebê.\n\n"
                       . "Comandos disponíveis:\n"
                       . "• /status - Ver estado das câmeras\n"
                       . "• /foto - Receber foto em tempo real\n"
                       . "• /ajuda - Informações de uso";
            } else {
                $reply = "👋 Olá! Sou o <b>Agente King Câmera</b>.\n\nPara vincular suas câmeras a este bot, acesse o painel Conecta King e clique no botão 'Conectar Telegram'.";
            }

            Http::timeout(5)->post("https://api.telegram.org/bot{$token}/sendMessage", [
                'chat_id' => $chatId,
                'text' => $reply,
                'parse_mode' => 'HTML',
            ]);
            return ['status' => 'start_handled'];
        }

        // Comando /status
        if ($text === '/status') {
            $cameras = KingCamera::where('telegram_chat_id', $chatId)->get();
            if ($cameras->isEmpty()) {
                $reply = "Você ainda não possui câmeras vinculadas a este Telegram.";
            } else {
                $reply = "📊 <b>Status das Câmeras:</b>\n\n";
                foreach ($cameras as $c) {
                    $st = ($c->status === 'online') ? '🟢 Online' : '🔴 Offline';
                    $reply .= "• <b>{$c->name}</b> ({$c->room}): {$st}\n";
                }
            }

            Http::timeout(5)->post("https://api.telegram.org/bot{$token}/sendMessage", [
                'chat_id' => $chatId,
                'text' => $reply,
                'parse_mode' => 'HTML',
            ]);
            return ['status' => 'status_handled'];
        }

        // Comando /foto
        if (str_starts_with($text, '/foto')) {
            $camera = KingCamera::where('telegram_chat_id', $chatId)->first();
            if (! $camera) {
                $reply = "Nenhuma câmera ativa encontrada para capturar foto.";
                Http::timeout(5)->post("https://api.telegram.org/bot{$token}/sendMessage", [
                    'chat_id' => $chatId,
                    'text' => $reply,
                ]);
            } else {
                $snap = $this->cameraService->getSnapshot($camera);
                if ($snap) {
                    Http::timeout(10)->attach('photo', $snap, 'snap.jpg')->post("https://api.telegram.org/bot{$token}/sendPhoto", [
                        'chat_id' => $chatId,
                        'caption' => "📸 <b>Snapshot:</b> {$camera->name} (" . now()->format('H:i:s') . ")",
                        'parse_mode' => 'HTML',
                    ]);
                } else {
                    Http::timeout(5)->post("https://api.telegram.org/bot{$token}/sendMessage", [
                        'chat_id' => $chatId,
                        'text' => "⚠️ Não foi possível obter imagem da câmera no momento. Verifique a conexão.",
                    ]);
                }
            }
            return ['status' => 'foto_handled'];
        }

        return ['status' => 'ok'];
    }
}
