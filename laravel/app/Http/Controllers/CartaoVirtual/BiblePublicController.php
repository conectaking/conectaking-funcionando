<?php

namespace App\Http\Controllers\CartaoVirtual;

use App\Http\Controllers\Controller;
use App\Services\CartaoVirtual\BibleDevotionalService;
use App\Services\CartaoVirtual\BibleStudyService;
use App\Services\CartaoVirtual\BibleTextService;
use App\Services\CartaoVirtual\VerseOfDayService;
use Illuminate\Http\Request;

class BiblePublicController extends Controller
{
    public function __construct(
        private readonly VerseOfDayService $verse,
        private readonly BibleTextService $text,
        private readonly BibleStudyService $studies,
        private readonly BibleDevotionalService $devotionals,
    ) {
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

    public function books()
    {
        $m = $this->text->manifest();

        return response()->json([
            'success' => true,
            'data' => $m,
            'chapterCounts' => $this->text->chapterCountsByBook(),
        ])->header('X-Conecta-Engine', 'laravel');
    }

    public function bookChapter(Request $request, string $bookId, string $chapter)
    {
        $translation = (string) ($request->query('translation') ?: 'nvi');
        $data = $this->text->chapter($bookId, $chapter, $translation);
        if (!$data) {
            return response()->json([
                'success' => false,
                'message' => 'Capítulo não encontrado',
            ], 404)->header('X-Conecta-Engine', 'laravel');
        }

        return response()->json([
            'success' => true,
            'data' => $data,
        ])->header('X-Conecta-Engine', 'laravel');
    }

    public function studyBooks()
    {
        return response()->json([
            'success' => true,
            'data' => $this->studies->bookIdsWithFullStudy(),
        ])->header('X-Conecta-Engine', 'laravel');
    }

    public function studyBook(string $bookId)
    {
        $study = $this->studies->getBookStudy($bookId);
        if (!$study) {
            return response()->json([
                'success' => false,
                'message' => 'Estudo não encontrado',
            ], 404)->header('X-Conecta-Engine', 'laravel');
        }

        return response()->json([
            'success' => true,
            'data' => $study,
        ])->header('X-Conecta-Engine', 'laravel');
    }

    public function devocionalDoDia(Request $request)
    {
        $date = $request->query('date');
        $data = $this->devotionals->getForDate(is_string($date) ? $date : null);
        if (!$data || !$this->devotionals->hasContent($data)) {
            return response()->json([
                'success' => false,
                'message' => 'Devocional não encontrado',
            ], 404)->header('X-Conecta-Engine', 'laravel');
        }

        return response()->json([
            'success' => true,
            'data' => $data,
        ])->header('X-Conecta-Engine', 'laravel');
    }

    public function devotionals365(string $day)
    {
        if (!ctype_digit($day) || (int) $day < 1 || (int) $day > 365) {
            return response()->json([
                'success' => false,
                'message' => 'Dia deve ser entre 1 e 365',
            ], 400)->header('X-Conecta-Engine', 'laravel');
        }
        $row = $this->devotionals->getByDay((int) $day);
        if (!$row || !$this->devotionals->hasContent($row)) {
            return response()->json([
                'success' => false,
                'message' => 'Sem devocional na base para este dia.',
            ], 404)->header('X-Conecta-Engine', 'laravel');
        }

        return response()->json([
            'success' => true,
            'data' => $row,
        ])->header('X-Conecta-Engine', 'laravel');
    }

    public function readingPlanDay(string $day)
    {
        if (!ctype_digit($day) || (int) $day < 1 || (int) $day > 365) {
            return response()->json([
                'success' => false,
                'message' => 'Dia deve ser entre 1 e 365',
            ], 400)->header('X-Conecta-Engine', 'laravel');
        }
        $data = $this->devotionals->readingPlanDay((int) $day);
        if (!$data) {
            return response()->json([
                'success' => false,
                'message' => 'Dia do plano não encontrado',
            ], 404)->header('X-Conecta-Engine', 'laravel');
        }

        return response()->json([
            'success' => true,
            'data' => $data,
        ])->header('X-Conecta-Engine', 'laravel');
    }
}
