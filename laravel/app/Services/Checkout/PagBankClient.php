<?php

namespace App\Services\Checkout;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Cliente da API de Pedidos do PagBank (modules/checkout/pagbank.client.js).
 * O SDK Node é substituído por Http::, com os mesmos payloads.
 */
class PagBankClient
{
    /** Split: 10% plataforma, 90% vendedor. */
    private const SPLIT_PLATFORM_PERCENT = 10;

    private const SPLIT_SELLER_PERCENT = 90;

    /** Identificador para marketplace: ACCO_ + UUID. */
    private const MARKETPLACE_ID_REGEX = '/^ACCO_[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/';

    /**
     * @return array{ok:bool, message:string}
     */
    public function testConnection(string $sellerId, string $accessToken): array
    {
        if ($sellerId === '' || $accessToken === '') {
            return ['ok' => false, 'message' => 'Credenciais incompletas. Preencha o Identificador para marketplace e use o token da plataforma (servidor) ou informe um token.'];
        }

        $trimmed = trim($sellerId);
        if (! preg_match(self::MARKETPLACE_ID_REGEX, $trimmed)) {
            return [
                'ok' => false,
                'message' => 'Identificador para marketplace inválido. Copie no PagBank (Vendas → Plataformas e Checkout). Formato: ACCO_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
            ];
        }

        try {
            $this->createOrderPix($accessToken, [
                'amountCents' => 1,
                'referenceId' => 'test-connection-'.(int) (microtime(true) * 1000),
                'customerName' => 'Teste Conexão',
                'customerEmail' => 'teste@conectaking.com.br',
                'customerTaxId' => null,
                'platformAccountId' => $this->platformAccountId(),
                'sellerAccountId' => $trimmed,
                'notificationUrl' => null,
            ]);

            return ['ok' => true, 'message' => 'Conexão com a API PagBank OK. Conta liberada para criar cobranças (Pix e cartão).'];
        } catch (\Throwable $e) {
            $msg = $e->getMessage();
            if (preg_match('/whitelist|liberada para usar a API|403/i', $msg)) {
                return ['ok' => false, 'message' => 'Sua conta PagBank ainda não está liberada para a API de pedidos com split. Entre em contato com o PagBank/PagSeguro e solicite a liberação (whitelist) da API de pedidos para sua aplicação.'];
            }
            if (preg_match('/401|unauthorized|token inválido|expirado/i', $msg)) {
                return ['ok' => false, 'message' => 'Token inválido ou expirado. Verifique o token da plataforma no servidor (PAGBANK_TOKEN / PAGBANK_PLATFORM_ACCESS_TOKEN).'];
            }

            return ['ok' => false, 'message' => $msg !== '' ? $msg : 'Falha ao testar conexão com a API PagBank.'];
        }
    }

    /**
     * @param  array<string,mixed>  $params
     * @return array<string,mixed>
     */
    public function createCharge(array $params): array
    {
        $amountCents = (int) ($params['amountCents'] ?? 0);
        $accessToken = (string) ($params['accessToken'] ?? '');
        $referenceId = (string) ($params['referenceId'] ?? '');
        $method = (string) ($params['method'] ?? '');

        if ($amountCents < 1 || $accessToken === '' || $referenceId === '') {
            return ['success' => false, 'error' => 'Parâmetros inválidos para criar cobrança'];
        }

        $sellerAccountId = (string) ($params['sellerId'] ?? $params['sellerAccountId'] ?? '');
        if ($sellerAccountId === '') {
            return ['success' => false, 'error' => 'ID da conta do vendedor (seller) não configurado'];
        }

        $common = [
            'amountCents' => $amountCents,
            'referenceId' => $referenceId,
            'customerName' => $params['customerName'] ?? null,
            'customerEmail' => $params['customerEmail'] ?? null,
            'customerTaxId' => $params['customerTaxId'] ?? null,
            'notificationUrl' => $params['notificationUrl'] ?? null,
            'platformAccountId' => $params['platformAccountId'] ?? null,
            'sellerAccountId' => $sellerAccountId,
        ];

        if ($method === 'pix') {
            try {
                return $this->createOrderPix($accessToken, $common);
            } catch (\Throwable $e) {
                return ['success' => false, 'error' => $e->getMessage() ?: 'Falha ao criar PIX'];
            }
        }

        if (in_array($method, ['card', 'credit_card', 'debit_card'], true)) {
            $card = is_array($params['card'] ?? null) ? $params['card'] : [];
            $cardNumber = $params['card_number'] ?? ($card['number'] ?? null);
            $expMonth = $params['exp_month'] ?? ($card['exp_month'] ?? null);
            $expYear = $params['exp_year'] ?? ($card['exp_year'] ?? null);
            $securityCode = $params['security_code'] ?? ($card['security_code'] ?? null);
            $holderName = $params['holder_name'] ?? ($card['holder_name'] ?? null);
            $holderTaxId = $params['holder_tax_id'] ?? ($card['holder_tax_id'] ?? null);

            if (! $cardNumber || ! $expMonth || ! $expYear || ! $securityCode || ! $holderName) {
                return ['success' => false, 'error' => 'Dados do cartão incompletos (número, validade, CVV e nome do titular)'];
            }

            try {
                return $this->createOrderCard($accessToken, $common + [
                    'cardNumber' => $cardNumber,
                    'expMonth' => $expMonth,
                    'expYear' => $expYear,
                    'securityCode' => $securityCode,
                    'holderName' => $holderName,
                    'holderTaxId' => $holderTaxId,
                    'cardType' => $method === 'debit_card' ? 'debit' : 'credit',
                    'installments' => $params['installments'] ?? 1,
                ]);
            } catch (\Throwable $e) {
                return ['success' => false, 'error' => $e->getMessage() ?: 'Falha ao processar cartão'];
            }
        }

        return ['success' => false, 'error' => 'Método inválido. Use pix, card, credit_card ou debit_card.'];
    }

    /**
     * Header x-authenticity-token = SHA256(secret + '-' + payload).
     */
    public function verifyWebhookSignature(string $payload, string $signature, string $secret): bool
    {
        if ($payload === '' || $secret === '' || $signature === '') {
            return false;
        }

        return hash_equals(hash('sha256', $secret.'-'.$payload), strtolower($signature));
    }

    /**
     * Consulta da notificação legada (painel comercial) — XML com <reference> e <status>.
     *
     * @return array{success:bool, reference?:string, status?:int|null, error?:string, statusCode?:int|null}
     */
    public function getTransactionByNotificationCode(string $notificationCode): array
    {
        $email = trim((string) (env('PAGBANK_EMAIL') ?: ''));
        $token = trim((string) (env('PAGBANK_TOKEN') ?: ''));

        if ($notificationCode === '' || $email === '' || $token === '') {
            return ['success' => false, 'error' => 'notificationCode, PAGBANK_EMAIL e PAGBANK_TOKEN são obrigatórios para consulta legada', 'statusCode' => null];
        }

        $url = rtrim($this->legacyBaseUrl(), '/').'/v3/transactions/notifications/'.rawurlencode($notificationCode);

        try {
            $response = Http::timeout(20)
                ->withHeaders(['Accept' => 'application/xml'])
                ->get($url, ['email' => $email, 'token' => $token]);
        } catch (\Throwable $e) {
            Log::warning('[Checkout] PagBank legacy consult exception: '.$e->getMessage());

            return ['success' => false, 'error' => $e->getMessage() ?: 'Falha ao consultar notificação', 'statusCode' => null];
        }

        if (! $response->successful()) {
            if (! in_array($response->status(), [404, 486], true)) {
                Log::warning('[Checkout] PagBank legacy notification consult error', [
                    'status' => $response->status(),
                    'notificationCode' => $notificationCode,
                ]);
            }

            return ['success' => false, 'error' => 'PagBank API '.$response->status(), 'statusCode' => $response->status()];
        }

        $text = $response->body();
        preg_match('/<reference>([^<]*)<\/reference>/i', $text, $refMatch);
        preg_match('/<status>([^<]*)<\/status>/i', $text, $statusMatch);

        return [
            'success' => true,
            'reference' => trim($refMatch[1] ?? ''),
            'status' => isset($statusMatch[1]) && $statusMatch[1] !== '' ? (int) $statusMatch[1] : null,
        ];
    }

    /**
     * 1=aguardando, 2=em análise, 3=paga, 4=disponível, 5=disputa, 6=devolvida, 7=cancelada, 8=debitado, 9=retenção.
     */
    public function legacyStatusToPaymentStatus(?int $legacyStatus): ?string
    {
        if ($legacyStatus === 3 || $legacyStatus === 4) {
            return 'PAID';
        }
        if ($legacyStatus === 7 || $legacyStatus === 8) {
            return 'CANCELED';
        }
        if (in_array($legacyStatus, [5, 6, 9], true)) {
            return 'FAILED';
        }

        return null;
    }

    /**
     * @param  array<string,mixed>  $params
     * @return array<string,mixed>
     */
    private function createOrderPix(string $accessToken, array $params): array
    {
        $amountCents = (int) $params['amountCents'];
        $referenceId = (string) $params['referenceId'];
        $platformAccountId = $params['platformAccountId'] ?? null;
        $sellerAccountId = (string) $params['sellerAccountId'];

        $platformValue = (int) round($amountCents * self::SPLIT_PLATFORM_PERCENT / 100);
        $sellerValue = $amountCents - $platformValue;

        $receivers = [];
        if ($platformAccountId && $platformValue > 0) {
            $receivers[] = ['account' => ['id' => $platformAccountId], 'amount' => ['value' => $platformValue]];
        }
        $receivers[] = ['account' => ['id' => $sellerAccountId], 'amount' => ['value' => $sellerValue]];

        $body = [
            'reference_id' => $referenceId,
            'customer' => [
                'name' => $params['customerName'] ?: 'Cliente',
                'email' => $params['customerEmail'] ?: 'cliente@email.com',
                'tax_id' => $this->taxId($params['customerTaxId'] ?? null),
                'phones' => [['country' => '55', 'area' => '11', 'number' => '999999999', 'type' => 'MOBILE']],
            ],
            'items' => [[
                'reference_id' => 'sub-'.$referenceId,
                'name' => 'Formulário KingForms',
                'quantity' => 1,
                'unit_amount' => $amountCents,
            ]],
            'qr_codes' => [[
                'amount' => ['value' => $amountCents],
                'expiration_date' => $this->expirationDate(),
                'splits' => ['method' => 'FIXED', 'receivers' => $receivers],
            ]],
            'notification_urls' => $params['notificationUrl'] ? [$params['notificationUrl']] : [],
        ];

        $order = $this->apiRequest($accessToken, 'POST', '/orders', $body);
        $qr = $order['qr_codes'][0] ?? null;
        $qrId = $qr['id'] ?? null;
        $qrText = $qr['text'] ?? null;

        $qrCodeBase64 = null;
        if ($qrId) {
            try {
                $qrResponse = Http::timeout(20)
                    ->withToken($accessToken)
                    ->withHeaders(['Accept' => 'text/plain'])
                    ->get(rtrim($this->baseUrl(), '/').'/qrcode/'.$qrId.'/base64');
                if ($qrResponse->successful()) {
                    $qrCodeBase64 = $qrResponse->body();
                }
            } catch (\Throwable) {
                // QR em base64 é opcional; o texto copia-e-cola já resolve.
            }
        }

        return [
            'success' => true,
            'orderId' => $order['id'] ?? null,
            'chargeId' => $qrId ?: ($order['id'] ?? null),
            'qrCode' => $qrCodeBase64 ?: $qrText,
            'qrCodeText' => $qrText,
        ];
    }

    /**
     * @param  array<string,mixed>  $params
     * @return array<string,mixed>
     */
    private function createOrderCard(string $accessToken, array $params): array
    {
        $amountCents = (int) $params['amountCents'];
        $referenceId = (string) $params['referenceId'];
        $platformAccountId = $params['platformAccountId'] ?? null;
        $sellerAccountId = (string) $params['sellerAccountId'];

        $taxId = $this->taxId($params['customerTaxId'] ?? ($params['holderTaxId'] ?? null));
        $holderTaxId = $this->taxId($params['holderTaxId'] ?? ($params['customerTaxId'] ?? null));
        if ($holderTaxId === '00000000000') {
            $holderTaxId = $taxId;
        }

        $receivers = [];
        if ($platformAccountId) {
            $receivers[] = ['account' => ['id' => $platformAccountId], 'amount' => ['value' => self::SPLIT_PLATFORM_PERCENT]];
        }
        $receivers[] = ['account' => ['id' => $sellerAccountId], 'amount' => ['value' => self::SPLIT_SELLER_PERCENT]];

        $installments = max(1, min(12, (int) ($params['installments'] ?? 1)));

        $body = [
            'reference_id' => $referenceId,
            'customer' => [
                'name' => $params['customerName'] ?: 'Cliente',
                'email' => $params['customerEmail'] ?: 'cliente@email.com',
                'tax_id' => $taxId,
                'phones' => [['country' => '55', 'area' => '11', 'number' => '999999999', 'type' => 'MOBILE']],
            ],
            'items' => [[
                'reference_id' => 'sub-'.$referenceId,
                'name' => 'Formulário KingForms',
                'quantity' => 1,
                'unit_amount' => $amountCents,
            ]],
            'shipping' => ['address' => [
                'street' => 'Avenida Brigadeiro Faria Lima',
                'number' => '1384',
                'complement' => 'Sala 1',
                'locality' => 'Pinheiros',
                'city' => 'São Paulo',
                'region_code' => 'SP',
                'country' => 'BRA',
                'postal_code' => '01452002',
            ]],
            'notification_urls' => $params['notificationUrl'] ? [$params['notificationUrl']] : [],
            'charges' => [[
                'reference_id' => 'sub-'.$referenceId,
                'description' => 'Pagamento KingForms',
                'amount' => ['value' => $amountCents, 'currency' => 'BRL'],
                'payment_method' => [
                    'type' => ($params['cardType'] ?? 'credit') === 'debit' ? 'DEBIT_CARD' : 'CREDIT_CARD',
                    'installments' => $installments,
                    'capture' => true,
                    'card' => [
                        'number' => preg_replace('/\D/', '', (string) $params['cardNumber']),
                        'exp_month' => substr(str_pad((string) $params['expMonth'], 2, '0', STR_PAD_LEFT), -2),
                        'exp_year' => substr((string) $params['expYear'], -2),
                        'security_code' => substr((string) preg_replace('/\D/', '', (string) $params['securityCode']), 0, 4),
                        'holder' => [
                            'name' => mb_substr(trim((string) ($params['holderName'] ?: $params['customerName'] ?: 'Titular')), 0, 64),
                            'tax_id' => $holderTaxId,
                        ],
                        'store' => false,
                    ],
                ],
                'splits' => ['method' => 'PERCENTAGE', 'receivers' => $receivers],
            ]],
        ];

        $order = $this->apiRequest($accessToken, 'POST', '/orders', $body);
        $charge = $order['charges'][0] ?? null;
        $status = $charge['status'] ?? ($order['status'] ?? null);

        return [
            'success' => true,
            'orderId' => $order['id'] ?? null,
            'chargeId' => ($charge['id'] ?? null) ?: ($order['id'] ?? null),
            'status' => $status,
            'paid' => $status === 'PAID',
        ];
    }

    /**
     * @param  array<string,mixed>|null  $body
     * @return array<string,mixed>
     */
    private function apiRequest(string $accessToken, string $method, string $path, ?array $body = null): array
    {
        $url = str_starts_with($path, 'http') ? $path : rtrim($this->baseUrl(), '/').$path;

        $request = Http::timeout(30)->withToken($accessToken)->acceptJson();
        $response = match ($method) {
            'POST' => $request->post($url, $body ?? []),
            'PUT' => $request->put($url, $body ?? []),
            default => $request->get($url),
        };

        if (! $response->successful()) {
            $data = $response->json();
            $text = $response->body();
            $rawMsg = $data['error_description'] ?? ($data['message'] ?? $text);

            Log::warning('[Checkout] PagBank API error', [
                'status' => $response->status(),
                'path' => $path,
                'message' => is_string($rawMsg) ? substr($rawMsg, 0, 300) : null,
            ]);

            if ($response->status() === 403) {
                $errMessages = is_array($data['error_messages'] ?? null) ? $data['error_messages'] : [];
                $hasWhitelist = (bool) preg_match('/whitelist|ACCESS_DENIED/i', $text);
                foreach ($errMessages as $m) {
                    $needle = (string) (($m['description'] ?? null) ?: ($m['code'] ?? ''));
                    if (preg_match('/whitelist|ACCESS_DENIED/i', $needle)) {
                        $hasWhitelist = true;
                    }
                }
                if ($hasWhitelist) {
                    throw new RuntimeException('Sua conta PagBank ainda não está liberada para usar a API de pedidos com split. Entre em contato com o PagBank/PagSeguro e solicite a liberação (whitelist) da API de pedidos para sua aplicação.');
                }
            }

            throw new RuntimeException(
                is_string($rawMsg) && $rawMsg !== ''
                    ? $rawMsg
                    : 'PagBank API '.$response->status().': '.substr($text, 0, 200)
            );
        }

        $json = $response->json();

        return is_array($json) ? $json : [];
    }

    private function taxId(mixed $value): string
    {
        $digits = substr((string) preg_replace('/\D/', '', (string) ($value ?? '')), 0, 11);

        return $digits !== '' ? $digits : '00000000000';
    }

    /** Pix expira em 30 min; o PagBank exige offset explícito no lugar do Z. */
    private function expirationDate(): string
    {
        return gmdate('Y-m-d\TH:i:s', time() + 30 * 60).'-00:00';
    }

    private function baseUrl(): string
    {
        return (string) (env('PAGBANK_API_BASE_URL') ?: env('PAGBANK_API_URL') ?: 'https://sandbox.api.pagseguro.com');
    }

    private function legacyBaseUrl(): string
    {
        return (string) (env('PAGBANK_LEGACY_API_URL') ?: 'https://ws.sandbox.pagseguro.uol.com.br');
    }

    private function platformAccountId(): ?string
    {
        $id = trim((string) (env('PAGBANK_PLATFORM_ACCOUNT_ID') ?: ''));

        return $id !== '' ? $id : null;
    }
}
