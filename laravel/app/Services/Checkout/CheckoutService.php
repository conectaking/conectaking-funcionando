<?php

namespace App\Services\Checkout;

use App\Support\AesGcmCrypto;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Checkout KingForms — PagBank (modules/checkout/checkout.service.js).
 */
class CheckoutService
{
    private const PAY_BUTTON_LABEL_DEFAULT = 'Pagamento';

    public function __construct(private readonly PagBankClient $pagbank)
    {
    }

    /**
     * @return array<string,mixed>|null
     */
    public function getCheckoutConfig(int $profileItemId): ?array
    {
        if (! Schema::hasTable('profile_items')) {
            return null;
        }

        $row = DB::selectOne(
            "SELECT fcc.id, fcc.profile_item_id, fcc.pagbank_seller_id, fcc.pagbank_access_token_encrypted,
                    fcc.checkout_page_logo_url, fcc.checkout_page_primary_color, fcc.checkout_page_title,
                    fcc.checkout_page_footer, fcc.created_at, fcc.updated_at,
                    dfi.checkout_enabled, dfi.price_cents, dfi.pay_button_label
             FROM profile_items pi
             LEFT JOIN form_checkout_configs fcc ON fcc.profile_item_id = pi.id
             LEFT JOIN digital_form_items dfi ON dfi.profile_item_id = pi.id
             WHERE pi.id = ? AND pi.item_type = 'digital_form'",
            [$profileItemId]
        );

        if (! $row) {
            return null;
        }

        return [
            'profile_item_id' => $row->profile_item_id ?? $profileItemId,
            'checkout_enabled' => (bool) ($row->checkout_enabled ?? false),
            'price_cents' => $row->price_cents ?? null,
            'pay_button_label' => $row->pay_button_label ?: self::PAY_BUTTON_LABEL_DEFAULT,
            'pagbank_seller_id' => $row->pagbank_seller_id ?: null,
            'checkout_page_logo_url' => $row->checkout_page_logo_url ?: null,
            'checkout_page_primary_color' => $row->checkout_page_primary_color ?: '#22c55e',
            'checkout_page_title' => $row->checkout_page_title ?: null,
            'checkout_page_footer' => $row->checkout_page_footer ?: null,
            // token nunca exposto; só usado internamente
        ];
    }

    /**
     * @param  array<string,mixed>  $data
     *
     * @throws CheckoutException
     */
    public function saveCheckoutConfig(string $userId, int $profileItemId, array $data): void
    {
        $owns = DB::selectOne(
            "SELECT id FROM profile_items WHERE id = ? AND user_id = ? AND item_type = 'digital_form'",
            [$profileItemId, $userId]
        );
        if (! $owns) {
            throw new CheckoutException('Formulário não encontrado ou sem permissão', 404);
        }

        $payButtonLabel = trim((string) ($data['pay_button_label'] ?? ''));
        $accessToken = trim((string) ($data['pagbank_access_token'] ?? ''));
        $encryptedToken = $accessToken !== ''
            ? AesGcmCrypto::encrypt($accessToken, $this->encryptionKey())
            : null;

        DB::transaction(function () use ($profileItemId, $data, $payButtonLabel, $encryptedToken): void {
            DB::update(
                "UPDATE digital_form_items SET
                    checkout_enabled = COALESCE(?::boolean, FALSE),
                    price_cents = ?::integer,
                    pay_button_label = COALESCE(NULLIF(TRIM(?), ''), 'Pagamento'),
                    updated_at = NOW()
                 WHERE profile_item_id = ?",
                [
                    $this->boolParam($data['checkout_enabled'] ?? null),
                    $this->intParam($data['price_cents'] ?? null),
                    $payButtonLabel !== '' ? $payButtonLabel : self::PAY_BUTTON_LABEL_DEFAULT,
                    $profileItemId,
                ]
            );

            DB::insert(
                'INSERT INTO form_checkout_configs (
                     profile_item_id, pagbank_seller_id, pagbank_access_token_encrypted,
                     checkout_page_logo_url, checkout_page_primary_color, checkout_page_title,
                     checkout_page_footer, updated_at
                 ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
                 ON CONFLICT (profile_item_id) DO UPDATE SET
                     pagbank_seller_id = COALESCE(EXCLUDED.pagbank_seller_id, form_checkout_configs.pagbank_seller_id),
                     pagbank_access_token_encrypted = COALESCE(EXCLUDED.pagbank_access_token_encrypted, form_checkout_configs.pagbank_access_token_encrypted),
                     checkout_page_logo_url = COALESCE(EXCLUDED.checkout_page_logo_url, form_checkout_configs.checkout_page_logo_url),
                     checkout_page_primary_color = COALESCE(EXCLUDED.checkout_page_primary_color, form_checkout_configs.checkout_page_primary_color),
                     checkout_page_title = COALESCE(EXCLUDED.checkout_page_title, form_checkout_configs.checkout_page_title),
                     checkout_page_footer = COALESCE(EXCLUDED.checkout_page_footer, form_checkout_configs.checkout_page_footer),
                     updated_at = NOW()',
                [
                    $profileItemId,
                    $this->textParam($data['pagbank_seller_id'] ?? null),
                    $encryptedToken,
                    $this->textParam($data['checkout_page_logo_url'] ?? null),
                    $this->textParam($data['checkout_page_primary_color'] ?? null),
                    $this->textParam($data['checkout_page_title'] ?? null),
                    $this->textParam($data['checkout_page_footer'] ?? null),
                ]
            );
        });
    }

    /**
     * No checkout transparente basta o ID do vendedor; o token é o da plataforma.
     *
     * @param  array{pagbank_access_token?:string|null, pagbank_seller_id?:string|null}  $overrides
     * @return array{ok:bool, message:string}
     *
     * @throws CheckoutException
     */
    public function testConnection(int $profileItemId, array $overrides = []): array
    {
        $config = $this->getCheckoutConfig($profileItemId);
        if ($config === null) {
            throw new CheckoutException('Formulário não encontrado', 404);
        }

        $sellerId = trim((string) ($overrides['pagbank_seller_id'] ?: ($config['pagbank_seller_id'] ?? '')));

        $token = null;
        if (! empty($overrides['pagbank_access_token'])) {
            $token = trim((string) $overrides['pagbank_access_token']);
        } else {
            $platformToken = $this->platformToken();
            if ($platformToken !== '') {
                $token = $platformToken;
            } else {
                $token = $this->sellerToken($profileItemId);
            }
        }

        if ($sellerId === '') {
            return ['ok' => false, 'message' => 'Configure o Identificador para marketplace antes de testar (PagBank → Vendas → Plataformas e Checkout).'];
        }
        if ($token === null || $token === '') {
            return ['ok' => false, 'message' => 'Configure o token (plataforma no servidor ou token do vendedor no formulário) antes de testar.'];
        }

        return $this->pagbank->testConnection($sellerId, $token);
    }

    /**
     * @return array<string,mixed>|null
     */
    public function getSubmission(int $submissionId): ?array
    {
        if (! Schema::hasTable('digital_form_responses')) {
            return null;
        }

        $row = DB::selectOne(
            'SELECT dfr.id, dfr.profile_item_id, dfr.response_data, dfr.responder_name, dfr.responder_email,
                    dfr.responder_phone, dfr.submitted_at, dfr.payment_status, dfr.paid_at,
                    dfr.payment_order_id, dfr.payment_charge_id,
                    dfi.form_title, dfi.checkout_enabled, dfi.price_cents, dfi.pay_button_label
             FROM digital_form_responses dfr
             JOIN digital_form_items dfi ON dfi.profile_item_id = dfr.profile_item_id
             WHERE dfr.id = ?',
            [$submissionId]
        );

        return $row ? (array) $row : null;
    }

    /**
     * Checkout transparente: token da plataforma, split 10/90 pelo ID do vendedor.
     *
     * @param  array{card?:array<string,mixed>|null, installments?:int}  $options
     * @return array<string,mixed>
     */
    public function createCharge(int $submissionId, string $method, array $options = []): array
    {
        $submission = $this->getSubmission($submissionId);
        if ($submission === null) {
            return ['success' => false, 'error' => 'Submissão não encontrada'];
        }
        if (! ($submission['checkout_enabled'] ?? false)) {
            return ['success' => false, 'error' => 'Checkout não está ativo para este formulário'];
        }
        if (($submission['payment_status'] ?? null) === 'PAID') {
            return ['success' => false, 'error' => 'Pagamento já confirmado'];
        }

        $amountCents = (int) ($submission['price_cents'] ?? 0);
        if ($amountCents < 1) {
            return ['success' => false, 'error' => 'Valor não configurado'];
        }

        $configRow = DB::selectOne(
            'SELECT pagbank_seller_id, pagbank_access_token_encrypted FROM form_checkout_configs WHERE profile_item_id = ?',
            [$submission['profile_item_id']]
        );
        if (! $configRow) {
            return ['success' => false, 'error' => 'Configuração PagBank não encontrada'];
        }

        $sellerId = trim((string) ($configRow->pagbank_seller_id ?? ''));
        if ($sellerId === '') {
            return ['success' => false, 'error' => 'Identificador para marketplace não configurado. Configure na aba Checkout (PagBank → Vendas → Plataformas e Checkout).'];
        }

        $accessToken = $this->platformToken();
        if ($accessToken === '') {
            $encrypted = $configRow->pagbank_access_token_encrypted ?? null;
            if (! $encrypted) {
                return ['success' => false, 'error' => 'Configure o token da plataforma (PAGBANK_PLATFORM_ACCESS_TOKEN) no servidor ou o token do vendedor no formulário.'];
            }
            $accessToken = AesGcmCrypto::decrypt((string) $encrypted, $this->encryptionKey());
        }

        $payload = [
            'amountCents' => $amountCents,
            'sellerId' => $sellerId,
            'accessToken' => $accessToken,
            'referenceId' => (string) $submissionId,
            'method' => $method,
            'notificationUrl' => $this->notificationUrl(),
            'platformAccountId' => env('PAGBANK_PLATFORM_ACCOUNT_ID') ?: null,
            'customerName' => $submission['responder_name'] ?? null,
            'customerEmail' => $submission['responder_email'] ?? null,
            'customerTaxId' => $this->responseCpf($submission['response_data'] ?? null),
        ];

        if (! empty($options['card'])) {
            $card = $options['card'];
            $payload['card_number'] = $card['number'] ?? null;
            $payload['exp_month'] = $card['exp_month'] ?? null;
            $payload['exp_year'] = $card['exp_year'] ?? null;
            $payload['security_code'] = $card['security_code'] ?? null;
            $payload['holder_name'] = $card['holder_name'] ?? null;
            $payload['holder_tax_id'] = $card['holder_tax_id'] ?? null;
            $payload['installments'] = max(1, min(12, (int) ($options['installments'] ?? 1)));
        }

        $result = $this->pagbank->createCharge($payload);
        if (! ($result['success'] ?? false)) {
            return $result;
        }

        $paid = ($result['paid'] ?? false) === true;
        DB::update(
            'UPDATE digital_form_responses SET
                payment_reference_id = ?, payment_order_id = ?, payment_charge_id = ?, payment_status = ?'
                .($paid ? ', paid_at = NOW()' : '').'
             WHERE id = ?',
            [
                (string) $submissionId,
                $result['orderId'] ?? null,
                $result['chargeId'] ?? null,
                $paid ? 'PAID' : 'PENDING_PAYMENT',
                $submissionId,
            ]
        );

        return [
            'success' => true,
            'chargeId' => $result['chargeId'] ?? null,
            'orderId' => $result['orderId'] ?? null,
            'qrCode' => $result['qrCode'] ?? null,
            'qrCodeText' => $result['qrCodeText'] ?? null,
            'paid' => $result['paid'] ?? null,
        ];
    }

    /**
     * Idempotente: aceita a notificação legada (urlencoded, sem secret, validada por
     * consulta à API) e o webhook moderno (JSON assinado).
     *
     * @param  array<string,mixed>  $payload
     * @return array{processed:bool, error?:string}
     */
    public function processWebhook(array $payload, string $rawBody, string $signature): array
    {
        $notificationCode = trim((string) ($payload['notificationCode'] ?? ($payload['notification_code'] ?? '')));
        $notificationType = strtolower((string) ($payload['notificationType'] ?? ($payload['notification_type'] ?? '')));

        if ($notificationCode !== '' && $notificationType === 'transaction') {
            return $this->processLegacyNotification($notificationCode);
        }

        $secret = (string) (env('PAGBANK_WEBHOOK_SECRET') ?: '');
        if ($secret === '') {
            return ['processed' => false, 'error' => 'PAGBANK_WEBHOOK_SECRET não configurado (necessário para webhook com assinatura)'];
        }
        if ($rawBody === '' || ! $this->pagbank->verifyWebhookSignature($rawBody, $signature, $secret)) {
            return ['processed' => false, 'error' => 'Assinatura inválida'];
        }

        $refId = $payload['reference_id'] ?? null;
        $orderId = $payload['id'] ?? ($payload['order_id'] ?? null);
        $chargeId = $payload['id'] ?? ($payload['charge_id'] ?? null);
        $status = strtoupper((string) ($payload['status'] ?? ''));

        $submissionId = $refId !== null ? (int) preg_replace('/^sub-/', '', (string) $refId) : 0;

        if ($submissionId < 1) {
            $row = null;
            if ($orderId) {
                $row = DB::selectOne('SELECT id FROM digital_form_responses WHERE payment_order_id = ? LIMIT 1', [$orderId]);
            }
            if (! $row && $chargeId) {
                $row = DB::selectOne('SELECT id FROM digital_form_responses WHERE payment_charge_id = ? LIMIT 1', [$chargeId]);
            }
            if (! $row) {
                Log::warning('[Checkout] Webhook sem reference_id e sem order/charge conhecido', [
                    'orderId' => $orderId,
                    'chargeId' => $chargeId,
                ]);

                return ['processed' => true];
            }
            $this->updateSubmissionStatus((int) $row->id, $status);

            return ['processed' => true];
        }

        $existing = DB::selectOne('SELECT id, payment_status FROM digital_form_responses WHERE id = ?', [$submissionId]);
        if (! $existing) {
            Log::warning('[Checkout] Webhook reference_id não encontrado', ['submissionId' => $submissionId]);

            return ['processed' => true];
        }
        if (($existing->payment_status ?? null) === 'PAID' && $status === 'PAID') {
            return ['processed' => true];
        }

        $this->updateSubmissionStatus($submissionId, $status);

        return ['processed' => true];
    }

    /**
     * @return array{processed:bool, error?:string}
     */
    private function processLegacyNotification(string $notificationCode): array
    {
        $consult = $this->pagbank->getTransactionByNotificationCode($notificationCode);

        if (! ($consult['success'] ?? false)) {
            $statusCode = $consult['statusCode'] ?? null;
            if ($statusCode === 404 || $statusCode === 486) {
                return ['processed' => true];
            }
            if ($statusCode === 408) {
                Log::warning('[Checkout] Legacy notification consult timeout', ['notificationCode' => $notificationCode]);

                return ['processed' => true];
            }
            Log::warning('[Checkout] Legacy notification consult failed', [
                'notificationCode' => $notificationCode,
                'error' => $consult['error'] ?? null,
            ]);

            return ['processed' => false, 'error' => (string) ($consult['error'] ?? 'Falha na consulta')];
        }

        $reference = trim((string) ($consult['reference'] ?? ''));
        if ($reference === '') {
            Log::warning('[Checkout] Legacy notification sem reference na resposta', ['notificationCode' => $notificationCode]);

            return ['processed' => true];
        }

        $submissionId = (int) preg_replace('/^sub-/', '', $reference);
        if ($submissionId < 1) {
            Log::warning('[Checkout] Legacy notification reference inválido', ['reference' => $reference]);

            return ['processed' => true];
        }

        $existing = DB::selectOne('SELECT id, payment_status FROM digital_form_responses WHERE id = ?', [$submissionId]);
        if (! $existing) {
            Log::warning('[Checkout] Legacy notification reference não encontrado', ['submissionId' => $submissionId]);

            return ['processed' => true];
        }

        $statusMapped = $this->pagbank->legacyStatusToPaymentStatus($consult['status'] ?? null);
        if ($statusMapped !== null) {
            if (($existing->payment_status ?? null) === 'PAID' && $statusMapped === 'PAID') {
                return ['processed' => true];
            }
            $this->updateSubmissionStatus($submissionId, $statusMapped);
        }

        return ['processed' => true];
    }

    private function updateSubmissionStatus(int $submissionId, string $status): void
    {
        if ($status === 'PAID') {
            DB::update(
                'UPDATE digital_form_responses SET payment_status = ?, paid_at = NOW() WHERE id = ?',
                ['PAID', $submissionId]
            );

            return;
        }

        if (in_array($status, ['DECLINED', 'CANCELED', 'CANCELLED', 'EXPIRED', 'REFUNDED'], true)) {
            $mapped = in_array($status, ['CANCELED', 'CANCELLED'], true) ? 'CANCELED' : 'FAILED';
            DB::update('UPDATE digital_form_responses SET payment_status = ? WHERE id = ?', [$mapped, $submissionId]);
        }
    }

    private function sellerToken(int $profileItemId): ?string
    {
        $row = DB::selectOne(
            'SELECT pagbank_access_token_encrypted FROM form_checkout_configs WHERE profile_item_id = ?',
            [$profileItemId]
        );
        $encrypted = $row->pagbank_access_token_encrypted ?? null;

        return $encrypted ? AesGcmCrypto::decrypt((string) $encrypted, $this->encryptionKey()) : null;
    }

    private function responseCpf(mixed $responseData): ?string
    {
        if (is_string($responseData)) {
            $responseData = json_decode($responseData, true);
        }

        return is_array($responseData) && ! empty($responseData['cpf']) ? (string) $responseData['cpf'] : null;
    }

    private function notificationUrl(): ?string
    {
        $base = trim((string) (env('PAGBANK_WEBHOOK_BASE_URL') ?: ''));

        return $base !== '' ? rtrim($base, '/').'/api/webhooks/pagbank' : null;
    }

    private function platformToken(): string
    {
        return trim((string) (env('PAGBANK_PLATFORM_ACCESS_TOKEN') ?: env('PAGBANK_TOKEN') ?: ''));
    }

    private function encryptionKey(): string
    {
        return (string) (env('CHECKOUT_ENCRYPTION_KEY') ?: env('JWT_SECRET') ?: 'default-key-change-me');
    }

    private function boolParam(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        return filter_var($value, FILTER_VALIDATE_BOOLEAN) ? 'true' : 'false';
    }

    private function intParam(mixed $value): ?int
    {
        return is_numeric($value) ? (int) $value : null;
    }

    private function textParam(mixed $value): ?string
    {
        if ($value === null || ! is_scalar($value)) {
            return null;
        }
        $text = (string) $value;

        return $text !== '' ? $text : null;
    }
}
