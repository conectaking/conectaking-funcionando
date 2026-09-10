<?php

namespace App\Http\Controllers\KingDocs;

use App\Http\Controllers\Controller;
use App\Services\KingDocs\KingDocsService;
use Illuminate\Http\Request;

class KingDocsController extends Controller
{
    public function __construct(private readonly KingDocsService $kingDocs)
    {
    }

    public function getVault(Request $request)
    {
        return $this->json($this->kingDocs->getVault(
            (string) $request->attributes->get('auth_user_id')
        ));
    }

    public function putVault(Request $request)
    {
        $fieldData = $request->input('fieldData');
        if (! is_array($fieldData)) {
            $fieldData = [];
        }

        return $this->json($this->kingDocs->putVault(
            (string) $request->attributes->get('auth_user_id'),
            $fieldData
        ));
    }

    public function listFiles(Request $request)
    {
        return $this->json($this->kingDocs->listFiles(
            (string) $request->attributes->get('auth_user_id')
        ));
    }

    public function uploadFile(Request $request)
    {
        $file = $request->file('file');
        if (! $file) {
            return $this->json([
                'status' => 400,
                'body' => [
                    'success' => false,
                    'data' => null,
                    'message' => 'Ficheiro em falta.',
                    'error' => ['code' => 'ERROR', 'message' => 'Ficheiro em falta.'],
                ],
            ]);
        }

        return $this->json($this->kingDocs->uploadFile(
            (string) $request->attributes->get('auth_user_id'),
            (string) file_get_contents($file->getRealPath()),
            (string) ($file->getClientOriginalName() ?: 'ficheiro'),
            (string) ($file->getMimeType() ?: 'application/octet-stream'),
            (string) ($request->input('docType') ?: 'documento')
        ));
    }

    public function deleteFile(Request $request, string $id)
    {
        return $this->json($this->kingDocs->deleteFile(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id
        ));
    }

    public function downloadFile(Request $request, string $id)
    {
        $preferSigned = in_array(strtolower((string) $request->query('signed', '')), ['1', 'true', 'yes'], true);
        $r = $this->kingDocs->downloadFile(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id,
            $preferSigned
        );

        return $this->binaryOrJson($r, 'inline', $request);
    }

    public function createShare(Request $request)
    {
        return $this->json($this->kingDocs->createShare(
            (string) $request->attributes->get('auth_user_id'),
            $request->all()
        ));
    }

    public function listShares(Request $request)
    {
        return $this->json($this->kingDocs->listShares(
            (string) $request->attributes->get('auth_user_id')
        ));
    }

    public function revokeShare(Request $request, string $id)
    {
        return $this->json($this->kingDocs->revokeShare(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id
        ));
    }

    public function deleteSharePermanent(Request $request, string $id)
    {
        return $this->json($this->kingDocs->deleteSharePermanent(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id
        ));
    }

    public function publicMeta(Request $request, string $token)
    {
        $r = $this->kingDocs->publicMeta($token);

        return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
    }

    public function publicUnlock(Request $request, string $token)
    {
        return $this->json($this->kingDocs->publicUnlock(
            $token,
            (string) $request->input('password', '')
        ));
    }

    public function publicData(Request $request, string $token)
    {
        return $this->json($this->kingDocs->publicData(
            $token,
            $request->header('X-King-Docs-Viewer'),
            $request->header('X-King-Docs-Repeat-Visit')
        ));
    }

    public function publicDownloadFile(Request $request, string $token, string $fileId)
    {
        // HMAC viewer obrigatório no service; signed=1 emite GET curto após auth.
        // Default: proxy (fetch+blob no viewer; CORS R2 privado é arriscado).
        $preferSigned = in_array(strtolower((string) $request->query('signed', '')), ['1', 'true', 'yes'], true);
        $r = $this->kingDocs->publicDownloadFile(
            $token,
            (int) $fileId,
            $request->header('X-King-Docs-Viewer'),
            $preferSigned
        );

        return $this->binaryOrJson($r, 'attachment', $request);
    }

    public function importProfile(Request $request)
    {
        $r = $this->kingDocs->importProfile(
            (string) $request->attributes->get('auth_user_id')
        );
        if (($r['status'] ?? 500) < 400 && is_array($r['body'] ?? null)) {
            $r['body']['message'] = 'Dados do perfil importados para o cofre.';
        }

        return $this->json($r);
    }

    public function exportPdf(Request $request)
    {
        $r = $this->kingDocs->exportPdf(
            (string) $request->attributes->get('auth_user_id')
        );
        if (isset($r['pdf'])) {
            return response($r['pdf'], $r['status'] ?? 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'attachment; filename="'.($r['filename'] ?? 'king-docs-cofre.pdf').'"',
                'X-Conecta-Engine' => 'laravel',
            ]);
        }

        return $this->json($r);
    }

    /**
     * @param  array{status:int, body?:mixed}  $r
     */
    private function json(array $r)
    {
        return response()->json($r['body'] ?? $r, $r['status'] ?? 200)
            ->header('X-Conecta-Engine', 'laravel');
    }

    /**
     * @param  array{status:int, buffer?:string, mime?:string, filename?:string, etag?:string, signed_url?:string, body?:mixed}  $r
     */
    private function binaryOrJson(array $r, string $disposition, ?Request $request = null)
    {
        if (! empty($r['signed_url'])) {
            return response()->json([
                'ok' => true,
                'signed_url' => $r['signed_url'],
                'expires_in' => $r['expires_in'] ?? 120,
                'mime' => $r['mime'] ?? null,
                'filename' => $r['filename'] ?? null,
            ], 200)->header('X-Conecta-Engine', 'laravel')
                ->header('Cache-Control', 'private, no-store');
        }

        if (isset($r['buffer'])) {
            $filename = rawurlencode((string) ($r['filename'] ?? 'file'));
            $buffer = (string) $r['buffer'];
            $etag = (string) ($r['etag'] ?? ('"'.sha1($buffer).'"'));

            if ($request) {
                $inm = trim((string) $request->header('If-None-Match', ''));
                if ($inm !== '' && $inm === $etag) {
                    return response('', 304, [
                        'ETag' => $etag,
                        'Cache-Control' => 'private, max-age=300, immutable',
                        'X-Conecta-Engine' => 'laravel',
                    ]);
                }
            }

            return response($buffer, $r['status'] ?? 200, [
                'Content-Type' => $r['mime'] ?? 'application/octet-stream',
                'Content-Disposition' => $disposition.'; filename="'.$filename.'"',
                'Content-Length' => (string) strlen($buffer),
                // Conteúdo versionado por storage_key → ETag; cache privado agressivo.
                'Cache-Control' => 'private, max-age=300, immutable',
                'ETag' => $etag,
                'Accept-Ranges' => 'none',
                'X-Conecta-Engine' => 'laravel',
            ]);
        }

        return $this->json($r);
    }
}
