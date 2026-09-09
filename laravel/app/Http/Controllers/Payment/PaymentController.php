<?php

namespace App\Http\Controllers\Payment;

use App\Http\Controllers\Controller;
use App\Services\Payment\MercadoPagoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    public function __construct(private readonly MercadoPagoService $mercadoPago)
    {
    }

    public function createPreference(Request $request)
    {
        try {
            $r = $this->mercadoPago->createPreference((string) $request->attributes->get('auth_user_id'));

            return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
        } catch (\Throwable $e) {
            Log::error('Erro ao criar preferência no Mercado Pago: '.$e->getMessage());

            return response()->json([
                'message' => 'Não foi possível iniciar o processo de pagamento.',
            ], 500)->header('X-Conecta-Engine', 'laravel');
        }
    }

    public function webhook(Request $request)
    {
        $notification = is_array($request->all()) ? $request->all() : [];
        Log::info('[WEBHOOK]: Notificação recebida', ['type' => $notification['type'] ?? null]);

        $this->mercadoPago->handleWebhook($notification);

        return response('OK', 200)->header('X-Conecta-Engine', 'laravel');
    }
}
