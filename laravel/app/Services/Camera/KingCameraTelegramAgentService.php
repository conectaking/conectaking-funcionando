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
        return trim((string) env('TELEGRAM_CAMERA_BOT_TOKEN', ''));
    }

    public function getBotUsername(): string
    {
        return trim((string) env('TELEGRAM_CAMERA_BOT_USERNAME', 'kingcamera_oficial_bot'));
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
        $header = "⚠️ <b>ALERTA DE SEGURANÇA KING CÂMERA</b>";
        if ($eventType === 'adult_caregiver') {
            $header = "🍼 <b>ALERTA DE CUIDADO: PAI/MÃE JUNTO AO BERÇO!</b>\n<i>(Presença de adulto prestando assistência ao bebê)</i>";
        } elseif ($eventType === 'face_covered') {
            $header = "🚨 <b>ALERTA DE SEGURANÇA: ROSTINHO DO BEBÊ COBERTO!</b>\n<i>(Possível risco de sufocamento por pano ou cobertor)</i>";
        } elseif ($eventType === 'baby_cry') {
            $header = "😭 <b>ALERTA: CHORO DE BEBÊ DETECTADO!</b>\n<i>(Sensor acústico detectou choro no quarto)</i>";
        } elseif ($eventType === 'baby_stand') {
            $header = "🚨 <b>ALERTA: BEBÊ FICOU EM PÉ NO BERÇO!</b>\n<i>(Criança se levantou ou está apoiada nas grades)</i>";
        } elseif ($eventType === 'crib_fence' || $eventType === 'fence_breach') {
            if (str_contains($description, 'REFORÇO')) {
                $header = "⚠️ <b>REFORÇO: BEBÊ CONTINUA FORA DO CERCO!</b>\n<i>(Segundo aviso de confirmação)</i>";
            } elseif (stripos($description, 'Pé') !== false || stripos($description, 'perna') !== false) {
                $header = "🚨 <b>ALERTA: PÉ OU PERNA DO BEBÊ PASSOU DO CERCO!</b>\n<i>(Membro inferior ultrapassou o limite do berço)</i>";
            } elseif (stripos($description, 'Mão') !== false || stripos($description, 'braço') !== false) {
                $header = "🚨 <b>ALERTA: BRAÇO OU MÃO DO BEBÊ FORA DO CERCO!</b>\n<i>(Membro superior ultrapassou a área segura)</i>";
            } elseif (str_contains($description, 'ATENÇÃO') || str_contains($description, '2 minutos')) {
                $header = "⏳ <b>LEMBRETE: BEBÊ FORA DO CERCO HÁ MAIS DE 2 MIN!</b>\n<i>(Lembrete de segurança)</i>";
            } else {
                $header = "🚨 <b>ALERTA: BEBÊ SAIU DO CERCO SEGURO!</b>\n<i>(Criança fora da área demarcada do berço)</i>";
            }
        } elseif ($eventType === 'motion') {
            $header = "🏃 <b>ALERTA: MOVIMENTO DETECTADO!</b>";
        } elseif ($eventType === 'siren' || $eventType === 'siren_triggered') {
            $header = "🚨 <b>SIRENE DE PÂNICO DISPARADA!</b>";
        } elseif ($eventType === 'person') {
            $header = "👤 <b>PESSOA IDENTIFICADA NO AMBIENTE!</b>";
        }

        $caption = "{$header}\n\n"
                 . "📹 <b>Câmera:</b> {$camera->name}\n"
                 . "📍 <b>Cômodo:</b> " . ($camera->room ?: 'Geral') . "\n"
                 . "🕒 <b>Horário:</b> {$nowStr}\n"
                 . "🔍 <b>Detalhes:</b> {$description}\n";

        $pin = env('KING_CAMERA_PIN', 'King');
        $webUrl = "https://www.conectaking.com.br/kingCamera?pin={$pin}";
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
            $sent = false;

            if ($jpegBinary && strlen($jpegBinary) > 100) {
                try {
                    $res = Http::timeout(8)->attach(
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
                    if ($res->successful()) {
                        $sent = true;
                    } else {
                        Log::warning('ks.camera.telegramPhoto.failed', ['response' => $res->body()]);
                    }
                } catch (\Throwable $photoErr) {
                    Log::warning('ks.camera.telegramPhoto.error', ['msg' => $photoErr->getMessage()]);
                }
            }

            // Fallback garantido: se o envio da foto não foi realizado ou falhou, envia mensagem de texto com botões
            if (!$sent) {
                $res = Http::timeout(6)->post("https://api.telegram.org/bot{$token}/sendMessage", [
                    'chat_id' => $chatId,
                    'text' => $caption,
                    'parse_mode' => 'HTML',
                    'reply_markup' => json_encode($keyboard),
                ]);
                if ($res->successful()) {
                    $sent = true;
                } else {
                    Log::warning('ks.camera.telegramText.failed', ['response' => $res->body()]);
                }
            }

            if ($sent) {
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
        } catch (\Throwable $e) {
            Log::error('ks.camera.telegramAlert.error', ['error' => $e->getMessage()]);
        }

        return false;
    }

    public function getAgentSecurityPin(): string
    {
        return trim((string) (env('TELEGRAM_CAMERA_AGENT_PIN') ?: 'king2026'));
    }

    public function isChatAuthorized(string $chatId): bool
    {
        if ($chatId === '') {
            return false;
        }

        // 1. Autorizado via PIN em cache persistente
        if (\Illuminate\Support\Facades\Cache::get("kc_tg_auth_{$chatId}")) {
            return true;
        }

        // 2. Ou chat_id salvo na câmera
        return KingCamera::where('telegram_chat_id', $chatId)->exists();
    }

    public function authorizeChat(string $chatId): void
    {
        \Illuminate\Support\Facades\Cache::put("kc_tg_auth_{$chatId}", true, now()->addYears(2));
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

            // Bloqueio rigoroso: se o usuário não digitou a senha, ignora o clique!
            if (! $this->isChatAuthorized($fromId)) {
                Http::timeout(3)->post("https://api.telegram.org/bot{$token}/answerCallbackQuery", [
                    'callback_query_id' => $cqId,
                    'text' => '⛔ Acesso Negado! Digite a senha no chat primeiro.',
                    'show_alert' => true,
                ]);
                return ['status' => 'callback_unauthorized'];
            }

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

        $securityPin = $this->getAgentSecurityPin();
        $cleanedText = strtolower(trim($text));
        $cleanedPin = strtolower(trim($securityPin));

        // 2.1 Desbloqueio com a Senha de Segurança
        if ($cleanedText === $cleanedPin || str_starts_with($cleanedText, '/senha ' . $cleanedPin) || str_starts_with($cleanedText, '/pin ' . $cleanedPin)) {
            $this->authorizeChat($chatId);
            KingCamera::query()->update(['telegram_chat_id' => $chatId, 'telegram_alerts_enabled' => true]);

            $reply = "🔓 <b>SENHA CORRETA! ACESSO LIBERADO!</b>\n\n"
                   . "Seu Telegram (Chat ID: <code>{$chatId}</code>) foi autenticado com sucesso e vinculado às suas câmeras.\n"
                   . "Agora <b>somente você</b> tem autorização para receber alertas de segurança, fotos e comandar este robô!\n\n"
                   . "📋 <b>Comandos Disponíveis:</b>\n"
                   . "• <b>/foto</b> - Receber foto ao vivo da câmera\n"
                   . "• <b>/status</b> - Ver status das câmeras\n"
                   . "• <b>/bloquear</b> - Bloquear este dispositivo novamente";

            Http::timeout(5)->post("https://api.telegram.org/bot{$token}/sendMessage", [
                'chat_id' => $chatId,
                'text' => $reply,
                'parse_mode' => 'HTML',
            ]);
            return ['status' => 'authorized'];
        }

        // 2.2 Bloqueio para chats não autorizados
        if (! $this->isChatAuthorized($chatId)) {
            $reply = "🔒 <b>AGENTE PRIVADO KING CÂMERA</b>\n\n"
                   . "⛔ <b>Acesso Restrito:</b> Este robô de segurança é estritamente pessoal e protegido por senha.\n\n"
                   . "Para desbloquear o acesso às câmeras, digite a <b>senha de segurança</b>:";

            Http::timeout(5)->post("https://api.telegram.org/bot{$token}/sendMessage", [
                'chat_id' => $chatId,
                'text' => $reply,
                'parse_mode' => 'HTML',
            ]);
            return ['status' => 'unauthorized_blocked'];
        }

        // 2.3 Comando /bloquear
        if ($text === '/bloquear' || $text === '/sair') {
            \Illuminate\Support\Facades\Cache::forget("kc_tg_auth_{$chatId}");
            KingCamera::where('telegram_chat_id', $chatId)->update(['telegram_chat_id' => null]);
            Http::timeout(5)->post("https://api.telegram.org/bot{$token}/sendMessage", [
                'chat_id' => $chatId,
                'text' => "🔒 <b>Dispositivo Bloqueado com Sucesso!</b>\n\nPara voltar a usar este agente, você precisará enviar a senha de segurança novamente.",
                'parse_mode' => 'HTML',
            ]);
            return ['status' => 'locked'];
        }

        // 2.4 Comando /start
        if (str_starts_with($text, '/start')) {
            $reply = "👋 <b>Olá! Agente King Câmera Autenticado</b>\n\n"
                   . "Seu Telegram está vinculado com segurança às suas câmeras.\n\n"
                   . "• <b>/bebe</b> - Análise completa do bebê com IA em tempo real\n"
                   . "• <b>/foto</b> - Receber foto em tempo real\n"
                   . "• <b>/status</b> - Ver status das câmeras\n"
                   . "• <b>/bloquear</b> - Bloquear o acesso deste Telegram";

            Http::timeout(5)->post("https://api.telegram.org/bot{$token}/sendMessage", [
                'chat_id' => $chatId,
                'text' => $reply,
                'parse_mode' => 'HTML',
            ]);
            return ['status' => 'start_handled'];
        }

        // Comando /bebe ou perguntas naturais ("como tá o bebê", "ela tá dormindo", "neném", "berço")
        $isBabyQuery = str_starts_with($text, '/bebe')
            || str_starts_with($text, '/bebé')
            || str_starts_with($text, '/nenem')
            || str_starts_with($text, '/neném')
            || stripos($text, 'como tá') !== false
            || stripos($text, 'como esta') !== false
            || stripos($text, 'como está') !== false
            || stripos($text, 'bebe') !== false
            || stripos($text, 'bebê') !== false
            || stripos($text, 'nenem') !== false
            || stripos($text, 'neném') !== false
            || stripos($text, 'dormindo') !== false
            || stripos($text, 'berço') !== false
            || stripos($text, 'berco') !== false;

        if ($isBabyQuery) {
            $camera = KingCamera::where('telegram_chat_id', $chatId)->first();
            if (! $camera) {
                Http::timeout(5)->post("https://api.telegram.org/bot{$token}/sendMessage", [
                    'chat_id' => $chatId,
                    'text' => "Nenhuma câmera ativa encontrada para verificar o bebê.",
                ]);
                return ['status' => 'no_cam'];
            }

            $snap = $this->cameraService->getSnapshot($camera);
            if (! $snap) {
                Http::timeout(5)->post("https://api.telegram.org/bot{$token}/sendMessage", [
                    'chat_id' => $chatId,
                    'text' => "⚠️ Não foi possível obter imagem da câmera no momento para analisar o bebê.",
                ]);
                return ['status' => 'no_snap'];
            }

            /** @var KingCameraAiVisionService $aiVision */
            $aiVision = app(KingCameraAiVisionService::class);
            $ai = $aiVision->analyzeBabySafetySnapshot($snap, 'telegram_query');

            if ($ai['is_standing']) {
                $postureStr = '🚨 <b>Em pé na grade do berço</b>';
            } elseif ($ai['is_lying_down']) {
                $postureStr = '🛌 <b>Deitado(a) no colchão</b>';
            } else {
                $postureStr = '🧸 <b>No berço</b>';
            }

            $fenceStr = ($ai['is_limb_outside'] || $ai['is_baby_outside'])
                ? '⚠️ <b>Atenção: Parte do corpo fora da área segura</b>'
                : '✅ <b>100% protegido dentro do cerco</b>';

            $caregiverStr = $ai['adult_present']
                ? "🍼 <b>{$ai['adult_label']} presente ({$ai['adult_action']})</b>"
                : '🛡️ Nenhum adulto no berço no momento';

            $faceStr = $ai['is_face_covered']
                ? '⚠️ <b>ALERTA: Rostinho parece coberto!</b>'
                : '✅ <b>Vias respiratórias e rosto desobstruídos</b>';

            $caption = "👶 <b>SUPERVISÃO KING CÂMERA (IA ESPECIALISTA)</b>\n\n"
                     . "🔍 <b>Diagnóstico:</b> " . ($ai['description'] ?: 'Bebê no berço') . "\n\n"
                     . "• <b>Postura:</b> {$postureStr}\n"
                     . "• <b>Cerco Seguro:</b> {$fenceStr}\n"
                     . "• <b>Cuidador/Adulto:</b> {$caregiverStr}\n"
                     . "• <b>Respiração:</b> {$faceStr}\n\n"
                     . "📹 <i>Câmera {$camera->name} às " . now()->format('H:i:s') . "</i>";

            $pin = env('KING_CAMERA_PIN', 'King');
            $webUrl = "https://www.conectaking.com.br/kingCamera?pin={$pin}";
            $keyboard = [
                'inline_keyboard' => [
                    [
                        ['text' => '🎥 Abrir Câmera ao Vivo', 'url' => $webUrl],
                        ['text' => '📸 Atualizar Foto', 'callback_data' => "snap_{$camera->id}"],
                    ],
                ],
            ];

            Http::timeout(12)->attach('photo', $snap, 'bebe.jpg')->post("https://api.telegram.org/bot{$token}/sendPhoto", [
                'chat_id' => $chatId,
                'caption' => $caption,
                'parse_mode' => 'HTML',
                'reply_markup' => json_encode($keyboard),
            ]);

            return ['status' => 'bebe_query_handled'];
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

    /**
     * Alias para compatibilidade com KingCameraController.
     */
    public function handleWebhookUpdate(array $update): array
    {
        return $this->handleWebhook($update);
    }
}

