<?php

namespace App\Http\Controllers\Business;

use App\Http\Controllers\Controller;
use App\Services\Business\InviteCodesService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class InviteCodesController extends Controller
{
    public function __construct(private readonly InviteCodesService $codes)
    {
    }

    public function index(Request $request)
    {
        return $this->run(
            fn (): array => $this->codes->listCodes($this->userId($request)),
            'Erro ao buscar códigos.'
        );
    }

    public function generate(Request $request)
    {
        return $this->run(
            fn (): array => $this->codes->generateCode($this->userId($request)),
            'Erro ao gerar código.'
        );
    }

    public function generateManual(Request $request)
    {
        return $this->run(
            fn (): array => $this->codes->generateManual($this->userId($request), $request->input('customCode')),
            'Erro no servidor ao criar código.'
        );
    }

    private function userId(Request $request): string
    {
        return (string) $request->attributes->get('auth_user_id');
    }

    /**
     * @param  callable():array{status:int, body:array<string,mixed>}  $handler
     */
    private function run(callable $handler, string $fallbackMessage)
    {
        try {
            $r = $handler();

            return response()->json($r['body'], $r['status'])->header('X-Conecta-Engine', 'laravel');
        } catch (\Throwable $e) {
            Log::error('business invite-codes: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'data' => null,
                'message' => $fallbackMessage,
                'error' => ['code' => 'ERROR', 'message' => $fallbackMessage],
            ], 500)->header('X-Conecta-Engine', 'laravel');
        }
    }
}
