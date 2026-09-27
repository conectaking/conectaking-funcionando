<?php

namespace App\Http\Controllers\CartaoVirtual;

use App\Http\Controllers\Controller;
use App\Services\CartaoVirtual\BibleSalmoService;
use App\Services\CartaoVirtual\VerseOfDayService;
use Illuminate\Http\Request;

class BibleAdminVerseController extends Controller
{
    public function __construct(
        private readonly VerseOfDayService $verse,
        private readonly BibleSalmoService $salmo
    ) {
    }

    public function showVerse(Request $request)
    {
        $date = $request->query('date') ?: now('America/Sao_Paulo')->toDateString();
        $translation = (string) ($request->query('translation') ?: 'nvi');
        $item = $this->verse->get($date, $translation);
        $overrides = $this->verse->loadOverrides();

        return response()->json([
            'success' => true,
            'data' => [
                'current' => $item,
                'overrides' => $overrides,
            ],
        ])->header('X-Conecta-Engine', 'laravel');
    }

    public function saveVerse(Request $request)
    {
        $date = $request->input('date') ?: now('America/Sao_Paulo')->toDateString();
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            return response()->json([
                'success' => false,
                'message' => 'Data deve estar no formato YYYY-MM-DD.',
            ], 400)->header('X-Conecta-Engine', 'laravel');
        }

        $ref = trim((string) $request->input('ref', ''));
        $texto = trim((string) $request->input('texto', ''));
        $reflexao = trim((string) $request->input('reflexao', ''));

        if ($texto === '') {
            return response()->json([
                'success' => false,
                'message' => 'Texto do versículo é obrigatório.',
            ], 400)->header('X-Conecta-Engine', 'laravel');
        }

        $this->verse->setOverride($date, [
            'ref' => $ref ?: 'Palavra do Dia',
            'texto' => $texto,
            'reflexao' => $reflexao ?: null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Versículo / Palavra do dia gravado com sucesso para '.$date,
            'data' => $this->verse->get($date),
        ])->header('X-Conecta-Engine', 'laravel');
    }

    public function deleteVerse(Request $request)
    {
        $date = $request->query('date') ?: $request->input('date');
        if (!$date || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            return response()->json([
                'success' => false,
                'message' => 'Data inválida.',
            ], 400)->header('X-Conecta-Engine', 'laravel');
        }

        $this->verse->removeOverride($date);

        return response()->json([
            'success' => true,
            'message' => 'Personalização do versículo removida para '.$date,
        ])->header('X-Conecta-Engine', 'laravel');
    }

    public function showSalmo(Request $request)
    {
        $date = $request->query('date') ?: now('America/Sao_Paulo')->toDateString();
        $item = $this->salmo->get($date);
        $overrides = $this->salmo->loadOverrides();

        return response()->json([
            'success' => true,
            'data' => [
                'current' => $item,
                'overrides' => $overrides,
            ],
        ])->header('X-Conecta-Engine', 'laravel');
    }

    public function saveSalmo(Request $request)
    {
        $date = $request->input('date') ?: now('America/Sao_Paulo')->toDateString();
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            return response()->json([
                'success' => false,
                'message' => 'Data deve estar no formato YYYY-MM-DD.',
            ], 400)->header('X-Conecta-Engine', 'laravel');
        }

        $ref = trim((string) $request->input('ref', ''));
        $texto = trim((string) $request->input('texto', ''));
        $reflexao = trim((string) $request->input('reflexao', ''));
        $capitulo = $request->input('capitulo');
        $versiculo = $request->input('versiculo');

        if ($texto === '') {
            return response()->json([
                'success' => false,
                'message' => 'Texto do Salmo é obrigatório.',
            ], 400)->header('X-Conecta-Engine', 'laravel');
        }

        $this->salmo->setOverride($date, [
            'ref' => $ref ?: 'Salmo do Dia',
            'texto' => $texto,
            'reflexao' => $reflexao ?: null,
            'capitulo' => $capitulo !== null ? (int) $capitulo : null,
            'versiculo' => $versiculo !== null ? (int) $versiculo : null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Salmo do dia gravado com sucesso para '.$date,
            'data' => $this->salmo->get($date),
        ])->header('X-Conecta-Engine', 'laravel');
    }
}
