<?php

namespace App\Http\Controllers\CartaoVirtual;

use App\Http\Controllers\Controller;
use App\Services\CartaoVirtual\ProfileDigitalFormService;
use App\Services\CartaoVirtual\ProfileFormResponsesService;
use App\Services\CartaoVirtual\ProfileTypedItemsService;
use Illuminate\Http\Request;

class ProfileFormExtrasController extends Controller
{
    public function __construct(
        private readonly ProfileFormResponsesService $responses,
        private readonly ProfileDigitalFormService $digitalForm,
        private readonly ProfileTypedItemsService $typed,
    ) {
    }

    public function listResponses(Request $request, string $id)
    {
        $mode = $request->query('mode');
        $checkout = in_array(strtolower((string) $request->query('checkout_only', '')), ['1', 'true'], true);

        return $this->respond($this->responses->list(
            (string) $request->attributes->get('auth_user_id', ''),
            $id,
            is_string($mode) ? $mode : null,
            $checkout,
            max(1, min(200, (int) $request->query('limit', 100))),
            max(0, (int) $request->query('offset', 0))
        ));
    }

    public function deleteResponse(Request $request, string $id, string $responseId)
    {
        return $this->respond($this->responses->deleteOne(
            (string) $request->attributes->get('auth_user_id', ''),
            $id,
            $responseId
        ));
    }

    public function deleteResponsesBulk(Request $request, string $id)
    {
        $ids = $request->input('responseIds', []);

        return $this->respond($this->responses->deleteBulk(
            (string) $request->attributes->get('auth_user_id', ''),
            $id,
            is_array($ids) ? $ids : []
        ));
    }

    public function dashboard(Request $request, string $id)
    {
        return $this->respond($this->responses->dashboard(
            (string) $request->attributes->get('auth_user_id', ''),
            $id
        ));
    }

    public function createImportLink(Request $request, string $id)
    {
        return $this->respond($this->digitalForm->createImportLink(
            (string) $request->attributes->get('auth_user_id', ''),
            $id
        ));
    }

    public function importFormInfo(Request $request)
    {
        $token = (string) ($request->query('token') ?: $request->query('code') ?: '');

        return $this->respond($this->digitalForm->importFormInfo($token));
    }

    public function importForm(Request $request)
    {
        return $this->respond($this->digitalForm->importForm(
            (string) $request->attributes->get('auth_user_id', ''),
            $request->all()
        ));
    }

    public function repairSalesPages(Request $request)
    {
        return $this->respond($this->typed->repairSalesPages(
            (string) $request->attributes->get('auth_user_id', '')
        ));
    }

    public function exportCsv(Request $request, string $id)
    {
        $result = $this->responses->exportCsv(
            (string) $request->attributes->get('auth_user_id', ''),
            $id
        );

        if ($result['status'] !== 200) {
            return response()->json($result['body'], $result['status']);
        }

        $csv      = $result['body']['csv']      ?? '';
        $filename = $result['body']['filename'] ?? 'respostas.csv';

        // Adiciona BOM UTF-8 para compatibilidade com Excel
        $bom = "\xEF\xBB\xBF";

        return response($bom . $csv, 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Cache-Control'       => 'no-cache, no-store, must-revalidate',
            'X-Conecta-Engine'    => 'laravel',
        ]);
    }

    /**
     * @param  array{status:int, body:array<string, mixed>}  $result
     */
    private function respond(array $result)
    {
        return response()->json($result['body'], $result['status'])
            ->header('Cache-Control', 'no-cache, no-store, must-revalidate')
            ->header('Pragma', 'no-cache')
            ->header('Expires', '0')
            ->header('X-Conecta-Engine', 'laravel');
    }
}
