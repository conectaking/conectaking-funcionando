<?php

namespace App\Http\Controllers\Push;

use App\Http\Controllers\Controller;
use App\Services\Push\PushSubscriptionService;
use Illuminate\Http\Request;

class PushController extends Controller
{
    public function __construct(private readonly PushSubscriptionService $push)
    {
    }

    public function vapidPublicKey()
    {
        $key = $this->push->vapidPublicKey();
        if ($key === '') {
            return response()->json([
                'success' => false,
                'message' => 'Push notifications não configuradas',
            ], 503)->header('X-Conecta-Engine', 'laravel');
        }

        return response()->json([
            'success' => true,
            'publicKey' => $key,
        ])->header('X-Conecta-Engine', 'laravel');
    }

    public function subscribe(Request $request)
    {
        $subscription = $request->input('subscription');
        $endpoint = is_array($subscription) ? ($subscription['endpoint'] ?? null) : null;
        $keys = is_array($subscription) ? ($subscription['keys'] ?? null) : null;

        if (! is_string($endpoint) || $endpoint === '' || ! is_array($keys)) {
            return response()->json([
                'success' => false,
                'message' => 'Subscrição inválida',
            ], 400)->header('X-Conecta-Engine', 'laravel');
        }

        $userAgent = $request->input('userAgent');
        if (! is_string($userAgent) || $userAgent === '') {
            $userAgent = $request->header('User-Agent');
        }

        try {
            $subscriptionId = $this->push->save(
                (string) $request->attributes->get('auth_user_id'),
                $endpoint,
                (string) ($keys['p256dh'] ?? ''),
                (string) ($keys['auth'] ?? ''),
                is_string($userAgent) ? $userAgent : null
            );

            return response()->json([
                'success' => true,
                'message' => 'Subscrição registrada com sucesso',
                'subscriptionId' => $subscriptionId,
            ])->header('X-Conecta-Engine', 'laravel');
        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erro ao registrar subscrição',
            ], 500)->header('X-Conecta-Engine', 'laravel');
        }
    }
}
