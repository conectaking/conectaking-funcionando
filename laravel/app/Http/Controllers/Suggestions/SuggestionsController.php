<?php

namespace App\Http\Controllers\Suggestions;

use App\Http\Controllers\Controller;
use App\Services\Suggestions\SuggestionsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SuggestionsController extends Controller
{
    public function __construct(private readonly SuggestionsService $suggestions)
    {
    }

    public function generate(Request $request)
    {
        try {
            $type = $request->input('type');
            $prompt = $request->input('prompt');
            $context = $request->input('context', []);
            if (! is_array($context)) {
                $context = [];
            }

            if (! is_string($type) || $type === '' || ! is_string($prompt) || $prompt === '') {
                return response()->json([
                    'success' => false,
                    'error' => 'Tipo e prompt são obrigatórios',
                ], 400)->header('X-Conecta-Engine', 'laravel');
            }

            $list = $this->suggestions->generate($type, $prompt, $context);

            if ($this->suggestions->isSalesType($type, $prompt)) {
                return response()->json([
                    'success' => true,
                    'type' => 'deep_analysis',
                    'analysis' => $this->suggestions->analisarVendasProfundo($prompt, $type),
                    'suggestions' => $list,
                    'message' => 'Análise profunda realizada! Veja a análise completa acima e as sugestões abaixo.',
                ])->header('X-Conecta-Engine', 'laravel');
            }

            return response()->json([
                'success' => true,
                'suggestions' => $list,
            ])->header('X-Conecta-Engine', 'laravel');
        } catch (\Throwable $e) {
            Log::error('Erro ao gerar sugestões: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'error' => 'Erro ao gerar sugestões',
            ], 500)->header('X-Conecta-Engine', 'laravel');
        }
    }
}
