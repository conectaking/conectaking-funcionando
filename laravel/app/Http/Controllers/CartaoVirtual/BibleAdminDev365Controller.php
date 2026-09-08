<?php

namespace App\Http\Controllers\CartaoVirtual;

use App\Http\Controllers\Controller;
use App\Services\CartaoVirtual\BibleAdminDev365Service;
use App\Services\CartaoVirtual\BibleDevotionalAiService;
use Illuminate\Http\Request;

class BibleAdminDev365Controller extends Controller
{
    public function __construct(
        private readonly BibleAdminDev365Service $admin,
        private readonly BibleDevotionalAiService $ai,
    ) {
    }

    public function days()
    {
        return $this->ok($this->admin->daysIndex());
    }

    public function adminFull()
    {
        try {
            return $this->ok($this->admin->adminFull());
        } catch (\Throwable $e) {
            return $this->fail($e->getMessage(), 500);
        }
    }

    public function showDay(string $day)
    {
        $d = (int) $day;
        if ($d < 1 || $d > 365) {
            return $this->fail('Dia 1–365.', 400);
        }
        $row = $this->admin->getDay($d);
        if (!$row) {
            return $this->fail('Sem registo para este dia.', 404);
        }

        return $this->ok($row);
    }

    public function upsert(Request $request, string $day)
    {
        $d = (int) $day;
        if ($d < 1 || $d > 365) {
            return $this->fail('Dia deve ser entre 1 e 365.', 400);
        }
        try {
            $this->admin->upsert($d, $request->all());

            return response()->json([
                'success' => true,
                'message' => 'Devocional do dia '.$d.' salvo com sucesso.',
            ])->header('X-Conecta-Engine', 'laravel');
        } catch (\Throwable $e) {
            return $this->fail($e->getMessage(), 500);
        }
    }

    public function destroy(string $day)
    {
        $d = (int) $day;
        if ($d < 1 || $d > 365) {
            return $this->fail('Dia deve ser entre 1 e 365.', 400);
        }
        if (!$this->admin->delete($d)) {
            return $this->fail('Devocional deste dia não encontrado.', 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Devocional removido com sucesso.',
        ])->header('X-Conecta-Engine', 'laravel');
    }

    public function generateDay(Request $request, string $day)
    {
        $d = (int) $day;
        if ($d < 1 || $d > 365) {
            return $this->fail('Dia 1–365.', 400);
        }
        $year = (int) ($request->input('year') ?: $request->query('year') ?: 0);
        if ($year < 2000 || $year > 2100) {
            $year = (int) now('America/Sao_Paulo')->year;
        }
        try {
            $r = $this->admin->generateDayAndSave($d, $year, [
                'temaModo' => (string) ($request->input('temaModo') ?: 'mes_auto'),
                'temaPersonalizado' => (string) ($request->input('temaPersonalizado') ?: ''),
                'estilo' => $request->input('estilo') === 'cunha' ? 'cunha' : 'padrao',
            ]);
            if (empty($r['ok'])) {
                return $this->fail((string) ($r['error'] ?? 'Falha ao gerar.'), 400);
            }

            return $this->ok($r['data'] ?? null);
        } catch (\Throwable $e) {
            return $this->fail($e->getMessage(), 500);
        }
    }

    public function generateRange(Request $request)
    {
        $start = (int) $request->input('start');
        $end = (int) $request->input('end');
        $year = (int) $request->input('year', 0);
        if ($year < 2000 || $year > 2100) {
            $year = (int) now('America/Sao_Paulo')->year;
        }
        if ($start < 1 || $end < 1) {
            return $this->fail('Informe start e end (1–365).', 400);
        }
        try {
            $out = $this->admin->generateRangeAndSave($start, $end, $year, [
                'delayMs' => (int) ($request->input('delayMs') ?? 400),
                'temaModo' => (string) ($request->input('temaModo') ?: 'mes_auto'),
                'temaPersonalizado' => (string) ($request->input('temaPersonalizado') ?: ''),
                'estilo' => $request->input('estilo') === 'cunha' ? 'cunha' : 'padrao',
            ]);
            if (empty($out['ok'])) {
                return $this->fail((string) ($out['error'] ?? 'Falha.'), 400);
            }

            return $this->ok($out);
        } catch (\Throwable $e) {
            return $this->fail($e->getMessage(), 500);
        }
    }

    public function generateMonth(Request $request, string $year, string $month)
    {
        $y = (int) $year;
        $m = (int) $month;
        if ($y < 2000 || $y > 2100 || $m < 1 || $m > 12) {
            return $this->fail('Ano ou mês inválido.', 400);
        }
        try {
            $out = $this->admin->generateMonthAndSave($y, $m, [
                'delayMs' => (int) ($request->input('delayMs') ?? 400),
                'temaModo' => (string) ($request->input('temaModo') ?: 'mes_auto'),
                'temaPersonalizado' => (string) ($request->input('temaPersonalizado') ?: ''),
                'estilo' => $request->input('estilo') === 'cunha' ? 'cunha' : 'padrao',
            ]);
            if (empty($out['ok'])) {
                return $this->fail((string) ($out['error'] ?? 'Falha.'), 400);
            }

            return $this->ok($out);
        } catch (\Throwable $e) {
            return $this->fail($e->getMessage(), 500);
        }
    }

    public function monthThemes(string $year)
    {
        $y = (int) $year;
        if ($y < 2000 || $y > 2100) {
            return $this->fail('Ano inválido.', 400);
        }

        return $this->ok(['year' => $y, 'themes' => $this->admin->getMonthThemes($y)]);
    }

    public function saveMonthThemes(Request $request, string $year)
    {
        $y = (int) $year;
        if ($y < 2000 || $y > 2100) {
            return $this->fail('Ano inválido.', 400);
        }
        try {
            $themes = $this->admin->setAllMonthThemes($y, $request->all());

            return $this->ok(['year' => $y, 'themes' => $themes]);
        } catch (\Throwable $e) {
            return $this->fail($e->getMessage(), 500);
        }
    }

    public function generateMonthTheme(Request $request, string $year, string $month)
    {
        $y = (int) $year;
        $m = (int) $month;
        if ($y < 2000 || $m < 1 || $m > 12) {
            return $this->fail('Ano ou mês inválido.', 400);
        }
        $r = $this->ai->generateMonthThemeLine($y, $m, (string) ($request->input('hint') ?: ''));
        if (!empty($r['error'])) {
            return $this->fail((string) $r['error'], 400);
        }
        $themes = $this->admin->setMonthTheme($y, $m, (string) ($r['text'] ?? ''));

        return $this->ok(['year' => $y, 'month' => $m, 'text' => $r['text'] ?? '', 'themes' => $themes]);
    }

    public function generateAllMonthThemes(Request $request, string $year)
    {
        $y = (int) $year;
        if ($y < 2000 || $y > 2100) {
            return $this->fail('Ano inválido.', 400);
        }
        $delay = (int) ($request->input('delayMs') ?? 400);
        $r = $this->ai->generateAllMonthThemesForYear($y, $delay);
        if (($r['errors'] ?? []) !== [] && count($r['errors']) === 12) {
            return response()->json([
                'success' => false,
                'message' => $r['errors'][0]['error'] ?? 'Falha.',
                'errors' => $r['errors'],
            ], 400)->header('X-Conecta-Engine', 'laravel');
        }
        $themes = $this->admin->setAllMonthThemes($y, $r['themes'] ?? []);

        return $this->ok(['year' => $y, 'themes' => $themes, 'errors' => $r['errors'] ?? []]);
    }

    public function generateCalendarMonthsAsync(Request $request)
    {
        $year = (int) ($request->input('year') ?: 0);
        if ($year < 2000 || $year > 2100) {
            $year = (int) now('America/Sao_Paulo')->year;
        }
        try {
            $out = $this->admin->startCalendarMonthsBackgroundJob($year, $request->input('months'), [
                'delayMs' => (int) ($request->input('delayMs') ?? 400),
                'temaModo' => (string) ($request->input('temaModo') ?: 'mes_auto'),
                'temaPersonalizado' => (string) ($request->input('temaPersonalizado') ?: ''),
                'estilo' => $request->input('estilo') === 'cunha' ? 'cunha' : 'padrao',
            ]);
            if (empty($out['ok'])) {
                return $this->fail((string) ($out['error'] ?? 'Pedido inválido.'), 400);
            }

            return response()->json([
                'success' => true,
                'data' => ['jobId' => $out['jobId'], 'total' => $out['total']],
            ], 202)->header('X-Conecta-Engine', 'laravel');
        } catch (\Throwable $e) {
            return $this->fail($e->getMessage(), 500);
        }
    }

    public function generationJob(string $jobId)
    {
        $j = $this->admin->getGenerationJob($jobId);
        if ($j === null) {
            return $this->fail('Trabalho não encontrado ou já expirou (memória do servidor).', 404);
        }

        return $this->ok($j);
    }

    public function cancelGenerationJob(string $jobId)
    {
        $out = $this->admin->cancelGenerationJob($jobId);
        if (empty($out['ok'])) {
            return $this->fail((string) ($out['error'] ?? 'Não foi possível cancelar.'), 400);
        }

        return response()->json(['success' => true])->header('X-Conecta-Engine', 'laravel');
    }

    private function ok(mixed $data)
    {
        return response()->json([
            'success' => true,
            'data' => $data,
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
