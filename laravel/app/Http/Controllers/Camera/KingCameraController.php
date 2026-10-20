<?php

namespace App\Http\Controllers\Camera;

use App\Http\Controllers\Controller;
use App\Models\KingCamera;
use App\Models\KingCameraShare;
use App\Services\Account\ModulesService;
use App\Services\Camera\KingCameraService;
use App\Services\Camera\KingCameraTelegramAgentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class KingCameraController extends Controller
{
    public function __construct(
        private readonly KingCameraService $cameraService,
        private readonly KingCameraTelegramAgentService $telegramAgent,
        private readonly ModulesService $modulesService,
    ) {
    }

    /**
     * Lista todas as câmeras do usuário logado.
     * Se for a primeira vez do usuário, pré-provisiona a câmera piloto (Quarto Bebê).
     */
    public function index(Request $request): JsonResponse
    {
        $userId = (string) $request->attributes->get('auth_user_id', '');
        if ($userId === '') {
            return response()->json(['success' => false, 'message' => 'Não autorizado.'], 401);
        }

        $cameras = KingCamera::where('user_id', $userId)->orderBy('created_at', 'asc')->get();

        // Se o usuário não tiver nenhuma câmera ainda, cadastra automaticamente a câmera piloto
        if ($cameras->isEmpty()) {
            $sanitizedId = preg_replace('/[^a-zA-Z0-9]/', '', $userId);
            $pilot = KingCamera::create([
                'user_id' => $userId,
                'name' => 'Quarto Bebê',
                'room' => 'Quarto',
                'stream_id' => "cam_user_{$sanitizedId}_pilot",
                'ip_address' => '172.16.100.215',
                'port' => 554,
                'rtsp_path' => '/onvif1',
                'username' => 'admin',
                'password' => 'Playadryan22*',
                'telegram_alerts_enabled' => true,
                'telegram_chat_id' => '78792434',
                'status' => 'online',
            ]);

            // Registra no go2rtc
            $this->cameraService->syncStreamToGo2Rtc($pilot);

            $cameras = collect([$pilot]);
        }

        $botUsername = $this->telegramAgent->getBotUsername();
        $telegramDeepLink = "https://t.me/{$botUsername}?start=user_{$userId}";

        return response()->json([
            'success' => true,
            'data' => $cameras->map(fn (KingCamera $cam) => [
                'id' => $cam->id,
                'name' => $cam->name,
                'room' => $cam->room,
                'stream_id' => $cam->stream_id,
                'ip_address' => $cam->ip_address,
                'port' => $cam->port,
                'rtsp_path' => $cam->rtsp_path,
                'username' => $cam->username,
                'full_rtsp_url' => $cam->full_rtsp_url,
                'status' => $cam->status,
                'is_recording' => (bool) $cam->is_recording,
                'motion_detection_enabled' => (bool) $cam->motion_detection_enabled,
                'telegram_alerts_enabled' => (bool) $cam->telegram_alerts_enabled,
                'telegram_chat_id' => $cam->telegram_chat_id,
                'created_at' => $cam->created_at?->toIso8601String(),
            ]),
            'meta' => [
                'telegram_bot_username' => $botUsername,
                'telegram_deep_link' => $telegramDeepLink,
            ],
        ]);
    }

    /**
     * Cadastra uma nova câmera e a sincroniza com o go2rtc.
     */
    public function store(Request $request): JsonResponse
    {
        $userId = (string) $request->attributes->get('auth_user_id', '');
        if ($userId === '') {
            return response()->json(['success' => false, 'message' => 'Não autorizado.'], 401);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'room' => 'nullable|string|max:100',
            'ip_address' => 'required|string|max:100',
            'port' => 'nullable|integer|min:1|max:65535',
            'rtsp_path' => 'nullable|string|max:150',
            'username' => 'nullable|string|max:100',
            'password' => 'nullable|string|max:200',
            'telegram_chat_id' => 'nullable|string|max:50',
            'telegram_alerts_enabled' => 'nullable|boolean',
            'motion_detection_enabled' => 'nullable|boolean',
        ]);

        $sanitizedId = preg_replace('/[^a-zA-Z0-9]/', '', $userId);
        $streamId = 'cam_u' . substr($sanitizedId, 0, 12) . '_' . substr(bin2hex(random_bytes(4)), 0, 8);

        $camera = KingCamera::create([
            'user_id' => $userId,
            'name' => $validated['name'],
            'room' => $validated['room'] ?? null,
            'stream_id' => $streamId,
            'ip_address' => trim($validated['ip_address']),
            'port' => (int) ($validated['port'] ?? 554),
            'rtsp_path' => '/' . ltrim((string) ($validated['rtsp_path'] ?? 'onvif1'), '/'),
            'username' => $validated['username'] ?? null,
            'password' => $validated['password'] ?? null,
            'telegram_chat_id' => $validated['telegram_chat_id'] ?? null,
            'telegram_alerts_enabled' => (bool) ($validated['telegram_alerts_enabled'] ?? true),
            'motion_detection_enabled' => (bool) ($validated['motion_detection_enabled'] ?? false),
            'status' => 'online',
        ]);

        $this->cameraService->syncStreamToGo2Rtc($camera);

        return response()->json([
            'success' => true,
            'message' => 'Câmera adicionada com sucesso!',
            'data' => $camera,
        ], 201);
    }

    /**
     * Atualiza dados de uma câmera existente.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $userId = (string) $request->attributes->get('auth_user_id', '');
        $camera = KingCamera::where('id', $id)->where('user_id', $userId)->first();

        if (! $camera) {
            return response()->json(['success' => false, 'message' => 'Câmera não encontrada.'], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:100',
            'room' => 'nullable|string|max:100',
            'ip_address' => 'sometimes|required|string|max:100',
            'port' => 'nullable|integer|min:1|max:65535',
            'rtsp_path' => 'nullable|string|max:150',
            'username' => 'nullable|string|max:100',
            'password' => 'nullable|string|max:200',
            'telegram_chat_id' => 'nullable|string|max:50',
            'telegram_alerts_enabled' => 'nullable|boolean',
            'motion_detection_enabled' => 'nullable|boolean',
        ]);

        if (isset($validated['rtsp_path'])) {
            $validated['rtsp_path'] = '/' . ltrim((string) $validated['rtsp_path'], '/');
        }

        $camera->fill($validated);
        $camera->save();

        $this->cameraService->syncStreamToGo2Rtc($camera);

        return response()->json([
            'success' => true,
            'message' => 'Câmera atualizada com sucesso!',
            'data' => $camera,
        ]);
    }

    /**
     * Exclui uma câmera e desvincula do go2rtc.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $userId = (string) $request->attributes->get('auth_user_id', '');
        $camera = KingCamera::where('id', $id)->where('user_id', $userId)->first();

        if (! $camera) {
            return response()->json(['success' => false, 'message' => 'Câmera não encontrada.'], 404);
        }

        $this->cameraService->removeStreamFromGo2Rtc($camera->stream_id);
        $camera->delete();

        return response()->json([
            'success' => true,
            'message' => 'Câmera removida com sucesso.',
        ]);
    }

    /**
     * WebRTC WHEP / Offer/Answer handshake endpoint.
     * Recebe SDP Offer do frontend browser e retorna SDP Answer do go2rtc.
     */
    public function webrtcHandshake(Request $request, int $id): Response
    {
        $userId = (string) $request->attributes->get('auth_user_id', '');
        $camera = KingCamera::where('id', $id)->where('user_id', $userId)->first();

        if (! $camera) {
            return response('Camera not found', 404);
        }

        $offerSdp = $request->getContent();
        if (empty($offerSdp)) {
            return response('SDP Offer is required', 400);
        }

        // Garante que o stream está registrado no go2rtc
        $this->cameraService->syncStreamToGo2Rtc($camera);

        $answerSdp = $this->cameraService->exchangeWebRtcSdp($camera->stream_id, $offerSdp);
        if (! $answerSdp) {
            return response('Failed to negotiate WebRTC with streaming engine', 502);
        }

        return response($answerSdp, 200)
            ->header('Content-Type', 'application/sdp');
    }

    /**
     * Snapshot instantâneo (JPEG) da câmera.
     */
    public function snapshot(Request $request, int $id): Response
    {
        $userId = (string) $request->attributes->get('auth_user_id', '');
        $camera = KingCamera::where('id', $id)->where('user_id', $userId)->first();

        if (! $camera) {
            return response('Camera not found', 404);
        }

        $jpeg = $this->cameraService->getSnapshot($camera);
        if (! $jpeg) {
            return response('Snapshot unavailable', 503);
        }

        return response($jpeg, 200)
            ->header('Content-Type', 'image/jpeg')
            ->header('Cache-Control', 'no-cache, no-store, must-revalidate');
    }

    /**
     * Dispara um alerta de teste para o Telegram configurado na câmera.
     */
    public function testTelegramAlert(Request $request, int $id): JsonResponse
    {
        $userId = (string) $request->attributes->get('auth_user_id', '');
        $camera = KingCamera::where('id', $id)->where('user_id', $userId)->first();

        if (! $camera) {
            return response()->json(['success' => false, 'message' => 'Câmera não encontrada.'], 404);
        }

        if (! $camera->telegram_chat_id) {
            return response()->json([
                'success' => false,
                'message' => 'Nenhum Chat ID do Telegram configurado nesta câmera. Conecte pelo link do bot primeiro.',
            ], 422);
        }

        $ok = $this->telegramAgent->sendAlert(
            $camera,
            'test',
            'Teste manual de alerta do Agente King Câmera. O sistema de monitoramento está operando normalmente!'
        );

        if (! $ok) {
            return response()->json([
                'success' => false,
                'message' => 'Falha ao enviar alerta no Telegram. Verifique se o Bot Token está configurado no .env.',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Alerta de teste enviado com sucesso para seu Telegram!',
        ]);
    }

    /**
     * Webhook público do Telegram Bot para receber mensagens e comandos (/start, /foto, etc).
     */
    public function telegramWebhook(Request $request): JsonResponse
    {
        $update = $request->all();
        if (empty($update)) {
            return response()->json(['ok' => true]);
        }

        try {
            $this->telegramAgent->handleWebhookUpdate($update);
        } catch (\Throwable $e) {
            Log::error('ks.camera.webhook.error', ['error' => $e->getMessage()]);
        }

        return response()->json(['ok' => true]);
    }

    /**
     * Lista todos os links de compartilhamento ativos de uma câmera.
     */
    public function listShares(Request $request, int $id): JsonResponse
    {
        $userId = (string) $request->attributes->get('auth_user_id', '');
        $camera = KingCamera::where('id', $id)->where('user_id', $userId)->first();
        if (! $camera) {
            return response()->json(['success' => false, 'message' => 'Câmera não encontrada.'], 404);
        }

        $shares = KingCameraShare::where('camera_id', $id)
            ->where('is_active', true)
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $shares->map(fn (KingCameraShare $s) => [
                'id' => $s->id,
                'token' => $s->share_token,
                'label' => $s->label,
                'share_url' => url('/monitor/' . $s->share_token),
                'expires_at' => $s->expires_at->toIso8601String(),
                'duration_seconds' => $s->duration_seconds,
                'is_expired' => $s->isExpired(),
                'seconds_remaining' => max(0, $s->expires_at->diffInSeconds(now(), false) * -1),
                'view_count' => $s->view_count,
                'created_at' => $s->created_at?->toIso8601String(),
            ]),
        ]);
    }

    /**
     * Cria um novo link de compartilhamento com tempo de expiração customizado.
     */
    public function createShare(Request $request, int $id): JsonResponse
    {
        $userId = (string) $request->attributes->get('auth_user_id', '');
        $camera = KingCamera::where('id', $id)->where('user_id', $userId)->first();
        if (! $camera) {
            return response()->json(['success' => false, 'message' => 'Câmera não encontrada.'], 404);
        }

        $validated = $request->validate([
            'duration_seconds' => 'required|integer|min:30|max:2592000', // 30s até 30 dias
            'label' => 'nullable|string|max:100',
            'can_audio' => 'nullable|boolean',
            'can_ptz' => 'nullable|boolean',
        ]);

        $duration = (int) $validated['duration_seconds'];
        $expiresAt = now()->addSeconds($duration);
        $token = 'kc_' . substr(bin2hex(random_bytes(16)), 0, 24);

        $share = KingCameraShare::create([
            'camera_id' => $camera->id,
            'user_id' => $userId,
            'share_token' => $token,
            'label' => $validated['label'] ?: 'Monitor Convidado',
            'expires_at' => $expiresAt,
            'duration_seconds' => $duration,
            'can_audio' => (bool) ($validated['can_audio'] ?? true),
            'can_ptz' => (bool) ($validated['can_ptz'] ?? false),
            'is_active' => true,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Link de monitoramento criado com sucesso!',
            'data' => [
                'id' => $share->id,
                'token' => $share->share_token,
                'label' => $share->label,
                'share_url' => url('/monitor/' . $share->share_token),
                'expires_at' => $share->expires_at->toIso8601String(),
                'duration_seconds' => $share->duration_seconds,
                'seconds_remaining' => $duration,
            ],
        ], 201);
    }

    /**
     * Revoga um link de compartilhamento na hora.
     */
    public function revokeShare(Request $request, int $shareId): JsonResponse
    {
        $userId = (string) $request->attributes->get('auth_user_id', '');
        $share = KingCameraShare::where('id', $shareId)->where('user_id', $userId)->first();
        if (! $share) {
            return response()->json(['success' => false, 'message' => 'Link não encontrado.'], 404);
        }

        $share->update(['is_active' => false]);

        return response()->json([
            'success' => true,
            'message' => 'Acesso ao link revogado com sucesso!',
        ]);
    }

    /**
     * Página de visualização pública com contador regressivo e WebRTC ultra-rápido.
     */
    public function publicShareView(Request $request, string $token)
    {
        $share = KingCameraShare::with('camera')
            ->where('share_token', $token)
            ->first();

        if (! $share || ! $share->is_active || $share->isExpired()) {
            return response()->view('pages.kingCameraMonitorExpired', [
                'reason' => ! $share ? 'Link inexistente' : 'Este link de monitoramento temporário já expirou.',
            ], 403);
        }

        $share->increment('view_count');

        $camera = $share->camera;
        if (! $camera) {
            return response()->view('pages.kingCameraMonitorExpired', [
                'reason' => 'A câmera associada a este link foi removida.',
            ], 404);
        }

        return view('pages.kingCameraMonitor', [
            'share' => $share,
            'camera' => $camera,
            'token' => $token,
            'secondsRemaining' => max(0, $share->expires_at->diffInSeconds(now(), false) * -1),
        ]);
    }

    /**
     * Informações da câmera do link público (para o frontend guest).
     */
    public function publicShareInfo(Request $request, string $token): JsonResponse
    {
        $share = KingCameraShare::with('camera')->where('share_token', $token)->first();
        if (! $share || ! $share->is_active || $share->isExpired()) {
            return response()->json([
                'success' => false,
                'is_expired' => true,
                'message' => 'Link de monitoramento expirado ou revogado.',
            ], 403);
        }

        $camera = $share->camera;
        $secondsRemaining = max(0, $share->expires_at->diffInSeconds(now(), false) * -1);

        return response()->json([
            'success' => true,
            'data' => [
                'camera_name' => $camera->name,
                'room' => $camera->room,
                'label' => $share->label,
                'can_audio' => $share->can_audio,
                'expires_at' => $share->expires_at->toIso8601String(),
                'seconds_remaining' => $secondsRemaining,
            ],
        ]);
    }

    /**
     * Handshake WebRTC para o visualizador convidado (Guest).
     */
    public function publicShareWebRtcHandshake(Request $request, string $token): Response
    {
        $share = KingCameraShare::with('camera')->where('share_token', $token)->first();
        if (! $share || ! $share->is_active || $share->isExpired()) {
            return response('Link expired or invalid', 403);
        }

        $camera = $share->camera;
        if (! $camera) {
            return response('Camera not found', 404);
        }

        $offerSdp = $request->getContent();
        if (empty($offerSdp)) {
            return response('SDP Offer is required', 400);
        }

        // Garante que o stream está registrado no go2rtc
        $this->cameraService->syncStreamToGo2Rtc($camera);

        $answerSdp = $this->cameraService->exchangeWebRtcSdp($camera->stream_id, $offerSdp);
        if (! $answerSdp) {
            return response('Failed to negotiate WebRTC with streaming engine', 502);
        }

        return response($answerSdp, 200)
            ->header('Content-Type', 'application/sdp');
    }

    /**
     * Descobre câmeras IP / RTSP / ONVIF conectadas na rede local.
     */
    public function discoverNetworkCameras(Request $request): JsonResponse
    {
        $targetIp = trim((string) $request->input('target_ip', ''));
        $subnet = trim((string) $request->input('subnet', ''));

        $discovered = [];
        $candidates = [];

        if ($targetIp !== '') {
            $candidates[] = $targetIp;
        } else {
            // Se informada uma sub-rede (ex: 172.16.100 ou 192.168.1), verifica os IPs mais comuns
            $prefix = $subnet !== '' ? rtrim($subnet, '.') : '172.16.100';
            // Câmera piloto atual e hosts comuns de roteador/câmeras DHCP
            $suffixes = [215, 1, 10, 50, 100, 101, 102, 105, 120, 150, 200, 254];
            foreach ($suffixes as $suf) {
                $candidates[] = "{$prefix}.{$suf}";
            }
            // Adiciona sub-rede alternativa 192.168.1.x se for genérico
            if ($subnet === '') {
                foreach ([1, 50, 100, 101, 108, 120, 128] as $suf) {
                    $candidates[] = "192.168.1.{$suf}";
                }
            }
        }

        $commonPorts = [
            554 => ['proto' => 'RTSP', 'path' => '/onvif1', 'brand' => 'Yoosee / ONVIF Universal'],
            8554 => ['proto' => 'RTSP', 'path' => '/live/ch0', 'brand' => 'IP Camera Stream'],
            8899 => ['proto' => 'ONVIF', 'path' => '/onvif1', 'brand' => 'ONVIF Device Manager'],
            8000 => ['proto' => 'Hikvision', 'path' => '/Streaming/Channels/101', 'brand' => 'Hikvision / Ezviz'],
            37777 => ['proto' => 'Dahua', 'path' => '/cam/realmonitor?channel=1&subtype=0', 'brand' => 'Intelbras / Dahua'],
            80 => ['proto' => 'HTTP Web', 'path' => '/onvif1', 'brand' => 'IP Camera Web Interface'],
        ];

        foreach (array_unique($candidates) as $ip) {
            foreach ([554, 8899, 8000, 37777, 8554] as $port) {
                $fp = @fsockopen($ip, $port, $errno, $errstr, 0.25);
                if ($fp) {
                    fclose($fp);
                    $meta = $commonPorts[$port] ?? ['proto' => 'RTSP', 'path' => '/onvif1', 'brand' => 'Câmera IP'];
                    $discovered[] = [
                        'ip' => $ip,
                        'port' => $port,
                        'protocol' => $meta['proto'],
                        'default_path' => $meta['path'],
                        'brand' => $meta['brand'],
                        'name' => "Câmera Detectada ({$ip})",
                        'status' => 'online',
                    ];
                    break;
                }
            }
        }

        return response()->json([
            'success' => true,
            'message' => count($discovered) > 0 ? count($discovered) . ' dispositivo(s) encontrado(s).' : 'Nenhuma câmera respondeu no momento.',
            'data' => $discovered,
        ]);
    }
}
