<?php

namespace App\Services\Camera;

use App\Models\KingCamera;
use Illuminate\Support\Facades\Cache;
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
     * Garante que o stream esteja registrado no go2rtc sem destruí-lo se já estiver ativo.
     */
    public function ensureStreamInGo2Rtc(KingCamera $camera): bool
    {
        $goUrl = $this->getGo2RtcUrl();
        $streamId = $camera->stream_id;

        try {
            // Verifica se o stream já existe no go2rtc
            $res = Http::timeout(2.0)->get("{$goUrl}/api/streams?src=" . urlencode($streamId));
            if ($res->successful()) {
                $data = $res->json();
                if (! empty($data)) {
                    // Já está registrado e saudável! NÃO recriar nem deletar.
                    return true;
                }
            }
        } catch (\Throwable $e) {
            // Se falhar a checagem, prossegue para registrar
        }

        return $this->syncStreamToGo2Rtc($camera, false);
    }

    /**
     * Registra ou atualiza um stream na API REST do go2rtc (sem reiniciar container).
     */
    public function syncStreamToGo2Rtc(KingCamera $camera, bool $forceDelete = false): bool
    {
        $goUrl = $this->getGo2RtcUrl();
        $streamId = $camera->stream_id;
        $rtspUrl = $camera->full_rtsp_url;
        if (! str_contains($rtspUrl, '#transport=')) {
            $rtspUrl .= '#transport=tcp';
        }
        try {
            // Apenas remove se for explicitamente solicitado (ex: mudança de IP/credenciais)
            if ($forceDelete) {
                @file_get_contents("{$goUrl}/api/streams?src=" . urlencode($streamId), false, stream_context_create([
                    'http' => ['method' => 'DELETE', 'timeout' => 2]
                ]));
            }

            $encodedSrc = str_replace(['%2A', '%2a'], '*', urlencode($rtspUrl));
            $endpoint = "{$goUrl}/api/streams?name=" . urlencode($streamId) . "&src=" . $encodedSrc;

            $ch = curl_init($endpoint);
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 6);
            $res = curl_exec($ch);
            $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode >= 200 && $httpCode < 300) {
                $camera->update(['status' => 'online']);
                return true;
            }

            Log::warning('ks.camera.syncStream.failed', [
                'stream_id' => $streamId,
                'status' => $httpCode,
                'body' => $res,
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
     * Obtém um frame JPEG instantâneo (Snapshot) direto do stream no go2rtc.
     */
    public function getSnapshotFrame(string $streamId): ?string
    {
        $cacheKey = "cam_snap_{$streamId}";
        $cached = Cache::get($cacheKey);
        if ($cached) {
            return $cached;
        }

        $goUrl = $this->getGo2RtcUrl();
        try {
            // go2rtc precisa de tempo suficiente para aguardar o próximo keyframe (I-frame) do stream RTSP
            $res = Http::timeout(5.0)->get("{$goUrl}/api/frame.jpeg?src=" . urlencode($streamId));
            if ($res->successful() && strlen($res->body()) > 500) {
                $body = $res->body();
                Cache::put($cacheKey, $body, 2);
                return $body;
            }
        } catch (\Throwable $e) {
            Log::warning('ks.camera.getSnapshotFrame', ['streamId' => $streamId, 'error' => $e->getMessage()]);
        }
        return null;
    }

    /**
     * Obtém um frame JPEG instantâneo (Snapshot) da câmera via go2rtc.
     */
    public function getSnapshot(KingCamera $camera): ?string
    {
        return $this->getSnapshotFrame($camera->stream_id);
    }

    /**
     * Troca SDP WebRTC (WHEP / WebRTC Offer/Answer handshake).
     */
    public function exchangeWebRtcSdp(string $streamId, string $offerSdp): ?string
    {
        $goUrl = $this->getGo2RtcUrl();
        try {
            $res = Http::timeout(15.0)
                ->withBody($offerSdp, 'application/sdp')
                ->post("{$goUrl}/api/webrtc?src=" . urlencode($streamId));

            if ($res->successful()) {
                return $res->body();
            }

            Log::warning('ks.camera.webrtcHandshake.errorResponse', [
                'streamId' => $streamId,
                'status' => $res->status(),
                'body' => $res->body(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('ks.camera.webrtcHandshake', ['streamId' => $streamId, 'error' => $e->getMessage()]);
        }
        return null;
    }

    /**
     * Resolve o host e porta corretos da câmera (lidando com túnel SSH reverso e LAN local)
     */
    public function getCameraNetworkTarget(KingCamera $camera): array
    {
        $host = $camera->ip_address;
        $isLocalLan = str_starts_with($host, '172.') || str_starts_with($host, '192.168.') || str_starts_with($host, '10.');

        if ($isLocalLan) {
            $targetHost = '172.18.0.1';
            // Túnel SSH: Câmera 1 (Quarto Bebê / 215) mapeada na porta 1557 (ONVIF 5000)
            // Câmera 2 (Sala / 43) mapeada na porta 1556 (HTTP 80)
            if ($camera->id === 1 || str_contains($camera->ip_address, '215') || str_contains((string) $camera->device_id, '7045951545')) {
                $onvifPort = 1557;
            } else {
                $onvifPort = 1556;
            }
        } else {
            $targetHost = $host;
            $onvifPort = $camera->onvif_port ?: 80;
        }

        return [$targetHost, $onvifPort];
    }

    /**
     * Envia comandos ONVIF PTZ de movimentação contínua ou parada para a câmera.
     */
    public function ptzMove(KingCamera $camera, string $direction, float $speed = 0.5): array
    {
        [$targetHost, $onvifPort] = $this->getCameraNetworkTarget($camera);

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

        $cacheKey = "cam_ptz_endpoint_{$camera->id}";
        $cachedEndpoint = \Illuminate\Support\Facades\Cache::get($cacheKey);

        $candidatePairs = [];
        if ($cachedEndpoint && is_array($cachedEndpoint) && isset($cachedEndpoint['url'], $cachedEndpoint['profile'])) {
            $candidatePairs[] = [$cachedEndpoint['url'], $cachedEndpoint['profile']];
        }

        $urls = [
            "http://{$targetHost}:{$onvifPort}/onvif/PTZ",
            "http://{$targetHost}:{$onvifPort}/onvif/ptz_service",
            "http://{$targetHost}:{$onvifPort}/onvif/device_service",
        ];
        $profiles = ['Profile_1', 'IPCProfilesToken0', 'ProfileToken_1'];

        foreach ($urls as $u) {
            foreach ($profiles as $p) {
                $candidatePairs[] = [$u, $p];
            }
        }

        $lastHttpCode = 0;

        foreach ($candidatePairs as [$url, $profileToken]) {
            if ($direction === 'stop') {
                $soaps = [
                    <<<XML
<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <ContinuousMove xmlns="http://www.onvif.org/ver20/ptz/wsdl">
      <ProfileToken>{$profileToken}</ProfileToken>
      <Velocity>
        <PanTilt x="0" y="0" xmlns="http://www.onvif.org/ver10/schema"/>
      </Velocity>
    </ContinuousMove>
  </s:Body>
</s:Envelope>
XML
,
                    <<<XML
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
XML
                ];
            } else {
                $soaps = [
                    <<<XML
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
XML
                ];
            }

            foreach ($soaps as $soap) {
                try {
                    $ch = curl_init($url);
                    curl_setopt($ch, CURLOPT_POST, true);
                    curl_setopt($ch, CURLOPT_POSTFIELDS, $soap);
                    curl_setopt($ch, CURLOPT_HTTPHEADER, [
                        'Content-Type: application/soap+xml; charset=utf-8',
                        'Content-Length: ' . strlen($soap),
                    ]);
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($ch, CURLOPT_TIMEOUT, 2);
                    $res = curl_exec($ch);
                    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                    curl_close($ch);
                    $lastHttpCode = $httpCode;

                    if ($httpCode === 200) {
                        \Illuminate\Support\Facades\Cache::put($cacheKey, ['url' => $url, 'profile' => $profileToken], 86400);
                        return ['success' => true, 'direction' => $direction, 'http_code' => 200, 'url' => $url, 'profile' => $profileToken];
                    }
                } catch (\Throwable $e) {
                    // Próxima tentativa
                }
            }
        }

        return ['success' => false, 'error' => "ONVIF PTZ não respondeu 200. Último código: {$lastHttpCode}"];
    }

    /**
     * Gera cabeçalho WS-Security com autenticação PasswordDigest para ONVIF
     */
    public function buildWsSecurityHeader(?string $user, ?string $pass): string
    {
        if (! $user || ! $pass) {
            return '<s:Header/>';
        }
        $created = gmdate('Y-m-d\TH:i:s\Z');
        $nonce = random_bytes(16);
        $nonceB64 = base64_encode($nonce);
        $passDigest = base64_encode(sha1($nonce . $created . $pass, true));

        return <<<XML
<s:Header>
  <Security s:mustUnderstand="1" xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
    <UsernameToken>
      <Username>{$user}</Username>
      <Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest">{$passDigest}</Password>
      <Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">{$nonceB64}</Nonce>
      <Created xmlns="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">{$created}</Created>
    </UsernameToken>
  </Security>
</s:Header>
XML;
    }

    /**
     * Liga/desliga o holofote LED / lâmpada auxiliar da câmera via ONVIF Auxiliary e CGI
     */
    public function setLight(KingCamera $camera, string|bool|null $state = null): array
    {
        [$targetHost, $onvifPort] = $this->getCameraNetworkTarget($camera);
        $targetUrl = "http://{$targetHost}:{$onvifPort}/onvif/ptz_service";

        // Determina se deve ligar ou desligar (toggle caso null)
        $turnOn = ($state === true || $state === 'on' || $state === '1');
        if ($state === null || $state === 'toggle') {
            $turnOn = true;
        }

        $cmd = $turnOn ? 'LightOn' : 'LightOff';
        $user = $camera->username ?: 'admin';
        $pass = $camera->password ?: '';
        $sec = $this->buildWsSecurityHeader($user, $pass);

        $soap = <<<XML
<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  {$sec}
  <s:Body>
    <SendAuxiliaryCommand xmlns="http://www.onvif.org/ver20/ptz/wsdl">
      <ProfileToken>IPCProfilesToken0</ProfileToken>
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

            // CGI fallback para câmeras Yoosee, Xiongmai, Tuya, V380 e IPC
            $val = $turnOn ? '1' : '0';
            $valMode = $turnOn ? 'open' : 'close';
            $cgiUrls = [
                "http://{$targetHost}:{$onvifPort}/cgi-bin/hi3510/param.cgi?cmd=setlightattr&-light_mode={$val}",
                "http://{$targetHost}:{$onvifPort}/cgi-bin/hi3510/param.cgi?cmd=setinfraredattr&-infrared_mode={$val}",
                "http://{$targetHost}:{$onvifPort}/cgi-bin/param.cgi?cmd=setwhiteled&-state={$val}",
                "http://{$targetHost}:{$onvifPort}/web/cgi-bin/hi3510/param.cgi?cmd=setlightmode&-mode={$valMode}",
            ];
            foreach ($cgiUrls as $cgi) {
                @file_get_contents($cgi, false, stream_context_create(['http' => ['timeout' => 1]]));
            }

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

    /**
     * Verifica o estado de conectividade do túnel SSH das câmeras na porta 1554
     */
    public function checkTunnelStatus(): array
    {
        $tunnelHost = '172.18.0.1';
        $tunnelPort = 1554;
        $sock = @stream_socket_client("tcp://{$tunnelHost}:{$tunnelPort}", $errno, $errstr, 0.8);
        $portOpen = is_resource($sock);
        if ($portOpen) {
            @fclose($sock);
        }

        $camera = KingCamera::where('rtsp_port', 1554)->orWhere('id', 1)->first();
        $streamActive = false;
        if ($camera) {
            $streamActive = $this->ensureStreamInGo2Rtc($camera);
        }

        return [
            'online' => $portOpen,
            'port_1554' => $portOpen,
            'stream_active' => $streamActive,
            'message' => $portOpen ? 'Túnel SSH ativo e comunicando com as câmeras!' : 'Túnel SSH desconectado. Inicie o túnel no seu computador.',
        ];
    }

    /**
     * Força a reinicialização dos streams do túnel no go2rtc
     */
    public function restartTunnelStreams(): array
    {
        $camera = KingCamera::where('rtsp_port', 1554)->orWhere('id', 1)->first();
        if ($camera) {
            $this->syncStreamToGo2Rtc($camera, true);
        }
        return $this->checkTunnelStatus();
    }
}


