<?php

namespace App\Http\Controllers\Checkout;

use App\Http\Controllers\Controller;
use App\Services\Checkout\CheckoutException;
use App\Services\Checkout\CheckoutService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Checkout KingForms — PagBank (modules/checkout/checkout.controller.js).
 * Respostas planas ({success, ...}), sem o envelope do responseFormatter.
 */
class CheckoutController extends Controller
{
    public function __construct(private readonly CheckoutService $checkout)
    {
    }

    /** Público: dados para renderizar a página de checkout. */
    public function page(Request $request)
    {
        $submissionId = $this->submissionId($request->query('submissionId'));
        if ($submissionId === null) {
            return $this->json(['success' => false, 'message' => 'submissionId inválido'], 400);
        }

        $submission = $this->checkout->getSubmission($submissionId);
        if ($submission === null) {
            return $this->json(['success' => false, 'message' => 'Submissão não encontrada'], 404);
        }

        return $this->json([
            'success' => true,
            'submission' => [
                'id' => $submission['id'],
                'form_title' => $submission['form_title'] ?? null,
                'price_cents' => $submission['price_cents'] ?? null,
                'responder_name' => $submission['responder_name'] ?? null,
                'responder_email' => $submission['responder_email'] ?? null,
                'responder_phone' => $submission['responder_phone'] ?? null,
                'submitted_at' => $submission['submitted_at'] ?? null,
                'payment_status' => $submission['payment_status'] ?: 'PENDING_PAYMENT',
                'paid_at' => $submission['paid_at'] ?? null,
            ],
        ]);
    }

    /**
     * Público: HTML da página de pagamento (`GET /:slug/form/:itemId/checkout`),
     * equivalente ao `res.render('checkout')` do Node.
     */
    public function pageHtml(Request $request, string $slug, string $itemId)
    {
        $submissionId = $this->submissionId($request->query('submissionId'));
        if ($submissionId === null) {
            return $this->html('<h1>Link inválido</h1><p>Falta o parâmetro submissionId.</p>', 400);
        }
        $itemIdInt = (int) $itemId;
        if ($itemIdInt < 1) {
            return $this->html('<h1>ID do formulário inválido</h1>', 400);
        }

        $user = DB::selectOne('SELECT id FROM users WHERE profile_slug = ? OR id::text = ?', [$slug, $slug]);
        if (! $user) {
            return $this->html('<h1>Perfil não encontrado</h1>', 404);
        }

        $row = DB::selectOne(
            'SELECT dfr.id, dfr.profile_item_id, dfr.responder_name, dfr.responder_email, dfr.responder_phone,
                    dfr.submitted_at, dfr.payment_status, dfr.paid_at, dfr.payment_order_id,
                    dfi.form_title, dfi.checkout_enabled, dfi.price_cents, dfi.pay_button_label,
                    dfi.banner_image_url, dfi.header_image_url
             FROM digital_form_responses dfr
             JOIN digital_form_items dfi ON dfi.profile_item_id = dfr.profile_item_id
             JOIN profile_items pi ON pi.id = dfr.profile_item_id AND pi.user_id = ?
             WHERE dfr.id = ? AND dfr.profile_item_id = ?',
            [$user->id, $submissionId, $itemIdInt]
        );
        if (! $row) {
            return $this->html('<h1>Submissão não encontrada</h1>', 404);
        }
        if (empty($row->checkout_enabled)) {
            return redirect("/{$slug}/form/{$itemId}/success?response_id={$submissionId}&show_success_page=true")
                ->header('X-Conecta-Engine', 'laravel');
        }

        $config = $this->checkout->getCheckoutConfig((int) $row->profile_item_id) ?? [];

        return response()->view('checkout.kingforms', [
            'submissionId' => $row->id,
            'formTitle' => $row->form_title ?: 'Formulário',
            'priceCents' => (int) ($row->price_cents ?? 0),
            'payButtonLabel' => $row->pay_button_label ?: 'Pagamento',
            'responderName' => $row->responder_name,
            'responderEmail' => $row->responder_email,
            'responderPhone' => $row->responder_phone,
            'submittedAt' => $row->submitted_at,
            'paymentStatus' => $row->payment_status ?: 'PENDING_PAYMENT',
            'paidAt' => $row->paid_at,
            'slug' => $slug,
            'itemId' => $itemIdInt,
            'baseUrl' => rtrim($request->getSchemeAndHttpHost(), '/'),
            'checkoutPageLogoUrl' => $config['checkout_page_logo_url'] ?? '',
            'checkoutPagePrimaryColor' => $config['checkout_page_primary_color'] ?? '#1152d4',
            'checkoutPageTitle' => $config['checkout_page_title'] ?? '',
            'checkoutPageFooter' => $config['checkout_page_footer'] ?? '',
            'formCoverImageUrl' => $row->banner_image_url
                ?: ($row->header_image_url ?: ($config['checkout_page_logo_url'] ?? '')),
        ])->header('X-Conecta-Engine', 'laravel');
    }

    private function html(string $body, int $status)
    {
        return response(
            '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">'
            .'<meta name="viewport" content="width=device-width, initial-scale=1">'
            .'<title>Checkout</title></head>'
            .'<body style="font-family:sans-serif;text-align:center;padding:3rem;background:#0D0D0F;color:#ECECEC;">'
            .$body.'</body></html>',
            $status
        )->header('Content-Type', 'text/html; charset=UTF-8')->header('X-Conecta-Engine', 'laravel');
    }

    /** Público: cria a cobrança Pix/cartão. */
    public function create(Request $request)
    {
        $body = is_array($request->all()) ? $request->all() : [];

        $submissionId = $this->submissionId($body['submissionId'] ?? null);
        if ($submissionId === null) {
            return $this->json(['success' => false, 'errors' => ['submissionId inválido']], 400);
        }

        $method = (string) ($body['method'] ?? '');
        if (! in_array($method, ['pix', 'card', 'credit_card', 'debit_card'], true)) {
            return $this->json([
                'success' => false,
                'errors' => ['method deve ser pix, card, credit_card ou debit_card'],
            ], 400);
        }

        $options = [];
        if ($method !== 'pix') {
            $card = is_array($body['card'] ?? null) ? $body['card'] : [];
            $options['card'] = [
                'number' => $body['card_number'] ?? ($card['number'] ?? null),
                'exp_month' => $body['exp_month'] ?? ($card['exp_month'] ?? null),
                'exp_year' => $body['exp_year'] ?? ($card['exp_year'] ?? null),
                'security_code' => $body['security_code'] ?? ($card['security_code'] ?? null),
                'holder_name' => $body['holder_name'] ?? ($card['holder_name'] ?? null),
                'holder_tax_id' => $body['holder_tax_id'] ?? ($card['holder_tax_id'] ?? null),
            ];
            $options['installments'] = (int) ($body['installments'] ?? ($card['installments'] ?? 1)) ?: 1;
        }

        try {
            $result = $this->checkout->createCharge($submissionId, $method, $options);
        } catch (\Throwable $e) {
            Log::error('[Checkout] Falha ao criar cobrança: '.$e->getMessage());

            return $this->json(['success' => false, 'error' => $e->getMessage()], 400);
        }

        if (! ($result['success'] ?? false)) {
            return $this->json(['success' => false, 'error' => $result['error'] ?? 'Falha ao criar cobrança'], 400);
        }

        return $this->json([
            'success' => true,
            'chargeId' => $result['chargeId'] ?? null,
            'orderId' => $result['orderId'] ?? null,
            'qrCode' => $result['qrCode'] ?? null,
            'qrCodeText' => $result['qrCodeText'] ?? null,
            'paid' => $result['paid'] ?? null,
        ]);
    }

    public function getConfig(Request $request, string $itemId)
    {
        $id = (int) $itemId;
        if ($id < 1) {
            return $this->json(['success' => false, 'message' => 'itemId inválido'], 400);
        }

        if (! $this->ownsForm($id, $this->userId($request))) {
            return $this->json(['success' => false, 'message' => 'Formulário não encontrado'], 404);
        }

        try {
            $config = $this->checkout->getCheckoutConfig($id);
        } catch (\Throwable $e) {
            Log::error('[Checkout] Erro ao buscar config: '.$e->getMessage());

            return $this->json(['success' => false, 'message' => 'Erro ao buscar configuração.'], 500);
        }

        return $this->json(['success' => true, 'config' => $config ?: new \stdClass]);
    }

    public function saveConfig(Request $request, string $itemId)
    {
        $id = (int) $itemId;
        if ($id < 1) {
            return $this->json(['success' => false, 'message' => 'itemId inválido'], 400);
        }

        try {
            $this->checkout->saveCheckoutConfig(
                $this->userId($request),
                $id,
                is_array($request->all()) ? $request->all() : []
            );
        } catch (CheckoutException $e) {
            return $this->json(['success' => false, 'message' => $e->getMessage()], $e->statusCode());
        } catch (\Throwable $e) {
            Log::error('[Checkout] Erro ao salvar config: '.$e->getMessage());

            return $this->json(['success' => false, 'message' => 'Erro ao salvar configuração.'], 500);
        }

        return $this->json(['success' => true]);
    }

    public function testConnection(Request $request)
    {
        $profileItemId = (int) $request->input('profile_item_id');
        if ($profileItemId < 1) {
            return $this->json(['success' => false, 'message' => 'profile_item_id inválido'], 400);
        }

        // O Node não checa o dono aqui; sem a checagem dá para disparar um pedido
        // de teste contra o seller de outra conta.
        if (! $this->ownsForm($profileItemId, $this->userId($request))) {
            return $this->json(['success' => false, 'message' => 'Formulário não encontrado'], 404);
        }

        try {
            $result = $this->checkout->testConnection($profileItemId, [
                'pagbank_access_token' => trim((string) $request->input('pagbank_access_token', '')) ?: null,
                'pagbank_seller_id' => trim((string) $request->input('pagbank_seller_id', '')) ?: null,
            ]);
        } catch (CheckoutException $e) {
            return $this->json(['success' => false, 'message' => $e->getMessage()], $e->statusCode());
        } catch (\Throwable $e) {
            Log::error('[Checkout] Erro no teste de conexão: '.$e->getMessage());

            return $this->json(['ok' => false, 'message' => $e->getMessage()]);
        }

        return $this->json(['ok' => $result['ok'], 'message' => $result['message']]);
    }

    /** Link para abrir a página de checkout a partir da última resposta do formulário. */
    public function previewLink(Request $request)
    {
        $itemId = (int) $request->query('itemId');
        if ($itemId < 1) {
            return $this->json(['success' => false, 'message' => 'itemId inválido'], 400);
        }

        $row = DB::selectOne(
            "SELECT pi.id, u.profile_slug FROM profile_items pi
             JOIN users u ON u.id = pi.user_id
             WHERE pi.id = ? AND pi.user_id = ? AND pi.item_type = 'digital_form'",
            [$itemId, $this->userId($request)]
        );
        if (! $row) {
            return $this->json(['success' => false, 'message' => 'Formulário não encontrado'], 404);
        }

        $slug = (string) ($row->profile_slug ?? '');
        if ($slug === '') {
            return $this->json(['url' => null, 'message' => 'Configure o slug do seu perfil para gerar o link.']);
        }

        $response = DB::selectOne(
            'SELECT id FROM digital_form_responses WHERE profile_item_id = ? ORDER BY submitted_at DESC LIMIT 1',
            [$itemId]
        );
        if (! $response) {
            return $this->json([
                'url' => null,
                'slug' => $slug,
                'itemId' => $itemId,
                'message' => 'Nenhuma resposta ainda. Envie o formulário uma vez (como visitante) para gerar o link. Depois use o botão abaixo para abrir a página de checkout.',
            ]);
        }

        $submissionId = $response->id;
        $baseUrl = trim((string) (env('PUBLIC_APP_URL') ?: env('APP_URL') ?: ''));
        $url = $baseUrl !== ''
            ? rtrim($baseUrl, '/').'/'.rawurlencode($slug)."/form/{$itemId}/checkout?submissionId={$submissionId}"
            : null;

        return $this->json(['url' => $url, 'slug' => $slug, 'itemId' => $itemId, 'submissionId' => $submissionId]);
    }

    /**
     * Webhook PagBank: JSON assinado (moderno) ou urlencoded (notificação de transação).
     * O corpo bruto é necessário para conferir a assinatura.
     */
    public function webhook(Request $request)
    {
        $signature = trim((string) ($request->header('x-authenticity-token')
            ?: $request->header('x-pagbank-signature')
            ?: ''));

        $rawBody = $request->getContent();
        $contentType = strtolower((string) $request->header('Content-Type', ''));

        $payload = [];
        if ($rawBody !== '') {
            if (str_contains($contentType, 'application/x-www-form-urlencoded')) {
                parse_str($rawBody, $payload);
            } else {
                $decoded = json_decode($rawBody, true);
                if (! is_array($decoded)) {
                    return $this->json(['error' => 'Payload JSON inválido'], 400);
                }
                $payload = $decoded;
            }
        }

        try {
            $result = $this->checkout->processWebhook($payload, $rawBody, $signature);
        } catch (\Throwable $e) {
            Log::error('[Checkout] Erro no webhook PagBank: '.$e->getMessage());

            return $this->json(['error' => 'Erro ao processar webhook'], 400);
        }

        if (! ($result['processed'] ?? false) && ! empty($result['error'])) {
            return $this->json(['error' => $result['error']], 400);
        }

        return $this->json(['received' => true], 200);
    }

    private function ownsForm(int $itemId, string $userId): bool
    {
        return (bool) DB::selectOne(
            "SELECT id FROM profile_items WHERE id = ? AND user_id = ? AND item_type = 'digital_form'",
            [$itemId, $userId]
        );
    }

    private function submissionId(mixed $value): ?int
    {
        if (! is_numeric($value)) {
            return null;
        }
        $id = (int) $value;

        return $id >= 1 ? $id : null;
    }

    private function userId(Request $request): string
    {
        return (string) $request->attributes->get('auth_user_id');
    }

    /**
     * @param  array<string,mixed>  $body
     */
    private function json(array $body, int $status = 200)
    {
        return response()->json($body, $status)->header('X-Conecta-Engine', 'laravel');
    }
}
