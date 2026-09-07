<?php

namespace App\Http\Controllers\CartaoVirtual;

use App\Http\Controllers\Controller;
use App\Services\CartaoVirtual\VerseOfDayService;
use Illuminate\Http\Request;

class BiblePublicController extends Controller
{
    public function __construct(private readonly VerseOfDayService $verse)
    {
    }

    public function verseOfDay(Request $request)
    {
        $date = $request->query('date');
        $translation = (string) ($request->query('translation') ?: 'nvi');
        $verse = $this->verse->get(is_string($date) ? $date : null, $translation);

        if (!$verse) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Versículo não encontrado',
                'error' => [
                    'code' => 'ERROR',
                    'message' => 'Versículo não encontrado',
                ],
            ], 404)->header('X-Conecta-Engine', 'laravel');
        }

        return response()->json([
            'success' => true,
            'data' => $verse,
            'error' => null,
        ])->header('X-Conecta-Engine', 'laravel');
    }
}
