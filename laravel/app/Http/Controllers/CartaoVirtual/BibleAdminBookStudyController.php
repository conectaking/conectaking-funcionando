<?php

namespace App\Http\Controllers\CartaoVirtual;

use App\Http\Controllers\Controller;
use App\Services\CartaoVirtual\BibleAdminBookStudyService;
use Illuminate\Http\Request;

class BibleAdminBookStudyController extends Controller
{
    public function __construct(private readonly BibleAdminBookStudyService $admin)
    {
    }

    public function books()
    {
        try {
            $books = $this->admin->listStudyBooks();

            return response()->json([
                'success' => true,
                'data' => ['books' => $books],
            ])->header('Cache-Control', 'no-store, no-cache, must-revalidate')
                ->header('X-Conecta-Engine', 'laravel');
        } catch (\Throwable $e) {
            return $this->fail($e->getMessage() ?: 'Erro ao listar livros.', 500);
        }
    }

    public function destroy(string $bookId)
    {
        $bookId = trim($bookId);
        if ($bookId === '') {
            return $this->fail('bookId é obrigatório.', 400);
        }
        try {
            if (!$this->admin->deleteBookStudy($bookId)) {
                return $this->fail('Estudo deste livro não foi encontrado.', 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Estudo removido com sucesso.',
            ])->header('X-Conecta-Engine', 'laravel');
        } catch (\Throwable $e) {
            return $this->fail($e->getMessage() ?: 'Erro ao remover estudo.', 500);
        }
    }

    public function upload(Request $request, string $bookId)
    {
        $bookId = trim($bookId);
        if ($bookId === '') {
            return $this->fail('bookId é obrigatório.', 400);
        }
        if (!$request->hasFile('file')) {
            return $this->fail('Envie um arquivo Word (.doc/.docx) ou PDF.', 400);
        }
        $file = $request->file('file');
        if (!$file || !$file->isValid()) {
            $msg = $file && $file->getError() === UPLOAD_ERR_INI_SIZE
                ? 'Arquivo muito grande. Máximo 15 MB.'
                : 'Erro no upload.';

            return $this->fail($msg, 400);
        }
        $ext = strtolower((string) $file->getClientOriginalExtension());
        $allowedExt = ['doc', 'docx', 'pdf'];
        if (! in_array($ext, $allowedExt, true)) {
            return $this->fail('Apenas arquivos Word (.doc, .docx) ou PDF são permitidos.', 400);
        }

        if ($ext === 'pdf') {
            $check = \App\Support\UploadedFileValidator::assertPdf($file, 15 * 1024 * 1024);
            if (! ($check['ok'] ?? false)) {
                return $this->fail($check['message'] ?? 'Arquivo inválido.', 400);
            }
            $mime = $check['mime'];
        } else {
            // Word (.doc/.docx): sem validador binário disponível — confia na extensão
            $mime = $ext === 'docx'
                ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                : 'application/msword';
        }

        try {
            $text = $this->admin->extractUploadText($file->getRealPath() ?: '', $mime, $ext);
        } catch (\Throwable $e) {
            return $this->fail(
                'Não foi possível extrair o texto do arquivo. Verifique se o arquivo não está corrompido.',
                400
            );
        }

        $trimmed = trim($text);
        if ($trimmed === '') {
            return $this->fail('O arquivo não contém texto extraível ou está vazio.', 400);
        }

        try {
            $meta = $this->admin->resolveBookMeta($bookId);
            $bookName = $meta['name'] ?? $bookId;
            $title = 'Estudo: '.$bookName;
            $this->admin->upsertBookStudy($bookId, $title, $trimmed);

            return response()->json([
                'success' => true,
                'message' => 'Estudo de "'.$bookName.'" foi importado com sucesso.',
                'data' => [
                    'book_id' => $bookId,
                    'book_name' => $bookName,
                    'content_length' => mb_strlen($trimmed),
                ],
            ])->header('X-Conecta-Engine', 'laravel');
        } catch (\Throwable $e) {
            return $this->fail($e->getMessage() ?: 'Erro ao salvar o estudo no banco.', 500);
        }
    }

    public function generateAi(Request $request, string $bookId)
    {
        $bookId = trim($bookId);
        if ($bookId === '') {
            return $this->fail('bookId é obrigatório.', 400);
        }
        try {
            $out = $this->admin->generateAndSave($bookId, (bool) $request->boolean('baseadoEmGenesis'));
            if (!empty($out['error'])) {
                return $this->fail((string) $out['error'], 400);
            }

            return response()->json([
                'success' => true,
                'message' => 'Estudo de "'.$out['book_name'].'" foi gerado e gravado.',
                'data' => [
                    'book_id' => $out['book_id'],
                    'book_name' => $out['book_name'],
                    'content_length' => $out['content_length'],
                ],
            ])->header('X-Conecta-Engine', 'laravel');
        } catch (\Throwable $e) {
            return $this->fail($e->getMessage() ?: 'Erro ao gerar estudo.', 500);
        }
    }

    public function generateAiAsync(Request $request)
    {
        try {
            $out = $this->admin->startBookStudyAiBackgroundJob(
                $request->input('bookIds'),
                ['baseadoEmGenesis' => (bool) $request->boolean('baseadoEmGenesis')]
            );
            if (empty($out['ok'])) {
                return $this->fail((string) ($out['error'] ?? 'Pedido inválido.'), 400);
            }

            return response()->json([
                'success' => true,
                'data' => ['jobId' => $out['jobId'], 'total' => $out['total']],
            ], 202)->header('X-Conecta-Engine', 'laravel');
        } catch (\Throwable $e) {
            return $this->fail($e->getMessage() ?: 'Erro.', 500);
        }
    }

    public function generationJob(string $jobId)
    {
        try {
            $j = $this->admin->getBookStudyAiJob($jobId);
            if ($j === null) {
                return $this->fail('Trabalho não encontrado ou expirou (memória do servidor).', 404);
            }

            return response()->json([
                'success' => true,
                'data' => $j,
            ])->header('X-Conecta-Engine', 'laravel');
        } catch (\Throwable $e) {
            return $this->fail($e->getMessage(), 500);
        }
    }

    public function cancelGenerationJob(string $jobId)
    {
        try {
            $out = $this->admin->cancelBookStudyAiJob($jobId);
            if (empty($out['ok'])) {
                return $this->fail((string) ($out['error'] ?? 'Não foi possível cancelar.'), 400);
            }

            return response()->json(['success' => true])->header('X-Conecta-Engine', 'laravel');
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
