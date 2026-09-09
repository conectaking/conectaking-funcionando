<?php

namespace App\Services\Payment;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Checkout Mercado Pago (routes/payment.js). O SDK Node é substituído por chamadas
 * diretas à API REST — mesmos payloads e mesmos efeitos no banco.
 */
class MercadoPagoService
{
    private const API = 'https://api.mercadopago.com';

    private const PLAN_TITLE = 'Conecta King - Plano Individual (Mensal)';

    private const UNIT_PRICE = 1.00;

    /**
     * @return array{status:int, body:array<string,mixed>}
     */
    public function createPreference(string $userId): array
    {
        $user = DB::selectOne('SELECT email FROM users WHERE id = ? LIMIT 1', [$userId]);
        if (! $user) {
            return ['status' => 404, 'body' => ['message' => 'Usuário não encontrado.']];
        }

        $payload = [
            'purpose' => 'subscription',
            'items' => [[
                'id' => (string) (env('MERCADOPAGO_INDIVIDUAL_PLAN_ID') ?: ''),
                'title' => self::PLAN_TITLE,
                'quantity' => 1,
                'unit_price' => self::UNIT_PRICE,
                'currency_id' => 'BRL',
            ]],
            'payer' => ['email' => $user->email],
            'back_urls' => [
                'success' => (string) (env('MERCADOPAGO_BACK_URL_SUCCESS') ?: 'http://127.0.0.1:5500/frontend/dashboard.html?payment=success'),
                'failure' => (string) (env('MERCADOPAGO_BACK_URL_FAILURE') ?: 'http://127.0.0.1:5500/frontend/index.html?payment=failure'),
                'pending' => (string) (env('MERCADOPAGO_BACK_URL_PENDING') ?: 'http://127.0.0.1:5500/frontend/index.html?payment=pending'),
            ],
            'external_reference' => $userId,
        ];

        $response = Http::withToken($this->accessToken())
            ->timeout(20)
            ->acceptJson()
            ->post(self::API.'/checkout/preferences', $payload);

        if (! $response->successful()) {
            Log::error('Erro ao criar preferência no Mercado Pago', [
                'status' => $response->status(),
                'body' => substr($response->body(), 0, 500),
            ]);

            return ['status' => 500, 'body' => ['message' => 'Não foi possível iniciar o processo de pagamento.']];
        }

        return ['status' => 200, 'body' => ['preferenceId' => $response->json('id')]];
    }

    /**
     * Processa a notificação; nunca lança — o webhook responde sempre 200 (igual ao Node).
     *
     * @param  array<string,mixed>  $notification
     */
    public function handleWebhook(array $notification): void
    {
        try {
            if (($notification['type'] ?? null) !== 'payment') {
                return;
            }

            $paymentId = $notification['data']['id'] ?? null;
            if ($paymentId === null || $paymentId === '') {
                return;
            }

            $response = Http::withToken($this->accessToken())
                ->timeout(20)
                ->acceptJson()
                ->get(self::API.'/v1/payments/'.$paymentId);

            if (! $response->successful()) {
                Log::warning('[WEBHOOK]: falha ao obter pagamento', ['status' => $response->status()]);

                return;
            }

            $payment = $response->json();
            if (($payment['status'] ?? null) !== 'approved') {
                return;
            }

            $userId = $payment['external_reference'] ?? null;
            if ($userId === null || $userId === '') {
                Log::error('[WEBHOOK]: ERRO CRÍTICO - Pagamento aprovado sem external_reference (UserID).');

                return;
            }

            $subscriptionId = $payment['preapproval_id'] ?? null;
            $expiresAt = now()->addDays(30);

            DB::transaction(function () use ($subscriptionId, $paymentId, $expiresAt, $userId): void {
                if ($subscriptionId) {
                    DB::update(
                        "UPDATE users
                         SET account_type = 'individual',
                             subscription_id = ?,
                             subscription_status = 'active',
                             subscription_expires_at = ?
                         WHERE id = ?",
                        [$subscriptionId, $expiresAt, $userId]
                    );

                    return;
                }

                DB::update(
                    "UPDATE users
                     SET account_type = 'individual',
                         subscription_id = ?,
                         subscription_status = 'active_onetime',
                         subscription_expires_at = ?
                     WHERE id = ?",
                    ['pix_'.$paymentId, $expiresAt, $userId]
                );
            });

            Log::info("[WEBHOOK]: SUCESSO! Plano de 30 dias ativado para o usuário {$userId}.");
        } catch (\Throwable $e) {
            Log::error('[WEBHOOK]: ERRO GERAL ao processar notificação: '.$e->getMessage());
        }
    }

    private function accessToken(): string
    {
        return trim((string) (env('MERCADOPAGO_ACCESS_TOKEN') ?: ''));
    }
}
