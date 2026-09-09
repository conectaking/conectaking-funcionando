<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Admin\RegistrationCodeService;
use Illuminate\Support\Facades\Log;

class GeneratorController extends Controller
{
    public function __construct(private readonly RegistrationCodeService $codes)
    {
    }

    public function newKey()
    {
        try {
            $newKey = $this->codes->createShortKey();

            return response()->json([
                'success' => true,
                'newKey' => $newKey,
            ], 201)->header('X-Conecta-Engine', 'laravel');
        } catch (\Throwable $e) {
            Log::error('Erro ao gerar nova chave: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Erro ao gerar chave no banco de dados.',
            ], 500)->header('X-Conecta-Engine', 'laravel');
        }
    }
}
