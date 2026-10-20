<?php

namespace App\Services\Camera;

use App\Models\KingCamera;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class KingCameraService
{
    public function getGo2RtcUrl(): string
    {
        return rtrim((string) (env('GO2RTC_URL') ?: 'http://conectaking-go2rtc:1984'), '/');
    }

    public function getPublicGo2RtcUrl(): string
    {
        return rtrim((string) (env('GO2RTC_PUBLIC_URL') ?: 'https://www.conectaking.com.br/go2rtc'), '/');
    }

    /**
     * Registra ou atualiza um stream na API REST do go2rtc (sem reiniciar container).
     */
    public function syncStreamToGo2Rtc(KingCamera $camera): bool
    {
        $goUrl = $this->getGo2RtcUrl();
        $streamId = $camera->stream_id;
        $rtspUrl = $camera->full_rtsp_url;

        try {
            $res = Http::timeout(5)->put("{$goUrl}/api/streams?name=" . urlencode($streamId) . "&src=" . urlencode($rtspUrl));

            if ($res->successful()) {
                $camera->update(['status' => 'online']);
                return true;
            }

            Log::warning('ks.camera.syncStream.failed', [
                'stream_id' => $streamId,
                'status' => $res->status(),
                'body' => $res->body(),
            ]);
            $camera->update(['status' => 'error']);
            return false;
        } catch (\Throwable $e) {
            Log::error('ks.camera.syncStream.error', [
                'stream_id' => $streamId,
                'error' => $e->getMessage(),
            ]);
            $camera->update(['status' => 'offline']);
            return false;
        }
    }

    /**
     * Remove um stream do go2rtc.
     */
    public function removeStreamFromGo2Rtc(string $streamId): bool
    {
        $goUrl = $this->getGo2RtcUrl();
        try {
            $res = Http::timeout(3)->delete("{$goUrl}/api/streams?src=" . urlencode($streamId));
            return $res->successful();
        } catch (\Throwable $e) {
            Log::warning('ks.camera.removeStream', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Retorna o status de todos os streams ativos no go2rtc.
     */
    public function getStreamsStatus(): array
    {
        $goUrl = $this->getGo2RtcUrl();
        try {
            $res = Http::timeout(3)->get("{$goUrl}/api/streams");
            if ($res->successful()) {
                return $res->json() ?? [];
            }
        } catch (\Throwable $e) {
            Log::warning('ks.camera.getStreamsStatus', ['error' => $e->getMessage()]);
        }
        return [];
    }

    /**
     * Obtém um frame JPEG instantâneo (Snapshot) da câmera via go2rtc.
     */
    public function getSnapshot(KingCamera $camera): ?string
    {
        $goUrl = $this->getGo2RtcUrl();
        try {
            $res = Http::timeout(6)->get("{$goUrl}/api/frame.jpeg?src=" . urlencode($camera->stream_id));
            if ($res->successful() && ! empty($res->body())) {
                return $res->body();
            }
        } catch (\Throwable $e) {
            Log::warning('ks.camera.getSnapshot', ['streamId' => $camera->stream_id, 'error' => $e->getMessage()]);
        }
        return null;
    }

    /**
     * Troca SDP WebRTC (WHEP / WebRTC Offer/Answer handshake).
     */
    public function exchangeWebRtcSdp(string $streamId, string $offerSdp): ?string
    {
        $goUrl = $this->getGo2RtcUrl();
        try {
            $res = Http::timeout(5)
                ->withBody($offerSdp, 'application/sdp')
                ->post("{$goUrl}/api/webrtc?src=" . urlencode($streamId));

            if ($res->successful()) {
                return $res->body();
            }
        } catch (\Throwable $e) {
            Log::warning('ks.camera.webrtcHandshake', ['streamId' => $streamId, 'error' => $e->getMessage()]);
        }
        return null;
    }
}
