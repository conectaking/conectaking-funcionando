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

    private function fail(string $message, int $status)
    {
        return response()->json([
            'success' => false,
            'message' => $message,
        ], $status)->header('X-Conecta-Engine', 'laravel');
    }
}
