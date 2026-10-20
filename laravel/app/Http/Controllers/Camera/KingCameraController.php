<?php

namespace App\Http\Controllers\Camera;

use App\Http\Controllers\Controller;
use App\Models\KingCamera;
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
        $userId = (int) $request->attributes->get('auth_user_id', 0);
        if ($userId <= 0) {
            return response()->json(['success' => false, 'message' => 'Não autorizado.'], 401);
        }

        $cameras = KingCamera::where('user_id', $userId)->orderBy('created_at', 'asc')->get();

        // Se o usuário não tiver nenhuma câmera ainda, cadastra automaticamente a câmera piloto
        if ($cameras->isEmpty()) {
            $pilot = KingCamera::create([
                'user_id' => $userId,
                'name' => 'Quarto Bebê',
                'room' => 'Quarto',
                'stream_id' => "cam_user_{$userId}_pilot",
                'ip_address' => '172.16.100.215',
                'port' => 554,
                'rtsp_path' => '/onvif1',
                'username' => 'admin',
                'password' => 'Playadryan22*',
                'telegram_alerts_enabled' => true,
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
        $userId = (int) $request->attributes->get('auth_user_id', 0);
        if ($userId <= 0) {
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

        $streamId = 'cam_u' . $userId . '_' . substr(bin2hex(random_bytes(4)), 0, 8);

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
        $userId = (int) $request->attributes->get('auth_user_id', 0);
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
        $userId = (int) $request->attributes->get('auth_user_id', 0);
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
        $userId = (int) $request->attributes->get('auth_user_id', 0);
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
        $userId = (int) $request->attributes->get('auth_user_id', 0);
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
        $userId = (int) $request->attributes->get('auth_user_id', 0);
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
}
