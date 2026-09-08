<?php

namespace App\Http\Controllers\CartaoVirtual;

use App\Http\Controllers\Controller;
use App\Services\CartaoVirtual\BibleProsperidadeAdminService;
use Illuminate\Http\Request;

class BibleProsperidadeAdminController extends Controller
{
    public function __construct(private readonly BibleProsperidadeAdminService $admin)
    {
    }

    public function index()
    {
        try {
            return response()->json([
                'success' => true,
                'data' => ['activations' => $this->admin->listAll()],
            ])->header('X-Conecta-Engine', 'laravel');
        } catch (\Throwable $e) {
            return $this->fail($e->getMessage(), 500);
        }
    }

    public function export()
    {
        try {
            return response()->json([
                'success' => true,
                'data' => ['activations' => $this->admin->exportAll()],
            ])->header('X-Conecta-Engine', 'laravel');
        } catch (\Throwable $e) {
            return $this->fail($e->getMessage(), 500);
        }
    }

    public function import(Request $request)
    {
        try {
            $items = $request->input('activations', $request->all());
            $result = $this->admin->importAll($items);

            return response()->json([
                'success' => true,
                'message' => 'Importação concluída.',
                'data' => $result,
            ])->header('X-Conecta-Engine', 'laravel');
        } catch (\Throwable $e) {
            return $this->fail($e->getMessage(), 500);
        }
    }

    public function storytellingMap()
    {
        return response()->json([
            'success' => true,
            'data' => $this->admin->storytellingMap(),
        ])->header('X-Conecta-Engine', 'laravel');
    }

    public function show(string $n)
    {
        try {
            return response()->json([
                'success' => true,
                'data' => $this->admin->get((int) $n),
            ])->header('X-Conecta-Engine', 'laravel');
        } catch (\InvalidArgumentException $e) {
            return $this->fail($e->getMessage(), 400);
        } catch (\Throwable $e) {
            return $this->fail($e->getMessage(), 404);
        }
    }

    public function save(Request $request, string $n)
    {
        try {
            $dto = $this->admin->save((int) $n, $request->all(), 'manual');

            return response()->json([
                'success' => true,
                'message' => 'Ativação salva.',
                'data' => $dto,
            ])->header('X-Conecta-Engine', 'laravel');
        } catch (\Throwable $e) {
            return $this->fail($e->getMessage(), 400);
        }
    }

    public function publish(Request $request, string $n)
    {
        try {
            $published = filter_var($request->input('published', true), FILTER_VALIDATE_BOOLEAN);
            $dto = $this->admin->publish((int) $n, $published, $request->all());

            return response()->json([
                'success' => true,
                'message' => $published ? 'Publicada.' : 'Despublicada.',
                'data' => $dto,
            ])->header('X-Conecta-Engine', 'laravel');
        } catch (\Throwable $e) {
            return $this->fail($e->getMessage(), 400);
        }
    }

    public function generateAi(string $n)
    {
        try {
            $result = $this->admin->generateAi((int) $n);
            if (!empty($result['error'])) {
                return $this->fail((string) $result['error'], 400);
            }

            return response()->json([
                'success' => true,
                'message' => 'Ativação gerada com IA.',
                'data' => $result['data'] ?? null,
                'tokens' => $result['tokens'] ?? null,
            ])->header('X-Conecta-Engine', 'laravel');
        } catch (\Throwable $e) {
            return $this->fail($e->getMessage(), 500);
        }
    }

    public function parsePaste(Request $request, string $n)
    {
        $text = (string) ($request->input('text') ?: $request->input('content') ?: '');
        try {
            $result = $this->admin->parsePaste((int) $n, $text);
            if (!empty($result['error'])) {
                return $this->fail((string) $result['error'], 400);
            }

            return response()->json([
                'success' => true,
                'data' => $result,
            ])->header('X-Conecta-Engine', 'laravel');
        } catch (\Throwable $e) {
            return $this->fail($e->getMessage(), 500);
        }
    }

    public function generateRange(Request $request)
    {
        $start = (int) $request->input('start');
        $end = (int) $request->input('end');
        $asyncMode = filter_var($request->input('async', false), FILTER_VALIDATE_BOOLEAN);
        $delayMs = $request->input('delayMs');
        if (!$start || !$end || $start < 1 || $end > 31 || $start > $end) {
            return $this->fail('Intervalo inválido (1–31).', 400);
        }
        try {
            if ($asyncMode) {
                $job = $this->admin->startRangeBackgroundJob($start, $end, ['delayMs' => $delayMs]);

                return response()->json([
                    'success' => true,
                    'message' => 'Geração iniciada.',
                    'data' => $job,
                ], 202)->header('X-Conecta-Engine', 'laravel');
            }
            if (($end - $start + 1) > 15) {
                return $this->fail('Máximo 15 Ativações por lote síncrono. Use async: true ou divida o intervalo.', 400);
            }
            $result = $this->admin->generateRangeAndSave($start, $end, ['delayMs' => $delayMs]);

            return response()->json([
                'success' => true,
                'data' => $result,
            ])->header('X-Conecta-Engine', 'laravel');
        } catch (\InvalidArgumentException $e) {
            return $this->fail($e->getMessage(), 400);
        } catch (\Throwable $e) {
            return $this->fail($e->getMessage(), 500);
        }
    }

    public function generationJob(string $jobId)
    {
        $job = $this->admin->getGenerationJob($jobId);
        if ($job === null) {
            return $this->fail('Job não encontrado.', 404);
        }

        return response()->json([
            'success' => true,
            'data' => $job,
        ])->header('X-Conecta-Engine', 'laravel');
    }

    public function cancelGenerationJob(string $jobId)
    {
        $result = $this->admin->cancelGenerationJob($jobId);

        return response()->json([
            'success' => $result['ok'],
            'message' => $result['message'],
        ])->header('X-Conecta-Engine', 'laravel');
    }

    private function fail(string $message, int $status)
    {
        return response()->json([
            'success' => false,
            'message' => $message,
        ], $status)->header('X-Conecta-Engine', 'laravel');
    }
}
