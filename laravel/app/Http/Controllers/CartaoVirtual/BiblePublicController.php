<?php

namespace App\Http\Controllers\CartaoVirtual;

use App\Http\Controllers\Controller;
use App\Services\CartaoVirtual\BibleDevotionalService;
use App\Services\CartaoVirtual\BibleProsperidadeService;
use App\Services\CartaoVirtual\BibleSalmoService;
use App\Services\CartaoVirtual\BibleStudyService;
use App\Services\CartaoVirtual\BibleTextService;
use App\Services\CartaoVirtual\BibleWholeDevotionalService;
use App\Services\CartaoVirtual\VerseOfDayService;
use Illuminate\Http\Request;

class BiblePublicController extends Controller
{
    public function __construct(
        private readonly VerseOfDayService $verse,
        private readonly BibleTextService $text,
        private readonly BibleStudyService $studies,
        private readonly BibleDevotionalService $devotionals,
        private readonly BibleSalmoService $salmos,
        private readonly BibleWholeDevotionalService $whole,
        private readonly BibleProsperidadeService $prosperidade,
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

        $data = $this->text->enrichChapter($data);

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
                'message' => 'Estudo deste livro ainda não está publicado.',
                'code' => 'STUDY_NOT_READY',
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

    public function devotionals365(Request $request, string $day)
    {
        if (!ctype_digit($day) || (int) $day < 1 || (int) $day > 365) {
            return response()->json([
                'success' => false,
                'message' => 'Dia deve ser entre 1 e 365',
            ], 400)->header('X-Conecta-Engine', 'laravel');
        }

        $plain = $request->query('plain');
        $isPlain = in_array((string) $plain, ['1', 'true', 'db'], true);
        $aiQ = strtolower((string) $request->query('ai', ''));
        $aiExplicitOff = in_array($aiQ, ['0', 'false', 'off', 'no'], true);

        $year = (int) $request->query('year', 0);
        $temaModo = (string) ($request->query('tema_modo') ?: $request->query('temaModo') ?: 'mes_auto');
        $temaPersonalizado = (string) ($request->query('tema') ?: $request->query('tema_personalizado') ?: '');
        $estilo = (string) $request->query('estilo', 'padrao');

        $row = $this->devotionals->get365((int) $day, [
            'plain' => $isPlain,
            'aiExplicitOff' => $aiExplicitOff,
            'useAi' => !$aiExplicitOff,
            'year' => $year > 0 ? $year : null,
            'temaModo' => $temaModo,
            'temaPersonalizado' => $temaPersonalizado,
            'estilo' => $estilo,
        ]);
        if (!$row) {
            return response()->json([
                'success' => false,
                'message' => $isPlain ? 'Sem devocional na base para este dia.' : 'Devocional não encontrado',
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

    public function salmoDoDia(Request $request)
    {
        $date = $request->query('date');
        $data = $this->salmos->get(is_string($date) ? $date : null);
        if (!$data || empty($data['texto'])) {
            return response()->json([
                'success' => false,
                'message' => 'Salmo não encontrado',
            ], 404)->header('X-Conecta-Engine', 'laravel');
        }

        return response()->json([
            'success' => true,
            'data' => $data,
        ])->header('X-Conecta-Engine', 'laravel');
    }

    public function devocionalBibliaInteira(Request $request)
    {
        $mode = strtolower((string) ($request->query('mode') ?: 'calendar'));
        if ($mode === 'sequence') {
            $day = (int) ($request->query('day') ?: 1);
            if ($day < 1) {
                return response()->json(['success' => false, 'message' => 'Dia inválido'], 400)
                    ->header('X-Conecta-Engine', 'laravel');
            }
            $data = $this->whole->bySequenceDay($day);
        } else {
            $month = (int) ($request->query('month') ?: now('America/Sao_Paulo')->month);
            $day = (int) ($request->query('day') ?: now('America/Sao_Paulo')->day);
            $data = $this->whole->byCalendar($month, $day);
        }
        if (!$data) {
            return response()->json(['success' => false, 'message' => 'Devocional não encontrado'], 404)
                ->header('X-Conecta-Engine', 'laravel');
        }

        return response()->json([
            'success' => true,
            'data' => $data,
        ])->header('X-Conecta-Engine', 'laravel');
    }

    public function prosperidadeAtivacao(string $n)
    {
        $result = $this->prosperidade->getAtivacaoPublic($n);
        if (($result['code'] ?? null) === 400) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => $result['error'] ?? 'Ativação inválida',
                'error' => ['code' => 'ERROR', 'message' => $result['error'] ?? 'Ativação inválida'],
            ], 400)->header('X-Conecta-Engine', 'laravel');
        }
        if (!empty($result['ok'])) {
            return response()->json([
                'success' => true,
                'data' => $result['data'],
                'error' => null,
            ])->header('X-Conecta-Engine', 'laravel');
        }

        return response()->json([
            'success' => true,
            'data' => [
                'not_published' => true,
                'activation_number' => $result['activation_number'] ?? null,
                'message' => $result['message'] ?? null,
                'nearest_published' => $result['nearest_published'] ?? null,
            ],
            'error' => null,
        ])->header('X-Conecta-Engine', 'laravel');
    }

    public function prosperidadeHoje(Request $request)
    {
        $result = $this->prosperidade->getHoje($request->query('day'));
        if (($result['code'] ?? null) === 400) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => $result['error'] ?? 'Dia inválido',
                'error' => ['code' => 'ERROR', 'message' => $result['error'] ?? 'Dia inválido'],
            ], 400)->header('X-Conecta-Engine', 'laravel');
        }
        if (!empty($result['ok'])) {
            return response()->json([
                'success' => true,
                'data' => [
                    'activation_number' => $result['activation_number'],
                    'calendar_day' => $result['calendar_day'],
                    'ativacao' => $result['data'],
                ],
                'error' => null,
            ])->header('X-Conecta-Engine', 'laravel');
        }

        return response()->json([
            'success' => true,
            'data' => [
                'activation_number' => $result['activation_number'] ?? null,
                'calendar_day' => $result['calendar_day'] ?? null,
                'not_published' => true,
                'message' => $result['message'] ?? null,
                'nearest_published' => $result['nearest_published'] ?? null,
            ],
            'error' => null,
        ])->header('X-Conecta-Engine', 'laravel');
    }

    public function prosperidadeList()
    {
        return response()->json([
            'success' => true,
            'data' => ['activations' => $this->prosperidade->getList()],
            'error' => null,
        ])->header('X-Conecta-Engine', 'laravel');
    }

    public function prosperidadeNearest(string $n)
    {
        $nearest = $this->prosperidade->getNearestPublishedAny($n);
        if (!$nearest) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Nenhuma Ativação publicada encontrada.',
                'error' => ['code' => 'ERROR', 'message' => 'Nenhuma Ativação publicada encontrada.'],
            ], 404)->header('X-Conecta-Engine', 'laravel');
        }

        return response()->json([
            'success' => true,
            'data' => $nearest,
            'error' => null,
        ])->header('X-Conecta-Engine', 'laravel');
    }

    public function prosperidadeMarkRead(Request $request)
    {
        $body = $request->all();
        $visitorId = $body['visitor_id'] ?? $body['visitorId'] ?? null;
        $userId = $request->attributes->get('userId')
            ?? ($request->user()->userId ?? null);
        $activationNumber = $body['activation_number'] ?? $body['activationNumber'] ?? null;
        $slug = isset($body['slug']) ? (string) $body['slug'] : null;
        if (!$activationNumber) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'activation_number é obrigatório',
                'error' => ['code' => 'ERROR', 'message' => 'activation_number é obrigatório'],
            ], 400)->header('X-Conecta-Engine', 'laravel');
        }
        if (!$userId && !$visitorId) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Faça login ou informe visitor_id',
                'error' => ['code' => 'ERROR', 'message' => 'Faça login ou informe visitor_id'],
            ], 400)->header('X-Conecta-Engine', 'laravel');
        }
        try {
            $result = $this->prosperidade->markRead(
                is_string($userId) ? $userId : null,
                is_string($visitorId) ? $visitorId : null,
                $activationNumber,
                $slug
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => $e->getMessage(),
                'error' => ['code' => 'ERROR', 'message' => $e->getMessage()],
            ], 400)->header('X-Conecta-Engine', 'laravel');
        }

        return response()->json([
            'success' => true,
            'data' => $result,
            'message' => 'Ativação marcada como lida.',
            'error' => null,
        ])->header('X-Conecta-Engine', 'laravel');
    }

    public function prosperidadeReadStatus(Request $request)
    {
        $userId = $request->attributes->get('userId');
        $visitorId = $request->query('visitor_id');
        $days = $request->query('activations') ?? $request->query('activation_numbers');
        if (!$userId && !$visitorId) {
            return response()->json([
                'success' => true,
                'data' => ['read' => []],
                'error' => null,
            ])->header('X-Conecta-Engine', 'laravel');
        }
        $read = $this->prosperidade->getReadStatus(
            is_string($userId) ? $userId : null,
            is_string($visitorId) ? $visitorId : null,
            $days
        );

        return response()->json([
            'success' => true,
            'data' => ['read' => $read],
            'error' => null,
        ])->header('X-Conecta-Engine', 'laravel');
    }

    public function devotionalMarkRead(Request $request)
    {
        $body = $request->all();
        $visitorId = $body['visitor_id'] ?? $body['visitorId'] ?? $request->query('visitor_id');
        $userId = $request->attributes->get('userId');
        $dayOfYear = $body['day_of_year'] ?? $body['dayOfYear'] ?? $request->query('day_of_year');
        $userNote = $body['user_note'] ?? $body['userNote'] ?? null;
        $slug = $body['slug'] ?? $request->query('slug');
        if (!$dayOfYear) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'day_of_year é obrigatório',
                'error' => ['code' => 'ERROR', 'message' => 'day_of_year é obrigatório'],
            ], 400)->header('X-Conecta-Engine', 'laravel');
        }
        if (!$userId && !$visitorId) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Faça login ou informe visitor_id (ex: localStorage)',
                'error' => ['code' => 'ERROR', 'message' => 'Faça login ou informe visitor_id (ex: localStorage)'],
            ], 400)->header('X-Conecta-Engine', 'laravel');
        }
        try {
            $result = $this->devotionals->markRead(
                is_string($userId) ? $userId : null,
                is_string($visitorId) ? $visitorId : null,
                $dayOfYear,
                is_string($userNote) ? $userNote : null,
                is_string($slug) ? $slug : null
            );
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => $e->getMessage(),
                'error' => ['code' => 'ERROR', 'message' => $e->getMessage()],
            ], 400)->header('X-Conecta-Engine', 'laravel');
        }

        return response()->json([
            'success' => true,
            'data' => $result,
            'message' => 'Devocional marcado como lido.',
            'error' => null,
        ])->header('X-Conecta-Engine', 'laravel');
    }

    public function devotionalReadStatus(Request $request)
    {
        $userId = $request->attributes->get('userId');
        $visitorId = $request->query('visitor_id')
            ?? $request->input('visitor_id')
            ?? $request->input('visitorId');
        $days = $request->query('days') ?? $request->query('day_of_year');
        if (!$userId && !$visitorId) {
            return response()->json([
                'success' => true,
                'data' => ['read' => []],
                'error' => null,
            ])->header('X-Conecta-Engine', 'laravel');
        }
        $read = $this->devotionals->getReadStatus(
            is_string($userId) ? $userId : null,
            is_string($visitorId) ? $visitorId : null,
            $days
        );

        return response()->json([
            'success' => true,
            'data' => ['read' => $read],
            'error' => null,
        ])->header('X-Conecta-Engine', 'laravel');
    }
}
