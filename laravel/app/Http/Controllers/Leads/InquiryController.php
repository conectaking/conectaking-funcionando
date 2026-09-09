<?php

namespace App\Http\Controllers\Leads;

use App\Http\Controllers\Controller;
use App\Services\Leads\InquiryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class InquiryController extends Controller
{
    public function __construct(private readonly InquiryService $inquiry)
    {
    }

    public function submit(Request $request)
    {
        $data = is_array($request->all()) ? $request->all() : [];

        if ($this->inquiry->missingRequiredFields($data) !== []) {
            return response()->json([
                'success' => false,
                'message' => 'Por favor, preencha todos os campos obrigatórios.',
            ], 400)->header('X-Conecta-Engine', 'laravel');
        }

        try {
            $this->inquiry->submit($data);

            return response()->json([
                'success' => true,
                'message' => 'Solicitação enviada com sucesso! Entraremos em contato em breve.',
            ])->header('X-Conecta-Engine', 'laravel');
        } catch (\Throwable $e) {
            Log::error('Erro ao enviar e-mail: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Houve um erro ao enviar sua solicitação. Tente novamente mais tarde.',
            ], 500)->header('X-Conecta-Engine', 'laravel');
        }
    }
}
