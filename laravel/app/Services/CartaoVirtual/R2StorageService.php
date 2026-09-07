<?php

namespace App\Services\CartaoVirtual;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Upload de imagens para Cloudflare R2 (S3-compatible) via SigV4 puro.
 */
class R2StorageService
{
    /**
     * @return array{enabled:bool,accountId:?string,accessKeyId:?string,secretAccessKey:?string,bucket:?string,publicBaseUrl:?string,endpoint:?string}
     */
    public function config(): array
    {
        $accountId = trim((string) (env('R2_ACCOUNT_ID') ?: ''));
        $accessKeyId = trim((string) (env('R2_ACCESS_KEY_ID') ?: ''));
        $secret = trim((string) (env('R2_SECRET_ACCESS_KEY') ?: ''));
        $bucket = trim((string) (env('R2_BUCKET') ?: env('R2_BUCKET_NAME') ?: ''));
        $public = rtrim(trim((string) (env('R2_PUBLIC_BASE_URL') ?: '')), '/');
        $endpoint = rtrim(trim((string) (env('R2_ENDPOINT') ?: '')), '/');
        if ($endpoint === '' && $accountId !== '') {
            $endpoint = "https://{$accountId}.r2.cloudflarestorage.com";
        }

        return [
            'enabled' => $accountId !== '' && $accessKeyId !== '' && $secret !== '' && $bucket !== '',
            'accountId' => $accountId ?: null,
            'accessKeyId' => $accessKeyId ?: null,
            'secretAccessKey' => $secret ?: null,
            'bucket' => $bucket ?: null,
            'publicBaseUrl' => $public !== '' ? $public : null,
            'endpoint' => $endpoint !== '' ? $endpoint : null,
        ];
    }

    public function isEnabled(): bool
    {
        $c = $this->config();

        return $c['enabled'] && !empty($c['publicBaseUrl']);
    }

    public function uploadImage(string $binary, string $mime, string $filename = 'image.jpg'): ?string
    {
        if (!$this->isEnabled()) {
            return null;
        }
        $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION) ?: 'jpg');
        $ext = preg_replace('/[^a-z0-9]/', '', $ext) ?: 'jpg';
        if (!in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'webp'], true)) {
            $ext = 'jpg';
        }
        $contentType = str_starts_with($mime, 'image/')
            ? $mime
            : 'image/'.($ext === 'jpg' ? 'jpeg' : $ext);
        $key = sprintf('images/%s/%s/%s.%s', gmdate('Y'), gmdate('m'), (string) Str::uuid(), $ext);

        return $this->putObject($key, $binary, $contentType);
    }

    public function uploadPdf(string $binary, string $userId): ?string
    {
        $accountId = trim((string) (env('PDF_R2_ACCOUNT_ID') ?: env('R2_ACCOUNT_ID') ?: ''));
        $accessKeyId = trim((string) (env('PDF_R2_ACCESS_KEY_ID') ?: env('R2_ACCESS_KEY_ID') ?: ''));
        $secret = trim((string) (env('PDF_R2_SECRET_ACCESS_KEY') ?: env('R2_SECRET_ACCESS_KEY') ?: ''));
        $bucket = trim((string) (env('PDF_R2_BUCKET_NAME') ?: env('R2_BUCKET_NAME') ?: env('R2_BUCKET') ?: ''));
        $public = rtrim(trim((string) (env('PDF_R2_PUBLIC_URL') ?: env('R2_PUBLIC_URL') ?: env('R2_PUBLIC_BASE_URL') ?: '')), '/');
        if ($accountId === '' || $accessKeyId === '' || $secret === '' || $bucket === '' || $public === '') {
            return null;
        }
        $endpoint = "https://{$accountId}.r2.cloudflarestorage.com";
        $key = 'pdf-'.$userId.'-'.((int) (microtime(true) * 1000)).'.pdf';
        $ok = $this->putObjectRaw($endpoint, $bucket, $accessKeyId, $secret, $key, $binary, 'application/pdf');
        if (!$ok) {
            return null;
        }

        return $public.'/'.$key;
    }

    public function putObject(string $key, string $binary, string $contentType): ?string
    {
        $c = $this->config();
        if (!$c['enabled'] || !$c['endpoint'] || !$c['bucket'] || !$c['publicBaseUrl']) {
            return null;
        }
        $ok = $this->putObjectRaw(
            $c['endpoint'],
            $c['bucket'],
            (string) $c['accessKeyId'],
            (string) $c['secretAccessKey'],
            $key,
            $binary,
            $contentType,
            'public, max-age=31536000, immutable'
        );
        if (!$ok) {
            return null;
        }
        $segments = array_map('rawurlencode', array_values(array_filter(explode('/', ltrim($key, '/')))));

        return $c['publicBaseUrl'].'/'.implode('/', $segments);
    }

    private function putObjectRaw(
        string $endpoint,
        string $bucket,
        string $accessKeyId,
        string $secret,
        string $key,
        string $binary,
        string $contentType,
        ?string $cacheControl = null
    ): bool {
        try {
            $host = parse_url($endpoint, PHP_URL_HOST) ?: '';
            $canonicalUri = '/'.$bucket.'/'.implode('/', array_map('rawurlencode', explode('/', ltrim($key, '/'))));
            $amzDate = gmdate('Ymd\THis\Z');
            $dateStamp = gmdate('Ymd');
            $payloadHash = hash('sha256', $binary);
            $headers = [
                'content-type' => $contentType,
                'host' => $host,
                'x-amz-content-sha256' => $payloadHash,
                'x-amz-date' => $amzDate,
            ];
            if ($cacheControl) {
                $headers['cache-control'] = $cacheControl;
            }
            ksort($headers);
            $signedHeaderNames = implode(';', array_keys($headers));
            $canonicalHeaders = '';
            foreach ($headers as $k => $v) {
                $canonicalHeaders .= $k.':'.trim($v)."\n";
            }
            $canonicalRequest = "PUT\n{$canonicalUri}\n\n{$canonicalHeaders}\n{$signedHeaderNames}\n{$payloadHash}";
            $credentialScope = "{$dateStamp}/auto/s3/aws4_request";
            $stringToSign = "AWS4-HMAC-SHA256\n{$amzDate}\n{$credentialScope}\n".hash('sha256', $canonicalRequest);
            $signingKey = $this->signingKey($secret, $dateStamp, 'auto', 's3');
            $signature = hash_hmac('sha256', $stringToSign, $signingKey);
            $authorization = "AWS4-HMAC-SHA256 Credential={$accessKeyId}/{$credentialScope}, SignedHeaders={$signedHeaderNames}, Signature={$signature}";

            $url = rtrim($endpoint, '/').$canonicalUri;
            $reqHeaders = [
                'Authorization' => $authorization,
                'Content-Type' => $contentType,
                'Host' => $host,
                'x-amz-content-sha256' => $payloadHash,
                'x-amz-date' => $amzDate,
            ];
            if ($cacheControl) {
                $reqHeaders['Cache-Control'] = $cacheControl;
            }

            $response = Http::withHeaders($reqHeaders)
                ->withBody($binary, $contentType)
                ->timeout(60)
                ->put($url);

            if (!$response->successful()) {
                Log::warning('r2.putObject.failed', [
                    'status' => $response->status(),
                    'body' => substr($response->body(), 0, 300),
                    'key' => $key,
                ]);

                return false;
            }

            return true;
        } catch (\Throwable $e) {
            Log::error('r2.putObject', ['error' => $e->getMessage(), 'key' => $key]);

            return false;
        }
    }

    private function signingKey(string $secret, string $date, string $region, string $service): string
    {
        $kDate = hash_hmac('sha256', $date, 'AWS4'.$secret, true);
        $kRegion = hash_hmac('sha256', $region, $kDate, true);
        $kService = hash_hmac('sha256', $service, $kRegion, true);

        return hash_hmac('sha256', 'aws4_request', $kService, true);
    }
}
