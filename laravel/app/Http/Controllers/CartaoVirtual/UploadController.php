<?php

namespace App\Http\Controllers\CartaoVirtual;

use App\Http\Controllers\Controller;
use App\Services\CartaoVirtual\CloudflareImagesService;
use App\Services\CartaoVirtual\R2StorageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class UploadController extends Controller
{
    private const MAX_MB = 15;

    public function __construct(
        private readonly R2StorageService $r2,
        private readonly CloudflareImagesService $cf,
    ) {
    }

    public function auth(Request $request)
    {
        if ($this->r2->isEnabled()) {
            $base = $this->apiBase($request);
            if ($base !== '') {
                return response()->json([
                    'success' => true,
                    'uploadURL' => $base.'/api/upload/receive-one',
                    'imageId' => 'r2',
                    'accountHash' => 'r2',
                    'useResponseUrl' => true,
                ])->header('X-Conecta-Engine', 'laravel');
            }
        }

        $out = $this->cf->directUpload();
        if ($out['ok'] ?? false) {
            return response()->json($out['payload'])->header('X-Conecta-Engine', 'laravel');
        }
        $status = (int) ($out['status'] ?? 502);
        $resp = response()->json([
            'success' => false,
            'message' => $out['message'] ?? 'Falha ao obter autorização para upload.',
            'retry_after_seconds' => $out['retry_after_seconds'] ?? null,
        ], $status)->header('X-Conecta-Engine', 'laravel');
        if (!empty($out['retry_after_seconds'])) {
            $resp->header('Retry-After', (string) $out['retry_after_seconds']);
        }

        return $resp;
    }

    public function receiveOne(Request $request)
    {
        $file = $request->file('file') ?: $request->file('image');
        if (!$file) {
            return response()->json([
                'success' => false,
                'message' => 'Nenhuma imagem enviada. Envie o ficheiro no campo "file" ou "image".',
            ], 400)->header('X-Conecta-Engine', 'laravel');
        }
        if ($file->getSize() > self::MAX_MB * 1024 * 1024) {
            return response()->json(['success' => false, 'message' => 'Arquivo muito grande (máx. '.self::MAX_MB.' MB).'], 413)
                ->header('X-Conecta-Engine', 'laravel');
        }
        $url = $this->r2->uploadImage(
            file_get_contents($file->getRealPath()) ?: '',
            (string) $file->getMimeType(),
            $file->getClientOriginalName() ?: 'image.jpg'
        );
        if (!$url) {
            return response()->json([
                'success' => false,
                'message' => 'Upload temporariamente indisponível. Tente novamente em instantes.',
            ], 503)->header('X-Conecta-Engine', 'laravel');
        }

        return response()->json(['success' => true, 'url' => $url, 'imageUrl' => $url])
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function image(Request $request)
    {
        $file = $request->file('image') ?: $request->file('file');
        if (!$file) {
            return response()->json(['success' => false, 'message' => 'Nenhuma imagem enviada.'], 400)
                ->header('X-Conecta-Engine', 'laravel');
        }
        $binary = file_get_contents($file->getRealPath()) ?: '';
        $mime = (string) $file->getMimeType();
        $name = $file->getClientOriginalName() ?: 'image.jpg';

        $url = $this->r2->uploadImage($binary, $mime, $name);
        if ($url) {
            return response()->json(['success' => true, 'url' => $url, 'imageUrl' => $url])
                ->header('X-Conecta-Engine', 'laravel');
        }

        $out = $this->cf->directUpload();
        if (!($out['ok'] ?? false)) {
            return response()->json([
                'success' => false,
                'message' => $out['message'] ?? 'Configure R2 ou Cloudflare Images para upload.',
            ], (int) ($out['status'] ?? 500))->header('X-Conecta-Engine', 'laravel');
        }
        $payload = $out['payload'];
        $imageId = (string) ($payload['imageId'] ?? '');
        $hash = $payload['accountHash'] ?? null;
        $uploadURL = (string) ($payload['uploadURL'] ?? '');
        if ($uploadURL === '' || $imageId === '') {
            return response()->json(['success' => false, 'message' => 'Falha ao obter URL de upload.'], 502)
                ->header('X-Conecta-Engine', 'laravel');
        }

        try {
            $up = \Illuminate\Support\Facades\Http::asMultipart()
                ->attach('file', $binary, $name)
                ->timeout(60)
                ->post($uploadURL);
            if (!$up->successful()) {
                return response()->json(['success' => false, 'message' => 'Falha ao enviar a imagem.'], 502)
                    ->header('X-Conecta-Engine', 'laravel');
            }
            $imageUrl = $this->cf->publicUrl($imageId);
            if ($hash === 'r2') {
                $data = $up->json();
                $imageUrl = $data['url'] ?? $data['imageUrl'] ?? $imageUrl;
            }

            return response()->json(['success' => true, 'url' => $imageUrl, 'imageUrl' => $imageUrl])
                ->header('X-Conecta-Engine', 'laravel');
        } catch (\Throwable $e) {
            Log::error('upload.image.cf', ['error' => $e->getMessage()]);

            return response()->json(['success' => false, 'message' => 'Falha ao enviar a imagem.'], 502)
                ->header('X-Conecta-Engine', 'laravel');
        }
    }

    public function images(Request $request)
    {
        $files = $request->file('images', []);
        if (!is_array($files) || $files === []) {
            return response()->json([
                'success' => false,
                'message' => 'Nenhuma imagem enviada. Use o campo "images".',
            ], 400)->header('X-Conecta-Engine', 'laravel');
        }
        $urls = [];
        foreach (array_slice($files, 0, 20) as $i => $file) {
            $url = $this->r2->uploadImage(
                file_get_contents($file->getRealPath()) ?: '',
                (string) $file->getMimeType(),
                $file->getClientOriginalName() ?: ('image-'.($i + 1).'.jpg')
            );
            if (!$url) {
                return response()->json([
                    'success' => false,
                    'message' => 'Configure R2 ou Cloudflare Images. Falha na imagem '.($i + 1),
                    'uploaded_so_far' => $urls,
                ], 500)->header('X-Conecta-Engine', 'laravel');
            }
            $urls[] = $url;
        }

        return response()->json(['success' => true, 'urls' => $urls, 'imageUrl' => $urls[0] ?? null])
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function crop(Request $request)
    {
        $file = $request->file('image') ?: $request->file('file');
        if (!$file) {
            return response()->json(['success' => false, 'message' => 'Nenhuma imagem enviada.'], 400)
                ->header('X-Conecta-Engine', 'laravel');
        }
        if (!function_exists('imagecreatefromstring')) {
            return response()->json(['success' => false, 'message' => 'Crop indisponível (GD).'], 503)
                ->header('X-Conecta-Engine', 'laravel');
        }
        $binary = file_get_contents($file->getRealPath()) ?: '';
        $src = @imagecreatefromstring($binary);
        if (!$src) {
            return response()->json(['success' => false, 'message' => 'Imagem inválida.'], 400)
                ->header('X-Conecta-Engine', 'laravel');
        }
        $imgW = imagesx($src);
        $imgH = imagesy($src);
        $useRatios = in_array((string) $request->input('useRatios', $request->input('use_ratios', '')), ['1', 'true'], true)
            || $request->boolean('useRatios');
        $x = (float) ($request->input('cropX', $request->input('crop_x', 0)));
        $y = (float) ($request->input('cropY', $request->input('crop_y', 0)));
        $w = (float) ($request->input('cropWidth', $request->input('crop_width', $request->input('cropW', 1))));
        $h = (float) ($request->input('cropHeight', $request->input('crop_height', $request->input('cropH', 1))));
        if ($useRatios) {
            $x = max(0, min(1, $x)) * $imgW;
            $y = max(0, min(1, $y)) * $imgH;
            $w = max(1, min($imgW, $w * $imgW));
            $h = max(1, min($imgH, $h * $imgH));
        }
        $left = (int) max(0, min($imgW - 1, floor($x)));
        $top = (int) max(0, min($imgH - 1, floor($y)));
        $width = (int) max(1, min($imgW - $left, floor($w)));
        $height = (int) max(1, min($imgH - $top, floor($h)));
        $cropped = imagecrop($src, ['x' => $left, 'y' => $top, 'width' => $width, 'height' => $height]);
        imagedestroy($src);
        if (!$cropped) {
            return response()->json(['success' => false, 'message' => 'Falha ao recortar.'], 500)
                ->header('X-Conecta-Engine', 'laravel');
        }
        ob_start();
        imagejpeg($cropped, null, 90);
        $out = ob_get_clean() ?: '';
        imagedestroy($cropped);
        $name = preg_replace('/\.[^.]+$/i', '.jpg', $file->getClientOriginalName() ?: 'image.jpg') ?: 'image.jpg';
        $url = $this->r2->uploadImage($out, 'image/jpeg', $name);
        if (!$url) {
            return response()->json(['success' => false, 'message' => 'Upload temporariamente indisponível.'], 503)
                ->header('X-Conecta-Engine', 'laravel');
        }

        return response()->json(['success' => true, 'url' => $url, 'imageUrl' => $url])
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function getUrl(string $imageId)
    {
        $url = $this->cf->publicUrl($imageId);

        return response()->json(['success' => true, 'url' => $url, 'imageUrl' => $url])
            ->header('X-Conecta-Engine', 'laravel');
    }

    public function pdf(Request $request)
    {
        $file = $request->file('pdfFile');
        if (!$file) {
            return response()->json(['message' => 'Nenhum arquivo enviado.'], 400)
                ->header('X-Conecta-Engine', 'laravel');
        }
        if ($file->getMimeType() !== 'application/pdf') {
            return response()->json(['message' => 'Formato inválido. Apenas PDFs.'], 400)
                ->header('X-Conecta-Engine', 'laravel');
        }
        $userId = (string) $request->attributes->get('auth_user_id', 'anon');
        $url = $this->r2->uploadPdf(file_get_contents($file->getRealPath()) ?: '', $userId);
        if (!$url) {
            return response()->json(['message' => 'Upload de PDF indisponível.'], 503)
                ->header('X-Conecta-Engine', 'laravel');
        }

        return response()->json([
            'message' => 'Upload de PDF realizado com sucesso!',
            'pdf_url' => $url,
        ])->header('X-Conecta-Engine', 'laravel');
    }

    private function apiBase(Request $request): string
    {
        $apiUrl = rtrim(trim((string) (env('API_URL') ?: env('API_PUBLIC_URL') ?: env('APP_URL') ?: '')), '/');
        if ($apiUrl !== '' && preg_match('#^https?://#i', $apiUrl)) {
            return $apiUrl;
        }
        $proto = $request->headers->get('x-forwarded-proto', $request->getScheme());
        $host = $request->headers->get('x-forwarded-host', $request->getHost());

        return rtrim($proto.'://'.$host, '/');
    }
}
