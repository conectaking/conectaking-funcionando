<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class CloudflareImagesService
{
    /**
     * @return array{accountId:string,headers:array<string,string>}|null
     */
    public function creds(): ?array
    {
        $accountId = trim((string) (
            env('CF_IMAGES_ACCOUNT_ID')
            ?: env('CLOUDFLARE_ACCOUNT_ID')
            ?: env('CLOUDFLARE_IMAGES_ACCOUNT_ID')
            ?: ''
        ));
        $apiToken = trim((string) (env('CF_IMAGES_API_TOKEN') ?: env('CLOUDFLARE_API_TOKEN') ?: ''));
        $apiKey = trim((string) (env('CLOUDFLARE_API_KEY') ?: ''));
        $email = trim((string) (env('CLOUDFLARE_EMAIL') ?: ''));
        if ($accountId === '') {
            return null;
        }
        if ($apiToken !== '') {
            return [
                'accountId' => $accountId,
                'headers' => [
                    'Authorization' => 'Bearer '.$apiToken,
                    'Accept' => 'application/json',
                ],
            ];
        }
        if ($apiKey !== '' && $email !== '') {
            return [
                'accountId' => $accountId,
                'headers' => [
                    'X-Auth-Email' => $email,
                    'X-Auth-Key' => $apiKey,
                    'Accept' => 'application/json',
                ],
            ];
        }

        return null;
    }

    public function accountHash(): ?string
    {
        $h = trim((string) (env('CLOUDFLARE_ACCOUNT_HASH') ?: env('CF_IMAGES_ACCOUNT_HASH') ?: ''));

        return $h !== '' ? $h : null;
    }

    /**
     * @return array{ok:bool,status?:int,message?:string,payload?:array<string,mixed>,retry_after_seconds?:int}
     */
    public function directUpload(): array
    {
        $creds = $this->creds();
        if (!$creds) {
            return ['ok' => false, 'status' => 500, 'message' => 'Cloudflare não configurado.'];
        }
        $url = "https://api.cloudflare.com/client/v4/accounts/{$creds['accountId']}/images/v2/direct_upload";
        try {
            $response = Http::withHeaders($creds['headers'])->timeout(30)->post($url);
            $data = $response->json();
            if ($response->successful() && ($data['success'] ?? false) && isset($data['result'])) {
                return [
                    'ok' => true,
                    'payload' => [
                        'success' => true,
                        'uploadURL' => $data['result']['uploadURL'] ?? null,
                        'imageId' => $data['result']['id'] ?? null,
                        'accountHash' => $this->accountHash(),
                    ],
                ];
            }
            $msg = $data['errors'][0]['message'] ?? $data['message'] ?? 'Falha ao obter URL de upload.';
            $status = $response->status() ?: 502;
            $retry = $status === 429 ? 15 : null;

            return array_filter([
                'ok' => false,
                'status' => $status,
                'message' => $msg,
                'retry_after_seconds' => $retry,
            ], static fn ($v) => $v !== null);
        } catch (\Throwable $e) {
            Log::error('cf.directUpload', ['error' => $e->getMessage()]);

            return ['ok' => false, 'status' => 502, 'message' => 'Falha ao falar com Cloudflare: '.$e->getMessage()];
        }
    }

    public function publicUrl(string $imageId): string
    {
        $hash = $this->accountHash() ?: ($this->creds()['accountId'] ?? '');

        return "https://imagedelivery.net/{$hash}/{$imageId}/public";
    }
}
