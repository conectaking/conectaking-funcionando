<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;

/**
 * Validação binária de uploads (anti MIME spoofing).
 */
final class UploadedFileValidator
{
    /** @var list<string> */
    public const IMAGE_MIMES = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
    ];

    /**
     * @return array{ok:true, mime:string, binary:string}|array{ok:false, message:string}
     */
    public static function assertImage(UploadedFile $file, int $maxBytes = 15_728_640): array
    {
        if ($file->getSize() > $maxBytes) {
            return ['ok' => false, 'message' => 'Arquivo muito grande (máx. '.((int) ($maxBytes / 1024 / 1024)).' MB).'];
        }

        $path = $file->getRealPath() ?: $file->getPathname();
        if (! is_string($path) || $path === '' || ! is_readable($path)) {
            return ['ok' => false, 'message' => 'Arquivo inválido.'];
        }

        $binary = file_get_contents($path);
        if ($binary === false || $binary === '') {
            return ['ok' => false, 'message' => 'Arquivo vazio.'];
        }

        $mime = self::detectMime($path, $binary);
        if (in_array($mime, ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'], true)
            || self::looksLikeHeic($binary)) {
            return ['ok' => false, 'message' => 'HEIC/HEIF não suportado. Converta para JPEG ou PNG no iPhone (Ajustes → Câmara → Formatos → Mais Compatível) e envie de novo.'];
        }
        if (! in_array($mime, self::IMAGE_MIMES, true)) {
            return ['ok' => false, 'message' => 'Formato inválido. Use JPEG, PNG, GIF ou WebP.'];
        }

        // Confirma que o binário é imagem real (não HTML/PHP renomeado)
        if (@getimagesizefromstring($binary) === false) {
            return ['ok' => false, 'message' => 'Conteúdo não é uma imagem válida.'];
        }

        return ['ok' => true, 'mime' => $mime, 'binary' => $binary];
    }

    /**
     * @return array{ok:true, mime:string, binary:string}|array{ok:false, message:string}
     */
    public static function assertPdf(UploadedFile $file, int $maxBytes = 25_165_824): array
    {
        if ($file->getSize() > $maxBytes) {
            return ['ok' => false, 'message' => 'Arquivo muito grande (máx. '.((int) ($maxBytes / 1024 / 1024)).' MB).'];
        }

        $path = $file->getRealPath() ?: $file->getPathname();
        if (! is_string($path) || $path === '' || ! is_readable($path)) {
            return ['ok' => false, 'message' => 'Arquivo inválido.'];
        }

        $binary = file_get_contents($path);
        if ($binary === false || $binary === '') {
            return ['ok' => false, 'message' => 'Arquivo vazio.'];
        }

        if (! str_starts_with($binary, '%PDF-')) {
            return ['ok' => false, 'message' => 'Formato inválido. Apenas PDFs.'];
        }

        $mime = self::detectMime($path, $binary);
        if ($mime !== 'application/pdf' && $mime !== 'application/octet-stream') {
            // Alguns finfo devolvem octet-stream; magic %PDF- já validou
            if ($mime !== '' && ! str_contains($mime, 'pdf')) {
                return ['ok' => false, 'message' => 'Formato inválido. Apenas PDFs.'];
            }
        }

        return ['ok' => true, 'mime' => 'application/pdf', 'binary' => $binary];
    }

    /**
     * Imagem ou PDF (anexos finance).
     *
     * @return array{ok:true, mime:string, binary:string, kind:string}|array{ok:false, message:string}
     */
    public static function assertImageOrPdf(UploadedFile $file, int $maxBytes = 15_728_640): array
    {
        $img = self::assertImage($file, $maxBytes);
        if ($img['ok']) {
            return ['ok' => true, 'mime' => $img['mime'], 'binary' => $img['binary'], 'kind' => 'image'];
        }

        $pdf = self::assertPdf($file, $maxBytes);
        if ($pdf['ok']) {
            return ['ok' => true, 'mime' => $pdf['mime'], 'binary' => $pdf['binary'], 'kind' => 'pdf'];
        }

        return ['ok' => false, 'message' => 'Formato inválido. Use imagem (JPEG/PNG/GIF/WebP) ou PDF.'];
    }

    private static function detectMime(string $path, string $binary): string
    {
        if (function_exists('finfo_open')) {
            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            if ($finfo !== false) {
                $mime = finfo_file($finfo, $path) ?: finfo_buffer($finfo, $binary);
                finfo_close($finfo);
                if (is_string($mime) && $mime !== '') {
                    return strtolower($mime);
                }
            }
        }

        return '';
    }

    private static function looksLikeHeic(string $binary): bool
    {
        if (strlen($binary) < 12) {
            return false;
        }
        if (substr($binary, 4, 4) !== 'ftyp') {
            return false;
        }
        $brand = strtolower(substr($binary, 8, 4));

        return in_array($brand, ['heic', 'heif', 'mif1', 'msf1', 'heim', 'heis'], true);
    }
}
