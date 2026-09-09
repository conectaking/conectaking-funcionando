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
        $r = $this->kingDocs->downloadFile(
            (string) $request->attributes->get('auth_user_id'),
            (int) $id
        );

        return $this->binaryOrJson($r, 'inline');
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
        $r = $this->kingDocs->publicDownloadFile(
            $token,
            (int) $fileId,
            $request->header('X-King-Docs-Viewer')
        );

        return $this->binaryOrJson($r, 'attachment');
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
     * @param  array{status:int, buffer?:string, mime?:string, filename?:string, body?:mixed}  $r
     */
    private function binaryOrJson(array $r, string $disposition)
    {
        if (isset($r['buffer'])) {
            $filename = rawurlencode((string) ($r['filename'] ?? 'file'));

            return response($r['buffer'], $r['status'] ?? 200, [
                'Content-Type' => $r['mime'] ?? 'application/octet-stream',
                'Content-Disposition' => $disposition.'; filename="'.$filename.'"',
                'X-Conecta-Engine' => 'laravel',
            ]);
        }

        return $this->json($r);
    }
}
