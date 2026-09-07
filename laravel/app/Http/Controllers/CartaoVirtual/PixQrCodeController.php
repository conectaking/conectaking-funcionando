<?php

namespace App\Http\Controllers\CartaoVirtual;

use App\Http\Controllers\Controller;
use App\Services\CartaoVirtual\PixBrCodeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PixQrCodeController extends Controller
{
    public function __construct(private readonly PixBrCodeService $pix)
    {
    }

    public function show(Request $request, string $itemId)
    {
        if (!ctype_digit($itemId) || (int) $itemId < 1) {
            return response()->json([
                'success' => false,
                'message' => 'ID do item inválido.',
            ], 400)->header('X-Conecta-Engine', 'laravel');
        }

        $row = DB::selectOne(
            'SELECT i.pix_key, p.display_name
             FROM profile_items i
             JOIN user_profiles p ON i.user_id = p.user_id
             WHERE i.id = ? AND i.item_type = \'pix_qrcode\'
             LIMIT 1',
            [(int) $itemId]
        );

        if (!$row) {
            return response()->json([
                'success' => false,
                'message' => 'Item PIX QR Code não encontrado.',
            ], 404)->header('X-Conecta-Engine', 'laravel');
        }

        $key = trim((string) ($row->pix_key ?? ''));
        if ($key === '') {
            return response()->json([
                'success' => false,
                'message' => 'Nenhuma chave PIX configurada para este item.',
            ], 400)->header('X-Conecta-Engine', 'laravel');
        }

        $brcode = $this->pix->payload($key, (string) ($row->display_name ?? 'Recebedor'), 'CIDADE');

        return response()->json([
            'success' => true,
            'brcode' => $brcode,
        ])->header('X-Conecta-Engine', 'laravel');
    }
}
