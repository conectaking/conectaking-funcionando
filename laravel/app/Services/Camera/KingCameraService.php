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
        if (! str_contains($rtspUrl, '#transport=')) {
            $rtspUrl .= '#transport=tcp';
        }
        $transcodeProducer = "ffmpeg:{$streamId}#video=h264#audio=opus";

        try {
            $endpoint = "{$goUrl}/api/streams?name=" . urlencode($streamId)
                . '&src=' . urlencode($rtspUrl)
                . '&src=' . urlencode($transcodeProducer);
            $res = Http::timeout(5)->put($endpoint);

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
        $cacheKey = "camera_snap_fail_{$camera->id}";
        if (\Illuminate\Support\Facades\Cache::has($cacheKey)) {
            return null;
        }

        $goUrl = $this->getGo2RtcUrl();
        try {
            $res = Http::timeout(1.5)->get("{$goUrl}/api/frame.jpeg?src=" . urlencode($camera->stream_id));
            if ($res->successful() && ! empty($res->body())) {
                return $res->body();
            }
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Cache::put($cacheKey, 1, 5);
            Log::warning('ks.camera.getSnapshot', ['streamId' => $camera->stream_id, 'error' => $e->getMessage()]);
            return null;
        }
        \Illuminate\Support\Facades\Cache::put($cacheKey, 1, 3);
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

    /**
     * Envia comandos ONVIF PTZ de movimentação contínua ou parada para a câmera.
     */
    public function ptzMove(KingCamera $camera, string $direction, float $speed = 0.5): array
    {
        $host = $camera->ip_address;
        $onvifPort = $camera->onvif_port ?: 80;

        $targetHost = ($host === '172.18.0.1' || str_starts_with($host, '172.'))
            ? '172.18.0.1'
            : $host;

        $direction = strtolower(trim($direction));

        if ($direction !== 'stop') {
            $x = 0.0;
            $y = 0.0;
            $z = 0.0;

            switch ($direction) {
                case 'up':
                    $y = $speed;
                    break;
                case 'down':
                    $y = -$speed;
                    break;
                case 'left':
                    $x = -$speed;
                    break;
                case 'right':
                    $x = $speed;
                    break;
                case 'zoom_in':
                    $z = $speed;
                    break;
                case 'zoom_out':
                    $z = -$speed;
                    break;
                case 'up_left':
                    $x = -$speed;
                    $y = $speed;
                    break;
                case 'up_right':
                    $x = $speed;
                    $y = $speed;
                    break;
                case 'down_left':
                    $x = -$speed;
                    $y = -$speed;
                    break;
                case 'down_right':
                    $x = $speed;
                    $y = -$speed;
                    break;
                default:
                    return ['success' => false, 'message' => "Direção inválida: {$direction}"];
            }
        }

        $candidateUrls = [
            "http://{$targetHost}:{$onvifPort}/onvif/PTZ",
            "http://{$targetHost}:{$onvifPort}/onvif/ptz_service",
            "http://{$targetHost}:{$onvifPort}/onvif/device_service",
        ];

        $candidateProfiles = ['Profile_1', 'IPCProfilesToken0', 'ProfileToken_1'];
        $lastHttpCode = 0;

        foreach ($candidateUrls as $url) {
            foreach ($candidateProfiles as $profileToken) {
                if ($direction === 'stop') {
                    $action = 'Stop';
                    $soap = <<<XML
<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <Stop xmlns="http://www.onvif.org/ver20/ptz/wsdl">
      <ProfileToken>{$profileToken}</ProfileToken>
      <PanTilt>true</PanTilt>
      <Zoom>true</Zoom>
    </Stop>
  </s:Body>
</s:Envelope>
XML;
                } else {
                    $action = 'ContinuousMove';
                    $soap = <<<XML
<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <ContinuousMove xmlns="http://www.onvif.org/ver20/ptz/wsdl">
      <ProfileToken>{$profileToken}</ProfileToken>
      <Velocity>
        <PanTilt x="{$x}" y="{$y}" xmlns="http://www.onvif.org/ver10/schema"/>
        <Zoom x="{$z}" xmlns="http://www.onvif.org/ver10/schema"/>
      </Velocity>
    </ContinuousMove>
  </s:Body>
</s:Envelope>
XML;
                }

                try {
                    $ch = curl_init($url);
                    curl_setopt($ch, CURLOPT_POST, true);
                    curl_setopt($ch, CURLOPT_POSTFIELDS, $soap);
                    curl_setopt($ch, CURLOPT_HTTPHEADER, [
                        "Content-Type: application/soap+xml; charset=utf-8; action=\"http://www.onvif.org/ver20/ptz/wsdl/{$action}\"",
                        'Content-Length: ' . strlen($soap),
                    ]);
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($ch, CURLOPT_TIMEOUT, 2);
                    $res = curl_exec($ch);
                    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                    curl_close($ch);
                    $lastHttpCode = $httpCode;

                    if ($httpCode === 200) {
                        return ['success' => true, 'direction' => $direction, 'http_code' => 200, 'url' => $url, 'profile' => $profileToken];
                    }
                } catch (\Throwable $e) {
                    // Tenta próximo endpoint
                }
            }
        }

        return ['success' => false, 'error' => "ONVIF PTZ não respondeu 200. Último código: {$lastHttpCode}"];
    }

    /**
     * Liga/desliga o holofote LED / lâmpada auxiliar da câmera via ONVIF Auxiliary e CGI
     */
    public function setLight(KingCamera $camera, string|bool|null $state = null): array
    {
        $host = $camera->ip_address;
        $onvifPort = $camera->onvif_port ?: 80;
        $targetHost = ($host === '172.18.0.1' || str_starts_with($host, '172.'))
            ? '172.18.0.1'
            : $host;
        $targetUrl = "http://{$targetHost}:{$onvifPort}/onvif/ptz_service";

        // Determina se deve ligar ou desligar (toggle caso null)
        $turnOn = ($state === true || $state === 'on' || $state === '1');
        if ($state === null || $state === 'toggle') {
            $turnOn = true;
        }

        $cmd = $turnOn ? 'LightOn' : 'LightOff';

        $soap = <<<XML
<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <SendAuxiliaryCommand xmlns="http://www.onvif.org/ver20/ptz/wsdl">
      <ProfileToken>Profile_1</ProfileToken>
      <AuxiliaryData>{$cmd}</AuxiliaryData>
    </SendAuxiliaryCommand>
  </s:Body>
</s:Envelope>
XML;

        try {
            $ch = curl_init($targetUrl);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $soap);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/soap+xml; charset=utf-8; action="http://www.onvif.org/ver20/ptz/wsdl/SendAuxiliaryCommand"',
                'Content-Length: ' . strlen($soap),
            ]);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 2);
            $res = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            // CGI fallback para câmeras Xiongmai / Tuya / V380 / IPC
            $val = $turnOn ? '1' : '0';
            $cgiUrl = "http://{$targetHost}:{$onvifPort}/cgi-bin/hi3510/param.cgi?cmd=setlightattr&-light_mode={$val}";
            @file_get_contents($cgiUrl, false, stream_context_create(['http' => ['timeout' => 1]]));

            return [
                'success' => true,
                'light_on' => $turnOn,
                'state' => $turnOn ? 'on' : 'off',
                'http_code' => $httpCode,
            ];
        } catch (\Throwable $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Ativa/desativa auto-tracking / seguir pessoa ou bebê
     */
    public function setAutoTracking(KingCamera $camera, bool $enabled): array
    {
        $camera->auto_tracking_enabled = $enabled;
        $camera->save();

        $host = $camera->ip_address;
        $onvifPort = $camera->onvif_port ?: 80;
        $targetHost = ($host === '172.18.0.1' || str_starts_with($host, '172.'))
            ? '172.18.0.1'
            : $host;
        $targetUrl = "http://{$targetHost}:{$onvifPort}/onvif/ptz_service";

        $cmd = $enabled ? 'TrackingOn' : 'TrackingOff';

        $soap = <<<XML
<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <SendAuxiliaryCommand xmlns="http://www.onvif.org/ver20/ptz/wsdl">
      <ProfileToken>Profile_1</ProfileToken>
      <AuxiliaryData>{$cmd}</AuxiliaryData>
    </SendAuxiliaryCommand>
  </s:Body>
</s:Envelope>
XML;

        try {
            $ch = curl_init($targetUrl);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $soap);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/soap+xml; charset=utf-8; action="http://www.onvif.org/ver20/ptz/wsdl/SendAuxiliaryCommand"',
                'Content-Length: ' . strlen($soap),
            ]);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 2);
            curl_exec($ch);
            curl_close($ch);
        } catch (\Throwable $e) {
            // Ignora falhas de ONVIF nativo se a câmera não tiver suporte
        }

        return [
            'success' => true,
            'auto_tracking_enabled' => $enabled,
        ];
    }
}

